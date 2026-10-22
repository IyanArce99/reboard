# Reboard

> **Tu próxima tabla ya existe.**
> Marketplace especializado en comprar y vender **tablas de surf de segunda mano** en España.

Reboard deja buscar tablas usadas por **litros, medidas, tipo, precio y ubicación**, que es lo que un marketplace generalista no permite. El comprador contacta directamente con el vendedor. Reboard no gestiona pagos, envíos ni chat propio y no cobra comisión.

**Público:** surfistas, mayoritariamente de menos de 50 años, que quieren comprar una tabla usada cerca de casa o vender la que ya no usan. También tiendas y escuelas con inventario de segunda mano.

---

## ⚠️ Estado real de este repositorio

Es un proyecto **Next.js 16 (App Router + TypeScript)** que recrea el prototipo aprobado. Ya están implementadas todas las pantallas del prototipo: home, búsqueda, landings, ficha, asistente, publicar, panel, comparador, guardado y alertas, marcas y modelos, tiendas y guías. Ver `docs/ROADMAP.md` y `docs/DECISIONS.md`.

- **Todos los anuncios son datos DEMO** (`src/mocks/`). Mientras lo sean, el sitio muestra un aviso DEMO y va con `noindex`.
- No hay backend, base de datos, autenticación ni envío de alertas. Guardados, comparación y alertas viven en el navegador.
- El prototipo HTML (`design/prototype/`) sigue siendo la **fuente de verdad del diseño**.

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start

npm test               # Vitest: lógica, caracterización de la búsqueda y contrato del repositorio
npm run typecheck      # TypeScript
npm run lint
npm run test:e2e       # Playwright (requiere npm run build): rutas, SEO y recorridos
npm run test:visual    # capturas de referencia, solo local (-- --update-snapshots para regenerarlas)

# Base de datos (Supabase local en Docker; no usa ninguna cuenta)
npm run db:start       # levanta Supabase local y aplica supabase/migrations
npm run env:local      # crea .env.local para usar la app con Supabase local (REBOARD_DATA_SOURCE=supabase)
npm run db:seed-demo   # carga el inventario DEMO SOLO en la base local (para desarrollar)
npm run test:integration  # paridad mock ↔ Supabase local
npm run perf:local     # rendimiento con 100, 1.000 y 10.000 anuncios en local
npm run db:types       # regenera src/lib/supabase/database.types.ts
npm run db:test        # tests de seguridad pgTAP (RLS, privilegios, Storage, búsqueda)
npm run db:reset       # reconstruye la base local desde las migraciones
npm run db:lint
npm run db:stop
```

Copia `.env.example` a `.env.local` para cambiar las variables. El trabajo en curso está en la rama `mvp`.

Variables opcionales: `REBOARD_DEMO_INVENTORY` (20 | 100 | 1000, 100 por defecto), `NEXT_PUBLIC_SITE_URL` (para canonical y JSON-LD).

---

## Ver el prototipo

El prototipo usa un runtime propio (`support.js`) que carga los componentes `.dc.html` hermanos por fetch, así que **necesita un servidor estático** (con doble clic, `file://` no funciona):

```bash
cd design/prototype
npx serve .            # o: python -m http.server 8080
# abrir http://localhost:3000/Reboard.dc.html
```

Hace falta conexión a internet para Google Fonts y las fotos de Unsplash.

**Barra «DEMO» superior del prototipo (no forma parte del producto):**
- **Pantalla:** salta a cualquier pantalla.
- **Vista:** Desktop / Móvil (el modo Móvil la muestra dentro de un marco de 390×844).
- **Home:** variante A (hero petróleo, la aprobada) o B (hero claro).
- **Inventario:** 20, 100 o 1.000 anuncios simulados, para ver los estados con poco o mucho inventario.

`Reboard Marca.dc.html` contiene la presentación de marca: propuestas de logo, logo final y mini guía.

---

## Estructura

```
reboard/
├── README.md                ← este archivo
├── CLAUDE.md                ← contexto permanente para Claude Code
├── docs/
│   ├── PRODUCT.md           visión, público, flujos
│   ├── PAGES.md             inventario de pantallas, componentes, estados, desktop vs móvil
│   ├── DESIGN_SYSTEM.md     colores, tipografía, espaciado, componentes, breakpoints, estados
│   ├── SURFBOARD_FINDER.md  asistente «¿Qué tabla necesito?»
│   ├── SEO.md               rutas indexables, metadatos, datos estructurados
│   └── ROADMAP.md           qué hay, qué falta, prioridades MVP
├── design/
│   ├── prototype/           prototipo navegable (fuente de verdad visual)
│   │   ├── Reboard.dc.html          app completa (todas las pantallas)
│   │   ├── Tarjeta Atlantic.dc.html tarjeta de anuncio (vertical + horizontal)
│   │   ├── Logo Reboard.dc.html     logo paramétrico (horizontal/iso/apilado/app)
│   │   ├── Reboard Marca.dc.html    guía de marca
│   │   └── support.js               runtime del prototipo (no reutilizar en producción)
│   └── source/
│       ├── prototype-logic.js       lógica completa del prototipo (referencia)
│       └── mock-data.js             datos SIMULADOS + generador de inventario
├── src/styles/tokens.css    variables CSS Atlantic Blue
└── public/
    ├── favicon.svg
    ├── brand/               isotipo, horizontal, app icon (SVG) + README
    └── images/IMAGE_SOURCES.md   origen de las fotos de stock
```

---

## Stack

