import { z } from 'zod';

/**
 * Schema for creating a charge via the public API.
 * - amount: minimum 1 sat
 * - description: optional string
 * - webhookUrl: optional valid URL
 * - metadata: optional record of string keys to any values
 */
export const ApiCreateChargeSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1 sat'),
  description: z.string().optional(),
  webhookUrl: z.string().url('Webhook URL must be a valid URL').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ApiCreateChargeInput = z.infer<typeof ApiCreateChargeSchema>;
