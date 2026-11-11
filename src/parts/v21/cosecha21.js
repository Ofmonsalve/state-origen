/* ================= v21: cosecha rigurosa — pago por kilo o jornal, alimentación proporcional, nómina, edición auditada y cadena cosecha → pago → beneficio → partida ================= */
const CFG_COSECHA_DEF = { horasJornal: 8, alimRecoleccion: true, alimModo: 'especie', tarifaKg: 0 };
function cfgCosecha() { const pc = planConfig || {}; return Object.assign({}, CFG_COSECHA_DEF, { valorJornal: n0(pc.valorJornal) || 65000, alimentacion: n0(pc.alimentacion) || 17000 }, pc.cosecha || {}); }
const CICLO_TXT = t => t === 'Secundaria' ? 'Mitaca' : (t || 'Principal');
const MODALIDADES = { kilo: 'Por kilo', jornal: 'Por jornal', nomina: 'Nómina (sin pago aparte)' };
function modalidadDe(r) { return r && r.modalidad ? r.modalidad : 'kilo'; }
function factorHoras(r) { const h = n0(r && r.horas); const hj = n0(cfgCosecha().horasJornal) || 8; return h > 0 ? Math.min(1, h / hj) : 1; }
function alimRegistro(r) { if (!r || !r.alim) return 0; return n0(r.alimValor != null ? r.alimValor : cfgCosecha().alimentacion) * factorHoras(r); }
function alimEnDinero(r) { return (r && r.alimModo ? r.alimModo : cfgCosecha().alimModo) === 'dinero'; }
function pagoBaseRegistro(r) { const m = modalidadDe(r); if (m === 'nomina') return 0; if (m === 'jornal') return n0(r.valorJornal != null ? r.valorJornal : cfgCosecha().valorJornal) * factorHoras(r); return n0(r.kg) * tarifaDe(r); }
/* Lo que se le paga a la persona (incluye la alimentación si se paga en dinero) */
function pagoRegistro(r) { return pagoBaseRegistro(r) + (alimEnDinero(r) ? alimRegistro(r) : 0); }
/* Lo que le cuesta a la finca (pago + alimentación entregada en especie) */
function costoRegistro(r) { return pagoBaseRegistro(r) + alimRegistro(r); }
function txtPagoReg(r) { const m = modalidadDe(r); return m === 'kilo' ? fmt(tarifaDe(r)) + '/kg' : m === 'jornal' ? 'Jornal ' + fmtCorto(n0(r.valorJornal != null ? r.valorJornal : cfgCosecha().valorJornal)) + (factorHoras(r) < 1 ? ' × ' + num(redondear(factorHoras(r), 2)) : '') : 'Nómina'; }
function nombreTrabajador(id) { const t = trabajadores.find(x => x.id === id); if (t) return t.nombre; const e = empleados.find(x => x.id === id); return e ? e.nombre : '—'; }

/* ---------- Estado de cada registro: pagado y beneficiado ---------- */
function pagoDeRegistro(r) { if (r.pagoId) return pagos.find(p => p.id === r.pagoId) || null; return pagos.find(p => p.trabajadorId === r.trabajadorId && !p.registroIds && r.fecha <= (p.periodoFin || '') && (!p.periodoInicio || r.fecha >= p.periodoInicio)) || null; }
function beneficioDeRegistro(r) { return r.beneficioId ? beneficios.find(b => b.id === r.beneficioId) || null : null; }
function pendientesPago(tid) { return registros.filter(r => r.trabajadorId === tid && modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)).sort((a, b) => a.fecha.localeCompare(b.fecha)); }
function grupoDia(r) { return [r.fecha, r.loteId || r.lote || '', r.tipo || 'Principal', r.pasada || 1].join('|'); }

/* ---------- Personas: recolectores y personal de nómina en una sola lista ---------- */
function personasCosecha() {
  const L = trabajadores.map(t => ({ pid: t.id, nombre: t.nombre, nomina: !!t.empleadoId, t }));
  empleados.filter(e => !e.fechaRetiro && !trabajadores.some(t => t.empleadoId === e.id)).forEach(e => L.push({ pid: 'emp:' + e.id, nombre: e.nombre, nomina: true, e }));
  return L;
}
function trabajadorDePersona(pid) {
  if (!String(pid).startsWith('emp:')) return trabajadores.find(t => t.id === pid) || null;
  const e = empleados.find(x => x.id === pid.slice(4)); if (!e) return null;
  let t = trabajadores.find(x => x.empleadoId === e.id) || trabajadores.find(x => normalizar(x.nombre) === normalizar(e.nombre));
  if (t) { t.empleadoId = e.id; return t; }
  t = { id: uid('t'), nombre: e.nombre, tarifaPorKg: n0(cfgCosecha().tarifaKg), telefono: e.telefono || '', empleadoId: e.id }; trabajadores.push(t);
  registrarCambio('recolector', t.id, t.nombre, 'Creación', 'Vinculado al empleado de nómina ' + e.nombre); return t;
}
function esNominaConSalario(pid) { if (String(pid).startsWith('emp:')) { const e = empleados.find(x => x.id === pid.slice(4)); return !!(e && n0(e.salario) > 0); } const t = trabajadores.find(x => x.id === pid); const e = t && t.empleadoId && empleados.find(x => x.id === t.empleadoId); return !!(e && n0(e.salario) > 0); }

