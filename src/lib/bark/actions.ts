'use server';

import { env } from '../env';

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