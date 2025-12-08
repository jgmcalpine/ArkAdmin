'use server';

import { env } from '../env';
import { SendL1Schema, SendL2Schema, type SendL1Input, type SendL2Input } from './schemas';

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
export async function getNewAddress(): Promise<string | null> {
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

type SendResponse = {
  success: boolean;
  message: string;
};

async function postJson(url: string, body: Record<string, unknown>): Promise<SendResponse> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => null);
      return {
        success: false,
        message: errorText || `Request failed: ${response.status} ${response.statusText}`,
      };
    }

    return { success: true, message: 'Payment sent successfully' };
  } catch (error) {
    console.error('Payment request failed', error);
    return { success: false, message: 'Network error while sending payment' };
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