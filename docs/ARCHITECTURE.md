# Arquitectura — Reboard MVP

Estado: **aprobada** (22-10-2026), con las decisiones de producto de §7. La fase A (preparación) está hecha; el backend (fases B–G) aún no. Documentos relacionados: [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), [MVP_IMPLEMENTATION.md](MVP_IMPLEMENTATION.md) y el plan por tareas de [ROADMAP.md](ROADMAP.md).

---

## 1. Auditoría del estado actual

### 1.1 Stack y dependencias
| Pieza | Estado |
|---|---|
| Next.js 16.4.2 (App Router), React 19.3, TypeScript 5 | `cacheComponents` y `partialPrefetching` activos |
| Dependencias de producción | Solo `next`, `react`, `react-dom` y `server-only` |
| Estilos | CSS Modules sobre `src/styles/tokens.css`. Sin librería de UI |
| Tests | ✅ Fase A: Vitest (unitarios, caracterización de la búsqueda, contrato del repositorio) y Playwright (rutas, recorridos y capturas locales) |
| CI / despliegue | ✅ `.github/workflows/ci.yml` y `.env.example`. Vercel aún sin configurar (G3) |
| Git | ✅ Trabajo commiteado en la rama `mvp` (fase A). `master` sin tocar. Sin remoto configurado |
| Server Actions | **Ninguna**: hoy toda la escritura es local al navegador |

### 1.2 Rutas (28 entradas)
- **Indexables (SSG/PPR):**
  - `/`
  - `/tablas/[segmento]`, `/tablas/[segmento]/[forma]` (110 landings)
  - `/anuncio/[slugId]`
  - `/marcas/[marca]`, `/marcas/[marca]/[modelo]`
  - `/tiendas`, `/tiendas/[slug]`
  - `/guias`, `/guias/[slug]`
  - `/calculadora-litros`
  - `/vender`
- **noindex:** `/buscar`, `/comparar`, `/guardado`, `/alertas`, `/panel`, `/vender/publicar` y `/sistema`.
- **Route Handlers:**
  - `GET /api/tablas/recuento`: recuento para el «Buscar N tablas» de la home.
  - `GET /api/tablas`: resultado del asistente.
  - `GET /api/anuncios?ids=`: guardado y comparador.
- **Proxy (`src/proxy.ts`):** devuelve 404 reales y redirige con 308 al slug canónico. Funciona sobre `/tablas`, `/anuncio`, `/marcas`, `/tiendas` y `/guias`.
- **SEO:** metadatos por página con canonical y hreflang es-ES, y JSON-LD (Product/Offer, ItemList, BreadcrumbList, Article y LocalBusiness si no es demo). También `robots.ts` y `sitemap.ts`. Con datos DEMO todo va con `noindex, nofollow`.

### 1.3 Capa de datos
- **Interfaz:** `ListingRepository` (`src/lib/data/repository.ts`). Única implementación: `mockRepository`, en memoria, con `isDemo = true`.
- **Problema principal (resuelto en A6):** la interfaz devolvía **colecciones completas** (`all()`, `active()`). Todo el filtrado, la ordenación y los recuentos se hacen en JS sobre el inventario entero:
  - `src/lib/search/match.ts`
  - `src/components/search/SearchResults.tsx`
  - `src/components/home/NearSection.tsx`
  - `src/app/page.tsx`
  - las páginas de marca, modelo y tienda
  - `src/app/api/tablas/route.ts`
  - `src/proxy.ts`

  Con una base de datos real esto tiene que pasar a SQL. **Desde A6** las páginas piden consultas al repositorio y el filtrado en memoria solo vive en `mock-repository.ts`. Excepción: el asistente refina en el navegador los (máximo 300) resultados de `/api/tablas`.
- **Modelo:** `src/lib/domain/types.ts` (`Listing`, `Measured<T>`, `CatalogModel`, `Shop`) es correcto y se mantiene como contrato de la UI. La base de datos se mapea a este tipo.

