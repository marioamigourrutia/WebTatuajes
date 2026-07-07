# Checklist de entrega a producción

## Variables y servicios

- Configurar Firebase client/admin: `NEXT_PUBLIC_FIREBASE_*` y credenciales server-only de Admin SDK. Se admite `FIREBASE_SERVICE_ACCOUNT_JSON` o el set dividido `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Configurar `NEXT_PUBLIC_SITE_URL`, WhatsApp público y credenciales de Instagram si se usa sincronización.
- No configurar Supabase para el flujo actual. Las cotizaciones públicas envían referencias por WhatsApp y la estrategia de imágenes es URL-only/manual salvo proveedor compatible ya existente.
- Ajustar límites base por entorno: `RATE_LIMIT_*_LIMIT` y `RATE_LIMIT_*_WINDOW_MS`, incluyendo el bucket dedicado de bajas de comunidad `RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_*`. El fallback en memoria sigue activo aunque no se configuren.
- Completar allowlist CSP sin tocar código si el dominio real lo requiere: `CSP_CONNECT_SRC_EXTRA`, `CSP_IMG_SRC_EXTRA`, `CSP_FRAME_SRC_EXTRA`.
- Confirmar reglas de Firestore/Storage y primer admin antes de publicar.

## Seguridad y privacidad

- Revisar CSP en `next.config.ts` y en variables `CSP_*_EXTRA` contra dominios reales de Firebase, WhatsApp, Instagram y cualquier CDN de imágenes.
- El rate limit actual es configurable pero en memoria por instancia; para producción con más de una instancia/región debe reemplazarse o reforzarse con Vercel Firewall, Upstash/KV, Redis o un control equivalente compartido.
- Verificar páginas públicas de privacidad, reservas, manejo de imágenes y solicitud de datos.
- Confirmar que `/api/quotes` valida datos, aplica rate limit/bot protection y crea la cotización antes de abrir WhatsApp, sin exigir token bearer público.
- Confirmar que `/admin` muestra auditoría reciente después de acciones críticas: cambio de estado, abono y confirmación de reserva.

## Comandos exactos antes de deploy

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- Smoke manual: cotización pública sin login, apertura de WhatsApp con código creado, visibilidad en admin/calendario, admin cambia estado/abono/reserva, comunidad, compra y opinión.

## Checklist de aceptación

- Cotización pública crea un registro server-side sin login, abre WhatsApp con el código y mantiene trazabilidad en admin/calendario.
- Rutas públicas sensibles responden 429 al superar el límite configurado.
- Headers de seguridad/CSP están presentes y no rompen `/`, `/quote`, `/portfolio`, `/admin`, `/privacidad`, `/terminos-reserva`, `/manejo-imagenes` ni `/solicitud-datos`.
- Acciones admin críticas escriben en `audit_logs` y `/admin` lista eventos recientes sin secretos en metadata.
- Páginas legales están enlazadas desde el footer y revisadas por el responsable del negocio.
- Build de Vercel usa solo credenciales server-side para Firebase Admin e Instagram.

## Validación post-deploy

- Confirmar headers de seguridad en una ruta pública.
- Enviar una cotización real de prueba sin login, confirmar apertura de WhatsApp y revisar trazabilidad en Firestore.
- Cambiar estado, registrar abono y confirmar reserva desde `/admin`; revisar que aparezcan en Auditoría reciente.
- Verificar que los enlaces legales aparecen en footer y consentimientos.
- Revisar logs de errores de Vercel/Firebase durante la primera hora.

## Pendientes externos/manuales

- Configurar credenciales reales en Vercel/Firebase/Meta. No hay credenciales reales en el repositorio.
- Definir límites de firewall/plataforma según tráfico real y aplicar bloqueo compartido si hay múltiples instancias.
- Validar CSP contra el dominio final y ajustar `CSP_*_EXTRA` si aparece un bloqueo legítimo.
- Asignar el primer admin desde un entorno controlado antes de operar producción.

## Rollback

- Mantener el deploy anterior disponible en Vercel.
- Si falla autenticación o cotización, revertir al deploy anterior y conservar logs de Firestore/Vercel para diagnóstico.
- No rotar secretos durante rollback salvo sospecha de exposición.
