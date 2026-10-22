# Origen de las imágenes

## Fotografía editorial (Pexels) · `public/images/fotos/`
Fotos de ambiente de la web: home, vender, guías, tiendas, 404 y cierre de marca. **No son fotos de anuncios** y nunca se usan como tales.

- **Licencia:** Pexels (https://www.pexels.com/license/). Uso gratuito, también comercial, sin atribución obligatoria. Se acredita igualmente.
- **Límites de la licencia:**
  - no dar a entender que las personas o marcas que aparecen respaldan Reboard;
  - no revender las fotos sin modificar.
- **Créditos:** detalle por foto (autor, enlace, tamaño) en [`fotos/CREDITS.generated.md`](fotos/CREDITS.generated.md). Lista pública en `/creditos`.
- **Proceso:** `node scripts/photos.mjs` descarga, redimensiona, convierte a WebP, genera el placeholder y reescribe `src/lib/photos.ts`. Para añadir o cambiar una foto, edita la lista del script y vuelve a ejecutarlo.

## Fotos de stock del prototipo (Unsplash) · solo datos DEMO

Todas son **fotos de stock de Unsplash** (licencia Unsplash: uso comercial libre, sin atribución obligatoria) usadas como **placeholder**. En producción, las fotos de los anuncios las sube cada vendedor. Ninguna muestra una tabla real anunciada.

No se han descargado al paquete: el prototipo las carga en caliente desde `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=900&q=70`. Si quieres tenerlas en local, descárgalas en `public/images/stock/` con esos IDs.

| Uso | ID |
|---|---|
| Tarjetas, galería, categorías (array BOARDS[0]) | `1531722569936-825d3dd91b15` |
| Tarjetas, galería, categorías (array BOARDS[1]) | `1621951289270-b942dc5f4320` |
| Tarjetas, galería, categorías (array BOARDS[2]) | `1632334738554-95c79fb27eb7` |
| Tarjetas, galería, categorías (array BOARDS[3]) | `1703159453462-8a2d2866afaf` |
| Tarjetas, galería, categorías (array BOARDS[4]) | `1586996292898-71f4036c4e07` |
| Tarjetas, galería, categorías (array BOARDS[5]) | `1544840494-d0e48b117320` |
| Tarjetas, galería, categorías (array BOARDS[6]) | `1632299768491-51d27b80d088` |
| Tarjetas, galería, categorías (array BOARDS[7]) | `1537519646099-335112f03225` |
| Tarjetas, galería, categorías (array BOARDS[8]) | `1761435139247-e044088c2c3e` |
| Tarjetas, galería, categorías (array BOARDS[9]) | `1761347465188-0ff91dfee062` |
| Tarjetas, galería, categorías (array BOARDS[10]) | `1767167838805-78929dab5052` |
| Lifestyle (no se usa en Reboard.dc.html) | `1543616260-4cd60315436d` |
| Lifestyle (no se usa en Reboard.dc.html) | `1455729552865-3658a5d39692` |
