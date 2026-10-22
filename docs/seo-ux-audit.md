# Auditoría integral UX/UI, copy y SEO · Reboard

Rama `mvp` · octubre de 2026 · alcance: todas las rutas públicas y privadas, los flujos de búsqueda, publicación y TablaFinder, el SEO técnico y el SEO programático.

> **Limitación principal: no hay métricas de búsqueda.** DataForSEO dejó de estar disponible a mitad de la auditoría: la cuenta de prueba quedó pausada antes de ejecutar ninguna consulta, con coste 0. Por eso **este documento no contiene volúmenes mensuales, dificultades ni CPC**. Todas las decisiones se justifican por:
> - la intención de búsqueda;
> - la competencia visible en los resultados;
> - el inventario real de cada página;
> - la buena práctica técnica.
>
> Lo que depende de la demanda real está en §G como decisión pendiente.

---

## A. Resumen ejecutivo

**Estado de partida.** La base técnica era buena:
- renderizado en servidor;
- `generateMetadata` en todas las páginas indexables;
- `/buscar` con noindex y canonical a la landing equivalente;
- JSON-LD en fichas, landings, marcas y guías.

Los problemas eran de detalle, pero se multiplican en el SEO programático:

1. **Indexación sin criterio de contenido.** Cada combinación de zona y tipo con 1 o 2 anuncios era indexable y estaba en el sitemap: páginas casi idénticas a la de la zona o la del tipo. Los anuncios vendidos o caducados seguían siendo indexables.
2. **`robots.txt` contradecía los `noindex`.** Bloqueaba páginas que llevan `noindex`, y Google no puede leer un `noindex` en una URL que no puede rastrear.
3. **Metadatos duplicados o rotos:**
   - una sola meta description para todas las landings, que además decía «1 anuncios»;
   - titles de más de 60 caracteres en modelos y tiendas;
   - la home sin canonical ni datos estructurados de sitio.
4. **Enlazado interno pobre.** Las landings solo enlazaban al pie; no había forma de pasar de «evolutivas en Gran Canaria» a «evolutivas en Tenerife» o a «todas las tablas en Gran Canaria».
5. **Copy que promete lo que no existe.** Es el hallazgo más grave en UX:
   - «Te avisamos», cuando las alertas son locales y no envían nada;
   - «Cada 14 días te pediremos que confirmes», cuando no hay ningún recordatorio;
   - «El vendedor indica que no tiene reparaciones ni entradas de agua», cuando nunca se le pregunta;
   - «Confirmado por vendedor» en medidas que nadie confirmó;
   - estadísticas inventadas en el panel de demostración.
6. **Accesibilidad:**
   - áreas táctiles de 17 a 36 px en elementos frecuentes (Comparar, chips, Volver, Reportar, pie);
   - 24 botones «Guardar» sin nombre distinto en un listado;
   - jerarquía de encabezados dominada por los H2 del pie.

**Qué se ha hecho.**
- Política de indexación por inventario (§C).
- `robots.txt` coherente.
- Metadatos únicos.
- Enlazado entre landings.
- `noindex` en anuncios inactivos, créditos y guías de demostración.
- JSON-LD `WebSite` y `Organization` en la home.
- Corrección del copy engañoso, de las concordancias y de la terminología.
- Áreas táctiles de 44 px.
- Encabezados ordenados.
- Investigación de keywords sin métricas: 273 términos, CSV listo para Keyword Planner (§B).

**Qué queda.** Las decisiones de la §G necesitan volúmenes reales. La más importante es la keyword principal de la home.

---

## B. Investigación de keywords (sin DataForSEO)

### B.1 Método y fuentes

| Fuente | Uso | Limitación |
|---|---|---|
| Conocimiento del dominio y del producto (taxonomía, `docs/SEO.md`, inventario de demo) | Generar la lista de términos por intención | No dice cuánto se busca cada uno |
| Búsqueda web (herramienta de búsqueda del agente) | Ver qué tipo de páginas aparecen para las consultas principales | **La herramienta no está geolocalizada en España**: los resultados se parecen a los de Google.es, pero no son idénticos. Hay que verificarlos desde España |
| Google Trends | No consultado | Trends no tiene API pública sin credenciales. Queda para hacerlo a mano (ver §G) |
| DataForSEO | No disponible | Cuenta pausada (error 40201) antes de la primera consulta |

