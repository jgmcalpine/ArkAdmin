export const dynamic = 'force-dynamic';

import {
  fetchBalances,
  fetchExitProgress,
  fetchNodeInfo,
  fetchPendingRounds,
  fetchUtxos,
  fetchVtxos,
} from "@/lib/bark/queries"
import { VtxoTable } from "@/components/coins/vtxo-table"
import { UtxoTable } from "@/components/coins/utxo-table"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { OnboardDialog } from "@/components/coins/onboard-dialog"
import { EmergencyExitButton } from "@/components/coins/emergency-exit-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default async function CoinsPage() {
  const vtxos = await fetchVtxos()
  const utxos = await fetchUtxos()
  const nodeInfo = await fetchNodeInfo()
  const exits = await fetchExitProgress()
  const rounds = await fetchPendingRounds()
  const balance = await fetchBalances()
  const currentHeight = nodeInfo?.blockHeight || 0  
  const hasGas = balance.onchainConfirmed > 500
  const spendableCount = vtxos.filter(
    (vtxo) => vtxo.state?.type === "spendable" && (vtxo.expiry_height - currentHeight > 0 || currentHeight === 0)
  ).length

  const emergencyDisabled = spendableCount === 0 || !hasGas
  const showGasTooltip = !hasGas

  return (
    <main className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coin Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Off-Chain (Ark) and On-Chain (Bitcoin) liquidity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showGasTooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-not-allowed" tabIndex={0} aria-label="Emergency Exit disabled">
                    <EmergencyExitButton disabled={emergencyDisabled} />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Insufficient L1 Funds. You need On-Chain Bitcoin to pay for the exit transaction fees. Please deposit
                  funds via the Receive tab.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <EmergencyExitButton disabled={emergencyDisabled} />
          )}
          <OnboardDialog />
        </div>
      </div>
      <ActivityFeed
        exits={exits}
        rounds={rounds}
        currentHeight={currentHeight}
        network={nodeInfo?.network}
      />
      <VtxoTable
        vtxos={vtxos}
        currentHeight={currentHeight}
      />
      <UtxoTable
        utxos={utxos}
        network={nodeInfo?.network}
        hasPendingExits={exits.length > 0}
      />
    </main>
  )
}

