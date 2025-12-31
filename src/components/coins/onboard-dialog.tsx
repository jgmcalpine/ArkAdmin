'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { onboardFunds, type ActionResponse } from '@/lib/bark/actions';

const MIN_AMOUNT = 10000;
const DEFAULT_AMOUNT = 20000;

export function OnboardDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT.toString());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount(DEFAULT_AMOUNT.toString());
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [open]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const amountNum = Number(amount);

    // Validate amount
    if (isNaN(amountNum) || amountNum < MIN_AMOUNT) {
      setError(`Minimum amount is ${MIN_AMOUNT.toLocaleString()} sats`);
      setLoading(false);
      return;
    }

    try {
      const result: ActionResponse = await onboardFunds(amountNum);

      if (!result.success) {
        setError(result.message);
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" /> Board Funds (L1 → L2)
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {success ? 'Boarding Successful' : 'Board L1 Funds to Ark'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in-50 duration-300" />
            <p className="text-center font-medium">Funds boarded successfully!</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={DEFAULT_AMOUNT.toString()}
                min={MIN_AMOUNT}
              />
              <p className="text-xs text-muted-foreground">
                This takes confirmed L1 Bitcoin and converts it into an Ark VTXO. Min: {MIN_AMOUNT.toLocaleString()} sats.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || Number(amount) < MIN_AMOUNT || isNaN(Number(amount))}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Board'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

