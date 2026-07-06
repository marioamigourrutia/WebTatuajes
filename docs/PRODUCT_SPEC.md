# Especificación de producto — Plataforma profesional para tatuador

Este documento define el alcance funcional de una plataforma web profesional para un artista del tatuaje que atiende clientes en Chile. La plataforma debe permitir exhibir trabajos, recibir cotizaciones, derivar referencias visuales por WhatsApp, administrar agenda, vender productos, publicar reseñas y operar integraciones externas sin exponer datos sensibles.

## Resumen ejecutivo

| Área           | Decisión                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Mercado        | Clientes en Chile, moneda CLP y zona horaria `America/Santiago`.                                              |
| Plataforma     | Sitio web responsive con experiencia pública, área de cliente y panel administrativo.                         |
| Stack objetivo | Next.js App Router, TypeScript estricto, Firebase como backend oficial y Vercel como hosting objetivo.        |
| Privacidad     | La cotización pública guarda datos mínimos; fotos y referencias se comparten por WhatsApp fuera del formulario. |
| Integraciones  | Instagram mediante API oficial; WhatsApp mediante enlace click-to-chat, sin automatización no autorizada.     |

## Objetivos del producto

1. Presentar el portafolio profesional del tatuador con foco en confianza, estilo y conversión.
2. Recibir solicitudes de cotización completas y derivar referencias visuales al WhatsApp del estudio.
3. Evitar conflictos de agenda mediante reglas de no duplicación de reservas.
4. Permitir gestión administrativa de cotizaciones, clientes, productos, reseñas y contenido.
5. Preparar la plataforma para SEO local, rendimiento y despliegue seguro.

## Usuarios y roles

| Rol           | Descripción                                 | Capacidades principales                                                                                                 |
| ------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Visitante     | Persona que navega sin iniciar sesión.      | Ver portafolio, productos públicos, sponsors, comunidad, reseñas, SEO pages y contacto por WhatsApp.                    |
| Cliente       | Persona que solicita servicios.             | Crear cotizaciones públicas, enviar referencias por WhatsApp, revisar estado con código/email y eventualmente gestionar citas propias. |
| Administrador | Tatuador o equipo autorizado.               | Gestionar cotizaciones, agenda, contenido, productos, reseñas, sponsors y comunidad.                                    |

## Alcance funcional

### Sitio público

- Página de inicio con propuesta de valor, estilos destacados y llamadas a la acción.
- Portafolio categorizable por estilo, ubicación del cuerpo, tamaño y fecha.
- Página de servicios con información de proceso, cuidados, restricciones y preguntas frecuentes.
- Reseñas verificadas o moderadas antes de publicación.
- Catálogo de productos relacionados, sin asumir pasarela de pago en la primera etapa.
- Secciones de sponsors y comunidad con contenido editorial administrable.
- Enlaces directos a WhatsApp click-to-chat para contacto rápido.
- Integración con Instagram solo mediante API oficial y respetando límites/permisos de la plataforma.

### Cotizaciones

| Requisito    | Criterio esperado                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Formulario   | Debe solicitar zona del cuerpo, tamaño aproximado, descripción de la idea, presupuesto estimado opcional, fecha preferida opcional y email de contacto. |
| Referencias  | Fotos y referencias se envían por WhatsApp con el código de cotización creado; no se suben desde el formulario público. |
| Estado       | Debe soportar estados públicos/admin como `pending`, `contacted`, `closed` y `spam`.                               |
| Privacidad   | La consulta pública de estado debe usar código + email, no exponer notas internas, imágenes ni datos sensibles.       |
| Trazabilidad | Cambios de estado relevantes deben quedar registrados.                                                               |

### Agenda

- Calendario administrativo para revisar disponibilidad y citas.
- Prevención de duplicación de horarios mediante restricción transaccional en base de datos.
- Manejo de duración estimada por sesión.
- Zona horaria oficial: `America/Santiago`.
- Visualización de fechas en formato local chileno.

### Productos

- Catálogo público de productos relacionados con cuidado, merchandising o colaboraciones.
- Administración de nombre, descripción, precio en CLP, estado visible/no visible e imágenes.
- Stock opcional; si se implementa, debe actualizarse de forma transaccional.

### Sponsors y comunidad

- Sponsors: marcas colaboradoras con logo, descripción y enlace público.
- Comunidad: publicaciones, eventos, colaboraciones o campañas relevantes.
- Todo contenido público debe poder moderarse desde el panel administrativo.

## Requisitos no funcionales

| Categoría      | Requisito                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Seguridad      | Reglas Firebase obligatorias para datos por usuario; archivos privados; validación server-side. |
| Localización   | Español profesional, CLP, `es-CL`, zona horaria `America/Santiago`.                             |
| Accesibilidad  | Formularios navegables por teclado, etiquetas claras y contraste suficiente.                    |
| SEO            | Metadata por página, Open Graph, sitemap, robots y datos estructurados cuando corresponda.      |
| Rendimiento    | Imágenes optimizadas, carga diferida y componentes server-first cuando sea posible.             |
| Observabilidad | Registro de errores de servidor y eventos administrativos críticos.                             |
| Tests          | Pruebas unitarias, integración para reglas críticas y e2e para flujos principales.              |

## Fuera de alcance inicial

- Pasarela de pago completa.
- Automatización de mensajes de WhatsApp mediante APIs no oficiales.
- Scraping de Instagram.
- Aplicación móvil nativa.
- Sistema multi-artista o marketplace.

## Riesgos de producto

| Riesgo                                    | Impacto | Mitigación                                                               |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------ |
| Uso de imágenes sensibles en cotizaciones | Alto    | No subir imágenes en el formulario público; derivar referencias por WhatsApp y mantener datos mínimos en Firestore. |
| Duplicación de citas                      | Alto    | Restricciones de base de datos, transacciones y pruebas de concurrencia. |
| Dependencia de Instagram                  | Medio   | Usar API oficial y diseñar fallback manual/editorial.                    |
| Alcance excesivo en primera versión       | Medio   | Implementar por fases y priorizar cotización, agenda y portafolio.       |

## Criterios de éxito

- Un visitante puede entender el estilo del artista y solicitar una cotización en menos de cinco minutos.
- Un cliente puede crear una cotización sin login y enviar referencias por WhatsApp usando el código generado.
- Un administrador puede responder cotizaciones y gestionar agenda sin crear conflictos horarios.
- El sitio queda preparado para indexación SEO local y despliegue seguro.
