/* ================= PLAN AGRONÓMICO: anual y mensual ================= */
let agSt = { anio: Number(hoyLocal().slice(0, 4)), mes: Number(hoyLocal().slice(5, 7)), fincaId: '', vista: 'anual' };
/* Rendimiento de referencia (jornales por hectárea) y grupo de color de cada labor. Editable en cada actividad. */
const LABOR_STD = {
  'Fertilización edáfica': { jh: 2, g: 'nutricion' }, 'Fertilización foliar': { jh: 1.2, g: 'nutricion' }, 'Encalado / enmienda de suelo': { jh: 2.5, g: 'nutricion' },
  'Control de malezas (guadaña)': { jh: 4, g: 'arvenses' }, 'Fumigación — control de hierba': { jh: 2, g: 'arvenses' },
  'Control de broca (repase)': { jh: 3, g: 'sanidad' }, 'Fumigación — control de plagas': { jh: 2, g: 'sanidad' },
  'Podas': { jh: 6, g: 'renovacion' }, 'Soqueo': { jh: 18, g: 'renovacion' }, 'Resiembra': { jh: 3, g: 'renovacion' },
  'Mantenimiento general': { jh: 2, g: 'otros' }, 'Muestreo de broca y roya': { jh: 0.3, g: 'monitoreo' }, 'Muestreo de suelo': { jh: 0.5, g: 'monitoreo' },
  'Control de roya (aspersión)': { jh: 2, g: 'sanidad' }, 'Recolección (cosecha principal)': { jh: 0, g: 'cosecha' }, 'Recolección (mitaca)': { jh: 0, g: 'cosecha' }, 'Otro': { jh: 1, g: 'otros' },
};
const GRUPOS_AG = { nutricion: ['Nutrición', 'var(--c3)'], arvenses: ['Arvenses', 'var(--c5)'], sanidad: ['Sanidad', 'var(--c2)'], renovacion: ['Renovación', 'var(--c4)'], monitoreo: ['Monitoreo', 'var(--c1)'], cosecha: ['Cosecha', 'var(--cereza)'], otros: ['Otros', 'var(--text-faint)'] };
['Muestreo de broca y roya', 'Muestreo de suelo', 'Control de roya (aspersión)'].forEach(t => { if (!TIPOS_LABOR.includes(t)) TIPOS_LABOR.splice(TIPOS_LABOR.length - 1, 0, t); });
const tiposPlan = () => Object.keys(LABOR_STD);
const grupoDe = t => (LABOR_STD[t] || LABOR_STD.Otro).g;
function costoActividad(a) { const l = lotes.find(x => x.id === a.loteId); const ha = n0(a.area) || n0(l && l.hectareas); const mo = n0(a.jornalesHa) * ha * costoJornalTotal(); const ins = (a.insumos || []).reduce((s, i) => s + n0(i.cantHa) * ha * n0(i.costoUnit), 0); return { ha, mo, ins, total: mo + ins, jornales: n0(a.jornalesHa) * ha }; }
function fechaActividad(a) { return a.fecha || (a.anio + '-' + String(a.mes).padStart(2, '0') + '-' + String(Math.min(28, 1 + 7 * ((n0(a.semana) || 2) - 1))).padStart(2, '0')); }
function estadoActividad(a) {
  const o = a.otId && ordenes.find(x => x.id === a.otId);
  if (o) return o.estado === 'Cerrada' ? { e: 'Ejecutada', c: 'cerrada', o } : o.estado === 'Cancelada' ? { e: 'Cancelada', c: 'cancelada', o } : { e: 'En orden ' + o.numero, c: 'emitida', o };
  const lab = labores.find(lb => lb.loteId === a.loteId && lb.tipo === a.tipo && lb.fecha && lb.fecha.slice(0, 7) === fechaActividad(a).slice(0, 7));
  if (lab) return { e: 'Ejecutada', c: 'cerrada', lab };
  if (grupoDe(a.tipo) === 'cosecha') { const hay = registros.some(r => r.loteId === a.loteId && r.fecha && r.fecha.slice(0, 7) === fechaActividad(a).slice(0, 7)); return hay ? { e: 'En cosecha', c: 'cerrada' } : (fechaActividad(a).slice(0, 7) < hoyLocal().slice(0, 7) ? { e: 'Sin registros', c: 'programada' } : { e: 'Prevista', c: 'programada' }); }
  return fechaActividad(a).slice(0, 7) < hoyLocal().slice(0, 7) ? { e: 'Vencida', c: 'cancelada' } : { e: 'Planeada', c: 'programada' };
}
function actividadesAnio(anio, fincaId) { return planesAgro.filter(a => a.anio === anio && (!fincaId || (lotes.find(l => l.id === a.loteId) || {}).fincaId === fincaId)); }

