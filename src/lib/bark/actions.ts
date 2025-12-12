'use server';

import { revalidatePath } from 'next/cache';
import { decode } from 'light-bolt11-decoder';
import { env } from '../env';
import { SendL1Schema, SendL2Schema, type SendL1Input, type SendL2Input, SendLightningSchema, type SendLightningInput, CreateInvoiceSchema, type CreateInvoiceInput } from './schemas';

/**
 * Generates a new On-Chain Bitcoin Address.
 * 
 * IMPLEMENTATION NOTE: 
 * We use a manual 'fetch' here because the generated SDK incorrectly 
 * uses GET for this endpoint, while the Bark Server mandates POST.
 * 
 * Endpoint: POST /api/v1/onchain/addresses/next
 * Response: { "address": "tb1q..." }
 */
export async function getNewOnchainAddress(): Promise<string | null> {
  console.log(`[Server] Requesting new L1 address...`);
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/onchain/addresses/next`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Address generation failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Confirmed via SDK definition (Address interface)
    if (data && typeof data.address === 'string') {
      return data.address;
    }

    console.error('Invalid response format from daemon', data);
    return null;

  } catch (error) {
    console.error('Failed to get new address:', error);
    return null;
  }
}

/**
 * Generates a new Ark L2 Address.
 * 
 * IMPLEMENTATION NOTE: 
 * We use a manual 'fetch' here because the generated SDK may not support
 * this endpoint correctly.
 * 
 * Endpoint: POST /api/v1/wallet/addresses/next
 * Response: { "address": "tark..." }
 */
export async function getNewArkAddress(): Promise<string | null> {
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/wallet/addresses/next`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Ark address generation failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (data && typeof data.address === 'string') {
      return data.address;
    }

    console.error('Invalid response format from daemon', data);
    return null;

  } catch (error) {
    console.error('Failed to get new Ark address:', error);
    return null;
  }
}

export type SendResponse = {
  success: boolean;
  message: string;
};

export type CreateInvoiceResponse = {
  success: boolean;
  invoice?: string;
  paymentHash?: string;
  message?: string;
};

export type CheckLightningStatusResponse = {
  success: boolean;
  status: string;
};

async function postJson(url: string, body: Record<string, unknown>): Promise<SendResponse> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body),
      });
  
      // Read response text FIRST
      const rawText = await response.text();
  
      if (!response.ok) {
        // Try to parse as JSON
        try {
          const data = JSON.parse(rawText);
          if (data?.message) return { success: false, message: data.message };
          if (data?.error) return { success: false, message: data.error };
        } catch {
          // Not JSON, fall through to return raw text
        }
  
        // Return raw text if JSON parsing failed or no message/error field
        return {
          success: false,
          message: rawText || `Request failed: ${response.status} ${response.statusText}`,
        };
      }
  
      // Success case: try to parse JSON for potential message
      try {
        const data = JSON.parse(rawText);
        if (data?.message) return { success: true, message: data.message };
      } catch {
        // Not JSON, use default success message
      }
  
      return { success: true, message: 'Action successful' };
    } catch (error) {
      console.error('Request failed', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

export async function sendArkPayment(input: SendL2Input): Promise<SendResponse> {
  const parsed = SendL2Schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid request',
    };
  }

  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/wallet/send`;

  const payload = {
    destination: parsed.data.destination,
    amount_sat: parsed.data.amount,
    ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
  };

  return postJson(url, payload);
}

export async function sendOnchainPayment(input: SendL1Input): Promise<SendResponse> {
  const parsed = SendL1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid request',
    };
  }

  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/onchain/send`;

  const payload = {
    destination: parsed.data.destination,
    amount_sat: parsed.data.amount,
  };

  return postJson(url, payload);
}

/**
 * Syncs the node by calling both wallet and onchain sync endpoints.
 * Revalidates the dashboard page after successful sync.
 */
export async function syncNode(): Promise<void> {
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    
    // Perform both sync operations
    const walletSyncPromise = fetch(`${baseUrl}/api/v1/wallet/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const onchainSyncPromise = fetch(`${baseUrl}/api/v1/onchain/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    // Wait for both syncs to complete
    const [walletResponse, onchainResponse] = await Promise.all([
      walletSyncPromise,
      onchainSyncPromise,
    ]);

    // Check if both were successful
    if (walletResponse.ok && onchainResponse.ok) {
      revalidatePath('/');
    } else {
      console.error('Sync failed:', {
        wallet: walletResponse.status,
        onchain: onchainResponse.status,
      });
    }
  } catch (error) {
    console.error('Failed to sync node:', error);
  }
}

