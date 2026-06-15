# WebTatuajes

Plataforma web profesional para un estudio de tatuajes en Chile. La aplicación está preparada para Next.js App Router, TypeScript estricto, Tailwind CSS, Firebase como backend futuro, Vercel como hosting futuro y una base inicial de pruebas.

## Estado actual

- Fase 1: documentación base creada en `docs/`.
- Fase 2: base técnica inicial creada y verificada con linting, TypeScript estricto, Vitest y build.
- Fase 3 Supabase queda detenida por cambio de dirección técnica.
- Dirección actual: desarrollo local ahora; futuro despliegue en Vercel y backend en Firebase.
- Todavía no hay funcionalidades de negocio ni conexión a un proyecto Firebase real.

## Requisitos

- Node.js 20.11 o superior.
- npm 10 o superior.

## Configuración local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Los valores de `.env.example` son placeholders. No agregues credenciales reales al repositorio.

## Scripts

```bash
npm run dev        # desarrollo local
npm run build      # build de producción
npm run start      # servir build de producción
npm run lint       # ESLint
npm run typecheck  # TypeScript estricto
npm run test       # Vitest
```

## Variables de entorno

| Variable                                   | Uso                                                 |
| ------------------------------------------ | --------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                     | URL pública del sitio.                              |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | API key pública del proyecto Firebase futuro.       |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Auth domain público de Firebase.                    |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | ID público del proyecto Firebase.                   |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Bucket público configurado en Firebase.             |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID público de Firebase.                      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | App ID público de Firebase.                         |
| `FIREBASE_SERVICE_ACCOUNT_JSON`            | Placeholder server-only para Firebase Admin futuro. |
| `NEXT_PUBLIC_WHATSAPP_PHONE`               | Número para enlace click-to-chat.                   |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE`             | Mensaje prellenado de WhatsApp.                     |
| `NEXT_PUBLIC_APP_LOCALE`                   | Locale de la app, por defecto `es-CL`.              |
| `NEXT_PUBLIC_APP_TIME_ZONE`                | Zona horaria, por defecto `America/Santiago`.       |

## Firebase y Vercel

La app solo incluye placeholders de configuración Firebase. No crea clientes Firebase ni usa credenciales reales todavía. Esto mantiene la base local, compilable y lista para conectar Firebase cuando se diseñen autenticación, Firestore/Storage y reglas de seguridad.

El hosting objetivo futuro es Vercel. No hay configuración de despliegue real en esta fase.
