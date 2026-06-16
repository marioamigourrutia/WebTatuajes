# WebTatuajes

Plataforma web profesional para un estudio de tatuajes en Chile. La aplicación está preparada para Next.js App Router, TypeScript estricto, Tailwind CSS, Firebase como backend futuro, Vercel como hosting futuro y una base inicial de pruebas.

## Estado actual

- Fase 1: documentación base creada en `docs/`.
- Fase 2: base técnica inicial creada y verificada con linting, TypeScript estricto, Vitest y build.
- Fase 3 Supabase queda detenida por cambio de dirección técnica.
- Dirección actual: desarrollo local ahora; futuro despliegue en Vercel y backend en Firebase.
- Hay una base mínima de Firebase Auth para login/logout local cuando se configuren variables públicas reales o de emulador. Todavía no hay funcionalidades de negocio ni panel admin.

## Requisitos

- Node.js 20.11 o superior.
- npm 10 o superior.
- Java Runtime Environment para Firebase Emulator Suite.

## Configuración local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Los valores de `.env.example` son placeholders. No agregues credenciales reales al repositorio.

Para probar el login localmente, completá las variables `NEXT_PUBLIC_FIREBASE_*` en `.env.local` con un proyecto Firebase de prueba. Con placeholders, la app no inicializa Firebase y muestra un estado seguro de configuración pendiente. La conexión explícita al Auth Emulator queda como siguiente paso.

## Scripts

```bash
npm run dev        # desarrollo local
npm run build      # build de producción
npm run start      # servir build de producción
npm run lint       # ESLint
npm run typecheck  # TypeScript estricto
npm run test       # Vitest
npm run test:rules # pruebas locales de Firebase Security Rules con emuladores
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

La app incluye placeholders de configuración Firebase, una primera base local de Firestore/Storage Security Rules con pruebas de emulador y scaffolding mínimo de Firebase Auth cliente. No usa credenciales reales ni conecta un proyecto Firebase de producción por defecto.

Los roles `artist` y `admin` no se asignan desde la UI pública. El primer admin debe crearse mediante consola Firebase o un proceso server-only con Admin SDK ejecutado en un entorno controlado.

Para probar reglas localmente:

```bash
npm install
npm run test:rules
```

El comando levanta Firestore y Storage mediante Firebase Emulator Suite con el proyecto demo `demo-webtatuajes`. Requiere Java disponible en el sistema.

El hosting objetivo futuro es Vercel. No hay configuración de despliegue real en esta fase.

## Documentación de arquitectura

- `docs/FIREBASE_ARCHITECTURE.md`: Auth, roles, Firestore, Storage, Security Rules, entorno local/Vercel y nota de migración desde Supabase.
- `docs/ARCHITECTURE.md`: arquitectura general de Next.js + Firebase futuro.
- `docs/DATABASE.md`: modelo de datos inicial.
- `docs/SECURITY.md`: amenazas, reglas mínimas y controles de seguridad.

## Próximos pasos recomendados

- Definir el proceso controlado para crear el primer `admin` sin formulario público.
- Agregar validación server-side de sesión/rol antes de crear rutas privadas o paneles administrativos.
- Conectar Auth Emulator en desarrollo local antes de probar flujos con datos reales.
