# Plan de implementación — Plataforma web para tatuador

Este plan organiza la construcción en fases verificables y refleja el estado real del repositorio en la rama `feat/admin-portfolio`. Firebase es la dirección backend oficial; las referencias anteriores a Supabase/PostgreSQL/RLS no son autoridad para este repo.

## Estado actual verificado

| Área           | Estado               | Nota                                                                                                                  |
| -------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Stack          | Implementado         | Next.js App Router, TypeScript estricto, Tailwind, npm, ESLint, Prettier, Vitest y build.                             |
| Firebase local | Implementado/Parcial | SDK cliente, Admin SDK server-only, Auth/Firestore/Storage emulators, rules y tests; falta conectar proyecto real.    |
| Público        | Implementado/Parcial | Inicio, servicios, portafolio, cotización y contacto existen; faltan reseñas, shop, sponsors, comunidad e Instagram.  |
| Admin          | Implementado/Parcial | Login local/admin session, cotizaciones y portafolio administrable; falta calendario, productos y contenido avanzado. |
| Despliegue     | Pendiente            | Vercel es target, pero no hay despliegue productivo declarado ni credenciales reales en repo.                         |

## Traducción de requisitos Supabase/PostgreSQL/RLS a Firebase

| Requisito anterior | Equivalente Firebase en este repo                                                      |
| ------------------ | -------------------------------------------------------------------------------------- |
| PostgreSQL tables  | Colecciones Firestore con documentos tipados por dominio.                              |
| RLS                | Firestore Security Rules + Storage Rules + validación server-side.                     |
| DB constraints     | Reglas de shape/tipos, route handlers con Admin SDK y transacciones/locks para agenda. |
| Private buckets    | Firebase Storage paths con metadata validada y serving server-side cuando corresponde. |
| Service role       | Firebase Admin SDK server-only; nunca en cliente, logs ni docs con valores reales.     |

## Fase 1 — Documentación base

Objetivo: alinear producto, arquitectura, datos, seguridad y plan antes de implementar.

- [x] Inspeccionar estructura del repositorio.
- [x] Confirmar si el proyecto está vacío o tiene stack existente.
- [x] Crear `docs/PRODUCT_SPEC.md`.
- [x] Crear `docs/ARCHITECTURE.md`.
- [x] Crear `docs/DATABASE.md`.
- [x] Crear `docs/SECURITY.md`.
- [x] Crear `docs/IMPLEMENTATION_PLAN.md`.
- [ ] Revisión humana de alcance y prioridades del MVP.

## Fase 2 — Inicialización técnica

Objetivo: crear la base de aplicación sin funcionalidades complejas.

- [x] Crear aplicación Next.js con App Router.
- [x] Configurar TypeScript con `strict: true`.
- [x] Elegir y documentar package manager antes de instalar dependencias.
- [x] Configurar linting y formateo.
- [x] Configurar estructura inicial de carpetas.
- [x] Configurar variables de entorno de ejemplo sin credenciales reales.
- [x] Agregar configuración base de tests.
- [x] Verificar build inicial.
- [x] Agregar helpers de configuración para Firebase y WhatsApp sin credenciales reales.
- [x] Agregar pruebas unitarias para helpers fundacionales.

## Fase 3 — Firebase y modelo de datos

Objetivo: preparar Firebase Auth, Firestore/Storage y reglas de seguridad.

- [x] Documentar arquitectura Firebase antes de implementar SDKs o funcionalidades de negocio.
- [ ] Crear proyecto Firebase fuera del repositorio o conectar uno existente.
- [x] Definir colecciones iniciales para `profiles`, `quotes`, `quote_images`, `appointments` y contenido público.
- [x] Definir colecciones de `artists`, `portfolio_items`, `availability` y `contact_leads` según `docs/FIREBASE_ARCHITECTURE.md`.
- [x] Crear reglas para colecciones privadas.
- [x] Crear reglas para cliente, administrador y acceso público controlado.
- [x] Preparar Storage controlado para `quote-images` y assets públicos.
- [x] Definir reglas de validación de archivos.
- [ ] Implementar restricción anti-duplicación para citas solapadas.
- [x] Probar acceso cruzado entre usuarios en reglas.

## Fase 4 — Autenticación y roles

Objetivo: habilitar sesiones y autorización confiable.

- [x] Integrar Firebase Auth local con Next.js App Router para login admin mediante emulator opt-in.
- [ ] Crear flujo de registro/login para clientes.
- [x] Crear mecanismo controlado para asignar el primer administrador.
- [ ] Proteger rutas `/account` desde servidor.
- [x] Proteger `/admin` desde servidor con cookie httpOnly de sesión admin.
- [x] Validar rol administrativo en mutaciones server-side.
- [x] Agregar pruebas para acceso anónimo, cliente y admin en helpers/reglas críticas.

## Fase 5 — Cotizaciones privadas

Objetivo: implementar el flujo central de negocio.

- [x] Crear formulario público de solicitud de cotización.
- [x] Validar campos de zona, tamaño, descripción, contacto y presupuesto CLP server-side.
- [x] Implementar carga server-side de imágenes a Firebase Storage controlado.
- [x] Registrar metadata de imágenes en `quote_images`.
- [ ] Permitir al cliente autenticado ver sus solicitudes.
- [x] Crear vista administrativa de cotizaciones.
- [x] Implementar cambios de estado y nota interna.
- [x] Probar que un cliente no pueda ver cotizaciones ni imágenes de otro mediante reglas.

