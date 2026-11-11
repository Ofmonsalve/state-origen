/* ================= SUELO Y CLIMA ================= */
let scSt = { tab: 'suelo', analisisId: null, fincaId: '' };
/* Rangos de interpretación orientativos para café; se pueden ajustar en "Rangos de referencia".
   [clave, etiqueta, unidad, [bajo hasta, medio hasta, alto desde], escala máxima, sentido ('normal' o 'invertido' cuando menos es mejor)] */
const SUELO_VARS = [
  ['pH', 'pH', '', [5.0, 5.5, 6.5], 8, 'normal'],
  ['MO', 'Materia orgánica', '%', [8, 16, 30], 35, 'normal'],
  ['P', 'Fósforo', 'mg/kg', [15, 30, 60], 90, 'normal'],
  ['K', 'Potasio', 'cmol/kg', [0.2, 0.4, 0.8], 1.4, 'normal'],
  ['Ca', 'Calcio', 'cmol/kg', [1.5, 3, 8], 12, 'normal'],
  ['Mg', 'Magnesio', 'cmol/kg', [0.5, 1, 3], 4.5, 'normal'],
  ['Al', 'Aluminio', 'cmol/kg', [0.3, 1, null], 3, 'invertido'],
  ['S', 'Azufre', 'mg/kg', [10, 20, 40], 60, 'normal'],
  ['B', 'Boro', 'mg/kg', [0.3, 0.6, 1.5], 2, 'normal'],
  ['Zn', 'Zinc', 'mg/kg', [1.5, 3, 10], 12, 'normal'],
  ['Cu', 'Cobre', 'mg/kg', [1, 3, 10], 12, 'normal'],
  ['Fe', 'Hierro', 'mg/kg', [25, 50, 250], 300, 'normal'],
  ['Mn', 'Manganeso', 'mg/kg', [5, 10, 50], 80, 'normal'],
  ['CICE', 'CIC efectiva', 'cmol/kg', [5, 10, 25], 30, 'normal'],
];
const FERT_DEF = { N: 300, P2O5: 50, K2O: 260, MgO: 60, S: 30, B: 1.5, densRef: 7000, mesesFert: [3, 9], productoMezcla: '17-6-18-2', precioUrea: 145000, precioDAP: 190000, precioKCl: 160000, precioMg: 95000, precioMezcla: 175000, precioCal: 28000 };
const PRODUCTOS_FERT = { 'Urea': { N: 46 }, 'DAP': { N: 18, P2O5: 46 }, 'Cloruro de potasio': { K2O: 60 }, 'Sulfato de magnesio': { MgO: 16, S: 13 }, '17-6-18-2': { N: 17, P2O5: 6, K2O: 18, MgO: 2 }, '25-4-24': { N: 25, P2O5: 4, K2O: 24 }, '20-3-20-3': { N: 20, P2O5: 3, K2O: 20, MgO: 3 } };
function cfgSuelo() { return Object.assign({}, FERT_DEF, climaConfig.suelo || {}); }
function rangosVar(k) { const r = (climaConfig.rangos || {})[k]; const d = SUELO_VARS.find(x => x[0] === k); return r || (d && d[3]); }
function nivelSuelo(k, v) {
  if (v == null || v === '' || !isFinite(v)) return null; v = Number(v); const r = rangosVar(k); const d = SUELO_VARS.find(x => x[0] === k); if (!r) return null;
  if (k === 'pH') return v < 4.5 ? { n: 'Extremadamente ácido', t: 'mal' } : v < r[0] ? { n: 'Muy ácido', t: 'mal' } : v < r[1] ? { n: 'Ácido, adecuado para café', t: 'ok' } : v < r[2] ? { n: 'Ligeramente ácido', t: 'ok' } : { n: 'Neutro a alcalino', t: 'medio' };
  if (d[5] === 'invertido') return v <= r[0] ? { n: 'Bajo', t: 'ok' } : v <= r[1] ? { n: 'Medio', t: 'medio' } : { n: 'Alto', t: 'mal' };
  return v < r[0] ? { n: 'Bajo', t: 'mal' } : v < r[1] ? { n: 'Medio', t: 'medio' } : (r[2] != null && v >= r[2] ? { n: 'Alto', t: 'ok' } : { n: 'Adecuado', t: 'ok' });
}
const ultimoAnalisis = loteId => suelos.filter(a => a.loteId === loteId).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] || null;
function relacionesSuelo(a) {
  const r = []; const f = k => n0(a[k]);
  if (f('Ca') && f('Mg')) r.push(['Ca / Mg', f('Ca') / f('Mg'), [2, 5], 'Entre 2 y 5']);
  if (f('Mg') && f('K')) r.push(['Mg / K', f('Mg') / f('K'), [2.5, 15], 'Entre 2,5 y 15']);
  if (f('K') && (f('Ca') + f('Mg'))) r.push(['(Ca + Mg) / K', (f('Ca') + f('Mg')) / f('K'), [10, 40], 'Entre 10 y 40']);
  const cice = f('CICE') || (f('Ca') + f('Mg') + f('K') + f('Al') + n0(a.Na));
  if (cice && a.Al !== '' && a.Al != null) r.push(['Saturación de aluminio', f('Al') / cice * 100, [0, 25], 'Menos de 25 %', '%']);
  if (cice) r.push(['Saturación de K', f('K') / cice * 100, [3, 8], 'Entre 3 y 8 %', '%']);
  return r;
}
function edadLote(l) { return l && l.fechaSiembra ? (parseFecha(hoyLocal()) - parseFecha(l.fechaSiembra)) / (365.25 * 864e5) : null; }
function recomendacionSuelo(a) {
  const l = lotes.find(x => x.id === a.loteId); const g = l && geomLote(l); const cf = cfgSuelo(); const out = { notas: [] };
  const ha = g ? g.ha : n0(l && l.hectareas); const dens = g ? g.total / (g.ha || 1) : (n0(String(l && l.densidad).replace(/\D/g, '')) || cf.densRef); const plantas = g ? g.total : Math.round(dens * ha);
  const fDens = Math.max(0.6, Math.min(1.3, dens / cf.densRef)); const edad = edadLote(l); const fEdad = edad == null ? 1 : edad < 1 ? 0.3 : edad < 2 ? 0.6 : 1;
  const fNivel = (k, alto) => { const nv = nivelSuelo(k, a[k]); if (!nv) return 1; return nv.n === 'Bajo' ? 1 : nv.n === 'Medio' ? 0.7 : (alto || 0.4); };
  const nMO = nivelSuelo('MO', a.MO); const fN = !nMO ? 1 : nMO.n === 'Bajo' ? 1 : nMO.n === 'Medio' ? 0.85 : 0.7;
  out.req = { N: cf.N * fN, P2O5: cf.P2O5 * fNivel('P', 0.3), K2O: cf.K2O * fNivel('K'), MgO: cf.MgO * fNivel('Mg', 0.2), S: cf.S * fNivel('S', 0.3) };
  Object.keys(out.req).forEach(k => out.req[k] = Math.round(out.req[k] * fDens * fEdad));
  out.factores = { fDens, fEdad, dens, ha, plantas, edad };
  // Encalado (Kamprath, orientativo): 1,5 t de cal por cada cmol/kg de Al, a 20 cm
  const prof = n0(a.profundidad) || 20; out.cal = 0;
  if (n0(a.pH) && n0(a.pH) < 5.0) { if (a.Al !== '' && a.Al != null) { const cice = n0(a.CICE) || (n0(a.Ca) + n0(a.Mg) + n0(a.K) + n0(a.Al)); const sat = cice ? n0(a.Al) / cice * 100 : 0; if (sat > 25 || n0(a.Al) > 1) out.cal = redondear(1.5 * n0(a.Al) * prof / 20, 1); }
    else out.notas.push('pH bajo sin dato de aluminio: pida al laboratorio el Al intercambiable para calcular la cal.'); }
  out.tipoCal = nivelSuelo('Mg', a.Mg) && nivelSuelo('Mg', a.Mg).n !== 'Adecuado' && nivelSuelo('Mg', a.Mg).n !== 'Alto' ? 'Cal dolomita' : 'Cal agrícola';
  if (out.cal) out.notas.push('Aplique la cal al menos un mes antes de la fertilización y en suelo húmedo.');
  const nB = nivelSuelo('B', a.B); if (nB && nB.n === 'Bajo') out.notas.push('Boro bajo: incluya una fuente de boro (por ejemplo bórax o un fertilizante con B) en una de las aplicaciones.');
  const nZn = nivelSuelo('Zn', a.Zn); if (nZn && nZn.n === 'Bajo') out.notas.push('Zinc bajo: considere una aplicación foliar de zinc.');
  if (fEdad < 1) out.notas.push('Lote en levante: la dosis se redujo al ' + Math.round(fEdad * 100) + ' % de la de un cafetal en producción.');
  // Productos: mezcla comercial para cubrir el potasio y complementos simples
  const mezcla = PRODUCTOS_FERT[cf.productoMezcla] || PRODUCTOS_FERT['17-6-18-2']; const prods = [];
  let kgMezcla = mezcla.K2O ? out.req.K2O / (mezcla.K2O / 100) : 0; kgMezcla = Math.min(kgMezcla, mezcla.N ? out.req.N / (mezcla.N / 100) : kgMezcla);
  const aporte = k => kgMezcla * (n0(mezcla[k]) / 100); const falta = k => Math.max(0, out.req[k] - aporte(k));
  if (kgMezcla > 0) prods.push({ nombre: cf.productoMezcla, kgHa: kgMezcla, precio: cf.precioMezcla });
  const kgKCl = falta('K2O') / 0.6; if (kgKCl > 5) prods.push({ nombre: 'Cloruro de potasio', kgHa: kgKCl, precio: cf.precioKCl });
  const kgDAP = falta('P2O5') / 0.46; if (kgDAP > 5) prods.push({ nombre: 'DAP', kgHa: kgDAP, precio: cf.precioDAP });
  const nRest = Math.max(0, out.req.N - aporte('N') - kgDAP * 0.18); const kgUrea = nRest / 0.46; if (kgUrea > 5) prods.push({ nombre: 'Urea', kgHa: kgUrea, precio: cf.precioUrea });
  const kgMg = falta('MgO') / 0.16; if (kgMg > 5) prods.push({ nombre: 'Sulfato de magnesio', kgHa: kgMg, precio: cf.precioMg });
  if (out.cal) prods.push({ nombre: out.tipoCal, kgHa: out.cal * 1000, precio: cf.precioCal, unica: true });
  prods.forEach(p => { p.kgLote = p.kgHa * ha; p.bultos = p.kgLote / 50; p.costo = p.bultos * p.precio; p.gPlanta = plantas ? p.kgLote * 1000 / plantas / (p.unica ? 1 : 2) : 0; });
  out.productos = prods; out.costoTotal = prods.reduce((s, p) => s + p.costo, 0); out.ha = ha; out.meses = cf.mesesFert;
  return out;
}

