/* ================= v23 · Fase B — campo: diseño de siembra completo (surcos dobles, borde, caminos, callejones, distancias sobre el terreno y mezcla de variedades) ================= */
/* Parte del trazado real de v19 (forma y relieve) y le aplica las reglas del diseño, como el módulo DISEÑO del Excel v13, pero sobre la forma real del lote y con plantas codificadas. */
function disenoExtendido(d) { return !!d && (d.sistema === 'doble' || n0(d.borde) > 0 || n0(d.caminoCada) > 0 || n0(d.callejonCada) > 0 || d.sobreTerreno === true); }
function distSegmento(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; const L2 = dx * dx + dy * dy || 1e-9; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); }
function distBorde(px, py, poly) { let m = Infinity; for (let i = 0; i < poly.length; i++) m = Math.min(m, distSegmento(px, py, poly[i], poly[(i + 1) % poly.length])); return m; }
const GEO23 = new WeakMap();
const _geomLote22 = geomLote;
geomLote = function (l) {
  const d = l && l.diseno; if (!disenoExtendido(d)) return _geomLote22(l);
  const ds = n0(d.distSurcos), dp = n0(d.distPlantas); if (!ds || !dp) return _geomLote22(l);
  /* 1 · Distancias medidas sobre el terreno: la distancia entre surcos se mide a lo largo de la pendiente; en el plano es menor */
  let g0 = _geomLote22(Object.assign({}, l, { diseno: Object.assign({}, d, { sistema: 'sencillo', borde: 0, caminoCada: 0, callejonCada: 0, sobreTerreno: false }) })); if (!g0) return null;
  const p = n0(g0.pend) / 100; const fT = d.sobreTerreno ? Math.sqrt(1 + p * p) : 1;
  const doble = d.sistema === 'doble'; const par = doble ? Math.max(0.3, n0(d.distPar) || 0.6) : 0;
  const paso = (doble ? par : ds) / fT;
  const base = _geomLote22(Object.assign({}, l, { diseno: Object.assign({}, d, { distSurcos: redondear(paso, 4), sistema: 'sencillo', borde: 0, caminoCada: 0, callejonCada: 0, sobreTerreno: false }) })); if (!base) return null;
  if (GEO23.has(base)) { const c = GEO23.get(base); if (c.k === JSON.stringify(d)) return c.g; }
  /* 2 · Surcos que quedan: en dobles, 2 surcos del par y se saltan los que ocupa la calle; luego un camino cada n surcos (o n pares) */
  const filas = base.surcos.slice(); let keep = [];
  if (doble) { const salto = Math.max(1, Math.round(ds / par) - 1); let k = 0; filas.forEach((f, i) => { const pos = i % (2 + salto); if (pos < 2) keep.push(Object.assign({ par: Math.floor(i / (2 + salto)) }, f)); }); }
  else keep = filas.map((f, i) => Object.assign({ par: i }, f));
  const nC = Math.round(n0(d.caminoCada)); if (nC > 0) { const unidades = [...new Set(keep.map(f => f.par))]; const quitar = new Set(unidades.filter((u, i) => (i + 1) % (nC + 1) === 0)); keep = keep.filter(f => !quitar.has(f.par)); }
  /* 3 · Plantas: sin sembrar en el borde ni en los callejones transversales */
  const borde = n0(d.borde), cada = n0(d.callejonCada), anchoC = n0(d.callejonAncho) || Math.max(dp * 2, 2);
  const cod = base.cod; const surcos = [], plantas = [], idx = new Map(); let nP = 0, i = 0;
  keep.forEach(f => { const pl = f.plantas.filter(q => (!borde || distBorde(q.x, q.y, base.poly) >= borde) && (!cada || (q.s % cada) >= anchoC)); if (!pl.length) return; i++;
    const fila = { i, linea: f.linea, largo: f.largo, plantas: [] }; pl.forEach((q, k) => { const n = { i, j: k + 1, x: q.x, y: q.y, s: q.s, cod: cod + '-S' + String(i).padStart(2, '0') + '-P' + String(k + 1).padStart(3, '0') }; fila.plantas.push(n); plantas.push(n); idx.set(n.cod, n); });
    nP = Math.max(nP, pl.length); surcos.push(fila); });
  const celda = Math.max(paso, dp) * 1.5; const malla = new Map(); plantas.forEach(q => { const k = Math.floor(q.x / celda) + ',' + Math.floor(q.y / celda); const a = malla.get(k); if (a) a.push(q); else malla.set(k, [q]); });
  const g = Object.assign({}, base, { ds, dp, surcos, plantas, idx, malla, celda, nS: surcos.length, nP, total: plantas.length, sistema: doble ? 'doble' : 'sencillo', par, fT, extendido: true, haReal: base.ha * Math.sqrt(1 + p * p),
    perdidas: { base: base.total, borde: borde, caminos: nC, callejones: cada } });
  GEO23.set(base, { k: JSON.stringify(d), g }); return g;
};
function haRealDe(g) { return g ? (g.haReal || g.ha * Math.sqrt(1 + Math.pow(n0(g.pend) / 100, 2))) : 0; }

