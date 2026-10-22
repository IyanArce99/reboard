# Qué se ha exportado y qué no

## Exportado (archivos reales)
- `design/prototype/*.dc.html` + `support.js`: prototipo completo y funcional.
- `design/source/prototype-logic.js`: toda la lógica del prototipo (filtros, recomendador, generador de inventario, estados).
- `design/source/mock-data.js`: datos demo y funciones puras, listos como seed o fixtures.
- `src/styles/tokens.css`: variables CSS.
- `public/favicon.svg` y `public/brand/*.svg`: logo en todas sus variantes.
- `README.md`, `CLAUDE.md` y `docs/*`.

## No exportado / limitaciones
- **No es una aplicación Next.js ni tiene `package.json`.** El prototipo está hecho con un runtime propio de la herramienta de diseño (`support.js`). Sirve como referencia visual y funcional, pero no es la base del código de producción. Hay que recrearlo en Next.js.
- **Fotos:** no van incluidas. Son de Unsplash y se cargan por URL (ver `public/images/IMAGE_SOURCES.md`).
- **Fuentes:** no van incluidas. Son de Google Fonts (OFL 1.1) y se cargan con `next/font/google`.
- **Wordmark del logo en SVG:** usa `<text>` y depende de Barlow Condensed. Conviértelo a contornos antes de producción.
- **Iconos:** son SVG inline de trazo de 2 px (lupa, corazón, menú, filtros), sin librería. Recréalos o usa un set equivalente, por ejemplo Lucide: search, heart, menu, sliders-horizontal.
- **Build:** no hay build que ejecutar todavía.
- **Versiones anteriores:** las versiones previas (Litros, v2 y v3) se han quedado en el proyecto de diseño y **no se incluyen**. Están superadas.
