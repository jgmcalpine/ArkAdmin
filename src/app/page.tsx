import { fetchNodeInfo, fetchBalances } from "@/lib/bark/queries";
import { ConnectAlert } from "@/components/dashboard/connect-alert";
import { WalletOverview } from "@/components/dashboard/wallet-overview";
import { NodeHealth } from "@/components/dashboard/node-health";

export default async function Home() {
  const info = await fetchNodeInfo();
  const balances = await fetchBalances();

  if (info === null) {
    return (
      <main className="container mx-auto p-6">
        <ConnectAlert />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WalletOverview balance={balances} />
        </div>
        <NodeHealth info={info} />
      </div>
    </main>
  );
}