'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Charge } from '@/lib/fetch/charges';

type CheckoutInterfaceProps = {
  charge: Charge;
};

function formatSatoshis(sats: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(sats);
}

export function CheckoutInterface({ charge: initialCharge }: CheckoutInterfaceProps) {
  const [status, setStatus] = useState<string>(initialCharge.status);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [pollingErrorCount, setPollingErrorCount] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef<number>(0);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(initialCharge.invoice);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy invoice', error);
    }
  };

  useEffect(() => {
    if (initialCharge.status !== 'pending') {
      return;
    }

    errorCountRef.current = 0;
    setPollingErrorCount(0);

    const pollChargeStatus = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/v1/charges/${initialCharge.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const updatedCharge = await response.json();
        errorCountRef.current = 0;
        setPollingErrorCount(0);

        if (updatedCharge.status === 'paid') {
          setStatus('paid');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (updatedCharge.status === 'expired') {
          setStatus('expired');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Failed to poll charge status', error);
        errorCountRef.current += 1;
        setPollingErrorCount(errorCountRef.current);
        if (errorCountRef.current >= 3) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    };

    intervalRef.current = setInterval(pollChargeStatus, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialCharge.id, initialCharge.status]);

  const renderContent = (): JSX.Element => {
    if (status === 'paid') {
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-in fade-in-0 zoom-in-95 duration-500" />
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2">Payment Successful</h3>
            <p className="text-sm text-muted-foreground">Reference ID: {initialCharge.id}</p>
          </div>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
            <Clock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2">Invoice Expired</h3>
            <p className="text-sm text-muted-foreground">Please request a new link</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-center rounded-2xl border bg-white p-6">
          <QRCode value={initialCharge.invoice} size={256} />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium mb-4">Scan to Pay</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <code className="flex-1 truncate text-sm">
              {initialCharge.invoice.length > 40
                ? `${initialCharge.invoice.slice(0, 20)}...${initialCharge.invoice.slice(-20)}`
                : initialCharge.invoice}
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
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Pay ArkFetch</CardTitle>
        <div className="mt-4">
          <div className="text-4xl font-bold tabular-nums">
            {formatSatoshis(initialCharge.amountSat)}
          </div>
          <div className="mt-2 text-sm font-medium text-muted-foreground">Satoshis</div>
        </div>
        {initialCharge.description && (
          <CardDescription className="mt-4">{initialCharge.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {pollingErrorCount >= 3 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Connection unstable. Please refresh the page.</span>
          </div>
        )}
        {renderContent()}
      </CardContent>
    </Card>
  );
}
