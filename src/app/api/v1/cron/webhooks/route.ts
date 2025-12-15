import { NextResponse } from 'next/server';
import { processWebhooks } from '@/lib/fetch/webhook-worker';

export async function GET() {
  try {
    const stats = await processWebhooks();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in webhook cron endpoint:', errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