## Fase 6 — Calendario y agenda

Objetivo: gestionar citas sin duplicación.

- [ ] Crear vista administrativa de calendario.
- [ ] Crear citas asociadas a cliente y/o cotización.
- [ ] Mostrar fechas en `America/Santiago`.
- [ ] Persistir fechas como timestamps en UTC.
- [ ] Impedir solapamientos desde transacciones o lógica server-side.
- [ ] Probar concurrencia creando dos citas simultáneas en el mismo horario.
- [ ] Permitir cancelar o completar citas según permisos.

## Fase 7 — Contenido público y SEO

Objetivo: publicar el sitio comercial indexable.

- [x] Implementar inicio, portafolio, servicios y contacto.
- [ ] Implementar reseñas aprobadas.
- [ ] Implementar productos públicos en CLP.
- [ ] Implementar sponsors y comunidad.
- [x] Agregar metadata base y metadata en páginas públicas clave.
- [x] Agregar Open Graph base.
- [x] Agregar sitemap y robots para rutas públicas actuales.
- [ ] Evaluar datos estructurados para negocio local y productos.

## Fase 8 — Integraciones

Objetivo: conectar canales externos de forma segura y oficial.

- [x] Implementar WhatsApp click-to-chat con configuración por entorno.
- [ ] Preparar integración Instagram mediante API oficial.
- [ ] Manejar límites, errores y fallback manual de Instagram.
- [ ] No incluir scraping ni credenciales en el repositorio.

## Fase 9 — Pruebas, hardening y despliegue

Objetivo: validar seguridad, estabilidad y operación.

- [x] Ejecutar pruebas unitarias durante slices previos.
- [x] Ejecutar pruebas de integración Firebase/reglas durante slices previos.
- [ ] Ejecutar pruebas e2e de cotización, login, admin y agenda.
- [ ] Revisar seguridad de Firebase Storage privado.
- [ ] Revisar variables de entorno por ambiente.
- [ ] Configurar despliegue.
- [x] Verificar build de producción durante slices previos.
- [ ] Revisar SEO técnico antes de publicar.

## Mapa de producto por área

| Área               | Estado    | Siguiente slice útil                                                                                                               |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Páginas públicas   | Parcial   | Mantener `/`, `/servicios`, `/portfolio`, `/quote`, `/contacto`; agregar reseñas/shop/sponsors/comunidad solo cuando se prioricen. |
| Cotización         | Parcial   | Agregar cuenta cliente y vista propia de solicitudes; hoy el flujo público crea solicitudes server-side.                           |
| Admin auth/session | Parcial   | Endurecer sesión para producción real y revisar revocación/cookies en Vercel antes de publicar.                                    |
| Portafolio         | Parcial   | Ya hay galería pública y CRUD-lite admin; faltan edición, borrado, orden manual y moderación avanzada.                             |
| SEO                | Parcial   | Metadata, Open Graph base, robots y sitemap existen; faltan structured data y revisión final de dominio.                           |
| Calendario         | Pendiente | Diseñar transacciones/locks antes de construir UI.                                                                                 |
| Instagram          | Pendiente | Usar API oficial o fallback manual; no scraping.                                                                                   |
| Shop/productos     | Pendiente | Modelar productos, imágenes y stock transaccional si aplica.                                                                       |
| Reseñas            | Pendiente | Crear moderación admin antes de lectura pública.                                                                                   |
| Sponsors           | Pendiente | Crear contenido administrable con publicación controlada.                                                                          |
| Comunidad          | Pendiente | Crear contenido editorial moderado.                                                                                                |
| Deployment         | Pendiente | Configurar proyecto Firebase real, variables Vercel y dominio canónico sin commitear secretos.                                     |

## Definición de listo para MVP

- [ ] Sitio público con portafolio, servicios, contacto y SEO básico.
- [ ] Login/registro de clientes operativo.
- [ ] Cotizaciones con imágenes privadas funcionando.
- [ ] Panel admin para revisar y responder cotizaciones.
- [ ] Agenda con prevención de duplicación.
- [ ] Reglas Firebase probadas para datos privados.
- [ ] WhatsApp click-to-chat disponible.
- [ ] Instagram sin scraping; integración oficial o fallback manual.
- [ ] Build y suite mínima de tests ejecutados correctamente.

## Riesgos y dependencias

| Riesgo/dependencia          | Impacto                                    | Acción recomendada                                           |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Alcance de panel admin      | Puede crecer demasiado                     | Priorizar cotizaciones y agenda antes de contenido avanzado. |
| Reglas Firebase complejas   | Pueden bloquear desarrollo o abrir brechas | Escribir pruebas de seguridad antes de exponer datos reales. |
| Instagram API               | Puede requerir permisos o revisión         | Planificar fallback manual desde el diseño.                  |
| Anti-duplicación de citas   | Requiere validación en base de datos       | Diseñar restricción antes de construir UI de calendario.     |
| Decisión de package manager | Afecta lockfile y CI                       | Elegir antes de inicializar Next.js.                         |

## Próximo paso recomendado

Elegir el siguiente slice de producto. Si el objetivo es MVP operativo, priorizar calendario con locks transaccionales o cuenta cliente para seguimiento de cotizaciones antes de agregar contenido avanzado.
