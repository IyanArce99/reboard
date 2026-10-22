# Inventario de páginas

Todas las pantallas están en `design/prototype/Reboard.dc.html`. Se navega con la barra DEMO, campo «Pantalla».

Notación:
- **D** = escritorio. Las rejillas se adaptan solas; contenedor de 1280 px máximo, padding lateral de 32 px.
- **M** = móvil (< 760 px), padding de 16 px.

## Comunes
- **Header** (64 px, blanco, sticky, borde inferior #D6E4E3):
  - **D:** Logo · Comprar tablas (→ /buscar) · ¿Qué tabla necesito? · Guías · buscador compacto (en páginas interiores, ≥ 1180 px) · Guardado · N · **Vender gratis** (amarillo).
  - **< 1024 px:** Logo + iconos de buscar, guardado (con contador) y menú.
- **Menú móvil:** panel lateral derecho (86 %, o 360 px en tablet) con 7 enlaces y «Vender gratis» abajo. **No hay megamenú.**
- **Footer:** logo, tagline y columnas Comprar / Herramientas / Vender.
- **CompareTray:** barra petróleo fija abajo cuando hay ≥ 1 tabla en comparación. No aparece en la ficha ni en el comparador.
- **Toast:** mensajes de confirmación abajo en el centro, 2,8 s.

## Home `/`
1. **Hero** (variante A: fondo #102D3B con radio inferior de 32 px, o 22 px en M):
   - Etiqueta en mono «Tu próxima tabla ya existe».
   - H1 «TABLAS DE SURF / DE SEGUNDA MANO», con la 2.ª línea en #7AD1CE.
   - Subtítulo y enlaces «Descúbrelo en 30 s» (→ asistente) y «Publícala gratis».
2. **SearchBar** blanca:
   - **D:** Ubicación | Litros | Tipo | Filtros | **Buscar N tablas**.
   - **M:** Ubicación | Litros + botón a ancho completo.
   - Cada segmento abre la **SearchSheet**: zona, distancia, «Sé los litros» con chips y mín/máx, «No sé» → asistente, y tipo.
3. **Chips de tipo** con su número de anuncios. Si la categoría tiene 0, el chip sale atenuado y su acción es crear una alerta.
4. **Recién publicadas cerca de ti:**
   - Carrusel de ListingCard vertical (262/292 px de ancho, snap), con flechas en D, o vista **Lista** agrupada por distancia.
   - Si hay menos de 8 cerca, se añaden anuncios de otras zonas, marcados como tales.
   - Aviso «Reboard está empezando» con botón de alerta.
5. Dos tarjetas: **¿Qué tabla necesitas?** (blanca → asistente) y **¿Tienes una tabla parada?** (amarilla → publicar).
6. **Zonas**, **marcas** y **antes de comprar** (guías), en tres columnas en D y apiladas en M.

## Resultados `/buscar` y páginas de tipo/zona
- Migas de pan, H1 dinámico («Evolutivas de segunda mano en Gran Canaria») e intro si es una página de categoría o zona.
- **D:** FilterPanel lateral sticky de 280 px más resultados.
- **M:** barra sticky con Filtros (N) | Ordenar | Crear alerta. Los filtros se abren a **pantalla completa**, con «Limpiar» y «Ver N tablas».
- Filtros visibles: ubicación y distancia, litros (mín/máx + chips + «Solo tablas para mí» si hay perfil), longitud (pies y cm), forma con recuento, precio (con slider) y construcción.
- Avanzados: marca, modelo, estado, sin reparaciones, accesorios, quillas, anchura mínima, grosor mínimo y tipo de vendedor.
- Chips de filtros aplicados que se pueden quitar, ordenación, cuadrícula o lista (solo D), guardar búsqueda y crear alerta.
- **Litros desconocidos:** aviso «También hay N tablas… cuyos litros no están indicados» con la opción de verlas aparte.
- **Vacío:** «No encontramos tablas con estos filtros», con sugerencias que muestran el recuento resultante (ampliar zona, subir presupuesto, ampliar litros, cualquier forma, quitar todo) y alerta.
- Paginación con «Ver más tablas» (24 cada vez).
- Escenarios de prueba (solo demo): evolutiva 7'0–7'6, 45–60 L, < 200 €, Gran Canaria · Torq en Tenerife · Shortboard 28–32 L cerca de Gijón · búsqueda sin resultados.

## Ficha `/anuncio/[slug-id]`
- **D:** galería (1,4fr) más panel sticky (≥ 340 px) con precio, título, 3 datos clave (longitud, volumen, ancho), tipo/construcción/estado, ubicación, disponibilidad, «Te encaja», **Contactar por WhatsApp**, Guardar / Compartir / Comparar, seguridad y reportar.
- Debajo: datos técnicos con su origen, reparaciones, descripción, vendedor, modelo de catálogo vinculado, aviso de seguridad y similares.
- **M:** galería a sangre (4:5) y **ContactBar** fija abajo (precio + «Contactar con el vendedor»).
- **Estados:** Disponible, Pendiente de confirmar, Vendida, Caducada y Retirada. Los no disponibles muestran un aviso, desactivan el contacto, ponen la foto en gris y ofrecen alternativas y alerta.
- **Modal de contacto:** mensaje precargado, Abrir WhatsApp, Llamar y aviso de que no se paga por adelantado.

## ¿Qué tabla necesito? `/calculadora-litros`
Ver **SURFBOARD_FINDER.md**.

## Publicar `/vender/publicar`
5 pasos con progreso compacto («Paso 2 de 5 · La tabla» y 5 segmentos; los anteriores son pulsables) y un titular natural por paso. En escritorio (≥ 1024 px), formulario a la izquierda y **vista previa en vivo** fija a la derecha; en móvil, una columna, vista previa plegable y barra Atrás / Continuar fija abajo. Rediseño explicado en DESIGN_AUDIT.md («Publicar: rediseño del asistente»).
1. **Fotos · «Enséñanos tu tabla»:** hacer foto o elegir de la galería (o arrastrar en escritorio), hasta 8. La primera es la portada (más grande y marcada); se ordenan con flechas y se quitan con ✕.
2. **La tabla · «Cuéntanos qué tabla es»:**
   - Marca: catálogo, «Shaper local» o «Sin marca».
   - Modelo y medida de catálogo, que autorrellenan los datos marcados «Según catálogo · confírmalo».
   - Campo para copiar las medidas (`6'4 x 20 1/2 x 2 5/8 34L`), cuyo resultado se marca «Propuesta automática · revísala».
   - Selector pies / cm y botón «Confirmar» en cada dato.
   - Tipo de tabla (con silueta) y construcción.
3. **Estado · «¿En qué estado está?»:** 4 tarjetas con explicación en lenguaje llano, reparaciones y descripción opcional.
4. **Precio y ubicación · «¿Por cuánto la vendes?»:** precio grande (con referencia de otros anuncios del mismo modelo), zona en chips (Canarias / Península), localidad con sugerencias, WhatsApp o llamada y teléfono privado.
5. **Revisar · «Así quedará tu anuncio»:** vista previa, resumen por secciones con «Editar» (vuelve al paso y el botón principal pasa a «Volver a revisar»), aviso de datos sin confirmar, qué pasa al publicar y, en real, acceso con código por email y Turnstile → publicado.

## Comparador `/comparar`
- De 2 a 4 columnas; en M se desplaza en horizontal.
- La columna de etiquetas queda fija.
- Las filas con valores distintos se resaltan, y se marcan «la más barata» y «Dentro de tu rango».
- Los datos que faltan aparecen como «Sin indicar».

## Guardado y alertas `/guardado`
- Pestañas Guardadas / Alertas.
- Las guardadas avisan si la tabla se ha vendido o ha bajado de precio.
- Las alertas tienen interruptor de activar o pausar, botón para borrar, «Ver resultados» y el recuento actual.

## Marca `/marcas/[marca]` y modelo `/marcas/[marca]/[modelo]`
- **Marca:** logo (placeholder), intro, tablas usadas de la marca, modelos del catálogo con su recuento y alerta.
- **Modelo:** foto, descripción, selector de medida, datos de la medida, tabla de medidas con «Te encaja» y recuento en venta, y el origen del dato.
  - Las unidades usadas se filtran por la medida elegida.
  - Si no hay ninguna: «Avísame cuando aparezca una de segunda mano».

## Tiendas `/tiendas` y `/tiendas/[slug]`
- **Directorio:** filtro Todas / Tiendas / Escuelas.
- **Perfil:** dirección, horario, cómo carga su inventario (CSV, feed o carga asistida), contacto e inventario.

## Guía `/guias/[slug]`
H1, respuesta corta, imagen, tabla de comprobación, CTA al asistente, anuncios relacionados y fecha de actualización. **Solo existe una guía de ejemplo.**

## Panel del vendedor `/panel`
- Pestañas Activos / Pendientes / Vendidos.
- Aviso para confirmar las pendientes.
- Por anuncio: confirmar disponibilidad, bajar precio, editar (abre publicar con los datos), marcar vendida y volver a publicar.
- Visitas, guardados y clics en contactar (**simulados**).

## Sistema visual (interna)
Paleta, tipografía, controles, distintivos y tarjeta. Es solo una referencia para el equipo.
