import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';

// 1. Fix Hoisting: Define constants and set DATABASE_URL BEFORE any imports
const { testDbUrl } = vi.hoisted(() => {
  const url = 'file:./test.db';
  // Set DATABASE_URL at the very top to ensure it applies before Prisma Client instantiation
  process.env.DATABASE_URL = url;
  
  // Clear any existing global Prisma instance to ensure fresh connection
  const globalForPrisma = globalThis as unknown as { prisma?: unknown };
  if (globalForPrisma.prisma) {
    delete globalForPrisma.prisma;
  }
  
  return { testDbUrl: url };
});

// 2. Import dependencies AFTER env is set (no db mock - use real db.ts with test DATABASE_URL)
import { GET } from './route';
import { createCharge, getCharge } from '@/lib/fetch/charges';
import { db } from '@/lib/fetch/db';

// 3. Test Helper DB (Independent connection for verification)
const testDb = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

describe('GET /api/v1/charges/[id]', () => {
  beforeAll(async () => {
    // Ensure DATABASE_URL is set (already set in hoisted, but ensure it's still set)
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
      throw e; // Fail fast if setup fails
    }
  });

  beforeEach(async () => {
    await testDb.charge.deleteMany();
  });

  afterAll(async () => {
    await testDb.$disconnect();
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

    // 2. Verify it exists (Sanity Check) - verify both service layer and direct DB access
    const check = await getCharge(created.id);
    expect(check).toBeDefined();
    
    // Also verify via direct DB access to ensure same instance
    const dbCheck = await db.charge.findUnique({ where: { id: created.id } });
    expect(dbCheck).toBeDefined();

    // 3. Call API
    const mockRequest = new NextRequest(`http://localhost/api/v1/charges/${created.id}`);
    const mockParams = Promise.resolve({ id: created.id });

    const response = await GET(mockRequest, { params: mockParams });
    
    // 4. Debug if failure - log actual response text
    if (response.status !== 200) {
      const responseText = await response.text();
      console.error('Test Failed Response Status:', response.status);
      console.error('Test Failed Response Body:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        console.error('Test Failed Response JSON:', errorData);
      } catch {
        // Not JSON, already logged as text
      }
    }
    
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.amountSat).toBe(5000);
    expect(data.description).toBe('GET Test');
    expect(data.webhookUrl).toBe('https://example.com');
    expect(data.paymentHash).toBe('hash_123');
    expect(data.invoice).toBe('lnbc...');
    expect(data.status).toBe('pending');
    
    // Parse metadata JSON string before comparing
    expect(data.metadata).toBeDefined();
    expect(JSON.parse(data.metadata)).toEqual({ orderId: '999' });
    
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
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
    
    // Debug if failure
    if (response.status !== 200) {
      const responseText = await response.text();
      console.error('Test Failed Response Status:', response.status);
      console.error('Test Failed Response Body:', responseText);
    }
    
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.amountSat).toBe(100);
    expect(data.description).toBeNull();
    expect(data.webhookUrl).toBeNull();
    expect(data.metadata).toBeNull();
  });
});