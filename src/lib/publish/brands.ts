// Búsqueda de marcas para el campo «Marca» de publicar (BrandPicker). Sin tildes ni mayúsculas, y
// sin espacios ni signos («channelislands», «js ind» → JS Industries).

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
const compact = (s: string) => norm(s).replace(/ /g, "");

/**
 * Sugerencias para lo escrito: primero las que empiezan así, luego las que tienen una palabra que
 * empieza así y, por último, las que lo contienen. Sin texto, las destacadas (en el orden recibido).
 */
export function matchBrands(query: string, brands: readonly string[], featured: readonly string[], limit = 8): string[] {
  const q = norm(query);
  if (!q) {
    const top = brands.filter((b) => featured.includes(b));
    return (top.length ? top : brands).slice(0, limit);
  }
  const qc = q.replace(/ /g, "");
  const rank = (b: string) => {
    const n = norm(b);
    const c = compact(b);
    if (c.startsWith(qc)) return 0;
    if (n.split(" ").some((w) => w.startsWith(q))) return 1;
    if (c.includes(qc)) return 2;
    return -1;
  };
  return brands
    .map((b, i) => ({ b, i, r: rank(b) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.b);
}

/** La marca de la lista que coincide exactamente con lo escrito (sin tildes, mayúsculas ni espacios). */
export function exactBrand(query: string, brands: readonly string[]): string | null {
  const qc = compact(query);
  if (!qc) return null;
  return brands.find((b) => compact(b) === qc) ?? null;
}
