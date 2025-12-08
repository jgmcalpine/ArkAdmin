import { env } from '../env';
import { z } from 'zod';
import { getWalletApi, getOnchainApi } from './client';
import { 
  BalanceSchema, 
  NodeInfoSchema, 
  TransactionSchema, 
  ArkMovementSchema,
  type Balance, 
  type NodeInfo, 
  type Transaction,
  type ArkMovement, 
} from './schemas';

const ZERO_BALANCE: Balance = {
  onchainConfirmed: 0,
  onchainTotal: 0,
  onchainPending: 0,
  arkSpendable: 0,
};

/**
 * Fetches critical node metadata.
 * Uses manual fetch to hit the specific endpoints revealed by the documentation.
 */
export async function fetchNodeInfo(): Promise<NodeInfo | null> {
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    
    let blockHeight = 0;
    let network = 'unknown';
    const version = 'unknown'; // Version not currently exposed in ark-info
    
    // 1. Get Block Height from Bitcoin API
    try {
      const tipRes = await fetch(`${baseUrl}/api/v1/bitcoin/tip`, {
        cache: 'no-store',
      });
      
      if (tipRes.ok) {
        const data = await tipRes.json();
        // Mapping: JSON { "tip_height": 281745 } -> App "blockHeight"
        if (typeof data.tip_height === 'number') {
          blockHeight = data.tip_height;
        }
      }
    } catch (e) {
      console.warn('DAL: Failed to fetch bitcoin tip', e);
    }
    
    // 2. Get Network from Wallet API
    try {
      const infoRes = await fetch(`${baseUrl}/api/v1/wallet/ark-info`, { 
        cache: 'no-store' 
      });
      
      if (infoRes.ok) {
        const data = await infoRes.json();
        // Mapping: JSON { "network": "signet" } -> App "network"
        if (data?.network) {
          network = data.network;
        }
      }
    } catch (e) {
      console.warn('DAL: Failed to fetch ark-info', e);
    }
    
    // Validate and return
    const result = NodeInfoSchema.safeParse({
      network,
      blockHeight,
      version,
    });

    if (!result.success) {
      console.warn('DAL: Received invalid node info format', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('DAL: Failed to fetch node info', error);
    return null;
  }
}

/**
 * Fetches and aggregates balances from multiple API endpoints (L1 + Ark).
 */
export async function fetchBalances(): Promise<Balance> {
  try {
    const walletApi = getWalletApi();
    const onchainApi = getOnchainApi();

    // Parallel Execution for performance
    const [arkRes, onchainRes] = await Promise.all([
      walletApi.balance(),
      onchainApi.onchainBalance(),
    ]);

    // Data Mapping Layer: Rust (snake_case) -> App (camelCase)
    const rawData = {
      onchainConfirmed: onchainRes.data.confirmed_sat,
      onchainTotal: onchainRes.data.total_sat,
      onchainPending: onchainRes.data.trusted_pending_sat,
      arkSpendable: arkRes.data.spendable_sat,
    };

    const result = BalanceSchema.safeParse(rawData);

    if (!result.success) {
      console.warn('DAL: Balance validation failed', result.error);
      return ZERO_BALANCE;
    }

    return result.data;
  } catch (error) {
    console.error('DAL: Failed to fetch balances', error);
    return ZERO_BALANCE;
  }
}

/**
 * Fetches On-Chain Transactions.
 * Endpoint: GET /api/v1/onchain/transactions
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/onchain/transactions`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      // 404 is common if wallet is empty/fresh
      if (response.status !== 404) {
        console.warn(`Transactions fetch failed: ${response.status}`);
      }
      return [];
    }

    const rawData = await response.json();
    
    // Validate against our schema
    const result = z.array(TransactionSchema).safeParse(rawData);
    
    if (!result.success) {
      console.warn('Transaction data malformed', result.error);
      return [];
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
}

/**
 * Fetches Ark (L2) movements history.
 * Endpoint: GET /api/v1/wallet/movements
 */
export async function fetchArkMovements(): Promise<ArkMovement[]> {
  try {
    const baseUrl = env.BARKD_URL.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/wallet/movements`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(`Ark movements fetch failed: ${response.status}`);
      }
      return [];
    }

    const rawData = await response.json();
    const result = z.array(ArkMovementSchema).safeParse(rawData);

    if (!result.success) {
      console.warn('Ark movements data malformed', result.error);
      return [];
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch ark movements:', error);
    return [];
  }
}