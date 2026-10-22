# Decisiones técnicas

Registro de decisiones tomadas al recrear el prototipo en Next.js. Las que cambian algo del diseño aprobado están marcadas con **⚠ desviación**.

## Fase 1 (MVP 1–3 del ROADMAP)

### Stack
- **Next.js 16.4 (App Router) + TypeScript**, con `cacheComponents` y `partialPrefetching` activados (valores por defecto de `create-next-app`). Las páginas indexables se prerenderizan; lo que depende de la petición (cookies, `searchParams`) va en `<Suspense>`.
- **Estilos: CSS Modules sobre `src/styles/tokens.css`.** Se ha quitado Tailwind, que venía con la plantilla: los valores exactos del prototipo se trasladan 1:1 a CSS, y así hay una dependencia menos. Las piezas compartidas (botones, chips, campos) están en `src/styles/ui.module.css`.
- **Dependencias añadidas:** solo `server-only`.
- Fuentes con `next/font/google` (Barlow, Barlow Condensed, IBM Plex Mono). Los tokens `--rb-font-*` apuntan a las variables que genera `next/font`.

### Datos
- Modelo en `src/lib/domain/` (`types.ts`, `taxonomy.ts`). Cada dato técnico es `Measured<T> = { value, source }`, con `source: 'seller' | 'manufacturer' | null`. Si el valor es `null`, el origen también.
- Taxonomía en slugs: `shape` (7 formas), `construction` (pu | epoxy | softboard). «Principiantes» es una landing por necesidad (≥ 55 L, la definición del prototipo) y no una forma.
- **Repositorio** (`src/lib/data/repository.ts`): una interfaz y una única implementación DEMO en memoria (`mock-repository.ts`). `REBOARD_DATA_SOURCE` distinto de `mock` lanza un error; no se inventa backend.
- **Fixtures DEMO** en `src/mocks/demo-inventory.ts`: el mismo generador y la misma semilla que `design/source/mock-data.js`, de modo que el inventario coincide con el prototipo. Tamaño con `REBOARD_DEMO_INVENTORY` = 20 | 100 | 1000 (por defecto 100).
- Las fechas se guardan como ISO. Con datos DEMO, «hace N días» se calcula respecto a una fecha de referencia fija (`DEMO_REFERENCE_DATE`), así las páginas se pueden prerenderizar.

### Datos DEMO nunca presentados como reales
- Banner «DEMO» fijo en todas las páginas mientras `repo.isDemo`.
- Con datos DEMO todo el sitio va con `noindex, nofollow`, `robots.txt` bloquea todo y `sitemap.xml` sale vacío.
- Las fotos de la galería indican «foto de stock (demo)».
- Los escenarios de prueba («Prueba un caso real») solo aparecen con datos DEMO.

### Búsqueda
- El estado de los filtros vive en la URL de `/buscar` (`src/lib/search/filters.ts`): `zona`, `distancia`, `litros-min/max`, `largo-min/max` (pulgadas), `forma`, `construccion`, `precio-min/max`, `marca`, `modelo`, `estado`, `vendedor`, `sin-reparaciones`, `accesorios`, `quillas`, `ancho-min`, `grosor-min`, `para-mi=lo-hi`, más la vista: `orden`, `vista`, `ver` y `sin-litros`.
- El filtrado y los recuentos se hacen en servidor. El panel de filtros es una isla cliente que reescribe la URL (500 ms de espera en los campos de texto) y atenúa los resultados mientras llega la respuesta.
- `/buscar` lleva `noindex, follow`, y su canonical apunta a la landing equivalente si la hay (`landingPathFor`).
- Las landings `/tablas/[forma]`, `/tablas/[zona]` y `/tablas/[zona]/[forma]` se prerenderizan (incluida `canarias` como región). Al cambiar un filtro desde ellas se pasa a `/buscar`. Una landing sin anuncios lleva `noindex`: es un umbral provisional, porque la regla definitiva está pendiente (SEO.md).
- «Buscar N tablas» del hero consulta `GET /api/tablas/recuento`.

### Códigos HTTP
- Con Cache Components, una URL con parámetros desconocidos sirve el shell con 200 antes del `notFound()`. Por eso `src/proxy.ts` valida `/tablas/*` y resuelve `/anuncio/*` antes de renderizar: devuelve un 404 real y un **308 al slug canónico** si el slug no coincide con el id.
- Cuando exista base de datos, `proxy` necesitará una consulta ligera por id (o una caché de slugs).

