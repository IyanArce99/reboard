# Auditoría de la beta publicada

23-10-2026 · rama `main`.

Se ha probado en un navegador real (Chromium con Playwright, a 1440 px y 390 px) en dos configuraciones:
- **Sin base de datos**, igual que la beta publicada hoy: interfaz vacía.
- **Con Supabase local**, para la publicación real, con Auth (código por email en Mailpit), Storage y Turnstile con las claves de prueba.

## Bloqueo principal para captar vendedores

**La beta publicada no tiene Supabase configurado, así que nadie puede publicar.** Por eso aparecía «Demo: las fotos se preparan en tu dispositivo y no se suben a ningún sitio». La app funciona sin base de datos con la interfaz vacía, y la publicación «no está abierta».

- **Ahora:** lo dice una sola vez y con claridad, arriba del asistente y en `/vender`: «La publicación todavía no está abierta…». Ya no hay textos de «Demo» repartidos por los pasos.
- **Para abrirla** (`docs/LAUNCH_CHECKLIST.md`):
  - crear el proyecto Supabase en la UE y aplicar todas las migraciones (incluida `20261024090000_reference_brands`);
  - poner en Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_IP_SALT`, `CRON_SECRET` y las claves **reales** de Turnstile;
  - configurar el SMTP de Auth.

Mientras falte eso, ningún cambio de interfaz permite captar vendedores reales.

## Qué se ha cambiado

### Buscador (`/buscar`, `/tablas/*`)
- **Dos estados vacíos distintos:**
  - **Sin ninguna tabla publicada:** «Todavía no hay tablas publicadas», con «Publicar mi tabla» (acción principal) y una sola «Crear alerta».
  - **Sin coincidencias:** sugerencias para ampliar, pero solo las que dan resultados, y una alerta. Solo dice «con estos filtros» si hay filtros activos.
- **Con 0 resultados** se ocultan la ordenación, el cambio de vista y la alerta de la cabecera. En móvil la barra deja solo «Filtros».
- **Sin inventario:** desaparecen los recuentos «(0)» de zonas, tipos y marcas, y el grupo «Marca». Litros, longitud, tipo, precio y construcción siguen funcionando, porque construyen la alerta.
- **Error mío del rediseño anterior, corregido:** el estado vacío salía gris porque dos clases CSS compartían nombre (`.empty`, `.count`).
- **Sincronización filtros ↔ URL:** si se escribía en un campo numérico (que espera 500 ms) y enseguida se quitaba un chip o se usaba «atrás», el temporizador deshacía el cambio. Ahora se cancela.

### Home
- **Zona inicial:** «Toda España», en lugar de Gran Canaria presupuesta. Solo se recuerda una zona elegida por la persona.
- **Botón del buscador:** «Buscar tablas» cuando no hay inventario. Con inventario, «Buscar N tablas» o «Ver alternativas».
- **Tarjetas de tipo:** sin la línea «Sin anuncios · crear alerta» repetida 8 veces.
- **Zonas y marcas a 0 ocultas:** no aparece «Sin marca — 0».
- **Alertas:** de 18 enlaces de alerta se ha pasado a 1.
- **Más peso a vender:** sin inventario, «¿Vendes una tabla? Publícala gratis» sale primero en el hero. El bloque «Todavía no hay tablas publicadas» lleva «Publicar mi tabla».

### TablaFinder
- **Resumen lateral:** solo muestra las respuestas dadas («Tus respuestas aparecerán aquí» al empezar). El volumen aparece cuando se puede calcular y se anuncia con `aria-live`.
- **Cálculo revisado** (`docs/SURFBOARD_FINDER.md`):
  - el tope de la tabla actual decía «20 %» pero aplicaba un 22 %;
  - se ignoran los litros de la tabla actual si se elige «No tengo tabla» o si están fuera de 10–200 L;
  - las reducciones acumuladas se limitan;
  - el rango queda entre 15 y 120 L, con una nota si llega al máximo;
  - el peso admite solo números enteros.
  - Se ha comprobado con más de 10.000 combinaciones en tests.
- **Copy:** menos categórico («suele», «orientativo», «también puede encajar»).
- **Resultado sin tablas:** estado vacío honesto, ampliaciones solo si dan resultados, una alerta y un enlace para publicar. Nunca «Ver 0 …».

### Publicación
- **Aviso único** «La publicación todavía no está abierta» cuando no hay base de datos. El botón final es «Terminar la prueba».
- **Turnstile:** si se pulsaba «Publicar» antes de que la verificación invisible diera su token, salía «Espera un momento…» y había que volver a pulsar. Ahora el botón espera («Comprobando que no eres un robot…») y publica solo; a los 20 s sin token, avisa con claridad.
- **Zona:** ya no viene preseleccionada (era Gran Canaria). Hay que elegirla en el paso 4.
- **Tests:** el cargador de los tests de integración borraba las marcas de referencia de la base local; ya no lo hace. Un test pgTAP exigía 0 marcas; ahora exige las marcas de referencia y 0 modelos y medidas.

## Qué se ha verificado

| Comprobación | Resultado |
|---|---|
| Recorrido sin base de datos (home, buscar, landing, TablaFinder, publicar, vender) a 1440 y 390 px | Sin errores de consola, sin IDs duplicados, una sola «Crear alerta» por página |
| TablaFinder completo (7 pasos → resultado) a 1440 y 390 px | Resumen sin filas vacías, resultado coherente (78 kg aprendiendo → 75–93 L), sin «Ver 0» ni «(0)», sin errores |
| Teclado en la home | El primer Tab es «Saltar al contenido»; foco visible de 2 px #087E8B en todos los elementos recorridos |
| **Publicación real con Supabase local** (1440 y 390 px) | Fotos → La tabla (marca Torq de la lista) → Estado → Precio y ubicación → Revisar → entrar con código (Mailpit) → publicar → la ficha sirve las fotos desde Storage → editar el precio → el cambio se ve. Comprobado en la base de datos: `published`, marca enlazada, zona y localidad, 2 filas en `listing_photos` y 2 objetos WebP en Storage |
| Duplicación del formulario en el DOM | Ningún control duplicado accesible en ningún paso. La vista previa existe dos veces (lateral en escritorio y desplegable en móvil), pero ambas copias son `inert`: no llegan al teclado ni a los lectores de pantalla |
| `npm run typecheck`, `npm run lint` | OK (0 errores; 4 avisos ya existentes) |
| `npm test` | 153/153 |
| `npm run test:integration` (Supabase local) | 63/63 |
| `npm run db:test` (pgTAP) | 128/128 |
| `npm run build` sin base de datos y con Supabase local | OK |

## Pendiente

- **Configurar Supabase en producción.** Es el bloqueo principal (ver arriba).
- **Reactivar los e2e y los tests visuales:** necesitan datos. Hay que cargar el inventario demo en Supabase local (`scripts/seed-local-demo.mts`) y adaptar las aserciones que dependen de ids del mock (`a1040`…). Están desactivados en CI por decisión del titular.
- **Orden de las marcas al publicar:** sin modelos de catálogo salen en orden alfabético, y las más habituales (Torq, NSP, Softech…) quedan detrás de «Ver todas las marcas». Con datos reales convendría ordenarlas por número de anuncios.
- **No probado:**
  - lectores de pantalla reales;
  - zoom al 200–400 %;
  - Turnstile y SMTP de producción;
  - subida de fotos grandes reales desde un móvil, más allá de las imágenes generadas para la prueba.
- **Rendimiento:** la home se sirve sin caché porque lee la cookie de zona (`docs/seo-ux-audit.md` §D).
- **Detalle de copy:** en el hero móvil, «Más filtros: marca, estado, quillas…» menciona marcas aunque, sin inventario, el grupo «Marca» no aparece.
