# REBOARD: auditoría de preparación para el lanzamiento

**Fecha:** 23-10-2026.
**Código auditado:** rama `main`, commit `d9d49ef`.
**Entorno público:** https://reboard-gamma.vercel.app (Vercel + Supabase de producción).
**Autoría:** auditoría técnica, funcional y operativa realizada por Claude Code a petición del titular. Sin cambios en el código, sin commits, sin despliegues y sin escrituras en la base de datos de producción.

> **Cómo leer este documento**
> Está pensado para alguien que no tiene acceso al repositorio. Cada afirmación indica de dónde sale:
> - **[PROD]:** comprobado hoy contra producción, solo con lecturas.
> - **[LOCAL]:** comprobado con pruebas automáticas o en un navegador contra Supabase local (Docker), con datos de prueba.
> - **[CÓDIGO]:** deducido de leer el código; no se ha ejecutado.
> - **NO VERIFICADO:** no hay evidencia de que funcione en ese entorno.
>
> Que algo funcione en local **no** garantiza que funcione en producción.

---

## 0. Resumen ejecutivo

**Qué es Reboard:** un marketplace de tablas de surf de segunda mano en España. Sin pagos, sin envíos, sin chat y sin comisiones: el comprador ve la ficha y contacta por WhatsApp o teléfono con el vendedor.

**Estado general:** el producto está **completo y bien probado en local**.
- Tiene:
  - buscador con filtros;
  - fichas de anuncio;
  - publicación en 5 pasos con fotos;
  - panel del vendedor;
  - contacto protegido;
  - guardados, alertas y comparador;
  - TablaFinder (calculadora de litros);
  - moderación;
  - panel de administración completo;
  - SEO técnico.
- La seguridad de la base de datos es sólida: hay control de acceso por filas en todas las tablas y 190 tests de seguridad que pasan **también contra la base de datos de producción**.

**Producción está desplegada y configurada, pero vacía y sin probar con un usuario real:**
- 0 anuncios, 1 usuario (el titular, administrador), 30 marcas y 0 modelos de catálogo.
- Las 16 migraciones están aplicadas y no queda ninguna pendiente.
- Todas las páginas responden, con HTTPS, cabeceras de seguridad y `noindex` intencionado.

**Lo que bloquea aceptar vendedores reales:**
1. **Los correos de acceso.** El acceso es por código enviado por email, y hoy los correos salen por el servidor por defecto de Supabase, que solo envía a los miembros de la organización. **Un vendedor externo no recibiría el código y no podría entrar.**
   - Hace falta el dominio `reboard.es` (comprado, pero aún no activo en el registro de los .es) y Resend configurado como SMTP.
2. **La prueba real en producción** de publicar, editar, vender y retirar un anuncio. No se ha hecho nunca en producción.
3. **Una redirección abierta** en el parámetro `?siguiente=` (riesgo de phishing). Se arregla en minutos.
4. **Los datos legales obligatorios del aviso legal** (razón social y datos registrales), que aún aparecen entre corchetes.

**Decisión:**
- **CONDITIONAL GO** para una **beta cerrada** con vendedores conocidos, en cuanto se cumplan esas 4 condiciones.
- **NO-GO** para un **lanzamiento público abierto** hasta cerrar también los P1 de seguridad (§8): publicar sin pasar por la web y la cuota de fotos.

**Nota global: 7/10.** La ingeniería está muy por encima de un MVP típico. Lo que falta es sobre todo configuración externa, verificación en producción y algunos cierres de seguridad concretos.

---

## 1. Contexto técnico

