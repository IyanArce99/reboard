# Sistema de diseño — Reboard · Atlantic Blue

Variables: `src/styles/tokens.css`. Referencia visual: la pantalla «Sistema visual» del prototipo y `Reboard Marca.dc.html`.

## Color
| Token | Hex | Uso |
|---|---|---|
| petrol | #102D3B | Hero (variante A), títulos, texto principal, «BOARD» del logo, botón secundario fuerte |
| petrol-2 | #1B4252 | Superficies sobre petróleo |
| teal | #087E8B | **Seleccionado/activo**, chips activos, «RE» del logo, puntos de estado de filtro |
| teal-text | #07717C | Enlaces de texto sobre claro (AA) |
| teal-light | #7AD1CE | Acentos sobre petróleo: 2.ª línea del H1, enlaces del hero |
| teal-tint / teal-ink | #DDF1F0 / #0A4F57 | Filtro aplicado, «Te encaja», comparación activa |
| sand | #F4C15A (hover #F0B43C, active #E6A92F) | **Solo la acción principal.** Sin etiquetas amarillas. |
| water | #EFF6F5 | Fondo general |
| shore / shore-line | #F7F3EA / #E7DFCC | Arena cálida: fondo editorial alterno (cómo funciona, pasos, cabeceras de guías y tiendas, estados vacíos) |
| white | #FFFFFF | Tarjetas, formularios, header |
| warm-white | #F4F1EA | Texto y logo sobre petróleo |
| muted | #4A6670 | Texto secundario (usar este en tamaño pequeño) |
| faint | #617C82 | Placeholders, metadatos ≥ 13 px |
| line / line-strong / line-soft | #D6E4E3 / #C3D6D5 / #E6EFEE | Bordes de 1 px |
| success | #1E6A47 · tint #DDEDE4 | Disponible, confirmado |
| warning | #C08A2E · tint #F5EBD8 · ink #5E3D0B | Pendiente, litros sin indicar |
| error | #A23A2C · tint #F4E1DC · ink #5C1F15 | Vendida, retirada, reportar, validación |

**Reglas:**
- Fondos claros para las superficies con mucha información.
- Petróleo para la estructura, turquesa para navegar y seleccionar, y amarillo solo para la acción principal.
- No hay modo oscuro completo.

## Tipografía
| Rol | Fuente | Tamaño (D / M) |
|---|---|---|
| H1 hero | Barlow Condensed 800, MAYÚSCULAS, line-height .92 | clamp(50px, 5.6vw, 84px) / 38px |
| H1 interior | Barlow Condensed 800, MAYÚSCULAS | 38px / 26px (asistente: 52 / 34) |
| H2 sección | Barlow Condensed 800, MAYÚSCULAS (siempre, vía `SectionHeader`) | clamp(28px, 3vw, 40px) |
| Eyebrow de sección | IBM Plex Mono 12px, MAYÚSCULAS, tracking .08em, turquesa | 12px |
| Pregunta del asistente | Barlow Condensed 800 | 46px / 34px |
| Cuerpo | Barlow 400 | 15–16px, line-height 1.45–1.6 |
| Lead | Barlow 400 | 19px / 16px |
| Etiqueta | Barlow 700, MAYÚSCULAS, tracking .06–.07em | 11–12px |
| Precio en tarjeta | **Barlow 700** (no condensada) | 24px vertical / 21px horizontal |
| Precio en ficha | Barlow Condensed 800 | 42px / 34px |
| Medidas técnicas | IBM Plex Mono 400–600 | 13–18px |
| Mínimo absoluto | — | 12px |

La condensada **nunca** se usa para datos (litros, medidas, filtros, formularios).

## Espaciado y layout
- Escala de 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 56. Las secciones de la home se separan entre 28 y 34 px.
- Contenedor de 1280 px como máximo; padding lateral de 32 px en D y 16 px en M.
- Áreas táctiles de **44 px como mínimo**; los botones principales miden 50–58 px.
- Cabecera de 64 px.

## Breakpoints (lógica del prototipo)
| Ancho | Comportamiento |
|---|---|
| < 760 px | **Móvil**: una columna, tarjetas horizontales en listas, filtros a pantalla completa, ContactBar fija |
| < 1024 px | Cabecera móvil (iconos + panel lateral) |
| < 1100 px | Enlaces del hero bajo el H1; panel del vendedor apilado |
| ≥ 1180 px | Buscador compacto en el header de las páginas interiores |

