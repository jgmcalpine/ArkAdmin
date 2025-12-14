import { describe, expect, it, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';

// 1. Hoist the DB URL so it is available before imports
const { testDbUrl } = vi.hoisted(() => ({ testDbUrl: 'file:./test.db' }));

// 2. Mock the DB module BEFORE importing the service layer
// We mock both the absolute alias and relative path to be safe
vi.mock('@/lib/fetch/db', async () => {
  const { PrismaClient } = await import('@/generated/prisma/client');
  return {
    db: new PrismaClient({
      datasources: { db: { url: 'file:./test.db' } },
    }),
  };
});
vi.mock('./db', async () => {
  const { PrismaClient } = await import('@/generated/prisma/client');
  return {
    db: new PrismaClient({
      datasources: { db: { url: 'file:./test.db' } },
    }),
  };
});

// 3. Import Service Layer (Now using the mocked DB)
import { createCharge, getCharge, getChargeByHash, updateChargeStatus } from './charges';

// 4. Setup Test Helper DB
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: testDbUrl,
    },
  },
});

describe('Charge service layer', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDbUrl;
    try {
      // 1. Generate Client & Engine (Fixes the missing binary error)
      execSync(`npx prisma generate --schema=prisma/schema.prisma`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'ignore',
      });

      // 2. Push Schema
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'ignore',
      });
    } catch (e) {
      console.error("Setup failed:", e);
    }
  });

  beforeEach(async () => {
    await testDb.charge.deleteMany();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('should create a Charge', async () => {
    const chargeData = {
      amountSat: 10000,
      description: 'Service test',
      webhookUrl: 'https://example.com',
      paymentHash: 'hash_svc_123',
      invoice: 'lnbc...',
      metadata: { orderId: '555' },
      expiresAt: new Date(Date.now() + 3600000)
    };

    const charge = await createCharge(chargeData);

    expect(charge).toBeDefined();
    expect(charge.id).toBeDefined();
    expect(charge.amountSat).toBe(10000);
    expect(charge.metadata).toBe(JSON.stringify({ orderId: '555' }));
    
    // Verify persistence
    const saved = await testDb.charge.findUnique({ where: { id: charge.id } });
    expect(saved).toBeDefined();
  });

  it('should find a Charge by ID', async () => {
    const created = await testDb.charge.create({
      data: {
        amountSat: 5000,
        paymentHash: 'hash_find_id',
        invoice: 'lnbc...',
        status: 'pending'
      }
    });

    const found = await getCharge(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('should find a Charge by payment hash', async () => {
    const created = await createCharge({
      amountSat: 3000,
      paymentHash: 'hash_find_789',
      invoice: 'lnbc...',
    });

    const found = await getChargeByHash('hash_find_789');
    
    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.amountSat).toBe(3000);
  });

  it('should update charge status', async () => {
    const created = await createCharge({
      amountSat: 1000,
      paymentHash: 'hash_update',
      invoice: 'lnbc...',
    });

    const updated = await updateChargeStatus('hash_update', 'paid');

    expect(updated?.status).toBe('paid');
    
    // Verify DB
    const saved = await testDb.charge.findUnique({ where: { id: created.id } });
    expect(saved?.status).toBe('paid');
  });
});