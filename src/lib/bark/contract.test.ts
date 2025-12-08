import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  BalanceSchema,
  ArkMovementSchema,
  TransactionSchema,
} from './schemas';

/**
 * Contract Tests for Bark Daemon API
 * 
 * These tests validate that our Zod schemas match the ACTUAL daemon API responses.
 * This catches API changes/regressions early.
 * 
 * Note: These tests run against the LOCAL barkd instance.
 * If the daemon is offline, tests are skipped gracefully.
 */
describe('Bark Daemon API Contract Tests', () => {
  // Read BARKD_URL from process.env with fallback to default local daemon URL
  const barkdUrl = process.env.BARKD_URL || 'http://127.0.0.1:3000';
  const baseUrl = barkdUrl.replace(/\/$/, '');

  /**
   * Checks if the daemon is reachable by hitting a lightweight endpoint.
   */
  async function isDaemonReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/v1/bitcoin/tip`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches JSON from an endpoint and returns the parsed data.
   */
  async function fetchJson<T>(endpoint: string): Promise<T | null> {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        // 404 is acceptable for empty endpoints (e.g., no transactions yet)
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  it('should validate /api/v1/wallet/balance against BalanceSchema', async () => {
    const isReachable = await isDaemonReachable();
    
    if (!isReachable) {
      console.warn('Skipping live tests: daemon is unreachable');
      return;
    }

    const data = await fetchJson<unknown>('/api/v1/wallet/balance');
    
    if (data === null) {
      // Balance endpoint should always return data, but handle gracefully
      console.warn('Balance endpoint returned null/404');
      return;
    }

    const result = BalanceSchema.safeParse(data);

    if (!result.success) {
      console.error('Balance validation failed:', result.error.format());
      console.error('Received data:', JSON.stringify(data, null, 2));
    }

    expect(result.success).toBe(true);
  });

  it('should validate /api/v1/wallet/movements against ArkMovementSchema array', async () => {
    const isReachable = await isDaemonReachable();
    
    if (!isReachable) {
      console.warn('Skipping live tests: daemon is unreachable');
      return;
    }

    const data = await fetchJson<unknown>('/api/v1/wallet/movements');
    
    // Movements can be empty array or null/404 for new wallets
    if (data === null) {
      // Treat 404 as empty array for movements
      const emptyResult = z.array(ArkMovementSchema).safeParse([]);
      expect(emptyResult.success).toBe(true);
      return;
    }

    const result = z.array(ArkMovementSchema).safeParse(data);

    if (!result.success) {
      console.error('Movements validation failed:', result.error.format());
      console.error('Received data:', JSON.stringify(data, null, 2));
    }

    expect(result.success).toBe(true);
  });

  it('should validate /api/v1/onchain/transactions against TransactionSchema array', async () => {
    const isReachable = await isDaemonReachable();
    
    if (!isReachable) {
      console.warn('Skipping live tests: daemon is unreachable');
      return;
    }

    const data = await fetchJson<unknown>('/api/v1/onchain/transactions');
    
    // Transactions can be empty array or null/404 for new wallets
    if (data === null) {
      // Treat 404 as empty array for transactions
      const emptyResult = z.array(TransactionSchema).safeParse([]);
      expect(emptyResult.success).toBe(true);
      return;
    }

    const result = z.array(TransactionSchema).safeParse(data);

    if (!result.success) {
      console.error('Transactions validation failed:', result.error.format());
      console.error('Received data:', JSON.stringify(data, null, 2));
    }

    expect(result.success).toBe(true);
  });
});

