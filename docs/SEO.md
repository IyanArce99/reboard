# SEO

> Hoy **nada de esto está implementado**: el prototipo es una sola página HTML. Este documento recoge la arquitectura aprobada y las recomendaciones para implementarla.

## Rutas (arquitectura aprobada)
```
/                                  landing principal: «Tablas de surf de segunda mano»
/buscar                            buscador completo — NO es landing (noindex, follow)
/tablas/[forma]                    shortboard, fish, hibrida, evolutiva, midlength, longboard, gun, softboard, principiantes
/tablas/[zona]                     canarias, gran-canaria, tenerife, lanzarote, fuerteventura, asturias, cantabria, galicia…
/tablas/[zona]/[forma]             p. ej. /tablas/gran-canaria/evolutiva
/marcas/[marca]                    /marcas/torq
/marcas/[marca]/[modelo]           /marcas/torq/fun-tet  (las variantes de medida van DENTRO de la página; no se crea una URL por medida)
/anuncio/[slug-id]                 p. ej. /anuncio/torq-fun-tet-7-2-gran-canaria-a1040
/calculadora-litros                «¿Qué tabla necesito?» (indexable, con contenido útil)
/comparar                          noindex
/tiendas, /tiendas/[slug]
/guias, /guias/[slug]
/vender, /vender/publicar          /vender indexable · /vender/publicar noindex
/guardado, /alertas, /cuenta, /panel   noindex
```
- La home `/` es la única landing generalista: no debe haber otra página que compita por la misma intención.
- Los filtros avanzados y `/buscar` con parámetros **no** son landings: llevan `noindex` y su canonical apunta a la página de categoría o zona correspondiente cuando la hay.
- **Umbral de inventario (pendiente):** las categorías o zonas con muy pocos anuncios no deben destacarse en la navegación (el diseño ya lo hace). Hay que decidir el umbral para indexarlas, por ejemplo noindex por debajo de N anuncios, sin dejar de mostrar contenido útil.

## Metadatos (recomendación)
- **Home.** `<title>`: «Tablas de surf de segunda mano en España · Reboard». Descripción: «Compra y vende tablas de surf usadas. Busca por litros, medidas, tipo y ubicación. Sin comisiones.»
- **Forma/zona.** Título «{Formas} de segunda mano en {Zona} · Reboard». H1 igual que en el prototipo, más una intro corta.
- **Anuncio.** Título «{Marca} {Modelo} {Medida} · {Litros} L · {Precio} € en {Zona}». Si está vendido, se mantiene la URL y se muestran alternativas; cuando caduca: 410 o noindex según la política, **pendiente**.
- **Modelo.** Título «{Marca} {Modelo}: medidas, litros y tablas de segunda mano».
- **Calculadora.** Título «¿Qué tabla de surf necesito? Calculadora de litros · Reboard».
- Cada página lleva su canonical, `hreflang` es-ES y Open Graph con la primera foto del anuncio.

## Datos estructurados (recomendación)
- **Anuncio:** `Product` + `Offer` (price, priceCurrency EUR, `itemCondition` UsedCondition, `availability` InStock/SoldOut) + `additionalProperty` (longitud, litros, construcción). **Nunca** `AggregateRating` ni reseñas inventadas.
- **Listados:** `ItemList`.
- **Migas:** `BreadcrumbList`.
- **Tiendas:** `LocalBusiness` / `SportingGoodsStore`.
- **Guías:** `Article` con `dateModified`.
- **Calculadora:** `FAQPage` solo si hay FAQ real visible en la página.

## Sitemap y robots
- `sitemap.xml` segmentado: estáticas, categorías y zonas que superen el umbral, anuncios activos, modelos, tiendas y guías.
- `robots.txt`: bloquear `/buscar?*`, `/guardado`, `/alertas`, `/panel`, `/cuenta`, `/comparar` y `/vender/publicar`.

## Contenido orgánico
- Las guías de compra son útiles, no un blog de noticias. Temas iniciales:
  - Qué tabla comprar según peso y nivel.
  - Qué revisar al comprar una tabla usada.
  - Qué tabla comprar después de una softboard.
  - Cómo interpretar las medidas.
  - Cómo vender tu tabla.
  - Evolutiva o midlength.
  - Qué reparaciones son aceptables.
  - PU o epoxy.
- La plantilla de guía lleva: respuesta corta al inicio, tabla comparativa, enlace a la calculadora, anuncios relacionados, fecha de actualización y fuentes.
- La calculadora mantiene contenido SEO bajo el asistente, siempre visible.

## Rendimiento / Core Web Vitals
- SSR o ISR en las páginas indexables. La interactividad se limita a islas cliente.
- `next/image` con tamaños responsive y `priority` solo en la imagen LCP: la primera tarjeta, o la galería de la ficha.
- `next/font` con `display:swap` y subset latin. Solo se usan Barlow, Barlow Condensed e IBM Plex Mono.
- Hay que evitar el CLS:
  - Las tarjetas tienen aspect-ratio fijo (4:5 en vertical).
  - El header tiene 64 px fijos.
- Los carruseles usan scroll-snap nativo, sin librerías.
