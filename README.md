# Kiné · Turnos por cupos para kinesiología

Aplicación web full-stack para gestionar turnos de un estudio de kinesiología
con un modelo de **cupos por franja horaria**: el día se divide en bloques de 1
hora (08:00–21:00) con capacidad configurable; los pacientes reservan un cupo y
la disponibilidad baja **en vivo**.

Construida con **Next.js 15 (App Router)**, **TypeScript estricto**, **Prisma**,
**Auth.js v5**, **Tailwind CSS** + **shadcn/ui**, y **Supabase (PostgreSQL +
Realtime)** con **funciones atómicas** para la reserva.

---

## ✨ Funcionalidades

### Paciente
- Registro e inicio de sesión.
- **Reserva** en pasos: elegir día → ver franjas 08–21 con **cupos restantes**
  (estados disponible / pocos cupos ≤3 / sin cupos / cerrada) → confirmar.
- **Cupos en vivo** (Supabase Realtime): el contador baja sin recargar.
- **Mis turnos**: próximos e historial, con cancelación (antelación mínima
  configurable) que libera el cupo.

### Admin
- **Plantillas**: día + ventana horaria + capacidad por bloque.
- **Generar/actualizar agenda**: materializa las franjas de los próximos 30 días
  desde las plantillas activas (sin duplicar).
- **Agenda por día**: ocupación de cada franja, lista de inscriptos, cancelar
  una reserva y abrir/cerrar (bloquear) una franja.

---

## 🧱 Modelo de datos y concurrencia

Tablas (en Supabase): `professionals`, `slot_templates`, `slots`, `bookings`, y
la tabla `User` (autenticación). La reserva y la cancelación se hacen **siempre**
con las funciones atómicas de Postgres, nunca leyendo-y-escribiendo desde la app:

- `book_slot(p_slot_id uuid, p_user_id text, p_notes text)`
- `cancel_booking(p_booking_id uuid, p_user_id text)`

Esto evita sobre-reservas ante clics concurrentes. La app las invoca con
`prisma.$queryRaw` (compatible con el pooler de transacción `pgbouncer=true`, sin
prepared statements persistentes) y traduce los errores de negocio
(`SLOT_FULL`, `ALREADY_BOOKED`, `SLOT_NOT_FOUND`, `SLOT_BLOCKED`,
`BOOKING_NOT_FOUND`, `FORBIDDEN`) a mensajes claros en español.

> `bookings.user_id` (text) guarda el `User.id` (cuid) de la cuenta autenticada,
> sin clave foránea a nivel de base.

---

## 🚀 Puesta en marcha

### Requisitos
- **Node.js ≥ 20**
- Un proyecto de **Supabase** con las tablas y funciones de cupos ya creadas, y
  las variables de conexión.

### Pasos

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
#   - DATABASE_URL: pooler de transacción (6543, pgbouncer=true)
#   - DIRECT_URL: pooler de sesión (5432)
#   - AUTH_SECRET: openssl rand -base64 32
#   - (opcional) NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (Realtime)

# 3. Sincronizar el schema de Prisma con la base (crea la tabla User)
npx prisma db push

# 4. Datos demo (admin, paciente, profesional, plantillas y franjas 30 días)
npm run db:seed

# 5. Verificar conexión
npm run db:check

# 6. Desarrollo
npm run dev
```

La app queda en **http://localhost:3000**.

### Credenciales de prueba

| Rol      | Email                     | Contraseña     |
| -------- | ------------------------- | -------------- |
| Admin    | `admin@kinesio.local`     | `Admin123!`    |
| Paciente | `paciente@kinesio.local`  | `Paciente123!` |

---

## 🔴 Realtime (cupos en vivo) — opcional

1. Completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase
   → Settings → API).
2. En el **SQL Editor** de Supabase, habilitá Realtime y una policy de lectura
   para que el navegador (rol `anon`/`authenticated`) pueda recibir cambios de
   `slots`:

```sql
-- Publicar la tabla en el canal de Realtime
alter publication supabase_realtime add table public.slots;

-- Permitir solo LECTURA de slots desde el cliente (no expone bookings)
create policy "slots_select_public"
  on public.slots for select
  to anon, authenticated
  using (true);
