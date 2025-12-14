import { NextResponse } from 'next/server';
import { getCharge } from '@/lib/fetch/charges';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const charge = await getCharge(id);

    if (!charge) {
      return NextResponse.json(
        { error: 'Charge not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(charge, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