### Estado del usuario (invitado)
- Guardados, comparación (máx. 4), alertas y perfil de surfista se guardan en `localStorage` (`rb-usuario-v1`) mediante `UserStateProvider`. Mientras un componente se hidrata ve el estado vacío, para que no haya desajustes con el HTML del servidor.
- «Cerca de ti» usa la cookie `rb_zona` (por defecto, `gran-canaria`). Se guarda al elegir zona en la hoja de búsqueda. **Stub** hasta tener geolocalización.
- Los mensajes no prometen lo que no existe: «Alerta guardada… Los avisos por email aún no están activos», «Demo: los reportes aún no llegan a moderación».

### ⚠ Desviaciones del prototipo
- **Áreas táctiles de 44 px** (CLAUDE.md) donde el prototipo usaba 40 px o menos: guardar en la tarjeta, flechas del carrusel, chips del hero, cerrar la hoja, Fotos/Lista, cuadrícula/lista y orden.
- **Tamaño mínimo de 12 px:** el contador de fotos de la tarjeta (10 px en el prototipo) y las etiquetas de origen del dato (11 px) pasan a 12 px.
- **Precio de la ficha en Barlow Condensed 800**, como dice DESIGN_SYSTEM.md. En el prototipo heredaba Barlow.
- El chip «Filtros · N» de la home no muestra el recuento de filtros avanzados, porque la home no los conserva. Lleva a `/buscar?avanzados=1`, que abre los filtros avanzados (y la hoja en móvil).
- Los selectores de distancia de `/buscar` se desactivan con una región (Canarias): la distancia solo tiene sentido dentro de una zona.
- Las pantallas aún no implementadas tienen una página provisional `noindex` (`PendingPage`) para que no haya enlaces rotos. Tras la fase 2 solo queda una: la guía «Qué tabla comprar después de una softboard», que no tiene contenido.

## Fase 2 (resto de pantallas del prototipo)

### Asistente `/calculadora-litros`
- La recomendación es un port puro de `wzRec` (`src/lib/finder/recommend.ts`). Las respuestas se guardan en `rb-asistente-v1`.
- **Al terminar se guarda el perfil** (`setProfile`), que activa «Te encaja» y «Solo tablas para mí».
- Los anuncios compatibles salen de `GET /api/tablas?{query}`, que usa la misma query que `/buscar` (máximo 300 anuncios).
- **Softboard** se trata como construcción. Como `/buscar` no combina «forma O construcción», «Ver N tablas» deja fuera la softboard si hay otras formas, y N se cuenta con los filtros exactos del enlace.
- ⚠ **Sin campo de email** en la alerta del resultado: no se recoge un email que aún no se usa.
- Hay contenido SEO visible bajo el asistente. No hay FAQPage porque no hay FAQ real.

### Publicar `/vender/publicar` y panel `/panel`
- **Stub** `PublishService` / `demoPublishService` (`src/lib/publish/service.ts`): no verifica el teléfono, no guarda nada y devuelve `persisted: false`. *(Sustituido en la fase E: ver más abajo.)*
- ⚠ La pantalla final dice «Anuncio listo (demo)» y explica que no se ha publicado. Las fotos se ven con `URL.createObjectURL` y no salen del dispositivo.
- El parser de medidas pegadas está en `src/lib/publish/parse.ts`. ⚠ Al cambiar pies/cm se convierten los valores, no solo el placeholder.
- «Editar» abre `/vender/publicar?editar=<id>`.
- El panel elige de forma determinista tres anuncios del inventario DEMO (uno activo, uno pendiente y uno vendido). Su estado se guarda en `rb-panel-v1`.
- ⚠ Las estadísticas llevan la etiqueta «simuladas (demo)».
- `/vender` es una landing nueva (el prototipo no la tiene): solo ventajas reales, sin cifras.

### Comparador, guardado y alertas
- Cargan los anuncios por id con `GET /api/anuncios?ids=…`, porque su estado vive en el navegador.
- `/guardado` y `/alertas` son la misma pantalla. Las pestañas son navegación (`aria-current`).
- ⚠ Las alertas no prometen «aviso por email y notificación»: dicen que se guardan en este dispositivo.

### Marcas, modelos, tiendas y guías
- Páginas estáticas. La distancia no se muestra porque no se lee la cookie.
- ⚠ Los logotipos de marca son un marcador neutro, porque no están autorizados. Las introducciones de marca son textos demo (`src/lib/content/brands.ts`).
- Las medidas del modelo están dentro de su página (isla `ModelSizes`), sin una URL por medida.
- ⚠ Las tiendas son ficticias. El contacto, la web y el mapa muestran avisos honestos, y su JSON-LD solo se publica sin datos DEMO.
- ⚠ No hay filtro por tienda en `/buscar`. La alerta «de esta tienda» cubre las tiendas o escuelas de su zona, y su texto lo dice.
- Solo hay contenido para la guía «Qué revisar al comprar una tabla usada» (`src/lib/content/guides.ts`).
- `/sistema` es la referencia visual interna: `noindex`, bloqueada en robots y sin enlaces.

