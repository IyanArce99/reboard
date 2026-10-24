# Auditoría de Reboard: cierre y preparación para el lanzamiento (24-10-2026)

- **Rama:** `auditoria-final`, 4 commits sobre `main`.
- **Estado:**
  - **nada está desplegado** y **ninguna migración se ha aplicado en producción**;
  - producción sigue en `2f347e8`, con 18 migraciones aplicadas;
  - la rama trae **4 migraciones nuevas**, pendientes de tu autorización.
- **Estructura del documento:**
  - **Parte A:** el cierre de hoy. Cada punto lleva un estado: **COMPLETADO**, **PENDIENTE** o **NO VERIFICADO**.
  - **Parte B:** la auditoría de la mañana, como historial.
- **Analítica:** detalle en `docs/ANALYTICS.md`.

**Evidencia:**
- **[PROD]:** www.reboard.es, solo lecturas.
- **[LOCAL]:** build de producción en local contra Supabase local con 100 anuncios DEMO; 12 de ellos con fotos reales de prueba (`npm run db:seed-photos`, solo en local).
- **[CÓDIGO]:** leído en el código, no ejecutado.

---

# Parte A · Cierre

## A1. Problemas anteriores cerrados

| Id | Problema | Arreglo | Estado |
|---|---|---|---|
| SEC-1/2/7 | Perfiles listables; el vendedor veía el usuario y el hash de IP de quien le contactaba; `updated_by` público | Migración `20261029090000_privacy_hardening` y test pgTAP `10` (13 comprobaciones) | **COMPLETADO** en local · PENDIENTE en producción |
| QA-3 | `reveal_contact` contaba contactos sin teléfono | Migración `20261029090100_reveal_contact_needs_phone` y test pgTAP | **COMPLETADO** en local · PENDIENTE en producción |
| SEC-4 | Turnstile no comprobaba acción ni dominio | `verifyTurnstile` exige la acción (`contacto`, `publicar`, `reportar`) y el dominio de `NEXT_PUBLIC_SITE_URL`. Con las claves de prueba de Cloudflare no lo comprueba (local y CI). 5 tests | **COMPLETADO** · prueba con claves reales NO VERIFICADA |
| SEC-5 | APIs públicas sin límite | `/api/tablas` (30/min), `/api/tablas/recuento` (120/min) y `/api/anuncios` (60/min) por IP; 414 si la consulta pasa de 2.000 caracteres; caché de CDN de 30 s en recuento y anuncios. Activo en Vercel o con `RATE_LIMIT=on` | **COMPLETADO** · medido en local: 120 × 200 y luego 429 con `Retry-After`. El límite global (firewall de Vercel) está PENDIENTE |
| SEC-6 | `reboard-gamma.vercel.app` servía la web entera | En el build de producción de Vercel, `*.vercel.app` → 308 a `www.reboard.es`. Las vistas previas no cambian | **COMPLETADO** en el código · NO VERIFICADO en Vercel |
| SEC-8 | Se podía sobrescribir una foto ya publicada | Migración `20261029090200_storage_no_overwrite`, que quita la política de UPDATE en Storage. Test pgTAP `04` | **COMPLETADO** en local · PENDIENTE en producción |
| QA-1 | Al editar, «Sin marca» se guardaba como «Shaper local» | `draftFromListing` | **COMPLETADO** (unitario y e2e) |
| QA-2 | Bucle de redirecciones tras editar si cambiaba el slug | El proxy confirma el slug sin caché antes de redirigir; redirecciones 307; caché invalidada al guardar | **COMPLETADO** (e2e que edita y comprueba 200/307) |
| QA-7 / UX-15 | 4 botones «Confirmar» en las medidas; editar abría en el paso 2 | Una sola confirmación, «Son correctas». Lo que viene del catálogo **sigue siendo «del fabricante»** al confirmar o al editar (antes pasaba a «vendedor»). Editar abre en la revisión | **COMPLETADO** |
| PERF-1 | LCP de la portada | Foto con `fetchPriority="high"`: el retraso de carga baja a 0 | **PARCIAL** (ver A6: el retraso de pintado sigue) |
| PERF-2 | Tarjetas duplicadas en el HTML | Una sola tarjeta que se recoloca con CSS en móvil: 48 → 24 artículos en `/buscar` | **COMPLETADO** |
| PERF-3 | Fuentes de más | Barlow Condensed solo en 800, que es el único peso que se usa | **COMPLETADO** |
| PERF-4 | supabase-js en todas las páginas | Ya no se carga al arrancar sin sesión. La precarga del enlace «Vender mi tabla» lo descarga a los ~1,6 s con prioridad baja, fuera del camino crítico | **PARCIAL** (decisión: no quitar la precarga del CTA principal) |
| PERF-6 | `listing_facets` lenta y *timeouts* en el build | Una sola pasada (migración `20261029090300`; misma salida en 1.276 combinaciones de filtros), más un reintento si se corta por tiempo | **COMPLETADO** en local · PENDIENTE en producción |
| PERF-7 | Imágenes con `max-age=0` | `images.minimumCacheTTL` de 31 días | **COMPLETADO** en el código · NO VERIFICADO en Vercel |
| e2e intermitente | El test de hidratación fallaba en paralelo | Los recorridos que crean y borran datos van en su propio proyecto, **después** del resto; el test de hidratación ignora los 404 de red | **COMPLETADO** (las 2 pasadas completas posteriores, 90/90) |
| Nuevo | El comparador entraba en bucle cuando el saneado descartaba la miniatura, y `/comparar?ids=` no se adoptaba | Se compara ya saneado. Apareció al probar con fotos reales | **COMPLETADO** |
| Nuevo | CLS 0,855 en `/buscar` móvil (el pie saltaba al llegar los resultados) | El hueco de carga ocupa la pantalla (`/buscar`, `/panel`, publicar) | **COMPLETADO**: CLS 0 |
| Nuevo | Galería: sin gesto de deslizar en móvil | Deslizar con el dedo; sin miniaturas en móvil (está el contador «1 / 3»), así el precio sube | **COMPLETADO** (e2e con 2 fotos reales) |
| UX-10 | Áreas táctiles del logo, las migas y el deslizador | 44 px. La casilla del comparador ya estaba dentro de una etiqueta de 44 px (falso positivo) | **COMPLETADO** |
| Analítica | No existía | PostHog EU sin cookies, con 19 eventos y embudos (ver A3) | **COMPLETADO** en el código · se activa al configurar la clave |

## A2. Problemas que siguen abiertos

