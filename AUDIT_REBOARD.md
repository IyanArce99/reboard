# Auditoría final de Reboard (24-10-2026)

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
