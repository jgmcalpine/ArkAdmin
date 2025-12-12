'use server';

import { revalidatePath } from 'next/cache';
import { decode } from 'light-bolt11-decoder';
import { env } from '../env';
import { 
  SendL1Schema, 
  SendL2Schema, 
  SendLightningSchema, 
  CreateInvoiceSchema, 
  type SendL1Input, 
  type SendL2Input, 
  type SendLightningInput, 
  type CreateInvoiceInput 
} from './schemas';

// --- Shared Types ---

export type ActionResponse<T = void> = {
  success: boolean;
  message: string;
  data?: T;
};

// Helper type for the decoder since the library might lack types or return loose objects
type Bolt11Section = {
  name: string;
  value: string;
  [key: string]: unknown;
};

// --- Internal Network Helper ---

/**
 * Centralized Fetch wrapper for Bark Daemon.
 * Handles URL construction, Headers, and the "Ugly JSON" error parsing.
 */
async function barkFetch<T = void>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ActionResponse<T>> {
  try {
    // 1. Construct URL
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1${endpoint}`;

    // 2. Default Headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 3. Execute
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    // 4. Robust Response Parsing
    const rawText = await response.text();
    let jsonBody: unknown = null;
    
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      // Not JSON, ignore
    }

    if (!response.ok) {
      // Prioritize structured error messages
      // We safely cast to record to check fields
      const errObj = jsonBody as Record<string, unknown> | null;
      
      const errorMsg = 
        (typeof errObj?.message === 'string' ? errObj.message : null) || 
        (typeof errObj?.error === 'string' ? errObj.error : null) || 
        (rawText.length < 200 ? rawText : `Request failed: ${response.status}`);
        
      return { success: false, message: errorMsg };
    }

    return { 
      success: true, 
      message: 'Success', 
      data: jsonBody as T 
    };

  } catch (error) {
    console.error(`Bark API Error [${endpoint}]:`, error);
    return { success: false, message: 'Network connection failed' };
  }
}

// --- Address Management ---

export async function getNewOnchainAddress(): Promise<string | null> {
  console.log('[Server] Requesting new L1 address...');
  // Explicitly tell barkFetch we expect an object with an 'address' string
  const res = await barkFetch<{ address: string }>('/onchain/addresses/next', { method: 'POST' });
  return res.success && res.data ? res.data.address : null;
}

export async function getNewArkAddress(): Promise<string | null> {
  const res = await barkFetch<{ address: string }>('/wallet/addresses/next', { method: 'POST' });
  return res.success && res.data ? res.data.address : null;
}

// --- Sending ---

export async function sendArkPayment(input: SendL2Input): Promise<ActionResponse> {
  const parsed = SendL2Schema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const res = await barkFetch<void>('/wallet/send', {
    method: 'POST',
    body: JSON.stringify({
      destination: parsed.data.destination,
      amount_sat: parsed.data.amount,
      comment: parsed.data.comment,
    }),
  });

  if (res.success) revalidatePath('/coins');
  return res;
}

export async function sendOnchainPayment(input: SendL1Input): Promise<ActionResponse> {
  const parsed = SendL1Schema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const res = await barkFetch<void>('/onchain/send', {
    method: 'POST',
    body: JSON.stringify({
      destination: parsed.data.destination,
      amount_sat: parsed.data.amount,
    }),
  });

  if (res.success) revalidatePath('/');
  return res;
}

export async function sendLightningPayment(input: SendLightningInput): Promise<ActionResponse> {
  const parsed = SendLightningSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const res = await barkFetch<void>('/lightning/pay', {
    method: 'POST',
    body: JSON.stringify({
      destination: parsed.data.destination,
      amount_sat: parsed.data.amount,
      comment: parsed.data.comment,
    }),
  });

  if (res.success) revalidatePath('/coins');
  return res;
}

// --- Receiving (Invoice) ---

export async function createLightningInvoice(input: CreateInvoiceInput): Promise<ActionResponse<{ invoice: string; paymentHash: string }>> {
  const parsed = CreateInvoiceSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const res = await barkFetch<{ invoice: string }>('/lightning/receives/invoice', {
    method: 'POST',
    body: JSON.stringify({
      amount_sat: parsed.data.amount,
      description: parsed.data.description,
    }),
  });

  if (!res.success || !res.data) return { success: false, message: res.message };

  // Decode Logic
  try {
    const invoice = res.data.invoice;
    const decoded = decode(invoice);
    
    // Type Guard for the sections
    const sections = (decoded.sections || []) as Bolt11Section[];
    const hashSection = sections.find((s) => s.name === 'payment_hash');
    const paymentHash = hashSection?.value;

    if (!paymentHash || typeof paymentHash !== 'string') {
      console.error('Payment hash not found in decoded invoice');
      return {
        success: false,
        message: 'Failed to extract payment hash from invoice (required for status polling)',
      };
    }

    return { 
      success: true, 
      message: 'Invoice created', 
      data: { invoice, paymentHash } 
    };
  } catch (e) {
    console.error('Invoice Decode Error:', e);
    return { success: false, message: 'Created invoice but failed to decode hash.' };
  }
}

export async function checkLightningStatus(paymentHash: string): Promise<{ success: boolean; status: string }> {
  // Define expected shape of response
  const res = await barkFetch<{ status: string; message?: string }>(`/lightning/receives/${paymentHash}`, { method: 'GET' });
  
  if (!res.success) return { success: false, status: 'unknown' };
  
  // Handle inconsistent API returns (sometimes 'status', sometimes 'message')
  const status = res.data?.status || res.data?.message || 'unknown';
  return { success: true, status };
}

// --- VTXO Management ---

export async function refreshVtxo(vtxoId: string): Promise<ActionResponse> {
  const res = await barkFetch<void>('/wallet/refresh/vtxos', {
    method: 'POST',
    body: JSON.stringify({ vtxos: [vtxoId] }),
  });
  if (res.success) revalidatePath('/coins');
  return res;
}

export async function refreshAllVtxos(): Promise<ActionResponse> {
  const res = await barkFetch<void>('/wallet/refresh/all', { method: 'POST', body: '{}' });
  if (res.success) revalidatePath('/coins');
  return res;
}

export async function forceExitAll(): Promise<ActionResponse> {
  const res = await barkFetch<void>('/exits/start/all', { method: 'POST', body: '{}' });
  if (res.success) revalidatePath('/coins');
  return res;
}

export async function exitVtxo(vtxoId: string): Promise<ActionResponse> {
  const res = await barkFetch<void>('/wallet/offboard/vtxos', {
    method: 'POST',
    body: JSON.stringify({ vtxos: [vtxoId] }),
  });
  if (res.success) revalidatePath('/coins');
  return res;
}

export async function claimVtxo(vtxoId: string): Promise<ActionResponse> {
  console.log(`[Server] Starting claim for VTXO: ${vtxoId}`);
  
  // 1. Get Address
  const destination = await getNewOnchainAddress();
  if (!destination) return { success: false, message: 'Failed to generate sweep address' };

  console.log(`[Server] Generated sweep address: ${destination}`);

  // 2. Claim
  const res = await barkFetch<void>('/exits/claim/vtxos', {
    method: 'POST',
    body: JSON.stringify({ vtxos: [vtxoId], destination }),
  });

  console.log(`[Server] Claim response:`, JSON.stringify(res));
  if (res.success) revalidatePath('/coins');
  return res;
}

export async function onboardFunds(amount: number): Promise<ActionResponse> {
  const res = await barkFetch<void>('/boards/board-amount', {
    method: 'POST',
    body: JSON.stringify({ amount_sat: amount }),
  });
  if (res.success) revalidatePath('/coins');
  return res;
}

// --- Sync & Utilities ---

export async function syncNode(): Promise<void> {
  // Fire and forget, but wait for result to revalidate
  await Promise.allSettled([
    barkFetch<void>('/wallet/sync', { method: 'POST' }),
    barkFetch<void>('/onchain/sync', { method: 'POST' })
  ]);
  revalidatePath('/');
}

export async function verifyPosPin(pin: string): Promise<boolean> {
  return pin === env.POS_PIN;
}