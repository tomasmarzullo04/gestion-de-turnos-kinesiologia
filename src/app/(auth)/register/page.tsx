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

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Creá tu cuenta</CardTitle>
        <CardDescription>
          Registrate para reservar y gestionar tus turnos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
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