function renderAgronomia() {
  const root = document.getElementById('ag-root'); if (!root) return; tooltipsGlobales();
  if (!fincas.some(f => f.id === agSt.fincaId)) agSt.fincaId = (fincasActivas()[0] || fincas[0] || {}).id || '';
  const acts = actividadesAnio(agSt.anio, agSt.fincaId); const ls = lotesDeFinca(agSt.fincaId);
  const tot = acts.map(a => ({ a, c: costoActividad(a), s: estadoActividad(a) }));
  const presu = tot.reduce((s, x) => s + x.c.total, 0); const ejec = tot.filter(x => x.s.e === 'Ejecutada');
  const vencidas = tot.filter(x => x.s.e === 'Vencida').length; const hastaHoy = tot.filter(x => fechaActividad(x.a) <= hoyLocal() && grupoDe(x.a.tipo) !== 'cosecha');
  const cumpl = hastaHoy.length ? hastaHoy.filter(x => x.s.e === 'Ejecutada').length / hastaHoy.length * 100 : null;
  const realAnio = labores.filter(lb => lb.fecha && lb.fecha.slice(0, 4) === String(agSt.anio) && ls.some(l => l.id === lb.loteId)).reduce((s, lb) => s + n0(lb.costo), 0);
  root.innerHTML = `<div class="chip-row">
      <select onchange="agSt.fincaId=this.value;renderAgronomia()" aria-label="Finca">${fincas.filter(activo).map(f => `<option value="${f.id}" ${f.id === agSt.fincaId ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}</select>
      <div class="capas seg"><button onclick="agSt.anio--;renderAgronomia()" aria-label="Año anterior">‹</button><button class="on">${agSt.anio}</button><button onclick="agSt.anio++;renderAgronomia()" aria-label="Año siguiente">›</button></div>
      <div class="capas seg">${[['anual', 'Calendario anual'], ['mensual', 'Mes'], ['presupuesto', 'Presupuesto y cumplimiento']].map(([k, t]) => `<button class="${agSt.vista === k ? 'on' : ''}" onclick="agSt.vista='${k}';renderAgronomia()">${t}</button>`).join('')}</div>
      <div class="mp-actions"><button class="btn ghost small" onclick="abrirGenerarPlan()">Generar plan del año</button><button class="btn primary small" onclick="abrirActividad()">+ Actividad</button></div></div>
    <div class="k19-grid">
      ${kpi19('Actividades del año', num(acts.length), ls.length + ' lotes · ' + num(Math.round(tot.reduce((s, x) => s + x.c.jornales, 0))) + ' jornales', '', 'i-calendario')}
      ${kpi19('Presupuesto del plan', fmtCorto(presu), 'mano de obra e insumos', '', 'i-finanzas')}
      ${kpi19('Ejecutado en labores', fmtCorto(realAnio), presu ? Math.round(realAnio / presu * 100) + ' % del presupuesto' : '', '', 'i-labor')}
      ${kpi19('Cumplimiento a la fecha', cumpl == null ? '—' : Math.round(cumpl) + ' <small>%</small>', hastaHoy.length ? ejec.filter(x => fechaActividad(x.a) <= hoyLocal()).length + ' de ' + hastaHoy.length + ' programadas' : 'sin actividades vencidas', cumpl == null ? '' : cumpl >= 85 ? 'bien' : cumpl >= 60 ? 'medio' : 'mal', 'i-plan')}
      ${kpi19('Vencidas sin ejecutar', vencidas, vencidas ? 'revise y genere órdenes' : 'al día', vencidas ? 'mal' : 'bien', 'i-hoy')}
    </div>
    <div id="ag-cuerpo"></div>`;
  if (!acts.length) { document.getElementById('ag-cuerpo').innerHTML = `<div class="card"><div class="empty">No hay plan para ${agSt.anio}. Genere el plan del año a partir del ciclo del café, los análisis de suelo y la edad de cada lote, y ajústelo a su gusto.<br><button class="btn primary small" style="margin-top:12px" onclick="abrirGenerarPlan()">Generar plan del año</button></div></div>`; return; }
  if (agSt.vista === 'anual') agAnual(tot, ls); else if (agSt.vista === 'mensual') agMensual(tot); else agPresupuesto(tot, ls);
}
function agAnual(tot, ls) {
  const host = document.getElementById('ag-cuerpo'); const mesAct = agSt.anio === Number(hoyLocal().slice(0, 4)) ? Number(hoyLocal().slice(5, 7)) : 0;
  host.innerHTML = `<div class="card"><div class="title">Calendario ${agSt.anio} <span class="sub">toque una actividad para editarla o un mes para ver su detalle</span></div>
    <div class="ag-ley">${Object.entries(GRUPOS_AG).map(([k, v]) => `<span><i style="background:${v[1]}"></i>${v[0]}</span>`).join('')}</div>
    <div class="ag-cal" style="--n:12"><div class="ag-h"></div>${MESES.map((m, i) => `<button class="ag-h ${i + 1 === mesAct ? 'hoy' : ''}" onclick="agSt.mes=${i + 1};agSt.vista='mensual';renderAgronomia()">${m}</button>`).join('')}
    ${ls.map(l => `<div class="ag-l"><b>${esc(l.nombre)}</b><small>${num(l.hectareas)} ha</small></div>${MESES.map((m, i) => { const xs = tot.filter(x => x.a.loteId === l.id && x.a.mes === i + 1);
      return `<div class="ag-c ${i + 1 === mesAct ? 'hoy' : ''}" ondblclick="abrirActividad(null,'${l.id}',${i + 1})">${xs.map(x => `<button class="ag-chip ${x.s.e === 'Ejecutada' ? 'hecha' : x.s.c}" style="--g:${GRUPOS_AG[grupoDe(x.a.tipo)][1]}" onclick="abrirActividad('${x.a.id}')" data-tip="${esc(x.a.tipo)} · ${esc(x.s.e)} · ${fmt(x.c.total)}">${esc(abrevLabor(x.a.tipo))}</button>`).join('')}</div>`; }).join('')}`).join('')}
    </div><p class="hint" style="margin:10px 0 0;">Las actividades ejecutadas se marcan solas cuando se cierra la orden de trabajo o se registra la labor del mismo tipo en ese lote y ese mes. Doble clic en una celda vacía para agregar.</p></div>`;
}
function abrevLabor(t) { return ({ 'Fertilización edáfica': 'Fertilización', 'Fertilización foliar': 'Foliar', 'Encalado / enmienda de suelo': 'Encalado', 'Control de malezas (guadaña)': 'Arvenses', 'Fumigación — control de hierba': 'Herbicida', 'Control de broca (repase)': 'Repase broca', 'Fumigación — control de plagas': 'Plagas', 'Muestreo de broca y roya': 'Monitoreo', 'Muestreo de suelo': 'Análisis suelo', 'Control de roya (aspersión)': 'Roya', 'Recolección (cosecha principal)': 'Cosecha', 'Recolección (mitaca)': 'Mitaca', 'Mantenimiento general': 'Mantenimiento' })[t] || t; }
function agMensual(tot) {
  const host = document.getElementById('ag-cuerpo'); const xs = tot.filter(x => x.a.mes === agSt.mes).sort((p, q) => fechaActividad(p.a).localeCompare(fechaActividad(q.a)));
  const total = xs.reduce((s, x) => s + x.c.total, 0); const jor = xs.reduce((s, x) => s + x.c.jornales, 0); const diasHab = 22;
  host.innerHTML = `<div class="card"><div class="title" style="display:flex;align-items:center;gap:8px;"><button class="icon-btn" onclick="agSt.mes=agSt.mes===1?12:agSt.mes-1;renderAgronomia()" aria-label="Mes anterior">‹</button>${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][agSt.mes - 1]} ${agSt.anio}<button class="icon-btn" onclick="agSt.mes=agSt.mes===12?1:agSt.mes+1;renderAgronomia()" aria-label="Mes siguiente">›</button><span class="sub">${xs.length} actividades · ${num(Math.round(jor))} jornales (${num(redondear(jor / diasHab, 1))} personas por día hábil) · ${fmt(total)}</span></div>
    ${xs.length ? `<div class="tscroll"><table class="dtable"><thead><tr><th>Semana</th><th>Lote</th><th>Actividad</th><th>Insumos</th><th class="num">Jornales</th><th class="num">Presupuesto</th><th>Estado</th><th></th></tr></thead><tbody>${xs.map(x => `<tr><td>${fechaCorta(fechaActividad(x.a))}</td><td>${esc(nombreLote(x.a.loteId))}</td><td><span class="ag-dot" style="background:${GRUPOS_AG[grupoDe(x.a.tipo)][1]}"></span>${esc(x.a.tipo)}${x.a.nota ? `<br><small style="color:var(--text-faint)">${esc(x.a.nota)}</small>` : ''}</td><td>${(x.a.insumos || []).map(i => esc(i.nombre) + ' ' + num(Math.round(n0(i.cantHa) * x.c.ha)) + ' ' + esc(i.unidad)).join(', ') || '—'}</td><td class="num">${num(redondear(x.c.jornales, 1))}</td><td class="num">${fmt(x.c.total)}</td><td>${pillEstado2(x.s)}</td>
      <td class="actions">${!x.s.o && x.s.e !== 'Ejecutada' && grupoDe(x.a.tipo) !== 'cosecha' ? `<button class="btn ghost small" onclick="generarOTDesdePlan('${x.a.id}')">Generar orden</button>` : ''}<button class="btn ghost small" onclick="abrirActividad('${x.a.id}')">Editar</button></td></tr>`).join('')}</tbody></table></div>
      <div class="mp-btns"><button class="btn primary small" onclick="generarOTsMes()">Generar órdenes de todo el mes</button></div>` : '<div class="empty">Sin actividades este mes.</div>'}</div>`;
}
const pillEstado2 = s => `<span class="pill ${s.c}">${esc(s.e)}</span>`;
function agPresupuesto(tot, ls) {
  const host = document.getElementById('ag-cuerpo'); const grupos = Object.keys(GRUPOS_AG).filter(g => g !== 'cosecha');
  const real = Array(12).fill(0); labores.filter(lb => lb.fecha && lb.fecha.slice(0, 4) === String(agSt.anio) && ls.some(l => l.id === lb.loteId)).forEach(lb => real[Number(lb.fecha.slice(5, 7)) - 1] += n0(lb.costo));
  const series = grupos.map(g => ({ nombre: GRUPOS_AG[g][0], color: GRUPOS_AG[g][1], apilar: true, vals: MESES.map((m, i) => tot.filter(x => x.a.mes === i + 1 && grupoDe(x.a.tipo) === g).reduce((s, x) => s + x.c.total, 0)) })).filter(s => s.vals.some(v => v));
  let acP = 0, acR = 0; const mesHoy = agSt.anio === Number(hoyLocal().slice(0, 4)) ? Number(hoyLocal().slice(5, 7)) : 12;
  const filasLote = ls.map(l => { const xs = tot.filter(x => x.a.loteId === l.id); const p = xs.reduce((s, x) => s + x.c.total, 0); const r = labores.filter(lb => lb.loteId === l.id && lb.fecha && lb.fecha.slice(0, 4) === String(agSt.anio)).reduce((s, lb) => s + n0(lb.costo), 0); const ha = n0(l.hectareas) || 1;
    return `<tr><td>${esc(l.nombre)}</td><td class="num">${xs.length}</td><td class="num">${fmt(p)}</td><td class="num">${fmt(p / ha)}</td><td class="num">${fmt(r)}</td><td class="num">${p ? Math.round(r / p * 100) + ' %' : '—'}</td></tr>`; }).join('');
  host.innerHTML = `<div class="grid g2"><div class="card"><div class="title">Presupuesto por mes y grupo de labores <span class="sub">con el gasto real en labores</span></div>
    ${gLeyenda(series.map(s => ({ color: s.color, txt: s.nombre })).concat([{ color: 'var(--text)', txt: 'Gasto real', linea: true }]))}
    ${gCombo({ cats: MESES, series: series.concat([{ nombre: 'Gasto real', tipo: 'linea', vals: real.map((v, i) => i < mesHoy ? v : null), color: 'var(--text)' }]), fmt: v => fmtCorto(v), fmtTip: v => fmt(v), alto: 260, marcaCat: mesHoy - 1, titulo: 'Presupuesto mensual' })}</div>
    <div class="card"><div class="title">Avance acumulado</div>
    ${gCombo({ cats: MESES, series: [{ nombre: 'Presupuesto acumulado', tipo: 'linea', punteada: true, vals: MESES.map((m, i) => { acP += tot.filter(x => x.a.mes === i + 1).reduce((s, x) => s + x.c.total, 0); return acP; }), color: 'var(--c1)' }, { nombre: 'Real acumulado', tipo: 'area', vals: real.map((v, i) => { acR += v; return i < mesHoy ? acR : null; }), color: 'var(--c3)' }], fmt: v => fmtCorto(v), fmtTip: v => fmt(v), alto: 260, titulo: 'Acumulado' })}
    ${gLeyenda([{ color: 'var(--c1)', txt: 'Presupuesto acumulado', punteada: true }, { color: 'var(--c3)', txt: 'Real acumulado', linea: true }])}</div></div>
    <div class="card"><div class="title">Por lote</div><div class="tscroll"><table class="dtable"><thead><tr><th>Lote</th><th class="num">Actividades</th><th class="num">Presupuesto</th><th class="num">Por hectárea</th><th class="num">Real en labores</th><th class="num">Ejecución</th></tr></thead><tbody>${filasLote}</tbody></table></div>
    <div class="mp-btns"><button class="btn ghost small" onclick="exportarPlanCSV()">Exportar plan (CSV)</button></div></div>`;
}
function abrirActividad(id, loteId, mes) {
  const a = id ? clonar(planesAgro.find(x => x.id === id)) : { anio: agSt.anio, mes: mes || agSt.mes, semana: 2, loteId: loteId || (lotesDeFinca(agSt.fincaId)[0] || {}).id, tipo: 'Control de malezas (guadaña)', jornalesHa: LABOR_STD['Control de malezas (guadaña)'].jh, insumos: [] };
  window._agDraft = a;
  openModal(`<h3>${id ? 'Editar' : 'Nueva'} actividad del plan</h3>
    <div class="fgrid c3"><label class="f">Lote<select id="ac-lote">${lotesActivos().map(l => `<option value="${l.id}" ${l.id === a.loteId ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></label>
      <label class="f">Actividad<select id="ac-tipo" onchange="const s=LABOR_STD[this.value];if(s)document.getElementById('ac-jh').value=s.jh">${tiposPlan().map(t => `<option ${t === a.tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="f">Jornales por hectárea<input id="ac-jh" type="number" step="0.1" value="${a.jornalesHa}"></label>
      <label class="f">Año<input id="ac-anio" type="number" value="${a.anio}"></label><label class="f">Mes<select id="ac-mes">${MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === a.mes ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="f">Semana del mes<select id="ac-sem">${[1, 2, 3, 4].map(s => `<option ${s === n0(a.semana) ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    <label class="f" style="margin-top:8px">Nota<input id="ac-nota" value="${esc(a.nota || '')}" placeholder="Ej. dosis según análisis de suelo"></label>
    <div class="sec-label">Insumos por hectárea</div><div id="ac-ins"></div><button class="btn ghost small" onclick="_agDraft.insumos.push({nombre:'',cantHa:0,unidad:'kg',costoUnit:0});pintarInsAct()">+ Insumo</button>
    <div class="modal-actions">${id ? `<button class="btn danger-ghost" onclick="eliminarActividad('${id}')">Eliminar</button>` : ''}<span style="flex:1"></span><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarActividad()">Guardar</button></div>`, true);
  pintarInsAct();
}
function pintarInsAct() { document.getElementById('ac-ins').innerHTML = (_agDraft.insumos || []).map((i, k) => `<div class="ef-pt" style="grid-template-columns:minmax(0,1fr) 90px 70px 110px 30px"><input value="${esc(i.nombre)}" placeholder="Insumo" oninput="_agDraft.insumos[${k}].nombre=this.value"><input type="number" step="any" value="${i.cantHa}" title="Cantidad por hectárea" oninput="_agDraft.insumos[${k}].cantHa=Number(this.value)"><input value="${esc(i.unidad)}" oninput="_agDraft.insumos[${k}].unidad=this.value"><input type="number" value="${i.costoUnit}" title="Costo por unidad" oninput="_agDraft.insumos[${k}].costoUnit=Number(this.value)"><button class="btn danger-ghost" onclick="_agDraft.insumos.splice(${k},1);pintarInsAct()">✕</button></div>`).join('') || '<p class="hint" style="margin:0 0 8px">Sin insumos.</p>'; }
function guardarActividad() {
  const a = _agDraft; const g = k => document.getElementById(k).value;
  Object.assign(a, { loteId: g('ac-lote'), tipo: g('ac-tipo'), jornalesHa: n0(g('ac-jh')), anio: n0(g('ac-anio')), mes: n0(g('ac-mes')), semana: n0(g('ac-sem')), nota: g('ac-nota').trim(), insumos: (a.insumos || []).filter(i => String(i.nombre).trim()) });
  if (!a.id) { a.id = uid('pa'); a.origen = 'manual'; planesAgro.push(a); } else { const k = planesAgro.findIndex(x => x.id === a.id); planesAgro[k] = a; }
  closeModal(); guardarEstado(); renderAgronomia(); toast('Actividad guardada');
}
function eliminarActividad(id) { closeModal(); conDeshacer('Actividad eliminada', () => { planesAgro = planesAgro.filter(x => x.id !== id); guardarEstado(); renderAgronomia(); }); }
function generarOTDesdePlan(id, silencioso) {
  const a = planesAgro.find(x => x.id === id); if (!a || a.otId) return null; const c = costoActividad(a);
  const o = { id: uid('ot'), numero: siguienteNumeroOT(), estado: 'Programada', creada: hoyLocal(), prioridad: 'Media', fechaProgramada: fechaActividad(a), loteId: a.loteId, area: c.ha, tipo: TIPOS_LABOR.includes(a.tipo) ? a.tipo : 'Otro',
    responsable: '', trabajadores: Math.max(1, Math.round(c.jornales / 3)), jornales: redondear(c.jornales, 1), especificacion: (a.nota || '') + (a.origen === 'suelo' ? ' Dosis calculada con el análisis de suelo.' : ''), herramientas: '', epp: '', planId: a.id,
    insumos: (a.insumos || []).map(i => ({ nombre: i.nombre, cantHa: n0(i.cantHa), cantidad: redondear(n0(i.cantHa) * c.ha, 2), unidad: i.unidad, costoUnit: n0(i.costoUnit) })) };
  o.presupuesto = calcPresupuesto(o); ordenes.push(o); a.otId = o.id;
  if (!silencioso) { guardarEstado(); renderAgronomia(); toast(o.numero + ' programada para el ' + fechaCorta(o.fechaProgramada), null, { label: 'Ver orden', fn: () => { ir('planeacion'); verOT(o.id); } }); }
  return o;
}
function generarOTsMes() { const xs = actividadesAnio(agSt.anio, agSt.fincaId).filter(a => a.mes === agSt.mes && !a.otId && grupoDe(a.tipo) !== 'cosecha' && estadoActividad(a).e !== 'Ejecutada'); xs.forEach(a => generarOTDesdePlan(a.id, true)); guardarEstado(); renderAgronomia(); toast(xs.length ? xs.length + ' órdenes de trabajo generadas' : 'No hay actividades pendientes de orden este mes'); }
function exportarPlanCSV() { descargarCSV('plan-agronomico-' + agSt.anio + '.csv', [['año', 'mes', 'semana', 'lote', 'actividad', 'jornales', 'mano_de_obra', 'insumos', 'total', 'estado']].concat(actividadesAnio(agSt.anio, agSt.fincaId).map(a => { const c = costoActividad(a); return [a.anio, a.mes, a.semana, nombreLote(a.loteId), a.tipo, redondear(c.jornales, 1), Math.round(c.mo), Math.round(c.ins), Math.round(c.total), estadoActividad(a).e]; }))); }

/* ---- Generador del plan anual ---- */
function abrirGenerarPlan() {
  const cf = cfgSuelo(); const ls = lotesDeFinca(agSt.fincaId); const cos = Object.assign({ principal: [9, 10, 11, 12], mitaca: [4, 5] }, (climaConfig.cosecha || {}));
  openModal(`<h3>Generar plan agronómico ${agSt.anio}</h3><p class="hint">Se arma con el ciclo del café, los análisis de suelo, la edad y la variedad de cada lote. Después puede mover, editar o borrar cualquier actividad. Las actividades ya planeadas no se duplican.</p>
    <div class="sec-label">Lotes</div><div class="ag-checks">${ls.map(l => `<label><input type="checkbox" class="gp-lote" value="${l.id}" checked> ${esc(l.nombre)} <small>${num(l.hectareas)} ha${ultimoAnalisis(l.id) ? ' · con análisis' : ''}</small></label>`).join('')}</div>
    <div class="sec-label">Qué incluir</div>
    <div class="ag-checks">
      <label><input type="checkbox" id="gp-fert" checked> Fertilización edáfica en <input id="gp-mf" value="${cf.mesesFert.map(m => MESES[m - 1]).join(', ')}" style="width:120px;padding:3px 6px;"></label>
      <label><input type="checkbox" id="gp-cal" checked> Encalado cuando el análisis lo indique (un mes antes)</label>
      <label><input type="checkbox" id="gp-arv" checked> Manejo de arvenses: 4 al año (feb, may, ago, nov)</label>
      <label><input type="checkbox" id="gp-mon" checked> Monitoreo mensual de broca y roya</label>
      <label><input type="checkbox" id="gp-bro" checked> Repase de broca al terminar la cosecha principal</label>
      <label><input type="checkbox" id="gp-roy" checked> Control preventivo de roya en variedades susceptibles</label>
      <label><input type="checkbox" id="gp-ren" checked> Soqueo de lotes con 6 años o más desde la siembra o el último soqueo</label>
      <label><input type="checkbox" id="gp-sue" checked> Muestreo de suelo cada dos años</label>
      <label><input type="checkbox" id="gp-cos" checked> Meses de cosecha para planear recolectores: principal <input id="gp-cp" value="${cos.principal.map(m => MESES[m - 1]).join(', ')}" style="width:150px;padding:3px 6px;"> mitaca <input id="gp-cm" value="${cos.mitaca.map(m => MESES[m - 1]).join(', ')}" style="width:90px;padding:3px 6px;"></label>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="generarPlanAnual()">Generar</button></div>`, true);
}
const mesesDeTexto = t => String(t || '').toLowerCase().split(/[,\s]+/).map(x => { const i = MESES.findIndex(m => x.startsWith(m)); return i >= 0 ? i + 1 : (Number(x) >= 1 && Number(x) <= 12 ? Number(x) : null); }).filter(Boolean);
function generarPlanAnual() {
  const chk = id => (document.getElementById(id) || {}).checked; const anio = agSt.anio; const ids = [...document.querySelectorAll('.gp-lote:checked')].map(e => e.value);
  const mf = mesesDeTexto(document.getElementById('gp-mf').value); const cp = mesesDeTexto(document.getElementById('gp-cp').value); const cm = mesesDeTexto(document.getElementById('gp-cm').value);
  climaConfig.cosecha = { principal: cp, mitaca: cm }; let n = 0;
  const add = (l, tipo, mes, sem, extra) => { if (!mes || mes < 1 || mes > 12) return; if (planesAgro.some(a => a.anio === anio && a.loteId === l.id && a.tipo === tipo && a.mes === mes)) return; planesAgro.push(Object.assign({ id: uid('pa'), anio, mes, semana: sem || 2, loteId: l.id, tipo, jornalesHa: (LABOR_STD[tipo] || {}).jh || 1, insumos: [], origen: 'generado' }, extra || {})); n++; };
  ids.forEach(id => { const l = lotes.find(x => x.id === id); if (!l) return; const a = ultimoAnalisis(l.id); const rec = a ? recomendacionSuelo(a) : null; const edad = edadLote(l); const vari = nombreVariedad(l.variedadId).toLowerCase();
    if (chk('gp-fert') && (edad == null || edad >= 0.3)) mf.forEach((m, k) => { const ins = rec ? rec.productos.filter(p => !p.unica).map(p => ({ nombre: p.nombre, cantHa: Math.round(p.kgHa / mf.length), unidad: 'kg', costoUnit: Math.round(p.precio / 50) })) : [{ nombre: cfgSuelo().productoMezcla, cantHa: 500, unidad: 'kg', costoUnit: Math.round(cfgSuelo().precioMezcla / 50) }]; add(l, 'Fertilización edáfica', m, 2, { insumos: ins, nota: (k + 1) + '.ª aplicación del año' + (rec ? ' según análisis del ' + fechaCorta(a.fecha) : ' · dosis de referencia: registre un análisis de suelo'), origen: rec ? 'suelo' : 'generado' }); });
    if (chk('gp-cal') && rec && rec.cal && mf.length) add(l, 'Encalado / enmienda de suelo', mf[0] === 1 ? 12 : mf[0] - 1, 3, { insumos: [{ nombre: rec.tipoCal, cantHa: rec.cal * 1000, unidad: 'kg', costoUnit: Math.round(cfgSuelo().precioCal / 50) }], origen: 'suelo', nota: num(rec.cal) + ' t/ha según análisis' });
    if (chk('gp-arv')) [2, 5, 8, 11].forEach(m => add(l, 'Control de malezas (guadaña)', m, 3, { nota: 'Manejo integrado: plateo y guadaña selectiva, conservando coberturas nobles' }));
    if (chk('gp-mon')) for (let m = 1; m <= 12; m++) add(l, 'Muestreo de broca y roya', m, 1, { nota: 'Plan de muestreo en el mapa del lote' });
    if (chk('gp-bro') && cp.length) add(l, 'Control de broca (repase)', cp[cp.length - 1] === 12 ? 1 : cp[cp.length - 1] + 1, 1, { nota: 'Recoger frutos del suelo, sobremaduros y secos al terminar la cosecha' });
    if (chk('gp-roy') && /caturra|tipica|típica|borb|geisha|bourbon/.test(vari)) [mf[0] || 3, ((mf[0] || 3) + 3 - 1) % 12 + 1].forEach(m => add(l, 'Control de roya (aspersión)', m, 3, { nota: 'Variedad susceptible: control preventivo según el calendario de floración' }));
    const ultSoq = labores.filter(lb => lb.loteId === l.id && lb.tipo === 'Soqueo').map(lb => lb.fecha).sort().pop(); const desde = ultSoq || l.fechaSiembra; const aniosCiclo = desde ? (parseFecha(anio + '-01-15') - parseFecha(desde)) / (365.25 * 864e5) : 0;
    if (chk('gp-ren') && aniosCiclo >= 6) add(l, 'Soqueo', cp.length ? (cp[cp.length - 1] % 12) + 1 : 1, 2, { nota: num(Math.floor(aniosCiclo)) + ' años de ciclo: evaluar soqueo por franjas para no perder toda la producción' });
    if (chk('gp-sue') && (!a || (parseFecha(anio + '-06-01') - parseFecha(a.fecha)) / (365.25 * 864e5) >= 1.6)) add(l, 'Muestreo de suelo', mf.length ? (mf[0] === 1 ? 11 : mf[0] - 2) : 1, 2, { nota: 'Enviar a laboratorio; 15 a 20 submuestras por lote', insumos: [{ nombre: 'Análisis de laboratorio', cantHa: 1 / Math.max(0.1, n0(l.hectareas)), unidad: 'análisis', costoUnit: 120000 }] });
    if (chk('gp-cos')) { cp.forEach(m => add(l, 'Recolección (cosecha principal)', m, 1)); cm.forEach(m => add(l, 'Recolección (mitaca)', m, 1)); }
  });
  closeModal(); guardarEstado(); agSt.vista = 'anual'; renderAgronomia(); toast(n + ' actividades agregadas al plan ' + anio);
}
function planDesdeSuelo(analisisId) {
  const a = suelos.find(x => x.id === analisisId); if (!a) return; const l = lotes.find(x => x.id === a.loteId); const rec = recomendacionSuelo(a); const anio = Number(hoyLocal().slice(0, 4)); const mesHoy = Number(hoyLocal().slice(5, 7));
  const meses = rec.meses.map(m => ({ anio: m >= mesHoy ? anio : anio + 1, m })); let n = 0;
  meses.forEach((x, k) => { if (planesAgro.some(p => p.anio === x.anio && p.loteId === l.id && p.tipo === 'Fertilización edáfica' && p.mes === x.m)) { const p = planesAgro.find(p => p.anio === x.anio && p.loteId === l.id && p.tipo === 'Fertilización edáfica' && p.mes === x.m); if (!p.otId) { p.insumos = rec.productos.filter(q => !q.unica).map(q => ({ nombre: q.nombre, cantHa: Math.round(q.kgHa / meses.length), unidad: 'kg', costoUnit: Math.round(q.precio / 50) })); p.origen = 'suelo'; p.nota = (k + 1) + '.ª aplicación según análisis del ' + fechaCorta(a.fecha); n++; } return; }
    planesAgro.push({ id: uid('pa'), anio: x.anio, mes: x.m, semana: 2, loteId: l.id, tipo: 'Fertilización edáfica', jornalesHa: LABOR_STD['Fertilización edáfica'].jh, origen: 'suelo', nota: (k + 1) + '.ª aplicación según análisis del ' + fechaCorta(a.fecha), insumos: rec.productos.filter(q => !q.unica).map(q => ({ nombre: q.nombre, cantHa: Math.round(q.kgHa / meses.length), unidad: 'kg', costoUnit: Math.round(q.precio / 50) })) }); n++; });
  if (rec.cal) { const m0 = meses[0]; const mc = m0.m === 1 ? 12 : m0.m - 1; const an = m0.m === 1 ? m0.anio - 1 : m0.anio; if (!planesAgro.some(p => p.anio === an && p.loteId === l.id && p.tipo === 'Encalado / enmienda de suelo' && p.mes === mc)) { planesAgro.push({ id: uid('pa'), anio: an, mes: mc, semana: 3, loteId: l.id, tipo: 'Encalado / enmienda de suelo', jornalesHa: LABOR_STD['Encalado / enmienda de suelo'].jh, origen: 'suelo', nota: num(rec.cal) + ' t/ha según análisis', insumos: [{ nombre: rec.tipoCal, cantHa: rec.cal * 1000, unidad: 'kg', costoUnit: Math.round(cfgSuelo().precioCal / 50) }] }); n++; } }
  guardarEstado(); toast(n + ' actividades de fertilización en el plan de ' + l.nombre, null, { label: 'Ver plan', fn: () => { agSt.anio = meses[0].anio; agSt.fincaId = l.fincaId; agSt.vista = 'anual'; ir('agronomia'); } });
}