**Resultado: `docs/seo/keywords.csv`** (generado por `scripts/seo-keywords.mjs`).
- 273 keywords en 13 clusters. Columnas: keyword, cluster, intención, URL objetivo, tipo de página, prioridad provisional, decisión pendiente y notas.
- Cinco columnas vacías para rellenar con Keyword Planner: `volumen_mensual_kp`, `competencia_kp`, `puja_min_kp`, `puja_max_kp` y `fuente_y_fecha`.
- Está codificado en UTF-8 con BOM para que Excel y Google Sheets lo abran bien.
- Para cargarlo en Keyword Planner, pega la columna `keyword` en «Obtener el volumen de búsquedas y previsiones».

| Cluster | Términos | Intención dominante |
|---|---|---|
| Ubicaciones | 85 | transaccional local |
| Tipos de tabla | 59 | transaccional |
| Marcas y modelos | 34 | transaccional / navegacional (marca) |
| Comprar tablas usadas | 27 | transaccional |
| Litros y medidas | 23 | informacional (herramienta) |
| Elegir tabla según nivel | 8 | informacional-comercial |
| Vender tablas usadas | 7 | transaccional (oferta) |
| Inglés | 7 | transaccional (turistas y residentes en Canarias) |
| Tiendas y escuelas | 5 | local (navegacional) |
| Construcción y materiales | 5 | informacional |
| Quillas | 5 | informacional / comercial |
| Comprar con criterio | 4 | informacional |
| Reparaciones y mantenimiento | 4 | informacional |

La prioridad provisional (82 alta, 100 media, 91 baja) depende del **encaje con el producto**: si existe ya una página que responde a esa intención. No es una estimación de demanda.

### B.2 Competencia visible (cualitativa)

- **Transaccional («tabla surf segunda mano», «tabla evolutiva segunda mano», «softboard segunda mano», «tabla surf {ciudad}»).**
  - Domina Wallapop, con páginas de categoría para casi cada término y ciudad.
  - Detrás aparecen Milanuncios, tiendas con sección de ocasión y foros.
  - Ningún resultado visible permite buscar por litros y medidas. Esa es la diferencia que Reboard debe mostrar en títulos y descripciones: «Litros, medidas, estado y precio de cada una».
- **Litros («cuántos litros necesito tabla surf», «calculadora litros surf»).**
  - Salen calculadoras (miniwebtool, breakfinder) y guías de tiendas (Decathlon, Flysurf).
  - Encaja con `/calculadora-litros`, que combina calculadora y anuncios.
- **Nombres de tipo.** La gente escribe «tabla evolutiva», «tabla fish» o «tabla de espuma» más que «evolutiva» a secas. Por eso:
  - los H1 y titles dicen «Tablas evolutivas», «Tablas fish», «Softboards (tablas de espuma)»;
  - **los slugs no cambian** (`/tablas/evolutiva`, `/tablas/softboard`), porque no hay datos que justifiquen una redirección.
- **Marcas.** Para «{marca}» a secas gana la web oficial. Reboard solo compite en «{marca} segunda mano» y «{marca} {modelo} medidas».

---

## C. Mapa keyword → URL y política de indexación

### C.1 Mapa provisional

El mapa completo, término a término, está en la columna `url_objetivo` del CSV. Resumen:

| Grupo de keywords | URL | Estado |
|---|---|---|
| tabla(s) de surf de segunda mano / usada(s) / ocasión / baratas, comprar…, compraventa… | `/` | Provisional. La keyword principal de la home está pendiente (§G-1) |
| {tipo} segunda mano (evolutiva, softboard/espuma, longboard, shortboard, midlength, fish, híbrida, gun) | `/tablas/{tipo}` | Indexable si hay al menos 1 anuncio |
| tabla surf principiante(s) / iniciación segunda mano | `/tablas/principiantes` | Indexable si hay al menos 1 anuncio |
| tablas de surf segunda mano {isla o provincia} | `/tablas/{zona}` | Indexable si hay al menos 1 anuncio |
| {tipo} segunda mano {zona} | `/tablas/{zona}/{tipo}` | **Indexable con 3 anuncios o más** |
| tabla surf {ciudad} (Las Palmas, Santa Cruz, Zarautz, Somo…) | Landing de su isla o provincia | Sin landing por ciudad (§G-4) |
| calculadora litros, cuántos litros necesito, qué tabla necesito, tabla según peso | `/calculadora-litros` | Indexable |
| {marca} segunda mano / {marca} {modelo} medidas | `/marcas/{marca}`, `/marcas/{marca}/{modelo}` | Indexable. Solo modelos con medidas del fabricante |
| qué revisar al comprar tabla usada, reparaciones… | `/guias/{slug}` | La guía actual es demo y lleva noindex |
| vender tabla de surf | `/vender` | Indexable |
| tiendas de surf {zona} | `/tiendas`, `/tiendas/{slug}` | Indexable. El valor llegará con tiendas reales |
| {X} litros, tabla de 7 pies… | `/buscar?…` (noindex) | Sin landing (§G-3) |

