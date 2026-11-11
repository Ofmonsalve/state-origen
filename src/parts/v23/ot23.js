/* ================= v23 · Órdenes de trabajo: equipo con horas, lista de chequeo de seguridad, evidencias, carencia y aprobación antes de contabilizar ================= */
const CHECK_OT = [['epp', 'Se usó el equipo de protección (EPP) indicado'], ['dosis', 'Insumo y dosis según la etiqueta o la receta del técnico'], ['area', 'Se cubrió toda el área de la orden'], ['residuos', 'Envases lavados (triple lavado) y residuos bien dispuestos']];
const esAgroquimico = o => /fung|insectic|herbic|fitosan|fumig|aspersi|roya|broca|plaguic|foliar/i.test((o.tipo || '') + ' ' + (o.insumos || []).map(i => i.nombre).join(' '));
Object.assign(CLASE_ESTADO, { 'Por aprobar': 'ejecucion', 'Rehacer': 'alta' });
function requiereAprobacion() { return !!cfgCampo().otAprobacion; }
const _abrirCierreOT22 = abrirCierreOT;
abrirCierreOT = function (id) {
  _abrirCierreOT22(id); const o = ordenes.find(x => x.id === id); if (!o) return; const ins = document.getElementById('ci-obs'); if (!ins) return; const agro = esAgroquimico(o); const prev = (o.real && o.real.equipo) || [];
  const box = document.createElement('div'); box.innerHTML = `<div class="sec-label">Equipo que ejecutó <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--text-faint)">· con las horas, los jornales se calculan solos (${num(n0(cfgCosecha().horasJornal) || 8)} h = 1 jornal)</span></div>
    <div id="ci-eq">${(prev.length ? prev : [{}]).map(filaEquipo23).join('')}</div><button class="link" onclick="document.getElementById('ci-eq').insertAdjacentHTML('beforeend', filaEquipo23({}))">+ Otra persona</button>
    <div class="sec-label">Lista de chequeo${agro ? ' <span class="pill alta" style="margin-left:6px">obligatoria: orden con agroquímicos</span>' : ''}</div>
    <div class="ot23-chk">${CHECK_OT.map(([k, t]) => `<label class="cs-check"><input type="checkbox" class="ci-chk" value="${k}"> ${t}</label>`).join('')}</div>
    ${agro ? `<div class="fgrid c2" style="margin-top:8px"><label class="f">Carencia del producto (días, según la etiqueta)<input id="ci-car" type="number" min="0" placeholder="Ej. 30"></label></div>` : ''}
    <div class="sec-label">Evidencias</div><div id="ci-ev">${filaEvidencia23({})}</div><button class="link" onclick="document.getElementById('ci-ev').insertAdjacentHTML('beforeend', filaEvidencia23({}))">+ Otra evidencia</button>
    ${requiereAprobacion() ? '<p class="hint" style="margin-top:8px">Esta orden quedará <b>por aprobar</b>: su costo entra a la contabilidad cuando se apruebe.</p>' : ''}`;
  ins.closest('label').after(box);
};
function filaEquipo23(e) { return `<div class="fgrid c3 ci-eqr" style="margin-bottom:6px"><select class="ci-eqp" onchange="jornalesEquipo23()"><option value="">— Persona —</option>${personasCosecha().map(p => `<option value="${esc(p.pid)}" ${p.pid === e.pid ? 'selected' : ''}>${esc(p.nombre)}${p.nomina ? ' (nómina)' : ''}</option>`).join('')}</select><input class="ci-eqh" type="number" min="0" step="0.5" value="${e.horas != null ? e.horas : 8}" placeholder="Horas" oninput="jornalesEquipo23()"><select class="ci-eqrol"><option ${e.rol === 'Operario' || !e.rol ? 'selected' : ''}>Operario</option><option ${e.rol === 'Responsable' ? 'selected' : ''}>Responsable</option><option ${e.rol === 'Apoyo' ? 'selected' : ''}>Apoyo</option></select></div>`; }
function filaEvidencia23(v) { return `<div class="fgrid c2 ci-evr" style="margin-bottom:6px"><input class="ci-evd" value="${esc(v.desc || '')}" placeholder="Qué muestra (Ej. foto del lote aplicado)"><input class="ci-evu" value="${esc(v.url || '')}" placeholder="Enlace a la foto o documento (Drive, WhatsApp…)"></div>`; }
function leerEquipo23() { return [...document.querySelectorAll('.ci-eqr')].map(r => ({ pid: r.querySelector('.ci-eqp').value, horas: n0(r.querySelector('.ci-eqh').value), rol: r.querySelector('.ci-eqrol').value })).filter(e => e.pid).map(e => Object.assign(e, { nombre: (personasCosecha().find(p => p.pid === e.pid) || {}).nombre || '' })); }
function jornalesEquipo23() { const eq = leerEquipo23(); if (!eq.length) return; const hj = n0(cfgCosecha().horasJornal) || 8; const j = redondear(eq.reduce((s, e) => s + Math.min(1, e.horas / hj), 0), 2); const inp = document.getElementById('ci-jornales'); if (inp) { inp.value = j; if (typeof syncCierre === 'function') syncCierre(); } }
const _confirmarCierreOT22 = confirmarCierreOT;
confirmarCierreOT = function () {
  const o = ordenes.find(x => x.id === (cierreDraft || {}).otId); if (!o) return _confirmarCierreOT22();
  const eq = leerEquipo23(), chk = [...document.querySelectorAll('.ci-chk:checked')].map(e => e.value), ev = [...document.querySelectorAll('.ci-evr')].map(r => ({ desc: r.querySelector('.ci-evd').value.trim(), url: r.querySelector('.ci-evu').value.trim() })).filter(v => v.desc || v.url);
  const car = document.getElementById('ci-car') ? n0(document.getElementById('ci-car').value) : null;
  if (esAgroquimico(o) && !(chk.includes('epp') && chk.includes('dosis'))) { toast('Orden con agroquímicos: confirme el uso de EPP y la dosis según la etiqueta.', 'err'); return; }
  const antes = new Set(labores.map(l => l.id)); _confirmarCierreOT22(); if (o.estado !== 'Cerrada' || !o.real) return;
  Object.assign(o.real, { equipo: eq, checklist: chk, evidencias: ev, carencia: car || null }); const lb = labores.find(l => !antes.has(l.id) && l.otId === o.id);
  if (lb) { if (car) lb.carencia = car; if (eq.length) { lb.personas = eq.length; lb.horas = redondear(eq.reduce((s, e) => s + e.horas, 0) / eq.length, 1); lb.responsable = lb.responsable || (eq.find(e => e.rol === 'Responsable') || eq[0]).nombre; } }
  if (requiereAprobacion() && lb) { labores = labores.filter(l => l.id !== lb.id); o.laborPendiente = lb; delete o.laborId; o.estado = 'Por aprobar'; registrarCambio('ot', o.id, o.numero, 'Ejecución', 'Costo real ' + fmt(o.real.total) + ' · espera aprobación', { loteId: o.loteId }); toast(o.numero + ' ejecutada: queda por aprobar', 'ok'); }
  else registrarCambio('ot', o.id, o.numero, 'Cierre', 'Costo real ' + fmt(o.real.total) + (eq.length ? ' · ' + eq.length + ' persona(s)' : '') + (chk.length ? ' · chequeo ' + chk.length + '/' + CHECK_OT.length : ''), { loteId: o.loteId });
  guardarEstado(); renderPlaneacion(); renderOperacion(); renderFinanzas();
};
function aprobarOT23(id) { const o = ordenes.find(x => x.id === id); if (!o || o.estado !== 'Por aprobar') return; const lb = o.laborPendiente; if (lb) { labores.push(lb); o.laborId = lb.id; } delete o.laborPendiente; o.estado = 'Cerrada'; o.aprobacion = { fecha: hoyLocal(), hora: ahoraISO() };
  registrarCambio('ot', o.id, o.numero, 'Aprobación', 'Costo ' + fmt((o.real || {}).total) + ' contabilizado', { loteId: o.loteId }); guardarEstado(); closeModal(); renderPlaneacion(); renderOperacion(); renderFinanzas(); toast(o.numero + ' aprobada y contabilizada', 'ok'); }
