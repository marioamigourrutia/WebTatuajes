# WebTatuajes

Plataforma web profesional para un estudio de tatuajes en Chile. La aplicación usa Next.js App Router, TypeScript estricto, Tailwind CSS y Firebase como backend oficial; Vercel es el hosting objetivo.

## Estado actual

- Fase 1: documentación base creada en `docs/`.
- Fase 2: base técnica inicial creada y verificada con linting, TypeScript estricto, Vitest y build.
- Firebase es la dirección backend oficial: Auth, Firestore, Storage, Admin SDK server-only y Security Rules.
- Cualquier requisito previo de Supabase/PostgreSQL/RLS debe traducirse a equivalentes Firebase; no reintroducir Supabase salvo decisión explícita nueva.
- Hay un flujo local mínimo con Firebase Auth Emulator para login/logout, seed controlado de admin local y validación server-side de rol en `/admin`.
- Hay un primer flujo de negocio local: formulario público de cotización en `/quote`, escritura server-side con Firebase Admin SDK, dashboard admin validado en servidor, cambio de estado, detalle completo, enlaces de contacto y nota interna de solicitudes.
- Hay un portafolio público MVP en `/portfolio` con datos estáticos tipados, filtros simples por estilo/etiqueta, placeholders visuales locales, CTA hacia cotización y un slice admin local para crear/listar/publicar ítems administrables con imagen opcional.
- Hay una página pública estática en `/servicios` con servicios, expectativas de reserva, higiene, cuidados posteriores, FAQ y CTA hacia cotización.
- Hay una página pública estática en `/contacto` con contacto, ubicación por reserva, higiene, soporte posterior y CTA hacia cotización.
- Hay metadata base, `robots.txt` y `sitemap.xml` para descubrimiento público inicial en Vercel; incluye `/`, `/quote`, `/portfolio`, `/servicios` y `/contacto`.

## Requisitos

- Node.js 20.11 o superior.
- npm 10 o superior.
- Java Runtime Environment para Firebase Emulator Suite.

## Configuración local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Los valores de `.env.example` son placeholders. No agregues credenciales reales al repositorio.

Para probar el flujo local completo con emuladores, usa los valores demo indicados más abajo. Con placeholders, la app no inicializa Firebase y muestra un estado seguro de configuración pendiente.

### Flujo local con Firebase Auth Emulator

1. Copia `.env.example` a `.env.local` y reemplaza las variables públicas Firebase por valores demo locales:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-webtatuajes.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-webtatuajes
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-webtatuajes.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:demo
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED=true
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
FIREBASE_PROJECT_ID=demo-webtatuajes
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_SERVICE_ACCOUNT_JSON={}
```

2. Terminal A: levanta emuladores locales:

```bash
npm run emulators
```

3. Terminal B: siembra el admin local controlado:

```bash
npm run admin:seed-local
```

Este script carga `.env.local` automáticamente con `node --env-file=.env.local`; no hace falta exportar esas variables a mano.
Si aparece `Firebase Auth Emulator is not running`, deja activo `npm run emulators` y vuelve a ejecutar el seed.

Credenciales de prueba creadas solo en emuladores:

```text
admin@example.test / Password123!
```

4. Terminal C: levanta Next.js:

```bash
npm run dev:local
```

5. Abre `http://localhost:3000/servicios` para revisar servicios, higiene, cuidados posteriores y preguntas frecuentes antes de cotizar.

6. Abre `http://localhost:3000/portfolio` para revisar la galería pública MVP y sus filtros. Desde una pieza, usa **Cotizar una idea similar** para ir al flujo de cotización.

7. Abre `http://localhost:3000/quote`, carga una solicitud de cotización y, si quieres probar referencias, adjunta hasta 3 imágenes JPG/PNG/WEBP/GIF de máximo 5 MB cada una. Envíala. El resultado esperado es un mensaje de éxito con el ID local de la solicitud.

8. Abre `http://localhost:3000/admin`, inicia sesión con esas credenciales y presiona **Validar rol en servidor**. El login crea una cookie httpOnly de sesión admin solo después de validar el ID token y el rol `admin` en servidor. El resultado esperado es `Autenticado: sí`, `Admin server-side: sí`, `Rol servidor: admin`, el formulario de portafolio admin y la solicitud reciente en la lista admin.

Si el login muestra que no se pudo iniciar sesión con credenciales locales, normalmente falta uno de estos pasos: emuladores activos en Terminal A o `npm run admin:seed-local` ejecutado después de levantar emuladores. Estas credenciales no existen en producción.

9. En **Portafolio administrable**, crea un ítem con título, estilo, zona del cuerpo, descripción corta, etiquetas separadas por coma y, opcionalmente, una imagen JPG/PNG/WEBP/GIF de máximo 5 MB. Marca **Publicar en `/portfolio`** si quieres verlo públicamente. El resultado esperado es `Ítem de portafolio creado desde ruta server-side con rol admin validado.` y el ítem en **Ítems recientes**.

