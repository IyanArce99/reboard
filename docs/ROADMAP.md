# Roadmap

## ✅ Terminado (diseño + prototipo con datos simulados)
- Identidad Reboard (logo R + tabla, wordmark, Atlantic Blue) y sistema visual.
- Todas las pantallas de `docs/PAGES.md`, responsive desktop/móvil, estados vacíos y de poco inventario (20/100/1.000).
- Asistente «¿Qué tabla necesito?» de 7 pasos y su resultado.
- Navegación simplificada, sin megamenú.

## ✅ Implementado en Next.js (fase 1, ver docs/DECISIONS.md)
- Proyecto Next.js 16 + TypeScript, tokens, fuentes y componentes base: Header, MobileMenu, SearchBar + SearchSheet, FilterPanel, ListingCard (vertical, horizontal y responsive), CompareTray, Breadcrumbs, Footer, Logo y banner DEMO.
- Modelo de datos con el origen de cada medida, repositorio con implementación DEMO y fixtures marcados.
- `/` (home variante A), `/buscar`, `/tablas/[forma|zona]`, `/tablas/[zona]/[forma]` y `/anuncio/[slug-id]`, con metadatos, canonical y JSON-LD (Product/Offer, ItemList, BreadcrumbList), además de `robots.txt`, `sitemap.xml` y 404/308 reales en `proxy`.
- Guardados, comparación, alertas y perfil de surfista solo en local; «cerca de ti» con una cookie stub.

## ✅ Implementado en Next.js (fase 2: resto de pantallas)
- `/calculadora-litros` (asistente de 7 pasos, resultado y perfil), `/vender`, `/vender/publicar` (5 pasos, stub de publicación), `/panel`, `/comparar`, `/guardado`, `/alertas`, `/marcas/[marca]`, `/marcas/[marca]/[modelo]`, `/tiendas`, `/tiendas/[slug]`, `/guias`, `/guias/[slug]` y `/sistema` (interna).

## 🟡 Parcial
- Guías: una plantilla con un solo artículo.
- Marcas y modelos: unos 13 modelos demo, con logos sin autorizar.
- Comparación técnica de modelos: no diseñada, opción secundaria.
- Lógica del recomendador: simplificada, sin validar.
- Logo: el wordmark SVG depende de la fuente y hay que pasarlo a contornos.

## ⚪ Pendiente (no existe nada operativo)
- Contenido de guías: solo existe «Qué revisar al comprar una tabla usada». «Qué tabla comprar después de una softboard» sigue siendo una página provisional.
- Publicación real (`PublishService`): verificación por SMS, persistencia y subida de fotos.
- Email en las alertas del asistente: se añadirá cuando existan los avisos reales.
- Filtro por tienda en `/buscar` (alertas por tienda) y campos de teléfono y web en las tiendas.
- Base de datos y API reales (hoy solo existe `ListingRepository` con la implementación DEMO).
- Autenticación por email (OTP) al final de publicar. **Sin SMS en esta fase.**
- Subida y procesado de imágenes.
- Geolocalización y distancia real (hoy la cookie `rb_zona` y los km simulados del DEMO).
- Alertas reales (email/push) y avisos de bajada de precio o venta.
- Caducidad automática: confirmar cada 14 días, caduca a los 30.
- Moderación y reportes.
- Panel de tienda con importación CSV o feed.
- Analítica de contactos (clics en WhatsApp o teléfono).
- Legal: aviso legal, privacidad, cookies y condiciones.

## Prioridades MVP (estado)
1. ✅ Next.js + tokens + componentes base.
2. ✅ Modelo de datos del anuncio (en la UI; la base de datos se describe en DATABASE.md).
3. ✅ `/`, `/buscar`, `/tablas/[...]` y `/anuncio/[slug-id]` con SSR y SEO.
4. ✅ Pantallas de publicar, panel, asistente, guardado, comparador, marcas, tiendas y guías (UI con datos DEMO).
5. ⏭ **MVP funcional**: plan por tareas abajo.

---

## Plan MVP funcional (por tareas, ordenado por dependencias)