| Pieza | Qué es | Estado |
|---|---|---|
| Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`) | La web | Desplegada en Vercel, región Dublín (`dub1`) |
| Supabase Postgres | Base de datos con RLS (control de acceso por filas) | Proyecto `ogatmhplmnfetcgdtdge`, región eu-west-1 (Irlanda) |
| Supabase Auth | Acceso por código de 6 cifras por email; contraseña opcional; Google y Apple preparados pero desactivados | Solo el proveedor email está activo [PROD] |
| Supabase Storage | Fotos de anuncios (bucket `listing-photos`) | Creado por migración; sus políticas están cubiertas por tests pgTAP en producción |
| Cloudflare Turnstile | CAPTCHA en el acceso, al revelar el contacto, al publicar y al reportar | Widget visible en `/entrar` [PROD] |
| Correo transaccional | Solo el código de acceso | Pendiente: Resend + dominio (ver P0) |
| Vercel Cron | Caducidad diaria de anuncios (`/api/cron/expirar`, 04:15) | Declarado en `vercel.json`; ejecución NO VERIFICADA |

**Tamaño del código:**
- 46 páginas o endpoints;
- 9 archivos de Server Actions;
- 16 migraciones SQL;
- 203 tests unitarios, 78 de integración, 190 de base de datos (pgTAP), 70 e2e generales y 14 e2e del panel de administración.

---

## 2. Tests y calidad (ejecutados hoy)

Todos se ejecutaron en el equipo del titular, el 23-10-2026, contra el commit `d9d49ef`.

| Comando | Entorno | Resultado | Notas |
|---|---|---|---|
| `npm run typecheck` | — | ✅ 0 errores | |
| `npm run lint` | — | ✅ 0 errores, 4 avisos | 2 `alt` en `src/components/brand/Photo.tsx` (componente de imagen con `alt` por props) y 2 variables sin usar en un test |
| `npm test` (Vitest) | — | ✅ **203/203** (16 archivos) | Filtros, recomendador, seguridad de auth, Turnstile, cron, admin, proveedores OAuth… |
| `npm run test:integration` | Supabase local | ✅ **78/78** (5 archivos) | Publicar, cuentas, contacto y moderación, admin, paridad del repositorio |
| `npm run db:test` (pgTAP) | Supabase local | ✅ **190/190** (8 archivos) | RLS, privilegios, Storage, búsqueda, admin, perfil OAuth |
| `supabase test db --db-url <prod>` | **Producción** | ✅ **190/190** | Ejecutado hoy tras aplicar la última migración. Cada test corre en una transacción que se deshace: no deja datos |
| `npm run db:lint` | Supabase local | ✅ sin errores | 2 avisos de tipo (`text` → `jsonb`) en `admin_update_listing`, inofensivos |
| `npm run build` | — | ✅ compila | 331 páginas estáticas o parciales generadas |
| `playwright --project=e2e` (1.ª pasada) | Supabase local **vacío** | ❌ 53 ✅ / 17 ❌ | Los tests de integración vacían la base local al limpiar; los e2e necesitan el inventario de demostración |
| `playwright --project=e2e` (2.ª pasada, con `db:seed-demo`) | Supabase local con 101 anuncios demo | ⚠️ **60 ✅ / 10 ❌** | Los 10 fallos son **tests desfasados**, no fallos del producto (ver abajo) |
| `npm run test:e2e:admin` | Supabase local | ✅ **14/14** | Acceso denegado a anónimos y a usuarios normales (404), navegación del admin, ocultar un anuncio con auditoría, aviso global, revocación de rol |
| `npm audit --omit=dev` | — | ✅ 0 vulnerabilidades | |
| Pruebas visuales (`--project=visual`) | — | ⏭ omitidas | Dependen del sistema operativo y de las fuentes; solo se usan para comparar antes y después |
| Rendimiento con 10.000 anuncios (`perf:local`) | — | ⏭ omitido hoy | Último resultado documentado: p95 < 160 ms con 10.000 anuncios, sin caché (`docs/ROADMAP.md`, C6) |

**Los 10 e2e que fallan, y por qué:**
- `routes.spec.ts`, 4 fallos (`/anuncio/…-a1040`, redirección 308 al slug canónico, JSON-LD de la ficha): buscan el anuncio `a1040` del antiguo inventario simulado. En la base de datos los ids son otros.
- `routes.spec.ts`, `/panel` espera 200: ahora `/panel` exige sesión y redirige (307), que es lo correcto.
- `flows.spec.ts`, «publicar» (escritorio y móvil): esperan el modo demo («no se publica nada», «Terminar la prueba»). Con base de datos, el flujo es real.
- `flows.spec.ts`, «home» («Buscar 27 tablas»), «comparador», «ficha: contacto» e «hidratación»: dependen de recuentos e ids del antiguo inventario.

**Conclusión de los tests:**
- La lógica, la base de datos, la seguridad y el admin tienen buena cobertura automática.
- Los **e2e generales hay que adaptarlos** a los datos reales. Hoy no protegen los recorridos de ficha, contacto, comparador y publicar.
- Esos recorridos se verificaron a mano en un navegador contra Supabase local el 23-10 (`docs/BETA_AUDIT.md`).
- Los e2e no se ejecutan en CI, por decisión del titular, hasta tener un Supabase en CI.

---

## 3. Inventario de funcionalidades

Estados posibles:
- ✅ **Funcional y verificada**;
- 🔵 **Implementada pero no verificada** (en ese entorno);
- 🟡 **Parcialmente implementada**;
- ⚪ **No implementada**;
- 🔒 **Bloqueada por configuración externa**.

| Funcionalidad | Local | Producción | Evidencia y notas |
|---|---|---|---|
| **Home y navegación** | ✅ | ✅ (vacía) | Sin errores de consola a 390 y 1440 px [PROD]; 27 enlaces internos sin ningún 404 [PROD]. Con 0 anuncios, las tarjetas de tipo y de zona llevan siempre al mismo estado vacío |
| **Buscador y filtros** (litros, medidas, tipo, precio, zona, marca, estado…) | ✅ | 🔵 solo el estado vacío | Búsqueda en SQL (`search_listings`, `listing_facets`); paridad con la lógica de referencia en 78 tests de integración; pgTAP `05_search_facets`; e2e de filtros en verde con datos demo |
| **Landings `/tablas/[tipo\|zona]`** | ✅ | ✅ (vacías) | 200 con estado vacío y CTA [PROD]; 404 real para tipos o zonas inexistentes [PROD] |
| **Ficha de anuncio** | ✅ | 🔵 NO VERIFICADA (no hay anuncios) | Galería, tabla de medidas con el origen del dato, similares y JSON-LD Product/Offer [LOCAL]. Las URLs de vendidas y caducadas se mantienen con su aviso |
| **Contacto comprador → vendedor** | ✅ | 🔵 NO VERIFICADA | El teléfono nunca va en el HTML. Solo se obtiene con «Mostrar contacto»: Turnstile + HMAC de la IP + 30 por hora por IP, y abre WhatsApp o una llamada. Tests: `contact-moderation.test.ts` [LOCAL] |
| **Publicar** (5 pasos: fotos → tabla → estado → precio y zona → revisar y entrar) | ✅ | 🔒 NO VERIFICADA | Probado en un navegador a 1440 y 390 px contra Supabase local, con fotos reales en Storage (`docs/BETA_AUDIT.md`); `publish.test.ts`. En producción, un vendedor externo no puede recibir el código de acceso (ver P0-1) |
| **Editar, confirmar, bajar precio, marcar vendida, retirar, eliminar** | ✅ | 🔵 NO VERIFICADA | `/panel` y `/vender/publicar?editar=`; disparador `listings_guard` para las transiciones de estado [LOCAL] |
| **Fotos y almacenamiento** | ✅ | 🔵 parcial | Recodificación en el navegador (WebP, sin EXIF ni GPS), subida directa a Storage y comprobación de la ruta en el servidor. Las políticas de Storage pasan pgTAP en producción. Ninguna subida real hecha en producción |
| **Caducidad automática** (confirmar cada 14 días, caduca a los 30) | ✅ | 🔵 NO VERIFICADA | Cron en `vercel.json` y test unitario `cron-route.test.ts`. **No hay ningún email que avise al vendedor antes de que caduque** (ver P1) |
| **Acceso por código de email (OTP)** | ✅ (Mailpit) | 🔒 | En producción los correos salen por el SMTP por defecto de Supabase, que **solo envía a miembros de la organización** |
| **Acceso con contraseña** | ✅ | ✅ (titular) | El titular entró así al admin en producción (sesión anterior). Solo sirve a quien ya tiene contraseña (el admin) |
| **Google y Apple** | 🔵 (botones y redirección probados; sin proveedor real) | 🔒 desactivados | `auth/v1/settings`: `google:false`, `apple:false` [PROD]. Guía en `docs/PRODUCTION_SETUP.md` §3b |
| **Cuenta y perfil** (`/cuenta`: nombre visible, resumen, cerrar sesión, borrar cuenta) | ✅ | ✅ parcial (el titular ha visto la página) | Rediseñado el 23-10. Borrar la cuenta elimina perfil, anuncios, fotos, teléfono, guardadas y reportes |
| **Guardados (favoritos)** | ✅ | 🔵 NO VERIFICADA | Sin cuenta, en el dispositivo; con cuenta, en la base de datos (tabla `favorites`) y fusionados al entrar |
| **Alertas** | 🟡 | 🟡 | **Solo se guardan en el dispositivo.** Ningún email ni push avisa de tablas nuevas. La interfaz lo dice («Se guardan en este dispositivo») |
| **TablaFinder** (`/calculadora-litros`) | ✅ | ✅ | 7 pasos, recomendación de litros (más de 10.000 combinaciones probadas en tests) y búsqueda de tablas compatibles. El perfil solo se guarda en el dispositivo (`rb-asistente-v1`) |
| **Comparador** | ✅ | 🔵 sin anuncios que comparar | Hasta 4 tablas, con las diferencias resaltadas [LOCAL] |
| **Catálogo de marcas y modelos** | 🟡 | 🟡 | 30 marcas de referencia (solo nombres). **0 modelos y 0 medidas de fabricante en producción**, así que `/marcas/*` da 404 y no hay medidas «según fabricante». No existe la página índice `/marcas`. El admin permite crear modelos |
| **Tiendas y escuelas** | 🟡 | 🟡 | Solo un admin puede darlas de alta (`/admin/tiendas`); no hay alta pública («aún no está abierta»). 0 tiendas en producción |
| **Panel de administración** (`/admin`) | ✅ | ✅ parcial | e2e admin 14/14 [LOCAL]. El titular accede en producción con su rol admin. Secciones: panel, reportes, anuncios, usuarios, tiendas, alertas, catálogo, configuración, auditoría y segundo factor. **El segundo factor (TOTP) no está activado** |
| **Reportes y moderación** | ✅ | 🔵 NO VERIFICADA | Reportar exige sesión y Turnstile; 1 reporte por persona y anuncio; 10 al día; marcado automático al llegar al umbral; cola en `/moderacion` y `/admin/reportes` con auditoría |
| **Emails transaccionales** | 🟡 | 🔒 | Solo existe el email con el código de acceso (plantilla en español, `supabase/templates/codigo.html`). No hay avisos de caducidad, alertas, contacto recibido ni bienvenida |
| **SEO técnico** | ✅ | ✅ en modo «no indexar» | Ver §6 |
| **Analítica** | ⚪ | ⚪ | No hay ninguna, por decisión: tampoco cookies de terceros. Sí existe la estadística de «clics en contactar» por anuncio, en el panel del vendedor |
| **Páginas legales** | 🟡 | 🟡 | `/legal/{aviso-legal,privacidad,cookies,condiciones}` con el NIF, el domicilio y el email del titular. Quedan **placeholders visibles** (razón social, Registro Mercantil, bases jurídicas, plazos de conservación, AEPD…). Sin revisión profesional |
| **Accesibilidad** | 🟡 verificada en parte | 🟡 | Foco visible de 2 px, «Saltar al contenido», `aria-live`, `aria-checked` en el asistente; ninguna imagen sin `alt` [PROD]. Entre 0 y 2 áreas táctiles de menos de 44 px por página [PROD]. **No probado:** lectores de pantalla reales ni zoom al 200–400 % |
| **Responsive** | ✅ | ✅ | Sin scroll horizontal a 390 px [PROD]; capturas a 390 y 1440 px de todas las pantallas clave |

---

## 4. Seguridad

**Alcance:**
- revisión de lectura de las 16 migraciones, `proxy.ts`, las 9 Server Actions, los 6 endpoints, los clientes de Supabase, Storage, Turnstile, `next.config.ts` y el CI;
- comprobaciones solo de lectura en producción.

No se ha hecho ninguna prueba destructiva contra producción.

### 4.1 Lo que está bien hecho (verificado)

- **RLS en las 15 tablas.**
  - Se revoca todo a los roles públicos y después se concede columna a columna.
  - Un usuario no puede leer ni cambiar su `role`, su suspensión ni el estado de moderación de sus anuncios.
  - Las transiciones de estado de los anuncios las impone un disparador en la base de datos.
- **Teléfonos protegidos:**
  - la tabla `listing_contacts` no es legible por anónimos;
  - el teléfono solo sale por la función `reveal_contact`, que solo puede ejecutar el servidor con la clave privada, tras Turnstile y con límite por IP.
- **Server Actions:**
  - todas comprueban la sesión con `auth.getUser()` (nunca `getSession()`) y validan la entrada con zod;
  - la clave de servicio de Supabase solo se usa en el servidor y después de comprobar el CAPTCHA, la sesión o el rol.
- **Panel de administración:**
  - permiso comprobado en el servidor **y** en la base de datos (`is_admin()`);
  - 404 para quien no es admin, sin revelar que el panel existe;
  - registro de auditoría inmutable;
  - protección del último admin;
  - la revocación del rol se aplica en la siguiente petición (probado en e2e).
- **Turnstile** falla cerrado: sin clave, con error o con timeout, se rechaza la acción.
- **Cron** protegido con secreto y comparación en tiempo constante.
- **Cabeceras de seguridad en producción:**
  - CSP con `frame-ancestors 'none'`, `object-src 'none'` y `form-action 'self'`;
  - HSTS de 2 años, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy` [PROD].
- **Secretos:**
  - ningún secreto en git;
  - ninguna variable secreta con prefijo `NEXT_PUBLIC_`;
  - el CI falla si aparece un secreto en el bundle del navegador.
- **Dependencias:** `npm audit`, 0 vulnerabilidades.

### 4.2 Hallazgos

No hay ningún hallazgo **crítico** ni **alto**.

| # | Severidad | Hallazgo | Escenario | Arreglo propuesto | Prioridad |
|---|---|---|---|---|---|
| S1 | **Media** (confirmada y reproducida) | **Redirección abierta en `safeNext`** (`src/lib/auth/shared.ts:4-7`). Solo rechaza `//` y `/\`, pero el navegador ignora tabuladores y saltos de línea: `?siguiente=/%09/evil.com` acaba en `https://evil.com/` | Enlace de phishing con dominio legítimo: `reboard.es/entrar?siguiente=/%09/evil.com` envía a una página falsa de «vuelve a entrar». Afecta a `/entrar`, `/auth/confirm` y `proxy.ts` | Rechazar caracteres de control y `\`; resolver con `new URL` y exigir el mismo origen; tests con `%09`, `%0a` y `%0d` | **P0** (minutos) |
| S2 | **Media** (confirmada en código) | **Se puede publicar sin pasar por la web.** La política RLS de INSERT de `listings` admite `status='published'` | Un usuario con sesión usa su token contra la API REST de Supabase y crea cientos de anuncios publicados, sin fotos ni teléfono, sin Turnstile y sin límite | Publicar solo mediante una función de base de datos que exija fotos y contacto y limite las publicaciones por usuario y día; quitar `published` de la política de INSERT | **P1** (P0 antes de abrir el registro al público) |
| S3 | **Media** (confirmada en código) | **No hay cuota de Storage** por anuncio ni por usuario. El límite de 10 fotos solo cuenta filas de la tabla, no archivos | Un usuario sube miles de archivos de 5 MB a carpetas de borradores, con el coste de almacenamiento que eso supone | Política o disparador en `storage.objects` con un máximo por carpeta y por usuario, y un cron que borre los objetos huérfanos | **P1** (P0 antes de abrir al público) |
| S4 | Media (confirmada en código) | **El origen «fabricante» de las medidas no se contrasta** con la tabla oficial del modelo | Un vendedor marca 40 L como «según fabricante» cuando el modelo tiene 32 L. **Hoy no se puede explotar: hay 0 modelos en el catálogo de producción** | Comparar en el servidor y en la base de datos con `board_model_sizes`; si no coincide, marcar el dato como del vendedor | P1 (antes de cargar el catálogo) |
| S5 | Baja | Cualquiera puede listar todos los perfiles: `id`, nombre visible y fecha de alta. Con Google o Apple, el nombre visible es el nombre de pila real | Enumeración de usuarios | Restringir la lectura a perfiles con algún anuncio público | P1 |
| S6 | Baja | El vendedor puede leer `user_id` e `ip_hash` de quien le contactó (`contact_events`) | El vendedor puede saber qué usuario registrado le contactó | Conceder solo las columnas `listing_id`, `method` y `created_at` | P1 |
| S7 | Baja | **Quien ha moderado algo no puede borrar su cuenta**: la FK `moderation_actions.moderator_id` no tiene `ON DELETE` | Fallo del derecho de supresión (RGPD) para moderadores y admins | Migración: columna nullable con `on delete set null` | P1 |
| S8 | Baja | El token de Turnstile no se comprueba por `hostname` ni por `action` | Un token del login sirve para revelar un contacto | Comprobar ambos campos y negarse a arrancar en producción con la clave de prueba | P2 |
| S9 | Baja | Los moderadores pueden saltarse el disparador de transiciones en sus propios anuncios y restaurar lo que retiró un admin; no se les exige MFA | Abuso por parte de un moderador | Aplicar el disparador a todos y exigir `aal2` a los moderadores | P2 (hoy no hay moderadores) |
| S10 | Baja | `listing_photos.storage_path` se valida con `like`, que admite `..` | Mostrar en un anuncio propio la foto de otro anuncio (las fotos ya son públicas) | CHECK con una expresión regular estricta | P2 |
| S11 | Baja | No hay límite de peticiones en `/api/tablas`, `/api/anuncios` y `/api/tablas/recuento` | Variando los filtros se evita la caché y se carga la base de datos | Reglas de rate limit en el WAF de Vercel | P2 |
| S12 | Informativa | `script-src 'unsafe-inline'` en la CSP (decisión documentada por el renderizado parcial). Las cookies de sesión de Supabase no son HttpOnly, pero `docs/SECURITY.md` dice que lo son | Un XSS robaría la sesión. **No se ha encontrado ningún XSS**: el único `dangerouslySetInnerHTML` (JSON-LD) escapa `<` | Corregir la documentación; mantener la prohibición de HTML sin escapar | P2 |
| S13 | Informativa | `img-src` permite `images.unsplash.com`, que solo usaba la antigua demo | Superficie innecesaria | Quitarlo de la CSP | P2 |
| S14 | Informativa (sin confirmar) | Las funciones creadas después de la primera migración probablemente se puedan ejecutar como anónimo. Todas comprueban el permiso por dentro, así que el impacto hoy es nulo | — | `alter default privileges … revoke execute … from public` | P2 |

### 4.3 Configuración de producción que no se puede verificar desde fuera (NO VERIFICADA)

- Que el **CAPTCHA esté activado en Supabase Auth** (Attack Protection). Sin él, Supabase ignora el token de Turnstile del formulario de acceso.
- Los **límites de envío de email y de acceso** de Supabase Auth.
- Las **Redirect URLs** permitidas en Supabase Auth.
- **TOTP (MFA)** activado en el proyecto y factor dado de alta por el admin. Hoy el admin entra con un solo factor.
- Que en Vercel esté la **clave secreta real de Turnstile** y no la de pruebas.

---

## 5. Infraestructura de producción

### 5.1 Estado verificado [PROD]

| Elemento | Estado |
|---|---|
| Migraciones | 16 de 16 aplicadas, 0 pendientes (`supabase migration list`) |
| Datos | 0 anuncios, 1 perfil, 30 marcas, 9 zonas, 0 modelos, 0 tiendas, 4 ajustes de configuración. Sin datos de prueba |
| Seguridad de la base de datos | 190/190 tests pgTAP contra producción |
| Supabase Auth | Solo email activo; registro abierto (`disable_signup:false`); sin autoconfirmación |
| HTTPS | `http://` → 308 a `https://`; HSTS sin `preload` |
| Rutas privadas | `/cuenta`, `/panel`, `/admin` y `/moderacion` → 307 a `/entrar?siguiente=…` |
| 404 | Reales (código 404) para anuncios, landings, guías y tiendas inexistentes |
| Indexación | `SITE_INDEXABLE=false`: `robots.txt` con `Disallow: /`, sitemap vacío y `noindex` en todas las páginas. Coherente con lo previsto |
| Canonical | Apuntan a `https://reboard-gamma.vercel.app`. Habrá que cambiarlas al pasar a `reboard.es` |
| Turnstile | Widget presente y funcionando en `/entrar` |
| TTFB | 0,16–0,67 s; un arranque en frío puntual de 7,8 s en la primera carga |

### 5.2 Riesgos de plataforma

- **Correo:** el SMTP por defecto de Supabase solo entrega a miembros de la organización y con un límite muy bajo. **Es el bloqueo principal (P0-1).**
- **Dominio:** `reboard.es` está comprobado en DonDominio, pero el registro de los .es todavía responde que no existe. Hasta que se active no se puede verificar en Resend ni en Vercel.
- **Plan gratuito de Supabase:** NO VERIFICADO en qué plan está el proyecto.
  - Si es Free, el proyecto **se pausa tras 7 días sin actividad** y **no tiene copias de seguridad diarias**.
  - Con anuncios reales, hace falta Pro, o como mínimo un `pg_dump` periódico fuera de Supabase.
- **Vercel Hobby:** sus condiciones lo limitan a uso personal y no comercial. Un marketplace con actividad económica debería estar en **Pro**. Plan actual NO VERIFICADO. Decisión del titular.
- **Errores y logs:**
  - hay páginas de error (`error.tsx`, `global-error.tsx`) y los registros de Vercel y Supabase;
  - **no hay monitorización de errores** (tipo Sentry) ni alertas: un fallo en producción solo se vería mirando los logs a mano.
- **Disponibilidad:** sin monitor de disponibilidad externo.
- **Cron de caducidad:** declarado; que Vercel lo ejecute a diario está NO VERIFICADO (*Settings → Cron Jobs* y los logs).

### 5.3 Checklist de producción, en orden de ejecución

Ningún paso requiere pegar secretos en el chat ni en el repositorio.

1. 🧑 **Esperar a que se active `reboard.es`** en el registro de los .es (DonDominio → estado «Activo»; revisar el correo por si Red.es pide verificar datos).
2. 🧑 **DNS:**
   - A de `reboard.es` y CNAME de `www` hacia Vercel;
   - borrar el comodín `*`;
   - los registros de Resend (`send` y `resend._domainkey`);
   - SPF con `~all`;
   - DMARC `p=none`.
3. 🧑 **Vercel → Domains:** añadir `reboard.es` y `www.reboard.es` y esperar a que estén verificados (HTTPS automático).
4. 🧑 **Resend:**
   - dominio verificado y API key de envío;
   - en Supabase → SMTP: `smtp.resend.com:465`, remitente `no-responder@reboard.es`.
5. 🧑 **Supabase → Email Templates:** asunto «Tu código de Reboard» y cuerpo `supabase/templates/codigo.html`. Solo se pueden editar con el SMTP propio.
6. 🧑 **Supabase → URL Configuration:**
   - Site URL `https://reboard.es`;
   - Redirect URLs `https://reboard.es/auth/confirm**` y la de `reboard-gamma` mientras conviva.
7. 🧑 **Turnstile:** añadir el hostname `reboard.es`. Comprobar en Supabase → Attack Protection que el CAPTCHA está activado con la *secret key*.
8. 🧑/🤖 **Vercel:** `NEXT_PUBLIC_SITE_URL=https://reboard.es` y volver a desplegar.
9. 🤖 **Arreglar S1** (redirección abierta), con tests, y desplegar.
10. 🧑 **Supabase → Rate limits:** unos 30 emails por hora, y revisar los límites de acceso.
11. 🧑 **MFA del admin:** activar TOTP en Supabase y dar de alta el factor en `/admin/seguridad`.
12. 🧑 **Copias de seguridad:** decidir entre Supabase Pro o un dump periódico. Decidir también el plan de Vercel.
13. 🧑 + 🤖 **Prueba real en producción** (escritorio y móvil):
    - entrar con un email que **no** sea del titular;
    - publicar con 2 fotos y ver el anuncio en `/buscar` y en su landing;
    - revelar el contacto desde otro dispositivo;
    - editar el precio, marcar vendida, retirar y eliminar;
    - reportar y moderar;
    - borrar la cuenta de prueba.
14. 🧑 **Legal:** razón social y datos registrales, y revisión profesional de los textos.
15. 🧑/🤖 **Al abrir al público:** `SITE_INDEXABLE=true`, desplegar, verificar en Search Console y enviar el sitemap.
16. 🧑 (Opcional) **Google y Apple:** configurar los proveedores (`docs/PRODUCTION_SETUP.md` §3b) y `NEXT_PUBLIC_AUTH_PROVIDERS`.

---

## 6. SEO técnico

| Elemento | Estado | Evidencia |
|---|---|---|
| Indexación | ✅ desactivada a propósito | `noindex, nofollow` en las 25 páginas revisadas; `robots.txt` con `Disallow: /` [PROD] |
| Sitemap | ✅ preparado | 200 con 0 URLs mientras no se indexa. En código incluye solo las landings con inventario (`landingIndexable`) [CÓDIGO]. Con la indexación activada: NO VERIFICADO |
| `robots.txt` (modo indexable) | ✅ [CÓDIGO] | Bloquea `/api/`, `/auth/`, `/panel`, `/cuenta`, `/moderacion`, `/sistema` y `/admin` |
| Canonical | ✅ | Absolutas; `/buscar?forma=fish` apunta a `/tablas/fish` [PROD]. Sin canonical en páginas noindex (comparar, guardado, entrar…): aceptable |
| Title y H1 | ✅ | Únicos y descriptivos (por ejemplo, «Tablas fish de segunda mano en Cantabria · Reboard»). `/sistema` no tiene H1 |
| Redirecciones | ✅ | Barra final → 308; anuncio con slug antiguo → 308 al canónico [LOCAL]; HTTP → HTTPS 308 [PROD] |
| Datos estructurados | ✅ | Home: `WebSite` + `Organization`; landings: `BreadcrumbList`; guía: `Article`; ficha: `Product`/`Offer` + `BreadcrumbList` [LOCAL]. JSON válido [PROD] |
| Páginas sin inventario | ✅ | 200 con estado vacío y CTA, fuera del sitemap mientras estén vacías |
| Anuncios vendidos o retirados | ✅ [LOCAL] | La URL se mantiene, con aviso de «vendida» o «caducada», sin contacto; fuera de búsquedas y sitemap |
| Enlazado interno | ✅ | 27 enlaces únicos desde la home, ninguno roto [PROD]; migas en todas las landings |
| Open Graph | 🟡 | Hay title, description y url. **No hay `og:image`** salvo en la guía, ni `og:site_name` ni `og:locale`: los enlaces compartidos por WhatsApp salen sin imagen |
| Iconos | 🟡 | `/favicon.ico` da 404 (solo hay `favicon.svg`); sin `apple-touch-icon` ni manifest |
| Logo en `Organization` | 🟡 | En SVG; Google prefiere PNG |
| Rendimiento (móvil 390 px, sin limitar la red) | ✅ con matices | `/`: LCP 0,45–0,53 s y CLS 0; `/buscar`: LCP 0,87–1,69 s; `/entrar`: LCP 0,97–1,41 s. 282–304 KB de JS comprimido por página |
| Estabilidad visual (CLS) | 🟡 | Intermitente: `/entrar` hasta 0,21 (al insertarse el widget de Turnstile) y `/buscar` en escritorio 0,17 en una de dos pasadas (el pie de página se desplaza) |
| Core Web Vitals de campo | NO VERIFICADO | Sin tráfico real ni datos de CrUX; la API de PageSpeed Insights devolvió 404 desde este entorno |
| Guía pendiente | 🟡 | `/guias/que-tabla-comprar-despues-de-una-softboard` responde 200 con «Estamos escribiendo esta guía» (noindex) |

---

## 7. UX, UI y conversión (solo problemas reales)

Revisado en producción (vacía) a 390 y 1440 px y en local con 101 anuncios demo. **No hay errores visibles, ni textos de demo, ni lorem, ni inglés, ni imágenes rotas en producción.**

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| U1 | **Sin anuncios, la web promete más de lo que hay**: las 8 tarjetas de tipo y las 2 de zona de la home llevan siempre al mismo estado vacío | Confianza: el primer visitante ve una web vacía. Se resuelve con inventario antes de abrir al público, no con código | P1 (operativo) |
| U2 | El estado vacío de una landing filtrada es genérico: «Todavía no hay tablas publicadas» en `/tablas/cantabria/fish`, en vez de mencionar fish en Cantabria | Claridad | P2 |
| U3 | **Los anuncios caducan sin que el vendedor reciba ningún aviso** (confirmar cada 14 días; caduca a los 30). No existe ningún email | El vendedor pierde su anuncio sin saberlo; afecta a la retención de vendedores y al inventario | P1 |
| U4 | Las alertas solo viven en el dispositivo; nunca avisan | La función promete menos de lo que su nombre sugiere. La interfaz lo explica | P2 |
| U5 | `/entrar` dice «Sin contraseñas…» y debajo ofrece «Tengo contraseña» | Contradicción menor | P2 |
| U6 | CLS en `/entrar` al aparecer Turnstile | El botón se desplaza mientras se carga | P2 |
| U7 | Sin `og:image`: al compartir un anuncio o la home por WhatsApp no sale imagen | Conversión de lo compartido (las fichas sí tienen fotos propias [CÓDIGO]; la home y las landings no) | P1 |
| U8 | `/marcas/*` da 404 en producción (0 modelos) y no hay índice `/marcas` | No afecta hoy porque no se enlaza; hay que tenerlo en cuenta al cargar el catálogo | P2 |
| U9 | Entre 0 y 2 áreas táctiles de menos de 44 px por página (migas o chips) | Accesibilidad móvil | P2 |

---

## 8. Pendientes clasificados

### P0: bloqueantes reales (antes de aceptar vendedores y anuncios reales)

| # | Tarea | Quién | Por qué es bloqueante |
|---|---|---|---|
| P0-1 | **Correo de acceso real:** dominio `reboard.es` activo, Resend verificado y SMTP en Supabase, con la plantilla del código | 🧑 (DNS y cuentas) + 🤖 (comprobaciones) | Sin él, ningún vendedor externo puede entrar ni publicar |
| P0-2 | **Configurar las URLs de Auth y el dominio**: Site URL y Redirect URLs, `NEXT_PUBLIC_SITE_URL`, hostname en Turnstile, CAPTCHA activo en Supabase | 🧑 + 🤖 | Si no, los enlaces del correo y las canonical apuntan a otro dominio y el CAPTCHA del acceso puede no aplicarse |
| P0-3 | **Arreglar la redirección abierta (S1)** | 🤖 | Riesgo de phishing con el propio dominio; se arregla en minutos |
| P0-4 | **Prueba real completa en producción** (checklist §5.3, paso 13) con un email que no sea del titular, en escritorio y móvil | 🧑 + 🤖 | Nunca se ha publicado un anuncio en producción |
| P0-5 | **Datos legales obligatorios**: razón social y datos del Registro Mercantil en el aviso legal; quitar los placeholders visibles más evidentes | 🧑 (datos) + 🤖 (texto) | La LSSI obliga a identificar al titular antes de operar. La revisión profesional completa puede ir en paralelo |

### P1: importantes (no impiden una beta cerrada; sí un lanzamiento público abierto)

1. **S2:** publicar solo con una función de base de datos que exija fotos y contacto, con límite por usuario y día.
2. **S3:** cuota de Storage y limpieza de archivos huérfanos.
3. **Copias de seguridad y planes:** Supabase Pro o un dump periódico, y Vercel Pro por uso comercial.
4. **Aviso por email antes de que caduque un anuncio (U3)**, o como mínimo revisar a mano los anuncios pendientes durante la beta.
5. **MFA del admin** (TOTP).
6. **Monitorización de errores y disponibilidad** (Sentry o similar, y un monitor externo).
7. **S4:** validar el origen «fabricante» antes de cargar el catálogo.
8. **Privacidad y RGPD:** S5, S6 y S7.
9. **Imagen Open Graph por defecto** y favicon/apple-touch-icon (U7).
10. **Adaptar los 10 e2e desfasados** y ejecutarlos contra datos reales; e2e y pgTAP en CI con Supabase.
11. **Revisión legal profesional completa:** bases jurídicas, plazos de conservación y encargados del tratamiento (Vercel, Supabase, Cloudflare, Resend, Google y Apple).
12. **Inventario inicial** antes de abrir al público (U1). Es operativo, no técnico.

### P2: posteriores

- Alertas por email.
- Alta de tiendas por su cuenta.
- Página índice `/marcas`.
- Catálogo de modelos verificado.
- S8–S14.
- CLS de `/entrar` y `/buscar`.
- Estado vacío por filtro (U2).
- Textos de `/entrar` (U5).
- `/sistema` fuera de producción.
- HSTS `preload`.
- Logo PNG en `Organization`.
- Analítica sin cookies.
- Accesibilidad con lector de pantalla real y zoom.
- Google y Apple (opcionales).

---

## 9. Evaluación final

**1. ¿Está REBOARD técnicamente preparado para un lanzamiento público?**
**No todavía.** El producto está construido y probado, pero:
- en producción nadie externo puede recibir el código de acceso;
- nunca se ha completado un recorrido real allí;
- hay que cerrar S1, S2 y S3 antes de abrir el registro a cualquiera.

**2. ¿Podemos comenzar ya una beta cerrada con vendedores reales?**
**Sí, en cuanto se cumplan P0-1 a P0-5**, que dependen sobre todo de que el dominio se active. Los riesgos S2 y S3 son asumibles con vendedores conocidos y vigilancia desde el admin.

**3. ¿Qué bloquea actualmente la publicación real?**
- El envío del código por email a terceros (SMTP propio), que a su vez depende del dominio `reboard.es`.
- Que no se ha hecho la prueba real en producción.

**4. ¿Qué funcionalidades no están verificadas en producción?**
- publicar, editar, vender, retirar y eliminar;
- subida de fotos;
- revelar el contacto;
- guardados con cuenta;
- reportes y moderación;
- cron de caducidad;
- acceso por código para terceros;
- Google y Apple;
- MFA del admin;
- CAPTCHA de Supabase Auth.

En local están verificadas todas salvo Google y Apple con un proveedor real.

**5. ¿Es imprescindible terminar el admin antes del lanzamiento?**
**No: ya está terminado** (14/14 e2e en local; el titular accede en producción). Lo único recomendable antes de abrir es activar el **segundo factor (TOTP)** del admin.

**6. ¿Qué riesgos importantes existen?**
- **Dependencia del dominio .es:** hasta que se active, todo lo demás espera.
- **Abuso por la API** (S2 y S3) si se abre el registro al público sin cerrarlos.
- **Pérdida de datos:** si Supabase está en el plan gratuito, no hay copias diarias y el proyecto se pausa tras 7 días sin actividad.
- **Vendedores que pierden anuncios por la caducidad**, sin aviso por email.
- **Sin monitorización:** un fallo pasaría desapercibido.
- **Legal:** placeholders visibles y textos sin revisión profesional.
- **Primera impresión con la web vacía.**

**7. ¿Cuáles son las cinco tareas técnicas prioritarias?**
1. Dominio → Resend → SMTP y plantilla en Supabase (P0-1).
2. URLs de Auth, `NEXT_PUBLIC_SITE_URL`, Turnstile y CAPTCHA con `reboard.es` (P0-2).
3. Arreglar la redirección abierta (P0-3).
4. Prueba real completa en producción (P0-4).
5. Cerrar la publicación por la API y poner cuota de Storage (S2 y S3).

**8. ¿Qué depende del titular y qué puede resolver Claude Code?**
- **Titular:**
  - dominio y DNS, cuentas de Resend, Google y Apple;
  - paneles de Supabase y Vercel (SMTP, URLs, CAPTCHA, MFA, planes, variables);
  - datos legales y revisión profesional;
  - la parte de la prueba real que requiere leer su correo o usar su móvil;
  - decisiones de plan y copias de seguridad.
- **Claude Code:**
  - todos los arreglos de código y migraciones (S1–S14, U2, U5–U9);
  - emails de aviso de caducidad (una vez exista el SMTP);
  - adaptar los e2e;
  - comprobar el DNS y el despliegue;
  - conducir la prueba en el navegador;
  - redactar los textos legales con los datos que se le den.

**9. ¿Qué puede esperar hasta después de los primeros 100 anuncios?**
- Alertas por email.
- Alta de tiendas por su cuenta y catálogo de modelos verificado.
- Página `/marcas`.
- Google y Apple.
- Analítica.
- Mejoras de CLS.
- Los hallazgos de seguridad de severidad baja (S8–S14).
- HSTS `preload`.
- Pruebas con lector de pantalla.

**10. Estado general del proyecto: 7/10.**
- **Producto y código:** 8,5/10. Completo, coherente con el diseño aprobado, con seguridad en profundidad y buena cobertura de tests.
- **Preparación de producción:** 5/10. Desplegado y configurado, pero sin correo para terceros, sin dominio activo y sin un recorrido real verificado.

### Decisión

> ## 🟡 CONDITIONAL GO (beta cerrada con vendedores conocidos)
>
> **Condiciones** (todas verificables):
> 1. `reboard.es` activo, con Resend verificado y SMTP propio en Supabase. Un email ajeno al titular recibe el código.
> 2. URLs de Auth, `NEXT_PUBLIC_SITE_URL`, el hostname de Turnstile y el CAPTCHA de Supabase configurados para `reboard.es`.
> 3. Redirección abierta (S1) corregida y desplegada.
> 4. Prueba real superada en producción, en escritorio y móvil: publicar, ver, contactar, editar, vender, retirar, eliminar, reportar y moderar.
> 5. Razón social y datos registrales en el aviso legal.
>
> **Para un lanzamiento público abierto: NO-GO** hasta cerrar además S2 (publicar sin pasar por la web), S3 (cuota de Storage), las copias de seguridad, el MFA del admin y la revisión legal profesional.
>
> **Justificación:**
> - **A favor:**
>   - 203 + 78 + 190 + 14 tests en verde;
>   - 190/190 tests de seguridad de la base de datos **en producción**;
>   - producción respondiendo con HTTPS, cabeceras y 404 correctos;
>   - ningún hallazgo crítico ni alto.
> - **En contra (lo que impide el GO sin condiciones):**
>   - el envío del código de acceso a terceros (configuración externa);
>   - la ausencia total de pruebas reales en producción;
>   - una redirección abierta confirmada;
>   - datos legales obligatorios incompletos.

---

## Anexo A: evidencias y archivos de referencia

**Documentación del repositorio:**
- `docs/PRODUCTION_SETUP.md` (guía paso a paso);
- `docs/LAUNCH_CHECKLIST.md`;
- `docs/BETA_AUDIT.md` (verificación en el navegador del 23-10);
- `docs/SECURITY.md`;
- `docs/ADMIN.md`;
- `docs/DECISIONS.md`;
- `docs/ROADMAP.md`.

**Código y tests:**
- **Tests:**
  - `tests/unit` (16 archivos);
  - `tests/integration` (5);
  - `supabase/tests/database` (8);
  - `tests/e2e` (`routes`, `flows`, `visual`);
  - `tests/e2e-admin`.
- **Seguridad de la base de datos:**
  - `supabase/migrations/20261022120200_rls.sql`;
  - `20261022120300_storage.sql`;
  - `20261025090100_admin_panel.sql`.
- **Redirección abierta (S1):** `src/lib/auth/shared.ts:4-7`, usada en `src/proxy.ts`, `src/app/auth/confirm/route.ts` y `src/components/auth/LoginForm.tsx`.
- **Publicación por la API (S2):** `supabase/migrations/20261025090100_admin_panel.sql:263-264`.

**Comandos de producción usados (todos de solo lectura):**
- `supabase migration list --db-url …`;
- `supabase inspect db table-stats --db-url …`;
- `GET /auth/v1/settings`;
- unas 200 peticiones GET/HEAD a la web.

**Además:**
- `supabase test db --db-url …` (transacciones que se deshacen);
- `db push` de la migración `20261026090000_profile_name_from_oauth`. Este cambio **es anterior a esta auditoría**: lo autorizó el titular en la tarea previa.
