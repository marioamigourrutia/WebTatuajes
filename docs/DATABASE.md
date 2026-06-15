# Datos — Modelo inicial Firebase

Este documento describe el modelo de datos recomendado para la plataforma con Firebase como dirección futura. El diseño prioriza reglas de seguridad, trazabilidad, agenda sin duplicaciones y separación clara entre datos públicos y datos privados.

## Principios de diseño

| Principio                    | Aplicación                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Reglas desde el inicio       | Toda colección con datos privados debe tener reglas explícitas antes de usarse en producción. |
| Ownership claro              | Los registros de cliente deben relacionarse con el UID de Firebase Auth.                      |
| Archivos fuera de documentos | Las imágenes se almacenan en Firebase Storage privado y se referencian por ruta.              |
| Integridad transaccional     | Transacciones o funciones server-side deben proteger agenda y estados críticos.               |
| Auditoría mínima             | Cambios relevantes de cotización y agenda deben ser trazables.                                |

## Entidades principales

| Colección                       | Propósito                                    | Visibilidad                                     |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| `profiles`                      | Perfil extendido de usuarios autenticados.   | Propio usuario y administradores.               |
| `roles` o campo `profiles.role` | Control de rol `customer`/`admin`.           | Lectura restringida.                            |
| `quotes`                        | Solicitudes de cotización.                   | Dueño y administradores.                        |
| `quote_images`                  | Referencias privadas subidas por clientes.   | Dueño y administradores.                        |
| `quote_events`                  | Historial de estados y comentarios internos. | Administradores; cliente solo eventos visibles. |
| `appointments`                  | Citas agendadas.                             | Cliente relacionado y administradores.          |
| `portfolio_items`               | Trabajos públicos del tatuador.              | Público si está publicado.                      |
| `reviews`                       | Reseñas moderadas.                           | Público si están aprobadas.                     |
| `products`                      | Productos públicos o administrables.         | Público si están activos.                       |
| `sponsors`                      | Marcas colaboradoras.                        | Público si están activos.                       |
| `community_posts`               | Contenido comunitario/editorial.             | Público si está publicado.                      |

## Modelo sugerido por colección

### `profiles`

| Campo        | Tipo sugerido | Notas                               |
| ------------ | ------------- | ----------------------------------- |
| `id`         | `string`      | UID de Firebase Auth.               |
| `role`       | `text`        | Validar `customer` o `admin`.       |
| `full_name`  | `text`        | Opcional según flujo de registro.   |
| `phone`      | `text`        | Opcional; normalizar antes de usar. |
| `created_at` | `timestamp`   | Timestamp de creación.              |
| `updated_at` | `timestamp`   | Timestamp de última actualización.  |

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

## Prevención de duplicación en calendario

La agenda no debe depender solo de validaciones de UI. El backend debe impedir solapamientos de citas activas.

Opciones recomendadas:

1. Usar transacciones de Firestore sobre slots normalizados o documentos de bloqueo por rango.
2. Complementar con lógica server-side al crear o mover citas.
3. Excluir estados cancelados de los bloqueos activos mediante una estrategia documentada.

## Firebase Storage privado

| Bucket         | Público                         | Uso                                 |
| -------------- | ------------------------------- | ----------------------------------- |
| `quote-images` | No                              | Referencias privadas de clientes.   |
| `portfolio`    | Sí o con CDN pública controlada | Trabajos publicados por el artista. |
| `products`     | Sí                              | Imágenes de productos publicados.   |

Las imágenes privadas deben servirse mediante URLs firmadas de corta duración o acceso server-side validado. No se deben publicar rutas privadas directamente en HTML público.

## Reglas de seguridad mínimas

| Recurso           | Política esperada                                                   |
| ----------------- | ------------------------------------------------------------------- |
| `profiles`        | Cliente lee/actualiza su perfil; admin gestiona perfiles.           |
| `quotes`          | Cliente crea y lee sus cotizaciones; admin lee y actualiza todas.   |
| `quote_images`    | Cliente gestiona imágenes de sus cotizaciones; admin puede leerlas. |
| `appointments`    | Cliente lee sus citas; admin crea, actualiza y cancela.             |
| Contenido público | Lectura pública solo si `published`/`active`; escritura solo admin. |

## Datos locales y formato

- Montos: guardar CLP como enteros, sin decimales.
- Fechas: persistir como timestamps en UTC; presentar en `America/Santiago`.
- Locale de UI: `es-CL`.
- Teléfonos: normalizar a formato internacional cuando se usen para enlaces.

## Riesgos de datos

- Un rol admin mal modelado puede abrir acceso excesivo. Se recomienda centralizar funciones auxiliares de autorización.
- Las URLs firmadas largas aumentan exposición si se comparten accidentalmente.
- Reglas Firebase sin pruebas pueden permitir lecturas cruzadas entre clientes.
