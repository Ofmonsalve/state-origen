/* ================= TABLERO EJECUTIVO ================= */
let tbSt = { periodo:'ult30', finca:'todas', simPrecio:null, simTarifa:0 };
const TB_PERIODOS = [['ult30','Últimos 30 días'],['ult90','Últimos 90 días'],['mes','Este mes'],['anio','Este año'],['todo','Todo']];
const SERIES = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
const META_DEF = { precioCarga:0, metaKgHa:1500, metaCostoCarga:1300000, metaFactor:5.0, metaKgH:10 };
function metas() { return Object.assign({}, META_DEF, planConfig || {}); }
function precioRefCarga() {
  const c = n0(metas().precioCarga); if (c > 0) return { v:c, fuente:'referencia que usted registró' };
  const ult = ventas.filter(v => n0(v.precio) > 0).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
  if (ult) return { v:n0(ult.precio) * 125, fuente:'última venta (' + fechaCorta(ult.fecha) + ')' };
  return { v:0, fuente:'sin precio: regístrelo en Referencias y metas' };
}
function tbRango(p) {
  const h = hoyLocal();
  if (p === 'ult30') return { desde: sumarDias(h, -29), hasta: h };
  if (p === 'ult90') return { desde: sumarDias(h, -89), hasta: h };
  if (p === 'mes') return { desde: h.slice(0, 8) + '01', hasta: h };
  if (p === 'anio') return { desde: h.slice(0, 4) + '-01-01', hasta: h };
  const fechas = [].concat(registros.map(r => r.fecha), ventas.map(v => v.fecha), beneficios.map(b => b.fecha), labores.map(l => l.fecha)).filter(Boolean).sort();
  return { desde: fechas[0] && fechas[0] < h ? fechas[0] : sumarDias(h, -29), hasta: h };
}
function diasEntre(a, b) { return Math.round((parseFecha(b) - parseFecha(a)) / 864e5) + 1; }
function tbPrevio(r) { const n = diasEntre(r.desde, r.hasta); return { desde: sumarDias(r.desde, -n), hasta: sumarDias(r.desde, -1) }; }
const enRango = (f, r) => !!f && f >= r.desde && f <= r.hasta;
function tbFincaDeLote(loteId) { const l = lotes.find(x => x.id === loteId); return l ? l.fincaId : null; }
function tbDeFinca(obj, tipo) {
  if (tbSt.finca === 'todas') return true;
  const f = fincas.find(x => x.id === tbSt.finca); const nom = f ? f.nombre : '';
  if (tipo === 'registro') return obj.fincaId ? obj.fincaId === tbSt.finca : obj.finca === nom;
  if (tipo === 'lote') return tbFincaDeLote(obj.loteId) === tbSt.finca;
  if (tipo === 'venta') return obj.finca ? obj.finca === nom : (obj.loteId ? tbFincaDeLote(obj.loteId) === tbSt.finca : false);
  return true;
}
function lotesAlcance() { return lotesActivos().filter(l => tbSt.finca === 'todas' || l.fincaId === tbSt.finca); }
function tbMetricas(r, opt) {
  opt = opt || {};
  const dias = diasEntre(r.desde, r.hasta);
  const regs = registros.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'registro'));
  const ben = beneficios.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'lote'));
  const ven = ventas.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'venta'));
  const lab = labores.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'lote'));
  const ins = insumos.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'venta'));
  const kg = regs.reduce((a, x) => a + n0(x.kg), 0), horas = regs.reduce((a, x) => a + n0(x.horas), 0);
  const recoleccion = regs.reduce((a, x) => a + n0(x.kg) * (tarifaDe(x) + n0(opt.deltaTarifa)), 0);
  const labCosto = lab.reduce((a, x) => a + n0(x.costo), 0), insCosto = ins.reduce((a, x) => a + n0(x.costo), 0);
  const global = tbSt.finca === 'todas';
  const nomina = global ? empleados.reduce((a, e) => a + n0(e.salario), 0) * dias / 30 : 0;
  const deprec = global ? activos.reduce((a, x) => a + depreciacionAnual(x), 0) * dias / 365 : 0;
  const pergamino = ben.reduce((a, x) => a + n0(x.kgSalida), 0), cerezaBen = ben.reduce((a, x) => a + n0(x.kgEntrada), 0);
  const ingresos = ven.reduce((a, x) => a + n0(x.kg) * n0(x.precio), 0), kgVend = ven.reduce((a, x) => a + n0(x.kg), 0);
  const variable = recoleccion + labCosto + insCosto, fijo = nomina + deprec, costo = variable + fijo;
  const cargas = pergamino / 125;
  const ref = opt.precioCarga != null ? opt.precioCarga : precioRefCarga().v;
  const inventarioNuevo = (pergamino - kgVend) * ref / 125;
  const ingresoEco = ingresos + inventarioNuevo;
  return { r, dias, regs, ben, ven, lab, ins, kg, horas, recoleccion, labCosto, insCosto, nomina, deprec, variable, fijo, costo, pergamino, cerezaBen, ingresos, kgVend, cargas,
    margen: ingresos - costo, resultadoEco: ingresoEco - costo, ingresoEco, inventarioNuevo, ref,
    kgh: horas ? kg / horas : 0, factor: pergamino ? cerezaBen / pergamino : 0, costoCarga: cargas ? costo / cargas : 0, varCarga: cargas ? variable / cargas : 0,
    precioCarga: kgVend ? ingresos / kgVend * 125 : 0, recolKg: kg ? recoleccion / kg : 0, jornadas: new Set(regs.map(x => (x.trabajadorId || x.recolector) + '|' + x.fecha)).size };
}
function tbSerie(r, fn) {
  const out = []; const n = diasEntre(r.desde, r.hasta); const paso = n <= 31 ? 3 : (n <= 120 ? 7 : 30); let ini = r.desde;
  while (ini <= r.hasta) { const fin = sumarDias(ini, paso - 1) > r.hasta ? r.hasta : sumarDias(ini, paso - 1); out.push(fn({ desde: ini, hasta: fin })); ini = sumarDias(fin, 1); }
  return out;
}
function delta(act, prev, mejorArriba) {
  if (!prev) return act ? '<span class="dl-n">nuevo frente al periodo anterior</span>' : '<span class="dl-n">sin datos del periodo anterior</span>';
  const d = (act - prev) / Math.abs(prev) * 100; if (!isFinite(d)) return '';
  const bueno = mejorArriba ? d >= 0 : d <= 0;
  return `<span class="dl ${Math.abs(d) < 0.5 ? '' : (bueno ? 'up' : 'down')}">${d >= 0 ? '▲' : '▼'} ${num(redondear(Math.abs(d), 1))}%</span> <span class="dl-n">vs periodo anterior</span>`;
}
function sparkline(vals, color) {
  const w = 120, h = 34, n = vals.length; if (n < 2 || !vals.some(v => v)) return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" y1="${h-2}" x2="${w}" y2="${h-2}" style="stroke:var(--grid)" stroke-width="1.5"/></svg>`;
  const mx = Math.max(...vals), mn = Math.min(0, ...vals); const x = i => i * (w - 4) / (n - 1) + 2, y = v => h - 3 - (v - mn) / ((mx - mn) || 1) * (h - 8);
  const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M2,${h-3} L${pts.join(' L')} L${(w-2)},${h-3} Z" style="fill:${color};fill-opacity:.12"/><polyline points="${pts.join(' ')}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(n-1)}" cy="${y(vals[n-1])}" r="3" style="fill:${color};stroke:var(--surface)" stroke-width="1.5"/></svg>`;
}
function fmtCorto(v) { const a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + ' mil M'; if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' M'; if (a >= 1e4) return Math.round(v / 1e3) + ' mil'; return num(Math.round(v)); }
const fmtPesoCorto = v => (v < 0 ? '-$' : '$') + fmtCorto(Math.abs(v));
function semaforo(valor, meta, mejorArriba, tolerancia) {
  if (!meta || !valor) return '';
  const r = mejorArriba ? valor / meta : meta / valor; const t = tolerancia || 0.9;
  return r >= 1 ? '<span class="pill cerrada">En meta</span>' : (r >= t ? '<span class="pill ejecucion">Cerca</span>' : '<span class="pill cancelada">Lejos</span>');
}
function edadAnios(f) { return f ? (parseFecha(hoyLocal()) - parseFecha(f)) / (365.25 * 864e5) : null; }

