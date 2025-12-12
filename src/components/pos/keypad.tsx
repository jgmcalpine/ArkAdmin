'use client';

import { Delete } from 'lucide-react';
import type { ReactNode } from 'react';

type KeypadProps = {
  onAppend: (val: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onCharge: () => void;
  chargeDisabled?: boolean;
};

const NUMBER_BUTTON_CLASS =
  'h-20 flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-3xl font-medium text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

const CLEAR_BUTTON_CLASS =
  'h-20 flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-3xl font-medium text-red-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

const CHARGE_BUTTON_CLASS =
  'w-full h-20 flex items-center justify-center rounded-2xl bg-emerald-600 text-4xl font-bold text-white uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

type KeypadButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className: string;
};

function KeypadButton({
  onClick,
  disabled,
  children,
  className,
}: KeypadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function Keypad({
  onAppend,
  onBackspace,
  onClear,
  onCharge,
  chargeDisabled = false,
}: KeypadProps) {
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <KeypadButton
            key={num}
            onClick={() => onAppend(String(num))}
            className={NUMBER_BUTTON_CLASS}
          >
            {num}
          </KeypadButton>
        ))}

        <KeypadButton onClick={onClear} className={CLEAR_BUTTON_CLASS}>
          C
        </KeypadButton>

        <KeypadButton
          onClick={() => onAppend('0')}
          className={NUMBER_BUTTON_CLASS}
        >
          0
        </KeypadButton>

        <KeypadButton onClick={onBackspace} className={NUMBER_BUTTON_CLASS}>
          <div className="flex items-center justify-center">
            <Delete className="h-8 w-8" aria-hidden />
          </div>
        </KeypadButton>
      </div>

      <KeypadButton
        onClick={onCharge}
        disabled={chargeDisabled}
        className={CHARGE_BUTTON_CLASS}
      >
        Charge
      </KeypadButton>
    </div>
  );
}
