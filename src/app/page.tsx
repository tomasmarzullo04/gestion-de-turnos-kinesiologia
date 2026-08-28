import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  ShieldCheck,
  Users,
  ArrowRight,
  Activity,
  Dumbbell,
  Heart,
  Wind,
  Sparkles,
  Instagram
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/shared/public-header";

const features = [
  {
    number: "01",
    icon: CalendarCheck,
    title: "Reservá en segundos",
    description:
      "Elegí el día y la hora con cupo disponible. Sin llamadas ni esperas innecesarias.",
  },
  {
    number: "02",
    icon: Users,
    title: "Cupos en vivo",
    description:
      "Mirá en tiempo real cuántos lugares quedan en cada sesión y asegurá el tuyo.",
  },
  {
    number: "03",
    icon: Clock,
    title: "Flexibilidad total",
    description:
      "Reservá el horario que más te convenga según tu rutina. Sin horarios fijos.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Tu cuenta, segura",
    description:
      "Acceso privado con tu usuario, donde podés ver tu historial y gestionar todo.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="inicio" className="relative overflow-hidden bg-background pt-28 lg:pt-40 pb-16 lg:pb-24 flex items-center scroll-mt-20 lg:scroll-mt-24">
          <div className="container max-w-[1240px] relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">
            
            <div className="flex flex-col justify-center space-y-10 animate-fade-up">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-medium text-secondary shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow block"></span>
                  Cupos actualizados en vivo
                </div>
                <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-6xl text-foreground font-display leading-tight">
                  Tu cuerpo no frena.
                  <span className="block text-muted-foreground">Tu recuperación tampoco.</span>
                </h1>
                <p className="max-w-[480px] text-lg text-muted-foreground leading-relaxed">
                  Performance & Recovery Studio. Reservá tu sesión de entrenamiento o recuperación al instante.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="rounded-xl px-8 h-14 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Link href="/register">
                    Reservar mi lugar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-xl px-8 h-14 text-base bg-background hover:bg-muted border-border/40">
                  <Link href="/login">Ingresar a mi cuenta</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative mx-auto w-full max-w-[500px] lg:max-w-[540px] aspect-[4/5] sm:aspect-square md:aspect-auto md:h-[400px] lg:h-[550px] animate-fade-in group perspective-1000 mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-primary/20 mix-blend-multiply z-10 rounded-[2rem] transition-all duration-700 group-hover:bg-primary/10"></div>
              
              {/* Floating Badge */}
              <div className="absolute top-6 right-6 z-20 bg-background/90 backdrop-blur-md border border-border/40 rounded-xl p-3 shadow-lg animate-fade-up hidden sm:block" style={{animationDelay: '0.4s'}}>
                <p className="text-[10px] font-semibold text-foreground tracking-wide uppercase">Reservá Online</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gestión rápida y segura</p>
              </div>

              <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-xl relative border border-border/40">
                <Image
                  src="/images/apex-training-floor.jpeg"
                  alt="Entrenamiento de alto rendimiento en APEX"
                  fill
                  priority
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 via-primary/20 to-transparent z-10 pointer-events-none mix-blend-overlay"></div>
              </div>
            </div>
            
          </div>
          
        </section>

        {/* Marquee Section */}
        <section className="py-6 bg-primary overflow-hidden border-y border-white/10 text-primary-foreground relative select-none">
          <div className="bg-texture-grid absolute inset-0 opacity-20"></div>
          <div className="flex whitespace-nowrap animate-marquee items-center opacity-80 relative z-10">
            {/* Duplicated for smooth infinite scrolling */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-4 text-sm md:text-base font-semibold tracking-[0.2em]">
                <span>ENTRENAMIENTO FUNCIONAL</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>RECOVERY ROOM</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>RESERVAS ONLINE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>CUPOS EN VIVO</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              </div>
            ))}
          </div>
        </section>

        {/* Servicios Section */}
        <section id="servicios" className="py-14 md:py-20 lg:py-28 scroll-mt-20 lg:scroll-mt-24">
          <div className="container max-w-[1240px]">
            <div className="mb-10 md:mb-12 lg:mb-16 text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl font-display">Todo lo que necesitás para moverte mejor</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Entrenamiento, recuperación y acompañamiento profesional en un mismo espacio.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 lg:gap-8 stagger-children">
              
              {/* GYM */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-10 shadow-sm hover:shadow-xl transition-all duration-300">
                <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                  <Dumbbell className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-xl font-bold font-display uppercase tracking-wider">GYM</h3>
                <p className="font-medium text-foreground text-sm mb-3">Entrenamiento funcional</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sesiones de entrenamiento funcional para mejorar fuerza, movilidad y rendimiento.
                </p>
              </div>

              {/* Kinesiología */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-10 shadow-sm hover:shadow-xl transition-all duration-300 md:translate-y-4">
                <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground shadow-sm">
                  <Activity className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-xl font-bold font-display uppercase tracking-wider">Kinesiología</h3>
                <p className="font-medium text-foreground text-sm mb-3">Rehabilitación y movimiento</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Atención profesional para acompañar tu recuperación y volver a moverte con seguridad.
                </p>
              </div>

              {/* RECOVERY */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border/40 shadow-sm hover:shadow-xl transition-all duration-300 min-h-[300px] flex flex-col justify-end p-10">
                <div className="absolute inset-0 z-0">
                  <Image src="/images/apex-recovery-room.jpeg" alt="Recovery Room" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                </div>
                <div className="relative z-10 text-white">
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur text-white shadow-sm">
                    <Heart className="h-5 w-5" />
                  </span>
                  <h3 className="mb-2 text-xl font-bold font-display uppercase tracking-wider">RECOVERY</h3>
                  <p className="font-medium text-white/90 text-sm mb-3">Recuperación y bienestar</p>
                  <p className="text-white/80 leading-relaxed text-sm mb-4">
                    Un espacio para recuperar, bajar la fatiga y preparar tu cuerpo para la próxima sesión.
                  </p>
                </div>
              </div>

              {/* RESPI */}
              <div className="md:col-start-2 md:col-span-2 group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-10 shadow-sm hover:shadow-xl transition-all duration-300">
                <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                  <Wind className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-xl font-bold font-display uppercase tracking-wider">RESPI</h3>
                <p className="font-medium text-foreground text-sm mb-3">Rehabilitación respiratoria</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Acompañamiento orientado a mejorar tu capacidad respiratoria y bienestar físico.
                </p>
              </div>

              {/* RPG */}
              <div className="md:col-start-4 md:col-span-2 group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-10 shadow-sm hover:shadow-xl transition-all duration-300 md:-translate-y-4">
                <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-xl font-bold font-display uppercase tracking-wider">RPG</h3>
                <p className="font-medium text-foreground text-sm mb-3">Reeducación Postural Global</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Trabajo personalizado para mejorar postura, movilidad y equilibrio corporal.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Experiencia Section (Asymmetric) */}
        <section id="experiencia" className="py-14 md:py-20 lg:py-28 bg-muted/30 scroll-mt-20 lg:scroll-mt-24">
          <div className="container max-w-[1240px]">
            <div className="grid lg:grid-cols-12 gap-10 md:gap-12 lg:gap-16 items-center">
              
              {/* Text / Smaller Image */}
              <div className="lg:col-span-5 flex flex-col gap-8 md:gap-12 lg:order-2">
                <div className="space-y-6 animate-fade-up">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-display text-balance">
                    Entrenamiento y recuperación,<br/> en un solo lugar
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    En APEX abordamos tu rendimiento de forma integral, combinando el esfuerzo físico intenso con la tecnología de recuperación más avanzada.
                  </p>
                </div>
                
                <div className="relative aspect-square sm:aspect-video lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-xl group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                  <Image
                    src="/images/apex-recovery-room.jpeg"
                    alt="Recovery Room en APEX"
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute bottom-0 left-0 p-8 z-20 text-white">
                    <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-2">Recovery Room</p>
                    <h3 className="text-xl font-bold">Tecnología de recuperación</h3>
                  </div>
                </div>
              </div>

              {/* Larger Image */}
              <div className="lg:col-span-7 lg:order-1 relative">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl group border border-border/40">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                  <Image
                    src="/images/apex-recovery-session.jpeg"
                    alt="Sesión de entrenamiento en APEX"
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 text-white max-w-md">
                    <p className="text-xs uppercase tracking-widest text-secondary font-bold mb-3">Entrenamiento Guiado</p>
                    <h3 className="text-3xl font-bold mb-4 font-display">Superá tus límites con nuestros profesionales</h3>
                    <p className="text-white/80 leading-relaxed">Rutinas adaptadas a tus objetivos, en un entorno diseñado para el alto rendimiento.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Beneficios Section */}
        <section id="beneficios" className="container max-w-[1240px] py-14 md:py-20 lg:py-28 scroll-mt-20 lg:scroll-mt-24">
          <div className="mb-10 md:mb-12 lg:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl font-display">Una plataforma<br/> pensada para vos</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-sm leading-relaxed">
              Gestionar tus turnos nunca fue tan fácil. Todo lo que necesitás, rápido y claro.
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-10 shadow-sm transition-all duration-300 ease-out-soft hover:-translate-y-2 hover:shadow-xl hover:border-secondary/50"
              >
                {/* Number Watermark */}
                <span className="absolute top-4 right-4 text-[5rem] font-bold text-muted/30 leading-none select-none transition-transform duration-500 group-hover:scale-110 group-hover:text-secondary/10">
                  {feature.number}
                </span>

                <div className="relative z-10">
                  <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground shadow-sm">
                    <feature.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mb-3 text-xl font-bold font-display">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container max-w-[1240px] pb-12 md:pb-24">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary text-primary-foreground shadow-2xl">
            {/* Background Image and Textures */}
            <div className="absolute inset-0 bg-[url('/images/apex-training-floor.jpeg')] opacity-10 bg-cover bg-center mix-blend-luminosity"></div>
            <div className="bg-texture-grid absolute inset-0 opacity-10"></div>
            
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-secondary/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 px-6 py-12 sm:px-16 sm:py-32 flex flex-col items-center text-center space-y-8 sm:space-y-10">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tight sm:text-6xl font-display text-balance">
                  ¿Listo para tu próxima sesión?
                </h2>
                <p className="text-lg text-primary-foreground/70 leading-relaxed">
                  Sumate a APEX. Creá tu cuenta gratis y empezá a reservar tus turnos hoy mismo, sin complicaciones.
                </p>
              </div>
              
              <Button size="lg" asChild className="rounded-xl px-10 h-16 text-lg font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_30px_rgba(var(--secondary),0.3)] transition-all hover:scale-105">
                <Link href="/register">Reservar mi lugar ahora</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground border-t border-primary-foreground/10">
        <div className="container max-w-[1240px] py-12 md:py-16 flex flex-col md:flex-row items-start justify-between gap-10 md:gap-12">
          
          <div className="flex flex-col gap-4">
            <Link href="#inicio" className="flex items-center gap-3">
               <BrandMark className="h-10 w-10 bg-white rounded-md p-1" />
               <div className="flex flex-col">
                 <span className="font-display font-bold text-lg leading-tight tracking-tight text-primary-foreground">APEX</span>
                 <span className="text-[10px] font-medium text-primary-foreground/70 uppercase tracking-widest leading-none">Performance & Recovery</span>
               </div>
            </Link>
            <p className="text-sm text-primary-foreground/70 max-w-xs mt-2">
              Elevando el estándar del rendimiento y la recuperación.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-12 md:gap-24">
            <div className="flex flex-col gap-4">
              <span className="font-semibold text-sm tracking-wide uppercase text-primary-foreground">Plataforma</span>
              <ul className="flex flex-col gap-3 text-sm text-primary-foreground/80">
                <li><Link href="#inicio" className="hover:text-primary-foreground hover:underline transition-all">Inicio</Link></li>
                <li><Link href="#servicios" className="hover:text-primary-foreground hover:underline transition-all">Servicios</Link></li>
                <li><Link href="#experiencia" className="hover:text-primary-foreground hover:underline transition-all">Experiencia</Link></li>
                <li><Link href="#beneficios" className="hover:text-primary-foreground hover:underline transition-all">Beneficios</Link></li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-semibold text-sm tracking-wide uppercase text-primary-foreground">Cuenta</span>
              <ul className="flex flex-col gap-3 text-sm text-primary-foreground/80">
                <li><Link href="/login" className="hover:text-primary-foreground hover:underline transition-all">Ingresar</Link></li>
                <li><Link href="/register" className="hover:text-primary-foreground hover:underline transition-all">Crear cuenta</Link></li>
              </ul>
            </div>
          </div>
          
        </div>
        
        <div className="container max-w-[1240px] py-6 md:py-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
          <p className="text-sm text-primary-foreground/70 text-center md:text-left">
            © {new Date().getFullYear()} APEX Kinesiología & Entrenamiento. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 items-center">
            <a href="https://www.instagram.com/centro.apex/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors group">
              <Instagram className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Seguinos en Instagram</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
