# Lista de comprobación de lanzamiento

Pasos para llevar la rama `mvp` a producción. Cada paso indica **quién** lo hace:
- 🧑 **Titular:** cuentas, pagos, datos legales y decisiones.
- 🤖 **Desarrollo:** se puede hacer con acceso delegado.

Nada de esto se ha ejecutado aún en remoto.

## 1. Cuentas y servicios (🧑)
- [ ] **Supabase:**
  - proyecto `reboard`, región UE (por ejemplo, Fráncfort o París), plan gratuito;
  - guardar en un gestor de contraseñas la URL, la clave anon/publishable, la clave service role y la contraseña de la base de datos.
- [ ] **Cloudflare Turnstile** (gratuito):
  - un widget para `reboard.es` (y el dominio de Vercel mientras se prueba);
  - anotar la *site key* y la *secret key*.
- [ ] **Resend:** cuenta y dominio `reboard.es` verificado (SPF y DKIM en el DNS); crear la API key.
- [ ] **Vercel:**
  - proyecto conectado al repositorio;
  - *Install Command*: `npx -y npm@11.6.2 ci`. Con npm 10, el que trae Node 22, `npm ci` falla con «Missing: @emnapi/… from lock file». Es la misma razón por la que el CI usa npm 11.6.2.
  - ⚠️ **el plan Hobby no permite uso comercial**: para un marketplace con actividad económica hace falta **Pro**. Decisión del titular.
- [ ] **Dominio** `reboard.es`, apuntado a Vercel.

## 2. Base de datos remota (B7, 🤖 con la autorización del titular)
1. `npx supabase login` y `npx supabase link --project-ref <ref>`.
2. `npx supabase db push`, que aplica las migraciones de `supabase/migrations`. Revisa antes el plan (`db push --dry-run`).
3. `npx supabase test db --linked` y comprobar que pasan los tests pgTAP contra el remoto. **Solo antes de abrir al público**: los tests crean y borran datos dentro de una transacción.
4. **No cargar datos DEMO.** El catálogo real (marcas, modelos, medidas) se carga verificado contra las tablas del fabricante, con `source_note` (G2).
5. **Copias:** antes de cada migración futura, `npx supabase db dump`.

## 3. Configuración de Supabase remoto (🧑 o 🤖 en el panel)
- [ ] **Authentication → URL Configuration:** *Site URL* `https://reboard.es` y la redirección `https://reboard.es/auth/confirm`.
- [ ] **Authentication → Email Templates:** pegar `supabase/templates/codigo.html` en *Magic Link* y en *Confirm signup*, con el asunto «Tu código de Reboard».
- [ ] **Authentication → SMTP Settings (Resend):**
  - host `smtp.resend.com`, puerto 465, usuario `resend` y, como contraseña, la API key;
  - remitente `no-responder@reboard.es`.
- [ ] **Authentication → Rate Limits:** emails por hora ~30.
- [ ] **Authentication → Attack Protection:** activar el CAPTCHA con Turnstile y su *secret key*.
- [ ] **Authentication → Providers → Email:** sin confirmación por enlace (se usa el código) y OTP de 900 s.
- [ ] **Moderador inicial:** `update public.profiles set role = 'admin' where id = '<uuid>';` (SQL Editor).

## 4. Variables de entorno en Vercel (🧑 o 🤖)
| Variable | Production | Preview | Notas |
|---|---|---|---|
| `REBOARD_DATA_SOURCE` | `supabase` | `mock` | Los Preview nunca tocan la base de datos real |
| `NEXT_PUBLIC_SITE_URL` | `https://reboard.es` | — | |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | — | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon o publishable | — | Pública (va bajo RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service role | — | **Secreta.** Solo servidor |
| `CONTACT_IP_SALT` | cadena aleatoria ≥ 32 caracteres | — | **Secreta.** `openssl rand -hex 32` |
| `CRON_SECRET` | cadena aleatoria ≥ 32 caracteres | — | **Secreta.** Vercel la envía al cron |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key | — | Pública |
| `TURNSTILE_SECRET_KEY` | secret key | — | **Secreta** |

- [ ] **Región de las funciones:** la misma que la de Supabase (`regions` en `vercel.json`: `fra1` para Fráncfort, `cdg1` para París).
- [ ] **Cron:** `vercel.json` ya declara `/api/cron/expirar` a diario. Comprobar que aparece en *Settings → Cron Jobs*.

## 5. Antes de abrir (🤖 + 🧑)
- [ ] **Textos legales revisados por un profesional**, con los datos del titular (`src/lib/content/legal.ts`). Quitar el aviso de borrador y el `noindex` de `/legal/*`.
- [ ] Sin banner DEMO y `robots.txt` con indexación activa (`isDemo = false` en producción).
- [ ] La lista de SECURITY.md §9 completa.
- [ ] **Prueba de humo en producción con un email real:**
  - entrar con el código;
  - publicar con 2 fotos y verlo en `/buscar`;
  - revelar el contacto desde otro dispositivo;
  - marcar la tabla como vendida;
  - reportar el anuncio y retirarlo desde `/moderacion`;
  - borrar la cuenta de prueba.
- [ ] Cabeceras: `curl -I https://reboard.es` muestra CSP, HSTS, X-Frame-Options y nosniff.
- [ ] Search Console: verificar el dominio y enviar `sitemap.xml`.

## 6. Después del lanzamiento
- Revisar a diario la cola de `/moderacion` y los registros del cron (`/api/cron/expirar`).
- Decidir el plazo de conservación del registro de contactos y de los anuncios vendidos o caducados (pendiente en la política de privacidad).
- Analítica: no hay ninguna. Si se añade, que no use cookies (o que pida consentimiento) y se describe antes en la política de cookies.
