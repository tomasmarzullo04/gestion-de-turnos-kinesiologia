import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Ingresar",
};

import { BrandMark } from "@/components/shared/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <Card className="border-0 shadow-2xl dark:shadow-none dark:border">
      <CardHeader className="space-y-4 pb-6 text-center">
        <Link href="/" className="mx-auto flex h-24 w-24 items-center justify-center transition-transform hover:scale-105">
          <BrandMark className="h-full w-full" animate={false} />
        </Link>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-display font-semibold tracking-tight">Bienvenido a Apex</CardTitle>
          <CardDescription className="text-base">
            Ingresá a tu cuenta para continuar.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground pb-8">
        ¿No tenés cuenta?&nbsp;
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Registrate
        </Link>
      </CardFooter>
    </Card>
  );
}
