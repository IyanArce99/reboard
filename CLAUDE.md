@AGENTS.md

# CLAUDE.md — Reboard

## Producto
Reboard es un **marketplace especializado en compraventa de tablas de surf de segunda mano** en España. Su tagline es «Tu próxima tabla ya existe».
- Lo prioritario es encontrar una tabla por **litros, medidas, tipo, precio y ubicación (cerca de mí)**, y publicar con muy poca fricción.
- **Móvil primero.** Experiencia simple, moderna y rápida.
- **El SEO es prioritario** para el tráfico orgánico (ver `docs/SEO.md`).
- No hay pagos, envíos, chat propio ni comisión. El contacto es directo por WhatsApp o teléfono.

## Fuente de verdad del diseño
- `design/prototype/Reboard.dc.html` es el **diseño aprobado** (Atlantic Blue, home variante A). Ábrelo con un servidor estático (ver README) y recórrelo antes de implementar una pantalla.
- Los estilos están inline en ese archivo y en `Tarjeta Atlantic.dc.html` y `Logo Reboard.dc.html`. **Copia valores exactos** (colores, tamaños, radios, espaciados) desde ahí o desde `src/styles/tokens.css`.
- La lógica de referencia (filtros, recomendador, estados) está en `design/source/prototype-logic.js`. Los datos simulados están en `design/source/mock-data.js`.
- **No modifiques arbitrariamente el diseño aprobado.** Si algo no encaja técnicamente, propón el cambio y documéntalo.

