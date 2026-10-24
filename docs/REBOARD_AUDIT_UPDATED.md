# REBOARD: auditoría actualizada (técnica, funcional, de seguridad, UX y SEO)

> **ESTADO DEL DOCUMENTO: FINAL** (fase A: producción, arquitectura y seguridad; fase B: Canarias y batería completa de tests en local).
>
> **Actualización posterior al cierre (23-10-2026, verificada en producción):** con autorización del titular, la migración `20261028090000_launch_canarias` se aplicó en producción (después de un ensayo en modo prueba; pgTAP 210/210 contra producción) y se subieron a `main` los commits `53170d2` (imagen al compartir, iconos y manifest) y `b5dafe9` (Canarias). **Producción ya está en `b5dafe9`**:
> - title «Tablas de surf de segunda mano en Canarias · Reboard»;
> - selector «Todas las islas» con las 8 islas;
> - `/tablas/la-graciosa` 200, `/tablas/asturias` 404, `/tablas/canarias` 308 → `/`, `/tablas/canarias/fish` 308 → `/tablas/fish`;
> - `/og-reboard.png`, `/favicon.ico` y `/manifest.webmanifest` 200; `og:image` en la home.
>
> Las menciones de este documento a «solo en local», «sin subir», «producción en `3244adb`» o «migración sin aplicar» quedan **superadas** por esta nota. El orden correcto (migración antes que el código), que el documento recomendaba en §7 bis, se respetó. **Sigue pendiente, sin cambios:** SPF sin `~all` y sin DMARC (DKIM de DonDominio presente en `dddk._domainkey`) [PROD: DNS, comprobado después del despliegue].

**Fecha:** 23-10-2026.
**Código auditado:**
- **`main` local en el commit `b5dafe9`** («Lanzamiento solo en Canarias…»), encima de `53170d2` (imagen Open Graph, favicon, manifest).
- **`origin/main` y producción están en `3244adb`.** Los commits `53170d2` y `b5dafe9` existen **solo en local**: no están subidos, no están desplegados y la migración de Canarias no está aplicada en producción.
- La fase A (producción, arquitectura y seguridad) se hizo sobre `53170d2`. La fase B (Canarias y tests) sobre `b5dafe9`, con el árbol de trabajo limpio salvo dos documentos sin seguimiento (`docs/LAUNCH_READINESS_AUDIT.md` y este).

**Entorno público:** https://www.reboard.es (Vercel + Supabase de producción). `reboard.es` → 308 → `www.reboard.es`. La URL antigua `https://reboard-gamma.vercel.app` sigue respondiendo (ver §3).

**Autoría:** auditoría de solo lectura hecha por Claude Code. Sin cambios en el código, sin commits, sin despliegues, sin migraciones y sin escrituras en la base de datos de producción. En local, los tests y `db:seed-demo` escribieron en Supabase local, como pide el procedimiento. En producción solo se han hecho peticiones GET/HEAD (unas 150), lecturas con la CLI de Supabase (`migration list`, `inspect db table-stats`) y `GET /auth/v1/settings` con la clave pública del bundle.

**Referencia:** `docs/LAUNCH_READINESS_AUDIT.md` (auditoría anterior del mismo día, commit `d9d49ef`). Se ha usado como guía de qué revisar, **no** como fuente de verdad: todo se ha vuelto a comprobar.

> **Cómo leer las etiquetas**
> - **[PROD]:** comprobado hoy contra producción, solo con lecturas.
> - **[LOCAL]:** comprobado hoy contra Supabase local (Docker) o con pruebas automáticas locales.
> - **[CÓDIGO]:** deducido de leer el código en `HEAD`; no ejecutado.
> - **[DOC]:** lo dice la documentación del repositorio o el titular; no se ha podido comprobar.
> - **NO VERIFICADO:** no hay evidencia.
>
> Que algo funcione en local no garantiza que funcione en producción. Que algo esté en el código no significa que esté desplegado.

---

## 1. Resumen ejecutivo

**Qué es Reboard.** Un marketplace de tablas de surf de segunda mano en España (en curso: lanzamiento limitado a Canarias). El comprador busca por litros, medidas, tipo, precio y zona, abre la ficha y contacta con el vendedor por WhatsApp o por teléfono. No hay pagos, envíos, chat propio ni comisión. Lo construye una sola persona (el titular) con ayuda de Claude Code.

**Stack.** Next.js 16.4.2 (App Router, Cache Components, Server Actions, `proxy.ts`), React 19.3, TypeScript, CSS Modules; Supabase (Postgres con RLS, Auth, Storage) en `eu-west-1`; Cloudflare Turnstile; Vercel (`dub1`). Solo 7 dependencias de producción.

**Qué ha cambiado desde la auditoría anterior (misma fecha, commit `d9d49ef`):**

| Cambio | Estado |
|---|---|
| **S1. Redirección abierta en `safeNext`** | ✅ Corregida en código y desplegada: el bundle de producción contiene la nueva validación (`reboard.invalid`) [PROD] |
| **S2. Publicar sin pasar por la web** y **S3. sin cuota de Storage** | ✅ Corregidas en la base de datos (migración `20261027090000_publish_guard_storage_quota`), **aplicada en producción** [PROD: `migration list`] |
| **Correo de acceso a terceros** (el bloqueo P0 de antes) | 🟡 SMTP propio de DonDominio (`hola@reboard.es`) configurado en Supabase; el titular dice que un código llegó a un email externo [DOC]. Hay riesgos de entregabilidad: SPF sin `~all` y **sin DMARC** [PROD: DNS] |
| **Dominio** `reboard.es` | ✅ Activo, con HTTPS y canonical en `https://www.reboard.es` [PROD] |
| **Textos legales** | 🟡 Titular, NIF, domicilio y email publicados; siguen los avisos «Borrador pendiente de revisión legal» y varios apartados entre corchetes [PROD] |
| **Copy** | ✅ Reescrito en castellano natural [PROD] |
| **Imagen al compartir (Open Graph), favicon.ico, apple-touch-icon, manifest** | ✅ **Desplegado** (commit `53170d2`, ver la nota de actualización): `og:image` en todas las páginas, `/favicon.ico` y manifest 200 [PROD] |
| **Lanzamiento solo en Canarias** | ✅ **Desplegado** (commit `b5dafe9` y migración `20261028090000` aplicada en producción, ver la nota de actualización): 8 islas, Península inactiva, publicar solo en islas activas (zod + trigger en la base de datos), SEO y textos «en Canarias» [PROD]. Ver §7 bis |

**Estado de producción [PROD]:**
- 0 anuncios, 1 perfil (el titular, admin), 30 marcas, 13 zonas (8 islas activas y 5 de la Península inactivas, tras la migración de Canarias), 0 modelos, 0 tiendas.
- 18 de 18 migraciones aplicadas (la de Canarias, después del cierre; ver la nota de actualización).
- Todas las páginas responden. HTTPS, cabeceras de seguridad, 404 reales, `noindex` en todo, `robots.txt` cerrado y sitemap vacío, **a propósito** (`SITE_INDEXABLE=false`).
- Registro abierto; solo el acceso por email está activo (Google, Apple y teléfono desactivados).

**Lo que sigue sin verificarse en producción:** que un vendedor **desconocido** complete el recorrido real: recibir el código, publicar con fotos, que otra persona revele el contacto, editar, marcar vendida, retirar, eliminar, reportar y moderar. Nunca se ha publicado un anuncio en producción (0 filas en `listings`) [PROD].

**Tests (fase B, en local, sobre `b5dafe9`):**
- typecheck ✅; lint 0 errores y 4 avisos;
- unit 218/218, integración 78/78, pgTAP 210/210 (con la base vacía);
- `db:lint` sin errores; build ✅; e2e del admin 14/14; `npm audit` sin vulnerabilidades;
- e2e generales: **64 ✅ / 10 ❌**. Los 10 fallos son **tests desfasados**, y se demuestra por qué en §8: esperan ids `a1040` del antiguo inventario simulado, el «modo demo» al publicar y `/panel` sin sesión.

**Valoración:** el producto y el código están **muy por encima de un MVP típico**. La seguridad de la base de datos ha mejorado (S1–S3 cerrados). Lo que falta para abrir es, sobre todo:
1. la prueba real en producción;
2. entregabilidad del correo (DMARC, SPF y DKIM);
3. MFA del admin;
4. copias de seguridad y plan (NO VERIFICADO);
5. ~~desplegar Open Graph y Canarias con su migración~~ (hecho después del cierre);
6. el contenido mínimo (inventario inicial y guías no marcadas como «demostración»).

---

## 2. Inventario exhaustivo de funcionalidades

**Leyenda:**
- ✅ implementada y verificada en ese entorno;
- 🔵 implementada, no verificada en ese entorno;
- 🟡 parcial;
- ⚪ no implementada;
- 🔒 bloqueada por configuración externa.

Columnas: **Código** = existe en `HEAD`; **Local** = probada contra Supabase local (tests ejecutados hoy en la fase B, ver §8); **Prod** = comprobada hoy en producción.

### 2.1 Home, navegación y buscador

| Aspecto | Detalle |
|---|---|
| Qué hace | Home `/` con hero, buscador (Zona · Litros · Tipo · Más filtros · «Buscar tablas»), tarjetas por tipo, «Recién publicadas», «Cómo funciona», TablaFinder, vender, guías y CTA final. Cabecera con Explorar tablas, TablaFinder, Guías, Guardadas, Cuenta y **Publicar tabla** (amarillo). Menú lateral en móvil |
| Cómo funciona | Server Component prerenderizado (PPR); el buscador es una isla cliente (`SearchBar` + `SearchSheet`); «Buscar N tablas» consulta `GET /api/tablas/recuento` [CÓDIGO] |
| Estado | Código ✅ · Local ✅ · **Prod ✅ (vacía)**: 200, sin errores de consola a 390 y 1440 px, sin scroll horizontal y sin imágenes sin `alt` [PROD] |
| Limitaciones | Con 0 anuncios, las 8 tarjetas de tipo llevan a estados vacíos. El hero dice «Compra y vende en toda España» y el selector «Toda España» [PROD]; el commit local `b5dafe9` lo cambia a «Todas las islas» y «en Canarias» (§7 bis). Primera petición con arranque en frío: TTFB de 7,1 s en una ocasión [PROD] |
| Pendiente | Inventario inicial; desplegar los textos de Canarias (`b5dafe9`) |

### 2.2 Filtros y ubicaciones

| Aspecto | Detalle |
|---|---|
| Qué hace | `/buscar` y las landings `/tablas/[forma\|zona]` y `/tablas/[zona]/[forma]`. Filtros: zona o región, litros (mín/máx), longitud, forma, construcción, precio, marca, modelo, estado, tipo de vendedor, sin reparaciones, accesorios, quillas, ancho y grosor mínimos, «solo para mí» (rango de TablaFinder) y orden |
| Cómo funciona | El estado vive en la URL (`src/lib/search/filters.ts`). Búsqueda y recuentos en SQL con un solo predicado (`matching_listings`, `search_listings`, `count_listings`, `listing_facets`, migraciones `…120100` y `…090200`), así resultados y recuentos no pueden divergir. Funciones `security invoker` (aplican RLS). `proxy.ts` da 404 real a landings inexistentes [CÓDIGO] |
| Ubicación | Provincia o isla (`zones`) más municipio en texto (`town`). **Sin coordenadas** (decisión aprobada), así que «Más cerca» solo ordena primero la zona del usuario. En `HEAD` hay 9 zonas: 4 islas (Gran Canaria, Tenerife, Lanzarote, Fuerteventura), Asturias, Cantabria, Galicia, País Vasco y Cádiz, más la región `canarias` [CÓDIGO y PROD]. La Palma, El Hierro y La Gomera dan 404 en producción [PROD] |
| Estado | Código ✅ · Local ✅ (integración 78/78 y pgTAP 210/210 hoy, §8) · **Prod 🔵: solo el estado vacío** (todas las landings dan 200, canonical correcta y `/buscar?forma=fish` → canonical `/tablas/fish`) [PROD] |
| Limitaciones | Sin distancia real ni geolocalización. Municipio en texto libre, sin lista validada (INE pendiente). La distancia se desactiva con una región |

