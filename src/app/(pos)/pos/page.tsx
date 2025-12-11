'use client';

import type { ReactElement } from 'react';
import { useKeypad } from '@/lib/pos/use-keypad';
import { Keypad } from '@/components/pos/keypad';

export default function PosPage(): ReactElement {
  const { value, append, backspace, clear } = useKeypad(8);
  const handleCharge = (): void => {
    // TODO: Implement charge logic
    console.log('Charge:', value);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="w-full text-center">
          <div className="text-6xl font-bold tabular-nums text-zinc-100">
            {value}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-400">Satoshis</div>
        </div>

        <div className="w-full">
          <Keypad
            onAppend={append}
            onBackspace={backspace}
            onClear={clear}
            onCharge={handleCharge}
            chargeDisabled={value === '0'}
          />
        </div>
      </div>
    </div>
  );
}