### Transversales
- `proxy` también valida `/marcas/*`, `/tiendas/*` y `/guias/*`, para dar 404 reales.
- `noindexRobots()` (`src/lib/seo.ts`): con datos DEMO, las páginas `noindex` mantienen el `nofollow` del layout.
- `CompareTray` se oculta en la ficha, el comparador, publicar y el asistente, que tienen su propia barra fija abajo.

## Fase A (preparación, rama `mvp`)

### Git
- Rama `mvp` creada desde `master`, con un commit de recuperación de todo el trabajo previo. `master` no se ha tocado y no hay remoto configurado.
- `.gitignore`: se versiona `.env.example` (el resto de `.env*` sigue ignorado). Se ignoran las salidas de Playwright y sus capturas de referencia.

### Tests
- **Vitest** (`npm test`):
  - Lógica pura: filtros, títulos, landings, parser, recomendador y presentación.
  - **Caracterización** de la búsqueda sobre el inventario DEMO, con snapshots.
  - **Contrato** de `ListingRepository`, pensado para ejecutarse también contra Supabase en C3.
  - `server-only` se sustituye por un módulo vacío en los tests.
- **Playwright:**
  - `npm run test:e2e`: códigos HTTP de 44 URLs, SEO demo y recorridos (buscador, hoja de búsqueda, calculadora, comparador, ficha y ausencia de errores de hidratación).
  - `npm run test:visual`: capturas de 8 pantallas en escritorio y móvil. **Las referencias no se versionan**, porque dependen del sistema operativo y pesan unos 12 MB. Se generan en local antes de un cambio y se comparan después.
- Dependencias de desarrollo nuevas: `vitest` y `@playwright/test` (la misma versión que los navegadores ya instalados). No hay dependencias de producción nuevas.

### CI
- `.github/workflows/ci.yml`: typecheck, lint, tests unitarios, build, comprobación de que no hay secretos de servidor en `.next/static` y e2e.
- **No se ha ejecutado en GitHub** porque el repositorio no tiene remoto. Sus pasos se han ejecutado en local.
- ESLint ignora `design/`: es el prototipo de referencia, con 2 errores y 30 avisos que no son de la app.

### Repositorio por consultas (A6)
- `ListingRepository` ya no expone `all()` ni `active()`. Expone consultas:
  - `search`, `unknownVolume`, `count` y `facets`;
  - `byId`, `byIds` y `similar`;
  - `countBySeller`, `shopListings`, `modelPrices`, `sellerListings` y `listingParams`.

  El filtrado en memoria solo vive en `mock-repository.ts`.
- `pickOwn` (el vendedor DEMO del panel) pasa al mock como `sellerListings(null)`.
- `/buscar` calcula los recuentos de las sugerencias solo en el estado vacío, que es donde se muestran.
- **Excepción documentada:** el asistente sigue refinando en el navegador los resultados de `/api/tablas`, que como máximo son 300. Con datos reales habrá que vigilar ese límite (tarea C2).
- **Diferencias de comportamiento: ninguna.** Los snapshots de búsqueda, los 54 e2e y las 16 capturas de referencia son idénticos antes y después de A6.

### Otros
- `unsplash()` pasa a `src/lib/images.ts`: las páginas ya no importan `src/mocks`.
- `.env.example` documenta las variables actuales y las previstas, sin valores.

## Fase B (base de datos, en local)

### Infraestructura
- **Un único proyecto Supabase** (`reboard`, UE, plan gratuito), sin staging. Las pruebas se hacen en Supabase local con Docker (`npm run db:start`), también en CI. Los Preview de Vercel no tendrán claves de Supabase.
- **Supabase CLI** como dependencia de desarrollo (`supabase`, sin cuenta).
- **Servicios desactivados en local:** Realtime, Studio, Edge Functions, analítica, vector storage, pooler e imgproxy. Reboard no los usa y así el entorno local pesa menos.
- **Turnstile:** preparado en `config.toml` (comentado). En el proyecto remoto se activará en Authentication → Attack Protection.