| Id | Problema | Por qué sigue abierto | Estado |
|---|---|---|---|
| Inventario | Producción tiene **0 anuncios activos** [PROD: `recuento = 0`] y la Softech de prueba da 404 | Depende del titular | **PENDIENTE (bloqueante)** |
| Legales | Marcadores «[Pendiente…]» visibles; base jurídica de la analítica y DPA de PostHog | Requiere un profesional (no se redactan textos definitivos) | **PENDIENTE (bloqueante)** |
| SEC-3 | MFA de la cuenta de administración | La función existe (`/admin/seguridad`); hay que activarla | **PENDIENTE (titular)** |
| Correo | SPF `~all` y sin DMARC (de la auditoría anterior) | DNS en DonDominio | **PENDIENTE (titular)** |
| Copias de seguridad | No sé qué plan de Supabase hay en producción ni qué copias incluye | El plan gratuito no ofrece copias descargables; Pro hace copias diarias de 7 días | **NO VERIFICADO** |
| Monitorización | No hay alertas de errores ni de disponibilidad | Propuesta: alertas de Vercel (Observability) más un *uptime check* gratuito de `/robots.txt` y `/api/tablas/recuento` | **PENDIENTE** |
| PERF-1 | LCP de la portada en ~4,5 s en Lighthouse móvil simulado | La foto ya llega a los 0,7 s; el retraso es de pintado, atribuido al JS (279 KB) con la CPU 4× más lenta. Hace falta reducir el JS de hidratación de la portada (el buscador del hero es una isla grande) | **PENDIENTE (P1)** |
| SEO-1 | Landings de isla casi iguales; indexación cerrada | Texto propio por isla antes de `SITE_INDEXABLE=true` | **PENDIENTE (P1)** |
| SEC-9/10 | Permisos explícitos en funciones; Unsplash en la CSP (lo usan las fotos de tiendas); `security.txt`; `/sistema` | Bajo impacto | **PENDIENTE (P2)** |
| QA-5/6/8/10/11 | 404 en una precarga tras cerrar sesión; 200 durante unos segundos tras borrar; recuento con retraso; «No tienes acceso» duplicado a veces; anuncio nuevo tarda ~2 s en salir | Menores | **PENDIENTE (P2)** |
| Emails | Sin recordatorio antes de caducar ni avisos de alertas | Producto | **PENDIENTE (P1)** |

## A3. Cambios implementados (desde la auditoría de la mañana)

**Seguridad**
- `src/lib/security/turnstile.ts` y las acciones de `src/app/anuncio/actions.ts` y `src/app/vender/actions.ts`: acción y dominio.
- `src/lib/security/rate-limit.ts` (nuevo), aplicado en `src/app/api/tablas`, `src/app/api/tablas/recuento` y `src/app/api/anuncios`.
- `next.config.ts`: redirección de `*.vercel.app` en producción y caché de imágenes.
- Migraciones `20261029090200_storage_no_overwrite.sql` y `20261029090300_listing_facets_single_pass.sql`, con `04_storage_photos.test.sql` actualizado.

**UX**
- **Publicar** (`StepBoard.tsx`, `draft.ts`, `schema.ts`, `PublishFlow.tsx`): confirmación única de medidas, origen conservado y edición desde la revisión.
- **Tarjeta y galería** (`ListingCard.tsx` y `.module.css`, `Gallery.tsx`, `Ficha.module.css`): tarjeta adaptable única, galería con gesto de deslizar y sin miniaturas en móvil.
- **Áreas táctiles** (`Header.module.css`, `Breadcrumbs.module.css`, `Search.module.css`).
- **Comparador** (`Comparator.tsx`): sin bucle.
- **Textos generados** (`describe.ts`): «Tablas por menos de 300 €» sin coma.

**Rendimiento**
- **Huecos de carga:** `src/app/buscar/page.tsx`, `src/app/panel/page.tsx` y `src/app/vender/publicar/page.tsx`.
- **Fuentes:** `src/app/layout.tsx`.
- **supabase-js con sesión:** `UserStateProvider.tsx`, `LoginForm.tsx` y `src/lib/supabase/session-hint.ts` (nuevo).
- **Facetas:** reintento en `supabase-repository.ts`.

**Analítica** (`docs/ANALYTICS.md`)
- **Módulo central:** `src/lib/analytics/events.ts` y `track.ts`.
- **Componentes:** `src/components/analytics/AnalyticsInit.tsx` y `TrackOnMount.tsx`.
- **Proxy:** `src/app/rb-e/[...path]/route.ts`.
- **Puntos instrumentados:** ficha, resultados, contacto, publicar, acceso, TablaFinder, comparador, guardar y alertas.
- **Textos:** Privacidad y Cookies actualizadas en `legal.ts`, pendientes de revisión legal.
- **Dependencia:** `posthog-js@1.438.2`, fijada.

**Pruebas y herramientas**
- **Recorridos** (`tests/e2e/journeys.spec.ts`): en su propio proyecto, con fotos reales, galería, edición y comprobaciones de analítica.
- **Visuales** (`visual.spec.ts`): fichas por slug y referencias nuevas.
- **Unitarios:** `tests/unit/analytics.test.ts`, más tests nuevos en `auth-security` y `publish-finder-present`.
- **Datos de prueba:** `scripts/seed-local-photos.mts` (`npm run db:seed-photos`).
- **Playwright:** `playwright.config.ts`.

## A4. Resultados reales de las pruebas (código final de la rama, 24-10-2026)

