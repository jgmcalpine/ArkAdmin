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

export const SendL2Schema = z.object({
  destination: z.string().min(10, 'Destination must be at least 10 characters'),
  amount: z
    .number()
    .positive()
    .min(10000, 'Ark payments must be at least 10,000 sats'),
  comment: z.string().optional(),
});

export const SendL1Schema = z.object({
  destination: z
    .string()
    .regex(/^(tb1|m|n).+/, 'Destination must start with tb1, m, or n'),
  amount: z
    .number()
    .positive()
    .min(546, 'Amount must be at least 546 sats (Dust Limit)'),
});

export const SendLightningSchema = z.object({
  destination: z.string().startsWith('ln', { message: "Must be a Lightning invoice" }),
  amount: z.coerce.number().positive().optional(), // Optional because invoice might have amount
  comment: z.string().optional(),
});

export type SendLightningInput = z.infer<typeof SendLightningSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type NodeInfo = z.infer<typeof NodeInfoSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type ArkMovement = z.infer<typeof ArkMovementSchema>;
export type SendL2Input = z.infer<typeof SendL2Schema>;
export type SendL1Input = z.infer<typeof SendL1Schema>;