### C.2 Política de indexación implementada

Las reglas están en código para que los metadatos y el sitemap no diverjan:
- `src/lib/search/indexing.ts` (`landingIndexable`);
- `src/components/search/LandingPage.tsx` (meta `robots`);
- `src/app/sitemap.ts`.

| Página | Regla | Por qué |
|---|---|---|
| `/tablas/{tipo}` y `/tablas/{zona}` | Indexable con 1 anuncio activo o más | Página útil con poco inventario; la intro y los enlaces la diferencian |
| `/tablas/{zona}/{tipo}` | Indexable con 3 anuncios o más | Con 1 o 2 anuncios la página repite la de la zona o la del tipo. Sigue siendo navegable y permite crear una alerta |
| Landing sin anuncios | noindex, sigue accesible | Estado vacío útil (alerta, ampliar la búsqueda) sin ser contenido escaso indexado |
| `/anuncio/*` vendido, caducado o retirado | noindex, fuera del sitemap. La URL sigue respondiendo con alternativas | No posicionar algo que no se puede comprar, sin romper enlaces externos |
| `/buscar` | noindex, canonical a la landing equivalente | Combinaciones infinitas de filtros |
| `/creditos`, `/legal/*`, `/sistema`, guías demo | noindex | Sin intención de búsqueda o contenido no revisado |
| `/api/`, `/auth/`, `/panel`, `/cuenta`, `/moderacion`, `/sistema` | `Disallow` en `robots.txt` | Privadas o técnicas. **No se bloquean** las páginas que dependen de `noindex` (`/buscar`, `/entrar`, `/guardado`, `/alertas`, `/comparar`), porque un bloqueo impide leer la meta |

**Efecto en el inventario actual** (crawl local en modo supabase, antes y después):
- sitemap de 214 a 181 URLs;
- 0 descripciones duplicadas entre páginas indexables;
- 0 URLs con `noindex` dentro del sitemap.

**Enlazado interno.** `RelatedLandings` añade a cada landing el bloque «Más tablas de segunda mano», con:
- otros tipos en la misma zona;
- el mismo tipo en otras zonas;
- enlaces para ampliar la búsqueda.

Solo enlaza landings indexables, con la misma regla que el sitemap, y muestra el recuento de anuncios.

---

## D. UX/UI: hallazgos y estado

Fuentes:
- auditoría de copy y fricción, revisando 24 rutas a 390 px;
- auditoría de accesibilidad y rendimiento con axe-core 4.14, Lighthouse 13.5, teclado y diálogos, en 20 URL a 375 y 1440 px.

