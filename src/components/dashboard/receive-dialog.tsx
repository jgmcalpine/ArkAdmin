'use client';

import { useState, useEffect } from 'react';
import { ArrowDown, Check, Copy, Zap, Bitcoin, Loader2, Ship } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getNewOnchainAddress, getNewArkAddress, createLightningInvoice } from '@/lib/bark/actions';

type TabValue = 'ark' | 'btc' | 'lightning';

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
  
  // Lightning invoice state
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

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

  // Reset addresses when dialog closes to ensure new addresses are generated next time
  useEffect(() => {
    if (!isOpen) {
      setArkAddress(null);
      setBtcAddress(null);
      setIsCopied(false);
      setInvoice(null);
      setAmount('');
      setDescription('');
      setInvoiceError(null);
    }
  }, [isOpen]);

  // Fetch addresses when dialog opens and tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'ark' && !arkAddress && !isLoadingArk) {
        fetchArkAddress();
      } else if (activeTab === 'btc' && !btcAddress && !isLoadingBtc) {
        fetchBtcAddress();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setIsCopied(false);
    // Clear invoice state when switching tabs
    setInvoice(null);
    setInvoiceError(null);
  };

  const handleCopy = async (text: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy', error);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!amount || isGeneratingInvoice) return;

    const amountNum = Number.parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      setInvoiceError('Amount must be at least 1 sat');
      return;
    }

    setIsGeneratingInvoice(true);
    setInvoiceError(null);

    try {
      const result = await createLightningInvoice({
        amount: amountNum,
        description: description || 'Ark Admin Receive',
      });

      if (result.success && result.data) {
        setInvoice(result.data.invoice);
      } else {
        setInvoiceError(result.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Failed to generate invoice', error);
      setInvoiceError('Network error occurred');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleCreateNew = () => {
    setInvoice(null);
    setAmount('');
    setDescription('');
    setInvoiceError(null);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ark">
              <Ship className="mr-2 h-4 w-4" />
              Ark (L2)
            </TabsTrigger>
            <TabsTrigger value="btc">
              <Bitcoin className="mr-2 h-4 w-4" />
              Bitcoin (L1)
            </TabsTrigger>
            <TabsTrigger value="lightning">
              <Zap className="mr-2 h-4 w-4" />
              Lightning
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
          <TabsContent value="lightning" className="space-y-4">
            {invoice ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice">Lightning Invoice</Label>
                  <textarea
                    id="invoice"
                    readOnly
                    value={invoice}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-mono break-all resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(invoice)}
                    variant="outline"
                    className="flex-1"
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
                        Copy Invoice
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCreateNew}
                    variant="outline"
                    className="flex-1"
                  >
                    Create New
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Share this invoice to receive Lightning payments.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (sats) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount in sats"
                    disabled={isGeneratingInvoice}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ark Admin Receive"
                    disabled={isGeneratingInvoice}
                  />
                </div>
                {invoiceError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {invoiceError}
                  </div>
                )}
                <Button
                  onClick={handleGenerateInvoice}
                  className="w-full"
                  disabled={!amount || isGeneratingInvoice}
                >
                  {isGeneratingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