/* ---- Confiabilidad de los datos ---- */
function calidadDatos(m) {
  const items = [];
  const add = (t, ok, total, ayuda, fn) => { if (!total) return; items.push({ t, pctv: ok / total * 100, ok, total, ayuda, fn }); };
  add('Cosecha con horas registradas', m.regs.filter(x => n0(x.horas) > 0).length, m.regs.length, 'Sin horas no se mide la productividad por recolector.', "ir('panel')");
  add('Cosecha vinculada a un lote', m.regs.filter(x => x.loteId && lotes.some(l => l.id === x.loteId)).length, m.regs.length, 'Registros sin lote no entran a los indicadores por lote.', "ir('gestion');showSub('lotes')");
  const la = lotesAlcance(); add('Lotes con área registrada', la.filter(l => n0(l.hectareas) > 0).length, la.length, 'Sin área no hay kg por hectárea ni costo por hectárea.', "ir('gestion');showSub('lotes')");
  if (m.kg) items.push({ t:'Cereza recolectada que ya pasó por beneficio', pctv: Math.min(100, m.cerezaBen / m.kg * 100), ok: Math.round(m.cerezaBen), total: Math.round(m.kg), unidad:'kg', ayuda:'Sin beneficio no hay pergamino ni costo por carga confiable.', fn:"ir('operacion');showOp('beneficio')" });
  add('Ventas con precio', m.ven.filter(x => n0(x.precio) > 0).length, m.ven.length, 'Ventas sin precio subestiman los ingresos.', "ir('operacion')");
  add('Lotes con muestreo de broca en los últimos 45 días', la.filter(l => { const c = ultimaCampana(l.id, 'Broca'); return c && c.fecha >= sumarDias(hoyLocal(), -45); }).length, la.length, 'La broca cambia rápido en cosecha: muestree cada 30 a 45 días.', "ir('mapa')");
  const score = items.length ? items.reduce((a, i) => a + Math.min(100, i.pctv), 0) / items.length : 0;
  return { items, score, nivel: !items.length ? 'Sin datos' : (score >= 85 ? 'Alta' : (score >= 60 ? 'Media' : 'Baja')) };
}

