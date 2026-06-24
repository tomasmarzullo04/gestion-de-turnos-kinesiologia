import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CalendarCheck,
    title: "Reservá en segundos",
    description:
      "Elegí el día y la hora con cupo disponible. Sin llamadas ni esperas.",
  },
  {
    icon: Users,
    title: "Cupos en vivo",
    description:
      "Cada franja tiene lugares limitados; mirás en tiempo real cuántos quedan.",
  },
  {
    icon: Clock,
    title: "Elegí libremente",
    description:
      "Reservá el horario que más te convenga, el día que quieras. Sin patrón fijo.",
  },
  {
    icon: ShieldCheck,
    title: "Tu cuenta, segura",
    description:
      "Acceso con tu usuario, datos protegidos y validación en cada reserva.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <header className="border-b">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-display font-semibold tracking-tight">
            <BrandMark className="h-12 w-12" />
            <span className="text-xl">Apex</span>
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

      <main>
        <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Entrenamiento en Apex
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Reservá tu turno de entrenamiento
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted-foreground">
            Entrá, mirá los horarios con cupo disponible y reservá el que más te
            convenga. Simple y al instante.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Crear cuenta y reservar</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="container grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 shadow-e1 transition-all duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-e2"
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

        <section className="container py-20 text-center md:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl bg-primary/5 px-6 py-16 shadow-sm sm:px-12 border">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Listo para entrenar?
            </h2>
            <p className="max-w-xl text-lg text-muted-foreground">
              Creá tu cuenta y reservá tu próximo turno de entrenamiento en
              segundos. Elegís el día y la hora; nosotros te guardamos el lugar.
            </p>
            <Button size="lg" asChild className="mt-4">
              <Link href="/register">Reservar turno ahora</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Apex</span>
          <span>Entrená cuando quieras</span>
        </div>
      </footer>
    </div>
  );
}