### Esquema
Las migraciones son la fuente de verdad; `docs/DATABASE.md` se ha reescrito como guía.
- **Sin columnas `is_demo`:** los datos DEMO nunca entran en Supabase.
- **`flagged` sigue visible.** Las políticas y la búsqueda solo ocultan `removed`, para que 3 reportes malintencionados no puedan tumbar un anuncio. En el diseño inicial ocultaban todo lo que no fuera `visible`.
- **El límite de `confirmed_at` = `now()`** solo se aplica a usuarios (`authenticated`). El servidor y el cron pueden fijar fechas.
- **Reglas del dueño en `listings_guard`:** se aplican cuando `current_user = 'authenticated'`. Las funciones del sistema (`security definer`) y el service role no están sujetas a ellas.
- **Un único predicado de búsqueda** (`listing_matches`) para `search_listings`, `count_listings` y `listing_facets`. Así la búsqueda y los recuentos no pueden divergir.
  - Sin distancia (no hay coordenadas).
  - «Más cerca» ordena primero la zona del usuario.
- **`board_models.slug` es único global,** porque el filtro `modelo` de las URLs usa el slug sin la marca.
- **Restricción nueva:** un modelo de catálogo implica su marca (`model_needs_brand`).
- **Índice añadido:** `reports(reporter_id)`, que el asesor de claves foráneas sin índice detectó.
- **`contact_method`** solo admite `whatsapp` y `phone`. La opción «Email» del formulario se retirará al conectarlo (E3).
- **Columnas de `profiles`:** anon y authenticated solo pueden leer algunas, así que las consultas deben pedir columnas explícitas (no `select=*`).

### Pruebas
- **pgTAP:** 120 tests en `supabase/tests/database/` (`npm run db:test`) sobre privilegios, anuncios, privacidad, reportes, Storage y búsqueda.
  - Crean sus datos en una transacción que se deshace al terminar.
  - **Comprobado que detectan fallos:** al conceder a propósito permisos indebidos en la base local fallan 5 tests; tras `db:reset` vuelven a pasar.
- **`supabase db lint`:** sin errores. Todas las funciones fijan `search_path`.
- **Storage:** Supabase bloquea el `DELETE` directo en SQL sobre `storage.objects`; el borrado se prueba por la API en fases posteriores. Un `UPDATE` ajeno no falla, sino que afecta a 0 filas por RLS; se comprueba que el objeto sigue intacto.
- **CI:** job `database` en `.github/workflows/ci.yml`. No se ha ejecutado en GitHub porque no hay remoto.

## Fase C (datos reales y búsqueda)

### Capa de datos
- `REBOARD_DATA_SOURCE=supabase` usa `supabaseRepository`. Con `mock` (por defecto) todo sigue igual.
- **Lecturas públicas** con el cliente anónimo sin cookies dentro de `'use cache'` (`cacheLife('minutes')`), con etiquetas `listings`, `listing:{id}`, `catalog` y `shops`.
- **`now()` pasa a ser asíncrono y cacheado:** en Next 16 un `new Date()` suelto en el prerender es un error. El mock devuelve la fecha DEMO.
- **`capabilities.distance`:** Supabase no tiene km, así que la UI oculta la distancia y «Más cerca» pasa a «Primero mi zona». En «Cerca de ti» de la home, una sola franja «En {zona}». ⚠ Es un cambio visible, pero solo con datos reales.
- **Tipos y volumen:** `Seller.id` añadido. `CatalogSize.volume` admite `null`: si el fabricante no publica litros, se muestra «litros sin publicar» y no se inventan.
- **Relaciones en PostgREST:** se nombran por su clave foránea (`profiles!listings_seller_id_fkey`), porque hay varios caminos entre `listings` y `profiles`.
- **`proxy` no puede usar `'use cache'`:** usa consultas ligeras con una caché en memoria de 60 s por instancia (`src/lib/data/lookup.ts`).
- **`generateStaticParams`:** con la base vacía devuelve un marcador que da 404, porque Cache Components exige al menos un parámetro.

### Migraciones nuevas
Las anteriores no se modifican.
- **`…090000_similar_listings`:** «Tablas similares» en SQL. Además, la búsqueda desempata por `id asc`, igual que el mock.
- **`…090100_listings_guard_import_dates`:** el servidor conserva `confirmed_at` al importar. Lo detectó la paridad: un `INSERT … ON CONFLICT` reescribía la fecha. Los usuarios siguen confirmando siempre «ahora»; lo comprueba un test pgTAP.
- **`…090200_search_performance`:** `listing_matches` se llamaba una vez por fila (decodificando el JSON en cada una). Se sustituye por `matching_listings`, que decodifica una vez y filtra en una sola consulta. La semántica es la misma: 126 pgTAP y 41 de paridad. Con 10.000 anuncios, la búsqueda pasa de ~600 ms a ~60 ms y las facetas de ~1,8 s a ~150 ms.
- **`…090300_similar_materialized`:** lee el anuncio de referencia una vez. Con estadísticas desactualizadas tras una carga masiva tardaba más de 150 ms; ahora 12 ms.

