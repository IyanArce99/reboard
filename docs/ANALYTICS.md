# Analítica de producto

**Estado:** implementado en la rama `auditoria-final` y **sin desplegar**. No hace nada hasta que exista `NEXT_PUBLIC_POSTHOG_KEY` en Vercel.

## 1. Herramienta elegida y por qué

**PostHog Cloud EU, en modo sin cookies** (`cookieless_mode: "always"`), cargado por el dominio propio.

| Criterio | Qué hay (comprobado el 24-10-2026) |
|---|---|
| Embudos y eventos propios | Embudos, tendencias, desgloses por propiedad y Web Analytics con UTM y referentes. Es lo que se pide: adquisición de vendedores, abandono al publicar y uso del buscador, TablaFinder, comparador y contacto |
| Datos en la UE | Proyecto en PostHog Cloud **EU** (`eu.i.posthog.com`) |
| Sin cookies | `cookieless_mode: "always"`: no guarda nada en el navegador. El identificador lo calcula PostHog en su servidor con el id del proyecto, una **sal diaria que borra**, la IP, el navegador y el dominio. Requiere activar en el proyecto **«Cookieless server hash mode»**; sin ese ajuste, los eventos se ignoran |
| Coste | **Gratis hasta 1 millón de eventos al mes**, sin tarjeta, 1 proyecto y **1 año de conservación**. Por encima, desde 0,00005 $ por evento. Con el tráfico previsto (cientos o pocos miles de visitas al mes) no se acerca al límite |
| Dependencias | Una: `posthog-js` **1.438.2**, versión fijada y publicada el 07-10-2026 (más de dos semanas antes de añadirla). Se carga **cuando el navegador está libre**, no compite con la página |

**Alternativas descartadas:**
- **Vercel Web Analytics:** solo páginas vistas y algún evento en planes de pago; sin embudos propios.
- **Plausible o Umami:** muy buenos para tráfico y UTM, pero los embudos de varios pasos con propiedades son limitados.
- **Google Analytics 4:** necesita consentimiento y cede datos a Google (no entra en la exención de la AEPD).

**Limitaciones del modo sin cookies (asumidas):**
- La misma persona es «otra» cada día. Los embudos funcionan dentro del mismo día, y es lo que necesitamos: publicar y contactar se hacen en una sesión.
- No se puede identificar al usuario (`identify`), y no se hace: `person_profiles: "never"`.
- Los «usuarios únicos» son aproximados: por día, IP y navegador.

## 2. Privacidad y requisitos en España

Referencia: **AEPD, «Guía sobre el uso de cookies para herramientas de medición de audiencia» (enero de 2024)**, y el artículo 22.2 de la LSSI. La medición de audiencia puede estar **exenta de consentimiento** si:

| Requisito de la AEPD | Cómo se cumple aquí |
|---|---|
| Finalidad limitada a medir la audiencia del propio sitio | Solo eventos de uso de reboard.es; sin publicidad ni perfiles |
| En nombre exclusivo del editor; sin cruzar datos ni cederlos | PostHog como encargado. **Pendiente:** firmar su DPA (contrato del art. 28 RGPD, con el compromiso de no reutilizar los datos) |
| Datos estadísticos anónimos; sin seguimiento entre sitios | Identificador diario no reversible; sin cookies ni ids entre sitios; IP descartada (ajuste «Discard client IP data») |
| Informar al usuario | Privacidad y Cookies actualizadas (`src/lib/content/legal.ts`), **pendientes de revisión legal** |
| Conservación ≤ 25 meses | 12 meses (plan gratuito). **Si se pasa a un plan de pago, fijar la retención a ≤ 25 meses** |
| Transferencias fuera de la UE conforme al RGPD | Región EU. **Pendiente:** confirmar subencargados en el DPA |