/* ---- Render ---- */
function renderTablero() {
  const host = document.getElementById('view-tablero'); if (!host || !datosCargados) return;
  const r = tbRango(tbSt.periodo), rp = tbPrevio(r), m = tbMetricas(r), p = tbMetricas(rp);
  const ra = { desde: hoyLocal().slice(0, 4) + '-01-01', hasta: hoyLocal() }, ma = tbMetricas(ra);
  const ref = precioRefCarga(), MT = metas();
  const la = lotesAlcance(), ha = la.reduce((a, l) => a + n0(l.hectareas), 0);
  // Controles
  document.getElementById('tb-periodos').innerHTML = TB_PERIODOS.map(([k, t]) => `<button role="tab" aria-selected="${tbSt.periodo===k}" class="${tbSt.periodo===k?'on':''}" onclick="tbSt.periodo='${k}';renderTablero()">${t}</button>`).join('');
  const fs = document.getElementById('tb-finca');
  fs.innerHTML = '<option value="todas">Todas las fincas</option>' + fincas.filter(f => activo(f) || registros.some(x => x.fincaId === f.id)).map(f => `<option value="${f.id}">${esc(f.nombre)}${activo(f)?'':' (histórica)'}</option>`).join(''); fs.value = tbSt.finca;
  document.getElementById('tb-rango').textContent = fechaCorta(r.desde) + ' ' + parseFecha(r.desde).getUTCFullYear() + ' – ' + fechaCorta(r.hasta) + ' ' + parseFecha(r.hasta).getUTCFullYear() + ' · ' + m.dias + ' días';
  const cd = calidadDatos(m);
  document.getElementById('tb-conf').innerHTML = `<button class="conf conf-${cd.nivel === 'Alta' ? 'a' : (cd.nivel === 'Media' ? 'm' : 'b')}" onclick="document.getElementById('sec-datos').scrollIntoView({behavior:'smooth'})" title="Qué tan completos están los datos de este periodo">Confiabilidad ${cd.nivel.toLowerCase()}${cd.items.length ? ' · ' + num(Math.round(cd.score)) + '%' : ''}</button>`;

  // Lectura ejecutiva
  const frases = [];
  if (m.kg) frases.push(`Se recolectaron <b>${num(Math.round(m.kg))} kg de cereza</b>${p.kg ? ' (' + (m.kg >= p.kg ? '+' : '−') + num(redondear(Math.abs(m.kg / p.kg - 1) * 100, 0)) + '% frente al periodo anterior)' : ''} y salieron <b>${num(redondear(m.cargas, 1))} cargas de pergamino</b>.`);
  if (m.costoCarga && ref.v) frases.push(`Cada carga cuesta <b>${fmt(m.costoCarga)}</b> y el precio de referencia es <b>${fmt(ref.v)}</b>: ${ref.v > m.costoCarga ? 'cada carga deja <b>' + fmt(ref.v - m.costoCarga) + '</b>' : 'cada carga pierde <b>' + fmt(m.costoCarga - ref.v) + '</b>'}.`);
  else if (m.costo && !m.pergamino) frases.push(`Hay <b>${fmt(m.costo)}</b> en costos y aún no hay pergamino registrado en el periodo; registre el beneficio para conocer el costo por carga.`);
  const rec = recolectoresPeriodo(m);
  const lotesR = analisisLotes(m, ref.v);
  const peor = lotesR.filter(x => x.flags.length).sort((a, b) => b.flags.length - a.flags.length)[0];
  if (peor) frases.push(`Atención en <b>${esc(peor.l.nombre)}</b>: ${peor.flags.map(f => f.t.toLowerCase()).join(', ')}.`);
  const inv = inventario(); if (inv.disp > 0 && ref.v) frases.push(`En bodega hay <b>${num(redondear(inv.disp / 125, 1))} cargas</b> que valen <b>${fmt(inv.disp / 125 * ref.v)}</b> a precio de referencia.`);
  if (cd.nivel === 'Baja' || cd.nivel === 'Media') frases.push(`La confiabilidad de los datos es <b>${cd.nivel.toLowerCase()}</b>; revise la sección Calidad de los datos antes de decidir.`);
  document.getElementById('tb-lectura').innerHTML = frases.length ? frases.join(' ') : 'Aún no hay movimientos en este periodo. Registre cosecha, beneficio y ventas para ver aquí el resultado de la finca.';

  // Indicadores
  const sem = fn => tbSerie(r, fn);
  const kpis = [
    { l:'Cereza recolectada', v: num(Math.round(m.kg)) + ' <small>kg</small>', d: delta(m.kg, p.kg, true), s: sem(x => tbMetricas(x).kg), c:'var(--cereza)', sub: m.kgh ? num(redondear(m.kgh, 1)) + ' kg/h · ' + m.jornadas + ' jornadas' : 'Sin horas registradas' },
    { l:'Pergamino seco', v: num(redondear(m.cargas, 1)) + ' <small>cargas</small>', d: delta(m.pergamino, p.pergamino, true), s: sem(x => tbMetricas(x).pergamino), c:'var(--pergamino)', sub: num(Math.round(m.pergamino)) + ' kg' + (m.factor ? ' · factor ' + num(redondear(m.factor, 2)) : '') },
    { l:'Costo por carga', v: m.costoCarga ? fmtPesoCorto(m.costoCarga) : '—', d: delta(m.costoCarga, p.costoCarga, false), s: sem(x => tbMetricas(x).costoCarga), c:'var(--warn)', sub: 'Meta ' + fmt(MT.metaCostoCarga) + ' ' + semaforo(m.costoCarga, MT.metaCostoCarga, false) },
    { l:'Ingresos por ventas', v: fmtPesoCorto(m.ingresos), d: delta(m.ingresos, p.ingresos, true), s: sem(x => tbMetricas(x).ingresos), c:'var(--accent)', sub: m.precioCarga ? fmt(m.precioCarga) + ' promedio por carga' : 'Sin ventas en el periodo' },
    { l:'Resultado económico', v: fmtPesoCorto(m.resultadoEco), d: delta(m.resultadoEco, p.resultadoEco, true), s: sem(x => tbMetricas(x).resultadoEco), c: m.resultadoEco >= 0 ? 'var(--good)' : 'var(--danger)', sub: 'Ventas más pergamino nuevo en bodega, menos costos', neg: m.resultadoEco < 0 },
    { l:'Resultado por hectárea', v: ha ? fmtPesoCorto(m.resultadoEco / ha) : '—', d: '', s: sem(x => ha ? tbMetricas(x).resultadoEco / ha : 0), c:'var(--c1)', sub: ha ? num(redondear(ha, 2)) + ' ha en producción' : 'Registre el área de los lotes', neg: m.resultadoEco < 0 },
  ];
  document.getElementById('tb-kpis').innerHTML = kpis.map(k => `<div class="kpi"><div class="kpi-l">${k.l}</div><div class="kpi-v ${k.neg ? 'neg' : ''}">${k.v}</div><div class="kpi-d">${k.d}</div>${sparkline(k.s, k.c)}<div class="kpi-s">${k.sub}</div></div>`).join('');

  // 1. Rentabilidad: estado de resultados por carga y por hectárea
  const filaER = (t, v, cls, nota) => `<tr class="${cls || ''}"><td>${t}${nota ? '<br><span class="er-nota">' + nota + '</span>' : ''}</td><td class="num">${fmt(v)}</td><td class="num">${m.cargas ? fmt(v / m.cargas) : '—'}</td><td class="num">${ha ? fmt(v / ha) : '—'}</td></tr>`;
  document.getElementById('tb-er').innerHTML = `<thead><tr><th>Concepto</th><th class="num">Total</th><th class="num">Por carga</th><th class="num">Por hectárea</th></tr></thead><tbody>
    ${filaER('Ventas de pergamino', m.ingresos)}
    ${filaER('Pergamino nuevo en bodega', m.inventarioNuevo, '', ref.v ? 'valorado a ' + fmt(ref.v) + ' la carga (' + esc(ref.fuente) + ')' : 'sin precio de referencia')}
    ${filaER('Ingreso económico', m.ingresoEco, 'er-sub')}
    ${filaER('− Recolección', -m.recoleccion)}${filaER('− Labores', -m.labCosto)}${filaER('− Insumos', -m.insCosto)}
    ${filaER('Margen de contribución', m.ingresoEco - m.variable, 'er-sub', 'lo que queda para cubrir costos fijos')}
    ${filaER('− Nómina fija', -m.nomina)}${filaER('− Depreciación', -m.deprec)}
    ${filaER('Resultado económico', m.resultadoEco, 'er-tot')}</tbody>`;
  // Punto de equilibrio
  const contribCarga = ref.v - m.varCarga, equilibrio = contribCarga > 0 ? m.fijo / contribCarga : null, precioEq = m.costoCarga;
  document.getElementById('tb-eq').innerHTML = m.cargas ? `
    <div class="kv"><span>Precio de equilibrio por carga</span><b>${fmt(precioEq)}</b></div>
    <div class="kv"><span>Precio de referencia</span><b>${ref.v ? fmt(ref.v) : '—'}</b></div>
    <div class="kv"><span>Colchón frente al precio</span><b class="${ref.v - precioEq < 0 ? 'neg' : 'pos'}">${ref.v ? (ref.v >= precioEq ? '+' : '') + num(redondear((ref.v / precioEq - 1) * 100, 1)) + '%' : '—'}</b></div>
    <div class="kv"><span>Costo variable por carga</span><b>${fmt(m.varCarga)}</b></div>
    <div class="kv"><span>Cargas mínimas para cubrir fijos</span><b>${equilibrio != null ? num(redondear(equilibrio, 1)) + ' de ' + num(redondear(m.cargas, 1)) : '—'}</b></div>
    <p class="hint" style="margin:10px 0 0;">El precio de equilibrio es el costo total dividido por las cargas producidas. Si el precio del café baja de ese valor, la finca pierde dinero en este periodo.</p>`
    : '<div class="empty">Registre beneficio para calcular el punto de equilibrio.</div>';
  // Simulador
  if (tbSt.simPrecio == null) tbSt.simPrecio = ref.v || 2200000;
  pintarSimulador(r);

  // 2. Producción
  tbGraficaCosecha(r, m);
  const partes = [['Recolección', m.recoleccion], ['Labores', m.labCosto], ['Insumos', m.insCosto], ['Nómina fija', m.nomina], ['Depreciación', m.deprec]].filter(x => x[1] > 0);
  const totC = partes.reduce((a, x) => a + x[1], 0);
  document.getElementById('tb-costos').innerHTML = totC ? `<div class="tb-big">${fmt(totC)}</div><div class="hint" style="margin:2px 0 12px;">${num(redondear(m.variable / totC * 100, 0))}% variable · ${num(redondear(m.fijo / totC * 100, 0))}% fijo${m.recolKg ? ' · recolección a ' + fmt(m.recolKg) + ' por kg de cereza' : ''}</div>
    <div class="stack" role="img" aria-label="Composición del costo">${partes.map((x, i) => `<i style="flex:${x[1]};background:${SERIES[i]}" data-tip="${esc(x[0])}: ${fmt(x[1])} (${pct(x[1], totC)})"></i>`).join('')}</div>
    <div class="leg">${partes.map((x, i) => `<div class="leg-r"><span class="sw" style="background:${SERIES[i]}"></span><span class="leg-n">${x[0]}</span><span class="leg-v">${fmt(x[1])}</span><span class="leg-p">${pct(x[1], totC)}</span></div>`).join('')}</div>
    ${tbSt.finca !== 'todas' ? '<p class="hint" style="margin:10px 0 0;">La nómina fija y la depreciación se muestran solo con todas las fincas.</p>' : ''}` : '<div class="empty">Sin costos registrados en el periodo.</div>';
  // Conversión y calidad física
  const fa = ma.factor;
  document.getElementById('tb-conv').innerHTML = m.factor || fa ? `
    <div class="kv"><span>Factor del periodo (kg cereza por kg pergamino)</span><b>${m.factor ? num(redondear(m.factor, 2)) : '—'} ${semaforo(m.factor, MT.metaFactor, false, 0.95)}</b></div>
    <div class="kv"><span>Factor en lo corrido del año</span><b>${fa ? num(redondear(fa, 2)) : '—'}</b></div>
    <div class="kv"><span>Meta</span><b>${num(MT.metaFactor)}</b></div>
    ${porLoteFactor(r).map(x => `<div class="kv"><span>${esc(x.n)}</span><b>${num(redondear(x.f, 2))}</b></div>`).join('')}
    <p class="hint" style="margin:10px 0 0;">Un factor más alto significa que se necesita más cereza para cada kilo de pergamino: suele indicar cereza verde o sobremadura, flotes o pérdidas en el beneficio.</p>` : '<div class="empty">Registre beneficio (cereza que entra y pergamino que sale) para medir la conversión.</div>';

  // 3. Lotes
  const maxKgha = Math.max(1, ...lotesR.map(f => f.kghaAnio));
  const semf = (c, u) => !c ? '<span class="tb-na">—</span>' : `<span class="pill ${c.prom <= u ? 'cerrada' : (c.prom <= 2*u ? 'ejecucion' : 'cancelada')}">${num(redondear(c.prom, 1))}%</span>`;
  document.getElementById('tb-lotes').innerHTML = `<thead><tr><th>Lote</th><th class="num">Edad</th><th class="num">Área</th><th style="min-width:150px;">Pergamino por ha en el año</th><th class="num">Costo directo/ha</th><th class="num">Margen directo/ha</th><th>Broca</th><th>Roya</th><th>Lectura</th></tr></thead>
    <tbody>${lotesR.map(f => `<tr><td><b style="color:var(--text);font-weight:650;">${esc(f.l.nombre)}</b><br><span style="font-size:11.5px;color:var(--text-faint);">${esc(nombreVariedad(f.l.variedadId))}</span></td>
      <td class="num">${f.edad != null ? num(redondear(f.edad, 1)) + ' a' : '—'}</td><td class="num">${f.ha ? num(f.ha) + ' ha' : '—'}</td>
      <td>${f.ha ? `<div class="mbar"><i style="width:${f.kghaAnio / maxKgha * 100}%;background:${f.kghaAnio >= MT.metaKgHa ? 'var(--accent)' : 'var(--axis)'}"></i><b class="rk-avg" style="left:${Math.min(100, MT.metaKgHa / maxKgha * 100)}%;top:0;bottom:0;"></b><span>${num(Math.round(f.kghaAnio))} kg</span></div>` : '<span class="tb-na">Sin área</span>'}</td>
      <td class="num">${f.ha ? fmt(f.costoHa) : '—'}</td><td class="num ${f.margenHa < 0 ? 'neg' : ''}">${f.ha && ref.v ? fmt(f.margenHa) : '—'}</td>
      <td>${semf(f.br, cfgMapa().umbralBroca)}</td><td>${semf(f.ro, cfgMapa().umbralRoya)}</td>
      <td>${f.flags.map(x => `<span class="pill ${x.c}" title="${esc(x.d)}">${esc(x.t)}</span>`).join(' ') || '<span class="pill cerrada">Sin alertas</span>'}</td></tr>`).join('') || '<tr><td colspan="9" style="color:var(--text-faint);">Sin lotes para mostrar.</td></tr>'}</tbody>`;
  document.getElementById('tb-lotes-nota').innerHTML = `Pergamino por ha del año = pergamino del beneficio desde el 1 de enero, o cereza ÷ factor cuando falta beneficio. La línea marca la meta de ${num(MT.metaKgHa)} kg/ha. Margen directo = pergamino del periodo a precio de referencia menos recolección y labores del lote (sin costos fijos).`;

  // 4. Personas
  const prom = m.kgh, maxR = Math.max(1, ...rec.map(o => o.kgh));
  const kghs = rec.map(o => o.kgh); const cv = kghs.length > 1 ? Math.sqrt(kghs.reduce((a, v) => a + (v - prom) ** 2, 0) / kghs.length) / (prom || 1) * 100 : 0;
  document.getElementById('tb-rec').innerHTML = rec.length ? `<div class="rk">${rec.slice(0, 10).map(o => `<div class="rk-r" data-tip="${esc(o.n)}: ${num(redondear(o.kgh, 1))} kg/h · ${num(Math.round(o.kg))} kg · ${o.dias} día(s) · ${fmt(o.pago)}"><span class="rk-n">${esc(o.n)}</span><span class="rk-b"><i style="width:${o.kgh / maxR * 100}%;background:${o.kgh >= prom ? 'var(--accent)' : 'var(--axis)'}"></i><b class="rk-avg" style="left:${prom / maxR * 100}%"></b></span><span class="rk-v">${num(redondear(o.kgh, 1))}</span></div>`).join('')}</div>
    <p class="hint" style="margin:10px 0 0;">Kg por hora; la línea es el promedio (${num(redondear(prom, 1))} kg/h, meta ${num(MT.metaKgH)}). Variación entre personas: ${num(Math.round(cv))}%${cv > 25 ? ', alta: revise asignación de surcos o capacitación' : ''}.</p>` : '<div class="empty">Sin recolección con horas registradas en el periodo.</div>';
  const pendPago = porPagarRecolectores();
  document.getElementById('tb-mo').innerHTML = `
    <div class="kv"><span>Jornadas de recolección</span><b>${num(m.jornadas)}</b></div>
    <div class="kv"><span>Kg por jornada</span><b>${m.jornadas ? num(Math.round(m.kg / m.jornadas)) : '—'}</b></div>
    <div class="kv"><span>Recolectores distintos</span><b>${rec.length}</b></div>
    <div class="kv"><span>Costo de recolección por kg de cereza</span><b>${m.recolKg ? fmt(m.recolKg) : '—'}</b></div>
    <div class="kv"><span>Recolección por carga de pergamino</span><b>${m.cargas ? fmt(m.recoleccion / m.cargas) : '—'}</b></div>
    <div class="kv"><span>Pendiente por pagar a recolectores</span><b>${fmt(pendPago.neto)}</b></div>
    ${pendPago.adelantos ? `<div class="kv"><span>Adelantos por descontar</span><b>${fmt(pendPago.adelantos)}</b></div>` : ''}`;

  // 5. Caja
  tbGraficaCaja(r);
  const otsAb = ordenes.filter(o => !['Cerrada','Cancelada'].includes(o.estado) && (tbSt.finca === 'todas' || tbFincaDeLote(o.loteId) === tbSt.finca));
  const comprometido = otsAb.reduce((a, o) => a + n0(o.presupuesto && o.presupuesto.total), 0);
  const nomMes = tbSt.finca === 'todas' ? empleados.reduce((a, e) => a + n0(e.salario), 0) : 0;
  const totComp = pendPago.neto + comprometido + nomMes;
  document.getElementById('tb-compromisos').innerHTML = `<div class="tb-big">${fmt(totComp)}</div><div class="hint" style="margin:2px 0 12px;">Salidas de dinero que ya están comprometidas</div>
    <div class="kv"><span>Pago pendiente a recolectores</span><b>${fmt(pendPago.neto)}</b></div>
    <div class="kv"><span>Órdenes de trabajo abiertas (${otsAb.length})</span><b>${fmt(comprometido)}</b></div>
    <div class="kv"><span>Nómina fija del próximo mes</span><b>${fmt(nomMes)}</b></div>
    <div class="kv"><span>Pergamino en bodega a precio de referencia</span><b class="pos">${ref.v ? fmt(Math.max(0, inv.disp) / 125 * ref.v) : '—'}</b></div>
    <p class="hint" style="margin:10px 0 0;">${ref.v && inv.disp > 0 ? (inv.disp / 125 * ref.v >= totComp ? 'El café en bodega alcanza para cubrir estos compromisos.' : 'El café en bodega no alcanza para cubrir estos compromisos; faltan ' + fmt(totComp - inv.disp / 125 * ref.v) + '.') : 'Registre ventas y beneficio para comparar bodega contra compromisos.'}</p>`;
  // Venta del inventario
  const costoProm = ma.cargas ? ma.costo / ma.cargas : m.costoCarga;
  document.getElementById('tb-venta').innerHTML = inv.prod ? `<div class="tb-big ${inv.disp < 0 ? 'neg' : ''}">${num(redondear(inv.disp / 125, 1))} <small>cargas</small></div><div class="hint" style="margin:2px 0 12px;">${num(Math.round(inv.disp))} kg de pergamino en bodega</div>
    <div class="stack">${`<i style="flex:${Math.max(inv.vend, 0)};background:var(--axis)" data-tip="Vendido: ${num(Math.round(inv.vend))} kg"></i><i style="flex:${Math.max(inv.disp, 0)};background:var(--pergamino)" data-tip="En bodega: ${num(Math.round(inv.disp))} kg"></i>`}</div>
    <div class="kv" style="margin-top:12px;"><span>Costo promedio del año por carga</span><b>${costoProm ? fmt(costoProm) : '—'}</b></div>
    <div class="kv"><span>Precio de referencia</span><b>${ref.v ? fmt(ref.v) : '—'}</b></div>
    <div class="kv"><span>Ganancia estimada si se vende hoy</span><b class="${ref.v - costoProm < 0 ? 'neg' : 'pos'}">${ref.v && costoProm ? fmt((ref.v - costoProm) * Math.max(0, inv.disp) / 125) : '—'}</b></div>
    <div class="kv"><span>Días promedio en bodega</span><b>${inv.dias != null ? num(Math.round(inv.dias)) + ' días' : '—'}</b></div>
    <p class="hint" style="margin:10px 0 0;">Actualice el precio de referencia en Referencias y metas con el precio del día de la cooperativa o del comprador.</p>` : '<div class="empty">Sin beneficio registrado.</div>';

  // 6. Proyección
  tbProyeccion(r, m);
  // 7. Operación
  tbOperacion(r);
  // 8. Calidad de datos
  document.getElementById('tb-datos').innerHTML = cd.items.length ? `<div class="dq-head"><div class="tb-big">${num(Math.round(cd.score))}%</div><div class="hint" style="margin:0;">Confiabilidad ${cd.nivel.toLowerCase()} de las cifras de este periodo</div></div>
    ${cd.items.map(i => `<div class="dq-r"><div class="dq-t"><b>${i.t}</b><span>${i.unidad ? num(i.ok) + ' de ' + num(i.total) + ' ' + i.unidad : i.ok + ' de ' + i.total} · ${num(Math.round(i.pctv))}%</span></div><div class="dq-bar"><i style="width:${Math.min(100, i.pctv)}%;background:${i.pctv >= 85 ? 'var(--good)' : (i.pctv >= 60 ? 'var(--warn)' : 'var(--danger)')}"></i></div>${i.pctv < 85 ? `<div class="dq-a">${i.ayuda} <button class="link" onclick="${i.fn}">Corregir</button></div>` : ''}</div>`).join('')}`
    : '<div class="empty">No hay datos en este periodo para evaluar.</div>';
  // Metas
  document.getElementById('tb-metas-res').innerHTML = `Precio de referencia: <b>${ref.v ? fmt(ref.v) + '/carga' : 'sin definir'}</b> (${esc(ref.fuente)}) · Meta costo por carga: <b>${fmt(MT.metaCostoCarga)}</b> · Meta pergamino: <b>${num(MT.metaKgHa)} kg/ha/año</b> · Meta factor: <b>${num(MT.metaFactor)}</b> · Meta recolección: <b>${num(MT.metaKgH)} kg/h</b>`;
  tbTooltips();
}

