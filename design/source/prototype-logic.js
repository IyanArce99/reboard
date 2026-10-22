// Lógica completa del prototipo Reboard, extraída de design/prototype/Reboard.dc.html.
// REFERENCIA: no es código de producción. Todos los datos son SIMULADOS (demo).
// Contiene: datos demo (ZONES, MODELS, SHOPS, HAND), generador de inventario (build),
// filtros (match), recomendador (wzRec), y el estado de cada pantalla (*Vals).
// DCLogic/React los inyecta el runtime del prototipo (support.js).


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

class Component extends DCLogic {
  state={route:'home',vp:'desktop',inv:20,winW:window.innerWidth,here:'gran-canaria',f:EF(),sort:'recent',view:'grid',limit:24,saved:['a1075','a1096'],compare:[],alerts:[{id:1,text:'Evolutivas de 45–60 L, por menos de 200 €, en Gran Canaria',f:{...EF(),types:['Evolutiva'],volMin:'45',volMax:'60',priceMax:'200',zone:'gran-canaria'},on:true}],profile:null,toast:'',cur:'a1040',stOverride:null,contact:false,photo:0,sheet:false,menu:false,mega:false,adv:false,heroMore:false,mini:{w:'75',lvl:'Iniciación'},calc:{w:'75',h:'',lvl:'Iniciación',freq:'1–2 veces por semana',waves:'Pequeñas (0,5–1 m)',goal:'Coger más olas',cur:'',budget:'',zone:''},pub:PUB0(),wz:WZ0(),mine:[],modelSize:1,guardTab:'saved',prev:'home',shop:'marea-boards',panelTab:'activos',own:['a1040','a1054','a1096'],ownSt:{}};
  scrollRef=React.createRef();
  componentDidMount(){this._r=()=>this.setState({winW:window.innerWidth});window.addEventListener('resize',this._r);
    try{const p=JSON.parse(localStorage.getItem('reboard-proto-v1')||'{}');const k={};['route','vp','inv','cur','wz','profile'].forEach(x=>{if(p[x]!=null)k[x]=p[x]});this.setState(k);}catch(e){}}
  componentWillUnmount(){window.removeEventListener('resize',this._r);}
  componentDidUpdate(){const S=this.state;try{localStorage.setItem('reboard-proto-v1',JSON.stringify({route:S.route,vp:S.vp,inv:S.inv,cur:S.cur,wz:S.wz,profile:S.profile}))}catch(e){}}
  listings(){this._c=this._c||{};if(!this._c[this.state.inv])this._c[this.state.inv]=build(this.state.inv);return [...this.state.mine,...this._c[this.state.inv]];}
  active(){return this.listings().filter(l=>l.status==='Disponible'||l.status==='Pendiente');}
  isM(){return this.state.vp==='mobile'||this.state.winW<760;}
  isNarrowHead(){return this.isM()||this.state.winW<1024;}
  top(){const el=this.scrollRef.current;if(el)el.scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}
  go=(route,extra={})=>{this.setState(s=>({route,prev:s.route,mega:false,menu:false,sheet:false,contact:false,...extra}),()=>this.top());};
  toast=(t)=>{this.setState({toast:t});clearTimeout(this._t);this._t=setTimeout(()=>this.setState({toast:''}),2800);};
  setF=(p)=>this.setState(s=>({f:{...s.f,...p},limit:24}));
  togF=(k,v)=>this.setState(s=>{const a=s.f[k];return {f:{...s.f,[k]:a.includes(v)?a.filter(x=>x!==v):[...a,v]},limit:24};});
  rec(w,lvl,freq,waves){w=+w;if(!w||w<30||w>160)return null;const [a,b,types,lens]=REC[lvl];let k=1;
    if(freq==='Menos de 1 vez por semana')k*=1.08;if(freq==='3 o más veces por semana')k*=.95;if(waves==='Pequeñas (0,5–1 m)')k*=1.04;if(waves==='Grandes (más de 2 m)')k*=.92;
    const lo=Math.round(w*a*k),hi=Math.round(w*b*k);return {lo,hi,types,lens,lvl,w};}
  match(l,f,skipVol){const S=this.state;
    if(f.zone&&l.zone!==f.zone)return false;if(f.zone&&f.dist&&l.km>+f.dist)return false;
    if(f.types.length&&!f.types.includes(l.type))return false;if(f.cons.length&&!f.cons.includes(l.cons))return false;
    if(f.priceMax&&l.price>+f.priceMax)return false;if(f.priceMin&&l.price<+f.priceMin)return false;
    if(f.lenMin&&l.lenIn<+f.lenMin)return false;if(f.lenMax&&l.lenIn>+f.lenMax)return false;
    if(f.brand&&(l.brand||NOBRAND)!==f.brand)return false;if(f.model&&l.mslug!==f.model)return false;
    if(f.cond.length&&!f.cond.includes(l.cond))return false;if(f.seller.length&&!f.seller.includes(l.seller))return false;
    if(f.noRepairs&&l.repairs)return false;if(f.acc&&!l.acc)return false;if(f.fins&&!(l.fins||'').includes(f.fins))return false;
    if(f.widthMin&&l.width<+f.widthMin)return false;if(f.thickMin&&l.thick<+f.thickMin)return false;
    if(f.onlyMe&&S.profile&&(l.vol==null||l.vol<S.profile.lo||l.vol>S.profile.hi))return false;
    if(!skipVol&&(f.volMin||f.volMax)){if(l.vol==null)return false;if(f.volMin&&l.vol<+f.volMin)return false;if(f.volMax&&l.vol>+f.volMax)return false;}
    return true;}
  count(f){return this.active().filter(l=>this.match(l,f)).length;}
  title(l){return l.brand?`${l.brand} ${l.model} ${l.size}`:`${l.type} artesanal ${l.size}`;}
  card(l){const S=this.state;const saved=S.saved.includes(l.id),cmp=S.compare.includes(l.id);const fit=!!(S.profile&&l.vol!=null&&l.vol>=S.profile.lo&&l.vol<=S.profile.hi);
    const st=l.status;const off=!(st==='Disponible'||st==='Pendiente');
    return {id:l.id,title:this.title(l),priceText:eur(l.price),hasOld:!!l.old,oldPriceText:l.old?eur(l.old):'',
      specLine:`${l.vol!=null?l.vol+' L':'Litros sin indicar'} · ${l.type==='Gun / Step-up'?'Gun':l.type} · ${CSH[l.cons]}`,
      locText:l.zone===S.here?`${l.town} · ${l.km} km`:`${l.town}, ${l.zoneName}`,cond:l.cond,
      availText:st==='Disponible'?`Disponible · confirmada ${ago(l.conf)}`:st==='Pendiente'?`Pendiente de confirmar · ${ago(l.conf)}`:st,
      availColor:st==='Disponible'?'#1E6A47':st==='Pendiente'?'#C08A2E':'#A23A2C',isOff:off,offText:st,
      pro:l.seller!=='Particular',seller:l.seller,fit,heartFill:saved?'#087E8B':'none',heartColor:saved?'#087E8B':'#102D3B',
      cmpText:cmp?'✓ Comparando':'Comparar',cmpBg:cmp?'#DDF1F0':'#FFFFFF',cmpFg:cmp?'#0A4F57':'#102D3B',cmpBd:cmp?'#087E8B':'#C3D6D5',
      postText:l.post===0?'Publicada hoy':`Publicada ${ago(l.post)}`,
      shapeW:{'Shortboard':'15%','Fish':'21%','Híbrida':'18%','Evolutiva':'23%','Midlength':'19%','Longboard':'20%','Gun / Step-up':'13%'}[l.type],
      photoLabel:`foto · ${this.title(l)}`,kmText:l.zone===S.here?`A ${l.km} km`:l.zoneName,volShort:l.vol!=null?`${l.vol} L`:'Litros sin indicar',typeShort:l.type==='Gun / Step-up'?'Gun':l.type,consShort:CSH[l.cons],zoneShort:l.zoneName,heartDark:saved?'#F4C15A':'#FFFFFF',heartFillDark:saved?'#F4C15A':'none',hasImg:l.img!=null,noImg:l.img==null,img:l.img!=null?U(BOARDS[l.img]):'',imgFilter:off?'grayscale(1)':'none',photoCount:`${l.photos} fotos`,
      open:()=>this.go('ficha',{cur:l.id,stOverride:null,photo:0}),
      save:(e)=>{e&&e.stopPropagation&&e.stopPropagation();this.setState(s=>({saved:s.saved.includes(l.id)?s.saved.filter(x=>x!==l.id):[...s.saved,l.id]}));if(!saved)this.toast('Guardada. Te avisaremos si baja de precio o se vende.');},
      cmp:()=>{if(!cmp&&S.compare.length>=4){this.toast('Puedes comparar hasta 4 tablas');return;}this.setState(s=>({compare:cmp?s.compare.filter(x=>x!==l.id):[...s.compare,l.id]}));}};}
  chip(label,on,fn){return {label,on,toggle:fn,bg:on?'#087E8B':'#FFFFFF',fg:on?'#FFFFFF':'#102D3B',bd:on?'#087E8B':'#C3D6D5'};}
  alertText(f){const t=f.types.length?f.types.map(x=>PLURAL[x]).join(' o '):f.cons.includes('Softboard')?'Softboards':'Tablas';
    const v=f.volMin||f.volMax?` de ${f.volMin||'0'}–${f.volMax||'∞'} L`:'';const len=f.lenMin||f.lenMax?` entre ${f.lenMin?ftLabel(+f.lenMin):'—'} y ${f.lenMax?ftLabel(+f.lenMax):'—'}`:'';
    const b=f.brand?` ${f.brand}`:'';const p=f.priceMax?`, por menos de ${f.priceMax} €`:'';const z=f.zone?`, en ${ZN[f.zone].n}`:', en toda España';return `${t}${b}${len}${v}${p}${z}`;}
  addAlert(f){f=f||this.state.f;const text=this.alertText(f);this.setState(s=>({alerts:[{id:Date.now(),text,f:{...f},on:true},...s.alerts]}));this.toast(`Alerta creada: ${text}`);}