### 2.3 Publicar y editar

| Aspecto | Detalle |
|---|---|
| Qué hace | `/vender/publicar`, 5 pasos: Fotos → La tabla → Estado → Precio y ubicación → Revisar y entrar. Borrador en IndexedDB, vista previa en vivo en escritorio y parser de medidas pegadas (`6'4 x 20 1/2 x 2 5/8 34L`). Editar con `/vender/publicar?editar=<id>` |
| Cómo funciona | `saveListingAction` (Server Action): `auth.getUser()`, zod (`ListingInput`) y Turnstile → crea el **borrador** → el navegador sube las fotos a Storage → `finalizeListingAction` comprueba las rutas y publica (`src/app/vender/actions.ts`, `src/lib/publish/save.ts`) [CÓDIGO] |
| Reglas en la base de datos (nuevo) | Solo se insertan borradores. Para pasar a `published` hace falta ≥ 1 foto y un teléfono (`listings_publish_guard`). Máximo 15 anuncios nuevos por usuario y 24 h. Usuario suspendido = sin escritura (migración `20261027090000`, aplicada en producción) [CÓDIGO y PROD: `migration list`] |
| Estado | Código ✅ · Local ✅ (integración `publish.test.ts` en verde hoy; e2e de publicar desfasados, §8) · **Prod 🔵 NO VERIFICADO**: 0 anuncios en producción. Se ha comprobado que el paso 1 se muestra bien a 390 y 1440 px [PROD] |
| Limitaciones | Teléfono sin verificar (decisión aprobada). Después de publicar, el dueño puede borrar todas las fotos o el teléfono (RLS `photos_delete_own` y `contacts_own` `for all`), y el anuncio seguiría publicado sin ellos: el guard solo actúa en la transición a `published` [CÓDIGO]. El límite diario cuenta las filas existentes, así que borrar anuncios y volver a crearlos lo esquiva [CÓDIGO] |

### 2.4 Fotos y Storage

| Aspecto | Detalle |
|---|---|
| Qué hace | Hasta 8 fotos; la primera es la portada; se pueden reordenar y quitar |
| Cómo funciona | Recodificación en el navegador (`src/lib/publish/image.ts`): lado máximo de 1600 px y WebP, lo que quita EXIF y GPS. Subida directa al bucket público `listing-photos` (máximo 5 MB, solo `image/webp` y `image/jpeg`) en la ruta `{user_id}/{listing_id}/{uuid}`. El servidor solo comprueba rutas y existencia [CÓDIGO] |
| Cuotas (nuevo) | 16 objetos por carpeta de anuncio y 120 subidas por usuario y 24 h (`listing_photo_quota_ok`, política de INSERT en `storage.objects`) [CÓDIGO; prod: migración aplicada] |
| Limpieza | El cron diario borra los borradores de más de 7 días con su carpeta. **No** borra los objetos huérfanos de anuncios que no son borradores (por ejemplo, fotos sustituidas que no se borraran) [CÓDIGO] |
| Estado | Código ✅ · Local ✅ · Prod 🔵: ninguna subida real hecha en producción |
| Limitaciones | El bucket acepta JPEG: un cliente que use la API directamente podría subir un JPEG con EXIF y GPS (son sus propios datos). Sin CDN de imágenes propia: se usa la optimización de `next/image` en Vercel (cuenta en la cuota del plan) |

### 2.5 Registro, acceso y perfiles

| Aspecto | Detalle |
|---|---|
| Qué hace | `/entrar`: email → código de 6 cifras (OTP), con Turnstile. Opción «Tengo contraseña». Google y Apple en código, ocultos tras `NEXT_PUBLIC_AUTH_PROVIDERS`. `/cuenta`: nombre visible, resumen, accesos, cerrar sesión y borrar la cuenta (escribiendo «BORRAR») |
| Cómo funciona | Supabase Auth en el navegador; `/auth/confirm` canjea los enlaces y el código PKCE; `proxy.ts` refresca la sesión solo en rutas privadas; `safeNext` valida `?siguiente=` [CÓDIGO]. El perfil lo crea `handle_new_user` (nombre de pila si viene de OAuth, si no «Surfista») |
| Producción | `auth/v1/settings`: `email:true`; `google`, `apple` y `phone`: `false`; `disable_signup:false`; `mailer_autoconfirm:false` [PROD]. Widget de Turnstile presente en `/entrar` [PROD]. SMTP propio (DonDominio, `hola@reboard.es`) [DOC: el titular dice que llegó un código a un email externo]. CAPTCHA activado en Supabase Auth, URL Configuration y hostnames de Turnstile: [DOC], **NO VERIFICADO** desde fuera |
| Estado | Código ✅ · Local ✅ (Mailpit) · Prod 🟡: el acceso del titular y un código externo [DOC]; el recorrido completo de un tercero, NO VERIFICADO |
| Limitaciones | Ver §5 (S5: los perfiles son legibles por cualquiera). Sin MFA para usuarios normales (no hace falta). El texto «No necesitas contraseña» convive con «Tengo contraseña» [PROD] |

### 2.6 Contacto comprador → vendedor

| Aspecto | Detalle |
|---|---|
| Qué hace | En la ficha, «Contactar» abre un modal con «Mostrar contacto» → WhatsApp (`wa.me` con mensaje precargado) o llamada. Aviso de no pagar por adelantado |
| Cómo funciona | `revealContactAction`: zod + Turnstile + HMAC de la IP → `reveal_contact()` (`security definer`, solo `service_role`): anuncio publicado y no retirado, límite de 30 por hora por IP y registro en `contact_events`. **El teléfono nunca va en el HTML ni en los listados** (`ContactInfo.phone = null`) [CÓDIGO] |
| Estado | Código ✅ · Local ✅ (`contact-moderation.test.ts`) · **Prod 🔵 NO VERIFICADO** (no hay anuncios) |
| Limitaciones | No hay email al vendedor cuando alguien pide su contacto (por diseño). Turnstile no comprueba `hostname` ni `action` (S8). El vendedor ve `user_id` e `ip_hash` de quien le contacta (S6) |

### 2.7 Gestión del vendedor (`/panel`)

| Aspecto | Detalle |
|---|---|
| Qué hace | Pestañas de activos, pendientes y vendidos. Acciones: confirmar disponibilidad («sigue disponible»), bajar precio (guarda el anterior y muestra «Ha bajado de X a Y»), editar, marcar vendida, volver a publicar, retirar y **eliminar** |
| Cómo funciona | `panelActionServer` y `deleteListingServer` (Server Actions con `getUser`, zod y RLS). El trigger `listings_guard` impone las transiciones y las fechas. Caducidad: «pendiente» si lleva más de 14 días sin confirmar (calculado al leer); el cron `/api/cron/expirar` (04:15 UTC, `vercel.json`) lo pasa a `expired` a los 30 días |
| Estadística | Solo hay una real: «clics en contactar» (`contact_events`). No hay visitas ni guardados [CÓDIGO] |
| Estado | Código ✅ · Local ✅ · Prod 🔵: `/panel` → 307 a `/entrar` sin sesión [PROD]. Que el cron se ejecute: NO VERIFICADO; la ruta existe y responde 401 sin secreto [PROD] |
| Limitaciones | **Ningún email avisa al vendedor antes de que caduque su anuncio.** El dueño no puede borrar un anuncio que tenga moderación |

### 2.8 Guardados (favoritos) y alertas

| Aspecto | Detalle |
|---|---|
| Guardados | Sin cuenta, en `localStorage` (`rb-usuario-v1`); con cuenta, en la tabla `favorites`, y se fusionan al entrar. `/guardado` avisa si una tabla se ha vendido o ha bajado de precio [CÓDIGO]. Prod: la página da 200 y está vacía [PROD]; con cuenta, NO VERIFICADO |
| Alertas | 🟡 **Solo en el dispositivo** (`localStorage`). Ningún email ni push. La interfaz lo dice («Se guardan en este dispositivo»). No hay tabla `saved_searches` en la base de datos [CÓDIGO] |
| Pendiente | Alertas por email (nuevas tablas y bajadas de precio): ver §10 |

### 2.9 TablaFinder (`/calculadora-litros`)

| Aspecto | Detalle |
|---|---|
| Qué hace | 7 preguntas (peso, nivel, frecuencia, olas, objetivo, tabla actual…) → rango orientativo de litros y tipos de tabla → enlace a las tablas compatibles. Debajo, contenido SEO visible y una tabla de ejemplos |
| Cómo funciona | Port puro de la lógica del prototipo (`src/lib/finder/recommend.ts`): k limitado a [0,90; 1,20], tope del 20 % respecto a la tabla actual y rango de 15–120 L. Perfil guardado en `rb-asistente-v1`, que activa «Te encaja» y «Solo tablas para mí». Los anuncios compatibles salen de `GET /api/tablas` (máximo 300) [CÓDIGO] |
| Estado | Código ✅ · Local ✅ (tests unitarios con miles de combinaciones) · **Prod ✅**: el asistente se muestra a 390 y 1440 px, sin errores [PROD] |
| Limitaciones | Avisa honestamente: «Cálculo orientativo y simplificado. Todavía no lo han validado surfistas ni shapers» [PROD]. Solo recomienda tablas de segunda mano de Reboard (ver §10) |

### 2.10 Comparador (`/comparar`)
- **Qué hace:** de 2 a 4 tablas lado a lado, con las diferencias resaltadas, «la más barata», «dentro de tu rango» y «Sin indicar» para lo que falta. Los ids viven en `localStorage` y los datos llegan por `GET /api/anuncios?ids=` [CÓDIGO].
- **Estado:** Local ✅; Prod 🔵, solo vacío (200) [PROD].

### 2.11 Marcas, modelos y fichas técnicas

| Aspecto | Detalle |
|---|---|
| Modelo de datos | Catálogo separado de los anuncios: `brands` (30 de referencia, solo nombres), `board_models` (con `verification` unverified/verified y `source_note` obligatoria para verificar) y `board_model_sizes` (largo, ancho, grueso y litros del fabricante). Un anuncio puede apuntar a una medida de catálogo; si no, usa `brand_text` y `model_text` |
| Origen del dato | Cada medida tiene `*_source` (`seller` \| `manufacturer`). CHECK: sin valor no hay origen, y `manufacturer` exige `model_size_id` [CÓDIGO]. **Pero no se comprueba que el valor coincida con el del catálogo** (S4, abierto) |
| Páginas | `/marcas/[marca]` y `/marcas/[marca]/[modelo]` (selector de medida, «Te encaja» y recuento en venta). **No hay página índice `/marcas`** [CÓDIGO]. En producción, 0 modelos, así que `/marcas/torq` da 404 [PROD] |
| Gestión | Solo el admin (`/admin/catalogo`): crear y editar marcas, modelos y medidas, fusionar marcas, verificar modelos y destacar marcas en publicar [CÓDIGO] |
| Pendiente | Cargar un catálogo verificado (G2) y validar el origen «fabricante» (S4) antes |

