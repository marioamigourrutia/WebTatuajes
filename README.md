# WebTatuajes

Plataforma web profesional para un estudio de tatuajes en Chile. La aplicación está preparada para Next.js App Router, TypeScript estricto, Tailwind CSS, Firebase como backend futuro, Vercel como hosting futuro y una base inicial de pruebas.

## Estado actual

- Fase 1: documentación base creada en `docs/`.
- Fase 2: base técnica inicial creada y verificada con linting, TypeScript estricto, Vitest y build.
- Fase 3 Supabase queda detenida por cambio de dirección técnica.
- Dirección actual: desarrollo local ahora; futuro despliegue en Vercel y backend en Firebase.
- Hay una base mínima de Firebase Auth para login/logout local cuando se configuren variables públicas reales o de emulador.
- Hay una base server-only inicial con Firebase Admin SDK para validar tokens, leer roles desde `profiles/{uid}` y asignar el primer admin mediante script controlado. Todavía no hay funcionalidades de negocio ni panel admin.

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

| Variable                                   | Uso                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                     | URL pública del sitio.                                                                     |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | API key pública del proyecto Firebase futuro.                                              |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Auth domain público de Firebase.                                                           |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | ID público del proyecto Firebase.                                                          |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Bucket público configurado en Firebase.                                                    |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID público de Firebase.                                                             |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | App ID público de Firebase.                                                                |
| `FIREBASE_SERVICE_ACCOUNT_JSON`            | JSON server-only de Firebase Admin. No usar valores reales en git ni exponer al cliente.   |
| `FIRST_ADMIN_UID`                          | UID objetivo para el script controlado de primer admin. Usar este valor o email, no ambos. |
| `FIRST_ADMIN_EMAIL`                        | Email objetivo para resolver el UID del primer admin. Usar este valor o UID, no ambos.     |
| `FIREBASE_ADMIN_CONFIRM_ASSIGNMENT`        | Debe valer `assign-first-admin` para escribir; vacío ejecuta dry-run.                      |
| `NEXT_PUBLIC_WHATSAPP_PHONE`               | Número para enlace click-to-chat.                                                          |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE`             | Mensaje prellenado de WhatsApp.                                                            |
| `NEXT_PUBLIC_APP_LOCALE`                   | Locale de la app, por defecto `es-CL`.                                                     |
| `NEXT_PUBLIC_APP_TIME_ZONE`                | Zona horaria, por defecto `America/Santiago`.                                              |

## Firebase y Vercel

La app incluye placeholders de configuración Firebase, una primera base local de Firestore/Storage Security Rules con pruebas de emulador, scaffolding mínimo de Firebase Auth cliente y helpers server-only de Firebase Admin. No usa credenciales reales ni conecta un proyecto Firebase de producción por defecto.

Los roles `artist` y `admin` no se asignan desde la UI pública. El primer admin debe crearse mediante consola Firebase o el script server-only con Admin SDK ejecutado en un entorno controlado.

### Asignación controlada del primer admin

El repositorio incluye `npm run admin:assign-first-admin` para preparar la primera cuenta administradora sin abrir una ruta pública ni permitir self-service desde cliente. El script exige `FIREBASE_SERVICE_ACCOUNT_JSON` server-only y exactamente un objetivo: `FIRST_ADMIN_UID` o `FIRST_ADMIN_EMAIL`.

Por defecto corre en dry-run y no escribe cambios:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
FIRST_ADMIN_EMAIL=owner@example.com \
npm run admin:assign-first-admin
```

Para escribir el rol `admin` en `profiles/{uid}` y sincronizar el custom claim, agregá la confirmación explícita:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
FIRST_ADMIN_EMAIL=owner@example.com \
FIREBASE_ADMIN_CONFIRM_ASSIGNMENT=assign-first-admin \
npm run admin:assign-first-admin
```

No ejecutes este script desde rutas públicas, componentes cliente ni máquinas no confiables. El helper server-side valida el ID token y lee el rol desde `profiles/{uid}`; no infiere `artist` o `admin` desde estado cliente.

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

- Probar el script de primer `admin` contra un proyecto Firebase real de prueba o emulador controlado antes de producción.
- Conectar las futuras rutas privadas a los helpers server-side de sesión/rol antes de crear paneles administrativos.
- Conectar Auth Emulator en desarrollo local antes de probar flujos con datos reales.
