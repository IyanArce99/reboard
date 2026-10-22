# Base de datos — Supabase Postgres

**La fuente de verdad son las migraciones** de [`supabase/migrations/`](../supabase/migrations). Este documento explica el diseño y las decisiones; si algo no coincide, mandan las migraciones.

**Un único proyecto Supabase** (`reboard`, región UE, plan gratuito). No hay proyecto de staging. Las pruebas se hacen contra **Supabase local en Docker** (`npx supabase start`), nunca contra el proyecto remoto.

| Migración | Contenido |
|---|---|
| `20261022120000_schema.sql` | Tipos, tablas, CHECK e índices |
| `20261022120100_functions.sql` | Disparadores (estado, fotos, reportes), caducidad, `reveal_contact` y búsqueda (`listing_matches`, `search_listings`, `count_listings`, `listing_facets`) |
| `20261022120200_rls.sql` | RLS, privilegios por tabla y por columna, y permisos de las funciones |
| `20261022120300_storage.sql` | Bucket `listing-photos` y sus políticas |
| `20261022120400_reference_zones.sql` | Datos de referencia reales: las 9 zonas (provincias o islas) |

Tests de seguridad: [`supabase/tests/database/`](../supabase/tests/database) (pgTAP, `npm run db:test`).

## Principios
- **El catálogo** (`brands`, `board_models`, `board_model_sizes`) **está separado de los anuncios** (`listings`).
  - Un anuncio *puede* apuntar a una medida de catálogo. Si el modelo no está en el catálogo, guarda marca y modelo en texto libre (`brand_text`, `model_text`): «Shaper local», «Sin marca» u «Otro modelo».
  - Los usuarios nunca escriben en el catálogo.
- **Cada dato técnico guarda su origen** (`*_source`: `seller` | `manufacturer`).
  - Un CHECK impide un valor sin origen o un origen sin valor.
  - `manufacturer` exige una medida de catálogo vinculada.
  - Nunca se inventan litros.
- **Los enums usan los mismos slugs que `src/lib/domain/taxonomy.ts`.**
- **Los teléfonos van en una tabla privada** (`listing_contacts`). Solo se revelan con `reveal_contact`, que ejecuta el servidor con service role, deja registro y limita a 30 contactos por hora y por IP.
- **Nada se borra desde la app:** retirar, vender o moderar son cambios de estado.
- **URLs:** `public_id = 'a' || id`, con ids que empiezan en 100000 (no chocan con los DEMO `a1040…`). Así se conservan las URLs `/anuncio/{slug}-a{id}`.
- **Sin datos ficticios en Supabase:**
  - No se cargan anuncios, tiendas ni catálogo de demostración. Siguen solo en `src/mocks` para el desarrollo local (`REBOARD_DATA_SOURCE=mock`).
  - Por eso no hay columnas `is_demo`.
- **Ubicación:**
  - Provincia o isla: `zone_slug`, con las zonas actuales; Galicia y País Vasco se mantienen como zona única, igual que hoy.
  - Municipio: `town`.
  - Sin coordenadas (decisión aprobada).

## Tablas
| Tabla | Para qué | Lectura | Escritura |
|---|---|---|---|
| `zones` | Provincias o islas (región `canarias`) | Pública | Migraciones |
| `profiles` | Perfil creado al registrarse (`handle_new_user`) | Pública: `id`, `display_name`, `seller_type`, `created_at` | El dueño solo cambia `display_name`; `role` y `seller_type` los cambia un admin |
| `brands`, `board_models`, `board_model_sizes` | Catálogo técnico | Pública | Migraciones o service role (solo datos verificados) |
| `listings` | Anuncios | Publicados, vendidos y caducados no retirados por moderación. El dueño ve todos los suyos | El dueño, solo en las columnas permitidas |
| `listing_photos` | Fotos (ruta en Storage, posición 0–7) | Las de anuncios visibles, y el dueño las suyas | El dueño, en su carpeta |
| `listing_contacts` | Teléfono E.164 | **Solo el dueño** | El dueño |
| `favorites` | Guardados | Los propios | Los propios |
| `contact_events` | Registro de contactos (HMAC de la IP) | El vendedor, los de sus anuncios | Solo `reveal_contact` |
| `reports` | Reportes (requieren sesión, uno por persona y anuncio) | Los propios; moderación, todos | Usuarios con sesión |
| `moderation_actions` | Auditoría de moderación | Moderación | Service role |
| `shops` | Directorio de tiendas y escuelas (vacío hasta que haya reales) | Pública | Service role |

