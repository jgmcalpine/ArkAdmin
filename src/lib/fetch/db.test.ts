import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'child_process';
import { createCharge, getCharge, getChargeByHash, updateChargeStatus } from './charges';

// Use a separate test database file
const testDbUrl = 'file:./test.db';

// Set DATABASE_URL for the db singleton used by the service layer
process.env.DATABASE_URL = testDbUrl;

const testDb = new PrismaClient({
  datasources: {
    db: {
      url: testDbUrl,
    },
  },
});

describe('Charge service layer', () => {
  beforeAll(async () => {
    // Ensure test database schema is created
    try {
      execSync(`npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'ignore',
      });
    } catch {
      // Schema might already exist, continue
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await testDb.charge.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await testDb.charge.deleteMany();
  });

  afterAll(async () => {
    // Close the database connection
    await testDb.$disconnect();
  });

  it('should create a Charge', async () => {
    const metadata = { orderId: '123' };
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    const charge = await createCharge({
      amountSat: 10000,
      description: 'Test payment',
      webhookUrl: 'https://example.com/webhook',
      paymentHash: 'test_hash_123',
      invoice: 'lnbc100n1p3test...',
      metadata,
      expiresAt,
    });

    expect(charge).toBeDefined();
    expect(charge.id).toBeDefined();
    expect(charge.amountSat).toBe(10000);
    expect(charge.description).toBe('Test payment');
    expect(charge.webhookUrl).toBe('https://example.com/webhook');
    expect(charge.status).toBe('pending');
    expect(charge.webhookStatus).toBe('pending');
    expect(charge.paymentHash).toBe('test_hash_123');
    expect(charge.invoice).toBe('lnbc100n1p3test...');
    expect(charge.metadata).toBe(JSON.stringify(metadata));
    expect(charge.expiresAt).toEqual(expiresAt);
    expect(charge.createdAt).toBeInstanceOf(Date);
    expect(charge.updatedAt).toBeInstanceOf(Date);

    // Verify metadata can be parsed
    if (charge.metadata) {
      const parsedMetadata = JSON.parse(charge.metadata);
      expect(parsedMetadata).toEqual(metadata);
      expect(parsedMetadata.orderId).toBe('123');
    }
  });

  it('should find a Charge by ID', async () => {
    const metadata = { customField: 'test_value' };
    const expiresAt = new Date(Date.now() + 7200000); // 2 hours from now

    const createdCharge = await createCharge({
      amountSat: 5000,
      description: 'Find test',
      paymentHash: 'find_hash_456',
      invoice: 'lnbc50n1p3find...',
      metadata,
      expiresAt,
    });

    const foundCharge = await getCharge(createdCharge.id);

    expect(foundCharge).toBeDefined();
    expect(foundCharge?.id).toBe(createdCharge.id);
    expect(foundCharge?.amountSat).toBe(5000);
    expect(foundCharge?.description).toBe('Find test');
    expect(foundCharge?.paymentHash).toBe('find_hash_456');
    expect(foundCharge?.metadata).toBe(JSON.stringify(metadata));
    expect(foundCharge?.expiresAt).toEqual(expiresAt);
  });

  it('should find a Charge by payment hash', async () => {
    const createdCharge = await createCharge({
      amountSat: 3000,
      description: 'Hash find test',
      paymentHash: 'hash_find_789',
      invoice: 'lnbc30n1p3hash...',
    });

    const foundCharge = await getChargeByHash('hash_find_789');

    expect(foundCharge).toBeDefined();
    expect(foundCharge?.id).toBe(createdCharge.id);
    expect(foundCharge?.paymentHash).toBe('hash_find_789');
    expect(foundCharge?.amountSat).toBe(3000);
  });

  it('should update charge status', async () => {
    const createdCharge = await createCharge({
      amountSat: 7500,
      description: 'Update status test',
      paymentHash: 'update_status_hash_789',
      invoice: 'lnbc75n1p3update...',
    });

    expect(createdCharge.status).toBe('pending');

    const updatedCharge = await updateChargeStatus('update_status_hash_789', 'paid');

    expect(updatedCharge).toBeDefined();
    expect(updatedCharge?.status).toBe('paid');
    expect(updatedCharge?.paymentHash).toBe('update_status_hash_789');
    expect(updatedCharge?.id).toBe(createdCharge.id);

    // Verify the update persisted
    const foundCharge = await getChargeByHash('update_status_hash_789');
    expect(foundCharge?.status).toBe('paid');
  });
});
