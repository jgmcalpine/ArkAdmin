import { useState, useCallback, useEffect, useRef } from 'react';
import { createLightningInvoice, checkLightningStatus, getNewArkAddress } from '../bark/actions';
import { fetchVtxos } from '../bark/queries';

export type PaymentState = 'idle' | 'creating' | 'awaiting_payment' | 'paid' | 'error';
export type PaymentMode = 'lightning' | 'ark';

type UsePaymentReturn = {
  status: PaymentState;
  invoice: string | null;
  hash: string | null;
  error: string | null;
  mode: PaymentMode;
  startTransaction: (amount: number, type: PaymentMode, description?: string) => Promise<void>;
  reset: () => void;
};

export function usePayment(): UsePaymentReturn {
  const [status, setStatus] = useState<PaymentState>('idle');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<PaymentMode>('lightning');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [initialVtxoCount, setInitialVtxoCount] = useState<number>(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialVtxoCountRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startLightningPolling = useCallback(
    (paymentHash: string) => {
      stopPolling();

      intervalRef.current = setInterval(async () => {
        try {
          const result = await checkLightningStatus(paymentHash);

          if (!result.success) {
            setStatus('error');
            setError('Failed to check payment status');
            stopPolling();
            return;
          }

          if (result.status === 'settled') {
            setStatus('paid');
            stopPolling();
          } else if (result.status === 'expired') {
            setStatus('error');
            setError('Payment expired');
            stopPolling();
          }
          // Continue polling for 'pending' or other statuses
        } catch (err) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Network error occurred');
          stopPolling();
        }
      }, 2000);
    },
    [stopPolling],
  );

  const startArkPolling = useCallback(
    (initialCount: number) => {
      stopPolling();

      intervalRef.current = setInterval(async () => {
        try {
          const vtxos = await fetchVtxos();

          if (vtxos.length > initialCount) {
            setStatus('paid');
            stopPolling();
          }
        } catch (err) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Network error occurred');
          stopPolling();
        }
      }, 2000);
    },
    [stopPolling],
  );

  const startTransaction = useCallback(
    async (amount: number, type: PaymentMode, description?: string) => {
      setStatus('creating');
      setError(null);
      setInvoice(null);
      setHash(null);
      setMode(type);

      try {
        if (type === 'lightning') {
          const result = await createLightningInvoice({
            amount,
            description: description || 'POS Payment',
          });

          if (result.success && result.data) {
            setInvoice(result.data.invoice);
            setHash(result.data.paymentHash);
            setStatus('awaiting_payment');
            setError(null);
            startLightningPolling(result.data.paymentHash);
          } else {
            setError(result.message || 'Failed to create invoice');
            setStatus('error');
          }
        } else if (type === 'ark') {
          // Fetch current vtxos to get initial count
          const vtxos = await fetchVtxos();
          const count = vtxos.length;
          setInitialVtxoCount(count);
          initialVtxoCountRef.current = count;

          // Get new Ark address
          const address = await getNewArkAddress();
          if (!address) {
            setStatus('error');
            setError('Failed to generate Ark address');
            return;
          }

          setInvoice(address);
          setStatus('awaiting_payment');
          startArkPolling(count);
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to start transaction');
      }
    },
    [startLightningPolling, startArkPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setInvoice(null);
    setHash(null);
    setError(null);
    setInitialVtxoCount(0);
    initialVtxoCountRef.current = 0;
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    invoice,
    hash,
    error,
    mode,
    startTransaction,
    reset,
  };
}

