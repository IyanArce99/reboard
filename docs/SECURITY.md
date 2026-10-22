# Seguridad — Reboard MVP

Estado: **requisitos para la implementación**. Nada de esto está hecho todavía. El esquema y las RLS están en [DATABASE.md](DATABASE.md).

## 1. Claves y variables de entorno
| Variable | Visibilidad | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o la *publishable key*) | Pública | Siempre bajo RLS |
| `SUPABASE_SERVICE_ROLE_KEY` (o la *secret key*) | **Solo servidor** | Cron, `reveal_contact`, moderación y seeds |
| `CONTACT_IP_SALT` | **Solo servidor** | HMAC de la IP en `contact_events` |
| `CRON_SECRET` | **Solo servidor** | Autentica `/api/cron/*` (Vercel Cron) |
| `NEXT_PUBLIC_SITE_URL` | Pública | Canonical y JSON-LD |
| `REBOARD_DATA_SOURCE` | Servidor | `mock` o `supabase` |
| `RESEND_API_KEY` | **Solo servidor**, configurada en el SMTP de Supabase Auth | No hace falta en Next mientras solo la usen los emails de Auth |

Reglas:
- **Las claves secretas nunca llevan `NEXT_PUBLIC_`.** El cliente de service role vive en un módulo con `import "server-only"`. Una comprobación de CI falla si `SERVICE_ROLE` aparece en `.next/static`.
- Habrá `.env.example` sin valores. Los `.env*` ya están en `.gitignore`.
- Cada entorno (staging y producción) tiene su proyecto Supabase y sus propias claves.

## 2. Autenticación (Supabase Auth)
- **Acceso por email con código de un solo uso (OTP), sin contraseña.**
  - **SMTP propio (Resend)** antes de producción: el SMTP por defecto de Supabase tiene límites muy bajos.
  - Plantillas en español.
- **Sesión:**
  - `@supabase/ssr` con cookies HttpOnly.
  - El refresco se hace en `src/proxy.ts`, ampliando su `matcher` con cuidado, solo a las rutas que lo necesitan, porque `proxy` se ejecuta en cada petición que coincide.
- **Autorización en cada acción:**
  - En el servidor, la identidad se obtiene siempre con `supabase.auth.getUser()` (que valida el token contra Auth), nunca con `getSession()`.
  - **Cada Server Action y Route Handler vuelve a comprobar la sesión:** la UI no protege nada.
- **Redirecciones tras el acceso:** solo a rutas internas (comprueba que la ruta empieza por `/` y no por `//`). Así se evitan las redirecciones abiertas.
- **Límites:**
  - Los de Supabase Auth: envíos de OTP por hora y por email.
  - Captcha (Cloudflare Turnstile) recomendado. **Es una decisión pendiente** porque añade un servicio.

## 3. Datos y RLS
- **RLS en todas las tablas de `public`.** Una tabla sin políticas no es accesible para `anon` ni `authenticated`.
- **Privilegios por columna:** `seller_id`, `moderation`, `is_demo`, las fechas de estado y `role` no se pueden escribir desde el cliente (ver DATABASE.md).
- **Las transiciones de estado se validan en un disparador** (`listings_guard`), además de en la Server Action.
- **Teléfonos:** viven en `listing_contacts`, sin lectura pública. Solo se obtienen con `reveal_contact`, ejecutada por el servidor con service role, que registra el evento y aplica el límite.
- **Funciones `security definer`:** llevan `set search_path = ''` y se les revoca `execute` a `public`, `anon` y `authenticated` salvo que deban ser públicas.
- **Cache:** las lecturas públicas cacheadas (`'use cache'`) usan el cliente anónimo y sin cookies. **Nunca se cachea en el servidor una respuesta con datos de usuario bajo una clave compartida.**
  - Las claves y etiquetas de caché se guardan en texto plano. Se etiqueta por id, nunca por email ni por teléfono.

## 4. Validación del lado del servidor
- **Todas las Server Actions validan con `zod`.** Los límites coinciden con los CHECK de la base de datos:
  - longitud 48–144", anchura 14–30", grosor 1,5–5", litros 10–150, precio 1–20.000 €;
  - textos con longitud máxima;
  - enums de la taxonomía;
  - teléfono normalizado a E.164 (`+34…`).
