"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink, ArrowRightLeft } from "lucide-react"
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Utxo } from "@/lib/bark/schemas"

interface UtxoTableProps {
  utxos: Utxo[]
  network?: string
  hasPendingExits?: boolean
}

function formatSatoshis(sats: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(sats)
}

function truncateId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-8)}`
}

function formatOutpoint(txid: string, vout: number): string {
  return `${truncateId(txid)}:${vout}`
}

function getMempoolUrl(txid: string, network?: string): string {
  const networkPath = network === 'mainnet' ? '' : `${network}/`
  return `https://mempool.space/${networkPath}tx/${txid}`
}

export function UtxoTable({ utxos, network = 'signet', hasPendingExits = false }: UtxoTableProps) {
  const [copiedOutpoint, setCopiedOutpoint] = useState<string | null>(null)

  const handleCopyOutpoint = async (txid: string, vout: number) => {
    const outpoint = `${txid}:${vout}`
    try {
      await navigator.clipboard.writeText(outpoint)
      setCopiedOutpoint(outpoint)
      setTimeout(() => {
        setCopiedOutpoint(null)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy outpoint:", err)
    }
  }

  if (utxos.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {hasPendingExits ? (
            <>
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground mb-3 animate-pulse" />
              <p className="font-medium text-foreground mb-1">L1 Funds are currently waiting for Exit Confirmation.</p>
              <p className="text-sm text-muted-foreground">
                Your UTXOs are being used to fund the recovery transaction. Change outputs will appear here after confirmation.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No UTXOs found</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bitcoin UTXOs (L1)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[120px] truncate md:max-w-[200px]">Outpoint</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utxos.map((utxo) => {
                  const outpoint = `${utxo.txid}:${utxo.vout}`
                  const isOutpointCopied = copiedOutpoint === outpoint
                  const isConfirmed = utxo.confirmed_height !== null && utxo.confirmed_height !== undefined && utxo.confirmed_height > 0

                  return (
                    <TableRow key={outpoint}>
                      <TableCell className="max-w-[120px] truncate md:max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {formatOutpoint(utxo.txid, utxo.vout)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyOutpoint(utxo.txid, utxo.vout)}
                            disabled={isOutpointCopied}
                          >
                            {isOutpointCopied ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatSatoshis(utxo.amount_sat)} sats</span>
                      </TableCell>
                      <TableCell>
                        {isConfirmed ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                            Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                            Mempool
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a
                                href={getMempoolUrl(utxo.txid, network)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="View on Explorer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View on Mempool.space</p>
                          </TooltipContent>
                        </Tooltip>
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

