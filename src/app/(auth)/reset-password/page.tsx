import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card className="border-0 shadow-2xl dark:shadow-none dark:border">
      <CardHeader className="space-y-4 pb-6 text-center">
        <Link href="/" className="mx-auto flex h-20 w-20 items-center justify-center transition-transform hover:scale-105">
          <BrandMark className="h-full w-full" animate={false} />
        </Link>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-display font-semibold tracking-tight">
            Nueva contraseña
          </CardTitle>
          <CardDescription className="text-base">
            {token
              ? "Elegí una contraseña nueva para tu cuenta."
              : "El enlace no es válido."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            El enlace es inválido o está incompleto. Pedí uno nuevo desde{" "}
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              recuperar contraseña
            </Link>
            .
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground pb-8">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a ingresar
        </Link>
      </CardFooter>
    </Card>
  );
}
