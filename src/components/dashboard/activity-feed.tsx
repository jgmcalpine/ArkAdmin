"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ExitProgress, PendingRound } from "@/lib/bark/schemas";
import { claimVtxo } from "@/lib/bark/actions";
import { mapExitToActivity, mapRoundToActivity, type ActivityItem } from "@/lib/bark/activity-mapper";

interface ActivityFeedProps {
  exits: ExitProgress[];
  rounds: PendingRound[];
  currentHeight: number;
  network?: string;
}

function getMempoolUrl(txid: string, network?: string): string {
  const networkPath = network === 'mainnet' ? '' : `${network}/`;
  return `https://mempool.space/${networkPath}tx/${txid}`;
}

function getBlockUrl(height: number, network?: string): string {
  const networkPath = network === 'mainnet' ? '' : `${network}/`;
  return `https://mempool.space/${networkPath}block/${height}`;
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function getProgressVariant(item: ActivityItem): "default" | "success" | "destructive" | "orange" {
  if (item.error) return "destructive";
  if (item.progress === 100) return "success";
  if (item.isMining) return "orange";
  return "default"; // Blue for active
}

function ActivityItemRow({
  item,
  network,
  claimingId,
  setClaimingId,
}: {
  item: ActivityItem;
  network?: string;
  claimingId: string | null;
  setClaimingId: (id: string | null) => void;
}) {
  const isClaiming = item.type === 'exit' && claimingId === item.id;
  const progressVariant = getProgressVariant(item);

  const handleClaim = async () => {
    if (item.type !== 'exit' || !item.action) return;
    setClaimingId(item.id);
    try {
      await claimVtxo(item.id);
    } catch (error) {
      console.error('Failed to claim VTXO:', error);
    } finally {
      setClaimingId(null);
    }
  };

  // Show max 3 VTXO badges, then "+X more"
  const maxBadges = 3;
  const visibleVtxos = item.vtxoIds.slice(0, maxBadges);
  const remainingCount = item.vtxoIds.length - maxBadges;
  const isMining = item.isMining || item.statusLabel.toLowerCase().includes('mining');

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border p-4">
      {/* Header: Title */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">{item.title}</span>
      </div>

      {/* VTXO badges below title - only show if we have VTXO IDs */}
      {item.vtxoIds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleVtxos.map((vtxoId) => (
            <Badge
              key={vtxoId}
              variant="outline"
              className="font-mono text-xs"
            >
              {truncateId(vtxoId)}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge
              variant="outline"
              className="font-mono text-xs text-muted-foreground"
            >
              +{remainingCount} more
            </Badge>
          )}
        </div>
      )}

      {/* Middle: Progress bar with pulsing animation for mining */}
      <Progress 
        value={item.progress} 
        variant={progressVariant}
        animate={isMining}
      />

      {/* Footer: Status Label (Left) | Action Button/Link (Right) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-2 flex-col min-w-0 flex-1">
          <span className={cn(
            "text-sm",
            item.error ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {item.statusLabel}
          </span>
          {item.info && (
            <span className="text-xs text-muted-foreground italic">
              {item.info}
            </span>
          )}
          {item.error && (
            <span className="text-sm text-destructive font-medium">
              {item.error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.action === 'claim' && (
            <Button
              size="sm"
              onClick={handleClaim}
              disabled={isClaiming}
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Claim Funds
                </>
              )}
            </Button>
          )}
          {item.txid && (
            <Link
              href={getMempoolUrl(item.txid, network)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View on Mempool
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          {item.blockLink && (
            <Link
              href={getBlockUrl(item.blockLink.height, network)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              Block #{item.blockLink.height}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({
  exits,
  rounds,
  currentHeight,
  network = 'signet',
}: ActivityFeedProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Map all inputs using the mapper functions
  const activities: ActivityItem[] = [
    ...exits.map((exit) => mapExitToActivity(exit, currentHeight)),
    ...rounds.map((round) => mapRoundToActivity(round)),
  ];

  // Return null if no activities
  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Active Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((item) => (
            <ActivityItemRow
              key={item.id}
              item={item}
              network={network}
              claimingId={claimingId}
              setClaimingId={setClaimingId}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Note: If operations remain stuck for &gt; 10 minutes, try restarting the daemon to clear locks.
        </p>
      </CardFooter>
    </Card>
  );
}

