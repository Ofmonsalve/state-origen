/* ================= TABLERO EJECUTIVO ================= */
let tbSt = { periodo:'ult30', finca:'todas' };
const TB_PERIODOS = [['ult30','Últimos 30 días'],['ult90','Últimos 90 días'],['mes','Este mes'],['anio','Este año'],['todo','Todo']];
const SERIES = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
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
function tbMetricas(r) {
  const dias = diasEntre(r.desde, r.hasta);
  const regs = registros.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'registro'));
  const ben = beneficios.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'lote'));
  const ven = ventas.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'venta'));
  const lab = labores.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'lote'));
  const ins = insumos.filter(x => enRango(x.fecha, r) && tbDeFinca(x, 'venta'));
  const kg = regs.reduce((a, x) => a + n0(x.kg), 0), horas = regs.reduce((a, x) => a + n0(x.horas), 0);
  const recoleccion = regs.reduce((a, x) => a + n0(x.kg) * tarifaDe(x), 0);
  const labCosto = lab.reduce((a, x) => a + n0(x.costo), 0), insCosto = ins.reduce((a, x) => a + n0(x.costo), 0);
  const global = tbSt.finca === 'todas';
  const nomina = global ? empleados.reduce((a, e) => a + n0(e.salario), 0) * dias / 30 : 0;
  const deprec = global ? activos.reduce((a, x) => a + depreciacionAnual(x), 0) * dias / 365 : 0;
  const pergamino = ben.reduce((a, x) => a + n0(x.kgSalida), 0), cerezaBen = ben.reduce((a, x) => a + n0(x.kgEntrada), 0);
  const ingresos = ven.reduce((a, x) => a + n0(x.kg) * n0(x.precio), 0), kgVend = ven.reduce((a, x) => a + n0(x.kg), 0);
  const costo = recoleccion + labCosto + insCosto + nomina + deprec;
  return { r, dias, regs, ben, ven, lab, kg, horas, recoleccion, labCosto, insCosto, nomina, deprec, costo, pergamino, cerezaBen, ingresos, kgVend,
    cargas: pergamino / 125, margen: ingresos - costo, kgh: horas ? kg / horas : 0, factor: pergamino ? cerezaBen / pergamino : 0, costoCarga: pergamino ? costo / (pergamino / 125) : 0, precioCarga: kgVend ? ingresos / kgVend * 125 : 0 };
}
function tbSerieSemanal(r, fn) {
  const out = []; let ini = r.desde; const n = diasEntre(r.desde, r.hasta); const paso = n <= 31 ? 3 : (n <= 120 ? 7 : 30);
  while (ini <= r.hasta) { const fin = sumarDias(ini, paso - 1) > r.hasta ? r.hasta : sumarDias(ini, paso - 1); out.push(fn({ desde: ini, hasta: fin })); ini = sumarDias(fin, 1); }
  return out;
}
function delta(act, prev, mejorArriba) {
  if (!prev) return act ? '<span class="dl-n">nuevo en el periodo</span>' : '<span class="dl-n">sin datos del periodo anterior</span>';
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

function renderTablero() {
  const host = document.getElementById('view-tablero'); if (!host || !datosCargados) return;
  const r = tbRango(tbSt.periodo), rp = tbPrevio(r), m = tbMetricas(r), p = tbMetricas(rp);
  // Controles
  document.getElementById('tb-periodos').innerHTML = TB_PERIODOS.map(([k, t]) => `<button role="tab" aria-selected="${tbSt.periodo===k}" class="${tbSt.periodo===k?'on':''}" onclick="tbSt.periodo='${k}';renderTablero()">${t}</button>`).join('');
  const fs = document.getElementById('tb-finca'); const fsOpts = '<option value="todas">Todas las fincas</option>' + fincas.filter(f => activo(f) || registros.some(x => x.fincaId === f.id)).map(f => `<option value="${f.id}" ${tbSt.finca===f.id?'selected':''}>${esc(f.nombre)}${activo(f)?'':' (histórica)'}</option>`).join('');
  fs.innerHTML = fsOpts; fs.value = tbSt.finca;
  document.getElementById('tb-rango').textContent = fechaCorta(r.desde) + ' ' + parseFecha(r.desde).getUTCFullYear() + ' – ' + fechaCorta(r.hasta) + ' ' + parseFecha(r.hasta).getUTCFullYear() + ' · ' + m.dias + ' días';

  // Indicadores
  const sem = fn => tbSerieSemanal(r, fn);
  const kpis = [
    { l:'Cereza recolectada', v: num(Math.round(m.kg)) + ' <small>kg</small>', d: delta(m.kg, p.kg, true), s: sem(x => tbMetricas(x).kg), c:'var(--cereza)', sub: m.kgh ? num(redondear(m.kgh, 1)) + ' kg por hora de recolección' : 'Sin horas registradas' },
    { l:'Pergamino seco', v: num(Math.round(m.pergamino)) + ' <small>kg</small>', d: delta(m.pergamino, p.pergamino, true), s: sem(x => tbMetricas(x).pergamino), c:'var(--pergamino)', sub: num(redondear(m.cargas, 1)) + ' cargas' + (m.factor ? ' · factor ' + num(redondear(m.factor, 2)) + ' cereza/pergamino' : '') },
    { l:'Ingresos por ventas', v: fmtPesoCorto(m.ingresos), d: delta(m.ingresos, p.ingresos, true), s: sem(x => tbMetricas(x).ingresos), c:'var(--accent)', sub: m.precioCarga ? fmt(m.precioCarga) + ' promedio por carga' : 'Sin ventas en el periodo' },
    { l:'Costo de producción', v: fmtPesoCorto(m.costo), d: delta(m.costo, p.costo, false), s: sem(x => tbMetricas(x).costo), c:'var(--warn)', sub: m.costoCarga ? fmt(m.costoCarga) + ' por carga de pergamino' : 'Sin pergamino para costear la carga' },
    { l:'Margen', v: fmtPesoCorto(m.margen), d: delta(m.margen, p.margen, true), s: sem(x => tbMetricas(x).margen), c: m.margen >= 0 ? 'var(--good)' : 'var(--danger)', sub: m.ingresos ? 'margen de ' + pct(m.margen, m.ingresos) + ' sobre ventas' : 'Sin ventas para calcular el margen', neg: m.margen < 0 },
  ];
  document.getElementById('tb-kpis').innerHTML = kpis.map(k => `<div class="kpi"><div class="kpi-l">${k.l}</div><div class="kpi-v ${k.neg ? 'neg' : ''}">${k.v}</div><div class="kpi-d">${k.d}</div>${sparkline(k.s, k.c)}<div class="kpi-s">${k.sub}</div></div>`).join('');

  // Cosecha por día o semana, apilada por lote
  tbGraficaCosecha(r, m);
  // Costos
  const partes = [['Recolección', m.recoleccion], ['Labores', m.labCosto], ['Insumos', m.insCosto], ['Nómina fija', m.nomina], ['Depreciación', m.deprec]].filter(x => x[1] > 0);
  const totC = partes.reduce((a, x) => a + x[1], 0);
  document.getElementById('tb-costos').innerHTML = totC ? `<div class="tb-big">${fmt(totC)}</div><div class="hint" style="margin:2px 0 12px;">${m.costoCarga ? fmt(m.costoCarga) + ' por carga · ' : ''}${m.pergamino ? fmt(totC / m.pergamino) + ' por kg de pergamino' : 'registre beneficio para costear por carga'}</div>
    <div class="stack" role="img" aria-label="Composición del costo">${partes.map((x, i) => `<i style="flex:${x[1]};background:${SERIES[i]}" data-tip="${esc(x[0])}: ${fmt(x[1])} (${pct(x[1], totC)})"></i>`).join('')}</div>
    <div class="leg">${partes.map((x, i) => `<div class="leg-r"><span class="sw" style="background:${SERIES[i]}"></span><span class="leg-n">${x[0]}</span><span class="leg-v">${fmt(x[1])}</span><span class="leg-p">${pct(x[1], totC)}</span></div>`).join('')}</div>
    ${tbSt.finca !== 'todas' ? '<p class="hint" style="margin:10px 0 0;">La nómina fija y la depreciación se muestran solo con todas las fincas.</p>' : ''}`
    : '<div class="empty">Sin costos registrados en el periodo.</div>';

  // Lotes
  const ls = lotes.filter(l => (activo(l) || registros.some(x => x.loteId === l.id && enRango(x.fecha, r))) && (tbSt.finca === 'todas' || l.fincaId === tbSt.finca));
  const filas = ls.map(l => { const kg = m.regs.filter(x => x.loteId === l.id).reduce((a, x) => a + n0(x.kg), 0); const ha = n0(l.hectareas);
    const br = ultimaCampana(l.id, 'Broca'), ro = ultimaCampana(l.id, 'Roya'); const lab = m.lab.filter(x => x.loteId === l.id).reduce((a, x) => a + n0(x.costo), 0);
    return { l, kg, ha, kgha: ha ? kg / ha : 0, br, ro, lab }; }).sort((a, b) => b.kg - a.kg);
  const maxKgha = Math.max(1, ...filas.map(f => f.kgha));
  const semf = (c, u) => !c ? '<span class="tb-na">—</span>' : `<span class="pill ${c.prom <= u ? 'cerrada' : (c.prom <= 2*u ? 'ejecucion' : 'cancelada')}">${num(redondear(c.prom, 1))}%</span>`;
  document.getElementById('tb-lotes').innerHTML = `<thead><tr><th>Lote</th><th class="num">Área</th><th class="num">Cereza</th><th style="min-width:150px;">Kg de cereza por ha</th><th>Broca</th><th>Roya</th><th class="num">Labores</th></tr></thead>
    <tbody>${filas.map(f => `<tr><td><b style="color:var(--text);font-weight:650;">${esc(f.l.nombre)}</b><br><span style="font-size:11.5px;color:var(--text-faint);">${esc(nombreFinca(f.l.fincaId))}${activo(f.l) ? '' : ' · histórico'}</span></td><td class="num">${f.ha ? num(f.ha) + ' ha' : '—'}</td><td class="num">${num(Math.round(f.kg))} kg</td>
      <td>${f.ha ? `<div class="mbar"><i style="width:${f.kgha / maxKgha * 100}%"></i><span>${num(Math.round(f.kgha))}</span></div>` : '<span class="tb-na">Sin área</span>'}</td><td>${semf(f.br, cfgMapa().umbralBroca)}</td><td>${semf(f.ro, cfgMapa().umbralRoya)}</td><td class="num">${fmt(f.lab)}</td></tr>`).join('') || '<tr><td colspan="7" style="color:var(--text-faint);">Sin lotes para mostrar.</td></tr>'}</tbody>`;

  // Recolectores
  const porT = new Map(); m.regs.forEach(x => { const k = x.trabajadorId || x.recolector; const o = porT.get(k) || { n: x.recolector || '—', kg: 0, h: 0 }; o.kg += n0(x.kg); o.h += n0(x.horas); porT.set(k, o); });
  const rec = [...porT.values()].filter(o => o.h > 0).map(o => Object.assign(o, { kgh: o.kg / o.h })).sort((a, b) => b.kgh - a.kgh).slice(0, 7);
  const prom = m.kgh, maxR = Math.max(1, ...rec.map(o => o.kgh));
  document.getElementById('tb-rec').innerHTML = rec.length ? `<div class="rk">${rec.map(o => `<div class="rk-r" data-tip="${esc(o.n)}: ${num(redondear(o.kgh, 1))} kg/h · ${num(Math.round(o.kg))} kg en ${num(o.h)} h"><span class="rk-n">${esc(o.n)}</span><span class="rk-b"><i style="width:${o.kgh / maxR * 100}%;background:${o.kgh >= prom ? 'var(--accent)' : 'var(--axis)'}"></i><b class="rk-avg" style="left:${prom / maxR * 100}%"></b></span><span class="rk-v">${num(redondear(o.kgh, 1))}</span></div>`).join('')}</div>
    <p class="hint" style="margin:10px 0 0;">Kg por hora. La línea marca el promedio del periodo: ${num(redondear(prom, 1))} kg/h. En verde, quienes lo superan.</p>`
    : '<div class="empty">Sin recolección con horas registradas en el periodo.</div>';

  // Operación: órdenes de trabajo
  const ots = ordenes.filter(o => enRango(o.fechaProgramada, r) && o.estado !== 'Cancelada' && (tbSt.finca === 'todas' || tbFincaDeLote(o.loteId) === tbSt.finca));
  const est = ['Programada', 'Emitida', 'En ejecución', 'Cerrada'].map(e => [e, ots.filter(o => o.estado === e).length]);
  const vencidas = ots.filter(o => o.fechaProgramada < hoyLocal() && o.estado !== 'Cerrada').length;
  const cerr = ots.filter(o => o.estado === 'Cerrada'); const pC = cerr.reduce((a, o) => a + n0(o.presupuesto && o.presupuesto.total), 0), rC = cerr.reduce((a, o) => a + n0(o.real && o.real.total), 0);
  const cumpl = ots.length ? cerr.length / ots.length * 100 : 0;
  document.getElementById('tb-ot').innerHTML = ots.length ? `<div class="tb-ring">${anillo(cumpl)}<div><div class="tb-big">${num(Math.round(cumpl))}%</div><div class="hint" style="margin:0;">${cerr.length} de ${ots.length} órdenes cerradas</div></div></div>
    <div class="stack" style="margin-top:14px;">${est.filter(e => e[1]).map(e => `<i style="flex:${e[1]};background:${COLOR_ESTADO[e[0]]}" data-tip="${e[0]}: ${e[1]}"></i>`).join('')}</div>
    <div class="leg">${est.map(e => `<div class="leg-r"><span class="sw" style="background:${COLOR_ESTADO[e[0]]}"></span><span class="leg-n">${e[0]}</span><span class="leg-v">${e[1]}</span></div>`).join('')}</div>
    <div class="kv" style="margin-top:8px;"><span>Ejecutado contra presupuesto</span><b>${pC ? desvTxt(rC, pC) : '—'}</b></div>
    <div class="kv"><span>Órdenes vencidas sin cerrar</span><b class="${vencidas ? 'neg' : ''}">${vencidas}</b></div>`
    : '<div class="empty">Sin órdenes de trabajo en el periodo.<br><button class="link" onclick="abrirNuevaOT()">Programar una orden</button></div>';

  // Inventario de pergamino (acumulado)
  const ben = beneficios.filter(x => tbDeFinca(x, 'lote')), ven = ventas.filter(x => tbDeFinca(x, 'venta'));
  const prod = ben.reduce((a, x) => a + n0(x.kgSalida), 0), vend = ven.reduce((a, x) => a + n0(x.kg), 0), disp = prod - vend;
  const ult = ven.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
  document.getElementById('tb-inv').innerHTML = `<div class="tb-big ${disp < 0 ? 'neg' : ''}">${num(Math.round(disp))} <small>kg</small></div><div class="hint" style="margin:2px 0 12px;">${num(redondear(disp / 125, 1))} cargas en bodega${ult && n0(ult.precio) ? ' · valor estimado ' + fmt(disp * n0(ult.precio)) + ' al último precio de venta' : ''}</div>
    <div class="stack">${prod ? `<i style="flex:${Math.max(vend, 0)};background:var(--axis)" data-tip="Vendido: ${num(Math.round(vend))} kg"></i><i style="flex:${Math.max(disp, 0)};background:var(--pergamino)" data-tip="En bodega: ${num(Math.round(disp))} kg"></i>` : ''}</div>
    <div class="leg"><div class="leg-r"><span class="sw" style="background:var(--pergamino)"></span><span class="leg-n">En bodega</span><span class="leg-v">${num(Math.round(Math.max(disp, 0)))} kg</span></div><div class="leg-r"><span class="sw" style="background:var(--axis)"></span><span class="leg-n">Vendido</span><span class="leg-v">${num(Math.round(vend))} kg</span></div><div class="leg-r"><span class="sw" style="background:transparent;border:1.5px solid var(--border-strong)"></span><span class="leg-n">Producido</span><span class="leg-v">${num(Math.round(prod))} kg</span></div></div>`;

  // Próximas cosechas y proyección
  const proximas = lotesActivos().filter(l => tbSt.finca === 'todas' || l.fincaId === tbSt.finca).map(l => { const f = ultimaCampana(l.id, 'Floración'); const pr = proyeccionLote(l); return { l, f, fc: f ? sumarDias(f.fecha, n0(cfgMapa().diasFloracion)) : null, pr }; }).filter(o => o.fc || (o.pr && o.pr.kgCereza));
  document.getElementById('tb-prox').innerHTML = proximas.length ? proximas.sort((a, b) => String(a.fc || '9').localeCompare(String(b.fc || '9'))).map(o => { const dd = o.fc ? diasEntre(hoyLocal(), o.fc) - 1 : null;
      return `<div class="kv"><span><b style="color:var(--text);font-family:var(--f-body);">${esc(o.l.nombre)}</b><br>${o.fc ? (dd >= 0 ? 'Cosecha en ' + dd + ' días · ' : 'Cosecha desde hace ' + (-dd) + ' días · ') + fechaCorta(o.fc) : 'Sin floración registrada'}</span><b>${o.pr && o.pr.kgCereza ? num(Math.round(o.pr.kgCereza)) + ' kg<br><span style="font-weight:500;color:var(--text-faint);font-size:11.5px;">' + num(redondear(o.pr.kgPerg / 125, 1)) + ' cargas</span>' : '—'}</b></div>`; }).join('')
    : '<div class="empty">Registre floraciones y conteos de frutos en Mapa y muestreos para proyectar las próximas cosechas.<br><button class="link" onclick="ir(\'mapa\')">Ir a Mapa y muestreos</button></div>';

  // Lectura ejecutiva
  const frases = [];
  if (m.kg) frases.push(`Se recolectaron <b>${num(Math.round(m.kg))} kg de cereza</b>${p.kg ? ', ' + (m.kg >= p.kg ? 'un ' + num(redondear((m.kg / p.kg - 1) * 100, 0)) + '% más' : 'un ' + num(redondear((1 - m.kg / p.kg) * 100, 0)) + '% menos') + ' que en el periodo anterior' : ''}.`);
  if (m.costoCarga && m.precioCarga) frases.push(`Cada carga costó <b>${fmt(m.costoCarga)}</b> y se vendió en promedio a <b>${fmt(m.precioCarga)}</b>: ${m.precioCarga > m.costoCarga ? 'deja ' + fmt(m.precioCarga - m.costoCarga) + ' por carga' : 'se pierde ' + fmt(m.costoCarga - m.precioCarga) + ' por carga'}.`);
  else if (m.costo && !m.pergamino) frases.push(`Hay <b>${fmt(m.costo)}</b> en costos y aún no hay pergamino registrado en el periodo; registre el beneficio para conocer el costo por carga.`);
  const alertasCrit = alertasActuales().filter(a => a.sev === 'danger').length;
  if (alertasCrit) frases.push(`Hay <b>${alertasCrit} alerta(s) crítica(s)</b> en Hoy.`);
  if (rec.length) frases.push(`El mejor rendimiento fue de <b>${esc(rec[0].n)}</b> con ${num(redondear(rec[0].kgh, 1))} kg/h.`);
  document.getElementById('tb-lectura').innerHTML = frases.length ? frases.join(' ') : 'Aún no hay movimientos en este periodo. Registre cosecha, beneficio y ventas para ver aquí el resultado de la finca.';
  tbTooltips();
}
function anillo(pctv) {
  const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pctv));
  return `<svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="${r}" fill="none" style="stroke:var(--surface-3)" stroke-width="8"/><circle cx="34" cy="34" r="${r}" fill="none" style="stroke:var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 34 34)"/></svg>`;
}
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
  const W = 760, H = 250, pl = 46, pr = 10, pt = 14, pb = 28, cw = W - pl - pr, ch = H - pt - pb;
  const mx = Math.max(...datos.map(d => d.t)); const tick = [1, 2, 2.5, 5, 10].map(f => f * Math.pow(10, Math.floor(Math.log10(mx || 1)))).find(t => mx / t <= 4) || mx; const top_ = Math.ceil(mx / tick) * tick || 1;
  const bw = cw / datos.length, barW = Math.max(2, Math.min(28, bw * 0.7));
  let g = ''; for (let v = 0; v <= top_ + 1e-9; v += tick) { const y = pt + ch - v / top_ * ch; g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" style="stroke:var(--grid)" stroke-width="1"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end" style="fill:var(--text-faint)" font-size="10.5" font-family="JetBrains Mono, ui-monospace, monospace">${fmtCorto(v)}</text>`; }
  let bars = '', labels = ''; const cada = Math.ceil(datos.length / 10);
  datos.forEach((d, i) => { const x = pl + i * bw + (bw - barW) / 2; let y = pt + ch;
    const visibles = d.v.map((v, k) => [v, k]).filter(e => e[0] > 0);
    visibles.forEach(([v, k], j) => { const hgt = v / top_ * ch; y -= hgt; const ultimo = j === visibles.length - 1;
      bars += ultimo ? `<path d="M${x},${y + hgt} V${y + Math.min(4, hgt)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 V${y + hgt} Z" style="fill:${SERIES[k]}"/>` : `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(hgt - 1.5, 0.5)}" style="fill:${SERIES[k]}"/>`; });
    const etq = paso === 1 ? parseFecha(d.b.desde).getUTCDate() + (parseFecha(d.b.desde).getUTCDate() === 1 || i === 0 ? ' ' + MESES[parseFecha(d.b.desde).getUTCMonth()] : '') : fechaCorta(d.b.desde);
    if (i % cada === 0) labels += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" style="fill:var(--text-faint)" font-size="10.5" font-family="Figtree, system-ui, sans-serif">${etq}</text>`;
    const tip = (paso === 1 ? DIAS_LARGOS[(parseFecha(d.b.desde).getUTCDay() + 6) % 7] + ' ' + fechaCorta(d.b.desde) : fechaCorta(d.b.desde) + ' – ' + fechaCorta(d.b.hasta)) + ' · ' + num(Math.round(d.t)) + ' kg' + (d.t ? ' — ' + d.v.map((v, k) => v ? nombres[k] + ' ' + num(Math.round(v)) : '').filter(Boolean).join(', ') : '');
    bars += `<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc(tip)}"/>`; });
  const prom = m.kg / datos.length, yP = pt + ch - prom / top_ * ch;
  const promLine = `<line x1="${pl}" x2="${W - pr}" y1="${yP}" y2="${yP}" style="stroke:var(--text-soft)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${W - pr}" y="${yP - 5}" text-anchor="end" style="fill:var(--text-soft)" font-size="10.5" font-family="Figtree, system-ui, sans-serif">promedio ${num(Math.round(prom))} kg por ${paso === 1 ? 'día' : (paso === 7 ? 'semana' : 'mes')}</text>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cereza recolectada por ${paso === 1 ? 'día' : 'semana'}">${g}${bars}${promLine}${labels}</svg>`;
}
let _tbTip = null;
function tbTooltips() {
  const v = document.getElementById('view-tablero'); if (!v || v._tips) return; v._tips = true;
  _tbTip = document.createElement('div'); _tbTip.className = 'tb-tip'; _tbTip.hidden = true; document.body.appendChild(_tbTip);
  v.addEventListener('pointermove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) { _tbTip.hidden = true; v.querySelectorAll('.hit.on').forEach(x => x.classList.remove('on')); return; }
    v.querySelectorAll('.hit.on').forEach(x => x !== t && x.classList.remove('on')); if (t.classList.contains('hit')) t.classList.add('on');
    _tbTip.textContent = t.getAttribute('data-tip'); _tbTip.hidden = false;
    const w = _tbTip.offsetWidth, x = Math.min(window.innerWidth - w - 12, Math.max(12, e.clientX - w / 2)); _tbTip.style.left = x + 'px'; _tbTip.style.top = (e.clientY - _tbTip.offsetHeight - 14) + 'px'; });
  v.addEventListener('pointerleave', () => { _tbTip.hidden = true; });
}
