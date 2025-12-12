import type { ExitProgress, PendingRound } from './schemas';

export interface ActivityItem {
  id: string;
  type: 'exit' | 'round';
  title: string;
  vtxoIds: string[];
  progress: number;
  statusLabel: string;
  txid?: string;
  blockLink?: { height: number; url?: string };
  error?: string;
  action?: 'claim';
  info?: string; // Additional context/info message
  isMining?: boolean; // Flag for mining state (for UI styling)
}

function parseConfirmedBlock(confirmedBlock: unknown): { height: number; hash?: string } | null {
  if (typeof confirmedBlock === 'string') {
    const parts = confirmedBlock.split(':');
    if (parts.length >= 1) {
      const height = parseInt(parts[0], 10);
      if (!isNaN(height)) {
        return { height, hash: parts[1] };
      }
    }
  }
  return null;
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function humanizeError(err: string): string {
  const lowerErr = err.toLowerCase();
  if (lowerErr.includes('package-not-child-with-unconfirmed-parents')) {
    return 'Waiting for Parent Tx Propagation (Mempool Issue)';
  }
  if (lowerErr.includes('min relay fee not met')) {
    return 'Network Rejected: Transaction value is too low (Dust). Try adding L1 funds or this coin may be unrecoverable.';
  }
  if (lowerErr.includes('bad-txns-inputs-missingorspent')) {
    return 'Conflict: This coin is already spent or invalid.';
  }
  if (lowerErr.includes('transaction failed')) {
    return 'Broadcast Failed';
  }
  if (lowerErr.includes('dust')) {
    return 'Value too low for fees (Dust Error)';
  }
  if (lowerErr.includes('insufficient-confirmed-funds')) {
    return 'Insufficient L1 Gas (Deposit BTC)';
  }
  return err;
}

function formatError(error: unknown): string {
  let errorStr: string;
  
  if (typeof error === 'string') {
    errorStr = error;
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as { message?: unknown; error?: unknown };
    if (typeof errorObj.message === 'string') {
      errorStr = errorObj.message;
    } else if (typeof errorObj.error === 'string') {
      errorStr = errorObj.error;
    } else {
      try {
        errorStr = JSON.stringify(error);
      } catch {
        return 'Unknown error';
      }
    }
  } else {
    try {
      errorStr = JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return humanizeError(errorStr);
}

export function mapExitToActivity(exit: ExitProgress, currentHeight: number): ActivityItem {
  const { vtxo_id, state, error } = exit;
  const vtxoIds = [vtxo_id];
  let progress = 0;
  let statusLabel = 'Processing';
  let txid: string | undefined;
  let blockLink: { height: number; url?: string } | undefined;
  let action: 'claim' | undefined;
  
  // Check for errors array in state (from passthrough fields)
  let processedError: string | undefined;
  if (error) {
    processedError = formatError(error);
  } else if (state.type === 'transaction failed') {
    // Handle top-level transaction failed status
    if ('errors' in state && Array.isArray(state.errors) && state.errors.length > 0) {
      // Process errors array if present
      const errorMessages = state.errors
        .map((err: unknown) => {
          if (typeof err === 'string') return humanizeError(err);
          return formatError(err);
        })
        .join('; ');
      processedError = errorMessages;
    } else {
      processedError = 'Broadcast Failed';
    }
  } else if ('errors' in state && Array.isArray(state.errors) && state.errors.length > 0) {
    // Process errors array if present (for other states)
    const errorMessages = state.errors
      .map((err: unknown) => {
        if (typeof err === 'string') return humanizeError(err);
        return formatError(err);
      })
      .join('; ');
    processedError = errorMessages;
  }

  // Case: Already claimed
  if (state.claim_txid) {
    return {
      id: vtxo_id,
      type: 'exit',
      title: 'Unilateral Exit',
      vtxoIds,
      progress: 100,
      statusLabel: 'Claimed on L1',
      txid: state.claim_txid,
      error: processedError,
    };
  }

  // PRIORITY CHECK: Claimable state (timelock expired, ready to sweep)
  if (state.type === 'claimable' || ('claimable_since' in state && state.claimable_since)) {
    return {
      id: vtxo_id,
      type: 'exit',
      title: 'Unilateral Exit',
      vtxoIds,
      progress: 95,
      statusLabel: 'Ready to Claim',
      error: processedError,
      action: 'claim',
    };
  }

  // Case A: awaiting-delta (timelock)
  if (state.type === 'awaiting-delta' && state.claimable_height) {
    const blocksRemaining = Math.max(0, state.claimable_height - currentHeight);
    if (blocksRemaining === 0) {
      return {
        id: vtxo_id,
        type: 'exit',
        title: 'Unilateral Exit',
        vtxoIds,
        progress: 95,
        statusLabel: 'Ready to Claim',
        error: processedError,
        action: 'claim',
      };
    }
    const confirmedBlock = 'confirmed_block' in state ? state.confirmed_block : undefined;
    const blockInfo = confirmedBlock ? parseConfirmedBlock(confirmedBlock) : null;
    return {
      id: vtxo_id,
      type: 'exit',
      title: 'Unilateral Exit',
      vtxoIds,
      progress: 75,
      statusLabel: `Timelock Active (${blocksRemaining} block${blocksRemaining !== 1 ? 's' : ''} left)`,
      blockLink: blockInfo ? { height: blockInfo.height } : undefined,
      error: processedError,
    };
  }

  // Case B: processing (with transactions)
  if (state.type === 'processing' && state.transactions && state.transactions.length > 0) {
    const latestTx = state.transactions[state.transactions.length - 1];
    const broadcastTx = state.transactions.find(
      (tx) => tx.status.type === 'broadcast-with-cpfp' || tx.status.type === 'broadcast',
    ) || latestTx;

    const statusType = broadcastTx.status.type;
    txid = broadcastTx.txid;

    if (statusType === 'confirmed') {
      const confirmedBlock = 'confirmed_block' in state ? state.confirmed_block : undefined;
      const blockInfo = confirmedBlock ? parseConfirmedBlock(confirmedBlock) : null;
      return {
        id: vtxo_id,
        type: 'exit',
        title: 'Unilateral Exit',
        vtxoIds,
        progress: 50,
        statusLabel: 'Securing Anchor',
        txid,
        blockLink: blockInfo ? { height: blockInfo.height } : undefined,
        error: processedError,
      };
    }

    if (statusType === 'broadcast-with-cpfp' || statusType === 'broadcast') {
      return {
        id: vtxo_id,
        type: 'exit',
        title: 'Unilateral Exit',
        vtxoIds,
        progress: 25,
        statusLabel: statusType === 'broadcast-with-cpfp' ? 'Broadcasting (CPFP)' : 'Broadcasting',
        txid,
        error: processedError,
      };
    }

    if (statusType === 'awaiting-input-confirmation') {
      return {
        id: vtxo_id,
        type: 'exit',
        title: 'Unilateral Exit',
        vtxoIds,
        progress: 25,
        statusLabel: 'Waiting for Parent',
        txid,
        error: processedError,
      };
    }

    // Fallback for other processing states
    return {
      id: vtxo_id,
      type: 'exit',
      title: 'Unilateral Exit',
      vtxoIds,
      progress: 25,
      statusLabel: 'Processing',
      txid,
      error: processedError,
    };
  }

  // Legacy fallback: tip_height check
  if (state.tip_height) {
    return {
      id: vtxo_id,
      type: 'exit',
      title: 'Unilateral Exit',
      vtxoIds,
      progress: 25,
      statusLabel: 'Broadcasting',
      error: processedError,
    };
  }

  // Default fallback
  return {
    id: vtxo_id,
    type: 'exit',
    title: 'Unilateral Exit',
    vtxoIds,
    progress: 25,
    statusLabel: 'Processing',
    error: error ? formatError(error) : undefined,
  };
}

export function mapRoundToActivity(round: PendingRound): ActivityItem {
  const { id, kind, round_txid, input_vtxos } = round;
  const vtxoIds = input_vtxos || [];

  // Dynamic title based on VTXO count
  let title: string;
  if (vtxoIds.length > 1) {
    title = `Consolidating ${vtxoIds.length} VTXOs`;
  } else if (vtxoIds.length === 1) {
    title = `Refreshing VTXO ${truncateId(vtxoIds[0])}`;
  } else {
    title = `Active Round: #${id}`;
  }

  if (kind === 'Finished') {
    return {
      id: `round-${id}`,
      type: 'round',
      title,
      vtxoIds,
      progress: 100,
      statusLabel: 'Completed',
      txid: round_txid || undefined,
    };
  }

  // PendingConfirmation: Mining state
  if (kind === 'PendingConfirmation' && round_txid) {
    return {
      id: `round-${id}`,
      type: 'round',
      title,
      vtxoIds,
      progress: 80,
      statusLabel: 'Mining on L1 (Waiting for Block)',
      txid: round_txid,
      info: 'This step depends on Bitcoin block times (~10m).',
      isMining: true,
    };
  }

  // Other pending states: waiting for ASP broadcast
  return {
    id: `round-${id}`,
    type: 'round',
    title,
    vtxoIds,
    progress: 75,
    statusLabel: round_txid ? 'Waiting for L1' : 'Waiting for ASP Broadcast',
    txid: round_txid || undefined,
  };
}

