'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SuccessViewProps = {
  onReset: () => void;
};

export function SuccessView({ onReset }: SuccessViewProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReset();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onReset]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-8">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex items-center justify-center">
          <CheckCircle2 className="h-32 w-32 text-emerald-500 animate-in zoom-in duration-500" />
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-bold text-zinc-100">Payment Received!</h2>
        </div>

        <Button
          type="button"
          onClick={onReset}
          className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          size="lg"
        >
          New Sale
        </Button>
      </div>
    </div>
  );
}
