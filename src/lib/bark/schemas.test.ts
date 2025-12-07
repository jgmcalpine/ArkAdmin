import { describe, it, expect } from 'vitest';
import { BalanceSchema, NodeInfoSchema } from './schemas';

describe('Bark Data Schemas', () => {
  
  describe('BalanceSchema', () => {
    it('should validate a perfect payload', () => {
      const raw = {
        onchainConfirmed: 1000,
        onchainTotal: 2000,
        onchainPending: 0,
        arkSpendable: 500
      };
      const result = BalanceSchema.parse(raw);
      expect(result).toEqual(raw);
    });

    it('should coerce string numbers (JSON BigInts) to JS numbers', () => {
      const raw = {
        onchainConfirmed: "1000", // String from Rust JSON
        onchainTotal: "2000",
        onchainPending: "0",
        arkSpendable: "500"
      };
      const result = BalanceSchema.parse(raw);
      expect(result.onchainConfirmed).toBe(1000); // Should be number
      expect(typeof result.onchainConfirmed).toBe('number');
    });

    it('should apply defaults when fields are missing', () => {
      const raw = {}; // Empty object (Daemon crash response?)
      const result = BalanceSchema.parse(raw);
      
      // Should default to 0, not undefined/crash
      expect(result.onchainConfirmed).toBe(0);
      expect(result.arkSpendable).toBe(0);
    });
  });

  describe('NodeInfoSchema', () => {
    it('should allow partial info', () => {
      const raw = { network: 'signet' };
      const result = NodeInfoSchema.parse(raw);
      expect(result.network).toBe('signet');
      // Optional fields should be undefined
      expect(result.version).toBeUndefined();
    });
  });

});