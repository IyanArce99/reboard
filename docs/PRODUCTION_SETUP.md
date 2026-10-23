# Puesta en producción: Supabase, Vercel, Turnstile y Resend

Guía paso a paso para abrir la publicación en la web pública. La marca 🧑 indica lo que tienes que hacer tú (cuentas, pagos, DNS, secretos); 🤖, lo que puedo hacer yo cuando me lo pidas.

**Reglas de esta guía:**
- **Los secretos no se pegan en el chat ni en el repositorio.** Van directamente en el panel de Vercel, de Supabase o en tu gestor de contraseñas.
- **No se copian datos de prueba a producción.** Solo se aplican las migraciones: el esquema, las 9 zonas y las 30 marcas de referencia, que son solo nombres.
- **El lanzamiento no está terminado** hasta que una persona publique, edite y elimine una tabla real en la URL pública (paso 9).

URL pública actual: `https://reboard-gamma.vercel.app`. Si vas a usar `reboard.es`, sustitúyela en los pasos 3, 5 y 6.

---

## 0. Requisito previo: un dominio para los correos 🧑

El acceso es por **código de 6 cifras enviado por email**. Para que le llegue a cualquier persona hace falta enviarlo desde un dominio propio verificado en Resend:
- **Resend sin dominio** solo envía a tu propio email.
- **El SMTP por defecto de Supabase** solo envía a los miembros de tu organización y tiene límites muy bajos.

Sin dominio propio, nadie más podrá entrar ni publicar.

- Necesitas un dominio (por ejemplo, `reboard.es`) con acceso a su DNS.
- No hace falta que la web esté ya en ese dominio: basta con usarlo para enviar los correos.

## 1. Proyecto Supabase 🧑

1. En https://supabase.com/dashboard, pulsa **New project**:
   - nombre `reboard`;
   - región **Central EU (Frankfurt)** (`eu-central-1`);
   - una contraseña de base de datos larga, guardada en tu gestor de contraseñas.
2. **Plan:** el gratuito **pausa el proyecto tras 7 días sin actividad** y no tiene copias diarias. Para un marketplace abierto, valora **Pro**. Decisión tuya.
3. En **Project Settings → API Keys**, anota en tu gestor:
   - **Project URL** (`https://<ref>.supabase.co`) y el **ref** del proyecto;
   - la clave **publishable** (o *anon*). Es pública y va bajo RLS;
   - la clave **secret** (o *service_role*). Es **secreta**: solo para Vercel.

## 2. Migraciones, RLS y Storage

> **Hecho (23-10-2026):** proyecto `ogatmhplmnfetcgdtdge` (eu-west-1). Las 15 migraciones están aplicadas y los 185 tests pgTAP pasan contra producción. La conexión se hizo con `.env.remote`, que no se versiona ni lo lee la app. El primer admin es `iyiarce@gmail.com` (ver `docs/ADMIN.md`).

Las migraciones de `supabase/migrations` crean todo:
- las tablas, con RLS en todas;
- las funciones de búsqueda y caducidad;
- el bucket `listing-photos` con sus políticas;
- las 9 zonas y las 30 marcas de referencia.

No llevan anuncios, tiendas ni modelos.

1. 🧑 En el prompt de Claude Code, para que se abra tu navegador:
   ```
   ! npx supabase login
   ! npx supabase link --project-ref <ref>
   ```
   El segundo comando te pide la contraseña de la base de datos: escríbela tú en la terminal, no en el chat.
2. 🤖 `npx supabase db push --dry-run`. Te enseño la lista de migraciones que se aplicarán. Son todas aditivas; ninguna borra datos.
3. 🤖 Con tu visto bueno, `npx supabase db push`.
4. 🤖 `npx supabase test db --linked`: los 130 tests de seguridad pgTAP (RLS, privilegios, Storage, búsqueda) contra el remoto. Se ejecutan dentro de transacciones que se deshacen, así que **no dejan datos**. Solo antes de abrir al público.
5. 🧑 Comprueba en **Storage** que existe `listing-photos`: público, límite de tamaño y solo imágenes.

