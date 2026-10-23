# Panel de administración

`/admin` es un panel privado para gestionar Reboard sin entrar en el dashboard de Supabase ni tocar código: usuarios, anuncios, reportes, marcas y modelos, tiendas, alertas, configuración y auditoría. Trabaja con los datos reales: no hay datos de ejemplo ni métricas inventadas.

## Arquitectura

```
Navegador ──► proxy.ts ──► /admin (layout + páginas, Server Components)
               │ refresca la sesión          │ requireAdminPage(): rol y MFA en la base de datos
               │ y pide entrar               ▼
               │                 Server Actions ("use server")
               │                   requireAdminAction() + zod
               │                             ▼
               └──────────────► Supabase (cliente con la SESIÓN del usuario)
                                  RLS (is_admin / is_moderator)
                                  funciones SECURITY DEFINER admin_*  ──► admin_audit_log
                                  service role SOLO para la API de Auth (suspender el acceso)
```

- **La base de datos es la barrera de seguridad.** El proxy solo pide entrar. Las páginas comprueban el permiso para decidir qué mostrar. Cada consulta pasa por RLS y cada acción por una función que vuelve a comprobar `is_admin()` en la base de datos. Ocultar un botón no concede ni quita nada.
- **Sin service role en el navegador.** En el servidor solo se usa para la API de administración de Auth (bloquear o desbloquear el acceso al suspender), siempre después de comprobar el permiso y de que la función de la base de datos haya aceptado la acción.
- **Cada acción sensible deja rastro en la misma transacción** (`admin_audit_log`). Si la auditoría falla, la acción no se aplica.
- **Sin consultas N+1:** listados paginados en SQL (`range`, `count`, funciones con `limit/offset`). Los emails de varios usuarios se resuelven en una sola llamada (`admin_user_emails`).
- **Sin indexación:** `/admin` y sus subrutas llevan `noindex, nofollow, nocache` y están en `robots.txt` (`Disallow: /admin`).
- **Interfaz propia:** el panel oculta la cabecera, el pie y la bandeja de comparar del marketplace (`SiteChrome`). Tiene barra lateral en escritorio y menú deslizante en móvil (< 1024 px).

## Roles y permisos

| Rol (`profiles.role`) | Qué puede hacer |
|---|---|
| `user` | Usar el marketplace. Ningún acceso a `/admin` ni a `/moderacion` |
| `moderator` | `/moderacion`: ocultar, retirar y restaurar anuncios, y descartar o resolver reportes |
| `admin` | Todo el panel `/admin`, incluido cambiar roles, suspender cuentas, el catálogo, las tiendas y la configuración |

- **El rol de la aplicación vive en `public.profiles.role`, no en `user_metadata`**, que el usuario puede editar. Nada tiene que ver con el rol `service_role` de Supabase. El cliente no puede leer ni escribir esa columna (privilegios por columna, comprobado en pgTAP).
- **`admin_status()`** devuelve `none`, `needs_mfa` o `admin`. Es `admin` solo si se cumplen las tres condiciones:
  - rol `admin`;
  - cuenta no suspendida;
  - sesión con segundo factor (`aal2`), si el admin tiene un factor verificado o si la configuración lo exige a todos (`admin_mfa_required`).
- **`is_admin()`** es `admin_status() = 'admin'`. Lo usan las políticas RLS y todas las funciones `admin_*`.
- **Cambiar un rol** solo es posible con `admin_set_role` (motivo obligatorio y auditoría).
  - Nadie puede cambiar su propio rol.
  - Un disparador impide quedarse sin administradores activos: degradar, suspender o borrar la cuenta del último admin falla con `last_admin`.
  - La service role (scripts de recuperación) puede cambiar roles sin esa comprobación.
- **Revocación:** el rol se lee en cada consulta, así que quitar el rol, o suspender a un admin, tiene efecto en la siguiente petición, sin esperar a que caduque la sesión.
- **Cerrar sesión:** «Cerrar sesión» en la barra lateral (Supabase Auth, `signOut`).
- **No existe registro de administradores.** El primer admin se asigna con el procedimiento de abajo; el resto, desde `/admin/usuarios/[id]`.

### MFA (segundo factor)

