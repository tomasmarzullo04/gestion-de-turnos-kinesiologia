import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <Card className="border-0 shadow-2xl dark:shadow-none dark:border">
      <CardHeader className="space-y-4 pb-6 text-center">
        <Link href="/" className="mx-auto flex h-20 w-20 items-center justify-center transition-transform hover:scale-105">
          <BrandMark className="h-full w-full" animate={false} />
        </Link>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-display font-semibold tracking-tight">
            ¿Olvidaste tu contraseña?
          </CardTitle>
          <CardDescription className="text-base">
            Ingresá tu email y te enviamos un enlace para restablecerla.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground pb-8">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a ingresar
        </Link>
      </CardFooter>
    </Card>
  );
}