Documentos: [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [MVP_IMPLEMENTATION.md](MVP_IMPLEMENTATION.md) y [SECURITY.md](SECURITY.md).

Cada tarea es pequeña (de medio día a dos días), deja el build en verde y no cambia la interfaz salvo que se diga. La columna «Depende de» marca el orden. Lo que no tiene dependencias entre sí puede hacerse en paralelo.

### Fase A: preparación (sin backend) ✅ completada el 22-10-2026 en la rama `mvp`
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| A1 ✅ | **Commit** del estado actual. Rama `mvp` | — | El historial contiene el trabajo de las fases 1 y 2 |
| A2 ✅ | Vitest + tests de la lógica pura (`filters`, `match`, `parse`, `recommend`, `landings`, `describe`) | A1 | `npm test` en verde |
| A3 ✅ | Playwright: lista de URLs con el código HTTP esperado (200/404/308) y capturas de referencia de las pantallas clave | A1 | Se ejecuta en local |
| A4 ✅ | CI en GitHub Actions: `tsc`, `eslint`, `vitest` y `build` | A2 | PR en verde |
| A5 ✅ | `.env.example` y mover `unsplash()` de `src/mocks` a `src/lib/images.ts` | A1 | Ninguna página importa `@/mocks` salvo el repositorio mock |
| A6 ✅ | **Interfaz de repositorio por consultas** (`search`, `facets`, `count`, `byPublicId`, `byIds`, `similar`, `recent`), implementada en `mockRepository` y usada en todas las páginas, en `/api/*` y en `proxy` | A2, A3 | Capturas y estados HTTP idénticos. El filtrado en memoria queda solo dentro del mock |

### Fase B: Supabase (base de datos) ✅ en local, el 22-10-2026
Un único proyecto Supabase (`reboard`, UE, plan gratuito). Todo se ha hecho y probado en **Supabase local (Docker)**: aún no se ha tocado ningún proyecto remoto.

| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| B1 ✅ | Supabase CLI (dependencia de desarrollo), `supabase/config.toml` y scripts `db:*` | — | `npm run db:start` levanta Supabase local |
| B2 ✅ | Migración del esquema: tipos, tablas, CHECK e índices (sin columnas `is_demo`) | B1 | Se aplica en local (`db:reset`) |
| B3 ✅ | Migraciones de funciones, disparadores, RLS y privilegios por columna | B2 | 120 tests pgTAP en verde (`db:test`) y linter sin errores |
| B4 ✅ | Datos de referencia: las 9 zonas. **Sin anuncios, tiendas ni catálogo ficticios** (`seed.sql` vacío) | B2 | Lo comprueba un test |
| B5 ✅ | Bucket `listing-photos` y políticas de Storage | B1 | Tests: subir a la carpeta propia sí, a la ajena no |
| B6 ✅ | Búsqueda en SQL: `listing_matches` (un único predicado), `search_listings`, `count_listings`, `listing_facets` y `reveal_contact` | B3 | Tests pgTAP de semántica. La paridad completa con el inventario DEMO pasa a C3 |
| B7 | **Proyecto remoto:** crear `reboard` (UE, Free) y aplicar las migraciones con `npx supabase db push` | B1–B6, **autorización** | `db:test` en local y `db push` sin errores; las tablas existen en el proyecto |
| B8 | CI: job `database` (Supabase local en GitHub Actions: `db:lint` y `db:test`) | B3 | Pendiente de un remoto en GitHub para ejecutarse |

### Fase C: lectura real (sin login) ✅ en local
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| C1 ✅ | Clientes `src/lib/supabase/{public,server,browser,service}.ts`, tipos generados (`npm run db:types`), `@supabase/supabase-js`, `@supabase/ssr` y `zod` | B1 | Typecheck; `service.ts` es `server-only` |
| C2 ✅ | `supabaseRepository` con `'use cache'` y etiquetas (`listings`, `listing:{id}`, `catalog`, `shops`); `REBOARD_DATA_SOURCE=supabase` | A6, B6 | La app funciona con datos de Supabase local |
| C3 ✅ | Paridad mock ↔ Supabase (`npm run test:integration`): búsqueda, orden, paginación, facetas, fichas, similares, tiendas, catálogo | C2 | 41 tests en verde |
| C4 ✅ | `/anuncio` con los N recientes prerenderizados, marcadores con la base vacía, y `proxy` con consultas ligeras (`src/lib/data/lookup.ts`) | C2 | 404/308 correctos contra la base de datos |
| C5 ✅ | `next.config`: host de Storage en `remotePatterns`; `dangerouslyAllowLocalIP` solo con Supabase local. (Cabeceras de seguridad y CSP: fase G) | C1 | Fotos de Storage servidas por `next/image` |
| C6 ✅ | Rendimiento con 100, 1.000 y 10.000 anuncios (`npm run perf:local`) y optimización de la búsqueda en SQL | C2 | p95 < 25 ms con 1.000 y < 160 ms con 10.000 (sin caché) |

### Diseño: dirección de arte y copy ✅ en local, el 22-10-2026
Dirección «coastal editorial» con fotografía de Pexels (local, optimizada y acreditada), siluetas SVG de las formas, cabecera de sección única, footer de marca y copy revisado. Rediseñadas la home, `/vender`, `/guias`, la guía, `/tiendas`, marca y modelo, el resultado del asistente, el bloque «Antes de comprar» de la ficha, los estados vacíos y la 404. Nueva página `/creditos`. Detalle, fotos, copy antes/después y pendientes en `docs/DESIGN_AUDIT.md`.

### Fase D: cuentas ✅ en local (salvo D1 remoto), el 22-10-2026
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| D1 🟡 | SMTP propio en Supabase Auth (Resend, remitente en reboard.es) y plantillas en español | B1 | Llega el código a un email real. **Hecho en local:** plantilla en español y código leído en Mailpit. **Pendiente del titular:** cuenta de Resend, dominio verificado y SMTP en el panel. |
| D2 ✅ | `/entrar` (email → código), `/auth/confirm` y refresco de la sesión en `proxy` (solo rutas privadas) | C1, D1 | Se puede entrar y salir. `getUser()` en el servidor |
| D3 ✅ | Cabecera con «Entrar» o el usuario (isla en `<Suspense>`). Nombre visible en el perfil | D2 | Las páginas públicas siguen siendo PPR (sin dinamizarse enteras) |
| D4 ✅ | Guardados en la base de datos para usuarios con sesión y fusión de `rb-usuario-v1.saved` al entrar | D2 | Un guardado aparece en otro dispositivo |
| D5 🟡 | CAPTCHA con **Cloudflare Turnstile (gratuito)**: activarlo en Supabase Auth (acceso) y verificar el token en el servidor para contacto, publicar y reportar | B7 | Sin token válido, el servidor rechaza la acción (probado con las claves de prueba de Turnstile). **Hecho:** widget, verificación en el servidor con tests y token en el acceso. **Pendiente:** activarlo en Supabase Auth remoto (B7) y usarlo en publicar, contacto y reportar (E y F). |

### Fase E: publicar y gestionar ✅ en local, el 22-10-2026
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| E1 ✅ | Esquemas zod del borrador (con los mismos límites que los CHECK) | C1 | Tests de validación |
| E2 ✅ | Fotos en el cliente: redimensionado y WebP (quita EXIF), y persistencia del borrador en IndexedDB | — | Test: la foto resultante no tiene EXIF ni GPS |
| E3 ✅ | Server Actions `createListingDraft` y `publishListing`, y subida a Storage desde `PublishFlow` (el paso 5 abre el acceso si no hay sesión) | B5, D2, D5, E1, E2 | E2E: publicar con 2 fotos → la ficha existe |
| E4 ✅ | `updateTag` y aparición inmediata en `/buscar`, landings y home | E3, C2 | E2E: se ve en `/buscar` filtrando por sus litros, precio, marca y zona |
| E5 ✅ | `/panel` real: anuncios del usuario y acciones (confirmar, bajar precio, marcar vendida, volver a publicar, retirar). `rb-panel-v1` queda solo para la demo | E3 ✅ | E2E: marcar vendida → banner «vendida» en la ficha |
| E6 ✅ | Editar: `/vender/publicar?editar=` desde la base de datos (solo el dueño), incluidas las fotos | E3 ✅ | E2E: editar el precio → «Ha bajado de X a Y» |

### Fase F: contacto, caducidad y moderación ✅ en local, el 22-10-2026
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| F1 ✅ | `revealContact` (Server Action + CAPTCHA + HMAC de IP + `reveal_contact`), sin registro, conectada al modal actual | B6, D5, E3 | E2E: se abre `wa.me` con el número. El número no está en el HTML |
| F2 ✅ | Cron de caducidad (`/api/cron/expirar` con `CRON_SECRET`), «pendiente» calculado (> 14 días) y limpieza de fotos huérfanas | E3 ✅ | Test: un anuncio con `confirmed_at` de hace 31 días pasa a caducado |
| F3 ✅ | Reportar anuncio (con sesión y CAPTCHA), marca automática con 3 reportes, y `/moderacion` mínimo | B3, D2, D5 | Un moderador retira el anuncio y sus fotos desaparecen |
| F4 ✅ | Estadística real «clics en contactar» en el panel. Ocultar visitas y guardados simulados fuera del DEMO | F1, E5 | El panel en producción no muestra cifras simuladas |

### Fase G: salida a producción 🟡 preparada en local, el 22-10-2026 (lo remoto requiere al titular: docs/LAUNCH_CHECKLIST.md)
**Hecho en local:**
- cabeceras de seguridad (CSP sin nonce, compatible con PPR; HSTS; X-Frame-Options; nosniff; Permissions-Policy);
- `error.tsx` y `global-error.tsx`;
- textos legales en borrador (`/legal/*`, noindex) enlazados en el footer;
- `robots.txt` ampliado;
- borrar la cuenta (RGPD) en `/cuenta`;
- `npm audit`: 0 vulnerabilidades en producción; vitest 5 en desarrollo;
- `docs/LAUNCH_CHECKLIST.md`.

| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| G1 🟡 | Textos legales: aviso legal, privacidad, cookies y condiciones | Decisión pendiente «Textos legales» | Publicados y enlazados en el footer. **Hecho:** borradores sin datos del titular, enlazados y con noindex. **Pendiente:** revisión profesional |
| G2 ⚪ | Catálogo verificado contra las tablas del fabricante (`source_note`) en producción | B4 | Sin datos DEMO en producción |
| G3 ⚪ | Vercel (Hobby → Pro si hay uso comercial): Production → reboard.es con las claves de Supabase. Preview **sin** claves (`REBOARD_DATA_SOURCE=mock`) | C1 | Los Preview nunca escriben en la base de datos real |
| G4 🟡 | Lista de comprobación de SECURITY §9 y e2e completo contra Supabase local | Todas | Lista completa. Se activa `REBOARD_DATA_SOURCE=supabase` en producción |

### Decisiones
**Aprobadas (22-10-2026):**
- Dominio reboard.es y Supabase en la UE.
- Acceso por email con OTP y registro al final de publicar.
- Ubicación por municipio y provincia, sin coordenadas.
- Contacto sin registro, con límites y protección contra abuso. Reportar requiere sesión.
- Se mantienen las URLs de los anuncios vendidos y caducados.
- Teléfonos sin verificar al principio.
- CAPTCHA en acciones sensibles: Cloudflare Turnstile, modalidad gratuita.
- Un único proyecto Supabase (`reboard`, UE, plan gratuito); los datos DEMO solo en local.
- Resend para los emails transaccionales.
- Sin pagos ni mensajería en el MVP.

Detalle y efecto técnico en [ARCHITECTURE.md §7](ARCHITECTURE.md).

**Pendientes:**
| Decisión | Recomendación | Bloquea |
|---|---|---|
| Copias de seguridad en el plan gratuito | `npx supabase db dump` antes de cada migración en remoto | B7 y siguientes migraciones |
| Textos legales | Asesoría externa | G1 (y abrir el registro en producción) |
| Fuente de municipios | Dataset oficial del INE | Validar `town` con una lista (opcional en el MVP) |

## Después
Perfil en la nube, push, feeds de tiendas, valoración orientativa de precio (solo con datos reales) y expansión a Portugal y Francia.

## Contacto por email · fase 2 (pendiente)

**Email de contacto distinto del de la cuenta.**
- Hoy los mensajes llegan al email verificado de la cuenta.
- Para permitir otro email:
  - tabla privada `seller_contact_emails` (usuario, email, token con hash, fecha de verificación);
  - enlace de verificación por email con caducidad;
  - usarlo solo cuando esté verificado.

**Publicación asistida** (vendedores captados en Wallapop, Milanuncios o Facebook):
1. El administrador crea el anuncio como **borrador** en /admin, con el email que da el vendedor. No se asigna a ninguna cuenta existente.
2. Reboard envía un enlace mágico de un solo uso a ese email. Al abrirlo, el vendedor entra o crea su cuenta con ese email, que queda verificado, y el borrador pasa a su cuenta.
3. El vendedor revisa los datos y lo publica él mismo; puede corregirlo o retirarlo cuando quiera.
4. Hasta que lo confirme, el anuncio no se publica y el contacto no se activa.

Así no se inventan propietarios ni se asignan anuncios a cuentas equivocadas.