/* ---- Clima ---- */
const CLIMA_DEF = { cad: 120, kc: 0.95, umbralSeco: 2, diasSecos: 12, lluviaDisparo: 12, diasAFlor: 10, lat: 5.5 };
function cfgClima() { return Object.assign({}, CLIMA_DEF, climaConfig.balance || {}); }
function climaDe(fincaId) { return clima.filter(c => !fincaId || c.fincaId === fincaId || !c.fincaId).sort((a, b) => a.fecha.localeCompare(b.fecha)); }
function etoHargreaves(tmax, tmin, lat, fecha) {
  if (!isFinite(tmax) || !isFinite(tmin) || tmax <= tmin) return 3.6;
  const d = parseFecha(fecha); const J = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5); const phi = lat * Math.PI / 180;
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * J / 365), dl = 0.409 * Math.sin(2 * Math.PI * J / 365 - 1.39), ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dl))));
  const Ra = 24 * 60 / Math.PI * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(dl) + Math.cos(phi) * Math.cos(dl) * Math.sin(ws));
  return Math.max(0.5, 0.0023 * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(tmax - tmin) * Ra * 0.408);
}
function balanceHidrico(fincaId, desde) {
  const cf = cfgClima(); const f = fincas.find(x => x.id === fincaId) || {}; const lat = f.geoRef ? f.geoRef.lat : cf.lat;
  const regs = climaDe(fincaId); if (!regs.length) return [];
  const mapa = new Map(regs.map(r => [r.fecha, r])); const ini = desde && desde > regs[0].fecha ? sumarDias(desde, -60) : regs[0].fecha; const fin = regs[regs.length - 1].fecha;
  let S = cf.cad * 0.7; const out = [];
  for (let d = ini; d <= fin; d = sumarDias(d, 1)) { const r = mapa.get(d); const P = r ? n0(r.lluvia) : null; const et = (r && r.tmax != null && r.tmin != null && r.tmax !== '' && r.tmin !== '' ? etoHargreaves(n0(r.tmax), n0(r.tmin), lat, d) : 3.6) * cf.kc;
    const Pv = P == null ? 0 : P; S = Math.min(cf.cad, S + Pv); const etr = Math.min(S, et); S -= etr; out.push({ fecha: d, lluvia: P, etc: et, etr, almac: S, pct: S / cf.cad * 100, deficit: et - etr, falta: !r }); }
  return desde ? out.filter(x => x.fecha >= desde) : out;
}
function floracionesProbables(fincaId) {
  const cf = cfgClima(); const regs = climaDe(fincaId); const out = []; let secos = 0;
  regs.forEach((r, k) => { const p = n0(r.lluvia); const p3 = p + n0((regs[k + 1] || {}).lluvia) + n0((regs[k + 2] || {}).lluvia);
    if (secos >= cf.diasSecos && (p >= cf.lluviaDisparo || p3 >= cf.lluviaDisparo * 1.4) && p >= 3) { const flor = sumarDias(r.fecha, cf.diasAFlor); out.push({ disparo: r.fecha, secos, lluvia: redondear(p3, 1), flor, cosecha: sumarDias(flor, n0(cfgMapa().diasFloracion)) }); secos = 0; }
    else if (p < cf.umbralSeco) secos++; else if (p >= cf.umbralSeco * 3) secos = 0; });
  return out.reverse();
}
function normalesFinca(fincaId) {
  const man = (climaConfig.normales || {})[fincaId]; if (Array.isArray(man) && man.some(v => n0(v) > 0)) return { vals: man.map(n0), fuente: 'ingresada' };
  const porMes = {}; climaDe(fincaId).forEach(r => { const k = r.fecha.slice(0, 7); porMes[k] = (porMes[k] || 0) + n0(r.lluvia); });
  const acc = Array.from({ length: 12 }, () => []); Object.keys(porMes).forEach(k => { const dias = climaDe(fincaId).filter(r => r.fecha.slice(0, 7) === k).length; if (dias >= 25) acc[Number(k.slice(5)) - 1].push(porMes[k]); });
  if (acc.every(a => a.length >= 1) && acc.some(a => a.length >= 2)) return { vals: acc.map(a => a.reduce((s, v) => s + v, 0) / a.length), fuente: 'promedio de sus registros' };
  return null;
}
function resumenClima(fincaId) {
  const regs = climaDe(fincaId); if (!regs.length) return null; const hoyS = regs[regs.length - 1].fecha; const d30 = sumarDias(hoyS, -29);
  const u30 = regs.filter(r => r.fecha >= d30); const lluvia30 = u30.reduce((s, r) => s + n0(r.lluvia), 0);
  const tmed = u30.filter(r => r.tmax != null && r.tmin != null && r.tmax !== '').map(r => (n0(r.tmax) + n0(r.tmin)) / 2); const anio = regs.filter(r => r.fecha.slice(0, 4) === hoyS.slice(0, 4)).reduce((s, r) => s + n0(r.lluvia), 0);
  let secos = 0; for (let k = regs.length - 1; k >= 0 && n0(regs[k].lluvia) < cfgClima().umbralSeco; k--) secos++;
  const bal = balanceHidrico(fincaId, sumarDias(hoyS, -120)); const ult = bal[bal.length - 1];
  const nor = normalesFinca(fincaId); const mesesAct = [hoyS.slice(0, 7)]; const normal30 = nor ? nor.vals[Number(hoyS.slice(5, 7)) - 1] * 30 / 30.4 : null;
  const deficit30 = bal.filter(b => b.fecha >= d30).reduce((s, b) => s + b.deficit, 0);
  return { hoyS, lluvia30, tmed: tmed.length ? tmed.reduce((a, b) => a + b, 0) / tmed.length : null, anio, secos, humedad: ult ? ult.pct : null, normal30, deficit30, dias30: u30.length, hrMed: u30.filter(r => r.hr).length ? u30.reduce((s, r) => s + n0(r.hr), 0) / u30.filter(r => r.hr).length : null, lluvia7: regs.filter(r => r.fecha >= sumarDias(hoyS, -6)).reduce((s, r) => s + n0(r.lluvia), 0) };
}
function alertasClima(fincaId) {
  const r = resumenClima(fincaId); if (!r) return []; const out = [];
  if (r.humedad != null && r.humedad < 35) out.push({ t: 'mal', txt: 'Suelo seco: humedad estimada ' + Math.round(r.humedad) + ' %. Evite fertilizar hasta que llueva y vigile broca, que se favorece en tiempo seco.' });
  if (r.secos >= 10) out.push({ t: 'medio', txt: r.secos + ' días seguidos sin lluvia útil. Una lluvia fuerte después de este periodo suele disparar floración.' });
  if (r.lluvia7 >= 80) out.push({ t: 'medio', txt: num(Math.round(r.lluvia7)) + ' mm en 7 días: condiciones favorables para roya y enfermedades de fruto. Revise el programa de control.' });
  if (r.normal30 && r.lluvia30 < r.normal30 * 0.6) out.push({ t: 'medio', txt: 'Últimos 30 días ' + Math.round((1 - r.lluvia30 / r.normal30) * 100) + ' % por debajo de lo normal.' });
  if (r.normal30 && r.lluvia30 > r.normal30 * 1.5) out.push({ t: 'medio', txt: 'Últimos 30 días ' + Math.round((r.lluvia30 / r.normal30 - 1) * 100) + ' % por encima de lo normal.' });
  return out;
}