/* ---------- Formulario de diseño: campos nuevos ---------- */
const _abrirDisenoLote22 = abrirDisenoLote;
abrirDisenoLote = function () {
  _abrirDisenoLote22.apply(this, arguments); const l = loteMapa(); if (!l) return; const d = Object.assign({ sistema: 'sencillo', distPar: 0.6, borde: 0, caminoCada: 0, callejonCada: 0, callejonAncho: 2, sobreTerreno: !l.diseno }, l.diseno || {});
  const res = [...document.querySelectorAll('.sec-label')].find(e => /Resultado/.test(e.textContent)); if (!res) return;
  const box = document.createElement('div'); box.innerHTML = `<div class="sec-label">Sistema y espacios sin sembrar</div>
    <div class="fgrid c3">
      <label class="f">Sistema de siembra<select id="dl-sis" onchange="document.getElementById('dl-par-w').hidden=this.value!=='doble';document.getElementById('dl-ds-l').firstChild.textContent=this.value==='doble'?'Calle entre pares de surcos (m)':'Distancia entre surcos (m)';previewDiseno()"><option value="sencillo" ${d.sistema !== 'doble' ? 'selected' : ''}>Surco sencillo</option><option value="doble" ${d.sistema === 'doble' ? 'selected' : ''}>Surcos dobles (pares)</option></select></label>
      <label class="f" id="dl-par-w" ${d.sistema === 'doble' ? '' : 'hidden'}>Entre los surcos del par (m)<input id="dl-par" type="number" step="0.05" min="0.3" value="${d.distPar}" oninput="previewDiseno()"></label>
      <label class="f">Borde sin sembrar (m)<input id="dl-borde" type="number" step="0.1" min="0" value="${d.borde || ''}" placeholder="0" oninput="previewDiseno()"></label>
      <label class="f">Camino cada (surcos o pares)<input id="dl-cam" type="number" step="1" min="0" value="${d.caminoCada || ''}" placeholder="sin caminos" oninput="previewDiseno()"></label>
      <label class="f">Callejón transversal cada (m)<input id="dl-cal" type="number" step="1" min="0" value="${d.callejonCada || ''}" placeholder="sin callejones" oninput="previewDiseno()"></label>
      <label class="f">Ancho del callejón (m)<input id="dl-calw" type="number" step="0.5" min="0.5" value="${d.callejonAncho || 2}" oninput="previewDiseno()"></label></div>
    <label class="cs-check"><input id="dl-terr" type="checkbox" ${d.sobreTerreno ? 'checked' : ''} onchange="previewDiseno()"> Las distancias se midieron sobre el terreno (en la ladera). La app las proyecta al plano según la pendiente, como se siembra en realidad.</label>
    <div class="sec-label">Variedades sembradas en el lote</div><div id="dl-mix">${filasMix23(l)}</div><button class="link" onclick="agregarMix23()">+ Otra variedad</button>
    <p class="hint" style="margin-top:6px">Si el lote tiene varias variedades, indique el porcentaje de cada una (por ejemplo 70 % Castillo y 30 % Cenicafé 1). Debe sumar 100 %.</p>`;
  res.before(box); const lbl = document.getElementById('dl-ds') && document.getElementById('dl-ds').closest('label'); if (lbl) { lbl.id = 'dl-ds-l'; if (d.sistema === 'doble') lbl.firstChild.textContent = 'Calle entre pares de surcos (m)'; }
  previewDiseno();
};
function filasMix23(l) { const mix = (l.variedadesMix && l.variedadesMix.length) ? l.variedadesMix : [{ variedadId: l.variedadId, pct: 100 }];
  return mix.map((m, i) => `<div class="fgrid c2 dl-mixr" style="margin-bottom:6px"><select class="dl-mixv">${variedades.map(v => `<option value="${v.id}" ${v.id === m.variedadId ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select><input class="dl-mixp" type="number" min="0" max="100" step="5" value="${m.pct}" placeholder="%"></div>`).join(''); }
function agregarMix23() { const h = document.getElementById('dl-mix'); h.insertAdjacentHTML('beforeend', `<div class="fgrid c2 dl-mixr" style="margin-bottom:6px"><select class="dl-mixv">${variedades.map(v => `<option value="${v.id}">${esc(v.nombre)}</option>`).join('')}</select><input class="dl-mixp" type="number" min="0" max="100" step="5" value="0" placeholder="%"></div>`); }
const _leerDiseno22 = leerDiseno;
leerDiseno = function () { const d = _leerDiseno22(); const g = id => { const e = document.getElementById(id); return e ? e.value : null; }; if (g('dl-sis') == null) return Object.assign({}, (loteMapa() || {}).diseno || {}, d);
  return Object.assign(d, { sistema: g('dl-sis'), distPar: n0(g('dl-par')) || 0.6, borde: n0(g('dl-borde')), caminoCada: Math.round(n0(g('dl-cam'))), callejonCada: n0(g('dl-cal')), callejonAncho: n0(g('dl-calw')) || 2, sobreTerreno: !!(document.getElementById('dl-terr') || {}).checked }); };
const _previewDiseno22 = previewDiseno;
previewDiseno = function () { _previewDiseno22(); const box = document.getElementById('dl-prev'); if (!box) return; const l = loteMapa(); const tmp = Object.assign({}, l, { hectareas: document.getElementById('dl-ha').value, diseno: leerDiseno(), codigo: document.getElementById('dl-codigo').value });
  const idx = lotes.indexOf(l); let ge = null; if (idx >= 0) { lotes[idx] = tmp; geoLimpiarCache(); try { ge = geomLote(tmp); } finally { lotes[idx] = l; geoLimpiarCache(); } }
  if (!ge) return; const hr = haRealDe(ge); const n = box.querySelector('.total');
  box.insertAdjacentHTML('afterend', `<p class="hint" id="dl-prev2" style="margin:8px 0 0">${ge.extendido ? `Sin borde, caminos ni callejones serían ${num(ge.perdidas.base)} sitios; quedan ${num(ge.total)} (${num(Math.round((1 - ge.total / (ge.perdidas.base || 1)) * 100))} % en espacios sin sembrar). ` : ''}Área en el plano ${num(redondear(ge.ha, 3))} ha · área real en la ladera ${num(redondear(hr, 3))} ha (pendiente ${num(Math.round(ge.pend))} %) · ${num(Math.round(ge.total / hr))} plantas por hectárea real.</p>`);
  const old = document.querySelectorAll('#dl-prev2'); if (old.length > 1) old[0].remove(); };
const _guardarDisenoLote22 = guardarDisenoLote;
guardarDisenoLote = function () {
  const mixR = [...document.querySelectorAll('.dl-mixr')].map(r => ({ variedadId: r.querySelector('.dl-mixv').value, pct: n0(r.querySelector('.dl-mixp').value) })).filter(m => m.pct > 0);
  const tot = mixR.reduce((s, m) => s + m.pct, 0); if (mixR.length > 1 && Math.abs(tot - 100) > 0.5) { toast('Los porcentajes de variedades deben sumar 100 % (suman ' + num(tot) + ' %).', 'err'); return; }
  if (document.getElementById('dl-sis') && document.getElementById('dl-sis').value === 'doble' && n0(document.getElementById('dl-par').value) >= n0(document.getElementById('dl-ds').value)) { toast('En surcos dobles, la calle entre pares debe ser mayor que la distancia dentro del par.', 'err'); return; }
  const l = lotes.find(x => x.id === mapaSt.loteId); _guardarDisenoLote22(); if (!l) return;
  if (mixR.length) { l.variedadesMix = mixR.length > 1 ? mixR : []; if (mixR.length === 1) l.variedadId = mixR[0].variedadId; }
  guardarEstado();
};
/* Variedad de cada planta según la mezcla: los surcos se reparten en bloques proporcionales */
function variedadDePlanta(l, g, p) { const mix = l && l.variedadesMix; if (!mix || mix.length < 2 || !g) return l ? l.variedadId : null; const f = (p.i - 0.5) / (g.nS || 1); let acc = 0; for (const m of mix) { acc += n0(m.pct) / 100; if (f <= acc + 1e-9) return m.variedadId; } return mix[mix.length - 1].variedadId; }
function plantasPorVariedad(l) { const g = geomLote(l); if (!g) return []; const m = new Map(); g.plantas.forEach(p => { const v = variedadDePlanta(l, g, p); m.set(v, (m.get(v) || 0) + 1); }); return [...m.entries()].map(([v, n]) => ({ v, n, nombre: nombreVariedad(v) })); }
