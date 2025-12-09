"use client"

import { useState } from "react"
import { LifeBuoy, Clock, CheckCircle, ExternalLink, Copy, Check } from "lucide-react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ExitProgress, PendingRound } from "@/lib/bark/schemas"

interface RecoveryCardProps {
  exits: ExitProgress[]
  rounds: PendingRound[]
  currentHeight: number
  network?: string
}

type RecoveryItem = 
  | { type: 'exit'; data: ExitProgress }
  | { type: 'round'; data: PendingRound }

interface StatusInfo {
  label: string
  color: "green" | "yellow" | "blue" | "gray" | "orange"
  info?: string
  txid?: string
  icon: typeof LifeBuoy
}

function getMempoolUrl(txid: string, network?: string): string {
  const networkPath = network === 'mainnet' ? '' : `${network}/`
  return `https://mempool.space/${networkPath}tx/${txid}`
}

function getBlockUrl(height: number, network?: string): string {
  const networkPath = network === 'mainnet' ? '' : `${network}/`
  return `https://mempool.space/${networkPath}block/${height}`
}

function parseConfirmedBlock(confirmedBlock: unknown): { height: number; hash?: string } | null {
  if (typeof confirmedBlock === 'string') {
    const parts = confirmedBlock.split(':')
    if (parts.length >= 1) {
      const height = parseInt(parts[0], 10)
      if (!isNaN(height)) {
        return { height, hash: parts[1] }
      }
    }
  }
  return null
}

function getStatusBadgeVariant(statusType: string): "default" | "secondary" | "outline" {
  switch (statusType) {
    case 'confirmed':
      return 'default'
    case 'broadcast-with-cpfp':
    case 'broadcast':
      return 'outline'
    case 'awaiting-input-confirmation':
      return 'secondary'
    default:
      return 'secondary'
  }
}

function getStatusBadgeClassName(statusType: string): string {
  switch (statusType) {
    case 'confirmed':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
    case 'broadcast-with-cpfp':
    case 'broadcast':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
    case 'awaiting-input-confirmation':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
  }
}

function getExitStatus(state: ExitProgress['state'], currentHeight: number): StatusInfo {
  // Case: Already claimed
  if (state.claim_txid) {
    return {
      label: "Claimed on L1",
      color: "green",
      info: `Tx: ${state.claim_txid}`,
      txid: state.claim_txid,
      icon: CheckCircle,
    }
  }

  // Case A: awaiting-delta (timelock)
  if (state.type === 'awaiting-delta' && state.claimable_height) {
    const blocksRemaining = Math.max(0, state.claimable_height - currentHeight)
    if (blocksRemaining === 0) {
      return {
        label: "Ready to Claim",
        color: "green",
        icon: CheckCircle,
      }
    }
    return {
      label: `Timelock Active (${blocksRemaining} block${blocksRemaining !== 1 ? 's' : ''} left)`,
      color: "yellow",
      icon: Clock,
    }
  }

  // Case B: processing (with transactions)
  if (state.type === 'processing' && state.transactions && state.transactions.length > 0) {
    // Find the latest transaction (last in array) or first with broadcast status
    const latestTx = state.transactions[state.transactions.length - 1]
    const broadcastTx = state.transactions.find(tx => 
      tx.status.type === 'broadcast-with-cpfp' || 
      tx.status.type === 'broadcast'
    ) || latestTx

    const statusType = broadcastTx.status.type

    if (statusType === 'broadcast-with-cpfp') {
      return {
        label: "Broadcasting (CPFP)",
        color: "blue",
        info: `Tx: ${broadcastTx.txid}`,
        txid: broadcastTx.txid,
        icon: LifeBuoy,
      }
    }

    if (statusType === 'awaiting-input-confirmation') {
      return {
        label: "Waiting for Parent",
        color: "orange",
        info: "Waiting for previous tx to confirm",
        icon: LifeBuoy,
      }
    }

    if (statusType === 'confirmed') {
      return {
        label: "Confirmed (Processing)",
        color: "blue",
        info: broadcastTx.txid ? `Tx: ${broadcastTx.txid}` : undefined,
        txid: broadcastTx.txid,
        icon: LifeBuoy,
      }
    }

    // Fallback for other processing states
    return {
      label: "Processing",
      color: "blue",
      info: broadcastTx.txid ? `Tx: ${broadcastTx.txid}` : undefined,
      txid: broadcastTx.txid,
      icon: LifeBuoy,
    }
  }

  // Legacy fallback: tip_height check
  if (state.tip_height) {
    return {
      label: "Broadcasting",
      color: "blue",
      info: "Waiting for confirmation",
      icon: LifeBuoy,
    }
  }

  // Default fallback
  return {
    label: "Processing",
    color: "gray",
    icon: LifeBuoy,
  }
}