- **Lo que no viene del cliente:**
  - El `slug` lo genera el servidor; el del cliente se ignora.
  - El origen `manufacturer` solo se acepta si `model_size_id` existe y las medidas coinciden con las del catálogo. Si no, el servidor lo guarda como `seller`.
  - El servidor nunca confía en `seller_id` ni en `status` venidos del cliente. El estado se decide según la acción («publicar», «marcar vendida»…).
- **Respuestas:** las Server Actions devuelven objetos mínimos (`{ ok, id }` o `{ error }`), nunca filas completas.

## 5. Contacto y anti-scraping
- El teléfono **no aparece en el HTML ni en el JSON-LD**. Se revela al pulsar «Contactar», con una Server Action que llama a `reveal_contact(public_id, user, ip_hash)`.
- **Límite:** 30 contactos por hora y por IP (aplicado en la función). Con sesión se puede ampliar.
  - `ip_hash` = HMAC-SHA256(IP, `CONTACT_IP_SALT`). La IP nunca se guarda en claro.
- WhatsApp se abre con `https://wa.me/{número}?text=…` desde el navegador del comprador. **Reboard no envía mensajes.**
- **Riesgo aceptado en el MVP:** el teléfono del vendedor no se verifica (no hay SMS en esta fase). Se mitiga con el email verificado, los reportes y la moderación.

## 6. Subida de imágenes
- El cliente redimensiona a un máximo de 1600 px y **recodifica a WebP en un canvas**.
  - Esto **elimina los metadatos EXIF, incluida la ubicación GPS** de las fotos hechas con el móvil. Es crítico para la privacidad del vendedor.
- **Bucket:**
  - Acepta solo `image/webp` e `image/jpeg`, con un máximo de 5 MB.
  - Políticas por carpeta `{auth.uid()}/…`.
  - Máximo 8 fotos por anuncio (disparador).
- **Verificación en el servidor:** antes de publicar, la Server Action comprueba que cada `storage_path` pertenece al usuario y al anuncio, y que el archivo existe.
- **`next/image`:**
  - Se añade el host de Supabase Storage a `images.remotePatterns`, en formato objeto y solo con la ruta `/storage/v1/object/public/listing-photos/**`.
  - Se quitará Unsplash cuando no haya datos DEMO.
- **Fotos huérfanas:** las de borradores abandonados se limpian con un cron (más de 7 días sin anuncio publicado).

## 7. Moderación básica
- **Reportes** (con sesión): uno por persona y anuncio. Con 3 reportes abiertos, el anuncio pasa automáticamente a `flagged` (sigue visible y aparece en la cola).
- **Panel de moderación** (`/moderacion`, solo `role in (moderator, admin)`): retirar, restaurar o descartar reportes. Cada acción queda registrada en `moderation_actions`.
- `removed` oculta el anuncio, borra sus fotos de Storage y el dueño no puede reabrirlo.
- Los roles de moderador los asigna un admin por SQL o service role. No hay interfaz para ello en el MVP.

## 8. Cabeceras y otros
- **Cabeceras en `next.config.ts`:**
  - `Content-Security-Policy`: `img-src` limitado a self, Supabase Storage y Unsplash; `connect-src` limitado a self y Supabase.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy`: la cámara solo para self.
- **Server Actions:** Next ya protege contra CSRF comprobando el `Origin`. Si hay dominios alternativos, se configura `serverActions.allowedOrigins`.
- **Sin `dangerouslySetInnerHTML` con datos de usuario.** `JsonLd` escapa `<`. Las descripciones se muestran como texto.
- **RGPD:**
  - Proyecto Supabase en la UE.
  - Privacidad, cookies y condiciones publicadas **antes** de abrir el registro.
  - Exportar y borrar la cuenta: la eliminación de `auth.users` borra en cascada perfil, anuncios, fotos (con un job para Storage) y favoritos.
- **Dependencias:** `npm audit` en CI y Renovate o Dependabot (opcional).

## 9. Lista de comprobación antes de producción
- [ ] RLS activa en todas las tablas (`select relname from pg_class where relrowsecurity = false and relnamespace = 'public'::regnamespace` vacío).
- [ ] Tests de RLS (anon y otro usuario) en CI.
- [ ] Service role ausente del bundle cliente.
- [ ] SMTP propio en Auth y plantillas revisadas.
- [ ] Textos legales publicados.
- [ ] Sin datos DEMO en el proyecto de producción. `isDemo = false` comprobado (sin banner DEMO y con indexación activa).
- [ ] Copias de seguridad diarias activas (plan de Supabase) y restauración probada en staging.
