'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QrDisplayProps = {
  invoice: string;
  amount: string;
  onCancel: () => void;
};

export function QrDisplay({
  invoice,
  amount,
  onCancel,
}: QrDisplayProps): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(invoice);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy invoice', error);
    }
  };

  const truncatedInvoice =
    invoice.length > 40 ? `${invoice.slice(0, 20)}...${invoice.slice(-20)}` : invoice;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-100">Scan to Pay</h2>
        </div>

        <div className="text-center">
          <div className="text-5xl font-bold tabular-nums text-zinc-100">
            {amount}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-400">Satoshis</div>
        </div>

        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-white p-6">
          <QRCode value={invoice} size={256} />
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <code className="flex-1 truncate text-sm text-zinc-300">
              {truncatedInvoice}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
              title={isCopied ? 'Copied!' : 'Copy invoice'}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
