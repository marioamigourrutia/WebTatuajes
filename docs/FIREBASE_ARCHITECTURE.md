# Arquitectura Firebase — Autenticación, datos, archivos y reglas

Este documento define la arquitectura Firebase oficial del repo. Firebase cubre Auth, Firestore, Storage, Admin SDK server-only y Security Rules; Vercel es el hosting objetivo para Next.js. El repo tiene implementación local con emuladores y placeholders, pero no debe afirmar que un proyecto Firebase real o un despliegue productivo ya están conectados.

## Decisiones rápidas

| Área     | Decisión                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | Firebase Auth con email/password o magic link para clientes; admin asignado por proceso controlado, nunca por formulario público.                  |
| Roles    | `customer`, `artist` y `admin`; el MVP puede operar con un solo `artist/admin`, pero el modelo deja espacio para separar artista y administración. |
| Datos    | Firestore separa contenido público publicable de datos privados por ownership.                                                                     |
| Archivos | Storage usa rutas por dominio y dueño; referencias de cotización privadas, portafolio público solo si está publicado.                              |
| Reglas   | Least privilege desde el inicio, validación de shape/tipos y pruebas con emuladores antes de producción.                                           |
| SDK      | Cliente Firebase para Auth y Firebase Admin SDK server-only para validación de sesión/rol, cotizaciones, Storage y primer admin controlado.        |

## Modelo de autenticación y acceso

| Rol        | Quién es                         | Acceso esperado                                                                                         |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `visitor`  | Usuario sin sesión               | Lee solo contenido público publicado: portafolio, servicios, productos activos, sponsors y comunidad.   |
| `customer` | Cliente autenticado              | Crea cotizaciones, sube referencias privadas, lee sus propias cotizaciones/citas y actualiza su perfil. |
| `artist`   | Tatuador o colaborador operativo | Gestiona portafolio propio, disponibilidad y citas asignadas. Puede leer cotizaciones que debe atender. |
| `admin`    | Dueño/equipo autorizado          | Gestiona usuarios, roles, cotizaciones, agenda, contenido público y configuración.                      |

La fuente de verdad del rol debe estar protegida. Para el MVP se recomienda `profiles/{uid}.role` con reglas estrictas y mutaciones server-side; más adelante se pueden usar custom claims para checks rápidos, sincronizados desde un proceso administrativo. El primer admin se crea manualmente desde consola/Firebase Admin SDK o con `npm run admin:assign-first-admin` en un entorno server-only y con confirmación explícita para escribir.

### Estrategia de login

- Clientes: registro/login por email. Magic link reduce fricción; password puede ser más simple para primera implementación.
- Admin/artista: login con email verificado y rol asignado fuera del cliente público.
- Futuro flujo cliente: permitir crear cotización después de login; si se quiere UX sin cuenta previa, guardar `quote_drafts` temporales no sensibles y pedir login antes de subir imágenes privadas.

## Modelo Firestore

| Colección                                            | Documento                            | Visibilidad                                           | Uso                                                            |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| `profiles/{uid}`                                     | Perfil extendido y rol               | Dueño + admin                                         | Nombre, teléfono, rol, flags de estado.                        |
| `artists/{artistId}`                                 | Perfil público/operativo del artista | Público si `published`; escritura admin/artista dueño | Bio, estilos, enlaces, avatar, estado.                         |
| `portfolio_items/{itemId}`                           | Trabajo publicado                    | Público si `published`; escritura admin/artista dueño | Estilo, zona, imagen principal, tags, fecha.                   |
| `quotes/{quoteId}`                                   | Solicitud de cotización              | Cliente dueño + admin/artist asignado                 | Estado, descripción, presupuesto, zona, tamaño, `customer_id`. |
| `quotes/{quoteId}/events/{eventId}`                  | Historial                            | Admin/artist; cliente solo eventos marcados visibles  | Cambios de estado, mensajes internos, auditoría.               |
| `quote_images/{imageId}`                             | Metadata de referencias              | Cliente dueño + admin/artist asignado                 | `quote_id`, `customer_id`, `storage_path`, MIME, tamaño.       |
| `appointments/{appointmentId}`                       | Cita                                 | Cliente relacionado + admin/artist asignado           | UTC start/end, estado, `artist_id`, `quote_id`.                |
| `availability/{artistId}`                            | Configuración de agenda              | Lectura pública parcial; escritura admin/artista      | Horarios, bloqueos, duración base, zona horaria.               |
| `contact_leads/{leadId}`                             | Mensajes/contacto                    | Admin solamente                                       | Consultas públicas sin cuenta, consentimiento y estado.        |
| `reviews`, `products`, `sponsors`, `community_posts` | Contenido administrable              | Público si aprobado/activo/publicado                  | Marketing y contenido público moderado.                        |

Campos compartidos recomendados: `created_at`, `updated_at`, `created_by`, `updated_by`, `status` y flags `published`/`active` cuando corresponda. Montos en CLP se guardan como enteros. Fechas se guardan en UTC y se muestran en `America/Santiago`.