**Riesgo residual (para el asesor legal).** Las Directrices 2/2023 del CEPD sobre el alcance del art. 5.3 de la Directiva ePrivacy interpretan de forma amplia el «acceso al terminal», lo que puede incluir leer datos del navegador por JavaScript. La AEPD sí admite la exención con las condiciones de arriba. Además, la lista de mediciones «estrictamente necesarias» de la AEPD habla de estadísticas por página agregadas a diario, y los embudos van algo más allá. **Decisión pendiente del titular con su asesor:**
- **(a) Tal cual:** medición exenta y sin banner. Es lo implementado.
- **(b) Con consentimiento:** cambiar `cookieless_mode` y añadir un banner. La arquitectura lo permite sin tocar los eventos.

**Además:** con «No rastrear» o Global Privacy Control activados en el navegador no se mide nada (`track.ts`).

## 3. Qué se envía y qué no

**Nunca se envía:**
- nombres, emails, teléfonos, localidades ni direcciones;
- ids de usuario o de anuncio;
- texto libre: descripción, reparaciones, marca escrita a mano o mensajes;
- el peso, el nivel o las olas de TablaFinder;
- el precio exacto (va en tramos).

**Cómo se garantiza:**
- **Catálogo tipado** (`src/lib/analytics/events.ts`): cada evento solo admite sus propiedades.
- **`cleanProps`:** descarta claves sensibles aunque alguien las añada por error (`email`, `phone`, `*_name`, `*_id`, `town`, `query`, `weight`, `level`, `ip`…), deja solo valores primitivos y recorta los textos a 40 caracteres.
- **`before_send`:**
  - `$current_url` queda en origen + ruta + UTM (fuera `?editar=`, `?siguiente=`, filtros, `gclid` y `fbclid`);
  - `$referrer` queda solo en el dominio de origen;
  - se descartan los eventos de rutas privadas.
- **Rutas sin medición:** `/admin`, `/moderacion`, `/auth`, `/cuenta`, `/panel` y `/sistema`.
- **Todo lo invasivo, apagado:** autocapture, grabación de sesiones, mapas de calor, clics muertos, *rage clicks*, rendimiento, excepciones, encuestas, experimentos, *product tours* y feature flags. Tampoco se cargan scripts externos (`disable_external_dependency_loading`).

## 4. Arquitectura

- **`src/lib/analytics/events.ts`:** catálogo de eventos y propiedades, tramos, saneado de URLs y limpieza de propiedades. Es puro y tiene tests unitarios.
- **`src/lib/analytics/track.ts`:** la única puerta de entrada. `track(event, props)` y `trackOnce(clave, event, props)`.
  - Sin clave, con «No rastrear», con un bloqueador o sin red: no hace nada y **nunca lanza**.
  - Hasta que PostHog carga, los eventos esperan en una cola de 50 como máximo.
  - En **modo depuración** (`NEXT_PUBLIC_ANALYTICS_DEBUG=1`) no envía nada: guarda los eventos en `window.__rbAnalytics` y los muestra en la consola.
- **`src/components/analytics/AnalyticsInit.tsx`** (en el layout): arranca PostHog cuando el navegador está libre y manda **una página vista por ruta**. Los cambios de filtros en `/buscar` no son páginas nuevas.
- **`src/components/analytics/TrackOnMount.tsx`:** eventos desde Server Components (ficha y resultados), una vez por clave.
- **`src/app/rb-e/[...path]/route.ts`:** proxy propio hacia `eu.i.posthog.com`.
  - Va por el dominio de la web, así que los bloqueadores no lo cortan por el dominio de PostHog.
  - Solo deja pasar las rutas de envío de eventos y reenvía la IP real del cliente y el navegador, que el identificador diario necesita.
  - Nunca reenvía las cookies de la web.
  - Sin clave configurada responde 404.

