 "use client";

import { DoorOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExitDialog } from "./exit-dialog";

const POS_HEADER_CLASS =
  "fixed inset-x-0 top-0 z-50 h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75";

const formatTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

export function PosHeader() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [exitDialogOpen, setExitDialogOpen] = useState<boolean>(false);

  const statusColor = useMemo(
    () => (isOnline ? "bg-emerald-500" : "bg-red-500"),
    [isOnline],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const tick = () => setCurrentTime(formatTime());
    tick();
    const intervalId = window.setInterval(tick, 60_000);

    return () => window.clearInterval(intervalId);
  }, [mounted]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return (
    <header className={POS_HEADER_CLASS}>
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
        <div className="text-lg font-semibold">ArkPOS</div>

        <div className="text-sm font-medium tracking-tight text-zinc-100 min-w-[4.5rem] text-center">
          {mounted ? currentTime : "\u00a0"}
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span
              aria-label={isOnline ? "Online" : "Offline"}
              className={`h-2.5 w-2.5 rounded-full transition-colors duration-150 ${statusColor}`}
            />
            <span className="text-zinc-200">Network</span>
          </div>

          <Button
            onClick={() => setExitDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
            Exit
          </Button>
        </div>
      </div>

      <ExitDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen} />
    </header>
  );
}