## 3. Autenticación por email 🧑 (o 🤖 si me das acceso)

En **Authentication** del proyecto:

| Sección | Valor |
|---|---|
| **URL Configuration → Site URL** | `https://reboard-gamma.vercel.app` |
| **URL Configuration → Redirect URLs** | `https://reboard-gamma.vercel.app/auth/confirm` |
| **Sign In / Providers → Email** | activado; *Confirm email* activado; **Email OTP length** `6`; **Email OTP expiration** `900` s |
| **Email Templates → Magic Link** y **Confirm signup** | asunto «Tu código de Reboard» y, como cuerpo, el contenido de `supabase/templates/codigo.html` (usa `{{ .Token }}`) |
| **Rate Limits** | emails por hora: unos 30 (tras configurar el SMTP del paso 5) |
| **Attack Protection → CAPTCHA** | activado, proveedor **Turnstile**, con la *secret key* del paso 4 |
| **Moderador inicial** (SQL Editor, cuando hayas entrado una vez) | `update public.profiles set role = 'admin' where id = '<tu uuid de Authentication → Users>';` |

## 3b. Entrar con Google y con Apple 🧑

Opcional. Los botones solo aparecen cuando el proveedor está activado en Supabase **y** está en `NEXT_PUBLIC_AUTH_PROVIDERS` (Vercel). Si un proveedor se pone en Vercel sin activarlo antes en Supabase, el botón lleva a una página de error de Supabase.

Datos de este proyecto:
- **Callback de Supabase** (lo piden Google y Apple): `https://ogatmhplmnfetcgdtdge.supabase.co/auth/v1/callback`.
- **Vuelta a la web:** `/auth/confirm` (la misma ruta que los enlaces del correo).

### Supabase, antes que nada

En **Authentication → URL Configuration → Redirect URLs**, añade:
- `https://reboard-gamma.vercel.app/auth/confirm**`;
- y, cuando tengas dominio, `https://reboard.es/auth/confirm**`.

El `**` hace falta porque la vuelta lleva `?siguiente=…`.

### Google

1. En https://console.cloud.google.com, crea un proyecto `Reboard`.
2. En **APIs y servicios → Pantalla de consentimiento de OAuth** (Google Auth Platform):
   - tipo **Externo**;
   - nombre `Reboard` y correo de asistencia;
   - dominios autorizados: `supabase.co` y, cuando lo tengas, tu dominio;
   - permisos: `openid`, `email` y `profile` (los básicos, sin revisión de Google);
   - **Publica la app** (de «Prueba» a «En producción»). En «Prueba» solo entran los usuarios de prueba.
3. En **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - tipo **Aplicación web**;
   - orígenes de JavaScript autorizados: `https://reboard-gamma.vercel.app`;
   - URI de redireccionamiento autorizados: el **callback de Supabase** de arriba.
4. Copia el **ID de cliente** y el **secreto del cliente**. El secreto es **secreto**: va solo en Supabase.
5. En **Supabase → Authentication → Sign In / Providers → Google**, actívalo y pega el ID y el secreto.

### Apple (necesita la cuenta de Apple Developer de pago)

En https://developer.apple.com/account, ve a **Certificates, Identifiers & Profiles**:

1. **Identifiers → App IDs → +** (si no tienes uno):
   - descripción `Reboard`;
   - Bundle ID `es.reboard.app`;
   - marca **Sign in with Apple**.
2. **Identifiers → Services IDs → +**. Es el «Client ID» de la web:
   - descripción `Reboard web`;
   - identificador `es.reboard.web`.
3. Abre ese Services ID, marca **Sign in with Apple → Configure**:
   - Primary App ID: el del paso 1;
   - **Domains**: `ogatmhplmnfetcgdtdge.supabase.co`;
   - **Return URLs**: el callback de Supabase.