## Directrices técnicas
- **Next.js App Router + TypeScript.** Server Components por defecto. `"use client"` solo en las islas interactivas: buscador, hoja de filtros, asistente, galería, comparador, guardar, formulario de publicar.
- Las páginas indexables (`/`, `/tablas/*`, `/anuncio/*`, `/marcas/*`, `/calculadora-litros`, `/guias/*`, `/tiendas/*`) se renderizan en servidor con `generateMetadata`.
- El estado de los filtros vive en la URL (`searchParams`) para que sea enlazable. `/buscar` lleva `noindex` (ver SEO.md).
- Fuentes con `next/font/google`: Barlow, Barlow Condensed e IBM Plex Mono. Imágenes con `next/image`.
- Componentes reutilizables y pequeños, y **pocas dependencias**: nada de librerías de UI pesadas sin justificarlo.
- **Accesibilidad:**
  - Áreas táctiles de 44 px como mínimo y foco visible (2 px #087E8B).
  - Contraste AA: usa #4A6670 para texto secundario sobre claro, no #617C82 en tamaños pequeños.
  - `aria-checked` en las tarjetas de opción del asistente.
- Responsive: punto de corte móvil < 760 px; la cabecera pasa a móvil < 1024 px (ver DESIGN_SYSTEM.md).

## Directrices de desarrollo
- Revisa el código existente antes de crear componentes nuevos, y reutiliza tokens y componentes.
- **Diferencia siempre los datos simulados de los reales.**
  - Los fixtures van en `/mocks` o `/fixtures`, marcados como demo.
  - Nunca se muestran en producción como si fueran anuncios reales.
  - Nunca inventes litros, valoraciones, estadísticas ni disponibilidad.
- **No inventes integraciones de backend.**
  - Si falta un servicio externo (SMS, emails de alertas…), crea una interfaz y un stub claramente marcado.
  - Documéntalo en `docs/ROADMAP.md`.
  - **No declares una integración completa si no la has probado de verdad** (en local con Supabase/Mailpit, o en remoto).
- Respeta la taxonomía:
  - `shape`: shortboard | fish | hibrida | evolutiva | midlength | longboard | gun.
  - `construction`: pu | epoxy | softboard.
  - «Principiantes» es una necesidad, no una forma.
- El origen de cada dato técnico es obligatorio en el modelo: `'seller' | 'manufacturer' | null`.
- Nombres: componentes en PascalCase (`ListingCard`, `SearchBar`, `FinderStep`), rutas y slugs en kebab-case y en español, como en la arquitectura aprobada.
- Documenta las decisiones importantes en `docs/` (registro en `docs/DECISIONS.md`).

## Componentes clave (ver docs/PAGES.md y DESIGN_SYSTEM.md)
Header, MobileMenu (panel lateral), SearchBar (segmentos Ubicación / Litros / Tipo / Filtros + CTA amarillo), SearchSheet, FilterPanel (lateral en desktop, pantalla completa en móvil), ListingCard (vertical/horizontal), AvailabilityDot, ProBadge, FitBadge («Te encaja»), CompareTray, Gallery, SpecTable (con origen del dato), ContactBar (fija abajo en la ficha móvil), FinderWizard + FinderStep + OptionCard, FinderResult, AlertCard, EmptyState, Breadcrumbs, Footer, Logo.

## Reglas de color (resumen)
- Petróleo #102D3B: estructura y títulos.
- Turquesa #087E8B: seleccionado y activo; para enlaces de texto, #07717C.
- **El amarillo #F4C15A es solo para la acción principal** (Buscar, Contactar, Publicar, Vender gratis, Continuar). No hay etiquetas amarillas.
- Fondo #EFF6F5; tarjetas y formularios blancos.

## Backend (fases B–G, ver docs/ARCHITECTURE.md, SECURITY.md y DECISIONS.md)
- **Supabase:** Postgres, Auth y Storage. Un solo proyecto `reboard`, en la UE.
  - Las migraciones en `supabase/migrations` son la fuente de verdad del esquema. Nunca edites una ya aplicada: crea otra nueva.
  - Los tests de seguridad pgTAP están en `supabase/tests/database`.
- **Fuente de datos (`src/lib/data`):**
  - el código de las páginas usa `getRepository()` y nunca sabe de dónde vienen los datos;
  - con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Supabase; sin ellas, un repositorio vacío (interfaz vacía y noindex);
  - **la app no trae datos simulados**: el inventario DEMO es un fixture de tests (`tests/fixtures`);
  - las cuentas solo existen con Supabase (`authEnabled()`).
- **Seguridad:**
  - Cada Server Action vuelve a comprobar la sesión con `auth.getUser()` (nunca `getSession()`) y valida la entrada con zod.
  - **Service role** (`createServiceClient`) solo en el servidor y solo después de comprobar CAPTCHA, sesión y rol.
  - **Turnstile** se verifica en el servidor (`verifyTurnstile`, falla cerrado).
  - **No exportes desde un archivo `"use server"` nada que no sea una acción:** todo lo que exporta es invocable desde el cliente.
- **Caché:**
  - lecturas con `'use cache'` + `cacheTag('listings' | 'listing:{id}' | 'catalog' | 'shops')`;
  - tras escribir: `updateTag` en las acciones y `revalidateTag(tag, 'max')` en las rutas.
- **Sesión:**
  - el cliente del navegador hace el acceso;
  - `proxy.ts` refresca la sesión solo en rutas privadas (`/cuenta`, `/panel`, `/entrar`, `/vender/publicar`, `/moderacion`);
  - los Server Components de páginas públicas no leen cookies.
- **Fotos de anuncios:**
  - se recodifican en el navegador (`src/lib/publish/image.ts`) y se suben directamente a Storage;
  - el servidor solo comprueba las rutas y que el archivo existe.
- **Fotografía editorial** (`src/lib/photos.ts`, Pexels):
  - solo en páginas editoriales;
  - nunca como foto de un anuncio, una marca o un modelo.
- **Comprueba antes de dar algo por hecho:**
  - `npm run typecheck`, `npm run lint` y `npm test`;
  - con Supabase local: `npm run db:test` y `npm run test:integration`;
  - `npm run build`;
  - e2e y visuales: necesitan datos, así que se ejecutan contra Supabase local cargado con `scripts/seed-local-demo.mts` (desactivados en CI hasta configurar Supabase).
