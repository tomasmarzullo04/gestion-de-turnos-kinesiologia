# Kiné · Gestión de turnos para kinesiología

Aplicación web full-stack para gestionar turnos de una consultoría de
kinesiología, con dos roles (**Admin** y **Paciente**) y soporte para **varios
profesionales**, cada uno con su propia agenda.

Construida con **Next.js 15 (App Router)**, **TypeScript estricto**,
**Prisma**, **Auth.js v5**, **Tailwind CSS** y **shadcn/ui**.

---

## ✨ Funcionalidades

### Admin (kinesiólogo / recepción)

- **Dashboard** con métricas (turnos de hoy, pendientes, próximos, completados
  en la semana) y agenda del día.
- **Turnos**: listado con filtros (profesional, estado, rango de fechas,
  paciente), alta manual y acciones (confirmar, completar, cancelar).
- **Servicios**: ABM con duración, descripción y activación.
- **Profesionales**: ABM con especialidad y activación.
- **Disponibilidad**: franjas horarias semanales por profesional.

### Paciente

- **Registro** e inicio de sesión.
- **Reserva**: profesional → servicio → **slots disponibles reales**
  (calculados según disponibilidad y turnos ya tomados) → confirmar.
- **Mis turnos**: próximos e historial, con cancelación (antelación mínima
  configurable).
- **Perfil**: edición de nombre y teléfono.

---

## 🧱 Stack técnico

| Capa            | Tecnología                                              |
| --------------- | ------------------------------------------------------- |
| Framework       | Next.js 15 (App Router, Server Actions, Route Handlers) |
| Lenguaje        | TypeScript (modo estricto)                              |
| UI              | Tailwind CSS · shadcn/ui · lucide-react · sonner        |
| ORM             | Prisma (SQLite en dev, PostgreSQL en prod)              |
| Autenticación   | Auth.js v5 (Credentials + JWT, rol en DB)               |
| Hash contraseñas| bcryptjs                                                |
| Validación      | Zod (compartida cliente/servidor) + React Hook Form     |
| Fechas/horas    | date-fns · date-fns-tz                                  |

---

## 🚀 Puesta en marcha (desarrollo local)

### Requisitos

- **Node.js ≥ 20** (recomendado 22)
- npm (o pnpm/yarn)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Generá un secreto para Auth.js y pegalo en AUTH_SECRET:
#   openssl rand -base64 32

# 3. Crear la base de datos y aplicar el schema (SQLite)
npm run db:migrate          # crea la migración inicial + la DB dev.db

# 4. Cargar datos de ejemplo
npm run db:seed

