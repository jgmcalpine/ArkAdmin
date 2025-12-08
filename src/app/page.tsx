import { fetchNodeInfo, fetchBalances, fetchTransactions, fetchArkMovements } from "@/lib/bark/queries";
import { ConnectAlert } from "@/components/dashboard/connect-alert";
import { WalletOverview } from "@/components/dashboard/wallet-overview";
import { NodeHealth } from "@/components/dashboard/node-health";
import { ReceiveDialog } from "@/components/dashboard/receive-dialog";
import { SendDialog } from "@/components/dashboard/send-dialog";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { AutoSyncer } from "@/components/dashboard/auto-syncer";

export default async function Home() {
  const info = await fetchNodeInfo();
  const balances = await fetchBalances();
  const transactions = await fetchTransactions();
  const arkMovements = await fetchArkMovements();

  if (info === null) {
    return (
      <>
        <AutoSyncer />
        <main className="container mx-auto p-6">
          <ConnectAlert />
        </main>
      </>
    );
  }

  return (
    <>
      <AutoSyncer />
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <ReceiveDialog />
            <SendDialog />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <WalletOverview balance={balances} />
          </div>
          <NodeHealth info={info} />
        </div>
        <TransactionHistory arkMovements={arkMovements} transactions={transactions} />
      </main>
    </>
  );
}