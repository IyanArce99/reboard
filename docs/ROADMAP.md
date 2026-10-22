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

### Fase A: preparación (sin backend)
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| A1 | **Commit** del estado actual. Rama `mvp` | — | El historial contiene el trabajo de las fases 1 y 2 |
| A2 | Vitest + tests de la lógica pura (`filters`, `match`, `parse`, `recommend`, `landings`, `describe`) | A1 | `npm test` en verde |
| A3 | Playwright: lista de URLs con el código HTTP esperado (200/404/308) y capturas de referencia de las pantallas clave | A1 | Se ejecuta en local |
| A4 | CI en GitHub Actions: `tsc`, `eslint`, `vitest` y `build` | A2 | PR en verde |
| A5 | `.env.example` y mover `unsplash()` de `src/mocks` a `src/lib/images.ts` | A1 | Ninguna página importa `@/mocks` salvo el repositorio mock |
| A6 | **Interfaz de repositorio por consultas** (`search`, `facets`, `count`, `byPublicId`, `byIds`, `similar`, `recent`), implementada en `mockRepository` y usada en todas las páginas, en `/api/*` y en `proxy` | A2, A3 | Capturas y estados HTTP idénticos. El filtrado en memoria queda solo dentro del mock |

### Fase B: Supabase (base de datos)
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| B1 | Crear los proyectos Supabase *staging* y *production* (región UE). Supabase CLI y `supabase/` en el repo | Decisiones D-region, D-dominio | `supabase start` funciona en local |
| B2 | Migración `0001_init.sql`: tipos, tablas, CHECK e índices | B1 | Se aplica en local y en staging |
| B3 | Migración `0002_rls.sql`: RLS, privilegios por columna y funciones (`is_moderator`, `listings_guard`, `photos_limit`, `handle_new_user`) | B2 | Tests de RLS (anon / usuario A / usuario B) en verde |
| B4 | Seeds: `zones.sql`, `catalog.sql` (catálogo DEMO en staging) y `demo.sql` (generado desde `buildDemoInventory`, `is_demo = true`, solo staging) | B2 | Staging tiene los mismos 100 anuncios que el mock |
| B5 | Bucket `listing-photos` y sus políticas de Storage | B1 | Tests: subir en la carpeta propia sí, en la ajena no |
| B6 | RPC `listing_facets(jsonb)` y función `reveal_contact` | B3 | Tests de paridad frente a `matches()` |

### Fase C: lectura real (sin login)
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| C1 | `src/lib/supabase/{public,server,browser,service}.ts` + `@supabase/ssr`, `@supabase/supabase-js` y `zod` | B1, A5 | Typecheck. `service.ts` es `server-only` |
| C2 | `supabaseRepository` (mapeo de filas a `Listing`), con `'use cache'` y `cacheTag` | A6, B4, C1 | Con `REBOARD_DATA_SOURCE=supabase` contra staging, las capturas coinciden con el mock |
| C3 | Tests de paridad `search`/`facets` (Supabase frente al mock) | B6, C2 | Sin diferencias con el seed DEMO |
| C4 | `/anuncio`: `generateStaticParams` con los N recientes y `proxy` con una búsqueda ligera por `public_id` | C2 | 404/308 siguen correctos |
| C5 | `next.config` con el host de Storage en `remotePatterns`, y cabeceras de seguridad (CSP…) | C1 | Sin errores de CSP en consola |

### Fase D: cuentas
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| D1 | SMTP propio en Supabase Auth (Resend) y plantillas en español | B1, D-dominio | Llega el código a un email real |
| D2 | `/entrar` (email → código), `/auth/confirm` y refresco de la sesión en `proxy` (solo rutas privadas) | C1, D1 | Se puede entrar y salir. `getUser()` en el servidor |
| D3 | Cabecera con «Entrar» o el usuario (isla en `<Suspense>`). Nombre visible en el perfil | D2 | Las páginas públicas siguen siendo PPR (sin dinamizarse enteras) |
| D4 | Guardados en la base de datos para usuarios con sesión y fusión de `rb-usuario-v1.saved` al entrar | D2 | Un guardado aparece en otro dispositivo |

