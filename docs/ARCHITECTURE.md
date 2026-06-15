# Arquitectura — Plataforma web para tatuador

La arquitectura propuesta prioriza seguridad de datos, velocidad de entrega y mantenibilidad. La aplicación se construirá con Next.js App Router y TypeScript estricto. La dirección actual es desarrollo local primero, despliegue futuro en Vercel y Firebase como backend administrado futuro para autenticación, datos, archivos privados y reglas de seguridad.

## Decisiones principales

| Área         | Decisión                                           | Motivo                                                                               |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Framework    | Next.js App Router                                 | Server Components, rutas segmentadas, SEO y despliegue moderno.                      |
| Lenguaje     | TypeScript con `strict: true`                      | Reducir errores en dominio sensible: roles, cotizaciones, archivos y agenda.         |
| Backend      | Firebase futuro                                    | Auth, Firestore/Storage y reglas de seguridad administradas.                         |
| Hosting      | Vercel futuro                                      | Flujo natural para Next.js, previews y despliegue serverless.                        |
| Autorización | Firebase Security Rules + validaciones server-side | La seguridad no debe depender solo del frontend.                                     |
| Archivos     | Firebase Storage privado futuro                    | Las imágenes de cotización pueden contener datos personales o referencias sensibles. |
| Localización | `es-CL`, CLP, `America/Santiago`                   | Coherencia para clientes en Chile y reglas de agenda.                                |
| Instagram    | API oficial solamente                              | Evita scraping, bloqueos y riesgos legales.                                          |
| WhatsApp     | Click-to-chat                                      | Contacto simple sin almacenar credenciales ni usar automatización no autorizada.     |

## Estado actual del repositorio

El repositorio inspeccionado está vacío al inicio de esta fase. No existen aún archivos de aplicación, configuración, dependencias, gestor de paquetes ni estructura Next.js creada.

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
Firebase futuro
  - Auth
  - Firestore
  - Storage privado
  - Security Rules
        |
        v
Integraciones externas
  - Instagram official API
  - WhatsApp click-to-chat
  - Vercel
```

## Capas recomendadas en la aplicación

| Capa          | Responsabilidad                                | Ejemplos futuros                                     |
| ------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `app/`        | Rutas, layouts, páginas y handlers de Next.js. | `app/(public)`, `app/(customer)`, `app/admin`.       |
| `components/` | Componentes UI reutilizables.                  | Formularios, cards, calendario, galerías.            |
| `features/`   | Casos de uso por dominio.                      | `quotes`, `calendar`, `products`, `reviews`.         |
| `lib/`        | Clientes compartidos y utilidades.             | Firebase config, fechas, moneda, validaciones.       |
| `server/`     | Lógica server-only.                            | Queries, mutations, permisos, servicios de archivos. |
| `tests/`      | Pruebas unitarias, integración y e2e.          | Reglas Firebase, calendario, flujos de cotización.   |

## Rutas esperadas

| Ruta              | Acceso        | Propósito                                    |
| ----------------- | ------------- | -------------------------------------------- |
| `/`               | Público       | Inicio, propuesta de valor y CTA.            |
| `/portfolio`      | Público       | Galería de trabajos.                         |
| `/quote`          | Cliente       | Solicitud de cotización y carga de imágenes. |
| `/account`        | Cliente       | Estado de solicitudes propias.               |
| `/admin`          | Administrador | Panel principal.                             |
| `/admin/quotes`   | Administrador | Gestión de cotizaciones.                     |
| `/admin/calendar` | Administrador | Gestión de agenda.                           |
| `/admin/products` | Administrador | Catálogo.                                    |
| `/admin/content`  | Administrador | Reseñas, sponsors y comunidad.               |

## Estrategia de datos

- Firebase será la fuente de verdad futura para usuarios, roles, cotizaciones, citas, productos y contenido.
- Las imágenes no deben guardarse como blobs en documentos; se almacenarán en Firebase Storage y se referenciarán por metadata.
- Firebase Security Rules deben diseñarse antes de exponer datos privados para evitar deuda de seguridad.
- La agenda necesita una estrategia transaccional/idempotente para prevenir conflictos bajo concurrencia.

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
