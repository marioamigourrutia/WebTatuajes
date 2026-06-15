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
| Validación     | Limitar tamaño, tipo MIME y cantidad de archivos por solicitud.      |
| Acceso         | Generar URLs firmadas desde servidor después de validar permisos.    |
| Limpieza       | Borrar archivos huérfanos cuando se elimina una cotización.          |
| Logs           | No registrar URLs firmadas completas ni rutas privadas innecesarias. |

Rutas esperadas:

- `quote-images/{customerId}/{quoteId}/{fileId}`: privado; dueño, admin o artista asignado.
- `portfolio/{artistId}/{itemId}/{fileId}`: público solo si el item asociado está publicado.
- `artist-profiles/{artistId}/{fileId}` y `products/{productId}/{fileId}`: públicos solo para recursos publicados/activos.

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

- [ ] Cliente A no puede leer cotizaciones de Cliente B.
- [ ] Cliente A no puede obtener imágenes privadas de Cliente B.
- [ ] Usuario anónimo no puede acceder a rutas cliente/admin.
- [ ] Cliente no puede modificar su rol.
- [ ] Cliente no puede asignarse como artista o administrador.
- [ ] Cliente no puede escribir notas administrativas.
- [ ] Admin puede gestionar cotizaciones con sesión válida.
- [ ] Dos citas solapadas no pueden crearse simultáneamente.

## Riesgos abiertos

- Definir cómo se asigna el primer usuario administrador sin abrir una puerta pública.
- Definir retención de imágenes privadas y eliminación a solicitud del cliente.
- Definir política de backups y recuperación ante errores humanos.
