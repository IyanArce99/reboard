// Fotos de stock (Unsplash) usadas como placeholder editorial: guías, marcas, tiendas y tipos
// de tabla. No son fotos de anuncios. Origen y licencia: public/images/IMAGE_SOURCES.md.
// Cuando haya fotos propias o autorizadas, se sustituyen aquí.

export const unsplash = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
