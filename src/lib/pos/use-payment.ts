import { useState, useCallback, useEffect, useRef } from 'react';
import { createLightningInvoice, checkLightningStatus } from '../bark/actions';

export type PaymentState = 'idle' | 'creating' | 'awaiting_payment' | 'paid' | 'error';

type UsePaymentReturn = {
  status: PaymentState;
  invoice: string | null;
  hash: string | null;
  error: string | null;
  startTransaction: (amount: number, description?: string) => Promise<void>;
  reset: () => void;
};

export function usePayment(): UsePaymentReturn {
  const [status, setStatus] = useState<PaymentState>('idle');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
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

  const startTransaction = useCallback(
    async (amount: number, description?: string) => {
      setStatus('creating');
      setError(null);
      setInvoice(null);
      setHash(null);

      try {
        const result = await createLightningInvoice({
          amount,
          description: description || 'POS Payment',
        });

        if (!result.success || !result.invoice) {
          setStatus('error');
          setError(result.message || 'Failed to create invoice');
          return;
        }

        const paymentHash = result.paymentHash;
        if (!paymentHash) {
          setStatus('error');
          setError('Payment hash not returned from server');
          return;
        }

        setInvoice(result.invoice);
        setHash(paymentHash);
        setStatus('awaiting_payment');
        startPolling(paymentHash);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to create invoice');
      }
    },
    [startPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setInvoice(null);
    setHash(null);
    setError(null);
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
    startTransaction,
    reset,
  };
}

