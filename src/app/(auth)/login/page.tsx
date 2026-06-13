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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Ingresá a tu cuenta</CardTitle>
        <CardDescription>
          Usá tu email y contraseña para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
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