### 2.12 Tiendas, escuelas y shapers

| Aspecto | Detalle |
|---|---|
| Qué hace | `/tiendas` (directorio con el filtro Todas / Tiendas / Escuelas) y `/tiendas/[slug]` (perfil e inventario) |
| Modelo | Tabla `shops` (`type` tienda/escuela, `zone_slug`, `town`, `address`, `hours`, `inventory_source`, `profile_id` único hacia `profiles`, `status` pending/approved/rejected/suspended). `profiles.seller_type` (`particular`/`tienda`/`escuela`) lo cambia solo un admin. `ProBadge` en las tarjetas [CÓDIGO] |
| Estado | Código ✅ · Local ✅ · Prod 🟡: `/tiendas` da 200 vacía; 0 tiendas [PROD] |
| Limitaciones | **No hay alta pública** de tiendas; no hay importación CSV ni feed; no hay filtro por tienda en `/buscar`. **Los shapers no existen como entidad**: solo como «Shaper local» en el texto de marca |

### 2.13 Administración (`/admin`)
- **Qué hace:** panel con estadísticas, reportes, anuncios (ocultar, retirar, restaurar, editar textos, marcar vendida), usuarios (suspender, reactivar, cambiar rol), tiendas, alertas, catálogo, configuración (aviso global, umbral de reportes, límite diario, exigir MFA), auditoría y segundo factor [CÓDIGO].
- **Seguridad:**
  - `admin_status()` en la base de datos: rol `admin` en `profiles.role` (columna no legible ni editable por el cliente), sin suspensión y `aal2` si corresponde;
  - 404 para quien no es admin;
  - todas las acciones son funciones `security definer` que llaman a `require_admin()` y escriben en `admin_audit_log`, que es inmutable;
  - un trigger protege al último admin [CÓDIGO].
- **Estado:**
  - Local ✅ (e2e del admin 14/14 hoy);
  - Prod: `/admin` → 307 a `/entrar` sin sesión [PROD]; el titular entra con su rol [DOC]; `admin_audit_log` tiene 1 fila [PROD];
  - **MFA (TOTP) del admin no activado** [DOC].

### 2.14 Moderación y denuncias
- **Qué hace:** «Reportar» en la ficha (con sesión y Turnstile).
  - Motivos: fraude, datos falsos, fotos, vendida, duplicado, inapropiado y otro.
  - 1 reporte por persona y anuncio; no se pueden reportar los anuncios propios; 10 al día por usuario.
  - Con 3 reportes abiertos (configurable), el anuncio pasa a `flagged` y sigue visible.
  - La cola se gestiona en `/moderacion` (moderador) y en `/admin/reportes`, con registro en `moderation_actions` [CÓDIGO].
- **Estado:** Local ✅; Prod 🔵 NO VERIFICADO.
- **Limitaciones:** ningún aviso por email al admin cuando llega un reporte. Hay que entrar al panel para verlo.

### 2.15 Emails y automatizaciones

| Elemento | Estado |
|---|---|
| Código de acceso (OTP) | 🟡 Lo envía Supabase Auth por el SMTP de DonDominio [DOC]. La plantilla en español está en `supabase/templates/codigo.html`; que esté cargada en producción: NO VERIFICADO |
| Aviso de caducidad, alertas, bienvenida, contacto recibido y reporte recibido | ⚪ No existen. No hay ningún proveedor de email transaccional en el código (no aparecen Resend, nodemailer ni SMTP en `src/`) [CÓDIGO] |
| Cron diario | 🔵 `/api/cron/expirar`: caduca a los 30 días y borra los borradores de más de 7 días con sus fotos. Protegido con `CRON_SECRET` y comparación en tiempo constante. 401 sin secreto [PROD]; que Vercel lo ejecute: NO VERIFICADO |

### 2.16 SEO, guías y páginas dinámicas
- Detalle en §7.
- **Guías:** 1 publicada («Qué revisar al comprar una tabla usada»), **marcada en la página como «Contenido de demostración, pendiente de revisar por un reparador»** [PROD], y 1 pendiente que solo muestra «Estamos escribiendo esta guía».
- **Landings:** 7 formas + softboard + principiantes, 9 zonas + Canarias y sus combinaciones. Indexables solo con inventario: 1 anuncio para una landing simple y 3 para una combinación (`src/lib/search/indexing.ts`).

### 2.17 Analítica y conversiones
- ⚪ **No hay analítica web** (decisión: sin cookies de terceros). No hay Search Console verificado (NO VERIFICADO).
- La única métrica de conversión registrada es `contact_events` (clics en «Mostrar contacto»), visible para el vendedor en su panel y en las estadísticas del admin.
- **Consecuencia:** no se podrán medir el embudo (búsqueda → ficha → contacto), la tasa de publicación completada ni el abandono por paso. Ver P1 en §11.

### 2.18 Otras páginas
`/vender` (landing de venta), `/creditos` (fotos de Pexels), `/legal/{aviso-legal,privacidad,cookies,condiciones}` y `/sistema`, que es interna, accesible en producción con 200 y `noindex` y sin H1 [PROD].

---

## 3. Estado de producción

### 3.1 Verificado hoy [PROD]

