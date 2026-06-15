# Datos — Modelo inicial Firebase

Este documento describe el modelo de datos recomendado para la plataforma con Firebase como dirección futura. El diseño prioriza reglas de seguridad, trazabilidad, agenda sin duplicaciones y separación clara entre datos públicos y datos privados.

> Diseño ampliado: ver `docs/FIREBASE_ARCHITECTURE.md` para Auth, roles, Storage, Security Rules, entorno local/Vercel y nota de migración desde Supabase.

## Principios de diseño

| Principio                    | Aplicación                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Reglas desde el inicio       | Toda colección con datos privados debe tener reglas explícitas antes de usarse en producción. |
| Ownership claro              | Los registros de cliente deben relacionarse con el UID de Firebase Auth.                      |
| Archivos fuera de documentos | Las imágenes se almacenan en Firebase Storage privado y se referencian por ruta.              |
| Integridad transaccional     | Transacciones o funciones server-side deben proteger agenda y estados críticos.               |
| Auditoría mínima             | Cambios relevantes de cotización y agenda deben ser trazables.                                |

## Entidades principales

| Colección                       | Propósito                                     | Visibilidad                                     |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| `profiles`                      | Perfil extendido de usuarios autenticados.    | Propio usuario y administradores.               |
| `roles` o campo `profiles.role` | Control de rol `customer`/`artist`/`admin`.   | Lectura restringida.                            |
| `artists`                       | Perfil público y operativo del tatuador.      | Público si está publicado; escritura protegida. |
| `portfolio_items`               | Trabajos publicados del artista.              | Público si está publicado.                      |
| `quotes`                        | Solicitudes de cotización.                    | Dueño, administradores y artista asignado.      |
| `quote_images`                  | Referencias privadas subidas por clientes.    | Dueño, administradores y artista asignado.      |
| `quote_events`                  | Historial de estados y comentarios internos.  | Administradores; cliente solo eventos visibles. |
| `appointments`                  | Citas agendadas.                              | Cliente relacionado, admin y artista asignado.  |
| `availability`                  | Horarios, bloqueos y configuración de agenda. | Lectura parcial pública; escritura protegida.   |
| `contact_leads`                 | Mensajes de contacto sin cuenta.              | Administradores solamente.                      |
| `reviews`                       | Reseñas moderadas.                            | Público si están aprobadas.                     |
| `products`                      | Productos públicos o administrables.          | Público si están activos.                       |
| `sponsors`                      | Marcas colaboradoras.                         | Público si están activos.                       |
| `community_posts`               | Contenido comunitario/editorial.              | Público si está publicado.                      |

## Modelo sugerido por colección

### `profiles`

| Campo        | Tipo sugerido | Notas                                   |
| ------------ | ------------- | --------------------------------------- |
| `id`         | `string`      | UID de Firebase Auth.                   |
| `role`       | `text`        | Validar `customer`, `artist` o `admin`. |
| `full_name`  | `text`        | Opcional según flujo de registro.       |
| `phone`      | `text`        | Opcional; normalizar antes de usar.     |
| `created_at` | `timestamp`   | Timestamp de creación.                  |
| `updated_at` | `timestamp`   | Timestamp de última actualización.      |

### `quotes`

| Campo              | Tipo sugerido | Notas                              |
| ------------------ | ------------- | ---------------------------------- |
| `id`               | `string`      | ID de documento.                   |
| `customer_id`      | `string`      | UID dueño de la solicitud.         |
| `status`           | `text`        | Estados controlados.               |
| `body_area`        | `text`        | Zona del cuerpo.                   |
| `size_description` | `text`        | Tamaño aproximado.                 |
| `style`            | `text`        | Estilo deseado.                    |
| `description`      | `text`        | Descripción del diseño.            |
| `budget_clp`       | `integer`     | Opcional; monto en pesos chilenos. |
| `admin_notes`      | `text`        | Solo administradores.              |
| `created_at`       | `timestamp`   | Timestamp de creación.             |
| `updated_at`       | `timestamp`   | Timestamp de última actualización. |

### `quote_images`

| Campo            | Tipo sugerido | Notas                                       |
| ---------------- | ------------- | ------------------------------------------- |
| `id`             | `string`      | Identificador interno.                      |
| `quote_id`       | `string`      | Hereda ownership por cotización.            |
| `storage_bucket` | `text`        | Bucket privado, por ejemplo `quote-images`. |
| `storage_path`   | `text`        | Ruta privada del archivo.                   |
| `mime_type`      | `text`        | Validar tipos permitidos.                   |
| `size_bytes`     | `integer`     | Validar límite máximo.                      |
| `created_at`     | `timestamp`   | Timestamp de creación.                      |

### `appointments`

| Campo         | Tipo sugerido | Notas                                             |
| ------------- | ------------- | ------------------------------------------------- |
| `id`          | `string`      | Identificador de cita.                            |
| `quote_id`    | `string`      | Opcional si cita nace desde cotización.           |
| `customer_id` | `string`      | UID de cliente asociado.                          |
| `starts_at`   | `timestamp`   | Guardar en UTC; mostrar en `America/Santiago`.    |
| `ends_at`     | `timestamp`   | Debe ser posterior a `starts_at`.                 |
| `status`      | `text`        | `scheduled`, `completed`, `cancelled`, `no_show`. |
| `notes`       | `text`        | Uso administrativo.                               |

