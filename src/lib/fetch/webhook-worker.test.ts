import { describe, expect, it, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';

// 1. Hoist the DB URL and mocks so they are available before imports
const { testDbUrl, mockCheckLightningStatus, mockFetch } = vi.hoisted(() => {
  const url = 'file:./webhook_worker_test.db';
  process.env.DATABASE_URL = url;
  
  // Clear global instance
  const globalForPrisma = globalThis as unknown as { prisma?: unknown };
  if (globalForPrisma.prisma) {
    delete globalForPrisma.prisma;
  }
  
  return {
    testDbUrl: url,
    mockCheckLightningStatus: vi.fn(),
    mockFetch: vi.fn(),
  };
});

// 2. Mock the DB module BEFORE importing the service layer
vi.mock('@/lib/fetch/db', async () => {
  const { PrismaClient } = await import('@/generated/prisma/client');
  return {
    db: new PrismaClient({
      datasources: { db: { url: 'file:./webhook_worker_test.db' } },
    }),
  };
});
vi.mock('./db', async () => {
  const { PrismaClient } = await import('@/generated/prisma/client');
  return {
    db: new PrismaClient({
      datasources: { db: { url: 'file:./webhook_worker_test.db' } },
    }),
  };
});

// 3. Mock checkLightningStatus from bark actions
vi.mock('@/lib/bark/actions', () => ({
  checkLightningStatus: mockCheckLightningStatus,
}));

// 4. Mock global.fetch
global.fetch = mockFetch as unknown as typeof fetch;

// 5. Import Service Layer (Now using the mocked DB)
import { processWebhooks } from './webhook-worker';
import { createCharge } from './charges';

// 6. Setup Test Helper DB
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: testDbUrl,
    },
  },
});