4. **Keys → +**: marca **Sign in with Apple**, asocia el App ID y descarga el `.p8`.
   - Solo se descarga una vez: guárdalo en tu gestor de contraseñas.
   - Anota el **Key ID** y tu **Team ID** (arriba a la derecha).
5. En **Supabase → Authentication → Sign In / Providers → Apple**, actívalo:
   - **Client IDs:** `es.reboard.web`;
   - **Secret Key:** la que se genera a partir del `.p8`, el Key ID, el Team ID y el Services ID. Supabase enlaza un generador en ese mismo formulario; el `.p8` no sale de tu navegador.
6. ⚠️ **Esa clave caduca a los 6 meses como máximo** (límite de Apple). Pon un recordatorio para generarla de nuevo; si caduca, el botón de Apple deja de funcionar, pero el resto de accesos siguen.
7. **Ocultar mi email:** quien lo elija entra con una dirección `@privaterelay.appleid.com`.
   - Para que le lleguen correos de Reboard, registra el dominio de envío (el de Resend) en **Services → Sign in with Apple for Email Communication**.
   - Para entrar no le hace falta: entra con Apple.

### Activar los botones

En Vercel, añade `NEXT_PUBLIC_AUTH_PROVIDERS` (Production) con el valor `google`, `apple` o `google,apple`, según lo que hayas activado, y vuelve a desplegar: es una variable `NEXT_PUBLIC_*`, se fija al compilar.

Para comprobarlo:
1. En `/entrar`, «Continuar con Google» te lleva a Google y vuelve a `/cuenta` con la sesión iniciada.
2. El perfil empieza con tu nombre de pila, no con «Surfista».
3. Lo mismo con Apple.
4. Si cancelas en la pantalla del proveedor, vuelves a `/entrar` con el aviso «No se ha podido entrar con esa cuenta».

**Mismo email por dos vías:** si alguien entró antes con código y luego entra con Google usando el mismo email (verificado), Supabase enlaza las dos identidades en la **misma cuenta**. No se duplican anuncios ni guardadas.

## 4. Cloudflare Turnstile 🧑

1. En https://dash.cloudflare.com, ve a **Turnstile → Add widget**:
   - nombre `Reboard`;
   - hostnames `reboard-gamma.vercel.app` (y `reboard.es` si lo usarás);
   - modo **Managed**.
2. Anota la **site key** (pública) y la **secret key** (secreta).
3. La *secret key* va en dos sitios:
   - en Vercel (`TURNSTILE_SECRET_KEY`), donde la app comprueba el token al publicar y al revelar el contacto;
   - en Supabase (paso 3, CAPTCHA), donde Supabase lo comprueba al pedir el código.

## 5. Resend (envío de los correos) 🧑

1. Crea una cuenta en https://resend.com y ve a **Domains → Add domain**:
   - usa tu dominio, idealmente en la región UE;
   - añade en tu DNS los registros que te indique (SPF y DKIM; DMARC recomendado);
   - espera a que el dominio aparezca como **Verified**.
2. En **API Keys → Create**, crea una clave con permiso *Sending access*, limitada a ese dominio. Es **secreta**.
3. En **Supabase, Authentication → Emails → SMTP Settings**, activa *Custom SMTP*:
   - host `smtp.resend.com`, puerto `465`, usuario `resend`;
   - contraseña: la API key;
   - remitente `no-responder@<tu-dominio>`, con nombre `Reboard`.
4. Pruébalo: pide un código en `/entrar` con tu email y comprueba que llega, y que no cae en spam.

## 6. Variables de entorno en Vercel 🧑

En **Project → Settings → Environment Variables**, marca **solo Production**. Los Preview se quedan sin base de datos y muestran la interfaz vacía.

| Variable | Valor | Tipo |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://reboard-gamma.vercel.app` | pública |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave publishable o anon | pública (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | clave secret o service_role | **secreta** |
| `CONTACT_IP_SALT` | cadena aleatoria de 64 caracteres (`openssl rand -hex 32`) | **secreta** |
| `CRON_SECRET` | otra cadena aleatoria de 64 caracteres | **secreta** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key | pública |
| `TURNSTILE_SECRET_KEY` | secret key | **secreta** |
| `SITE_INDEXABLE` | `false` hasta tener el dominio definitivo y los textos legales revisados | — |

