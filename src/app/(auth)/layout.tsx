import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span className="text-lg">Kiné</span>
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
