// DATOS SIMULADOS de Reboard (demo). No representan anuncios, tiendas ni precios reales.
// Extraídos literalmente del prototipo para reutilizarlos como seed/fixtures.
// Las tiendas, vendedores y direcciones son ficticios. Las fotos son de stock (Unsplash).


const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const ago=d=>d===0?'hoy':d===1?'ayer':`hace ${d} días`;
const eur=n=>Number(n).toLocaleString('es-ES')+' €';
const fmtIn=x=>{const w=Math.floor(x),fr=x-w;const F=[[0,''],[.125,' 1/8'],[.25,' 1/4'],[.375,' 3/8'],[.5,' 1/2'],[.625,' 5/8'],[.75,' 3/4'],[.875,' 7/8'],[1,'']];let b=F[0];F.forEach(f=>{if(Math.abs(fr-f[0])<Math.abs(fr-b[0]))b=f});return (b[0]===1?w+1:w)+b[1]+'"'};
const ftLabel=i=>`${Math.floor(i/12)}'${i%12}"`;
const ZONES=[
 {k:'gran-canaria',n:'Gran Canaria',towns:['Las Palmas de G.C.','Gáldar','Telde','Arucas'],w:22},
 {k:'tenerife',n:'Tenerife',towns:['Santa Cruz de Tenerife','Las Américas','El Médano'],w:16},
 {k:'lanzarote',n:'Lanzarote',towns:['Famara','Arrecife'],w:6},
 {k:'fuerteventura',n:'Fuerteventura',towns:['Corralejo','El Cotillo'],w:7},
 {k:'asturias',n:'Asturias',towns:['Gijón','Salinas','Rodiles'],w:12},
 {k:'cantabria',n:'Cantabria',towns:['Somo','Santander','Liencres'],w:11},
 {k:'galicia',n:'Galicia',towns:['A Coruña','Razo','Pantín'],w:8},
 {k:'pais-vasco',n:'País Vasco',towns:['Zarautz','Mundaka','Sopelana'],w:12},
 {k:'cadiz',n:'Cádiz',towns:['El Palmar','Tarifa','Conil'],w:10}];
