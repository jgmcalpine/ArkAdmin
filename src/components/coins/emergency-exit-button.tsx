'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { forceExitAll } from '@/lib/bark/actions';
import { AlertTriangle, Loader2, Siren } from 'lucide-react';

interface EmergencyExitButtonProps {
  disabled?: boolean;
}

export function EmergencyExitButton({ disabled = false }: EmergencyExitButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);

    const result = await forceExitAll();

    if (!result.success) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting || disabled) return;
    setError(null);
    setOpen(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className={`gap-2 ${disabled ? 'pointer-events-none' : ''}`}
          aria-label="Emergency Exit"
          disabled={disabled}
        >
          <Siren className="h-4 w-4" />
          Emergency Exit
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ⚠ EMERGENCY EXIT: FORCE CLOSE ALL POSITIONS
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This will bypass the Service Provider and broadcast exit transactions
                for ALL your Ark Coins to the Bitcoin Network.
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Funds will be timelocked (usually 24+ hours).</li>
                <li>You will incur separate miner fees for each coin.</li>
                <li>This action cannot be stopped.</li>
              </ul>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forcing Exit...
              </>
            ) : (
              'I Understand, Force Exit All'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

