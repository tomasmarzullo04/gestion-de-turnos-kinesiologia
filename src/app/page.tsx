import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CalendarCheck,
    title: "Reserva en segundos",
    description:
      "Elegí profesional, servicio y horario disponible. El sistema calcula los slots reales según la agenda.",
  },
  {
    icon: Users,
    title: "Varios profesionales",
    description:
      "Cada kinesiólogo gestiona su propia agenda, servicios y disponibilidad horaria.",
  },
  {
    icon: Clock,
    title: "Sin solapamientos",
    description:
      "Validación de horarios en el servidor: nunca se reservan dos turnos en el mismo espacio.",
  },
  {
    icon: ShieldCheck,
    title: "Datos protegidos",
    description:
      "Autenticación por roles, contraseñas cifradas y validación estricta en cada operación.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg">Kiné</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Gestión de turnos para kinesiología
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Tu agenda kinesiológica, ordenada y sin fricción
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Pacientes reservan online en segundos; los profesionales gestionan
            toda su agenda desde un panel claro y profesional. Simple para todos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Reservar un turno</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Soy profesional</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="container grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="animate-fade-in rounded-xl border bg-card p-6 shadow-sm"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mb-1 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Kiné</span>
          <span>Hecho con cuidado para tu consultorio</span>
        </div>
      </footer>
    </div>
  );
}