function recolectoresPeriodo(m) {
  const porT = new Map(); m.regs.forEach(x => { const k = x.trabajadorId || x.recolector; const o = porT.get(k) || { n: x.recolector || '—', kg: 0, h: 0, pago: 0, d: new Set() }; o.kg += n0(x.kg); o.h += n0(x.horas); o.pago += n0(x.kg) * tarifaDe(x); o.d.add(x.fecha); porT.set(k, o); });
  return [...porT.values()].filter(o => o.h > 0).map(o => Object.assign(o, { kgh: o.kg / o.h, dias: o.d.size })).sort((a, b) => b.kgh - a.kgh);
}
function porPagarRecolectores() {
  let bruto = 0, adel = 0;
  trabajadores.forEach(t => { const up = ultimoPagoDe(t.id); bruto += registros.filter(r => r.trabajadorId === t.id && (!up || r.fecha > up.periodoFin) && tbDeFinca(r, 'registro')).reduce((a, r) => a + n0(r.kg) * tarifaDe(r), 0); adel += adelantosPendientesDe(t.id).reduce((a, x) => a + n0(x.valor), 0); });
  return { bruto, adelantos: adel, neto: bruto - adel };
}
function inventario() {
  const ben = beneficios.filter(x => tbDeFinca(x, 'lote')), ven = ventas.filter(x => tbDeFinca(x, 'venta'));
  const prod = ben.reduce((a, x) => a + n0(x.kgSalida), 0), vend = ven.reduce((a, x) => a + n0(x.kg), 0);
  // Antigüedad promedio (primero en entrar, primero en salir)
  let restante = vend; const capas = ben.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).map(b => ({ f:b.fecha, kg:n0(b.kgSalida) }));
  capas.forEach(c => { const q = Math.min(c.kg, restante); c.kg -= q; restante -= q; });
  const quedan = capas.filter(c => c.kg > 0); const tot = quedan.reduce((a, c) => a + c.kg, 0);
  const dias = tot ? quedan.reduce((a, c) => a + c.kg * (diasEntre(c.f, hoyLocal()) - 1), 0) / tot : null;
  return { prod, vend, disp: prod - vend, dias };
}
function porLoteFactor(r) {
  return lotes.map(l => { const b = beneficios.filter(x => x.loteId === l.id && enRango(x.fecha, r)); const s = b.reduce((a, x) => a + n0(x.kgSalida), 0); return { n:l.nombre, f: s ? b.reduce((a, x) => a + n0(x.kgEntrada), 0) / s : 0 }; }).filter(x => x.f).sort((a, b) => b.f - a.f).slice(0, 4);
}
function analisisLotes(m, refCarga) {
  const MT = metas(); const ra = { desde: hoyLocal().slice(0, 4) + '-01-01', hasta: hoyLocal() };
  const fa = tbMetricas(ra).factor || MT.metaFactor;
  const base = lotesAlcance().map(l => {
    const ha = n0(l.hectareas);
    const pergAnio = beneficios.filter(x => x.loteId === l.id && enRango(x.fecha, ra)).reduce((a, x) => a + n0(x.kgSalida), 0);
    const cerezaAnio = registros.filter(x => x.loteId === l.id && enRango(x.fecha, ra)).reduce((a, x) => a + n0(x.kg), 0);
    const pergEstAnio = pergAnio || cerezaAnio / fa;
    const pergPer = m.ben.filter(x => x.loteId === l.id).reduce((a, x) => a + n0(x.kgSalida), 0);
    const costo = m.regs.filter(x => x.loteId === l.id).reduce((a, x) => a + n0(x.kg) * tarifaDe(x), 0) + m.lab.filter(x => x.loteId === l.id).reduce((a, x) => a + n0(x.costo), 0);
    return { l, ha, edad: edadAnios(l.fechaSiembra), kghaAnio: ha ? pergEstAnio / ha : 0, costoHa: ha ? costo / ha : 0, margenHa: ha ? (pergPer * refCarga / 125 - costo) / ha : 0, br: ultimaCampana(l.id, 'Broca'), ro: ultimaCampana(l.id, 'Roya'), flags: [] };
  });
  const conHa = base.filter(x => x.ha && x.kghaAnio); const promKgha = conHa.length ? conHa.reduce((a, x) => a + x.kghaAnio, 0) / conHa.length : 0;
  base.forEach(x => {
    if (!x.ha) x.flags.push({ t:'Falta área', c:'programada', d:'Registre las hectáreas del lote.' });
    if (x.edad != null && x.edad >= 7 && promKgha && x.kghaAnio < promKgha * 0.75) x.flags.push({ t:'Evaluar renovación', c:'ejecucion', d:'Lote de ' + num(redondear(x.edad, 1)) + ' años con rendimiento 25% o más por debajo del promedio.' });
    if (x.br && x.br.prom > cfgMapa().umbralBroca) x.flags.push({ t:'Controlar broca', c:'cancelada', d:'Broca de ' + num(redondear(x.br.prom, 1)) + '% sobre el umbral.' });
    if (x.ro && x.ro.prom > cfgMapa().umbralRoya) x.flags.push({ t:'Controlar roya', c:'cancelada', d:'Roya de ' + num(redondear(x.ro.prom, 1)) + '% sobre el umbral.' });
    if (!x.br || x.br.fecha < sumarDias(hoyLocal(), -45)) x.flags.push({ t:'Muestrear broca', c:'programada', d:'Sin muestreo de broca en los últimos 45 días.' });
    if (x.ha && x.margenHa < 0 && refCarga) x.flags.push({ t:'Margen negativo', c:'cancelada', d:'Los costos directos superan el valor del pergamino del periodo.' });
    if (promKgha && x.kghaAnio >= promKgha * 1.2) x.flags.push({ t:'Alto rendimiento', c:'cerrada', d:'20% o más sobre el promedio de la finca.' });
  });
  return base.sort((a, b) => b.kghaAnio - a.kghaAnio);
}