10. Vuelve a `http://localhost:3000/portfolio`. El resultado esperado es ver los ítems estáticos más los ítems Firestore con `published=true`. Si adjuntaste imagen, se sirve desde `/api/portfolio/images?itemId=...`, que verifica que el documento esté publicado antes de leer Storage con Admin SDK.

11. Prueba desmarcar/marcar **Publicado** desde el dashboard admin. El resultado esperado es `Publicación actualizada desde ruta server-side con rol admin validado.` y que `/portfolio` oculte/muestre el ítem según el flag.

12. En el dashboard admin, revisa el detalle completo de la solicitud: descripción, presupuesto, zona, tamaño, datos de contacto, fecha, estado, nota interna e imágenes de referencia si fueron adjuntadas.

13. Usa **Enviar email** o **Abrir WhatsApp** para contactar al cliente con un mensaje prellenado que incluye contexto de la cotización.

14. Cambia el estado interno de la solicitud a **Contactado**, **Cerrado** o **Spam**. El resultado esperado es el mensaje `Estado actualizado desde ruta server-side con rol admin validado.` y la lista actualizada sin recargar.

15. Escribe una **Nota interna** y presiona **Guardar nota**. El resultado esperado es el mensaje `Nota interna guardada desde ruta server-side con rol admin validado.` y la nota persistida para el dashboard admin.

El formulario público no abre escrituras cliente en Firestore Rules: la creación pasa por `/api/quotes` y usa Admin SDK server-side. Las imágenes de referencia también se suben desde servidor a Firebase Storage y se registran en `quote_images`; el cliente público no recibe permisos amplios de escritura directa. El listado de `/admin`, el cambio de estado y el guardado de nota interna pasan por rutas server-side que vuelven a validar ID token y rol admin; no confían en estado de rol del cliente.

El portafolio administrable tampoco abre escrituras públicas/cliente para crear contenido: `/api/admin/portfolio` y `/api/admin/portfolio/published` vuelven a validar ID token y rol admin server-side antes de escribir en `portfolio_items`. Además, `/api/admin/session` crea/limpia una cookie httpOnly de sesión admin para navegación privada futura, pero solo después de validar server-side el ID token y el rol `admin`; las rutas de mutación existentes siguen revalidando bearer ID token y rol admin. Las imágenes admin se guardan en `portfolio-admin/{itemId}/...`, fuera de rutas públicas de Storage, y el sitio público las lee mediante `/api/portfolio/images?itemId=...` solo cuando el documento está publicado.

Las previews de imágenes del panel admin no exponen URLs públicas ni URLs raw del Storage Emulator. El cliente admin obtiene blobs mediante `/api/admin/quotes/images?imageId=...`, enviando el ID token en `Authorization`; la ruta vuelve a validar rol admin server-side, lee metadata en `quote_images` y sirve bytes desde Firebase Admin Storage con `Cache-Control: no-store`.

El seed local se niega a correr si detecta `NODE_ENV=production`, un `FIREBASE_SERVICE_ACCOUNT_JSON` real, un project id distinto de `demo-webtatuajes` o hosts que no sean los emuladores locales. No asigna roles contra producción.

## Scripts

```bash
npm run dev        # desarrollo local
npm run build      # build de producción
npm run start      # servir build de producción
npm run lint       # ESLint
npm run typecheck  # TypeScript estricto
npm run test       # Vitest
npm run test:rules # pruebas locales de Firebase Security Rules con emuladores
npm run test:rules:existing # rules tests contra emuladores ya levantados
npm run emulators  # Auth, Firestore y Storage emulators para desarrollo local
npm run admin:seed-local # crea admin@example.test en emuladores locales
```

## Variables de entorno

