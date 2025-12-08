import { z } from 'zod';

/**
 * Balance Schema
 * - Coerces strings to numbers (handling JSON bigints)
 * - Defaults to 0 to ensure UI components always receive valid numbers
 * - Normalizes to camelCase for frontend consistency
 */
export const BalanceSchema = z.object({
  onchainConfirmed: z.coerce.number().default(0),
  onchainTotal: z.coerce.number().default(0),
  onchainPending: z.coerce.number().default(0),
  arkSpendable: z.coerce.number().default(0),
});

/**
 * Node Info Schema
 * - captures essential daemon metadata
 */
export const NodeInfoSchema = z.object({
  network: z.string().default('unknown'),
  pubkey: z.string().optional(),
  version: z.string().optional(),
  blockHeight: z.number().optional(),
});

export const TransactionSchema = z.object({
  txid: z.string(),
  tx: z.string().optional(),
});

export const ArkMovementSchema = z.object({
  id: z.number(),
  status: z.string(),
  intended_balance_sat: z.number(),
  subsystem: z.object({
    kind: z.string(),
  }),
  time: z.object({
    created_at: z.string(),
  }),
});

export type Balance = z.infer<typeof BalanceSchema>;
export type NodeInfo = z.infer<typeof NodeInfoSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type ArkMovement = z.infer<typeof ArkMovementSchema>;