# 5. Levantar el servidor de desarrollo
npm run dev
```

La app queda disponible en **http://localhost:3000**.

> Si solo querés un esquema rápido sin historial de migraciones, podés usar
> `npm run db:push` en lugar de `db:migrate`.

---

## 🔑 Credenciales de prueba

Generadas por el seed (configurables en `.env`):

| Rol      | Email                     | Contraseña     |
| -------- | ------------------------- | -------------- |
| Admin    | `admin@kinesio.local`     | `Admin123!`    |
| Paciente | `paciente@kinesio.local`  | `Paciente123!` |

El seed también crea 2 profesionales, 3 servicios, disponibilidad semanal de
muestra y 2 turnos de ejemplo (uno confirmado a futuro y uno completado).

---

## 📜 Scripts

| Script              | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                             |
| `npm run build`     | `prisma generate` + build de producción            |
| `npm run start`     | Servidor de producción (tras `build`)              |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | Chequeo de tipos (tsc)                             |
| `npm run db:migrate`| Crea/aplica migraciones (dev)                      |
| `npm run db:deploy` | Aplica migraciones (prod)                          |
| `npm run db:push`   | Sincroniza el schema sin migraciones               |
| `npm run db:seed`   | Carga datos de ejemplo                             |
| `npm run db:studio` | Prisma Studio (explorador de la DB)                |
| `npm run db:reset`  | Resetea la DB y vuelve a correr el seed            |

---

## 🏗️ Arquitectura

Separación de responsabilidades en capas:

```
src/
├─ app/                      Rutas (App Router)
│  ├─ (auth)/                Login y registro + acciones de auth
│  ├─ (admin)/               Panel admin (/admin/*) + acciones de admin
│  ├─ (patient)/             Portal del paciente (/portal/*) + acciones
│  └─ api/
│     ├─ auth/[...nextauth]/ Handler de Auth.js
│     └─ slots/              Cálculo de horarios disponibles
├─ components/
│  ├─ ui/                    Primitivas shadcn/ui
│  ├─ shared/                Componentes transversales (shell, badges, etc.)
│  └─ features/              Componentes de dominio (SlotPicker, AppointmentCard)
├─ lib/
│  ├─ auth/                  Config y helpers de Auth.js + sesión/roles
│  ├─ validations/          Schemas Zod (compartidos cliente/servidor)
│  ├─ constants.ts          "Enums" de dominio + configuración de negocio
│  ├─ datetime.ts           Utilidades de fecha/hora (timezone-aware)
│  ├─ db.ts                  Cliente Prisma (singleton)
│  ├─ rate-limit.ts          Rate limiting en memoria
│  └─ action-result.ts       Helpers para resultados tipados de acciones
├─ server/
│  ├─ repositories/          Acceso a datos (Prisma), sin lógica de negocio
│  ├─ services/              Lógica de negocio (slots, reservas, reglas)
│  └─ errors.ts              Errores de negocio tipados
└─ types/                    Tipos compartidos + augmentación de next-auth

prisma/
├─ schema.prisma             Modelo de datos
└─ seed.ts                   Datos de ejemplo
```

- **Repositorios**: encapsulan Prisma. Sin reglas de negocio.
- **Servicios**: implementan las reglas (cálculo de slots, validación de
  solapamientos, transiciones de estado, ventanas de antelación).
- **Server Actions / Route Handlers**: orquestadores delgados que validan con
  Zod, verifican autorización y delegan en los servicios.

### Reglas de negocio destacadas

- **Sin solapamientos**: la reserva se hace dentro de una transacción que
  vuelve a verificar conflictos antes de crear el turno.
- **Dentro de disponibilidad y a futuro**: solo se ofrecen y aceptan horarios
  que caen en una franja del profesional y respetan la antelación mínima.
- **Duración derivada del servicio**: el fin del turno se calcula a partir de
  `durationMinutes`.
- **Cancelación**: los pacientes solo pueden cancelar con la antelación mínima
  configurada (`CANCELLATION_MIN_HOURS`); el admin no tiene esa restricción.

---

## 🔐 Seguridad

- Contraseñas hasheadas con **bcrypt** (12 rounds); nunca en texto plano.
- **Autorización por rol** en cada Server Action y Route Handler
  (`assertRole` / `requireRole`) y en el **middleware** (protege `/admin` y
  `/portal` y redirige según rol).
- **Validación con Zod** en toda entrada del servidor (no se confía en el
  cliente).
- **Prisma** parametriza las consultas (previene inyección).
- **Rate limiting** básico en login, registro y reservas.
- Variables sensibles en `.env` (ver `.env.example`).

> El rate limiting es en memoria (suficiente para dev / instancia única). En
> producción serverless conviene usar un store compartido (p. ej. Upstash
> Redis); la firma de `rateLimit()` se mantiene.

---

## 🌐 Zona horaria

La consultoría opera en una zona horaria fija
(`NEXT_PUBLIC_TIMEZONE`, por defecto `America/Argentina/Buenos_Aires`):

- La **disponibilidad** se define en hora local (`HH:mm`).
- Los **turnos** se guardan en **UTC** y se muestran convertidos a la zona
  local de la consultoría.

---

## ⬆️ Migrar a PostgreSQL (producción)

El schema es portable. Para desplegar en **Vercel + Postgres** (Neon, Supabase,
Vercel Postgres, etc.):

1. En `prisma/schema.prisma`, cambiá el provider:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Configurá `DATABASE_URL` con la cadena de conexión Postgres (con
   `sslmode=require` si corresponde) y `AUTH_SECRET` en el entorno del hosting.

3. Aplicá migraciones en el deploy:

   ```bash
   npm run db:deploy
   ```

> **Nota sobre "enums"**: no se usan enums nativos de Prisma porque SQLite no
> los soporta. Los campos `role`, `status` y `dayOfWeek` se modelan como
> columnas escalares y se validan en la aplicación (Zod + tipos). Esto mantiene
> el mismo schema funcionando en SQLite y PostgreSQL.

### Variables de entorno

| Variable                 | Descripción                                           |
| ------------------------ | ----------------------------------------------------- |
| `DATABASE_URL`           | Conexión a la base de datos                           |
| `AUTH_SECRET`            | Secreto para firmar los JWT de sesión                 |
| `AUTH_TRUST_HOST`        | `true` detrás de proxy/hosting                        |
| `NEXT_PUBLIC_TIMEZONE`   | Zona horaria IANA de la consultoría                   |
| `CANCELLATION_MIN_HOURS` | Antelación mínima para cancelar (horas)               |
| `BOOKING_MIN_LEAD_HOURS` | Antelación mínima para reservar (horas)               |
| `SLOT_INTERVAL_MINUTES`  | Granularidad de los slots ofrecidos (minutos)         |
| `SEED_*`                 | Credenciales generadas por el seed                    |

---

## 🎨 UI/UX

- Diseño minimalista y responsive (mobile-first), accesible.
- Paleta serena: neutros (slate) + acento **teal**, con **modo oscuro**.
- Estados de **carga** (skeletons), **vacíos** y **errores** (toasts) cuidados.
- Selector de turnos visual (calendario + grilla de horarios).
