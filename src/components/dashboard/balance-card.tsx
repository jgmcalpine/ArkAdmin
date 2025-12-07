import { Zap, Link } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Balance } from "@/lib/bark/schemas";

type BalanceCardProps = {
  balance: Balance;
};

function formatSatoshis(sats: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(sats);
}

export function BalanceCard({ balance }: BalanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-yellow-600 dark:text-yellow-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ark Balance</p>
              <p className="text-lg font-semibold">
                {formatSatoshis(balance.arkSpendable)} sats
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-foreground">
              <Link className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On-Chain Balance</p>
              <p className="text-lg font-semibold">
                {formatSatoshis(balance.onchainConfirmed)} sats
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

