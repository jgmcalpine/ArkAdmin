import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBarkClient } from '@/lib/bark/client';
import { env } from '@/lib/env';

const StatusResponseSchema = z.object({
  status: z.enum(['online', 'offline']),
  version: z.string().optional(),
  network: z.enum(['signet', 'mainnet']).optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

type StatusResponse = z.infer<typeof StatusResponseSchema>;

export async function GET() {
  try {
    const { wallet } = getBarkClient();
    const response = await wallet.arkInfo();
    const arkInfo = response.data;

    // Extract network from ArkInfo, defaulting to signet if not recognized
    const network = arkInfo.network === 'mainnet' ? 'mainnet' : 'signet';

    const statusResponse: StatusResponse = {
      status: 'online',
      network,
      // Version could be extracted from arkInfo if available, or from SDK
      version: '0.1.0-beta.4', // TODO: Extract from actual SDK version if available
    };

    // Validate response structure
    const validatedResponse = StatusResponseSchema.parse(statusResponse);

    return NextResponse.json(validatedResponse, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    const statusResponse: StatusResponse = {
      status: 'offline',
      error: errorMessage,
      details: env.NODE_ENV === 'development' ? errorDetails : undefined,
    };

    // Validate error response structure
    const validatedResponse = StatusResponseSchema.parse(statusResponse);

    return NextResponse.json(validatedResponse, { status: 503 });
  }
}
