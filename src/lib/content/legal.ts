// Textos legales · BORRADORES pendientes de revisión por un profesional (fase G).
// Los datos del titular son los que ha dado el titular; lo que falta va entre corchetes. No afirman
// cumplimiento legal: describen solo lo que la aplicación hace de verdad. No se indexan hasta que estén revisados.

export interface LegalSection {
  h: string;
  p: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

const TITULAR = "Reboard";
const NIF = "B23869027";
const DOMICILIO = "C/ Lepanto 23, 35010 Las Palmas de Gran Canaria (Las Palmas)";
const EMAIL = "hola@reboard.es";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "aviso-legal",
    title: "Aviso legal",
    intro: "Datos identificativos del titular del sitio web y condiciones generales de uso.",
    sections: [
      {
        h: "Titular",
        p: [`Titular: ${TITULAR}. NIF: ${NIF}. Domicilio: ${DOMICILIO}. Contacto: ${EMAIL}.`],
      },
      {
        h: "Qué es Reboard",
        p: [
          "Reboard es un sitio de anuncios de tablas de surf de segunda mano. Pone en contacto a compradores y vendedores. No vende tablas, no cobra comisiones, no gestiona pagos ni envíos y no participa en los acuerdos entre las partes.",
        ],
      },
      {
        h: "Responsabilidad sobre los anuncios",
        p: [
          "Cada anuncio lo publica su vendedor, que responde de que sus datos, fotos y precio sean veraces. Reboard revisa los anuncios reportados y puede retirarlos, pero no comprueba previamente cada anuncio.",
        ],
      },
      { h: "Propiedad intelectual", p: ["[Pendiente de redactar: marca Reboard, diseño, textos propios y fotografías con licencia de terceros (ver /creditos).]"] },
      { h: "Legislación aplicable", p: ["[Pendiente de revisión legal.]"] },
    ],
  },
  {
    slug: "privacidad",
    title: "Política de privacidad",
    intro: "Qué datos personales trata Reboard, para qué, durante cuánto tiempo y cómo ejercer tus derechos.",
    sections: [
      { h: "Responsable", p: [`${TITULAR} (${NIF}), ${DOMICILIO}. Contacto para privacidad: ${EMAIL}.`] },
      {
        h: "Datos que tratamos",
        p: [
          "Si creas una cuenta: tu email (para entrar con un código de un solo uso) y el nombre visible que elijas.",
          "Si entras con Google o con Apple: recibimos de ellos tu email y tu nombre. Usamos solo el nombre de pila como nombre visible inicial (puedes cambiarlo en «Mi cuenta»). Si en Apple eliges ocultar tu email, recibimos una dirección de reenvío de Apple.",
          "Si publicas un anuncio: los datos de la tabla, la localidad (nunca una dirección exacta), las fotos (antes de subirlas, tu dispositivo les quita los datos de ubicación y de la cámara) y tu teléfono de contacto. El teléfono no aparece en el anuncio: se muestra a quien lo pide desde el anuncio.",
          "Cuando alguien pide el contacto de un anuncio: registramos el anuncio, la fecha y un código derivado de la dirección IP (HMAC) que no permite recuperar la IP. Sirve para limitar abusos y para que el vendedor vea cuántas veces se ha pedido su contacto.",
          "Si guardas tablas con tu cuenta: la lista de anuncios guardados. Si reportas un anuncio: el motivo y el detalle que escribas.",
          "Sin cuenta, tus guardados, alertas y comparaciones se quedan en tu dispositivo y no los recibimos.",
          "Medición de audiencia, sin cookies: qué páginas se visitan, de qué web o campaña llegas (por ejemplo, «utm_source=instagram») y algunas acciones de uso (búsquedas por filtros, fichas vistas, contactos pedidos, comparaciones y los pasos al publicar), para hacer estadísticas. No incluye tu nombre, tu email, tu teléfono, tu localidad, lo que escribes ni tus respuestas de TablaFinder (peso, nivel u olas). No se guarda nada en tu dispositivo: con tu dirección IP y tu navegador, nuestro proveedor calcula en servidores de la Unión Europea un identificador que cambia cada día y no se puede revertir, y descarta la IP.",
        ],
      },
      {
        h: "Finalidad y base jurídica",
        p: [
          "Prestar el servicio que pides (cuenta, publicar, contactar), prevenir el fraude y moderar contenidos. [Bases jurídicas pendientes de revisión legal.]",
          "Medir la audiencia de la web de forma estadística para mejorarla, solo por cuenta de Reboard y sin cruzar los datos con otros ni cederlos. Se plantea como medición exenta de consentimiento (artículo 22.2 de la LSSI y guía de la AEPD sobre herramientas de medición de audiencia, enero de 2024). [Pendiente de revisión legal.]",
        ],
      },
      {
        h: "Proveedores que tratan datos por cuenta de Reboard",
        p: [
          "Supabase (base de datos, autenticación y almacenamiento de fotos; proyecto alojado en la Unión Europea).",
          "Vercel (alojamiento de la web). [Región y garantías pendientes de confirmar.]",
          "Cloudflare Turnstile (comprobación anti-robots en el acceso, el contacto, publicar y reportar).",
          "Google y Apple, solo si eliges entrar con su cuenta: verifican tu identidad y nos envían tu email y tu nombre.",
          "DonDominio (correo electrónico de Reboard y envío del email con el código de acceso).",
          "PostHog (medición de audiencia sin cookies; servidores en la Unión Europea), como encargado del tratamiento, con el compromiso de no reutilizar los datos. [Pendiente de firmar su contrato de encargo (DPA).]",
          "[Revisar contratos de encargo de tratamiento y transferencias internacionales.]",
        ],
      },
      {
        h: "Conservación",
        p: [
          "Los anuncios que no se confirman en 30 días caducan; los borradores sin publicar se borran a los 7 días con sus fotos. Si borras tu cuenta, se borran tu perfil, tus anuncios, tus fotos, tus guardados y tus reportes.",
          "[Plazo de conservación del registro de contactos y de los anuncios caducados o vendidos: pendiente de decidir.]",
          "Estadísticas de uso: como máximo 12 meses (por debajo de los 25 meses que fija la AEPD).",
        ],
      },
      {
        h: "Tus derechos",
        p: [
          "Si activas «No rastrear» o «Global Privacy Control» en tu navegador, no medimos tu visita.",
          `Puedes borrar tu cuenta desde «Mi cuenta». Para acceder, rectificar, oponerte o pedir la portabilidad de tus datos, escribe a ${EMAIL}. [Información sobre la reclamación ante la AEPD pendiente de revisión legal.]`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Política de cookies",
    intro: "Reboard no usa cookies de publicidad ni de analítica. Solo las técnicas necesarias para que la web funcione. La audiencia se mide sin cookies (abajo te contamos cómo).",
    sections: [
      {
        h: "Cookies y almacenamiento que usamos",
        p: [
          "Todas son propias y técnicas: sin ellas no funciona lo que pides. Por eso no te pedimos consentimiento ni mostramos un banner de cookies.",
          "Sesión (cookies «sb-…» de Supabase): solo si entras con tu cuenta. Mantienen la sesión iniciada.",
          "Zona de referencia (cookie «rb_zona»): solo si eliges tu zona. Recuerda la zona para mostrar «cerca de ti».",
          "Almacenamiento local del navegador: guardados, alertas y comparación («rb-usuario-v1»), las respuestas de TablaFinder («rb-asistente-v1»), «Mis anuncios» en este dispositivo («rb-panel-v1») y el anuncio que dejas a medias (IndexedDB). No salen de tu dispositivo salvo que entres con tu cuenta (los guardados).",
          "Cloudflare Turnstile se carga solo en el acceso, al pedir un contacto, al publicar y al reportar, para comprobar que no eres un robot. [Revisar con la documentación de Cloudflare qué almacena.]",
        ],
      },
      {
        h: "Medición de audiencia (sin cookies)",
        p: [
          "Medimos cuánta gente usa Reboard y cómo (páginas vistas, de qué web o campaña llega, búsquedas por filtros, fichas vistas, contactos pedidos y los pasos al publicar) con PostHog, en servidores de la Unión Europea y solo para Reboard.",
          "No usa cookies ni guarda nada en tu dispositivo: con tu dirección IP y tu navegador, PostHog calcula un identificador que cambia cada día (con una clave que borra a diario) y descarta la IP. No sirve para seguirte en otras webs ni de un día para otro.",
          "No mide nada de tu cuenta, de «Mi cuenta», de «Mis anuncios» ni de moderación, y nunca envía tu nombre, tu email, tu teléfono, tu localidad ni lo que escribes.",
          "Por estas condiciones se considera medición de audiencia exenta de consentimiento (artículo 22.2 de la LSSI; guía de la AEPD de enero de 2024). Si activas «No rastrear» o «Global Privacy Control» en tu navegador, no medimos tu visita. [Pendiente de revisión legal.]",
          "No hay publicidad ni seguimiento de terceros.",
        ],
      },
    ],
  },
  {
    slug: "condiciones",
    title: "Condiciones de uso",
    intro: "Reglas para publicar y contactar en Reboard.",
    sections: [
      {
        h: "Publicar",
        p: [
          "Publicar es gratis. Solo se pueden anunciar tablas de surf propias que estén a la venta. Las fotos deben ser de la tabla anunciada y los datos, veraces. Cada 14 días tienes que confirmar en «Mis anuncios» que sigue disponible; si no lo haces, el anuncio caduca a los 30.",
        ],
      },
      {
        h: "Comprar y contactar",
        p: [
          "El trato es entre comprador y vendedor. Recomendamos ver la tabla en persona y pagar al recogerla. Nunca adelantes señales, envíos ni otros pagos a desconocidos.",
        ],
      },
      { h: "Uso prohibido", p: ["Anuncios falsos o duplicados, spam, contenido ofensivo, recopilar teléfonos de forma automatizada o suplantar a otra persona. Reboard puede retirar anuncios y cerrar cuentas que incumplan estas reglas."] },
      { h: "Responsabilidad", p: ["[Pendiente de revisión legal.]"] },
    ],
  },
];

export const legalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
