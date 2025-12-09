import { fetchVtxos, fetchNodeInfo, fetchExitProgress, fetchPendingRounds, fetchUtxos } from "@/lib/bark/queries"
import { VtxoTable } from "@/components/coins/vtxo-table"
import { UtxoTable } from "@/components/coins/utxo-table"
import { RecoveryCard } from "@/components/coins/recovery-card"
import { OnboardDialog } from "@/components/coins/onboard-dialog"
import { EmergencyExitButton } from "@/components/coins/emergency-exit-button"
import { Badge } from "@/components/ui/badge"

export default async function CoinsPage() {
  const vtxos = await fetchVtxos()
  const utxos = await fetchUtxos()
  const nodeInfo = await fetchNodeInfo()
  const exits = await fetchExitProgress()
  const rounds = await fetchPendingRounds()
  const currentHeight = nodeInfo?.blockHeight || 0

  const spendableCount = vtxos.filter(
    (vtxo) => vtxo.state?.type === "spendable" && (vtxo.expiry_height - currentHeight > 0 || currentHeight === 0)
  ).length

  const emergencyDisabled = spendableCount === 0

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
          <EmergencyExitButton disabled={emergencyDisabled} />
          <OnboardDialog />
          <Badge variant="secondary">Count: {vtxos.length}</Badge>
        </div>
      </div>
      <RecoveryCard
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

