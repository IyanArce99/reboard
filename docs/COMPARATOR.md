# Comparador de tablas

Compara de 2 a 4 tablas en `/comparar`. La selección vive en el dispositivo (`localStorage`, clave `rb-usuario-v1`). No requiere cuenta ni hace llamadas extra: una sola petición a `/api/anuncios?ids=` con los ids que aún no se tienen.

## Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Lógica pura | `src/lib/compare/compare.ts` | `sanitizeCompare` (selección guardada válida), `compareItemOf`, `compareGroups` (filas agrupadas y diferencias), `compareSummary` («Diferencias principales»), `fitOf`/`fitText` (rango de TablaFinder). Sin red ni IA: determinista |
| Estado | `src/components/user/UserStateProvider.tsx` | `compare`, `toggleCompare`, `removeCompare` y `clearCompare`. Máximo 4: la quinta muestra un aviso |
| Botón | `CompareButton` en `src/components/user/islands.tsx` | En las tarjetas (buscador, landings, guardadas, TablaFinder) y en la ficha. `aria-pressed`, icono + / ✓ y el nombre de la tabla para lectores de pantalla |
| Barra | `src/components/layout/CompareTray.tsx` | Fija abajo cuando hay alguna tabla. Contador, miniaturas que quitan la tabla al pulsarlas, «Vaciar» y «Comparar N tablas» |
| Acceso | `CompareLink` en `islands.tsx` | «Ver comparación (N)» donde no hay barra: la ficha en móvil y el resultado de TablaFinder |
| Página | `src/app/comparar/page.tsx` y `src/components/compare/Comparator.tsx` | Cabecera, tarjetas, resumen, rango de litros y ficha técnica |

## Dónde aparece la barra
- **Sí:** en el buscador, las landings, la home, guardadas y la ficha en escritorio.
- **No:** en `/comparar` (ya estás comparando), en publicar y en TablaFinder, porque taparían su barra fija Atrás / Continuar. Tampoco en la ficha en móvil, donde ya está la barra de contacto. En esos sitios hay un enlace al comparador.
- **Zona segura:** respeta `env(safe-area-inset-bottom)`. Hoy vale 0, porque el viewport no usa `viewport-fit=cover`: activarlo afectaría a toda la web y no se ha cambiado.

## `/comparar`
- **Cabecera:** «N de 4 tablas», «Añadir otra tabla» (lleva a `/buscar`) y «Vaciar comparación».
- **Tarjetas:** letra (A–D), foto o silueta, nombre, precio, isla, estado («Vendida», «Caducada»…), «Ver tabla» y quitar.
- **Diferencias principales:** frases generadas a partir de los datos.
  - Contenido: precio, litros, longitud, tipo, construcción, reparaciones declaradas, islas y tablas que ya no se pueden contactar.
  - **Nunca dice cuál es «mejor»**: más litros o menos longitud dependen del surfista. «La más barata» es un dato, no una recomendación.
  - Sin datos no afirma nada: «La B no indica los litros».
- **Tu rango orientativo:** si hay perfil de TablaFinder, cada tabla aparece «dentro», «por debajo (−X L)» o «por encima (+X L)», sin porcentajes, con el aviso de que es orientativo y un enlace para cambiar las respuestas. Sin perfil, una invitación discreta a TablaFinder.
- **Ficha técnica**, en 4 grupos:
  - Precio y ubicación;
  - Medidas y volumen;
  - Forma y construcción;
  - Estado y accesorios.
- **Diferencias en la tabla:**
  - las filas que cambian se marcan con una barra turquesa;
  - las iguales se atenúan («Igual en todas»);
  - «Solo lo que cambia» oculta las iguales.
- **Datos que faltan:** salen como «Sin indicar». Las reparaciones, como «Ninguna indicada»: no afirmamos que no tenga.

## Compartir
- **«Compartir comparación»** (desde 2 tablas) genera `/comparar?ids=a1,a2…`. En el móvil abre el menú del sistema (WhatsApp, Telegram…) con un texto que nombra las tablas; en el escritorio copia el enlace.
- **Al abrir un enlace compartido:**
  - sin selección propia, la comparación pasa a ser la tuya y la URL vuelve a `/comparar`;
  - con otra selección distinta, se muestra la compartida **sin tocar la tuya**, con «Usar esta comparación» o «Volver a la mía».
- **Ids del enlace:** se validan con la misma regla que `localStorage` (`parseIdsParam`: formato, sin repetir, máximo 4).
- **Ficha del anuncio:** su «Compartir» (el mismo componente, `ShareButton` en `islands.tsx`) envía también el título y el precio: «Torq Fun TET 7'2" · 190 € en Gran Canaria, en Reboard».

## Móvil (< 760 px)
- Las tarjetas forman una tira con desplazamiento horizontal propio; la página nunca se desplaza en horizontal.
- La ficha técnica muestra **dos tablas a la vez** en columnas. Cada dato lleva la etiqueta encima.
- Con 3 o 4 tablas, el selector «Ver 2 de N» (A B C D) cambia la pareja visible. Queda fijo bajo la cabecera junto a los nombres de la pareja.
- Probado a 320, 375, 390 y 430 px.

## Casos especiales
| Caso | Comportamiento |
|---|---|
| Sin tablas | Estado vacío con 3 pasos, «Buscar tablas» y TablaFinder |
| Una tabla | Su tarjeta, «Buscar tablas parecidas» (mismo tipo) y «Ver todas las tablas» |
| Quinta tabla | Aviso: «Puedes comparar hasta 4 tablas. Quita una para añadir esta.» |
| Vendida o caducada | Se queda en la comparación, marcada, y el resumen avisa de que no se puede contactar |
| Retirada o eliminada | La API ya no la devuelve: se quita sola con un aviso |
| Ids antiguos o manipulados en `localStorage` | `sanitizeCompare` los descarta al leer |
| Sin litros o datos incompletos | «Sin indicar»; el resumen y el rango no afirman nada |
| Error de red | «No hemos podido cargar las tablas» y «Reintentar» |

## Tests
- `tests/unit/compare.test.ts`: lógica pura.
- `tests/e2e/compare.spec.ts`, con el inventario DEMO de Supabase local (`npm run db:seed-demo`) y los ids buscados por slug en `tests/e2e/demo-data.ts`:
  - buscar → añadir → comparar → ficha → volver;
  - 4 tablas y la quinta; quitar, vaciar y recargar;
  - teclado;
  - TablaFinder, vendida, eliminada e ids antiguos;
  - vacío y una sola tabla;
  - móvil a 320, 375, 390 y 430 px;
  - ficha en móvil.

## Pendiente (no implementado)
- **Medición de uso** (añadidas, comparaciones abiertas, clics en «Ver tabla» desde el comparador): cuando haya analítica sin cookies.
- **Tablas nuevas de tiendas o de afiliación:** `compare.ts` solo lee los campos de un anuncio. Una oferta nueva podría compararse si se adapta a esa forma (precio, medidas con su origen, tipo, construcción, ubicación o «online», estado). Hoy no hay modelo de ofertas.
