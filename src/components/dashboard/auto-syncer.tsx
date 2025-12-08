'use client';

import { useEffect } from 'react';
import { syncNode } from '@/lib/bark/actions';

interface AutoSyncerProps {
  intervalMs?: number;
}

export function AutoSyncer({ intervalMs = 30000 }: AutoSyncerProps): null {
  useEffect(() => {
    const intervalId = setInterval(() => {
      syncNode();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [intervalMs]);

  return null;
}

