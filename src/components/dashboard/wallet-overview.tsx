import { Ship, Link } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Balance } from "@/lib/bark/schemas";
import { cn } from "@/lib/utils";

type WalletOverviewProps = {
  balance: Balance;
};

function formatSatoshis(sats: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(sats);
}

export function WalletOverview({ balance }: WalletOverviewProps) {
  const totalBalance = balance.arkSpendable + balance.onchainConfirmed;
  const arkPercentage = totalBalance > 0 
    ? (balance.arkSpendable / totalBalance) * 100 
    : 0;
  const onchainPercentage = totalBalance > 0 
    ? (balance.onchainConfirmed / totalBalance) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Balance */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-3xl font-bold">{formatSatoshis(totalBalance)} sats</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                arkPercentage > 0 && "bg-yellow-500 dark:bg-yellow-400"
              )}
              style={{ width: `${arkPercentage}%` }}
            />
            <div
              className={cn(
                "h-full transition-all",
                onchainPercentage > 0 && "bg-blue-500 dark:bg-blue-400"
              )}
              style={{ width: `${onchainPercentage}%` }}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Ark (L2) */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-yellow-600 dark:text-yellow-400">
              <Ship className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Ark (L2)</p>
              <p className="text-lg font-semibold truncate">
                {formatSatoshis(balance.arkSpendable)} sats
              </p>
            </div>
          </div>

          {/* On-chain (L1) */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-foreground">
              <Link className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">On-chain (L1)</p>
              <p className="text-lg font-semibold truncate">
                {formatSatoshis(balance.onchainConfirmed)} sats
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

