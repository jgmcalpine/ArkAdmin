import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';

// 1. Setup Env vars before imports
// Use a unique DB file for GET tests to avoid locking conflicts
const { testDbUrl, dbFileName } = vi.hoisted(() => {
  const url = 'file:./get_route_test.db';
  const fileName = './get_route_test.db';
  
  process.env.DATABASE_URL = url;
  
  // Clear global instance
  const globalForPrisma = globalThis as unknown as { prisma?: unknown };
  if (globalForPrisma.prisma) {
    delete globalForPrisma.prisma;
  }
  
  return { testDbUrl: url, dbFileName: fileName };
});

// 2. Import Dependencies (No mocking needed for DB, we use real file via env var)
import { GET } from './route';
import { createCharge } from '@/lib/fetch/charges';

// 3. Test Helper
const testDb = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

describe('GET /api/v1/charges/[id]', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDbUrl;
    
    // Clean start
    if (fs.existsSync(dbFileName)) {
      try { fs.unlinkSync(dbFileName); } catch {}
    }

    try {
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
      });
    } catch (e) {
      console.error("DB Setup Failed:", e);
      throw e;
    }
  });

  beforeEach(async () => {
    await testDb.charge.deleteMany();
  });

  afterAll(async () => {
    await testDb.$disconnect();
    // Cleanup
    if (fs.existsSync(dbFileName)) {
        try { fs.unlinkSync(dbFileName); } catch {}
    }
    if (fs.existsSync(dbFileName + '-journal')) {
        try { fs.unlinkSync(dbFileName + '-journal'); } catch {}
    }
  });

  it('should return 404 when charge not found', async () => {
    const mockRequest = new NextRequest('http://localhost/api/v1/charges/non-existent-id');
    const mockParams = Promise.resolve({ id: 'non-existent-id' });

    const response = await GET(mockRequest, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Charge not found');
  });

  it('should return 200 with charge object when found', async () => {
    // 1. Create Data via Service Layer
    const created = await createCharge({
      amountSat: 5000,
      description: 'GET Test',
      webhookUrl: 'https://example.com',
      paymentHash: 'hash_123',
      invoice: 'lnbc...',
      metadata: { orderId: '999' },
    });

    // 2. Call API
    const mockRequest = new NextRequest(`http://localhost/api/v1/charges/${created.id}`);
    const mockParams = Promise.resolve({ id: created.id });

    const response = await GET(mockRequest, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.amountSat).toBe(5000);
    
    // Parse metadata to avoid string mismatch issues
    const meta = JSON.parse(data.metadata);
    expect(meta).toEqual({ orderId: '999' });
  });

  it('should return 200 with charge object without optional fields', async () => {
    const created = await createCharge({
      amountSat: 100,
      paymentHash: 'hash_min',
      invoice: 'lnbc_min...',
    });

    const mockRequest = new NextRequest(`http://localhost/api/v1/charges/${created.id}`);
    const mockParams = Promise.resolve({ id: created.id });

    const response = await GET(mockRequest, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.description).toBeNull();
  });
});