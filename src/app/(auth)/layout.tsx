import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 py-10">
      {/* Decorative background blobs for a modern professional look */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-accent/15 blur-[100px]" />
      </div>
      <main className="relative z-10 w-full max-w-md px-4 sm:px-0">
        {children}
      </main>
    </div>
  );
}
