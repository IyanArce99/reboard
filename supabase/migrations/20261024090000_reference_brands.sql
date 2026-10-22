-- Marcas de referencia para publicar y filtrar.
-- Solo nombres de marcas reales de tablas de surf: sin modelos, medidas ni litros (eso exige la
-- tabla del fabricante, ver docs/DATABASE.md). Sin ellas, quien publica solo podía elegir
-- «Shaper local» o «Sin marca», y los filtros no mostraban ninguna marca.
-- El slug coincide con slugify(name) de src/lib/domain/taxonomy.ts.
insert into public.brands (slug, name) values
  ('torq', 'Torq'),
  ('nsp', 'NSP'),
  ('softech', 'Softech'),
  ('firewire', 'Firewire'),
  ('channel-islands', 'Channel Islands'),
  ('lost', 'Lost'),
  ('pukas', 'Pukas'),
  ('js-industries', 'JS Industries'),
  ('pyzel', 'Pyzel'),
  ('rusty', 'Rusty'),
  ('sharp-eye', 'Sharp Eye'),
  ('haydenshapes', 'Haydenshapes'),
  ('christenson', 'Christenson'),
  ('chilli', 'Chilli'),
  ('dhd', 'DHD'),
  ('superbrand', 'Superbrand'),
  ('album', 'Album'),
  ('catch-surf', 'Catch Surf'),
  ('olaian', 'Olaian'),
  ('bic', 'BIC'),
  ('mick-fanning-softboards', 'Mick Fanning Softboards'),
  ('mctavish', 'McTavish'),
  ('bing', 'Bing'),
  ('takayama', 'Takayama'),
  ('slater-designs', 'Slater Designs'),
  ('aipa', 'Aipa'),
  ('global-surf-industries', 'Global Surf Industries'),
  ('lib-tech', 'Lib Tech'),
  ('tokoro', 'Tokoro'),
  ('clayton', 'Clayton')
on conflict (slug) do nothing;
