'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, Zap, Bitcoin, CheckCircle2, ArrowRight, AlertCircle, Ship } from 'lucide-react';
import { sendArkPayment, sendOnchainPayment, sendLightningPayment, type SendResponse } from '@/lib/bark/actions';

type PaymentType = 'ark' | 'lightning_invoice' | 'lightning_address' | 'onchain' | 'unknown';

export function SendDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'address' | 'details' | 'success'>('address');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<PaymentType>('unknown');

  useEffect(() => {
    if (!open) {
      setStep('address');
      setDestination('');
      setAmount('');
      setComment('');
      setError(null);
      setDetectedType('unknown');
      setLoading(false);
    }
  }, [open]);

  // Enhanced Detection Logic
  const handleDestinationChange = (val: string) => {
    setDestination(val);
    setError(null);
    
    const lower = val.toLowerCase();
    if (lower.startsWith('tark')) {
      setDetectedType('ark');
    } else if (lower.startsWith('ln')) {
      setDetectedType('lightning_invoice'); // Bolt11 (No Comments)
    } else if (lower.includes('@') || lower.match(/^[a-z0-9-_\.]+$/i)) {
      // Very naive check for Lightning Address (user@domain)
      // We assume it's LA if it has @ or is just text (like 'user')
      setDetectedType('lightning_address');
    } else if (lower.startsWith('tb1') || lower.startsWith('m') || lower.startsWith('n')) {
      setDetectedType('onchain');
    } else {
      setDetectedType('unknown');
    }
  };

  const handleNext = () => {
    if (detectedType === 'unknown') {
      setError("Please enter a valid Ark address, Lightning Invoice, or Bitcoin address.");
      return;
    }
    setStep('details');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    let result: SendResponse | undefined;
    const amountNum = amount ? Number(amount) : undefined;

    try {
      if (detectedType === 'ark') {
        if (!amountNum) throw new Error("Amount is required for Ark transfers.");
        result = await sendArkPayment({ destination, amount: amountNum, comment });
      } 
      else if (detectedType === 'onchain') {
        if (!amountNum) throw new Error("Amount is required for On-Chain transfers.");
        result = await sendOnchainPayment({ destination, amount: amountNum });
      } 
      else if (detectedType === 'lightning_invoice' || detectedType === 'lightning_address') {
        // Only send comment if it's supported (Lightning Address)
        const finalComment = detectedType === 'lightning_address' ? comment : undefined;
        result = await sendLightningPayment({ destination, amount: amountNum, comment: finalComment });
      }

      if (result && !result.success) {
        // Humanize common network errors
        let msg = result.message;
        if (msg.includes('htlc request failed')) msg = "Network Routing Failed. The ASP could not find a path to this node.";
        if (msg.includes('connection refused')) msg = "Daemon Connection Failed. Is barkd running?";
        setError(msg);
        setLoading(false);
      } else if (result && result.success) {
        setStep('success');
        setTimeout(() => setOpen(false), 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (detectedType) {
      case 'ark': return <Ship className="h-5 w-5 text-yellow-500" />;
      case 'lightning_invoice': 
      case 'lightning_address': return <Zap className="h-5 w-5 text-blue-500" />;
      case 'onchain': return <Bitcoin className="h-5 w-5 text-orange-500" />;
      default: return <Send className="h-5 w-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (detectedType) {
      case 'ark': return 'Ark Transfer (L2)';
      case 'lightning_invoice': return 'Lightning Invoice';
      case 'lightning_address': return 'Lightning Address';
      case 'onchain': return 'Bitcoin Transaction (L1)';
      default: return 'Send Payment';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Send className="h-4 w-4" /> Send
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? 'Payment Sent' : getTypeLabel()}
          </DialogTitle>
        </DialogHeader>

        {step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in-50 duration-300" />
            <p className="text-center font-medium">Transaction Broadcasted!</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* STAGE 1: Address Input */}
            <div className={step === 'details' ? 'opacity-50 pointer-events-none' : ''}>
              <Label>Destination</Label>
              <div className="relative mt-1">
                <Input
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  placeholder="Paste Invoice, Address, or user@domain"
                  className="pr-10"
                />
                <div className="absolute right-3 top-2.5">
                  {getIcon()}
                </div>
              </div>
            </div>

            {/* STAGE 2: Details Input */}
            {step === 'details' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                <div className="space-y-1">
                  <Label>
                    {detectedType === 'lightning_invoice' ? 'Amount (Optional)' : 'Amount (sats)'}
                  </Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={detectedType === 'lightning_invoice' ? "Leave empty if amount is in invoice" : "10000"}
                  />
                </div>

                {/* Comment Logic: Only for Ark or Lightning Address */}
                {(detectedType === 'ark' || detectedType === 'lightning_address') && (
                  <div className="space-y-1">
                    <Label>Comment (Optional)</Label>
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What is this for?"
                    />
                  </div>
                )}
                
                {detectedType === 'lightning_invoice' && (
                  <p className="text-xs text-muted-foreground italic">
                    Comments are not supported for Bolt11 invoices.
                  </p>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 mt-4">
              {step === 'details' && (
                <Button variant="outline" onClick={() => setStep('address')} disabled={loading}>
                  Back
                </Button>
              )}
              
              {step === 'address' ? (
                <Button onClick={handleNext} disabled={detectedType === 'unknown' || !destination}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="min-w-[100px]">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Now'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}