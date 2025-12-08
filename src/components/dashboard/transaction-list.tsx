'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/bark/schemas';

type TransactionListProps = {
  transactions: Transaction[];
};

function truncateTxid(txid: string): string {
  if (txid.length <= 16) {
    return txid;
  }
  return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => {
        setCopiedHex(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy hex:', error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TXID</TableHead>
            <TableHead>Raw</TableHead>
            <TableHead className="text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => {
              const isHexCopied = copiedHex === transaction.tx;
              
              return (
                <TableRow key={transaction.txid}>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {truncateTxid(transaction.txid)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyHex(transaction.tx)}
                      disabled={isHexCopied}
                      className="h-8"
                    >
                      {isHexCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Hex
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={`https://mempool.space/signet/tx/${transaction.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No on-chain history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

