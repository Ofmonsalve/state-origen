/* ================= VENTAS, PARTIDAS Y TRAZABILIDAD ================= */
let coSt = { tab: 'ventas', trazaVenta: null, trazaPartida: null, anio: hoyLocal().slice(0, 4) };
const CARGA = 125;
function valorVenta(v) { const bruto = n0(v.kg) * n0(v.precio); const ret = v.retencion != null ? n0(v.retencion) : 0; const neto = bruto + n0(v.bonificacion) - n0(v.descuentos) - ret; return { bruto, ret, neto, cobrado: (v.cobros || []).reduce((s, c) => s + n0(c.valor), 0) + (v.formaPago === 'Crédito' ? 0 : (v.cobros && v.cobros.length ? 0 : neto)) }; }
function saldoVenta(v) { const x = valorVenta(v); return Math.max(0, x.neto - x.cobrado); }
function terceroNombre(id, txt) { const t = terceros.find(x => x.id === id); return t ? t.nombre : (txt || '—'); }
/* ---- Partidas ---- */
function kgPartida(p) { return p.kg != null && p.kg !== '' ? n0(p.kg) : (p.beneficioIds || []).reduce((s, id) => s + n0((beneficios.find(b => b.id === id) || {}).kgSalida), 0); }
function vendidoDePartida(pid) { return ventas.reduce((s, v) => s + (v.partidas || []).filter(x => x.partidaId === pid).reduce((a, x) => a + n0(x.kg), 0), 0); }
function disponiblePartida(p) { return Math.max(0, kgPartida(p) - vendidoDePartida(p.id)); }
function beneficiosLibres() { const usados = new Set(partidas.flatMap(p => p.beneficioIds || [])); return beneficios.filter(b => !usados.has(b.id)).sort((a, b) => a.fecha.localeCompare(b.fecha)); }
function siguienteCodigoPartida(fecha) { const an = String(fecha || hoyLocal()).slice(0, 4); const n = partidas.filter(p => String(p.codigo || '').includes(an)).reduce((m, p) => Math.max(m, parseInt(String(p.codigo).split('-').pop(), 10) || 0), 0); return 'P-' + an + '-' + String(n + 1).padStart(3, '0'); }
/* Cosecha que alimentó un beneficio: registros del mismo lote desde el beneficio anterior de ese lote */
function registrosDeBeneficio(b) {
  const prev = beneficios.filter(x => x.loteId === b.loteId && x.id !== b.id && (x.fecha < b.fecha || (x.fecha === b.fecha && x.id < b.id))).map(x => x.fecha).sort().pop();
  return registros.filter(r => r.loteId === b.loteId && r.fecha <= b.fecha && (!prev || r.fecha > prev) && r.fecha >= sumarDias(b.fecha, -21));
}
/* Origen de una venta: exacto si tiene partidas; si no, primero en entrar, primero en salir sobre los beneficios */
function origenVenta(v) {
  if (v.partidas && v.partidas.length) return { exacto: true, partes: v.partidas.map(x => { const p = partidas.find(q => q.id === x.partidaId); if (!p) return null; const tot = kgPartida(p) || 1;
    return { partida: p, kg: n0(x.kg), beneficios: (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean).map(b => ({ b, kg: n0(x.kg) * n0(b.kgSalida) / tot })) }; }).filter(Boolean) };
  const bs = beneficios.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)).map(b => ({ b, libre: n0(b.kgSalida) }));
  const vs = ventas.filter(x => !(x.partidas && x.partidas.length)).slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.id).localeCompare(String(b.id)));
  let out = null;
  for (const w of vs) { let falta = n0(w.kg); const usa = []; for (const x of bs) { if (falta <= 0.001) break; if (x.b.fecha > w.fecha || x.libre <= 0.001) continue; const t = Math.min(falta, x.libre); x.libre -= t; falta -= t; usa.push({ b: x.b, kg: t }); } if (w.id === v.id) { out = usa; break; } }
  return { exacto: false, partes: [{ partida: null, kg: n0(v.kg), beneficios: out || [] }] };
}
function trazaDeBeneficios(lista) {
  // lista: [{ b, kg }] → resumen de origen, cosecha, manejo, sanidad y clima
  const porLote = new Map(); const regs = []; const recolectores = new Map();
  lista.forEach(({ b, kg }) => { const fr = n0(b.kgSalida) ? kg / n0(b.kgSalida) : 0; porLote.set(b.loteId, (porLote.get(b.loteId) || 0) + kg);
    registrosDeBeneficio(b).forEach(r => { regs.push({ r, fr }); const k = r.recolector || nombreTrabajador(r.trabajadorId); recolectores.set(k, (recolectores.get(k) || 0) + n0(r.kg) * fr); }); });
  const fechasCos = regs.map(x => x.r.fecha).sort(); const ini = fechasCos[0] || (lista[0] && lista[0].b.fecha), fin = fechasCos[fechasCos.length - 1] || ini;
  const lotesInfo = [...porLote.entries()].map(([id, kg]) => { const l = lotes.find(x => x.id === id) || { id, nombre: '—' }; const g = geomLote(l); const f = fincas.find(x => x.id === l.fincaId) || {};
    const desde = sumarDias(ini || hoyLocal(), -330); const lab = labores.filter(lb => lb.loteId === id && lb.fecha >= desde && lb.fecha <= (fin || hoyLocal())).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const sanidad = ['Broca', 'Roya'].map(t => { const c = campanas(id, t).filter(c => c.fecha <= (fin || hoyLocal()))[0]; return c ? { t, prom: c.prom, fecha: c.fecha } : null; }).filter(Boolean);
    const flor = campanas(id, 'Floración').filter(c => c.fecha <= (ini || hoyLocal()) && c.fecha >= sumarDias(ini || hoyLocal(), -320)).map(c => c.fecha).sort();
    const quim = lab.filter(lb => !/muestreo/i.test(lb.tipo) && /fumigaci|aspersi|herbicid|fungicid|insecticid|plaguicid/i.test(lb.tipo + ' ' + (lb.insumo || '')));
    const ultQ = quim[quim.length - 1]; const carencia = ultQ && ini ? Math.round((parseFecha(ini) - parseFecha(ultQ.fecha)) / 864e5) : null;
    return { l, f, g, kg, lab, sanidad, flor, carencia, ultQ, variedad: nombreVariedad(l.variedadId) }; }).sort((a, b) => b.kg - a.kg);
  const lluvia = ini ? clima.filter(c => c.fecha >= sumarDias(ini, -240) && c.fecha <= fin).reduce((s, c) => s + n0(c.lluvia), 0) : 0;
  return { lotes: lotesInfo, ini, fin, kgCereza: regs.reduce((s, x) => s + n0(x.r.kg) * x.fr, 0), jornadas: regs.length, recolectores: [...recolectores.entries()].sort((a, b) => b[1] - a[1]), lluvia, diasClima: ini ? clima.filter(c => c.fecha >= sumarDias(ini, -240) && c.fecha <= fin).length : 0, beneficios: lista };
}
function nombreTrabajador(id) { return (trabajadores.find(t => t.id === id) || {}).nombre || '—'; }

