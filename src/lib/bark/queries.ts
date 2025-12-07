import { getWalletApi, getOnchainApi } from './client';
import { BalanceSchema, NodeInfoSchema, type Balance, type NodeInfo } from './schemas';

const ZERO_BALANCE: Balance = {
  onchainConfirmed: 0,
  onchainTotal: 0,
  onchainPending: 0,
  arkSpendable: 0,
};

/**
 * Fetches critical node metadata.
 * Prioritizes 'arkInfo' as the source of truth for network status.
 */
export async function fetchNodeInfo(): Promise<NodeInfo | null> {
  try {
    const walletApi = getWalletApi();
    
    const response = await walletApi.arkInfo();
    
    // Validate and Clean
    const result = NodeInfoSchema.safeParse({
      network: response.data.network,
      pubkey: response.data.server_pubkey,
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
      onchainPending: onchainRes.data.trusted_pending_sat, // or unconfirmed_sat depending on need
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