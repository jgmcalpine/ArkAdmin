import { NextResponse } from 'next/server';
import { createLightningInvoice } from '@/lib/bark/actions';
import { createCharge } from '@/lib/fetch/charges';
import { ApiCreateChargeSchema } from '@/lib/fetch/api-schemas';

export async function POST(request: Request) {
  console.log("🔍 API Route Runtime Env:", process.env.DATABASE_URL);

  try {
    const body = await request.json();
    const parsed = ApiCreateChargeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error },
        { status: 400 },
      );
    }

    const { amount, description = '', webhookUrl, metadata } = parsed.data;

    // Create lightning invoice via barkd
    const invoiceResult = await createLightningInvoice({
      amount,
      description,
    });

    if (!invoiceResult.success || !invoiceResult.data) {
      return NextResponse.json(
        { error: invoiceResult.message || 'Failed to create invoice' },
        { status: 502 },
      );
    }

    const { invoice, paymentHash } = invoiceResult.data;

    // Save charge to database
    const charge = await createCharge({
      amountSat: amount,
      description,
      webhookUrl,
      metadata,
      paymentHash,
      invoice,
    });

    return NextResponse.json(
      {
        id: charge.id,
        invoice: charge.invoice,
        paymentHash: charge.paymentHash,
        status: charge.status,
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
