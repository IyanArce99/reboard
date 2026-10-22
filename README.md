# Reboard

> **Tu próxima tabla ya existe.**
> Marketplace especializado en comprar y vender **tablas de surf de segunda mano** en España.

Reboard deja buscar tablas usadas por **litros, medidas, tipo, precio y ubicación**, que es lo que un marketplace generalista no permite. El comprador contacta directamente con el vendedor. Reboard no gestiona pagos, envíos ni chat propio y no cobra comisión.

**Público:** surfistas, mayoritariamente de menos de 50 años, que quieren comprar una tabla usada cerca de casa o vender la que ya no usan. También tiendas y escuelas con inventario de segunda mano.

---

## ⚠️ Estado real de este repositorio

Es un proyecto **Next.js 16 (App Router + TypeScript)** con **Supabase** (Postgres, Auth y Storage) como backend. Está en la rama `mvp`; **no está desplegado**.

- **Dos modos de datos** (`REBOARD_DATA_SOURCE`):
  - **`mock`** (por defecto):
    - inventario DEMO en memoria, aviso DEMO y `noindex`;
    - sin cuentas ni escrituras: publicar y el panel son simulados;
    - lo usan los e2e y los Preview.
  - **`supabase`** (base de datos real):
    - búsqueda en SQL;
    - cuentas con código por email;
    - guardados en la nube;
    - publicar con fotos (sin EXIF ni GPS), editar, panel real;
    - contacto protegido con Turnstile;
    - reportes, moderación y caducidad automática.
- **Probado contra Supabase local** (Docker), con tests de integración y pgTAP.
- **El proyecto Supabase remoto aún no existe** (tarea B7). Necesita la intervención del titular: ver `docs/LAUNCH_CHECKLIST.md`.
- **Textos legales:** son **borradores** (`/legal/*`, `noindex`), sin datos del titular. Tiene que revisarlos un profesional.
- **Diseño:** el prototipo HTML (`design/prototype/`) fue la base. La dirección de arte actual («coastal editorial», con fotografía de Pexels) está en `docs/DESIGN_AUDIT.md` y `docs/DESIGN_SYSTEM.md`.

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
npm run test:integration  # paridad mock ↔ Supabase, cuentas, publicar, contacto y moderación (Supabase local + Mailpit)
npm run perf:local     # rendimiento con 100, 1.000 y 10.000 anuncios en local
npm run db:types       # regenera src/lib/supabase/database.types.ts
npm run db:test        # tests de seguridad pgTAP (RLS, privilegios, Storage, búsqueda)
npm run db:reset       # reconstruye la base local desde las migraciones
npm run db:lint
npm run db:stop
```

Copia `.env.example` a `.env.local` para cambiar las variables (`npm run env:local` lo genera para Supabase local). Los emails locales (códigos de acceso) se ven en Mailpit: http://127.0.0.1:54324. El trabajo en curso está en la rama `mvp`.

Para salir a producción: **`docs/LAUNCH_CHECKLIST.md`**.

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

| Capa | Elección |
|---|---|
| UI | **Next.js 16 App Router + TypeScript**, Server Components, Cache Components (PPR) |
| Estilos | CSS Modules sobre `src/styles/tokens.css` |
| Datos | **Supabase** (Postgres con RLS, Auth con código por email, Storage para fotos), en la UE. Inventario DEMO en memoria para desarrollo |
| Anti-robots | Cloudflare Turnstile (gratuito), verificado en el servidor |
| Email | Resend como SMTP de Supabase Auth (pendiente de cuenta) |
| Hosting | Vercel (el plan Hobby no permite uso comercial: ver LAUNCH_CHECKLIST) |
| Fuentes | `next/font/google` |

**Fuentes** (todas en Google Fonts, licencia SIL Open Font License 1.1):
- **Barlow Condensed** 600/700/800: wordmark, H1, H2 y títulos destacados, siempre en mayúsculas.
- **Barlow** 400/500/600/700: todo el texto, la interfaz, los precios y los litros.
- **IBM Plex Mono** 400/500/600: medidas técnicas y contadores.

---

## Funcionalidades y estado

Leyenda:
- ✅ **Implementado y probado en local con Supabase.**
- 🟢 **Implementado con datos DEMO** (modo `mock`).
- 🟡 **Parcial o pendiente de un servicio externo.**
- ⚪ **Pendiente.**

| Funcionalidad | Estado |
|---|---|
| Home, búsqueda `/buscar` (filtros, orden, recuentos, facetas), landings de tipo y zona | ✅ consultas SQL |
| Ficha de anuncio (galería, datos con su origen, estados vendida o caducada, similares) | ✅ |
| Asistente «¿Qué tabla necesito?» | 🟢 lógica **simplificada de demostración** |
| Comparador y alertas | 🟢 en el dispositivo (las alertas por email están pendientes) |
| Cuentas: acceso con código de 6 cifras por email, `/cuenta`, borrar la cuenta | ✅ en local con Mailpit. 🟡 Falta el SMTP de Resend en remoto |
| Guardados sincronizados con la cuenta (fusión al entrar) | ✅ |
| Publicar: fotos procesadas en el móvil (WebP, sin EXIF ni GPS), borrador en IndexedDB, Turnstile, Storage | ✅ |
| Editar anuncio y panel del vendedor (confirmar, precio, vendida, retirar, volver a publicar, contactos reales) | ✅ |
| Contacto: el teléfono no está en el HTML; se revela con Turnstile y límite por IP (HMAC) | ✅ |
| Reportar (con sesión) y `/moderacion` (retirar, descartar, restaurar, con registro) | ✅ |
| Caducidad a los 30 días y limpieza de borradores (cron diario) | ✅ ruta y lógica; 🟡 el cron se activa al desplegar |
| Marcas y modelos, tiendas y guías | 🟢 el catálogo real se carga verificado (G2) |
| Textos legales | 🟡 borradores pendientes de revisión |
| Cabeceras de seguridad (CSP, HSTS, X-Frame-Options…), páginas de error | ✅ |
| Alertas por email, importación de tiendas (CSV o feed), SMS, pagos | ⚪ fuera del MVP |

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
| `/entrar`, `/cuenta` | acceso con código y cuenta (noindex) |
| `/moderacion` | cola de moderación (solo moderadores) |
| `/legal/[doc]`, `/creditos` | textos legales (borradores, noindex) y créditos de fotos |
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

## Pendiente de decidir o de hacer fuera del código
- **Crear y configurar** el proyecto Supabase remoto, Turnstile, Resend, Vercel y el dominio (`docs/LAUNCH_CHECKLIST.md`).
- **Plan de Vercel:** Hobby no permite uso comercial.
- **Textos legales:** revisión profesional y datos del titular.
- **Plazos de conservación:** registro de contactos y anuncios vendidos o caducados.
- **Catálogo real** verificado (marcas, modelos, medidas) y **logotipos** de marca autorizados.
- **Recomendador:** validación técnica con surfistas y shapers.
- **Geolocalización:** hoy la ubicación es provincia o isla + municipio, sin coordenadas.