/* ---- Simulador de precio y tarifa ---- */
function pintarSimulador(r) {
  const ref = precioRefCarga().v || 2200000, base = tbMetricas(r);
  const s = tbMetricas(r, { precioCarga: tbSt.simPrecio, deltaTarifa: tbSt.simTarifa });
  const ingresoSim = s.cargas * tbSt.simPrecio;
  const res = ingresoSim - s.costo, resBase = base.cargas * ref - base.costo;
  const host = document.getElementById('tb-sim'); if (!host) return;
  const sinCargas = !s.cargas;
  host.innerHTML = `
    <label class="f">Precio de la carga: <b class="tnum">${fmt(tbSt.simPrecio)}</b> <span class="hint" style="margin:0;font-weight:500;">(${tbSt.simPrecio >= ref ? '+' : ''}${num(redondear((tbSt.simPrecio / ref - 1) * 100, 0))}% vs referencia)</span>
      <input type="range" id="sim-precio" min="${Math.round(ref * 0.5 / 10000) * 10000}" max="${Math.round(ref * 1.5 / 10000) * 10000}" step="10000" value="${tbSt.simPrecio}" oninput="tbSt.simPrecio=+this.value;pintarSimulador(tbRango(tbSt.periodo))"></label>
    <label class="f" style="margin-top:12px;">Cambio en la tarifa de recolección: <b class="tnum">${tbSt.simTarifa >= 0 ? '+' : ''}${fmt(tbSt.simTarifa)} por kg</b>
      <input type="range" id="sim-tarifa" min="-200" max="400" step="10" value="${tbSt.simTarifa}" oninput="tbSt.simTarifa=+this.value;pintarSimulador(tbRango(tbSt.periodo))"></label>
    ${sinCargas ? '<div class="empty" style="margin-top:12px;">Registre beneficio para simular el resultado.</div>' : `
    <div class="budget-box" style="margin-top:14px;">
      <div><div class="n">${fmtPesoCorto(ingresoSim)}</div><div class="l">Ingreso de ${num(redondear(s.cargas, 1))} cargas</div></div>
      <div><div class="n">${fmtPesoCorto(s.costo)}</div><div class="l">Costo total</div></div>
      <div class="total"><div class="n ${res < 0 ? 'neg' : ''}">${fmtPesoCorto(res)}</div><div class="l">Resultado simulado</div></div>
      <div><div class="n ${res - resBase < 0 ? 'neg' : 'pos'}">${res - resBase >= 0 ? '+' : ''}${fmtPesoCorto(res - resBase)}</div><div class="l">Frente al escenario actual</div></div>
    </div>`}
    <div class="act-row" style="margin-top:10px;"><button class="btn ghost small" onclick="tbSt.simPrecio=null;tbSt.simTarifa=0;renderTablero()">Volver al escenario actual</button></div>`;
}

