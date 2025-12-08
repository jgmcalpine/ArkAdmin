import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ArkMovement, Transaction } from '@/lib/bark/schemas';

import { ArkHistoryList } from './ark-history-list';
import { TransactionList } from './transaction-list';

type TransactionHistoryProps = {
  arkMovements: ArkMovement[];
  transactions: Transaction[];
};

export function TransactionHistory({
  arkMovements,
  transactions,
}: TransactionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ark">
          <TabsList>
            <TabsTrigger value="ark">Ark (L2)</TabsTrigger>
            <TabsTrigger value="bitcoin">Bitcoin (L1)</TabsTrigger>
          </TabsList>
          <TabsContent value="ark">
            <ArkHistoryList movements={arkMovements} />
          </TabsContent>
          <TabsContent value="bitcoin">
            <TransactionList transactions={transactions} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

