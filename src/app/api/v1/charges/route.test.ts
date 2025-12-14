import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';

// 1. Setup Env vars before imports
const { testDbUrl } = vi.hoisted(() => {
  const url = 'file:./route_test.db'; // Unique name to avoid conflicts
  process.env.DATABASE_URL = url;
  
  // Clear global instance
  const globalForPrisma = globalThis as unknown as { prisma?: unknown };
  if (globalForPrisma.prisma) {
    delete globalForPrisma.prisma;
  }
  
  return { testDbUrl: url };
});

// 2. Mock Actions (Logic Only)
vi.mock('@/lib/bark/actions', () => ({
  createLightningInvoice: vi.fn(),
}));

// 3. Import Dependencies
import { POST } from './route';
import { createLightningInvoice } from '@/lib/bark/actions';
import { db } from '@/lib/fetch/db'; // Will use process.env.DATABASE_URL set above

// 4. Test Helper
const testDb = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

describe('POST /api/v1/charges', () => {
  beforeAll(async () => {
    // Force env var again just in case
    process.env.DATABASE_URL = testDbUrl;
    
    try {
      // CRITICAL CHANGE: Removed 'prisma generate'. 
      // We assume the client exists. We only push the schema to the test DB file.
      // Removed 'stdio: ignore' so we can see errors.
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
      });
    } catch (e) {
      console.error("DB Setup Failed. Ensure you ran 'npx prisma generate' in your terminal first.");
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
    if (fs.existsSync('./route_test.db')) fs.unlinkSync('./route_test.db');
    if (fs.existsSync('./route_test.db-journal')) fs.unlinkSync('./route_test.db-journal');
  });

  // --- Tests ---

  it('should reject invalid payload - missing amount', async () => {
    const mockRequest = new NextRequest('http://localhost/api/v1/charges', {
      method: 'POST',
      body: JSON.stringify({ description: 'Test charge' }),
    });
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
  });

  it('should create a charge and persist to DB', async () => {
    const mockInvoice = 'lnbc1000n1p3test123';
    const mockPaymentHash = 'test_payment_hash_123';

    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: true,
      message: 'Invoice created',
      data: { invoice: mockInvoice, paymentHash: mockPaymentHash },
    });

    const mockRequest = new NextRequest('http://localhost/api/v1/charges', {
      method: 'POST',
      body: JSON.stringify({
        amount: 1000,
        description: 'Test charge',
      }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('pending');

    // Verify DB Persistence via Singleton
    const saved = await db.charge.findUnique({ where: { id: data.id } });
    expect(saved).toBeDefined();
    expect(saved?.amountSat).toBe(1000);
  });

  it('should return 502 when upstream fails', async () => {
    vi.mocked(createLightningInvoice).mockResolvedValue({
      success: false,
      message: 'Daemon Error',
    });

    const mockRequest = new NextRequest('http://localhost/api/v1/charges', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000 }),
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(502);
  });
});