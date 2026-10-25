// Textos legales de Reboard (aviso legal, privacidad, cookies y condiciones de uso).
// Describen solo lo que la aplicación hace de verdad. Si cambia algo de lo que se cuenta aquí (proveedores,
// datos, plazos de conservación, medición), hay que actualizar estos textos y la fecha UPDATED.
// - Conservación de 12 meses: dailyMaintenance (src/lib/moderation/service.ts), cron diario.
// - Medición sin cookies: docs/ANALYTICS.md.

export interface LegalSection {
  h: string;
  p: string[];
  /** Enlaces a otros textos (se muestran debajo de los párrafos). */
  links?: { href: string; label: string }[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

const TITULAR = "Iyan Arcega SL";
const NIF = "B23869027";
const DOMICILIO = "C/ Lepanto 23, 35010 Las Palmas de Gran Canaria (Las Palmas)";
const REGISTRO = "inscrita en el Registro Mercantil de Las Palmas";
const EMAIL = "hola@reboard.es";
/** Fecha de la última actualización de los textos (se muestra en cada página). */
export const LEGAL_UPDATED = "25 de octubre de 2026";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "aviso-legal",
    title: "Aviso legal",
    intro:
      "Datos del titular de Reboard y condiciones generales de uso del sitio web, conforme al artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI).",
    sections: [
      {
        h: "Titular",
        p: [
          `Reboard es una marca de ${TITULAR}, con NIF ${NIF} y domicilio en ${DOMICILIO}, ${REGISTRO}.`,
          `Contacto: ${EMAIL} o el formulario de la página Contacto.`,
        ],
      },
      {
        h: "Qué es Reboard",
        p: [
          "Reboard es un sitio web de anuncios de tablas de surf de segunda mano en Canarias. Pone en contacto a quien vende con quien compra. No vende tablas, no cobra comisiones, no gestiona pagos ni envíos y no participa en los acuerdos entre las partes.",
          "Usar el sitio es gratis. Navegar por él supone aceptar este aviso legal. Si creas una cuenta, publicas un anuncio o pides un contacto, se aplican además las Condiciones de uso.",
        ],
      },
      {
        h: "Responsabilidad sobre los anuncios",
        p: [
          "Cada anuncio lo publica su vendedor, que responde de que sus datos, fotos y precio sean veraces y lícitos. Reboard no revisa cada anuncio antes de publicarlo.",
          "Como servicio de alojamiento de contenidos de terceros, Reboard no responde de los anuncios mientras no tenga conocimiento efectivo de que son ilícitos. Cuando lo tiene, por un aviso o por su propia revisión, actúa con diligencia para retirarlos o bloquearlos (artículo 16 de la LSSI y artículo 6 del Reglamento (UE) 2022/2065, de Servicios Digitales).",
          "Reboard no responde del contenido de las webs de terceros a las que pueda enlazar.",
        ],
      },
      {
        h: "Propiedad intelectual e industrial",
        p: [
          `La marca y el logotipo Reboard, el diseño del sitio, su código y sus textos propios pertenecen a ${TITULAR}. No se pueden reproducir, distribuir, comunicar públicamente ni transformar sin su autorización, salvo lo necesario para usar el sitio de forma personal.`,
          "Las fotografías de ambiente se usan con la licencia de sus autores, que se detalla en Créditos de fotografía.",
          "Las fotos y los textos de cada anuncio son de quien lo publica. Al publicarlo, autoriza a Reboard a mostrarlos en el sitio, sin coste, mientras el anuncio esté publicado y durante el tiempo de conservación indicado en la Política de privacidad.",
        ],
      },
      {
        h: "Legislación aplicable y jurisdicción",
        p: [
          "Este aviso y el uso del sitio se rigen por la ley española.",
          "Si eres consumidor, cualquier conflicto se resolverá en los juzgados y tribunales de tu domicilio. En los demás casos, en los de Las Palmas de Gran Canaria.",
        ],
      },
      {
        h: "Otros textos",
        p: [
          "Las reglas para publicar y contactar están en las Condiciones de uso. Los autores y las licencias de las fotografías que usamos, en Créditos de fotografía.",
        ],
        links: [
          { href: "/legal/condiciones", label: "Condiciones de uso" },
          { href: "/creditos", label: "Créditos de fotografía" },
          { href: "/contacto", label: "Contacto" },
        ],
      },
    ],
  },
  {
    slug: "privacidad",
    title: "Política de privacidad",
    intro: "Qué datos personales trata Reboard, para qué, con qué base legal, durante cuánto tiempo y cómo ejercer tus derechos.",
    sections: [
      {
        h: "Responsable del tratamiento",
        p: [`${TITULAR} (NIF ${NIF}), ${DOMICILIO}. Para cualquier asunto de privacidad: ${EMAIL}.`],
      },
      {
        h: "Datos que tratamos",
        p: [
          "Si creas una cuenta: tu email (para entrar con un código de un solo uso) y el nombre visible que elijas.",
          "Si entras con Google o con Apple: recibimos de ellos tu email y tu nombre. Usamos solo el nombre de pila como nombre visible inicial (puedes cambiarlo en «Mi cuenta»). Si en Apple eliges ocultar tu email, recibimos una dirección de reenvío de Apple.",
          "Si publicas un anuncio: los datos de la tabla, la localidad (nunca una dirección exacta), las fotos (antes de subirlas, tu dispositivo les quita los datos de ubicación y de la cámara) y tu teléfono de contacto. El teléfono no aparece en el anuncio: se muestra solo a quien lo pide desde el anuncio.",
          "Cuando alguien pide el contacto de un anuncio: registramos el anuncio, la fecha y un código derivado de la dirección IP (HMAC) que no permite recuperar la IP. Sirve para limitar abusos y para que el vendedor vea cuántas veces se ha pedido su contacto.",
          "Si guardas tablas con tu cuenta: la lista de anuncios guardados. Si reportas un anuncio: el motivo y el detalle que escribas.",
          "Sin cuenta, tus tablas guardadas, búsquedas guardadas y comparaciones se quedan en tu dispositivo y no las recibimos.",
          "Medición de audiencia, sin cookies: qué páginas se visitan, de qué web o campaña llegas (por ejemplo, «utm_source=instagram») y algunas acciones de uso (búsquedas por filtros, fichas vistas, contactos pedidos, comparaciones y los pasos al publicar), para hacer estadísticas. No incluye tu nombre, tu email, tu teléfono, tu localidad, lo que escribes ni tus respuestas de la calculadora de litros (peso, nivel u olas).",
          "Si nos escribes, por email o con el formulario de contacto: tu email, el motivo y lo que nos cuentes. Si tienes la sesión iniciada, lo asociamos a tu cuenta para ayudarte mejor. Para evitar abusos del formulario guardamos también el código derivado de tu IP (HMAC) que se explica arriba.",
        ],
      },
      {
        h: "Para qué los usamos y con qué base legal",
        p: [
          "Prestarte el servicio que pides (tu cuenta, publicar y gestionar anuncios, mostrar el contacto de un anuncio a quien lo pide, guardar tablas con tu cuenta). Base legal: la ejecución del contrato que aceptas con las Condiciones de uso (artículo 6.1.b del Reglamento General de Protección de Datos, RGPD).",
          "Mantener el servicio seguro: comprobar que no eres un robot, limitar abusos, prevenir fraudes y revisar los anuncios reportados. Base legal: nuestro interés legítimo en proteger a quienes usan Reboard (artículo 6.1.f del RGPD) y el cumplimiento de las obligaciones del Reglamento de Servicios Digitales (artículo 6.1.c del RGPD).",
          "Medir la audiencia de forma estadística para mejorar la web, solo por cuenta de Reboard, sin cruzar los datos con otros ni cederlos. Base legal: nuestro interés legítimo en saber cómo se usa el servicio (artículo 6.1.f del RGPD). Puedes oponerte activando «No rastrear» o «Global Privacy Control» en tu navegador: si lo haces, no medimos tu visita.",
          "Atender lo que nos escribas y tus solicitudes de privacidad. Base legal: tu petición y el cumplimiento de obligaciones legales (artículos 6.1.b y 6.1.c del RGPD).",
          "No tomamos decisiones automatizadas que te afecten ni elaboramos perfiles. No vendemos tus datos ni los usamos para publicidad.",
        ],
      },
      {
        h: "Quién puede ver tus datos",
        p: [
          "Otras personas usuarias: lo que publicas en tu anuncio y tu nombre visible. Tu teléfono, solo quien lo pide desde el anuncio, porque para eso lo publicas.",
          "No cedemos tus datos a terceros, salvo obligación legal (por ejemplo, un requerimiento judicial).",
          "Proveedores que los tratan por cuenta de Reboard, con contrato de encargo del tratamiento:",
          "Supabase (base de datos, cuentas y fotos de los anuncios; servidores en la Unión Europea).",
          "Vercel (alojamiento de la web; se ejecuta en Dublín, Irlanda).",
          "Cloudflare (Turnstile, la comprobación anti-robots al entrar, pedir un contacto, publicar, reportar y en el formulario de contacto).",
          "DonDominio (correo electrónico de Reboard, envío del email con el código de acceso y aviso de los mensajes del formulario de contacto).",
          "PostHog (medición de audiencia sin cookies; servidores en la Unión Europea).",
          "Google y Apple, solo si eliges entrar con su cuenta, tratan tus datos como responsables independientes, según sus propias políticas.",
          "Supabase, Vercel, Cloudflare y PostHog son empresas de Estados Unidos. Aunque los datos se alojan en la Unión Europea, pueden acceder a ellos desde fuera para prestar el servicio. En ese caso, la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo aprobadas por la Comisión Europea.",
        ],
      },
      {
        h: "Cuánto tiempo los conservamos",
        p: [
          "Tu cuenta, mientras la mantengas. Si la borras desde «Mi cuenta», se borran tu perfil, tus anuncios, tus fotos, tus guardados y tus reportes.",
          "Los anuncios, mientras estén publicados. Los vendidos, caducados o retirados se borran con sus fotos 12 meses después de su último cambio. Los borradores sin publicar, a los 7 días.",
          "El registro de contactos pedidos, los reportes y las acciones de moderación, 12 meses.",
          "Los datos de medición de audiencia, 12 meses como máximo.",
          "Los mensajes que nos envíes, por email o con el formulario de contacto, 12 meses.",
          "Pasados esos plazos, solo conservaremos lo que una ley nos obligue a guardar, bloqueado y durante el tiempo que esa ley indique.",
        ],
      },
      {
        h: "Tus derechos",
        p: [
          `Puedes pedir acceder a tus datos, rectificarlos, suprimirlos, oponerte a su tratamiento, limitarlo o llevártelos a otro servicio (portabilidad). Escribe a ${EMAIL} o usa el formulario de contacto (motivo «Mis datos y privacidad») desde el email de tu cuenta, o indicándolo, y te responderemos en el plazo de un mes.`,
          "Puedes borrar tu cuenta tú mismo desde «Mi cuenta», en cualquier momento.",
          "Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es; C/ Jorge Juan 6, 28001 Madrid).",
        ],
      },
      {
        h: "Menores",
        p: ["Para crear una cuenta y publicar anuncios hay que tener al menos 14 años. Si sabemos que una cuenta es de un menor de esa edad, la borramos."],
      },
      {
        h: "Seguridad",
        p: [
          "Las conexiones van cifradas (HTTPS), el acceso a la base de datos está restringido por reglas que solo dejan a cada persona ver y cambiar lo suyo, el teléfono de los anuncios no aparece en la página y las fotos se suben sin sus datos de ubicación.",
        ],
      },
      {
        h: "Cambios en esta política",
        p: ["Si cambia algo importante, lo actualizaremos aquí con su fecha y, si te afecta, te avisaremos por email."],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Política de cookies",
    intro:
      "Reboard no usa cookies de publicidad ni de analítica. Solo las técnicas necesarias para que la web funcione. La audiencia se mide sin cookies (abajo te contamos cómo).",
    sections: [
      {
        h: "Cookies y almacenamiento que usamos",
        p: [
          "Todas son propias y técnicas: sin ellas no funciona lo que pides. Por eso no te pedimos consentimiento ni mostramos un banner de cookies (artículo 22.2 de la LSSI).",
          "Sesión (cookies «sb-…» de Supabase): solo si entras con tu cuenta. Mantienen la sesión iniciada hasta que sales.",
          "Isla de referencia (cookie «rb_zona»): solo si eliges tu isla. La recuerda durante un año para mostrarte primero las tablas de tu isla.",
          "Almacenamiento local del navegador: tablas guardadas, búsquedas guardadas y comparación («rb-usuario-v1»), las respuestas de la calculadora de litros («rb-asistente-v1»), «Mis anuncios» en este dispositivo («rb-panel-v1») y el anuncio que dejas a medias (IndexedDB). No salen de tu dispositivo, salvo los guardados si entras con tu cuenta.",
          "Cloudflare Turnstile, la comprobación anti-robots, se carga solo al entrar, al pedir un contacto, al publicar y al reportar. Puede usar cookies o almacenamiento técnicos, estrictamente necesarios para distinguir a personas de robots, que Cloudflare describe en su aviso de privacidad de Turnstile.",
        ],
        links: [{ href: "https://www.cloudflare.com/turnstile-privacy-policy/", label: "Aviso de privacidad de Turnstile" }],
      },
      {
        h: "Medición de audiencia (sin cookies)",
        p: [
          "Medimos cuánta gente usa Reboard y cómo (páginas vistas, de qué web o campaña llega, búsquedas por filtros, fichas vistas, contactos pedidos y los pasos al publicar) con PostHog, en servidores de la Unión Europea y solo para Reboard.",
          "No usa cookies ni guarda nada en tu dispositivo. Con la dirección IP y el tipo de navegador que todo navegador envía al visitar una web, PostHog calcula un identificador que cambia cada día (con una clave que se borra a diario) y descarta la IP. No sirve para seguirte en otras webs ni de un día para otro.",
          "No mide nada de tu cuenta, de «Mi cuenta», de «Mis anuncios» ni de moderación, y nunca envía tu nombre, tu email, tu teléfono, tu localidad ni lo que escribes.",
          "Si activas «No rastrear» o «Global Privacy Control» en tu navegador, no medimos tu visita.",
          "No hay publicidad ni seguimiento de terceros.",
        ],
      },
      {
        h: "Cómo borrarlas o bloquearlas",
        p: [
          "Puedes borrar las cookies y el almacenamiento local desde los ajustes de tu navegador. Si los bloqueas, la web seguirá funcionando, pero no podrás mantener la sesión iniciada y perderás lo guardado en este dispositivo.",
        ],
      },
    ],
  },
  {
    slug: "condiciones",
    title: "Condiciones de uso",
    intro: `Reglas para usar Reboard, publicar anuncios y contactar con vendedores. Al crear una cuenta, publicar o pedir un contacto, las aceptas. El servicio lo presta ${TITULAR} (ver Aviso legal).`,
    sections: [
      {
        h: "Quién puede usar Reboard",
        p: [
          "Cualquier persona puede buscar tablas. Para crear una cuenta y publicar hay que tener al menos 14 años y dar datos veraces.",
          "La cuenta es personal. Eres responsable de lo que se haga con ella; si crees que alguien la usa sin permiso, escríbenos.",
        ],
      },
      {
        h: "Publicar",
        p: [
          "Publicar es gratis. Solo se pueden anunciar tablas de surf a la venta que sean tuyas o que estés autorizado a vender. Las fotos deben ser de la tabla anunciada y los datos (medidas, estado y precio), veraces.",
          "Cada 14 días tienes que confirmar en «Mis anuncios» que la tabla sigue disponible; si no lo haces, el anuncio caduca a los 30 días. Cuando la vendas, márcala como vendida o retira el anuncio.",
          `Si vendes como tienda, escuela o profesional, escríbenos a ${EMAIL} para que tu cuenta figure como tal en tus anuncios, y cumple las obligaciones que la ley impone a los vendedores profesionales, incluidas las garantías a los consumidores.`,
        ],
      },
      {
        h: "Comprar y contactar",
        p: [
          "El trato es solo entre comprador y vendedor: Reboard no interviene en el pago, la entrega ni el estado de la tabla.",
          "Recomendamos ver la tabla en persona, en un sitio público, y pagar al recogerla. Nunca adelantes señales, envíos ni otros pagos a desconocidos, ni pagues por enlaces que te manden por WhatsApp.",
          "El teléfono que obtienes al pedir un contacto es solo para hablar de ese anuncio. No puedes guardarlo para otros fines ni recopilar teléfonos.",
        ],
      },
      {
        h: "Qué no está permitido",
        p: [
          "Anunciar algo que no sea una tabla de surf, anuncios falsos, duplicados o engañosos, objetos robados, spam, contenido ofensivo o ilegal, usar fotos ajenas, recopilar teléfonos de forma automatizada, acceder a la web con robots o suplantar a otra persona.",
        ],
      },
      {
        h: "Reportes y moderación",
        p: [
          `Cualquier persona puede avisarnos de un anuncio ilegal o que incumple estas condiciones con el botón «Reportar» del anuncio, con el formulario de contacto o escribiendo a ${EMAIL}, con el enlace y el motivo. Revisamos los avisos con diligencia, de forma objetiva y sin arbitrariedad.`,
          "Podemos ocultar o retirar anuncios y suspender o cerrar cuentas que incumplan estas condiciones o la ley. Si lo hacemos con tu anuncio o tu cuenta, te lo comunicamos por email con el motivo, la norma incumplida y cómo reclamar. Puedes responder a ese email para pedir que lo revisemos de nuevo; lo revisará una persona.",
          `Punto de contacto para usuarios y autoridades (Reglamento de Servicios Digitales): ${EMAIL} y el formulario de la página Contacto, en español.`,
        ],
      },
      {
        h: "Responsabilidad",
        p: [
          "Reboard no es parte en las compraventas y no garantiza que los anuncios sean exactos, que las tablas estén en el estado descrito ni que el trato llegue a cerrarse. Cada usuario responde de lo que publica y de lo que acuerda.",
          "Intentamos que la web funcione siempre, pero puede haber interrupciones por mantenimiento o causas ajenas. Nada de estas condiciones limita los derechos que la ley te reconoce como consumidor ni nuestra responsabilidad en los casos en que la ley no permite limitarla.",
        ],
      },
      {
        h: "Baja y cambios",
        p: [
          "Puedes borrar tu cuenta cuando quieras desde «Mi cuenta».",
          "Si cambiamos estas condiciones, lo publicaremos aquí con su fecha y, si el cambio te afecta, te avisaremos por email antes de que se aplique.",
        ],
      },
      {
        h: "Ley aplicable",
        p: [
          "Estas condiciones se rigen por la ley española. Si eres consumidor, cualquier conflicto se resolverá en los juzgados y tribunales de tu domicilio; en los demás casos, en los de Las Palmas de Gran Canaria.",
        ],
      },
    ],
  },
];

export const legalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
