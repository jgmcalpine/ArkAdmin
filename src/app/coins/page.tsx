import { fetchVtxos, fetchNodeInfo, fetchExitProgress, fetchPendingRounds } from "@/lib/bark/queries"
import { VtxoTable } from "@/components/coins/vtxo-table"
import { RecoveryCard } from "@/components/coins/recovery-card"
import { OnboardDialog } from "@/components/coins/onboard-dialog"
import { Badge } from "@/components/ui/badge"

export default async function CoinsPage() {
  const vtxos = await fetchVtxos()
  const nodeInfo = await fetchNodeInfo()
  const exits = await fetchExitProgress()
  const rounds = await fetchPendingRounds()

  return (
    <main className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ark VTXOs (L2)</h1>
        <div className="flex items-center gap-3">
          <OnboardDialog />
          <Badge variant="secondary">Count: {vtxos.length}</Badge>
        </div>
      </div>
      <RecoveryCard
        exits={exits}
        rounds={rounds}
        currentHeight={nodeInfo?.blockHeight || 0}
      />
      <VtxoTable
        vtxos={vtxos}
        currentHeight={nodeInfo?.blockHeight || 0}
      />
    </main>
  )
}