- **Activarlo:** en `/admin/seguridad` cada admin añade una app de autenticación (TOTP, Supabase Auth MFA). Desde ese momento la base de datos le exige sesión `aal2`: sin el código no entra al panel.
- **Exigirlo a todos:** `/admin/configuracion` → «Exigir segundo factor». Solo se puede activar desde una sesión que ya tenga MFA, para no dejar fuera a quien lo activa.
- **Si un admin pierde el móvil:** otro admin le retira el rol y se lo vuelve a dar cuando configure un factor nuevo. Si solo hay un admin, se recupera con la service role (SQL Editor de Supabase).
- **Recomendación:** activarlo en cuanto se asigne el primer admin y exigirlo cuando haya al menos dos administradores con factor.

## Rutas

| Ruta | Para qué |
|---|---|
| `/admin` | Panel: usuarios (totales, nuevos, suspendidos), anuncios (activos, nuevos, en revisión, ocultos, vendidos), reportes y tiendas pendientes, y gráficos por día **solo si hay datos**. Las alertas no se cuentan: viven en el navegador |
| `/admin/usuarios`, `/admin/usuarios/[id]` | Listado paginado con búsqueda por email o ID; detalle con sus anuncios e historial; suspender (motivo y, opcionalmente, ocultar sus anuncios), reactivar y cambiar el rol |
| `/admin/anuncios`, `/admin/anuncios/[id]` | Listado con filtros (estado, moderación, tipo, zona, fecha, vendedor) y búsqueda (ID, marca, slug); ficha con fotos, datos técnicos y su origen, vendedor, reportes e historial; ocultar, restaurar, retirar por incumplimiento, marcar vendido y editar textos con motivo (**las medidas no se editan**) |
| `/admin/reportes` | Reportes por anuncio y por estado; resolver, descartar, ocultar o retirar; enlace al vendedor para suspenderlo |
| `/admin/catalogo` | Marcas: crear, editar, slug, logo (solo con derechos), activa o inactiva, alias, **destacadas y su orden en el formulario de publicación** y fusión de duplicados. Modelos: crear, editar, tipo, construcción, medidas, fuente, verificación y avisos de duplicados |
| `/admin/tiendas` | Tiendas y escuelas: datos públicos, estado (pendiente, aprobada, rechazada, suspendida) con motivo, y anuncios asociados |
| `/admin/alertas` | Explica por qué no hay datos: las alertas se guardan solo en el navegador de cada usuario |
| `/admin/configuracion` | Aviso informativo de la web, umbral de reportes, límite diario de reportes y exigir MFA. **No muestra ni guarda claves** (Supabase, Turnstile, Resend): viven solo en Vercel |
| `/admin/auditoria` | Registro de acciones administrativas con filtros |
| `/admin/seguridad` | Segundo factor del admin actual |
| `/moderacion` | Cola de moderación para moderadores. Usa las mismas funciones `admin_moderate_listing` con la sesión del moderador (ya no la service role). Los moderadores pueden ocultar, retirar y restaurar, pero no marcar como vendido |
| `/api/aviso` | Aviso de la web (público, JSON) para la banda del marketplace |

## Modelo de datos y migraciones

Todas las migraciones son aditivas: no borran filas ni columnas, y las columnas nuevas tienen valor por defecto.

| Migración | Contenido |
|---|---|
| `20261025090000_report_reason_photos` | Motivo de reporte `fotos` («Fotografías que no corresponden») |
| `20261025090100_admin_panel` | Ver el detalle debajo |
| `20261025090200_admin_user_emails` | Emails de varios usuarios en una sola llamada (solo admin) |
| `20261025090300_admin_guard_service_role` | La service role puede cambiar roles sin la protección del último admin (vía de recuperación) |

