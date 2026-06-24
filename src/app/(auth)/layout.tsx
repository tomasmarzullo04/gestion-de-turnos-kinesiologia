import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container flex h-20 items-center">
        <Link href="/" className="flex items-center gap-3 font-display font-semibold tracking-tight">
          <BrandMark className="h-12 w-12" />
          <span className="text-xl">Apex</span>
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
