-- Reboard · datos de referencia: zonas (provincias o islas) de src/lib/domain/taxonomy.ts
-- Son lugares reales, no datos de demostración. El catálogo de marcas y modelos NO se carga aquí:
-- en producción solo entrará con medidas verificadas contra el fabricante (ROADMAP G2).

insert into public.zones (slug, name, region_slug, sort_order) values
  ('gran-canaria',  'Gran Canaria',  'canarias', 1),
  ('tenerife',      'Tenerife',      'canarias', 2),
  ('lanzarote',     'Lanzarote',     'canarias', 3),
  ('fuerteventura', 'Fuerteventura', 'canarias', 4),
  ('asturias',      'Asturias',      null,       5),
  ('cantabria',     'Cantabria',     null,       6),
  ('galicia',       'Galicia',       null,       7),
  ('pais-vasco',    'País Vasco',    null,       8),
  ('cadiz',         'Cádiz',         null,       9)
on conflict (slug) do update
  set name = excluded.name, region_slug = excluded.region_slug, sort_order = excluded.sort_order;