**Contenido de `20261025090100_admin_panel`:**
- **`app_settings`:** aviso, umbral y límite de reportes, y MFA obligatorio.
- **Suspensión en `profiles`:** `suspended_at`, `suspension_reason` y `suspended_by`.
- **Funciones de permisos:** `admin_status`, `is_admin` e `is_suspended`; `is_moderator` excluye ahora las cuentas suspendidas.
- **Protección del último admin:** un disparador.
- **`admin_audit_log`:** solo inserción; ni siquiera `postgres` puede modificarla o borrarla.
- **Marcas:** `active`, `featured`, `sort_order`, `aliases` y `merged_into`. Las 12 habituales quedan como destacadas.
- **Modelos:** `active` y `verification`; verificar exige fuente.
- **Tiendas:** `status` y la revisión.
- **Moderación:** nuevas acciones (`hide`, `resolve_reports`, `mark_sold`, `edit`).
- **Reportes:** umbral configurable y controles contra el abuso (no reportar lo propio y un límite diario).
- **RLS para los usuarios suspendidos:** no publican, no editan, no reportan y no suben fotos a Storage.
- **Políticas de escritura** del catálogo y las tiendas (solo admin), con auditoría automática.
- **Funciones `admin_*`:** métricas, usuarios, rol, suspensión, moderación, edición, fusión, verificación, tiendas y configuración.

**Decisiones:**
- **Ocultar y retirar** usan el estado existente `moderation = 'removed'`, de modo que la búsqueda, las facetas, los índices y la visibilidad pública no cambian. La diferencia (temporal o por incumplimiento) se guarda en `moderation_actions`. **Ninguna acción borra fotos ni datos del vendedor.** Antes, «Retirar» borraba las fotos de Storage.
- **No se borran anuncios desde el panel.** Lo único que se elimina físicamente es lo que borra el propio vendedor.
- **Una marca fusionada** queda inactiva, con `merged_into`, en lugar de borrarse; sus anuncios y modelos pasan a la buena y su nombre a los alias.
- **El selector de publicar** solo ofrece modelos verificados. Un modelo sin verificar no aparece como «Según fabricante».

**Revertir** (solo en local o antes de usarlo en producción):
- quitar las funciones `admin_*`, `admin_status`, `is_admin`, `is_suspended` y `setting_*`;
- quitar los disparadores nuevos;
- devolver las políticas originales (`20261022120200_rls.sql`, `20261022120300_storage.sql`);
- quitar las tablas `app_settings` y `admin_audit_log` y las columnas añadidas.

El valor `fotos` de `report_reason` no se puede quitar de un enum: se deja sin usar.

## Primer administrador

No hay registro de administradores ni asignación automática: ni al primer usuario ni por dominio de correo. El procedimiento es seguro e idempotente:
- se indica explícitamente el usuario, por UUID o por email ya verificado;
- si ya es admin, no cambia nada;
- queda en la auditoría como `grant_admin_bootstrap`.

1. La persona entra una vez en la web con su email (`/entrar`), para que exista su cuenta verificada.
2. **En desarrollo** (Supabase local, con `.env.local`):
   ```
   npm run admin:grant -- --email tu@correo.es            # simulación: muestra qué haría
   npm run admin:grant -- --email tu@correo.es --confirm  # lo aplica
   ```
3. **En producción**, elige una opción:
   - **Script desde tu terminal:**
     ```
     SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave> \
       node scripts/grant-admin.mjs --email tu@correo.es --remote <ref> --confirm
     ```
     Pon la clave solo en tu terminal: nunca en el repositorio ni en un chat. El script se niega a trabajar con una URL remota sin `--remote <ref>` coincidente.
   - **SQL Editor de Supabase:**
     ```sql
     update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'tu@correo.es' and email_confirmed_at is not null);
     ```
4. Entra en `/admin/seguridad` y activa el segundo factor.

## Configuración necesaria en Supabase (producción)

- **Migraciones:** `npx supabase db push`, que incluye las cuatro de esta tabla (ver `docs/PRODUCTION_SETUP.md`).
- **Authentication → Multi-Factor:** activar **TOTP** (enroll y verify). En local ya está en `supabase/config.toml`.
- **Variables:** nada nuevo en Vercel. `SUPABASE_SERVICE_ROLE_KEY` ya existe y solo se usa en el servidor.
- **Después del primer admin:** activar su segundo factor y, con dos admins, exigirlo a todos desde `/admin/configuracion`.

## Tests

