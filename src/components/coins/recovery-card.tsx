"use client"

import { LifeBuoy, Clock, CheckCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ExitProgress, PendingRound } from "@/lib/bark/schemas"

interface RecoveryCardProps {
  exits: ExitProgress[]
  rounds: PendingRound[]
  currentHeight: number
}

type RecoveryItem = 
  | { type: 'exit'; data: ExitProgress }
  | { type: 'round'; data: PendingRound }

interface StatusInfo {
  label: string
  color: "green" | "yellow" | "blue" | "gray"
  info?: string
  icon: typeof LifeBuoy
}

function getExitStatus(state: Record<string, unknown>, currentHeight: number): StatusInfo {
  if (state.claim_txid && typeof state.claim_txid === 'string') {
    return {
      label: "Claimed on L1",
      color: "green",
      info: `Tx: ${state.claim_txid}`,
      icon: CheckCircle,
    }
  }

  if (state.claimable_height && typeof state.claimable_height === 'number') {
    const blocksRemaining = Math.max(0, state.claimable_height - currentHeight)
    return {
      label: "Timelock Active",
      color: "yellow",
      info: blocksRemaining > 0 
        ? `Wait ${blocksRemaining} block${blocksRemaining !== 1 ? 's' : ''}`
        : `Claimable at Block ${state.claimable_height}`,
      icon: Clock,
    }
  }

  if (state.tip_height) {
    return {
      label: "Broadcasting",
      color: "blue",
      info: "Waiting for confirmation",
      icon: LifeBuoy,
    }
  }

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

function getItemError(item: RecoveryItem): string | undefined {
  if (item.type === 'exit' && item.data.error) {
    return String(item.data.error)
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
    case "gray":
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    default:
      return ""
  }
}

export function RecoveryCard({ exits, rounds, currentHeight }: RecoveryCardProps) {
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

            return (
              <div
                key={itemId}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {item.type === 'exit' ? truncateId(itemId) : `Round #${item.data.id}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getBadgeVariant(status.color)}
                    className={cn("flex items-center gap-1.5", getBadgeClassName(status.color))}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  {status.info && (
                    <span className="text-sm text-muted-foreground">
                      {status.info}
                    </span>
                  )}
                </div>
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
  )
}