/* ---- Vista ---- */
function renderSueloClima() {
  const root = document.getElementById('sc-root'); if (!root) return; tooltipsGlobales();
  if (!fincas.some(f => f.id === scSt.fincaId)) scSt.fincaId = (fincasActivas()[0] || fincas[0] || {}).id || '';
  root.innerHTML = `<div class="chip-row"><select onchange="scSt.fincaId=this.value;renderSueloClima()" aria-label="Finca">${fincas.filter(activo).map(f => `<option value="${f.id}" ${f.id === scSt.fincaId ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}</select>
    <div class="capas seg">${[['suelo', 'Suelo y nutrición'], ['clima', 'Clima y agua']].map(([k, t]) => `<button class="${scSt.tab === k ? 'on' : ''}" onclick="scSt.tab='${k}';renderSueloClima()">${t}</button>`).join('')}</div>
    <div class="mp-actions">${scSt.tab === 'suelo' ? '<button class="btn ghost small" onclick="abrirRangosSuelo()">Rangos y dosis de referencia</button><button class="btn primary small" onclick="abrirAnalisisSuelo()">+ Análisis de suelo</button>' : '<button class="btn ghost small" onclick="abrirConfigClima()">Parámetros</button><button class="btn ghost small" onclick="abrirImportarClima()">Importar CSV</button><button class="btn primary small" onclick="abrirRegistroClima()">+ Registro del día</button>'}</div></div>
    <div id="sc-cuerpo"></div>`;
  if (scSt.tab === 'suelo') renderSuelo(); else renderClima();
}
function renderSuelo() {
  const host = document.getElementById('sc-cuerpo'); const ls = lotesDeFinca(scSt.fincaId);
  const tarjetas = ls.map(l => { const a = ultimoAnalisis(l.id); if (!a) return `<div class="sl-card vacio"><div class="sl-t"><b>${esc(l.nombre)}</b><span>${num(l.hectareas)} ha</span></div><p class="hint" style="margin:6px 0 10px;">Sin análisis de suelo.</p><button class="btn ghost small" onclick="abrirAnalisisSuelo('${l.id}')">Registrar análisis</button></div>`;
    const def = SUELO_VARS.map(v => [v, nivelSuelo(v[0], a[v[0]])]).filter(([v, nv]) => nv && nv.t === 'mal');
    const ph = nivelSuelo('pH', a.pH); const meses = Math.round((parseFecha(hoyLocal()) - parseFecha(a.fecha)) / (30.4 * 864e5));
    return `<button class="sl-card ${scSt.analisisId === a.id ? 'on' : ''}" onclick="scSt.analisisId='${a.id}';renderSuelo()"><div class="sl-t"><b>${esc(l.nombre)}</b><span>${fechaCorta(a.fecha)} ${a.fecha.slice(0, 4)}${meses > 24 ? ' · <em>vencido</em>' : ''}</span></div>
      <div class="sl-ph"><span class="sl-ph-v">${num(a.pH)}</span><span>pH · ${esc(ph ? ph.n : '—')}</span></div>
      <div class="sl-chips">${def.length ? def.map(([v, nv]) => `<span class="chip-mal">${esc(v[1])} ${esc(nv.n.toLowerCase())}</span>`).join('') : '<span class="chip-ok">Sin limitantes marcadas</span>'}</div></button>`; }).join('');
  if (!scSt.analisisId || !suelos.some(a => a.id === scSt.analisisId && ls.some(l => l.id === a.loteId))) { const a0 = ls.map(l => ultimoAnalisis(l.id)).filter(Boolean)[0]; scSt.analisisId = a0 ? a0.id : null; }
  const a = suelos.find(x => x.id === scSt.analisisId);
  let det = '<div class="card"><div class="empty">Registre el resultado del laboratorio para ver la interpretación, el encalado y el plan de fertilización del lote.</div></div>';
  if (a) {
    const l = lotes.find(x => x.id === a.loteId); const rec = recomendacionSuelo(a); const rel = relacionesSuelo(a);
    const filas = SUELO_VARS.filter(v => a[v[0]] !== '' && a[v[0]] != null && isFinite(a[v[0]])).map(v => { const nv = nivelSuelo(v[0], a[v[0]]); const r = rangosVar(v[0]);
      return `<div class="sl-var"><span class="sl-n">${esc(v[1])}</span><span class="sl-v mono">${num(redondear(a[v[0]], 2))} <small>${esc(v[2])}</small></span>${gBala(n0(a[v[0]]), v[5] === 'invertido' ? [r[0], r[1], null] : r, v[4], v[5] === 'invertido')}<span class="pill ${nv.t === 'mal' ? 'cancelada' : nv.t === 'medio' ? 'ejecucion' : 'cerrada'}">${esc(nv.n)}</span></div>`; }).join('');
    const hist = suelos.filter(x => x.loteId === a.loteId).sort((p, q) => p.fecha.localeCompare(q.fecha));
    det = `<div class="grid g2 sl-det">
      <div class="card"><div class="title">${esc(l ? l.nombre : '')} · análisis del ${fechaCorta(a.fecha)} ${a.fecha.slice(0, 4)} <span class="sub">${esc(a.laboratorio || '')}${a.profundidad ? ' · 0–' + a.profundidad + ' cm' : ''}${a.textura ? ' · ' + esc(a.textura) : ''}</span></div>
        <div class="bala-ley"><span><i class="b-bajo"></i>Bajo</span><span><i class="b-medio"></i>Medio</span><span><i class="b-ok"></i>Adecuado</span><span><i class="b-alto"></i>Alto</span></div>
        ${filas}
        <div class="sec-label">Relaciones entre bases</div>
        ${rel.map(r => { const ok = r[1] >= r[2][0] && r[1] <= r[2][1]; return `<div class="kv"><span>${esc(r[0])} <small style="color:var(--text-faint)">ideal ${esc(r[3])}</small></span><b>${num(redondear(r[1], 1))}${r[4] || ''} <span class="pill ${ok ? 'cerrada' : 'ejecucion'}">${ok ? 'en rango' : r[1] < r[2][0] ? 'baja' : 'alta'}</span></b></div>`; }).join('') || '<p class="hint">Faltan bases para calcular relaciones.</p>'}
        ${hist.length > 1 ? `<div class="sec-label">Evolución del lote</div><div class="tscroll narrow"><table class="dtable"><thead><tr><th>Fecha</th><th class="num">pH</th><th class="num">MO</th><th class="num">P</th><th class="num">K</th><th class="num">Ca</th><th class="num">Mg</th><th class="num">Al</th></tr></thead><tbody>${hist.map(h => `<tr${h.id === a.id ? ' class="sel"' : ''}><td>${h.fecha}</td>${['pH', 'MO', 'P', 'K', 'Ca', 'Mg', 'Al'].map(k => `<td class="num">${h[k] == null || h[k] === '' ? '—' : num(h[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        <div class="mp-btns"><button class="btn ghost small" onclick="abrirAnalisisSuelo('${a.loteId}','${a.id}')">Editar</button><button class="btn danger-ghost" onclick="eliminarAnalisis('${a.id}')">Eliminar</button></div>
      </div>
      <div class="card"><div class="title">Recomendación orientativa <span class="sub">${num(redondear(rec.ha, 2))} ha · ${num(rec.factores.plantas)} plantas · ${num(Math.round(rec.factores.dens))} pl/ha${rec.factores.edad != null ? ' · ' + num(redondear(rec.factores.edad, 1)) + ' años' : ''}</span></div>
        <div class="sl-req">${['N', 'P2O5', 'K2O', 'MgO', 'S'].map(k => `<div><div class="n">${num(rec.req[k])}</div><div class="l">${k.replace('2O5', '₂O₅').replace('2O', '₂O')} kg/ha/año</div></div>`).join('')}</div>
        ${rec.cal ? `<div class="sl-cal"><b>${esc(rec.tipoCal)}: ${num(rec.cal)} t/ha</b><span>${num(Math.round(rec.cal * rec.ha * 1000))} kg en el lote · ${num(Math.ceil(rec.cal * rec.ha * 1000 / 50))} bultos</span></div>` : ''}
        <div class="tscroll narrow"><table class="dtable"><thead><tr><th>Producto</th><th class="num">kg/ha/año</th><th class="num">Bultos para el lote</th><th class="num">g/planta por aplicación</th><th class="num">Costo</th></tr></thead>
        <tbody>${rec.productos.map(p => `<tr><td>${esc(p.nombre)}${p.unica ? ' <small style="color:var(--text-faint)">una vez</small>' : ''}</td><td class="num">${num(Math.round(p.kgHa))}</td><td class="num">${num(redondear(p.bultos, 1))}</td><td class="num">${num(Math.round(p.gPlanta))}</td><td class="num">${fmt(p.costo)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4">Costo estimado de insumos del año</td><td class="num">${fmt(rec.costoTotal)}</td></tr></tfoot></table></div>
        <p class="hint" style="margin:10px 0 0;">Dividido en dos aplicaciones (${rec.meses.map(m => MESES[m - 1]).join(' y ')}), con el suelo húmedo. ${rec.notas.map(esc).join(' ')}</p>
        <p class="hint" style="margin:8px 0 0;">Cálculo orientativo con los rangos y dosis de referencia que usted puede ajustar; confírmelo con su asistente técnico o el extensionista del Comité de Cafeteros antes de comprar.</p>
        <div class="mp-btns"><button class="btn primary small" onclick="planDesdeSuelo('${a.id}')">Agregar al plan agronómico</button></div>
      </div></div>`;
  }
  host.innerHTML = `<div class="sl-grid">${tarjetas || '<div class="empty">Sin lotes en esta finca.</div>'}</div>${det}`;
}
function abrirAnalisisSuelo(loteId, id) {
  const a = id ? suelos.find(x => x.id === id) : { loteId: loteId || (lotesDeFinca(scSt.fincaId)[0] || {}).id, fecha: hoyLocal(), profundidad: 20 };
  openModal(`<h3>${id ? 'Editar' : 'Registrar'} análisis de suelo</h3><p class="hint">Copie los valores del informe del laboratorio. Los que no tenga, déjelos vacíos.</p>
    <div class="fgrid c4">
      <label class="f">Lote<select id="as-lote">${lotesActivos().map(l => `<option value="${l.id}" ${l.id === a.loteId ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></label>
      <label class="f">Fecha de muestreo<input id="as-fecha" type="date" value="${a.fecha || ''}"></label>
      <label class="f">Laboratorio<input id="as-lab" value="${esc(a.laboratorio || '')}"></label>
      <label class="f">Profundidad (cm)<input id="as-prof" type="number" value="${a.profundidad || 20}"></label>
      <label class="f">Textura<select id="as-tex">${['', 'Arenosa', 'Franco arenosa', 'Franca', 'Franco arcillosa', 'Arcillosa', 'Franco limosa'].map(t => `<option ${a.textura === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${SUELO_VARS.map(v => `<label class="f">${esc(v[1])}${v[2] ? ' (' + esc(v[2]) + ')' : ''}<input id="as-${v[0]}" type="number" step="any" value="${a[v[0]] == null ? '' : a[v[0]]}"></label>`).join('')}
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarAnalisisSuelo('${id || ''}')">Guardar</button></div>`, true);
}
function guardarAnalisisSuelo(id) {
  const g = k => document.getElementById(k).value; const loteId = g('as-lote'); const fecha = g('as-fecha'); if (!loteId || !fecha) { alert('Elija el lote y la fecha.'); return; }
  const a = id ? suelos.find(x => x.id === id) : { id: uid('su') }; Object.assign(a, { loteId, fecha, laboratorio: g('as-lab').trim(), profundidad: n0(g('as-prof')) || 20, textura: g('as-tex') });
  let algun = false; SUELO_VARS.forEach(v => { const t = g('as-' + v[0]); a[v[0]] = t === '' ? null : Number(t); if (t !== '') algun = true; });
  if (!algun) { alert('Ingrese al menos un valor del análisis.'); return; }
  if (a.pH != null && (a.pH < 3 || a.pH > 9)) { alert('Revise el pH: debe estar entre 3 y 9.'); return; }
  if (!id) suelos.push(a); scSt.analisisId = a.id; registrarCambio('lote', loteId, nombreLote(loteId), 'Análisis de suelo', fecha + (a.pH != null ? ' · pH ' + a.pH : ''));
  closeModal(); guardarEstado(); renderSueloClima(); toast('Análisis de suelo guardado');
}
function eliminarAnalisis(id) { conDeshacer('Análisis eliminado', () => { suelos = suelos.filter(x => x.id !== id); scSt.analisisId = null; guardarEstado(); renderSueloClima(); }); }
function abrirRangosSuelo() {
  const cf = cfgSuelo();
  openModal(`<h3>Rangos y dosis de referencia</h3><p class="hint">Ajústelos con las tablas de su laboratorio o la recomendación de Cenicafé para su zona. Los cambios se aplican a todos los análisis.</p>
    <div class="sec-label">Rangos (bajo hasta · medio hasta · alto desde)</div>
    <div class="fgrid c3">${SUELO_VARS.map(v => { const r = rangosVar(v[0]); return `<label class="f">${esc(v[1])}${v[2] ? ' (' + esc(v[2]) + ')' : ''}<span style="display:flex;gap:4px;">${[0, 1, 2].map(i => `<input id="rg-${v[0]}-${i}" type="number" step="any" value="${r[i] == null ? '' : r[i]}" style="min-width:0">`).join('')}</span></label>`; }).join('')}</div>
    <div class="sec-label">Necesidad anual de un cafetal en producción (kg/ha) con densidad de referencia</div>
    <div class="fgrid c4">${['N', 'P2O5', 'K2O', 'MgO', 'S', 'densRef'].map(k => `<label class="f">${k === 'densRef' ? 'Densidad de referencia (pl/ha)' : k}<input id="fz-${k}" type="number" value="${cf[k]}"></label>`).join('')}
      <label class="f">Mezcla comercial<select id="fz-mezcla">${Object.keys(PRODUCTOS_FERT).filter(k => k.includes('-')).map(k => `<option ${cf.productoMezcla === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="f">Meses de fertilización<input id="fz-meses" value="${cf.mesesFert.join(', ')}"></label></div>
    <div class="sec-label">Precio por bulto de 50 kg</div>
    <div class="fgrid c4">${[['precioMezcla', 'Mezcla'], ['precioUrea', 'Urea'], ['precioDAP', 'DAP'], ['precioKCl', 'Cloruro de potasio'], ['precioMg', 'Sulfato de magnesio'], ['precioCal', 'Cal']].map(([k, t]) => `<label class="f">${t}<input id="fz-${k}" type="number" value="${cf[k]}"></label>`).join('')}</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarRangosSuelo()">Guardar</button></div>`, true);
}
function guardarRangosSuelo() {
  const rg = {}; SUELO_VARS.forEach(v => { rg[v[0]] = [0, 1, 2].map(i => { const t = document.getElementById(`rg-${v[0]}-${i}`).value; return t === '' ? null : Number(t); }); });
  const s = {}; ['N', 'P2O5', 'K2O', 'MgO', 'S', 'densRef', 'precioMezcla', 'precioUrea', 'precioDAP', 'precioKCl', 'precioMg', 'precioCal'].forEach(k => s[k] = n0(document.getElementById('fz-' + k).value));
  s.productoMezcla = document.getElementById('fz-mezcla').value; s.mesesFert = document.getElementById('fz-meses').value.split(/[,\s]+/).map(Number).filter(m => m >= 1 && m <= 12); if (!s.mesesFert.length) s.mesesFert = [3, 9];
  climaConfig.rangos = rg; climaConfig.suelo = s; closeModal(); guardarEstado(); renderSueloClima(); toast('Referencias guardadas');
}

function renderClima() {
  const host = document.getElementById('sc-cuerpo'); const fid = scSt.fincaId; const r = resumenClima(fid);
  if (!r) { host.innerHTML = `<div class="card"><div class="empty">Aún no hay registros de clima. Anote cada día la lluvia del pluviómetro (mm) y, si tiene termómetro, la temperatura máxima y mínima; o importe un CSV de su estación o de IDEAM.<br><button class="btn primary small" style="margin-top:12px" onclick="abrirRegistroClima()">Registrar el primer día</button></div></div>`; return; }
  const nor = normalesFinca(fid); const meses = mesesAtras(18, r.hoyS); const porMes = {}; const tmes = {};
  climaDe(fid).forEach(c => { const k = c.fecha.slice(0, 7); porMes[k] = (porMes[k] || 0) + n0(c.lluvia); if (c.tmax != null && c.tmax !== '' && c.tmin != null) (tmes[k] = tmes[k] || []).push((n0(c.tmax) + n0(c.tmin)) / 2); });
  const al = alertasClima(fid); const flores = floracionesProbables(fid).slice(0, 6); const bal = balanceHidrico(fid, sumarDias(r.hoyS, -119));
  const tono = v => v == null ? '' : v < 35 ? 'mal' : v < 60 ? 'medio' : 'bien';
  host.innerHTML = `
    <div class="k19-grid">
      ${kpi19('Lluvia últimos 30 días', num(Math.round(r.lluvia30)) + ' <small>mm</small>', r.normal30 ? (r.lluvia30 >= r.normal30 ? '+' : '') + Math.round((r.lluvia30 / r.normal30 - 1) * 100) + ' % frente a lo normal' : r.dias30 + ' días con registro', '', 'i-lluvia')}
      ${kpi19('Lluvia en ' + r.hoyS.slice(0, 4), num(Math.round(r.anio)) + ' <small>mm</small>', nor ? 'normal anual ' + num(Math.round(nor.vals.reduce((a, b) => a + b, 0))) + ' mm' : '', '', 'i-lluvia')}
      ${kpi19('Humedad del suelo', r.humedad == null ? '—' : Math.round(r.humedad) + ' <small>%</small>', 'agua disponible estimada', tono(r.humedad), 'i-suelo')}
      ${kpi19('Temperatura media', r.tmed == null ? '—' : num(redondear(r.tmed, 1)) + ' <small>°C</small>', 'últimos 30 días' + (r.hrMed ? ' · HR ' + Math.round(r.hrMed) + ' %' : ''), '', 'i-hoy')}
      ${kpi19('Días sin lluvia', r.secos, r.secos ? 'seguidos hasta ' + fechaCorta(r.hoyS) : 'llovió el último día', r.secos >= 10 ? 'medio' : '', 'i-hoy')}
      ${kpi19('Floración probable', flores[0] ? fechaCorta(flores[0].flor) : '—', flores[0] ? 'cosecha hacia ' + fechaCorta(flores[0].cosecha) + ' ' + flores[0].cosecha.slice(0, 4) : 'sin disparo reciente', '', 'i-labor')}
    </div>
    ${al.length ? `<div class="alerta-lista">${al.map(a => `<div class="al19 ${a.t}"><span></span>${esc(a.txt)}</div>`).join('')}</div>` : ''}
    <div class="grid g2">
      <div class="card"><div class="title">Lluvia por mes <span class="sub">${nor ? 'con la normal (' + esc(nor.fuente) + ')' : 'ingrese la normal en Parámetros para comparar'}</span></div>
        ${gLeyenda([{ color: 'var(--c1)', txt: 'Lluvia del mes' }].concat(nor ? [{ color: 'var(--text-soft)', txt: 'Normal', punteada: true }] : []).concat([{ color: 'var(--c2)', txt: 'Temperatura media', linea: true }]))}
        ${gCombo({ cats: meses.map(mesCorto), series: [{ nombre: 'Lluvia', vals: meses.map(m => porMes[m] == null ? null : Math.round(porMes[m])), color: 'var(--c1)', fmtTip: v => num(v) + ' mm' }].concat(nor ? [{ nombre: 'Normal', tipo: 'linea', punteada: true, puntos: false, vals: meses.map(m => Math.round(nor.vals[Number(m.slice(5)) - 1])), color: 'var(--text-soft)', fmtTip: v => num(v) + ' mm' }] : []).concat([{ nombre: 'Temperatura media', tipo: 'linea', eje: 'der', vals: meses.map(m => tmes[m] ? redondear(tmes[m].reduce((a, b) => a + b, 0) / tmes[m].length, 1) : null), color: 'var(--c2)', fmtTip: v => num(v) + ' °C' }]), fmt: v => num(v), fmt2: v => num(v) + '°', der0: false, alto: 250, marcaCat: meses.length - 1, titulo: 'Lluvia mensual' })}
      </div>
      <div class="card"><div class="title">Balance hídrico <span class="sub">últimos 120 días · agua disponible en el suelo</span></div>
        ${gLeyenda([{ color: 'var(--c1)', txt: 'Lluvia diaria' }, { color: 'var(--c3)', txt: 'Agua en el suelo (%)', linea: true }, { color: 'var(--c2)', txt: 'Déficit (mm)' }])}
        ${gCombo({ cats: bal.map(b => fechaCorta(b.fecha)), series: [{ nombre: 'Lluvia', vals: bal.map(b => b.lluvia == null ? null : redondear(b.lluvia, 1)), color: 'var(--c1)', fmtTip: v => num(v) + ' mm' }, { nombre: 'Déficit', vals: bal.map(b => b.deficit > 0.05 ? -redondear(b.deficit, 1) : null), color: 'var(--c2)', fmtTip: v => num(Math.abs(v)) + ' mm' }, { nombre: 'Agua en el suelo', tipo: 'area', eje: 'der', puntos: false, vals: bal.map(b => Math.round(b.pct)), color: 'var(--c3)', fmtTip: v => v + ' %' }], fmt: v => num(v), fmt2: v => v + '%', alto: 250, etiquetaCada: 21, titulo: 'Balance hídrico' })}
        <p class="hint" style="margin:6px 0 0;">Modelo de cubeta: capacidad ${num(cfgClima().cad)} mm, evapotranspiración por Hargreaves con su temperatura (3,6 mm/día si falta) y coeficiente del cultivo ${num(cfgClima().kc)}.</p>
      </div>
    </div>
    <div class="grid g2">
      <div class="card"><div class="title">Floraciones probables por lluvia <span class="sub">lluvia después de ${cfgClima().diasSecos}+ días secos</span></div>
        ${flores.length ? `<div class="tscroll narrow"><table class="dtable"><thead><tr><th>Lluvia que dispara</th><th class="num">Días secos antes</th><th class="num">Lluvia</th><th>Floración esperada</th><th>Cosecha estimada</th></tr></thead><tbody>${flores.map(f => `<tr><td>${fechaCorta(f.disparo)} ${f.disparo.slice(0, 4)}</td><td class="num">${f.secos}</td><td class="num">${num(f.lluvia)} mm</td><td>${fechaCorta(f.flor)}</td><td><b>${fechaCorta(f.cosecha)} ${f.cosecha.slice(0, 4)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No se detectan disparos de floración en los registros.</p>'}
        <p class="hint" style="margin:8px 0 0;">Es una alerta temprana: confirme cada floración con un muestreo de floración en el mapa del lote; la cosecha estimada usa ${num(cfgMapa().diasFloracion)} días de flor a cosecha.</p>
      </div>
      <div class="card"><div class="title">Últimos registros</div>
        <div class="tscroll narrow" style="max-height:330px"><table class="dtable"><thead><tr><th>Fecha</th><th class="num">Lluvia</th><th class="num">T máx</th><th class="num">T mín</th><th class="num">HR</th><th></th></tr></thead><tbody>${climaDe(fid).slice(-40).reverse().map(c => `<tr><td>${c.fecha}</td><td class="num">${num(c.lluvia)} mm</td><td class="num">${c.tmax == null || c.tmax === '' ? '—' : num(c.tmax) + '°'}</td><td class="num">${c.tmin == null || c.tmin === '' ? '—' : num(c.tmin) + '°'}</td><td class="num">${c.hr ? num(c.hr) + '%' : '—'}</td><td class="actions"><button class="btn danger-ghost" onclick="eliminarClima('${c.id}')">✕</button></td></tr>`).join('')}</tbody></table></div>
        <div class="mp-btns"><button class="btn ghost small" onclick="exportarClimaCSV()">Exportar CSV</button></div>
      </div>
    </div>`;
}
function abrirRegistroClima() {
  openModal(`<h3>Registro de clima</h3><p class="hint">Lea el pluviómetro a la misma hora cada día (por ejemplo 7 a. m.) y anote la lluvia de las 24 horas anteriores.</p>
    <div class="fgrid c3"><label class="f">Finca<select id="cl-finca">${fincas.filter(activo).map(f => `<option value="${f.id}" ${f.id === scSt.fincaId ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}</select></label>
      <label class="f">Fecha<input id="cl-fecha" type="date" value="${hoyLocal()}"></label><label class="f">Lluvia (mm)<input id="cl-lluvia" type="number" step="0.1" min="0"></label>
      <label class="f">Temperatura máxima (°C)<input id="cl-tmax" type="number" step="0.1"></label><label class="f">Temperatura mínima (°C)<input id="cl-tmin" type="number" step="0.1"></label><label class="f">Humedad relativa (%)<input id="cl-hr" type="number" step="1" min="0" max="100"></label></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarRegistroClima()">Guardar</button></div>`);
}
function guardarRegistroClima() {
  const g = k => document.getElementById(k).value; const fecha = g('cl-fecha'), fincaId = g('cl-finca'); if (!fecha || g('cl-lluvia') === '') { alert('Indique la fecha y la lluvia (0 si no llovió).'); return; }
  const tmax = g('cl-tmax') === '' ? null : Number(g('cl-tmax')), tmin = g('cl-tmin') === '' ? null : Number(g('cl-tmin'));
  if (tmax != null && tmin != null && tmin > tmax) { alert('La mínima no puede ser mayor que la máxima.'); return; }
  clima = clima.filter(c => !(c.fecha === fecha && c.fincaId === fincaId));
  clima.push({ id: uid('cl'), fincaId, fecha, lluvia: Number(g('cl-lluvia')), tmax, tmin, hr: g('cl-hr') === '' ? null : Number(g('cl-hr')), fuente: 'manual' });
  closeModal(); guardarEstado(); renderSueloClima(); toast('Clima del ' + fechaCorta(fecha) + ' guardado');
}
function eliminarClima(id) { conDeshacer('Registro de clima eliminado', () => { clima = clima.filter(c => c.id !== id); guardarEstado(); renderSueloClima(); }); }
function abrirImportarClima() {
  openModal(`<h3>Importar clima desde CSV</h3><p class="hint">Columnas reconocidas: fecha, lluvia (o precipitación, mm), tmax, tmin y humedad. Fechas como 2026-10-27 o 27/10/2026. Separador coma, punto y coma o tabulación.</p>
    <input type="file" accept=".csv,.txt" onchange="leerClimaCSV(this.files[0])"><div id="imc-res" style="margin-top:12px;"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`);
}
let _climaImp = [];
function leerClimaCSV(file) {
  if (!file) return; const rd = new FileReader();
  rd.onload = () => { const txt = String(rd.result).replace(/^﻿/, ''); const lineas = txt.split(/\r?\n/).filter(l => l.trim()); if (lineas.length < 2) { document.getElementById('imc-res').innerHTML = '<p class="hint">El archivo está vacío.</p>'; return; }
    const sep = [';', '\t', ','].find(s => lineas[0].includes(s)) || ','; const cab = lineas[0].split(sep).map(c => c.trim().toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''));
    const col = re => cab.findIndex(c => re.test(c)); const ci = { f: col(/fecha|date|dia/), p: col(/lluvia|precip|rain|ppt|mm/), x: col(/tmax|maxima|max/), n: col(/tmin|minima|min/), h: col(/hum|hr|rh/) };
    if (ci.f < 0 || ci.p < 0) { document.getElementById('imc-res').innerHTML = '<p class="hint" style="color:var(--danger)">No se encontraron las columnas de fecha y lluvia.</p>'; return; }
    const numv = t => { t = String(t == null ? '' : t).trim(); if (!t) return null; if (sep !== ',' ) t = t.replace(',', '.'); const v = Number(t); return isFinite(v) ? v : null; };
    const fecha = t => { t = String(t || '').trim(); let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'); m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(t); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); return null; };
    _climaImp = lineas.slice(1).map(l => l.split(sep)).map(c => ({ fecha: fecha(c[ci.f]), lluvia: numv(c[ci.p]), tmax: ci.x >= 0 ? numv(c[ci.x]) : null, tmin: ci.n >= 0 ? numv(c[ci.n]) : null, hr: ci.h >= 0 ? numv(c[ci.h]) : null })).filter(r => r.fecha && r.lluvia != null && r.lluvia >= 0);
    document.getElementById('imc-res').innerHTML = _climaImp.length ? `<p><b>${_climaImp.length}</b> días válidos, del ${_climaImp[0].fecha} al ${_climaImp[_climaImp.length - 1].fecha}. Los días que ya existen se reemplazan.</p><button class="btn primary small" onclick="aplicarClimaCSV()">Importar a ${esc(nombreFinca(scSt.fincaId))}</button>` : '<p class="hint">No hay filas válidas.</p>'; };
  rd.readAsText(file);
}
function aplicarClimaCSV() { const fid = scSt.fincaId; const fechas = new Set(_climaImp.map(r => r.fecha)); clima = clima.filter(c => !(c.fincaId === fid && fechas.has(c.fecha))).concat(_climaImp.map(r => Object.assign({ id: uid('cl'), fincaId: fid, fuente: 'csv' }, r))); closeModal(); guardarEstado(); renderSueloClima(); toast(_climaImp.length + ' días de clima importados'); }
function exportarClimaCSV() { descargarCSV('clima-' + (nombreFinca(scSt.fincaId) || 'finca').replace(/\s+/g, '-').toLowerCase() + '.csv', [['fecha', 'lluvia_mm', 'tmax', 'tmin', 'hr']].concat(climaDe(scSt.fincaId).map(c => [c.fecha, c.lluvia, c.tmax, c.tmin, c.hr]))); }
function abrirConfigClima() {
  const cf = cfgClima(); const nor = (climaConfig.normales || {})[scSt.fincaId] || [];
  openModal(`<h3>Parámetros de clima</h3>
    <div class="fgrid c3"><label class="f">Capacidad de agua del suelo (mm)<input id="cc-cad" type="number" value="${cf.cad}"></label><label class="f">Coeficiente del cultivo (Kc)<input id="cc-kc" type="number" step="0.05" value="${cf.kc}"></label><label class="f">Latitud (°)<input id="cc-lat" type="number" step="0.01" value="${cf.lat}"></label>
      <label class="f">Lluvia mínima útil (mm/día)<input id="cc-us" type="number" step="0.5" value="${cf.umbralSeco}"></label><label class="f">Días secos para disparar floración<input id="cc-ds" type="number" value="${cf.diasSecos}"></label><label class="f">Lluvia que dispara (mm)<input id="cc-ld" type="number" value="${cf.lluviaDisparo}"></label></div>
    <div class="sec-label">Lluvia normal por mes (mm) · tómela de la estación de IDEAM o de Cenicafé más cercana</div>
    <div class="fgrid c6">${MESES.map((m, i) => `<label class="f">${m}<input id="cc-n${i}" type="number" value="${nor[i] == null ? '' : nor[i]}"></label>`).join('')}</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarConfigClima()">Guardar</button></div>`, true);
}
function guardarConfigClima() {
  const v = k => n0(document.getElementById(k).value); climaConfig.balance = { cad: v('cc-cad') || 120, kc: v('cc-kc') || 0.95, lat: v('cc-lat') || 5.5, umbralSeco: v('cc-us') || 2, diasSecos: v('cc-ds') || 12, lluviaDisparo: v('cc-ld') || 12, diasAFlor: 10 };
  const nor = MESES.map((m, i) => { const t = document.getElementById('cc-n' + i).value; return t === '' ? null : Number(t); }); climaConfig.normales = Object.assign({}, climaConfig.normales || {}, { [scSt.fincaId]: nor.some(x => x != null) ? nor : null });
  closeModal(); guardarEstado(); renderSueloClima(); toast('Parámetros de clima guardados');
}
