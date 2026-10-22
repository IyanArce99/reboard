// Genera docs/seo/keywords.csv: keywords de REBOARD agrupadas por intención, con la URL objetivo
// provisional y columnas vacías para cruzar con Google Keyword Planner (sin volúmenes inventados).
// Uso: node scripts/seo-keywords.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const ZONES = [
  ["gran-canaria", "gran canaria", ["las palmas", "las palmas de gran canaria"]],
  ["tenerife", "tenerife", ["santa cruz de tenerife"]],
  ["lanzarote", "lanzarote", ["famara"]],
  ["fuerteventura", "fuerteventura", ["corralejo"]],
  ["canarias", "canarias", []],
  ["asturias", "asturias", ["gijon"]],
  ["cantabria", "cantabria", ["santander", "somo"]],
  ["galicia", "galicia", ["a coruña"]],
  ["pais-vasco", "pais vasco", ["euskadi", "bizkaia", "gipuzkoa", "zarautz"]],
  ["cadiz", "cadiz", ["tarifa", "el palmar"]],
];
const FORMS = [
  ["evolutiva", ["tabla evolutiva", "tabla surf evolutiva", "evolutiva surf", "tablas evolutivas"]],
  ["softboard", ["softboard", "tabla de surf de espuma", "tabla surf espuma", "softboard surf"]],
  ["longboard", ["longboard surf", "tabla longboard", "longboard"]],
  ["shortboard", ["shortboard", "tabla shortboard", "tabla surf corta"]],
  ["midlength", ["midlength", "midlength surf", "tabla midlength"]],
  ["fish", ["fish surf", "tabla fish", "tabla surf fish"]],
  ["hibrida", ["tabla hibrida surf", "hibrida surf"]],
  ["gun", ["gun surf", "tabla gun"]],
  ["principiantes", ["tabla surf principiante", "tabla de surf para principiantes", "tabla surf para principiantes", "tabla surf iniciacion"]],
];
const BRANDS = [
  ["torq", ["torq", "torq surf", "tabla torq", "torq segunda mano", "torq mod fun", "torq fun tet"]],
  ["nsp", ["nsp surf", "tabla nsp", "nsp segunda mano", "nsp elements"]],
  ["pukas", ["pukas", "pukas surf", "tabla pukas", "pukas segunda mano"]],
  ["firewire", ["firewire surfboards", "firewire segunda mano", "firewire seaside"]],
  ["lost", ["lost surfboards", "lost puddle jumper", "lost segunda mano"]],
  ["channel-islands", ["channel islands", "channel islands segunda mano", "channel islands happy everyday", "ci mid"]],
  ["softech", ["softech", "softech segunda mano", "softech roller", "softech mason twin"]],
];

const rows = [];
const add = (keyword, cluster, intencion, url, tipo, prioridad, requiere = "", notas = "") =>
  rows.push({ keyword, cluster, intencion, url, tipo, prioridad, requiere, notas });

// 1. Compra general (transaccional): home y /buscar
for (const k of [
  "tablas de surf de segunda mano", "tabla de surf segunda mano", "tablas surf segunda mano", "tabla surf segunda mano",
  "tablas de surf usadas", "tabla de surf usada", "tablas surf usadas", "tabla surf usada", "comprar tabla de surf segunda mano",
  "comprar tabla surf usada", "tablas de surf de ocasion", "tablas surf ocasion", "tablas de surf baratas", "tabla surf barata",
  "tablas surf baratas segunda mano", "surf segunda mano", "material surf segunda mano", "compraventa tablas surf",
  "donde comprar tabla de surf usada", "tablas de surf wallapop", "tabla surf milanuncios",
]) add(k, "Comprar tablas usadas", "transaccional", "/", "home", "alta", "Confirmar keyword principal de la home (title/H1)", k.includes("wallapop") || k.includes("milanuncios") ? "Navegacional de competidor: no perseguir, solo medir" : "");
for (const k of ["comprar tabla de surf", "comprar tabla surf", "tablas de surf", "tabla de surf", "tabla surf", "tablas surf"])
  add(k, "Comprar tablas usadas", "comercial (mixta nuevo/usado)", "/", "home", "media", "Ver si la SERP es de tiendas de nuevo; si lo es, no apuntar la home");