/* ---- Gráficas ---- */
function tbGraficaCosecha(r, m) {
  const host = document.getElementById('tb-cosecha'); const n = m.dias; const paso = n <= 45 ? 1 : (n <= 200 ? 7 : 30);
  const buckets = []; for (let ini = r.desde; ini <= r.hasta; ini = sumarDias(ini, paso)) buckets.push({ desde: ini, hasta: sumarDias(ini, paso - 1) > r.hasta ? r.hasta : sumarDias(ini, paso - 1) });
  const porLote = new Map(); m.regs.forEach(x => porLote.set(x.loteId || x.lote, (porLote.get(x.loteId || x.lote) || 0) + n0(x.kg)));
  const orden = [...porLote.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const top = orden.slice(0, 4), otros = orden.length > 4;
  const serieDe = k => top.includes(k) ? top.indexOf(k) : 4;
  const etiqueta = k => { const l = lotes.find(z => z.id === k); return l ? l.nombre : (k || '—'); };
  const datos = buckets.map(b => { const v = [0, 0, 0, 0, 0]; m.regs.forEach(x => { if (x.fecha >= b.desde && x.fecha <= b.hasta) v[serieDe(x.loteId || x.lote)] += n0(x.kg); }); return { b, v, t: v.reduce((a, c) => a + c, 0) }; });
  const nombres = top.map(etiqueta).concat(otros ? ['Otros lotes'] : []);
  document.getElementById('tb-cosecha-leg').innerHTML = nombres.length > 1 ? nombres.map((nm, i) => `<span class="lg"><i style="background:${SERIES[i]}"></i>${esc(nm)} · ${num(Math.round(i < 4 ? porLote.get(top[i]) : orden.slice(4).reduce((a, k) => a + porLote.get(k), 0)))} kg</span>`).join('') : '';
  if (!m.kg) { host.innerHTML = '<div class="empty" style="margin:10px 0;">Sin cosecha registrada en el periodo.<br><button class="link" onclick="openWizard()">Registrar cosecha</button></div>'; return; }
  const W = Math.max(300, Math.round(host.clientWidth || 760)), H = W < 500 ? 220 : 260, pl = 40, pr = 8, pt = 14, pb = 28, cw = W - pl - pr, ch = H - pt - pb;
  const mx = Math.max(...datos.map(d => d.t)); const tick = [1, 2, 2.5, 5, 10].map(f => f * Math.pow(10, Math.floor(Math.log10(mx || 1)))).find(t => mx / t <= 4) || mx; const top_ = Math.ceil(mx / tick) * tick || 1;
  const bw = cw / datos.length, barW = Math.max(2, Math.min(28, bw * 0.7));
  let g = ''; for (let v = 0; v <= top_ + 1e-9; v += tick) { const y = pt + ch - v / top_ * ch; g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" style="stroke:var(--grid)" stroke-width="1"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtCorto(v)}</text>`; }
  let bars = '', labels = ''; const cada = Math.ceil(datos.length / Math.max(4, Math.floor(W / 64)));
  datos.forEach((d, i) => { const x = pl + i * bw + (bw - barW) / 2; let y = pt + ch;
    const visibles = d.v.map((v, k) => [v, k]).filter(e => e[0] > 0);
    visibles.forEach(([v, k], j) => { const hgt = v / top_ * ch; y -= hgt; const ultimo = j === visibles.length - 1;
      bars += ultimo ? `<path d="M${x},${y + hgt} V${y + Math.min(4, hgt)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${y + hgt} Z" style="fill:${SERIES[k]}"/>` : `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(hgt - 1.5, 0.5)}" style="fill:${SERIES[k]}"/>`; });
    const etq = paso === 1 ? parseFecha(d.b.desde).getUTCDate() + (parseFecha(d.b.desde).getUTCDate() === 1 || i === 0 ? ' ' + MESES[parseFecha(d.b.desde).getUTCMonth()] : '') : fechaCorta(d.b.desde);
    if (i % cada === 0) labels += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" style="fill:var(--text-faint)" font-size="10.5" font-family="Figtree, system-ui, sans-serif">${etq}</text>`;
    const tip = (paso === 1 ? DIAS_LARGOS[(parseFecha(d.b.desde).getUTCDay() + 6) % 7] + ' ' + fechaCorta(d.b.desde) : fechaCorta(d.b.desde) + ' – ' + fechaCorta(d.b.hasta)) + ' · ' + num(Math.round(d.t)) + ' kg' + (d.t ? ' — ' + d.v.map((v, k) => v ? nombres[k] + ' ' + num(Math.round(v)) : '').filter(Boolean).join(', ') : '');
    bars += `<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc(tip)}"/>`; });
  const prom = m.kg / datos.length, yP = pt + ch - prom / top_ * ch;
  const promLine = `<line x1="${pl}" x2="${W - pr}" y1="${yP}" y2="${yP}" style="stroke:var(--text-soft)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${W - pr}" y="${yP - 5}" text-anchor="end" style="fill:var(--text-soft);stroke:var(--surface);paint-order:stroke" stroke-width="4" stroke-linejoin="round" font-size="10.5" font-family="Figtree, system-ui, sans-serif">promedio ${num(Math.round(prom))} kg por ${paso === 1 ? 'día' : (paso === 7 ? 'semana' : 'mes')}</text>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cereza recolectada por ${paso === 1 ? 'día' : 'semana'}">${g}${bars}${promLine}${labels}</svg>`;
}
function tbGraficaCaja(r) {
  const host = document.getElementById('tb-caja'); const n = diasEntre(r.desde, r.hasta); const paso = n <= 60 ? 7 : 30;
  const buckets = []; for (let ini = r.desde; ini <= r.hasta; ini = sumarDias(ini, paso)) buckets.push({ desde: ini, hasta: sumarDias(ini, paso - 1) > r.hasta ? r.hasta : sumarDias(ini, paso - 1) });
  const datos = buckets.map(b => { const mm = tbMetricas(b); return { b, ent: mm.ingresos, sal: mm.costo }; });
  let acum = 0; datos.forEach(d => { acum += d.ent - d.sal; d.acum = acum; });
  if (!datos.some(d => d.ent || d.sal)) { host.innerHTML = '<div class="empty">Sin ventas ni costos en el periodo.</div>'; return; }
  const W = Math.max(300, Math.round(host.clientWidth || 760)), H = W < 500 ? 230 : 260, pl = 54, pr = 8, pt = 16, pb = 28, cw = W - pl - pr, ch = H - pt - pb;
  const mx = Math.max(1, ...datos.map(d => Math.max(d.ent, Math.abs(d.acum)))), mn = Math.max(1, ...datos.map(d => Math.max(d.sal, -Math.min(0, d.acum))));
  const total = mx + mn, y0 = pt + mx / total * ch, esc_ = ch / total;
  const bw = cw / datos.length, barW = Math.max(4, Math.min(30, bw * 0.34));
  let s = `<line x1="${pl}" x2="${W - pr}" y1="${y0}" y2="${y0}" style="stroke:var(--axis)" stroke-width="1"/>`;
  [mx, -mn].forEach(v => { const y = y0 - v * esc_; s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" style="stroke:var(--grid)" stroke-width="1"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtPesoCorto(v)}</text>`; });
  s += `<text x="${pl - 8}" y="${y0 + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">0</text>`;
  const pts = []; const cada = Math.ceil(datos.length / Math.max(4, Math.floor(W / 70)));
  datos.forEach((d, i) => { const cx = pl + i * bw + bw / 2;
    const he = d.ent * esc_, hs = d.sal * esc_;
    if (he > 0) s += `<rect x="${cx - barW - 1}" y="${y0 - he}" width="${barW}" height="${he}" rx="3" style="fill:var(--good)"/>`;
    if (hs > 0) s += `<rect x="${cx + 1}" y="${y0}" width="${barW}" height="${hs}" rx="3" style="fill:var(--danger)"/>`;
    pts.push([cx, y0 - d.acum * esc_]);
    if (i % cada === 0) s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" style="fill:var(--text-faint)" font-size="10.5" font-family="Figtree, system-ui, sans-serif">${fechaCorta(d.b.desde)}</text>`;
    s += `<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc(fechaCorta(d.b.desde) + ' – ' + fechaCorta(d.b.hasta) + ' · entradas ' + fmt(d.ent) + ' · salidas ' + fmt(d.sal) + ' · saldo acumulado ' + fmt(d.acum))}"/>`; });
  s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" style="stroke:var(--text)" stroke-width="2" stroke-linejoin="round"/>` + pts.map((p, i) => i === pts.length - 1 ? `<circle cx="${p[0]}" cy="${p[1]}" r="4" style="fill:var(--text);stroke:var(--surface)" stroke-width="2"/>` : '').join('');
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Entradas, salidas y saldo acumulado">${s}</svg>`;
  document.getElementById('tb-caja-leg').innerHTML = `<span class="lg"><i style="background:var(--good)"></i>Entradas por ventas · ${fmt(datos.reduce((a, d) => a + d.ent, 0))}</span><span class="lg"><i style="background:var(--danger)"></i>Salidas y costos · ${fmt(datos.reduce((a, d) => a + d.sal, 0))}</span><span class="lg"><i style="background:var(--text);border-radius:2px;height:3px;"></i>Saldo acumulado · ${fmt(acum)}</span>`;
}
function tbProyeccion(r, m) {
  const MT = metas(); const ref = precioRefCarga().v;
  const filas = lotesAlcance().map(l => { const pr = proyeccionLote(l); const f = ultimaCampana(l.id, 'Floración');
    if (!pr || !pr.kgCereza) return { l, f, fc: f ? sumarDias(f.fecha, n0(cfgMapa().diasFloracion)) : null };
    const desde = pr.campana.fecha; const hecho = registros.filter(x => x.loteId === l.id && x.fecha >= desde).reduce((a, x) => a + n0(x.kg), 0);
    return { l, f, fc: f ? sumarDias(f.fecha, n0(cfgMapa().diasFloracion)) : null, proy: pr.kgCereza, hecho, falta: Math.max(0, pr.kgCereza - hecho), avance: Math.min(100, hecho / pr.kgCereza * 100), desde }; });
  const conP = filas.filter(x => x.proy);
  const falta = conP.reduce((a, x) => a + x.falta, 0), proyT = conP.reduce((a, x) => a + x.proy, 0), hechoT = conP.reduce((a, x) => a + x.hecho, 0);
  const kgJornada = m.jornadas ? m.kg / m.jornadas : 0;
  const factor = m.factor || MT.metaFactor;
  document.getElementById('tb-proy').innerHTML = conP.length ? `
    <div class="tb-ring">${anillo(proyT ? hechoT / proyT * 100 : 0)}<div><div class="tb-big">${num(Math.round(proyT ? hechoT / proyT * 100 : 0))}%</div><div class="hint" style="margin:0;">de la cosecha proyectada ya recolectada en ${conP.length} lote(s)</div></div></div>
    <div class="budget-box" style="margin-top:14px;">
      <div><div class="n">${num(Math.round(falta))} kg</div><div class="l">Cereza por recoger</div></div>
      <div><div class="n">${num(redondear(falta / factor / 125, 1))}</div><div class="l">Cargas por venir</div></div>
      <div><div class="n">${ref ? fmtPesoCorto(falta / factor / 125 * ref) : '—'}</div><div class="l">Valor a precio de referencia</div></div>
      <div class="total"><div class="n">${kgJornada ? num(Math.ceil(falta / kgJornada)) : '—'}</div><div class="l">Jornadas de recolección necesarias</div></div>
    </div>
    ${kgJornada ? `<p class="hint" style="margin:10px 0 0;">Con ${num(Math.round(kgJornada))} kg por jornada, terminar en 30 días requiere unos <b>${num(Math.ceil(falta / kgJornada / 26))} recolectores</b> por día hábil.</p>` : ''}
    <div class="tscroll" style="margin-top:12px;"><table class="dtable" style="min-width:460px;"><thead><tr><th>Lote</th><th class="num">Proyectado</th><th class="num">Recogido</th><th style="min-width:120px;">Avance</th><th>Cosecha estimada</th></tr></thead><tbody>
    ${filas.map(x => `<tr><td>${esc(x.l.nombre)}</td><td class="num">${x.proy ? num(Math.round(x.proy)) + ' kg' : '—'}</td><td class="num">${x.proy ? num(Math.round(x.hecho)) + ' kg' : '—'}</td><td>${x.proy ? `<div class="mbar"><i style="width:${x.avance}%"></i><span>${num(Math.round(x.avance))}%</span></div>` : '<span class="tb-na">Sin conteo de frutos</span>'}</td><td>${x.fc ? fechaCorta(x.fc) + ' ' + parseFecha(x.fc).getUTCFullYear() : '—'}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">Registre conteos de frutos (Mapa y muestreos → capa Frutos) para proyectar cuánto falta por cosechar, cuántos recolectores se necesitan y cuánto dinero viene.<br><button class="link" onclick="ir(\'mapa\')">Ir a Mapa y muestreos</button></div>';
}
function tbOperacion(r) {
  const ots = ordenes.filter(o => enRango(o.fechaProgramada, r) && o.estado !== 'Cancelada' && (tbSt.finca === 'todas' || tbFincaDeLote(o.loteId) === tbSt.finca));
  const est = ['Programada', 'Emitida', 'En ejecución', 'Cerrada'].map(e => [e, ots.filter(o => o.estado === e).length]);
  const vencidas = ots.filter(o => o.fechaProgramada < hoyLocal() && o.estado !== 'Cerrada').length;
  const cerr = ots.filter(o => o.estado === 'Cerrada'); const pC = cerr.reduce((a, o) => a + n0(o.presupuesto && o.presupuesto.total), 0), rC = cerr.reduce((a, o) => a + n0(o.real && o.real.total), 0);
  const cumpl = ots.length ? cerr.length / ots.length * 100 : 0;
  const jP = cerr.reduce((a, o) => a + n0(o.presupuesto && o.presupuesto.jornales), 0), jR = cerr.reduce((a, o) => a + n0(o.real && o.real.jornales), 0);
  document.getElementById('tb-ot').innerHTML = ots.length ? `<div class="tb-ring">${anillo(cumpl)}<div><div class="tb-big">${num(Math.round(cumpl))}%</div><div class="hint" style="margin:0;">${cerr.length} de ${ots.length} órdenes cerradas</div></div></div>
    <div class="stack" style="margin-top:14px;">${est.filter(e => e[1]).map(e => `<i style="flex:${e[1]};background:${COLOR_ESTADO[e[0]]}" data-tip="${e[0]}: ${e[1]}"></i>`).join('')}</div>
    <div class="leg">${est.map(e => `<div class="leg-r"><span class="sw" style="background:${COLOR_ESTADO[e[0]]}"></span><span class="leg-n">${e[0]}</span><span class="leg-v">${e[1]}</span></div>`).join('')}</div>
    <div class="kv" style="margin-top:8px;"><span>Costo real contra presupuesto</span><b>${pC ? desvTxt(rC, pC) : '—'}</b></div>
    <div class="kv"><span>Jornales reales contra presupuesto</span><b>${jP ? desvTxt(jR, jP) : '—'}</b></div>
    <div class="kv"><span>Órdenes vencidas sin cerrar</span><b class="${vencidas ? 'neg' : ''}">${vencidas}</b></div>`
    : '<div class="empty">Sin órdenes de trabajo en el periodo.<br><button class="link" onclick="abrirNuevaOT()">Programar una orden</button></div>';
  // Labores por tipo en el periodo
  const lab = labores.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'lote'));
  const porTipo = groupSum(lab, x => x.tipo, x => n0(x.costo)).sort((a, b) => b.value - a.value);
  const tot = porTipo.reduce((a, x) => a + x.value, 0), mxT = Math.max(1, ...porTipo.map(x => x.value));
  const ha = lotesAlcance().reduce((a, l) => a + n0(l.hectareas), 0);
  document.getElementById('tb-labores').innerHTML = porTipo.length ? `<div class="tb-big">${fmt(tot)}</div><div class="hint" style="margin:2px 0 12px;">${ha ? fmt(tot / ha) + ' por hectárea · ' : ''}${lab.length} labor(es)</div>
    <div class="rk">${porTipo.slice(0, 7).map(x => `<div class="rk-r rk-wide" data-tip="${esc(x.label)}: ${fmt(x.value)} (${pct(x.value, tot)})"><span class="rk-n">${esc(x.label)}</span><span class="rk-b"><i style="width:${x.value / mxT * 100}%;background:var(--c1)"></i></span><span class="rk-v">${fmtCorto(x.value)}</span></div>`).join('')}</div>`
    : '<div class="empty">Sin labores registradas en el periodo.</div>';
}
function anillo(pctv) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pctv));
  return `<svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="${r}" fill="none" style="stroke:var(--surface-3)" stroke-width="8"/><circle cx="34" cy="34" r="${r}" fill="none" style="stroke:var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 34 34)"/></svg>`;
}