## Estados y reglas (disparador `listings_guard`)
- **Estados:** `draft` → `published` → `sold` / `withdrawn`. Los estados `sold`, `expired` y `withdrawn` pueden volver a `published`.
  - `expired` lo pone solo el cron: `expire_listings()` cuando un anuncio lleva 30 días sin confirmar.
  - «Pendiente de confirmar» no se guarda: se calcula al leer (más de 14 días sin confirmar).
- **Fechas:** `published_at`, `confirmed_at` y `sold_at` las fija la base de datos. Si un usuario cambia `confirmed_at`, se guarda `now()` («Sigue disponible»).
- **Bajar el precio** guarda el anterior en `previous_price_eur` («Ha bajado de X a Y»).
- **Moderación:** el dueño no toca `moderation`.
  - Con 3 reportes abiertos, el anuncio pasa a `flagged`, **que sigue visible** mientras se revisa.
  - `removed` lo oculta y el dueño ya no puede editarlo.
- Las reglas del dueño solo se aplican a `authenticated`. El servidor (service role) y las funciones del sistema no están limitados por ellas.

## Búsqueda
Hay **un único predicado**, `listing_matches(listing, p jsonb, skip)`, que usan:
- `search_listings`: paginada, con orden `recientes | precio | precio-desc | litros | distancia`. Con «distancia», primero va la zona del usuario, porque no hay km.
- `count_listings`.
- `listing_facets`: recuentos por zona, forma y marca. Cada dimensión ignora su propio filtro.

Así la búsqueda y los recuentos no pueden divergir. `p` es la traducción de `Filters` (`src/lib/search/filters.ts`):
- la región se expande a sus zonas;
- `brand: 'sin-marca'` = sin marca de catálogo;
- `fins` es la etiqueta («FCS II»).

La semántica es la de `matches()` del mock: la fijan sus tests de contrato y los tests pgTAP. Las funciones son `security invoker`, así que aplican las RLS de quien llama.

> **Lectura con columnas por privilegio:** en `profiles`, `anon` y `authenticated` solo pueden leer algunas columnas. Con PostgREST hay que pedir columnas explícitas (`select=id,display_name,…`), porque `select=*` falla.

## Storage
- **Bucket `listing-photos`:** público en lectura por URL, con un máximo de 5 MB, y solo `image/webp` e `image/jpeg`.
- **Ruta:** `{user_id}/{listing_id}/{uuid}.webp`. Solo se puede subir a la carpeta propia y para un anuncio propio.
- **Listado:** nadie puede listar el bucket por la API salvo el dueño su carpeta.
- **Recodificación:** el cliente recodifica a WebP antes de subir, lo que elimina el EXIF y el GPS (SECURITY §6).
- **Moderación:** al retirar un anuncio por moderación se borran sus archivos con service role.

## Mapeo base de datos → tipo `Listing` (UI)
| `Listing` | Base de datos |
|---|---|
| `id` | `public_id` |
| `brand` / `model` | `brands.name` o `brand_text` / `board_models.name` o `model_text` |
| `modelSlug` | `board_models.slug` |
| Medidas | `{x}_in` y `volume_l`, con `{x}_source` |
| `distanceKm` | `null` (sin coordenadas) |
| `status` | `published` → `disponible`, o `pendiente` si `confirmed_at` tiene más de 14 días. `sold` → `vendida`, `expired` → `caducada`, `withdrawn` → `retirada` |
| `seller` | `profiles.display_name`, `profiles.seller_type` y `shops.slug` |
| `contact` | `{ method, phone: null }`: **el teléfono nunca viaja en el listado** |
| `photos` | `listing_photos` ordenadas por `position`, con URL pública de Storage |
| `isDemo` | `false` (Supabase nunca tiene datos DEMO) |

`contact_method` solo admite `whatsapp` y `phone`. La opción «Email» del formulario de publicar se retirará al conectarlo (tarea E3).

## Datos
- **Referencia (migración):** las 9 zonas.
- **Catálogo:** vacío. Solo entrará con medidas verificadas contra la tabla del fabricante (`source_note`, tarea G2).
- **`supabase/seed.sql`:** vacío a propósito.
- **Tests:** crean sus usuarios y datos dentro de una transacción que se deshace al terminar. Nunca se ejecutan contra el proyecto remoto.
