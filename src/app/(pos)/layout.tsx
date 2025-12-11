import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PosHeader } from "@/components/pos/pos-header";

export const metadata: Metadata = {
  title: "ArkPOS",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function PosLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden touch-none select-none pt-14">
      <PosHeader />
      <main className="relative h-[calc(100vh-3.5rem)] w-full">{children}</main>
    </div>
  );
}