### Fase E: publicar y gestionar
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| E1 | Esquemas zod del borrador (con los mismos límites que los CHECK) | C1 | Tests de validación |
| E2 | Fotos en el cliente: redimensionado y WebP (quita EXIF), y persistencia del borrador en IndexedDB | — | Test: la foto resultante no tiene EXIF ni GPS |
| E3 | Server Actions `createListingDraft` y `publishListing`, y subida a Storage desde `PublishFlow` (el paso 5 abre el acceso si no hay sesión) | B5, D2, E1, E2 | E2E: publicar con 2 fotos → la ficha existe |
| E4 | `updateTag` y aparición inmediata en `/buscar`, landings y home | E3, C2 | E2E: se ve en `/buscar` filtrando por sus litros, precio, marca y zona |
| E5 | `/panel` real: anuncios del usuario y acciones (confirmar, bajar precio, marcar vendida, volver a publicar, retirar). Se quitan `pickOwn` y `rb-panel-v1` | E3 | E2E: marcar vendida → banner «vendida» en la ficha |
| E6 | Editar: `/vender/publicar?editar=` desde la base de datos (solo el dueño), incluidas las fotos | E3 | E2E: editar el precio → «Ha bajado de X a Y» |

### Fase F: contacto, caducidad y moderación
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| F1 | `revealContact` (Server Action + HMAC de IP + `reveal_contact`) conectada al modal actual | B6, E3, D-contacto | E2E: se abre `wa.me` con el número. El número no está en el HTML |
| F2 | Cron de caducidad (`/api/cron/expirar` con `CRON_SECRET`), «pendiente» calculado (> 14 días) y limpieza de fotos huérfanas | E3 | Test: un anuncio con `confirmed_at` de hace 31 días pasa a caducado |
| F3 | Reportar anuncio (con sesión), marca automática con 3 reportes, y `/moderacion` mínimo | B3, D2 | Un moderador retira el anuncio y sus fotos desaparecen |
| F4 | Estadística real «clics en contactar» en el panel. Ocultar visitas y guardados simulados fuera del DEMO | F1, E5 | El panel en producción no muestra cifras simuladas |

### Fase G: salida a producción
| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| G1 | Textos legales: aviso legal, privacidad, cookies y condiciones | D-legal | Publicados y enlazados en el footer |
| G2 | Catálogo verificado contra las tablas del fabricante (`source_note`) en producción | B4 | Sin datos DEMO en producción |
| G3 | Vercel: entornos Preview → staging y Production → production, con variables por entorno | C1, D-dominio | El despliegue de Preview funciona |
| G4 | Lista de comprobación de SECURITY §9, captcha y e2e completo en staging | Todas, D-captcha | Lista completa. Se activa `REBOARD_DATA_SOURCE=supabase` en producción |

### Decisiones pendientes
| Id | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| D-region | Región y plan de Supabase | UE (Frankfurt o París). Free para staging; Pro para producción (copias de seguridad) | B1 |
| D-dominio | Dominio definitivo (también para el remitente de los emails) | — | B1, D1, G3 |
| D-ubic | Ubicación: solo zona, o zona + coordenadas de localidad | Solo zona en el MVP y ocultar la distancia | C2 (orden «Más cerca») |
| D-contacto | Contactar sin sesión | Sí, con límite por IP | F1 |
| D-reporte | Reportar sin sesión | No, solo con sesión en el MVP | F3 |
| D-vendidos | Anuncios vendidos o caducados: 200 + noindex o 410 | 200 + noindex con alternativas (como ahora) durante 90 días, después 410 | C4 |
| D-telefono | Aceptar teléfonos sin verificar (no hay SMS) | Sí, con mitigaciones (SECURITY §5) | E3 |
| D-captcha | Cloudflare Turnstile en el acceso | Sí, antes de producción | G4 |
| D-legal | Redacción legal | Asesoría externa | G1 |

## Después
Perfil en la nube, push, feeds de tiendas, valoración orientativa de precio (solo con datos reales) y expansión a Portugal y Francia.
