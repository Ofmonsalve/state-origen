/* ================= DISEÑO DE CULTIVO: evaluación técnica y financiera ================= */
let dsSt = { sel: null };
const SUP_DISENO = { precioCarga: 0, tasa: 12, horizonte: 10, pmax: 3000, d0: 4500, factorSitio: 1, areaUtil: 0.92, colino: 850, siembraPlantasJornal: 150, levantePorPlanta: 1400,
  sostenimientoHa: 4200000, insumosPorPlanta: 650, tarifaKgCereza: 700, factorCereza: 5, beneficioKg: 600, adminHa: 1400000, perdidaRoyaSusceptible: 12, controlRoyaHa: 650000 };
function supDiseno() { const s = Object.assign({}, SUP_DISENO, climaConfig.supDiseno || {}); if (!s.precioCarga) { try { s.precioCarga = precioRefCarga().v || 1900000; } catch (e) { s.precioCarga = 1900000; } } return s; }
function densidadDiseno(d) {
  const ds = n0(d.distSurcos), dp = n0(d.distPlantas), sitio = n0(d.plantasSitio) || 1; if (!ds || !dp) return 0;
  if (d.arreglo === 'Tresbolillo') return Math.round(10000 / (ds * dp) * sitio);
  if (d.arreglo === 'Surcos dobles') { const di = n0(d.distInterna) || ds / 2; return Math.round(2 * 10000 / ((ds + di) * dp) * sitio); }
  return Math.round(10000 / (ds * dp) * sitio);
}
function curvaProduccion(d, S) {
  // Índice por año de ciclo: 0 levante, primera cosecha parcial, pico y declive más rápido con mayor densidad
  const dens = densidadDiseno(d); const ciclo = Math.max(3, n0(d.ciclo) || 6); const dec = 0.05 + dens / 140000; const out = [];
  const susc = /caturra|t[ií]pica|borb|geisha|bourbon/i.test(d.variedad || '');
  const pico = S.pmax * (1 - Math.exp(-dens / S.d0)) * S.factorSitio * (n0(d.factorSitio) || 1) * (susc ? 1 - (d.controlRoya ? S.perdidaRoyaSusceptible * 0.25 : S.perdidaRoyaSusceptible) / 100 : 1);
  let fase = d.inicio === 'zoca' ? 'zoca' : 'siembra', t = 0, cosechas = 0;
  for (let a = 0; a <= S.horizonte; a++) {
    const idx = t === 0 ? 0 : t === 1 ? (fase === 'siembra' ? 0.3 : 0.7) : t === 2 ? 1 : Math.max(0.35, 1 - dec * 1.6 * (t - 2));
    out.push({ anio: a, idx, kg: pico * idx * S.areaUtil, soqueo: fase === 'zoca' && t === 0 });
    if (idx > 0) cosechas++; t++;
    if (cosechas >= ciclo) { fase = 'zoca'; t = 0; cosechas = 0; }
  }
  return { dens, pico, anios: out, susc };
}
function evaluarDiseno(d) {
  const S = supDiseno(); const ha = n0(d.area) || 1; const cp = curvaProduccion(d, S); const dens = cp.dens; const plantas = Math.round(dens * ha * S.areaUtil);
  const jornal = costoJornalTotal(); const flujos = [];
  cp.anios.forEach(x => {
    const kgCps = x.kg * ha; const cargas = kgCps / 125; const ingreso = cargas * S.precioCarga;
    let inv = 0, costo = 0;
    if (x.anio === 0 && d.inicio !== 'zoca') inv += plantas * (S.colino + jornal / S.siembraPlantasJornal) + plantas * S.levantePorPlanta * 0.5;
    if (x.anio === 1 && d.inicio !== 'zoca') inv += plantas * S.levantePorPlanta * 0.5;
    if (x.soqueo) inv += ha * 18 * jornal + plantas * 120;
    costo += S.sostenimientoHa * ha + plantas * S.insumosPorPlanta * (x.idx > 0 ? 1 : 0.5) + S.adminHa * ha;
    if (cp.susc && d.controlRoya) costo += S.controlRoyaHa * ha;
    costo += kgCps * S.factorCereza * S.tarifaKgCereza + kgCps * S.beneficioKg;
    flujos.push({ anio: x.anio, kgCps, cargas, ingreso, inv, costo, neto: ingreso - costo - inv, soqueo: x.soqueo, idx: x.idx });
  });
  const r = S.tasa / 100; const vpn = flujos.reduce((s, f) => s + f.neto / Math.pow(1 + r, f.anio), 0);
  const tir = tirDe(flujos.map(f => f.neto)); let acum = 0, pay = null; flujos.forEach(f => { const ant = acum; acum += f.neto; if (pay == null && ant < 0 && acum >= 0) pay = f.anio - 1 + (-ant / (f.neto || 1)); });
  const cargasTot = flujos.reduce((s, f) => s + f.cargas, 0); const costoTot = flujos.reduce((s, f) => s + f.costo + f.inv, 0);
  const vpCostos = flujos.reduce((s, f) => s + (f.costo + f.inv) / Math.pow(1 + r, f.anio), 0), vpCargas = flujos.reduce((s, f) => s + f.cargas / Math.pow(1 + r, f.anio), 0);
  return { d, S, ha, dens, plantas, flujos, vpn, tir, pay, cargasTot, costoCarga: cargasTot ? costoTot / cargasTot : 0, precioEq: vpCargas ? vpCostos / vpCargas : 0, invInicial: flujos.slice(0, 2).reduce((s, f) => s + f.inv, 0), pico: cp.pico, susc: cp.susc, kgPlanta: cp.pico / (dens || 1) };
}
function tirDe(fl) { const v = r => fl.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0); // busca el primer cambio de signo desde −50 % (evita las raíces falsas que crean las renovaciones al final)
  let prev = -0.5, vp = v(prev); for (let r = -0.49; r <= 10; r += (r < 1 ? 0.01 : 0.1)) { const vr = v(r); if (vp === 0) return prev * 100; if (vp * vr < 0) { let lo = prev, hi = r; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (v(lo) * v(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2 * 100; } prev = r; vp = vr; } return null; }
function sensibilidad(d) {
  const base = evaluarDiseno(d).vpn; const S0 = Object.assign({}, climaConfig.supDiseno || {}); const out = [];
  const prueba = (nombre, fn) => { const r = [-0.2, 0.2].map(f => { const bk = clonar(climaConfig.supDiseno || {}); climaConfig.supDiseno = Object.assign({}, supDiseno(), fn(f)); const v = evaluarDiseno(d).vpn; climaConfig.supDiseno = bk; return v; }); out.push({ nombre, bajo: r[0] - base, alto: r[1] - base }); };
  const S = supDiseno();
  prueba('Precio del café', f => ({ precioCarga: S.precioCarga * (1 + f) }));
  prueba('Productividad', f => ({ pmax: S.pmax * (1 + f) }));
  prueba('Tarifa de recolección', f => ({ tarifaKgCereza: S.tarifaKgCereza * (1 + f) }));
  prueba('Costo de sostenimiento', f => ({ sostenimientoHa: S.sostenimientoHa * (1 + f), insumosPorPlanta: S.insumosPorPlanta * (1 + f) }));
  prueba('Costo del colino y la siembra', f => ({ colino: S.colino * (1 + f), levantePorPlanta: S.levantePorPlanta * (1 + f) }));
  prueba('Tasa de descuento', f => ({ tasa: S.tasa * (1 + f) }));
  climaConfig.supDiseno = Object.keys(S0).length ? S0 : climaConfig.supDiseno;
  return { base, items: out.sort((a, b) => Math.max(Math.abs(b.bajo), Math.abs(b.alto)) - Math.max(Math.abs(a.bajo), Math.abs(a.alto))) };
}
function disenosEjemplo() {
  const v = (variedades[0] || {}).nombre || 'Castillo';
  return [{ id: uid('ds'), nombre: 'Tradicional 2 × 1,5 m', variedad: v, distSurcos: 2, distPlantas: 1.5, arreglo: 'Rectangular', plantasSitio: 1, area: 1, ciclo: 6, inicio: 'siembra' },
    { id: uid('ds'), nombre: 'Alta densidad 1,5 × 1 m', variedad: v, distSurcos: 1.5, distPlantas: 1, arreglo: 'Rectangular', plantasSitio: 1, area: 1, ciclo: 5, inicio: 'siembra' },
    { id: uid('ds'), nombre: 'Muy alta densidad 1,4 × 0,7 m', variedad: v, distSurcos: 1.4, distPlantas: 0.7, arreglo: 'Rectangular', plantasSitio: 1, area: 1, ciclo: 4, inicio: 'siembra' }];
}
function svgArreglo(d, w, h) {
  w = w || 120; h = h || 70; const ds = n0(d.distSurcos) || 1.5, dp = n0(d.distPlantas) || 1; const esc_ = Math.min(w / 6, h / 4); let s = ''; const filas = [];
  if (d.arreglo === 'Surcos dobles') { const di = n0(d.distInterna) || ds / 2; let y = 0.4; while (y < h / esc_) { filas.push(y); filas.push(y + di); y += ds + di; } } else for (let y = 0.4; y < h / esc_; y += ds) filas.push(y);
  filas.forEach((y, i) => { const off = d.arreglo === 'Tresbolillo' && i % 2 ? dp / 2 : 0; for (let x = 0.4 + off; x < w / esc_; x += dp) s += `<circle cx="${(x * esc_).toFixed(1)}" cy="${(y * esc_).toFixed(1)}" r="${Math.max(1.6, Math.min(4, dp * esc_ * 0.28)).toFixed(1)}" style="fill:var(--accent)"/>`; });
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" class="ds-arr">${s}</svg>`;
}
function renderDisenos() {
  const root = document.getElementById('ds-root'); if (!root) return; tooltipsGlobales();
  const evs = disenos.map(evaluarDiseno); if (!disenos.some(d => d.id === dsSt.sel)) dsSt.sel = disenos[0] ? disenos[0].id : null; const S = supDiseno();
  const mejor = evs.slice().sort((a, b) => b.vpn - a.vpn)[0];
  root.innerHTML = `<div class="chip-row"><p class="hint" style="margin:0;max-width:720px;">Compare distancias de siembra, arreglos, variedades y ciclos antes de sembrar o renovar: producción esperada, inversión, flujo de caja, VPN, TIR y recuperación. Todos los supuestos se pueden ajustar.</p>
      <div class="mp-actions"><button class="btn ghost small" onclick="abrirSupuestosDiseno()">Supuestos</button><button class="btn primary small" onclick="abrirDiseno()">+ Diseño</button></div></div>
    ${!disenos.length ? `<div class="card"><div class="empty">Aún no hay diseños para comparar.<br><button class="btn primary small" style="margin-top:12px" onclick="disenos=disenosEjemplo();guardarEstado();renderDisenos()">Crear tres diseños de referencia</button></div></div>` : `
    <div class="ds-grid">${evs.map(e => `<button class="ds-card ${e.d.id === dsSt.sel ? 'on' : ''}" onclick="dsSt.sel='${e.d.id}';renderDisenos()">${svgArreglo(e.d)}<div class="ds-b"><b>${esc(e.d.nombre)}</b><small>${esc(e.d.variedad || '')} · ${esc(e.d.arreglo || 'Rectangular')} · ciclo ${e.d.ciclo} años</small>
      <div class="ds-m"><span><b>${num(e.dens)}</b>pl/ha</span><span><b>${num(Math.round(e.pico / 125 * 10) / 10)}</b>cargas/ha pico</span><span><b class="${e.vpn >= 0 ? 'pos' : 'neg'}">${fmtCorto(e.vpn)}</b>VPN</span><span><b>${e.tir == null ? '—' : num(redondear(e.tir, 1)) + '%'}</b>TIR</span></div></div>${mejor && mejor.d.id === e.d.id && evs.length > 1 ? '<span class="ds-top">Mejor VPN</span>' : ''}</button>`).join('')}</div>
    <div class="grid g2">
      <div class="card"><div class="title">Flujo de caja acumulado <span class="sub">${S.horizonte} años · precio ${fmt(S.precioCarga)} por carga</span></div>
        ${gLeyenda(evs.map((e, i) => ({ color: `var(--c${(i % 5) + 1})`, txt: e.d.nombre, linea: true })))}
        ${gCombo({ cats: evs[0].flujos.map(f => 'Año ' + f.anio), series: evs.map((e, i) => { let a = 0; return { nombre: e.d.nombre, tipo: 'linea', color: `var(--c${(i % 5) + 1})`, vals: e.flujos.map(f => (a += f.neto)), fmtTip: v => fmt(v) }; }), fmt: v => fmtCorto(v), alto: 260, refY: [{ v: 0, txt: '' }], titulo: 'Flujo acumulado' })}</div>
      <div class="card"><div class="title">Producción por año <span class="sub">cargas de pergamino seco por hectárea</span></div>
        ${gLeyenda(evs.map((e, i) => ({ color: `var(--c${(i % 5) + 1})`, txt: e.d.nombre })))}
        ${gCombo({ cats: evs[0].flujos.map(f => 'Año ' + f.anio), series: evs.map((e, i) => ({ nombre: e.d.nombre, color: `var(--c${(i % 5) + 1})`, vals: e.flujos.map(f => redondear(f.cargas / e.ha, 1)), fmtTip: v => num(v) + ' cargas/ha' })), fmt: v => num(v), alto: 260, titulo: 'Producción' })}</div>
    </div>
    <div class="card"><div class="title">Comparación</div><div class="tscroll"><table class="dtable"><thead><tr><th>Indicador</th>${evs.map(e => `<th class="num">${esc(e.d.nombre)}</th>`).join('')}</tr></thead><tbody>
      ${[['Plantas por hectárea', e => num(e.dens)], ['Plantas en el área evaluada', e => num(e.plantas) + ' en ' + num(e.ha) + ' ha'], ['Producción pico', e => num(Math.round(e.pico)) + ' kg/ha · ' + num(redondear(e.kgPlanta, 2)) + ' kg/planta'], ['Producción en el horizonte', e => num(Math.round(e.cargasTot)) + ' cargas'], ['Inversión de establecimiento', e => fmt(e.invInicial)], ['Costo promedio por carga', e => fmt(e.costoCarga)], ['Precio de equilibrio', e => fmt(e.precioEq)], ['VPN al ' + S.tasa + ' %', e => `<b class="${e.vpn >= 0 ? 'pos' : 'neg'}">${fmt(e.vpn)}</b>`], ['TIR', e => e.tir == null ? '—' : num(redondear(e.tir, 1)) + ' %'], ['Recuperación de la inversión', e => e.pay == null ? 'no se recupera' : num(redondear(e.pay, 1)) + ' años']].map(([t, f]) => `<tr><td>${t}</td>${evs.map(e => `<td class="num">${f(e)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div></div>
    ${dsSt.sel ? detalleDiseno(evs.find(e => e.d.id === dsSt.sel)) : ''}`}
    ${ejecucionLotesHtml()}`;
}
function detalleDiseno(e) {
  if (!e) return ''; const sen = sensibilidad(e.d); const M = Math.max(1, ...sen.items.map(i => Math.max(Math.abs(i.bajo), Math.abs(i.alto))));
  return `<div class="grid g2"><div class="card"><div class="title">${esc(e.d.nombre)} · flujo por año</div><div class="tscroll"><table class="dtable"><thead><tr><th>Año</th><th class="num">Cargas</th><th class="num">Ingreso</th><th class="num">Inversión</th><th class="num">Costos</th><th class="num">Neto</th></tr></thead><tbody>${e.flujos.map(f => `<tr><td>${f.anio}${f.soqueo ? ' · soqueo' : ''}${f.anio === 0 && e.d.inicio !== 'zoca' ? ' · siembra' : ''}</td><td class="num">${num(redondear(f.cargas, 1))}</td><td class="num">${fmt(f.ingreso)}</td><td class="num">${f.inv ? fmt(f.inv) : '—'}</td><td class="num">${fmt(f.costo)}</td><td class="num ${f.neto < 0 ? 'neg' : ''}">${fmt(f.neto)}</td></tr>`).join('')}</tbody></table></div>
      <div class="mp-btns"><button class="btn ghost small" onclick="abrirDiseno('${e.d.id}')">Editar</button><button class="btn ghost small" onclick="duplicarDiseno('${e.d.id}')">Duplicar</button><button class="btn danger-ghost" onclick="eliminarDiseno('${e.d.id}')">Eliminar</button></div></div>
    <div class="card"><div class="title">Sensibilidad del VPN <span class="sub">cambio de cada supuesto en ±20 %</span></div>
      <div class="tornado">${sen.items.map(i => { const a = Math.min(i.bajo, i.alto), b = Math.max(i.bajo, i.alto); return `<div class="tn-r"><span>${esc(i.nombre)}</span><div class="tn-b"><i class="neg" style="left:${50 + Math.min(0, a) / M * 50}%;width:${Math.abs(Math.min(0, a)) / M * 50}%"></i><i class="pos" style="left:50%;width:${Math.max(0, b) / M * 50}%"></i><em></em></div><b class="mono">${fmtCorto(a)} / ${fmtCorto(b)}</b></div>`; }).join('')}</div>
      <p class="hint" style="margin:10px 0 0;">VPN base ${fmt(sen.base)}. Las barras más largas son los supuestos que más conviene precisar antes de decidir.${e.susc ? ' Variedad susceptible a roya: el modelo descuenta ' + (e.d.controlRoya ? 'parte de la pérdida y suma el costo de control.' : 'la pérdida por roya sin control.') : ''}</p></div></div>`;
}
function ejecucionLotesHtml() {
  const S = supDiseno(); const filas = lotesActivos().filter(l => l.diseno).map(l => { const g = geomLote(l); if (!g) return null;
    const falt = marcasPlanta.filter(m => m.loteId === l.id && m.estado === 'Faltante').length; const densDis = densidadDiseno({ distSurcos: l.diseno.distSurcos, distPlantas: l.diseno.distPlantas }); const densReal = (g.total - falt) / (g.ha || 1);
    const edad = edadLote(l); const d = { distSurcos: l.diseno.distSurcos, distPlantas: l.diseno.distPlantas, variedad: nombreVariedad(l.variedadId), ciclo: 30 };
    const cp = curvaProduccion(d, Object.assign({}, S, { horizonte: 12 })); const k = edad == null ? null : Math.min(12, Math.floor(edad)); const esperado = k == null ? null : cp.anios[k].kg;
    const anio = hoyLocal().slice(0, 4); const kgPerg = beneficios.filter(b => b.loteId === l.id && b.fecha && b.fecha.slice(0, 4) === anio).reduce((s, b) => s + n0(b.kgSalida), 0);
    const kgCer = registros.filter(r => r.loteId === l.id && r.fecha && r.fecha.slice(0, 4) === anio).reduce((s, r) => s + n0(r.kg), 0); const real = (kgPerg || kgCer / (cfgMapa().factorPergamino || 5)) / (g.ha || 1);
    const costoReal = labores.filter(lb => lb.loteId === l.id && lb.fecha && lb.fecha.slice(0, 4) === anio).reduce((s, lb) => s + n0(lb.costo), 0) / (g.ha || 1);
    return { l, densDis, densReal, falt, edad, esperado, real, costoReal }; }).filter(Boolean);
  if (!filas.length) return '';
  return `<div class="card"><div class="title">Ejecución de los lotes frente a su diseño <span class="sub">año ${hoyLocal().slice(0, 4)} hasta la fecha</span></div><div class="tscroll"><table class="dtable"><thead><tr><th>Lote</th><th class="num">Densidad diseñada</th><th class="num">Densidad viva</th><th class="num">Faltantes</th><th class="num">Edad</th><th class="num">Pergamino esperado (kg/ha/año)</th><th class="num">Logrado (kg/ha)</th><th class="num">Avance</th><th class="num">Labores/ha</th></tr></thead><tbody>
    ${filas.map(f => { const av = f.esperado ? f.real / f.esperado * 100 : null; return `<tr><td>${esc(f.l.nombre)}</td><td class="num">${num(f.densDis)}</td><td class="num">${num(Math.round(f.densReal))} <span class="pill ${f.densReal >= f.densDis * 0.95 ? 'cerrada' : f.densReal >= f.densDis * 0.85 ? 'ejecucion' : 'cancelada'}">${Math.round(f.densReal / (f.densDis || 1) * 100)}%</span></td><td class="num">${num(f.falt)}</td><td class="num">${f.edad == null ? '—' : num(redondear(f.edad, 1)) + ' a'}</td><td class="num">${f.esperado == null ? '—' : num(Math.round(f.esperado))}</td><td class="num">${num(Math.round(f.real))}</td><td class="num">${av == null ? '—' : Math.round(av) + ' %'}</td><td class="num">${fmt(f.costoReal)}</td></tr>`; }).join('')}
  </tbody></table></div><p class="hint" style="margin:10px 0 0;">La densidad viva descuenta las plantas marcadas como faltantes en la maqueta. Lo esperado sale del mismo modelo de producción con los supuestos actuales; al avanzar la cosecha, el avance debe acercarse al 100 %.</p></div>`;
}
function abrirDiseno(id) {
  const d = id ? clonar(disenos.find(x => x.id === id)) : { nombre: '', variedad: (variedades[0] || {}).nombre || 'Castillo', distSurcos: 1.5, distPlantas: 1, arreglo: 'Rectangular', plantasSitio: 1, area: 1, ciclo: 5, inicio: 'siembra', controlRoya: false, factorSitio: 1 };
  window._dsDraft = d;
  openModal(`<h3>${id ? 'Editar' : 'Nuevo'} diseño</h3>
    <div class="fgrid c3"><label class="f">Nombre<input id="dd-nom" value="${esc(d.nombre)}" placeholder="Ej. Castillo 1,4 × 0,8 m"></label>
      <label class="f">Variedad<input id="dd-var" list="dd-vars" value="${esc(d.variedad || '')}"><datalist id="dd-vars">${['Castillo', 'Cenicafé 1', 'Castillo Rosario', 'Tabi', 'Caturra', 'Colombia', 'Geisha', 'Típica', 'Borbón rosado'].concat(variedades.map(v => v.nombre)).map(v => `<option>${esc(v)}</option>`).join('')}</datalist></label>
      <label class="f">Arreglo<select id="dd-arr">${['Rectangular', 'Tresbolillo', 'Surcos dobles'].map(a => `<option ${a === d.arreglo ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="f">Distancia entre surcos (m)<input id="dd-ds" type="number" step="0.05" value="${d.distSurcos}"></label><label class="f">Distancia entre plantas (m)<input id="dd-dp" type="number" step="0.05" value="${d.distPlantas}"></label><label class="f">Plantas por sitio<input id="dd-ps" type="number" min="1" max="3" value="${d.plantasSitio || 1}"></label>
      <label class="f">Distancia interna del surco doble (m)<input id="dd-di" type="number" step="0.05" value="${d.distInterna || ''}" placeholder="solo surcos dobles"></label><label class="f">Área a evaluar (ha)<input id="dd-area" type="number" step="0.1" value="${d.area}"></label><label class="f">Cosechas antes de soquear<input id="dd-ciclo" type="number" min="3" max="10" value="${d.ciclo}"></label>
      <label class="f">Inicio<select id="dd-ini"><option value="siembra" ${d.inicio !== 'zoca' ? 'selected' : ''}>Siembra nueva</option><option value="zoca" ${d.inicio === 'zoca' ? 'selected' : ''}>Lote en zoca</option></select></label>
      <label class="f">Ajuste del sitio (altitud, brillo solar)<input id="dd-fs" type="number" step="0.05" value="${d.factorSitio || 1}"></label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:22px"><input type="checkbox" id="dd-roya" ${d.controlRoya ? 'checked' : ''}> Con control de roya</label></div>
    <div class="budget-box" id="dd-prev" style="margin-top:12px"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarDiseno()">Guardar</button></div>`, true);
  ['dd-nom', 'dd-var', 'dd-arr', 'dd-ds', 'dd-dp', 'dd-ps', 'dd-di', 'dd-area', 'dd-ciclo', 'dd-ini', 'dd-fs', 'dd-roya'].forEach(k => { const e = document.getElementById(k); e.addEventListener('input', previewDisenoEval); e.addEventListener('change', previewDisenoEval); });
  previewDisenoEval();
}
function leerDisenoEval() { const g = k => document.getElementById(k).value; return Object.assign(window._dsDraft, { nombre: g('dd-nom').trim(), variedad: g('dd-var').trim(), arreglo: g('dd-arr'), distSurcos: n0(g('dd-ds')), distPlantas: n0(g('dd-dp')), plantasSitio: n0(g('dd-ps')) || 1, distInterna: n0(g('dd-di')) || null, area: n0(g('dd-area')) || 1, ciclo: n0(g('dd-ciclo')) || 5, inicio: g('dd-ini'), factorSitio: n0(g('dd-fs')) || 1, controlRoya: document.getElementById('dd-roya').checked }); }
function previewDisenoEval() { const d = leerDisenoEval(); const e = evaluarDiseno(d); document.getElementById('dd-prev').innerHTML = `<div><div class="n">${num(e.dens)}</div><div class="l">Plantas/ha</div></div><div><div class="n">${num(Math.round(e.pico))} kg</div><div class="l">Pergamino/ha en el pico</div></div><div><div class="n">${fmtCorto(e.invInicial)}</div><div class="l">Inversión inicial</div></div><div class="total"><div class="n">${fmtCorto(e.vpn)}</div><div class="l">VPN · TIR ${e.tir == null ? '—' : num(redondear(e.tir, 1)) + '%'}</div></div>`; }
function guardarDiseno() { const d = leerDisenoEval(); if (!d.distSurcos || !d.distPlantas) { alert('Indique las distancias.'); return; } if (!d.nombre) d.nombre = d.variedad + ' ' + num(d.distSurcos) + ' × ' + num(d.distPlantas) + ' m'; if (!d.id) { d.id = uid('ds'); disenos.push(d); } else disenos[disenos.findIndex(x => x.id === d.id)] = d; dsSt.sel = d.id; closeModal(); guardarEstado(); renderDisenos(); toast('Diseño guardado'); }
function duplicarDiseno(id) { const d = clonar(disenos.find(x => x.id === id)); d.id = uid('ds'); d.nombre += ' (copia)'; disenos.push(d); dsSt.sel = d.id; guardarEstado(); renderDisenos(); }
function eliminarDiseno(id) { conDeshacer('Diseño eliminado', () => { disenos = disenos.filter(x => x.id !== id); guardarEstado(); renderDisenos(); }); }
function abrirSupuestosDiseno() {
  const S = supDiseno(); const campos = [['precioCarga', 'Precio por carga de pergamino ($)'], ['tasa', 'Tasa de descuento (% anual)'], ['horizonte', 'Horizonte (años)'], ['pmax', 'Productividad máxima (kg pergamino/ha)'], ['d0', 'Densidad de saturación (pl/ha)'], ['factorSitio', 'Ajuste general del sitio'], ['areaUtil', 'Fracción útil del área (0 a 1)'], ['colino', 'Colino puesto en finca ($)'], ['siembraPlantasJornal', 'Plantas sembradas por jornal'], ['levantePorPlanta', 'Levante por planta (2 primeros años, $)'], ['sostenimientoHa', 'Sostenimiento por ha al año ($)'], ['insumosPorPlanta', 'Fertilizante por planta al año ($)'], ['tarifaKgCereza', 'Recolección por kg de cereza ($)'], ['factorCereza', 'Kg de cereza por kg de pergamino'], ['beneficioKg', 'Beneficio y secado por kg de pergamino ($)'], ['adminHa', 'Administración por ha al año ($)'], ['perdidaRoyaSusceptible', 'Pérdida por roya sin control (%)'], ['controlRoyaHa', 'Control de roya por ha al año ($)']];
  openModal(`<h3>Supuestos de la evaluación</h3><p class="hint">Valores de referencia para comparar diseños. Ajústelos con sus costos reales; el precio sale del precio de referencia del tablero si no lo cambia.</p><div class="fgrid c3">${campos.map(([k, t]) => `<label class="f">${t}<input id="sd-${k}" type="number" step="any" value="${S[k]}"></label>`).join('')}</div>
    <div class="modal-actions"><button class="btn ghost" onclick="climaConfig.supDiseno={};closeModal();guardarEstado();renderDisenos()">Restablecer</button><span style="flex:1"></span><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarSupuestosDiseno()">Guardar</button></div>`, true);
  window._sdCampos = campos.map(c => c[0]);
}
function guardarSupuestosDiseno() { const s = {}; _sdCampos.forEach(k => s[k] = n0(document.getElementById('sd-' + k).value)); climaConfig.supDiseno = s; closeModal(); guardarEstado(); renderDisenos(); toast('Supuestos guardados'); }