### 1.4 Dónde hay datos mock o almacenamiento local
| Lugar | Qué guarda | Destino en el MVP |
|---|---|---|
| `src/mocks/demo-inventory.ts` | Anuncios, catálogo y tiendas DEMO | Solo desarrollo local y tests (§6). **Nunca se cargan en Supabase.** (`unsplash()` ya está en `src/lib/images.ts`) |
| `src/lib/data/mock-repository.ts` | Repositorio DEMO | Se mantiene con `REBOARD_DATA_SOURCE=mock` (desarrollo sin red, tests) |
| Páginas que importan `@/mocks`: `page.tsx`, `guias/*`, `marcas/[marca]/[modelo]`, `tiendas/*` | Fotos de stock por id | Imágenes estáticas propias o de Storage |
| `localStorage rb-usuario-v1` | Guardados, comparación, alertas y perfil de surfista | Guardados → tabla `favorites` si hay sesión (se fusionan al iniciar sesión). La comparación y el perfil siguen locales. Las alertas siguen locales hasta que haya emails |
| `localStorage rb-panel-v1` | Cambios del panel DEMO | Se elimina: el panel lee y escribe en la base de datos |
| `localStorage rb-asistente-v1` | Respuestas del asistente | Se mantiene (es útil y no es sensible) |
| Cookie `rb_zona` | Zona «cerca de ti» | Se mantiene hasta que haya geolocalización |
| `src/lib/publish/service.ts` | Stub `demoPublishService` | Implementación real con Server Actions y Storage |
| `src/app/panel/page.tsx` (`pickOwn`) | Anuncios «propios» elegidos del inventario | Anuncios de `auth.uid()` |
| `src/lib/content/brands.ts`, `guides.ts` | Textos editoriales (los de marca, DEMO) | Siguen siendo contenido en el código. Los textos de marca se revisan antes de producción |

### 1.5 Lo que se reutiliza sin rediseñar
Toda la UI se mantiene. Lo que cambia es de dónde vienen los datos y adónde van las escrituras.
- **Sin cambios:**
  - `ListingCard`, `Gallery`, `Breadcrumbs`, `JsonLd`, `Header`, `Footer`, `CompareTray`, `SearchBar`, `FilterPanel`
  - Asistente: `FinderWizard` y `recommend.ts`
  - Comparador: `Comparator`
  - Publicar: `PublishFlow` (sus 5 pasos), `parse.ts` y `draft.ts`
  - Panel: `SellerPanel` (visual)
  - Catálogo: `ModelSizes`
- **Lógica pura que se reutiliza tal cual:**
  - `filters.ts`: el estado en la URL y su serialización. **Las URLs de búsqueda no cambian.**
  - `describe.ts`, `landings.ts`, `present.ts` y `format.ts`.
  - `taxonomy.ts`: sus slugs coinciden con los enums de la base de datos.
- **A adaptar:**
  - `match.ts`: deja de usarse para buscar y se queda como referencia y para tests de paridad.
  - `PublishFlow`: el paso 5 cambia el OTP por SMS por el inicio de sesión por email, y las fotos se suben.
  - `SellerPanel`: pasa a usar acciones reales.

---

## 2. Arquitectura recomendada

Se **acepta la arquitectura propuesta** (Next.js + Supabase Postgres, Auth y Storage, Vercel y Resend), con estos ajustes técnicos:

1. **Resend es necesario desde el MVP, no solo «para futuros emails».** Supabase Auth envía los emails de acceso (código o enlace) y su SMTP por defecto tiene límites muy bajos y no sirve para producción. Hay que configurar un SMTP propio en Supabase Auth: Resend es el candidato natural. Sin eso, el registro no es fiable.
2. **Acceso por email con código (OTP) y sin contraseña** como único método del MVP. Encaja con «registro al final», no exige gestionar contraseñas y evita SMS. Google OAuth es opcional y posterior.
3. **Un único proyecto Supabase (`reboard`, UE, plan gratuito).** No hay staging: las pruebas se hacen contra Supabase local en Docker. Los datos DEMO nunca entran en Supabase.
4. **Búsqueda en Postgres puro (B-tree y consultas parametrizadas) más una función RPC para los recuentos de facetas.** No hace falta motor de búsqueda externo (Algolia, Meilisearch) con el volumen previsto (miles de anuncios).
5. **Sin PostGIS ni coordenadas.** La ubicación es provincia/isla + municipio (§4).

```
Navegador ──► Vercel (Next.js 16)
               ├─ Server Components (lectura): cliente Supabase ANÓNIMO sin cookies
               │    dentro de 'use cache' + cacheTag → prerender / ISR
               ├─ Server Actions (escritura): cliente Supabase de USUARIO (cookies, RLS)
               │    → updateTag() para refrescar
               ├─ Route Handlers: recuentos, contacto, cron (CRON_SECRET)
               └─ proxy.ts: 404/308 + refresco de la sesión de Supabase
                     │
                     ▼
          Supabase: Postgres (RLS) · Auth (email OTP, SMTP de Resend) · Storage (fotos)
```