function getRoundStatus(round: PendingRound): StatusInfo {
  return {
    label: "Pending Round (Collaborative)",
    color: "blue",
    info: round.round_txid ? `Tx: ${round.round_txid}` : "Waiting for ASP...",
    icon: LifeBuoy,
  }
}

function getItemStatus(item: RecoveryItem, currentHeight: number): StatusInfo {
  if (item.type === 'exit') {
    return getExitStatus(item.data.state, currentHeight)
  }
  return getRoundStatus(item.data)
}

function getItemId(item: RecoveryItem): string {
  if (item.type === 'exit') {
    return item.data.vtxo_id
  }
  return `round-${item.data.id}`
}

type ErrorLike = { message?: unknown; error?: unknown }

function formatError(error: unknown): string {
  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    const { message, error: nestedError } = error as ErrorLike

    if (typeof message === 'string') return message
    if (typeof nestedError === 'string') return nestedError // Sometimes nested like { error: "msg" }
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

function getItemError(item: RecoveryItem): string | undefined {
  if (item.type === 'exit' && item.data.error) {
    return formatError(item.data.error)
  }
  return undefined
}



function truncateId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-8)}`
}

function getBadgeVariant(color: StatusInfo["color"]): "default" | "secondary" | "outline" {
  switch (color) {
    case "green":
      return "default"
    case "yellow":
      return "secondary"
    case "blue":
      return "outline"
    case "orange":
      return "secondary"
    case "gray":
      return "secondary"
    default:
      return "secondary"
  }
}

function getBadgeClassName(color: StatusInfo["color"]): string {
  switch (color) {
    case "green":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
    case "yellow":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
    case "blue":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
    case "orange":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
    case "gray":
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    default:
      return ""
  }
}

function TransactionRow({ txid, statusType, network }: { txid: string; statusType: string; network?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy TXID:", err)
    }
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded border bg-muted/30">
      <Badge
        variant={getStatusBadgeVariant(statusType)}
        className={cn("text-xs", getStatusBadgeClassName(statusType))}
      >
        {statusType}
      </Badge>
      <span className="font-mono text-xs flex-1 truncate">{truncateId(txid)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={getMempoolUrl(txid, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>View on Mempool.space {statusType.includes('broadcast') && '(may not be found if propagation failed)'}</p>
        </TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        disabled={copied}
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

export function RecoveryCard({ exits, rounds, currentHeight, network = 'signet' }: RecoveryCardProps) {
  // Combine exits and rounds into a single list
  const items: RecoveryItem[] = [
    ...exits.map((exit) => ({ type: 'exit' as const, data: exit })),
    ...rounds.map((round) => ({ type: 'round' as const, data: round })),
  ]

  // Return null if both lists are empty
  if (items.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Actions & Recoveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
          {items.map((item) => {
            const status = getItemStatus(item, currentHeight)
            const StatusIcon = status.icon
            const itemId = getItemId(item)
            const itemError = getItemError(item)
            const exitState = item.type === 'exit' ? item.data.state : null
            const transactions = exitState && 'transactions' in exitState ? exitState.transactions : undefined
            const confirmedBlock = exitState && 'confirmed_block' in exitState ? exitState.confirmed_block : undefined
            const blockInfo = confirmedBlock ? parseConfirmedBlock(confirmedBlock) : null

            return (
              <div
                key={itemId}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {item.type === 'exit' ? truncateId(itemId) : `Round #${item.data.id}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={getBadgeVariant(status.color)}
                    className={cn("flex items-center gap-1.5", getBadgeClassName(status.color))}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  {status.info && (
                    <span className="text-sm text-muted-foreground">
                      {status.txid ? (
                        <Link
                          href={getMempoolUrl(status.txid, network)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline text-blue-600 dark:text-blue-400"
                        >
                          {status.info}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        status.info
                      )}
                    </span>
                  )}
                </div>

                {/* Confirmed Block Link for Timelock */}
                {blockInfo && (
                  <div className="text-sm">
                    <Link
                      href={getBlockUrl(blockInfo.height, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline text-blue-600 dark:text-blue-400"
                    >
                      Confirmed in Block #{blockInfo.height}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Transaction List */}
                {transactions && transactions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Transaction History:</p>
                    <div className="space-y-1">
                      {transactions.map((tx, idx) => (
                        <TransactionRow
                          key={`${tx.txid}-${idx}`}
                          txid={tx.txid}
                          statusType={tx.status.type}
                          network={network}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {itemError && (
                  <div className="text-sm text-destructive">
                    Error: {itemError}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

