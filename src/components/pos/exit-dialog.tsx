"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { verifyPosPin } from "@/lib/bark/actions";

interface ExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExitDialog({ open, onOpenChange }: ExitDialogProps) {
  const router = useRouter();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (newOpen: boolean): void => {
    if (newOpen) {
      setPin("");
      setError(null);
      setDialogKey((prev) => prev + 1);
    }
    onOpenChange(newOpen);
  };

  useEffect(() => {
    if (open) {
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const isValid = await verifyPosPin(pin);
    if (isValid) {
      onOpenChange(false);
      router.push("/");
    } else {
      setError("Invalid PIN");
      setPin("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={dialogKey} className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Exit Kiosk Mode</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter Admin PIN to access the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="text-center text-2xl tracking-[0.5em] font-mono bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-950/50 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500"
          >
            Unlock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