// 2. Vender (transaccional vendedor): /vender
for (const k of ["vender tabla de surf", "vender tabla surf", "vender tabla de surf usada", "donde vender tabla de surf", "cuanto vale mi tabla de surf", "precio tabla surf segunda mano", "tasar tabla de surf"])
  add(k, "Vender tablas usadas", k.startsWith("precio") || k.startsWith("cuanto") || k.startsWith("tasar") ? "informacional-comercial" : "transaccional", "/vender", "landing vender", k.startsWith("vender") || k.startsWith("donde") ? "alta" : "media", k.startsWith("vender") ? "" : "Decidir si merece una guía de precio de tablas usadas");

// 3. Tipos (transaccional): /tablas/{tipo}
for (const [slug, kws] of FORMS)
  for (const base of kws) {
    add(`${base} segunda mano`, "Tipos de tabla", "transaccional", `/tablas/${slug}`, "landing tipo", "alta");
    add(`${base} usada`, "Tipos de tabla", "transaccional", `/tablas/${slug}`, "landing tipo", "media");
  }
add("mini malibu segunda mano", "Tipos de tabla", "transaccional", "/tablas/longboard", "landing tipo", "media", "Decidir si «mini malibu» merece landing propia (hoy no es una forma de la taxonomía)", "Hoy encaja entre evolutiva y midlength; no crear slug sin datos");
add("mini malibu", "Tipos de tabla", "informacional", "/tablas/evolutiva", "landing tipo", "baja", "Ídem");
add("funboard surf", "Tipos de tabla", "transaccional", "/tablas/evolutiva", "landing tipo", "media", "Sinónimo de evolutiva: medir antes de usarlo en titles");

// 4. Geográficas: /tablas/{zona} y /tablas/{zona}/{tipo}
for (const [slug, name, alias] of ZONES) {
  for (const q of [`tablas surf segunda mano ${name}`, `tabla surf segunda mano ${name}`, `tablas de surf ${name}`, `tablas de surf usadas ${name}`])
    add(q, "Ubicaciones", "transaccional local", `/tablas/${slug}`, "landing zona", ["gran-canaria", "tenerife", "canarias"].includes(slug) ? "alta" : "media", "Indexable si hay inventario (src/lib/search/indexing.ts)");
  for (const a of alias) add(`tablas surf segunda mano ${a}`, "Ubicaciones", "transaccional local", `/tablas/${slug}`, "landing zona", "media", "Ciudad/comarca: sin landing propia (la ubicación es por isla o provincia)");
  for (const f of ["evolutiva", "softboard", "longboard"])
    add(`tabla ${f === "softboard" ? "surf espuma" : `surf ${f}`} segunda mano ${name}`, "Ubicaciones", "transaccional local", `/tablas/${slug}/${f}`, "landing zona+tipo", "baja", "Indexable con ≥3 anuncios; validar demanda");
}
for (const k of ["tienda surf gran canaria", "tienda surf tenerife", "surf shop las palmas", "tienda de surf lanzarote", "escuela de surf gran canaria"])
  add(k, "Tiendas y escuelas", "local (navegacional)", "/tiendas", "directorio", "baja", "Solo cuando haya tiendas reales en el directorio");

// 5. Litros, medidas y elección (informacional → herramienta): /calculadora-litros y guías
const TOOL = [
  ["calculadora litros tabla surf", "alta"], ["calculadora litros surf", "alta"], ["calculadora volumen tabla surf", "alta"],
  ["cuantos litros necesito tabla surf", "alta"], ["cuantos litros tabla surf", "alta"], ["litros tabla surf", "alta"],
  ["litros tabla surf segun peso", "alta"], ["tabla surf segun peso", "alta"], ["que tabla de surf necesito", "alta"],
  ["que tabla de surf comprar", "alta"], ["que tabla surf comprar principiante", "media"], ["volumen tabla surf", "media"],
  ["tabla surf 50 litros", "baja"], ["tabla surf 40 litros", "baja"], ["tabla surf 60 litros", "baja"],
];
for (const [k, p] of TOOL) add(k, "Litros y medidas", "informacional (herramienta)", "/calculadora-litros", "herramienta", p, k.includes("litros") && /\d/.test(k) ? "Decidir si merecen landing por volumen (hoy: no; filtro en /buscar)" : "Nombre de la herramienta en title/H1");
for (const k of ["medidas tabla surf", "medidas tablas de surf", "como leer medidas tabla surf", "tamaño tabla surf", "tabla surf 7 pies", "tabla surf 7 2", "tabla surf 8 pies", "tabla surf 9 pies"])
  add(k, "Litros y medidas", "informacional", "/guias (pendiente: guía de medidas)", "guía", k.match(/\d/) ? "baja" : "media", "Crear guía «Cómo leer las medidas de una tabla» si hay demanda");
