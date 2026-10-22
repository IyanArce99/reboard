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
- **Stub** `PublishService` / `demoPublishService` (`src/lib/publish/service.ts`): no verifica el teléfono, no guarda nada y devuelve `persisted: false`.
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