## Radios y sombras
- Radios:
  - Chips: 999.
  - Inputs: 10.
  - Botones: 12–13.
  - Tarjetas: 14–16.
  - Paneles: 18–24.
  - Hoja inferior: 24 arriba.
  - Hero: 32 abajo (22 en M).
- Sombras mínimas:
  - Buscador en el hero: `0 18px 40px -24px rgba(0,0,0,.6)`.
  - Hover de tarjeta: `0 8px 24px -16px rgba(16,45,59,.35)`.
  - Todo lo demás lleva un borde de 1 px.

## Componentes
- **Botón primario:**
  - Normal: fondo #F4C15A, texto #102D3B, peso 700–800, alto 50–58, radio 12.
  - Hover: #F0B43C. Activo: #E6A92F. Foco: outline de 2 px #102D3B.
  - Deshabilitado: #E6D7B4 o #C3D6D5.
- **Botón secundario fuerte:** fondo #102D3B, texto blanco.
- **Botón neutro:** fondo blanco, borde #C3D6D5. Hover: borde #087E8B.
- **Chip:**
  - Normal: blanco, borde #C3D6D5, radio 999, alto 36–44.
  - **Seleccionado:** fondo #087E8B, texto blanco.
  - **Filtro aplicado:** fondo #DDF1F0, borde #087E8B, texto #0A4F57, con ✕.
- **Input:** alto 44–50, borde #C3D6D5, radio 10, 16 px (evita el zoom en iOS). Foco: outline de 2 px #087E8B. Los numéricos usan `inputmode`.
- **SearchBar:**
  - Contenedor blanco con radio 18 y padding 6.
  - Cada segmento es un botón de 58 px con etiqueta en mayúsculas y valor. Hover: #EEF6F5. Foco: outline de 2 px #087E8B.
  - **Con valor:** texto en 700 y un punto turquesa. **Vacío:** «Cualquier…» en #617C82 y 500.
- **ListingCard vertical** (`Tarjeta Atlantic.dc.html`):
  - Foto 4:5. Arriba a la izquierda, el distintivo Tienda/Escuela (petróleo) o el de estado (rojo). Arriba a la derecha, guardar (círculo blanco de 40 px). Abajo a la izquierda, la distancia en una píldora blanca con un punto turquesa; abajo a la derecha, el número de fotos.
  - Cuerpo, en este orden: **precio** · título · **47 L** · tipo · construcción · zona · estado · disponibilidad (punto de color) · «Te encaja» · pie con Comparar y fecha.
  - Borde #D6E4E3, radio 16. Hover: borde #9CC7C6 y sombra.
- **ListingCard horizontal:** foto de 116 px más la misma información compacta. Se usa en listas y en móvil.
- **Disponibilidad:** punto de 7 px. Verde = disponible y «confirmada hace N días». Ámbar = pendiente. Rojo = vendida, caducada o retirada.
- **Origen del dato** (ficha): «Confirmado por vendedor» (verde tint), «Según fabricante · variante confirmada» (turquesa tint) y «Sin indicar» (gris).
- **OptionCard** (asistente): alto mínimo 64, borde de 1,5 px.
  - Seleccionada: borde #087E8B, fondo #EEF8F7 y marca ✓ en un círculo (radio) o un cuadrado de radio 7 (selección múltiple).
- **Hoja inferior** (M): radio 24 arriba, alto máximo 90 %, pie fijo con Limpiar y CTA. En D es un modal centrado de 540 px.
- **Iconos:** solo funcionales, de trazo de 2 px (buscar, corazón, menú, filtros). Sin iconos decorativos.

## Estados interactivos
- Hover (en D): fondo #EEF6F5 o borde #087E8B.
- Foco: outline de 2 px #087E8B.
- Activo: CTA en #E6A92F.
- Seleccionado: turquesa.
- Deshabilitado: opacidad o tono apagado.
- Error: borde #A23A2C con mensaje.
- Las transiciones duran 0,15 s.
- **Scroll:**
  - `scroll-behavior:smooth`, scrollbar fina en D y oculta en M.
  - Los carriles horizontales usan scroll-snap y `overscroll-behavior:contain`.
  - Al cambiar de pantalla, el scroll vuelve arriba al instante.

## Marca
Ver `public/brand/README.md`. El logo es el isotipo «R + tabla» más el wordmark **RE**BOARD en Barlow Condensed 800, con tracking .035em, «RE» en turquesa y «BOARD» en petróleo.