| Suite | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm run lint` | ✅ **0 problemas** (antes, 4 avisos) |
| `npm test` (unitarios) | ✅ **326/326** (20 archivos) |
| `npm run test:integration` (Supabase local) | ✅ **78/78** |
| `npm run db:test` (pgTAP, base limpia) | ✅ **227/227** (10 suites) |
| `npm run build` | ✅ (sin *timeout* de facetas) |
| Playwright `e2e` + `journeys` (`npm run test:e2e`) | ✅ **90/90** (86 + 4 recorridos) en las 2 últimas pasadas completas (antes y después de añadir la analítica). En el build de depuración de la analítica fallaron 2 recorridos por un fallo de la propia analítica (descartaba la propiedad `context`), corregido y vuelto a pasar 4/4 |
| e2e de administración (`npm run test:e2e:admin`) | ✅ **14/14** (escritorio y móvil) |
| Pruebas visuales (`npm run test:visual`) | ✅ **16/16** con **referencias nuevas** revisadas una a una (las anteriores eran del diseño previo y apuntaban a ids que ya no existían) |
| Recorridos con analítica en modo depuración | ✅ 4/4: eventos y embudos correctos, `publish_completed` una sola vez y **ningún dato personal** en los eventos |
| Comprador y vendedor con fotos reales | ✅ 2 fotos JPEG de 3000×4000 recodificadas, galería con flecha (escritorio) y gesto de deslizar (móvil) |
| Límite de peticiones (`RATE_LIMIT=on`) | ✅ 120 × 200 y luego 429; 414 con consulta desmesurada |
| Producción tras los cambios | ❌ **NO VERIFICADO**: no se ha desplegado |

## A5. Comparativa visual (`docs/audit/`)

| Pantalla | Antes | Después |
|---|---|---|
| Búsqueda en tablet | `antes-buscar-tablet.png` | `despues-buscar-tablet.png` |
| Datos técnicos en tablet | `antes-ficha-tablet.png` | `despues-ficha-tablet.png` |
| Ficha en móvil, primera pantalla | `antes-ficha-movil.png` | `despues-ficha-movil.png` y, con fotos reales, `cierre-ficha-fotos-movil.png` |
| Portada en móvil | `antes-home-movil.png` | `despues-home-movil.png` |
| Ficha en escritorio con fotos reales | — | `cierre-ficha-fotos-escritorio.png` |
| Búsqueda en escritorio con fotos | — | `cierre-buscar-escritorio.png` |
| Publicar: aviso único de medidas | 4 botones «Confirmar» | `cierre-publicar-medidas.png` |
| Búsqueda sin resultados (móvil) | — | `cierre-buscar-vacio-movil.png` |

## A6. Métricas antes y después

**Lighthouse 12.8.2, móvil:**
- **Condiciones:** mismo equipo, mismo build local y mismos datos (12 anuncios con fotos reales); mediana de 3 pasadas.
- **Antes:** la rama tras la auditoría de la mañana. **Después:** el código final, sin clave de analítica.

| Página | Rendimiento | LCP | TBT | CLS | Peso total | HTML (sin comprimir) | Fuentes |
|---|---|---|---|---|---|---|---|
| Portada | 83 → 82 | 4,53 → 4,48 s | 98 → 86 ms | 0,034 → 0,034 | 947 → 913 KiB | 333 → 334 KiB | 134 → 103 KiB |
| `/buscar` | **54 → 88** | 4,87 → **3,85 s** | 213 → **74 ms** | **0,855 → 0** | 649 → 571 KiB | **537 → 326 KiB** | 123 → 92 KiB |
| Ficha con fotos | 87 → **90** | 4,00 → **3,56 s** | 96 → 63 ms | 0 → 0 | 662 → 626 KiB | 129 → 100 KiB | 134 → 103 KiB |
| Landing de isla | 87 → 89 | 3,90 → **3,56 s** | 96 → 138 ms | 0 → 0 | 632 → **550 KiB** | 354 → **216 KiB** | 134 → 103 KiB |

- **Las pasadas varían:** son cifras de laboratorio con la CPU simulada. El TBT de la landing (96 → 138 ms) está dentro de esa variación.
- **JavaScript:** sigue en 269–279 KiB por página. supabase-js ya no se carga al arrancar, pero se descarga después por la precarga de «Vender mi tabla».
- **Con la analítica activa:** `posthog-js` se cargará cuando el navegador esté libre. Su efecto **no está medido** (NO VERIFICADO); se mide tras activarla.

**Base de datos (`listing_facets`, rol `anon`, media de 50 llamadas):**

| Datos | Antes | Después |
|---|---|---|
| 100 anuncios, sin filtros | 4,86 ms | 2,25 ms |
| 1.000 anuncios, sin filtros | 10,57 ms | 5,94 ms |
| 1.000 anuncios, 8 clientes a la vez (pgbench) | 188–211 tps | 330 tps |

**HTML y producto:**
- **`/buscar`:** 48 → 24 tarjetas en el HTML.
- **Contactar:** 3 → 2 toques.
- **Confirmar medidas:** de 4 confirmaciones a 1.

## A7. Bloqueantes de lanzamiento

| # | Bloqueante | Quién | Estado |
|---|---|---|---|
| 1 | **Autorizar el despliegue:** aplicar 4 migraciones (`db push --dry-run` y después `db push`) y fusionar `auditoria-final` en `main` | Titular → desarrollo | **PENDIENTE** |
| 2 | **Inventario real:** 5–10 anuncios publicados antes de invitar a nadie (hoy 0) | Titular | **PENDIENTE** |
| 3 | **Textos legales** revisados por un profesional, incluida la medición sin cookies | Titular y asesor | **PENDIENTE** |
| 4 | **MFA** en la cuenta de administración y `admin_mfa_required = true` | Titular | **PENDIENTE** |
| 5 | **Copias de seguridad:** confirmar el plan de Supabase o hacer `db dump` periódico | Titular | **NO VERIFICADO** |
| 6 | **Correo:** SPF y DMARC del dominio; comprobar que el código de acceso llega a la bandeja de entrada | Titular | **PENDIENTE** |
| 7 | **Monitorización mínima:** alertas de Vercel y *uptime* | Titular | **PENDIENTE** |
| 8 | **Contacto en producción:** pedir el teléfono de un anuncio real tras desplegar (con `CONTACT_IP_SALT` ya puesto) | Titular | **NO VERIFICADO** |

## A8. Checklist operativo de producción

### Variables de entorno (Vercel → Production)

| Variable | Estado |
|---|---|
| `NEXT_PUBLIC_SITE_URL` = `https://www.reboard.es` | COMPLETADO (comprobado ayer: los canonical salen con `www`) |
| `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` | COMPLETADO (la web funciona con Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | COMPLETADO (publicar funcionó en producción) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` | COMPLETADO. Con SEC-4, **el widget debe tener `www.reboard.es` en sus dominios**: si no, ahora falla |
| `CONTACT_IP_SALT` y `CRON_SECRET` | COMPLETADO (las añadiste ayer) · funcionamiento NO VERIFICADO |
| `SITE_INDEXABLE` | Sin poner (`false`) **a propósito**: indexación cerrada |
| `NEXT_PUBLIC_POSTHOG_KEY` | PENDIENTE (solo en Production, tras configurar PostHog; ver `docs/ANALYTICS.md` §6) |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | Sin poner: Google y Apple ocultos (decisión) |
| `RATE_LIMIT` | No hace falta en Vercel (el límite ya está activo allí) |

### Migraciones pendientes en producción (en este orden)
1. `20261029090000_privacy_hardening.sql`: perfiles, contactos y ajustes.
2. `20261029090100_reveal_contact_needs_phone.sql`
3. `20261029090200_storage_no_overwrite.sql`
4. `20261029090300_listing_facets_single_pass.sql`

**Cómo aplicarlas:**
- Antes, `npx supabase db dump` como copia.
- Después, `npx supabase db push --dry-run`, revisar la lista y `npx supabase db push`.
- Todas son `create or replace`, `drop policy` o `revoke`/`grant`: no cambian tablas ni datos.

### Correo y autenticación
- **SMTP** de DonDominio (`hola@`) en Supabase, con plantillas de código: COMPLETADO (configurado ayer).
- **SPF/DMARC:** PENDIENTE.
- **Prueba de entrega a Gmail y Outlook:** NO VERIFICADO.

### Copias de seguridad
- NO VERIFICADO: confirmar el plan.
- Mínimo recomendado: un `db dump` semanal cifrado, más uno antes de cada migración.

### Monitorización
- PENDIENTE: alertas de errores 5xx en Vercel, un *uptime check* y la alerta «`publish_completed` = 0 en 48 h» en PostHog cuando esté activo.

### Textos legales
- PENDIENTE de revisión profesional: aviso legal (propiedad intelectual y legislación), privacidad (bases jurídicas, conservación, DPA) y cookies (medición sin cookies).

### Analítica
- Código: COMPLETADO.
- Activación: PENDIENTE. Pasos en `docs/ANALYTICS.md` §6:
  - proyecto EU;
  - *Cookieless server hash mode*;
  - descartar la IP;
  - DPA;
  - clave en Vercel;
  - revisión legal.

### Indexación
- Cerrada a propósito (`robots.txt: Disallow: /` [PROD]).
- Abrir con `SITE_INDEXABLE=true` cuando haya 30–50 anuncios reales y texto propio por isla.

### Inventario real
- PENDIENTE: 0 anuncios activos [PROD].

### Despliegue (cuando lo autorices)
1. `npx supabase db dump -f backup-AAAAMMDD.sql`. Guardarlo fuera del repositorio.
2. `npx supabase db push --dry-run` y comprobar que salen las 4 migraciones.
3. `npx supabase db push`.
4. `npx supabase test db --linked` (pgTAP contra producción: transaccional, no deja datos).
5. Fusionar `auditoria-final` en `main` y hacer push. Vercel despliega solo.
6. **Comprobaciones en producción:**
   - portada, búsqueda y ficha;
   - pedir un teléfono;
   - publicar y editar un anuncio de prueba y borrarlo;
   - `/comparar?ids=`;
   - `curl -I https://reboard-gamma.vercel.app` debe dar 308;
   - Lighthouse móvil en `/`, `/buscar` y una ficha.

### Vuelta atrás (rollback)
- **Web:** Vercel → *Deployments* → el despliegue anterior → «Promote to Production» (inmediato). O revertir el merge en `main`.
- **Base de datos:** las migraciones son reversibles con otra migración nueva, sin tocar las aplicadas:
  - `privacy_hardening`: volver a crear `profiles_read using (true)` y conceder `created_at`; dar `select` completo en `contact_events` y `app_settings`;
  - `reveal_contact_needs_phone`: volver a crear la función con el cuerpo de `20261022120100_functions.sql`;
  - `storage_no_overwrite`: volver a crear `listing_photos_owner_update` como en `20261027090000`;
  - `listing_facets_single_pass`: volver a crear la función con el cuerpo de `20261023090200_search_performance.sql`.
- **Si algo va mal con datos:** restaurar el `db dump` del paso 1, solo como último recurso: pierde lo publicado después.

## Veredicto actualizado

| Categoría | Mañana | Cierre | Evidencia |
|---|---|---|---|
| Estado funcional | 8 | **8,5** | 90/90 e2e, 14/14 administración y 78/78 integración; edición arreglada; comparador con fotos arreglado. Resta: producción sin anuncios y contacto sin verificar en [PROD] |
| UX/UI | 8 | **8,5** | Una sola confirmación al publicar, galería táctil, tarjetas unificadas y áreas táctiles |
| Móvil | 8 | **8,5** | CLS 0 en `/buscar`, galería con gesto de deslizar y el precio en la primera pantalla |
| SEO | 6 | 6 | Sin cambios de fondo: la indexación sigue cerrada hasta tener inventario y texto por isla |
| Rendimiento | 7 | **7,5** | `/buscar` 54 → 88; HTML −39 %; fuentes −23 %; facetas ×2. El LCP de la portada sigue pendiente |
| Seguridad | 7 | **8** en la rama · 7 en producción | SEC-4, SEC-5, SEC-6 y SEC-8 cerrados en el código; privacidad en migraciones. Falta desplegar y la MFA |
| Preparación para producción | 6 | 6,5 | Todo listo para desplegar, con checklist y vuelta atrás; faltan las decisiones del titular (A7) |

**¿Lista para los primeros 100 usuarios? SÍ CON CONDICIONES:** los 8 bloqueantes de A7. Los de código están resueltos en la rama; quedan tu aprobación de despliegue, inventario, legales, MFA, copias, correo y monitorización.

---

# Parte B · Auditoría de la mañana (historial)

## Resumen de la auditoría de la mañana
- **Rama:** `auditoria-final`.
- **Estado:** **nada de esta auditoría está desplegado.**
- **Excepción:** el último cambio de «¿Dónde está la tabla?» se subió antes de empezar.
- **Para desplegar** hacen falta tres cosas: tu aprobación, aplicar dos migraciones nuevas en la base de producción (antes en modo de prueba, `--dry-run`) y fusionar la rama en `main`.

**Cómo se ha hecho.** Cuatro revisiones en paralelo y después los arreglos:

1. **UX/UI:** 17 páginas en 5 tamaños de pantalla (360, 430, 820, 1366 y 1920 px) y mediciones automáticas.
2. **Textos:** todos los visibles, metadatos y emails.
3. **Técnica:** SEO, rendimiento con Lighthouse en producción y seguridad (políticas RLS, Server Actions, cabeceras, secretos y dependencias).
4. **Recorridos reales:** comprador y vendedor en escritorio y móvil, contra Supabase local, incluido el acceso con el código que llega por email.

Etiquetas de la evidencia:
- **[PROD]:** comprobado en www.reboard.es, solo con lecturas.
- **[LOCAL]:** build de producción en local con Supabase local y 100 anuncios DEMO (datos de prueba que nunca llegan a producción).
- **[CÓDIGO]:** leído en el código, no ejecutado.

Lo que no se ha podido verificar está marcado como tal.

---

## 1. Estado general

### Qué está desarrollado y funciona [LOCAL, probado de principio a fin]

- **Buscar** desde la portada (isla, litros y tipo) y en `/buscar`:
  - filtros (panel lateral en escritorio y hoja en móvil);
  - orden;
  - páginas por isla y por tipo.
- **Ficha del anuncio:**
  - datos técnicos con su origen (vendedor o fabricante);
  - estado, guardar, compartir y comparar;
  - contacto por WhatsApp o teléfono, con el número protegido por captcha y límite por IP;
  - reportar.
- **Publicar:**
  - 5 pasos con borrador guardado y vista previa en directo;
  - medidas escritas «como las escribe la gente»;
  - acceso con código por email al final;
  - fotos recodificadas en el navegador.
- **Mis anuncios** (`/panel`): cambiar precio, confirmar que sigue a la venta, vendida, volver a publicar, retirar, eliminar y editar.
- **Cuenta:** nombre visible, cerrar sesión y borrar la cuenta.
- **Guardadas, alertas (en el dispositivo) y comparador** (hasta 4 tablas, con enlace para compartir).
- **Calculadora de litros** (TablaFinder), conectada al inventario.
- **Moderación y panel de administración:** cerrados para usuarios normales (comprobado).

### Qué está incompleto o falla

- **Producción no tiene ningún anuncio activo [PROD].**
  - `/api/tablas/recuento` devuelve 0 y la Softech de la primera prueba (`/anuncio/softech-8-2-gran-canaria-a100135`) da 404.
  - Puede que la retiraras o la borraras; no lo he podido comprobar sin acceder a la base de producción.
- **La indexación está cerrada a propósito [PROD].** `robots.txt` bloquea todo y todas las páginas llevan `noindex` hasta que se active `SITE_INDEXABLE=true` en Vercel.
- **Textos legales con marcadores visibles:** «[Pendiente de redactar…]» y «[Pendiente de revisión legal.]» en `src/lib/content/legal.ts` [CÓDIGO]. Necesitan revisión profesional; no los he reescrito.
- **Sin avisos por email:**
  - las alertas no envían nada;
  - el anuncio caduca a los 30 días sin recordatorio.
  
  Está dicho con claridad en la web, pero es una carencia de producto.
- **Sin analítica de uso** (pendiente de auditorías anteriores).
- **Contenido editorial sin revisar:**
  - la única guía y las 7 descripciones de marca siguen marcadas como orientativas;
  - la guía no se indexa.

### Qué falta para lanzar

Ver el roadmap, apartado 7, sección P0.

---

## 2. Auditoría UX/UI

**Valoración de la revisión visual:** 7,5/10 antes de los arreglos. La identidad Atlantic Blue es coherente; el comparador y la ficha nueva se leen bien.

**Mediciones automáticas, antes de los arreglos [LOCAL]:**
- 0 desbordamientos horizontales en 89 combinaciones de página y tamaño;
- 0 imágenes sin `alt`;
- 0 errores de consola.

### Problemas detectados y qué se ha hecho

| Id | Gravedad | Problema | Estado |
|---|---|---|---|
| UX-1 | P1 | Búsqueda en tablet (760–1023 px): una sola columna de tarjetas enormes; `/buscar` medía 18.752 px de alto a 820 px | **Arreglado:** filtros de 240 px y tarjetas de 190 px mínimo. Ahora mide **7.147 px** [LOCAL] |
| UX-2 | P1 | Datos técnicos de la ficha en tablet: se salían de la tarjeta (112 px a 768) y tapaban la columna lateral | **Arreglado** con *container queries*: 2 columnas de medidas cuando la columna es estrecha. Desborde medido: **0** |
| UX-3 | P1 | Contactar costaba 3 toques: «Contactar», «Mostrar contacto» y «Abrir WhatsApp» | **Arreglado:** el teléfono se pide solo al pasar el captcha. Ahora son 2 toques: «Contactar» y «Abrir WhatsApp» |
| UX-4 | P1 | La barra del comparador salía en vender, entrar, guías, tiendas y 404, tapando botones, y con un botón amarillo que no era la acción principal | **Arreglado:** solo en inicio, búsqueda, landings, fichas, marcas y guardadas; botón secundario |
| UX-5 | P1 | Avisos «texto demo» y «Contenido de demostración» visibles en marcas y guías | **Arreglado** el texto: «Descripción orientativa de Reboard» y «Guía orientativa…». Siguen pendientes de revisión de contenido |
| UX-12 | P2 | Ficha en móvil: en la primera pantalla solo se veían las migas, «Volver» y la foto | **Arreglado:** galería a un máximo del 50 % de la pantalla y sin «Volver» en móvil. El precio aparece a 516 de 740 px |
| UX-13 | P2 | La barra fija de la ficha decía «Contactar» sin canal | **Arreglado:** «WhatsApp» o «Llamar» |
| UX-16 | P2 | Publicar llevaba el pie entero (unos 900 px en móvil) y otro «Publicar» amarillo en la cabecera | **Arreglado:** modo enfocado, sin pie ni botón de vender en la cabecera |
| UX-19 | P2 | Vender no se veía en la cabecera del móvil | **Arreglado:** botón «Vender» en móvil; por debajo de 400 px, el icono de cuenta pasa al menú |
| UX-6/7 | P2 | «✓ En comparación» se partía en 360 px; la «L» de «74–92 L» quedaba sola; «Qué evitar» iba en amarillo | **Arreglado:** «Comparando», `nowrap` y color cálido suave |
| UX-15 | P2 | Paso 2 de publicar largo (2.543 px a 360) y con 4 botones «Confirmar» | **No cambiado:** el orden marca → modelo → medidas es necesario, porque elegir la medida del catálogo rellena las demás. Simplificar la confirmación queda en P1 |
| UX-25 | P2 | «Crear alerta» en 5 sitios, aunque no envía avisos | **No cambiado:** decisión de producto (¿«Guardar búsqueda»?). Los textos ya dicen que no avisa |
| UX-10/18/26 | P3 | Áreas táctiles pequeñas (logo, miga «Inicio», casilla del comparador), las 5 tiendas con la misma foto, tres estilos de «seleccionado» en publicar | Pendiente (P2/P3) |

### Decisiones de diseño (registradas en `docs/DECISIONS.md`)

- **Letra:** los datos (medidas, precios, campos y chips) usan Barlow con cifras tabulares en lugar de la monoespaciada, que se leía «robótica». La monoespaciada queda para antetítulos y contadores.
- **Ficha:**
  - medidas en tarjetas;
  - el origen del dato en una nota, y la etiqueta «Fabricante» solo cuando se mezcla con datos del vendedor;
  - «Estado» explicado;
  - «Lo que cuenta {vendedor}».
- **Portada:**
  - accesos «¿Cuántos litros?» y «Vende tu tabla» en tarjetas;
  - «Buscar tablas» sin cifra mientras haya menos de 20 anuncios;
  - «Más filtros» ya abierto, sin parpadeo.

### Cambios en la navegación

| Antes | Ahora | Por qué |
|---|---|---|
| Explorar tablas | **Comprar tablas** | Comprar / Vender es la pareja que se espera en un marketplace |
| TablaFinder | **¿Qué tabla necesito?** | «TablaFinder» es un nombre inventado que no dice qué hace (sigue como nombre de la herramienta en su página) |
| Publicar tabla (no aparecía en la cabecera del móvil) | **Vender mi tabla** (escritorio y tablet) / **Vender** (móvil) | Vender tiene que verse sin abrir el menú |
| Guías | Guías | — |

### Cambios en publicar y en la búsqueda

- **Medidas:** se entienden escritas con comas o puntos, `6’4”`, `20½`, `21-1/2`, `52 cm` o `1,93 m`. Debajo de cada campo se ve cómo se han entendido («6'4" · 193 cm» o «Lo hemos leído en cm…»). Lo ambiguo no se adivina.
- **«¿Dónde está la tabla?»:** isla y localidad en un bloque, la nota de privacidad arriba y las sugerencias de localidad discretas.
- **Tu nombre en el anuncio:** «Lo vende Daniel · Particular» o «Escuela».
- **Litros con coma decimal en toda la web:** «34,5 L».

### Capturas comparativas (`docs/audit/`)

| Pantalla | Antes | Después |
|---|---|---|
| Búsqueda en tablet (820 px) | `antes-buscar-tablet.png` | `despues-buscar-tablet.png` |
| Datos técnicos en tablet (820 px) | `antes-ficha-tablet.png` | `despues-ficha-tablet.png` |
| Ficha en móvil (360 px), primera pantalla | `antes-ficha-movil.png` | `despues-ficha-movil.png` |
| Portada en móvil (360 px) | `antes-home-movil.png` | `despues-home-movil.png` |

**Nota:** los anuncios DEMO no tienen fotos, así que la galería con fotos reales no se ha podido revisar visualmente en local.

---

## 3. Auditoría técnica

### Arquitectura

- **Stack:** Next.js 16 (App Router, Cache Components y `'use cache'` con etiquetas), React 19, Supabase (Postgres con RLS, Auth y Storage) y Vercel.
- **Datos:** las páginas no saben de dónde vienen los datos (`getRepository()`).
- **Tamaño:** 190 archivos TS/TSX con unas 23.000 líneas, 20 migraciones y 10 suites pgTAP.
- **Calidad:** typecheck limpio y lint sin errores (2 avisos en un test).

### Rendimiento: Lighthouse 12, perfil móvil [PROD salvo indicación], medido ANTES de los arreglos

| Página | Rendimiento | Accesibilidad | Buenas prácticas | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| `/` | 74–75 | 100 | 100 | 4,2–4,4 s | 332–454 ms | 0–0,034 |
| `/buscar` | 86 | 100 | 100 | 3,2 s | 291 ms | 0 |
| `/calculadora-litros` | 95 | 100 | 100 | 2,5 s | 178 ms | 0 |
| `/tablas/gran-canaria` | 90 | 100 | 100 | 3,3 s | 143 ms | 0 |
| Ficha [LOCAL, sin fotos] | 73 | 100 | 100 | 4,8 s | 386 ms | 0 |

- La nota de SEO de Lighthouse (54–69) baja solo por el `noindex` intencionado.
- **Core Web Vitals reales (de campo): sin datos**, porque todavía no hay tráfico.
- **Arreglado:** la imagen de portada ahora se pide con `fetchPriority="high"`. Lighthouse señalaba que faltaba; la mejora del LCP **no está medida en producción** (hay que medirla tras desplegar).
- **Pendiente:**
  - PERF-2: cada tarjeta se pinta dos veces, una para móvil y otra para escritorio (unos 520 KB de HTML en `/buscar`);
  - PERF-3: 8–9 archivos de fuentes por página;
  - PERF-4: supabase-js (unos 67 KB) se carga sin sesión;
  - PERF-6: `listing_facets` lenta, causa probable del *timeout* intermitente del build.

### Seguridad

**Verificado correcto:**
- **Cabeceras [PROD]:** CSP estricta, HSTS, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- **Secretos [PROD]:** ninguno en los 19 archivos JS de producción.
- **Dependencias:** `npm audit` sin vulnerabilidades.
- **Server Actions [CÓDIGO]:** todas vuelven a comprobar la sesión con `auth.getUser()` y validan con zod. El service role solo se usa tras captcha o sesión.
- **Contacto:** el teléfono no aparece en el HTML [PROD] y no lo pueden leer anónimos [LOCAL].
- **Redirecciones:** la redirección abierta está cerrada.

**Arreglado en esta rama** (migraciones nuevas, probadas en local, **pendientes de aplicar en producción**):

| Id | Problema | Arreglo |
|---|---|---|
| SEC-1 | Cualquiera podía listar todos los perfiles (nombre y fecha de alta) | Solo se ve el propio, el de quien tiene un anuncio visible y, para moderación, todos. La fecha de alta ya no es pública (`20261029090000_privacy_hardening.sql`) |
| SEC-2 | El vendedor podía leer el `user_id` y el hash de IP de quien le contactaba | Solo ve anuncio, canal y fecha |
| SEC-7 | El UUID de quien editó cada ajuste era público | Ya no se puede leer |
| QA-3 | `reveal_contact` contaba un contacto aunque el anuncio no tuviera teléfono | Solo cuenta si hay teléfono (`20261029090100_reveal_contact_needs_phone.sql`) |

**Sigue abierto:**
- **SEC-3:** MFA de la cuenta de administración. Esconder «Tengo contraseña» no protege; hay que activar TOTP.
- **SEC-4:** Turnstile no comprueba el dominio ni la acción.
- **SEC-5:** las APIs públicas (`/api/tablas`, `recuento`) no tienen límite de peticiones.
- **SEC-6:** `reboard-gamma.vercel.app` sirve la web completa.
- **SEC-8:** la política de Storage permite sobrescribir una foto ya publicada.
- **SEC-9:** permisos explícitos en 19 funciones (sin impacto actual).
- **SEC-10:** Unsplash sigue en la CSP, falta `security.txt` y `/sistema` responde 200.
- **De auditorías anteriores:** DMARC y SPF, copias de seguridad y monitorización.

### SEO

**Bien:**
- un H1 por página;
- títulos únicos con la isla;
- canonical absoluto en `www`;
- Open Graph completo;
- JSON-LD válido: `WebSite` y `Organization` en la portada, `BreadcrumbList` e `ItemList` en las landings, `Product`/`Offer` en la ficha y `Article` en la guía;
- 404 y redirecciones reales.

**Arreglado:**
- el sitemap ya no incluye `/tiendas` sin tiendas ni `/guias` sin guías revisadas;
- el índice de guías no se indexa mientras todas sean orientativas;
- `Product` ya no declara `image: []` sin fotos;
- títulos con «Canarias» en vender, marcas y tiendas;
- descripción de la portada sin repetir.

**Pendiente:**
- **SEO-1 (P1):** las landings de dos islas se parecen un 96,5 % y la intro es de una frase. Hace falta texto propio por isla, escrito por alguien local.
- **SEO-3:** «Ver más» lleva a `/buscar` (noindex).
- **SEO-4:** en `/buscar` los metadatos llegan dentro del `<body>`.
- **SEO-8:** el sitemap no escala más allá de unos 1.000 anuncios.

**Estrategia orgánica para Canarias** (detalle en el informe técnico):
1. Abrir la indexación con unos 30–50 anuncios reales.
2. Texto propio por isla: zonas de surf, qué tabla se usa, tiendas y escuelas.
3. Captar vendedores con «vender tabla de surf {isla}».
4. Guías reales revisadas.
5. Fichas de tiendas y escuelas reales.

### Problemas pendientes de código (no bloqueantes)

- **QA-5:** un 404 en la precarga de `/entrar` al cerrar sesión. El navegador recarga y el usuario no lo nota.
- **QA-6:** «Página no encontrada» con código 200 durante unos segundos tras eliminar un anuncio.
- **QA-8:** el recuento del botón va 0,3–0,8 s por detrás.
- **QA-10:** «No tienes acceso» duplicado a veces en `/moderacion`.
- **QA-11:** un anuncio nuevo tarda unos 2 s en salir en `/buscar`.

---

## 4. Funcionalidades

| Funcionalidad | Estado | Probada | Pendiente |
|---|---|---|---|
| Registro / acceso (código por email) | Funciona | Sí [LOCAL], con el email leído del buzón local | Google y Apple programados pero ocultos |
| Recuperación de contraseña | No aplica | — | No hay contraseñas para usuarios (código por email). La administración entra con contraseña por `/entrar?contrasena`, sin recuperación propia: si se pierde, se entra con código. Activar MFA |
| Perfil y cuenta (nombre, borrar cuenta, cerrar sesión) | Funciona | Sí [LOCAL] | — |
| Publicación (5 pasos y fotos) | Funciona | Sí [LOCAL], con medidas «sucias» y 2 fotos | Simplificar la confirmación de medidas (P1) |
| Edición de anuncios | Funcionaba con 2 fallos. **Arreglado** | Sí [LOCAL], con un test que cambia la marca y comprueba las redirecciones | QA-1 («Sin marca» pasaba a «Shaper local») y QA-2 (bucle de redirecciones) cerrados |
| Eliminar / retirar / vendida / volver a publicar | Funciona | Sí [LOCAL] | QA-6 |
| Confirmar disponibilidad (14/30 días) | Funciona | Sí [LOCAL] | Sin recordatorio por email |
| Subida de fotos | Funciona | Sí [LOCAL] | SEC-8 |
| Búsqueda | Funciona | Sí [LOCAL] | — |
| Filtros y orden | Funcionan | Sí [LOCAL], con recuentos comparados con `/buscar` | QA-8 |
| Ficha de producto | Funciona | Sí [LOCAL] | Galería con fotos reales sin revisar (los DEMO no tienen fotos) |
| Contacto (WhatsApp / teléfono) | Funciona | Sí [LOCAL], con un anuncio real: `wa.me` y `tel:`; el contador sube | En producción, la variable `CONTACT_IP_SALT` se añadió ayer; **no verificado en [PROD]** porque no hay anuncios activos |
| Reportar anuncio | Funciona | Sí [LOCAL], sin sesión pide entrar | — |
| Guardadas | Funciona | Sí [LOCAL] | — |
| Alertas | Funciona (solo en el dispositivo) | Parcial [LOCAL] | No envían avisos |
| Comparador | Funciona | Sí [LOCAL], 13 tests e2e | — |
| Calculadora de litros | Funciona | Sí [LOCAL] | — |
| Estados de anuncio (disponible, pendiente, vendida, caducada, retirada) | Funcionan | Sí [LOCAL] | — |
| Navegación y menú | Funciona | Sí [LOCAL], a 375, 768, 1024 y 1440 px | — |
| Diseño adaptable | Funciona | Sí [LOCAL], 5 tamaños | Detalles P3 |
| Formularios y validaciones | Funcionan | Sí [LOCAL], unitarios y e2e | — |
| Errores, carga y estados vacíos | Funcionan | Sí [LOCAL] | QA-6 y QA-10 |
| Permisos (anuncio ajeno, `/admin`, `/moderacion`, rutas privadas) | Funcionan | Sí [LOCAL] y pgTAP | — |
| Moderación y administración | Funcionan | Tests pgTAP y e2e de administración (los e2e de admin no se han ejecutado hoy) | MFA |
| Tiendas y escuelas | Estructura lista, sin tiendas | [LOCAL] | Alta de tiendas |
| Guías y marcas | Contenido orientativo | [LOCAL] | Revisión de contenido |
| Analítica | No existe | — | P1 |
| Emails de alertas y caducidad | No existen | — | P1 |

---

## 5. Cambios realizados (rama `auditoria-final`)

| Archivo(s) | Motivo |
|---|---|
| `src/app/anuncio/[slugId]/page.tsx`, `src/proxy.ts`, `src/lib/data/lookup.ts`, `src/app/vender/actions.ts` | **QA-2:** bucle de redirecciones tras editar. El proxy (caché de 60 s) y la página se redirigían en sentidos opuestos. Ahora el proxy confirma sin caché antes de redirigir, las redirecciones son temporales (307) y la caché se invalida al guardar |
| `src/lib/publish/draft.ts` | **QA-1:** al editar, «Sin marca» se convertía en «Shaper local» |
| `src/components/listing/Contact.tsx` | Contacto en 2 toques; botón «Ver teléfono y WhatsApp»; barra fija «WhatsApp» o «Llamar» |
| `src/components/layout/Header.tsx`, `HeaderClient.tsx`, `Header.module.css`, `Footer.tsx` | Navegación Comprar / Vender y botón «Vender» en el móvil |
| `src/components/layout/CompareTray.tsx` | La barra del comparador, solo donde se eligen tablas |
| `src/app/vender/publicar/page.tsx`, `src/app/globals.css` | Publicar en modo enfocado |
| `src/components/search/Search.module.css` | Búsqueda en tablet |
| `src/components/listing/Ficha.module.css` | Datos técnicos con *container queries*; primera pantalla de la ficha en móvil |
| `src/components/brand/Photo.tsx` | Prioridad de carga de la foto de portada y `alt` explícito |
| `src/app/sitemap.ts`, `src/app/guias/page.tsx` | Sitemap e indexación sin páginas vacías |
| `src/lib/domain/format.ts` y 6 componentes | Litros con coma decimal |
| Unos 20 archivos de textos (`describe.ts`, `compare.ts`, `parse.ts`, `landings.ts`, `guides.ts`, `marcas`, `tiendas`, `vender`, `not-found`…) | Erratas («la grosor», «La A y C tienen», «Tablas, en Canarias», «Quedad»), avisos demo, nombres coherentes y títulos SEO con Canarias |
| `src/components/finder/*`, `src/components/user/islands.tsx` | Detalles de la calculadora y «Comparando» |
| `supabase/migrations/20261029090000_privacy_hardening.sql` | Perfiles, registro de contactos y ajustes |
| `supabase/migrations/20261029090100_reveal_contact_needs_phone.sql` | Contador de contactos correcto |
| `supabase/tests/database/10_privacy_hardening.test.sql`, `03_privacy_social.test.sql` | Tests de las migraciones; test aislado de los datos cargados |
| `tests/e2e/journeys.spec.ts` (nuevo) | Recorridos completos de comprador y vendedor, con edición y comprobación de redirecciones |
| `tests/e2e/flows.spec.ts`, `compare.spec.ts`, `routes.spec.ts`, `tests/e2e-admin/admin.spec.ts`, `tests/integration/contact-moderation.test.ts`, `tests/unit/*` | Tests al día con los cambios; 2 tests obsoletos del modo demo pasan a comprobar el modo real |
| `docs/DECISIONS.md`, `docs/audit/*.png` | Decisiones y capturas |

---

## 6. Pruebas

| Suite | Resultado | Notas |
|---|---|---|
| `npm run typecheck` | ✅ Sin errores | — |
| `npm run lint` | ✅ 0 errores (2 avisos en un test) | — |
| `npm test` (unitarios) | ✅ **312/312** | Incluye 52 casos nuevos de lectura de medidas y el de la marca al editar |
| `npm run test:integration` | ✅ **78/78** | Contra Supabase local |
| `npm run db:test` (pgTAP) | ✅ **225/225** con la base limpia | Con los datos DEMO cargados fallan 24 de 01, 05 y 06; es esperado (esos tests asumen una base vacía) |
| `npm run build` | ✅ | El *timeout* intermitente de `listing_facets` no apareció hoy |
| `npx playwright test --project=e2e` | ⚠️ **89/90** en la última pasada completa (90/90 en la anterior) | Incluye 4 recorridos nuevos de comprador y vendedor. El que falló, «sin errores de hidratación con estado guardado», recibió 6 respuestas 404 al precargar enlaces de `/tablas/evolutiva`; aislado pasa 3 de 3. Causa probable: corre en paralelo con los recorridos que publican y borran anuncios. Pendiente: aislar sus datos (P2) |
| e2e de administración (`test:e2e:admin`) | ⚠️ No ejecutado | Necesita una cuenta de administración local |
| Pruebas visuales (`test:visual`) | ⚠️ No ejecutado | Las capturas de referencia cambiarán con el nuevo diseño |
| Lighthouse | ✅ Medido en [PROD] antes de los arreglos | Hay que medirlo de nuevo tras desplegar |
| Producción después de los cambios | ❌ No verificado | No se ha desplegado |

---

## 7. Roadmap

### P0: bloqueantes para lanzar
1. **Aprobar y desplegar esta rama.**
   - Aplicar las dos migraciones: `supabase db push --dry-run` y después `supabase db push`.
   - Fusionar en `main` (Vercel despliega).
   - Medir Lighthouse otra vez.
   - Depende de tu aprobación.
2. **Comprobar el estado de tu anuncio real** (la Softech da 404) y **publicar 5–10 anuncios reales** antes de invitar gente: con 0 anuncios, la primera visita no encuentra nada.
3. **Textos legales:** completar los marcadores «[Pendiente…]» con un profesional.
4. **MFA (TOTP) en la cuenta de administración**, y `admin_mfa_required = true`.
5. **Copias de seguridad:** confirmar en Supabase qué plan y qué retención hay. **Monitorización mínima** de errores.
6. **Email:** SPF/DMARC del dominio (los códigos de acceso deben llegar a la bandeja de entrada).

### P1: importantes para el lanzamiento
- **Analítica sin cookies:** búsquedas, fichas vistas, contactos y publicaciones.
- **Email de recordatorio antes de caducar** (14/30 días), y decidir el futuro de las alertas: avisos por email o renombrarlas «Guardar búsqueda».
- **Publicar:** una sola casilla «He revisado las medidas» en lugar de 4 «Confirmar»; al editar, abrir en la revisión.
- **SEO-1:** texto propio para cada isla antes de abrir la indexación (`SITE_INDEXABLE`).
- **Contenido:** revisar la guía y las descripciones de marca (quitar «orientativa»).
- **Rendimiento:**
  - PERF-2: una sola tarjeta adaptable;
  - PERF-4: no cargar supabase-js sin sesión;
  - PERF-3: menos pesos de fuente.
- **Seguridad:**
  - SEC-4: comprobar el dominio y la acción en Turnstile;
  - SEC-5: límite de peticiones en `/api/*`;
  - SEC-6: redirigir `reboard-gamma.vercel.app`;
  - SEC-8: no permitir sobrescribir fotos.

### P2: mejoras posteriores
- **SEO:**
  - paginación dentro de las landings (SEO-3);
  - `htmlLimitedBots` para `/buscar` (SEO-4);
  - `OnSitePickup` en `Offer`;
  - caché de imágenes (PERF-7);
  - `listing_facets` en una pasada (PERF-6);
  - sitemap por bloques (SEO-8).
- **Seguridad:** `security.txt`, quitar Unsplash de la CSP, `/sistema` → 404 y permisos explícitos en funciones.
- **Detalles de interfaz:** áreas táctiles del logo y las migas, y estilos de selección unificados en publicar.
- **Fallos menores de QA:** QA-5, QA-6, QA-8, QA-10 y QA-11.

### P3: ideas futuras
- Alta de tiendas y escuelas, con su ficha y `LocalBusiness`.
- Índice de marcas cuando el catálogo esté verificado.
- Guías locales por isla.
- Login con Google y Apple (ya programado).
- Fotos de tiendas propias en lugar de fotos de archivo.

**Dependencias:**
- P0.1 antes de medir nada en producción.
- P0.2 y SEO-1 antes de abrir la indexación.
- P0.6 antes de invitar usuarios (sin email no se puede entrar).

---

## 8. Veredicto de lanzamiento

| Categoría | Nota | Evidencia |
|---|---|---|
| Estado funcional | **8/10** | Comprador y vendedor completos en [LOCAL] (89–90/90 e2e, 78/78 integración). Los 2 fallos de edición, arreglados. Resta: 0 anuncios en producción y contacto sin verificar en [PROD] |
| Calidad UX/UI | **8/10** | 7,5 en la revisión inicial; arreglados los 4 P1 y 7 P2. Quedan la confirmación de medidas, las alertas sin avisos y detalles P3 |
| Experiencia móvil | **8/10** | 0 desbordamientos en 89 combinaciones, contacto en 2 toques, vender visible y ficha con el precio en la primera pantalla. Sin revisar con fotos reales |
| SEO | **6/10** | Base técnica sólida (canonical, JSON-LD, sitemap, 404/redirecciones), pero indexación cerrada, landings casi iguales y sin contenido editorial revisado |
| Rendimiento | **7/10** | Lighthouse móvil 74–95 (CLS ≈ 0, TBT 143–454 ms); LCP de la portada 4,2 s antes del arreglo, sin medir después. Peso: 741 KiB |
| Seguridad | **7/10** | RLS sólida (225 tests), Server Actions correctas, cabeceras y secretos bien. Las mejoras de privacidad aún no están en producción; falta MFA de administración |
| Preparación para producción | **6/10** | Falta desplegar la rama y las migraciones, textos legales, copias de seguridad y monitorización, y no hay anuncios activos |

### ¿Está Reboard.es preparada para recibir sus primeros 100 usuarios?

**SÍ CON CONDICIONES.**

El producto funciona de principio a fin. Buscar, ver una ficha, contactar por WhatsApp y publicar desde el móvil se han probado como lo haría una persona real, y la experiencia está cuidada.

Las condiciones son las seis del P0:
1. Desplegar esta rama con sus migraciones.
2. Tener anuncios reales publicados antes de invitar a nadie.
3. Completar los textos legales.
4. MFA en la cuenta de administración.
5. Copias de seguridad y monitorización.
6. Email del dominio bien configurado.

Ninguna es de programación compleja: son decisiones y configuración. Para 100 usuarios no hace falta abrir la indexación; conviene esperar a tener inventario y texto propio por isla.