| Elemento | Resultado |
|---|---|
| Dominio | `http://reboard.es` → 308 → `https://reboard.es/` → 308 → `https://www.reboard.es/` (200). `http://www` → 308 → `https` |
| DNS | A `reboard.es` → 216.198.79.1 (Vercel); CNAME `www` → `*.vercel-dns-017.com`; NS de DonDominio; sin comodín `*` (un subdominio aleatorio no resuelve) |
| Correo (DNS) | MX `mx01.dondominio.com`. SPF `v=spf1 include:spf.dondominio.com` **sin mecanismo `all`**. **No hay registro DMARC** (`_dmarc.reboard.es` vacío). DKIM: selector desconocido, NO VERIFICADO |
| URL antigua | `https://reboard-gamma.vercel.app` sirve **la misma web** (200), con canonical a `www.reboard.es` y `noindex`. No redirige |
| Cabeceras | CSP (con `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'` y `upgrade-insecure-requests`), HSTS `max-age=63072000; includeSubDomains` (sin `preload`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. La CSP sigue permitiendo `images.unsplash.com` (S13) |
| Indexación | `robots.txt`: `Disallow: /`. `sitemap.xml`: vacío. `<meta name="robots" content="noindex, nofollow">` en todas las páginas revisadas. Coherente con `SITE_INDEXABLE=false` |
| Rutas | 63 URLs probadas: todas las públicas dan 200; las privadas (`/cuenta`, `/panel`, `/admin`, `/moderacion`) dan 307 a `/entrar?siguiente=…`; 404 reales en anuncio, landing, marca, tienda, guía y legal inexistentes; `/buscar/` → 308 `/buscar` |
| APIs públicas | `/api/tablas/recuento` → `{"count":0}`; `/api/tablas` → `[]`; `/api/anuncios` → `[]`; `/api/aviso` → `null`; `/api/cron/expirar` → 401 |
| Auth | Email activo; Google, Apple y teléfono desactivados; registro abierto; sin autoconfirmación |
| Base de datos | **Migraciones:** 17 aplicadas, incluida `20261027090000_publish_guard_storage_quota`. `20261028090000` (Canarias) **no aplicada** (solo está en el commit local `b5dafe9`). **Filas (estimadas por `table-stats`):** `listings` 0, `profiles` 1, `brands` 30, `zones` 9, `board_models` 0, `shops` 0, `listing_photos` 0, `reports` 0, `contact_events` 0, `favorites` 0, `app_settings` 4, `admin_audit_log` 1 |
| Despliegue | Corresponde a `origin/main` = `3244adb`. Lo confirman la ausencia de `og:image`, `favicon.ico` y manifest (que llegan en `53170d2`) y la presencia del arreglo de S1 en el bundle |
| Rendimiento | Ver §7.6 |

### 3.2 Declarado por el titular, no verificable desde fuera
- SMTP de DonDominio en Supabase, y un código que llegó a un email externo [DOC].
- Site URL y Redirect URLs de Supabase, hostnames de Turnstile y CAPTCHA activado en Supabase Auth [DOC].
- Decisión de plan de Vercel y Supabase «lista»: **plan exacto NO VERIFICADO**. Si Supabase sigue en Free: pausa tras 7 días sin actividad, sin copias diarias, 1 GB de Storage y 500 MB de base de datos.
- MFA del admin: **no activado** [DOC].

### 3.3 Fechas de las migraciones
Los nombres de las migraciones llevan fechas **posteriores a hoy** (por ejemplo `20261027…` y `20261028…` cuando hoy es 23-10-2026). Funciona porque solo importa el orden. Pero cualquier migración nueva con la fecha real (`20261023…`) quedaría **antes** de las ya aplicadas y la CLI la trataría como fuera de orden. Conviene seguir numerando después de `20261028090000`. Es informativo, no es un fallo.

---

## 4. Arquitectura

### 4.1 Stack y versiones [CÓDIGO: `package.json` en `HEAD`]

| Pieza | Versión o uso |
|---|---|
| Next.js | 16.4.2 (App Router, `cacheComponents: true`, `partialPrefetching: true`, `proxy.ts` en lugar de middleware) |
| React / React DOM | 19.3.0 |
| TypeScript | ^5 |
| Supabase | `@supabase/supabase-js` ^2.118.0, `@supabase/ssr` ^0.12.7, CLI ^2.121.0 (dev) |
| Validación | `zod` ^4.6.7 |
| Otras | `server-only`. Dev: Vitest 5.0.3, Playwright ^1.62.1, ESLint 9, `sharp`, `tsx` |
| Estilos | CSS Modules sobre `src/styles/tokens.css` (sin Tailwind ni librerías de UI) |
| Fuentes | `next/font/google`: Barlow, Barlow Condensed e IBM Plex Mono |
| Hosting | Vercel, región `dub1`; cron diario `15 4 * * *` (`vercel.json`) |
| CI | GitHub Actions: `typecheck`, `lint`, `test` y `build`. El job de base de datos (`db:lint`, `db:test`, integración) está **desactivado** (`if: false`). Los e2e no corren en CI |

### 4.2 Carpetas (`HEAD`, 227 archivos en `src/`)
```
src/app/                rutas (páginas, Server Actions *actions.ts, /api/*, sitemap.ts, robots.ts, manifest.ts)
  admin/ alertas/ anuncio/ api/ auth/confirm/ buscar/ calculadora-litros/ comparar/ creditos/ cuenta/
  entrar/ guardado/ guias/ legal/ marcas/ moderacion/ panel/ sistema/ tablas/ tiendas/ vender/
src/components/         admin auth brand catalog compare finder guides home layout listing moderation
                        panel publish saved search security seo shops user
src/lib/                a11y admin auth content data domain finder listing moderation publish search
                        security supabase  (+ site.ts, photos.ts, images.ts)
src/styles/             tokens.css, ui.module.css
supabase/migrations/    18 SQL (la última, Canarias, sin aplicar en producción)    supabase/tests/database/  8 pgTAP
supabase/templates/     codigo.html (email del código)
tests/unit · tests/integration · tests/e2e · tests/e2e-admin · tests/perf · tests/fixtures (inventario DEMO)
scripts/                env-local, seed-local-demo, grant-admin…
design/                 prototipo aprobado (fuente de verdad visual)
```

### 4.3 Capa de datos
- **Las páginas solo usan `getRepository()`** (`src/lib/data/index.ts`).
  - Con `NEXT_PUBLIC_SUPABASE_URL` y `…ANON_KEY`, `supabaseRepository`.
  - Sin ellas, `emptyRepository`: web vacía, sin cuentas y con `noindex`.
- **La app no contiene datos simulados.** El inventario DEMO está en `tests/fixtures` y solo lo usan los tests y `scripts/seed-local-demo.mts` [CÓDIGO].
- **Interfaz `ListingRepository`:** `search`, `unknownVolume`, `count`, `facets`, `byId`, `byIds`, `similar`, `countBySeller`, `shopListings`, `modelPrices`, `sellerListings`, `listingParams`, `catalog`, `brands` y `shops`.
- **Caché:** lecturas con `'use cache'` y `cacheTag('listings' | 'listing:{id}' | 'catalog' | 'shops')`. Tras escribir, `updateTag` en las acciones y `revalidateTag(tag,'max')` en las rutas.
- **Clientes Supabase:**
  - `public.ts` (anónimo, cacheable);
  - `server.ts` (usuario, con cookies);
  - `browser.ts`;
  - `service.ts` (`server-only`, service role);
  - `proxy-session.ts`.

### 4.4 Esquema de Supabase [CÓDIGO: migraciones en `HEAD`]

**Tipos enum:** `board_shape` (7), `board_construction` (pu, epoxy, softboard), `board_condition` (4), `seller_type` (particular, tienda, escuela), `data_source` (seller, manufacturer), `contact_method` (whatsapp, phone), `listing_status` (draft, published, sold, expired, withdrawn), `moderation_state` (visible, flagged, removed), `user_role` (user, moderator, admin), `report_reason` (7) y `report_status`.

| Tabla | Para qué | Relaciones | Lectura (RLS) | Escritura |
|---|---|---|---|---|
| `zones` | Islas y provincias (`region_slug` = `canarias`) | ← `listings`, `shops` | Pública | Migraciones |
| `profiles` | Perfil (`display_name`, `seller_type`, `role`, suspensión) | → `auth.users` (cascade) | **Pública**: `id`, `display_name`, `seller_type`, `created_at` | El dueño solo cambia `display_name`; el admin, por funciones |
| `brands` | Marcas (`active`, `featured`, `aliases`, `merged_into`) | ← `board_models`, `listings` | Pública | Admin |
| `board_models` | Modelos (`verification`, `source_note`) | → `brands` | Pública | Admin |
| `board_model_sizes` | Medidas del fabricante | → `board_models` (cascade) | Pública | Admin |
| `listings` | Anuncios (ver §4.5) | → `profiles`, `brands`, `board_models`, `board_model_sizes`, `zones` | Publicados, vendidos y caducados no retirados; el dueño, todos los suyos; los moderadores, todos | El dueño por columnas concedidas, **solo borradores al insertar**; borrar los suyos sin moderación |
| `listing_photos` | Ruta en Storage y posición 0–7 | → `listings` (cascade) | Las de anuncios visibles; el dueño y los moderadores, todas | El dueño |
| `listing_contacts` | Teléfono E.164 (privado) | → `listings` (cascade) | **Solo el dueño** | El dueño |
| `favorites` | Guardados | → `profiles`, `listings` | Los propios | Los propios |
| `contact_events` | Registro de contactos (HMAC de la IP) | → `listings`, `profiles` | El vendedor, los de sus anuncios (todas las columnas, S6) | Solo `reveal_contact` |
| `reports` | Denuncias | → `listings`, `profiles` | Las propias; los moderadores, todas | Usuario con sesión (guard: no las propias, 10 al día) |
| `moderation_actions` | Registro de moderación | → `listings` (cascade), `profiles` (**sin ON DELETE**, S7) | Moderadores | Funciones de moderación y admin |
| `shops` | Tiendas y escuelas (`status`, `profile_id`) | → `zones`, `profiles` | Pública | Admin |
| `app_settings` | Configuración editable (aviso, umbrales, MFA) | — | Públicas solo las `is_public`; el admin, todas | Admin |
| `admin_audit_log` | Auditoría inmutable | — | Admin | Funciones (`admin_log`) |

**Funciones clave:**
- **Búsqueda** (`security invoker`): `matching_listings`, `search_listings`, `count_listings`, `listing_facets` y `similar_listings`.
- **Solo servidor** (`security definer`): `reveal_contact` y `expire_listings`.
- **Administración:** `admin_*` (todas `security definer` con `require_admin()`), `admin_status`, `is_admin`, `is_moderator` e `is_suspended`.
- **Cuota de Storage:** `listing_photo_quota_ok`.

**Disparadores:**
- `listings_guard` (transiciones y fechas);
- `listings_publish_guard` (borrador → publicado con fotos y teléfono; 15 al día);
- `photos_limit` (8 fotos);
- `reports_autoflag` y `reports_guard`;
- `profiles_admin_guard` (último admin, rol y suspensión);
- `audit_immutable` y `audit_row_change`;
- `handle_new_user`;
- `touch_updated_at`.

**Storage:** bucket público `listing-photos`. Escritura solo en la carpeta propia y para un anuncio propio, con cuota. Nadie lista el bucket salvo el dueño su carpeta.

**Privilegios:** se revoca todo a los roles públicos y después se concede columna a columna. Ver S14 en §5: las funciones creadas en migraciones posteriores **sí** tienen `EXECUTE` para `PUBLIC` [LOCAL: `pg_proc.proacl`].

### 4.5 Modelo de datos del anuncio
- **Identidad:** `id` desde 100000; `public_id = 'a'||id`; `slug`. URL `/anuncio/{slug}-a{id}`, con 308 al slug canónico.
- **Tabla:**
  - marca y modelo de catálogo, o `brand_text`/`model_text`;
  - `size_label` (7'2");
  - `length_in`, `width_in`, `thickness_in` (pulgadas) y `volume_l`, **cada uno con su `*_source`**;
  - `shape` y `construction` (con su origen);
  - `fins` y `accessories`.
- **Estado físico:** `condition` (4 valores), `repairs`, `description`.
- **Precio:** `price_eur` (1–20 000) y `previous_price_eur` (bajada).
- **Ubicación:** `zone_slug` (FK `zones`), `town` (texto), sin coordenadas.
- **Contacto:** `contact_method` (whatsapp/phone). El teléfono va en una tabla aparte.
- **Ciclo de vida:** `status`, `moderation`, `published_at`, `confirmed_at`, `sold_at`, `created_at` y `updated_at`.
- **Lo que no tiene:** campo «nuevo/usado», origen de la oferta (particular, tienda, afiliado), stock, URL externa, divisa (siempre EUR) y coordenadas.

### 4.6 Tiendas y vendedores profesionales
- **Hoy hay dos piezas sin un flujo que las una:**
  - `profiles.seller_type` (que pinta el `ProBadge` y permite filtrar por tipo de vendedor);
  - `shops` (ficha pública con `profile_id`).
- Una tienda publica anuncios igual que un particular, desde su cuenta, y sus anuncios salen en `/tiendas/[slug]` mediante `shopListings` [CÓDIGO].
- **Falta:**
  - alta y verificación de tiendas por su cuenta;
  - teléfono y web de la tienda;
  - importación masiva (CSV o feed);
  - stock (unidades) y producto **nuevo**;
  - límites distintos (15 anuncios al día no sirve para una tienda).

### 4.7 Gestión del catálogo
Solo el admin, en `/admin/catalogo`. Para que un modelo sea público tiene que estar `active` y `verified`, y verificarlo exige una `source_note`. **No hay importación** de tablas de fabricante. En producción hay 0 modelos.

### 4.8 Integraciones

| Integración | Estado |
|---|---|
| Supabase (Postgres, Auth, Storage) | En producción [PROD] |
| Cloudflare Turnstile | Widget en producción [PROD]. Verificación en servidor para contacto, publicar y reportar; en el acceso la hace Supabase Auth [CÓDIGO] |
| SMTP DonDominio (vía Supabase Auth) | [DOC] |
| Pexels (fotos editoriales locales, acreditadas en `/creditos`) | En producción [PROD] |
| Google y Apple OAuth | En código; desactivados [PROD] |
| Email transaccional propio, analítica, monitorización de errores (Sentry o similar), monitor de disponibilidad | ⚪ No existen [CÓDIGO] |

### 4.9 Configuración de Vercel
- `vercel.json`: región `dub1` y el cron.
- `next.config.ts`:
  - CSP sin nonce (`'unsafe-inline'` en `script-src`, necesario para el prerenderizado parcial);
  - `images.remotePatterns` limitado a la ruta pública del bucket (más Unsplash, que sobra);
  - `poweredByHeader:false`;
  - `dangerouslyAllowLocalIP` solo con Supabase local.
- Variables (no leídas; no se han impreso secretos): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave `sb_publishable_…`, pública por diseño), `NEXT_PUBLIC_SITE_URL` (= `https://www.reboard.es`, deducido de la canonical [PROD]), `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SITE_INDEXABLE` y `NEXT_PUBLIC_AUTH_PROVIDERS`.

### 4.10 Límites de escalabilidad (estimaciones razonadas, no medidas en producción)
- **Búsqueda:** p95 < 160 ms con 10 000 anuncios sin caché, según `docs/ROADMAP.md` C6 [DOC]. Hay índices parciales sobre lo publicado. Suficiente para años de inventario en Canarias.
- **Sitemap:** pide hasta 50 000 anuncios en una sola llamada y hace un `count` por cada combinación de landing (9 formas × 10 lugares). Aceptable hoy; con más zonas o anuncios habrá que dividirlo (`generateSitemaps`).
- **Storage:** unas 8 fotos de 1600 px en WebP por anuncio. Con unos 150–300 KB por foto, entre 1,2 y 2,4 MB por anuncio. **Con el plan Free de Supabase (1 GB), el límite rondaría los 400–800 anuncios con fotos** (estimación; plan NO VERIFICADO). En Pro, 100 GB.
- **`next/image` en Vercel:** las transformaciones cuentan en la cuota del plan. En Hobby se puede agotar con tráfico real.
- **Cron:** `dailyMaintenance` procesa como máximo 500 borradores al día y borra carpeta a carpeta. Suficiente.
- **Moderación:** manual y sin avisos. Escala mientras el titular revise el panel a diario.

### 4.11 Dónde encajarían las tiendas y las ofertas de afiliados
Ver §10. **Resumen:**
- no meter productos nuevos en `listings`, porque su ciclo de vida, sus reglas de publicación y sus políticas RLS son de anuncios entre personas;
- crear un esquema paralelo:
  - `shops` ampliado;
  - `shop_offers` (producto nuevo de una tienda, vinculado a `board_model_sizes`, con stock y precio);
  - `affiliate_offers` o `offer_sources` (feeds de terceros, con URL de salida y `rel="sponsored"`);
  - `offer_prices` (histórico).
- La búsqueda conjunta se haría con una función SQL nueva que una ambas fuentes sobre el **catálogo** (`board_model_sizes`) como clave común. El catálogo verificado es, por tanto, el cimiento de todo lo que viene.

---

## 5. Seguridad

### 5.1 Hallazgos de la auditoría anterior: estado actual

| # | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| S1 | Redirección abierta en `safeNext` | ✅ **Cerrado y desplegado** | `src/lib/auth/shared.ts`: rechaza caracteres de control y `\`, resuelve con `new URL` contra un origen ficticio y exige el mismo origen y que no empiece por `//`. Tests en `tests/unit/auth-security.test.ts` (`%09`, `%0a`…) [CÓDIGO]. El bundle de producción contiene la nueva lógica [PROD] |
| S2 | Publicar sin pasar por la web | ✅ **Cerrado** (con matices) | `listings_insert_own` exige `status='draft'`; `listings_publish_guard` exige foto y teléfono al publicar y 15 al día [CÓDIGO]. Migración aplicada en producción [PROD]. pgTAP 200/200 contra producción [DOC: titular]. **Matices nuevos (bajos):** (a) después de publicar, el dueño puede borrar fotos y teléfono y el anuncio sigue publicado; (b) el límite diario se esquiva borrando anuncios y volviendo a crearlos; (c) dos inserciones simultáneas pueden pasar ambas el `count` |
| S3 | Sin cuota de Storage | ✅ **Cerrado** (con matiz) | `listing_photo_quota_ok`: 16 por carpeta y 120 al día por usuario [CÓDIGO]; aplicada [PROD]. **Matiz:** no hay limpieza de objetos huérfanos en anuncios que no son borradores |
| S4 | Origen «fabricante» sin contrastar | ❌ **Abierto** | `save.ts` solo comprueba que la medida de catálogo exista; no compara los valores. El CHECK solo exige `model_size_id` [CÓDIGO]. Hoy no se puede explotar (0 modelos) [PROD] |
| S5 | Cualquiera lista todos los perfiles | ❌ **Abierto** | `profiles_read … using (true)` y `grant select (id, display_name, seller_type, created_at) … to anon` [CÓDIGO] |
| S6 | El vendedor ve `user_id` e `ip_hash` de quien le contacta | ❌ **Abierto** | `grant select on public.contact_events to authenticated` (todas las columnas) [CÓDIGO] |
| S7 | Un moderador o admin no puede borrar su cuenta | ❌ **Abierto** | `moderation_actions.moderator_id uuid not null references public.profiles(id)`, sin `ON DELETE` [CÓDIGO] |
| S8 | Turnstile sin comprobar `hostname` ni `action` | ❌ **Abierto** | `verifyTurnstile` solo mira `success` [CÓDIGO] |
| S9 | Los moderadores se saltan `listings_guard` y no se les exige MFA | ❌ **Abierto** | `… and not public.is_moderator()` en el guard [CÓDIGO]. Hoy no hay moderadores [PROD: 1 perfil] |
| S10 | `storage_path` validado con `like` | ❌ **Abierto** | `photos_insert_own`: `storage_path like uid/listing_id/%` sin CHECK estricto [CÓDIGO]. Impacto bajo (las fotos son públicas) |
| S11 | Sin límite de peticiones en `/api/tablas`, `/api/anuncios` y `/api/tablas/recuento` | ❌ **Abierto** | Sin rate limit en el código [CÓDIGO]. Reglas del WAF de Vercel: NO VERIFICADO |
| S12 | `'unsafe-inline'` en la CSP; la documentación dice que las cookies son HttpOnly | 🟡 **Abierto** (es documentación) | `docs/SECURITY.md:32` sigue diciendo «cookies HttpOnly». Las cookies de `@supabase/ssr` las lee el navegador; no son HttpOnly [CÓDIGO]. CSP sin cambios [PROD] |
| S13 | `images.unsplash.com` en la CSP | ❌ **Abierto** | Presente en la CSP de producción y en `remotePatterns` [PROD y CÓDIGO] |
| S14 | Funciones posteriores ejecutables por anónimos | ⚠️ **Confirmado** (antes «sin confirmar») | En Supabase local, `proacl` muestra `=X/postgres` (`EXECUTE` para `PUBLIC`) en `admin_get_user`, `admin_list_users`, `admin_set_role`, `admin_suspend_user`, `admin_update_listing`, `admin_update_setting`, `admin_merge_brands`, `admin_stats`, `admin_with_reason`, `is_suspended`, `matching_listings`, `similar_listings`, `listings_publish_guard`… [LOCAL]. Todas las `admin_*` empiezan con `require_admin()`, que falla para anónimos, así que **el impacto actual es nulo**. Producción tiene las mismas migraciones (NO VERIFICADO directamente). Arreglo: `revoke execute … from public` explícito en una migración nueva |

**Hallazgos nuevos de esta auditoría:**

| # | Severidad | Hallazgo | Arreglo propuesto |
|---|---|---|---|
| N1 | Baja | Un anuncio publicado puede quedarse sin fotos o sin teléfono si el dueño los borra después (ver S2 a) | Trigger en `listing_photos` y `listing_contacts` que impida borrar la última foto o el teléfono de un anuncio publicado, o que lo devuelva a borrador |
| N2 | Baja | El bucket admite `image/jpeg`: subiendo por la API, un JPEG conservaría EXIF y GPS | Aceptar solo `image/webp` (el navegador siempre recodifica a WebP; comprobar el respaldo de Safari antiguo) |
| N3 | Media (operativa) | **Correo:** SPF sin `~all` y **sin DMARC**. DKIM NO VERIFICADO | Añadir `~all` al SPF, activar DKIM en DonDominio y DMARC `p=none` con informes. Gmail y Yahoo exigen SPF o DKIM y recomiendan DMARC: sin ellos, los códigos pueden acabar en spam |
| N4 | Baja | `reboard-gamma.vercel.app` sirve la web completa (con canonical a `www`). `siteIndexable()` **no** comprueba el host, aunque `docs/DECISIONS.md` dice que no se indexa en `*.vercel.app` | Redirigir el dominio antiguo a `www.reboard.es` desde Vercel (Domains → Redirect) o quitarlo; o añadir la comprobación del host |
| N5 | Informativa | `/sistema` (página interna) es pública en producción (200, `noindex`, sin H1) | Ocultarla en producción (404) |
| N6 | Informativa | La guía publicada dice «Contenido de demostración» (ver §6) | Contenido: revisar o retirar antes de abrir |

### 5.2 Protección del admin
- **Bien:**
  - comprobación en la base de datos (`admin_status`, `require_admin`) y en el servidor (`requireAdminPage`/`requireAdminAction` con `getUser`);
  - 404 para quien no tiene permiso;
  - auditoría inmutable;
  - protección del último admin [CÓDIGO].
- **Falta:** **activar TOTP** y `admin_mfa_required=true` (P0 antes de abrir al público, porque el titular es el único admin y su cuenta controla todo).

### 5.3 Rate limiting y antiabuso

| Punto | Control |
|---|---|
| Acceso (OTP) | Turnstile en el formulario + CAPTCHA de Supabase [DOC] + límites de Supabase Auth (NO VERIFICADO) |
| Revelar contacto | Turnstile + 30 por hora por IP (HMAC) [CÓDIGO] |
| Publicar | Turnstile + sesión + 15 al día + exigencia de foto y teléfono [CÓDIGO] |
| Fotos | 16 por anuncio y 120 al día [CÓDIGO] |
| Reportes | Sesión + Turnstile + 1 por anuncio + 10 al día [CÓDIGO] |
| APIs de lectura | **Ninguno** (S11) |

### 5.4 Turnstile
Falla cerrado (sin clave, con error o con timeout se rechaza) [CÓDIGO]. Falta comprobar `hostname`/`action` (S8). En un navegador automatizado sin interfaz, Cloudflare mostró la casilla interactiva «Verifique que es un ser humano» [PROD]; en un navegador normal suele resolverse sin clic, pero conviene probarlo en móvil real.

Aviso de consola **del iframe de Cloudflare** (su propia CSP bloquea `data:`), no de la nuestra: inofensivo.

### 5.5 Dominio y DNS
Ver §3.1. Correcto para la web. Correo con los huecos de N3.

### 5.6 Copias de seguridad
**NO VERIFICADO.** Si Supabase está en Free, no hay copias diarias. Recomendación mínima:
- `supabase db dump` programado fuera de Supabase;
- copia periódica del bucket.

Con Pro, hay copias diarias de 7 días; el PITR es aparte.

### 5.7 Monitorización
- ⚪ No hay Sentry ni equivalente, ni monitor de disponibilidad, ni alertas.
- Hay `error.tsx` y `global-error.tsx`, y los logs de Vercel y Supabase se consultan a mano [CÓDIGO].
- **Riesgo:** un fallo del cron, del correo o de la publicación pasaría desapercibido.

### 5.8 RGPD (pendiente)
- **Textos:**
  - bases jurídicas, plazos de conservación (`contact_events`, anuncios caducados y vendidos), encargados del tratamiento y transferencias internacionales (Vercel, Supabase, Cloudflare, DonDominio y, si se activan, Google y Apple) y la reclamación ante la AEPD siguen **entre corchetes** [PROD];
  - aviso visible «Borrador pendiente de revisión legal» en las 4 páginas [PROD].
- **Titular:** «Reboard» con NIF **B**23869027. Un NIF que empieza por B corresponde a una sociedad limitada. La LSSI (art. 10) pide la **denominación social** y los **datos de inscripción en el Registro Mercantil**. El titular ha decidido no añadirlos: **riesgo legal que debe valorar un profesional** (no es asesoramiento legal).
- **Derechos:** borrar la cuenta funciona [LOCAL]. Bloqueado para moderadores y admins (S7). El resto de derechos se ejercen por email.
- **Minimización:** S5 y S6.

---

## 6. UX y conversión

Recorrido revisado en producción (vacía) a 390 y 1440 px con capturas, y en el código. Las pantallas con anuncios (ficha, contacto) **no se pueden ver en producción**: se han revisado en local (`b5dafe9` con el inventario demo, a 390 px).
- **Ficha:** galería (o silueta «Sin fotos»), precio, «Contactar» en amarillo y barra fija abajo, «Disponible · confirmada hace N días», Guardar / Compartir / Comparar, aviso de no pagar por adelantado, «Reportar anuncio», datos técnicos con su origen («Según el fabricante» / «Según el vendedor»), reparaciones, descripción, vendedor, ficha del modelo, «Antes de comprar» y tablas parecidas.
- **Contacto:** hoja con «Contactar con Daniel», mensaje sugerido editable y botón que espera a Turnstile («Comprobando que no eres un robot…»).
- **Buscar:** hoja con «Todas las islas» y las 8 islas por provincia, con su recuento.
- Ningún error de consola.

[LOCAL: capturas en el scratchpad de la auditoría]

| Paso | Qué ve el usuario [PROD] | Fricciones reales |
|---|---|---|
| **Home** | Hero claro con buscador, tipos de tabla y el bloque «Todavía no hay tablas publicadas» con «Publicar mi tabla» y «Crear alerta» | **U1:** sin inventario, todo lleva a estados vacíos; el primer visitante no tiene nada que comprar. Se resuelve con inventario sembrado por personas reales antes de abrir, no con código |
| **Buscar** | `/buscar` vacío, con un estado vacío honesto y dos CTA | En móvil, sin anuncios, solo se ve el botón «Filtros». Es correcto |
| **TablaFinder** | Paso 1 de 7, chips de peso y contenido explicativo | El botón «Continuar» está desactivado hasta responder (correcto). Al terminar lleva a 0 tablas: el resultado debería ofrecer «Crear alerta» con su rango (ya existe la alerta local) |
| **Ficha** | No verificable en producción (0 anuncios). En local, completa y clara | Sin fotos, la ficha muestra la silueta: correcto, pero un anuncio no puede publicarse sin foto, así que solo pasaría si el vendedor la borra después (N1) |
| **Contacto** | No verificable en producción. En local: hoja → Turnstile → WhatsApp o llamada | Una espera de Turnstile antes de ver el botón [LOCAL]. Es seguro, pero añade fricción. Merece medirse cuando haya analítica |
| **Registro** | `/entrar`: email, Turnstile y botón | **U5:** «No necesitas contraseña» junto a «Tengo contraseña». **U6:** CLS de 0,16–0,22 al insertarse Turnstile [PROD]. En headless salió la casilla interactiva de Cloudflare |
| **Publicar** | Paso 1 «Enséñanos tu tabla»: Hacer foto o Elegir de la galería, 0 de 8 | El indicador de pasos mide 68×16 px en móvil y los pasos anteriores se pueden pulsar: **área táctil < 44 px** [PROD]. El acceso se pide al final, que es lo mejor para la conversión (decisión aprobada) |
| **Gestionar** | `/panel` exige sesión | **U3:** **sin aviso de caducidad por email** (confirmar cada 14 días, caduca a los 30). Es el mayor riesgo de retención de vendedores |
| **Contenido** | Guía con «Contenido de demostración, pendiente de revisar por un reparador» [PROD] | **U10 (nuevo):** resta credibilidad. Revisar el texto o retirar la etiqueta cuando lo revise alguien; o no enlazarla mientras tanto |

**Otros puntos [PROD]:**
- Sin errores de consola, sin scroll horizontal y ninguna imagen sin `alt` en 14 páginas × 2 anchos.
- El enlace del logo mide 114×26 px en móvil (debajo de 44 px de alto).
- El chip «Quitar filtro Gran Canaria» mide 34 px de alto.
- **El copy es natural y honesto:** no promete avisos por email ni inventa cifras. El cálculo de litros se presenta como orientativo.

---

## 7. SEO

### 7.1 Títulos, meta y encabezados [PROD]
- **Títulos** únicos y descriptivos. Ejemplos:
  - «Tablas de surf de segunda mano en España · Reboard»;
  - «Tablas fish de segunda mano en Gran Canaria · Reboard»;
  - «¿Qué tabla de surf necesito? Calculadora de litros · Reboard».
- **Descripciones** presentes en las indexables.
- **H1** único en todas las páginas salvo `/sistema` (ninguno). Las landings tienen 2 H2 y 0 H3. La home, 6 H2 y 3 H3.
- `hreflang="es-ES"` en la home.

### 7.2 Canonical
Absolutas sobre `https://www.reboard.es`.
- `/buscar?forma=fish` → `/tablas/fish`.
- `/buscar?zona=gran-canaria&forma=fish` → `/tablas/gran-canaria/fish`.
- Sin canonical en `noindex` utilitarias (`/comparar`, `/guardado`, `/entrar`, `/vender/publicar`…): aceptable [PROD].

### 7.3 Sitemap y robots
- **Hoy:** cerrado a propósito [PROD].
- **Al indexar** [CÓDIGO]:
  - home, calculadora, vender, tiendas y guías;
  - landings con inventario (≥ 1 o ≥ 3);
  - marcas y modelos del catálogo, tiendas;
  - guías no demo: **hoy ninguna**, porque la única está marcada `isDemo`;
  - anuncios activos con `lastModified`.
- `robots` en modo indexable bloquea `/api/`, `/auth/`, `/panel`, `/cuenta`, `/moderacion`, `/sistema` y `/admin`.

### 7.4 Datos estructurados [PROD]
- Home: `WebSite` + `Organization`. Landings y buscar: `BreadcrumbList`. Guía: `BreadcrumbList` + `Article`. JSON válido.
- Ficha: `Product`/`Offer` + `BreadcrumbList` [CÓDIGO; LOCAL en la auditoría anterior].
- No hay `ItemList` en las landings, aunque `docs/SEO.md` lo recomienda (con 0 anuncios no aplica).

### 7.5 Open Graph e iconos
- **En producción:**
  - sin `og:image` salvo en la guía;
  - sin `og:site_name` ni `og:locale` en home y landings (solo en algunas utilitarias);
  - `twitter:card=summary`;
  - `/favicon.ico` → 404; solo existe `/favicon.svg`;
  - sin `apple-touch-icon` ni manifest.
- **Arreglado en `53170d2` (local, sin subir):** `OG_BASE` con imagen 1200×630, `siteName` y `locale` en todas las páginas, `favicon.ico`, `apple-touch-icon` y `manifest.ts` [CÓDIGO]. **Hay que subirlo.**

### 7.6 Rendimiento [PROD, laboratorio, sin limitar la red, Playwright/Chromium]

| Página | 390 px: LCP / CLS | 1440 px: LCP / CLS |
|---|---|---|
| `/` | 7,4 s* / 0 | 0,48 s / 0 |
| `/buscar` | 0,32 s / 0 | 0,35 s / **0,17** |
| `/tablas/gran-canaria` | 0,31 s / 0 | 0,25 s / 0 |
| `/calculadora-litros` | 0,16 s / 0 | 0,21 s / 0 |
| `/vender/publicar` | 0,14 s / 0 | 0,30 s / 0,04 |
| `/entrar` | 0,20 s / **0,22** | 0,43 s / **0,16** |
| `/comparar` | 0,16 s / 0 | 0,17 s / 0,08 |

\* La primera petición de la sesión tuvo un **TTFB de 7,1 s** (arranque en frío o regeneración de la caché, `x-vercel-cache: STALE`). En las siguientes, el TTFB fue de 47–160 ms.

**Conclusiones:**
- rápido en caliente;
- CLS que corregir en `/entrar` (Turnstile) y en `/buscar` en escritorio;
- arranques en frío visibles.

Core Web Vitals de campo: NO VERIFICADO (no hay tráfico ni CrUX).

### 7.7 Landings de isla × tipo e indexación
- **Arquitectura preparada:** `/tablas/{isla}`, `/tablas/{isla}/{tipo}` y `/tablas/canarias`, con H1 y título por combinación, migas y umbral de inventario para indexar.
- **Hoy en producción:** también existen las landings de la Península (`/tablas/asturias`, `/tablas/cantabria/fish`…), y La Palma, El Hierro y La Gomera dan 404.
- El commit local `b5dafe9` cambia esto: 8 islas con landing y la Península en 404 (§7 bis). Aún no está desplegado.

### 7.8 Enlazado interno y contenido
- **Pie con enlaces** a Todas las tablas, Evolutivas, Softboards, Gran Canaria y **Asturias** [PROD]. Las migas están en todas las landings.
- **Contenido escaso:**
  - 1 guía marcada como demostración y 1 sin escribir;
  - intro corta en las landings;
  - el contenido real de la calculadora es bueno.
- **Para posicionar «tablas de surf segunda mano + isla»** harán falta inventario y texto local por isla: spots, tipo de ola, tiendas.

### 7.9 Preparación para SEO local (Canarias) frente a expansión nacional
- **A favor:**
  - URLs por isla y región;
  - títulos con el topónimo;
  - umbral de indexación por inventario;
  - zonas en la base de datos con `region_slug`, fáciles de ampliar con `zones.active` (migración de Canarias, solo en local).
- **En contra:**
  - sin contenido local (guías por isla, tiendas reales);
  - sin `LocalBusiness` hasta que haya tiendas;
  - textos en «España» en producción.
- **Expansión nacional:** volver a activar zonas sin cambiar URLs es viable con el modelo actual (con `LAUNCH.regions` + `zones.active`; ver §7 bis).

---

## 7 bis. Adaptación «solo Canarias»

**Estado:**
- **Desplegado después del cierre** (commit `b5dafe9` y migración `20261028090000` en producción; ver la nota de actualización al principio) [PROD].
- En el momento de la auditoría estaba solo en local: lo de abajo se comprobó como [CÓDIGO] o [LOCAL], y después del despliegue se verificaron en producción el title, el selector de islas, la landing de La Graciosa (200), Asturias (404) y las redirecciones de `/tablas/canarias` (308).

### Islas y configuración
- **Fuente única de verdad:** `src/lib/domain/taxonomy.ts`.
  - `ALL_ZONES`: catálogo completo de 13 zonas. Las 8 islas, agrupadas por provincia (Las Palmas: Gran Canaria, Lanzarote, Fuerteventura, La Graciosa; Santa Cruz de Tenerife: Tenerife, La Palma, La Gomera, El Hierro). Las 5 de la Península (Asturias, Cantabria, Galicia, País Vasco, Cádiz) se conservan con `region: null`.
  - `LAUNCH`: `regions: ["canarias"]` y los textos (`name`, `allLabel` «Todas las islas», `inAll` «en Canarias», `zoneNoun` «isla», `zoneTitle` «Isla»).
  - De ahí salen `ZONES`/`REGIONS`/`ACTIVE_ZONE_SLUGS` (solo lo activo), `isActivePlace`, `coversTerritory` (una región que abarca todo el territorio equivale a «sin filtro») y `zoneLabel` (nombre de cualquier zona, también inactiva, para anuncios antiguos).
- **Base de datos** (migración `20261028090000_launch_canarias.sql`; solo añade, es reversible):
  - inserta La Palma, La Gomera, El Hierro y La Graciosa;
  - añade la columna `zones.active` (por defecto `false`: una zona nueva nace inactiva) y activa las de `region_slug='canarias'`;
  - crea el trigger `listings_zone_guard`: para `authenticated`, un INSERT o un cambio de `zone_slug` hacia una zona inactiva lanza `zone_not_active`. Service role y funciones de admin quedan exentos.
  - Local tras la migración: 13 zonas, 8 activas [LOCAL].

### Referencias visibles a la Península
- `git grep` en `src` (Asturias, Cantabria, Galicia, País Vasco, Cádiz, Península, España, provincia, zona): solo aparecen en `ALL_ZONES` (datos), en comentarios, en el prefijo telefónico «+34 (España)» y en etiquetas «Zona» del admin [CÓDIGO].
- Rastreo del build local de 13 páginas públicas buscando esas palabras en el texto visible: **ninguna**, salvo un crédito de foto en `/creditos` («A Coruña, España»), que es correcto [LOCAL].
- Home local: título «Tablas de surf de segunda mano en Canarias · Reboard» y descripción «…en Canarias, en todas las islas…» [LOCAL]. El pie enlaza a las 8 islas [LOCAL: captura].

### Selectores de buscar y publicar
- **Buscar:** la hoja de búsqueda muestra «Todas las islas» y las 8 islas en dos columnas por provincia, con su recuento [LOCAL: captura a 390 px]. `FilterPanel` y `SearchBar` usan `ZONES`.
- **URL:** `?zona=asturias` se ignora (cae a «Todas las islas»: título «…en Canarias») y `?zona=canarias` equivale a todas las islas [LOCAL]. Sin isla, la consulta a la base de datos pide explícitamente las 8 islas [CÓDIGO; test unitario], así que un anuncio antiguo de la Península no aparece en las búsquedas.
- **Publicar:** el paso 4 (`StepPrice`) ofrece solo islas activas [CÓDIGO].

### Validación en el servidor
Tres capas:
1. **zod** (`src/lib/publish/schema.ts`): `zoneSlug` solo admite `ZONES`, con el mensaje «Elige la isla donde está la tabla. De momento, Reboard funciona solo en Canarias.»
2. **`save.ts`:** traduce `zone_not_active` de la base de datos a un mensaje claro.
3. **Trigger** `listings_zone_guard`: protege también la API REST directa.

pgTAP `09_launch_territory`:
- las activas son exactamente las de Canarias;
- una zona nueva nace inactiva;
- insertar en una isla funciona y en la Península falla;
- mover un anuncio a la Península falla y entre islas funciona;
- editar otros campos sin tocar la zona funciona;
- el servidor no tiene la restricción [LOCAL: 210/210].

### Rutas SEO
- `/tablas/{isla}` y `/tablas/{isla}/{tipo}` dan 200 para las 8 islas (por ejemplo `/tablas/la-palma`, `/tablas/la-graciosa/fish`).
- La Península da **404 real** (`/tablas/asturias`, `/tablas/cantabria/fish`).
- `/tablas/canarias` → **308 a `/`** y `/tablas/canarias/fish` → **308 a `/tablas/fish`** (en `proxy.ts`, para no duplicar la home ni las landings por tipo) [LOCAL: curl].
- Títulos, H1 y meta «en Canarias». `areaServed` en los datos estructurados [CÓDIGO]. La imagen OG menciona Canarias.
- Tests: `tests/e2e/routes.spec.ts` (404 de la Península y 308 de Canarias) en verde [LOCAL].

### Expansión
- Para ampliar a otra región basta con añadirla a `LAUNCH.regions` **y** activarla en `zones.active` con una migración nueva. Las URLs de las islas no cambian.
- **Riesgo:** dos fuentes de verdad (el código y `zones.active`) que hay que mantener a la par. No hay ningún test que compare `LAUNCH` con `zones.active` de la base de datos real; pgTAP solo comprueba que en la base activa están las de Canarias.
- Al volver a abrir la Península, `/tablas/canarias` dejaría de cubrir todo el territorio: `coversTerritory` pasaría a `false` y la landing de Canarias volvería sola. Bien resuelto.

### Riesgos al desplegar (importante)
- **Orden obligatorio: primero la migración, después el código.**
  - Si se despliega el código **sin** la migración, zod admite La Palma, La Gomera, El Hierro y La Graciosa, pero esas zonas **no existen** en la tabla `zones` de producción (solo hay 9 zonas, con 4 islas): publicar en ellas fallaría por la clave foránea de `zone_slug`.
  - Si se aplica la migración **antes** del código, durante ese intervalo la web antigua seguiría ofreciendo zonas de la Península y el trigger rechazaría esa publicación. Hoy, con 0 anuncios y sin vendedores, el impacto es nulo.
- **Antes de desplegar, regenerar la caché:** las páginas prerenderizadas con la Península desaparecen con el nuevo build.
- **SEO:** `/tablas/canarias` pasa de 200 a 308 hacia `/`. Correcto, porque hoy no hay nada indexado (`noindex`).
- **Anuncios antiguos de la Península:** no hay ninguno en producción. Si los hubiera, seguirían accesibles por URL (con `zoneLabel`) pero no se podrían editar con la zona actual, porque zod solo acepta islas activas. Habría que tenerlo en cuenta al reabrir zonas.

**Conclusión:** la adaptación es **completa, coherente y bien probada en local**. **Falta llevarla a producción:** `db push` de `20261028090000`, después `git push` y despliegue, y después comprobar en producción `/tablas/la-palma` (200), `/tablas/asturias` (404) y el selector de islas.

---

## 8. Resultados de tests

**Contexto de la ejecución:**
- 23-10-2026, en el equipo del titular, commit `b5dafe9` y árbol limpio.
- Supabase local (Docker) con las 18 migraciones aplicadas (`migration list --local`).
- `.env.local` apunta a `127.0.0.1`.
- **Ningún test se ha ejecutado contra producción en esta auditoría.**

Orden seguido: (1) typecheck → lint → unit → integración (vacía la base al terminar) → pgTAP → db:lint → build, con la base vacía; (2) `db:seed-demo` → pgTAP otra vez (para demostrar los fallos con datos) → build → e2e → e2e del admin.

| # | Comando | Entorno | Resultado | Notas |
|---|---|---|---|---|
| 1 | `npm run typecheck` | — | ✅ exit 0 | `next typegen && tsc --noEmit` |
| 2 | `npm run lint` | — | ✅ **0 errores, 4 avisos** | 2 × `jsx-a11y/alt-text` en `src/components/brand/Photo.tsx:33` (el `alt` llega por props) y 2 × variable sin usar en `tests/unit/auth-security.test.ts:65` |
| 3 | `npm test` (Vitest) | — | ✅ **218/218** (17 archivos), 0 omitidos | Incluye el nuevo `tests/unit/territory.test.ts` (10 casos: 8 islas, la Península inactiva, URL, zod, landings, inventario DEMO en Canarias) |
| 4 | `npm run test:integration` | Supabase local | ✅ **78/78** (5 archivos) | Publicar, cuentas, contacto y moderación, admin, paridad del repositorio |
| 5 | `npm run db:test` (pgTAP), base vacía | Supabase local | ✅ **210/210** (9 archivos), `Result: PASS` | Incluye `09_launch_territory` |
| 6 | `npm run db:lint` | Supabase local | ✅ exit 0 | 2 avisos de tipo (`text` → `jsonb`) en `admin_update_listing` (ya conocidos, inofensivos) |
| 7 | `npm run build`, base vacía | — | ✅ | 188 páginas estáticas o parciales |
| 8 | `npm run db:seed-demo` | Supabase local | ✅ | «Cargados 101 anuncios DEMO» (100 publicados), todos en las 8 islas. También carga 5 tiendas, 13 modelos y 27 medidas de catálogo (solo en local) |
| 9 | `npm run db:test`, **con el inventario demo** | Supabase local | ❌ **fallan 01, 05 y 06** (ver abajo) | Esperado: esos tests exigen una base vacía |
| 10 | `npm run build`, con demo | — | ✅ | 310 páginas. No se reprodujo el timeout de `listing_facets` que vio la otra sesión |
| 11 | `npx playwright test --project=e2e` | Build local + demo | ⚠️ **64 ✅ / 10 ❌** (2 ejecuciones, mismo resultado) | Ver abajo |
| 12 | `npm run test:e2e:admin` | Build local + demo | ✅ **14/14** | |
| 13 | `npm audit --omit=dev` | — | ✅ 0 vulnerabilidades | |
| — | `--project=visual` | — | ⏭ no ejecutado | Capturas dependientes del sistema operativo; solo para comparar antes y después |
| — | `perf:local` | — | ⏭ no ejecutado | Última referencia documentada: p95 < 160 ms con 10 000 anuncios [DOC] |

**Por qué falla pgTAP con el inventario demo (demostrado, no es un fallo del producto):**
- `01_schema_privileges`, tests 25, 26, 28 y 29: `select is((select count(*) from public.listings), 0, 'sin anuncios precargados')` y equivalentes para tiendas, modelos y medidas. **Obtiene** 101, 5, 13 y 27; **espera** 0.
  - Son comprobaciones de que las migraciones no traen datos ficticios: con datos cargados a mano, fallan por diseño.
- `05_search_facets`, tests 1–5, 7, 9–10 y 12–21: `select is(pg_temp.slugs('{}'), array['gc-evo-47','tf-fish-sinlitros','as-short-30'], …)`.
  - **Obtiene** esos 3 más 21 anuncios demo.
  - Las aserciones fijan los resultados exactos sobre los 3 anuncios que crea el propio test.
- `06_import_similar`, test 5: espera exactamente `['u-fish','u-evo-tf']` como similares. Los anuncios demo parecidos se cuelan.
- **Con la base vacía (fila 5), los 210 pasan.** Mejora posible: que estos tests filtren por sus propios datos (por ejemplo, un prefijo de slug) y no dependan de una base vacía.

**Por qué fallan los 10 e2e (demostrado con la aserción de cada uno):**

En Supabase los ids empiezan en 100000. En local, el demo ocupa `a116994`–`a117094`, y `/anuncio/torq-fun-tet-7-2-gran-canaria` es `a116994`, no `a1040` [LOCAL: consulta].

| Test | Aserción que falla | Motivo |
|---|---|---|
| `routes.spec.ts` «200 /anuncio/torq-fun-tet-7-2-gran-canaria-a1040» | `expect(res.status()).toBe(200)` → recibe **404** | El id `a1040` es del antiguo inventario en memoria; no existe en la base de datos |
| `routes.spec.ts` «308 al slug canónico del anuncio» | Espera 308 para `/anuncio/slug-viejo-a1040` → **404** | Mismo id inexistente |
| `routes.spec.ts` «la ficha tiene JSON-LD Product y canonical propio» | `link[rel=canonical]` con `/a1040$/`: no encontrado | La página es la 404 (mismo id) |
| `routes.spec.ts` «200 /panel» | Espera 200 → **307** | `/panel` exige sesión y redirige a `/entrar`: es el comportamiento correcto (lo confirma producción [PROD]) |
| `flows.spec.ts` «home (escritorio)…» | Busca el enlace «Buscar 27 tablas» | Recuento del antiguo inventario con la zona por defecto `gran-canaria`. Ya no hay zona por defecto; el botón dice «Buscar 100 tablas» [LOCAL] |
| `flows.spec.ts` «comparador…» | `getByRole('table')` no visible | Guarda en `localStorage` los ids `a1040` y `a1047`, que no existen: el comparador sale vacío |
| `flows.spec.ts` «ficha: contacto y anuncio vendido» | Timeout esperando «Contactar por WhatsApp» en `/anuncio/…-a1040` | Mismo id inexistente (404) |
| `flows.spec.ts` «sin errores de hidratación con estado guardado» | `expect(errors).toEqual([])` en `/anuncio/…-a1040` → «Failed to load resource: 404» | Mismo id. **En la 1.ª ejecución completa** falló antes, en `/tablas/evolutiva`, con 8 errores 404 de recursos. No se reprodujo ni en la 2.ª ejecución completa, ni en 2 ejecuciones aisladas, ni en 2 réplicas manuales del recorrido: **probablemente intermitente** (arranque del servidor bajo carga en paralelo). Se registra como **posible inestabilidad, no descartada** |
| `flows.spec.ts` «publicar (escritorio)…» | Busca el texto «no se publica nada» | Espera el antiguo **modo demo** de publicar. Con base de datos el flujo es real y pide entrar. Lo que viene antes en el mismo test (vista previa con «La Palma», ya adaptado a Canarias) sí pasa |
| `flows.spec.ts` «publicar (móvil)…» | Timeout esperando el botón «Terminar la prueba» | Mismo modo demo, que ya no existe |

**Conclusión:**
- Lógica, base de datos, seguridad, territorio y admin: **cobertura automática buena y en verde**.
- Los e2e de ficha, contacto, comparador y publicar **no protegen hoy esos recorridos**: hay que reescribirlos para que busquen los ids reales (por slug, o creando sus propios datos) y para el flujo real de publicar (con sesión de prueba y Turnstile de pruebas).
- Los e2e y pgTAP **siguen fuera del CI** (`if: false`).
- Las pruebas manuales de este recorrido en local (ficha, contacto y hoja de islas a 390 px) se ven correctas y sin errores de consola [LOCAL: capturas].

---

## 9. Bloqueantes

**Para una beta cerrada con vendedores conocidos:**
1. **Prueba real completa en producción**, en escritorio y móvil, con un email que no sea del titular: recibir el código (y comprobar si llega a spam en Gmail y Outlook), publicar con 2 fotos, verlo en `/buscar` y en su landing, revelar el contacto desde otro dispositivo, editar, bajar precio, marcar vendida, retirar, eliminar, reportar, moderar y borrar la cuenta de prueba. **Nunca se ha hecho.**
2. **Entregabilidad del correo** (N3): DMARC, `~all` en el SPF y DKIM.
3. ~~**Llevar Canarias a producción**~~ ✅ Hecho después del cierre, en el orden recomendado (migración y luego código), y comprobado en producción.

**Además, para abrir al público:**
4. MFA del admin.
5. Copias de seguridad y plan confirmados.
6. Revisión legal: denominación social y Registro Mercantil, y quitar los corchetes.
7. ~~Subir `53170d2` (Open Graph e iconos)~~ ✅ Hecho.
8. Inventario inicial.
9. Aviso de caducidad por email, o revisión manual diaria.
10. Monitorización mínima.
11. Contenido de la guía sin la etiqueta «demostración».
12. Activar la indexación (`SITE_INDEXABLE=true`) **solo** después de todo lo anterior y de redirigir `reboard-gamma`.

---

## 10. Viabilidad de futuras funcionalidades

| Funcionalidad | Qué se reutiliza hoy | Qué hay que construir | Viabilidad y esfuerzo (orientativo) |
|---|---|---|---|
| **Segunda mano de particulares** (actual) | Todo | — | ✅ Hecho |
| **Tablas nuevas de tiendas** | `shops`, `profiles.seller_type`, `ProBadge`, `shopListings`, catálogo `board_model_sizes`, admin de tiendas | Tabla `shop_offers` (`shop_id`, `model_size_id`, precio, stock, `condition='new'`, `url`, `updated_at`), con RLS para que cada tienda edite las suyas; alta y verificación de tiendas; importación CSV o feed; límites propios (no los 15 al día); páginas y tarjetas «Nueva · en tienda» | 🟡 Media. Encaja mejor como **tabla nueva** que como `listings`: no caduca igual, no tiene teléfono privado y tiene stock. Dependencia fuerte: **catálogo verificado** |
| **Catálogo de afiliados de productos nuevos** | Catálogo (marcas, modelos y medidas), páginas `/marcas/*`, `next/image`, admin | `affiliate_programs` y `affiliate_offers` (fuente, URL con tracking, precio, divisa, disponibilidad, última sincronización); job de sincronización (cron o feed); enlaces con `rel="sponsored nofollow"`; aviso de afiliación en el pie y en las condiciones; actualizar la CSP y `remotePatterns` si las imágenes son externas; datos estructurados `Offer` del vendedor externo | 🟡 Media. Riesgo legal y de confianza: separar claramente lo patrocinado; no inventar disponibilidad (CLAUDE.md) |
| **Búsqueda conjunta nuevo + usado** | `Filters` en la URL, `matching_listings`, facetas y `ListingCard` | Función SQL `search_offers` (o vista) que una `listings` y `shop_offers`/`affiliate_offers` con un esquema común (litros, largo, forma, precio, zona o «online»); un filtro «Nuevo / Usado»; recuentos por origen; adaptar las tarjetas y el orden | 🟡 Media-alta. La clave es que los productos nuevos tengan medidas del catálogo; los usados ya las tienen con su origen |
| **TablaFinder recomendando nuevo + usado** | `recommend.ts` (rango de litros y tipos), `/api/tablas`, perfil local | Que `/api/tablas` (o una API nueva) consulte también las ofertas; resultados en dos bloques («De segunda mano cerca» / «Nuevas») | ✅ Fácil una vez exista la búsqueda conjunta |
| **Alertas de nuevos anuncios y bajadas de precio** | Filtros serializables en la URL, `previous_price_eur`, `favorites`, la UI de alertas local, cron de Vercel | Tabla `saved_searches` (`user_id`, `filters jsonb`, `last_notified_at`, `active`), con RLS; migrar las alertas locales al entrar; job (cron cada hora o trigger con cola) que use `count_listings`/`search_listings` con `published_at > last_notified_at`; **proveedor de email transaccional desde el servidor** (el SMTP de Supabase solo envía los correos de Auth); enlace de baja de un clic; mención en privacidad | 🟡 Media. Todo el filtrado ya existe en SQL. Falta el envío y la gestión de bajas |
| **«Busco una tabla» (peticiones)** | `Filters`, perfiles, moderación (`reports`, `moderation_actions`), Turnstile | Tabla `wanted_requests` (`user_id`, filtros, texto, zona, caducidad), con RLS; página pública por zona; aviso al vendedor cuyo anuncio encaja (email); moderación y límites | 🟡 Media. Sin chat propio, el contacto debería seguir siendo el teléfono del que pide (privado, como `listing_contacts`) o un aviso por email |
| **Estimación de precio** | `modelPrices()` (precios activos por modelo), `previous_price_eur`, `sold_at`, anuncios vendidos conservados, catálogo | Histórico (`listing_price_events` o snapshot al vender), un mínimo de N muestras por modelo y medida, modelo estadístico simple (mediana por modelo, estado y antigüedad), texto «orientativo, basado en N anuncios» | ⚪ Hoy no: **0 datos**. Viable con cientos de anuncios del mismo modelo. Regla del proyecto: «solo con datos reales» |

**Infraestructura reutilizable clave:**
1. catálogo con origen del dato;
2. búsqueda SQL con un solo predicado y facetas;
3. RLS y funciones `security definer` con auditoría;
4. admin de catálogo y tiendas;
5. cron de Vercel;
6. caché por etiquetas.

**Lo que falta de forma transversal:**
- **email transaccional desde el servidor** (Resend o el SMTP de DonDominio con una librería);
- **analítica** para medir el embudo;
- **catálogo verificado cargado**.

---

## 11. Prioridades

### P0 (antes de aceptar vendedores reales)

| # | Tarea | Quién |
|---|---|---|
| P0-1 | Prueba real completa en producción (§9.1), en escritorio y móvil | Titular + Claude |
| P0-2 | DMARC (`p=none`), `~all` en el SPF y DKIM en DonDominio; comprobar que el código no llega a spam | Titular |
| ~~P0-3~~ | ✅ Canarias en producción (migración y luego código), comprobado | Hecho |
| ~~P0-4~~ | ✅ Open Graph e iconos desplegados | Hecho |
| P0-5 | MFA (TOTP) del admin y `admin_mfa_required` | Titular |

### P1 (antes de abrir al público o de indexar)
1. Copias de seguridad y plan de Supabase y Vercel confirmados (Pro o dump periódico).
2. Revisión legal: denominación social y Registro Mercantil, bases, plazos, encargados; quitar los corchetes y el aviso de borrador.
3. Aviso de caducidad por email (U3), lo que exige email transaccional desde el servidor.
4. Monitorización de errores y disponibilidad.
5. Analítica sin cookies (para medir el embudo).
6. Redirigir `reboard-gamma.vercel.app` a `www.reboard.es` (N4).
7. Guía sin la etiqueta «demostración», o retirada, y al menos 2–3 guías reales con enfoque en Canarias.
8. Inventario inicial real.
9. S5, S6 y S7 (privacidad y RGPD), y S4 antes de cargar el catálogo.
10. Reescribir los 10 e2e desfasados (ids reales en lugar de `a1040`, publicar con sesión de prueba, `/panel` con sesión) y volver a activar en CI el job de base de datos y los e2e con Supabase local. Hacer que pgTAP 01, 05 y 06 no dependan de una base vacía.
11. Test que compare `LAUNCH` con `zones.active` (dos fuentes de verdad del territorio).

### P2
- S8–S14, N1, N2 y N5.
- CLS de `/entrar` y `/buscar`.
- Áreas táctiles del indicador de pasos y del logo.
- `/marcas` índice.
- Alta pública de tiendas.
- `ItemList` en landings.
- HSTS `preload`.
- Limpieza de objetos huérfanos.
- Fechas de las migraciones (§3.3).

---

## 12. Evaluación final

**Nota global: 7,5/10** (la auditoría anterior: 7/10).
- **Producto y código: 8,5/10.**
  - Completo y coherente con el diseño aprobado.
  - Seguridad en profundidad: S1–S3 cerrados; quedan hallazgos de severidad baja.
  - Territorio Canarias bien centralizado.
  - 218 + 78 + 210 + 14 tests en verde en local.
  - Resta: 10 e2e desfasados que no protegen ficha, contacto, comparador ni publicar.
- **Preparación de producción: 6/10.**
  - Dominio, HTTPS, SMTP propio y migraciones al día.
  - Pero:
    - ninguna prueba real de un tercero;
    - el correo sin DMARC ni `~all`;
    - sin MFA del admin;
    - copias de seguridad y plan sin confirmar;
    - sin monitorización;
    - (resuelto después del cierre: Open Graph, Canarias y su migración ya están desplegados).

**Respuestas directas:**

| Pregunta | Respuesta |
|---|---|
| ¿Puede registrarse un vendedor real? | **Probablemente sí**: el registro está abierto, solo con email [PROD], y el SMTP propio ha entregado un código a un email externo [DOC]. **NO VERIFICADO** con un tercero de principio a fin, y con riesgo de spam (sin DMARC) |
| ¿Puede publicar con fotos? | **En código y en local, sí.** En producción, **NO VERIFICADO**: 0 anuncios. Las reglas de base de datos que lo permiten están aplicadas [PROD] |
| ¿Puede recibir contactos? | En código y en local, sí (WhatsApp o llamada, tras Turnstile). En producción, NO VERIFICADO |
| ¿Puede modificar y eliminar? | En código y en local, sí (editar, bajar precio, vendida, retirar, eliminar). En producción, NO VERIFICADO |
| ¿Funciona en móvil? | **Sí, en lo que se puede ver** [PROD]: sin scroll horizontal ni errores a 390 px, con el diseño móvil aprobado. Pequeñas áreas táctiles por debajo de 44 px. El flujo completo en un móvil real, NO VERIFICADO |
| ¿Preparada para usuarios desconocidos? | **Para una beta cerrada, casi**: faltan P0-1, P0-2 y P0-5 (P0-3 y P0-4 ya están hechos). **Para el público, no todavía**: falta P1 (copias, legal, avisos de caducidad, monitorización, inventario) |
| ¿Qué impide lanzar? | La prueba real en producción; la entregabilidad del correo; el MFA del admin; y, para el público, copias, legal, avisos e inventario |
| ¿Qué puede esperar? | Alertas por email, alta de tiendas, catálogo y `/marcas`, Google y Apple, estimación de precio, peticiones «Busco», ofertas nuevas y de afiliados, analítica avanzada, S8–S14, HSTS `preload` y pruebas con lector de pantalla |

---

## Anexo: evidencias

**Fase B (local, `b5dafe9`):**
- Comandos y recuentos en §8.
- `git grep` de las referencias a la Península.
- curl al build local para las rutas de Canarias y la Península.
- Capturas a 390 px de la hoja de islas, la ficha y el contacto.
- Consultas de solo lectura a Supabase local (zonas, ids demo).
- Durante los tests, el servidor local se arrancó con `npm run start` y se detuvo al terminar.

**Fase A:**
- **Rastreo de producción:** 63 URLs (estado, título, robots, canonical, H1–H3, JSON-LD, OG, corchetes).
- **Playwright:** 14 páginas × 390/1440 px (LCP, CLS, errores de consola, scroll horizontal, áreas táctiles y `alt`), con capturas revisadas.
- **Supabase de producción:** `migration list` e `inspect db table-stats` (con la URL ocultada); `GET /auth/v1/settings` con la clave publicable del bundle.
- **DNS:** A, CNAME, NS, MX, TXT (SPF), `_dmarc` y comodín.
- **Supabase local (solo lectura):** `pg_proc.proacl` para S14.
- **Código:** leído en `HEAD` (`53170d2`) con `git show`/`git grep`. Migraciones de `supabase/migrations/2026102{2..7}*`.
