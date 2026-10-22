# Implementación del MVP

Objetivo: el primer recorrido real, de principio a fin, **sin rediseñar la interfaz**. Arquitectura en [ARCHITECTURE.md](ARCHITECTURE.md), esquema en [DATABASE.md](DATABASE.md), requisitos en [SECURITY.md](SECURITY.md) y orden de tareas en [ROADMAP.md](ROADMAP.md).

**Fuera de esta fase:** pagos, comisiones, SMS, emails de alertas, geolocalización con distancia real, panel de tiendas e importación CSV.

## 0. Antes de tocar el backend: ✅ hecho (fase A, rama `mvp`)
1. ✅ Commit de recuperación del trabajo (rama `mvp`).
2. ✅ Tests de la lógica pura, caracterización de la búsqueda y contrato del repositorio (Vitest).
3. ✅ La interfaz del repositorio pasa a consultas (`search`, `facets`, `count`, `byIds`…), sin cambios visibles: las capturas de referencia y los e2e son iguales.

## 1. Registrarse o iniciar sesión
- **Ruta nueva `/entrar`** (noindex):
  - Pide el email, envía el código y pide el código. Usa las clases de `ui.module.css`, sin diseño nuevo.
  - Acepta `?volver=/ruta-interna`.
- **`src/app/auth/confirm/route.ts`:** verifica el enlace de Supabase (para quien pulse el enlace del email en vez de teclear el código).
- **Módulos nuevos `src/lib/supabase/*`:** `public.ts`, `server.ts`, `browser.ts` y `service.ts` (ARCHITECTURE §2.1).
- **`src/proxy.ts`:** refresca la sesión **solo** en `/panel`, `/vender/publicar`, `/guardado`, `/entrar`, `/moderacion` y `/auth`. Se mantienen los 404/308 actuales.
- **Cabecera:**
  - Sin sesión: «Entrar».
  - Con sesión: el nombre y un enlace al panel.
  - Va en una isla cliente o en un componente con `'use cache: private'` dentro de `<Suspense>`, para no volver dinámica la página entera.
- **Guardados:** al iniciar sesión, los ids de `rb-usuario-v1.saved` se fusionan en `favorites` con una Server Action idempotente. Después, con sesión, se lee y escribe en la base de datos; sin sesión sigue funcionando en local.

## 2. Publicar una tabla con fotos reales
Se mantiene `PublishFlow` (5 pasos). Los cambios:
- **Fotos (paso 1):**
  - Siguen en memoria como `File`.
  - Se guardan en IndexedDB para no perderlas si se recarga, con fallback si no está disponible.
  - Se redimensionan y recodifican a WebP en el cliente, lo que también quita el EXIF (SECURITY §6).
- **Paso 2:** el catálogo viene de la base de datos. `model_size_id` se envía si se eligió una medida del catálogo. «Shaper local», «Sin marca» y «Otro modelo» van a `brand_text` y `model_text`.
- **Paso 4:** se añade el **nombre visible** del vendedor (`profiles.display_name`) si aún es «Surfista». El teléfono pasa de «verificación» a dato de contacto.
- **Paso 5:** «Verificar teléfono» se sustituye por **«Publicar»**:
  1. Si no hay sesión, se abre el acceso por email en un modal o una hoja. El borrador sigue en el cliente: el **registro va al final**, como pide PRODUCT.md.
  2. La Server Action `createListingDraft(draft)` valida con zod e inserta el anuncio en `listings` con `status = 'draft'`. Guarda `listing_contacts` y devuelve `listingId`.
  3. El cliente sube cada foto a `listing-photos/{uid}/{listingId}/{uuid}.webp`.
  4. La Server Action `publishListing(listingId, photos[])` comprueba los archivos, inserta `listing_photos`, pasa a `published` y llama a `updateTag('listings')` y `updateTag('listing:a…')`.
  5. Pantalla final real: «Tu tabla está publicada» con el enlace a `/anuncio/{slug}-a{id}`. **Se quitan los textos «(demo)»** solo cuando `!isDemo`.
- **Implementación de `PublishService`** con estas acciones. `demoPublishService` se queda para `REBOARD_DATA_SOURCE=mock`.

## 3. Guardar el anuncio en la base de datos
- **`src/lib/data/supabase-repository.ts`:** implementa `ListingRepository` y mapea las filas al tipo `Listing` (tabla en DATABASE.md).
- **Acciones de escritura:** `src/lib/data/listings.actions.ts` (`'use server'`):
  - `createListingDraft`, `publishListing`, `updateListing`, `confirmAvailability`, `lowerPrice`, `markSold`, `relist` y `withdrawListing`.
- **Reglas de cada acción:**
  1. `getUser()`; sin sesión → error.
  2. Validación con zod.
  3. Escritura con el **cliente de usuario**: RLS y disparadores hacen el resto.
  4. `updateTag`.
  5. Devuelve `{ ok, id }` o `{ error }`.

