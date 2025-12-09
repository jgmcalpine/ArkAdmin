import { fetchVtxos, fetchNodeInfo } from "@/lib/bark/queries"
import { VtxoTable } from "@/components/coins/vtxo-table"
import { Badge } from "@/components/ui/badge"

export default async function CoinsPage() {
  const vtxos = await fetchVtxos()
  const nodeInfo = await fetchNodeInfo()

  return (
    <main className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ark VTXOs (L2)</h1>
        <Badge variant="secondary">Count: {vtxos.length}</Badge>
      </div>
      <VtxoTable
        vtxos={vtxos}
        currentHeight={nodeInfo?.blockHeight || 0}
      />
    </main>
  )
}