/* ---- Referencias y metas ---- */
function abrirMetas() {
  const MT = metas(); const ref = precioRefCarga();
  openModal(`<h3>Referencias y metas</h3>
    <p class="hint">El tablero compara cada cifra contra estos valores. Actualice el precio con el del día de su cooperativa o comprador; si lo deja en cero se usa el de la última venta.</p>
    <div class="fgrid c2">
      <label class="f">Precio de referencia por carga de 125 kg ($)<input id="mt-precio" type="number" step="1000" value="${n0(MT.precioCarga) || ''}" placeholder="${ref.v ? 'Hoy se usa ' + num(ref.v) : 'Ej. 2.200.000'}"></label>
      <label class="f">Meta de costo por carga ($)<input id="mt-costo" type="number" step="10000" value="${MT.metaCostoCarga}"></label>
      <label class="f">Meta de pergamino seco (kg por ha al año)<input id="mt-kgha" type="number" step="50" value="${MT.metaKgHa}"></label>
      <label class="f">Meta de factor (kg cereza por kg pergamino)<input id="mt-factor" type="number" step="0.05" value="${MT.metaFactor}"></label>
      <label class="f">Meta de recolección (kg por hora)<input id="mt-kgh" type="number" step="0.5" value="${MT.metaKgH}"></label>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarMetas()">Guardar</button></div>`);
}
function guardarMetas() {
  const g = id => n0(document.getElementById(id).value);
  const nv = { precioCarga: g('mt-precio'), metaCostoCarga: g('mt-costo'), metaKgHa: g('mt-kgha'), metaFactor: g('mt-factor'), metaKgH: g('mt-kgh') };
  if (nv.metaCostoCarga <= 0 || nv.metaKgHa <= 0 || nv.metaFactor <= 0 || nv.metaKgH <= 0) { alert('Las metas deben ser mayores que cero.'); return; }
  planConfig = Object.assign({}, planConfig, nv); tbSt.simPrecio = null;
  closeModal(); guardarEstado(); renderTablero(); toast('Referencias y metas guardadas');
}