## 4. Mostrarlo en el buscador y en su página pública
- **Lecturas públicas** con `createPublicClient()` dentro de `'use cache'` + `cacheTag` (`listings`, `listing:{public_id}`, `catalog`).
- **`/anuncio/[slugId]`:**
  - `generateStaticParams` devuelve los 200 más recientes; el resto se genera bajo demanda.
  - `proxy` mantiene el 404 real y el 308 al slug canónico. Valida contra un índice ligero (`select slug from listings where public_id = $1`), con caché corta.
- **Home, landings, marca y modelo:** las mismas consultas, ya en SQL.
- **`sitemap.ts`:** sale de la base de datos cuando `!isDemo` (ya está preparado).

## 5. Filtrar por precio, litros, medidas, marca y ubicación
- **No cambia:** `filters.ts`, ni las URLs ni la UI.
- **`search()`:** traduce `Filters` a la consulta de Supabase.
  - Litros, longitud, precio, ancho y grosor con `gte` y `lte`.
  - Forma y construcción con `in`. La zona con `eq`, o `in` para regiones.
  - La marca con `brand_id` (o «sin marca»: `brand_id is null`). El modelo con `model_id`.
  - Estado, vendedor, reparaciones y accesorios con `in` o `is null`.
  - Paginación con `range` y orden con `order`.
- **«Litros sin indicar»:** una segunda consulta con `volume_l is null` y el resto de filtros.
- **Recuentos del panel:** la RPC `listing_facets(p jsonb)`.
- **Ubicación:** provincia o isla + municipio, sin coordenadas (decisión aprobada). El selector de distancia se oculta con datos reales y «Más cerca» pasa a «Primero mi zona».
- **Paridad:** tests que comparan `search()` y `facets()` contra `matches()` del mock con el mismo inventario sembrado en staging.

## 6. Contactar con el vendedor
- Se mantienen `ContactButton`, `ContactBar` y el modal de `Contact.tsx`.
- **«Abrir WhatsApp» y «Llamar»** llaman a la Server Action `revealContact(publicId)`:
  1. Obtiene la IP de `headers()` y calcula el HMAC.
  2. Llama a `reveal_contact` con service role.
  3. Devuelve `{ method, phone }`.
- El cliente abre `wa.me/…?text=` o `tel:`. **El teléfono nunca está en el HTML.**
- Errores: «demasiadas solicitudes» y «anuncio no disponible».

## 7. Editar el anuncio o marcarlo como vendido
- **`/panel`:** la página lee los anuncios del usuario (con `getUser()` y el cliente de usuario, dentro de `<Suspense>`). Se elimina `pickOwn` y el `localStorage rb-panel-v1`.
- **Acciones de `SellerPanel`** (ya existen visualmente), conectadas a las Server Actions: confirmar, bajar precio, editar, marcar vendida y volver a publicar.
- **Estadísticas:** «Clics en contactar» es real (`contact_events`). «Visitas» y «guardados» se ocultan mientras no haya datos reales; **nunca se muestran simuladas en producción**.
- **Editar:** `/vender/publicar?editar={public_id}`. Solo el dueño (comprobado en el servidor). Permite añadir o quitar fotos.

## 8. Lo que no se rompe (verificación en cada tarea)
- La **calculadora de litros** sigue usando `/api/tablas`, que pasa a `search()` con el mismo contrato JSON.
- El **comparador y el guardado** siguen usando `/api/anuncios?ids=`, que pasa a `byIds()` con el mismo contrato.
- **URLs y metadatos:** las 110 landings, `/anuncio/*`, `/marcas/*` y los canonical. Hay un test e2e de estado HTTP con una lista de URLs.
- Las capturas de Playwright de escritorio y móvil de las pantallas clave se comparan antes y después de cada tarea de la fase de datos.

## 9. Pruebas
| Tipo | Herramienta | Qué |
|---|---|---|
| Unitarias | Vitest | Lógica pura, mapeo de filas a `Listing` y esquemas zod |
| RLS | Vitest + supabase-js contra Supabase local (`supabase start`) | Anon no ve borradores, teléfonos ni anuncios retirados. El usuario B no edita los de A. Transiciones inválidas fallan |
| Paridad | Vitest | `search` y `facets` frente a `matches()` con el seed DEMO |
| E2E | Playwright | Entrar, publicar con 2 fotos, verlo en `/buscar` filtrado, ficha, contactar (sale el número), editar el precio, marcar vendida (banner de vendida) |
| CI | GitHub Actions | `tsc`, `eslint`, `vitest`, `next build` y Playwright contra el Supabase local |

## 10. Definición de «MVP listo»
- El recorrido e2e pasa en staging.
- La lista de comprobación de SECURITY §9 está completa.
- Producción sin datos DEMO, con catálogo verificado y textos legales publicados.