const U=id=>`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;
const BOARDS=['1531722569936-825d3dd91b15','1621951289270-b942dc5f4320','1632334738554-95c79fb27eb7','1703159453462-8a2d2866afaf','1586996292898-71f4036c4e07','1544840494-d0e48b117320','1632299768491-51d27b80d088','1537519646099-335112f03225','1761435139247-e044088c2c3e','1761347465188-0ff91dfee062','1767167838805-78929dab5052'];
const LIFE={walk:'1543616260-4cd60315436d',float:'1455729552865-3658a5d39692',surf:'1551524358-f34c0214781d',surf2:'1523606772308-64a28db0ef2c',rack:'1761435139247-e044088c2c3e',row:'1767167838805-78929dab5052'};
const SHOPS=[{n:'Marea Boards',slug:'marea-boards',t:'Tienda',zone:'gran-canaria',town:'Las Palmas de G.C.',addr:'C/ Secretario Padilla, Las Palmas (demo)',hours:'L–S · 10:00–14:00 y 17:00–20:30',img:'1761435139247-e044088c2c3e',feed:'Feed autorizado'},{n:'Escuela Playa Chica',slug:'escuela-playa-chica',t:'Escuela',zone:'gran-canaria',town:'Telde',addr:'Paseo de la playa, Telde (demo)',hours:'Todos los días · 9:00–18:00',img:'1761347465188-0ff91dfee062',feed:'Carga asistida'},{n:'Norte Surf Shop',slug:'norte-surf-shop',t:'Tienda',zone:'tenerife',town:'Santa Cruz de Tenerife',addr:'Av. Anaga, Santa Cruz (demo)',hours:'L–V · 10:00–20:00 · S 10:00–14:00',img:'1586996292898-71f4036c4e07',feed:'CSV semanal'},{n:'Barlovento Surf',slug:'barlovento-surf',t:'Tienda',zone:'lanzarote',town:'Famara',addr:'Urb. Famara (demo)',hours:'Todos los días · 10:00–19:00',img:'1632299768491-51d27b80d088',feed:'Carga asistida'},{n:'Escuela Ola Brava',slug:'escuela-ola-brava',t:'Escuela',zone:'asturias',town:'Salinas',addr:'Playa de Salinas (demo)',hours:'Mar–Oct · 9:00–19:00',img:'1767167838805-78929dab5052',feed:'CSV'}];
const ZN=Object.fromEntries(ZONES.map(z=>[z.k,z]));
const MD=(b,m,slug,type,cons,sizes,desc)=>({b,m,slug,type,cons,sizes,desc});
const MODELS=[
 MD('Torq','Fun TET','fun-tet','Evolutiva','Epoxy / EPS',[["6'8\"",80,21.25,2.75,42],["7'2\"",86,21.5,2.875,47],["7'6\"",90,22,3,54],["8'0\"",96,22.5,3.125,62]],'Evolutiva en construcción TET (epoxy moldeado). Pensada para dar el salto desde la softboard: mucha estabilidad, remada fácil y resistente a los golpes.'),
 MD('Torq','PG-R','pg-r','Shortboard','Epoxy / EPS',[["5'10\"",70,19.25,2.375,28.5],["6'0\"",72,19.5,2.5,30.4],["6'2\"",74,19.75,2.56,32.6]],'Shortboard de rendimiento para olas con fuerza.'),
 MD('Torq','Mod Fish','mod-fish','Fish','Epoxy / EPS',[["5'11\"",71,21,2.5,35],["6'3\"",75,21.5,2.625,39]],'Fish de cola swallow para olas pequeñas y medianas.'),
 MD('Torq','Longboard','longboard','Longboard','Epoxy / EPS',[["9'0\"",108,22.75,2.875,68]],'Longboard clásico en construcción TET.'),
 MD('NSP','Elements Funboard','elements-funboard','Evolutiva','Epoxy / EPS',[["7'0\"",84,21.5,2.75,47],["7'6\"",90,22,2.875,55]]),
 MD('NSP','Elements Longboard','elements-longboard','Longboard','Epoxy / EPS',[["9'0\"",108,23,3,75]]),
 MD('Softech','Roller','roller','Evolutiva','Softboard',[["7'0\"",84,22,3.125,60],["8'0\"",96,22.75,3.25,72]]),
 MD('Softech','Mason Twin','mason-twin','Fish','Softboard',[["5'6\"",66,21,2.625,38],["6'0\"",72,21.5,2.75,42]]),
 MD('Firewire','Seaside','seaside','Fish','Epoxy / EPS',[["5'6\"",66,21.25,2.5,32],["5'10\"",70,22,2.625,37]]),
 MD('Lost','Puddle Jumper','puddle-jumper','Híbrida','PU / Poliéster',[["5'6\"",66,21,2.5,32],["5'10\"",70,21.5,2.625,36]]),
 MD('Channel Islands','Happy Everyday','happy-everyday','Híbrida','PU / Poliéster',[["5'10\"",70,19.75,2.5,31],["6'0\"",72,20,2.56,33]]),
 MD('Channel Islands','CI Mid','ci-mid','Midlength','PU / Poliéster',[["6'10\"",82,21,2.75,44],["7'2\"",86,21.5,2.875,48]]),
 MD('Pukas','Tasty Treat','tasty-treat','Shortboard','PU / Poliéster',[["5'11\"",71,19.5,2.44,29],["6'1\"",73,19.75,2.5,31]]),
 MD(null,null,'a1','Evolutiva','PU / Poliéster',[["7'4\"",88,22,2.875,52]]),
 MD(null,null,'a2','Shortboard','PU / Poliéster',[["6'1\"",73,19.5,2.44,30]]),
 MD(null,null,'a3','Gun / Step-up','PU / Poliéster',[["7'6\"",90,19.75,2.875,41]]),
 MD(null,null,'a4','Longboard','PU / Poliéster',[["9'2\"",110,23,3,72]]),
 MD(null,null,'a5','Midlength','PU / Poliéster',[["7'0\"",84,21,2.75,45]])];
const TYPES=['Shortboard','Fish','Híbrida','Evolutiva','Midlength','Longboard','Gun / Step-up'];
const PLURAL={'Shortboard':'Shortboards','Fish':'Fish','Híbrida':'Híbridas','Evolutiva':'Evolutivas','Midlength':'Midlengths','Longboard':'Longboards','Gun / Step-up':'Guns y step-ups'};
const CONS=['PU / Poliéster','Epoxy / EPS','Softboard'];
const CSH={'PU / Poliéster':'PU','Epoxy / EPS':'Epoxy','Softboard':'Softboard'};
const CONDS=['Como nueva','Muy buen estado','Buen estado','Con reparaciones'];
const SELLERS=['Particular','Tienda','Escuela'];
const LEVELS=['Iniciación','Intermedio bajo','Intermedio','Avanzado'];
const LENS=[66,68,70,72,74,76,78,80,82,84,86,88,90,94,96,102,108,114];
const NOBRAND='Shaper local / sin marca';
const PRO=['Norte Surf Shop','Marea Boards','Escuela Ola Brava','Barlovento Surf'];
const EF=()=>({zone:'',dist:'',volMin:'',volMax:'',lenMin:'',lenMax:'',types:[],cons:[],priceMin:'',priceMax:'',brand:'',model:'',cond:[],seller:[],noRepairs:false,onlyMe:false,fins:'',widthMin:'',thickMin:'',acc:false});
const REC={'Iniciación':[0.85,1.05,['Softboard evolutiva','Evolutiva','Longboard'],"7'6\"–9'0\""],'Intermedio bajo':[0.6,0.78,['Evolutiva','Midlength','Fish'],"7'0\"–8'0\""],'Intermedio':[0.46,0.58,['Híbrida','Fish','Midlength'],"6'0\"–7'2\""],'Avanzado':[0.36,0.44,['Shortboard','Híbrida','Fish'],"5'8\"–6'4\""]};
const WZ0=()=>({step:1,w:'',hgt:'',lvl:null,cur:null,curLen:'',curVol:'',freq:null,waves:null,goals:[],zone:'',otherZone:'asturias',budget:'',email:'',tried:false,saved:false});
const WLV=[['learn','Estoy aprendiendo','Practico el take-off y cojo espuma o mis primeras olas verdes.','Iniciación'],['ride','Ya cojo olas por mi cuenta','Me pongo de pie con soltura y empiezo a ir en diagonal por la pared.','Intermedio bajo'],['turn','Hago giros y maniobras','Recorro la pared con control y trabajo bottom turns y cutbacks.','Intermedio'],['pro','Tengo bastante experiencia','Me adapto a distintas condiciones y hago maniobras avanzadas.','Avanzado']];
const WCUR=[['Softboard',''],['Evolutiva',''],['Midlength',''],['Shortboard',''],['Longboard',''],['Otra',''],['No tengo tabla','Empiezo de cero o alquilo']];
const WFQ=[['low','Menos de una vez a la semana','Con menos práctica, algo más de volumen te dará más olas.'],['mid','Una o dos veces por semana','El ritmo habitual: usamos el rango estándar.'],['high','Tres o más veces por semana','Estás en forma: puedes ir algo más ajustado.']];
const WWV=[['small','Pequeñas y suaves','0,5–1 m · olas blandas, orilla y espuma'],['med','Medianas','1–2 m · pared definida y algo de fuerza'],['big','Potentes o grandes','Más de 2 m · olas rápidas o huecas'],['unsure','No estoy seguro','Usaremos un término medio']];
const WGL=[['learn','Aprender y coger más olas'],['soft','Pasar de una softboard a una tabla rígida'],['turns','Mejorar mis giros'],['manio','Conseguir más maniobrabilidad'],['small','Surfear con más facilidad en olas pequeñas'],['calm','Practicar un surf más tranquilo']];
const WQ=[['¿Cuánto pesas?','El peso es el dato que más influye en el volumen que necesitas. Solo lo usamos para calcular.'],['¿Cuál es tu nivel?','Sé sincero: un poco más de volumen te hará progresar más rápido.'],['¿Qué tabla usas ahora?','Nos ayuda a entender de dónde vienes, para no proponerte un salto demasiado brusco.'],['¿Con qué frecuencia surfeas?','Quien surfea poco agradece más volumen. Con más práctica puedes ajustar.'],['¿Qué olas sueles surfear?','Las olas pequeñas piden más volumen y superficie; las potentes, más control.'],['¿Qué quieres conseguir?','Puedes elegir más de una opción.'],['¿Dónde buscas y cuánto quieres gastar?','Lo usamos para enseñarte anuncios. No cambia la recomendación técnica.']];
const TINFO={'Softboard':['Máxima estabilidad y seguridad mientras aprendes.','Se queda corta cuando empiezas a ir por la pared.',"7'0\"–8'6\"",'1537519646099-335112f03225'],'Evolutiva':['Rígida, con mucho volumen y remada fácil: el paso natural después de la softboard.','Menos ágil en olas potentes.',"7'0\"–8'0\"",'1621951289270-b942dc5f4320'],'Longboard':['Coge olas muy pequeñas y es muy estable.','Pesada, y cuesta más pasar la rompiente y transportarla.',"9'0\"–9'6\"",'1703159453462-8a2d2866afaf'],'Midlength':['Deslizamiento y remada con un surf fluido y tranquilo.','Menos reactiva en giros cerrados.',"6'10\"–7'10\"",'1531722569936-825d3dd91b15'],'Fish':['Corta y ancha: rápida y divertida en olas pequeñas y medianas.','Puede costar en olas grandes y huecas.',"5'6\"–6'4\"",'1544840494-d0e48b117320'],'Híbrida':['Equilibrio entre facilidad y rendimiento para progresar en maniobras.','Exige ya cierta técnica.',"5'8\"–6'6\"",'1632334738554-95c79fb27eb7'],'Shortboard':['Máxima respuesta en olas con fuerza.','Poco volumen: penaliza mucho en olas pequeñas.',"5'8\"–6'4\"",'1632299768491-51d27b80d088']};
const PUB0=()=>({step:1,photos:0,brand:'',model:'',size:'',len:'',width:'',thick:'',vol:'',src:{},paste:'',type:'',cons:'',cond:'',repairs:'',fins:'',price:'',zone:'gran-canaria',town:'',contact:'WhatsApp',desc:'',phone:'',done:false,unit:'ft'});
const HAND=[
 {mi:0,si:1,zone:'gran-canaria',town:0,km:2,price:190,cond:'Muy buen estado',seller:'Particular',sname:'Daniel',conf:2,post:0,volSrc:'vendedor',acc:'Funda y quillas'},
 {mi:6,si:0,zone:'gran-canaria',town:2,km:14,price:160,cond:'Buen estado',seller:'Escuela',sname:'Escuela Playa Chica',conf:1,post:1,volSrc:'fabricante'},
 {mi:13,si:0,zone:'gran-canaria',town:1,km:26,price:150,cond:'Con reparaciones',seller:'Particular',sname:'Iván',conf:4,post:2,vol:null,fins:null,repairs:'Golpe en el canto derecho reparado con resina y lijado. Estanco, sin entrada de agua.'},
 {mi:1,si:1,zone:'asturias',town:0,km:3,price:280,cond:'Muy buen estado',seller:'Particular',sname:'Marta',conf:3,post:2,volSrc:'fabricante'},
 {mi:2,si:1,zone:'tenerife',town:0,km:4,price:260,cond:'Como nueva',seller:'Tienda',sname:'Norte Surf Shop',conf:0,post:1,volSrc:'fabricante'},
 {mi:4,si:1,zone:'gran-canaria',town:0,km:5,price:210,old:240,cond:'Buen estado',seller:'Tienda',sname:'Marea Boards',conf:1,post:3,volSrc:'fabricante'},
 {mi:11,si:1,zone:'lanzarote',town:0,km:8,price:420,cond:'Muy buen estado',seller:'Particular',sname:'Óscar',conf:6,post:4,volSrc:'vendedor'},
 {mi:9,si:1,zone:'cantabria',town:0,km:2,price:300,cond:'Buen estado',seller:'Particular',sname:'Lucía',conf:18,post:9,volSrc:'vendedor'},
 {mi:8,si:0,zone:'gran-canaria',town:0,km:3,price:240,cond:'Muy buen estado',seller:'Particular',sname:'Alba',conf:5,post:6,volSrc:'fabricante',status:'Vendida'}];
const FIX20=['gran-canaria','tenerife','tenerife','tenerife','fuerteventura','fuerteventura','lanzarote','asturias','cadiz','galicia','gran-canaria','cantabria'];
const BASEP={'Shortboard':290,'Fish':260,'Híbrida':290,'Evolutiva':230,'Midlength':340,'Longboard':380,'Gun / Step-up':330};
function mk(h,i){const m=MODELS[h.mi],s=m.sizes[h.si],z=ZN[h.zone];const vol='vol' in h?h.vol:s[4];
 return {id:'a'+(1040+i*7),i,brand:m.b,model:m.m,mslug:m.slug,mi:h.mi,si:h.si,size:s[0],lenIn:s[1],width:s[2],thick:s[3],vol,volSrc:vol==null?null:(h.volSrc||'vendedor'),dimSrc:m.b?'fabricante':'vendedor',type:m.type,cons:m.cons,zone:h.zone,zoneName:z.n,town:z.towns[h.town%z.towns.length],km:h.km,price:h.price,old:h.old||null,cond:h.cond,repairs:h.repairs||(h.cond==='Con reparaciones'?'Pequeña reparación en la cola, sellada.':''),seller:h.seller,sname:h.sname||'Particular',conf:h.conf,post:h.post,status:h.status||(h.conf>14?'Pendiente':'Disponible'),fins:'fins' in h?h.fins:(m.cons==='Softboard'?'Quillas blandas · Thruster':'FCS II · Thruster'),photos:3+(i%4),acc:h.acc||'',img:(i*5+h.mi)%BOARDS.length};}
function build(n){const r=rng(11+n);const out=HAND.map((h,i)=>mk(h,i));const tw=ZONES.reduce((a,z)=>a+z.w,0);
 for(let i=0;i<n-8;i++){let zone;if(n===20)zone=FIX20[i];else{let x=r()*tw;zone=ZONES.find(z=>(x-=z.w)<0).k;}
  const mi=Math.floor(r()*MODELS.length),m=MODELS[mi],si=Math.floor(r()*m.sizes.length);
  const cond=CONDS[Math.floor(r()*4)];const sp=r();let seller=sp<.8?'Particular':sp<.94?'Tienda':'Escuela';const shop=SHOPS.find(s=>s.zone===zone&&s.t===seller);if(!shop)seller='Particular';
  let price=BASEP[m.type]*(m.cons==='Softboard'?.6:1)*({'Como nueva':1.25,'Muy buen estado':1.05,'Buen estado':.9,'Con reparaciones':.7}[cond])*(.8+r()*.45);price=Math.round(price/5)*5;
  const unk=r()<(m.b?.08:.5);const conf=Math.floor(r()*22);
  out.push(mk({mi,si,zone,town:Math.floor(r()*3),km:Math.round(1+r()*45),price,old:r()<.1?price+Math.round(20+r()*40):null,cond,seller,sname:seller==='Particular'?['Pablo','Nerea','Javi','Ainhoa','Carlos','Sara','Unai','Irene'][Math.floor(r()*8)]:shop.n,conf,post:Math.floor(r()*30),...(unk?{vol:null}:{}),volSrc:r()<.5?'fabricante':'vendedor',...(r()<.15?{fins:null}:{})},out.length));}
 return out;}


// Uso: build(20 | 100 | 1000) devuelve el inventario demo determinista (semilla fija).
if (typeof module !== 'undefined') module.exports = { ZONES, MODELS, SHOPS, HAND, TYPES, CONS, CONDS, LEVELS, LENS, REC, WLV, WCUR, WFQ, WWV, WGL, WQ, TINFO, BOARDS, LIFE, build, mk, rng, fmtIn, ftLabel };
