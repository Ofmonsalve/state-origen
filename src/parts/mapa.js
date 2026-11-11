/* ================= MAPA Y MUESTREOS ================= */
let muestreos = [], marcasPlanta = [], planesMuestreo = [], mapaConfig = {};
const MAPA_DEF = { umbralBroca:2, umbralRoya:5, gFruto:1.8, factorPergamino:5, diasFloracion:224 };
function cfgMapa() { return Object.assign({}, MAPA_DEF, mapaConfig || {}); }
const pctFrac = (a, b) => n0(a) > 0 ? n0(b) / n0(a) * 100 : 0;
const TIPOS_MUESTREO = {
  'Broca':               { campos:['Frutos evaluados','Frutos perforados'], unidad:'%', calc:pctFrac, umbral:() => cfgMapa().umbralBroca, desc:'En cada planta, una rama productiva del tercio medio: cuente los frutos y los perforados por broca.' },
  'Roya':                { campos:['Hojas evaluadas','Hojas con roya'], unidad:'%', calc:pctFrac, umbral:() => cfgMapa().umbralRoya, desc:'En cada planta, las hojas de una rama del tercio medio: cuente las que tienen lesiones de roya.' },
  'Sanidad general':     { campos:['Calificación 1 a 5'], unidad:'', calc:a => n0(a), umbral:() => 3, desc:'1 = planta sana y vigorosa, 5 = muy afectada (clorosis, plagas, enfermedad o daño).' },
  'Floración':           { campos:['Intensidad 0 a 4'], unidad:'', calc:a => n0(a), umbral:null, desc:'0 = sin flor, 1 = escasa, 2 = media, 3 = buena, 4 = floración abundante.' },
  'Frutos (proyección)': { campos:['Frutos por rama','Ramas productivas'], unidad:'frutos/planta', calc:(a,b) => n0(a)*n0(b), umbral:null, desc:'Cuente los frutos de una rama representativa y el número de ramas productivas de la planta.' },
};
const ESTADOS_PLANTA = { 'Observación':'var(--warn)', 'Tratada':'var(--info)', 'Faltante':'var(--danger)', 'Resiembra':'var(--s5)' };
const CAPAS = [['estructura','Estructura'],['Broca','Broca'],['Roya','Roya'],['Sanidad general','Sanidad'],['Floración','Floración'],['Frutos (proyección)','Frutos'],['marcas','Marcas']];
let mapaSt = { loteId:'', capa:'estructura', zoom:1, panX:0, panY:0, sel:null, hover:null, planId:null };