| Capa | Hoy (prototipo) | Objetivo (recomendado) |
|---|---|---|
| UI | HTML con estilos inline + runtime `support.js` (React por debajo) | **Next.js App Router + TypeScript**, Server Components |
| Estilos | Inline | CSS Modules o Tailwind sobre `tokens.css` (decisión pendiente) |
| Datos | Generados en cliente (`build(n)`, semilla fija) | Base de datos real; la elección está **pendiente** |
| Estado de usuario | `localStorage` (`reboard-proto-v1`): pantalla, perfil de surfista, respuestas del asistente | Cookies/localStorage para invitado y cuenta opcional |
| Fuentes | Google Fonts | `next/font/google` |

**Fuentes** (todas en Google Fonts, licencia SIL Open Font License 1.1):
- **Barlow Condensed** 600/700/800: wordmark, H1, H2 y títulos destacados, siempre en mayúsculas.
- **Barlow** 400/500/600/700: todo el texto, la interfaz, los precios y los litros.
- **IBM Plex Mono** 400/500/600: medidas técnicas y contadores.

---

## Funcionalidades y estado

Leyenda:
- 🟢 **Prototipo completo**: diseño e interacción finales, con datos simulados.
- 🟡 **Prototipo parcial**.
- ⚪ **Pendiente**.

Nada está implementado en producción.

| Funcionalidad | Estado |
|---|---|
| Home (hero, buscador, tipos, recién publicadas cerca, recomendador, zonas, vender, marcas, guías) | 🟢 |
| Hoja de búsqueda de la home (zona, distancia, litros, tipo) | 🟢 |
| Resultados `/buscar`: filtros básicos y avanzados, chips aplicados, orden, cuadrícula/lista, «litros sin indicar», estado vacío con sugerencias, alerta | 🟢 |
| Páginas de tipo y zona (reutilizan `/buscar` con su propio encabezado) | 🟢 |
| Ficha de anuncio: galería, datos con su origen, 5 estados, contacto por WhatsApp, similares | 🟢 |
| Asistente «¿Qué tabla necesito?» (7 pasos + resultado) | 🟢 lógica **simplificada de demostración** |
| Perfil de surfista: «Te encaja», «Solo tablas para mí» | 🟢 local |
| Comparador de 2 a 4 anuncios | 🟢 |
| Guardado y alertas | 🟢 local |
| Publicar tabla (5 pasos: fotos, medidas del catálogo, medidas pegadas, confirmación, verificación del teléfono) | 🟢 simulado |
| Panel del vendedor | 🟢 estadísticas simuladas |
| Marca, modelo con variantes | 🟢 solo hay datos de algunos modelos |
| Directorio y perfil de tienda | 🟢 |
| Plantilla de guía | 🟡 solo existe una guía |
| Subida real de fotos, autenticación, OTP por SMS, emails de alertas, moderación, importación CSV/feed de tiendas | ⚪ |

---

## Rutas

Las rutas `/...` proceden de la arquitectura SEO aprobada. En el prototipo son pantallas internas (`route` en el estado).

| Ruta | Pantalla del prototipo |
|---|---|
| `/` | home |
| `/buscar` | buscar |
| `/tablas/[tipo]`, `/tablas/[zona]`, `/tablas/[zona]/[tipo]` | buscar con filtro predefinido |
| `/anuncio/[slug-id]` | ficha |
| `/calculadora-litros` | calc (el producto se llama «¿Qué tabla necesito?») |
| `/comparar` | comparar |
| `/marcas/[marca]` | marca |
| `/marcas/[marca]/[modelo]` | modelo |
| `/tiendas` | tiendas |
| `/tiendas/[slug]` | tienda |
| `/guias/[slug]` | guia |
| `/vender/publicar` | publicar |
| `/guardado`, `/alertas` | guardado (pestañas) |
| `/panel` | panel |
| (interna) | sistema (sistema visual, no es ruta pública) |

---

## Decisiones importantes

- **Sin pagos, envíos ni chat.** El contacto es por WhatsApp o teléfono.
- **Datos honestos:**
  - Cada medida indica su origen: «Confirmado por vendedor», «Según fabricante» o «Sin indicar».
  - Nunca se inventan litros.
  - Los anuncios sin litros se muestran aparte («También hay N tablas… cuyos litros no están indicados»).
- **Poco inventario:** el diseño funciona con 20 anuncios. Prioriza las zonas con stock, propone alertas y nunca rellena con anuncios ficticios en producción.
- **Taxonomía:** forma (Shortboard, Fish, Híbrida, Evolutiva, Midlength, Longboard, Gun), construcción (PU, Epoxy, Softboard) y necesidad (principiantes) son ejes distintos. Softboard es una construcción, no una forma.
- **Un solo recomendador**, en `/calculadora-litros`. Todos los «No sé cuántos litros» llevan ahí.
- **Navegación simple:** no hay megamenú. «Comprar tablas» lleva a `/buscar`. En móvil no hay barra inferior fija; la navegación es contextual (cabecera compacta + panel lateral).
- **Variantes de medida dentro de la ficha del modelo**, sin una página por medida.

## Desconocido / pendiente de decidir

- Backend, base de datos, hosting y autenticación.
- Proveedor de SMS/OTP, de email y de almacenamiento de imágenes.
- Fuente real de la geolocalización y del cálculo de distancias. En el prototipo los km son simulados dentro de cada zona.
- Reglas de indexación por umbral de inventario (ver `docs/SEO.md`).
- Logotipos de marcas: requieren autorización y son placeholders.
- Validación técnica del recomendador con surfistas y shapers.
- Dominio: el prototipo usa `reboard.es` solo como texto de ejemplo.