## Fotografía
- La tabla entera y visible, con el estado apreciable y la luz natural.
- En el prototipo son placeholders de stock (`public/images/IMAGE_SOURCES.md`).
- Los vendidos se muestran en gris (`grayscale(1)`).


## Dirección de arte «coastal editorial» (2026-10)
Detalle y justificación en `docs/DESIGN_AUDIT.md`.

### Piezas de marca (`src/components/brand/`)
| Componente | Uso |
|---|---|
| `Photo` | Foto editorial de `src/lib/photos.ts` con `next/image`, placeholder borroso y calidad 70. `decorative` cuando el texto ya lo explica. `preload` solo en la imagen LCP. |
| `SectionHeader` | Cabecera única de sección: eyebrow + título condensado + entradilla + enlace. `as="h1"` en cabeceras de página. |
| `BoardShape` | Silueta SVG de cada forma, a escala relativa. Categorías de la home, modelos de marca, ficha de modelo y resultado del asistente. Tono `soft` para softboard o principiantes. |
| `EmptyState` / `BoardsIllustration` | Estados vacíos con tres siluetas, título condensado, explicación y acciones. |
| `ClosingBand` | Cierre de marca con foto y dos acciones (Buscar / Vender). Solo en páginas editoriales. |

### Reglas de fotografía
- **Dónde sí:** páginas editoriales y de marca (home, vender, guías, tiendas, 404).
- **Dónde no:** pantallas funcionales (buscar, comparar, guardado, panel, publicar). En ellas mandan los anuncios y, como mucho, se usan siluetas.
- **Nunca como foto de un anuncio, una marca o un modelo.** En la ficha de modelo se usa la silueta de la forma («Silueta orientativa»).
- **Tratamiento:**
  - radio `--rb-r-photo` (24px);
  - velo petróleo cuando lleva texto encima;
  - zoom de 1,03 al pasar el ratón solo en tarjetas enlazadas, desactivado con `prefers-reduced-motion`.
- **Créditos:** en `/creditos` y en `public/images/IMAGE_SOURCES.md`. En las guías, pie de foto con el autor.
- **Ancho de los bloques:** no combines `container` con una clase de módulo que cambie `max-width` o `margin`, porque el orden de carga del CSS decide cuál gana. Anida un div dentro del contenedor.

### Ritmo
- **Separación entre secciones:** 64px en escritorio y 44px en móvil. Bloque «arena» con 64px de padding.
- **Cabeceras de color:** hero petróleo con radio inferior de 32px en home y vender; cabecera arena en guías y tiendas.
- **Footer:** petróleo con tres columnas (Comprar · Elegir bien · Vender) y una fila inferior con los créditos.

### Cabecera (2026-10)
- **Jerarquía:** explorar, encontrar mi tabla y publicar.
  - Escritorio: logo · «Explorar tablas» (`/buscar`) · «TablaFinder» (`/calculadora-litros`) · «Guías» | corazón · cuenta · «Publicar tabla».
  - Sin buscador en la cabecera: el completo está en `/buscar` y en el hero de la home.
- **Activo:** texto turquesa y subrayado de 2 px bajo el enlace, con `aria-current="page"`. Hover: fondo `--rb-hover`. Foco: el anillo global de 2 px.
- **Iconos** (44 × 44, redondos):
  - el corazón lleva el contador (turquesa con borde blanco) solo si hay guardadas;
  - la cuenta es el icono de usuario (a `/entrar`) o, con sesión, la inicial y un menú breve (Mis anuncios, Guardadas, Mi cuenta, Salir).
  - Tooltip propio al pasar el ratón o con foco de teclado; el nombre accesible va en `aria-label` («Guardadas (3)»).
- **«Publicar tabla»:** amarillo, la única acción principal de la cabecera.
- **Tablet (< 1024 px):** iconos + «Publicar tabla» + menú.
- **Móvil (< 760 px):** iconos + menú. «Publicar tabla» está fijo al pie del menú. El menú separa las tres secciones principales (más grandes) de «Tu actividad».

### Buscador del hero (2026-10)
- **Escritorio:** cada segmento (Zona, Litros, Tipo de tabla) abre su propio panel bajo la barra.
  - La barra se atenúa y el segmento activo se eleva en blanco.
  - El botón amarillo de la barra sigue a la vista y actualiza el recuento.
  - Se cierra con Escape o con un clic fuera.
- **Móvil:** hoja inferior con las tres secciones, abierta en la sección tocada.
- **Etiquetas comunes con `/buscar`:** Zona, Litros y Tipo de tabla.

