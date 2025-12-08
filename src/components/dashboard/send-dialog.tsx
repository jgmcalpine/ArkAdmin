'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { sendArkPayment, sendOnchainPayment } from '@/lib/bark/actions';

type TabValue = 'l2' | 'l1';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

export function SendDialog() {
  const [tab, setTab] = useState<TabValue>('l2');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const amountValue = useMemo(() => Number(amount), [amount]);

  const resetForm = () => {
    setDestination('');
    setAmount('');
    setComment('');
  };

  const handleDialogChange = (openState: boolean) => {
    // Prevent closing while submitting to avoid accidental double-sends
    if (!openState && isSubmitting) {
      return;
    }
    setIsOpen(openState);
    if (!openState) {
      resetForm();
      setFeedback(null);
    }
  };

  // Auto-close dialog after successful submission
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => {
        setIsOpen(false);
        resetForm();
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (Number.isNaN(amountValue)) {
      setFeedback({ type: 'error', message: 'Amount must be a valid number' });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedDestination = destination.trim();
      if (!trimmedDestination) {
        throw new Error('Destination is required');
      }

      const response =
        tab === 'l2'
          ? await sendArkPayment({
              destination: trimmedDestination,
              amount: amountValue,
              comment: comment.trim() || undefined,
            })
          : await sendOnchainPayment({
              destination: trimmedDestination,
              amount: amountValue,
            });

      setFeedback({
        type: response.success ? 'success' : 'error',
        message: response.message,
      });

      if (response.success) {
        resetForm();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send payment';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuccess = feedback?.type === 'success';

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          <Send className="h-4 w-4" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Funds</DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in-50 duration-300" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Transaction Broadcast!</h3>
              <p className="text-sm text-muted-foreground">
                Your transaction has been sent to the network.
              </p>
            </div>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="l2">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Send Ark (L2)
              </TabsTrigger>
              <TabsTrigger value="l1">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Send Bitcoin (L1)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="l2">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="l2-destination">Destination</Label>
                  <Input
                    id="l2-destination"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="Enter Ark destination"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l2-amount">Amount (sats)</Label>
                  <Input
                    id="l2-amount"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    min={1}
                    step="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l2-comment">Comment (optional)</Label>
                  <Input
                    id="l2-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add a note for the recipient"
                  />
                </div>
                {feedback?.type === 'error' ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{feedback.message}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    'Send Ark'
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="l1">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="l1-destination">Destination</Label>
                  <Input
                    id="l1-destination"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="Enter Bitcoin address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l1-amount">Amount (sats)</Label>
                  <Input
                    id="l1-amount"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    min={1}
                    step="1"
                    required
                  />
                </div>
                {feedback?.type === 'error' ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{feedback.message}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    'Send Bitcoin'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