function rechazarOT23(id) { openModal(`<h3>Devolver la orden para rehacer</h3><label class="f">Motivo (obligatorio)<input id="rj-m" placeholder="Ej. faltó aplicar en la parte baja"></label><div class="modal-actions"><button class="btn ghost" onclick="verOT('${id}')">Volver</button><button class="btn danger-ghost" onclick="confirmarRechazo23('${id}')">Devolver</button></div>`); }
function confirmarRechazo23(id) { const m = document.getElementById('rj-m').value.trim(); if (!m) { toast('Escriba el motivo.', 'err'); return; } const o = ordenes.find(x => x.id === id); if (!o) return;
  o.rechazos = (o.rechazos || []).concat([{ fecha: hoyLocal(), motivo: m, real: o.real }]); delete o.real; delete o.laborPendiente; delete o.cerrada; o.estado = 'Rehacer'; registrarCambio('ot', o.id, o.numero, 'Rechazo', 'Motivo: ' + m, { loteId: o.loteId }); guardarEstado(); closeModal(); renderPlaneacion(); toast(o.numero + ' devuelta para rehacer', 'ok'); }
const _verOT22 = verOT;
verOT = function (id) {
  _verOT22(id); const o = ordenes.find(x => x.id === id); if (!o) return; const fila = document.querySelector('.act-row'); if (!fila) return; const r = o.real || (o.estado === 'Por aprobar' ? o.real : null);
  let extra = '';
  if (r && ((r.equipo || []).length || (r.checklist || []).length || (r.evidencias || []).length || r.carencia)) extra += `<div class="sec-label">Equipo, chequeo y evidencias</div>${(r.equipo || []).length ? `<table class="dtable"><thead><tr><th>Persona</th><th>Rol</th><th class="num">Horas</th></tr></thead><tbody>${r.equipo.map(e => `<tr><td>${esc(e.nombre)}</td><td>${esc(e.rol)}</td><td class="num">${num(e.horas)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="ot23-chk" style="margin-top:8px">${CHECK_OT.map(([k, t]) => `<div class="${(r.checklist || []).includes(k) ? 'ok' : 'no'}">${(r.checklist || []).includes(k) ? '✓' : '○'} ${t}</div>`).join('')}</div>${r.carencia ? `<p class="hint">Carencia: ${num(r.carencia)} días · hasta el ${fechaCorta(sumarDias(r.fecha, r.carencia))}.</p>` : ''}
    ${(r.evidencias || []).map(v => `<div class="kv"><span>${esc(v.desc || 'Evidencia')}</span><b>${/^https?:\/\//.test(v.url) ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">Abrir</a>` : esc(v.url || '')}</b></div>`).join('')}`;
  if ((o.rechazos || []).length) extra += `<div class="sec-label">Devoluciones</div>${o.rechazos.map(x => `<div class="kv"><span>${fechaCorta(x.fecha)}</span><b>${esc(x.motivo)}</b></div>`).join('')}`;
  if (o.aprobacion) extra += `<p class="hint">Aprobada el ${fechaCorta(o.aprobacion.fecha)}.</p>`;
  if (extra) fila.insertAdjacentHTML('beforebegin', extra);
  if (o.estado === 'Por aprobar') fila.innerHTML = `<button class="btn ghost small" onclick="exportarOTPDF('${o.id}')">Orden (PDF)</button><button class="btn primary small" onclick="aprobarOT23('${o.id}')">Aprobar y contabilizar ${fmt((o.real || {}).total)}</button><button class="btn danger-ghost" onclick="rechazarOT23('${o.id}')">Devolver para rehacer</button>`;
};