/* ---------- Asistente de cosecha: paso 3 (personas y pago) y paso 4 (confirmación) ---------- */
function ultimaTarifa(tipo) { const r = registros.filter(x => (x.tipo || 'Principal') === tipo && modalidadDe(x) === 'kilo' && n0(x.tarifa) > 0).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; return r ? n0(r.tarifa) : (n0(cfgCosecha().tarifaKg) || n0((trabajadores[0] || {}).tarifaPorKg) || 0); }
const _openWizard20 = openWizard;
openWizard = function () { _openWizard20.apply(this, arguments); const c = cfgCosecha(); Object.assign(wiz, { modalidad: 'kilo', tarifa: ultimaTarifa('Principal'), valorJornal: c.valorJornal, alim: !!c.alimRecoleccion, tarifaTocada: false }); };
const _elegirTipo20 = elegirTipo;
elegirTipo = function (t) { wiz.tipo = t; if (!wiz.tarifaTocada) wiz.tarifa = ultimaTarifa(t); _elegirTipo20(t); };
const _renderWizStep20 = renderWizStep;
renderWizStep = function () { if (wizStep === 3) return wizPaso3(); if (wizStep === 4) return wizPaso4(); return _renderWizStep20.apply(this, arguments); };
function pagoPersonaWiz(p) { const r = { kg: p.kg, horas: p.horas, modalidad: p.modalidad || wiz.modalidad, tarifa: p.tarifa != null ? p.tarifa : wiz.tarifa, valorJornal: wiz.valorJornal, alim: wiz.alim, alimValor: cfgCosecha().alimentacion }; if (p.esNomina && p.modalidad == null && esNominaConSalario(p.pid)) r.modalidad = 'nomina'; return r; }
function wizPaso3() {
  updateDots(); const body = document.getElementById('wiz-body'); const c = cfgCosecha();
  const ya = new Set(wiz.personas.map(p => p.pid)); const disp = personasCosecha().filter(x => !ya.has(x.pid));
  body.innerHTML = `
    <div class="wiz-q">¿Quién recogió y cómo se paga?</div>
    <div class="wiz-sub">${esc(wiz.loteNombre)} · ${fechaCorta(wiz.fecha)} · ${CICLO_TXT(wiz.tipo)} · pasada ${wiz.pasada}</div>
    <div class="cs-pago">
      <div class="toggle-2" style="margin-bottom:12px"><button class="${wiz.modalidad === 'kilo' ? 'on' : ''}" onclick="wiz.modalidad='kilo';wizPaso3()">Por kilo</button><button class="${wiz.modalidad === 'jornal' ? 'on' : ''}" onclick="wiz.modalidad='jornal';wizPaso3()">Por jornal</button></div>
      ${wiz.modalidad === 'kilo' ? `<label class="f">Valor del kilo hoy ($)<input id="wz-tarifa" type="number" min="0" step="10" value="${wiz.tarifa || ''}" oninput="wiz.tarifa=Number(this.value)||0;wiz.tarifaTocada=true;renderListaPersonas()"></label><p class="hint" style="margin:6px 0 0">Se propone el valor usado la última vez en ${CICLO_TXT(wiz.tipo).toLowerCase()}. Cámbielo si hoy se paga distinto; también puede ajustarlo por persona.</p>`
        : `<label class="f">Valor del jornal de ${num(c.horasJornal)} horas ($)<input id="wz-jornal" type="number" min="0" step="1000" value="${wiz.valorJornal || ''}" oninput="wiz.valorJornal=Number(this.value)||0;renderListaPersonas()"></label><p class="hint" style="margin:6px 0 0">Con menos de ${num(c.horasJornal)} horas se paga la parte proporcional; con más, el jornal completo.</p>`}
      <label class="cs-check"><input type="checkbox" ${wiz.alim ? 'checked' : ''} onchange="wiz.alim=this.checked;renderListaPersonas()"> Con alimentación · ${fmt(c.alimentacion)} por jornal de ${num(c.horasJornal)} h, proporcional a las horas (${c.alimModo === 'dinero' ? 'se paga en dinero' : 'la da la finca'})</label>
    </div>
    <div class="sec-label">Toque cada persona que recogió</div>
    <div class="chip-grid" id="chip-personas">${disp.map(x => `<button class="chip-btn person" onclick="agregarPersonaConocida('${x.pid}')"><span class="avatar">${iniciales(x.nombre)}</span>${esc(x.nombre)}${x.nomina ? '<span class="cs-tag">Nómina</span>' : ''}</button>`).join('') || (personasCosecha().length ? '<div class="hint">Ya agregó a todas las personas.</div>' : '<div class="hint">No hay personas registradas. Agréguelas en Personal (recolectores o empleados de nómina).</div>')}</div>
    <div id="lista-personas" style="margin-top:18px;"></div>`;
  renderListaPersonas(); document.getElementById('wiz-next-btn').textContent = 'Continuar';
}
agregarPersonaConocida = function (pid) {
  const x = personasCosecha().find(y => y.pid === pid) || { nombre: nombreTrabajador(pid) }; const p = { id: uid('p'), pid, trabajadorId: pid, nombre: x.nombre, kg: 0, horas: n0(cfgCosecha().horasJornal) || 8, esNomina: !!x.nomina, modalidad: null, tarifa: null };
  if (x.t && !x.nomina && n0(x.t.tarifaPorKg) && !wiz.tarifa) wiz.tarifa = n0(x.t.tarifaPorKg);
  wiz.personas.push(p); wizPaso3(); abrirKeypad(p.id, p.nombre, 'kg');
};
renderListaPersonas = function () {
  const host = document.getElementById('lista-personas'); if (!host) return;
  host.innerHTML = wiz.personas.map(p => { const r = pagoPersonaWiz(p); const pago = pagoRegistro(r), alim = alimRegistro(r);
    return `<div class="person-card cs-person"><div class="who"><span class="avatar">${iniciales(p.nombre)}</span><span><span class="name">${esc(p.nombre)}</span><small class="cs-sub">${MODALIDADES[r.modalidad].replace(' (sin pago aparte)', '')} · ${r.modalidad === 'kilo' ? fmt(r.tarifa) + '/kg · ' : ''}${r.modalidad === 'nomina' ? 'sin pago aparte' : fmt(pago)}${alim ? ' · alim. ' + fmtCorto(alim) : ''}</small></span></div>
      <div class="meta-btns"><button class="hbtn" onclick="abrirKeypad('${p.id}','${esc(p.nombre)}','horas')">${num(p.horas || 0)} h</button><button class="kgbtn" onclick="abrirKeypad('${p.id}','${esc(p.nombre)}','kg')">${num(p.kg || 0)} kg</button>
        <button class="hbtn cs-mod" title="Cambiar la forma de pago de esta persona" onclick="ciclarModalidad('${p.id}')">${r.modalidad === 'kilo' ? '$/kg' : r.modalidad === 'jornal' ? 'Jornal' : 'Nómina'}</button>${r.modalidad === 'kilo' ? `<button class="hbtn" title="Valor del kilo para esta persona" onclick="abrirKeypad('${p.id}','${esc(p.nombre)}','tarifa')">${fmtCorto(r.tarifa)}</button>` : ''}
        <button class="rm" onclick="quitarPersona('${p.id}')" aria-label="Quitar">✕</button></div></div>`; }).join('');
};
function ciclarModalidad(id) { const p = wiz.personas.find(x => x.id === id); if (!p) return; const act = pagoPersonaWiz(p).modalidad; const orden = ['kilo', 'jornal', 'nomina']; p.modalidad = orden[(orden.indexOf(act) + 1) % 3]; renderListaPersonas(); }
quitarPersona = function (id) { wiz.personas = wiz.personas.filter(p => p.id !== id); wizPaso3(); };
abrirKeypad = function (personId, nombre, modo) {
  keypadTargetId = personId; keypadMode = modo; const p = wiz.personas.find(x => x.id === personId);
  keypadBuffer = String(p ? (modo === 'kg' ? (p.kg || 0) : modo === 'horas' ? (p.horas || 0) : (p.tarifa != null ? p.tarifa : wiz.tarifa || 0)) : '0');
  document.getElementById('keypad-title').textContent = (modo === 'kg' ? 'Kilos de cereza — ' : modo === 'horas' ? 'Horas trabajadas — ' : 'Valor del kilo — ') + nombre;
  document.getElementById('keypad-unit').textContent = modo === 'kg' ? 'kg' : modo === 'horas' ? 'h' : '$/kg';
  document.getElementById('keypad-value').textContent = keypadBuffer; document.getElementById('keypad-overlay').classList.add('open');
};
keyConfirm = function () {
  const p = wiz.personas.find(x => x.id === keypadTargetId);
  if (p) { const v = Number(keypadBuffer) || 0; if (keypadMode === 'kg') p.kg = v; else if (keypadMode === 'horas') p.horas = v; else p.tarifa = v; }
  document.getElementById('keypad-overlay').classList.remove('open'); renderListaPersonas();
};
function wizPaso4() {
  updateDots(); const body = document.getElementById('wiz-body'); let tk = 0, tp = 0, ta = 0;
  const avisos = []; const filas = wiz.personas.map(p => { const r = pagoPersonaWiz(p); const pg = pagoRegistro(r), al = alimRegistro(r); tk += n0(p.kg); tp += pg; ta += al;
    const t = trabajadorDePersonaSinCrear(p.pid); if (t && registros.some(x => x.trabajadorId === t.id && x.fecha === wiz.fecha && (x.loteId || x.lote) === (wiz.loteId || wiz.loteNombre))) avisos.push(p.nombre + ' ya tiene un registro ese día en este lote.');
    if (r.modalidad === 'kilo' && !n0(p.kg)) avisos.push(p.nombre + ' tiene 0 kg.'); if (r.modalidad === 'kilo' && !n0(r.tarifa)) avisos.push('Falta el valor del kilo de ' + p.nombre + '.'); if (n0(p.horas) > 14) avisos.push(p.nombre + ' tiene más de 14 horas.');
    return `<div class="summary-line"><span>${esc(p.nombre)} <small style="color:var(--text-faint)">· ${num(p.horas || 0)} h · ${r.modalidad === 'kilo' ? fmt(r.tarifa) + '/kg' : MODALIDADES[r.modalidad]}</small></span><b>${num(p.kg || 0)} kg · ${fmt(pg)}</b></div>`; }).join('');
  body.innerHTML = `<div class="wiz-q">Confirme y guarde</div><div class="wiz-sub">${esc(wiz.loteNombre)} · ${fechaCorta(wiz.fecha)} ${String(wiz.fecha).slice(0, 4)} · ${CICLO_TXT(wiz.tipo)} · pasada ${wiz.pasada}</div>
    ${avisos.length ? `<div class="fl-sug alerta" style="margin-bottom:12px"><b>Revise antes de guardar</b><span>${avisos.map(esc).join('<br>')}</span></div>` : ''}
    <div>${filas}</div>
    <div class="summary-total"><span>Total</span><span>${num(redondear(tk, 1))} kg · ${fmt(tp)}</span></div>
    ${ta ? `<p class="hint">Alimentación ${cfgCosecha().alimModo === 'dinero' ? 'pagada en dinero (incluida arriba)' : 'entregada por la finca'}: ${fmt(ta)}.</p>` : ''}
    <p class="hint">Cada registro queda con su forma de pago, la fecha y hora de creación y su historial de cambios.</p>`;
  document.getElementById('wiz-next-btn').textContent = 'Guardar cosecha';
}
function trabajadorDePersonaSinCrear(pid) { if (!String(pid).startsWith('emp:')) return trabajadores.find(t => t.id === pid) || null; const e = empleados.find(x => x.id === pid.slice(4)); return e ? (trabajadores.find(t => t.empleadoId === e.id) || null) : null; }
const _wizNext20 = wizNext;
wizNext = function () {
  if (wizStep === 3) { if (!wiz.personas.length) { toast('Agregue al menos una persona.', 'err'); return; } if (wiz.personas.some(p => pagoPersonaWiz(p).modalidad === 'kilo' && !n0(p.kg))) { toast('Hay personas con 0 kg. Toque los kilos para escribirlos.', 'err'); return; } }
  return _wizNext20.apply(this, arguments);
};
confirmarGuardado = async function () {
  if (!wiz.loteId && wiz.loteNombre) { const variedadId = encontrarOCrearVariedad(wiz.variedadNombre) || wiz.variedadId; const loteId = encontrarOCrearLote(wiz.loteNombre, wiz.fincaId, variedadId); const bloqueId = encontrarOCrearBloque(wiz.bloqueNombre, loteId); wiz.loteId = loteId; wiz.variedadId = variedadId; wiz.bloqueId = bloqueId; }
  const lote = lotes.find(l => l.id === wiz.loteId); if (lote && !wiz.fincaId) wiz.fincaId = lote.fincaId; const ahora = ahoraISO(); const c = cfgCosecha(); const ids = [];
  wiz.personas.forEach(p => { const t = trabajadorDePersona(p.pid); if (!t) return; const r = pagoPersonaWiz(p);
    const reg = { id: uid('g'), fincaId: wiz.fincaId, loteId: wiz.loteId, loteNombre: wiz.loteNombre, bloqueId: wiz.bloqueId, bloqueNombre: wiz.bloqueNombre, variedadId: wiz.variedadId, variedadNombre: wiz.variedadNombre || nombreVariedad(wiz.variedadId),
      lote: wiz.loteNombre, bloque: wiz.bloqueNombre, variedad: wiz.variedadNombre || nombreVariedad(wiz.variedadId), finca: nombreFinca(wiz.fincaId) || '—', anio: Number(String(wiz.fecha).slice(0, 4)), tipo: wiz.tipo, pasada: wiz.pasada, fecha: wiz.fecha,
      trabajadorId: t.id, recolector: t.nombre, empleadoId: t.empleadoId || null, horas: n0(p.horas), kg: n0(p.kg), modalidad: r.modalidad, tarifa: r.modalidad === 'kilo' ? n0(r.tarifa) : 0, valorJornal: r.modalidad === 'jornal' ? n0(wiz.valorJornal) : null,
      alim: !!wiz.alim, alimValor: wiz.alim ? c.alimentacion : 0, alimModo: c.alimModo, creado: ahora };
    registros.push(reg); ids.push(reg.id);
    registrarCambio('registro', reg.id, t.nombre + ' · ' + wiz.fecha, 'Creación', num(reg.kg) + ' kg · ' + num(reg.horas) + ' h · ' + txtPagoReg(reg) + ' · ' + wiz.loteNombre + ' · ' + CICLO_TXT(wiz.tipo) + ' pasada ' + wiz.pasada, { loteId: wiz.loteId }); });
  await guardarEstado(); closeWizard(); render();
  toast('Cosecha guardada: ' + ids.length + ' registro(s) · ' + num(redondear(wiz.personas.reduce((a, p) => a + n0(p.kg), 0), 1)) + ' kg', 'ok');
  if (vistaActual !== 'panel') ir('panel');
};