### Rendimiento
Supabase local, sin la caché de Next, p95 en ms:

| Operación | 100 | 1.000 | 10.000 |
|---|---:|---:|---:|
| Búsqueda sin filtros (24) | 10 | 13 | 64 |
| Búsqueda compleja (24) | 8 | 9 | 29 |
| Página 10 | 8 | 15 | 92 |
| Facetas sin filtros | 10 | 30 | 159 |
| Facetas con filtros | 11 | 14 | 134 |
| Recuento | 6 | 7 | 22 |
| Ficha | 6 | 4 | 5 |
| Similares | 6 | 8 | 13 |

Con la caché de páginas (minutos), la mayoría de las visitas no consultan la base de datos.

### Pruebas y herramientas
- **`npm run test:integration`:**
  - 41 tests de paridad que cargan el inventario DEMO en Supabase **local**. `local-supabase.ts` se niega a usar una URL no local.
  - Se comparan conjuntos, recuentos y secuencias de la clave de orden; los empates se ordenan igual gracias al desempate por id.
- **`npm run perf:local`:** medición con 100, 1.000 y 10.000 anuncios.
- **`npm run env:local`:** genera `.env.local` para Supabase local, con las claves de prueba públicas de Turnstile.
- **`npm run db:seed-demo`:** carga el inventario DEMO **solo en local** para desarrollar.
- **e2e:** siguen ligados al modo mock (ids `a1040`, `noindex` DEMO). Con datos reales locales fallan 7 tests por esos ids, como era de esperar; las rutas y el contenido coinciden. Para ejecutarlos con `.env.local` en modo Supabase: `REBOARD_DATA_SOURCE=mock npm run build && npm run test:e2e`.
- **`tsx`** (dependencia de desarrollo) para los scripts en TypeScript.
- **Pendiente:** el asistente sigue limitado a los 300 resultados más recientes de `/api/tablas`. Es suficiente para el MVP; con mucho inventario convendrá agregar en SQL.

## Fase D (cuentas, en local)
### Acceso
- **Código de 6 cifras por email (OTP), sin contraseña ni enlace mágico.**
  - Sirve igual en el móvil que en otro dispositivo, y en la PWA no saca al usuario de la app.
  - Plantilla en español en `supabase/templates/codigo.html` (Magic Link y Confirm signup). Caduca en 15 minutos.
- **El acceso lo hace el cliente del navegador** (`signInWithOtp` + `verifyOtp` con `@supabase/ssr`):
  - la sesión queda en cookies y el propio navegador la refresca;
  - las páginas públicas siguen siendo estáticas (PPR) porque el servidor no lee la sesión en ellas;
  - con Server Actions habría que leer la sesión en el servidor en cada página para pintar la cabecera.
- **Refresco en `proxy.ts` solo en rutas privadas** (`/cuenta`, `/panel`, `/entrar`):
  - un Server Component no puede escribir cookies;
  - si refrescara un token caducado, el refresh token rotado se perdería y cerraría la sesión;
  - sin cookie `sb-*` no se llama a Auth.
- **Redirecciones:**
  - `/cuenta` sin sesión → `/entrar?siguiente=…`;
  - `/entrar` con sesión → el destino;
  - el destino pasa por `safeNext` (solo rutas internas).
- **`/auth/confirm`:** acepta los enlaces con `token_hash` de otros emails de Auth (cambio de email, invitaciones).
- **Sin base de datos (modo DEMO) no hay cuentas:**
  - `authEnabled()` exige `REBOARD_DATA_SOURCE=supabase` y las claves públicas;
  - `/entrar` explica que los guardados viven en el dispositivo;
  - la cabecera no muestra «Entrar».

### Guardados
- **Dónde viven:** en la tabla `favorites`, leídos y escritos desde el navegador bajo RLS (cada usuario solo ve y escribe los suyos; probado). Sin Server Actions: RLS ya protege y se evita un salto.
- **Al entrar:** los guardados del dispositivo se suben con un upsert idempotente y se unen a los de la cuenta. Así aparecen en otro dispositivo (probado en el navegador).
- **Al salir:** se vacían del dispositivo (dispositivos compartidos); siguen en la cuenta.
- **Comparación, alertas y perfil del asistente:** siguen en el dispositivo. Las alertas en la nube llegan con los avisos por email (después del MVP).

