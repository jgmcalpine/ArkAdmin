'use client';

import { useState, useEffect } from 'react';
import { ArrowDown, Check, Copy, Zap, Bitcoin, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { getNewOnchainAddress, getNewArkAddress } from '@/lib/bark/actions';

type TabValue = 'ark' | 'btc';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function ReceiveDialog() {
  const [arkAddress, setArkAddress] = useState<string | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [isLoadingArk, setIsLoadingArk] = useState(false);
  const [isLoadingBtc, setIsLoadingBtc] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('ark');

  const fetchArkAddress = async () => {
    if (arkAddress || isLoadingArk) return;
    setIsLoadingArk(true);
    try {
      const newAddress = await getNewArkAddress();
      setArkAddress(newAddress);
    } catch (error) {
      console.error('Failed to fetch Ark address', error);
      setArkAddress(null);
    } finally {
      setIsLoadingArk(false);
    }
  };

  const fetchBtcAddress = async () => {
    if (btcAddress || isLoadingBtc) return;
    setIsLoadingBtc(true);
    try {
      const newAddress = await getNewOnchainAddress();
      setBtcAddress(newAddress);
    } catch (error) {
      console.error('Failed to fetch Bitcoin address', error);
      setBtcAddress(null);
    } finally {
      setIsLoadingBtc(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'ark' && !arkAddress && !isLoadingArk) {
        fetchArkAddress();
      } else if (activeTab === 'btc' && !btcAddress && !isLoadingBtc) {
        fetchBtcAddress();
      }
    } else {
      // Reset addresses when dialog closes to fetch new ones next time
      setArkAddress(null);
      setBtcAddress(null);
      setIsCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setIsCopied(false);
  };

  const handleCopy = async (address: string) => {
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

  const renderAddressContent = (
    address: string | null,
    isLoading: boolean,
    helperText: string,
    onRetry: () => void,
  ) => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Generating address...</p>
        </div>
      );
    }

    if (address) {
      return (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-4">
              <code className="text-sm font-mono break-all text-center">
                {address}
              </code>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {truncateAddress(address)}
            </p>
          </div>
          <Button
            onClick={() => handleCopy(address)}
            variant="outline"
            className="w-full"
            disabled={isCopied}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {helperText}
          </p>
        </>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <p className="text-sm text-muted-foreground">Failed to generate address</p>
        <Button onClick={onRetry} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ark">
              <Zap className="mr-2 h-4 w-4" />
              Ark (L2)
            </TabsTrigger>
            <TabsTrigger value="btc">
              <Bitcoin className="mr-2 h-4 w-4" />
              Bitcoin (L1)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ark" className="space-y-4">
            {renderAddressContent(
              arkAddress,
              isLoadingArk,
              'Use this address to receive instant Ark payments.',
              fetchArkAddress,
            )}
          </TabsContent>
          <TabsContent value="btc" className="space-y-4">
            {renderAddressContent(
              btcAddress,
              isLoadingBtc,
              'Use this address to fund your wallet from a faucet.',
              fetchBtcAddress,
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