  simRef=React.createRef();
  wzRec(W){const w=+W.w;if(!w||w<30||w>160||!W.lvl)return null;const L=WLV.find(x=>x[0]===W.lvl);const [a,b]=REC[L[3]];let k=1;
    if(W.freq==='low')k*=1.08;if(W.freq==='high')k*=.95;if(W.waves==='small')k*=1.05;if(W.waves==='big')k*=.92;
    const g=W.goals;if(g.includes('learn')||g.includes('soft'))k*=1.03;if(g.includes('manio'))k*=.94;if(g.includes('turns'))k*=.97;if(g.includes('small'))k*=1.04;
    let lo=Math.round(w*a*k),hi=Math.round(w*b*k);let note='';const cv=+W.curVol;
    if(cv&&W.lvl!=='pro'&&lo<cv*.78){lo=Math.round(cv*.78);note=` Partes de una tabla de ${cv} L: no te proponemos bajar más de un 20 % de golpe.`;}
    if(hi<lo+4)hi=lo+4;
    let types={learn:['Softboard','Evolutiva','Longboard'],ride:['Evolutiva','Midlength','Fish'],turn:['Híbrida','Fish','Midlength'],pro:['Shortboard','Híbrida','Fish']}[W.lvl].slice();
    if(g.includes('soft'))types=['Evolutiva',...types.filter(t=>t!=='Softboard'&&t!=='Evolutiva'),'Midlength'];
    if(g.includes('calm'))types=['Midlength','Longboard',...types];
    if(g.includes('small'))types=['Fish',...types];
    if((g.includes('manio')||g.includes('turns'))&&W.lvl==='ride')types=[...types.slice(0,1),'Híbrida',...types.slice(1)];
    if(W.waves==='big')types=types.filter(t=>t!=='Longboard'&&t!=='Softboard');
    types=[...new Set(types)].slice(0,3);if(!types.length)types=['Evolutiva'];
    const lens={learn:"7'6\"–9'0\"",ride:"7'0\"–8'0\"",turn:"6'0\"–7'2\"",pro:"5'8\"–6'4\""}[W.lvl];
    const look={learn:['Anchura de 22" o más y cantos gruesos','Mucho volumen repartido a lo largo de la tabla','Construcción resistente: epoxy o softboard'],ride:['Volumen dentro de tu rango, sin bajar de golpe','Cantos medios y algo de rocker','Quillas thruster o 2+1 versátiles'],turn:['Volumen algo más ajustado para girar','Cola squash o swallow según el tipo de ola','Rocker moderado'],pro:['Volumen ajustado a tus olas habituales','Rocker adaptado a la fuerza de la ola','Cantos finos para más agarre']}[W.lvl];
    const avoid={learn:['Shortboards de menos de 40 L','Tablas muy estrechas o con mucho rocker'],ride:['Bajar más de un 20 % de volumen de una vez','Tablas de alto rendimiento muy finas'],turn:['Tablas demasiado voluminosas que no giran','Longboards si buscas maniobras'],pro:['Exceso de volumen en olas potentes','Comprar solo por la marca sin revisar las medidas']}[W.lvl];
    return {lo,hi,types,lens,look,avoid,note,L};}
  wizardVals(V){
    const S=this.state,m=V.m,W=S.wz,go=this.go,act=this.active();
    const set=p=>this.setState(s=>({wz:{...s.wz,...p}}));
    const st=W.step;const r=this.wzRec(W);const res=st===8&&!!r;
    const wN=+W.w;const wOk=wN>=30&&wN<=160;
    const sel=(on,multi)=>({bd:on?'#087E8B':'#D6E4E3',bg:on?'#EEF8F7':'#FFFFFF',ring:on?'#087E8B':'#A9C4C3',fill:on?'#087E8B':'#FFFFFF',mark:on?'✓':'',shape:multi?'7px':'999px',on:on?'true':'false',role:multi?'checkbox':'radio'});
    const next=()=>{if(st===1&&!wOk){set({tried:true});return;}if(st===2&&!W.lvl){this.toast('Elige tu nivel para continuar');return;}set({step:Math.min(8,st+1),tried:false});this.top();};
    let opts=[];
    if(st===2)opts=WLV.map(([k,t,d])=>({t,d,hasD:true,...sel(W.lvl===k),go:()=>set({lvl:k})}));
    if(st===3)opts=WCUR.map(([t,d])=>({t,d,hasD:!!d,...sel(W.cur===t),go:()=>set({cur:W.cur===t?null:t})}));
    if(st===4)opts=WFQ.map(([k,t,d])=>({t,d,hasD:true,...sel(W.freq===k),go:()=>set({freq:W.freq===k?null:k})}));
    if(st===5)opts=WWV.map(([k,t,d])=>({t,d,hasD:true,...sel(W.waves===k),go:()=>set({waves:W.waves===k?null:k})}));
    if(st===6)opts=WGL.map(([k,t])=>({t,d:'',hasD:false,...sel(W.goals.includes(k),true),go:()=>set({goals:W.goals.includes(k)?W.goals.filter(x=>x!==k):[...W.goals,k]})}));
    const CAN=['gran-canaria','tenerife','lanzarote','fuerteventura'];
    const zoneOk=l=>!W.zone?true:W.zone==='canarias'?CAN.includes(l.zone):W.zone==='other'?l.zone===W.otherZone:l.zone===W.zone;
    const typeOk=(l,types)=>types.includes(l.type)||(types.includes('Softboard')&&l.cons==='Softboard');
    const volOk=l=>r&&l.vol!=null&&l.vol>=r.lo&&l.vol<=r.hi;
    const budOk=(l,b)=>!b||l.price<=+b;
    const comp=r?act.filter(l=>volOk(l)&&typeOk(l,r.types)&&zoneOk(l)&&budOk(l,W.budget)):[];
    const zoneName=!W.zone?'toda España':W.zone==='canarias'?'Canarias':W.zone==='other'?ZN[W.otherZone].n:ZN[W.zone].n;
    const lvName=W.lvl?WLV.find(x=>x[0]===W.lvl)[1]:'—';
    const summary=[{k:'Peso',v:W.w?`${W.w} kg`:'—',s:1},{k:'Nivel',v:lvName,s:2},{k:'Tabla actual',v:W.cur||'Sin indicar',s:3},{k:'Frecuencia',v:W.freq?WFQ.find(x=>x[0]===W.freq)[1]:'Sin indicar',s:4},{k:'Olas',v:W.waves?WWV.find(x=>x[0]===W.waves)[1]:'Sin indicar',s:5},{k:'Objetivo',v:W.goals.length?W.goals.map(g=>WGL.find(x=>x[0]===g)[1]).join(', '):'Sin indicar',s:6},{k:'Zona y presupuesto',v:`${zoneName}${W.budget?' · hasta '+W.budget+' €':''}`,s:7}].map(x=>({...x,go:()=>{set({step:x.s});this.top();}}));
    const ex=[[60,'learn'],[75,'learn'],[75,'ride'],[75,'turn'],[85,'pro']].map(([w,l])=>{const rr=this.wzRec({...WZ0(),w:String(w),lvl:l});return {k:`${w} kg · ${WLV.find(x=>x[0]===l)[1].toLowerCase()}`,v:`${rr.lo}–${rr.hi} L`};});
    const widen=[];if(r){const cnt=p=>act.filter(l=>volOk(l)&&typeOk(l,r.types)&&(p.zone===undefined?zoneOk(l):true)&&budOk(l,p.budget!==undefined?p.budget:W.budget)).length;
      if(W.zone)widen.push({l:`Ampliar a toda España (${cnt({zone:''})})`,go:()=>set({zone:''})});
      if(W.budget){const nb=+W.budget+100;widen.push({l:`Subir presupuesto a ${nb} € (${cnt({budget:String(nb)})})`,go:()=>set({budget:String(nb)})});}
      const alt=act.filter(l=>volOk(l)&&zoneOk(l)&&budOk(l,W.budget)).length;widen.push({l:`Ver alternativas con tu volumen (${alt})`,go:()=>{this.setState({profile:{lo:r.lo,hi:r.hi,types:r.types,lvl:r.L[3],w:wN},f:{...EF(),volMin:String(r.lo),volMax:String(r.hi)}});go('buscar');}});
      widen.push({l:'Crear alerta',go:()=>this.addAlert({...EF(),volMin:String(r.lo),volMax:String(r.hi),types:r.types.filter(t=>t!=='Softboard'),zone:CAN.includes(W.zone)||ZN[W.zone]?W.zone:'',priceMax:W.budget})});}
    const prof=r?{lo:r.lo,hi:r.hi,types:r.types,lvl:r.L[3],w:wN}:null;
    const ff=r?{...EF(),volMin:String(r.lo),volMax:String(r.hi),types:r.types.filter(t=>t!=='Softboard'),zone:ZN[W.zone]?W.zone:W.zone==='other'?W.otherZone:'',priceMax:W.budget}:EF();
    const live=r?`${r.lo}–${r.hi} L`:(wOk?'Elige tu nivel':'—');
    return {wz:{pagePad:m?'14px 16px 40px':'26px 32px 64px',h1:m?'34px':'52px',cols:m?'minmax(0,1fr)':'minmax(0,1fr) 300px',cardRad:m?'20px':'24px',cardPad:m?'18px 16px 0':'28px 32px 0',minH:m?'auto':'560px',qSize:m?'34px':'46px',optCols:m||st!==6?'minmax(0,1fr)':'minmax(0,1fr) minmax(0,1fr)',
      hasProgress:st>1||!!W.w,restart:()=>{this.setState({wz:WZ0()});this.top();},inSteps:st<8||!r,res,n:Math.min(st,7),optional:st>=3&&st<=7,
      bar:Array.from({length:7},(_,i)=>({l:`Paso ${i+1}`,c:i+1<st?'#087E8B':i+1===st?'#102D3B':'#D6E4E3',cur:i+1<st?'pointer':'default',go:()=>{if(i+1<st)set({step:i+1});}})),
      q:WQ[Math.min(st,7)-1][0],help:WQ[Math.min(st,7)-1][1],
      s1:st===1,w:W.w,setW:e=>set({w:e.target.value.replace(/[^0-9]/g,'').slice(0,3)}),enter:e=>{if(e.key==='Enter')next();},wErr:W.tried&&!wOk,wBd:W.tried&&!wOk?'#A23A2C':(wOk?'#087E8B':'#C3D6D5'),
      wQuick:[55,65,75,85,95].map(v=>{const on=W.w===String(v);return {l:`${v} kg`,bg:on?'#087E8B':'#FFFFFF',fg:on?'#FFFFFF':'#102D3B',bd:on?'#087E8B':'#C3D6D5',go:()=>set({w:String(v),tried:false})};}),
      hgt:W.hgt,setH:e=>set({hgt:e.target.value.replace(/[^0-9]/g,'').slice(0,3)}),
      sCards:st>=2&&st<=6,opts,s3extra:st===3&&!!W.cur&&W.cur!=='No tengo tabla',curLen:W.curLen,curVol:W.curVol,setCurLen:e=>set({curLen:e.target.value}),setCurVol:e=>set({curVol:e.target.value}),
      s7:st===7,zones:[['','Toda España'],['canarias','Canarias'],['gran-canaria','Gran Canaria'],['tenerife','Tenerife'],['other','Otras zonas']].map(([v,l])=>this.chip(l,W.zone===v,()=>set({zone:v}))),isOther:W.zone==='other',otherZone:W.otherZone,setOther:e=>set({otherZone:e.target.value}),
      otherOpts:ZONES.filter(z=>!CAN.includes(z.k)).map(z=>({v:z.k,l:z.n})),
      budgets:[['','Sin límite'],['150','150 €'],['250','250 €'],['400','400 €']].map(([v,l])=>this.chip(l,W.budget===v,()=>set({budget:v}))),budget:W.budget,setBudget:e=>set({budget:e.target.value.replace(/[^0-9]/g,'')}),
      navPos:m?'sticky':'static',navMargin:m?'0 -16px':'24px -32px 0',navPad:m?'12px 16px':'16px 32px',back:()=>{if(st>1){set({step:st-1});this.top();}},backOp:st>1?1:.4,backText:'Anterior',skip:()=>{set({step:st+1});this.top();},
      next,nextBg:(st===1&&!wOk)||(st===2&&!W.lvl)?'#E6D7B4':'#F4C15A',nextText:st===7?'Ver mi recomendación':'Continuar',
      summary,liveRange:live,
      resRad:m?'20px':'28px',resPad:m?'22px 18px':'34px 36px',resH:m?'32px':'52px',resCols:m?'minmax(0,1fr)':'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)',bigNum:m?'40px':'52px',
      sub:r?`Con ${W.w} kg y el nivel «${lvName.toLowerCase()}»${W.waves?', en olas '+WWV.find(x=>x[0]===W.waves)[1].toLowerCase():''}, estas son las opciones con más sentido. Tómalas como orientación, no como una medida exacta.`:'',
      range:r?`${r.lo}–${r.hi} L`:'',lens:r?r.lens:'',look:r?r.look:[],avoid:r?r.avoid:[],
      why:r?`Por qué: el volumen sale de tu peso y nivel, ajustado por frecuencia, tipo de ola y objetivo.${r.note}`:'',
      typeCols:m?'minmax(0,1fr)':'repeat(3,minmax(0,1fr))',
      types:r?r.types.map((t,i)=>{const [why,cons,lens,img]=TINFO[t];const n=act.filter(l=>volOk(l)&&typeOk(l,[t])&&zoneOk(l)).length;return {n:t,why,cons,lens,img:U(img).replace('w=900','w=700'),tag:i===0?'La que más encaja':'También encaja',tagBg:i===0?'#087E8B':'#FFFFFF',tagFg:i===0?'#FFFFFF':'#102D3B',bd:i===0?'#087E8B':'#D6E4E3',cta:n?`Ver ${n} ${t==='Fish'?'fish':PLURAL[t]?PLURAL[t].toLowerCase():t.toLowerCase()+'s'}`:'Sin anuncios · crear alerta',go:()=>{if(n){this.setState({profile:prof,f:{...EF(),volMin:String(r.lo),volMax:String(r.hi),...(t==='Softboard'?{cons:['Softboard']}:{types:[t]})}});go('buscar');}else this.addAlert({...EF(),volMin:String(r.lo),volMax:String(r.hi),types:t==='Softboard'?[]:[t]});}};}):[],
      listSub:r?`${comp.length} anuncio${comp.length===1?'':'s'} entre ${r.lo} y ${r.hi} L · ${r.types.join(', ')} · ${zoneName}${W.budget?' · hasta '+W.budget+' €':''}`:'',
      has:comp.length>0,none:!!r&&comp.length===0,cards:comp.slice(0,8).map(l=>({...this.card(l),fit:true,reason:`Encaja: ${l.vol} L dentro de ${r.lo}–${r.hi} L · ${l.type}`})),
      seeAll:()=>{this.setState({profile:prof,f:ff});go('buscar');},widen,
      alertText:r?`«${this.alertText(ff)}»`:'',email:W.email,setEmail:e=>set({email:e.target.value}),alert:()=>{this.addAlert(ff);if(W.email)this.toast(`Alerta creada. Te escribiremos a ${W.email}`);},
      save:()=>{this.setState({profile:prof,wz:{...W,saved:true}});this.toast('Perfil guardado: verás «Te encaja» en las tablas de tu rango');},saveText:W.saved||S.profile?'Perfil guardado ✓':'Guardar mi perfil de surfista',savedTitle:'Guarda tu perfil de surfista',
      seoCols:m?'minmax(0,1fr)':'minmax(0,1.2fr) minmax(0,1fr)',examples:ex,
      links:[['Evolutivas',{types:['Evolutiva']}],['Softboards',{cons:['Softboard']}],['Longboards',{types:['Longboard']}],['Midlength',{types:['Midlength']}]].map(([l,p])=>({l,go:()=>{this.setState({f:{...EF(),...p}});go('buscar');}})).concat([{l:'Guía: qué revisar al comprar una tabla usada',go:()=>go('guia')}])}};
  }
  railRef=React.createRef();
  homeVals(V){
    const S=this.state,m=V.m,f=S.f,act=this.active(),go=this.go;
    const zone=f.zone||S.here;const zn=ZN[zone].n;const ff={...f,zone};const n=this.count(ff);
    const helps=S.homeVolMode==='help';const mr=this.rec(S.mini.w,S.mini.lvl);
    const nH=helps&&mr?this.count({...ff,volMin:String(mr.lo),volMax:String(mr.hi)}):n;
    const doGo=()=>{const p={f:{...ff},homeSheet:false};if(helps&&mr){p.f={...ff,volMin:String(mr.lo),volMax:String(mr.hi)};p.profile={lo:mr.lo,hi:mr.hi,types:mr.types,lvl:S.mini.lvl,w:+S.mini.w};}this.setState(p);go('buscar');};
    const nearAll=act.filter(l=>l.zone===S.here).sort((a,b)=>a.km-b.km);
    const near=[...act.filter(l=>l.zone===S.here)].sort((a,b)=>a.post-b.post).slice(0,12);
    const other=near.length<8?act.filter(l=>l.zone!==S.here).sort((a,b)=>a.post-b.post).slice(0,8-near.length+2):[];
    const bands=[[0,5,'A menos de 5 km'],[5,15,'De 5 a 15 km'],[15,30,'De 15 a 30 km'],[30,9999,'A más de 30 km']];
    const groups=bands.map(([lo,hi,l])=>({l:`${l} · ${zn}`,items:nearAll.filter(x=>x.km>=lo&&x.km<hi).slice(0,6).map(x=>this.card(x))})).filter(g=>g.items.length);
    if(other.length)groups.push({l:'Otras zonas',items:other.map(x=>this.card(x))});
    const view=S.homeView||'fotos';
    const volTxt=f.volMin||f.volMax?`${f.volMin||'0'}–${f.volMax||'∞'} L`:'Todos';
    const soft=f.cons.includes('Softboard')&&!f.types.length;
    return {hv:{heroPad:m?'20px 16px 18px':'40px 32px 28px',heroCols:(m||S.winW<1100)?'1fr':'1fr auto',heroLinksAlign:(m||S.winW<1100)?'flex-start':'flex-end',h1:m?'38px':'clamp(50px,5.6vw,84px)',h2:m?'26px':'36px',
      pillCols:'1fr auto',pillInner:m?'1.25fr 1fr':'1.3fr 1fr 1fr',
      whereLabel:'Ubicación',where:m?`${zn}${f.dist?' · '+f.dist+' km':''}`:`${f.zone?zn:'Cerca de ti · '+zn}${f.dist?' · '+f.dist+' km':''}`,vol:f.volMin||f.volMax?volTxt:(m?'Cualquiera':'Cualquier volumen'),type:f.types.length?f.types.join(', '):(soft?'Softboard':'Cualquier tipo'),
      go:doGo,goText:`Buscar ${nH} tablas`,
      openWhere:()=>this.setState({homeSheet:true,homeVolMode:'knows'}),openHelp:()=>go('calc',{homeSheet:false}),close:()=>this.setState({homeSheet:false}),
      cats:V.cats.map(c=>({l:c.l,n:String(c.n),go:c.go,fg:c.n?V.th.chipFg:V.th.faint})),
      heroRad:V.varB?'0':(m?'0 0 22px 22px':'0 0 32px 32px'),nearPad:m?'22px 16px 8px':'34px 32px 8px',
      searchCols:m?'minmax(0,1.2fr) 1px minmax(0,1fr)':'minmax(0,1.3fr) 1px minmax(0,1fr) 1px minmax(0,1fr) auto auto',goCol:m?'1 / -1':'auto',sep:true,
      sWhere:{fw:'700',c:'#102D3B',dot:'block'},sVol:{fw:(f.volMin||f.volMax||helps)?'700':'500',c:(f.volMin||f.volMax||helps)?'#102D3B':'#617C82',dot:(f.volMin||f.volMax)?'block':'none'},
      sType:{fw:(f.types.length||soft)?'700':'500',c:(f.types.length||soft)?'#102D3B':'#617C82',dot:(f.types.length||soft)?'block':'none'},
      openVol:()=>this.setState({homeSheet:true,homeVolMode:'knows'}),openType:()=>this.setState({homeSheet:true}),openAll:()=>{this.setState({f:{...ff}});go('buscar',{sheet:m,adv:true});},
      nAdv:(()=>{const k=f.cons.length+f.cond.length+f.seller.length+(f.brand?1:0)+(f.priceMax||f.priceMin?1:0)+(f.lenMin||f.lenMax?1:0);return k?' · '+k:'';})(),
      views:[['fotos','Fotos'],['lista','Lista']].map(([v,l])=>({l,go:()=>this.setState({homeView:v}),bg:view===v?'#102D3B':'transparent',fg:view===v?'#FFFFFF':'#4A6670'})),
      isCarousel:view==='fotos',railRef:this.railRef,showArrows:!m&&view==='fotos',prev:()=>{const r=this.railRef.current;if(r)r.scrollBy({left:-r.clientWidth*.8,behavior:'smooth'});},next:()=>{const r=this.railRef.current;if(r)r.scrollBy({left:r.clientWidth*.8,behavior:'smooth'});},isList:view==='lista',cards:[...near,...other].map(x=>this.card(x)),cardW:m?'262px':'292px',groups,listCols:m?'1fr':'repeat(auto-fill,minmax(400px,1fr))',
      nearSub:`${near.length} en ${ZN[S.here].n}${other.length?' · y algunas de otras zonas, señaladas':''} · más recientes primero`,
      exploreCols:m?'1fr':'1.1fr 1fr 1fr',
      sheetOpen:!!S.homeSheet,shL:m?'0':'50%',shR:m?'0':'auto',shB:m?'0':'auto',shT:m?'auto':'50%',shTf:m?'none':'translate(-50%,-50%)',shW:m?'auto':'540px',shMaxH:m?'90%':'86vh',shRad:m?'24px 24px 0 0':'20px',
      zoneV:zone,setZone:e=>this.setState(s=>({here:e.target.value,f:{...s.f,zone:e.target.value}})),
      dists:[['','Toda la zona'],['10','< 10 km'],['25','< 25 km'],['50','< 50 km']].map(([v,l])=>this.chip(l,f.dist===v,()=>this.setF({dist:v,zone}))),
      volModes:[['knows','Sé los litros'],['help','No sé: ¿qué tabla necesito? →']].map(([v,l])=>this.chip(l,v==='knows',()=>{if(v==='help')go('calc',{homeSheet:false});})),
      knows:true,helps:false,typeChips:TYPES.map(t=>this.chip(t,f.types.includes(t),()=>this.togF('types',t)))}};
  }
  proVals(V){
    const S=this.state,m=V.m,act=this.active(),all=this.listings(),go=this.go;
    const ft=S.shopType||'';
    const shopCount=s=>act.filter(l=>l.sname===s.n).length;
    const sh=SHOPS.find(s=>s.slug===S.shop)||SHOPS[0];const shL=act.filter(l=>l.sname===sh.n);
    const hash=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))%9973;return x;};
    const own=S.own.map(id=>all.find(x=>x.id===id)).filter(Boolean).map(l=>({...l,status:S.ownSt[l.id]?.status||l.status,conf:S.ownSt[l.id]?.conf??l.conf,price:S.ownSt[l.id]?.price??l.price}));
    const tabOf=l=>l.status==='Vendida'?'vendidos':(l.status==='Pendiente'||l.conf>14)?'pendientes':'activos';
    const setOwn=(id,p)=>this.setState(s=>({ownSt:{...s.ownSt,[id]:{...(s.ownSt[id]||{}),...p}}}));
    const pend=own.filter(l=>tabOf(l)==='pendientes');
    const rows=own.filter(l=>tabOf(l)===S.panelTab).map(l=>{const k=hash(l.id);const sold=l.status==='Vendida';const tb=tabOf(l);
      const acts=sold?[{l:'Ver anuncio',go:()=>go('ficha',{cur:l.id,stOverride:'Vendida',photo:0})},{l:'Volver a publicar',go:()=>setOwn(l.id,{status:'Disponible',conf:0})}]
        :[...(tb==='pendientes'?[{l:'Sigue disponible',go:()=>{setOwn(l.id,{status:'Disponible',conf:0});this.toast('Disponibilidad confirmada hoy');},p:1}]:[{l:'Confirmar disponibilidad',go:()=>{setOwn(l.id,{conf:0});this.toast('Disponibilidad confirmada hoy');}}]),
          {l:'Bajar precio',go:()=>{setOwn(l.id,{price:Math.max(50,l.price-10)});this.toast('Precio bajado 10 €. Avisaremos a quien la tenga guardada.');}},{l:'Editar',go:()=>{this.setState({pub:{...PUB0(),step:2,photos:l.photos,brand:l.brand||'Shaper local',model:l.model||'',len:l.size,vol:l.vol?String(l.vol):'',width:fmtIn(l.width),thick:fmtIn(l.thick),type:l.type,cons:l.cons,cond:l.cond,price:String(l.price),zone:l.zone,town:l.town,repairs:l.repairs,src:{len:'ok',width:'ok',thick:'ok',vol:'ok'}}});go('publicar');}},{l:'Marcar vendida',go:()=>setOwn(l.id,{status:'Vendida'})}];
      return {img:U(BOARDS[l.img||0]).replace('w=900','w=300'),filter:sold?'grayscale(1)':'none',price:eur(l.price),title:this.title(l),spec:`${l.vol!=null?l.vol+' L':'Litros sin indicar'} · ${l.type} · ${l.town}`,
        st:sold?'Vendida · ya no aparece en búsquedas':tb==='pendientes'?`Pendiente: confirma que sigue disponible (última vez ${ago(l.conf)})`:`Activa · confirmada ${ago(l.conf)}`,dot:sold?'#A23A2C':tb==='pendientes'?'#C08A2E':'#1E6A47',
        views:40+k%300,saves:k%17,leads:k%6,actions:acts.map(a=>({...a,bg:a.p?'#102D3B':'#FFFFFF',fg:a.p?'#FFFFFF':'#102D3B',bd:a.p?'#102D3B':'#C3D6D5'}))};});
    return {
      proJoin:()=>this.toast('Alta profesional: subida por CSV, feed autorizado o carga asistida por nuestro equipo.'),
      shopFilters:[['','Todas'],['Tienda','Tiendas'],['Escuela','Escuelas']].map(([v,l])=>this.chip(l,ft===v,()=>this.setState({shopType:v}))),
      shopCols:m?'1fr':'repeat(auto-fill,minmax(260px,1fr))',
      shopCards:SHOPS.filter(s=>!ft||s.t===ft).map(s=>{const n=shopCount(s);return {n:s.n,t:s.t,img:U(s.img).replace('w=900','w=600'),loc:`${s.town}, ${ZN[s.zone].n}`,hours:s.hours,count:n?`${n} tabla${n>1?'s':''} usada${n>1?'s':''}`:'Sin tablas usadas ahora',go:()=>go('tienda',{shop:s.slug})};}),
      sh:{...sh,img:U(sh.img).replace('w=900','w=1200'),count:shL.length,conf:shL.length?ago(Math.min(...shL.map(l=>l.conf))):'—'},shHas:shL.length>0,shNone:shL.length===0,shCards:shL.map(l=>this.card(l)),
      shopContact:()=>this.toast(`Demo: se abriría WhatsApp con ${sh.n}`),shopWeb:()=>this.toast('Demo: enlace externo de la tienda'),shopAlert:()=>this.addAlert({...EF(),zone:sh.zone,seller:[sh.t]}),
      pnTabs:[['activos','Activos'],['pendientes','Pendientes'],['vendidos','Vendidos']].map(([v,l])=>({l:`${l} · ${own.filter(x=>tabOf(x)===v).length}`,bd:S.panelTab===v?'#102D3B':'transparent',c:S.panelTab===v?'#102D3B':'#617C82',go:()=>this.setState({panelTab:v})})),
      pnRows:rows,pnEmpty:rows.length===0,pnCols:(m||S.winW<1100)?'72px minmax(0,1fr)':'96px minmax(0,1fr) auto',pnActJustify:(m||S.winW<1100)?'flex-start':'flex-end',pnActCol:(m||S.winW<1100)?'1 / -1':'auto',
      pnNeedConf:pend.length>0,pnNeedText:`${pend.length} anuncio${pend.length>1?'s':''} sin confirmar desde hace más de 14 días. Si no lo confirmas, caducará a los 30.`,pnConfAll:()=>{pend.forEach(l=>setOwn(l.id,{status:'Disponible',conf:0}));this.toast('Todas confirmadas');}};
  }
  moreVals(V){
    const S=this.state,m=V.m,act=this.active(),all=this.listings(),go=this.go,c=S.calc;
    const setC=p=>this.setState(s=>({calc:{...s.calc,...p}}));
    const r=this.rec(c.w,c.lvl,c.freq,c.waves);
    let goalAdj='';let lo=r?r.lo:0,hi=r?r.hi:0;
    if(r&&c.goal==='Más maniobrabilidad'){lo=Math.round(lo*.93);hi=Math.round(hi*.95);goalAdj=' Como buscas maniobrabilidad, bajamos ligeramente el rango.';}
    if(r&&c.goal==='Coger más olas'){hi=Math.round(hi*1.04);goalAdj=' Para coger más olas, dejamos margen hacia arriba.';}
    const compat=r?act.filter(l=>l.vol!=null&&l.vol>=lo&&l.vol<=hi&&(!c.budget||l.price<=+c.budget)&&(!c.zone||l.zone===c.zone)):[];
    const cf={...EF(),volMin:String(lo),volMax:String(hi),priceMax:c.budget,zone:c.zone};
    const grp=(t,key,opts)=>({t,chips:opts.map(o=>this.chip(o,c[key]===o,()=>setC({[key]:o})))});
    // publish
    const P=S.pub;const setP=p=>this.setState(s=>({pub:{...s.pub,...p}}));
    const brandsP=[...new Set(MODELS.filter(x=>x.b).map(x=>x.b))];
    const pModels=MODELS.filter(x=>x.b&&x.b===P.brand);const pm=MODELS.find(x=>x.b===P.brand&&x.m===P.model);
    const fieldDefs=[['len','Longitud',P.unit==='ft'?"7'2\"":'218','text'],['width','Anchura',P.unit==='ft'?'21 1/2"':'54.6','text'],['thick','Grosor',P.unit==='ft'?'2 7/8"':'7.3','text'],['vol','Volumen (L)','47','decimal']];
    const SRCL={cat:['Según catálogo · confírmalo','#0A4F57',true],ai:['Propuesta automática · revísala','#8A5A12',true],ok:['Confirmado por ti','#1E6A47',false],'':['Opcional, pero ayuda a que te encuentren','#617C82',false]};
    const pubFields=fieldDefs.map(([k,l,ph,im])=>{const src=P.src[k]||'';const sl=SRCL[src];let v=P[k];
      return {l,ph,im,v,src:k==='len'&&v&&P.unit==='ft'?`${sl[0]}`:sl[0],sc:sl[1],needs:sl[2],bd:sl[2]?'#C08A2E':'#C3D6D5',bg:sl[2]?'#FFFBF2':'#FFFFFF',set:e=>setP({[k]:e.target.value,src:{...P.src,[k]:'ok'}}),confirm:()=>setP({src:{...P.src,[k]:'ok'}})};});
    const pending=Object.values(P.src).filter(x=>x==='cat'||x==='ai').length;
    const pv={id:'nuevo',brand:P.brand&&P.brand!=='Sin marca'&&P.brand!=='Shaper local'?P.brand:null,model:P.model||null,size:P.len||"—",lenIn:84,vol:P.vol?+P.vol:null,type:P.type||'Evolutiva',cons:P.cons||'PU / Poliéster',zone:P.zone,zoneName:ZN[P.zone].n,town:P.town||ZN[P.zone].towns[0],km:0,price:+P.price||0,cond:P.cond||'Buen estado',seller:'Particular',sname:'Tú',conf:0,post:0,status:'Disponible',photos:Math.max(3,P.photos),width:21.5,thick:2.75,repairs:P.repairs,fins:null,acc:'',mi:pm?MODELS.indexOf(pm):13,si:0,mslug:pm?pm.slug:'',dimSrc:'vendedor',volSrc:'vendedor'};
    const canNext={1:P.photos>0,2:!!P.len,3:!!(P.type&&P.cons&&P.cond),4:!!P.price,5:true}[P.step];
    const sameModel=pm?act.filter(l=>l.mslug===pm.slug):[];
    // compare
    const cl=S.compare.map(id=>all.find(x=>x.id===id)).filter(Boolean);
    const prof=S.profile;const minP=Math.min(...cl.map(l=>l.price));
    const rowsDef=[['Precio',l=>eur(l.price),true],['Marca y modelo',l=>l.brand?`${l.brand} ${l.model}`:'Artesanal'],['Longitud',l=>`${l.size} · ${Math.round(l.lenIn*2.54)} cm`,true],['Volumen',l=>l.vol!=null?`${l.vol} L`:null,true],['Anchura / grosor',l=>`${fmtIn(l.width)} / ${fmtIn(l.thick)}`,true],['Construcción',l=>l.cons],['Tipo',l=>l.type],['Estado',l=>l.cond],['Reparaciones',l=>l.repairs?'Sí · ver ficha':'Ninguna indicada'],['Ubicación',l=>`${l.town}, ${l.zoneName}`],['Distancia',l=>l.zone===S.here?`${l.km} km`:'Otra zona',true],['Disponibilidad',l=>l.status==='Disponible'?`Confirmada ${ago(l.conf)}`:l.status],['Vendedor',l=>l.seller],['Te encaja',l=>!prof?'Sin perfil':l.vol==null?'Sin indicar':(l.vol>=prof.lo&&l.vol<=prof.hi)?'Dentro de tu rango':'Fuera de tu rango']];
    const cmpRows=rowsDef.map(([lab,fn,mono])=>{const vs=cl.map(fn);const diff=new Set(vs.map(String)).size>1;
      return {l:lab,lc:diff?'#102D3B':'#4A6670',lb:diff?'#F1F6F8':'#FFFFFF',cb:diff?'#F7FAFB':'#FFFFFF',cells:cl.map((l,i)=>{const v=vs[i];const best=lab==='Precio'&&l.price===minP&&cl.length>1;const fitOk=lab==='Te encaja'&&v==='Dentro de tu rango';
        return {v:v==null?'Sin indicar':best?`${v} · la más barata`:v,c:v==null?'#617C82':best||fitOk?'#1E6A47':'#102D3B',fw:lab==='Precio'?'800':'500',ff:mono?"'IBM Plex Mono',monospace":'inherit'};})};});
    // guardado
    const savedL=S.saved.map(id=>all.find(x=>x.id===id)).filter(Boolean);
    // marca / modelo
    const bName=S.brandSel||'Torq';const bAct=act.filter(l=>l.brand===bName);const bMs=MODELS.filter(x=>x.b===bName);
    const mi=S.mi!=null&&MODELS[S.mi]&&MODELS[S.mi].b?S.mi:0;const mo=MODELS[mi];const msz=Math.min(S.modelSize,mo.sizes.length-1);const sz=mo.sizes[msz];
    const moAll=act.filter(l=>l.mi===mi);const moSz=moAll.filter(l=>l.si===msz);
    const inR=v=>prof&&v>=prof.lo&&v<=prof.hi;
    const bIntros={'Torq':'Marca de tablas en epoxy moldeado (TET), muy habitual en escuelas y entre surfistas que progresan. Duras, ligeras y resistentes a los golpes.','NSP':'Tablas en epoxy resistentes, muy presentes en escuelas y alquiler.','Softech':'Softboards de gama alta: espuma blanda con fondo deslizante.','Firewire':'Construcciones técnicas en epoxy y modelos de shapers reconocidos.','Lost':'Modelos híbridos y shortboards de PU de diseño californiano.','Channel Islands':'Shortboards, híbridas y midlengths en PU clásico.','Pukas':'Marca vasca con modelos para todo tipo de olas.'};
    const sw=[['Azul petróleo','#102D3B','Hero, títulos, estructura'],['Turquesa oceánico','#087E8B','Enlaces, activo, seleccionado'],['Turquesa claro','#7AD1CE','Acentos sobre petróleo'],['Amarillo arena','#F4C15A','Solo acciones principales'],['Blanco agua','#EFF6F5','Fondo general'],['Blanco','#FFFFFF','Tarjetas y formularios'],['Azul grisáceo','#4A6670','Texto secundario (AA)'],['Línea','#D6E4E3','Bordes 1 px'],['Éxito','#1E6A47','Disponible · confirmado'],['Aviso','#C08A2E','Pendiente · sin indicar'],['Error','#A23A2C','Vendida · reportar']];const swOld=[['Papel','#EFF6F5','Fondo general'],['Superficie','#FFFFFF','Tarjetas y paneles'],['Tinta','#102D3B','Texto, CTA secundario fuerte'],['Tinta 2','#4A6670','Texto secundario'],['Línea','#D6E4E3','Bordes 1 px'],['Océano','#102D3B','Acción principal y enlaces'],['Encaja','#1E6A47','Disponible · Te encaja'],['Atención','#C08A2E','Pendiente · litros sin indicar'],['Vendida','#A23A2C','No disponible · reportar']];
    const sys=all[0];
    return {
      calc:c,cOn:{w:e=>setC({w:e.target.value}),h:e=>setC({h:e.target.value}),cur:e=>setC({cur:e.target.value}),budget:e=>setC({budget:e.target.value}),zone:e=>setC({zone:e.target.value})},
      calcCols:m?'1fr':'minmax(0,1.3fr) minmax(320px,1fr)',calc3:m?'1fr':'1fr 1fr 1fr',
      calcGroups:[grp('Nivel de surf','lvl',LEVELS),grp('Frecuencia','freq',['Menos de 1 vez por semana','1–2 veces por semana','3 o más veces por semana']),grp('Olas habituales','waves',['Pequeñas (0,5–1 m)','Medianas (1–2 m)','Grandes (más de 2 m)']),grp('Objetivo','goal',['Coger más olas','Progresar en maniobras','Más maniobrabilidad','Surf tranquilo y estilo'])],
      cr:r?{range:`${lo}–${hi} L`,types:r.types,lens:r.lens,why:`Con ${c.w} kg y nivel ${c.lvl.toLowerCase()}, solemos ver tablas de entre ${lo} y ${hi} litros. ${c.freq.startsWith('Menos')?'Como surfeas poco, conviene algo más de volumen.':c.freq.startsWith('3')?'Al surfear a menudo, puedes ir algo más ajustado.':''}${goalAdj}${c.cur?` Partiendo de tu ${c.cur}, no bajes más de un 15–20 % de volumen de golpe.`:''}`}:{range:'Indica tu peso',types:[],lens:'—',why:'Introduce un peso entre 30 y 160 kg.'},
      calcCta:`Ver ${compat.length} tablas compatibles`,calcGo:()=>{if(!r)return;this.setState({profile:{lo,hi,types:r.types,lvl:c.lvl,w:+c.w},f:{...cf,priceMax:c.budget||'',zone:c.zone||''}});this.toast('Perfil guardado: verás «Te encaja» en las tablas de tu rango');go('buscar');},
      calcAlert:()=>{if(r)this.addAlert(cf);},calcHas:compat.length>0,calcNone:!!r&&compat.length===0,calcCards:compat.slice(0,8).map(l=>this.card(l)),
      calcResText:r?`${compat.length} tabla${compat.length===1?'':'s'} entre ${lo} y ${hi} L${c.budget?`, hasta ${c.budget} €`:''}${c.zone?` en ${ZN[c.zone].n}`:' en toda España'}.`:'',
      pub:P,pOn:Object.fromEntries(['paste','repairs','price','zone','town','desc','phone'].map(k=>[k,e=>setP({[k]:e.target.value})])),
      pubNotDone:!P.done,pubDone:P.done,ps1:P.step===1,ps2:P.step===2,ps3:P.step===3,ps4:P.step===4,ps5:P.step===5,
      pubSteps:['Fotos','La tabla','Estado','Precio','Publicar'].map((l,i)=>({l,bar:i+1<=P.step?'#102D3B':'#C3D6D5',c:i+1===P.step?'#102D3B':'#617C82',go:()=>{if(i+1<P.step)setP({step:i+1});}})),
      pubPhotos:Array.from({length:P.photos},(_,i)=>({l:['cubierta','fondo','cola','nose','canto','quillas','detalle','funda'][i],rm:()=>setP({photos:P.photos-1})})),
      pubSlots:Array.from({length:Math.max(0,4-P.photos)},(_,i)=>({l:['Cubierta','Fondo','Cola y quillas','Golpes o reparaciones'][P.photos+i]})),
      addPhoto:()=>{if(P.photos<8)setP({photos:P.photos+1});},
      pubBrands:[...brandsP,'Shaper local','Sin marca'].map(b=>this.chip(b,P.brand===b,()=>setP({brand:b,model:'',size:''}))),
      pubHasModels:pModels.length>0,pubModels:[...pModels.map(x=>this.chip(x.m,P.model===x.m,()=>setP({model:x.m,size:'',type:x.type,cons:x.cons}))),this.chip('Otro modelo',P.model==='Otro',()=>setP({model:'Otro',size:''}))],
      pubHasSizes:!!pm,pubSizes:pm?pm.sizes.map(s=>this.chip(s[0],P.size===s[0],()=>setP({size:s[0],len:P.unit==='ft'?s[0]:String(Math.round(s[1]*2.54)),width:fmtIn(s[2]),thick:fmtIn(s[3]),vol:String(s[4]),src:{len:'cat',width:'cat',thick:'cat',vol:'cat'}}))):[],
      parsePaste:()=>{const s=P.paste;const o={},src={...P.src};const ft=s.match(/(\d)\s*['’]\s*(\d{1,2})?/);if(ft){o.len=`${ft[1]}'${ft[2]||0}"`;src.len='ai';}
        const v=s.match(/(\d{2}(?:[.,]\d+)?)\s*(l|lts|litros)\b/i);if(v){o.vol=v[1].replace(',','.');src.vol='ai';}
        const parts=s.replace(/(\d{2}(?:[.,]\d+)?)\s*(l|lts|litros)\b/i,'').split(/x|×/i).map(x=>x.trim());if(parts[1]){o.width=parts[1].replace(/["”]/g,'')+'"';src.width='ai';}if(parts[2]){o.thick=parts[2].replace(/["”]/g,'')+'"';src.thick='ai';}
        if(Object.keys(o).length){setP({...o,src});this.toast('Hemos interpretado las medidas. Revísalas y confírmalas.');}else this.toast('No hemos reconocido medidas. Prueba con 7\'2 x 21 1/2 x 2 7/8 47L');},
      unitOpts:[['ft','pies / pulgadas'],['cm','cm']].map(([v,l])=>({l,bg:P.unit===v?'#102D3B':'#FFFFFF',fg:P.unit===v?'#FFFFFF':'#102D3B',go:()=>setP({unit:v})})),
      pubFields,pubFieldCols:m?'1fr 1fr':'repeat(4,minmax(0,1fr))',
      pubGroups:[{t:'Forma',chips:TYPES.map(t=>this.chip(t,P.type===t,()=>setP({type:t})))},{t:'Construcción',chips:CONS.map(t=>this.chip(t,P.cons===t,()=>setP({cons:t})))},{t:'Estado',chips:CONDS.map(t=>this.chip(t,P.cond===t,()=>setP({cond:t})))}],
      hasPriceHint:sameModel.length>0,priceHint:sameModel.length?`Otras ${pm.b} ${pm.m} publicadas: entre ${eur(Math.min(...sameModel.map(x=>x.price)))} y ${eur(Math.max(...sameModel.map(x=>x.price)))} (${sameModel.length}).`:'',
      contactChips:['WhatsApp','Teléfono','Email'].map(t=>this.chip(t,P.contact===t,()=>setP({contact:t}))),
      pubRevCols:m?'1fr':'300px minmax(0,1fr)',pubPreview:{...this.card(pv),open:()=>{},save:()=>{},cmp:()=>{}},
      pubHasWarn:pending>0||!P.vol,pubWarn:pending>0?`Tienes ${pending} dato${pending>1?'s':''} sin confirmar. Solo publicaremos como verificados los que confirmes.`:'No has indicado los litros. El anuncio aparecerá como «litros sin indicar» y saldrá en menos búsquedas.',
      doPublish:()=>{if(!P.phone){this.toast('Introduce tu teléfono para verificar la publicación');return;}const id='a'+Date.now();this.setState(s=>({mine:[{...pv,id,size:P.len,lenIn:84,km:1,status:'Disponible',img:2},...s.mine],pub:{...s.pub,done:true,newId:id},own:[id,...s.own]}));this.top();},
      viewMine:()=>go('ficha',{cur:P.newId,stOverride:null,photo:0}),pubAgain:()=>this.setState({pub:PUB0()}),
      negPad:m?'-16px':'-32px',pubBack:()=>P.step>1?setP({step:P.step-1}):go('home'),pubBackText:P.step>1?'Atrás':'Salir',pubShowNext:P.step<5,
      pubNext:()=>{if(!canNext){this.toast({1:'Añade al menos una foto',2:'Indica al menos la longitud',3:'Elige forma, construcción y estado',4:'Indica un precio'}[P.step]);return;}setP({step:P.step+1});this.top();},
      pubNextBg:canNext?'#F4C15A':'#C3D6D5',pubNextText:P.step===4?'Revisar anuncio':'Continuar',
      cmpFew:cl.length<2,cmpOk:cl.length>=2,cmpFewText:cl.length===1?'Tienes 1 tabla seleccionada. Añade al menos otra desde los resultados.':'Pulsa «Comparar» en 2 a 4 tarjetas o fichas.',
      cmpCols:`140px repeat(${cl.length},minmax(170px,1fr))`,cmpMin:`${140+cl.length*170}px`,
      cmpHeads:cl.map(l=>({ready:true,t:this.title(l),img:U(BOARDS[l.img||0]).replace('w=900','w=500'),open:()=>go('ficha',{cur:l.id,stOverride:null,photo:0}),rm:()=>this.setState(s=>({compare:s.compare.filter(x=>x!==l.id)}))})),cmpRows,
      guardTabs:[['saved',`Tablas guardadas · ${S.saved.length}`],['alerts',`Alertas · ${S.alerts.length}`]].map(([v,l])=>({l,bd:S.guardTab===v?'#102D3B':'transparent',c:S.guardTab===v?'#102D3B':'#617C82',go:()=>this.setState({guardTab:v})})),
      gSaved:S.guardTab==='saved',gAlerts:S.guardTab==='alerts',noSaved:savedL.length===0,
      savedCards:savedL.map(l=>{const cc=this.card(l);const sold=l.status==='Vendida';return {...cc,note:sold?'Se ha vendido · te mostramos similares en la ficha':l.old?`Ha bajado de ${eur(l.old)} a ${eur(l.price)}`:'',noteBg:sold?'#F4E1DC':'#DDEDE4',noteFg:sold?'#5C1F15':'#1F5640'};}),
      alertRows:S.alerts.map(a=>{const n=this.count(a.f);return {text:a.text,meta:a.on?`Activa · ${n} tabla${n===1?'':'s'} coinciden ahora · aviso por email y notificación`:'Pausada',op:a.on?1:.6,sw:a.on?'#1E6A47':'#A9C4C3',knob:a.on?'25px':'3px',
        toggle:()=>this.setState(s=>({alerts:s.alerts.map(x=>x.id===a.id?{...x,on:!x.on}:x)})),del:()=>this.setState(s=>({alerts:s.alerts.filter(x=>x.id!==a.id)})),view:()=>{this.setState({f:{...a.f}});go('buscar');}};}),noAlerts:S.alerts.length===0,
      bName,bIntro:bIntros[bName]||'',bAlert:()=>this.addAlert({...EF(),brand:bName}),bUsedTitle:`${bName} de segunda mano · ${bAct.length}`,bHas:bAct.length>0,bNone:bAct.length===0,bCards:bAct.slice(0,8).map(l=>this.card(l)),
      bModels:bMs.map(x=>{const n=act.filter(l=>l.mslug===x.slug).length;const vs=x.sizes.map(s=>s[4]);return {n:x.m,meta:`${x.type} · ${x.cons}`,range:`${x.sizes[0][0]}–${x.sizes[x.sizes.length-1][0]} · ${Math.min(...vs)}–${Math.max(...vs)} L`,count:n?`${n} usada${n>1?'s':''} en venta`:'Sin unidades usadas ahora',cc:n?'#102D3B':'#617C82',go:()=>go('modelo',{mi:MODELS.indexOf(x),modelSize:0})};}),
      moBrandGo:()=>go('marca',{brandSel:mo.b}),mo:{b:mo.b,m:mo.m,type:mo.type,cons:mo.cons,desc:mo.desc||`${mo.type} de ${mo.b} en construcción ${mo.cons}.`},
      moSizes:mo.sizes.map((s,i)=>this.chip(`${s[0]}${inR(s[4])?' · te encaja':''}`,i===msz,()=>this.setState({modelSize:i}))),
      moSpecs:[{k:'Longitud',v:sz[0]},{k:'Anchura',v:fmtIn(sz[2])},{k:'Grosor',v:fmtIn(sz[3])},{k:'Volumen',v:`${sz[4]} L`}],
      moFitShow:!!prof,moFitBg:inR(sz[4])?'#DDEDE4':'#EFF6F5',moFitText:prof?(inR(sz[4])?`La ${sz[0]} está dentro de tu rango orientativo (${prof.lo}–${prof.hi} L).`:`La ${sz[0]} queda fuera de tu rango orientativo (${prof.lo}–${prof.hi} L).${mo.sizes.some(s=>inR(s[4]))?' Mira las medidas marcadas «te encaja».':''}`):'',
      moHead:['Medida','Longitud','Anchura','Grosor','Litros','En venta'],
      moRows:mo.sizes.map((s,i)=>{const n=moAll.filter(l=>l.si===i).length;return {bg:i===msz?'#DDF1F0':'#FFFFFF',go:()=>this.setState({modelSize:i}),cells:[{v:s[0],c:'#102D3B'},{v:`${Math.round(s[1]*2.54)} cm`,c:'#102D3B'},{v:fmtIn(s[2]),c:'#102D3B'},{v:fmtIn(s[3]),c:'#102D3B'},{v:`${s[4]} L${inR(s[4])?' ✓':''}`,c:inR(s[4])?'#1E6A47':'#102D3B'},{v:n?`${n} usada${n>1?'s':''}`:'—',c:n?'#102D3B':'#617C82'}]};}),
      moUsedTitle:`${mo.m} ${sz[0]} de segunda mano · ${moSz.length}`,moHas:moSz.length>0,moNone:moSz.length===0,moCards:moSz.map(l=>this.card(l)),
      moNoneText:`No hay ninguna ${mo.b} ${mo.m} ${sz[0]} usada publicada ahora mismo. Te avisamos en cuanto aparezca una.`,
      moAlert:()=>this.addAlert({...EF(),brand:mo.b,model:mo.slug,lenMin:String(sz[1]),lenMax:String(sz[1])}),
      moOtherShow:moAll.length>moSz.length,moOtherText:`Ver las ${moAll.length} ${mo.m} usadas de todas las medidas →`,moOtherGo:()=>{this.setState({f:{...EF(),brand:mo.b,model:mo.slug}});go('buscar');},
      guideRows:[{z:'Cantos y nose',ok:'golpes pequeños sellados con resina',ko:'grietas abiertas o fibra a la vista'},{z:'Cubierta',ok:'marcas de pies y talones (pressure dings)',ko:'zonas blandas que ceden al presionar'},{z:'Fondo',ok:'arañazos superficiales',ko:'burbujas o delaminación'},{z:'Cajas de quillas',ok:'cajas firmes, sin holgura',ko:'cajas sueltas o con grietas alrededor'},{z:'Medidas',ok:'coinciden con lo grabado en el stringer',ko:'el vendedor no sabe las medidas ni hay marca'}],
      guideCols:m?'1fr':'150px 1fr 1fr',guideGrid:m?'1fr':'1fr 1fr',guideCards:act.slice(0,4).map(l=>this.card(l)),
      swatches:sw.map(([n,c2,u])=>({n,c:c2,u})),sysCardCols:m?'1fr':'repeat(3,minmax(0,1fr))',
      sysCard:this.card(sys),sysCard2:this.card(all.find(x=>x.vol==null)||all[1]),sysCard3:this.card(all.find(x=>x.status==='Vendida')||all[2])};
  }
  fichaVals(V){
    const S=this.state,m=V.m,all=this.listings(),act=this.active(),go=this.go;
    const l=all.find(x=>x.id===S.cur)||all[0];const st=S.stOverride||l.status;const unav=!(st==='Disponible'||st==='Pendiente');
    const c=this.card(l);const n=l.photos;const PL=['cubierta','fondo','cola y quillas','nose','canto','detalle reparación','con funda'];
    const ix=S.photo%n;const prof=S.profile;const fit=!!(prof&&l.vol!=null&&l.vol>=prof.lo&&l.vol<=prof.hi);
    const SRC={vendedor:['Confirmado por vendedor','#DDEDE4','#1F5640'],fabricante:['Según fabricante · variante confirmada','#DDF1F0','#0A4F57'],none:['Sin indicar','#E3EEED','#4A6670']};
    const row=(k,v,src)=>{const s=SRC[v==null?'none':src];return {k,v:v==null?'Sin indicar':v,vc:v==null?'#617C82':'#102D3B',s:s[0],sb:s[1],sf:s[2]};};
    const sim=act.filter(x=>x.id!==l.id&&(x.type===l.type||(l.vol&&x.vol&&Math.abs(x.vol-l.vol)<=8))).sort((a,b)=>(b.zone===l.zone)-(a.zone===l.zone)||a.post-b.post).slice(0,m?4:4);
    const sameSeller=act.filter(x=>x.sname===l.sname).length;
    const msgs={Vendida:['Esta tabla ya se ha vendido','El vendedor la marcó como vendida. Te mostramos alternativas con medidas parecidas.'],Caducada:['Este anuncio ha caducado','El vendedor no confirmó la disponibilidad en 30 días. Puede que ya no esté a la venta.'],Retirada:['Anuncio retirado','El vendedor retiró este anuncio.']};
    const isMod=!!l.brand;
    const center=!m||V.framed===false&&!m;
    return {fl:{...c,size:l.size,sname:l.sname,typeCons:`${l.type} · ${l.cons}`,locFull:l.zone===S.here?`${l.town}, ${l.zoneName} · a ${l.km} km`:`${l.town}, ${l.zoneName}`},
      goBack:()=>go(S.prev&&S.prev!=='ficha'?S.prev:'buscar'),
      fCrumbs:[{l:'Inicio',go:()=>go('home')},{l:PLURAL[l.type],go:()=>{this.setState({f:{...EF(),types:[l.type]}});go('buscar');}},{l:l.zoneName,go:()=>{this.setState({f:{...EF(),types:[l.type],zone:l.zone}});go('buscar');}}],
      statusChips:['Disponible','Pendiente','Vendida','Caducada','Retirada'].map(s=>this.chip(s==='Pendiente'?'Pendiente de confirmar':s,st===s,()=>this.setState({stOverride:s}))),
      isUnavail:unav,unavailTitle:(msgs[st]||[])[0],unavailText:(msgs[st]||[])[1],simCount:sim.length,
      scrollSimilar:()=>{const el=this.simRef.current,sc=this.scrollRef.current;if(el){if(V.framed&&sc)sc.scrollTop=el.offsetTop-80;else window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-120);}},simRef:this.simRef,
      alertSimilar:()=>this.addAlert({...EF(),types:[l.type],volMin:l.vol?String(Math.round(l.vol-5)):'',volMax:l.vol?String(Math.round(l.vol+5)):'',zone:l.zone}),
      fichaCols:m?'1fr':'minmax(0,1.4fr) minmax(340px,1fr)',fichaAreas:m?'"g" "p" "d"':'"g p" "d p"',fichaGap:m?'16px':'28px 36px',
      galRatio:m?'4 / 5':'4 / 3',galRadius:m?'0':'16px',galMargin:m?'0 -16px':'0',galOp:unav?.55:1,thumbPad:'0',
      photoLabel:`${PL[ix]} · foto de stock (demo)`,photoIx:`${ix+1} / ${n}`,prevPhoto:()=>this.setState(s=>({photo:(s.photo-1+n)%n})),nextPhoto:()=>this.setState(s=>({photo:(s.photo+1)%n})),
      thumbs:Array.from({length:n},(_,i)=>({l:PL[i],img:U(BOARDS[(l.img+i*3)%BOARDS.length]).replace('w=900','w=200'),filter:unav?'grayscale(1)':'none',bd:i===ix?'#102D3B':'transparent',go:()=>this.setState({photo:i})})),galReady:true,galImg:U(BOARDS[(l.img+ix*3)%BOARDS.length]).replace('w=900','w=1400'),galFilter:unav?'grayscale(1)':'none',
      panelPos:m?'static':'sticky',panelPad:m?'16px':'22px',priceSize:m?'34px':'42px',fTitleSize:m?'22px':'26px',
      keySpecs:[{k:'Longitud',v:l.size,s:`${Math.round(l.lenIn*2.54)} cm`,c:'#102D3B'},{k:'Volumen',v:l.vol!=null?`${l.vol} L`:'—',s:l.vol!=null?(l.volSrc==='fabricante'?'según fabricante':'del vendedor'):'sin indicar',c:l.vol!=null?'#102D3B':'#617C82'},{k:'Ancho',v:fmtIn(l.width),s:`grosor ${fmtIn(l.thick)}`,c:'#102D3B'}],
      fAvailText:st==='Disponible'?`Disponible · confirmada ${ago(l.conf)}`:st==='Pendiente'?`Pendiente de confirmar · última confirmación ${ago(l.conf)}`:st,fAvailColor:st==='Disponible'?'#1E6A47':st==='Pendiente'?'#C08A2E':'#A23A2C',
      fFit:fit,fitRange:prof?`${prof.lo}–${prof.hi} L`:'',fNoFit:!!prof&&!fit,fNoFitText:prof?(l.vol==null?'No podemos indicar si te encaja: el vendedor no ha indicado los litros.':`Fuera de tu rango orientativo (${prof.lo}–${prof.hi} L).`):'',
      openContact:()=>{if(!unav)this.setState({contact:true});},contactBg:unav?'#C3D6D5':'#F4C15A',contactFg:unav?'#4A6670':'#102D3B',contactLabel:unav?'No disponible':'Contactar por WhatsApp',contactLabelM:unav?'No disponible':'Contactar con el vendedor',
      fSaveText:S.saved.includes(l.id)?'♥ Guardada':'Guardar',share:()=>this.toast('Enlace copiado: reboard.es/anuncio/'+(l.brand||'tabla').toLowerCase()+'-'+l.size.replace(/\W/g,'')+'-'+l.id),
      report:()=>this.toast('Gracias. Revisaremos el anuncio en menos de 24 h.'),
      techCols:m?'1fr auto':'160px minmax(0,1fr) auto',
      techRows:[row('Longitud',`${l.size} · ${Math.round(l.lenIn*2.54)} cm`,l.dimSrc),row('Anchura',`${fmtIn(l.width)} · ${(l.width*2.54).toFixed(1)} cm`,l.dimSrc),row('Grosor',`${fmtIn(l.thick)} · ${(l.thick*2.54).toFixed(1)} cm`,l.dimSrc),row('Volumen',l.vol!=null?`${l.vol} L`:null,l.volSrc),row('Forma',l.type,'vendedor'),row('Construcción',l.cons,isMod?'fabricante':'vendedor'),row('Quillas',l.fins,'vendedor'),row('Accesorios',l.acc||null,'vendedor')],
      repBg:l.repairs?'#F5EBD8':'#DDEDE4',repText:l.repairs||'El vendedor indica que la tabla no tiene reparaciones ni entradas de agua.',
      fDesc:`${l.brand?`${l.brand} ${l.model}`:'Tabla artesanal de shaper local'} de ${l.size}${l.vol?` y ${l.vol} litros`:''}. ${l.cond}. ${l.type==='Evolutiva'?'Perfecta para dar el salto desde la softboard.':l.type==='Shortboard'?'Para olas con algo de fuerza.':'Muy divertida en olas pequeñas y medianas.'} ${l.acc?l.acc+' incluidos. ':''}Se puede ver en ${l.town}. (Texto de demostración.)`,
      sellerInitial:l.sname[0],sellerMeta:`${l.seller}${sameSeller>1?` · ${sameSeller} anuncios activos`:''}`,
      hasModel:isMod,modelLinkText:isMod?`${l.brand} ${l.model} — variante ${l.size} confirmada por el vendedor.`:'Tabla artesanal sin modelo de catálogo. Las medidas son las que indica el vendedor.',
      goModel:()=>go('modelo',{mi:l.mi,modelSize:l.si}),simCards:sim.map(x=>this.card(x)),fVolShort:l.vol!=null?`${l.vol} L`:'litros s/i',
      contactOpen:S.contact,contactMsg:`Hola ${l.sname}, he visto tu ${this.title(l)} en Reboard por ${eur(l.price)}. ¿Sigue disponible? ¿Cuándo podría verla?`,
      doWhatsapp:()=>{this.setState({contact:false});this.toast('Demo: se abriría WhatsApp con el mensaje. No hay chat propio.');},doCall:()=>{this.setState({contact:false});this.toast('Demo: se mostraría el teléfono del vendedor.');},
      modalL:m?'0':'50%',modalR:m?'0':'auto',modalB:m?'0':'auto',modalT:m?'auto':'50%',modalTf:m?'none':'translate(-50%,-50%)',modalW:m?'auto':'440px',modalRad:m?'20px 20px 0 0':'18px',
      megaCols:this.megaCols(V)};
  }
  megaCols(V){const act=this.active(),go=this.go;const it=(l,p,n)=>({l,n:n?String(n):'',c:n===0?'#617C82':'#102D3B',go:()=>{this.setState({f:{...EF(),...p}});go('buscar');}});
    const cnt=p=>this.count({...EF(),...p});
    return [{t:'Tipos de tabla',items:TYPES.map(t=>it(t,{types:[t]},cnt({types:[t]})))},
      {t:'Zonas',items:ZONES.map(z=>it(z.n,{zone:z.k},cnt({zone:z.k}))).sort((a,b)=>(+b.n||0)-(+a.n||0))},
      {t:'Marcas',items:[...[...new Set(MODELS.filter(x=>x.b).map(x=>x.b))].map(b=>({...it(b,{brand:b},cnt({brand:b})),go:()=>go('marca',{brandSel:b})})),it('Shapers locales',{brand:NOBRAND},cnt({brand:NOBRAND}))]},
      {t:'Destacados',items:[it('Softboards',{cons:['Softboard']},cnt({cons:['Softboard']})),it('Tablas para principiantes',{volMin:'55'},cnt({volMin:'55'})),{l:'¿Qué tabla necesito?',n:'',c:'#102D3B',go:()=>go('calc')},{l:'Comparar anuncios',n:'',c:'#102D3B',go:()=>go('comparar')},{l:'Tiendas y escuelas',n:String(SHOPS.length),c:'#102D3B',go:()=>go('tiendas')},{l:'Mi panel de vendedor',n:'',c:'#102D3B',go:()=>go('panel')}]}];}
  searchVals(V){
    const S=this.state,m=V.m,f=S.f,act=this.active(),go=this.go;
    let res=act.filter(l=>this.match(l,f));
    const srt={recent:(a,b)=>a.post-b.post,price:(a,b)=>a.price-b.price,priceD:(a,b)=>b.price-a.price,vol:(a,b)=>(a.vol||0)-(b.vol||0),dist:(a,b)=>(a.zone===S.here?a.km:9999)-(b.zone===S.here?b.km:9999)}[S.sort];res=[...res].sort(srt);
    const hasVol=!!(f.volMin||f.volMax);const unk=hasVol?act.filter(l=>l.vol==null&&this.match(l,f,true)):[];
    const shown=res.slice(0,S.limit);
    const t1=f.types.length===1?f.types[0]:null,soft=f.cons.length===1&&f.cons[0]==='Softboard'&&!f.types.length;
    const z=f.zone?ZN[f.zone].n:null;
    let title=(t1?PLURAL[t1]:soft?'Softboards':f.brand&&f.brand!==NOBRAND?`Tablas ${f.brand}`:'Tablas de surf')+' de segunda mano'+(z?` en ${z}`:'');
    if(t1==='Fish')title='Tablas fish de segunda mano'+(z?` en ${z}`:'');
    const intros={'Evolutiva':'Tablas con volumen y longitud intermedia para progresar después de la softboard. Busca por litros y longitud para comparar.','Shortboard':'Tablas cortas y de poco volumen para surf de rendimiento. El volumen es clave: filtra por litros.','Fish':'Tablas anchas y cortas con cola swallow, para olas pequeñas y medianas.','Longboard':'Tablas de más de 9 pies para olas pequeñas, remada fácil y estilo clásico.','Midlength':'Entre 6\'8" y 8\', para olas tranquilas y deslizamiento.'};
    const nonEmpty=Object.entries(f).filter(([k,v])=>Array.isArray(v)?v.length:v).map(([k])=>k);
    const isLanding=nonEmpty.length>0&&nonEmpty.every(k=>k==='zone'||k==='types'||k==='cons')&&f.types.length<=1;
    const intro=isLanding?(t1&&intros[t1])||(soft?'Softboard es una construcción, no una forma: hay softboards evolutivas, fish y longboards. Ideales para empezar.':z?`Anuncios de surfistas, tiendas y escuelas de ${z}. Ordena por distancia para ver las más cercanas.`:''):'';
    const crumbs=[{l:'Inicio',go:()=>go('home')},{l:'Tablas',go:()=>{this.setState({f:EF()});}}];if(t1&&z)crumbs.push({l:z,go:()=>this.setState({f:{...EF(),zone:f.zone}})});
    const applied=[];const rm=p=>()=>this.setF(p);
    if(f.zone)applied.push({l:z,remove:rm({zone:'',dist:''})});if(f.dist)applied.push({l:`< ${f.dist} km`,remove:rm({dist:''})});
    if(hasVol)applied.push({l:`${f.volMin||'0'}–${f.volMax||'∞'} L`,remove:rm({volMin:'',volMax:''})});
    if(f.lenMin||f.lenMax)applied.push({l:`${f.lenMin?ftLabel(+f.lenMin):'…'} – ${f.lenMax?ftLabel(+f.lenMax):'…'}`,remove:rm({lenMin:'',lenMax:''})});
    f.types.forEach(t=>applied.push({l:t,remove:()=>this.togF('types',t)}));f.cons.forEach(t=>applied.push({l:t,remove:()=>this.togF('cons',t)}));
    if(f.priceMin||f.priceMax)applied.push({l:`${f.priceMin||0}–${f.priceMax||'∞'} €`,remove:rm({priceMin:'',priceMax:''})});
    if(f.brand)applied.push({l:f.brand,remove:rm({brand:'',model:''})});if(f.model)applied.push({l:(MODELS.find(x=>x.slug===f.model)||{}).m,remove:rm({model:''})});
    f.cond.forEach(t=>applied.push({l:t,remove:()=>this.togF('cond',t)}));f.seller.forEach(t=>applied.push({l:t,remove:()=>this.togF('seller',t)}));
    if(f.noRepairs)applied.push({l:'Sin reparaciones',remove:rm({noRepairs:false})});if(f.acc)applied.push({l:'Con accesorios',remove:rm({acc:false})});
    if(f.fins)applied.push({l:f.fins,remove:rm({fins:''})});if(f.widthMin)applied.push({l:`≥ ${f.widthMin}" ancho`,remove:rm({widthMin:''})});if(f.thickMin)applied.push({l:`≥ ${f.thickMin}" grosor`,remove:rm({thickMin:''})});
    if(f.onlyMe)applied.push({l:'Solo para mí',remove:rm({onlyMe:false})});
    const sugg=[];const c=p=>this.count({...f,...p});
    if(f.dist)sugg.push({l:`Cualquier distancia (${c({dist:''})})`,go:rm({dist:''})});
    if(f.zone)sugg.push({l:`Toda España (${c({zone:'',dist:''})})`,go:rm({zone:'',dist:''})});
    if(f.priceMax){const p=+f.priceMax+50;sugg.push({l:`Hasta ${p} € (${c({priceMax:String(p)})})`,go:rm({priceMax:String(p)})});}
    if(hasVol){const a=Math.max(0,(+f.volMin||0)-5),b=f.volMax?+f.volMax+5:'';sugg.push({l:`Litros ${a}–${b||'∞'} (${c({volMin:String(a),volMax:String(b)})})`,go:rm({volMin:String(a),volMax:String(b)})});}
    if(f.types.length)sugg.push({l:`Cualquier forma (${c({types:[]})})`,go:rm({types:[]})});
    sugg.push({l:`Quitar todos los filtros (${act.length})`,go:()=>this.setState({f:EF()})});
    const lens=LENS.map(i=>({v:String(i),l:`${ftLabel(i)} · ${Math.round(i*2.54)} cm`}));
    const tc=t=>this.count({...f,types:[t]});
    const sheetOpen=S.sheet&&m;
    const fp=m?(sheetOpen?{display:'flex',pos:V.ovPos,top:'0',bottom:'0',z:'60',maxH:'none',bg:'#FFFFFF',headPad:'10px 16px',headBorder:'1px solid #D6E4E3',bodyPad:'18px 16px 24px'}:{display:'none',pos:'static',top:'auto',bottom:'auto',z:'auto',maxH:'none',bg:'#FFFFFF',headPad:'0',headBorder:'0',bodyPad:'0'}):{display:'flex',pos:'sticky',top:'84px',bottom:'auto',z:'1',maxH:'calc(100vh - 100px)',bg:'transparent',headPad:'0 0 10px',headBorder:'1px solid #D6E4E3',bodyPad:'16px 2px 24px 0'};
    const vq=[[25,35],[35,45],[45,60],[60,'']];
    const view=m?'list':S.view;
    const nF=applied.length;
    return {
      pagePad:m?'14px 16px 40px':'22px 32px 64px',h1Res:m?'26px':'38px',resTitle:title,resTitleShort:t1||(soft?'Softboard':z||'Resultados'),crumbs,hasIntro:!!intro,resIntro:intro,
      presets:[['Evolutiva 7\'0–7\'6 · 45–60 L · <200 € · Gran Canaria',{types:['Evolutiva'],lenMin:'84',lenMax:'90',volMin:'45',volMax:'60',priceMax:'200',zone:'gran-canaria'}],['Torq en Tenerife',{brand:'Torq',zone:'tenerife'}],['Shortboard 28–32 L cerca de Gijón',{types:['Shortboard'],volMin:'28',volMax:'32',zone:'asturias',dist:'25'}],['Búsqueda sin resultados',{types:['Longboard'],zone:'lanzarote',priceMax:'150'}]].map(([l,p])=>({l,go:()=>this.setState({f:{...EF(),...p},limit:24,here:p.zone||S.here})})),
      resCols:m?'1fr':'280px minmax(0,1fr)',fp,openSheet:()=>this.setState({sheet:true}),closeSheet:()=>this.setState({sheet:false}),clearF:()=>this.setState({f:EF()}),
      nFiltersText:nF?` · ${nF}`:'',sort:S.sort,sortOpts:[['recent','Más recientes'],['price','Precio: menor'],['priceD','Precio: mayor'],['vol','Litros: menor'],['dist','Más cerca']].map(([v,l])=>({v,l})),
      createAlert:()=>this.addAlert(),saveSearch:()=>{this.addAlert();},
      zoneOptsC:[{v:'',l:`Toda España (${this.count({...f,zone:'',dist:''})})`},...ZONES.map(zz=>({v:zz.k,l:`${zz.n} (${this.count({...f,zone:zz.k,dist:''})})`}))],noZone:!f.zone,
      distOpts:[['','Cualquier distancia'],['10','Menos de 10 km'],['25','Menos de 25 km'],['50','Menos de 50 km']].map(([v,l])=>({v,l})),
      volChips:vq.map(([a,b])=>this.chip(`${a}${b?'–'+b:'+'} L`,f.volMin===String(a)&&f.volMax===String(b),()=>this.setF({volMin:String(a),volMax:String(b)}))),
      hasProfile:!!S.profile,profileText:S.profile?`Tu rango orientativo: ${S.profile.lo}–${S.profile.hi} L (${S.profile.lvl}, ${S.profile.w} kg)`:'',
      onlyMe:{bg:f.onlyMe?'#DDEDE4':'#FFFFFF',bd:f.onlyMe?'#1E6A47':'#C3D6D5',box:f.onlyMe?'#1E6A47':'#FFFFFF'},toggleOnlyMe:()=>this.setF({onlyMe:!f.onlyMe}),
      lenOptsMin:[{v:'',l:'Desde…'},...lens],lenOptsMax:[{v:'',l:'Hasta…'},...lens],
      typeChips:TYPES.map(t=>this.chip(`${t} · ${tc(t)}`,f.types.includes(t),()=>this.togF('types',t))),
      priceSlider:f.priceMax||600,on:{...V.on,priceSlider:e=>this.setF({priceMax:e.target.value==='600'?'':e.target.value})},
      consChips:CONS.map(t=>this.chip(t,f.cons.includes(t),()=>this.togF('cons',t))),
      adv:S.adv,toggleAdv:()=>this.setState(s=>({adv:!s.adv})),advText:S.adv?'− Menos filtros':'+ Marca, modelo, estado, quillas, medidas…',
      modelOpts:[{v:'',l:'Cualquier modelo'},...MODELS.filter(x=>x.b&&(!f.brand||x.b===f.brand)).map(x=>({v:x.slug,l:`${x.b} ${x.m}`}))],
      condChips:CONDS.map(t=>this.chip(t,f.cond.includes(t),()=>this.togF('cond',t))),sellerChips:SELLERS.map(t=>this.chip(t,f.seller.includes(t),()=>this.togF('seller',t))),
      miscChips:[this.chip('Sin reparaciones',f.noRepairs,()=>this.setF({noRepairs:!f.noRepairs})),this.chip('Incluye funda o accesorios',f.acc,()=>this.setF({acc:!f.acc}))],
      finsOpts:[['','Cualquiera'],['FCS II','FCS II'],['Futures','Futures'],['Quillas blandas','Quillas blandas']].map(([v,l])=>({v,l})),
      resCount:res.length.toLocaleString('es-ES'),resCountWord:res.length===1?'tabla coincide':'tablas coinciden',
      hasApplied:applied.length>0,applied,
      hasUnknown:unk.length>0,unknownText:`También hay ${unk.length} tabla${unk.length>1?'s':''} con estas medidas cuyos litros no están indicados.`,unknownBtn:S.showUnk?'Ocultarlas':'Verlas',toggleUnknown:()=>this.setState(s=>({showUnk:!s.showUnk})),
      showUnknownList:!!S.showUnk&&unk.length>0,unknownCards:unk.slice(0,12).map(l=>this.card(l)),
      hasResults:res.length>0,isEmpty:res.length===0,resCards:shown.map(l=>this.card(l)),resGrid:view==='grid'?'repeat(auto-fill,minmax(230px,1fr))':m?'1fr':'repeat(auto-fill,minmax(400px,1fr))',resV:view==='grid',resH:view!=='grid',
      viewOpts:[['grid','Cuadrícula'],['list','Lista']].map(([v,l])=>({l,bg:S.view===v?'#102D3B':'#FFFFFF',fg:S.view===v?'#FFFFFF':'#102D3B',go:()=>this.setState({view:v})})),
      shownCount:Math.min(S.limit,res.length),hasMore:res.length>S.limit,loadMore:()=>this.setState(s=>({limit:s.limit+24})),
      alertPreview:`«${this.alertText(f)}»`,suggestions:sugg};
  }
  renderVals(){
    const S=this.state,m=this.isM(),d=!m,framed=S.vp==='mobile'&&S.winW>=480;const all=this.listings(),act=this.active(),f=S.f;
    const go=this.go,R=S.route;
    const on={zone:e=>this.setF({zone:e.target.value,...(e.target.value?{}:{dist:''})}),dist:e=>this.setF({dist:e.target.value}),volMin:e=>this.setF({volMin:e.target.value}),volMax:e=>this.setF({volMax:e.target.value}),
      lenMin:e=>this.setF({lenMin:e.target.value}),lenMax:e=>this.setF({lenMax:e.target.value}),priceMin:e=>this.setF({priceMin:e.target.value}),priceMax:e=>this.setF({priceMax:e.target.value}),
      brand:e=>this.setF({brand:e.target.value,model:''}),model:e=>this.setF({model:e.target.value}),fins:e=>this.setF({fins:e.target.value}),widthMin:e=>this.setF({widthMin:e.target.value}),thickMin:e=>this.setF({thickMin:e.target.value}),
      heroType:e=>{const v=e.target.value;this.setF(v==='Softboard'?{types:[],cons:['Softboard']}:{types:v?[v]:[],cons:[]});},
      heroCond:e=>this.setF({cond:e.target.value?[e.target.value]:[]}),
      here:e=>this.setState({here:e.target.value}),miniW:e=>this.setState(s=>({mini:{...s.mini,w:e.target.value}})),
      sort:e=>this.setState({sort:e.target.value})};
    const zoneCount=k=>act.filter(l=>l.zone===k).length;
    const zoneOpts=[{v:'',l:'Toda España'},...ZONES.map(z=>({v:z.k,l:`${z.n}${zoneCount(z.k)?'':' (sin anuncios)'}`}))];
    const typeOpts=[{v:'',l:'Cualquier tipo'},...TYPES.map(t=>({v:t,l:t})),{v:'Softboard',l:'Softboard (construcción)'}];
    const lenOpts=[{v:'',l:'—'},...LENS.map(i=>({v:String(i),l:`${ftLabel(i)}  (${Math.round(i*2.54)} cm)`}))];
    const brands=[...new Set(MODELS.filter(x=>x.b).map(x=>x.b))];
    const brandOpts=[{v:'',l:'Cualquier marca'},...brands.map(b=>({v:b,l:b})),{v:NOBRAND,l:NOBRAND}];
    const condOpts=[{v:'',l:'Cualquier estado'},...CONDS.map(c=>({v:c,l:c}))];
    const heroType=f.cons.includes('Softboard')&&!f.types.length?'Softboard':(f.types[0]||'');
    const sorted=a=>[...a].sort((x,y)=>x.post-y.post);
    const near=sorted(act.filter(l=>l.zone===S.here)).slice(0,12);
    const other=near.length<8?sorted(act.filter(l=>l.zone!==S.here)).slice(0,8-near.length+ (m?0:4)):[];
    const catDefs=[['Evolutivas',{types:['Evolutiva']},'24%','74%','50% 50% 42% 42% / 30% 30% 14% 14%'],['Softboards',{cons:['Softboard']},'26%','70%','46% 46% 40% 40% / 26% 26% 16% 16%'],['Midlength',{types:['Midlength']},'20%','80%','50% 50% 42% 42% / 30% 30% 12% 12%'],['Longboards',{types:['Longboard']},'20%','90%','48% 48% 44% 44% / 18% 18% 10% 10%'],['Shortboards',{types:['Shortboard']},'15%','66%','50% 50% 40% 40% / 40% 40% 12% 12%'],['Fish',{types:['Fish']},'24%','56%','50% 50% 20% 20% / 36% 36% 8% 8%'],['Para principiantes',{volMin:'55'},'26%','78%','46% 46% 42% 42% / 24% 24% 14% 14%']];
    const catImg={'Evolutivas':'1621951289270-b942dc5f4320','Softboards':'1537519646099-335112f03225','Midlength':'1531722569936-825d3dd91b15','Longboards':'1703159453462-8a2d2866afaf','Shortboards':'1632334738554-95c79fb27eb7','Fish':'1544840494-d0e48b117320','Para principiantes':'1632299768491-51d27b80d088'};
    const cats=catDefs.map(([l,p,w,h,r])=>{const n=this.count({...EF(),...p});return {l,w,h,r,n,img:U(catImg[l]).replace('w=900','w=400'),filter:n?'none':'grayscale(1)',count:n?`${n} anuncio${n>1?'s':''}`:'Sin anuncios aún',op:n?1:.6,go:()=>{if(n){this.setState({f:{...EF(),...p}});go('buscar');}else this.addAlert({...EF(),...p});}};}).sort((a,b)=>(b.n>0)-(a.n>0));
    const zoneCards=ZONES.map(z=>{const n=zoneCount(z.k);return {n:z.n,c:n,short:n?String(n):'Avísame',cc:n?'#4A6670':'#07717C',count:n?`${n} anuncio${n>1?'s':''}`:'Sin anuncios todavía',cta:n?'Ver tablas →':'Avísame',bg:n?'#FFFFFF':'#EFF6F5',go:()=>{if(n){this.setState({f:{...EF(),zone:z.k},here:z.k});go('buscar');}else this.addAlert({...EF(),zone:z.k});}};}).sort((a,b)=>b.c-a.c);
    const brandCards=[...brands,NOBRAND].map(b=>{const ms=MODELS.filter(x=>(x.b||NOBRAND)===b);const n=act.filter(l=>(l.brand||NOBRAND)===b).length;
      return {short:String(n),n:b===NOBRAND?'Shapers locales':b,models:b===NOBRAND?'Tablas artesanales y sin modelo conocido':`${ms.length} modelo${ms.length>1?'s':''} en catálogo · ${ms.slice(0,2).map(x=>x.m).join(', ')}`,count:n?`${n} usada${n>1?'s':''} en venta`:'Sin anuncios ahora',go:()=>{if(b!==NOBRAND)go('marca',{brandSel:b});else{this.setState({f:{...EF(),brand:b}});go('buscar');}}};});
    const mr=this.rec(S.mini.w,S.mini.lvl)||{lo:0,hi:0,types:[],lens:'—'};
    const miniCount=act.filter(l=>l.vol!=null&&l.vol>=mr.lo&&l.vol<=mr.hi).length;
    const totalAct=act.length;
    const varB=(S.variant||this.props.tema||'A · Atlantic Híbrido').startsWith('B');
    const th=varB?{heroBg:'transparent',heroFg:'#102D3B',heroAccent:'#087E8B',heroMuted:'#4A6670',heroLink:'#07717C',searchBd:'1px solid #C3D6D5',searchSh:'0 12px 30px -22px rgba(16,45,59,.35)',chipBd:'#C3D6D5',chipBg:'#FFFFFF',chipFg:'#102D3B',chipNum:'#617C82',faint:'#8AA2A7'}:{heroBg:'#102D3B',heroFg:'#F4F1EA',heroAccent:'#7AD1CE',heroMuted:'#B4C8CC',heroLink:'#7AD1CE',searchBd:'0',searchSh:'0 18px 40px -24px rgba(0,0,0,.6)',chipBd:'rgba(122,209,206,.35)',chipBg:'rgba(255,255,255,.06)',chipFg:'#F4F1EA',chipNum:'#9FBFC4',faint:'#7E9BA1'};
    const vals={logoSize:m?26:30,th,varB,variantOpts:[['A · Atlantic Híbrido','A · Híbrido'],['B · Atlantic Light','B · Light']].map(([v,l])=>{const on=(S.variant||this.props.tema||'A · Atlantic Híbrido')===v;return {l,bg:on?'#FFFFFF':'transparent',fg:on?'#102D3B':'#FFFFFF',go:()=>this.setState({variant:v})};}),
      m,d,framed,route:R,f,on,padX:m?'16px':'32px',headTop:'0',stickTop:'84px',subBarTop:'64px',stagePad:framed?'24px 16px 40px':'0',appW:framed?'390px':'100%',appH:framed?'844px':'auto',appBorder:framed?'10px solid #102D3B':'0',appRadius:framed?'44px':'0',appOverflow:framed?'hidden':'visible',scrollH:framed?'100%':'auto',scrollOverflow:framed?'auto':'visible',scrollRef:this.scrollRef,ovPos:framed?'absolute':'fixed',
      screens:[['sistema','Sistema visual'],['home','Home'],['buscar','Resultados /buscar'],['ficha','Ficha de anuncio'],['calc','¿Qué tabla necesito?'],['publicar','Publicar tabla'],['comparar','Comparador'],['guardado','Guardado y alertas'],['marca','Marca · Torq'],['modelo','Modelo · Torq Fun TET'],['guia','Guía'],['tiendas','Directorio de tiendas'],['tienda','Perfil de tienda'],['panel','Panel del vendedor']].map(([v,l])=>({v,l})),
      pickScreen:e=>go(e.target.value),
      vpOpts:[['desktop','Desktop'],['mobile','Móvil']].map(([v,l])=>({l,bg:S.vp===v?'#FFFFFF':'transparent',fg:S.vp===v?'#102D3B':'#FFFFFF',go:()=>this.setState({vp:v},()=>this.top())})),
      invOpts:[20,100,1000].map(v=>({l:v===1000?'1.000':String(v),bg:S.inv===v?'#FFFFFF':'transparent',fg:S.inv===v?'#102D3B':'#FFFFFF',go:()=>this.setState({inv:v,compare:[]})})),
      goHome:()=>go('home'),goBuscar:()=>go('buscar'),goCalc:()=>go('calc'),goGuia:()=>go('guia'),goGuardado:()=>go('guardado'),goPublicar:()=>go('publicar'),goComparar:()=>go('comparar'),goMarca:()=>go('marca'),
      goTiendas:()=>go('tiendas'),goPanel:()=>go('panel'),
      toggleMega:()=>this.setState(s=>({mega:!s.mega})),toggleMenu:()=>this.setState(s=>({menu:!s.menu})),closeOverlays:()=>this.setState({mega:false,menu:false,sheet:false,contact:false}),
      navBuy:R==='buscar'?'#EEF6F5':'transparent',menuW:m?'86%':'360px',menuItems:[['Comprar tablas',()=>go('buscar'),''],['¿Qué tabla necesito?',()=>go('calc'),''],['Guías',()=>go('guia'),''],['Guardado',()=>go('guardado'),String(S.saved.length)],['Alertas',()=>go('guardado',{guardTab:'alerts'}),String(S.alerts.length)],['Tiendas y escuelas',()=>go('tiendas'),''],['Mi panel de vendedor',()=>go('panel'),'']].map(([l,g,n])=>({l,go:g,n})),megaOpen:S.mega&&!this.isNarrowHead(),menuOpen:S.menu&&this.isNarrowHead(),headD:!this.isNarrowHead(),headM:this.isNarrowHead(),showCompact:R!=='home'&&S.winW>=1180,
      isHome:R==='home',isBuscar:R==='buscar',isFicha:R==='ficha',isCalc:R==='calc',isPub:R==='publicar',isCmp:R==='comparar',isGuard:R==='guardado',isMarca:R==='marca',isModelo:R==='modelo',isGuia:R==='guia',isSistema:R==='sistema',isTiendas:R==='tiendas',isTienda:R==='tienda',isPanel:R==='panel',notHome:R!=='home',
      compactSearch:f.zone||f.volMin||f.types.length?this.alertText(f).replace(', en ',' · '):'Buscar tablas por litros y zona',
      savedCount:S.saved.length,hasSaved:S.saved.length>0,cmpCount:S.compare.length,
      h1Size:m?'40px':'72px',h2Size:m?'24px':'32px',leadSize:m?'16px':'19px',heroPad:m?'24px 16px 12px':'40px 32px 16px',searchPad:m?'14px':'18px',heroCols:m?'1fr':'1.2fr 1.1fr 1.1fr auto',heroMoreCols:m?'1fr 1fr':'repeat(5,minmax(0,1fr))',
      zoneOpts,typeOpts,lenOpts,brandOpts,condOpts,heroType,heroCond:f.cond[0]||'',heroMore:S.heroMore,toggleHeroMore:()=>this.setState(s=>({heroMore:!s.heroMore})),heroMoreText:S.heroMore?'Menos filtros':'+ Longitud, precio, marca y estado',
      heroCountText:totalAct>=100?`${this.count(f).toLocaleString('es-ES')} tablas coinciden`:`${this.count(f)} de ${totalAct} tablas publicadas coinciden`,
      doSearch:()=>go('buscar'),
      catCol:m?'140px':'minmax(0,1fr)',cats,heroTopCols:m?'1fr':'minmax(0,1.05fr) minmax(0,.95fr)',sellCols:m?'1fr':'minmax(0,1.1fr) minmax(0,.9fr)',sellImgH:m?'200px':'100%',
      heroQuick:[['Evolutivas 45–60 L',{types:['Evolutiva'],volMin:'45',volMax:'60'}],['Softboards',{cons:['Softboard']}],['Shortboard < 32 L',{types:['Shortboard'],volMax:'32'}],['Menos de 200 €',{priceMax:'200'}]].map(([l,p])=>({l,go:()=>{this.setState({f:{...EF(),...p}});go('buscar');}})),
      heroPick:near[0]?{show:true,img:U(BOARDS[near[0].img]).replace('w=900','w=200'),tag:`Recién publicada · ${ago(near[0].post)}`,title:this.title(near[0]),line:`${eur(near[0].price)} · ${near[0].vol?near[0].vol+' L':'litros s/i'} · ${near[0].town}`,open:()=>go('ficha',{cur:near[0].id,stOverride:null,photo:0})}:{show:false},
      hereOpts:ZONES.map(z=>({v:z.k,l:z.n})),here:S.here,hereName:ZN[S.here].n,
      nearCards:near.map(l=>this.card(l)),otherCards:other.map(l=>this.card(l)),hasOther:other.length>0,
      otherTitle:near.length?`Solo hay ${near.length} cerca · más tablas en otras zonas`:`Aún no hay tablas en ${ZN[S.here].n} · otras zonas`,
      nearAllText:`Ver ${zoneCount(S.here)} en ${ZN[S.here].n} →`,goNear:()=>{this.setState({f:{...EF(),zone:S.here}});go('buscar');},
      lowInv:totalAct<60||near.length<8,lowText:totalAct<60?`Hay ${totalAct} tablas publicadas en toda España, la mayoría en Canarias. Crea una alerta con tus medidas y te avisamos cuando aparezca una cerca.`:`Todavía hay pocas tablas en ${ZN[S.here].n}. Crea una alerta y te avisamos en cuanto se publique una.`,
      alertHere:()=>this.addAlert({...EF(),zone:S.here}),
      gridCols:m?'1fr':'repeat(auto-fill,minmax(230px,1fr))',gridGap:m?'10px':'16px',cardV:d,cardH:m,
      twoCols:m?'1fr':'minmax(0,1fr) minmax(0,1fr)',boxPad:m?'20px':'36px',bigNum:m?'34px':'44px',
      mini:S.mini,miniLevels:LEVELS.map(l=>this.chip(l,S.mini.lvl===l,()=>this.setState(s=>({mini:{...s.mini,lvl:l}})))),
      miniRec:{range:mr.lo?`${mr.lo}–${mr.hi} L`:'Indica tu peso',typesText:mr.types.join(', ')||'—',lens:mr.lens,count:miniCount},
      miniGo:()=>{if(!mr.lo)return;this.setState({profile:{lo:mr.lo,hi:mr.hi,types:mr.types,lvl:S.mini.lvl,w:+S.mini.w},f:{...EF(),volMin:String(mr.lo),volMax:String(mr.hi)}});go('buscar');},
      zoneCols:m?'1fr 1fr':'repeat(auto-fill,minmax(220px,1fr))',zoneCards,brandCols:m?'1fr 1fr':'repeat(4,minmax(0,1fr))',brandCards,
      guides:['Qué revisar al comprar una tabla usada','Cuántos litros necesita mi tabla','Qué tabla comprar después de una softboard'].map((t,i)=>({t,img:U(['1632334738554-95c79fb27eb7','1455729552865-3658a5d39692','1537519646099-335112f03225'][i]).replace('w=900','w=200'),go:i===0?()=>go('guia'):i===1?()=>go('calc'):()=>this.toast('Guía en preparación: usa la plantilla de guía')})),
      footCols:m?'1fr 1fr':'2fr 1fr 1fr 1fr',footBuy:[['Todas las tablas',{}],['Evolutivas',{types:['Evolutiva']}],['Softboards',{cons:['Softboard']}],['Gran Canaria',{zone:'gran-canaria'}],['Asturias',{zone:'asturias'}]].map(([l,p])=>({l,go:()=>{this.setState({f:{...EF(),...p}});go('buscar');}})),
      showTray:S.compare.length>0&&R!=='comparar'&&R!=='ficha'&&!S.sheet,trayItems:S.compare.map(id=>{const l=all.find(x=>x.id===id);return {l:l?`${l.brand||'Artesanal'} ${l.size}`:id,remove:()=>this.setState(s=>({compare:s.compare.filter(x=>x!==id)}))};}),trayBtnBg:S.compare.length>=2?'#FFFFFF':'#9DB0B4',
      toastText:S.toast,hasToast:!!S.toast};
    Object.assign(vals,this.searchVals(vals));
    Object.assign(vals,this.fichaVals(vals));
    Object.assign(vals,this.moreVals(vals));
    Object.assign(vals,this.proVals(vals));
    Object.assign(vals,this.homeVals(vals));
    Object.assign(vals,this.wizardVals(vals));
    return vals;
  }
}
