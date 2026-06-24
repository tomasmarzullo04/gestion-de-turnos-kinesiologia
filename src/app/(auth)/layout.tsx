import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container flex h-32 items-center">
        <Link href="/" className="flex items-center font-display font-semibold tracking-tight">
          <BrandMark className="h-24 w-24" />
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
