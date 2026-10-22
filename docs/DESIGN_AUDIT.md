# Auditoría de diseño, dirección de arte y copy

Fecha: 22-10-2026 · Rama `mvp`. Capturas «antes» y «después» a 375, 768 y 1440 px de 20 pantallas (fuera del repo por tamaño). Resultado y comparación al final (§6).

## 1. Diagnóstico
La base funciona y es honesta:
- paleta Atlantic Blue reconocible;
- tarjetas de anuncio claras;
- formularios accesibles;
- datos con su origen.

Pero **parece un prototipo** por estos problemas, ordenados por impacto.

### P0: falta identidad visual y emocional
1. **Sin fotografía fuera de los anuncios.** Home, vender, asistente, guías y tiendas son bloques planos petróleo o blancos. No hay playa, ni gente, ni tablas en contexto. La marca no transmite surf.
2. **El hero de la home es solo tipografía.** Funciona, pero no comunica «surf» ni «tablas usadas» de un vistazo.
3. **Las fotos de anuncios DEMO se repiten** (la misma tabla amarilla en muchas tarjetas). Es inevitable con datos de ejemplo, pero refuerza la sensación de maqueta si no hay más imagen alrededor.

### P1: jerarquía y sistema
4. **Los titulares mezclan dos sistemas:**
   - Barlow Condensed en mayúsculas (home, H1).
   - Barlow 700 en frase con mayúscula inicial («Por qué venderla en Reboard», «Torq de segunda mano · 26», «Lista de comprobación»).

   No hay un componente de cabecera de sección.
5. **Las páginas editoriales parecen documentación:**
   - `/vender`: 4 cajas iguales, una lista numerada y el CTA repetido.
   - Guía: imagen gigante recortada, tabla y CTA en caja gris.
   - Tiendas: rejilla con mucho vacío.
6. **El footer no cierra.** Un bloque gris con columnas sueltas, sin momento de marca ni llamada final.
7. **Ritmo vertical irregular:** separaciones de 28 a 64 px sin patrón. Las secciones «se pegan» o quedan huecas.
8. **Chips de tipo en el hero:** son correctos, pero son solo texto. Las formas de tabla son muy visuales y un dibujo enseñaría más que la palabra.

### P2: detalles de UX y copy
9. **Copy demasiado técnico o largo en sitios clave:**
   - «Calculadora de litros y tipo de tabla en 7 preguntas cortas…».
   - «Sus tablas usadas aparecen junto a las de particulares…».
   - El paso de teléfono habla de «verificación» que aún no existe en el MVP.
10. **El CTA principal de vender se repite** dos veces con el mismo texto en `/vender`, y el segundo queda aislado.
11. **Estados vacíos solo con texto** (guardado, alertas, comparador, búsqueda sin resultados). Son correctos, pero fríos.
12. **Marca:** el marcador del logotipo es un recuadro con borde discontinuo y la etiqueta «espacio para el logotipo autorizado». Visualmente pobre.
13. **Móvil:** el hero ocupa casi toda la primera pantalla antes de enseñar tablas. Es correcto, pero los chips se cortan sin indicar que hay más.

### Lo que funciona y se mantiene
- **ListingCard** (vertical y horizontal), **FilterPanel**, búsqueda y URLs: los anuncios son los protagonistas.
- **Ficha:** galería, panel de precio, datos con su origen y la barra de contacto en móvil.
- **Accesibilidad:** áreas táctiles de 44 px, foco visible, contraste AA y `aria-checked` en el asistente.
- **Paleta Atlantic Blue y logotipo** (aprobados): no se cambian.

## 2. Dirección de arte
**«Coastal editorial»:** la claridad de un marketplace (Wallapop) con la fotografía y el ritmo de una revista de surf, sin efectos.

- **Fotografía real, cotidiana:**
  - surfistas normales caminando hacia el agua, gente aprendiendo, tablas usadas, talleres y racks;
  - playas reales (una de ellas en A Coruña);
  - personas de espaldas o sin rostro reconocible en contextos promocionales (licencia de Pexels: no implicar respaldo);
  - nunca como si fueran fotos de anuncios.