### Agenda y disponibilidad

Firestore no impone constraints relacionales. Para evitar citas duplicadas se debe crear la cita mediante transacción o backend server-side que escriba documentos de bloqueo, por ejemplo `appointment_locks/{artistId}_{yyyyMMdd}_{slot}`. No confiar solo en la UI.

## Modelo Firebase Storage

| Ruta                                           | Acceso                                            | Reglas clave                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quote-images/{customerId}/{quoteId}/{fileId}` | Privado                                           | Escribe dueño si la quote le pertenece, con MIME/tamaño permitido y metadata `customer_id`/`quote_id` consistente; admin/artist asignado puede leer. |
| `portfolio/{artistId}/{itemId}/{fileId}`       | Público solo si metadata Firestore está publicada | Escritura admin/artista dueño; validar MIME/tamaño.                                                                                                  |
| `artist-profiles/{artistId}/{fileId}`          | Público si perfil publicado                       | Avatar/banner del artista.                                                                                                                           |
| `products/{productId}/{fileId}`                | Público si producto activo                        | Escritura admin.                                                                                                                                     |

Las rutas privadas no deben renderizarse como URLs públicas permanentes. Para descargas sensibles, generar URLs de corta duración desde servidor después de validar sesión y permisos. Las subidas privadas de cotización deben enviar metadata de Storage que coincida con la ruta y con el documento `quotes/{quoteId}` para no depender solo del path.

## Estrategia de Security Rules

Principios:

- Denegar por defecto y abrir por caso explícito.
- Validar `request.auth != null` para datos privados.
- Comparar ownership con campos inmutables como `customer_id` y `created_by`.
- Impedir que clientes escriban `role`, `admin_notes`, `artist_id` asignado o cambios de estado no permitidos.
- Validar tipos, campos permitidos, tamaños máximos y transiciones de estado.
- Rechazar `list/query` en colecciones privadas o admin-only salvo que exista un caso público explícito.
- Probar reglas con Firebase Emulator Suite antes de conectar datos reales.

Las operaciones con privilegios —asignar roles, responder cotizaciones, crear URLs firmadas, limpiar archivos huérfanos o resolver conflictos de agenda— deben pasar por servidor con Firebase Admin SDK. El Admin SDK ignora Security Rules: por eso cada handler/server action debe validar sesión, rol, ownership e input antes de ejecutar. Los helpers server-side validan ID tokens y leen `profiles/{uid}.role`; los custom claims no reemplazan esa fuente de verdad.

## Desarrollo local y Vercel

Estado actual:

| Área          | Estado                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| Configuración | `.env.example` contiene placeholders seguros; `.env.local` queda fuera de git.            |
| Emuladores    | `npm run emulators` levanta Auth, Firestore y Storage para desarrollo local.              |
| Admin SDK     | Inicializa solo con credenciales server-only válidas o emuladores; rechaza placeholders.  |
| Rules         | `firestore.rules` y `storage.rules` existen y se prueban con Firebase Emulator Suite.     |
| Vercel        | Es target de hosting; falta configurar variables reales, dominio y despliegue productivo. |

Para desarrollo local:

1. Crear `.env.local` desde `.env.example`.
2. Usar Firebase Emulator Suite para Auth/Firestore/Storage.
3. Mantener credenciales reales fuera de git.
4. Ejecutar pruebas de reglas antes de habilitar o modificar flujos privados.

En Vercel se deben configurar las mismas `NEXT_PUBLIC_FIREBASE_*` para cliente y `FIREBASE_SERVICE_ACCOUNT_JSON` solo como variable server-side. No exponer service accounts en código, logs, bundles cliente ni documentación pública. El helper Admin no inicializa Firebase si `FIREBASE_SERVICE_ACCOUNT_JSON` falta, es `{}` o contiene placeholders.

## Nota de alineación: Supabase/PostgreSQL/RLS → Firebase

La referencia a Supabase fue retirada intencionalmente. La dirección aprobada es Firebase + Vercel. No se debe reintroducir Supabase/PostgreSQL/RLS salvo decisión explícita nueva.

| Concepto de checklist externo | Equivalente aprobado                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| PostgreSQL schema/tables      | Colecciones Firestore y documentos por dominio.                             |
| RLS policies                  | Firestore Security Rules, Storage Rules y validación server-side.           |
| DB constraints/transactions   | Transacciones Firestore, documentos de lock y route handlers con Admin SDK. |
| Private object storage        | Firebase Storage con rutas por dominio, metadata y serving controlado.      |
| Service role                  | Firebase Admin SDK server-only, nunca expuesto al cliente.                  |

## Próximo paso

Mantener reglas y pruebas de emulador actualizadas con cada slice. Para el próximo slice grande, resolver calendario con transacciones/locks o cuenta cliente antes de agregar más contenido avanzado.
