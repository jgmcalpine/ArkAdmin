import { NextResponse } from 'next/server';
import { createLightningInvoice } from '@/lib/bark/actions';
import { createCharge } from '@/lib/fetch/charges';
import { ApiCreateChargeSchema } from '@/lib/fetch/api-schemas';
import { authenticateApiKey } from '@/lib/fetch/auth';

export async function POST(request: Request) {
  console.log("🔍 API Route Runtime Env:", process.env.DATABASE_URL);

  // Authenticate API key before any validation
  if (!(await authenticateApiKey(request))) {
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
    console.log(`❌ POST /api/v1/charges - Status: ${response.status}`);
    return response;
  }

  try {
    const body = await request.json();
    const validation = ApiCreateChargeSchema.safeParse(body);

    if (!validation.success) {
      const response = NextResponse.json(
        { error: 'Validation error', details: validation.error },
        { status: 400 },
      );
      console.log(`❌ POST /api/v1/charges - Status: ${response.status} - Validation error`);
      return response;
    }

    // Create lightning invoice via barkd
    const invoiceRes = await createLightningInvoice({
      amount: validation.data.amount,
      description: validation.data.description ?? '',
    });

    if (!invoiceRes.success || !invoiceRes.data) {
      const response = NextResponse.json(
        { error: invoiceRes.message || 'Failed to create invoice' },
        { status: 502 },
      );
      console.log(`❌ POST /api/v1/charges - Status: ${response.status} - Upstream error`);
      return response;
    }

    // Save charge to database
    const charge = await createCharge({
      amountSat: validation.data.amount,
      description: validation.data.description,
      webhookUrl: validation.data.webhookUrl,
      metadata: validation.data.metadata,
      paymentHash: invoiceRes.data.paymentHash,
      invoice: invoiceRes.data.invoice,
    });

    const response = NextResponse.json(
      {
        id: charge.id,
        invoice: charge.invoice,
        paymentHash: charge.paymentHash,
        status: charge.status,
      },
      { status: 201 },
    );
    console.log(`✅ POST /api/v1/charges - Status: ${response.status} - Charge created: ${charge.id}`);
    return response;
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError || error instanceof TypeError) {
      const response = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
      console.log(`❌ POST /api/v1/charges - Status: ${response.status} - JSON parse error`);
      return response;
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
    console.log(`❌ POST /api/v1/charges - Status: ${response.status} - ${errorMessage}`);
    return response;
  }
}