- **Tratamiento:**
  - fotos a sangre o en bloques con radio grande (24 px);
  - sobre petróleo, un velo petróleo que va de opaco a transparente para leer el texto;
  - sin duotonos agresivos ni filtros.
- **Color:**
  - Petróleo para la estructura y los bloques de marca.
  - **Arena cálida** (`--rb-shore` #F7F3EA, que deriva del warm white) como fondo editorial alterno al agua (#EFF6F5), para dar ritmo.
  - El amarillo sigue reservado a la acción principal.
- **Tipografía (sistema único):**
  - Etiqueta (eyebrow): IBM Plex Mono 12 px, mayúsculas y turquesa.
  - Títulos de sección: **Barlow Condensed 800 en mayúsculas**, siempre.
  - Entradilla: Barlow 400, 17–19 px.
  - Se acaba la mezcla con Barlow 700 en frase en los titulares de sección. Barlow 700 se mantiene en titulares de tarjeta y en UI.
- **Ilustración funcional:** siluetas SVG de las 7 formas de tabla, vistas desde arriba y a escala relativa. Se usan en categorías, el asistente y el contenido SEO. Ligeras, accesibles y propias; nada decorativo gratuito.
- **Movimiento:** solo las transiciones existentes (0,15 s) y el zoom sutil de la foto al pasar el ratón en tarjetas editoriales. Respeta `prefers-reduced-motion`.

## 3. Plan priorizado
| Prioridad | Cambio | Páginas |
|---|---|---|
| P0 | Sistema de fotos (`src/lib/photos.ts` + `Photo`), siluetas de tabla (`BoardShape`), cabecera de sección única (`SectionHeader`) y fondo arena | Global |
| P0 | Home: hero con foto, categorías con silueta, «cómo funciona» en 3 pasos, bloques de asistente y vender con foto, guías con imagen y footer de marca | `/` |
| P1 | Footer con cierre de marca y llamada final; cabecera más compacta | Global |
| P1 | `/vender` rehecha: foto, beneficios reales, pasos, consejos de foto y un solo CTA | `/vender` |
| P1 | Asistente: cabecera con foto, siluetas en las opciones de tabla actual y en el resultado | `/calculadora-litros` |
| P1 | Guías: índice editorial con tarjetas de foto y guía con columna de lectura | `/guias`, `/guias/*` |
| P1 | Estados vacíos con foto o silueta y copy útil | Búsqueda, guardado, alertas, comparador y 404 |
| P2 | Tiendas: cabecera con foto y foto por defecto propia; marca: monograma en lugar del recuadro discontinuo | `/tiendas*`, `/marcas/*` |
| P2 | Ficha: bloque de confianza y vendedor más claros, y migas más útiles | `/anuncio/*` |
| P2 | Copy en toda la web (§5) | Todas |

## 4. Fotografías incorporadas
**Fuente:** Pexels. Licencia gratuita (https://www.pexels.com/license/): uso libre, atribución no obligatoria. Se acredita igualmente en `public/images/IMAGE_SOURCES.md`. Cada foto se ha verificado en su página: título, autor, licencia «Gratis» y dimensiones.

**Proceso:** `scripts/photos.mjs` descarga, redimensiona (máx. 1.400–2.400 px), convierte a WebP (q74), genera un placeholder borroso y escribe el manifiesto `src/lib/photos.ts`. 16 fotos, 2,5 MB en total. `next/image` sirve AVIF/WebP del tamaño de cada pantalla.

| Archivo | Uso actual | Autor (Pexels) |
|---|---|---|
| `hero-surfistas-orilla` | Hero de la home (imagen LCP, `preload`) | Kampus Production (Portugal) |
| `tablas-cobertizo` | Home: «¿Tienes una tabla parada?» | Justyna Sieczka |
| `tabla-usada-tarima` | Hero de `/vender` | Enric Cruz López |
| `aprendiendo-espuma` | Home: «No compres a ciegas» (asistente) | Luke Miller |
| `tablas-usadas-quillas` | Guía «Qué revisar»: cabecera, tarjeta de la home y consejos de `/vender` | Viktorya Sergeeva |
| `surfista-a-coruna` | Home: «Compra como entre surfistas» | Tanhauser Vázquez R. (A Coruña) |
| `clase-surf` | Home y `/guias`: tarjeta del asistente | Serg Alesenko |
| `entrando-al-agua` | Home: tarjeta del comparador | Kampus Production |
| `tablas-orilla` | `/guias`: tarjeta del comparador; columna de `/entrar` | Alexa Fernando |
| `tablas-alquiler` | Cabecera de `/tiendas` | ArtHouse Studio |
| `atardecer-playa` | Cierre de marca (`ClosingBand`) | Victoria Marzullo |
| `surfista-niebla` | 404 | Romina Ordóñez |
| `shaper-taller`, `tablas-taghazout`, `surfistas-camino`, `tabla-azul-arena` | En reserva para guías futuras. No se cargan en ninguna página. | Lachlan Ross, Jillian Morkan, Kampus Production, Alexa Fernando |

## 5. Principios de copy
- **Tú**, español de España, frases cortas. Primero qué puedes hacer y después por qué te interesa.
- **Prohibido:** «descubre una experiencia única», superlativos vacíos, cifras inventadas, testimonios y garantías.
- **Las promesas solo describen lo que existe:**
  - sin comisión;
  - contacto directo;
  - te encuentran por medidas;
  - registro al final;
  - datos con su origen.
- **CTAs con verbo + objeto:** «Buscar tablas», «Publicar mi tabla», «Calcular mis litros».

## 6. Resultado
### Cambios por página
| Página | Antes | Después |
|---|---|---|
| Home | Hero solo de texto sobre petróleo; tipos como chips de texto; titulares mezclados; footer gris | Hero con foto a sangre y velo. 8 tipos con silueta, pista y recuento («Avísame» si no hay anuncios). «Recién publicadas» con eyebrow de zona. «Cómo funciona» en 3 pasos con foto. 2 bloques con foto (asistente y vender). 3 tarjetas con foto (guía, asistente, comparador). Zonas y marcas. Cierre de marca. |
| Footer | Gris claro, 4 columnas | Petróleo, 3 columnas (Comprar · Elegir bien · Vender) y fila de créditos |
| `/vender` | Columna de texto con listas | Hero con foto y 2 CTA. 4 beneficios reales. 5 pasos numerados. Caja de consejos con foto. CTA «Empezar con las fotos». |
| `/guias` | Lista con miniaturas de Unsplash | Cabecera arena; tarjetas grandes con foto y descripción; bloque «Herramientas» (asistente y comparador) |
| Guía | Columna estrecha; foto con etiqueta «foto de stock» | Titular editorial. Foto 21:9 con pie de autor. Respuesta corta destacada. Checklist con columnas Aceptable / Cuidado. CTA petróleo y anuncios recientes. |
| `/tiendas` | Título y botón | Cabecera arena con foto, eyebrow y CTA de alta |
| Marca | Recuadro discontinuo «espacio para el logotipo autorizado» | Monograma tipográfico; titulares condensados; modelos con silueta |
| Modelo | Foto de stock «aquí iría la foto autorizada» | Silueta de la forma, a escala, sobre arena: «Silueta orientativa de una evolutiva» |
| Asistente | Fotos de stock por tipo, no siempre de esa forma | Silueta exacta de cada tipo; titular más grande |
| Ficha | «Antes de comprar» en un párrafo | Bloque con 3 comprobaciones y enlace a la guía; titulares condensados |
| Búsqueda vacía, guardado y alertas | Texto en caja discontinua | Ilustración de siluetas, título condensado, explicación y acciones |
| 404 | Texto y dos botones | Foto a sangre, «Esta ola ya pasó» y dos acciones |
| Nueva: `/creditos` | — | Créditos de las fotos con autor, enlace y licencia |

### Copy (antes → después)
| Dónde | Antes | Después |
|---|---|---|
| Hero de la home | Lead técnico («Calculadora de litros…») | «Busca por litros, medidas y zona entre tablas de surfistas, tiendas y escuelas. Hablas directamente con quien vende, sin comisiones.» |
| Vender, hero | «Su próximo surfista ya la está buscando.» | «Si lleva meses parada, alguien la está buscando con esas medidas. Publícala gratis desde el móvil en cinco pasos.» |
| Vender, registro | «Solo te pedimos verificar el teléfono al final» | «La cuenta se crea al final, con tu email, justo antes de publicar» (decisión aprobada: OTP por email) |
| Vender, CTA secundario | «Ya tengo anuncios: ir a mi panel» | «Ya tengo anuncios» |
| Home, guías | Enlazaba una guía sin contenido | Tarjeta del comparador, «Compara antes de decidir»: no se promociona contenido que no existe |
| Pasos de compra | — | «Busca por lo que importa» · «Habla directamente con quien vende» · «Pruébala y paga al recogerla» |
| Guía pendiente | Texto interno («Respuesta corta, tabla de comprobación…») | «Estamos escribiendo esta guía. Mientras tanto, el asistente…» |
| Alertas vacías | «No tienes alertas. Créalas desde…» | Título «No tienes alertas», explicación y botones a Buscar y al asistente |

### Validación
- **Capturas:** antes y después a 375, 768 y 1440 px, 20 páginas. No se versionan; se generan con un script local. **Sin scroll horizontal en ninguna.**
- **Tests:**
  - TypeScript y ESLint sin errores;
  - 72 tests unitarios;
  - 55 e2e en modo mock, incluidos «sin errores de hidratación con estado guardado» y el nuevo `/creditos`;
  - 16 referencias visuales regeneradas. Una ejecución falló una vez por las fotos remotas de Unsplash de los anuncios DEMO; pasa al repetirla.
- **Rendimiento:**
  - solo la foto del hero lleva `preload` (WebP de 86 KB en origen; `next/image` sirve el tamaño del viewport);
  - el resto carga en diferido con placeholder borroso;
  - las siluetas son SVG en línea, sin peticiones.
- **Accesibilidad:**
  - fotos decorativas con `alt=""` e informativas con alt descriptivo;
  - foco visible en turquesa claro sobre petróleo;
  - áreas táctiles de 44 px en el footer móvil;
  - la checklist de la guía mantiene los roles de tabla y en móvil muestra las etiquetas «Aceptable / Cuidado»;
  - `prefers-reduced-motion` desactiva el zoom.

### Pendiente
- ~~**Publicar (`/vender/publicar`):** el flujo pide verificar el teléfono.~~ Hecho: desde la fase E la cuenta se confirma con el email al final. El rediseño del asistente está en §8.
- **Asistente:** faltan las siluetas en las opciones de «tabla actual». No se han hecho para no tocar la lógica del wizard.
- **Fichas de tienda:** siguen con fotos de stock (datos DEMO). Con datos reales, cada tienda sube la suya; si no lo hace, se usa `tablas-alquiler`.
- **Anuncios DEMO:** siguen con fotos de Unsplash en remoto. Solo afecta a los datos de demostración.
- **Fotos propias:** cuando haya fotos de la comunidad o encargadas, se sustituyen en `scripts/photos.mjs` sin tocar componentes.

## 7. Segunda revisión: buscador de la home, copy y cabecera (2026-10)
### Buscador de la home (escritorio)
| Problema | Cambio |
|---|---|
| Ubicación, Litros y Tipo abrían el mismo modal centrado con todo, que tapaba el hero | Un panel por segmento bajo la barra, con el recuento en directo en el botón amarillo |
| «Sé los litros» parecía seleccionado y no hacía nada | Eliminado. Rangos con su uso orientativo (para unos 75 kg, los mismos ejemplos que la calculadora) y enlace a calcularlos |
| «Cerca de ti · Gran Canaria» prometía una ubicación que no conocemos | «Zona» con el nombre; zonas agrupadas (Canarias / Península) con su número de tablas y «Toda España» |
| Tipos solo en texto | Siluetas con pista breve, selección múltiple |
| «Buscar 0 tablas» | «Ver alternativas» (lleva al estado vacío con sugerencias) y «Buscar 1 tabla» |
| Móvil: al escribir en Mínimo/Máximo el foco saltaba al botón de cerrar en cada tecla (efecto que se reejecutaba en cada render) | Corregido, con test e2e |

En `/buscar`, las etiquetas son las mismas (Zona, Litros, Tipo de tabla), los chips de litros van en 2 × 2 y el deslizador de precio pasa de barra petróleo maciza a pista fina turquesa.

### Copy
| Antes | Después |
|---|---|
| Kicker del hero «Tu próxima tabla ya existe» (repetido en el cierre y en el footer) | «Compraventa entre surfistas · España». El footer ya no repite el lema |
| «Reboard es el sitio donde encontrar la tabla. El trato es entre tú y quien la vende.» | «Reboard te ayuda a encontrar la tabla; el trato es directo entre tú y quien la vende.» |
| «Sin intermediarios ni comisiones: Reboard no cobra nada.» | «Un mensaje de WhatsApp o una llamada, sin intermediarios. Reboard no cobra comisión.» |
| «Pruébala y paga al recogerla» · «Quedad en un sitio público…» | «Mírala en persona y paga al recogerla» · «Queda en un sitio público…» |
| «La que tienes parada, también es la de alguien.» | «Y la que tienes parada, alguien la está buscando.» |

### Cabecera
| Antes | Después |
|---|---|
| Comprar tablas · ¿Qué tabla necesito? · Guías · buscador · Guardado · N · Entrar · Vender gratis | Explorar tablas · TablaFinder · Guías · ♡ · usuario · Publicar tabla |
| Activo con bloque de fondo | Texto turquesa + subrayado de 2 px y `aria-current` |
| «Guardado · 0» siempre visible | Corazón; contador solo con guardadas; tooltip y nombre accesible |
| «Entrar» en texto (solo con cuentas) | Icono de usuario; con sesión, inicial y menú (Mis anuncios, Guardadas, Mi cuenta, Salir) |
| Móvil: buscar + corazón + menú; el menú repetía todo en una lista larga | Corazón + usuario + menú; secciones principales destacadas y «Publicar tabla» fijo al pie |

- **Validado:** 375, 768, 1024 y 1440 px, sin desbordamiento y con la cabecera de 64 px; estado activo, hover, tooltip y foco de teclado.
- **Menú de cuenta:** probado con una sesión real en Supabase local.
- **Tests e2e:** textos, rutas, `aria-current`, contador y menú móvil (Escape devuelve el foco).
- **TablaFinder:** es el nombre de la herramienta en la navegación. La URL `/calculadora-litros`, su título y su H1 («¿Qué tabla necesito?») no cambian, para no perder SEO.

## 8. Publicar: rediseño del asistente
Ruta: `/vender/publicar`. Código: `src/components/publish/` (`PublishFlow` orquesta; un componente por paso, más `LivePreview` y `DoneScreen`). La lógica no cambia: publicación, validación, borrador en IndexedDB, acceso con código por email, procesado de fotos, edición (`?editar=`), demo/real y reintento sin duplicar (`createdId`).

### Problemas encontrados
- **Parecía un formulario administrativo:** el título «VENDE TU TABLA» se repetía en cada paso y el progreso usaba 5 barras con etiqueta (unos 80 px solo de navegación).
- **Escritorio:** una columna de 760 px con dos o tres campos y mucho espacio vacío; no se veía el anuncio hasta el último paso.
- **Botones desproporcionados:** «Continuar» ocupaba todo el ancho en escritorio, y «Hacer foto», en petróleo de 56 px, competía con él.
- **Fotos:** no se distinguía la portada (solo la etiqueta «cubierta»); las flechas de ordenar medían 32 px.
- **Pasos desequilibrados:** el paso 3 mezclaba forma, construcción y estado en chips iguales, y el paso 4 tenía precio, zona en un `<select>`, localidad, contacto y descripción. El teléfono aparecía por sorpresa en la revisión.
- **Estado:** cuatro chips sin explicación; no quedaba claro qué diferencia hay entre «muy buen estado» y «buen estado».
- **Revisión:** solo la tarjeta y el teléfono; para corregir algo había que retroceder paso a paso.
- **Errores:** el botón gris solo mostraba un toast que desaparecía. Al guardar el borrador no había ninguna señal.

### Decisiones
- **Progreso compacto:** «PASO 2 DE 5 · La tabla», con 5 segmentos finos (los anteriores son pulsables y tienen un área táctil de 44 px) y «✓ Borrador guardado» cuando IndexedDB confirma la escritura.
- **Un titular natural por paso:** Barlow Condensed en mayúsculas, 42 / 32 px, con una línea de contexto debajo.
- **Escritorio (≥ 1024 px):** el formulario va en una tarjeta blanca y, al lado, una columna de 320 px con la **vista previa en vivo**, fija al hacer scroll. Muestra la portada, el precio, el título, los litros, el tipo, la zona y el estado. Sin fotos, enseña la silueta de la forma elegida (`BoardShape`), nunca una foto de stock. «Atrás» va a la izquierda y «Continuar» a la derecha (220 px).
- **Móvil:** una columna sin tarjeta envolvente y la barra Atrás / Continuar fija abajo (los campos enfocados dejan 110 px de margen para que no los tape). En los pasos 2–4, la vista previa se resume en una línea plegable (miniatura, título y precio · «Ver»); en la revisión va completa arriba.
- **Paso 1:** sin fotos, una zona de carga con «Hacer foto» y «Elegir de la galería» (y arrastrar en escritorio). Con fotos, una cuadrícula con la portada a doble tamaño, borde turquesa y la etiqueta «Portada». Las demás llevan su número, ✕ para quitarlas y flechas de 44 px; en la segunda foto, la flecha se anuncia «Usar la foto 2 como portada». Los huecos sugeridos («Fondo», «Cola y quillas», «Golpes o reparaciones») son botones para añadir foto.
- **Paso 2:** marca → modelo → medida, como antes, pero el pegado de medidas queda dentro del bloque «Medidas». El tipo de tabla va con silueta y la construcción en chips. Se mantienen las etiquetas de origen (catálogo / automática / confirmada) y «Confirmar».
- **Paso 3:** 4 tarjetas con un medidor de 4 niveles y una explicación; debajo, reparaciones y «Algo más que contar» (antes, la descripción del paso 4).
- **Paso 4:** el precio es el protagonista (80 px, cifra condensada y «€»). La referencia de precios del mismo modelo se mantiene; si no hay, se lee «Sin comisiones: lo que pongas es lo que cobras». Zonas en chips agrupados por Canarias y Península; localidad con `datalist` y chips con las localidades de la zona (si cambias de zona, se borra la sugerencia anterior). Selector WhatsApp / Llamada y el teléfono, que se explica como privado.
- **Paso 5:** vista previa, aviso de datos sin confirmar con el enlace «Revisar medidas» y un resumen por secciones, cada una con «Editar». Al editar, el botón principal pasa a «Volver a revisar» y no se pierde nada. Un bloque «Publicar tu anuncio» explica qué pasa: en real, búsquedas, privacidad del teléfono y caducidad; en demo, que no se publica nada. Si no hay sesión, aparece «Último paso: confirma tu email» con el `LoginForm` incrustado; si la hay, Turnstile y «Publicar gratis».
- **Validación por paso:** el mensaje aparece en la barra inferior (`role="alert"`, tinte de error) en lugar de un toast. El teléfono ya se valida en el paso 4.
- **Accesibilidad:**
  - `aria-pressed` en chips, tarjetas de estado, tipos, zonas, localidades, unidades y contacto;
  - etiquetas visibles en todos los campos;
  - foco en el titular al cambiar de paso, con scroll instantáneo arriba;
  - áreas táctiles de 44 px;
  - texto secundario en #4A6670;
  - amarillo solo en «Continuar», «Revisar anuncio» y «Publicar gratis».

### Copy (antes → después)
| Dónde | Antes | Después |
|---|---|---|
| Titular, todos los pasos | «Vende tu tabla» | Paso 1 «Enséñanos tu tabla» · 2 «Cuéntanos qué tabla es» · 3 «¿En qué estado está?» · 4 «¿Por cuánto la vendes?» · 5 «Así quedará tu anuncio» (al editar, «Revisa los cambios») |
| Subtítulos | «Fotos de la tabla», «¿Qué tabla es?», «Tipo y estado», «Precio, ubicación y contacto», «Revisa y publica» | Una línea de contexto por paso, p. ej. «Marca, medidas y tipo: así te encuentra quien busca por litros.» |
| Fotos, vacío | Huecos discontinuos y dos botones | «Añade hasta 8 fotos» + qué fotografiar + «o arrastra aquí las fotos desde tu ordenador» |
| Fotos, ayuda | «La primera es la portada» dentro de un párrafo largo | Etiqueta «Portada» en la foto y «Usa las flechas para ordenarlas: la primera es la portada.» |
| Medidas | «¿Tienes las medidas escritas? Pégalas» · «Interpretar» | «¿Las tienes escritas en la tabla? Cópialas tal cual» · «Rellenar» |
| Medidas, toast | «Hemos interpretado las medidas…» | «Medidas rellenadas. Revísalas y confírmalas.» |
| Medidas, sin origen | «Opcional, pero ayuda a que te encuentren» bajo cada campo | Nada bajo cada campo; si faltan los litros: «Los litros son opcionales, pero sin ellos tu tabla sale en menos búsquedas.» |
| Volumen | «Volumen (L)» | «Litros» |
| Estado | Chips «Como nueva», «Muy buen estado»… | Tarjetas: «Sin golpes ni reparaciones. Apenas se ha usado.» · «Marcas de uso leves, como presiones en la cubierta. Sin reparaciones importantes.» · «Marcas visibles o algún golpe ya reparado. Lista para surfear.» · «Reparaciones importantes o algún golpe que necesita arreglo.» |
| Reparaciones | «Reparaciones o golpes (si los hay)» | «Golpes o reparaciones · si los hay» (con «Buen estado» o «Con reparaciones»: «¿Qué golpes o reparaciones tiene?») |
| Descripción | «Descripción · opcional» | «Algo más que contar · opcional»: «En qué olas funciona, si lleva quillas o funda, por qué la vendes…» |
| Localidad | «Solo mostramos la localidad, nunca una dirección exacta.» | «Solo mostramos la localidad, nunca tu dirección.» |
| Teléfono | En la revisión: «Tu teléfono de contacto» | En el paso 4: «Tu teléfono». «Es privado: no aparece en el anuncio. Solo lo ve quien pulsa «Mostrar contacto», con protección contra robots.» |
| Errores al continuar | Toast «Indica un precio y la localidad» | Mensaje fijo y concreto: «Pon un precio para continuar.» · «Indica la localidad donde está la tabla.» · «Elige el tipo de tabla.»… |
| Datos sin confirmar | «Tienes N datos sin confirmar. Los del catálogo…» (también con medidas pegadas) | Distingue catálogo de rellenado automático + enlace «Revisar medidas» |
| Acceso | «Confirma tu email para publicar» | «Último paso: confirma tu email» |
| Demo | «DEMO No se guarda el número ni se publica nada.» | «DEMO Esto es una demostración: al pulsar no se publica nada, no se guarda tu número y las fotos no salen de tu dispositivo.» |

### Validación
- **Capturas:** antes y después de los 5 pasos (y de la pantalla final) a 1440 y 375 px; después, también a 768 px y en la edición (`?editar=a1040`). No se versionan. Sin scroll horizontal ni errores de consola o de hidratación.
- **Tests e2e nuevos (modo mock):**
  - los 5 pasos en escritorio, con la vista previa en vivo;
  - los 5 pasos en móvil, sin desbordamiento;
  - ordenar y quitar fotos, con la portada;
  - editar una sección desde la revisión sin perder datos;
  - recuperar el borrador al recargar y «Empezar de cero».
- El test de EXIF y GPS sigue pasando.

### Decisión del usuario: estados de la tabla
- El usuario mencionó «nuevas, seminuevas, en buen estado, con marcas de uso o que necesiten reparación». **Decidió mantener solo los 4 valores existentes** del enum `board_condition`: `como-nueva`, `muy-buen-estado`, `buen-estado` y `con-reparaciones`.
- No hay migración ni valores nuevos. Los matices («marcas de uso», «necesita arreglo») se cubren con la explicación de cada tarjeta y el campo de reparaciones.

### Pendiente
- **Modo real:** el recorrido con Supabase (acceso con código, Turnstile, subida y reintento) no se ha vuelto a probar a mano tras el rediseño. La lógica no ha cambiado, solo dónde se muestra.
- **Arrastrar para ordenar fotos:** no está implementado (exigiría una librería o bastante código táctil propio); de momento se ordena con flechas.