for (const k of ["como elegir tabla de surf", "primera tabla de surf", "primera tabla rigida surf", "que tabla comprar despues de la softboard", "diferencias shortboard y evolutiva", "evolutiva o midlength", "fish o evolutiva", "longboard o evolutiva"])
  add(k, "Elegir tabla según nivel", "informacional", k.includes("softboard") || k.includes("rigida") ? "/guias/que-tabla-comprar-despues-de-una-softboard" : "/guias (pendiente)", "guía", k.includes("softboard") || k.includes("primera") ? "alta" : "media", "Escribir la guía pendiente; comparativas solo si hay demanda");

// 6. Comprar con criterio, construcción, quillas y reparaciones (informacional): guías
for (const k of ["que revisar al comprar tabla de surf usada", "como comprar tabla de surf segunda mano", "tabla surf usada que mirar", "comprar tabla surf wallapop consejos"])
  add(k, "Comprar con criterio", "informacional", "/guias/que-revisar-al-comprar-una-tabla-usada", "guía", "alta");
for (const k of ["tabla surf pu o epoxy", "diferencia pu epoxy surf", "tabla surf epoxy", "tabla surf tet", "construccion tabla surf"])
  add(k, "Construcción y materiales", "informacional", "/guias (pendiente)", "guía", "baja", "Guía de construcción solo si hay demanda");
for (const k of ["quillas surf", "quillas fcs ii", "quillas futures", "thruster o quad", "tipos de quillas surf"])
  add(k, "Quillas", "informacional", "/guias (pendiente)", "guía", "baja", "Probablemente dominado por tiendas: medir antes");
for (const k of ["reparar tabla surf", "reparacion tabla surf", "golpe tabla surf entra agua", "kit reparacion tabla surf"])
  add(k, "Reparaciones y mantenimiento", "informacional", "/guias/que-revisar-al-comprar-una-tabla-usada", "guía", "baja", "Ampliar la guía actual con reparaciones si hay demanda");

// 7. Marcas y modelos: /marcas/{marca} y /marcas/{marca}/{modelo}
for (const [slug, kws] of BRANDS)
  for (const k of kws) {
    const model = /mod fun|fun tet|elements|seaside|puddle|happy|ci mid|roller|mason/.test(k);
    add(k, "Marcas y modelos", k.includes("segunda mano") ? "transaccional" : model ? "comercial-informacional" : "navegacional (marca)", model ? `/marcas/${slug}/{modelo}` : `/marcas/${slug}`, model ? "ficha modelo" : "landing marca", k.includes("segunda mano") ? "media" : "baja", model ? "Solo modelos con medidas verificadas del fabricante" : "La marca navegacional la gana su web oficial");
  }
for (const k of ["torq fun tet litros", "torq fun tet medidas", "softech roller medidas", "lost puddle jumper litros", "channel islands happy everyday medidas", "torq opiniones"])
  add(k, "Marcas y modelos", "informacional", "/marcas/{marca}/{modelo}", "ficha modelo", "baja", "Medir; «opiniones» no se cubre (no publicamos reseñas)");

// 8. Inglés (residentes y turistas)
for (const k of ["second hand surfboard spain", "used surfboards spain", "used surfboard gran canaria", "surfboard for sale tenerife", "surfboard for sale lanzarote", "surfboard for sale fuerteventura", "used surfboard canary islands"])
  add(k, "Inglés", "transaccional", "(sin URL: no hay versión en inglés)", "—", "baja", "Decidir si se hace /en para Canarias según demanda");

const header = ["keyword", "cluster", "intencion", "url_objetivo", "tipo_pagina", "prioridad_provisional", "decision_pendiente", "notas", "volumen_mensual_kp", "competencia_kp", "puja_min_kp", "puja_max_kp", "fuente_y_fecha"];
const esc = (v) => (/[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
const seen = new Set();
const unique = rows.filter((r) => !seen.has(r.keyword) && seen.add(r.keyword));
const csv = [header.join(","), ...unique.map((r) => [r.keyword, r.cluster, r.intencion, r.url, r.tipo, r.prioridad, r.requiere, r.notas, "", "", "", "", ""].map(esc).join(","))].join("\n");
mkdirSync("docs/seo", { recursive: true });
writeFileSync("docs/seo/keywords.csv", "﻿" + csv + "\n");
console.log(`docs/seo/keywords.csv: ${unique.length} keywords`);