**Duplicados:**
- **Página vista:** una por ruta; una recarga es una visita nueva, que es lo correcto.
- **`listing_viewed`, `search_performed`, `compare_viewed`, `finder_completed` y `publish_started`:** una vez por clave y pestaña (`trackOnce`). No se repiten con el doble render de React ni al volver atrás.
- **`publish_step_completed`:** una vez por paso, aunque se vuelva a revisar.
- **`publish_completed`:** solo en la rama en la que el **servidor ha respondido OK** a guardar y publicar (`PublishFlow.publish`). Nunca al pintar la pantalla de «publicada», así que una recarga no lo repite.

## 5. Eventos

| Evento | Cuándo | Propiedades |
|---|---|---|
| `$pageview` | Cada ruta nueva | Las de PostHog (URL saneada, referente con solo el dominio, UTM, dispositivo, navegador) |
| `search_performed` | Resultados pintados en `/buscar` o en una landing (una vez por filtros + orden) | `source` (buscar/landing), `island`, `shapes[]`, `constructions[]`, `has_volume`, `has_length`, `has_price`, `has_brand`, `sort`, `results` (tramo: 0, 1-5, 6-20, 21-50, 50+) |
| `listing_viewed` | Ficha abierta | `shape`, `construction`, `island`, `price_band`, `seller_type`, `photos`, `available` |
| `contact_opened` | «Contactar» (ficha o barra móvil) | `method`, `surface` (ficha/barra_movil), `shape`, `island`, `price_band` |
| `contact_revealed` | El servidor devuelve el teléfono | `method` |
| `contact_email_opened` | «Enviar mensaje al vendedor» (ficha o barra móvil) | `surface`, `shape`, `island`, `price_band` |
| `contact_email_submitted` | El comprador envía el formulario | — |
| `contact_email_sent` | **Solo** cuando el servidor de correo ha aceptado el mensaje | — |
| `contact_email_failed` | Error de validación, límite, anuncio no disponible o fallo del envío | `reason` |
| `contact_link_clicked` | «Abrir WhatsApp» o «Llamar» | `channel` (whatsapp/llamada) |
| `listing_saved` | Guardar una tabla | — |
| `alert_created` | Crear una alerta | — |
| `finder_started` | Primer «Continuar» de TablaFinder | — |
| `finder_completed` | Resultado de TablaFinder con el inventario cargado | `types[]` (tipos recomendados), `results` (tramo) |
| `compare_added` | Añadir una tabla al comparador | `count` |
| `compare_viewed` | `/comparar` con tablas | `count`, `shared` |
| `compare_shared` | «Compartir comparación» | `count` |
| `publish_started` | Abrir publicar (anuncio nuevo) | — |
| `publish_step_completed` | Pasar un paso de 1 a 4 | `step`, `mode` (nuevo/editar) |
| `publish_submitted` | Enviar el anuncio al servidor | `mode` |
| `publish_failed` | El envío falla | `mode`, `reason` (datos, captcha, sesión, fotos, red o servidor) |
| `publish_completed` | **Solo con el OK del servidor** | `mode`, `shape`, `construction`, `island`, `price_band`, `photos`, `has_volume`, `brand_known` |
| `login_completed` | Acceso con código completado | `context` (entrar/publicar) |

No se mide cada clic: solo lo que responde a una pregunta de producto, como en qué paso se abandona, si el contacto convierte o si el buscador devuelve 0 resultados.

## 6. Configuración (titular, en PostHog y en Vercel)

1. **Crear el proyecto** en **PostHog Cloud EU** (`eu.posthog.com`). Nombre: Reboard; zona horaria: Atlantic/Canary.
2. **Project settings:**
   - **Web analytics → Cookieless server hash mode: activado.** Sin esto, los eventos se descartan.
   - **Discard client IP data: activado.**
   - **Session replay: desactivado.**
   - **Autocapture: desactivado** (también se desactiva desde el código; por si acaso).
   - Conservación de datos: la del plan gratuito, 1 año. Si cambia de plan, ≤ 25 meses.
