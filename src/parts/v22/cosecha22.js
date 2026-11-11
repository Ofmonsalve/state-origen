/* ================= v22 · Cosecha: pesadas completas, pases, productividad con estándares, pestañas ================= */

/* ---------- Pesada: kilos de mañana y tarde, condición del día, % de verdes y observación ---------- */
const CONDICIONES = ['Normal', 'Graneo (poca carga)', 'Lote difícil o pendiente', 'Lluvia'];
CAMPOS_REG.push(['kgManana', 'Kg mañana'], ['kgTarde', 'Kg tarde'], ['condicion', 'Condición'], ['verdes', '% verdes'], ['obs', 'Observación']);
BLOQ_PAGO.push('kgManana', 'kgTarde'); BLOQ_BEN.push('kgManana', 'kgTarde');
const _formRegistro21 = formRegistro;
formRegistro = function (r, dia) {
  const h = _formRegistro21(r, dia); const marca = '<label class="f" style="margin-top:12px">Motivo del cambio';
  const extra = `<div class="fgrid c2" style="margin-top:10px">${dia ? '' : `
      <label class="f">Kg mañana (opcional)<input id="er-kgm" type="number" min="0" step="0.1" value="${r.kgManana != null ? esc(r.kgManana) : ''}" oninput="sumaMT22()"></label>
      <label class="f">Kg tarde (opcional)<input id="er-kgt" type="number" min="0" step="0.1" value="${r.kgTarde != null ? esc(r.kgTarde) : ''}" oninput="sumaMT22()"></label>`}
      <label class="f">Condición del día<select id="er-cond">${CONDICIONES.map(c => `<option ${c === (r.condicion || 'Normal') ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="f">% de verdes (muestra)<input id="er-verdes" type="number" min="0" max="100" step="0.1" value="${r.verdes != null ? esc(r.verdes) : ''}" placeholder="Tolerancia ${num(tolVerdes())} %"></label>
      ${dia ? '' : `<label class="f" style="grid-column:1/-1">Observación<input id="er-obs" value="${esc(r.obs || '')}" placeholder="Ej. llegó tarde, cereza con pasilla"></label>`}</div>`;
  return h.replace(marca, extra + marca);
};
function sumaMT22() { const m = document.getElementById('er-kgm'), t = document.getElementById('er-kgt'), k = document.getElementById('er-kg'); if (!m || !t || !k) return; if (m.value !== '' || t.value !== '') { k.value = redondear(n0(m.value) + n0(t.value), 2); k.disabled = true; } else k.disabled = false; }
const _leerFormRegistro21 = leerFormRegistro;
leerFormRegistro = function (dia) {
  const o = _leerFormRegistro21(dia); const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  o.condicion = g('er-cond') || 'Normal'; const v = g('er-verdes'); o.verdes = v === '' || v == null ? null : n0(v);
  if (!dia) { const m = g('er-kgm'), t = g('er-kgt'); o.kgManana = m === '' || m == null ? null : n0(m); o.kgTarde = t === '' || t == null ? null : n0(t); if (o.kgManana != null || o.kgTarde != null) o.kg = redondear(n0(o.kgManana) + n0(o.kgTarde), 2); o.obs = (g('er-obs') || '').trim(); }
  return o;
};
const _valTxt21 = valTxt;
valTxt = function (k, v) { if (k === 'verdes') return v == null || v === '' ? '—' : num(v) + ' %'; if (['kgManana', 'kgTarde'].includes(k)) return v == null || v === '' ? '—' : num(v) + ' kg'; return _valTxt21(k, v); };
function tolVerdes() { return n0(cfgCosecha().tolVerdes) || 2.5; }

/* ---------- Asistente: condición del día y muestra de verdes; no deja registrar en un pase cerrado ---------- */
const _wizPaso3_21 = wizPaso3;
wizPaso3 = function () {
  _wizPaso3_21(); const box = document.querySelector('#wiz-body .cs-pago'); if (!box) return;
  if (wiz.condicion == null) wiz.condicion = 'Normal';
  const d = document.createElement('div'); d.className = 'fgrid c2 cs-cond'; d.innerHTML = `<label class="f">Condición del día<select onchange="wiz.condicion=this.value">${CONDICIONES.map(c => `<option ${c === wiz.condicion ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="f">% de verdes en la muestra (opcional)<input type="number" min="0" max="100" step="0.1" value="${wiz.verdes != null ? wiz.verdes : ''}" placeholder="Tolerancia ${num(tolVerdes())} %" oninput="wiz.verdes=this.value===''?null:Number(this.value)"></label>`;
  box.appendChild(d);
  const pz = pases.find(p => p.clave === clavePase({ fecha: wiz.fecha, tipo: wiz.tipo, pasada: wiz.pasada }));
  if (pz && pz.estado === 'Cerrado') { const w = document.createElement('div'); w.className = 'fl-sug alerta'; w.style.marginTop = '10px'; w.innerHTML = `<b>El pase ${esc(pz.codigo)} está cerrado</b><span>Para registrar más cereza en él, reábralo en Cosecha › Pases, o vuelva y elija otra pasada.</span>`; box.after(w); }
};
confirmarGuardado = async function () {
  const pz = pases.find(p => p.clave === clavePase({ fecha: wiz.fecha, tipo: wiz.tipo, pasada: wiz.pasada }));
  if (pz && pz.estado === 'Cerrado') { toast('El pase ' + pz.codigo + ' está cerrado. Reábralo en Cosecha › Pases para registrar en él.', 'err'); return; }
  if (!wiz.loteId && wiz.loteNombre) { const variedadId = encontrarOCrearVariedad(wiz.variedadNombre) || wiz.variedadId; const loteId = encontrarOCrearLote(wiz.loteNombre, wiz.fincaId, variedadId); const bloqueId = encontrarOCrearBloque(wiz.bloqueNombre, loteId); wiz.loteId = loteId; wiz.variedadId = variedadId; wiz.bloqueId = bloqueId; }
  const lote = lotes.find(l => l.id === wiz.loteId); if (lote && !wiz.fincaId) wiz.fincaId = lote.fincaId; const ahora = ahoraISO(); const c = cfgCosecha(); const ids = [];
  wiz.personas.forEach(p => { const t = trabajadorDePersona(p.pid); if (!t) return; const r = pagoPersonaWiz(p);
    const reg = { id: uid('g'), fincaId: wiz.fincaId, loteId: wiz.loteId, loteNombre: wiz.loteNombre, bloqueId: wiz.bloqueId, bloqueNombre: wiz.bloqueNombre, variedadId: wiz.variedadId, variedadNombre: wiz.variedadNombre || nombreVariedad(wiz.variedadId),
      lote: wiz.loteNombre, bloque: wiz.bloqueNombre, variedad: wiz.variedadNombre || nombreVariedad(wiz.variedadId), finca: nombreFinca(wiz.fincaId) || '—', anio: Number(String(wiz.fecha).slice(0, 4)), tipo: wiz.tipo, pasada: wiz.pasada, fecha: wiz.fecha,
      trabajadorId: t.id, recolector: t.nombre, empleadoId: t.empleadoId || null, horas: n0(p.horas), kg: n0(p.kg), modalidad: r.modalidad, tarifa: r.modalidad === 'kilo' ? n0(r.tarifa) : 0, valorJornal: r.modalidad === 'jornal' ? n0(wiz.valorJornal) : null,
      alim: !!wiz.alim, alimValor: wiz.alim ? c.alimentacion : 0, alimModo: c.alimModo, condicion: wiz.condicion || 'Normal', verdes: wiz.verdes != null ? n0(wiz.verdes) : null, creado: ahora };
    registros.push(reg); ids.push(reg.id); });
  asegurarCodigos();
  ids.forEach(id => { const reg = registros.find(x => x.id === id); registrarCambio('registro', reg.id, reg.recolector + ' · ' + wiz.fecha, 'Creación', reg.codigo + ' · ' + num(reg.kg) + ' kg · ' + num(reg.horas) + ' h · ' + txtPagoReg(reg) + ' · ' + wiz.loteNombre + ' · ' + CICLO_TXT(wiz.tipo) + ' pasada ' + wiz.pasada + (reg.verdes != null ? ' · verdes ' + num(reg.verdes) + ' %' : ''), { loteId: wiz.loteId }); });
  await guardarEstado(); closeWizard(); render();
  toast('Cosecha guardada: ' + ids.length + ' registro(s) · ' + num(redondear(wiz.personas.reduce((a, p) => a + n0(p.kg), 0), 1)) + ' kg', 'ok');
  if (vistaActual !== 'panel') ir('panel');
};

/* ---------- Estándares de productividad (kg por hora) por cosecha y condición ---------- */
const EST_DEF22 = { 'Principal|Normal': { min: 8.75, opt: 12.5, alto: 16.25 }, 'Principal|Graneo (poca carga)': { min: 5, opt: 7.5, alto: 10 }, 'Principal|Lote difícil o pendiente': { min: 7, opt: 10, alto: 13 }, 'Principal|Lluvia': { min: 7, opt: 10, alto: 13 },
  'Secundaria|Normal': { min: 5, opt: 7.5, alto: 10 }, 'Secundaria|Graneo (poca carga)': { min: 3.5, opt: 5, alto: 7 }, 'Secundaria|Lote difícil o pendiente': { min: 4, opt: 6, alto: 8 }, 'Secundaria|Lluvia': { min: 4, opt: 6, alto: 8 } };
function estandar22(tipo, cond) { const E = Object.assign({}, EST_DEF22, cfgCosecha().estandares || {}); return E[(tipo || 'Principal') + '|' + (cond || 'Normal')] || E[(tipo || 'Principal') + '|Normal']; }
function kghReg(r) { return n0(r.horas) > 0 ? n0(r.kg) / n0(r.horas) : null; }
const FRANJAS = [['Bajo', 'mal'], ['Bajo-óptimo', 'medio'], ['Óptimo', 'bien'], ['Alto', 'top']];
function franja22(kgh, e) { if (kgh == null || !e) return null; return kgh >= e.alto ? 'Alto' : kgh >= e.opt ? 'Óptimo' : kgh >= e.min ? 'Bajo-óptimo' : 'Bajo'; }
function pillFranja(f) { if (!f) return '<span class="tb-na">—</span>'; const t = (FRANJAS.find(x => x[0] === f) || [])[1]; return `<span class="fr22 ${t}">${f}</span>`; }
/* Índice de un registro frente a su estándar: 1 = óptimo exacto */
function indiceEstandar(r) { const k = kghReg(r); const e = estandar22(r.tipo, r.condicion); return k == null || !e ? null : k / e.opt; }

/* ---------- Pestañas de Cosecha ---------- */
csSt.tab = csSt.tab || 'registros';
const CS_TABS = [['registros', 'Registro diario'], ['pases', 'Pases'], ['productividad', 'Productividad'], ['liquidacion', 'Liquidación semanal'], ['beneficio', 'Beneficio y lotes comerciales']];
function barraTabsCosecha() { return `<div class="cs-tabs" role="tablist">${CS_TABS.map(([k, t]) => `<button role="tab" class="${csSt.tab === k ? 'on' : ''}" onclick="csSt.tab='${k}';renderCosecha()">${t}</button>`).join('')}</div>`; }
const _renderCosecha21 = renderCosecha;
renderCosecha = function () {
  const root = document.getElementById('cs-root'); if (!root) return;
  codigosAlDia();
  if (csSt.tab === 'registros') { _renderCosecha21(); root.insertAdjacentHTML('afterbegin', barraTabsCosecha()); return; }
  tooltipsGlobales(); const anios = aniosCosecha(); if (!csSt.anio || !anios.includes(csSt.anio)) csSt.anio = anios.find(a => registros.some(r => String(r.fecha).startsWith(a))) || anios[0];
  const filtros = `<div class="cs-bar"><div class="chip-row" style="margin:0"><select aria-label="Año" onchange="csSt.anio=this.value;renderCosecha()">${anios.map(a => `<option ${a === csSt.anio ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <select aria-label="Ciclo" onchange="csSt.ciclo=this.value;csSt.pasada='Todas';renderCosecha()">${[['Todos', 'Principal y mitaca'], ['Principal', 'Cosecha principal'], ['Secundaria', 'Mitaca']].map(([v, t]) => `<option value="${v}" ${v === csSt.ciclo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="mp-actions"><button class="btn ghost small" onclick="abrirParametrosCosecha()">Parámetros</button><button class="btn primary small" onclick="openWizard()">+ Registrar día de cosecha</button></div></div>`;
  root.innerHTML = barraTabsCosecha() + filtros + '<div id="cs-cuerpo"></div>';
  const fn = { pases: renderPases22, productividad: renderProductividad22, liquidacion: renderLiquidacion22, beneficio: renderBeneficio22 }[csSt.tab];
  try { fn(document.getElementById('cs-cuerpo')); } catch (e) { document.getElementById('cs-cuerpo').innerHTML = '<div class="empty">No se pudo mostrar esta pestaña: ' + esc(e.message) + '</div>'; dlog('✗ cosecha/' + csSt.tab + ': ' + e.message, 'err'); }
};
render = function () { try { renderCosecha(); } catch (e) { dlog('✗ cosecha: ' + e.message, 'err'); } };

/* Tabla de pases dentro del registro diario: código, clase y estado del pase */
function filasPasadas(rs) {
  const m = new Map(); rs.forEach(r => { const k = [r.tipo || 'Principal', r.pasada || 1, r.loteId || r.lote].join('|'); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  const filas = [...m.entries()].map(([k, a]) => ({ k, a, ini: a.map(r => r.fecha).sort()[0], fin: a.map(r => r.fecha).sort().pop() })).sort((x, y) => y.ini.localeCompare(x.ini));
  return filas.map(({ k, a, ini, fin }) => { const [tipo, pas] = k.split('|'); const pz = paseDe(a[0]); const kg = a.reduce((s, r) => s + n0(r.kg), 0), h = a.reduce((s, r) => s + n0(r.horas), 0), c = a.reduce((s, r) => s + costoRegistro(r), 0);
    const np = a.filter(r => modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)).length; const nb = a.filter(r => !beneficioDeRegistro(r)); const bens = [...new Set(a.map(r => r.beneficioId).filter(Boolean))].map(id => beneficios.find(b => b.id === id)).filter(Boolean);
    const kgP = bens.reduce((s, b) => s + n0(b.kgSalida), 0);
    return `<tr><td><b>${pz ? chipCod(pz.codigo) : CICLO_TXT(tipo) + ' · ' + pas}</b><br><small style="color:var(--text-faint)">${CICLO_TXT(tipo)} · ${esc(pz ? pz.clase : 'Pase')}${pz && pz.estado === 'Cerrado' ? ' · cerrado' : ''}</small></td><td>${esc(a[0].loteNombre || a[0].lote || nombreLote(a[0].loteId))}</td><td>${fechaCorta(ini)}${fin !== ini ? ' – ' + fechaCorta(fin) : ''}</td><td class="num">${new Set(a.map(r => r.trabajadorId)).size}</td><td class="num">${num(redondear(kg, 1))} kg</td><td class="num">${h ? num(redondear(kg / h, 1)) : '—'}</td><td class="num">${fmt(c)}</td>
      <td>${np ? `<span class="pill ejecucion">${np} sin pagar</span>` : '<span class="pill cerrada">Pagada</span>'}</td>
      <td>${nb.length ? (bens.length ? `<span class="pill ejecucion">Parcial</span>` : `<button class="btn ghost small" onclick="abrirBeneficioCosecha('${esc(k)}')">Beneficiar</button>`) : `<span class="pill cerrada">${bens.map(b => esc(b.codigo || '')).join(' ')} · factor ${kgP ? num(redondear(kg / kgP, 2)) : '—'}</span>`}</td>
      <td class="actions"><button class="btn ghost small" onclick="planillaDesdeCosecha('${esc(k)}')">Planilla PDF</button></td></tr>`; }).join('') || '<tr><td colspan="10" class="tb-na">Sin cosecha en este filtro. Use «Registrar día de cosecha».</td></tr>';
}
/* Registros por día con el código de cada pesada, mañana/tarde, verdes y franja de productividad */
function listaDias(rs) {
  const g = new Map(); rs.forEach(r => { const k = grupoDia(r); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, a]) => { const [f, , tipo, pas] = k.split('|'); const kg = a.reduce((s, r) => s + n0(r.kg), 0), c = a.reduce((s, r) => s + costoRegistro(r), 0); const pz = paseDe(a[0]);
    const ver = a.filter(r => r.verdes != null); const vp = ver.length ? ver.reduce((s, r) => s + n0(r.verdes) * n0(r.kg), 0) / (ver.reduce((s, r) => s + n0(r.kg), 0) || 1) : null;
    return `<div class="cs-dia"><div class="cs-dia-h"><div><b>${diaSemana(f)} ${fechaCorta(f)} ${f.slice(0, 4)}</b><span>${esc(a[0].loteNombre || a[0].lote || nombreLote(a[0].loteId))} · ${pz ? esc(pz.codigo) + ' · día ' + diaDelPase(a[0]) : CICLO_TXT(tipo) + ' · pasada ' + pas} · ${esc(a[0].condicion || 'Normal')}${vp != null ? ` · <span style="color:${vp > tolVerdes() ? 'var(--danger)' : 'inherit'}">verdes ${num(redondear(vp, 1))} %</span>` : ''}</span></div><div class="cs-dia-t"><b>${num(redondear(kg, 1))} kg</b><span>${fmt(c)}</span></div>
        <div class="cs-dia-a"><button class="btn ghost small" onclick="abrirEditarDia('${esc(k)}')">Ajustar día</button><button class="btn danger-ghost" onclick="eliminarDia('${esc(k)}')">Eliminar día</button></div></div>
      <div class="tscroll"><table class="dtable cs-tab"><thead><tr><th>Persona · código de la pesada</th><th class="num">Horas</th><th class="num">Kilos</th><th class="num">kg/h</th><th>Franja</th><th>Forma de pago</th><th class="num">Pago</th><th class="num">Alimentación</th><th>Estado</th><th></th></tr></thead><tbody>${a.map(r => { const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r); const kh = kghReg(r);
        return `<tr><td>${esc(r.recolector || nombreTrabajador(r.trabajadorId))}${r.empleadoId ? ' <span class="cs-tag">Nómina</span>' : ''}<br>${chipCod(codigoPesada(r))}${r.obs ? `<br><small style="color:var(--text-faint)">${esc(r.obs)}</small>` : ''}</td><td class="num">${num(r.horas || 0)}</td><td class="num">${num(redondear(r.kg, 1))}${r.kgManana != null || r.kgTarde != null ? `<br><small style="color:var(--text-faint)">${num(n0(r.kgManana))} + ${num(n0(r.kgTarde))}</small>` : ''}</td><td class="num">${kh != null ? num(redondear(kh, 1)) : '—'}</td><td>${pillFranja(franja22(kh, estandar22(r.tipo, r.condicion)))}</td><td>${esc(txtPagoReg(r))}</td><td class="num">${fmt(pagoRegistro(r))}</td><td class="num">${alimRegistro(r) ? fmt(alimRegistro(r)) : '—'}</td>
          <td>${modalidadDe(r) === 'nomina' ? '<span class="pill">Nómina</span>' : pg ? `<span class="pill cerrada" title="${esc(pg.codigo || '')} · ${esc(pg.fecha)}">Pagado</span>` : '<span class="pill ejecucion">Por pagar</span>'} ${bn ? `<span class="pill cerrada" title="${esc(bn.codigo || '')}">Beneficiado</span>` : ''}</td>
          <td class="actions"><button class="btn ghost small" onclick="abrirEditarRegistro('${r.id}')">Editar</button><button class="btn ghost small" onclick="verHistorialRegistro('${r.id}')">Historial</button><button class="btn danger-ghost" onclick="eliminarRegistroCosecha('${r.id}')" aria-label="Eliminar">✕</button></td></tr>`; }).join('')}</tbody></table></div></div>`; }).join('') || '<div class="empty">Sin registros.</div>';
}

/* ---------- Pestaña Pases ---------- */
function pasesFiltrados() { return pases.filter(p => String(p.anio) === csSt.anio && (csSt.ciclo === 'Todos' || p.tipo === csSt.ciclo) && regsDePase(p).length).sort((a, b) => String(resumenPase(b).ini).localeCompare(String(resumenPase(a).ini))); }
function renderPases22(host) {
  const ps = pasesFiltrados(); const R = ps.map(p => ({ p, x: resumenPase(p) }));
  const kg = R.reduce((s, o) => s + o.x.kg, 0), c = R.reduce((s, o) => s + o.x.costo, 0), ab = ps.filter(p => p.estado !== 'Cerrado').length;
  host.innerHTML = `<div class="k19-grid k4">${kpi19('Pases', ps.length, ab + ' abiertos · ' + (ps.length - ab) + ' cerrados', '', 'i-cosecha')}${kpi19('Cereza', num(Math.round(kg)) + ' <small>kg</small>', num(redondear(kg / CARGA / 5, 1)) + ' cargas de pergamino estimadas', '', 'i-oper')}${kpi19('Costo de recolección', fmtCorto(c), kg ? fmt(c / kg) + ' por kg' : '', '', 'i-finanzas')}${kpi19('Sin beneficiar', num(Math.round(R.reduce((s, o) => s + o.x.sinBen, 0))) + ' <small>kg</small>', R.filter(o => o.x.sinBen > 0.5).length + ' pases con cereza pendiente', R.some(o => o.x.sinBen > 0.5) ? 'medio' : 'bien', 'i-plan')}</div>
    <div class="card"><div class="title">Pases de ${csSt.anio} <span class="sub">un pase es una vuelta completa de recolección; ciérrelo al terminar para que nadie registre en él por error</span></div><div class="tscroll"><table class="dtable"><thead><tr><th>Código</th><th>Clase</th><th>Lotes</th><th>Inicio – fin</th><th class="num">Días</th><th class="num">Personas</th><th class="num">Cereza</th><th class="num">kg/h</th><th class="num">Valor</th><th class="num">$/kg</th><th>Beneficio</th><th>Estado</th><th></th></tr></thead><tbody>
      ${R.map(({ p, x }) => `<tr><td>${chipCod(p.codigo)}<br><small style="color:var(--text-faint)">${CICLO_TXT(p.tipo)} ${p.anio}</small></td><td>${esc(p.clase)}</td><td>${esc(x.lotes.map(l => nombreLote(l) || l).join(', '))}</td><td>${x.ini ? fechaCorta(x.ini) + (x.fin !== x.ini ? ' – ' + fechaCorta(x.fin) : '') : '—'}</td><td class="num">${x.dias}</td><td class="num">${x.personas}</td><td class="num">${num(redondear(x.kg, 1))}</td><td class="num">${x.kgh ? num(redondear(x.kgh, 1)) : '—'}</td><td class="num">${fmt(x.costo)}</td><td class="num">${x.pk ? fmt(x.pk) : '—'}</td>
        <td>${x.sinBen > 0.5 ? `<span class="pill ejecucion">${num(Math.round(x.sinBen))} kg sin beneficiar</span>` : `<span class="pill cerrada">${x.bens.map(b => esc(b.codigo || '')).join(' ') || 'Beneficiado'}</span>`}</td>
        <td>${p.estado === 'Cerrado' ? `<span class="pill cerrada">Cerrado</span>${p.cerradoEl ? `<br><small style="color:var(--text-faint)">${fechaCorta(p.cerradoEl)}</small>` : ''}` : '<span class="pill ejecucion">Abierto</span>'}</td>
        <td class="actions"><button class="btn ghost small" onclick="editarPase22('${p.id}')">Editar</button><button class="btn ghost small" onclick="estadoPase22('${p.id}')">${p.estado === 'Cerrado' ? 'Reabrir' : 'Cerrar'}</button><button class="btn ghost small" onclick="repPlanilla({pasada:'${esc(p.clave)}'})">Planilla</button></td></tr>`).join('') || '<tr><td colspan="13" class="tb-na">Sin pases en este filtro.</td></tr>'}
    </tbody></table></div><p class="hint" style="margin:10px 0 0">El código del pase (por ejemplo 26P-P03 = cosecha principal 2026, pase 3) forma parte del código de cada pesada. Un pase cerrado no admite registros nuevos hasta que se reabra; la reapertura queda en el historial.</p></div>
    <div class="card"><div class="title">Cereza por pase <span class="sub">kilos y costo por kilo</span></div>${R.length ? gLeyenda([{ color: 'var(--cereza)', txt: 'Cereza (kg)' }, { color: 'var(--c2)', txt: '$ por kg', linea: true }]) + gCombo({ cats: R.slice().reverse().map(o => o.p.codigo), series: [{ nombre: 'Cereza', vals: R.slice().reverse().map(o => Math.round(o.x.kg)), color: 'var(--cereza)', fmtTip: v => num(v) + ' kg' }, { nombre: '$/kg', tipo: 'linea', eje: 'der', vals: R.slice().reverse().map(o => o.x.pk ? Math.round(o.x.pk) : null), color: 'var(--c2)', fmtTip: v => fmt(v) }], alto: 220, der0: false }) : '<div class="empty">Sin datos.</div>'}</div>`;
}
function editarPase22(id) { const p = pases.find(x => x.id === id); if (!p) return;
  openModal(`<h3>Pase ${esc(p.codigo)}</h3><p class="hint">${CICLO_TXT(p.tipo)} ${p.anio} · pase número ${p.numero}. El número y la cosecha salen de los registros; aquí se define la clase y las notas.</p>
    <div class="fgrid c2"><label class="f">Clase de pase<select id="pz-clase">${CLASES_PASE.map(c => `<option ${c === p.clase ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="f">Notas<input id="pz-notas" value="${esc(p.notas || '')}" placeholder="Ej. graneo del lote alto"></label></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarPase22('${id}')">Guardar</button></div>`); }
function guardarPase22(id) { const p = pases.find(x => x.id === id); const cl = document.getElementById('pz-clase').value, no = document.getElementById('pz-notas').value.trim(); const cambios = [];
  if (cl !== p.clase) cambios.push('Clase: ' + p.clase + ' → ' + cl); if (no !== (p.notas || '')) cambios.push('Notas: ' + (p.notas || '—') + ' → ' + (no || '—'));
  Object.assign(p, { clase: cl, notas: no }); if (cambios.length) registrarCambio('pase', p.id, 'Pase ' + p.codigo, 'Edición', cambios.join(' · ')); guardarEstado(); closeModal(); render(); }
function estadoPase22(id) { const p = pases.find(x => x.id === id); if (!p) return; const x = resumenPase(p);
  if (p.estado === 'Cerrado') { openModal(`<h3>Reabrir el pase ${esc(p.codigo)}</h3><label class="f">Motivo (obligatorio)<input id="pz-mot" placeholder="Ej. faltó registrar un día"></label><div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarEstadoPase22('${id}','Abierto')">Reabrir</button></div>`); return; }
  openModal(`<h3>Cerrar el pase ${esc(p.codigo)}</h3><p>${num(redondear(x.kg, 1))} kg en ${x.dias} días con ${x.personas} personas.${x.sinPago ? ` <b>${x.sinPago} registro(s) sin pagar.</b>` : ''}${x.sinBen > 0.5 ? ` <b>${num(Math.round(x.sinBen))} kg sin beneficiar.</b>` : ''}</p><p class="hint">Al cerrarlo no se pueden agregar registros nuevos a este pase. Pagos y beneficios pendientes se pueden hacer igual.</p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarEstadoPase22('${id}','Cerrado')">Cerrar el pase</button></div>`); }
function confirmarEstadoPase22(id, est) { const p = pases.find(x => x.id === id); const m = document.getElementById('pz-mot'); if (est === 'Abierto' && (!m || !m.value.trim())) { toast('Escriba el motivo.', 'err'); return; }
  p.estado = est; if (est === 'Cerrado') p.cerradoEl = hoyLocal(); else delete p.cerradoEl; registrarCambio('pase', p.id, 'Pase ' + p.codigo, est === 'Cerrado' ? 'Cierre' : 'Reapertura', est === 'Cerrado' ? num(redondear(resumenPase(p).kg, 1)) + ' kg' : 'Motivo: ' + m.value.trim()); guardarEstado(); closeModal(); render(); toast('Pase ' + p.codigo + (est === 'Cerrado' ? ' cerrado' : ' reabierto'), 'ok'); }

/* ---------- Pestaña Productividad ---------- */
function statsPersona(rs) {
  const porDia = new Map(); rs.forEach(r => { const o = porDia.get(r.fecha) || { kg: 0, h: 0, idx: [], cond: r.condicion, tipo: r.tipo }; o.kg += n0(r.kg); o.h += n0(r.horas); const i = indiceEstandar(r); if (i != null) o.idx.push(i); porDia.set(r.fecha, o); });
  const dias = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([f, o]) => ({ f, kg: o.kg, h: o.h, kgh: o.h ? o.kg / o.h : null, tipo: o.tipo, cond: o.cond }));
  const kv = dias.map(d => d.kgh).filter(v => v != null); const kg = rs.reduce((s, r) => s + n0(r.kg), 0), h = rs.reduce((s, r) => s + n0(r.horas), 0); const media = kv.length ? kv.reduce((a, b) => a + b, 0) / kv.length : null;
  const desv = kv.length > 1 ? Math.sqrt(kv.reduce((s, v) => s + (v - media) ** 2, 0) / (kv.length - 1)) : null;
  let pend = null; if (kv.length > 2) { const n = kv.length, xs = kv.map((_, i) => i), mx = (n - 1) / 2; const sxy = xs.reduce((s, x, i) => s + (x - mx) * (kv[i] - media), 0), sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0); pend = sxx ? sxy / sxx / media : null; }
  const ver = rs.filter(r => r.verdes != null); const verdes = ver.length ? ver.reduce((s, r) => s + n0(r.verdes) * n0(r.kg), 0) / (ver.reduce((s, r) => s + n0(r.kg), 0) || 1) : null;
  const idx = rs.map(r => ({ i: indiceEstandar(r), w: n0(r.horas) })).filter(o => o.i != null); const idxP = idx.length ? idx.reduce((s, o) => s + o.i * o.w, 0) / (idx.reduce((s, o) => s + o.w, 0) || 1) : null;
  const tipoP = rs.filter(r => (r.tipo || 'Principal') === 'Secundaria').length > rs.length / 2 ? 'Secundaria' : 'Principal';
  return { dias, kg, h, kgh: h ? kg / h : null, min: kv.length ? Math.min(...kv) : null, max: kv.length ? Math.max(...kv) : null, desv, pend, verdes, valor: rs.reduce((s, r) => s + pagoRegistro(r), 0), idx: idxP, franja: idxP == null ? null : franja22(idxP * estandar22(tipoP, 'Normal').opt, estandar22(tipoP, 'Normal')), kgDia: dias.length ? kg / dias.length : null };
}
function renderProductividad22(host) {
  const rs = registros.filter(r => String(r.fecha).slice(0, 4) === csSt.anio && (csSt.ciclo === 'Todos' || (r.tipo || 'Principal') === csSt.ciclo));
  const porP = new Map(); rs.forEach(r => { if (!porP.has(r.trabajadorId)) porP.set(r.trabajadorId, []); porP.get(r.trabajadorId).push(r); });
  const filas = [...porP.entries()].map(([tid, a]) => ({ tid, t: trabajadores.find(x => x.id === tid), s: statsPersona(a) })).sort((a, b) => (b.s.idx || 0) - (a.s.idx || 0) || b.s.kg - a.s.kg);
  const tot = statsPersona(rs); const ant = registros.filter(r => String(r.fecha).slice(0, 4) === String(Number(csSt.anio) - 1) && (csSt.ciclo === 'Todos' || (r.tipo || 'Principal') === csSt.ciclo)); const sa = ant.length ? statsPersona(ant) : null;
  if (!csSt.prodPersona || !porP.has(csSt.prodPersona)) csSt.prodPersona = filas[0] ? filas[0].tid : null;
  const e0 = estandar22(csSt.ciclo === 'Secundaria' ? 'Secundaria' : 'Principal', 'Normal');
  const enFranja = filas.filter(f => f.s.franja === 'Óptimo' || f.s.franja === 'Alto').length;
  const dl = (a, b, inv) => { if (a == null || !b) return ''; const d = (a - b) / b * 100; return `<span style="color:${(d >= 0) !== !!inv ? 'var(--accent)' : 'var(--danger)'}">${d >= 0 ? '▲' : '▼'} ${num(Math.abs(Math.round(d)))} % vs ${Number(csSt.anio) - 1}</span>`; };
  host.innerHTML = `<div class="k19-grid">${kpi19('Personas', filas.length, num(tot.dias.length) + ' días de cosecha', '', 'i-personal')}${kpi19('Cereza', num(Math.round(tot.kg)) + ' <small>kg</small>', sa ? dl(tot.kg, sa.kg) : 'sin año anterior', '', 'i-cosecha')}${kpi19('Kg por hora', tot.kgh ? num(redondear(tot.kgh, 1)) : '—', (sa ? dl(tot.kgh, sa.kgh) + ' · ' : '') + num(Math.round(tot.h)) + ' h registradas', '', 'i-analisis')}
      ${kpi19('Estándar óptimo', num(e0.opt) + ' <small>kg/h</small>', 'bajo ' + num(e0.min) + ' · alto ' + num(e0.alto) + ' · ' + (csSt.ciclo === 'Secundaria' ? 'mitaca' : 'principal'), '', 'i-plan')}${kpi19('En franja óptima o alta', enFranja + ' <small>de ' + filas.length + '</small>', filas.filter(f => f.s.franja === 'Bajo').length + ' en franja baja', filas.some(f => f.s.franja === 'Bajo') ? 'medio' : 'bien', 'i-reporte')}${kpi19('% verdes ponderado', tot.verdes != null ? num(redondear(tot.verdes, 1)) + ' %' : '—', 'tolerancia ' + num(tolVerdes()) + ' %', tot.verdes != null && tot.verdes > tolVerdes() ? 'mal' : '', 'i-lote')}</div>
    <div class="card"><div class="title">Ranking de recolectores <span class="sub">ordenado por desempeño frente al estándar de su condición</span></div><div class="tscroll"><table class="dtable"><thead><tr><th>#</th><th>Persona</th><th class="num">Días</th><th class="num">Kg</th><th class="num">kg/h</th><th class="num">Mín – máx</th><th class="num">Desv.</th><th class="num">Tendencia</th><th class="num">% verdes</th><th class="num">Ganado</th><th>Franja</th></tr></thead><tbody>
      ${filas.map((f, i) => `<tr class="${f.tid === csSt.prodPersona ? 'sel22' : ''}" style="cursor:pointer" onclick="csSt.prodPersona='${f.tid}';renderCosecha()"><td>${i + 1}</td><td><b>${esc(f.t ? f.t.nombre : nombreTrabajador(f.tid))}</b><br><span class="mono" style="font-size:10.5px;color:var(--text-faint)">${esc(codPersona(f.t))}</span></td><td class="num">${f.s.dias.length}</td><td class="num">${num(Math.round(f.s.kg))}</td><td class="num"><b>${f.s.kgh ? num(redondear(f.s.kgh, 1)) : '—'}</b></td><td class="num">${f.s.min != null ? num(redondear(f.s.min, 1)) + ' – ' + num(redondear(f.s.max, 1)) : '—'}</td><td class="num">${f.s.desv != null ? num(redondear(f.s.desv, 1)) : '—'}</td>
        <td class="num">${f.s.pend != null ? `<span style="color:${f.s.pend >= 0 ? 'var(--accent)' : 'var(--danger)'}">${f.s.pend >= 0 ? '▲' : '▼'} ${num(Math.abs(redondear(f.s.pend * 100, 1)))} %/día</span>` : '—'}</td><td class="num" style="${f.s.verdes != null && f.s.verdes > tolVerdes() ? 'color:var(--danger)' : ''}">${f.s.verdes != null ? num(redondear(f.s.verdes, 1)) + ' %' : '—'}</td><td class="num">${fmtCorto(f.s.valor)}</td><td>${pillFranja(f.s.franja)}</td></tr>`).join('') || '<tr><td colspan="11" class="tb-na">Sin registros.</td></tr>'}</tbody></table></div>
      <p class="hint" style="margin:10px 0 0">Kg por hora = kilos ÷ horas registradas. Cada día se compara con el estándar de su cosecha y condición (graneo, lluvia, lote difícil), de modo que un día de poca carga no castiga a nadie. Tendencia: cambio promedio del kg/h de un día a otro.</p></div>
    <div class="grid g2"><div class="card"><div class="title">Franjas día a día <span class="sub">${esc(nombreTrabajador(csSt.prodPersona))} · toque otra persona en el ranking</span></div>${graficoFranjas22(csSt.prodPersona ? (filas.find(f => f.tid === csSt.prodPersona) || {}).s : null)}</div>
    <div class="card"><div class="title">Kg por hora frente al estándar</div>${barrasPersonas22(filas, e0)}</div></div>`;
}
function graficoFranjas22(s) {
  if (!s || !s.dias.length) return '<div class="empty">Sin días con horas registradas.</div>';
  const W = 560, H = 230, L = 40, R = 12, T = 12, B = 30; const ds = s.dias.filter(d => d.kgh != null); if (!ds.length) return '<div class="empty">Faltan las horas trabajadas para calcular kg por hora.</div>';
  const es = ds.map(d => estandar22(d.tipo, d.cond)); const ymax = Math.max(...ds.map(d => d.kgh), ...es.map(e => e.alto)) * 1.15; const x = i => L + (ds.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (ds.length - 1)); const y = v => T + (H - T - B) * (1 - v / ymax);
  const bw = ds.length === 1 ? (W - L - R) : (W - L - R) / (ds.length - 1);
  const bandas = ds.map((d, i) => { const e = es[i]; const x0 = Math.max(L, x(i) - bw / 2), x1 = Math.min(W - R, x(i) + bw / 2);
    return `<rect x="${x0}" y="${y(ymax)}" width="${x1 - x0}" height="${y(e.alto) - y(ymax)}" class="b22 top"/><rect x="${x0}" y="${y(e.alto)}" width="${x1 - x0}" height="${y(e.opt) - y(e.alto)}" class="b22 bien"/><rect x="${x0}" y="${y(e.opt)}" width="${x1 - x0}" height="${y(e.min) - y(e.opt)}" class="b22 medio"/><rect x="${x0}" y="${y(e.min)}" width="${x1 - x0}" height="${y(0) - y(e.min)}" class="b22 mal"/>`; }).join('');
  const path = ds.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(d.kgh).toFixed(1)).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ymax * f);
  return `<svg viewBox="0 0 ${W} ${H}" class="g22" role="img" aria-label="Kg por hora por día con las franjas del estándar">${bandas}${ticks.map(v => `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" class="ax22">${num(Math.round(v))}</text>`).join('')}
    <path d="${path}" class="ln22"/>${ds.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.kgh)}" r="3.6" class="pt22"><title>${fechaCorta(d.f)}: ${num(redondear(d.kgh, 1))} kg/h · ${num(Math.round(d.kg))} kg en ${num(d.h)} h · ${franja22(d.kgh, estandar22(d.tipo, d.cond))}</title></circle>`).join('')}
    ${ds.map((d, i) => (ds.length <= 14 || i % Math.ceil(ds.length / 14) === 0) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="ax22">${fechaCorta(d.f)}</text>` : '').join('')}</svg>
    <div class="leg22">${FRANJAS.slice().reverse().map(([f, t]) => `<span><i class="${t}"></i>${f}</span>`).join('')}</div>`;
}
function barrasPersonas22(filas, e) {
  const fs = filas.filter(f => f.s.kgh != null); if (!fs.length) return '<div class="empty">Sin horas registradas.</div>'; const mx = Math.max(...fs.map(f => f.s.kgh), e.alto) * 1.1;
  return `<div class="bp22">${fs.map(f => `<div class="bp22-r"><span>${esc(f.t ? f.t.nombre : nombreTrabajador(f.tid))}</span><div class="bp22-b"><i class="${(FRANJAS.find(x => x[0] === f.s.franja) || [0, 'medio'])[1]}" style="width:${f.s.kgh / mx * 100}%"></i><em style="left:${e.min / mx * 100}%" title="Mínimo ${num(e.min)}"></em><em class="o" style="left:${e.opt / mx * 100}%" title="Óptimo ${num(e.opt)}"></em><em style="left:${e.alto / mx * 100}%" title="Alto ${num(e.alto)}"></em></div><b class="mono">${num(redondear(f.s.kgh, 1))}</b></div>`).join('')}</div><p class="hint" style="margin:8px 0 0">Las marcas verticales son el mínimo, el óptimo (más gruesa) y el alto del estándar de condición normal.</p>`;
}

/* ---------- Parámetros: pago, alimentación, estándares, cierre de semana y calidad ---------- */
abrirParametrosCosecha = function () {
  const c = cfgCosecha(); const E = Object.assign({}, EST_DEF22, c.estandares || {});
  openModal(`<h3>Parámetros de la cosecha</h3><p class="hint">Son los valores por defecto. En cada día de cosecha puede cambiar el valor del kilo o del jornal, y por persona.</p>
    <div class="sec-label" style="margin-top:0">Pago y alimentación</div>
    <div class="fgrid c3"><label class="f">Valor del kilo por defecto ($)<input id="pc-tar" type="number" min="0" step="10" value="${c.tarifaKg || ''}" placeholder="Ej. 900"></label>
      <label class="f">Valor del jornal ($)<input id="pc-jor" type="number" min="0" step="1000" value="${c.valorJornal}"></label>
      <label class="f">Horas de un jornal<input id="pc-hj" type="number" min="1" max="12" step="0.5" value="${c.horasJornal}"></label>
      <label class="f">Alimentación por jornal ($)<input id="pc-ali" type="number" min="0" step="500" value="${c.alimentacion}"></label>
      <label class="f">La alimentación<select id="pc-modo"><option value="especie" ${c.alimModo === 'especie' ? 'selected' : ''}>La da la finca</option><option value="dinero" ${c.alimModo === 'dinero' ? 'selected' : ''}>Se paga en dinero</option></select></label>
      <label class="cs-check" style="align-self:end"><input id="pc-def" type="checkbox" ${c.alimRecoleccion ? 'checked' : ''}> Incluir alimentación por defecto</label></div>
    <div class="sec-label">Liquidación y calidad</div>
    <div class="fgrid c3"><label class="f">La semana de pago cierra el<select id="pc-cierre">${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].map((d, i) => `<option value="${i}" ${i === diaCierre22() ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="f">Tolerancia de verdes (%)<input id="pc-ver" type="number" min="0" step="0.1" value="${tolVerdes()}"></label>
      <label class="f">Humedad del pergamino: rango ideal (%)<span style="display:flex;gap:6px"><input id="pc-hmin" type="number" step="0.1" value="${humRango22()[0]}"><input id="pc-hmax" type="number" step="0.1" value="${humRango22()[1]}"></span></label></div>
    <div class="sec-label">Estándares de productividad (kg por hora)</div>
    <div class="tscroll"><table class="dtable"><thead><tr><th>Cosecha</th><th>Condición</th><th class="num">Mínimo</th><th class="num">Óptimo</th><th class="num">Alto</th></tr></thead><tbody>${Object.keys(EST_DEF22).map((k, i) => { const [t, co] = k.split('|'); const e = E[k];
      return `<tr><td>${CICLO_TXT(t)}</td><td>${esc(co)}</td>${['min', 'opt', 'alto'].map(x => `<td class="num"><input class="pc-est" data-k="${esc(k)}" data-x="${x}" type="number" step="0.25" min="0" value="${e[x]}" style="width:74px;text-align:right"></td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
    <p class="hint" style="margin-top:8px">Valores de referencia para empezar: ajústelos con sus propios datos después de una o dos cosechas. Alimentación proporcional: con ${num(c.horasJornal)} horas o más se reconoce completa; con menos, la parte proporcional.</p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarParametrosCosecha()">Guardar</button></div>`, true);
};
guardarParametrosCosecha = function () {
  const g = id => document.getElementById(id).value; const antes = cfgCosecha(); const est = {};
  document.querySelectorAll('.pc-est').forEach(e => { const k = e.dataset.k; est[k] = est[k] || {}; est[k][e.dataset.x] = n0(e.value); });
  Object.keys(est).forEach(k => { const e = est[k]; if (!(e.min < e.opt && e.opt < e.alto)) delete est[k]; });
  planConfig = Object.assign({}, planConfig || {}, { valorJornal: n0(g('pc-jor')) || antes.valorJornal, alimentacion: n0(g('pc-ali')), cosecha: Object.assign({}, (planConfig || {}).cosecha || {}, { tarifaKg: n0(g('pc-tar')), horasJornal: n0(g('pc-hj')) || 8, alimModo: g('pc-modo'), alimRecoleccion: document.getElementById('pc-def').checked, diaCierre: Number(g('pc-cierre')), tolVerdes: n0(g('pc-ver')) || 2.5, humMin: n0(g('pc-hmin')) || 10, humMax: n0(g('pc-hmax')) || 12, estandares: est }) });
  const d = cfgCosecha(); registrarCambio('parametros', 'cosecha', 'Parámetros de cosecha', 'Edición', ['tarifaKg', 'valorJornal', 'horasJornal', 'alimentacion', 'alimModo', 'alimRecoleccion', 'diaCierre', 'tolVerdes', 'humMin', 'humMax'].filter(k => String(antes[k]) !== String(d[k])).map(k => k + ': ' + antes[k] + ' → ' + d[k]).join(' · ') || 'Estándares de productividad');
  guardarEstado(); closeModal(); render(); toast('Parámetros guardados. Los registros existentes conservan su valor de pago.', 'ok');
};
function diaCierre22() { const v = cfgCosecha().diaCierre; return v == null ? 6 : Number(v); }
function humRango22() { const c = cfgCosecha(); return [n0(c.humMin) || 10, n0(c.humMax) || 12]; }