### `artists`

| Campo          | Tipo sugerido | Notas                                           |
| -------------- | ------------- | ----------------------------------------------- |
| `id`           | `string`      | ID del artista; puede coincidir con UID futuro. |
| `profile_id`   | `string`      | UID asociado si el artista inicia sesión.       |
| `display_name` | `text`        | Nombre público.                                 |
| `bio`          | `text`        | Biografía pública moderada.                     |
| `styles`       | `array`       | Estilos trabajados.                             |
| `published`    | `boolean`     | Controla visibilidad pública.                   |

### `portfolio_items`

| Campo          | Tipo sugerido | Notas                                |
| -------------- | ------------- | ------------------------------------ |
| `artist_id`    | `string`      | Artista dueño del trabajo.           |
| `title`        | `text`        | Opcional, visible si está publicado. |
| `style`        | `text`        | Estilo principal.                    |
| `body_area`    | `text`        | Zona del cuerpo, sin datos privados. |
| `image_path`   | `text`        | Ruta Storage del archivo publicado.  |
| `published`    | `boolean`     | Requisito para lectura pública.      |
| `published_at` | `timestamp`   | Opcional para orden público.         |

### `availability`

| Campo          | Tipo sugerido | Notas                                     |
| -------------- | ------------- | ----------------------------------------- |
| `artist_id`    | `string`      | ID del artista.                           |
| `time_zone`    | `text`        | Por defecto `America/Santiago`.           |
| `weekly_rules` | `map`         | Bloques semanales disponibles.            |
| `blocked_days` | `array`       | Feriados, vacaciones o bloqueos manuales. |
| `slot_minutes` | `integer`     | Duración base sugerida.                   |

### `contact_leads`

| Campo        | Tipo sugerido | Notas                                    |
| ------------ | ------------- | ---------------------------------------- |
| `name`       | `text`        | Nombre declarado por visitante.          |
| `email`      | `text`        | Opcional si se usa contacto por email.   |
| `phone`      | `text`        | Opcional; normalizar si se usa WhatsApp. |
| `message`    | `text`        | Mensaje del visitante.                   |
| `status`     | `text`        | `new`, `contacted`, `closed`, `spam`.    |
| `created_at` | `timestamp`   | Timestamp de recepción.                  |

## Prevención de duplicación en calendario

La agenda no debe depender solo de validaciones de UI. El backend debe impedir solapamientos de citas activas.

Opciones recomendadas:

1. Usar transacciones de Firestore sobre slots normalizados o documentos de bloqueo por rango, por ejemplo `appointment_locks/{artistId}_{yyyyMMdd}_{slot}`.
2. Complementar con lógica server-side al crear o mover citas.
3. Excluir estados cancelados de los bloqueos activos mediante una estrategia documentada.

## Firebase Storage privado

| Ruta/Bucket base                          | Público                         | Uso                                 |
| ----------------------------------------- | ------------------------------- | ----------------------------------- |
| `quote-images/{customerId}/{quoteId}/...` | No                              | Referencias privadas de clientes.   |
| `portfolio/{artistId}/{itemId}/...`       | Sí o con CDN pública controlada | Trabajos publicados por el artista. |
| `artist-profiles/{artistId}/...`          | Sí si perfil publicado          | Avatar o banner del artista.        |
| `products/{productId}/...`                | Sí                              | Imágenes de productos publicados.   |

Las imágenes privadas deben servirse mediante URLs firmadas de corta duración o acceso server-side validado. No se deben publicar rutas privadas directamente en HTML público.

## Reglas de seguridad mínimas

| Recurso           | Política esperada                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `profiles`        | Cliente lee/actualiza su perfil; admin gestiona perfiles.                                    |
| `quotes`          | Cliente crea y lee sus cotizaciones; admin y artista asignado gestionan atención.            |
| `quote_images`    | Cliente gestiona imágenes de sus cotizaciones; admin y artista asignado pueden leerlas.      |
| `appointments`    | Cliente lee sus citas; admin y artista asignado crean, actualizan o cancelan según permisos. |
| Contenido público | Lectura pública solo si `published`/`active`; escritura solo admin.                          |

El Firebase Admin SDK debe usarse solo desde servidor para operaciones privilegiadas. Como ignora Security Rules, cada handler debe validar sesión, rol, ownership e input antes de escribir.

## Datos locales y formato

- Montos: guardar CLP como enteros, sin decimales.
- Fechas: persistir como timestamps en UTC; presentar en `America/Santiago`.
- Locale de UI: `es-CL`.
- Teléfonos: normalizar a formato internacional cuando se usen para enlaces.

## Riesgos de datos

- Un rol admin mal modelado puede abrir acceso excesivo. Se recomienda centralizar funciones auxiliares de autorización.
- Las URLs firmadas largas aumentan exposición si se comparten accidentalmente.
- Reglas Firebase sin pruebas pueden permitir lecturas cruzadas entre clientes.