3. **Organización → Legal:** **firmar el DPA** de PostHog y guardar la copia.
4. **Vercel → Environment Variables → Production:** `NEXT_PUBLIC_POSTHOG_KEY` = la *Project API key* (`phc_…`).
   - Es pública: va en el navegador.
   - No la pongas en Preview, para que las pruebas no ensucien los datos.
   - **Nunca** pongas aquí la *Personal API key*.
5. **Desplegar** (con tu autorización) y comprobar que en **PostHog → Activity** llegan `$pageview` y los eventos de la tabla.
6. **Antes de activar:** que el asesor revise el punto 2 y los textos de Privacidad y Cookies.

## 7. Pruebas realizadas (local)

| Prueba | Resultado |
|---|---|
| `tests/unit/analytics.test.ts` | 5/5: saneado de URL y referente, propiedades sensibles fuera (también las que se añaden por error), claves legítimas como `context` dentro, tramos y rutas privadas |
| Recorridos e2e con un build en modo depuración (`NEXT_PUBLIC_ANALYTICS_DEBUG=1`) | 4/4 en escritorio y móvil. **Comprador:** `$pageview`, `search_performed` (tenerife, fish, con litros, 1-5 resultados), `listing_viewed` una sola vez, `listing_saved`, `compare_added` (2), `compare_viewed` y `contact_opened` con su superficie. **Vendedor:** `publish_started`, los 4 `publish_step_completed` (exactamente 4), `publish_submitted`, `login_completed (publicar)` y **un único** `publish_completed` tras el OK del servidor |
| Ningún dato personal | En el recorrido del vendedor se comprueba que ningún evento contiene su email, su teléfono (en tres formatos), su nombre ni su localidad |
| Sin efecto en la app | La suite e2e completa pasa con la analítica en modo depuración (86 + 4) y sin ella (90/90): publicar, contactar y navegar funcionan igual |
| Proxy `/rb-e` | Una ruta no permitida da 404. Un envío con barra final (`/i/v0/e/`) pasa por una redirección y llega a PostHog EU, que responde `{"status":"Ok"}`. Probado con una clave inventada, sin ningún proyecto real |
| Sin clave (como está hoy) | No se descarga `posthog-js` y el proxy responde 404 |
| **No verificado** | La llegada a un proyecto real de PostHog, el hash sin cookies en producción y la IP reenviada desde Vercel. Se comprueba en el paso 5 de la configuración |

## 8. Dashboard propuesto (PostHog)

**1. Adquisición**
- Visitas al día (`$pageview`, usuarios únicos diarios).
- Visitas por `utm_source` / `utm_campaign` y por dominio de referencia (Google, Instagram, WhatsApp…).
- Páginas de entrada más vistas: portada, landings de isla y fichas.
- **Vendedores por canal:** embudo `$pageview` (con `utm_source` o referente) → `publish_completed`, desglosado por `utm_source`. Funciona dentro del mismo día; avisar en las campañas de que el clic y la publicación suelen ir juntos.

**2. Publicación**
- Embudo: `publish_started` → `publish_step_completed` (pasos 1, 2, 3 y 4) → `publish_submitted` → `login_completed (publicar)` → `publish_completed`, con la conversión de cada paso y el abandono.
- `publish_failed` por `reason`, para saber qué arreglar primero.
- `publish_completed` por `island`, `shape`, `price_band` y `has_volume`: qué se publica y si se ponen los litros.

**3. Compradores y contacto**
- Embudo: `listing_viewed` → `contact_opened` → `contact_revealed` → `contact_link_clicked`, desglosado por `surface` y `channel`.
- Contactos por `island` y `shape`, y conversión ficha → contacto por `price_band`.
- `search_performed` con `results = 0` frente al total: demanda sin oferta, por isla y tipo, que sirve para captar vendedores.
- Uso de herramientas: `finder_started` → `finder_completed`; `compare_added`, `compare_viewed` y `compare_shared`; `listing_saved` y `alert_created`.

**Alertas útiles:** caída de `publish_completed` a 0 en 48 h y un aumento de `publish_failed`.
