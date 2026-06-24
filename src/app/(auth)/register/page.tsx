import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/app/(auth)/register/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

import { BrandMark } from "@/components/shared/brand-mark";

export default function RegisterPage() {
  return (
    <Card className="border-0 shadow-2xl dark:shadow-none dark:border">
      <CardHeader className="space-y-4 pb-6 text-center">
        <Link href="/" className="mx-auto flex h-24 w-24 items-center justify-center transition-transform hover:scale-105">
          <BrandMark className="h-full w-full" animate={false} />
        </Link>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-display font-semibold tracking-tight">Creá tu cuenta</CardTitle>
          <CardDescription className="text-base">
            Registrate para reservar y gestionar tus turnos.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground pb-8">
        ¿Ya tenés cuenta?&nbsp;
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Ingresá
        </Link>
      </CardFooter>
    </Card>
  );
}
