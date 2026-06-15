# Plan de implementación — Plataforma web para tatuador

Este plan organiza la construcción en fases verificables. La fase actual solo crea documentación de producto y arquitectura; no implementa funcionalidades de aplicación.

## Estado inicial verificado

| Elemento        | Estado                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Repositorio     | Directorio vacío al inicio de la fase.                                 |
| Stack instalado | No hay aplicación Next.js creada todavía.                              |
| Package manager | No detectado; no existen `package.json`, lockfiles ni configuración.   |
| Configuración   | No existían archivos de TypeScript, Next.js, ESLint, backend ni tests. |
| Documentación   | Se crea en `docs/` durante esta fase.                                  |

> Nota de auditoría posterior: la Fase 2 ya fue iniciada después de esta documentación. El repositorio ahora contiene aplicación Next.js, configuración npm, estructura `src/` y configuración de tests. La dirección backend cambió de Supabase a Firebase; la Fase 3 Supabase queda detenida.

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
- [ ] Definir colecciones iniciales para `profiles`, `quotes`, `quote_images`, `appointments` y contenido público.
- [ ] Definir colecciones de `artists`, `portfolio_items`, `availability` y `contact_leads` según `docs/FIREBASE_ARCHITECTURE.md`.
- [ ] Crear reglas para colecciones privadas.
- [ ] Crear reglas para cliente, administrador y acceso público controlado.
- [ ] Preparar Storage privado para `quote-images`.
- [ ] Definir reglas de validación de archivos.
- [ ] Implementar restricción anti-duplicación para citas solapadas.
- [ ] Probar acceso cruzado entre usuarios.

## Fase 4 — Autenticación y roles

Objetivo: habilitar sesiones y autorización confiable.

- [ ] Integrar Firebase Auth con Next.js App Router.
- [ ] Crear flujo de registro/login para clientes.
- [ ] Crear mecanismo controlado para asignar el primer administrador.
- [ ] Proteger rutas `/account` y `/admin` desde servidor.
- [ ] Validar rol administrativo en mutaciones server-side.
- [ ] Agregar pruebas para acceso anónimo, cliente y admin.

## Fase 5 — Cotizaciones privadas

Objetivo: implementar el flujo central de negocio.

- [ ] Crear formulario de solicitud de cotización.
- [ ] Validar campos de zona, tamaño, estilo, descripción y presupuesto CLP.
- [ ] Implementar carga de imágenes a Firebase Storage privado.
- [ ] Registrar metadata de imágenes en `quote_images`.
- [ ] Permitir al cliente ver sus solicitudes.
- [ ] Crear vista administrativa de cotizaciones.
- [ ] Implementar cambios de estado y trazabilidad.
- [ ] Probar que un cliente no pueda ver cotizaciones ni imágenes de otro.

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

- [ ] Implementar inicio, portafolio y servicios.
- [ ] Implementar reseñas aprobadas.
- [ ] Implementar productos públicos en CLP.
- [ ] Implementar sponsors y comunidad.
- [ ] Agregar metadata por página.
- [ ] Agregar Open Graph.
- [ ] Agregar sitemap y robots.
- [ ] Evaluar datos estructurados para negocio local y productos.

## Fase 8 — Integraciones

Objetivo: conectar canales externos de forma segura y oficial.

- [ ] Implementar WhatsApp click-to-chat con configuración por entorno.
- [ ] Preparar integración Instagram mediante API oficial.
- [ ] Manejar límites, errores y fallback manual de Instagram.
- [ ] No incluir scraping ni credenciales en el repositorio.

## Fase 9 — Pruebas, hardening y despliegue

Objetivo: validar seguridad, estabilidad y operación.

- [ ] Ejecutar pruebas unitarias.
- [ ] Ejecutar pruebas de integración Firebase/reglas.
- [ ] Ejecutar pruebas e2e de cotización, login, admin y agenda.
- [ ] Revisar seguridad de Firebase Storage privado.
- [ ] Revisar variables de entorno por ambiente.
- [ ] Configurar despliegue.
- [ ] Verificar build de producción.
- [ ] Revisar SEO técnico antes de publicar.

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

Revisar y aprobar `docs/FIREBASE_ARCHITECTURE.md`. Después, crear reglas Firestore/Storage y pruebas con emuladores antes de construir funcionalidades de negocio.
