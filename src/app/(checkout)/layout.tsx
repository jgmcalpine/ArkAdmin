import type { ReactNode } from 'react';

type CheckoutLayoutProps = {
  children: ReactNode;
};

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