| Variable                                     | Uso                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                       | URL pública canónica del sitio para metadata y sitemap. En local puede usar `http://localhost:3000`; en Vercel debe apuntar al dominio público final.             |
| `NEXT_PUBLIC_FIREBASE_API_KEY`               | API key pública del proyecto Firebase.                                                                                                                            |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`           | Auth domain público de Firebase.                                                                                                                                  |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`            | ID público del proyecto Firebase.                                                                                                                                 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`        | Bucket público configurado en Firebase.                                                                                                                           |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`   | Sender ID público de Firebase.                                                                                                                                    |
| `NEXT_PUBLIC_FIREBASE_APP_ID`                | App ID público de Firebase.                                                                                                                                       |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED` | Opt-in explícito para conectar Firebase Auth cliente al emulador; ignorado en producción.                                                                         |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL`     | URL del Auth Emulator para cliente local, por defecto `http://127.0.0.1:9099`.                                                                                    |
| `FIREBASE_PROJECT_ID`                        | Project id server-side para emuladores/Admin SDK local.                                                                                                           |
| `FIREBASE_AUTH_EMULATOR_HOST`                | Host server-side del Auth Emulator, sin protocolo.                                                                                                                |
| `FIRESTORE_EMULATOR_HOST`                    | Host server-side del Firestore Emulator, sin protocolo.                                                                                                           |
| `FIREBASE_STORAGE_EMULATOR_HOST`             | Host server-side del Storage Emulator, sin protocolo; necesario para que Admin Storage apunte al emulador local. Si ya tienes `.env.local`, agrégalo manualmente. |
| `FIREBASE_SERVICE_ACCOUNT_JSON`              | JSON server-only de Firebase Admin. No usar valores reales en git ni exponer al cliente.                                                                          |
| `FIRST_ADMIN_UID`                            | UID objetivo para el script controlado de primer admin. Usar este valor o email, no ambos.                                                                        |
| `FIRST_ADMIN_EMAIL`                          | Email objetivo para resolver el UID del primer admin. Usar este valor o UID, no ambos.                                                                            |
| `FIREBASE_ADMIN_CONFIRM_ASSIGNMENT`          | Debe valer `assign-first-admin` para escribir; vacío ejecuta dry-run.                                                                                             |
| `NEXT_PUBLIC_WHATSAPP_PHONE`                 | Número para enlace click-to-chat.                                                                                                                                 |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE`               | Mensaje prellenado de WhatsApp.                                                                                                                                   |
| `NEXT_PUBLIC_APP_LOCALE`                     | Locale de la app, por defecto `es-CL`.                                                                                                                            |
| `NEXT_PUBLIC_APP_TIME_ZONE`                  | Zona horaria, por defecto `America/Santiago`.                                                                                                                     |

## Firebase y Vercel

La app incluye placeholders de configuración Firebase, una primera base local de Firestore/Storage Security Rules con pruebas de emulador, Firebase Auth cliente conectado al Auth Emulator solo por opt-in explícito y helpers server-only de Firebase Admin. No usa credenciales reales ni conecta un proyecto Firebase de producción por defecto.

Los roles `artist` y `admin` no se asignan desde la UI pública. El primer admin debe crearse mediante consola Firebase o el script server-only con Admin SDK ejecutado en un entorno controlado.

### Asignación controlada del primer admin

El repositorio incluye `npm run admin:assign-first-admin` para preparar la primera cuenta administradora sin abrir una ruta pública ni permitir self-service desde cliente. El script exige `FIREBASE_SERVICE_ACCOUNT_JSON` server-only y exactamente un objetivo: `FIRST_ADMIN_UID` o `FIRST_ADMIN_EMAIL`.

Por defecto corre en dry-run y no escribe cambios:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
FIRST_ADMIN_EMAIL=owner@example.com \
npm run admin:assign-first-admin
```

Para escribir el rol `admin` en `profiles/{uid}` y sincronizar el custom claim, agrega la confirmación explícita:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
FIRST_ADMIN_EMAIL=owner@example.com \
FIREBASE_ADMIN_CONFIRM_ASSIGNMENT=assign-first-admin \
npm run admin:assign-first-admin
```

No ejecutes este script desde rutas públicas, componentes cliente ni máquinas no confiables. El helper server-side valida el ID token y lee el rol desde `profiles/{uid}`; no infiere `artist` o `admin` desde estado cliente.

Para probar reglas localmente:

```bash
npm install
npm run test:rules
```

El comando levanta Firestore y Storage mediante Firebase Emulator Suite con el proyecto demo `demo-webtatuajes`. Requiere Java disponible en el sistema. Para el flujo manual de login/admin usa `npm run emulators`, que también levanta Auth Emulator.

Si ya tienes los emuladores levantados con `npm run emulators`, usa `npm run test:rules:existing` para ejecutar las pruebas contra esos procesos. Ese comando limpia datos del emulador; después vuelve a correr `npm run admin:seed-local` antes de probar `/admin` manualmente.

El hosting objetivo es Vercel. No hay configuración de despliegue productivo real en esta fase. Antes de publicar, configurar `NEXT_PUBLIC_SITE_URL` con el dominio final para que `metadataBase`, Open Graph y `sitemap.xml` usen URLs canónicas correctas.

## Documentación de arquitectura

- `docs/FIREBASE_ARCHITECTURE.md`: Auth, roles, Firestore, Storage, Security Rules, entorno local/Vercel y equivalencias desde requisitos Supabase/PostgreSQL/RLS hacia Firebase.
- `docs/ARCHITECTURE.md`: arquitectura general de Next.js + Firebase.
- `docs/DATABASE.md`: modelo de datos inicial.
- `docs/SECURITY.md`: amenazas, reglas mínimas y controles de seguridad.

## Próximos pasos recomendados

- Mantener las futuras rutas privadas conectadas a helpers server-side de sesión/rol antes de crear paneles administrativos reales.
- Definir la estrategia de sesión/cookies seguras antes de construir navegación privada persistente.
- Evolucionar el portafolio admin solo cuando haga falta: edición, borrado, orden manual y moderación quedan fuera del MVP local actual.
