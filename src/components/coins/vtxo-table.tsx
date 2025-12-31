"use client"

import { useState } from "react"
import { Copy, Check, RefreshCw, Loader2, LogOut } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { Vtxo } from "@/lib/bark/schemas"
import { refreshVtxo, refreshAllVtxos, exitVtxo } from "@/lib/bark/actions"

interface VtxoTableProps {
  vtxos: Vtxo[]
  currentHeight: number
}

function formatSatoshis(sats: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(sats)
}

function formatBlockHeight(height: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(height)
}

function truncateId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-8)}`
}

function calculateExpiryInfo(expiryHeight: number, currentHeight: number): {
  blocksLeft: number
  estimatedDate: Date | null
  variant: "default" | "destructive" | "success"
  isExpired: boolean
} {
  if (currentHeight === 0) {
    return { blocksLeft: 0, estimatedDate: null, variant: "default", isExpired: false }
  }

  const blocksLeft = expiryHeight - currentHeight

  // Handle expired coins (negative blocksLeft)
  if (blocksLeft <= 0) {
    return { blocksLeft: 0, estimatedDate: null, variant: "destructive", isExpired: true }
  }

  // Calculate estimated date: Diff * 10 minutes * 60 seconds * 1000 ms
  const offsetMS = blocksLeft * 10 * 60 * 1000
  const estimatedDate = new Date(Date.now() + offsetMS)

  // Determine variant based on percentage of 144 blocks:
  // If > 66% (95+ blocks): Green (success)
  // If > 33% (48+ blocks): Yellow (default)
  // Else: Red (destructive)
  const percentage = Math.min(100, (blocksLeft / 144) * 100)
  let variant: "default" | "destructive" | "success" = "default"
  if (percentage > 66) {
    variant = "success"
  } else if (percentage > 33) {
    variant = "default" // Yellow
  } else {
    variant = "destructive"
  }

  return { blocksLeft, estimatedDate, variant, isExpired: false }
}

function formatEstimatedDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function VtxoTable({ vtxos, currentHeight }: VtxoTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [exitingId, setExitingId] = useState<string | null>(null)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Count spendable coins
  const spendableCount = vtxos.filter(
    (vtxo) => vtxo.state?.type === "spendable" && (vtxo.expiry_height - currentHeight > 0 || currentHeight === 0)
  ).length

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      setTimeout(() => {
        setCopiedId(null)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy ID:", err)
    }
  }

  const handleRefreshVtxo = async (vtxoId: string) => {
    setRefreshingId(vtxoId)
    setError(null)
    try {
      const result = await refreshVtxo(vtxoId)
      if (!result.success) {
        setError(result.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh VTXO"
      setError(message)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true)
    setError(null)
    try {
      const result = await refreshAllVtxos()
      if (!result.success) {
        setError(result.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh all VTXOs"
      setError(message)
    } finally {
      setIsRefreshingAll(false)
    }
  }

  const handleExitVtxo = async (vtxoId: string) => {
    setExitingId(vtxoId)
    setError(null)
    try {
      const result = await exitVtxo(vtxoId)
      if (!result.success) {
        setError(result.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to exit VTXO"
      setError(message)
    } finally {
      setExitingId(null)
    }
  }

  if (vtxos.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <p>No VTXOs found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Ark VTXOs (L2 Coins)</CardTitle>
          <CardAction>
            <div className="flex flex-col items-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleRefreshAll}
                    disabled={isRefreshingAll || spendableCount === 0}
                  >
                    {isRefreshingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh All
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {spendableCount === 0 && (
                  <TooltipContent>
                    <p>No spendable coins to refresh</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <p className="text-xs text-muted-foreground">
                Consolidates all spendable coins into one.
              </p>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[80px] truncate md:max-w-[150px]">ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vtxos.map((vtxo) => {
                  const isIdCopied = copiedId === vtxo.id
                  const isRefreshing = refreshingId === vtxo.id
                  const { blocksLeft, estimatedDate, variant, isExpired } = calculateExpiryInfo(
                    vtxo.expiry_height,
                    currentHeight
                  )

                  const isSpendable = vtxo.state?.type === "spendable"
                  const canRefresh = isSpendable && !isExpired
                  const refreshDisabled = isRefreshing || !canRefresh

                  const isExiting = exitingId === vtxo.id
                  const isLocked = vtxo.state?.type === "locked" || vtxo.state?.type === "spending"
                  const exitDisabled = isExiting || isLocked

                  return (
                    <TableRow key={vtxo.id}>
                      <TableCell className="max-w-[80px] truncate md:max-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {truncateId(vtxo.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyId(vtxo.id)}
                            disabled={isIdCopied}
                          >
                            {isIdCopied ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatSatoshis(vtxo.amount_sat)} sats
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {isExpired ? (
                            <Badge>Expired</Badge>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  variant === "success" && "text-green-600 dark:text-green-400",
                                  variant === "default" && "text-yellow-600 dark:text-yellow-400",
                                  variant === "destructive" && "text-destructive"
                                )}>
                                  Block #{formatBlockHeight(vtxo.expiry_height)}
                                </span>
                              </div>
                              {estimatedDate && (
                                <p className="text-xs text-muted-foreground">
                                  Est: {formatEstimatedDate(estimatedDate)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {vtxo.state?.type || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefreshVtxo(vtxo.id)}
                                disabled={refreshDisabled}
                              >
                                {isRefreshing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {refreshDisabled && !isRefreshing
                                  ? "Cannot refresh expired or pending coins."
                                  : "Refresh VTXO"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={exitDisabled}
                                    >
                                      {isExiting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <LogOut className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {exitDisabled && !isExiting
                                    ? "Cannot exit locked or spending coins."
                                    : "Offboard to L1 (Cooperative Spend)"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Offboard to L1</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This is a cooperative spend that moves 1 coin back to Bitcoin L1 through the Service Provider. Miner fees apply. This is different from a Unilateral Exit (Force Close), which bypasses the Service Provider and enforces a timelock.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleExitVtxo(vtxo.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Offboard to L1
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

