'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { useKeypad } from '@/lib/pos/use-keypad';
import { usePayment, type PaymentMode } from '@/lib/pos/use-payment';
import { Keypad } from '@/components/pos/keypad';
import { QrDisplay } from '@/components/pos/qr-display';
import { SuccessView } from '@/components/pos/success-view';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function PosPage(): ReactElement {
  const { value, append, backspace, clear } = useKeypad(8);
  const payment = usePayment();
  const [mode, setMode] = useState<PaymentMode>('lightning');

  const handleCharge = async (): Promise<void> => {
    const amount = Number(value);
    if (amount > 0 && !Number.isNaN(amount)) {
      await payment.startTransaction(amount, mode);
    }
  };

  const handleModeChange = async (newMode: PaymentMode): Promise<void> => {
    setMode(newMode);
    const amount = Number(value);
    if (amount > 0 && !Number.isNaN(amount) && payment.status === 'awaiting_payment') {
      payment.reset();
      await payment.startTransaction(amount, newMode);
    }
  };

  const handleCancel = (): void => {
    payment.reset();
  };

  const handleReset = (): void => {
    payment.reset();
    clear();
  };

  if (payment.status === 'awaiting_payment' && payment.invoice) {
    return (
      <QrDisplay
        invoice={payment.invoice}
        amount={value}
        mode={payment.mode}
        onCancel={handleCancel}
        onModeChange={handleModeChange}
      />
    );
  }

  if (payment.status === 'paid') {
    return <SuccessView onReset={handleReset} />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        {payment.status === 'error' && payment.error && (
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{payment.error}</AlertDescription>
          </Alert>
        )}

        <div className="w-full text-center">
          <div className="text-6xl font-bold tabular-nums text-zinc-100">
            {value}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-400">Satoshis</div>
        </div>

        <div className="relative w-full">
          {payment.status === 'creating' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-zinc-950/80 backdrop-blur-sm">
              <div className="text-lg font-medium text-zinc-300">
                Creating invoice...
              </div>
            </div>
          )}

          <Keypad
            onAppend={append}
            onBackspace={backspace}
            onClear={clear}
            onCharge={handleCharge}
            chargeDisabled={value === '0' || payment.status === 'creating'}
          />
        </div>
      </div>
    </div>
  );
}