describe('processWebhooks', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDbUrl;
    try {
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
      });
    } catch (e) {
      console.error('DB Setup Failed. Ensure you ran \'npx prisma generate\' in your terminal first.');
      console.error(e);
      throw e;
    }
  });

  beforeEach(async () => {
    await testDb.charge.deleteMany();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await testDb.$disconnect();
    // Cleanup file
    if (fs.existsSync('./webhook_worker_test.db')) {
      fs.unlinkSync('./webhook_worker_test.db');
    }
    if (fs.existsSync('./webhook_worker_test.db-journal')) {
      fs.unlinkSync('./webhook_worker_test.db-journal');
    }
  });

  it('should do nothing if payment is still pending', async () => {
    // Setup: Create a pending charge in DB
    const charge = await createCharge({
      amountSat: 1000,
      description: 'Test charge',
      paymentHash: 'hash_pending_123',
      invoice: 'lnbc1000n1p3test123',
    });

    // Mock checkLightningStatus -> { status: 'pending' }
    mockCheckLightningStatus.mockResolvedValue({
      success: true,
      status: 'pending',
    });

    // Run processWebhooks()
    const stats = await processWebhooks();

    // Assert: DB status remains 'pending'
    const updatedCharge = await testDb.charge.findUnique({
      where: { id: charge.id },
    });
    expect(updatedCharge?.status).toBe('pending');
    expect(updatedCharge?.webhookStatus).toBe('pending');

    // Assert: fetch was NOT called
    expect(mockFetch).not.toHaveBeenCalled();

    // Assert: stats reflect processing but no settlement
    expect(stats.processed).toBe(1);
    expect(stats.settled).toBe(0);
    expect(stats.webhooks_sent).toBe(0);
  });

  it('should settle and dispatch webhook when payment confirmed', async () => {
    // Setup: Create a pending charge with webhookUrl
    const webhookUrl = 'https://merchant.example.com/webhook';
    const charge = await createCharge({
      amountSat: 5000,
      description: 'Settled charge',
      webhookUrl,
      paymentHash: 'hash_settled_456',
      invoice: 'lnbc5000n1p3settled',
      metadata: { orderId: 'order_123' },
    });

    // Mock checkLightningStatus -> { status: 'settled' }
    mockCheckLightningStatus.mockResolvedValue({
      success: true,
      status: 'settled',
    });

    // Mock fetch -> { ok: true }
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    // Run processWebhooks()
    const stats = await processWebhooks();

    // Assert: DB status becomes 'paid'
    const updatedCharge = await testDb.charge.findUnique({
      where: { id: charge.id },
    });
    expect(updatedCharge?.status).toBe('paid');
    expect(updatedCharge?.webhookStatus).toBe('success');

    // Assert: fetch was called with correct JSON body
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toBe(webhookUrl);
    expect(fetchCall[1]?.method).toBe('POST');
    expect(fetchCall[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
    });

    const requestBody = JSON.parse(fetchCall[1]?.body as string);
    expect(requestBody.id).toBe(charge.id);
    expect(requestBody.amountSat).toBe(5000);
    expect(requestBody.description).toBe('Settled charge');
    expect(requestBody.status).toBe('paid');
    expect(requestBody.paymentHash).toBe('hash_settled_456');
    expect(requestBody.invoice).toBe('lnbc5000n1p3settled');
    expect(requestBody.metadata).toEqual({ orderId: 'order_123' });
    expect(requestBody.createdAt).toBeDefined();
    expect(requestBody.updatedAt).toBeDefined();

    // Assert: stats reflect settlement and webhook dispatch
    expect(stats.processed).toBe(1);
    expect(stats.settled).toBe(1);
    expect(stats.webhooks_sent).toBe(1);
  });

  it('should mark webhook as failed if merchant server errors', async () => {
    // Setup: Create pending charge
    const webhookUrl = 'https://merchant.example.com/webhook';
    const charge = await createCharge({
      amountSat: 3000,
      description: 'Failed webhook charge',
      webhookUrl,
      paymentHash: 'hash_failed_789',
      invoice: 'lnbc3000n1p3failed',
    });

    // Mock checkLightningStatus -> { status: 'settled' }
    mockCheckLightningStatus.mockResolvedValue({
      success: true,
      status: 'settled',
    });

    // Mock fetch -> { ok: false, status: 500 }
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    // Run processWebhooks()
    const stats = await processWebhooks();

    // Assert: DB status becomes 'paid' (money is safe)
    const updatedCharge = await testDb.charge.findUnique({
      where: { id: charge.id },
    });
    expect(updatedCharge?.status).toBe('paid');

    // Assert: webhookStatus becomes 'failed'
    expect(updatedCharge?.webhookStatus).toBe('failed');

    // Assert: fetch was called
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Assert: stats reflect settlement but no successful webhook
    expect(stats.processed).toBe(1);
    expect(stats.settled).toBe(1);
    expect(stats.webhooks_sent).toBe(0);
  });

  it('should handle fetch exceptions safely without crashing the loop', async () => {
    // Setup: Create two pending charges
    const charge1 = await createCharge({
      amountSat: 1000,
      paymentHash: 'hash_exception_1',
      invoice: 'lnbc1000n1p3exc1',
      webhookUrl: 'https://merchant.example.com/webhook1',
    });

    const charge2 = await createCharge({
      amountSat: 2000,
      paymentHash: 'hash_exception_2',
      invoice: 'lnbc2000n1p3exc2',
      webhookUrl: 'https://merchant.example.com/webhook2',
    });

    // Mock checkLightningStatus -> both settled
    mockCheckLightningStatus
      .mockResolvedValueOnce({
        success: true,
        status: 'settled',
      })
      .mockResolvedValueOnce({
        success: true,
        status: 'settled',
      });

    // Mock fetch -> first throws exception, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    // Run processWebhooks() - should not crash
    const stats = await processWebhooks();

    // Assert: Both charges are marked as paid
    const updatedCharge1 = await testDb.charge.findUnique({
      where: { id: charge1.id },
    });
    const updatedCharge2 = await testDb.charge.findUnique({
      where: { id: charge2.id },
    });

    expect(updatedCharge1?.status).toBe('paid');
    expect(updatedCharge2?.status).toBe('paid');

    // Assert: First webhook failed, second succeeded
    expect(updatedCharge1?.webhookStatus).toBe('failed');
    expect(updatedCharge2?.webhookStatus).toBe('success');

    // Assert: Both fetch calls were attempted
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Assert: stats reflect both settlements but only one successful webhook
    expect(stats.processed).toBe(2);
    expect(stats.settled).toBe(2);
    expect(stats.webhooks_sent).toBe(1);
  });
});

