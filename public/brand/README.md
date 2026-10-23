# Marca Reboard

Isotipo elegido: **1a · R + tabla** (el palo de la R es una tabla vista desde arriba, con stringer; la pierna turquesa es un trazo de ola).

- `reboard-isotipo.svg` / `-dark.svg`: símbolo solo, sobre claro / sobre petróleo.
- `reboard-horizontal.svg` / `-dark.svg`: isotipo + wordmark. **El wordmark es un <text> que depende de Barlow Condensed 800**: antes de producción hay que convertirlo a contornos (outline) en un editor vectorial para que no dependa de la fuente.
- `reboard-app-icon.svg`: 512×512, radio 24 %. Exportar a PNG 180/192/512 para apple-touch-icon y manifest.
- `../favicon.svg`: favicon.

Reglas: margen mínimo = ½ de la altura del isotipo · mínimo 24 px de alto el horizontal, 16 px el isotipo · fondos permitidos: blanco, #EFF6F5 o #102D3B · nunca sobre amarillo, ni deformado, girado o recoloreado. Guía completa: design/prototype/Reboard Marca.dc.html.

Exportados (23-10-2026, generados con Chromium desde `reboard-app-icon.svg`):
- `../favicon.ico` (16, 32 y 48 px), `../apple-touch-icon.png` (180 px, sin transparencia) y `reboard-icon-192.png` / `reboard-icon-512.png` (manifest y logo de `Organization`).
- `../og-reboard.png`: imagen por defecto al compartir (1200×630). Se usa en todas las páginas mediante `OG_BASE` (`src/lib/site.ts`); las fichas de anuncio usan su primera foto.