```

> El runtime del servidor conecta como rol `postgres` (bypassa RLS), así que las
> lecturas/escrituras de la app no dependen de policies. La policy de arriba es
> solo para el Realtime del navegador.

Si no configurás esto, la app funciona igual: los cupos se refrescan con la
navegación normal en lugar de en vivo.

---

## 🔔 Eventos / Webhook (n8n)

Al **confirmarse una reserva**, la app emite el evento `appointment.confirmed`
vía webhook firmado. **La app no manda mails**: solo emite el evento; n8n (u
otro consumidor) se encarga del correo. Es _fire-and-forget_ (se ejecuta con
`after()`, después de responderle al socio) y su fallo **nunca** rompe la
reserva.

Variables (`.env`):

```bash
N8N_WEBHOOK_URL="https://n8n.myinfo.la/webhook/apex-turno"
WEBHOOK_SECRET="<secreto-compartido-con-n8n>"
```

La request es un `POST` con:

- `Content-Type: application/json`
- `X-Signature`: HMAC-SHA256 del body crudo usando `WEBHOOK_SECRET` (hex).
- `X-Idempotency-Key`: `${bookingId}:appointment.confirmed` (para deduplicar).

Body:

```json
{
  "event": "appointment.confirmed",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "data": {
    "booking": { "id": "...", "date": "2026-01-01", "startTime": "08:00", "endTime": "09:00" },
    "service": "entrenamiento",
    "patient": { "name": "...", "email": "..." }
  }
}
```

### Probarlo en local

1. Apuntá `N8N_WEBHOOK_URL` a un endpoint de prueba, por ejemplo
   [webhook.site](https://webhook.site) (copiá tu URL única) o un nodo
   **Webhook** de n8n en modo _test_.
2. Poné cualquier `WEBHOOK_SECRET`.
3. Reservá un turno como socio: en webhook.site vas a ver el `POST` con los
   headers `X-Signature` / `X-Idempotency-Key` y el body de arriba.
4. Para verificar la firma en n8n: recalculá `HMAC-SHA256(body, WEBHOOK_SECRET)`
   y comparalo con `X-Signature`.

> Si `N8N_WEBHOOK_URL` no está seteada, el evento se omite (se loguea) y la
> reserva funciona igual.

---

## 📜 Scripts

| Script              | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                       |
| `npm run build`     | `prisma generate` + build de producción      |
| `npm run start`     | Servidor de producción                       |
| `npm run lint`      | ESLint                                       |
| `npm run typecheck` | Chequeo de tipos                             |
| `npm run db:push`   | Sincroniza el schema con la base             |
| `npm run db:seed`   | Carga datos demo                             |
| `npm run db:check`  | Verifica conexión y lista las tablas         |
| `npm run db:studio` | Prisma Studio                                |

---

## 🏗️ Arquitectura

```
src/
├─ app/
│  ├─ (auth)/        login, registro
│  ├─ (admin)/       /admin (dashboard, agenda, plantillas) + acciones
│  ├─ (patient)/     /portal (inicio, reservar, mis turnos, perfil) + acciones
│  └─ api/slots/     franjas de un día (JSON)
├─ components/  ui/ (shadcn) · shared/ · features/ (SlotGrid, BookingCard)
├─ lib/
│  ├─ auth/          Auth.js + sesión/roles
│  ├─ hooks/         useRealtimeSlots
│  ├─ supabase/      cliente de Realtime (navegador)
│  ├─ validations/   Zod (booking, slot-template, auth)
│  ├─ booking-config.ts   defaults del modelo de cupos
│  ├─ datetime.ts    utilidades TZ-aware (date-fns)
│  └─ db.ts          cliente Prisma (singleton)
└─ server/
   ├─ repositories/  acceso a datos (Prisma)
   └─ services/      lógica de negocio
        booking.service.ts    book/cancel atómicos + reads
        slot.service.ts       días disponibles, franjas, vista admin
        slot-template.service.ts  ABM de plantillas
        generation.service.ts materialización de franjas
```

- **Capa de servicios**: reglas de negocio; la reserva/cancelación delega en las
  funciones atómicas de Postgres.
- **Server Actions / Route Handlers**: validan con Zod, verifican rol y delegan
  en los servicios.

### Configuración del negocio (demo)

Centralizada en `src/lib/booking-config.ts` (sobreescribible por `.env`):
capacidad 20, jornada 08:00–21:00, bloques de 60 min, "pocos cupos" ≤ 3,
horizonte de generación 30 días.

---

## 🔐 Seguridad
- Contraseñas con **bcrypt**; autorización por rol en acciones y middleware.
- **Zod** en toda entrada del servidor; Prisma parametriza las consultas.
- Reserva concurrente a prueba de sobre-cupos vía funciones atómicas.
- Rate limiting en login, registro y reservas.
- Nunca se exponen errores crudos de Postgres al usuario.

---

## 🌐 Zona horaria
El estudio opera en `NEXT_PUBLIC_TIMEZONE` (por defecto
`America/Argentina/Buenos_Aires`). Las franjas (`date` + `time`) se interpretan
en esa zona para los cálculos de "futuro" y la ventana de cancelación.