- **Borra `REBOARD_DATA_SOURCE` si existe:** ya no se usa.
- **Install Command:** `npx -y npm@11.6.2 ci` (ver `LAUNCH_CHECKLIST.md`).
- **Despliegue:** después, **Deployments → Redeploy** del último despliegue de `main`. Las variables `NEXT_PUBLIC_*` se fijan al compilar.
- **Región de las funciones:** hecho. El proyecto Supabase está en Irlanda (`eu-west-1`), así que `vercel.json` fija `"regions": ["dub1"]` (Dublín).

## 7. Antes de abrir al público 🧑

- **Textos legales:** `src/lib/content/legal.ts` tiene marcadores (`[NOMBRE…]`, `[EMAIL DE CONTACTO]`). El RGPD exige identificar al responsable y ofrecer un contacto. Deben revisarlos y completarlos un profesional y tú.
- **Indexación:** con el dominio definitivo y los textos legales listos, pon `SITE_INDEXABLE=true` y vuelve a desplegar.

## 8. Comprobación técnica tras el despliegue 🤖

- La home ya no dice «La publicación todavía no está abierta». `/entrar` muestra el formulario con el CAPTCHA invisible.
- `curl -I` muestra CSP, HSTS, X-Frame-Options y nosniff.
- El cron `/api/cron/expirar` aparece en **Settings → Cron Jobs**.

## 9. Prueba real en la URL pública (🧑 + 🤖), en escritorio y en móvil

El código de acceso llega a **tu** email. Yo no puedo leerlo, así que esta prueba la hacemos juntos:
- yo conduzco el navegador de escritorio y te pido el código cuando llegue;
- tú repites el recorrido desde tu móvil.

1. Entra en `/vender/publicar`, sube 2 fotos reales de una tabla y completa los 5 pasos.
2. En el paso 5, entra con tu email y el código, y publica.
3. Comprueba que el anuncio aparece en `/buscar` y en la landing de su tipo, y que la ficha muestra las fotos.
4. Desde otro dispositivo o navegador, en la ficha, pulsa «Mostrar contacto» y comprueba que se abre WhatsApp con tu número.
5. **Editar:** desde «Mis anuncios», «Editar», cambia el precio y guarda. La ficha debe mostrar el nuevo precio.
6. Pulsa «Marcar vendida» y comprueba que el anuncio sale de la búsqueda.
7. **Eliminar:** «Eliminar». Comprueba que la ficha da 404 y que en **Storage** ya no está la carpeta de sus fotos.
8. Repite los pasos 1, 2 y 7 desde el móvil.
9. Opcional: borra la cuenta de prueba en `/cuenta`.

**Criterio de cierre:** el lanzamiento se da por terminado cuando todo lo anterior funciona en la URL pública sin errores. Lo registraremos en `docs/BETA_AUDIT.md`.

---

## Qué está ya hecho y verificado en local

- **Publicar, editar y eliminar** contra Supabase local, a 1440 y 390 px:
  - entrar con código, subir fotos (WebP sin metadatos) y publicar;
  - ver la ficha con las fotos servidas desde Storage;
  - cambiar el precio;
  - eliminar el anuncio, que queda sin fila en la base de datos y sin archivos en Storage.
- **Eliminar un anuncio** es nuevo (migración `20261024100000_listings_delete_own`):
  - solo el dueño;
  - nunca si el anuncio tiene moderación, para no borrar ese registro (en ese caso se puede retirar).
- **Selector de marca:** Torq, NSP, Softech, Firewire, Channel Islands, Lost, Pukas, JS Industries, Pyzel, Catch Surf, Olaian y BIC primero. El listado completo (30 marcas) sigue en «Ver todas las marcas», junto a «Otra marca» con texto libre.
- **Tests:** unitarios, integración (Supabase local) y pgTAP (130).
