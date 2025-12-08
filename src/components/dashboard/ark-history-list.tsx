 'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ArkMovement } from '@/lib/bark/schemas';

type ArkHistoryListProps = {
  movements: ArkMovement[];
};

const amountFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function getStatusBadge(status: ArkMovement['status']) {
  const isFinished = status === 'Finished';
  const badgeClassName = isFinished
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200';

  return <Badge className={badgeClassName}>{status}</Badge>;
}

function getTypeMeta(kind: ArkMovement['subsystem']['kind']) {
  switch (kind) {
    case 'send':
      return { icon: ArrowUp, label: 'Send' };
    case 'receive':
      return { icon: ArrowDown, label: 'Receive' };
    default:
      return { icon: RefreshCw, label: 'Refresh' };
  }
}

function formatAmount(amount: number) {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amountFormatter.format(amount)} sats`;
}

function formatDate(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return dateFormatter.format(parsed);
}

export function ArkHistoryList({ movements }: ArkHistoryListProps) {
  const [showSystem, setShowSystem] = useState(false);

  const visibleMovements = useMemo(
    () =>
      showSystem
        ? movements
        : movements.filter((movement) => movement.subsystem.kind !== 'refresh'),
    [movements, showSystem],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ark History (L2)</h3>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showSystem} onCheckedChange={setShowSystem} />
          <span>Show System Events</span>
        </label>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMovements.length > 0 ? (
              visibleMovements.map((movement) => {
                const { icon: Icon, label } = getTypeMeta(movement.subsystem.kind);
                const isRefresh = movement.subsystem.kind === 'refresh';
                const amountClassName =
                  movement.intended_balance_sat > 0
                    ? 'text-green-600'
                    : movement.intended_balance_sat < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground';
                const rowClassName = isRefresh ? 'text-muted-foreground' : '';

                return (
                  <TableRow key={movement.id} className={rowClassName}>
                    <TableCell>{getStatusBadge(movement.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{label}</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${amountClassName}`}>
                      {isRefresh ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        formatAmount(movement.intended_balance_sat)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(movement.time.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No Ark history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