| Área | Hallazgo | Estado |
|---|---|---|
| Filtros de `/buscar` | Las marcas estaban escondidas en un desplegable dentro de «+ Marca, modelo, estado…», al final del panel | **Hecho.** Grupo «Marca» con chips y recuento tras «Tipo de tabla»: ocho a la vista y el resto tras «Ver todas las marcas». El modelo aparece solo con una marca elegida. «Más filtros» queda para estado, quillas, anchura y vendedor |
| Filtros (móvil) | Dos botones «Limpiar» en la hoja | **Hecho.** Solo el del pie, junto a «Ver N tablas» |
| Resultados | Hasta cuatro botones para crear la misma alerta, y alertas duplicadas | **Hecho.** Uno por pantalla; `addAlert` no duplica una alerta igual |
| Diálogos | El contacto, el menú móvil, la hoja del buscador y la de filtros dejaban salir el foco, y tres lo dejaban en `body` al cerrar | **Hecho.** `useDialogFocus` atrapa Tab y devuelve el foco. La hoja de filtros es `role="dialog"` solo en móvil |
| Teclado | Sin enlace para saltar al contenido: el primer resultado de `/buscar` llegaba en el Tab 44 | **Hecho.** «Saltar al contenido» |
| Paneles del buscador de la home | El orden de tabulación no entraba en el panel abierto | **Hecho.** El foco entra al abrir y vuelve al segmento al cerrar |
| Áreas táctiles | Comparar (32 px), chips (34), Volver (32), Reportar (17), pie (22), bandeja de comparar (36), Fotos/Lista (36), migas (24), título de tarjeta (18) | **Hecho.** 44 px, casi siempre con `::after`, sin cambio visual. El pie móvil tenía una regla CSS rota |
| Contraste | `--rb-faint` (#617C82) en texto de 15 px o menos: 4,45:1 | **Hecho.** `--rb-muted` (#4A6670) en tarjeta, ficha, guías y catálogo |
| Nombres accesibles | 24 «Guardar» iguales en un listado | **Hecho.** «Guardar {título}» y «Comparar: {título}» |
| Landmarks | Banner DEMO, barra de contacto y bandeja de comparar fuera de landmarks | **Hecho.** `aside` con nombre |
| Encabezados | H2 del pie dominando el esquema; resultados sin H2; tarjetas sin encabezado; H1 de alertas y guardadas; `<title>` de la 404 | **Hecho** |
| Ficha | La etiqueta de origen larga aplastaba la columna de valores en móvil | **Hecho.** «Según fabricante» / «Indicado por el vendedor» |
| Ficha | Contacto siempre «por WhatsApp»; reportar sin sesión redirigía sin avisar | **Hecho.** Según el método del vendedor; el modal explica por qué hay que entrar |
| Publicar | Error de medidas en un toast efímero; «Empezar de cero» borraba sin confirmar; mensajes crudos de Supabase | **Hecho** |
| Panel demo | Visitas, guardados y clics inventados | **Hecho.** Eliminados |
| TablaFinder | Altura pedida sin usarla; error de nivel en un toast; un «Guardar perfil» que no hacía nada | **Hecho** |
| Rendimiento | El cliente de Supabase (68 KB gz) se cargaba en todas las páginas | **Hecho.** `import()` solo con cuentas activas |
| Rendimiento | 10 fuentes precargadas; LCP de la galería y de los resultados | **Hecho en parte:** IBM Plex Mono sin precarga, primera foto de la galería con `fetchPriority="high"`, las dos primeras tarjetas con prioridad |
| Rendimiento | La home se sirve sin caché porque `NearSection` lee la cookie de zona | **Pendiente.** Pasar «Cerca de ti» a una isla de cliente: es un cambio de arquitectura y queda fuera de esta auditoría |
| Rendimiento | Aplazar zod, Turnstile y la subida en `/vender/publicar` (TBT de 540 ms) | **Pendiente.** Solo se ha hecho `z.config({ jitless: true })`, que evita el aviso de CSP |
| CI | `npm ci` fallaba con npm 10 (faltaban `@emnapi/*` en el lockfile) | **Hecho.** Lockfile regenerado con npm 11.6.2; el CI usa esa versión y la instrucción para Vercel está en `LAUNCH_CHECKLIST.md` |

**No tocado a propósito:**
- el lema «Tu próxima tabla ya existe» y el cierre de la home (diseño aprobado);
- el interruptor «Activa / Pausada» de las alertas (quitarlo elimina una función);
- «Otra zona» al publicar (cambio de taxonomía y base de datos: se explica en su lugar);
- pedir descripción de golpes con «Buen estado».


---

## E. Copy: antes → después

Principio: **no prometer lo que el producto no hace** y usar un nombre por concepto. Selección de cambios:

| Dónde | Antes | Después |
|---|---|---|
| Alertas (resultados, home, marcas, modelos, tiendas, ficha) | «Te avisamos», «Avísame», «Te avisamos en cuanto aparezca una» | «Crear alerta», «Guarda una alerta para seguirla» (son locales y no envían nada) |
| `/vender`, revisión, fin, condiciones | «Cada 14 días te pediremos que confirmes…» | «Confirma cada 14 días en «Mis anuncios» que sigue disponible; si no, caduca a los 30 días.» |
| Ficha, sin reparaciones | «El vendedor indica que la tabla no tiene reparaciones ni entradas de agua» | «El vendedor no ha indicado reparaciones.» |
| Origen del dato | «Confirmado por vendedor» / «Según fabricante · variante confirmada» | «Indicado por el vendedor» / «Según fabricante» |
| Sin marca | «Artesanal», «Shaper local / sin marca», «Shapers locales» | «Sin marca» (filtros, home, títulos «Evolutiva sin marca 7'4"») |
| Comparador | «Hasta tres anuncios» | «Hasta cuatro tablas» |
| Home, «cerca de ti» | «…la mayoría en Canarias…» (dato escrito a mano) y «Cerca de ti» con la zona por defecto | Sin el dato. «Recién publicadas en {zona}» mientras no la elijas |
| Ordenación | «Precio: menor» | «Más baratas primero» |
| Alertas y chips | «55–∞ L», «0–40 L», «entre — y 7'6"» | «de 55 L o más», «de hasta 40 L», «de hasta 7'6"» |
| Concordancia | «1 fotos», «Ver 1 tablas», «1 tabla coinciden», «Ver 0 alternativas», «1 anuncios» | Singular correcto; con 0 se oculta |
| Landings | Sin intro para híbrida ni gun; «Ordena por distancia» (falso con datos reales); «más de 9 pies» | Intro propia por tipo y por zona; «de 9 pies o más» |
| Títulos | «Tablas de surf para principiantes de segunda mano en…», `<title>` de modelo y tienda de más de 60 caracteres | «Tablas de surf de segunda mano para principiantes en…»; «{Marca} {Modelo}: medidas, litros y segunda mano»; «{Tienda} ({localidad}): tablas de surf de segunda mano» |
| Meta descriptions de landings | Una sola plantilla: «N anuncios. Busca por litros…» | «11 tablas de segunda mano en Gran Canaria. {tipo}. Litros, medidas, estado y precio de cada una; contacto directo con quien vende.» |
| Panel demo | «58 visitas · 3 guardados · 2 clics (simuladas)» | Eliminado |
| Publicar (demo) | Botón «Publicar gratis» | «Probar (no se publica)» |
| Publicar, teléfono | «Es privado: no aparece en el anuncio» | «No aparece escrito en el anuncio: lo ve quien pulsa «Mostrar contacto»…» |
| Guía demo | «Basada en la experiencia de reparadores y shapers» | «Contenido de demostración, pendiente de revisar por un reparador.» (y noindex) |
| Tiendas | «Añadir mi tienda» → toast con jerga de CSV; «Contactar» sin teléfono | «El alta de tiendas y escuelas aún no está abierta.»; sin botón muerto con datos reales |
| Pie | «¿Cuántos litros necesito?», «Comparar anuncios», «Cómo funciona vender» | «¿Qué tabla necesito?», «Comparar tablas», «Cómo vender tu tabla» |
| Interno | «Esta pantalla ya está diseñada en el prototipo…» | Eliminado |

**TablaFinder:** la auditoría de copy propuso unificar el nombre en «¿Qué tabla necesito?». Se mantiene «TablaFinder» en la navegación porque lo decidió el usuario. El H1, el pie y los CTA usan «¿Qué tabla necesito?» y «Calcular mis litros». Ver G-7.


---

## F. Cambios técnicos y verificación

**SEO técnico**
- `src/lib/search/indexing.ts`: política de indexación de las landings, usada por `LandingPage` y `sitemap.ts`.
- `src/components/search/RelatedLandings.tsx`: enlazado entre landings.
- `landingDescription` y `FORM_SHORT` en `landings.ts`: descripciones únicas.
- `noindex`:
  - anuncios inactivos;
  - `/creditos`;
  - guías demo, que además salen del sitemap.
- `robots.ts`: solo bloquea lo privado o técnico.
- Home: `metadata` propia, canonical y JSON-LD `WebSite` + `Organization`.
- 404: `<title>`. Legales: descripción propia.
- BreadcrumbList de la ficha con el título como último elemento.

**Accesibilidad y rendimiento**
- `src/lib/a11y/useDialogFocus.ts`.
- Enlace de salto y `#contenido` en `layout.tsx`.
- `aside` con nombre (banner, contacto, bandeja).
- Áreas de 44 px y contraste.
- Supabase cargado bajo demanda.
- Prioridad de imágenes LCP; fuente monoespaciada sin precarga.

**Filtros**
- `FilterPanel`: grupo de marcas con recuentos, que ya venían en `facets.brands` y no necesitan cambios de backend.
- `NO_BRAND` se llama «Sin marca».

**Herramientas**
- `scripts/seo-keywords.mjs` genera `docs/seo/keywords.csv`.
- `.github/workflows/ci.yml` usa `npx -y npm@11.6.2 ci`.

**Verificación** (rama `mvp`, 22-10-2026):

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm run lint` | 0 errores, 4 avisos previos (`Photo.tsx`, `auth-security.test.ts`) |
| `npm test` | 115/115 (incluye `seo-indexing.test.ts`, nuevo) |
| `REBOARD_DATA_SOURCE=mock next build` | OK |
| `REBOARD_DATA_SOURCE=mock npm run test:e2e` | 70/70 (nuevo: filtro de marca con chips) |
| `npm run test:visual` | 16/16. Referencias regeneradas por los cambios intencionados (pie de 44 px, bloque de landings relacionadas, etiquetas de origen); revisadas una a una |
| `npm run test:integration` (Supabase local) | 63/63. Se actualizaron dos aserciones de mensajes de error que cambiaron a propósito |
| `npm run db:test` (pgTAP) | 126/126 |
| Crawl local en modo supabase (antes y después) | sitemap de 214 a 181 URLs; 0 descripciones duplicadas; 0 URLs noindex en el sitemap; `robots.txt` coherente |

**Ojo:** `npm run test:e2e` necesita `REBOARD_DATA_SOURCE=mock` también al ejecutarlo, no solo al compilar. Playwright arranca su propio `next start`, y sin la variable sirve el build mock en modo supabase.


---

## G. Próximos pasos y decisiones pendientes de datos

Estas decisiones **no se han tomado a propósito**: necesitan volúmenes de Keyword Planner (o de Search Console tras el lanzamiento). Ninguna cambia slugs ni crea páginas hasta tenerlos.

| # | Decisión | Opciones | Dato necesario | Hasta entonces |
|---|---|---|---|---|
| G-1 | Keyword principal de la home (title y H1) | «tablas de surf de segunda mano» · «tablas de surf usadas» · «tablas de surf de ocasión» | Volumen relativo de las tres variantes en España | H1 y descripción con «tablas de surf de segunda mano» (la forma que usan Wallapop y las tiendas en los resultados vistos) |
| G-2 | «mini malibu» y otros sinónimos de evolutiva | Landing propia · sinónimo en el texto · nada | Volumen de «mini malibu segunda mano» frente a «tabla evolutiva segunda mano» | Sin landing: no es una forma de la taxonomía |
| G-3 | Landings por litros o longitud («tabla 50 litros», «tabla 7 pies») | Landing indexable por rangos · seguir en `/buscar` (noindex) | Demanda por rango y suficiente inventario por rango | Filtro en `/buscar` |
| G-4 | Landings por ciudad o comarca (Las Palmas, Zarautz, Somo…) | `/tablas/{zona}/{ciudad}` · mantener isla o provincia | Volumen por ciudad e inventario mínimo | Isla o provincia. La ficha muestra la localidad |
| G-5 | Páginas en inglés para Canarias | `/en/…` con hreflang · nada | Volumen de «second hand surfboard Tenerife/Gran Canaria/Fuerteventura» | No se hace |
| G-6 | Umbrales de indexación | Bajar a 2 o subir a 5 para combinaciones; umbral para zonas | Impresiones y clics de Search Console por landing | 1 (simple) y 3 (combinación), en `indexing.ts` |
| G-7 | Nombre de la herramienta de litros | «TablaFinder» (nav, decidido por el usuario) · «¿Qué tabla necesito?» (H1) · «Calculadora de litros» (title) | Volumen de «calculadora litros surf» frente a «qué tabla de surf necesito» | La nav dice «TablaFinder», el H1 «¿Qué tabla de surf necesito?» y el title incluye «calculadora de litros» |
| G-8 | Guías nuevas (cómo leer las medidas, precios de tablas usadas, reparaciones, construcción) | Escribirlas · no | Volumen y SERP de cada tema. Además, revisión por alguien con experiencia (E-E-A-T) | Solo la guía existente, en noindex mientras sea demo |
| G-9 | Páginas de modelo | Ampliar el catálogo · mantener | Volumen de «{marca} {modelo} medidas» y medidas oficiales verificadas | Solo modelos con medidas del fabricante |

**Pasos recomendados:**
1. Cargar `docs/seo/keywords.csv` en Keyword Planner con ubicación España e idioma español, y rellenar las cinco columnas vacías con fuente y fecha.
2. Comprobar en Google Trends (España, 5 años) «tabla evolutiva» frente a «mini malibu» y «tablas de surf de segunda mano» frente a «tablas de surf usadas».
3. Revisar las SERP de las 20 keywords de prioridad alta desde una IP española, en una ventana privada.
4. Tras el lanzamiento, dar de alta Search Console, enviar el sitemap y revisar a las 4–6 semanas las impresiones por landing para ajustar G-6.
5. Retomar G-1 a G-9 con esos datos y registrar cada decisión en `docs/DECISIONS.md`.
