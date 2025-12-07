'use client';

import { useState, useEffect } from 'react';
import { ArrowDown, Check, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getNewAddress } from '@/lib/bark/actions';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function ReceiveDialog() {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAddress = async () => {
    setIsLoading(true);
    try {
      const newAddress = await getNewAddress();
      setAddress(newAddress);
    } catch (error) {
      console.error('Failed to fetch address', error);
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !address && !isLoading) {
      fetchAddress();
    } else if (!isOpen) {
      // Reset address when dialog closes to fetch a new one next time
      setAddress(null);
      setIsCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCopy = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy address', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          <ArrowDown className="h-4 w-4" />
          Receive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Funds</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Generating address...</p>
            </div>
          ) : address ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your receiving address:</p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
                  <code className="flex-1 text-sm font-mono break-all">
                    {address}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {truncateAddress(address)}
                </p>
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full"
                disabled={isCopied}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Address
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">Failed to generate address</p>
              <Button onClick={fetchAddress} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

