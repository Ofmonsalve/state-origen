/* ================= TABLERO v19: centro de mando, maqueta viva, pulso del negocio, clima, suelo y finanzas ================= */
tbSt.capaMaq = tbSt.capaMaq || 'Sanidad general';
function colorCalor(t, sentido) {   // verde → ámbar → rojo (al revés si más es mejor), sigue el tema
  t = Math.max(0, Math.min(1, t)); if (sentido === 'bueno') t = 1 - t;
  return t < 0.5 ? `color-mix(in oklab, var(--warn) ${Math.round(t / 0.5 * 100)}%, var(--good))` : `color-mix(in oklab, var(--danger) ${Math.round((t - 0.5) / 0.5 * 100)}%, var(--warn))`;
}
function dominioVar(v, celdasTodas) {
  const def = VARS_SALUD.find(x => x[0] === v); if (def && def[3]) return def[3];
  if (v === 'Broca') return [0, 2 * cfgMapa().umbralBroca];
  if (v === 'Roya') return [0, 2 * cfgMapa().umbralRoya];
  const vals = (celdasTodas || []).filter(x => x != null && isFinite(x)); if (!vals.length) return [0, 1];
  const mn = Math.min(...vals), mx = Math.max(...vals); return mn === mx ? [mn * 0.9, mx * 1.1 || 1] : [mn, mx];
}
/* Mapa de calor de un lote con su forma real (SVG) */
function svgCalorForma(l, def, dom, W) {
  const g = geomLote(l); if (!g) return null; const s = superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : def[0], null);
  if (s.sinDatos) return { sinDatos: true, s };
  const b = g.caja; const w = b.x1 - b.x0, h = b.y1 - b.y0; W = W || 240; const k = W / w; const H = Math.min(260, h * k); const k2 = Math.min(k, H / h); const ox = (W - w * k2) / 2, oy = (H - h * k2) / 2;
  const X = x => (ox + (x - b.x0) * k2).toFixed(1), Y = y => (oy + (b.y1 - y) * k2).toFixed(1);
  const id = 'hc' + l.id.replace(/\W/g, '') + def[0].replace(/\W/g, '');
  const poly = g.poly.map(p => X(p[0]) + ',' + Y(p[1])).join(' ');
  let rects = ''; const cs = s.c * k2 + 0.5; const span = (dom[1] - dom[0]) || 1;
  for (let iy = 0; iy < s.ny; iy++) for (let ix = 0; ix < s.nx; ix++) { const v = s.vals[iy * s.nx + ix]; const x = b.x0 + ix * s.c, y = b.y0 + (iy + 1) * s.c; rects += `<rect x="${X(x)}" y="${Y(y)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" style="fill:${colorCalor((v - dom[0]) / span, def[2])}"/>`; }
  const pts = s.pts.map(p => def[0] === 'faltantes' ? `<path d="M${(+X(p.x) - 2.5).toFixed(1)},${(+Y(p.y) - 2.5).toFixed(1)} l5,5 m0,-5 l-5,5" style="stroke:var(--text)" stroke-width="1.3" data-tip="${esc(p.cod)} · faltante"/>`
    : `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.4" style="fill:var(--surface);stroke:var(--text)" stroke-width="1" data-tip="${esc(p.cod)}: ${num(redondear(p.v, 1))}${def[4]}${p.op && p.op !== 'Ninguna' ? ' · ' + esc(p.op) : ''} (medido)"/>`).join('');
  const tipZona = `${esc(l.nombre)} · promedio ${num(redondear(s.prom, 1))}${def[4]}`;
  return { s, svg: `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" width="100%" style="display:block;max-width:${W}px;margin:0 auto" role="img" aria-label="Mapa de calor de ${esc(l.nombre)}"><defs><clipPath id="${id}"><polygon points="${poly}"/></clipPath></defs><g clip-path="url(#${id})" data-tip="${tipZona}" shape-rendering="crispEdges">${rects}</g><polygon points="${poly}" style="fill:none;stroke:var(--text)" stroke-width="1.3" stroke-linejoin="round" ${g.esquematico ? 'stroke-dasharray="5 3"' : ''}/>${pts}</svg>` };
}
function renderSalud() {
  const host = document.getElementById('tb-salud'); if (!host) return;
  const def = VARS_SALUD.find(x => x[0] === tbSt.salud) || VARS_SALUD[0];
  document.getElementById('tb-salud-vars').innerHTML = VARS_SALUD.map(v => `<button role="tab" aria-selected="${tbSt.salud === v[0]}" class="${tbSt.salud === v[0] ? 'on' : ''}" onclick="tbSt.salud='${v[0]}';renderSalud()">${v[1]}</button>`).join('');
  const ls = lotesAlcance(); const sups = ls.map(l => { const g = geomLote(l); return g ? superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : def[0]) : null; });
  const dom = dominioVar(def[0], sups.flatMap(s => s && s.celdas ? s.celdas.map(c => c.v) : []));
  const u = def[0] === 'Broca' ? cfgMapa().umbralBroca : def[0] === 'Roya' ? cfgMapa().umbralRoya : def[0] === 'Sanidad general' ? 3 : def[0] === 'Nutrición' ? 1.5 : def[0] === 'faltantes' ? 5 : null;
  host.innerHTML = ls.length ? ls.map((l, i) => { const g = geomLote(l); let cuerpo, pie = '';
    if (!g) cuerpo = `<div class="hm-vacio">Sin diseño de siembra.<br><button class="link" onclick="ir('mapa');abrirLoteEnMapa('${l.id}');abrirDisenoLote()">Definir diseño</button></div>`;
    else { const r = svgCalorForma(l, def, dom, 240);
      if (r.sinDatos) cuerpo = `<div class="hm-vacio">Sin muestreo de ${esc(def[1].toLowerCase())}.<br><button class="link" onclick="ir('mapa');abrirLoteEnMapa('${l.id}');abrirPlanMuestreo()">Planear muestreo</button></div>`;
      else { cuerpo = r.svg; const s = r.s; const sobre = u != null ? s.celdas.filter(c => c.v > u).length / (s.celdas.length || 1) * 100 : null;
        pie = `<div class="hm-pie"><span>${def[0] === 'faltantes' ? s.faltantes + ' faltantes · ' + num(redondear(s.prom, 1)) + '%' : 'Promedio ' + num(redondear(s.prom, 1)) + def[4] + ' · ' + s.n + ' plantas'}</span>${sobre != null ? `<span class="${sobre > 25 ? 'neg' : ''}">${num(Math.round(sobre))}% del área sobre ${num(u)}${def[4]}</span>` : (s.campana ? `<span>${fechaCorta(s.campana.fecha)}</span>` : '')}</div>`; } }
    return `<div class="hm-card" onclick="ir('mapa');abrirLoteEnMapa('${l.id}');mapaCapa('${def[0] === 'faltantes' ? 'faltantes' : def[0]}')" title="Abrir en la maqueta del lote"><div class="hm-t"><b>${esc(l.nombre)}</b><span>${g ? num(redondear(g.ha, 2)) + ' ha · ' + num(Math.round(g.zmin)) + '–' + num(Math.round(g.zmax)) + ' m' : ''}</span></div>${cuerpo}${pie}</div>`; }).join('') : '<div class="empty">Sin lotes activos.</div>';
  const stops = [0, 0.25, 0.5, 0.75, 1].map(t => colorCalor(t, def[2])).join(', ');
  document.getElementById('tb-salud-leg').innerHTML = `<span class="hm-esc"><span>${num(redondear(dom[0], 1))}${def[4]}</span><i style="background:linear-gradient(90deg, ${stops})"></i><span>${num(redondear(dom[1], 1))}${def[4]}${def[3] ? '' : ' o más'}</span></span><span class="lg"><i style="background:var(--surface);border:1.5px solid var(--text);"></i>Planta medida</span><span class="nota">Cada lote con su forma real, norte arriba · entre plantas medidas el valor se estima por cercanía</span>`;
  // Deficiencias nutricionales (igual que v18)
  const nut = []; ls.forEach(l => { const c = ultimaCampana(l.id, 'Nutrición'); if (c) c.regs.forEach(rg => nut.push({ l, op: rg.opcion || 'Ninguna', v: n0(rg.valor) })); });
  const conDef = nut.filter(x => x.op !== 'Ninguna' && x.v >= 1); const porEl = groupSum(conDef, x => x.op, () => 1).sort((a, b) => b.value - a.value);
  document.getElementById('tb-nutri').innerHTML = nut.length ? `<div class="tb-big">${num(Math.round(conDef.length / nut.length * 100))}%</div><div class="hint" style="margin:2px 0 12px;">de ${nut.length} plantas evaluadas muestra alguna deficiencia</div>
    <div class="rk">${porEl.map(x => { const lotesEl = [...new Set(conDef.filter(y => y.op === x.label).map(y => y.l.nombre))]; return `<div class="rk-r rk-wide" data-tip="${esc(x.label)}: ${x.value} planta(s) en ${esc(lotesEl.join(', '))}"><span class="rk-n">${esc(x.label)}</span><span class="rk-b"><i style="width:${x.value / nut.length * 100}%;background:var(--danger)"></i></span><span class="rk-v">${num(Math.round(x.value / nut.length * 100))}%</span></div>`; }).join('') || '<p class="hint">Sin deficiencias visibles.</p>'}</div>
    <p class="hint" style="margin:10px 0 0;">Compárelo con el análisis de suelo de cada lote en <button class="link" onclick="ir('suelo')">Suelo y clima</button> antes de cambiar el plan de fertilización.</p>`
    : '<div class="empty">Registre un muestreo de nutrición en la maqueta del lote para ver las deficiencias por nutriente.</div>';
}
/* ---- Maqueta viva en el centro de mando ---- */
const CAPAS_MAQ = [['Sanidad general', 'Sanidad'], ['Broca', 'Broca'], ['Roya', 'Roya'], ['faltantes', 'Faltantes'], ['Maduración', 'Maduración'], ['estructura', 'Surcos']];
let _tbMaqV = null;
function tbMaqueta() {
  const host = document.getElementById('tb-maq'); if (!host) return; const fid = tbSt.finca !== 'todas' ? tbSt.finca : (fincasActivas()[0] || {}).id;
  document.getElementById('tb-maq-capas').innerHTML = CAPAS_MAQ.map(([k, t]) => `<button class="${tbSt.capaMaq === k ? 'on' : ''}" onclick="tbSt.capaMaq='${k}';tbMaqueta()">${t}</button>`).join('');
  if (!fid || !lotesDeFinca(fid).length) { host.innerHTML = '<div class="empty">Cree la finca y sus lotes para ver la maqueta.</div>'; return; }
  let cv = host.querySelector('canvas'); if (!cv) { host.innerHTML = '<canvas aria-label="Maqueta de la finca con el estado de los lotes"></canvas>'; cv = host.querySelector('canvas');
    cv.addEventListener('click', e => { if (!_tbMaqV) return; const r = cv.getBoundingClientRect(); const [x, y] = _tbMaqV.aMundo(e.clientX - r.left, e.clientY - r.top); const dist = distribucionFinca(fid); const l = dist.lotes.find(o => dentroPol(x, y, dist.polys.get(o.id).poly)); if (l) { ir('mapa'); abrirLoteEnMapa(l.id); if (tbSt.capaMaq !== 'estructura') mapaCapa(tbSt.capaMaq); } });
    cv.addEventListener('mousemove', e => { if (!_tbMaqV) return; const r = cv.getBoundingClientRect(); const [x, y] = _tbMaqV.aMundo(e.clientX - r.left, e.clientY - r.top); const dist = distribucionFinca(fid); cv.style.cursor = dist.lotes.some(o => dentroPol(x, y, dist.polys.get(o.id).poly)) ? 'pointer' : ''; }); }
  const W = Math.max(260, host.clientWidth || 480), H = Math.round(Math.max(300, Math.min(420, W * 0.78))); const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = '100%'; cv.style.height = H + 'px';
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const capa = tbSt.capaMaq === 'estructura' ? 'estructura' : tbSt.capaMaq; const r = dibujarFinca(ctx, W, H, fid, paletaMaqueta(), { zoom: 1, panX: 0, panY: 0 }, { capa, margen: 18 }); _tbMaqV = r.V;
  const def = defCapa(capa); const leg = document.getElementById('tb-maq-leg');
  if (leg) leg.innerHTML = def ? `<span class="hm-esc"><span>${num(redondear(r.dom[0], 1))}${esc(def[4])}</span><i style="background:linear-gradient(90deg, ${[0, 0.5, 1].map(t => colorCalor(t, def[2])).join(',')})"></i><span>${num(redondear(r.dom[1], 1))}${esc(def[4])}</span></span><span class="nota">${esc(def[1])} · toque un lote para abrirlo</span>` : '<span class="nota">Surcos trazados en curvas de nivel sobre el relieve · toque un lote para abrirlo</span>';
}
/* ---- Pulso del negocio ---- */
function tbPulso() {
  const host = document.getElementById('tb-pulso'); if (!host) return; const fid = tbSt.finca !== 'todas' ? tbSt.finca : (fincasActivas()[0] || {}).id; const tarjetas = [];
  // Clima
  const rc = fid ? resumenClima(fid) : null;
  if (rc) { const ult = climaDe(fid).slice(-30); const mx = Math.max(1, ...ult.map(c => n0(c.lluvia)));
    tarjetas.push(`<button class="pz" onclick="scSt.tab='clima';ir('suelo')"><span class="pz-t"><svg><use href="#i-lluvia"/></svg>Clima y agua</span><span class="pz-v">${num(Math.round(rc.lluvia30))} <small>mm en 30 días</small></span><span class="pz-bars">${ult.map(c => `<i style="height:${Math.max(2, n0(c.lluvia) / mx * 100)}%"></i>`).join('')}</span><span class="pz-s">Humedad del suelo ${rc.humedad == null ? '—' : Math.round(rc.humedad) + ' %'} · ${rc.secos ? rc.secos + ' días sin lluvia' : 'llovió ayer'}</span></button>`); }
  else tarjetas.push(`<button class="pz" onclick="scSt.tab='clima';ir('suelo')"><span class="pz-t"><svg><use href="#i-lluvia"/></svg>Clima y agua</span><span class="pz-v">—</span><span class="pz-s">Registre la lluvia diaria para ver el balance hídrico y las floraciones probables</span></button>`);
  // Plan agronómico
  const an = Number(hoyLocal().slice(0, 4)), mes = Number(hoyLocal().slice(5, 7)); const acts = actividadesAnio(an, tbSt.finca !== 'todas' ? tbSt.finca : null).filter(a => grupoDe(a.tipo) !== 'cosecha');
  const hasta = acts.filter(a => fechaActividad(a) <= hoyLocal()); const hechas = hasta.filter(a => estadoActividad(a).e === 'Ejecutada').length; const delMes = acts.filter(a => a.mes === mes); const pendMes = delMes.filter(a => estadoActividad(a).e !== 'Ejecutada').length;
  tarjetas.push(`<button class="pz" onclick="agSt.vista='mensual';agSt.mes=${mes};agSt.anio=${an};ir('agronomia')"><span class="pz-t"><svg><use href="#i-calendario"/></svg>Plan agronómico</span><span class="pz-v">${hasta.length ? Math.round(hechas / hasta.length * 100) + ' <small>% cumplido</small>' : '—'}</span><span class="pz-prog"><i style="width:${hasta.length ? hechas / hasta.length * 100 : 0}%"></i></span><span class="pz-s">${acts.length ? pendMes + ' pendientes este mes · ' + hasta.filter(a => estadoActividad(a).e === 'Vencida').length + ' vencidas' : 'Genere el plan del año'}</span></button>`);
  // Finanzas
  try { const ini = an + '-01-01'; const er = estadoResultados(ini, hoyLocal()); const bg = balanceGeneral(hoyLocal()); const caja = bg.corr.filter(x => ['1105', '1110'].includes(x.cod)).reduce((s, x) => s + x.v, 0); const cx = cartera();
    tarjetas.push(`<button class="pz" onclick="finSt.tab='resumen';ir('finanzas')"><span class="pz-t"><svg><use href="#i-finanzas"/></svg>Finanzas ${an}</span><span class="pz-v ${er.antes < 0 ? 'neg' : ''}">${fmtCorto(er.antes)} <small>resultado contable</small></span><span class="pz-kv"><span>Caja y bancos</span><b>${fmtCorto(caja)}</b></span><span class="pz-kv"><span>Por cobrar · por pagar</span><b>${fmtCorto(cx.cxc.reduce((s, x) => s + x.saldo, 0))} · ${fmtCorto(cx.cxp.reduce((s, x) => s + x.saldo, 0))}</b></span></button>`); } catch (e) { dlog('✗ pulso finanzas: ' + e.message, 'err'); }
  // Comercial
  const bod = Math.max(0, beneficios.reduce((s, b) => s + n0(b.kgSalida), 0) - ventas.reduce((s, v) => s + n0(v.kg), 0)); const vAn = ventas.filter(v => String(v.fecha).slice(0, 4) === String(an)); const kg = vAn.reduce((s, v) => s + n0(v.kg), 0);
  tarjetas.push(`<button class="pz" onclick="coSt.tab='partidas';ir('comercial')"><span class="pz-t"><svg><use href="#i-venta"/></svg>Café y ventas</span><span class="pz-v">${num(redondear(bod / CARGA, 1))} <small>cargas en bodega</small></span><span class="pz-kv"><span>Vendido en ${an}</span><b>${num(redondear(kg / CARGA, 1))} cargas</b></span><span class="pz-kv"><span>Precio promedio</span><b>${kg ? fmtCorto(vAn.reduce((s, v) => s + n0(v.kg) * n0(v.precio), 0) / kg * CARGA) : '—'}</b></span></button>`);
  host.innerHTML = tarjetas.join('');
}
/* ---- Clima y suelo ---- */
function tbClimaSuelo() {
  const host = document.getElementById('tb-clima'); if (!host) return; const fid = tbSt.finca !== 'todas' ? tbSt.finca : (fincasActivas()[0] || {}).id; const rc = fid ? resumenClima(fid) : null;
  if (!rc) host.innerHTML = '<div class="empty">Sin registros de clima.</div>';
  else { const bal = balanceHidrico(fid, sumarDias(rc.hoyS, -89)); const fl = floracionesProbables(fid)[0];
    host.innerHTML = `${gLeyenda([{ color: 'var(--c1)', txt: 'Lluvia diaria (mm)' }, { color: 'var(--c3)', txt: 'Agua en el suelo (%)', linea: true }])}${gCombo({ cats: bal.map(b => fechaCorta(b.fecha)), series: [{ nombre: 'Lluvia', vals: bal.map(b => b.lluvia == null ? null : redondear(b.lluvia, 1)), color: 'var(--c1)', fmtTip: v => num(v) + ' mm' }, { nombre: 'Agua en el suelo', tipo: 'area', eje: 'der', puntos: false, vals: bal.map(b => Math.round(b.pct)), color: 'var(--c3)', fmtTip: v => v + ' %' }], fmt: v => num(v), fmt2: v => v + '%', alto: 210, etiquetaCada: 15, titulo: 'Lluvia y agua en el suelo' })}
      <div class="tb-mini-kv"><div><span>Lluvia 30 días</span><b>${num(Math.round(rc.lluvia30))} mm${rc.normal30 ? ' · ' + (rc.lluvia30 >= rc.normal30 ? '+' : '') + Math.round((rc.lluvia30 / rc.normal30 - 1) * 100) + ' %' : ''}</b></div><div><span>Temperatura media</span><b>${rc.tmed == null ? '—' : num(redondear(rc.tmed, 1)) + ' °C'}</b></div><div><span>Última floración probable</span><b>${fl ? fechaCorta(fl.flor) + ' · cosecha ' + fechaCorta(fl.cosecha) : '—'}</b></div></div>`; }
  const hs = document.getElementById('tb-suelo'); if (!hs) return;
  const ls = lotesAlcance(); hs.innerHTML = ls.map(l => { const a = ultimoAnalisis(l.id); if (!a) return `<div class="ts-r"><b>${esc(l.nombre)}</b><span class="hint" style="margin:0">sin análisis</span></div>`; const ph = nivelSuelo('pH', a.pH); const lim = SUELO_VARS.map(v => [v, nivelSuelo(v[0], a[v[0]])]).filter(([v, nv]) => nv && nv.t === 'mal');
    return `<button class="ts-r" onclick="scSt.tab='suelo';scSt.analisisId='${a.id}';ir('suelo')"><b>${esc(l.nombre)}</b><span class="ts-ph">pH ${num(a.pH)}</span><span class="ts-ch">${lim.length ? lim.slice(0, 3).map(([v, nv]) => `<i class="chip-mal">${esc(v[1])} ${esc(nv.n.toLowerCase())}</i>`).join('') : '<i class="chip-ok">sin limitantes</i>'}</span></button>`; }).join('') || '<div class="empty">Sin lotes.</div>';
}
/* ---- Finanzas en el tablero ---- */
function tbFinanzas() {
  const h1 = document.getElementById('tb-fin-casc'), h2 = document.getElementById('tb-fin-pres'); if (!h1) return; const an = hoyLocal().slice(0, 4);
  try { const er = estadoResultados(an + '-01-01', hoyLocal());
    h1.innerHTML = gCascada([{ t: 'Ventas netas', v: er.ingresos, total: true }, { t: 'Costo del café vendido', v: -er.costo }, { t: 'Utilidad bruta', v: er.bruta, total: true }, { t: 'Gastos de administración', v: -(er.adm + er.vent) }, { t: 'Otros ingresos', v: er.otrosIng }, { t: 'Gastos financieros', v: -er.fin }, { t: 'Resultado del año', v: er.antes, total: true }], 230);
    const P = presupuestos[an]; const mesHoy = Number(hoyLocal().slice(5, 7)); const R = realPorGrupo(an); const suma = (a, n) => (a || []).slice(0, n).reduce((s, v) => s + n0(v), 0);
    if (!P) { h2.innerHTML = '<div class="empty">Sin presupuesto del año.<br><button class="btn ghost small" style="margin-top:10px" onclick="finSt.tab=\'presupuesto\';ir(\'finanzas\')">Crear presupuesto</button></div>'; return; }
    const fila = (t, keys, ing) => { const p = keys.reduce((s, k) => s + suma(P[k], mesHoy), 0), r = keys.reduce((s, k) => s + suma(R[k], mesHoy), 0); const d = p ? (r - p) / p * 100 : null; const ok = ing ? r >= p : r <= p;
      return `<div class="tp-r"><span>${t}</span><div class="tp-b"><i style="width:${Math.min(100, p ? r / p * 100 : 0)}%;background:${ok ? 'var(--good)' : 'var(--warn)'}"></i><em style="left:100%"></em></div><b class="mono">${fmtCorto(r)} <small>/ ${fmtCorto(p)}</small></b><span class="${ok ? 'pos' : 'neg'} mono">${d == null ? '—' : (d >= 0 ? '+' : '') + Math.round(d) + '%'}</span></div>`; };
    h2.innerHTML = `<p class="hint" style="margin:0 0 10px">Real frente a presupuesto, enero a ${MESES[mesHoy - 1]}</p>${fila('Ventas de café', ['ventas'], true)}${fila('Recolección', ['recoleccion'])}${fila('Labores e insumos', ['labores'])}${fila('Nómina', ['nomina'])}${fila('Administración y otros', ['indirectos', 'admin', 'financieros'])}<button class="link" style="margin-top:10px" onclick="finSt.tab='presupuesto';ir('finanzas')">Ver presupuesto completo</button>`;
  } catch (e) { h1.innerHTML = '<div class="empty">No se pudo calcular: ' + esc(e.message) + '</div>'; }
}
(function () {
  const r18 = renderTablero;
  window.renderTablero = function () { r18.apply(this, arguments); [tbPulso, tbClimaSuelo, tbFinanzas].forEach(fn => { try { fn(); } catch (e) { dlog('✗ ' + fn.name + ': ' + e.message, 'err'); } }); requestAnimationFrame(() => { try { tbMaqueta(); } catch (e) { dlog('✗ maqueta del tablero: ' + e.message, 'err'); } }); };
  window.addEventListener('resize', () => { if (vistaActual === 'tablero') { clearTimeout(window._tbMaqT); window._tbMaqT = setTimeout(() => { try { tbMaqueta(); } catch (e) {} }, 150); } });
})();
