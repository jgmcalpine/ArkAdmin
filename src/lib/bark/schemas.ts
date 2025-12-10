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
 * - captures essential daemon metadata and ASP policy fields
 */
export const NodeInfoSchema = z.object({
  network: z.string().default('unknown'),
  pubkey: z.string().optional(),
  version: z.string().optional(),
  blockHeight: z.number().optional(),
  roundInterval: z.string().optional(), // e.g. "30s"
  minBoardAmount: z.number().optional(),
  serverPubkey: z.string().optional(),
  vtxoExpiryDelta: z.number().optional(), // e.g. 144 blocks
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

export const CreateInvoiceSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least 1 sat'),
  description: z.string().optional().default('Ark Admin Receive'),
});

export const VtxoSchema = z.object({
  id: z.string(),
  amount_sat: z.number(),
  expiry_height: z.number(),
  round_txid: z.string().optional(),
  state: z.object({ type: z.string() }).optional(),
});

const ExitTransactionStatusSchema = z.object({
  type: z.string(), // e.g., "confirmed", "broadcast-with-cpfp", "awaiting-input-confirmation"
});

const ExitTransactionSchema = z.object({
  txid: z.string(),
  status: ExitTransactionStatusSchema,
});

const ExitStateSchema = z.object({
  type: z.string(), // e.g., "processing", "awaiting-delta"
  claimable_height: z.number().optional(),
  transactions: z.array(ExitTransactionSchema).optional(),
  claim_txid: z.string().optional(),
  tip_height: z.number().optional(),
}).passthrough(); // Allow additional unknown fields for flexibility

export const ExitProgressSchema = z.object({
  vtxo_id: z.string(),
  error: z.unknown().optional(),
  state: ExitStateSchema,
});

export const PendingRoundSchema = z.object({
  id: z.number(),
  kind: z.string(), // e.g. "PendingConfirmation"
  round_txid: z.string().optional().nullable(),
});

export const UtxoSchema = z.object({
  outpoint: z.string(),
  amount_sat: z.number(),
  confirmation_height: z.number().nullable().optional(),
}).transform((val) => {
  const [txid, voutStr] = val.outpoint.split(':');
  const vout = parseInt(voutStr, 10);
  
  if (!txid || isNaN(vout)) {
    throw new Error(`Invalid outpoint format: ${val.outpoint}`);
  }
  
  return {
    txid,
    vout,
    amount_sat: val.amount_sat,
    confirmed_height: val.confirmation_height ?? null,
  };
});

export type SendLightningInput = z.infer<typeof SendLightningSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type NodeInfo = z.infer<typeof NodeInfoSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type ArkMovement = z.infer<typeof ArkMovementSchema>;
export type SendL2Input = z.infer<typeof SendL2Schema>;
export type SendL1Input = z.infer<typeof SendL1Schema>;
export type Vtxo = z.infer<typeof VtxoSchema>;
export type ExitProgress = z.infer<typeof ExitProgressSchema>;
export type PendingRound = z.infer<typeof PendingRoundSchema>;
export type Utxo = z.infer<typeof UtxoSchema>;