/* ---- Geometría del lote ---- */
function codigoLote(l) {
  if (l.codigo) return String(l.codigo).toUpperCase().replace(/[^A-Z0-9]/g,'') || 'L';
  const nom = String(l.nombre || 'L'); const dig = nom.match(/\d+/);
  const letras = nom.normalize('NFD').replace(/[^A-Za-z]/g,'').toUpperCase();
  return dig ? (letras[0] || 'L') + dig[0] : (letras.slice(0,3) || 'L');
}
function geomLote(l) {
  const d = l && l.diseno; const ha = n0(l && l.hectareas);
  if (!d || !ha || !n0(d.distSurcos) || !n0(d.distPlantas)) return null;
  const A = ha * 10000, r = Math.min(6, Math.max(0.25, n0(d.relacion) || 1.6));
  const ancho = Math.sqrt(A / r), largo = A / ancho;
  const nS = Math.max(1, Math.floor(ancho / d.distSurcos)), nP = Math.max(1, Math.floor(largo / d.distPlantas));
  const contorno = d.trazado !== 'pendiente';
  const amp = contorno ? Math.min(ancho * 0.05, 2.4) : 0;
  return { ancho, largo, nS, nP, total: nS*nP, ds: n0(d.distSurcos), dp: n0(d.distPlantas), ang: ((n0(d.orientacion) % 360) * Math.PI / 180), pend: n0(d.pendiente), contorno, amp, lam: Math.max(24, largo * 0.55), cod: codigoLote(l), ha };
}
function onda(g, y, i) { return g.amp * Math.sin(2*Math.PI*y/g.lam + i*0.045); }
function posPlanta(g, i, j) { const y = (j - 0.5) * g.dp; return { x: (i - 0.5) * g.ds + onda(g, y, i), y }; }
function codigoPlanta(g, i, j) { return g.cod + '-S' + String(i).padStart(2,'0') + '-P' + String(j).padStart(3,'0'); }
function parseCodigo(c) { const m = /-S(\d+)-P(\d+)$/.exec(c || ''); return m ? { i:+m[1], j:+m[2] } : null; }
function mulberry32(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---- Datos de capas ---- */
function campanas(loteId, tipo) {
  const m = new Map();
  muestreos.filter(x => x.loteId === loteId && (!tipo || x.tipo === tipo)).forEach(x => {
    const k = x.campanaId || (x.tipo + '|' + x.fecha);
    const c = m.get(k) || { id:k, tipo:x.tipo, fecha:x.fecha, regs:[] }; c.regs.push(x); if (x.fecha > c.fecha) c.fecha = x.fecha; m.set(k, c);
  });
  return [...m.values()].map(c => { const vals = c.regs.map(r => n0(r.valor)); const u = TIPOS_MUESTREO[c.tipo] && TIPOS_MUESTREO[c.tipo].umbral;
    return Object.assign(c, { n: vals.length, prom: vals.reduce((a,b)=>a+b,0) / (vals.length || 1), max: Math.max(...vals, 0), sobre: u ? vals.filter(v => v > u()).length : 0 }); })
    .sort((a,b) => b.fecha.localeCompare(a.fecha));
}
function ultimaCampana(loteId, tipo) { return campanas(loteId, tipo)[0] || null; }
function valoresCapa(loteId, tipo) { const c = ultimaCampana(loteId, tipo); const m = new Map(); if (c) c.regs.forEach(r => m.set(r.codigo, n0(r.valor))); return { campana:c, mapa:m }; }
function marcaDe(codigo) { return marcasPlanta.find(m => m.codigo === codigo) || null; }
function colorValor(tipo, v, pal, maxV) {
  const t = TIPOS_MUESTREO[tipo];
  if (t && t.umbral) { const u = t.umbral(); return v <= u ? pal.good : (v <= u*2 ? pal.warn : pal.danger); }
  if (tipo === 'Floración') return v >= 3 ? pal.s3 : (v >= 1.5 ? pal.s5 : pal.axis);
  return v >= maxV*0.66 ? pal.good : (v >= maxV*0.33 ? pal.warn : pal.danger);
}

/* ---- Dibujo ---- */
function paletaTema() {
  const cs = getComputedStyle(document.documentElement); const v = n => (cs.getPropertyValue(n) || '').trim();
  return { bg:v('--surface-2'), lote:v('--surface'), borde:v('--border-strong'), surco:v('--grid'), planta:v('--accent'), texto:v('--text'), suave:v('--text-soft'), axis:v('--axis'),
    good:v('--good'), warn:v('--warn'), danger:v('--danger'), info:v('--info'), s3:v('--s3'), s5:v('--s5'), acento:v('--accent'), acentoTinta:v('--accent-ink'), contorno:v('--pergamino') };
}
const PALETA_PDF = { bg:'#FFFFFF', lote:'#F4F7F2', borde:'#9AA79E', surco:'#DDE5DA', planta:'#1E6B45', texto:'#132018', suave:'#4A5850', axis:'#87938B', good:'#2C8653', warn:'#B4751A', danger:'#C2412D', info:'#2D6E8E', s3:'#B8935A', s5:'#6E9136', acento:'#1E6B45', acentoTinta:'#FFFFFF', contorno:'#B8935A' };
function transformacion(g, W, H, vista) {
  const cx = g.ancho/2, cy = g.largo/2, c = Math.cos(g.ang), s = Math.sin(g.ang);
  const pts = [[-g.amp,0],[g.ancho+g.amp,0],[-g.amp,g.largo],[g.ancho+g.amp,g.largo]].map(([x,y]) => { const dx=x-cx, dy=y-cy; return [dx*c-dy*s, dx*s+dy*c]; });
  const bw = Math.max(...pts.map(p=>p[0])) - Math.min(...pts.map(p=>p[0])), bh = Math.max(...pts.map(p=>p[1])) - Math.min(...pts.map(p=>p[1]));
  const k = Math.min((W - 56) / bw, (H - 56) / bh) * vista.zoom;
  return { k,
    aPantalla: (x, y) => { const dx=x-cx, dy=y-cy; return [W/2 + vista.panX + (dx*c-dy*s)*k, H/2 + vista.panY + (dx*s+dy*c)*k]; },
    aMundo: (sx, sy) => { const rx=(sx-W/2-vista.panX)/k, ry=(sy-H/2-vista.panY)/k; return [rx*c + ry*s + cx, -rx*s + ry*c + cy]; } };
}
function dibujarLote(ctx, W, H, l, g, pal, vista, opts) {
  opts = opts || {};
  ctx.save(); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  const T = transformacion(g, W, H, vista), k = T.k;
  // Contorno del lote, siguiendo la ondulación de los surcos
  const paso = Math.max(g.largo / 60, 0.5);
  ctx.beginPath();
  for (let y = 0; y <= g.largo + 0.01; y += paso) { const p = T.aPantalla(onda(g,y,0) - g.ds*0.5, y); y === 0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]); }
  for (let y = g.largo; y >= -0.01; y -= paso) { const p = T.aPantalla(g.ancho + onda(g,y,g.nS) - g.ds*0.5 + g.ds*0.5, y); ctx.lineTo(p[0],p[1]); }
  ctx.closePath(); ctx.fillStyle = pal.lote; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = pal.borde; ctx.stroke();
  ctx.save(); ctx.clip();
  // Curvas de nivel esquemáticas cada 2 m de desnivel, según la pendiente
  if (g.pend > 0) {
    const sep = 2 / (g.pend / 100);
    ctx.strokeStyle = pal.contorno; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
    if (g.contorno) {
      for (let x = sep/2, n = 1; x < g.ancho + g.amp; x += sep, n++) { ctx.beginPath(); for (let y = -2; y <= g.largo + 2; y += paso) { const p = T.aPantalla(x + onda(g,y,x/g.ds) - g.ds*0.5, y); y <= -2 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]); } ctx.stroke(); }
    } else {
      for (let y = sep/2; y < g.largo; y += sep) { ctx.beginPath(); for (let x = -2; x <= g.ancho + 2; x += Math.max(g.ancho/40, 0.5)) { const p = T.aPantalla(x, y + 1.2*Math.sin(2*Math.PI*x/Math.max(20,g.ancho*0.7))); x <= -2 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]); } ctx.stroke(); }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // Datos de la capa activa
  const capa = opts.capa || 'estructura';
  const datos = TIPOS_MUESTREO[capa] ? valoresCapa(l.id, capa) : null;
  const maxV = datos ? Math.max(1, ...datos.mapa.values()) : 1;
  // Bandas por surco con el promedio de la capa
  if (datos && datos.mapa.size) {
    const porSurco = new Map(); datos.mapa.forEach((v, cod) => { const p = parseCodigo(cod); if (!p) return; const a = porSurco.get(p.i) || []; a.push(v); porSurco.set(p.i, a); });
    ctx.lineCap = 'round';
    porSurco.forEach((vals, i) => { const prom = vals.reduce((a,b)=>a+b,0)/vals.length; ctx.strokeStyle = colorValor(capa, prom, pal, maxV); ctx.globalAlpha = 0.16; ctx.lineWidth = Math.max(2, g.ds*k*0.8);
      ctx.beginPath(); for (let j = 1; j <= g.nP; j += Math.max(1, Math.floor(g.nP/40))) { const q = posPlanta(g,i,j), p = T.aPantalla(q.x, q.y); j === 1 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]); } const q2 = posPlanta(g,i,g.nP), p2 = T.aPantalla(q2.x,q2.y); ctx.lineTo(p2[0],p2[1]); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  // Líneas de surco
  if (g.ds * k > 3) {
    ctx.strokeStyle = pal.surco; ctx.lineWidth = 1;
    for (let i = 1; i <= g.nS; i++) { ctx.beginPath(); for (let j = 0; j <= g.nP; j += Math.max(1, Math.floor(g.nP/40))) { const q = posPlanta(g,i,Math.max(j,0.5)), p = T.aPantalla(q.x, q.y); j === 0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]); } const q = posPlanta(g,i,g.nP), p = T.aPantalla(q.x,q.y); ctx.lineTo(p[0],p[1]); ctx.stroke(); }
  }
  // Plantas
  const r = Math.max(0.9, Math.min(g.ds, g.dp) * k * 0.27);
  const fino = r < 1.6;
  for (let i = 1; i <= g.nS; i++) for (let j = 1; j <= g.nP; j++) {
    const q = posPlanta(g,i,j), p = T.aPantalla(q.x, q.y);
    if (p[0] < -10 || p[1] < -10 || p[0] > W+10 || p[1] > H+10) continue;
    const cod = codigoPlanta(g,i,j); const mk = marcaDe(cod);
    if (mk && mk.estado === 'Faltante') { ctx.strokeStyle = pal.danger; ctx.lineWidth = 1.2; const e = Math.max(r, 2); ctx.beginPath(); ctx.moveTo(p[0]-e,p[1]-e); ctx.lineTo(p[0]+e,p[1]+e); ctx.moveTo(p[0]+e,p[1]-e); ctx.lineTo(p[0]-e,p[1]+e); ctx.stroke(); continue; }
    let col = pal.planta, alpha = capa === 'estructura' ? 0.8 : 0.3, radio = r;
    if (datos && datos.mapa.has(cod)) { col = colorValor(capa, datos.mapa.get(cod), pal, maxV); alpha = 1; radio = Math.max(r*1.5, 3); }
    if (capa === 'marcas' && mk) { col = ESTADOS_PLANTA[mk.estado] ? pal[{ 'Observación':'warn', 'Tratada':'info', 'Resiembra':'s5' }[mk.estado]] : pal.planta; alpha = 1; radio = Math.max(r*1.5, 3); }
    ctx.globalAlpha = alpha; ctx.fillStyle = col;
    if (fino && alpha < 1) ctx.fillRect(p[0]-0.8, p[1]-0.8, 1.6, 1.6);
    else { ctx.beginPath(); ctx.arc(p[0], p[1], radio, 0, Math.PI*2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore(); // fin del recorte al lote
  // Plan de muestreo: anillos numerados
  const plan = opts.plan;
  if (plan) plan.codigos.forEach((cod, n) => { const pc = parseCodigo(cod); if (!pc) return; const q = posPlanta(g, pc.i, pc.j), p = T.aPantalla(q.x, q.y); const rr = Math.max(6, r*2.4);
    ctx.lineWidth = 2; ctx.strokeStyle = pal.acento; ctx.fillStyle = pal.lote; ctx.beginPath(); ctx.arc(p[0],p[1],rr,0,Math.PI*2); ctx.fill(); ctx.stroke();
    if (rr >= 7) { ctx.fillStyle = pal.acento; ctx.font = '600 ' + Math.min(11, rr) + 'px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n+1), p[0], p[1]+0.5); } });
  // Planta bajo el cursor y seleccionada
  [[opts.hover, 1.5, 0.6], [opts.sel, 2.5, 1]].forEach(([cod, lw, a]) => { const pc = parseCodigo(cod); if (!pc) return; const q = posPlanta(g,pc.i,pc.j), p = T.aPantalla(q.x,q.y); ctx.globalAlpha = a; ctx.lineWidth = lw; ctx.strokeStyle = pal.texto; ctx.beginPath(); ctx.arc(p[0],p[1], Math.max(7, r*2.6), 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; });
  // Rótulos de surco
  if (g.ds * k >= 11) { ctx.fillStyle = pal.suave; ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pasoS = g.ds*k >= 22 ? 1 : (g.ds*k >= 14 ? 2 : 5);
    for (let i = 1; i <= g.nS; i += pasoS) { const q = posPlanta(g, i, 0), p = T.aPantalla(q.x, q.y - g.dp*0.9); ctx.fillText('S' + String(i).padStart(2,'0'), p[0], p[1]); } }
  // Escala y norte
  const metros = [1,2,5,10,20,50,100].find(mm => mm * k >= 60) || 100;
  ctx.fillStyle = pal.texto; ctx.strokeStyle = pal.texto; ctx.lineWidth = 1.5; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.beginPath(); ctx.moveTo(16, H-18); ctx.lineTo(16 + metros*k, H-18); ctx.moveTo(16, H-22); ctx.lineTo(16, H-14); ctx.moveTo(16+metros*k, H-22); ctx.lineTo(16+metros*k, H-14); ctx.stroke();
  ctx.fillText(metros + ' m', 16, H-26);
  ctx.beginPath(); ctx.moveTo(26, 22); ctx.lineTo(20, 38); ctx.lineTo(26, 34); ctx.lineTo(32, 38); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.fillText('N', 26, 52);
  ctx.restore();
  return T;
}

/* ---- Canvas interactivo ---- */
let _mapaT = null, _mapaPtr = new Map(), _mapaArr = null;
function loteMapa() { return lotes.find(l => l.id === mapaSt.loteId) || null; }
function planActivo() { return planesMuestreo.find(p => p.id === mapaSt.planId) || null; }
function dibujarMapa() {
  const cv = document.getElementById('mapa-canvas'); if (!cv) return;
  const l = loteMapa(), g = l && geomLote(l), vacio = document.getElementById('mapa-vacio');
  const W = Math.max(280, cv.parentElement.clientWidth || 600), H = Math.round(Math.min(640, Math.max(380, W * 0.66)));
  const dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  const ctx = cv.getContext && cv.getContext('2d');
  if (!g) {
    vacio.hidden = false;
    vacio.innerHTML = !lotes.length ? '<b>Aún no hay lotes</b><span>Crea la finca y sus lotes con hectáreas en Finca y lotes.</span><button class="btn primary small" onclick="ir(\'gestion\');showSub(\'lotes\')">Crear lote</button>'
      : '<b>Este lote todavía no tiene diseño</b><span>Indica la distancia entre surcos y entre plantas, la orientación y la pendiente. La app dibuja los surcos y codifica cada planta.</span><button class="btn primary small" onclick="abrirDisenoLote()">Definir diseño del lote</button>';
    if (ctx) { ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle = paletaTema().bg; ctx.fillRect(0,0,W,H); }
    _mapaT = null; return;
  }
  vacio.hidden = true;
  if (!ctx) { _mapaT = transformacion(g, W, H, mapaSt); return; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  _mapaT = dibujarLote(ctx, W, H, l, g, paletaTema(), mapaSt, { capa:mapaSt.capa, plan:planActivo(), sel:mapaSt.sel, hover:mapaSt.hover });
}
function plantaEn(sx, sy) {
  const l = loteMapa(), g = l && geomLote(l); if (!g || !_mapaT) return null;
  const [x, y] = _mapaT.aMundo(sx, sy);
  const j = Math.round(y / g.dp + 0.5); if (j < 1 || j > g.nP) return null;
  const yj = (j - 0.5) * g.dp;
  const i = Math.round((x - onda(g, yj, 0)) / g.ds + 0.5); if (i < 1 || i > g.nS) return null;
  const q = posPlanta(g, i, j); if (Math.hypot(q.x - x, q.y - y) > Math.max(g.ds, g.dp) * 0.65) return null;
  return codigoPlanta(g, i, j);
}
function posCanvas(e) { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function mapaZoom(f, cx, cy) {
  const cv = document.getElementById('mapa-canvas'); const W = cv.clientWidth || 600, H = cv.clientHeight || 400;
  if (cx == null) { cx = W/2; cy = H/2; }
  const nz = Math.min(40, Math.max(0.5, mapaSt.zoom * f)), real = nz / mapaSt.zoom;
  mapaSt.panX = (mapaSt.panX - (cx - W/2)) * real + (cx - W/2);
  mapaSt.panY = (mapaSt.panY - (cy - H/2)) * real + (cy - H/2);
  mapaSt.zoom = nz; dibujarMapa();
}
function mapaAjustar() { mapaSt.zoom = 1; mapaSt.panX = 0; mapaSt.panY = 0; dibujarMapa(); }
function mostrarTip(cod, sx, sy) {
  const tip = document.getElementById('mapa-tip'); if (!tip) return;
  if (!cod) { tip.hidden = true; return; }
  const pc = parseCodigo(cod); const mk = marcaDe(cod);
  const vals = Object.keys(TIPOS_MUESTREO).map(t => { const v = valoresCapa(mapaSt.loteId, t).mapa.get(cod); return v == null ? '' : t.split(' ')[0] + ' ' + num(redondear(v,1)) + (TIPOS_MUESTREO[t].unidad === '%' ? '%' : ''); }).filter(Boolean);
  tip.innerHTML = `<b>${esc(cod)}</b><br>Surco ${pc.i} · planta ${pc.j}${mk ? ' · ' + esc(mk.estado) : ''}${vals.length ? '<br>' + esc(vals.join(' · ')) : ''}`;
  tip.style.left = sx + 'px'; tip.style.top = sy + 'px'; tip.hidden = false;
}
function prepararCanvasMapa() {
  const cv = document.getElementById('mapa-canvas'); if (!cv || cv._listo) return; cv._listo = true;
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (_) {} _mapaPtr.set(e.pointerId, posCanvas(e)); _mapaArr = { x:posCanvas(e)[0], y:posCanvas(e)[1], px:mapaSt.panX, py:mapaSt.panY, movido:false, dist:null, zoom:mapaSt.zoom }; });
  cv.addEventListener('pointermove', e => {
    const [x, y] = posCanvas(e);
    if (_mapaPtr.has(e.pointerId)) _mapaPtr.set(e.pointerId, [x, y]);
    if (_mapaPtr.size === 2 && _mapaArr) { const [a, b] = [..._mapaPtr.values()]; const d = Math.hypot(a[0]-b[0], a[1]-b[1]); if (!_mapaArr.dist) _mapaArr.dist = d; else { mapaSt.zoom = _mapaArr.zoom; mapaZoom(d / _mapaArr.dist, (a[0]+b[0])/2, (a[1]+b[1])/2); } _mapaArr.movido = true; return; }
    if (_mapaArr && _mapaPtr.size === 1) { const dx = x - _mapaArr.x, dy = y - _mapaArr.y; if (Math.abs(dx) + Math.abs(dy) > 4) { _mapaArr.movido = true; cv.classList.add('arrastrando'); mapaSt.panX = _mapaArr.px + dx; mapaSt.panY = _mapaArr.py + dy; mostrarTip(null); dibujarMapa(); } return; }
    const cod = plantaEn(x, y);
    if (cod !== mapaSt.hover) { mapaSt.hover = cod; dibujarMapa(); }
    mostrarTip(cod, x, y);
  });
  const fin = e => { const [x, y] = posCanvas(e); _mapaPtr.delete(e.pointerId); cv.classList.remove('arrastrando');
    if (_mapaArr && !_mapaArr.movido && _mapaPtr.size === 0) { const cod = plantaEn(x, y); if (cod) seleccionarPlanta(cod); }
    if (_mapaPtr.size === 0) _mapaArr = null; };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('pointerleave', () => { if (mapaSt.hover) { mapaSt.hover = null; dibujarMapa(); } mostrarTip(null); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = posCanvas(e); mapaZoom(e.deltaY < 0 ? 1.15 : 1/1.15, x, y); }, { passive:false });
  if (window.ResizeObserver) new ResizeObserver(() => { if (document.getElementById('view-mapa').classList.contains('active')) dibujarMapa(); }).observe(cv.parentElement);
}

/* ---- Render de la vista ---- */
function renderMapa() {
  if (!document.getElementById('view-mapa')) return;
  prepararCanvasMapa();
  const sel = document.getElementById('mp-lote');
  if (!lotes.some(l => l.id === mapaSt.loteId)) { mapaSt.loteId = (lotes.find(l => geomLote(l)) || lotes[0] || {}).id || ''; mapaSt.sel = null; }
  sel.innerHTML = lotes.length ? lotes.map(l => `<option value="${l.id}" ${l.id===mapaSt.loteId?'selected':''}>${esc(l.nombre)} · ${esc(nombreFinca(l.fincaId))}${geomLote(l)?'':' · sin diseño'}</option>`).join('') : '<option value="">Sin lotes</option>';
  document.getElementById('mp-capas').innerHTML = CAPAS.map(([k, t]) => `<button role="tab" aria-selected="${mapaSt.capa===k}" class="${mapaSt.capa===k?'on':''}" onclick="mapaCapa('${k}')">${t}</button>`).join('');
  const plan = planActivo(); const chip = document.getElementById('mp-plan-chip');
  if (plan && plan.loteId === mapaSt.loteId) { chip.hidden = false; chip.innerHTML = `Plan de ${esc(plan.tipo.toLowerCase())} · ${plan.codigos.length} plantas · ${fechaCorta(plan.fecha)} <button onclick="abrirResultadosPlan('${plan.id}')">Registrar</button><button onclick="cerrarPlanMapa()" aria-label="Ocultar plan">✕</button>`; }
  else { chip.hidden = true; if (plan) mapaSt.planId = null; }
  renderLeyenda(); renderInfoLote(); renderPlantaSel(); renderTablaMuestreos(); renderParamsMapa();
  dibujarMapa();
}
function mapaCambiarLote(id) { mapaSt.loteId = id; mapaSt.sel = null; mapaSt.hover = null; mapaSt.planId = null; mapaAjustar(); renderMapa(); }
function mapaCapa(k) { mapaSt.capa = k; renderMapa(); }
function cerrarPlanMapa() { mapaSt.planId = null; renderMapa(); }
function renderLeyenda() {
  const c = mapaSt.capa, t = TIPOS_MUESTREO[c]; let h = '';
  if (c === 'estructura') h = '<span class="lg"><i style="background:var(--accent)"></i>Planta</span><span class="lg"><i style="background:transparent;border:1.5px dashed var(--pergamino);border-radius:0;height:0;width:14px"></i>Curva de nivel cada 2 m (esquemática)</span><span class="lg" style="color:var(--danger)">✕ Faltante</span>';
  else if (c === 'marcas') h = Object.keys(ESTADOS_PLANTA).map(e => `<span class="lg"><i style="background:${ESTADOS_PLANTA[e]}"></i>${e}</span>`).join('');
  else if (t && t.umbral) { const u = t.umbral(); h = `<span class="lg"><i style="background:var(--good)"></i>≤ ${num(u)}${t.unidad}</span><span class="lg"><i style="background:var(--warn)"></i>hasta ${num(u*2)}${t.unidad}</span><span class="lg"><i style="background:var(--danger)"></i>más de ${num(u*2)}${t.unidad}</span>`; }
  else if (c === 'Floración') h = '<span class="lg"><i style="background:var(--s3)"></i>Floración buena o abundante (3–4)</span><span class="lg"><i style="background:var(--s5)"></i>Media (2)</span><span class="lg"><i style="background:var(--axis)"></i>Escasa (0–1)</span>';
  else h = '<span class="lg"><i style="background:var(--good)"></i>Carga alta</span><span class="lg"><i style="background:var(--warn)"></i>Media</span><span class="lg"><i style="background:var(--danger)"></i>Baja</span>';
  if (planActivo()) h += '<span class="lg"><i class="ring"></i>Planta del plan de muestreo</span>';
  const camp = TIPOS_MUESTREO[c] ? ultimaCampana(mapaSt.loteId, c) : null;
  h += `<span class="nota">${camp ? 'Último muestreo: ' + fechaCorta(camp.fecha) + ' · ' + camp.n + ' plantas' : (TIPOS_MUESTREO[c] ? 'Sin muestreos de esta capa' : 'Arrastra para mover · rueda o pellizco para acercar')}</span>`;
  document.getElementById('mp-leyenda').innerHTML = h;
}
function proyeccionLote(l) {
  const g = geomLote(l); if (!g) return null; const cfg = cfgMapa();
  const c = ultimaCampana(l.id, 'Frutos (proyección)');
  const faltantes = marcasPlanta.filter(m => m.loteId === l.id && m.estado === 'Faltante').length;
  const vivas = g.total - faltantes;
  if (!c) return { vivas, faltantes };
  const kgCereza = c.prom * vivas * n0(cfg.gFruto) / 1000;
  return { vivas, faltantes, campana:c, kgCereza, kgPerg: kgCereza / (n0(cfg.factorPergamino) || 5) };
}
function renderInfoLote() {
  const l = loteMapa(), host = document.getElementById('mp-lote-info'); const g = l && geomLote(l);
  if (!g) { host.innerHTML = '<p class="hint" style="margin:0;">Defina el diseño del lote para ver su estructura, sanidad y proyección.</p>'; return; }
  const pr = proyeccionLote(l); const cfg = cfgMapa();
  const sem = (tipo) => { const c = ultimaCampana(l.id, tipo); if (!c) return '<b style="color:var(--text-faint);font-weight:500;">sin datos</b>';
    const u = TIPOS_MUESTREO[tipo].umbral(); const cls = c.prom <= u ? 'cerrada' : (c.prom <= 2*u ? 'ejecucion' : 'cancelada');
    return `<b><span class="pill ${cls}">${num(redondear(c.prom,1))}%</span> <span style="color:var(--text-faint);font-weight:500;font-size:11.5px;">${fechaCorta(c.fecha)}</span></b>`; };
  const flor = ultimaCampana(l.id, 'Floración');
  host.innerHTML = `
    <div class="kv"><span>Código del lote</span><b>${esc(g.cod)}</b></div>
    <div class="kv"><span>Surcos × plantas por surco</span><b>${g.nS} × ${g.nP}</b></div>
    <div class="kv"><span>Plantas vivas / diseño</span><b>${num(pr.vivas)} / ${num(g.total)}</b></div>
    <div class="kv"><span>Densidad</span><b>${num(Math.round(g.total / g.ha))} pl/ha</b></div>
    <div class="kv"><span>Pendiente · trazado</span><b>${num(g.pend)}% · ${g.contorno ? 'curvas de nivel' : 'a favor de la pendiente'}</b></div>
    <div class="kv"><span>Broca (umbral ${num(cfg.umbralBroca)}%)</span>${sem('Broca')}</div>
    <div class="kv"><span>Roya (umbral ${num(cfg.umbralRoya)}%)</span>${sem('Roya')}</div>
    <div class="kv"><span>Última floración</span><b>${flor ? fechaCorta(flor.fecha) + ' · intensidad ' + num(redondear(flor.prom,1)) : '—'}</b></div>
    <div class="kv"><span>Cosecha estimada de esa flor</span><b>${flor ? fechaCorta(sumarDias(flor.fecha, n0(cfg.diasFloracion))) + ' ' + parseFecha(sumarDias(flor.fecha, n0(cfg.diasFloracion))).getUTCFullYear() : '—'}</b></div>
    <div class="kv"><span>Proyección de cereza</span><b>${pr.kgCereza != null ? num(Math.round(pr.kgCereza)) + ' kg' : '—'}</b></div>
    <div class="kv"><span>Pergamino seco estimado</span><b>${pr.kgPerg != null ? num(Math.round(pr.kgPerg)) + ' kg · ' + num(redondear(pr.kgPerg/125,1)) + ' cargas' : '—'}</b></div>
    ${pr.kgCereza == null ? '<p class="hint" style="margin:10px 0 0;">Para proyectar la cosecha, haga un muestreo de frutos (capa Frutos).</p>' : ''}`;
}
function seleccionarPlanta(cod) { mapaSt.sel = cod; renderPlantaSel(); dibujarMapa(); }
function renderPlantaSel() {
  const host = document.getElementById('mp-planta'); const cod = mapaSt.sel; const l = loteMapa(); const g = l && geomLote(l);
  if (!cod || !g || !parseCodigo(cod) || parseCodigo(cod).i > g.nS || parseCodigo(cod).j > g.nP) { mapaSt.sel = null; host.innerHTML = '<p class="hint" style="margin:0;">Toca una planta del mapa para ver su código, su historial y marcarla.</p>'; return; }
  const pc = parseCodigo(cod), q = posPlanta(g, pc.i, pc.j), mk = marcaDe(cod);
  const hist = muestreos.filter(m => m.codigo === cod).sort((a,b) => b.fecha.localeCompare(a.fecha));
  host.innerHTML = `
    <div class="planta-code">${esc(cod)}</div>
    <p class="hint" style="margin:2px 0 10px;">Surco ${pc.i} de ${g.nS} · planta ${pc.j} de ${g.nP} · a ${num(Math.round(q.y))} m del inicio del surco</p>
    ${hist.length ? hist.slice(0,6).map(h => `<div class="kv"><span>${esc(h.tipo)} · ${fechaCorta(h.fecha)}</span><b>${num(redondear(h.valor,1))}${TIPOS_MUESTREO[h.tipo]&&TIPOS_MUESTREO[h.tipo].unidad==='%'?'%':''}</b></div>`).join('') : '<p class="hint" style="margin:0 0 6px;">Sin muestreos registrados en esta planta.</p>'}
    <div class="sec-label" style="margin-top:14px;">Marcar planta</div>
    <div class="marca-btns">${Object.keys(ESTADOS_PLANTA).map(e => `<button class="btn ghost small ${mk&&mk.estado===e?'on':''}" onclick="marcarPlanta('${cod}','${e}')">${e}</button>`).join('')}${mk ? `<button class="btn danger-ghost" onclick="marcarPlanta('${cod}','')">Quitar marca</button>` : ''}</div>
    ${mk ? `<p class="hint" style="margin:8px 0 0;">Marcada como ${esc(mk.estado.toLowerCase())} el ${fechaCorta(mk.fecha)}.</p>` : ''}
    <button class="btn primary small block" style="margin-top:12px;" onclick="abrirRegistroMuestreo('${cod}')">Registrar muestreo en esta planta</button>`;
}
function marcarPlanta(cod, estado) {
  marcasPlanta = marcasPlanta.filter(m => m.codigo !== cod);
  if (estado) marcasPlanta.push({ codigo:cod, loteId:mapaSt.loteId, estado, fecha:hoyLocal() });
  guardarEstado(); renderMapa(); toast(estado ? cod + ' marcada: ' + estado.toLowerCase() : 'Marca retirada de ' + cod);
}
function renderTablaMuestreos() {
  const host = document.getElementById('tabla-muestreos'); const l = loteMapa();
  const cs = l ? campanas(l.id) : []; const cfg = cfgMapa();
  host.innerHTML = `<thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Plantas</th><th class="num">Promedio</th><th class="num">Máximo</th><th>Lectura</th><th></th></tr></thead>
    <tbody>${cs.map(c => { const t = TIPOS_MUESTREO[c.tipo] || {}; const u = t.umbral ? t.umbral() : null; const uni = t.unidad === '%' ? '%' : '';
      let lectura = '—';
      if (u != null) lectura = c.prom <= u ? `<span class="pill cerrada">Bajo el umbral</span>` : `<span class="pill ${c.prom<=2*u?'ejecucion':'cancelada'}">${c.sobre} planta(s) sobre ${num(u)}${uni}</span>`;
      else if (c.tipo === 'Floración') lectura = 'Cosecha estimada ' + fechaCorta(sumarDias(c.fecha, n0(cfg.diasFloracion))) + ' ' + parseFecha(sumarDias(c.fecha, n0(cfg.diasFloracion))).getUTCFullYear();
      else if (c.tipo === 'Frutos (proyección)') { const pr = proyeccionLote(l); lectura = c.id === (pr.campana||{}).id ? num(Math.round(pr.kgCereza)) + ' kg de cereza proyectados' : 'Proyección anterior'; }
      return `<tr><td>${fechaCorta(c.fecha)}</td><td>${esc(c.tipo)}</td><td class="num">${c.n}</td><td class="num">${num(redondear(c.prom,1))}${uni}</td><td class="num">${num(redondear(c.max,1))}${uni}</td><td>${lectura}</td>
        <td class="actions"><button class="btn ghost small" onclick="verCampana('${esc(c.tipo)}')">Ver en mapa</button> <button class="btn danger-ghost" onclick="eliminarCampana('${esc(c.id)}')">Eliminar</button></td></tr>`; }).join('')
      || '<tr><td colspan="7" style="color:var(--text-faint);">Sin muestreos en este lote. Genera un plan de muestreo para empezar.</td></tr>'}</tbody>`;
}
function verCampana(tipo) { mapaCapa(tipo); try { document.getElementById('mapa-wrap').scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {} }
function eliminarCampana(id) {
  conDeshacer('Muestreo eliminado', () => { muestreos = muestreos.filter(m => (m.campanaId || (m.tipo + '|' + m.fecha)) !== id || m.loteId !== mapaSt.loteId); guardarEstado(); renderMapa(); renderHoy(); });
}
function renderParamsMapa() {
  const c = cfgMapa(); [['mc-broca','umbralBroca'],['mc-roya','umbralRoya'],['mc-gfruto','gFruto'],['mc-factor','factorPergamino'],['mc-dias','diasFloracion']].forEach(([id,k]) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = c[k]; });
}
function guardarParametrosMapa() {
  const g = id => n0(document.getElementById(id).value);
  const nv = { umbralBroca:g('mc-broca'), umbralRoya:g('mc-roya'), gFruto:g('mc-gfruto'), factorPergamino:g('mc-factor'), diasFloracion:g('mc-dias') };
  if (Object.values(nv).some(v => v <= 0)) { alert('Todos los parámetros deben ser mayores que cero.'); return; }
  mapaConfig = nv; guardarEstado(); renderMapa(); toast('Parámetros de referencia guardados');
}

/* ---- Diseño del lote ---- */
function abrirDisenoLote() {
  const l = loteMapa(); if (!l) { alert('Primero crea un lote en Finca y lotes.'); return; }
  const d = Object.assign({ distSurcos:1.5, distPlantas:1, relacion:1.6, orientacion:0, pendiente:30, trazado:'contorno' }, l.diseno || {});
  openModal(`
    <h3>Diseño del lote ${esc(l.nombre)}</h3>
    <p class="hint">Con estos datos la app traza los surcos, numera cada planta y calcula la densidad. Si cambia el diseño después de muestrear, los códigos de las plantas pueden cambiar.</p>
    <div class="fgrid c3">
      <label class="f">Código del lote<input id="dl-codigo" value="${esc(l.codigo || codigoLote(l))}" maxlength="6"></label>
      <label class="f">Área (ha)<input id="dl-ha" type="number" step="0.01" value="${esc(l.hectareas || '')}" oninput="previewDiseno()"></label>
      <label class="f">Variedad<input value="${esc(nombreVariedad(l.variedadId))}" disabled></label>
      <label class="f">Distancia entre surcos (m)<input id="dl-ds" type="number" step="0.05" value="${d.distSurcos}" oninput="previewDiseno()"></label>
      <label class="f">Distancia entre plantas (m)<input id="dl-dp" type="number" step="0.05" value="${d.distPlantas}" oninput="previewDiseno()"></label>
      <label class="f">Forma (largo ÷ ancho)<input id="dl-rel" type="number" step="0.1" value="${d.relacion}" oninput="previewDiseno()"></label>
      <label class="f">Orientación de los surcos (°)<input id="dl-ori" type="number" step="5" value="${d.orientacion}" oninput="previewDiseno()"></label>
      <label class="f">Pendiente promedio (%)<input id="dl-pend" type="number" step="1" value="${d.pendiente}" oninput="previewDiseno()"></label>
      <label class="f">Trazado de los surcos<select id="dl-traz" onchange="previewDiseno()"><option value="contorno" ${d.trazado!=='pendiente'?'selected':''}>En curvas de nivel</option><option value="pendiente" ${d.trazado==='pendiente'?'selected':''}>A favor de la pendiente</option></select></label>
    </div>
    <div class="sec-label">Resultado</div>
    <div class="budget-box" id="dl-prev"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarDisenoLote()">Guardar diseño</button></div>`, true);
  previewDiseno();
}
function leerDiseno() { const g = id => document.getElementById(id).value; return { distSurcos:n0(g('dl-ds')), distPlantas:n0(g('dl-dp')), relacion:n0(g('dl-rel'))||1.6, orientacion:n0(g('dl-ori')), pendiente:n0(g('dl-pend')), trazado:g('dl-traz') }; }
function previewDiseno() {
  const l = loteMapa(); const ge = geomLote(Object.assign({}, l, { hectareas:document.getElementById('dl-ha').value, diseno:leerDiseno(), codigo:document.getElementById('dl-codigo').value }));
  document.getElementById('dl-prev').innerHTML = ge ? `<div><div class="n">${ge.nS}</div><div class="l">Surcos</div></div><div><div class="n">${ge.nP}</div><div class="l">Plantas por surco</div></div><div><div class="n">${num(ge.total)}</div><div class="l">Plantas</div></div><div class="total"><div class="n">${num(Math.round(ge.total/ge.ha))}</div><div class="l">Plantas por hectárea</div></div>`
    : '<div style="grid-column:1/-1;color:var(--text-faint);font-size:13px;">Complete el área y las distancias para ver el resultado.</div>';
}
function guardarDisenoLote() {
  const l = lotes.find(x => x.id === mapaSt.loteId); if (!l) return;
  const d = leerDiseno(); const ha = n0(document.getElementById('dl-ha').value);
  if (!ha) { alert('Indique el área del lote en hectáreas.'); return; }
  if (d.distSurcos < 0.5 || d.distPlantas < 0.3) { alert('Revise las distancias: entre surcos al menos 0,5 m y entre plantas al menos 0,3 m.'); return; }
  if (d.pendiente < 0 || d.pendiente > 150) { alert('La pendiente debe estar entre 0 y 150 %.'); return; }
  l.hectareas = String(ha); l.diseno = d; l.codigo = String(document.getElementById('dl-codigo').value || '').toUpperCase().replace(/[^A-Z0-9]/g,'') || codigoLote(Object.assign({}, l, { codigo:'' }));
  const g = geomLote(l); l.densidad = num(Math.round(g.total / g.ha)) + ' plantas/ha';
  closeModal(); guardarEstado(); mapaAjustar(); renderMapa(); renderGestionTablas(); renderHoy();
  toast('Diseño guardado: ' + g.nS + ' surcos y ' + num(g.total) + ' plantas codificadas');
}

/* ---- Plan de muestreo y registro de resultados ---- */
function puntosMuestreo(g, n, semilla) {
  const rnd = mulberry32(semilla); n = Math.max(1, Math.min(n, g.total));
  const bS = g.nS > 8 ? 2 : 0, bP = g.nP > 12 ? 3 : 0;
  const s0 = 1 + bS, s1 = g.nS - bS, p0 = 1 + bP, p1 = g.nP - bP;
  const usados = new Set(), out = [];
  for (let k = 0; k < n; k++) {
    let i = n === 1 ? Math.round((s0+s1)/2) : Math.round(s0 + k * (s1 - s0) / (n - 1));
    const f = (k % 2 ? 0.72 : 0.28) + (rnd() - 0.5) * 0.36;
    let j = Math.round(p0 + Math.min(1, Math.max(0, f)) * (p1 - p0));
    let cod = codigoPlanta(g, i, j), intentos = 0;
    while ((usados.has(cod) || (marcaDe(cod) && marcaDe(cod).estado === 'Faltante')) && intentos < 50) { j = Math.round(p0 + rnd() * (p1 - p0)); i = Math.round(s0 + rnd() * (s1 - s0)); cod = codigoPlanta(g, i, j); intentos++; }
    usados.add(cod); out.push(cod);
  }
  return out;
}
function abrirPlanMuestreo() {
  const l = loteMapa(); const g = l && geomLote(l); if (!g) { abrirDisenoLote(); return; }
  openModal(`
    <h3>Plan de muestreo · ${esc(l.nombre)}</h3>
    <p class="hint">La app elige plantas repartidas en todo el lote en un recorrido en zigzag, evitando los bordes, y las numera en el mapa en el orden de recorrido. Llévelo impreso o abra el lote en el celular.</p>
    <div class="fgrid c2">
      <label class="f">Tipo de muestreo<select id="pm-tipo" onchange="document.getElementById('pm-desc').textContent=TIPOS_MUESTREO[this.value].desc">${Object.keys(TIPOS_MUESTREO).map(t=>`<option>${t}</option>`).join('')}</select></label>
      <label class="f">Número de plantas<input id="pm-n" type="number" min="5" max="200" value="${Math.min(30, g.total)}"></label>
      <label class="f">Fecha<input id="pm-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Responsable<input id="pm-resp" placeholder="Quién hace el muestreo"></label>
    </div>
    <p class="hint" id="pm-desc" style="margin-top:10px;">${TIPOS_MUESTREO['Broca'].desc}</p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="crearPlanMuestreo()">Generar plan</button></div>`);
}
function crearPlanMuestreo() {
  const l = loteMapa(), g = geomLote(l);
  const tipo = document.getElementById('pm-tipo').value, n = Math.round(n0(document.getElementById('pm-n').value));
  const fecha = document.getElementById('pm-fecha').value || hoyLocal(), resp = document.getElementById('pm-resp').value.trim();
  if (n < 1) { alert('Indique cuántas plantas muestrear.'); return; }
  const plan = { id:uid('pm'), loteId:l.id, tipo, fecha, responsable:resp, codigos:puntosMuestreo(g, n, Math.floor(Math.random()*1e9)), creado:hoyLocal() };
  planesMuestreo = planesMuestreo.filter(p => p.loteId !== l.id || p.id === plan.id).concat(plan).slice(-30);
  mapaSt.planId = plan.id; mapaSt.capa = TIPOS_MUESTREO[tipo] ? tipo : mapaSt.capa;
  closeModal(); guardarEstado(); renderMapa();
  toast('Plan listo: ' + plan.codigos.length + ' plantas marcadas en el mapa', null, { label:'Hoja de campo (PDF)', fn:() => exportarHojaMuestreoPDF(plan.id) });
}
let resDraft = null;
function abrirResultadosPlan(planId) {
  const plan = planesMuestreo.find(p => p.id === planId); if (!plan) return;
  abrirFormResultados(plan.tipo, plan.codigos, plan.fecha, plan.id, plan.responsable);
}
function abrirRegistroMuestreo(codigo) {
  const l = loteMapa(); const g = l && geomLote(l); if (!g) { abrirDisenoLote(); return; }
  const plan = planActivo();
  if (!codigo && plan && plan.loteId === l.id) { abrirResultadosPlan(plan.id); return; }
  abrirFormResultados(TIPOS_MUESTREO[mapaSt.capa] ? mapaSt.capa : 'Broca', codigo ? [codigo] : [], hoyLocal(), null, '');
}
function abrirFormResultados(tipo, codigos, fecha, planId, resp) {
  resDraft = { tipo, codigos: codigos.slice(), fecha, planId, resp, vals:{} };
  const libre = !planId;
  openModal(`
    <h3>Registrar muestreo</h3>
    <div class="fgrid c3">
      <label class="f">Tipo<select id="rm-tipo" ${planId?'disabled':''} onchange="resDraft.tipo=this.value;pintarFilasRes()">${Object.keys(TIPOS_MUESTREO).map(t=>`<option ${t===tipo?'selected':''}>${t}</option>`).join('')}</select></label>
      <label class="f">Fecha<input id="rm-fecha" type="date" value="${fecha}"></label>
      <label class="f">Responsable<input id="rm-resp" value="${esc(resp||'')}"></label>
    </div>
    <p class="hint" id="rm-desc" style="margin-top:10px;"></p>
    ${libre ? `<div style="display:flex;gap:8px;margin-bottom:8px;"><input id="rm-cod" placeholder="Código de planta, p. ej. ${esc(geomLote(loteMapa()).cod)}-S04-P012" style="flex:1;"><button class="btn ghost small" onclick="agregarCodigoRes()">Agregar</button></div>` : ''}
    <div id="rm-filas"></div>
    <div class="budget-box" id="rm-res" style="margin-top:12px;"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarResultados()">Guardar resultados</button></div>`, true);
  pintarFilasRes();
}
function agregarCodigoRes() {
  const el = document.getElementById('rm-cod'); const cod = String(el.value||'').trim().toUpperCase(); const g = geomLote(loteMapa()); const pc = parseCodigo(cod);
  if (!pc || !cod.startsWith(g.cod + '-') || pc.i > g.nS || pc.j > g.nP || pc.i < 1 || pc.j < 1) { alert('Ese código no existe en este lote. Use el formato ' + g.cod + '-S04-P012.'); return; }
  if (!resDraft.codigos.includes(cod)) resDraft.codigos.push(cod); el.value = ''; pintarFilasRes();
}
function pintarFilasRes() {
  const t = TIPOS_MUESTREO[resDraft.tipo]; document.getElementById('rm-desc').textContent = t.desc;
  const host = document.getElementById('rm-filas'); const nc = t.campos.length;
  host.innerHTML = resDraft.codigos.length ? `<div class="res-row head" style="--nc:${nc}"><span>#</span><span>Planta</span>${t.campos.map(c=>`<span>${c}</span>`).join('')}<span style="text-align:right;">Valor</span></div>` +
    resDraft.codigos.map((cod, i) => { const v = resDraft.vals[cod] || []; return `<div class="res-row" style="--nc:${nc}"><span class="idx">${i+1}</span><span class="cod">${esc(cod)}</span>${t.campos.map((c,k)=>`<input id="rv-${i}-${k}" type="number" step="any" min="0" value="${v[k]??''}" aria-label="${esc(c)} ${esc(cod)}" oninput="valorRes('${cod}',${k},this.value)">`).join('')}<span class="val" id="rvv-${i}">${valorTxt(cod)}</span></div>`; }).join('')
    : '<div class="empty">Agregue los códigos de las plantas muestreadas, o genere primero un plan de muestreo.</div>';
  resumenRes();
}
function valorTxt(cod) { const t = TIPOS_MUESTREO[resDraft.tipo]; const v = resDraft.vals[cod]; if (!v || v.every(x => x === '' || x == null)) return '—'; return num(redondear(t.calc(v[0], v[1]),1)) + (t.unidad === '%' ? '%' : ''); }
function valorRes(cod, k, val) { const v = resDraft.vals[cod] || []; v[k] = val; resDraft.vals[cod] = v; const i = resDraft.codigos.indexOf(cod); const el = document.getElementById('rvv-' + i); if (el) el.textContent = valorTxt(cod); resumenRes(); }
function filasCompletas() { const t = TIPOS_MUESTREO[resDraft.tipo]; return resDraft.codigos.filter(c => { const v = resDraft.vals[c]; return v && t.campos.every((_,k) => v[k] !== '' && v[k] != null); }); }
function resumenRes() {
  const t = TIPOS_MUESTREO[resDraft.tipo]; const ok = filasCompletas(); const vals = ok.map(c => t.calc(resDraft.vals[c][0], resDraft.vals[c][1]));
  const prom = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0; const u = t.umbral ? t.umbral() : null; const uni = t.unidad === '%' ? '%' : '';
  document.getElementById('rm-res').innerHTML = `<div><div class="n">${ok.length} / ${resDraft.codigos.length}</div><div class="l">Plantas con datos</div></div><div><div class="n">${num(redondear(prom,1))}${uni}</div><div class="l">Promedio</div></div><div><div class="n">${num(redondear(Math.max(0,...vals),1))}${uni}</div><div class="l">Máximo</div></div>
    <div class="total"><div class="n">${u!=null ? (prom<=u?'Bajo umbral':'Sobre umbral') : (resDraft.tipo==='Floración' ? fechaCorta(sumarDias(document.getElementById('rm-fecha').value||hoyLocal(), n0(cfgMapa().diasFloracion))) : '—')}</div><div class="l">${u!=null ? 'Umbral ' + num(u) + uni : (resDraft.tipo==='Floración' ? 'Cosecha estimada' : 'Lectura')}</div></div>`;
}
function guardarResultados() {
  const t = TIPOS_MUESTREO[resDraft.tipo]; const ok = filasCompletas();
  if (!ok.length) { alert('Ingrese los datos de al menos una planta.'); return; }
  if (resDraft.tipo !== 'Frutos (proyección)' && t.campos.length === 2 && ok.some(c => n0(resDraft.vals[c][1]) > n0(resDraft.vals[c][0]))) { alert('En alguna planta los afectados superan a los evaluados. Revise los datos.'); return; }
  const fecha = document.getElementById('rm-fecha').value || hoyLocal(), resp = document.getElementById('rm-resp').value.trim();
  const campanaId = resDraft.planId || uid('cm');
  ok.forEach(cod => { const v = resDraft.vals[cod]; const pc = parseCodigo(cod);
    muestreos.push({ id:uid('mu'), campanaId, loteId:mapaSt.loteId, tipo:resDraft.tipo, fecha, responsable:resp, codigo:cod, surco:pc.i, planta:pc.j, a:n0(v[0]), b:t.campos.length>1?n0(v[1]):null, valor:redondear(t.calc(v[0], v[1]),3) }); });
  const prom = ok.reduce((a,c)=>a+t.calc(resDraft.vals[c][0], resDraft.vals[c][1]),0)/ok.length;
  if (resDraft.planId) { const p = planesMuestreo.find(x => x.id === resDraft.planId); if (p) p.registrado = fecha; }
  mapaSt.capa = resDraft.tipo; closeModal(); guardarEstado(); renderMapa(); renderHoy();
  toast(ok.length + ' plantas registradas · promedio ' + num(redondear(prom,1)) + (t.unidad==='%'?'%':' ') + (t.unidad==='%'?'':t.unidad));
}

/* ---- PDF: hoja de campo del plan de muestreo ---- */
function exportarHojaMuestreoPDF(planId) {
  const plan = planesMuestreo.find(p => p.id === planId); if (!plan) return;
  const l = lotes.find(x => x.id === plan.loteId); const g = geomLote(l); if (!g) return;
  if (!window.jspdf) { alert('No se pudo cargar el generador de PDF. Revise la conexión.'); return; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit:'mm', format:'a4' }); const t = TIPOS_MUESTREO[plan.tipo];
  const L = 16, R = 194; let y = 18;
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(pdfT('Hoja de muestreo - ' + plan.tipo), L, y);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text(pdfT(nombreFinca(l.fincaId) + ' - ' + l.nombre + ' (' + g.cod + ')'), R, y, { align:'right' }); y += 6;
  doc.setTextColor(100); doc.text(pdfT('Fecha: ' + fechaCorta(plan.fecha) + ' ' + parseFecha(plan.fecha).getUTCFullYear() + '   Responsable: ' + (plan.responsable || '________________') + '   Plantas: ' + plan.codigos.length), L, y); doc.setTextColor(0); y += 5;
  doc.setLineWidth(0.5); doc.line(L, y, R, y); doc.setLineWidth(0.2); y += 5;
  doc.setFontSize(9); const ins = doc.splitTextToSize(pdfT('Método: ' + t.desc + ' Recorra el lote en el orden numerado.'), R - L); doc.text(ins, L, y); y += ins.length * 4.4 + 3;
  // Croquis del lote con las plantas numeradas
  try {
    const cv = document.createElement('canvas'); const W = 1400, H = 820; cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    if (ctx) { dibujarLote(ctx, W, H, l, g, PALETA_PDF, { zoom:1, panX:0, panY:0 }, { capa:'estructura', plan }); const img = cv.toDataURL('image/png'); const iw = R - L, ih = iw * H / W; doc.addImage(img, 'PNG', L, y, iw, ih); doc.setDrawColor(200); doc.rect(L, y, iw, ih); y += ih + 6; }
  } catch (e) { dlog('· croquis no disponible: ' + e.message); }
  const cols = [L, L+10, L+56].concat(t.campos.map((_,k) => L + 96 + k*36));
  const cab = () => { doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(110); doc.text('#', cols[0], y); doc.text(pdfT('Código'), cols[1], y); doc.text('Surco / planta', cols[2], y); t.campos.forEach((c,k) => doc.text(pdfT(c), cols[3+k], y)); doc.text(pdfT('Observación'), cols[3+t.campos.length], y); doc.setTextColor(0); y += 2; doc.line(L, y, R, y); y += 5.5; };
  cab(); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  plan.codigos.forEach((cod, n) => { if (y > 282) { doc.addPage(); y = 18; cab(); doc.setFont('helvetica','normal'); doc.setFontSize(9.5); }
    const pc = parseCodigo(cod); doc.text(String(n+1), cols[0], y); doc.setFont('courier','bold'); doc.text(cod, cols[1], y); doc.setFont('helvetica','normal'); doc.text(pc.i + ' / ' + pc.j, cols[2], y);
    doc.setDrawColor(170); t.campos.forEach((_,k) => doc.line(cols[3+k], y+1, cols[3+k]+26, y+1)); doc.line(cols[3+t.campos.length], y+1, R, y+1); y += 7.2; });
  doc.setTextColor(150); doc.setFontSize(7.5); doc.text(pdfT('State Origen - hoja de muestreo generada el ' + fechaCorta(hoyLocal()) + '. Curvas de nivel esquemáticas según la pendiente registrada.'), L, 290);
  ofrecerDescarga('muestreo-' + pdfT(plan.tipo).split(' ')[0].toLowerCase() + '-' + g.cod + '-' + plan.fecha + '.pdf', doc.output('blob'));
}