### 2.1 Clientes de Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
| Cliente | Dónde | Clave | Para qué |
|---|---|---|---|
| `createPublicClient()` | Servidor, **sin cookies** | anon (pública) | Lecturas públicas cacheadas: anuncios publicados, catálogo y tiendas. Se puede usar dentro de `'use cache'` porque no lee la petición |
| `createUserClient()` | Servidor (Server Actions, páginas privadas) | anon + cookies de sesión | Todo lo que hace el usuario, con RLS como `authenticated` |
| `createBrowserClient()` | Cliente | anon | Solo Auth (enviar y verificar el código) y la subida a Storage con la sesión del usuario |
| `createServiceClient()` | Servidor, `server-only` | **service role** | Solo cron de caducidad, revelar contacto, moderación y seeds. Nunca en código que llegue al cliente |

### 2.2 Cache Components y datos reales
- **Lecturas públicas:** funciones de la capa de datos con `'use cache'`, `cacheLife('minutes')` y etiquetas: `listings`, `listing:{id}`, `catalog` y `zone:{slug}`.
  - Las landings y las fichas siguen prerenderizándose.
  - `generateStaticParams` de `/anuncio` devuelve solo los N anuncios más recientes (con Cache Components tiene que devolver al menos uno). El resto se genera bajo demanda y queda en caché.