let _tbTip = null, _tbAncho = 0;
window.addEventListener('resize', () => { const v = document.getElementById('view-tablero'); if (!v || !v.classList.contains('active')) return; const w = (document.getElementById('tb-cosecha') || {}).clientWidth; if (w && Math.abs(w - _tbAncho) > 20) { _tbAncho = w; clearTimeout(window._tbRz); window._tbRz = setTimeout(renderTablero, 120); } });
function tbTooltips() {
  const v = document.getElementById('view-tablero'); if (!v || v._tips) return; v._tips = true;
  _tbTip = document.createElement('div'); _tbTip.className = 'tb-tip'; _tbTip.hidden = true; document.body.appendChild(_tbTip);
  v.addEventListener('pointermove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) { _tbTip.hidden = true; v.querySelectorAll('.hit.on').forEach(x => x.classList.remove('on')); return; }
    v.querySelectorAll('.hit.on').forEach(x => x !== t && x.classList.remove('on')); if (t.classList.contains('hit')) t.classList.add('on');
    _tbTip.textContent = t.getAttribute('data-tip'); _tbTip.hidden = false;
    const w = _tbTip.offsetWidth, x = Math.min(window.innerWidth - w - 12, Math.max(12, e.clientX - w / 2)); _tbTip.style.left = x + 'px'; _tbTip.style.top = Math.max(8, e.clientY - _tbTip.offsetHeight - 14) + 'px'; });
  v.addEventListener('pointerleave', () => { _tbTip.hidden = true; });
}
function irSeccionTb(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }
