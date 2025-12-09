'use client';

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Timer, Scale, Hourglass, Server } from 'lucide-react';
import type { NodeInfo } from "@/lib/bark/schemas";

type NetworkPolicyCardProps = {
  info: NodeInfo;
};

function formatNetwork(network: string): string {
  return network.charAt(0).toUpperCase() + network.slice(1);
}

function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 12) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

function formatSats(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

export function NetworkPolicyCard({ info }: NetworkPolicyCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPubkey = async () => {
    if (!info.serverPubkey) return;

    try {
      await navigator.clipboard.writeText(info.serverPubkey);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy pubkey', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
          </div>
          <CardTitle>Network & Policy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Row: Network Badge + Status Dot */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network</span>
          <Badge variant="outline">
            {formatNetwork(info.network)}
          </Badge>
        </div>

        {/* Grid Section: Policy Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Round Interval */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>Round Interval</span>
            </div>
            <div className="text-sm font-semibold">
              {info.roundInterval || '-'}
            </div>
          </div>

          {/* Min Payment */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4" />
              <span>Min Payment</span>
            </div>
            <div className="text-sm font-semibold">
              {info.minBoardAmount !== undefined 
                ? `${formatSats(info.minBoardAmount)} sats`
                : '-'}
            </div>
          </div>

          {/* Coin Lifespan */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hourglass className="h-4 w-4" />
              <span>Coin Lifespan</span>
            </div>
            <div className="text-sm font-semibold">
              {info.vtxoExpiryDelta !== undefined 
                ? `${info.vtxoExpiryDelta} blocks`
                : '-'}
            </div>
          </div>

          {/* ASP Pubkey */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-4 w-4" />
              <span>ASP Pubkey</span>
            </div>
            {info.serverPubkey ? (
              <button
                type="button"
                onClick={handleCopyPubkey}
                className="text-sm font-semibold font-mono text-left hover:opacity-80 transition-opacity cursor-pointer"
                title={isCopied ? 'Copied!' : 'Click to copy'}
              >
                {truncatePubkey(info.serverPubkey)}
              </button>
            ) : (
              <div className="text-sm font-semibold">-</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