### Turnstile
- **Widget** (`src/components/security/Turnstile.tsx`):
  - solo se carga si hay `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
  - modo `interaction-only`;
  - el botón espera al token.
- **Verificación en el servidor** (`src/lib/security/turnstile.ts`):
  - falla cerrado: sin secreto, sin token, con respuesta negativa o con Cloudflare caído, rechaza;
  - se usará en publicar, contacto y reportar (fases E y F).
- **El acceso lo valida Supabase Auth** cuando su CAPTCHA está activo:
  - en remoto: Authentication → Attack Protection;
  - en local está desactivado; el widget se muestra con la clave de prueba y Supabase ignora el token.

### Configuración local
- **Límite de emails:** `auth.rate_limit.email_sent = 30` por hora. Con 2, el valor por defecto, no se puede ni probar. En remoto se ajusta en el panel al activar Resend.
- **SMTP:** sin Resend en local; los emails se leen en Mailpit (http://127.0.0.1:54324). La configuración de Resend queda documentada en `config.toml` y en SECURITY.md, pendiente de la cuenta del titular.

### Pruebas
- **`tests/integration/auth-accounts.test.ts`** (5), contra Supabase local y Mailpit:
  - código por email con asunto en español;
  - un código inventado o ya usado no sirve;
  - perfil creado al entrar;
  - nombre editable, pero no el rol ni el perfil de otro;
  - guardados idempotentes, privados y no falsificables;
  - sin sesión no hay acceso.
- **`tests/unit/auth-security.test.ts`** (20): `safeNext`, ids, nombre visible, mensajes de error y verificación de Turnstile con `fetch` simulado.
- **Prueba de humo en el navegador** (modo supabase): redirección a `/entrar`, acceso con el código de Mailpit, nombre en `/cuenta` y en la cabecera, fusión del guardado del invitado (comprobada en la base de datos), el mismo guardado en un segundo dispositivo y salida. Sin errores de consola.

## Fase E (publicar y gestionar, en local)
### Flujo
- **Paso 1 (cliente):** cada foto se abre con `createImageBitmap` (orientación EXIF aplicada), se reduce a un máximo de **1600 px** y se recodifica en un canvas a **WebP** (o JPEG si el navegador no codifica WebP).
  - Al recodificar se pierden **todos** los metadatos (EXIF, GPS, cámara).
  - Probado en e2e con un JPEG con GPS: el resultado es WebP de 1600 px sin bloque EXIF.
- **Borrador en IndexedDB** (`src/lib/publish/draft-store.ts`):
  - guarda los datos y las fotos ya procesadas;
  - al volver se recupera, con aviso y opción «Empezar de cero»;
  - se borra al publicar.
- **Cuenta al final:** si no hay sesión, el paso 5 incrusta el acceso con código (`LoginForm` con `onDone`), sin salir del formulario.
- **Publicar** (`src/lib/publish/client-publish.ts`):
  1. `saveListingAction`:
     - valida con zod, comprueba la sesión con `getUser()` y Turnstile (falla cerrado);
     - crea el anuncio como `draft` o guarda los cambios;
     - guarda el teléfono en `listing_contacts`, la tabla privada.
  2. **El navegador sube las fotos nuevas directamente a Storage** (`{uid}/{listing_id}/{uuid}.webp`). No pasan por una función de Vercel, que limita el cuerpo a 4,5 MB.
  3. `finalizeListingAction`:
     - comprueba rutas y que cada archivo existe;
     - reescribe `listing_photos` en el orden elegido y borra de Storage las que se han quitado;
     - publica si era borrador;
     - `updateTag('listings')` y `updateTag('listing:{id}')`: se ve al momento en `/buscar`, landings, home y ficha (E4).
- **Si algo falla a mitad:** el borrador sigue en el dispositivo y el reintento actualiza el mismo anuncio (no lo duplica). Las fotos ya subidas no se vuelven a subir.

### Datos
- **Origen de las medidas:**
  - medida del catálogo sin tocar → `manufacturer`, con `model_size_id`;
  - escrita, pegada o confirmada por el vendedor → `seller`;
  - sin valor, sin origen.
- **Esquema compartido:** `src/lib/publish/schema.ts` usa los límites de los CHECK y lo usan el cliente (aviso previo) y el servidor.
- **Teléfono:** se normaliza a E.164 (sin prefijo se asume +34). Sin verificación por SMS (decisión aprobada).
- **Contacto:** solo WhatsApp o llamada; se quita «Email» del formulario porque la base de datos y el producto no lo contemplan.
- **Slug:** «marca-modelo-medida-zona», como los DEMO: `shaper-local-6-4-cantabria` o `fish-artesanal-6-4-cantabria`.

### Panel y edición
- **`/panel` con cuenta:**
  - anuncios propios en cualquier estado salvo borrador;
  - acciones (`panelActionServer`): confirmar, cambiar precio (en línea), marcar vendida, retirar y volver a publicar;
  - las transiciones y las fechas las impone el disparador `listings_guard`;
  - los errores llegan en español.
- **Sin cuenta, con base de datos:** `proxy` pide entrar.
- **En la demo:** sigue el panel simulado con `rb-panel-v1` (se quitó `pickOwn` en la fase C).
- **Editar:** `/vender/publicar?editar=aN` lee el anuncio con la sesión del dueño (RLS), con sus fotos y su teléfono. Si no es suyo, avisa sin revelar nada. Al bajar el precio, la ficha muestra «Ha bajado de X a Y».

### Pruebas
- **`tests/integration/publish.test.ts`** (8), contra Supabase local con usuarios reales:
  - borrador privado y teléfono invisible para otros;
  - Storage solo en la carpeta propia;
  - no se publica sin fotos subidas ni con rutas ajenas;
  - publicado y visible en la búsqueda filtrando por zona, marca, litros y precio;
  - edición con reordenación, borrado en Storage y bajada de precio;
  - otro usuario no puede editar;
  - acciones del panel y transiciones inválidas.
- **`tests/unit/publish-schema.test.ts`** (15) y **e2e de EXIF** (1).
- **Prueba de humo en el navegador** (móvil, modo supabase), sin errores de consola: 2 fotos, Shaper local con medidas pegadas, cuenta incrustada, publicado, ficha, `/buscar`, cambio de precio con el anterior tachado y vendida.

## Fase F (contacto, caducidad y moderación, en local)
### Contacto (F1)
- **El número no se envía en el HTML.**
  - La ficha muestra el mensaje sugerido y «Mostrar contacto».
  - Al pulsarlo, `revealContactAction` hace lo siguiente:
    1. comprueba Turnstile en el servidor;
    2. calcula `HMAC-SHA256(IP, CONTACT_IP_SALT)` (`src/lib/security/ip.ts`);
    3. llama a `reveal_contact` con service role.
  - La función registra el evento y aplica el límite de 30 por hora y por IP.
- **Después aparecen los enlaces reales:**
  - `wa.me/{número}?text=…`;
  - «Llamar · +{número}».
  - Se muestran como enlaces, no con `window.open` tras un `await`, para que los navegadores no los bloqueen.
- **Sin registro** (decisión aprobada). Con sesión, el evento guarda también el usuario.
- **Fallos:** si falta `CONTACT_IP_SALT`, no se revela nada (falla cerrado).

### Caducidad y limpieza (F2)
- **`GET /api/cron/expirar`:**
  - Vercel Cron lo llama a diario a las 04:15 UTC (`vercel.json`).
  - Se autentica con `Authorization: Bearer $CRON_SECRET`, comparado en tiempo constante; sin secreto, rechaza.
- **Qué hace:**
  - `expire_listings()`: lo publicado sin confirmar en 30 días pasa a caducado;
  - borra los borradores de más de 7 días y sus fotos en Storage.
- «Pendiente» (más de 14 días) se sigue calculando al leer.
- **`vercel.json` no fija región:** debe coincidir con la del proyecto de Supabase, que aún no existe (B7). Se fijará entonces.

### Reportes y moderación (F3)
- **Reportar exige sesión y Turnstile.**
  - Sin sesión, «Reportar anuncio» lleva a `/entrar` y vuelve a la ficha.
  - Un reporte por persona y anuncio.
  - Con 3 reportes abiertos, el anuncio pasa a `flagged`: sigue visible y entra en la cola.
- **`/moderacion`:**
  - solo con `is_moderator()`; si no, «No tienes acceso»;
  - sin sesión, `proxy` pide entrar.
- **Acciones:** retirar, descartar reportes o restaurar.
  - Las escrituras usan service role después de comprobar el rol en la base de datos.
  - Quedan en `moderation_actions`, que la página muestra como registro.
- **Retirar:**
  - oculta el anuncio y borra sus fotos de Storage y sus filas;
  - resuelve los reportes;
  - el dueño no puede reabrirlo (lo impide el disparador).
- **Roles:** sin interfaz para darlos. Un admin lo hace por SQL (`update profiles set role = 'moderator' …`).
- **`currentModerator()` vive en `src/lib/moderation/auth.ts`**, no en un archivo `"use server"`: todo lo que exporta un archivo así es invocable desde el cliente.

### Estadística real (F4)
- **Con cuenta:** el panel muestra «Contacto pedido N veces», contado en `contact_events` (RLS: solo los de sus anuncios). Cuenta veces, no personas.
- **Visitas y guardados simulados:** solo en la demo.

### Pruebas
- **`tests/integration/contact-moderation.test.ts`** (8):
  - HMAC de la IP;
  - el teléfono no viaja con el anuncio y anon no puede llamar a `reveal_contact`;
  - el evento lo ve solo el vendedor;
  - límite de 30 por hora;
  - no se revelan anuncios no publicados;
  - caducidad a 31 días y borrado de borradores con sus fotos;
  - reportes (sesión, duplicado, marca automática);
  - moderación (cola solo para moderadores; retirar oculta y borra fotos; registro; el dueño no puede reabrir).
- **`tests/unit/cron-route.test.ts`** (2): autorización del cron.
- **Prueba de humo en el navegador** (modo supabase), sin errores de consola:
  - el número no está en el HTML;
  - el anónimo lo revela tras Turnstile y obtiene `wa.me/34…`;
  - reportar sin sesión lleva a `/entrar`;
  - el panel cuenta el contacto;
  - `/moderacion` sin rol niega el acceso.


## Fase G (preparación de producción, en local)
- **CSP sin nonce:** un nonce exige render dinámico por petición y anula el prerenderizado parcial. Se acepta `'unsafe-inline'` en `script-src` (lo necesita la hidratación de Next) y el resto de directivas se limitan a orígenes concretos (Supabase, Turnstile, Unsplash para los DEMO). `connect-src` incluye `blob:` para las fotos procesadas en la propia página. Probado con un recorrido completo en modo supabase sin violaciones.
- **Errores:** `error.tsx` (con `retry()` de Next 16) dentro del layout y `global-error.tsx` con estilos en línea (no recibe los globales).
- **Legal:** borradores en `src/lib/content/legal.ts`, sin datos del titular (entre corchetes) y sin afirmar cumplimiento. Describen solo lo que la app hace. Llevan `noindex` y aviso visible; `proxy` da 404 real a slugs desconocidos.
- **Borrar la cuenta:** `/cuenta` exige escribir «BORRAR». El servidor borra las fotos de Storage (no tiene claves foráneas) y el usuario de Auth; la base de datos borra en cascada el resto. Probado en integración. Límite conocido: un moderador con acciones registradas no se puede borrar (`moderation_actions.moderator_id` no tiene cascada, a propósito, para conservar el registro).
- **Dependencias:** vitest 3 → 5.0.3 por avisos críticos (solo desarrollo). Se eligió una versión publicada hace más de dos semanas. `npm` 10.9.4 falla resolviendo pares (`edgesOut`); la instalación se hizo con `npx npm@11.6.2 install` y se alineó `@types/node` con Node 22 (CI y runtime).
- **Capturas visuales:** se ejecutan de una en una (`--workers=1`) y con los elementos sticky fijados. En paralelo aparecían desplazamientos de subpíxel que no eran cambios de diseño.
- **Región de Vercel:** sin fijar hasta crear el proyecto de Supabase (debe coincidir con él).

## Publicar: rediseño del asistente
- **Mismos 5 pasos y la misma lógica** (borrador en IndexedDB, procesado de fotos, validación, publicación, edición, demo/real, reintento sin duplicar). Solo cambia la interfaz: `PublishFlow` orquesta y cada paso es un componente (`StepPhotos`, `StepBoard`, `StepCondition`, `StepPrice`, `StepReview`), con `LivePreview` y `DoneScreen`.
- **Tipo y construcción pasan al paso 2** («La tabla») y la descripción al paso 3; el teléfono pasa al paso 4, junto al método de contacto. El servidor exige lo mismo que antes; solo cambia en qué paso se pide cada dato.
- **Vista previa propia (`LivePreview`) en lugar de `ListingCard`:** la tarjeta real incluye guardar, comparar y enlaces que no tienen sentido en un anuncio que no existe; sin fotos, muestra la silueta de la forma, nunca una foto de stock.
- **Estado de la tabla: solo los 4 valores del enum `board_condition`** (`como-nueva`, `muy-buen-estado`, `buen-estado`, `con-reparaciones`). Lo decidió el usuario: sin migración ni valores nuevos; se explican con texto llano en cada tarjeta.
