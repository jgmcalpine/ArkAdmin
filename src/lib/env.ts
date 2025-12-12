import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BARKD_URL: z.string().url('BARKD_URL must be a valid URL'),
  POS_PIN: z.string().default('1234'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parseResult.data;
