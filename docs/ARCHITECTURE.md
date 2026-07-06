# Arquitectura — Plataforma web para tatuador

La arquitectura prioriza seguridad de datos, velocidad de entrega y mantenibilidad. La aplicación usa Next.js App Router, TypeScript estricto y Firebase como backend oficial para autenticación, datos, archivos y reglas de seguridad. El despliegue objetivo es Vercel; el repositorio aún no declara un despliegue productivo completo.

## Decisiones principales

| Área         | Decisión                                           | Motivo                                                                               |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Framework    | Next.js App Router                                 | Server Components, rutas segmentadas, SEO y despliegue moderno.                      |
| Lenguaje     | TypeScript con `strict: true`                      | Reducir errores en dominio sensible: roles, cotizaciones, archivos y agenda.         |
| Backend      | Firebase                                           | Auth, Firestore/Storage, Admin SDK y reglas de seguridad administradas.              |
| Hosting      | Vercel                                             | Flujo natural para Next.js, previews y despliegue serverless.                        |
| Autorización | Firebase Security Rules + validaciones server-side | La seguridad no debe depender solo del frontend.                                     |
| Archivos     | Firebase Storage con acceso controlado             | Las imágenes de cotización pueden contener datos personales o referencias sensibles. |
| Localización | `es-CL`, CLP, `America/Santiago`                   | Coherencia para clientes en Chile y reglas de agenda.                                |
| Instagram    | API oficial solamente                              | Evita scraping, bloqueos y riesgos legales.                                          |
| WhatsApp     | Click-to-chat                                      | Contacto simple sin almacenar credenciales ni usar automatización no autorizada.     |

## Estado actual del repositorio

| Área      | Estado                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App base  | Implementada con Next.js App Router, TypeScript estricto, Tailwind, npm, ESLint, Prettier, Vitest y build.                                                         |
| Firebase  | Implementado localmente con SDK cliente, Firebase Admin SDK server-only, Auth/Firestore/Storage emulators, `firestore.rules`, `storage.rules` y pruebas de reglas. |
| Público   | Inicio, servicios, portafolio, cotización y contacto existen con copy público en español para Chile.                                                               |
| Admin     | Login local con Firebase Auth Emulator, cookie httpOnly de sesión admin, validación server-side de rol y panel para cotizaciones/portafolio.                       |
| Pendiente | Cuenta cliente, calendario real, Instagram oficial, shop/productos, reseñas, sponsors, comunidad y despliegue productivo.                                          |

## Arquitectura lógica

```text
Usuario público / Cliente / Administrador
        |
        v
Next.js App Router
  - Rutas públicas
  - Rutas autenticadas de cliente
  - Rutas administrativas protegidas
  - Server Actions / Route Handlers
        |
        v
Firebase
  - Auth
  - Firestore
  - Storage con acceso controlado
  - Security Rules
        |
        v
Integraciones externas
  - Instagram official API
  - WhatsApp click-to-chat
  - Vercel
```

## Capas recomendadas en la aplicación

| Capa            | Responsabilidad                                                       | Ejemplos actuales / próximos                                                |
| --------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `app/`          | Rutas, layouts, páginas y route handlers de Next.js.                  | `/`, `/quote`, `/portfolio`, `/servicios`, `/contacto`, `/admin`, `/api/*`. |
| `lib/`          | Dominio, validación, clientes Firebase, SEO y componentes de feature. | `auth`, `quotes`, `portfolio`, `seo`, `contact`, `services`.                |
| Reglas Firebase | Guardrails de Firestore/Storage para acceso directo futuro.           | `firestore.rules`, `storage.rules`, `*.test.ts` de reglas.                  |
| Scripts         | Operación controlada local/server-only.                               | `admin:seed-local`, `admin:assign-first-admin`, `emulators`.                |

## Rutas esperadas

| Ruta              | Acceso        | Propósito                                                |
| ----------------- | ------------- | -------------------------------------------------------- |
| `/`               | Público       | Inicio, propuesta de valor y CTA.                        |
| `/portfolio`      | Público       | Galería de trabajos.                                     |
| `/servicios`      | Público       | Servicios, proceso, higiene, cuidados y FAQ.             |
| `/contacto`       | Público       | Contacto, ubicación por reserva y soporte.               |
| `/quote`          | Público       | Solicitud de cotización; fotos/referencias se envían por WhatsApp con el código creado. |
| `/admin`          | Administrador | Login/status, cotizaciones y portafolio administrable.   |
| `/account`        | Cliente       | Pendiente: estado de solicitudes propias.                |
| `/admin/calendar` | Administrador | Pendiente: gestión de agenda.                            |
| `/admin/products` | Administrador | Pendiente: catálogo.                                     |
| `/admin/content`  | Administrador | Pendiente: reseñas, sponsors y comunidad.                |

## Estrategia de datos

- Firebase es la fuente de verdad oficial para usuarios/roles, cotizaciones, archivos, portafolio administrable y contenido futuro.
- Las imágenes no se guardan como blobs en documentos; se almacenan en Firebase Storage y se referencian por metadata en Firestore.
- Las mutaciones privilegiadas pasan por route handlers server-side con Firebase Admin SDK; como Admin SDK ignora reglas, cada handler debe validar sesión, rol, ownership e input.
- Firestore/Storage Security Rules existen como guardrail para acceso directo futuro y deben mantenerse probadas con emuladores.
- La agenda necesita una estrategia transaccional/idempotente para prevenir conflictos bajo concurrencia.
- El diseño detallado de Auth, Firestore, Storage, reglas y entorno local/Vercel vive en `docs/FIREBASE_ARCHITECTURE.md`.

## Seguridad de rutas

| Área             | Control esperado                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| Páginas públicas | Sin datos privados ni consultas administrativas.                                |
| Área cliente     | Requiere sesión Firebase Auth válida.                                           |
| Panel admin      | Requiere rol `admin` confirmado en base de datos o claims controlados.          |
| Server Actions   | Validan input, sesión, rol y ownership antes de mutar datos.                    |
| Storage privado  | Acceso por reglas de Storage y URLs controladas server-side cuando corresponda. |

## Integraciones

### Instagram

- Usar únicamente API oficial de Meta/Instagram.
- No implementar scraping ni dependencias de DOM externo.
- Diseñar fallback para cargar manualmente imágenes destacadas si la API no está disponible.
- No documentar ni incluir credenciales reales en el repositorio.

### WhatsApp

- Usar enlace click-to-chat con número configurado mediante variable de entorno.
- El enlace puede prellenar un mensaje breve, sin enviar mensajes automáticamente.
- No almacenar tokens ni credenciales de WhatsApp en esta fase.

## Calidad y pruebas

| Tipo de prueba | Objetivo                                                           |
| -------------- | ------------------------------------------------------------------ |
| Unitarias      | Validaciones, formato CLP, reglas de fechas y permisos puros.      |
| Integración    | Operaciones Firebase, reglas de seguridad y mutaciones críticas.   |
| E2E            | Solicitar cotización, login, panel admin, agenda anti-duplicación. |
| Seguridad      | Acceso cruzado entre clientes, archivos privados y roles.          |

## Riesgos técnicos

- Configurar reglas Firebase tarde aumentaría el costo de corrección y riesgo de filtración.
- El calendario requiere diseño cuidadoso de concurrencia; validación solo en frontend no es suficiente.
- La API oficial de Instagram puede requerir revisión de permisos y manejo de expiración de tokens.
- Un panel administrativo demasiado amplio en la primera versión puede retrasar el MVP.