export async function sendLightningPayment(input: SendLightningInput): Promise<SendResponse> {
    const parsed = SendLightningSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Invalid request',
      };
    }
  
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/lightning/pay`; // Specific endpoint
  
    const payload = {
      destination: parsed.data.destination,
      amount_sat: parsed.data.amount, // Optional
      ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
    };
  
    return postJson(url, payload);
  }

/**
 * Creates a Lightning invoice for receiving funds.
 * Endpoint: POST /api/v1/lightning/receives/invoice
 * Body: { amount_sat: input.amount, description: input.description }
 */
export async function createLightningInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResponse> {
  const parsed = CreateInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid request',
    };
  }

  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/lightning/receives/invoice`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        amount_sat: parsed.data.amount,
        description: parsed.data.description,
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      try {
        const data = JSON.parse(rawText);
        return {
          success: false,
          message: data?.message || data?.error || rawText || `Request failed: ${response.status} ${response.statusText}`,
        };
      } catch {
        return {
          success: false,
          message: rawText || `Request failed: ${response.status} ${response.statusText}`,
        };
      }
    }

    try {
      const data = JSON.parse(rawText);
      if (data?.invoice) {
        const invoice = data.invoice;

        try {
          const decoded = decode(invoice);
          const hashSection = decoded.sections?.find(
            (s): s is { name: 'payment_hash'; tag: 'p'; letters: string; value: string } =>
              s.name === 'payment_hash',
          );
          const paymentHash = hashSection?.value;

          if (!paymentHash || typeof paymentHash !== 'string') {
            console.error(
              'Payment hash not found in decoded invoice',
              decoded,
            );
            return {
              success: false,
              message: 'Failed to extract payment hash from invoice (required for status polling)',
            };
          }

          return {
            success: true,
            invoice,
            paymentHash,
            message: data?.message || 'Invoice created successfully',
          };
        } catch (decodeError) {
          console.error('Failed to decode invoice:', decodeError);
          return {
            success: false,
            message: 'Failed to decode invoice (required for payment hash extraction)',
          };
        }
      }
      return {
        success: false,
        message: data?.message || 'Invalid response format: missing invoice',
      };
    } catch {
      return {
        success: false,
        message: 'Invalid response format: not JSON',
      };
    }
  } catch (error) {
    console.error('Failed to create invoice', error);
    return {
      success: false,
      message: 'Network error occurred',
    };
  }
}

/**
 * Checks the status of a Lightning payment by payment hash.
 * Endpoint: GET /api/v1/lightning/receives/{paymentHash}
 * Returns: { success: boolean, status: string } (e.g., "settled", "pending", "expired")
 */
export async function checkLightningStatus(paymentHash: string): Promise<CheckLightningStatusResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/lightning/receives/${paymentHash}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const rawText = await response.text();

    if (!response.ok) {
      try {
        const data = JSON.parse(rawText);
        return {
          success: false,
          status: data?.status || data?.message || data?.error || 'unknown',
        };
      } catch {
        return {
          success: false,
          status: 'unknown',
        };
      }
    }

    try {
      const data = JSON.parse(rawText);
      return {
        success: true,
        status: data?.status || 'unknown',
      };
    } catch {
      return {
        success: false,
        status: 'unknown',
      };
    }
  } catch (error) {
    console.error('Failed to check lightning status', error);
    return {
      success: false,
      status: 'unknown',
    };
  }
}

/**
 * Refreshes a specific VTXO by ID.
 * Endpoint: POST /api/v1/wallet/refresh/vtxos
 * Body: { vtxos: [vtxoId] }
 */
export async function refreshVtxo(vtxoId: string): Promise<SendResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/wallet/refresh/vtxos`;

  const result = await postJson(url, { vtxos: [vtxoId] });

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'VTXO refreshed successfully' };
  }

  return result;
}

/**
 * Refreshes all VTXOs.
 * Endpoint: POST /api/v1/wallet/refresh/all
 * Body: {}
 */
export async function refreshAllVtxos(): Promise<SendResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/wallet/refresh/all`;

  const result = await postJson(url, {});

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'All VTXOs refreshed successfully' };
  }

  return result;
}

/**
 * Force exits all funds to Bitcoin L1 (emergency).
 * Endpoint: POST /api/v1/exits/start/all
 * Body: {}
 */
export async function forceExitAll(): Promise<SendResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/exits/start/all`;

  const result = await postJson(url, {});

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'Emergency exit started' };
  }

  return result;
}

/**
 * Exits a VTXO to L1 (Offboard).
 * Endpoint: POST /api/v1/wallet/offboard/vtxos
 * Body: { vtxos: [vtxoId] }
 */
export async function exitVtxo(vtxoId: string): Promise<SendResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/wallet/offboard/vtxos`;

  const result = await postJson(url, { vtxos: [vtxoId] });

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'VTXO exited to L1 successfully' };
  }

  return result;
}

/**
 * Onboards L1 Bitcoin funds to Ark L2 (Deposit).
 * Endpoint: POST /api/v1/boards/board-amount
 * Body: { amount_sat: amount }
 */
export async function onboardFunds(amount: number): Promise<SendResponse> {
  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/boards/board-amount`;

  const result = await postJson(url, { amount_sat: amount });

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'Funds onboarded successfully' };
  }

  return result;
}

/**
 * Claims a VTXO by broadcasting the sweep transaction to L1.
 * Endpoint: POST /api/v1/exits/claim/vtxos
 * Body: { vtxos: [vtxoId], destination: address }
 */
export async function claimVtxo(vtxoId: string): Promise<SendResponse> {
  console.log(`[Server] Starting claim for VTXO: ${vtxoId}`);
  // First, get a new onchain address for the destination
  const destination = await getNewOnchainAddress();
  
  if (!destination) {
    return {
      success: false,
      message: 'Failed to generate destination address',
    };
  }

  console.log(`[Server] Generated sweep address: ${destination}`);

  const baseUrl = env.BARKD_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/exits/claim/vtxos`;

  const result = await postJson(url, { vtxos: [vtxoId], destination });

  console.log(`[Server] Claim response:`, JSON.stringify(result));

  if (result.success) {
    revalidatePath('/coins');
    return { success: true, message: 'Funds claimed successfully' };
  }

  return result;
}