| Nivel | Archivo | Qué comprueba |
|---|---|---|
| Base de datos (pgTAP) | `supabase/tests/database/07_admin.test.sql` | Para anónimo, usuario normal y admin: acceso a funciones y datos de admin; rol propio; último admin; revocación inmediata; MFA (`needs_mfa`/`aal2`); suspensión (también Storage); moderación sin borrado; edición sin medidas; auditoría inmutable y con valores antes/después; reportes (propios, límite diario, motivo `fotos`); fusión de marcas; tiendas pendientes ocultas |
| Integración (sesiones reales) | `tests/integration/admin.test.ts` | Lo mismo desde la API REST de Supabase con usuarios que entran con código, más subidas a Storage ajenas y la auditoría con service role |
| E2E (navegador real) | `tests/e2e-admin/admin.spec.ts` (`npm run test:e2e:admin`, escritorio y móvil) | Anónimo redirigido a entrar; usuario normal con 404; admin navega por todas las secciones sin errores; `noindex`; teclado; menú móvil; revocación en la siguiente petición |
| Unitarios | `tests/unit/admin-*.test.ts` | Utilidades del panel |

Los E2E y los de integración necesitan Supabase local (`npm run db:start`) y **no tocan producción**: se niegan a ejecutarse contra una URL que no sea local.

## Notas de implementación

- **Aviso de la web:** se sirve desde `/api/aviso`, que el navegador pide al cargar la página, y no se lee en el layout raíz.
  - Leer cualquier dato en el layout raíz, aunque esté cacheado, rompía la regeneración en segundo plano de todas las páginas prerenderizadas tras invalidar una caché (`/tablas`, `/legal`, `/anuncio`…). Lo detectaron los E2E del panel.
  - El navegador no guarda copia y la CDN la guarda 60 s, así que un cambio en `/admin/configuracion` tarda como mucho un minuto en verse.
- **El panel usa `connection()`:** todo depende de la petición (sesión, hora) y nada se prerenderiza.
- **Sin base de datos, `/admin` responde con un 404 real** desde el proxy.
- **Cabecera y pie del marketplace:** en `/admin` se ocultan con CSS (`body:has([data-admin-shell])`), sin `usePathname`, para que la cabecera siga en el HTML estático de las páginas públicas.
- **Auditoría del bloqueo de acceso:** al suspender o reactivar se registran también `ban` y `unban`. Si la API de Auth falla, se registra `ban_failed` o `unban_failed` y el panel ofrece reintentar.
- **Reactivar** no restaura los anuncios ocultos: se restauran uno a uno desde Anuncios.
- **Catálogo:** las ediciones no piden motivo, porque cada escritura es una transacción aparte. La auditoría automática guarda los valores antes y después.

## Estado en producción (23-10-2026)

- **Migraciones:** las 15 aplicadas con `supabase db push`. Los 185 tests pgTAP pasan contra producción y no dejan datos.
- **Base de datos limpia:** 0 usuarios de prueba y 0 anuncios. Datos de referencia: 9 zonas, 30 marcas (12 destacadas) y 4 ajustes.
- **Primer administrador:** `iyiarce@gmail.com`, asignado por petición del titular y registrado en la auditoría (`grant_admin_bootstrap`).
- **Conexión para migraciones:** `.env.remote` local (no versionado ni cargado por Next). Las claves de la app van solo en Vercel.

## Riesgos y pendientes

- **Fotos de anuncios ocultos:** el bucket es público para que la web las sirva. Al ocultar un anuncio, sus fotos dejan de enlazarse, pero quien tenga ya la URL exacta (UUID) puede seguir viéndolas. No se borran para no destruir datos del vendedor. Si hiciera falta, se podría añadir una acción explícita de «borrar fotos», con auditoría.
- **Sesión de un usuario suspendido:** el bloqueo de acceso (ban de Auth) impide renovar la sesión. Hasta que caduque el token actual (1 h), la RLS ya le impide publicar, editar, subir fotos y reportar.
- **Alertas:** no hay datos en el servidor. Medirlas exige guardarlas en la base de datos con consentimiento explícito para avisos por email.
- **Mensajes y ventas:** no se miden. Solo se cuentan los anuncios marcados como vendidos.
- **Moderadores con MFA:** el MFA obligatorio se aplica a los admins. Para los moderadores es recomendable, pero no se exige.
- **E2E en CI:** desactivados hasta tener Supabase en CI (decisión del titular).
