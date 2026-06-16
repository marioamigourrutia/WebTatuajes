# Seguridad — Plataforma web para tatuador

La plataforma manejará datos personales, solicitudes privadas e imágenes de referencia. La seguridad debe diseñarse antes de conectar Firebase real y no agregarse al final.

## Decisiones de seguridad

| Área              | Decisión                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Autenticación     | Firebase Auth futuro.                                                                     |
| Autorización      | Roles `customer`, `artist` y `admin` respaldados por datos server-side y reglas Firebase. |
| Archivos privados | Firebase Storage privado futuro para imágenes de cotización.                              |
| Datos sensibles   | Nunca exponer datos privados en páginas públicas, metadata SEO ni logs.                   |
| Integraciones     | Solo API oficial de Instagram; WhatsApp click-to-chat sin automatización no autorizada.   |
| Secretos          | Variables de entorno; ningún secreto real en repositorio.                                 |

## Modelo de amenazas

| Amenaza                                     | Riesgo     | Control requerido                                                           |
| ------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| Cliente accede a cotización de otro cliente | Alto       | Reglas por `customer_id`, pruebas de acceso cruzado.                        |
| Exposición de imágenes privadas             | Alto       | Bucket privado, rutas no públicas, URLs firmadas de corta duración.         |
| Usuario manipula rol desde frontend         | Alto       | Roles verificados server-side y en reglas, nunca confiar en estado cliente. |
| Duplicación de citas por concurrencia       | Medio/Alto | Restricción en base de datos y transacciones.                               |
| Scraping o uso indebido de Instagram        | Medio      | API oficial, manejo de permisos y fallback.                                 |
| Secretos filtrados                          | Alto       | `.env.local` fuera de git, rotación y configuración por entorno.            |

## Autenticación y sesiones

- Usar Firebase Auth con una estrategia compatible con Next.js App Router.
- Proteger rutas cliente y admin mediante validación en servidor.
- No depender de componentes cliente para ocultar información sensible.
- Revalidar permisos en cada mutación server-side.

## Autorización por roles

| Rol        | Permisos esperados                                                                           |
| ---------- | -------------------------------------------------------------------------------------------- |
| `customer` | Gestionar sus cotizaciones, imágenes y citas propias según estado permitido.                 |
| `artist`   | Gestionar portafolio propio, disponibilidad y citas/cotizaciones asignadas.                  |
| `admin`    | Gestionar cotizaciones, agenda, contenido público, productos, reseñas, sponsors y comunidad. |

El rol administrativo debe ser asignado por proceso controlado. No debe existir un formulario público para convertirse en administrador o artista. El primer admin debe crearse manualmente desde consola/Firebase Admin SDK o script server-only ejecutado una vez.

La base de Auth inicial solo habilita login/logout cliente. La UI no permite elegir ni elevar roles. Cualquier asignación futura de `artist` o `admin` debe ejecutarse desde un entorno server-only con Firebase Admin SDK, validación explícita del operador y sin exponer `FIREBASE_SERVICE_ACCOUNT_JSON` al cliente.

## Reglas Firebase obligatorias

Checklist mínimo por colección privada:

- [ ] Reglas habilitadas y revisadas.
- [ ] Política de lectura para dueño del recurso.
- [ ] Política de escritura con ownership validado.
- [ ] Política de administración restringida al rol `admin`.
- [ ] Validación de campos permitidos, tipos, límites y transiciones de estado.
- [ ] Pruebas que demuestren que un cliente no puede leer datos de otro.
- [ ] Pruebas que demuestren que una sesión anónima no puede leer datos privados.

## Seguridad de Firebase Storage

| Control        | Requisito                                                            |
| -------------- | -------------------------------------------------------------------- |
| Bucket privado | `quote-images` no debe ser público.                                  |
| Validación     | Limitar tamaño, tipo MIME permitido y metadata esperada por ruta.    |
| Acceso         | Generar URLs firmadas desde servidor después de validar permisos.    |
| Limpieza       | Borrar archivos huérfanos cuando se elimina una cotización.          |
| Logs           | No registrar URLs firmadas completas ni rutas privadas innecesarias. |

Rutas esperadas:

- `quote-images/{customerId}/{quoteId}/{fileId}`: privado; dueño, admin o artista asignado.
- `portfolio/{artistId}/{itemId}/{fileId}`: público solo si el item asociado está publicado; escritura solo admin o artista dueño validado contra `portfolio_items`.
- `artist-profiles/{artistId}/{fileId}`: público solo si el perfil está publicado; escritura solo admin o artista dueño validado contra `artists`.
- `products/{productId}/{fileId}`: público solo para productos activos; escritura admin.

Las subidas a `quote-images` deben incluir metadata de Storage con `customer_id` y `quote_id` que coincidan con la ruta y con la cotización en Firestore. Las reglas aceptan solo `image/jpeg`, `image/png`, `image/webp` o `image/gif`, con tamaño máximo de 10 MB.

## Firebase Admin SDK

El Admin SDK ignora Firestore y Storage Security Rules. Debe quedar limitado a server actions, route handlers o jobs server-only para asignar roles, emitir URLs firmadas, limpiar archivos huérfanos y resolver operaciones transaccionales de agenda. Cada uso debe validar sesión, rol, ownership e input antes de ejecutar la operación privilegiada.

## Validación de entradas

- Validar formularios en cliente para UX y en servidor para seguridad.
- Normalizar montos CLP como enteros.
- Validar rangos de fecha y duración de citas.
- Sanitizar contenido administrable antes de renderizar si acepta texto enriquecido.
- Rechazar archivos con MIME no permitido aunque la extensión parezca válida.

## Secretos y configuración

No se deben commitear valores reales de:

- Configuración y secretos de Firebase.
- Tokens de Instagram/Meta.
- Números privados si no son parte del contenido público aprobado.
- Configuración de despliegue sensible.

Se recomienda documentar variables esperadas en un archivo de ejemplo sin valores reales cuando se cree la aplicación.

En Vercel, `NEXT_PUBLIC_FIREBASE_*` puede configurarse como variables públicas del cliente. `FIREBASE_SERVICE_ACCOUNT_JSON` debe ser server-only y nunca debe aparecer en bundles cliente, logs ni documentación con valores reales.

## Migración Supabase → Firebase

Supabase fue reemplazado intencionalmente por Firebase como dirección backend. No se deben reintroducir clientes, variables ni documentación Supabase salvo una decisión explícita nueva. La arquitectura de seguridad debe basarse en Firebase Auth, Firestore, Storage y Security Rules.

## Integraciones externas

### Instagram

- Usar API oficial y scopes mínimos necesarios.
- Manejar expiración de tokens y errores de rate limit.
- No usar scraping, automatizaciones de navegador ni endpoints no documentados.
- Preparar fallback de contenido manual si la integración no está aprobada o disponible.

### WhatsApp

- Implementar enlace click-to-chat con mensaje prellenado opcional.
- No enviar mensajes automáticos desde la aplicación en esta fase.
- No almacenar tokens de WhatsApp Business si no se implementa una integración oficial.

## Pruebas de seguridad requeridas

- [x] Cliente A no puede leer cotizaciones de Cliente B.
- [x] Cliente A no puede obtener imágenes privadas de Cliente B.
- [x] Usuario anónimo no puede acceder a datos privados.
- [x] Cliente no puede modificar su rol.
- [x] Cliente no puede asignarse como artista o administrador.
- [x] Cliente no puede crear ni publicar perfiles de artista o items de portafolio.
- [x] Cliente no puede escribir notas administrativas.
- [x] Admin puede gestionar cotizaciones con sesión válida.
- [x] Payloads malformados de cotizaciones, imágenes y contact leads son rechazados.
- [x] Las colecciones privadas y admin-only rechazan list/query desde usuarios no autorizados.
- [x] Storage rechaza MIME no permitido, archivos de más de 10 MB y metadata de quote inconsistente.
- [x] Storage rechaza subidas de clientes a rutas de perfiles de artista y portafolio.
- [x] Artista/admin pueden crear contenido público y subir assets por rutas legítimas.
- [ ] Dos citas solapadas no pueden crearse simultáneamente.

## Riesgos abiertos

- Definir cómo se asigna el primer usuario administrador sin abrir una puerta pública.
- Definir retención de imágenes privadas y eliminación a solicitud del cliente.
- Definir política de backups y recuperación ante errores humanos.