/* ---------- Vista Cosecha ---------- */
let csSt = { anio: '', ciclo: 'Todos', lote: 'Todos', persona: 'Todos', pasada: 'Todas', abiertos: {} };
function render() { try { renderCosecha(); } catch (e) { dlog('✗ cosecha: ' + e.message, 'err'); } }
function refreshFilters() {}
function aniosCosecha() { return [...new Set([hoyLocal().slice(0, 4)].concat(registros.map(r => String(r.fecha).slice(0, 4))))].filter(a => /^\d{4}$/.test(a)).sort().reverse(); }
function regsFiltrados() { return registros.filter(r => String(r.fecha).slice(0, 4) === csSt.anio && (csSt.ciclo === 'Todos' || (r.tipo || 'Principal') === csSt.ciclo) && (csSt.lote === 'Todos' || (r.loteId || r.lote) === csSt.lote) && (csSt.persona === 'Todos' || r.trabajadorId === csSt.persona) && (csSt.pasada === 'Todas' || String(r.pasada || 1) === csSt.pasada)); }
function renderCosecha() {
  const root = document.getElementById('cs-root'); if (!root) return; tooltipsGlobales();
  const anios = aniosCosecha(); if (!csSt.anio || !anios.includes(csSt.anio)) { const conDatos = anios.find(a => registros.some(r => String(r.fecha).startsWith(a))); csSt.anio = registros.some(r => String(r.fecha).startsWith(hoyLocal().slice(0, 4))) ? hoyLocal().slice(0, 4) : (conDatos || anios[0]); }
  const rs = regsFiltrados(); const kg = rs.reduce((a, r) => a + n0(r.kg), 0), h = rs.reduce((a, r) => a + n0(r.horas), 0), pago = rs.reduce((a, r) => a + pagoRegistro(r), 0), alim = rs.reduce((a, r) => a + alimRegistro(r), 0), costo = rs.reduce((a, r) => a + costoRegistro(r), 0);
  const jorn = new Set(rs.map(r => r.trabajadorId + '|' + r.fecha)).size; const sinBen = rs.filter(r => !beneficioDeRegistro(r)); const kgSinBen = sinBen.reduce((a, r) => a + n0(r.kg), 0); const pend = rs.filter(r => modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)); const pendV = pend.reduce((a, r) => a + pagoRegistro(r), 0);
  const lotesOps = [...new Map(registros.map(r => [r.loteId || r.lote, r.loteNombre || r.lote || nombreLote(r.loteId)])).entries()];
  const pasOps = [...new Set(registros.filter(r => String(r.fecha).slice(0, 4) === csSt.anio && (csSt.ciclo === 'Todos' || (r.tipo || 'Principal') === csSt.ciclo)).map(r => String(r.pasada || 1)))].sort((a, b) => a - b);
  root.innerHTML = `
    <div class="cs-bar"><div class="chip-row" style="margin:0">
      <select aria-label="Año" onchange="csSt.anio=this.value;renderCosecha()">${anios.map(a => `<option ${a === csSt.anio ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <select aria-label="Ciclo" onchange="csSt.ciclo=this.value;csSt.pasada='Todas';renderCosecha()">${[['Todos', 'Principal y mitaca'], ['Principal', 'Cosecha principal'], ['Secundaria', 'Mitaca']].map(([v, t]) => `<option value="${v}" ${v === csSt.ciclo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select aria-label="Pasada" onchange="csSt.pasada=this.value;renderCosecha()"><option value="Todas">Todas las pasadas</option>${pasOps.map(p => `<option value="${p}" ${p === csSt.pasada ? 'selected' : ''}>Pasada ${p}</option>`).join('')}</select>
      <select aria-label="Lote" onchange="csSt.lote=this.value;renderCosecha()"><option value="Todos">Todos los lotes</option>${lotesOps.map(([k, n]) => `<option value="${esc(k)}" ${k === csSt.lote ? 'selected' : ''}>${esc(n || '—')}</option>`).join('')}</select>
      <select aria-label="Persona" onchange="csSt.persona=this.value;renderCosecha()"><option value="Todos">Todas las personas</option>${trabajadores.map(t => `<option value="${t.id}" ${t.id === csSt.persona ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></div>
      <div class="mp-actions"><button class="btn ghost small" onclick="abrirParametrosCosecha()">Parámetros de pago</button><button class="btn ghost small" onclick="abrirBeneficioCosecha()">Registrar beneficio</button><button class="btn primary small" onclick="openWizard()">+ Registrar día de cosecha</button></div></div>
    <div class="k19-grid k4" id="stat-row">
      ${kpi19('Cereza recolectada', num(redondear(kg, 1)) + ' <small>kg</small>', rs.length + ' registros · ' + new Set(rs.map(r => r.fecha)).size + ' días', '', 'i-cosecha')}
      ${kpi19('Productividad', h ? num(redondear(kg / h, 1)) + ' <small>kg/h</small>' : '—', num(jorn) + ' jornadas · ' + num(redondear(h, 1)) + ' h', '', 'i-analisis')}
      ${kpi19('Costo de recolección', fmtCorto(costo), (kg ? fmt(costo / kg) + ' por kg' : '') + (alim ? ' · alim. ' + fmtCorto(alim) : ''), '', 'i-finanzas')}
      ${kpi19('Pendiente por pagar', fmtCorto(pendV), pend.length ? pend.length + ' registro(s) sin liquidar' : 'todo liquidado', pendV ? 'mal' : 'bien', 'i-personal')}
    </div>
    ${kgSinBen > 0.5 ? `<div class="fl-sug alerta cs-aviso"><b>${num(redondear(kgSinBen, 1))} kg de cereza sin beneficio registrado</b><span>Para que el pergamino, el factor de conversión, la bodega y la trazabilidad de las ventas queden completos, registre el beneficio de cada pasada. <button class="link" onclick="abrirBeneficioCosecha()">Registrar beneficio</button></span></div>` : ''}
    <div class="card"><div class="title">Pasadas <span class="sub">cereza, pago y beneficio de cada pasada</span></div><div class="tscroll"><table class="dtable"><thead><tr><th>Ciclo · pasada</th><th>Lote</th><th>Fechas</th><th class="num">Personas</th><th class="num">Cereza</th><th class="num">kg/h</th><th class="num">Costo</th><th>Pago</th><th>Beneficio</th><th></th></tr></thead><tbody>${filasPasadas(rs)}</tbody></table></div></div>
    <div class="card" id="chart-lote"><div class="title">Cereza por día <span class="sub">kg y kg por hora</span></div>${graficoDias(rs)}</div>
    <div class="card"><div class="title">Registros por día <span class="sub">toque Editar para corregir; cada cambio queda en el historial</span></div><div id="cs-dias">${listaDias(rs)}</div></div>`;
}
function filasPasadas(rs) {
  const m = new Map(); rs.forEach(r => { const k = [r.tipo || 'Principal', r.pasada || 1, r.loteId || r.lote].join('|'); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  const filas = [...m.entries()].map(([k, a]) => ({ k, a, ini: a.map(r => r.fecha).sort()[0], fin: a.map(r => r.fecha).sort().pop() })).sort((x, y) => y.ini.localeCompare(x.ini));
  return filas.map(({ k, a, ini, fin }) => { const [tipo, pas] = k.split('|'); const kg = a.reduce((s, r) => s + n0(r.kg), 0), h = a.reduce((s, r) => s + n0(r.horas), 0), c = a.reduce((s, r) => s + costoRegistro(r), 0);
    const np = a.filter(r => modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)).length; const nb = a.filter(r => !beneficioDeRegistro(r)); const bens = [...new Set(a.map(r => r.beneficioId).filter(Boolean))].map(id => beneficios.find(b => b.id === id)).filter(Boolean);
    const kgP = bens.reduce((s, b) => s + n0(b.kgSalida), 0);
    return `<tr><td><b>${CICLO_TXT(tipo)} · ${pas}</b></td><td>${esc(a[0].loteNombre || a[0].lote || nombreLote(a[0].loteId))}</td><td>${fechaCorta(ini)}${fin !== ini ? ' – ' + fechaCorta(fin) : ''}</td><td class="num">${new Set(a.map(r => r.trabajadorId)).size}</td><td class="num">${num(redondear(kg, 1))} kg</td><td class="num">${h ? num(redondear(kg / h, 1)) : '—'}</td><td class="num">${fmt(c)}</td>
      <td>${np ? `<span class="pill ejecucion">${np} sin pagar</span>` : '<span class="pill cerrada">Pagada</span>'}</td>
      <td>${nb.length ? (bens.length ? `<span class="pill ejecucion">Parcial</span>` : `<button class="btn ghost small" onclick="abrirBeneficioCosecha('${esc(k)}')">Beneficiar</button>`) : `<span class="pill cerrada">${num(redondear(kgP, 1))} kg pergamino · factor ${kgP ? num(redondear(kg / kgP, 2)) : '—'}</span>`}</td>
      <td class="actions"><button class="btn ghost small" onclick="planillaDesdeCosecha('${esc(k)}')">Planilla PDF</button></td></tr>`; }).join('') || '<tr><td colspan="10" class="tb-na">Sin cosecha en este filtro. Use «Registrar día de cosecha».</td></tr>';
}
function graficoDias(rs) {
  const fechas = [...new Set(rs.map(r => r.fecha))].sort(); if (!fechas.length) return '<div class="empty">Sin datos.</div>';
  const kg = fechas.map(f => rs.filter(r => r.fecha === f).reduce((a, r) => a + n0(r.kg), 0)), kh = fechas.map(f => { const q = rs.filter(r => r.fecha === f); const h = q.reduce((a, r) => a + n0(r.horas), 0); return h ? q.reduce((a, r) => a + n0(r.kg), 0) / h : null; });
  return gLeyenda([{ color: 'var(--cereza)', txt: 'Cereza (kg)' }, { color: 'var(--c1)', txt: 'kg por hora', linea: true }]) + gCombo({ cats: fechas.map(f => fechaCorta(f)), series: [{ nombre: 'Cereza', vals: kg, color: 'var(--cereza)', fmtTip: v => num(redondear(v, 1)) + ' kg' }, { nombre: 'kg/h', tipo: 'linea', eje: 'der', vals: kh, color: 'var(--c1)' }], alto: 210, der0: false });
}
function listaDias(rs) {
  const g = new Map(); rs.forEach(r => { const k = grupoDia(r); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, a]) => { const [f, , tipo, pas] = k.split('|'); const kg = a.reduce((s, r) => s + n0(r.kg), 0), c = a.reduce((s, r) => s + costoRegistro(r), 0);
    return `<div class="cs-dia"><div class="cs-dia-h"><div><b>${diaSemana(f)} ${fechaCorta(f)} ${f.slice(0, 4)}</b><span>${esc(a[0].loteNombre || a[0].lote || nombreLote(a[0].loteId))} · ${CICLO_TXT(tipo)} · pasada ${pas}</span></div><div class="cs-dia-t"><b>${num(redondear(kg, 1))} kg</b><span>${fmt(c)}</span></div>
        <div class="cs-dia-a"><button class="btn ghost small" onclick="abrirEditarDia('${esc(k)}')">Ajustar día</button><button class="btn danger-ghost" onclick="eliminarDia('${esc(k)}')">Eliminar día</button></div></div>
      <div class="tscroll"><table class="dtable cs-tab"><thead><tr><th>Persona</th><th class="num">Horas</th><th class="num">Kilos</th><th>Forma de pago</th><th class="num">Pago</th><th class="num">Alimentación</th><th>Estado</th><th></th></tr></thead><tbody>${a.map(r => { const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r);
        return `<tr><td>${esc(r.recolector || nombreTrabajador(r.trabajadorId))}${r.empleadoId ? ' <span class="cs-tag">Nómina</span>' : ''}</td><td class="num">${num(r.horas || 0)}</td><td class="num">${num(redondear(r.kg, 1))}</td><td>${esc(txtPagoReg(r))}</td><td class="num">${fmt(pagoRegistro(r))}</td><td class="num">${alimRegistro(r) ? fmt(alimRegistro(r)) : '—'}</td>
          <td>${modalidadDe(r) === 'nomina' ? '<span class="pill">Nómina</span>' : pg ? `<span class="pill cerrada" title="Liquidado el ${esc(pg.fecha)}">Pagado</span>` : '<span class="pill ejecucion">Por pagar</span>'} ${bn ? '<span class="pill cerrada">Beneficiado</span>' : ''}</td>
          <td class="actions"><button class="btn ghost small" onclick="abrirEditarRegistro('${r.id}')">Editar</button><button class="btn ghost small" onclick="verHistorialRegistro('${r.id}')">Historial</button><button class="btn danger-ghost" onclick="eliminarRegistroCosecha('${r.id}')" aria-label="Eliminar">✕</button></td></tr>`; }).join('')}</tbody></table></div></div>`; }).join('') || '<div class="empty">Sin registros.</div>';
}

/* ---------- Edición auditada ---------- */
const CAMPOS_REG = [['fecha', 'Fecha'], ['loteId', 'Lote'], ['tipo', 'Ciclo'], ['pasada', 'Pasada'], ['trabajadorId', 'Persona'], ['horas', 'Horas'], ['kg', 'Kilos'], ['modalidad', 'Forma de pago'], ['tarifa', 'Valor del kilo'], ['valorJornal', 'Valor del jornal'], ['alim', 'Alimentación']];
const BLOQ_PAGO = ['trabajadorId', 'horas', 'kg', 'modalidad', 'tarifa', 'valorJornal', 'alim'], BLOQ_BEN = ['kg', 'loteId', 'fecha', 'tipo', 'pasada'];
function valTxt(k, v) { if (k === 'loteId') return nombreLote(v) || '—'; if (k === 'trabajadorId') return nombreTrabajador(v); if (k === 'tipo') return CICLO_TXT(v); if (k === 'modalidad') return MODALIDADES[v || 'kilo']; if (k === 'alim') return v ? 'Sí' : 'No'; if (['tarifa', 'valorJornal'].includes(k)) return v == null || v === '' ? '—' : fmt(v); return v == null || v === '' ? '—' : String(v); }
function formRegistro(r, dia) {
  const m = modalidadDe(r);
  return `<div class="fgrid c2">
    <label class="f">Fecha<input id="er-fecha" type="date" value="${esc(r.fecha)}"></label>
    <label class="f">Lote<select id="er-lote">${lotes.filter(l => activo(l) || l.id === r.loteId).map(l => `<option value="${l.id}" ${l.id === r.loteId ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></label>
    <label class="f">Ciclo<select id="er-tipo"><option value="Principal" ${r.tipo !== 'Secundaria' ? 'selected' : ''}>Cosecha principal</option><option value="Secundaria" ${r.tipo === 'Secundaria' ? 'selected' : ''}>Mitaca</option></select></label>
    <label class="f">Pasada<input id="er-pasada" type="number" min="1" step="1" value="${esc(r.pasada || 1)}"></label>
    ${dia ? '' : `<label class="f">Persona<select id="er-persona">${trabajadores.map(t => `<option value="${t.id}" ${t.id === r.trabajadorId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></label>
    <label class="f">Horas trabajadas<input id="er-horas" type="number" min="0" step="0.5" value="${esc(r.horas || 0)}"></label>
    <label class="f">Kilos de cereza<input id="er-kg" type="number" min="0" step="0.1" value="${esc(r.kg || 0)}"></label>`}
    <label class="f">Forma de pago<select id="er-mod" onchange="document.getElementById('er-tar-w').hidden=this.value!=='kilo';document.getElementById('er-jor-w').hidden=this.value!=='jornal'">${Object.entries(MODALIDADES).map(([k, t]) => `<option value="${k}" ${k === m ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="f" id="er-tar-w" ${m === 'kilo' ? '' : 'hidden'}>Valor del kilo ($)<input id="er-tarifa" type="number" min="0" step="10" value="${esc(tarifaDe(r))}"></label>
    <label class="f" id="er-jor-w" ${m === 'jornal' ? '' : 'hidden'}>Valor del jornal ($)<input id="er-jornal" type="number" min="0" step="1000" value="${esc(r.valorJornal != null ? r.valorJornal : cfgCosecha().valorJornal)}"></label>
    <label class="cs-check" style="align-self:end"><input id="er-alim" type="checkbox" ${r.alim ? 'checked' : ''}> Con alimentación (proporcional a las horas)</label></div>
    <label class="f" style="margin-top:12px">Motivo del cambio (obligatorio)<input id="er-motivo" placeholder="Ej. error de digitación de los kilos"></label>`;
}
function leerFormRegistro(dia) { const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  const o = { fecha: g('er-fecha'), loteId: g('er-lote'), tipo: g('er-tipo'), pasada: Math.max(1, Number(g('er-pasada')) || 1), modalidad: g('er-mod'), alim: document.getElementById('er-alim').checked };
  if (!dia) Object.assign(o, { trabajadorId: g('er-persona'), horas: n0(g('er-horas')), kg: n0(g('er-kg')) });
  o.tarifa = o.modalidad === 'kilo' ? n0(g('er-tarifa')) : 0; o.valorJornal = o.modalidad === 'jornal' ? n0(g('er-jornal')) : null; return o; }
function aplicarCambiosRegistro(r, nuevo, motivo) {
  const cambios = []; CAMPOS_REG.forEach(([k, et]) => { if (!(k in nuevo)) return; const a = k === 'modalidad' ? modalidadDe(r) : (k === 'alim' ? !!r[k] : r[k]); const b = nuevo[k]; if (String(a == null ? '' : a) !== String(b == null ? '' : b)) cambios.push({ campo: k, etiqueta: et, antes: valTxt(k, a), despues: valTxt(k, b) }); });
  if (!cambios.length) return null;
  const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r);
  const bp = pg && cambios.filter(c => BLOQ_PAGO.includes(c.campo)); if (bp && bp.length) return { error: 'Este registro ya fue pagado (' + fechaCorta(pg.fecha) + '). Para cambiar ' + bp.map(c => c.etiqueta.toLowerCase()).join(', ') + ', anule primero ese pago en Personal.' };
  const bb = bn && cambios.filter(c => BLOQ_BEN.includes(c.campo)); if (bb && bb.length) return { error: 'Este registro ya pasó por el beneficio del ' + fechaCorta(bn.fecha) + '. Para cambiar ' + bb.map(c => c.etiqueta.toLowerCase()).join(', ') + ', elimine primero ese beneficio.' };
  Object.assign(r, nuevo); const l = lotes.find(x => x.id === r.loteId); if (l) Object.assign(r, { loteNombre: l.nombre, lote: l.nombre, fincaId: l.fincaId, finca: nombreFinca(l.fincaId), variedadId: l.variedadId, variedadNombre: nombreVariedad(l.variedadId), variedad: nombreVariedad(l.variedadId) });
  r.anio = Number(String(r.fecha).slice(0, 4)); r.recolector = nombreTrabajador(r.trabajadorId); if (r.alim && !r.alimValor) { r.alimValor = cfgCosecha().alimentacion; r.alimModo = cfgCosecha().alimModo; }
  r.modificado = ahoraISO(); registrarCambio('registro', r.id, r.recolector + ' · ' + r.fecha, 'Edición', cambios.map(c => c.etiqueta + ': ' + c.antes + ' → ' + c.despues).join(' · ') + ' · Motivo: ' + motivo, { cambios, motivo, loteId: r.loteId });
  return { cambios };
}
function abrirEditarRegistro(id) {
  const r = registros.find(x => x.id === id); if (!r) return; const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r);
  openModal(`<h3>Editar registro de cosecha</h3><p class="hint">${esc(r.recolector || '')} · creado ${esc(r.creado || 'antes de la auditoría')}${pg ? ' · <b>pagado el ' + fechaCorta(pg.fecha) + '</b>' : ''}${bn ? ' · <b>beneficiado el ' + fechaCorta(bn.fecha) + '</b>' : ''}</p>${formRegistro(r)}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarEdicionRegistro('${id}')">Guardar cambios</button></div>`);
}
function guardarEdicionRegistro(id) {
  const r = registros.find(x => x.id === id); const motivo = document.getElementById('er-motivo').value.trim(); if (!motivo) { toast('Escriba el motivo del cambio.', 'err'); return; }
  const res = aplicarCambiosRegistro(r, leerFormRegistro(false), motivo); if (!res) { toast('No hubo cambios.'); closeModal(); return; } if (res.error) { toast(res.error, 'err'); return; }
  guardarEstado(); closeModal(); render(); toast('Registro actualizado · ' + res.cambios.length + ' cambio(s) en el historial', 'ok');
}
function regsDeGrupo(k) { return registros.filter(r => grupoDia(r) === k); }
function abrirEditarDia(k) {
  const a = regsDeGrupo(k); if (!a.length) return; const r0 = Object.assign({}, a[0]);
  openModal(`<h3>Ajustar el día completo</h3><p class="hint">Aplica a los ${a.length} registros de este día y lote: fecha, lote, ciclo, pasada, forma y valor de pago, y alimentación. Los kilos y horas se corrigen por persona con «Editar».</p>${formRegistro(r0, true)}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarEdicionDia('${esc(k)}')">Aplicar a ${a.length} registros</button></div>`);
}
function guardarEdicionDia(k) {
  const motivo = document.getElementById('er-motivo').value.trim(); if (!motivo) { toast('Escriba el motivo del cambio.', 'err'); return; } const nuevo = leerFormRegistro(true); let ok = 0; const err = [];
  regsDeGrupo(k).forEach(r => { const res = aplicarCambiosRegistro(r, Object.assign({}, nuevo), motivo); if (res && res.error) err.push(r.recolector + ': ' + res.error); else if (res) ok++; });
  if (ok) guardarEstado(); closeModal(); render(); toast(ok + ' registro(s) actualizados' + (err.length ? ' · ' + err.length + ' bloqueados por pago o beneficio' : ''), err.length ? 'err' : 'ok');
}
function bloqueoEliminar(r) { const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r); if (pg) return 'ya fue pagado el ' + fechaCorta(pg.fecha) + ' (anule el pago en Personal)'; if (bn) return 'ya pasó por el beneficio del ' + fechaCorta(bn.fecha) + ' (elimine ese beneficio primero)'; return null; }
function eliminarRegistroCosecha(id) {
  const r = registros.find(x => x.id === id); if (!r) return; const b = bloqueoEliminar(r); if (b) { toast('No se puede eliminar: ' + b + '.', 'err'); return; }
  openModal(`<h3>Eliminar registro</h3><p>${esc(r.recolector)} · ${fechaCorta(r.fecha)} ${r.fecha.slice(0, 4)} · ${num(r.kg)} kg · ${esc(txtPagoReg(r))}</p><label class="f">Motivo (obligatorio)<input id="el-motivo" placeholder="Ej. registro duplicado"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger-ghost" onclick="confirmarEliminarRegistros(['${id}'])">Eliminar</button></div>`);
}
function eliminarDia(k) {
  const a = regsDeGrupo(k); const bl = a.filter(bloqueoEliminar); if (bl.length) { toast('No se puede eliminar el día: ' + bl.length + ' registro(s) ya pagados o beneficiados.', 'err'); return; }
  openModal(`<h3>Eliminar el día completo</h3><p>${a.length} registros · ${num(redondear(a.reduce((s, r) => s + n0(r.kg), 0), 1))} kg del ${fechaCorta(a[0].fecha)} ${a[0].fecha.slice(0, 4)}.</p><label class="f">Motivo (obligatorio)<input id="el-motivo" placeholder="Ej. día registrado dos veces"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger-ghost" onclick="confirmarEliminarRegistros(${esc(JSON.stringify(a.map(r => r.id)))})">Eliminar ${a.length} registros</button></div>`);
}
function confirmarEliminarRegistros(ids) {
  const motivo = (document.getElementById('el-motivo') || {}).value; if (!motivo || !motivo.trim()) { toast('Escriba el motivo.', 'err'); return; } closeModal();
  const quitados = registros.filter(r => ids.includes(r.id));
  conDeshacer(quitados.length + ' registro(s) de cosecha eliminados', () => { registros = registros.filter(r => !ids.includes(r.id));
    quitados.forEach(r => registrarCambio('registro', r.id, r.recolector + ' · ' + r.fecha, 'Eliminación', num(r.kg) + ' kg · ' + txtPagoReg(r) + ' · Motivo: ' + motivo.trim(), { antes: JSON.parse(JSON.stringify(r)), motivo: motivo.trim(), loteId: r.loteId }));
    guardarEstado(); render(); });
}
function verHistorialRegistro(id) {
  const ev = bitacora.filter(b => b.refId === id).sort((a, b) => String(a.hora || a.fecha).localeCompare(String(b.hora || b.fecha))); const r = registros.find(x => x.id === id) || {};
  openModal(`<h3>Historial del registro</h3><p class="hint">${esc(r.recolector || '')} · ${esc(r.fecha || '')} · creado ${esc(r.creado || 'antes de la auditoría')}</p>
    <div class="fl-tl">${ev.map(b => `<div><time>${esc(b.hora || b.fecha)}</time><span><b>${esc(b.accion)}</b> · ${esc(b.detalle || '')}</span></div>`).join('') || '<p class="hint">Sin cambios registrados.</p>'}</div>
    ${pagoDeRegistro(r) ? `<p class="hint">Pagado en la liquidación del ${fechaCorta(pagoDeRegistro(r).fecha)}.</p>` : ''}${beneficioDeRegistro(r) ? `<p class="hint">Procesado en el beneficio del ${fechaCorta(beneficioDeRegistro(r).fecha)}.</p>` : ''}
    <div class="modal-actions"><button class="btn primary" onclick="closeModal()">Cerrar</button></div>`);
}

/* ---------- Beneficio desde la cosecha: liga cada kilo de cereza con su pergamino y su partida ---------- */
function abrirBeneficioCosecha(clave) {
  const pend = registros.filter(r => !beneficioDeRegistro(r)); if (!pend.length) { toast('Toda la cereza registrada ya tiene beneficio.', 'ok'); return; }
  const g = new Map(); pend.forEach(r => { const k = [r.tipo || 'Principal', r.pasada || 1, r.loteId || r.lote].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  const grupos = [...g.entries()].sort((a, b) => b[1][0].fecha.localeCompare(a[1][0].fecha)); const sel = clave && g.has(clave) ? clave : grupos[0][0];
  openModal(`<h3>Registrar beneficio</h3><p class="hint">Elija la cereza que entró al beneficio. Al guardar, cada registro queda ligado a este beneficio y, si lo marca, a una partida de pergamino lista para vender.</p>
    <label class="f">Cereza de<select id="bc-grupo" onchange="pintarBenCosecha()">${grupos.map(([k, a]) => { const [t, p] = k.split('|'); return `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${CICLO_TXT(t)} · pasada ${p} · ${esc(a[0].loteNombre || a[0].lote || '')} · ${num(redondear(a.reduce((s, r) => s + n0(r.kg), 0), 1))} kg</option>`; }).join('')}</select></label>
    <div id="bc-regs" class="cs-bregs"></div>
    <div class="fgrid c2" style="margin-top:12px">
      <label class="f">Fecha del beneficio<input id="bc-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Proceso<select id="bc-metodo">${['Lavado', 'Honey', 'Natural', 'Semilavado'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="f">Horas de fermentación<input id="bc-ferm" type="number" min="0" step="1" placeholder="Ej. 18"></label>
      <label class="f">Secado<select id="bc-secado">${['Marquesina solar', 'Patio / elba', 'Secador mecánico', 'Silo'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="f">Pergamino seco obtenido (kg)<input id="bc-perg" type="number" min="0" step="0.1" oninput="pintarBenCosecha()"></label>
      <label class="f">Pasilla (kg, opcional)<input id="bc-pas" type="number" min="0" step="0.1"></label>
      <label class="f">Humedad final (%, opcional)<input id="bc-hum" type="number" min="0" step="0.1" placeholder="10 a 12"></label>
      <label class="cs-check" style="align-self:end"><input id="bc-partida" type="checkbox" checked> Crear la partida de pergamino para la venta</label></div>
    <p class="hint" id="bc-factor" style="margin-top:8px"></p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarBenCosecha()">Guardar beneficio</button></div>`);
  pintarBenCosecha();
}
function regsGrupoBen(k) { return registros.filter(r => !beneficioDeRegistro(r) && [r.tipo || 'Principal', r.pasada || 1, r.loteId || r.lote].join('|') === k); }
function pintarBenCosecha() {
  const k = document.getElementById('bc-grupo').value; const a = regsGrupoBen(k); const host = document.getElementById('bc-regs'); const marcados = new Set([...document.querySelectorAll('.bc-r:checked')].map(e => e.value));
  const prim = !host.dataset.k || host.dataset.k !== k; host.dataset.k = k;
  host.innerHTML = a.sort((x, y) => x.fecha.localeCompare(y.fecha)).map(r => `<label class="cs-check"><input type="checkbox" class="bc-r" value="${r.id}" ${prim || marcados.has(r.id) ? 'checked' : ''} onchange="pintarBenCosecha()"> ${fechaCorta(r.fecha)} · ${esc(r.recolector)} · ${num(redondear(r.kg, 1))} kg</label>`).join('');
  const kg = [...document.querySelectorAll('.bc-r:checked')].reduce((s, e) => s + n0((registros.find(r => r.id === e.value) || {}).kg), 0); const pe = n0(document.getElementById('bc-perg').value);
  document.getElementById('bc-factor').innerHTML = `Cereza seleccionada: <b>${num(redondear(kg, 1))} kg</b>${pe ? ` · factor de conversión <b>${num(redondear(kg / pe, 2))}</b> kg de cereza por kg de pergamino (lo usual está entre 4,8 y 5,4)` : ''}`;
}
function guardarBenCosecha() {
  const ids = [...document.querySelectorAll('.bc-r:checked')].map(e => e.value); if (!ids.length) { toast('Seleccione la cereza que entró al beneficio.', 'err'); return; }
  const pe = n0(document.getElementById('bc-perg').value); if (!pe) { toast('Escriba los kilos de pergamino seco obtenidos.', 'err'); return; }
  const rs = registros.filter(r => ids.includes(r.id)); const kg = rs.reduce((s, r) => s + n0(r.kg), 0); const f = k => document.getElementById(k).value;
  const b = { id: uid('bn'), loteId: rs[0].loteId, fecha: f('bc-fecha'), metodo: f('bc-metodo'), kgEntrada: redondear(kg, 2), kgSalida: pe, fermentacionHoras: n0(f('bc-ferm')) || null, secado: f('bc-secado'), kgPasilla: n0(f('bc-pas')) || null, humedad: n0(f('bc-hum')) || null, tipo: rs[0].tipo || 'Principal', pasada: rs[0].pasada || 1, registroIds: ids, creado: ahoraISO() };
  if (b.fecha < rs.map(r => r.fecha).sort().pop()) { toast('La fecha del beneficio no puede ser anterior a la recolección.', 'err'); return; }
  beneficios.push(b); rs.forEach(r => { r.beneficioId = b.id; });
  registrarCambio('beneficio', b.id, 'Beneficio ' + b.fecha + ' · ' + nombreLote(b.loteId), 'Creación', num(redondear(kg, 1)) + ' kg de cereza (' + ids.length + ' registros) → ' + num(pe) + ' kg de pergamino · factor ' + num(redondear(kg / pe, 2)) + ' · ' + b.metodo, { loteId: b.loteId, registroIds: ids });
  let txt = 'Beneficio guardado · factor ' + num(redondear(kg / pe, 2));
  if (document.getElementById('bc-partida').checked) { const p = { id: uid('pt'), codigo: siguienteCodigoPartida(b.fecha), fecha: b.fecha, tipo: 'Pergamino seco', proceso: b.metodo, humedad: b.humedad, factor: null, taza: null, notas: '', beneficioIds: [b.id], kg: null, fincaId: (lotes.find(l => l.id === b.loteId) || {}).fincaId || '' };
    partidas.push(p); registrarCambio('partida', p.id, p.codigo, 'Creación', 'Desde el beneficio del ' + b.fecha + ' · ' + num(pe) + ' kg', { beneficioId: b.id }); txt += ' · partida ' + p.codigo; }
  guardarEstado(); closeModal(); render(); toast(txt, 'ok');
}
function eliminarBeneficio(id) {
  const b = beneficios.find(x => x.id === id); if (!b) return; const pt = partidas.filter(p => (p.beneficioIds || []).includes(id));
  const vend = pt.filter(p => vendidoDePartida(p.id) > 0.01); if (vend.length) { toast('No se puede eliminar: su pergamino ya se vendió (partida ' + vend.map(p => p.codigo).join(', ') + ').', 'err'); return; }
  conDeshacer('Beneficio eliminado', () => { beneficios = beneficios.filter(x => x.id !== id); registros.forEach(r => { if (r.beneficioId === id) delete r.beneficioId; });
    pt.forEach(p => { p.beneficioIds = (p.beneficioIds || []).filter(x => x !== id); }); partidas = partidas.filter(p => (p.beneficioIds || []).length);
    registrarCambio('beneficio', id, 'Beneficio ' + b.fecha, 'Eliminación', num(b.kgEntrada) + ' kg cereza → ' + num(b.kgSalida) + ' kg pergamino', { antes: JSON.parse(JSON.stringify(b)) }); renderOperacion(); render(); guardarEstado(); });
}
function planillaDesdeCosecha(k) { const [tipo, pas] = k.split('|'); const pa = pasadasCosecha().find(x => x.tipo === tipo && String(x.pasada) === String(pas)); repPlanilla({ pasada: pa ? pa.k : '' }); }

/* ---------- Parámetros de pago ---------- */
function abrirParametrosCosecha() {
  const c = cfgCosecha();
  openModal(`<h3>Parámetros de pago de la cosecha</h3><p class="hint">Son los valores por defecto. En cada día de cosecha puede cambiar el valor del kilo o del jornal, y por persona.</p>
    <div class="fgrid c2"><label class="f">Valor del kilo por defecto ($)<input id="pc-tar" type="number" min="0" step="10" value="${c.tarifaKg || ''}" placeholder="Ej. 900"></label>
      <label class="f">Valor del jornal ($)<input id="pc-jor" type="number" min="0" step="1000" value="${c.valorJornal}"></label>
      <label class="f">Horas de un jornal<input id="pc-hj" type="number" min="1" max="12" step="0.5" value="${c.horasJornal}"></label>
      <label class="f">Alimentación por jornal ($)<input id="pc-ali" type="number" min="0" step="500" value="${c.alimentacion}"></label>
      <label class="f">La alimentación<select id="pc-modo"><option value="especie" ${c.alimModo === 'especie' ? 'selected' : ''}>La da la finca (costo de la finca)</option><option value="dinero" ${c.alimModo === 'dinero' ? 'selected' : ''}>Se paga en dinero al trabajador</option></select></label>
      <label class="cs-check" style="align-self:end"><input id="pc-def" type="checkbox" ${c.alimRecoleccion ? 'checked' : ''}> La recolección incluye alimentación por defecto</label></div>
    <p class="hint" style="margin-top:10px">Alimentación proporcional: con ${num(c.horasJornal)} horas o más se reconoce completa; con menos, la parte proporcional (por ejemplo, 4 h = la mitad). El jornal se calcula igual. El jornal y la alimentación también se usan en el presupuesto de las órdenes de trabajo.</p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarParametrosCosecha()">Guardar</button></div>`);
}
function guardarParametrosCosecha() {
  const g = id => document.getElementById(id).value; const antes = cfgCosecha();
  planConfig = Object.assign({}, planConfig || {}, { valorJornal: n0(g('pc-jor')) || antes.valorJornal, alimentacion: n0(g('pc-ali')), cosecha: { tarifaKg: n0(g('pc-tar')), horasJornal: n0(g('pc-hj')) || 8, alimModo: g('pc-modo'), alimRecoleccion: document.getElementById('pc-def').checked } });
  const d = cfgCosecha(); registrarCambio('parametros', 'cosecha', 'Parámetros de cosecha', 'Edición', ['tarifaKg', 'valorJornal', 'horasJornal', 'alimentacion', 'alimModo', 'alimRecoleccion'].filter(k => String(antes[k]) !== String(d[k])).map(k => k + ': ' + antes[k] + ' → ' + d[k]).join(' · '));
  guardarEstado(); closeModal(); render(); toast('Parámetros guardados. Aplican a los registros nuevos; los existentes conservan su valor.', 'ok');
}

/* ---------- Personal: pagos ligados a cada registro, con anulación auditada ---------- */
function renderTrabajadores() {
  const host = document.getElementById('lista-trabajadores'); if (!host) return;
  host.innerHTML = trabajadores.map(t => { const pend = pendientesPago(t.id); const kg = pend.reduce((a, r) => a + n0(r.kg), 0), bruto = pend.reduce((a, r) => a + pagoRegistro(r), 0); const ad = adelantosPendientesDe(t.id).reduce((a, x) => a + n0(x.valor), 0);
    const pagosT = pagos.filter(p => p.trabajadorId === t.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))); const emp = t.empleadoId && empleados.find(e => e.id === t.empleadoId);
    return `<div class="worker-card"><div class="worker-head"><div class="who"><div class="avatar">${iniciales(t.nombre)}</div><div><div class="name">${esc(t.nombre)} ${emp ? '<span class="cs-tag">Nómina · ' + esc(emp.cargo || '') + '</span>' : ''}</div><div class="tarifa">${n0(t.tarifaPorKg) ? fmt(t.tarifaPorKg) + '/kg por defecto' : 'sin tarifa por defecto'}${t.telefono ? ' · ' + esc(t.telefono) : ''}</div></div></div>
        <span style="display:flex;gap:6px;"><button class="btn ghost small" onclick="editarEntidad('trabajador','${t.id}')">Editar</button><button class="btn danger-ghost" onclick="eliminarTrabajador('${t.id}')">Eliminar</button></span></div>
      <div class="worker-stats"><div class="ws"><div class="n">${num(redondear(kg, 1))}</div><div class="l">Kg sin liquidar (${pend.length} registros)</div></div><div class="ws"><div class="n">${fmt(bruto)}</div><div class="l">Valor por pagar</div></div><div class="ws"><div class="n">${fmt(ad)}</div><div class="l">Adelantos pendientes</div></div><div class="ws"><div class="n">${fmt(bruto - ad)}</div><div class="l">Neto a pagar</div></div></div>
      <div class="worker-actions"><button class="btn ghost small" onclick="abrirModalAdelanto('${t.id}')">+ Registrar adelanto</button><button class="btn primary small" onclick="abrirModalPago('${t.id}')" ${pend.length ? '' : 'disabled'}>Liquidar y generar comprobante</button></div>
      ${pagosT.length ? `<details class="ayuda" style="margin-top:12px"><summary>Pagos realizados (${pagosT.length})</summary>${pagosT.map(p => `<div class="kv"><span>${fechaCorta(p.fecha)} ${String(p.fecha).slice(0, 4)} · ${esc(p.motivo || '')} · ${num(redondear(p.kgTotal, 1))} kg${p.anulado ? ' · ANULADO' : ''}</span><b>${fmt(p.valorNeto)} <button class="link" onclick="reimprimirPago('${p.id}')">PDF</button> <button class="link" style="color:var(--danger)" onclick="anularPago('${p.id}')">Anular</button></b></div>`).join('')}</details>` : ''}</div>`; }).join('') || '<div class="empty">Aún no tiene recolectores. Agréguelos aquí; los empleados de nómina también pueden registrar cosecha.</div>';
}
function abrirModalPago(tid) {
  const t = trabajadores.find(x => x.id === tid); const pend = pendientesPago(tid); if (!pend.length) { toast('No hay cosecha pendiente de pago.', 'err'); return; }
  const bruto = pend.reduce((a, r) => a + pagoRegistro(r), 0); const ad = adelantosPendientesDe(tid); const tad = ad.reduce((a, x) => a + n0(x.valor), 0);
  openModal(`<h3>Liquidar a ${esc(t.nombre)}</h3><p class="hint">Se liquidan ${pend.length} registros sin pagar, del ${fechaCorta(pend[0].fecha)} al ${fechaCorta(pend[pend.length - 1].fecha)}. Cada registro queda marcado como pagado con este comprobante.</p>
    <div class="tscroll"><table class="dtable"><thead><tr><th>Fecha</th><th>Lote</th><th class="num">Horas</th><th class="num">Kilos</th><th>Forma de pago</th><th class="num">Valor</th></tr></thead><tbody>${pend.map(r => `<tr><td>${fechaCorta(r.fecha)}</td><td>${esc(r.loteNombre || r.lote || '')}</td><td class="num">${num(r.horas || 0)}</td><td class="num">${num(redondear(r.kg, 1))}</td><td>${esc(txtPagoReg(r))}</td><td class="num">${fmt(pagoRegistro(r))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="5">Valor bruto</td><td class="num">${fmt(bruto)}</td></tr>${tad ? `<tr><td colspan="5">Adelantos descontados</td><td class="num">−${fmt(tad)}</td></tr>` : ''}<tr><td colspan="5">Neto a pagar</td><td class="num">${fmt(bruto - tad)}</td></tr></tfoot></table></div>
    <label class="f" style="margin-top:12px">Motivo<select id="pago-motivo"><option>Fin de pasada</option><option>Pago semanal</option><option>Liquidación por retiro</option></select></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarPago('${tid}')">Confirmar pago y generar PDF</button></div>`);
}
async function confirmarPago(tid) {
  const t = trabajadores.find(x => x.id === tid); const pend = pendientesPago(tid); if (!pend.length) return; const motivo = document.getElementById('pago-motivo').value;
  const valorBruto = pend.reduce((a, r) => a + pagoRegistro(r), 0); const ad = adelantosPendientesDe(tid); const tad = ad.reduce((a, x) => a + n0(x.valor), 0);
  const pago = { id: uid('pg'), trabajadorId: tid, periodoInicio: pend[0].fecha, periodoFin: pend[pend.length - 1].fecha, kgTotal: redondear(pend.reduce((a, r) => a + n0(r.kg), 0), 2), valorBruto: Math.round(valorBruto), adelantosDescontados: tad, valorNeto: Math.round(valorBruto - tad), fecha: hoyLocal(), motivo, registroIds: pend.map(r => r.id), adelantoIds: ad.map(a => a.id), creado: ahoraISO() };
  pagos.push(pago); pend.forEach(r => { r.pagoId = pago.id; }); ad.forEach(a => { a.aplicado = true; a.pagoId = pago.id; });
  registrarCambio('pago', pago.id, 'Pago a ' + t.nombre, 'Creación', pend.length + ' registros · ' + num(pago.kgTotal) + ' kg · bruto ' + fmt(pago.valorBruto) + (tad ? ' · adelantos ' + fmt(tad) : '') + ' · neto ' + fmt(pago.valorNeto), { trabajadorId: tid, registroIds: pago.registroIds });
  await guardarEstado(); closeModal(); renderTrabajadores(); render(); generarPDFTirilla(t, pago, ad);
}
function reimprimirPago(id) { const p = pagos.find(x => x.id === id); if (!p) return; const t = trabajadores.find(x => x.id === p.trabajadorId) || { nombre: nombreTrabajador(p.trabajadorId) }; generarPDFTirilla(t, p, adelantos.filter(a => (p.adelantoIds || []).includes(a.id))); }
function anularPago(id) {
  const p = pagos.find(x => x.id === id); if (!p) return;
  openModal(`<h3>Anular pago</h3><p>${esc(nombreTrabajador(p.trabajadorId))} · ${fechaCorta(p.fecha)} · neto ${fmt(p.valorNeto)}. Los registros vuelven a quedar por pagar y los adelantos descontados, pendientes.</p><label class="f">Motivo (obligatorio)<input id="an-motivo" placeholder="Ej. se liquidó con la tarifa equivocada"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger-ghost" onclick="confirmarAnularPago('${id}')">Anular pago</button></div>`);
}
function confirmarAnularPago(id) {
  const motivo = document.getElementById('an-motivo').value.trim(); if (!motivo) { toast('Escriba el motivo.', 'err'); return; } const p = pagos.find(x => x.id === id); if (!p) return;
  registros.forEach(r => { if (r.pagoId === id) delete r.pagoId; }); adelantos.forEach(a => { if (a.pagoId === id || (p.adelantoIds || []).includes(a.id)) { a.aplicado = false; delete a.pagoId; } }); pagos = pagos.filter(x => x.id !== id);
  registrarCambio('pago', id, 'Pago a ' + nombreTrabajador(p.trabajadorId), 'Anulación', 'Neto ' + fmt(p.valorNeto) + ' · Motivo: ' + motivo, { antes: JSON.parse(JSON.stringify(p)), motivo });
  guardarEstado(); closeModal(); renderTrabajadores(); render(); toast('Pago anulado; los registros quedaron por pagar.', 'ok');
}
