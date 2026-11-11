/* ================= TABLERO: salud de plantas, maduración, dispersión y decisiones ================= */
const VARS_SALUD = [
  ['Sanidad general', 'Sanidad general', 'malo', [1, 5], ''],
  ['Broca', 'Broca', 'malo', null, '%'],
  ['Roya', 'Roya', 'malo', null, '%'],
  ['Nutrición', 'Deficiencia nutricional', 'malo', [0, 4], ''],
  ['faltantes', 'Plantas faltantes', 'malo', [0, 15], '%'],
  ['Floración', 'Floración', 'bueno', [0, 4], ''],
  ['Desarrollo', 'Desarrollo (altura)', 'bueno', null, ' cm'],
  ['Frutos (proyección)', 'Carga de frutos', 'bueno', null, ''],
  ['Maduración', 'Maduración', 'bueno', [0, 100], '%'],
];
tbSt.salud = tbSt.salud || 'Sanidad general';
tbSt.disp = tbSt.disp || { ds:'plantas', x:'Desarrollo', y:'Frutos (proyección)' };
function dominioVar(v, celdasTodas) {
  const def = VARS_SALUD.find(x => x[0] === v); if (def && def[3]) return def[3];
  if (v === 'Broca') return [0, 3 * cfgMapa().umbralBroca];
  if (v === 'Roya') return [0, 3 * cfgMapa().umbralRoya];
  const vals = celdasTodas.filter(x => x != null); if (!vals.length) return [0, 1];
  const mn = Math.min(...vals), mx = Math.max(...vals); return mn === mx ? [mn * 0.9, mx * 1.1 || 1] : [mn, mx];
}
function rejillaCalor(l, v) {
  const g = geomLote(l); if (!g) return { sinDiseno: true };
  const cols = Math.min(g.nS, 16), rows = Math.min(g.nP, 22), cS = g.nS / cols, cP = g.nP / rows;
  const vals = Array.from({ length: rows }, () => Array(cols).fill(null)); let pts = [], campana = null;
  if (v === 'faltantes') {
    const cnt = Array.from({ length: rows }, () => Array(cols).fill(0));
    const fal = marcasPlanta.filter(mk => mk.loteId === l.id && mk.estado === 'Faltante');
    fal.forEach(mk => { const pc = parseCodigo(mk.codigo); if (!pc) return; const c = Math.min(cols - 1, Math.floor((pc.i - 1) / cS)), r = Math.min(rows - 1, Math.floor((pc.j - 1) / cP)); cnt[r][c]++; pts.push({ i: pc.i, j: pc.j, cod: mk.codigo }); });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) vals[r][c] = cnt[r][c] / (cS * cP) * 100;
    return { g, cols, rows, vals, pts, campana: null, n: fal.length, prom: fal.length / g.total * 100, faltantes: fal.length };
  }
  campana = ultimaCampana(l.id, v); if (!campana) return { g, cols, rows, vals, pts, campana: null, sinDatos: true };
  pts = campana.regs.map(rg => { const pc = parseCodigo(rg.codigo); if (!pc || pc.i > g.nS || pc.j > g.nP) return null; return { i: pc.i, j: pc.j, x: (pc.i - 0.5) * g.ds, y: (pc.j - 0.5) * g.dp, v: n0(rg.valor), cod: rg.codigo, op: rg.opcion }; }).filter(Boolean);
  if (!pts.length) return { g, cols, rows, vals, pts, campana, sinDatos: true };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ((c + 0.5) * cS) * g.ds, y = ((r + 0.5) * cP) * g.dp; let sw = 0, sv = 0, exacto = null;
    pts.forEach(p => { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < 0.01) exacto = p.v; const w = 1 / (d2 + 1); sw += w; sv += w * p.v; });
    vals[r][c] = exacto != null ? exacto : sv / sw;
  }
  return { g, cols, rows, vals, pts, campana, n: pts.length, prom: campana.prom };
}
function colorCalor(t, sentido) {
  const k = Math.round(12 + Math.max(0, Math.min(1, t)) * 88);
  return `color-mix(in oklab, ${sentido === 'malo' ? 'var(--danger)' : 'var(--accent)'} ${k}%, var(--surface-2))`;
}
function svgCalor(h, def, dom, w) {
  const W = w || 220, cw = W / h.cols, ch = Math.max(6, Math.min(cw * 1.4, 300 / h.rows)), H = ch * h.rows;
  const unidad = def[4]; let s = '';
  for (let r = 0; r < h.rows; r++) for (let c = 0; c < h.cols; c++) {
    const v = h.vals[r][c]; const t = (v - dom[0]) / ((dom[1] - dom[0]) || 1);
    const s1 = Math.floor(c * h.g.nS / h.cols) + 1, s2 = Math.floor((c + 1) * h.g.nS / h.cols), p1 = Math.floor(r * h.g.nP / h.rows) + 1, p2 = Math.floor((r + 1) * h.g.nP / h.rows);
    s += `<rect x="${(c * cw).toFixed(2)}" y="${(r * ch).toFixed(2)}" width="${(cw + 0.4).toFixed(2)}" height="${(ch + 0.4).toFixed(2)}" style="fill:${colorCalor(t, def[2])}" data-tip="Surcos ${s1}–${s2} · plantas ${p1}–${p2}: ${num(redondear(v, 1))}${unidad}${def[0] === 'faltantes' ? ' de plantas faltantes' : ' (estimado)'}"/>`;
  }
  h.pts.forEach(p => { const cx = (p.i - 0.5) / h.g.nS * W, cy = (p.j - 0.5) / h.g.nP * H;
    s += def[0] === 'faltantes' ? `<path d="M${cx - 2.5},${cy - 2.5} l5,5 m0,-5 l-5,5" style="stroke:var(--text)" stroke-width="1.3" data-tip="${esc(p.cod)} · faltante"/>`
      : `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.2" style="fill:var(--surface);stroke:var(--text)" stroke-width="1" data-tip="${esc(p.cod)}: ${num(redondear(p.v, 1))}${unidad}${p.op && p.op !== 'Ninguna' ? ' · ' + esc(p.op) : ''} (medido)"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;border-radius:8px;" role="img" aria-label="Mapa de calor">${s}</svg>`;
}
function renderSalud() {
  const host = document.getElementById('tb-salud'); if (!host) return;
  const def = VARS_SALUD.find(x => x[0] === tbSt.salud) || VARS_SALUD[0];
  document.getElementById('tb-salud-vars').innerHTML = VARS_SALUD.map(v => `<button role="tab" aria-selected="${tbSt.salud===v[0]}" class="${tbSt.salud===v[0]?'on':''}" onclick="tbSt.salud='${v[0]}';renderSalud()">${v[1]}</button>`).join('');
  const ls = lotesAlcance(); const hs = ls.map(l => ({ l, h: rejillaCalor(l, def[0]) }));
  const todas = []; hs.forEach(o => { if (o.h.vals && !o.h.sinDatos) o.h.vals.forEach(fila => fila.forEach(v => todas.push(v))); });
  const dom = dominioVar(def[0], todas);
  const u = def[0] === 'Broca' ? cfgMapa().umbralBroca : def[0] === 'Roya' ? cfgMapa().umbralRoya : def[0] === 'Sanidad general' ? 3 : def[0] === 'Nutrición' ? 1.5 : def[0] === 'faltantes' ? 5 : null;
  host.innerHTML = hs.length ? hs.map(({ l, h }) => {
    let cuerpo, pie = '';
    if (h.sinDiseno) cuerpo = `<div class="hm-vacio">Sin diseño de siembra.<br><button class="link" onclick="ir('mapa');mapaCambiarLote('${l.id}');abrirDisenoLote()">Definir diseño</button></div>`;
    else if (h.sinDatos) cuerpo = `<div class="hm-vacio">Sin muestreo de ${esc(def[1].toLowerCase())}.<br><button class="link" onclick="ir('mapa');mapaCambiarLote('${l.id}');abrirPlanMuestreo()">Planear muestreo</button></div>`;
    else {
      cuerpo = svgCalor(h, def, dom, 240);
      const sobre = u != null && h.vals ? h.vals.flat().filter(v => v > u).length / (h.cols * h.rows) * 100 : null;
      pie = `<div class="hm-pie"><span>${def[0] === 'faltantes' ? h.faltantes + ' faltantes · ' + num(redondear(h.prom, 1)) + '%' : 'Promedio ' + num(redondear(h.prom, 1)) + def[4] + ' · ' + h.n + ' plantas'}</span>${sobre != null ? `<span class="${sobre > 25 ? 'neg' : ''}">${num(Math.round(sobre))}% del área sobre ${num(u)}${def[4]}</span>` : (h.campana ? `<span>${fechaCorta(h.campana.fecha)}</span>` : '')}</div>`;
    }
    return `<div class="hm-card" ${h.sinDiseno || h.sinDatos ? '' : `onclick="ir('mapa');mapaCambiarLote('${l.id}');${def[0] === 'faltantes' ? "mapaCapa('marcas')" : `mapaCapa('${def[0]}')`}" title="Abrir en el mapa del lote"`}><div class="hm-t"><b>${esc(l.nombre)}</b><span>${n0(l.hectareas) ? num(l.hectareas) + ' ha' : ''}</span></div>${cuerpo}${pie}</div>`;
  }).join('') : '<div class="empty">Sin lotes activos.</div>';
  const unidad = def[4];
  document.getElementById('tb-salud-leg').innerHTML = `<span class="hm-esc"><span>${num(redondear(dom[0], 1))}${unidad}</span><i style="background:linear-gradient(90deg, ${colorCalor(0, def[2])}, ${colorCalor(0.5, def[2])}, ${colorCalor(1, def[2])})"></i><span>${num(redondear(dom[1], 1))}${unidad}${def[3] ? '' : ' o más'}</span></span>
    <span class="lg"><i style="background:var(--surface);border:1.5px solid var(--text);"></i>Planta medida</span><span class="nota">${def[2] === 'malo' ? 'Más oscuro = peor' : 'Más oscuro = mejor'} · los valores entre plantas medidas se estiman por cercanía · vista esquemática: surcos de izquierda a derecha</span>`;
  // Deficiencias nutricionales
  const nut = [];
  ls.forEach(l => { const c = ultimaCampana(l.id, 'Nutrición'); if (c) c.regs.forEach(rg => nut.push({ l, op: rg.opcion || 'Ninguna', v: n0(rg.valor) })); });
  const conDef = nut.filter(x => x.op !== 'Ninguna' && x.v >= 1);
  const porEl = groupSum(conDef, x => x.op, () => 1).sort((a, b) => b.value - a.value);
  document.getElementById('tb-nutri').innerHTML = nut.length ? `<div class="tb-big">${num(Math.round(conDef.length / nut.length * 100))}%</div><div class="hint" style="margin:2px 0 12px;">de ${nut.length} plantas evaluadas muestra alguna deficiencia</div>
    <div class="rk">${porEl.map(x => { const lotesEl = [...new Set(conDef.filter(y => y.op === x.label).map(y => y.l.nombre))]; return `<div class="rk-r rk-wide" data-tip="${esc(x.label)}: ${x.value} planta(s) en ${esc(lotesEl.join(', '))}"><span class="rk-n">${esc(x.label)}</span><span class="rk-b"><i style="width:${x.value / nut.length * 100}%;background:var(--danger)"></i></span><span class="rk-v">${num(Math.round(x.value / nut.length * 100))}%</span></div>`; }).join('') || '<p class="hint">Sin deficiencias visibles.</p>'}</div>
    <p class="hint" style="margin:10px 0 0;">El diagnóstico visual orienta; confírmelo con análisis foliar y de suelo antes de cambiar el plan de fertilización.</p>`
    : '<div class="empty">Registre un muestreo de nutrición (Mapa y muestreos → Plan de muestreo → Nutrición) para ver las deficiencias por nutriente.</div>';
}

/* ---- Maduración y proyección de cereza ---- */
function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function probit(p) { p = Math.min(0.98, Math.max(0.02, p)); let lo = -4, hi = 4; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (normCdf(mid) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; }
function curvaMaduracion() {
  const SD = 14, hoyS = hoyLocal(); const semanas = 14;
  const lotesP = lotesAlcance().map(l => {
    const pr = proyeccionLote(l); if (!pr || !pr.kgCereza) return null;
    const hecho = registros.filter(x => x.loteId === l.id && x.fecha >= pr.campana.fecha).reduce((a, x) => a + n0(x.kg), 0);
    const falta = Math.max(0, pr.kgCereza - hecho); const flo = ultimaCampana(l.id, 'Floración'), mad = ultimaCampana(l.id, 'Maduración');
    let centro = flo ? sumarDias(flo.fecha, n0(cfgMapa().diasFloracion)) : null, base = 'floración';
    if (mad) { const p = mad.prom / 100; centro = sumarDias(mad.fecha, -Math.round(SD * probit(p))); base = 'maduración del ' + fechaCorta(mad.fecha); }
    if (!centro) return { l, falta, centro: null, mad, base: 'sin floración ni maduración' };
    const dd = (a, b) => (parseFecha(b) - parseFecha(a)) / 864e5;
    const quedaFrac = Math.max(0.05, 1 - normCdf(dd(centro, hoyS) / SD));
    const sem = Array.from({ length: semanas }, (_, k) => { const a = sumarDias(hoyS, k * 7), b = sumarDias(hoyS, k * 7 + 7);
      return falta * Math.max(0, normCdf(dd(centro, b) / SD) - normCdf(dd(centro, a) / SD)) / quedaFrac; });
    return { l, falta, centro, mad, base, sem };
  }).filter(Boolean);
  return { lotesP, semanas, SD };
}
function renderMaduracion() {
  const host = document.getElementById('tb-madur'); if (!host) return;
  const { lotesP, semanas } = curvaMaduracion(); const conCurva = lotesP.filter(x => x.sem);
  const factor = tbMetricas(tbRango('anio')).factor || metas().metaFactor; const ref = precioRefCarga().v;
  if (!conCurva.length) { host.innerHTML = '<div class="empty">Para proyectar la maduración registre en Mapa y muestreos un conteo de frutos y una floración o un muestreo de maduración por lote.<br><button class="link" onclick="ir(\'mapa\')">Ir a Mapa y muestreos</button></div>'; document.getElementById('tb-madur-tabla').innerHTML = ''; return; }
  const totSem = Array.from({ length: semanas }, (_, k) => conCurva.reduce((a, x) => a + x.sem[k], 0));
  const W = Math.max(300, Math.round(host.clientWidth || 760)), H = W < 500 ? 220 : 250, pl = 46, pr = 8, pt = 14, pb = 30, cw = W - pl - pr, ch = H - pt - pb;
  const mx = Math.max(1, ...totSem); const tick = [1, 2, 2.5, 5, 10].map(f => f * Math.pow(10, Math.floor(Math.log10(mx)))).find(t => mx / t <= 4) || mx; const top_ = Math.ceil(mx / tick) * tick;
  const bw = cw / semanas, barW = Math.max(4, Math.min(34, bw * 0.66)); let s = '';
  for (let v = 0; v <= top_ + 1e-9; v += tick) { const y = pt + ch - v / top_ * ch; s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" style="stroke:var(--grid)"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtCorto(v)}</text>`; }
  const pico = totSem.indexOf(Math.max(...totSem)); const cada = Math.ceil(semanas / Math.max(4, Math.floor(W / 70)));
  for (let k = 0; k < semanas; k++) { const x = pl + k * bw + (bw - barW) / 2; let y = pt + ch; const capas = conCurva.map((o, i) => [o.sem[k], i]).filter(e => e[0] > 0.5);
    capas.forEach(([v, i], j) => { const hgt = v / top_ * ch; y -= hgt; s += j === capas.length - 1 && hgt > 4 ? `<path d="M${x},${y + hgt} V${y + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${y + hgt} Z" style="fill:${SERIES[i % 5]}"/>` : `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0.5, hgt - 1.5)}" style="fill:${SERIES[i % 5]}"/>`; });
    const d0 = sumarDias(hoyLocal(), k * 7);
    if (k % cada === 0 || k === pico) s += `<text x="${x + barW / 2}" y="${H - 10}" text-anchor="middle" style="fill:${k === pico ? 'var(--text)' : 'var(--text-faint)'}" font-weight="${k === pico ? 700 : 400}" font-size="10.5" font-family="Figtree, system-ui, sans-serif">${fechaCorta(d0)}</text>`;
    s += `<rect class="hit" x="${pl + k * bw}" y="${pt}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc('Semana del ' + fechaCorta(d0) + ': ' + num(Math.round(totSem[k])) + ' kg de cereza madura (' + num(redondear(totSem[k] / factor / 125, 1)) + ' cargas) — ' + conCurva.map(o => o.l.nombre + ' ' + num(Math.round(o.sem[k]))).join(', '))}"/>`; }
  const xP = pl + pico * bw + bw / 2; s += `<text x="${xP}" y="${pt + ch - totSem[pico] / top_ * ch - 8}" text-anchor="middle" style="fill:var(--text);stroke:var(--surface);paint-order:stroke" stroke-width="4" font-size="11" font-weight="700" font-family="Figtree, system-ui, sans-serif">pico ${num(Math.round(totSem[pico]))} kg</text>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cereza madura proyectada por semana">${s}</svg>`;
  document.getElementById('tb-madur-leg').innerHTML = conCurva.map((o, i) => `<span class="lg"><i style="background:${SERIES[i % 5]}"></i>${esc(o.l.nombre)} · ${num(Math.round(o.falta))} kg</span>`).join('');
  const kgJ = tbMetricas(tbRango('ult30')).jornadas ? tbMetricas(tbRango('ult30')).kg / tbMetricas(tbRango('ult30')).jornadas : 0;
  document.getElementById('tb-madur-tabla').innerHTML = `<div class="tscroll"><table class="dtable" style="min-width:560px;"><thead><tr><th>Lote</th><th class="num">Maduro hoy</th><th>Pico estimado</th><th class="num">Cereza por recoger</th><th class="num">Cargas</th><th class="num">Valor</th><th>Base del cálculo</th></tr></thead><tbody>
    ${lotesP.map(o => `<tr><td><b style="color:var(--text);font-weight:650;">${esc(o.l.nombre)}</b></td><td class="num">${o.mad ? num(Math.round(o.mad.prom)) + '%' : '—'}</td><td>${o.centro ? fechaCorta(o.centro) + ' ' + parseFecha(o.centro).getUTCFullYear() : '—'}</td><td class="num">${num(Math.round(o.falta))} kg</td><td class="num">${num(redondear(o.falta / factor / 125, 1))}</td><td class="num">${ref ? fmt(o.falta / factor / 125 * ref) : '—'}</td><td style="font-size:12px;">${esc(o.base)}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0;">La semana de mayor carga necesita unos <b>${kgJ ? num(Math.ceil(totSem[pico] / kgJ / 6)) : '—'} recolectores por día</b>${kgJ ? ' (a ' + num(Math.round(kgJ)) + ' kg por jornada)' : ''}. La curva supone una maduración escalonada de unas cuatro semanas alrededor del pico; un muestreo de maduración cada 8 a 10 días la ajusta.</p>`;
}

/* ---- Dispersión ---- */
const DS_DISP = {
  plantas: { t:'Plantas muestreadas', vars: { 'Broca':'Broca (%)', 'Roya':'Roya (%)', 'Sanidad general':'Sanidad (1 a 5)', 'Nutrición':'Deficiencia nutricional (0 a 4)', 'Floración':'Floración (0 a 4)', 'Desarrollo':'Altura (cm)', 'Frutos (proyección)':'Frutos por planta', 'Maduración':'Maduración (%)' } },
  lotes: { t:'Lotes', vars: { kgha:'Pergamino por ha en el año (kg)', costoHa:'Costo directo por ha ($)', edad:'Edad del cultivo (años)', densidad:'Densidad (plantas por ha)', broca:'Broca (%)', roya:'Roya (%)', sanidad:'Sanidad (1 a 5)', nutri:'Deficiencia nutricional (0 a 4)', desarrollo:'Altura promedio (cm)', frutos:'Frutos por planta', factor:'Factor de conversión' } },
  recolectores: { t:'Recolectores', vars: { kgh:'Kg por hora', kg:'Kg recolectados', horas:'Horas trabajadas', dias:'Días trabajados', kgdia:'Kg por día' } },
  dias: { t:'Días de cosecha', vars: { personas:'Recolectores en el día', kg:'Kg del día', kgh:'Kg por hora', horas:'Horas del día' } },
};
const DISP_DEF = { plantas:['Desarrollo','Frutos (proyección)'], lotes:['edad','kgha'], recolectores:['dias','kgh'], dias:['personas','kgh'] };
function puntosDispersion(ds) {
  const r = tbRango(tbSt.periodo);
  if (ds === 'plantas') {
    const out = []; lotesAlcance().forEach((l, li) => { const porCod = new Map();
      Object.keys(DS_DISP.plantas.vars).forEach(t => { const c = ultimaCampana(l.id, t); if (c) c.regs.forEach(rg => { const o = porCod.get(rg.codigo) || { nombre: rg.codigo, grupo: l.nombre, gi: li }; o[t] = n0(rg.valor); porCod.set(rg.codigo, o); }); });
      porCod.forEach(o => out.push(o)); }); return out;
  }
  if (ds === 'lotes') {
    const m = tbMetricas(r); return analisisLotes(m, precioRefCarga().v).map((x, li) => { const g = geomLote(x.l); const prom = t => { const c = ultimaCampana(x.l.id, t); return c ? c.prom : undefined; };
      const b = beneficios.filter(z => z.loteId === x.l.id); const s = b.reduce((a, z) => a + n0(z.kgSalida), 0);
      return { nombre: x.l.nombre, grupo: 'Lotes', gi: 0, kgha: x.ha ? x.kghaAnio : undefined, costoHa: x.ha ? x.costoHa : undefined, edad: x.edad == null ? undefined : x.edad, densidad: g ? g.total / g.ha : undefined, broca: prom('Broca'), roya: prom('Roya'), sanidad: prom('Sanidad general'), nutri: prom('Nutrición'), desarrollo: prom('Desarrollo'), frutos: prom('Frutos (proyección)'), factor: s ? b.reduce((a, z) => a + n0(z.kgEntrada), 0) / s : undefined }; });
  }
  if (ds === 'recolectores') return recolectoresPeriodo(tbMetricas(r)).map(o => ({ nombre: o.n, grupo: 'Recolectores', gi: 0, kgh: o.kgh, kg: o.kg, horas: o.h, dias: o.dias, kgdia: o.kg / o.dias }));
  const m = tbMetricas(r); const porDia = new Map();
  m.regs.forEach(x => { const o = porDia.get(x.fecha) || { nombre: diaSemana(x.fecha) + ' ' + fechaCorta(x.fecha), grupo: 'Días', gi: 0, kg: 0, horas: 0, p: new Set() }; o.kg += n0(x.kg); o.horas += n0(x.horas); o.p.add(x.trabajadorId || x.recolector); porDia.set(x.fecha, o); });
  return [...porDia.values()].map(o => Object.assign(o, { personas: o.p.size, kgh: o.horas ? o.kg / o.horas : undefined }));
}
function regresion(pts) {
  const n = pts.length; if (n < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0; pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  if (!sxx || !syy) return null; const b = sxy / sxx; return { b, a: my - b * mx, r: sxy / Math.sqrt(sxx * syy), n };
}
function lecturaR(rg, nx, ny) {
  if (!rg) return 'Se necesitan al menos 3 puntos con ambos datos y con variación para calcular la relación.';
  const ar = Math.abs(rg.r); const fuerza = ar >= 0.7 ? 'fuerte' : ar >= 0.4 ? 'moderada' : ar >= 0.2 ? 'débil' : 'prácticamente nula';
  const sentido = rg.r > 0 ? 'cuando sube ' + nx.toLowerCase() + ', tiende a subir ' + ny.toLowerCase() : 'cuando sube ' + nx.toLowerCase() + ', tiende a bajar ' + ny.toLowerCase();
  return `Relación <b>${fuerza}</b> (r = ${num(redondear(rg.r, 2))}, R² = ${num(redondear(rg.r * rg.r * 100, 0))}%, ${rg.n} puntos)${ar >= 0.2 ? ': ' + sentido + '.' : '.'} ${ar >= 0.2 ? 'Por cada unidad adicional de ' + nx.toLowerCase() + ', ' + ny.toLowerCase() + ' cambia en promedio ' + num(redondear(rg.b, 2)) + '.' : ''} ${rg.n < 10 ? 'Con pocos puntos, tómelo como una pista y no como una conclusión.' : ''} Una relación no prueba que una cosa cause la otra.`;
}
function renderDispersion() {
  const host = document.getElementById('tb-disp'); if (!host) return;
  const st = tbSt.disp; const D = DS_DISP[st.ds]; if (!D.vars[st.x]) st.x = DISP_DEF[st.ds][0]; if (!D.vars[st.y]) st.y = DISP_DEF[st.ds][1];
  document.getElementById('tb-disp-ctl').innerHTML = `<label class="f">Analizar<select onchange="tbSt.disp.ds=this.value;tbSt.disp.x=DISP_DEF[this.value][0];tbSt.disp.y=DISP_DEF[this.value][1];renderDispersion()">${Object.entries(DS_DISP).map(([k, v]) => `<option value="${k}" ${k===st.ds?'selected':''}>${v.t}</option>`).join('')}</select></label>
    <label class="f">Eje horizontal<select onchange="tbSt.disp.x=this.value;renderDispersion()">${Object.entries(D.vars).map(([k, v]) => `<option value="${k}" ${k===st.x?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="f">Eje vertical<select onchange="tbSt.disp.y=this.value;renderDispersion()">${Object.entries(D.vars).map(([k, v]) => `<option value="${k}" ${k===st.y?'selected':''}>${v}</option>`).join('')}</select></label>`;
  const raw = puntosDispersion(st.ds); const pts = raw.filter(o => o[st.x] != null && o[st.y] != null && isFinite(o[st.x]) && isFinite(o[st.y])).map(o => ({ x: o[st.x], y: o[st.y], o }));
  const rg = regresion(pts);
  document.getElementById('tb-disp-lect').innerHTML = lecturaR(rg, D.vars[st.x].replace(/ \(.*\)$/, ''), D.vars[st.y].replace(/ \(.*\)$/, ''));
  if (!pts.length) { host.innerHTML = `<div class="empty">No hay ${D.t.toLowerCase()} con datos de ambas variables. ${st.ds === 'plantas' ? 'Muestree las mismas plantas para las dos variables (use el mismo plan de muestreo).' : ''}</div>`; document.getElementById('tb-disp-leg').innerHTML = ''; return; }
  const W = Math.max(300, Math.round(host.clientWidth || 760)), H = W < 500 ? 280 : 340, pl = 56, pr = 14, pt = 14, pb = 44, cw = W - pl - pr, ch = H - pt - pb;
  const ext = vs => { let a = Math.min(...vs), b = Math.max(...vs); if (a === b) { a -= 1; b += 1; } const pad = (b - a) * 0.08; return [a - pad, b + pad]; };
  const [x0, x1] = ext(pts.map(p => p.x)), [y0, y1] = ext(pts.map(p => p.y));
  const X = v => pl + (v - x0) / (x1 - x0) * cw, Y = v => pt + ch - (v - y0) / (y1 - y0) * ch;
  const ticks = (a, b) => { const st_ = [1, 2, 2.5, 5, 10].map(f => f * Math.pow(10, Math.floor(Math.log10((b - a) || 1)))).find(t => (b - a) / t <= 5) || (b - a); const out = []; for (let v = Math.ceil(a / st_) * st_; v <= b + 1e-9; v += st_) out.push(v); return out; };
  let s = '';
  ticks(y0, y1).forEach(v => { s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--grid)"/><text x="${pl - 8}" y="${Y(v) + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtCorto(v)}</text>`; });
  ticks(x0, x1).forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${pt}" y2="${pt + ch}" style="stroke:var(--grid)"/><text x="${X(v)}" y="${pt + ch + 16}" text-anchor="middle" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtCorto(v)}</text>`; });
  s += `<text x="${pl + cw / 2}" y="${H - 6}" text-anchor="middle" style="fill:var(--text-soft)" font-size="11.5" font-weight="600" font-family="Figtree, system-ui, sans-serif">${esc(D.vars[st.x])}</text><text transform="translate(13 ${pt + ch / 2}) rotate(-90)" text-anchor="middle" style="fill:var(--text-soft)" font-size="11.5" font-weight="600" font-family="Figtree, system-ui, sans-serif">${esc(D.vars[st.y])}</text>`;
  if (rg && Math.abs(rg.r) >= 0.2) { const xa = x0, xb = x1; s += `<line x1="${X(xa)}" y1="${Y(rg.a + rg.b * xa)}" x2="${X(xb)}" y2="${Y(rg.a + rg.b * xb)}" style="stroke:var(--text-soft)" stroke-width="1.6" stroke-dasharray="6 4" clip-path="url(#clipD)"/>`; }
  const grupos = [...new Set(pts.map(p => p.o.grupo))]; const multi = grupos.length > 1 && grupos.length <= 5;
  const etiquetar = pts.length <= 12;
  pts.forEach(p => { const col = multi ? SERIES[grupos.indexOf(p.o.grupo) % 5] : 'var(--c1)';
    s += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${pts.length > 80 ? 4 : 5.5}" style="fill:${col};fill-opacity:.82;stroke:var(--surface)" stroke-width="1.5" data-tip="${esc(p.o.nombre + (multi ? ' · ' + p.o.grupo : '') + ' — ' + D.vars[st.x] + ': ' + num(redondear(p.x, 2)) + ' · ' + D.vars[st.y] + ': ' + num(redondear(p.y, 2)))}"/>`;
    if (etiquetar) s += `<text x="${X(p.x) + 8}" y="${Y(p.y) + 4}" style="fill:var(--text-soft);stroke:var(--surface);paint-order:stroke" stroke-width="3" font-size="10.5" font-family="Figtree, system-ui, sans-serif">${esc(String(p.o.nombre).slice(0, 18))}</text>`; });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Diagrama de dispersión"><defs><clipPath id="clipD"><rect x="${pl}" y="${pt}" width="${cw}" height="${ch}"/></clipPath></defs>${s}</svg>`;
  document.getElementById('tb-disp-leg').innerHTML = (multi ? grupos.map((g, i) => `<span class="lg"><i style="background:${SERIES[i % 5]}"></i>${esc(g)}</span>`).join('') : '') + (rg && Math.abs(rg.r) >= 0.2 ? '<span class="lg"><i style="background:transparent;border-top:2px dashed var(--text-soft);border-radius:0;height:0;width:16px;"></i>Tendencia</span>' : '');
}

/* ---- Decisiones sugeridas ---- */
function decisionesSugeridas(m, cd) {
  const out = []; const ref = precioRefCarga().v; const MT = metas();
  const ls = lotesAlcance();
  const malos = ls.map(l => ({ l, c: ultimaCampana(l.id, 'Broca') })).filter(x => x.c && x.c.prom > cfgMapa().umbralBroca).sort((a, b) => b.c.prom - a.c.prom);
  if (malos.length) out.push({ sev:'danger', t:`Controlar broca en ${malos.map(x => x.l.nombre + ' (' + num(redondear(x.c.prom, 1)) + '%)').join(', ')}`, d:'Haga repase de frutos caídos y sobremaduros y evalúe control; el umbral es ' + num(cfgMapa().umbralBroca) + '%.', fn:"ir('planeacion');abrirNuevaOT()", cta:'Programar orden' });
  const { lotesP } = curvaMaduracion(); const conC = lotesP.filter(x => x.sem);
  if (conC.length) { const tot = Array.from({ length: 14 }, (_, k) => conC.reduce((a, x) => a + x.sem[k], 0)); const pk = tot.indexOf(Math.max(...tot)); const mm = tbMetricas(tbRango('ult30')); const kgJ = mm.jornadas ? mm.kg / mm.jornadas : 0;
    if (kgJ && tot[pk] > 0) out.push({ sev:'info', t:`Preparar ${num(Math.ceil(tot[pk] / kgJ / 6))} recolectores para la semana del ${fechaCorta(sumarDias(hoyLocal(), pk * 7))}`, d:'Es la semana con más cereza madura proyectada: ' + num(Math.round(tot[pk])) + ' kg.', fn:"irSeccionTb('sec-madur')", cta:'Ver curva' }); }
  const inv = inventario(); const ma = tbMetricas(tbRango('anio')); const costoProm = ma.cargas ? ma.costo / ma.cargas : 0;
  if (inv.disp >= 125 && ref && costoProm) {
    if (ref >= costoProm * 1.15) out.push({ sev:'good', t:`Hay ${num(redondear(inv.disp / 125, 1))} cargas en bodega y el precio cubre el costo con ${num(Math.round((ref / costoProm - 1) * 100))}% de margen`, d:'Vender ahora asegura ' + fmt((ref - costoProm) * inv.disp / 125) + ' de ganancia; compárelo con su lectura del mercado.', fn:"irSeccionTb('sec-caja')", cta:'Ver bodega' });
    else out.push({ sev:'warn', t:'El precio de referencia está cerca o por debajo del costo por carga', d:'Costo promedio ' + fmt(costoProm) + ' frente a ' + fmt(ref) + '. Negocie precio o revise costos antes de vender.', fn:"irSeccionTb('sec-rent')", cta:'Ver rentabilidad' });
  }
  const nutLotes = ls.map(l => { const c = ultimaCampana(l.id, 'Nutrición'); if (!c) return null; const def = c.regs.filter(rg => rg.opcion && rg.opcion !== 'Ninguna' && n0(rg.valor) >= 1); if (!def.length) return null; const top = groupSum(def, x => x.opcion, () => 1).sort((a, b) => b.value - a.value)[0]; return { l, top, pctv: top.value / c.regs.length * 100 }; }).filter(x => x && x.pctv >= 20).sort((a, b) => b.pctv - a.pctv);
  if (nutLotes.length) out.push({ sev:'warn', t:`Deficiencia de ${nutLotes[0].top.label.replace(/ \(.*\)/, '').toLowerCase()} en ${num(Math.round(nutLotes[0].pctv))}% de las plantas de ${nutLotes[0].l.nombre}`, d:'Confirme con análisis foliar y ajuste la próxima fertilización.', fn:"tbSt.salud='Nutrición';irSeccionTb('sec-salud');renderSalud()", cta:'Ver mapa' });
  const falt = ls.map(l => { const g = geomLote(l); const n = marcasPlanta.filter(mk => mk.loteId === l.id && mk.estado === 'Faltante').length; return g && n ? { l, n, p: n / g.total * 100 } : null; }).filter(x => x && x.p >= 3).sort((a, b) => b.p - a.p);
  if (falt.length) out.push({ sev:'warn', t:`Resembrar ${falt[0].n} plantas faltantes en ${falt[0].l.nombre} (${num(redondear(falt[0].p, 1))}%)`, d:'Cada planta faltante es producción perdida durante años.', fn:"tbSt.salud='faltantes';irSeccionTb('sec-salud');renderSalud()", cta:'Ver dónde' });
  if (m.costoCarga && m.costoCarga > MT.metaCostoCarga * 1.1) out.push({ sev:'warn', t:`El costo por carga (${fmt(m.costoCarga)}) supera la meta en ${num(Math.round((m.costoCarga / MT.metaCostoCarga - 1) * 100))}%`, d:'Revise en qué se va el dinero y la productividad de la recolección.', fn:"irSeccionTb('sec-prod')", cta:'Ver costos' });
  if (cd.items.length && cd.score < 85) { const peor = cd.items.slice().sort((a, b) => a.pctv - b.pctv)[0]; out.push({ sev:'info', t:'Mejorar los datos: ' + peor.t.toLowerCase() + ' (' + num(Math.round(peor.pctv)) + '%)', d:peor.ayuda, fn:peor.fn, cta:'Corregir' }); }
  const orden = { danger:0, warn:1, info:2, good:3 }; return out.sort((a, b) => orden[a.sev] - orden[b.sev]).slice(0, 5);
}