- **Escrituras:** Server Actions que, tras guardar, llaman a `updateTag('listing:{id}')` y `updateTag('listings')`. El usuario ve su cambio al instante (*read-your-own-writes*). El cron usa `revalidateTag(tag, 'max')`.
- **Sesión:** la del usuario se lee con `'use cache: private'` o detrás de `<Suspense>`, nunca dentro de un `'use cache'` normal. Ver `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- **Riesgo:** el `use cache` normal es memoria por instancia en serverless. Si la tasa de aciertos es mala en Vercel, se evalúa `'use cache: remote'`.

### 2.3 Capa de datos por consultas (✅ implementada en A6; contrato real en `src/lib/data/repository.ts`)
```ts
interface ListingRepository {
  readonly isDemo: boolean;
  now(): Date;
  search(f: Filters, v: ViewState, ctx: { here: string }): Promise<{ items: Listing[]; total: number; unknownVolume: Listing[] }>;
  facets(f: Filters): Promise<{ total: number; zones: Record<string, number>; shapes: Record<string, number> }>;
  count(f: Filters): Promise<number>;
  byPublicId(id: string): Promise<Listing | null>;
  similar(l: Listing, limit: number): Promise<Listing[]>;
  recent(opts: { zone?: string; limit: number }): Promise<Listing[]>;
  byIds(ids: string[]): Promise<Listing[]>;
  catalog(): Promise<CatalogModel[]>;
  shops(): Promise<Shop[]>;
}
```
- `mockRepository` implementa esta misma interfaz reutilizando `matches()`. Así sirve de **oráculo para tests de paridad** frente a la implementación de Supabase.
- Las escrituras van aparte: `listings.actions.ts` y `favorites.actions.ts`, todas Server Actions.

### 2.4 Lo que no se propone (y por qué)
- **ORM (Prisma o Drizzle):** el cliente de Supabase y SQL en migraciones bastan, y las RLS viven en SQL igualmente. Se puede reconsiderar si las consultas crecen.
- **Librería de formularios (react-hook-form):** `PublishFlow` ya gestiona su estado. Solo se añade validación de servidor.
- **Validación:** se añade `zod` (una dependencia pequeña y justificada) para validar en las Server Actions. Es la única librería nueva además de las de Supabase.

---

## 3. Mapeo de URLs (se conservan)
| URL | Antes | Después |
|---|---|---|
| `/anuncio/{slug}-a{id}` | id `a1040` del mock | `public_id = 'a' + id` (una secuencia que empieza en 100000, para no chocar con los ids DEMO). Se conserva `idFromSlugId` |
| `/tablas/*`, `/buscar?…` | Igual | Igual: `filters.ts` no cambia |
| `/marcas/{marca}/{modelo}` | Slug del catálogo DEMO | Slugs de la tabla `board_models` |
| `/panel`, `/vender/publicar` | Públicas (demo) | Requieren sesión en el último paso de publicar y para el panel |
| Nueva: `/entrar` | — | Acceso por email (noindex) |
| Nueva: `/auth/confirm` | — | Route Handler que verifica el enlace o el código de Supabase |

---

## 4. Ubicación (decisión aprobada: municipio y provincia, sin coordenadas)
- Cada anuncio guarda **provincia o isla** (`zone_slug`, las zonas actuales) y **municipio** (`town`). No se guardan coordenadas precisas.
- La lista de municipios debe salir de una fuente oficial (INE). Es una tarea de datos de la fase B y **no se inventa**: mientras no exista, el municipio es texto con sugerencias por zona, como hoy.
- **Sin distancia en km:** el selector de distancia se oculta con datos reales, y la ordenación «Más cerca» pasa a ser «Primero mi zona».
  - El cambio es visible y se documentará en DECISIONS.md cuando se haga (tarea C2).
  - Con datos DEMO todo sigue como ahora.
- «Cerca de ti» sigue usando la cookie `rb_zona` (provincia o isla elegida por el usuario).

## 5. Entornos y despliegue (mínimo coste)
| Entorno | App | Datos |
|---|---|---|
| Desarrollo | `npm run dev` | `REBOARD_DATA_SOURCE=mock` (DEMO en memoria) o Supabase **local** en Docker |
| Tests y CI | `npm test`, `npm run db:test` y e2e | Mock y Supabase **local** (GitHub Actions tiene Docker). **Nunca el proyecto remoto** |
| Producción | Vercel (plan Hobby) en reboard.es | El proyecto Supabase `reboard` |

- **Migraciones:**
  - Viven en `supabase/migrations/*.sql`, versionadas en git, y se prueban en local con `npm run db:reset` y `npm run db:test`.
  - Se aplican al proyecto remoto con `npx supabase db push`, **solo con autorización**.
  - **Nunca cambios a mano en el panel de Supabase.**
- **Riesgo de tener un solo proyecto:** no hay un entorno intermedio, así que una migración errónea afecta directamente a los datos reales. Mitigaciones:
  - Toda migración pasa antes `db:reset` y `db:test` en local.
  - Se revisa el SQL antes de `db push`.
  - Se hace una copia (`npx supabase db dump`) antes de cada migración en remoto, porque el plan gratuito no incluye copias de seguridad automáticas restaurables.
- **Despliegues de Preview en Vercel:** **no** llevan las claves de Supabase y funcionan con `REBOARD_DATA_SOURCE=mock`. Así una rama en pruebas nunca escribe en la base de datos real.
- **Cron de caducidad:** Vercel Cron (incluido en Hobby) llama a `/api/cron/expirar` con `CRON_SECRET`.

## 6. Datos de demostración (sin borrar nada)
1. `src/mocks` y `REBOARD_DATA_SOURCE=mock` se mantienen para el desarrollo local, los tests (caracterización y contrato) y los Preview de Vercel.
2. **Supabase nunca contiene anuncios, tiendas ni catálogo DEMO.** Solo datos de referencia reales (zonas) y, más adelante, el catálogo verificado (G2).
3. **Paridad (C3):** los tests cargan el inventario DEMO en el Supabase **local** dentro de la ejecución del test y comparan `search` y `facets` con el mock. Nunca en el proyecto remoto.
4. El banner DEMO y el `noindex` global dependen de `repo.isDemo`. Con `REBOARD_DATA_SOURCE=supabase`, `isDemo = false`.

## 7. Decisiones de producto (aprobadas el 22-10-2026)
| Decisión | Aprobado | Efecto técnico |
|---|---|---|
| Dominio | **reboard.es** | `NEXT_PUBLIC_SITE_URL=https://reboard.es` en producción; remitente de los emails en ese dominio |
| Supabase | **Un único proyecto `reboard` en la UE, plan gratuito** | §5. Pruebas en Supabase local (Docker) |
| Acceso | **Email con código OTP** | Supabase Auth OTP + SMTP de Resend. Sin contraseñas ni SMS |
| Registro | **Al final de publicar** | El borrador y las fotos viven en el cliente hasta el paso 5 (MVP_IMPLEMENTATION §2) |
| Ubicación | **Municipio y provincia, sin coordenadas** | §4 |
| Contacto | **Sin registro, con límites y protección contra abuso** | `reveal_contact` con límite por IP + CAPTCHA (SECURITY §5) |
| Reportes | **Requieren sesión** | RLS `reports_insert` solo para `authenticated` |
| Vendidos y caducados | **Se mantienen sus URLs** | 200 + `noindex` + alternativas, como ahora. Sin 410 |
| Teléfonos | **Sin verificar al principio** | Riesgo aceptado, con las mitigaciones de SECURITY §5 |
| CAPTCHA | **Cloudflare Turnstile, modalidad gratuita** | Acceso (nativo en Supabase Auth), contacto, publicar y reportar. El token se valida siempre en el servidor |
| Emails | **Resend** (transaccionales) | SMTP de Supabase Auth. Más adelante, avisos de alertas |
| Pagos y mensajería | **Fuera del MVP** | Sin chat propio ni pasarela de pago |

**Siguen pendientes:**
- **Textos legales** (aviso legal, privacidad, cookies y condiciones): bloquean abrir el registro en producción.
- **Copias de seguridad:** el plan gratuito no incluye copias restaurables. Se hace `db dump` manual antes de cada migración y periódicamente (§5).
- **Fuente de municipios:** dataset del INE.

La tabla con las tareas a las que afectan está en [ROADMAP.md](ROADMAP.md#decisiones).