/* ---- Vista ---- */
function renderComercial() {
  const root = document.getElementById('co-root'); if (!root) return; tooltipsGlobales();
  const an = coSt.anio; const vAn = ventas.filter(v => String(v.fecha).slice(0, 4) === an); const val = vAn.map(valorVenta);
  const kg = vAn.reduce((s, v) => s + n0(v.kg), 0); const neto = val.reduce((s, x) => s + x.neto, 0); const bruto = val.reduce((s, x) => s + x.bruto, 0);
  const cartera = ventas.reduce((s, v) => s + saldoVenta(v), 0); const bodega = beneficios.reduce((s, b) => s + n0(b.kgSalida), 0) - ventas.reduce((s, v) => s + n0(v.kg), 0);
  let ref = 0; try { ref = precioRefCarga().v; } catch (e) {}
  root.innerHTML = `<div class="chip-row"><div class="capas seg">${[['ventas', 'Ventas'], ['partidas', 'Partidas y bodega'], ['traza', 'Trazabilidad'], ['terceros', 'Compradores y proveedores']].map(([k, t]) => `<button class="${coSt.tab === k ? 'on' : ''}" onclick="coSt.tab='${k}';renderComercial()">${t}</button>`).join('')}</div>
    <select onchange="coSt.anio=this.value;renderComercial()" aria-label="Año">${[...new Set(ventas.map(v => String(v.fecha).slice(0, 4)).concat([hoyLocal().slice(0, 4)]))].sort().reverse().map(a => `<option ${a === an ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <div class="mp-actions"><button class="btn ghost small" onclick="abrirPartida()">+ Partida</button><button class="btn primary small" onclick="abrirVenta()">+ Venta</button></div></div>
    <div class="k19-grid">
      ${kpi19('Ventas ' + an, fmtCorto(neto), num(redondear(kg / CARGA, 1)) + ' cargas · ' + vAn.length + ' ventas', '', 'i-venta')}
      ${kpi19('Precio promedio', kg ? fmtCorto(bruto / kg * CARGA) : '—', 'por carga de ' + CARGA + ' kg' + (ref && kg ? ' · ref. ' + fmtCorto(ref) : ''), '', 'i-finanzas')}
      ${kpi19('Por cobrar', fmtCorto(cartera), ventas.filter(v => saldoVenta(v) > 0).length + ' ventas con saldo', cartera > 0 ? 'medio' : 'bien', 'i-cuentas')}
      ${kpi19('Pergamino en bodega', num(redondear(Math.max(0, bodega) / CARGA, 1)) + ' <small>cargas</small>', num(Math.round(Math.max(0, bodega))) + ' kg' + (ref ? ' · ' + fmtCorto(Math.max(0, bodega) / CARGA * ref) : ''), '', 'i-oper')}
      ${kpi19('Partidas abiertas', partidas.filter(p => disponiblePartida(p) > 0.5).length, beneficiosLibres().length + ' beneficios sin partida', beneficiosLibres().length ? 'medio' : '', 'i-plan')}
    </div><div id="co-cuerpo"></div>`;
  ({ ventas: coVentas, partidas: coPartidas, traza: coTraza, terceros: coTerceros })[coSt.tab]();
}
function coVentas() {
  const host = document.getElementById('co-cuerpo'); const vs = ventas.filter(v => String(v.fecha).slice(0, 4) === coSt.anio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const meses = mesesAtras(12, coSt.anio === hoyLocal().slice(0, 4) ? hoyLocal() : coSt.anio + '-12-01'); const porMes = {}, kgMes = {};
  ventas.forEach(v => { const k = String(v.fecha).slice(0, 7); porMes[k] = (porMes[k] || 0) + valorVenta(v).neto; kgMes[k] = (kgMes[k] || 0) + n0(v.kg); });
  host.innerHTML = `<div class="grid g2"><div class="card"><div class="title">Ventas por mes <span class="sub">valor neto y precio promedio por carga</span></div>
      ${gLeyenda([{ color: 'var(--c1)', txt: 'Valor neto' }, { color: 'var(--c2)', txt: 'Precio por carga', linea: true }])}
      ${gCombo({ cats: meses.map(mesCorto), series: [{ nombre: 'Valor neto', vals: meses.map(m => porMes[m] || 0), color: 'var(--c1)', fmtTip: v => fmt(v) }, { nombre: 'Precio por carga', tipo: 'linea', eje: 'der', vals: meses.map(m => kgMes[m] ? Math.round(porMes[m] / kgMes[m] * CARGA) : null), color: 'var(--c2)', fmtTip: v => fmt(v) }], fmt: v => fmtCorto(v), der0: false, alto: 240, titulo: 'Ventas' })}</div>
    <div class="card"><div class="title">Por comprador</div>${(() => { const m = new Map(); vs.forEach(v => { const k = terceroNombre(v.terceroId, v.comprador); const x = m.get(k) || { kg: 0, val: 0 }; x.kg += n0(v.kg); x.val += valorVenta(v).neto; m.set(k, x); }); const tot = [...m.values()].reduce((s, x) => s + x.val, 0) || 1;
      return [...m.entries()].sort((a, b) => b[1].val - a[1].val).map(([k, x]) => `<div class="comp-r" data-tip="${esc(k)}: ${fmt(x.val)} · ${num(redondear(x.kg / CARGA, 1))} cargas · ${fmt(x.val / x.kg * CARGA)} por carga"><div><b>${esc(k)}</b><span>${num(redondear(x.kg / CARGA, 1))} cargas · ${fmtCorto(x.val / x.kg * CARGA)} por carga</span></div><div class="rk-b"><i style="width:${x.val / tot * 100}%;background:var(--c1)"></i></div><b class="mono">${fmtCorto(x.val)}</b></div>`).join('') || '<p class="hint">Sin ventas en el año.</p>'; })()}</div></div>
    <div class="card"><div class="title">Ventas de ${coSt.anio}</div><div class="tscroll"><table class="dtable"><thead><tr><th>Fecha</th><th>Comprador</th><th>Partidas</th><th class="num">Kg</th><th class="num">Precio/carga</th><th class="num">Neto</th><th>Cobro</th><th></th></tr></thead><tbody>
      ${vs.map(v => { const x = valorVenta(v); const sal = saldoVenta(v); return `<tr><td>${v.fecha}${v.documento ? `<br><small style="color:var(--text-faint)">${esc(v.documento)}</small>` : ''}</td><td>${esc(terceroNombre(v.terceroId, v.comprador))}</td><td>${(v.partidas || []).map(p => `<span class="mono" style="font-size:11.5px">${esc((partidas.find(q => q.id === p.partidaId) || {}).codigo || '—')}</span>`).join(' ') || '<small style="color:var(--text-faint)">sin partida</small>'}</td><td class="num">${num(redondear(v.kg, 1))}</td><td class="num">${fmt(n0(v.precio) * CARGA)}</td><td class="num">${fmt(x.neto)}</td>
        <td>${sal > 0.5 ? `<span class="pill ejecucion">Debe ${fmtCorto(sal)}</span>${v.vence ? `<br><small style="color:${v.vence < hoyLocal() ? 'var(--danger)' : 'var(--text-faint)'}">vence ${fechaCorta(v.vence)}</small>` : ''}` : '<span class="pill cerrada">Cobrada</span>'}</td>
        <td class="actions"><button class="btn ghost small" onclick="coSt.tab='traza';coSt.trazaVenta='${v.id}';coSt.trazaPartida=null;renderComercial()">Trazabilidad</button>${sal > 0.5 ? `<button class="btn ghost small" onclick="abrirCobro('${v.id}')">Registrar cobro</button>` : ''}<button class="btn ghost small" onclick="abrirVenta('${v.id}')">Editar</button><button class="btn danger-ghost" onclick="eliminarVenta('${v.id}')">✕</button></td></tr>`; }).join('') || '<tr><td colspan="8" style="color:var(--text-faint)">Sin ventas registradas en el año.</td></tr>'}
    </tbody></table></div></div>`;
}
function coPartidas() {
  const host = document.getElementById('co-cuerpo'); const libres = beneficiosLibres();
  host.innerHTML = `${libres.length ? `<div class="card"><div class="title">Pergamino sin partida <span class="sub">${libres.length} beneficios · ${num(Math.round(libres.reduce((s, b) => s + n0(b.kgSalida), 0)))} kg</span></div><p class="hint" style="margin-top:0">Agrupe los beneficios en partidas (lotes comerciales) para vender con trazabilidad exacta. Puede crearlas a mano o una por semana.</p><div class="mp-btns"><button class="btn primary small" onclick="abrirPartida()">Crear partida</button><button class="btn ghost small" onclick="partidasSemanales()">Una partida por semana</button></div></div>` : ''}
    <div class="card"><div class="title">Partidas</div><div class="tscroll"><table class="dtable"><thead><tr><th>Código</th><th>Fecha</th><th>Origen</th><th>Proceso</th><th class="num">Kg</th><th class="num">Vendido</th><th class="num">Disponible</th><th class="num">Humedad</th><th class="num">Factor</th><th class="num">Taza</th><th></th></tr></thead><tbody>
      ${partidas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(p => { const bs = (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean); const ls = [...new Set(bs.map(b => nombreLote(b.loteId)))]; const disp = disponiblePartida(p);
        return `<tr><td class="mono"><b>${esc(p.codigo)}</b></td><td>${p.fecha}</td><td>${esc(ls.join(', ') || '—')}<br><small style="color:var(--text-faint)">${bs.length} beneficio(s)</small></td><td>${esc(p.proceso || '—')}</td><td class="num">${num(Math.round(kgPartida(p)))}</td><td class="num">${num(Math.round(vendidoDePartida(p.id)))}</td><td class="num">${disp > 0.5 ? `<b>${num(Math.round(disp))}</b>` : '<span class="pill cerrada">Vendida</span>'}</td><td class="num">${p.humedad ? num(p.humedad) + ' %' : '—'}</td><td class="num">${p.factor ? num(p.factor) : '—'}</td><td class="num">${p.taza ? num(p.taza) : '—'}</td>
          <td class="actions"><button class="btn ghost small" onclick="coSt.tab='traza';coSt.trazaPartida='${p.id}';coSt.trazaVenta=null;renderComercial()">Trazabilidad</button><button class="btn ghost small" onclick="abrirPartida('${p.id}')">Editar</button>${vendidoDePartida(p.id) ? '' : `<button class="btn danger-ghost" onclick="eliminarPartida('${p.id}')">✕</button>`}</td></tr>`; }).join('') || '<tr><td colspan="11" style="color:var(--text-faint)">Sin partidas.</td></tr>'}
    </tbody></table></div><p class="hint" style="margin:10px 0 0;">Factor de rendimiento: kilos de pergamino seco que se necesitan para obtener 70 kg de café excelso; entre más bajo, mejor el pago. Humedad ideal para vender: entre 10 y 12 %.</p></div>`;
}
function abrirPartida(id) {
  const p = id ? clonar(partidas.find(x => x.id === id)) : { fecha: hoyLocal(), proceso: 'Lavado', tipo: 'Pergamino seco', beneficioIds: [] };
  const opciones = beneficios.filter(b => !partidas.some(q => q.id !== p.id && (q.beneficioIds || []).includes(b.id))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  openModal(`<h3>${id ? 'Editar partida ' + esc(p.codigo) : 'Nueva partida'}</h3><p class="hint">Una partida es el café que se vende junto: reúne uno o varios beneficios y conserva su origen.</p>
    <div class="fgrid c4"><label class="f">Código<input id="pa-cod" value="${esc(p.codigo || siguienteCodigoPartida(p.fecha))}"></label><label class="f">Fecha<input id="pa-fecha" type="date" value="${p.fecha}"></label>
      <label class="f">Tipo de café<select id="pa-tipo">${['Pergamino seco', 'Pasilla', 'Café especial', 'Cereza'].map(t => `<option ${p.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="f">Proceso<select id="pa-proc">${['Lavado', 'Honey', 'Natural', 'Fermentación controlada'].map(t => `<option ${p.proceso === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Humedad (%)<input id="pa-hum" type="number" step="0.1" value="${p.humedad || ''}"></label><label class="f">Factor de rendimiento<input id="pa-fac" type="number" step="0.1" value="${p.factor || ''}" placeholder="ej. 92"></label><label class="f">Puntaje de taza (SCA)<input id="pa-taza" type="number" step="0.25" value="${p.taza || ''}"></label><label class="f">Notas de taza<input id="pa-notas" value="${esc(p.notas || '')}"></label></div>
    <div class="sec-label">Beneficios incluidos</div>
    <div class="tscroll" style="max-height:260px"><table class="dtable"><thead><tr><th></th><th>Fecha</th><th>Lote</th><th>Método</th><th class="num">Kg pergamino</th></tr></thead><tbody>${opciones.map(b => `<tr><td><input type="checkbox" class="pa-b" value="${b.id}" ${p.beneficioIds.includes(b.id) ? 'checked' : ''} onchange="sumaPartida()"></td><td>${b.fecha}</td><td>${esc(nombreLote(b.loteId))}</td><td>${esc(b.metodo || '')}</td><td class="num">${num(redondear(b.kgSalida, 1))}</td></tr>`).join('') || '<tr><td colspan="5">No hay beneficios disponibles.</td></tr>'}</tbody></table></div>
    <div class="budget-box" id="pa-sum" style="margin-top:12px"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarPartida('${id || ''}')">Guardar</button></div>`, true);
  sumaPartida();
}
function sumaPartida() { const ids = [...document.querySelectorAll('.pa-b:checked')].map(e => e.value); const bs = ids.map(id => beneficios.find(b => b.id === id)); const kg = bs.reduce((s, b) => s + n0(b.kgSalida), 0); const cer = bs.reduce((s, b) => s + n0(b.kgEntrada), 0);
  document.getElementById('pa-sum').innerHTML = `<div><div class="n">${ids.length}</div><div class="l">Beneficios</div></div><div><div class="n">${num(Math.round(kg))} kg</div><div class="l">Pergamino seco</div></div><div><div class="n">${num(redondear(kg / CARGA, 2))}</div><div class="l">Cargas</div></div><div class="total"><div class="n">${cer && kg ? num(redondear(cer / kg, 2)) : '—'}</div><div class="l">Kg cereza por kg</div></div>`; }
function guardarPartida(id) {
  const g = k => document.getElementById(k).value; const ids = [...document.querySelectorAll('.pa-b:checked')].map(e => e.value); if (!ids.length) { alert('Elija al menos un beneficio.'); return; }
  const p = id ? partidas.find(x => x.id === id) : { id: uid('pt') }; const vendido = id ? vendidoDePartida(id) : 0;
  const kg = ids.reduce((s, x) => s + n0((beneficios.find(b => b.id === x) || {}).kgSalida), 0); if (kg + 0.5 < vendido) { alert('La partida ya tiene ' + num(Math.round(vendido)) + ' kg vendidos; no puede quedar con menos.'); return; }
  Object.assign(p, { codigo: g('pa-cod').trim() || siguienteCodigoPartida(g('pa-fecha')), fecha: g('pa-fecha'), tipo: g('pa-tipo'), proceso: g('pa-proc'), humedad: n0(g('pa-hum')) || null, factor: n0(g('pa-fac')) || null, taza: n0(g('pa-taza')) || null, notas: g('pa-notas').trim(), beneficioIds: ids, kg: null,
    fincaId: (lotes.find(l => l.id === (beneficios.find(b => b.id === ids[0]) || {}).loteId) || {}).fincaId || '' });
  if (!id) partidas.push(p); closeModal(); guardarEstado(); renderComercial(); toast('Partida ' + p.codigo + ' guardada · ' + num(Math.round(kg)) + ' kg');
}
function eliminarPartida(id) { conDeshacer('Partida eliminada', () => { partidas = partidas.filter(p => p.id !== id); guardarEstado(); renderComercial(); }); }
function partidasSemanales() { const lib = beneficiosLibres(); const grupos = new Map(); lib.forEach(b => { const k = lunesDe(b.fecha); (grupos.get(k) || grupos.set(k, []).get(k)).push(b); });
  [...grupos.entries()].sort().forEach(([k, bs]) => partidas.push({ id: uid('pt'), codigo: siguienteCodigoPartida(bs[bs.length - 1].fecha), fecha: bs[bs.length - 1].fecha, tipo: 'Pergamino seco', proceso: bs[0].metodo || 'Lavado', beneficioIds: bs.map(b => b.id), kg: null, fincaId: (lotes.find(l => l.id === bs[0].loteId) || {}).fincaId || '' }));
  guardarEstado(); renderComercial(); toast(grupos.size + ' partidas creadas'); }

/* ---- Ventas ---- */
function abrirVenta(id) {
  const v = id ? clonar(ventas.find(x => x.id === id)) : { fecha: hoyLocal(), tipo: 'Pergamino seco', partidas: [], formaPago: 'Contado', cuenta: 'Caja', retencionPct: n0(contaConfig.retencionVentaPct) };
  const disp = partidas.map(p => ({ p, disp: disponiblePartida(p) + ((v.partidas || []).find(x => x.partidaId === p.id) || { kg: 0 }).kg })).filter(x => x.disp > 0.5);
  window._vDraft = v; let ref = 0; try { ref = precioRefCarga().v; } catch (e) {}
  openModal(`<h3>${id ? 'Editar venta' : 'Registrar venta'}</h3>
    <div class="fgrid c4"><label class="f">Fecha<input id="vt-fecha" type="date" value="${v.fecha}"></label>
      <label class="f">Comprador<select id="vt-ter"><option value="">— Escriba abajo o elija —</option>${terceros.filter(t => t.tipo !== 'Proveedor').map(t => `<option value="${t.id}" ${t.id === v.terceroId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></label>
      <label class="f">Comprador nuevo<input id="vt-comp" value="${esc(v.terceroId ? '' : (v.comprador || ''))}" placeholder="Cooperativa, trilladora…"></label><label class="f">Documento o liquidación<input id="vt-doc" value="${esc(v.documento || '')}"></label></div>
    <div class="sec-label">Café vendido</div>
    ${disp.length ? `<div class="tscroll" style="max-height:220px"><table class="dtable"><thead><tr><th>Partida</th><th>Origen</th><th class="num">Disponible</th><th class="num">Kg a vender</th></tr></thead><tbody>${disp.map(x => { const ya = (v.partidas || []).find(q => q.partidaId === x.p.id); const ls = [...new Set((x.p.beneficioIds || []).map(id => nombreLote((beneficios.find(b => b.id === id) || {}).loteId)))]; return `<tr><td class="mono"><b>${esc(x.p.codigo)}</b></td><td>${esc(ls.join(', '))}</td><td class="num">${num(Math.round(x.disp))} kg</td><td class="num"><input type="number" step="0.1" min="0" max="${redondear(x.disp, 1)}" class="vt-pk" data-p="${x.p.id}" value="${ya ? ya.kg : ''}" oninput="totVenta()" style="width:110px;text-align:right"></td></tr>`; }).join('')}</tbody></table></div>`
      : '<p class="hint">No hay partidas con saldo. Puede registrar los kilos directamente; la trazabilidad se estimará con los beneficios más antiguos.</p>'}
    <div class="fgrid c4" style="margin-top:10px"><label class="f">Kg vendidos<input id="vt-kg" type="number" step="0.1" value="${v.kg || ''}" oninput="totVenta()" ${disp.length ? 'placeholder="suma de las partidas"' : ''}></label>
      <label class="f">Precio por carga de 125 kg<input id="vt-pc" type="number" value="${v.precio ? Math.round(n0(v.precio) * CARGA) : (ref || '')}" oninput="totVenta()"></label>
      <label class="f">Bonificaciones ($)<input id="vt-bon" type="number" value="${v.bonificacion || ''}" oninput="totVenta()" placeholder="calidad, certificación"></label><label class="f">Descuentos ($)<input id="vt-des" type="number" value="${v.descuentos || ''}" oninput="totVenta()" placeholder="humedad, transporte"></label>
      <label class="f">Retención en la fuente (%)<input id="vt-ret" type="number" step="0.1" value="${v.retencionPct != null ? v.retencionPct : (v.retencion && v.kg ? redondear(v.retencion / (n0(v.kg) * n0(v.precio)) * 100, 2) : 0)}" oninput="totVenta()"></label>
      <label class="f">Forma de pago<select id="vt-fp" onchange="totVenta()">${['Contado', 'Crédito'].map(t => `<option ${v.formaPago === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Recibido en<select id="vt-cta">${['Caja', 'Banco'].map(t => `<option ${v.cuenta === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="f">Vence (si es crédito)<input id="vt-vence" type="date" value="${v.vence || ''}"></label>
      <label class="f">Factor de rendimiento<input id="vt-fac" type="number" step="0.1" value="${v.factor || ''}"></label></div>
    <div class="budget-box" id="vt-tot" style="margin-top:12px"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarVenta('${id || ''}')">Guardar venta</button></div>`, true);
  totVenta();
}
function leerVenta() { const g = k => document.getElementById(k).value; const pk = [...document.querySelectorAll('.vt-pk')].map(e => ({ partidaId: e.dataset.p, kg: n0(e.value) })).filter(x => x.kg > 0);
  const kgP = pk.reduce((s, x) => s + x.kg, 0); const kg = pk.length ? kgP : n0(g('vt-kg')); const precio = n0(g('vt-pc')) / CARGA; const bruto = kg * precio; const retPct = n0(g('vt-ret'));
  return { fecha: g('vt-fecha'), terceroId: g('vt-ter') || null, comprador: g('vt-ter') ? terceroNombre(g('vt-ter')) : g('vt-comp').trim(), documento: g('vt-doc').trim(), partidas: pk, kg, precio, bonificacion: n0(g('vt-bon')), descuentos: n0(g('vt-des')), retencionPct: retPct, retencion: Math.round(bruto * retPct / 100), formaPago: g('vt-fp'), cuenta: g('vt-cta'), vence: g('vt-vence') || null, factor: n0(g('vt-fac')) || null }; }
function totVenta() { const v = leerVenta(); if (document.querySelectorAll('.vt-pk').length) { const e = document.getElementById('vt-kg'); if ([...document.querySelectorAll('.vt-pk')].some(x => x.value)) { e.value = redondear(v.kg, 1); e.disabled = true; } else e.disabled = false; }
  const x = valorVenta(Object.assign({}, v, { cobros: [] })); document.getElementById('vt-tot').innerHTML = `<div><div class="n">${num(redondear(v.kg / CARGA, 2))}</div><div class="l">Cargas</div></div><div><div class="n">${fmt(x.bruto)}</div><div class="l">Valor bruto</div></div><div><div class="n">${fmt(v.retencion)}</div><div class="l">Retención</div></div><div class="total"><div class="n">${fmt(x.neto)}</div><div class="l">${v.formaPago === 'Crédito' ? 'Por cobrar' : 'Neto recibido'}</div></div>`; }
function guardarVenta(id) {
  const d = leerVenta(); if (!d.fecha || !d.kg || !d.precio) { alert('Indique fecha, kilos y precio.'); return; } if (!d.comprador) { alert('Indique el comprador.'); return; }
  for (const x of d.partidas) { const p = partidas.find(q => q.id === x.partidaId); const ya = id ? ((ventas.find(v => v.id === id) || {}).partidas || []).find(q => q.partidaId === p.id) : null; if (x.kg > disponiblePartida(p) + (ya ? ya.kg : 0) + 0.05) { alert('La partida ' + p.codigo + ' no tiene tantos kilos disponibles.'); return; } }
  if (!d.terceroId && d.comprador) { let t = terceros.find(x => x.nombre.toLowerCase() === d.comprador.toLowerCase()); if (!t) { t = { id: uid('te'), nombre: d.comprador, tipo: 'Cliente' }; terceros.push(t); } d.terceroId = t.id; }
  if (id) { const v = ventas.find(x => x.id === id); Object.assign(v, d); } else { const v = Object.assign({ id: uid('vt'), cobros: [] }, d); if (v.formaPago !== 'Crédito') v.cobros = [{ fecha: v.fecha, valor: valorVenta(Object.assign({}, v, { cobros: [] })).neto, cuenta: v.cuenta }]; v.formaPago = d.formaPago; ventas.push(v); }
  closeModal(); guardarEstado(); renderComercial(); toast('Venta guardada: ' + num(redondear(d.kg / CARGA, 2)) + ' cargas a ' + fmt(d.precio * CARGA));
}
function eliminarVenta(id) { conDeshacer('Venta eliminada', () => { ventas = ventas.filter(v => v.id !== id); guardarEstado(); renderComercial(); }); }
function abrirCobro(id) { const v = ventas.find(x => x.id === id); const sal = saldoVenta(v);
  openModal(`<h3>Registrar cobro</h3><p class="hint">${esc(terceroNombre(v.terceroId, v.comprador))} · venta del ${fechaCorta(v.fecha)} · saldo ${fmt(sal)}</p><div class="fgrid c3"><label class="f">Fecha<input id="cb-f" type="date" value="${hoyLocal()}"></label><label class="f">Valor<input id="cb-v" type="number" value="${Math.round(sal)}"></label><label class="f">Recibido en<select id="cb-c"><option>Banco</option><option>Caja</option></select></label></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarCobro('${id}')">Guardar</button></div>`); }
function guardarCobro(id) { const v = ventas.find(x => x.id === id); const val = n0(document.getElementById('cb-v').value); if (!val) return; v.cobros = v.cobros || []; v.cobros.push({ fecha: document.getElementById('cb-f').value, valor: val, cuenta: document.getElementById('cb-c').value }); closeModal(); guardarEstado(); renderComercial(); toast('Cobro registrado'); }

/* ---- Trazabilidad ---- */
function coTraza() {
  const host = document.getElementById('co-cuerpo'); const vs = ventas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!coSt.trazaVenta && !coSt.trazaPartida && vs[0]) coSt.trazaVenta = vs[0].id;
  const sel = `<div class="chip-row"><select onchange="const [t,i]=this.value.split(':');coSt.trazaVenta=t==='v'?i:null;coSt.trazaPartida=t==='p'?i:null;renderComercial()" aria-label="Venta o partida">${vs.map(v => `<option value="v:${v.id}" ${coSt.trazaVenta === v.id ? 'selected' : ''}>Venta ${v.fecha} · ${esc(terceroNombre(v.terceroId, v.comprador))} · ${num(Math.round(v.kg))} kg</option>`).join('')}${partidas.map(p => `<option value="p:${p.id}" ${coSt.trazaPartida === p.id ? 'selected' : ''}>Partida ${esc(p.codigo)} · ${num(Math.round(kgPartida(p)))} kg</option>`).join('')}</select></div>`;
  let titulo = '', lista = [], exacto = true, cab = '';
  if (coSt.trazaVenta) { const v = ventas.find(x => x.id === coSt.trazaVenta); if (!v) { host.innerHTML = sel; return; } const o = origenVenta(v); exacto = o.exacto; o.partes.forEach(p => p.beneficios.forEach(b => lista.push(b)));
    const x = valorVenta(v); titulo = 'Venta del ' + fechaCorta(v.fecha) + ' ' + v.fecha.slice(0, 4);
    cab = `<div class="tz-cab"><div><span>Comprador</span><b>${esc(terceroNombre(v.terceroId, v.comprador))}</b></div><div><span>Cantidad</span><b>${num(redondear(v.kg, 1))} kg · ${num(redondear(v.kg / CARGA, 2))} cargas</b></div><div><span>Valor neto</span><b>${fmt(x.neto)}</b></div><div><span>Partidas</span><b>${o.exacto ? o.partes.map(p => esc(p.partida.codigo)).join(', ') : 'estimadas por antigüedad'}</b></div><div><span>Código de trazabilidad</span><b class="mono">${trazaCodigo(v)}</b></div></div>`; }
  else { const p = partidas.find(x => x.id === coSt.trazaPartida); if (!p) { host.innerHTML = sel; return; } lista = (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean).map(b => ({ b, kg: n0(b.kgSalida) })); titulo = 'Partida ' + p.codigo;
    cab = `<div class="tz-cab"><div><span>Partida</span><b class="mono">${esc(p.codigo)}</b></div><div><span>Café</span><b>${esc(p.tipo || '')} · ${esc(p.proceso || '')}</b></div><div><span>Kilos</span><b>${num(Math.round(kgPartida(p)))} kg · disponible ${num(Math.round(disponiblePartida(p)))}</b></div><div><span>Calidad</span><b>${p.humedad ? 'Humedad ' + num(p.humedad) + ' %' : ''}${p.factor ? ' · factor ' + num(p.factor) : ''}${p.taza ? ' · taza ' + num(p.taza) : ''}${!p.humedad && !p.factor && !p.taza ? '—' : ''}</b></div></div>`; }
  const t = trazaDeBeneficios(lista); const totKg = lista.reduce((s, x) => s + x.kg, 0) || 1;
  const hitos = []; t.lotes.forEach(li => li.flor.forEach(f => hitos.push({ f, t: 'Floración', d: li.l.nombre, c: 'var(--c4)' }))); t.lotes.forEach(li => li.lab.filter(lb => !/muestreo/i.test(lb.tipo) && /fertiliz|encalado|fumig|aspersi|repase|soqueo|poda/i.test(lb.tipo)).forEach(lb => hitos.push({ f: lb.fecha, t: lb.tipo, d: li.l.nombre + (lb.insumo ? ' · ' + lb.insumo : ''), c: 'var(--c3)' })));
  if (t.ini) hitos.push({ f: t.ini, t: 'Inicio de la cosecha', d: num(Math.round(t.kgCereza)) + ' kg de cereza atribuidos', c: 'var(--cereza)' });
  lista.forEach(x => hitos.push({ f: x.b.fecha, t: 'Beneficio · ' + (x.b.metodo || ''), d: nombreLote(x.b.loteId) + ' · ' + num(Math.round(x.kg)) + ' kg', c: 'var(--c1)' }));
  if (coSt.trazaVenta) { const v = ventas.find(x => x.id === coSt.trazaVenta); hitos.push({ f: v.fecha, t: 'Venta', d: terceroNombre(v.terceroId, v.comprador), c: 'var(--accent)' }); }
  hitos.sort((a, b) => a.f.localeCompare(b.f));
  host.innerHTML = sel + `<div class="card tz"><div class="title">${esc(titulo)} <span class="sub">${exacto ? 'trazabilidad exacta por partida' : 'sin partida: origen estimado con los beneficios más antiguos disponibles'}</span></div>${cab}
    <div class="grid g2" style="margin-top:14px">
      <div><div class="sec-label" style="margin-top:0">Origen</div>
        ${t.lotes.map(li => `<div class="tz-lote"><div class="tz-mini">${miniLoteSVG(li.l)}</div><div><b>${esc(li.l.nombre)}</b> · ${esc(li.f.nombre || '')}${li.f.municipio ? ', ' + esc(li.f.municipio) : ''}${li.f.departamento ? ' (' + esc(li.f.departamento) + ')' : ''}<br><small>${num(Math.round(li.kg / totKg * 100))} % del café · ${esc(li.variedad)} · ${li.g ? num(Math.round(li.g.zmin)) + '–' + num(Math.round(li.g.zmax)) + ' msnm · ' + num(redondear(li.g.ha, 2)) + ' ha' + (li.g.esquematico ? ' (forma esquemática)' : ' · polígono georreferenciado') : ''}</small>
          ${li.sanidad.length ? `<br><small>Sanidad antes de cosecha: ${li.sanidad.map(s => s.t + ' ' + num(redondear(s.prom, 1)) + ' %').join(' · ')}</small>` : ''}
          ${li.carencia != null ? `<br><small style="color:${li.carencia < n0(contaConfig.diasCarencia || 30) ? 'var(--danger)' : 'var(--text-faint)'}">Última aplicación fitosanitaria ${li.carencia} días antes de cosechar (${esc(li.ultQ.tipo)})</small>` : ''}</div></div>`).join('') || '<p class="hint">Sin beneficios asociados.</p>'}
        <div class="sec-label">Cosecha y beneficio</div>
        <div class="kv"><span>Periodo de recolección</span><b>${t.ini ? fechaCorta(t.ini) + ' a ' + fechaCorta(t.fin) + ' ' + t.fin.slice(0, 4) : '—'}</b></div>
        <div class="kv"><span>Cereza atribuida</span><b>${num(Math.round(t.kgCereza))} kg · ${t.jornadas} jornadas</b></div>
        <div class="kv"><span>Recolectores</span><b>${t.recolectores.length}</b></div>
        <div class="kv"><span>Beneficios</span><b>${lista.length} · ${[...new Set(lista.map(x => x.b.metodo))].filter(Boolean).join(', ')}</b></div>
        <div class="kv"><span>Lluvia en el ciclo (8 meses)</span><b>${t.diasClima ? num(Math.round(t.lluvia)) + ' mm' : 'sin registros'}</b></div>
      </div>
      <div><div class="sec-label" style="margin-top:0">Línea de tiempo</div><div class="tz-linea">${hitos.slice(-18).map(h => `<div class="tz-h"><i style="background:${h.c}"></i><span class="mono">${fechaCorta(h.f)} ${h.f.slice(2, 4)}</span><b>${esc(h.t)}</b><small>${esc(h.d)}</small></div>`).join('')}</div></div>
    </div>
    <div class="sec-label">Manejo del cultivo en los 11 meses previos <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--text-faint)">· además ${t.lotes.reduce((s, li) => s + li.lab.filter(lb => /muestreo/i.test(lb.tipo)).length, 0)} monitoreos de broca y roya</span></div>
    <div class="tscroll"><table class="dtable"><thead><tr><th>Fecha</th><th>Lote</th><th>Labor</th><th>Insumos</th><th>Responsable</th></tr></thead><tbody>${t.lotes.flatMap(li => li.lab.filter(lb => !/muestreo/i.test(lb.tipo)).map(lb => ({ lb, l: li.l }))).sort((a, b) => a.lb.fecha.localeCompare(b.lb.fecha)).map(({ lb, l }) => `<tr><td>${lb.fecha}</td><td>${esc(l.nombre)}</td><td>${esc(lb.tipo)}${lb.otNumero ? ' <span class="mono" style="font-size:10.5px;color:var(--text-faint)">' + esc(lb.otNumero) + '</span>' : ''}</td><td>${esc(lb.insumo || '—')}${lb.cantidad ? ' (' + esc(lb.cantidad) + ')' : ''}</td><td>${esc(lb.responsable || '—')}</td></tr>`).join('') || '<tr><td colspan="5" style="color:var(--text-faint)">Sin labores registradas en ese periodo.</td></tr>'}</tbody></table></div>
    <div class="mp-btns"><button class="btn primary small" onclick="fichaTrazaPDF()">Ficha de trazabilidad (PDF)</button><button class="btn ghost small" onclick="geojsonOrigen()">Polígonos de origen (GeoJSON)</button></div>
    <p class="hint" style="margin:10px 0 0;">La cosecha de cada beneficio se atribuye por fechas: los registros del mismo lote desde el beneficio anterior. Los polígonos con coordenadas sirven para los requisitos de geolocalización que piden algunos compradores, como el reglamento europeo contra la deforestación.</p></div>`;
  window._traza = { titulo, t, lista, cab: coSt.trazaVenta ? ventas.find(x => x.id === coSt.trazaVenta) : partidas.find(x => x.id === coSt.trazaPartida), esVenta: !!coSt.trazaVenta };
}
function trazaCodigo(v) { return 'SO-' + String(v.fecha).replace(/-/g, '').slice(2) + '-' + (hashTxt(v.id) % 46656).toString(36).toUpperCase().padStart(3, '0'); }
function miniLoteSVG(l) { const g = geomLote(l); if (!g) return ''; const b = g.caja; const s = 44 / Math.max(b.x1 - b.x0, b.y1 - b.y0); const pts = g.poly.map(p => ((p[0] - b.x0) * s + 2).toFixed(1) + ',' + ((b.y1 - p[1]) * s + 2).toFixed(1)).join(' '); return `<svg viewBox="0 0 48 48" width="48" height="48"><polygon points="${pts}" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5"/></svg>`; }
function geojsonOrigen() {
  const T = window._traza; if (!T) return; const feats = T.t.lotes.map(li => { const f = li.f; const g = li.g; if (!g) return null; const ref = f.geoRef;
    const coords = g.poly.map(p => ref ? (([la, lo]) => [redondear(lo, 7), redondear(la, 7)])(desproyectar(p[0], p[1], ref)) : [redondear(p[0], 2), redondear(p[1], 2)]); coords.push(coords[0]);
    return { type: 'Feature', properties: { finca: f.nombre, lote: li.l.nombre, area_ha: redondear(g.ha, 4), variedad: li.variedad, participacion_pct: redondear(li.kg / (T.lista.reduce((s, x) => s + x.kg, 0) || 1) * 100, 1), coordenadas: ref ? 'WGS84' : 'locales en metros (sin georreferencia)', forma: g.esquematico ? 'esquemática' : 'medida' }, geometry: { type: 'Polygon', coordinates: [coords] } }; }).filter(Boolean);
  ofrecerDescarga('origen-' + T.titulo.replace(/\s+/g, '-').toLowerCase() + '.geojson', new Blob([JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1)], { type: 'application/geo+json' }));
}
function fichaTrazaPDF() {
  const T = window._traza; if (!T || !window.jspdf) { alert('No se pudo generar el PDF.'); return; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const L = 16, R = 194; let y = 18; const t = T.t;
  const linea = (a, b) => { if (y > 280) { doc.addPage(); y = 18; } doc.setFont('helvetica', 'normal'); doc.setTextColor(110); doc.text(pdfT(a), L, y); doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.text(pdfT(b), R, y, { align: 'right' }); y += 6; };
  const tit = s => { if (y > 270) { doc.addPage(); y = 18; } y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 107, 69); doc.text(pdfT(s).toUpperCase(), L, y); doc.setTextColor(0); y += 2; doc.setDrawColor(200); doc.line(L, y, R, y); y += 6; doc.setFontSize(10); };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(pdfT('Ficha de trazabilidad'), L, y); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(pdfT(T.titulo), R, y, { align: 'right' }); y += 9;
  if (T.esVenta) { const v = T.cab; const x = valorVenta(v); tit('Venta'); linea('Comprador', terceroNombre(v.terceroId, v.comprador)); linea('Fecha', v.fecha); linea('Cantidad', num(redondear(v.kg, 1)) + ' kg (' + num(redondear(v.kg / CARGA, 2)) + ' cargas)'); linea('Código', trazaCodigo(v)); if (v.documento) linea('Documento', v.documento); }
  else { const p = T.cab; tit('Partida'); linea('Código', p.codigo); linea('Café', (p.tipo || '') + ' - ' + (p.proceso || '')); linea('Kilos', num(Math.round(kgPartida(p)))); if (p.humedad) linea('Humedad', num(p.humedad) + ' %'); if (p.factor) linea('Factor de rendimiento', num(p.factor)); if (p.taza) linea('Puntaje de taza', num(p.taza)); }
  tit('Origen'); const tot = T.lista.reduce((s, x) => s + x.kg, 0) || 1;
  t.lotes.forEach(li => { linea(li.l.nombre + ' - ' + (li.f.nombre || ''), num(Math.round(li.kg / tot * 100)) + ' %'); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(110);
    const ref = li.f.geoRef; const c = li.g ? centroidePol(li.g.poly) : null; const ll = c && ref ? desproyectar(c[0], c[1], ref) : null;
    doc.text(pdfT([li.variedad, li.g ? num(Math.round(li.g.zmin)) + '-' + num(Math.round(li.g.zmax)) + ' msnm' : '', li.g ? num(redondear(li.g.ha, 2)) + ' ha' : '', ll ? 'centro ' + ll[0].toFixed(5) + ', ' + ll[1].toFixed(5) : '', [li.f.vereda, li.f.municipio, li.f.departamento].filter(Boolean).join(', ')].filter(Boolean).join(' - ')), L + 4, y - 1.5); doc.setFontSize(10); doc.setTextColor(0); y += 4; });
  tit('Cosecha y beneficio'); linea('Recolección', t.ini ? t.ini + ' a ' + t.fin : '-'); linea('Cereza atribuida', num(Math.round(t.kgCereza)) + ' kg en ' + t.jornadas + ' jornadas'); linea('Recolectores', String(t.recolectores.length)); T.lista.forEach(x => linea('Beneficio ' + x.b.fecha + ' - ' + nombreLote(x.b.loteId), (x.b.metodo || '') + ' - ' + num(Math.round(x.kg)) + ' kg'));
  tit('Manejo del cultivo (11 meses previos)'); doc.setFontSize(8.5); t.lotes.flatMap(li => li.lab.map(lb => ({ lb, l: li.l }))).sort((a, b) => a.lb.fecha.localeCompare(b.lb.fecha)).forEach(({ lb, l }) => { if (y > 282) { doc.addPage(); y = 18; } doc.text(pdfT(lb.fecha + '  ' + l.nombre + '  ' + lb.tipo + (lb.insumo ? '  (' + lb.insumo + (lb.cantidad ? ' ' + lb.cantidad : '') + ')' : '')), L, y); y += 4.6; }); doc.setFontSize(10);
  t.lotes.forEach(li => { if (li.carencia != null) linea('Última aplicación fitosanitaria en ' + li.l.nombre, li.carencia + ' días antes de cosechar'); });
  doc.setTextColor(150); doc.setFontSize(7.5); doc.text(pdfT('State Origen - ficha generada el ' + hoyLocal() + '. La cosecha se atribuye a cada beneficio por fechas de registro del mismo lote.'), L, 290);
  ofrecerDescarga('trazabilidad-' + pdfT(T.titulo).replace(/\s+/g, '-').toLowerCase() + '.pdf', doc.output('blob'));
}

/* ---- Terceros ---- */
function coTerceros() {
  const host = document.getElementById('co-cuerpo');
  host.innerHTML = `<div class="card"><div class="title">Compradores y proveedores <span class="sub">se usan en ventas, compras y cuentas por cobrar y pagar</span></div><div class="tscroll"><table class="dtable"><thead><tr><th>Nombre</th><th>Tipo</th><th>NIT o cédula</th><th>Contacto</th><th class="num">Ventas</th><th class="num">Compras</th><th class="num">Saldo</th><th></th></tr></thead><tbody>
    ${terceros.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => { const vs = ventas.filter(v => v.terceroId === t.id); const cs = movimientos.filter(m => m.terceroId === t.id && m.tipo === 'compra'); const sal = vs.reduce((s, v) => s + saldoVenta(v), 0) - (typeof saldoMovimiento === 'function' ? cs.reduce((s, m) => s + saldoMovimiento(m), 0) : 0);
      return `<tr><td><b>${esc(t.nombre)}</b></td><td>${esc(t.tipo || '—')}</td><td>${esc(t.nit || '—')}</td><td>${esc([t.telefono, t.ciudad].filter(Boolean).join(' · ') || '—')}</td><td class="num">${fmt(vs.reduce((s, v) => s + valorVenta(v).neto, 0))}</td><td class="num">${fmt(cs.reduce((s, m) => s + n0(m.valor), 0))}</td><td class="num ${sal < 0 ? 'neg' : ''}">${fmt(sal)}</td><td class="actions"><button class="btn ghost small" onclick="abrirTercero('${t.id}')">Editar</button></td></tr>`; }).join('') || '<tr><td colspan="8" style="color:var(--text-faint)">Sin terceros.</td></tr>'}
  </tbody></table></div><div class="mp-btns"><button class="btn primary small" onclick="abrirTercero()">+ Tercero</button></div></div>`;
}
function abrirTercero(id) { const t = id ? terceros.find(x => x.id === id) : { tipo: 'Cliente' };
  openModal(`<h3>${id ? 'Editar' : 'Nuevo'} tercero</h3><div class="fgrid c3"><label class="f">Nombre o razón social<input id="te-n" value="${esc(t.nombre || '')}"></label><label class="f">Tipo<select id="te-t">${['Cliente', 'Proveedor', 'Cliente y proveedor', 'Entidad financiera', 'Otro'].map(x => `<option ${t.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="f">NIT o cédula<input id="te-nit" value="${esc(t.nit || '')}"></label><label class="f">Teléfono<input id="te-tel" value="${esc(t.telefono || '')}"></label><label class="f">Ciudad<input id="te-c" value="${esc(t.ciudad || '')}"></label><label class="f">Correo<input id="te-e" value="${esc(t.correo || '')}"></label></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarTercero('${id || ''}')">Guardar</button></div>`, true); }
function guardarTercero(id) { const g = k => document.getElementById(k).value.trim(); if (!g('te-n')) { alert('Escriba el nombre.'); return; } const t = id ? terceros.find(x => x.id === id) : { id: uid('te') }; Object.assign(t, { nombre: g('te-n'), tipo: g('te-t'), nit: g('te-nit'), telefono: g('te-tel'), ciudad: g('te-c'), correo: g('te-e') }); if (!id) terceros.push(t); closeModal(); guardarEstado(); if (document.getElementById('view-comercial').classList.contains('active')) renderComercial(); else renderFinanzas(); toast('Tercero guardado'); }
