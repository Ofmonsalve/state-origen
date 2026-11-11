/* ================= v22 · Beneficio (baches), lotes comerciales y microlotes, ventas con retención vigente y consulta de trazabilidad por código ================= */

/* ---------- Bache: estado, secado, humedad y saldo ---------- */
function vendidoDeBache(b) { return partidas.filter(p => (p.beneficioIds || []).includes(b.id)).reduce((s, p) => { const tot = kgPartida(p) || 1; return s + vendidoDePartida(p.id) * n0(b.kgSalida) / tot; }, 0); }
function estadoHumedad(h) { if (h == null || h === '' || !n0(h)) return { t: 'Sin medir', c: '' }; const [a, b] = humRango22(); return n0(h) > b + 0.0001 ? { t: 'Húmedo', c: 'mal' } : n0(h) < a - 0.0001 ? { t: 'Sobresecado', c: 'medio' } : { t: 'En rango', c: 'bien' }; }
function infoBache(b) {
  const rs = registrosDeBeneficio(b); const kgC = n0(b.kgEntrada) || rs.reduce((s, r) => s + n0(r.kg), 0); const lcs = partidas.filter(p => (p.beneficioIds || []).includes(b.id)); const vend = vendidoDeBache(b);
  const dSec = b.secadoInicio && b.secadoFin ? Math.round((parseFecha(b.secadoFin) - parseFecha(b.secadoInicio)) / 864e5) : null;
  const est = !n0(b.kgSalida) ? 'En proceso' : n0(b.kgSalida) - vend < 0.5 ? 'Vendido' : lcs.length ? 'En lote comercial' : 'En bodega';
  return { rs, kgC, kgS: n0(b.kgSalida), factor: n0(b.kgSalida) ? kgC / n0(b.kgSalida) : null, pct: kgC && n0(b.kgSalida) ? n0(b.kgSalida) / kgC : null, pases: [...new Set(rs.map(r => (paseDe(r) || {}).codigo).filter(Boolean))], lotes: [...new Set(rs.map(r => r.loteId))].map(nombreLote), personas: new Set(rs.map(r => r.trabajadorId)).size,
    fechas: rs.map(r => r.fecha).sort(), lcs, vend, disp: Math.max(0, n0(b.kgSalida) - vend), dSec, hum: estadoHumedad(b.humedad), est };
}

/* ---------- Registrar beneficio desde la cosecha: ahora con fechas de secado y opción «aún secando» ---------- */
function abrirBeneficioCosecha(clave) {
  const pend = registros.filter(r => !beneficioDeRegistro(r)); if (!pend.length) { toast('Toda la cereza registrada ya tiene beneficio.', 'ok'); return; }
  const g = new Map(); pend.forEach(r => { const k = [r.tipo || 'Principal', r.pasada || 1, r.loteId || r.lote].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  const grupos = [...g.entries()].sort((a, b) => b[1][0].fecha.localeCompare(a[1][0].fecha)); const sel = clave && g.has(clave) ? clave : grupos[0][0]; const ult = grupos.find(x => x[0] === sel)[1].map(r => r.fecha).sort().pop();
  openModal(`<h3>Registrar beneficio (bache)</h3><p class="hint">Elija la cereza que entró al beneficio. Cada pesada queda ligada a este bache con su código; si el café ya está seco, puede crear de una vez el lote comercial para la venta.</p>
    <label class="f">Cereza de<select id="bc-grupo" onchange="pintarBenCosecha()">${grupos.map(([k, a]) => { const [t, p] = k.split('|'); const pz = paseDe(a[0]); return `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${pz ? pz.codigo : CICLO_TXT(t) + ' · pasada ' + p} · ${esc(a[0].loteNombre || a[0].lote || '')} · ${num(redondear(a.reduce((s, r) => s + n0(r.kg), 0), 1))} kg</option>`; }).join('')}</select></label>
    <div id="bc-regs" class="cs-bregs"></div>
    <div class="fgrid c3" style="margin-top:12px">
      <label class="f">Fecha del beneficio<input id="bc-fecha" type="date" value="${ult > hoyLocal() ? ult : hoyLocal()}"></label>
      <label class="f">Proceso<select id="bc-metodo">${['Lavado', 'Honey', 'Natural', 'Semilavado', 'Fermentación controlada'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="f">Horas de fermentación<input id="bc-ferm" type="number" min="0" step="1" placeholder="Ej. 18"></label>
      <label class="f">Método de secado<select id="bc-secado">${['Marquesina solar', 'Patio / elba', 'Secador mecánico', 'Silo'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="f">Inicio del secado<input id="bc-sini" type="date"></label><label class="f">Fin del secado<input id="bc-sfin" type="date"></label>
      <label class="f">Pergamino seco obtenido (kg)<input id="bc-perg" type="number" min="0" step="0.1" oninput="pintarBenCosecha()"></label>
      <label class="f">Humedad final (%)<input id="bc-hum" type="number" min="0" step="0.1" placeholder="${humRango22().join(' a ')}" oninput="pintarBenCosecha()"></label>
      <label class="f">Pasilla (kg, opcional)<input id="bc-pas" type="number" min="0" step="0.1"></label></div>
    <div class="fgrid c2"><label class="cs-check"><input id="bc-proc" type="checkbox" onchange="pintarBenCosecha()"> El café aún está secando (completo los kilos después)</label><label class="cs-check"><input id="bc-partida" type="checkbox" checked> Crear el lote comercial para la venta</label></div>
    <p class="hint" id="bc-factor" style="margin-top:8px"></p>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarBenCosecha()">Guardar bache</button></div>`, true);
  pintarBenCosecha();
}
function pintarBenCosecha() {
  const k = document.getElementById('bc-grupo').value; const a = regsGrupoBen(k); const host = document.getElementById('bc-regs'); const marcados = new Set([...document.querySelectorAll('.bc-r:checked')].map(e => e.value));
  const prim = !host.dataset.k || host.dataset.k !== k; host.dataset.k = k;
  host.innerHTML = a.sort((x, y) => x.fecha.localeCompare(y.fecha)).map(r => `<label class="cs-check"><input type="checkbox" class="bc-r" value="${r.id}" ${prim || marcados.has(r.id) ? 'checked' : ''} onchange="pintarBenCosecha()"> ${fechaCorta(r.fecha)} · ${esc(r.recolector)} · ${num(redondear(r.kg, 1))} kg <span class="mono" style="font-size:10px;color:var(--text-faint)">${esc(codigoPesada(r))}</span></label>`).join('');
  const kg = [...document.querySelectorAll('.bc-r:checked')].reduce((s, e) => s + n0((registros.find(r => r.id === e.value) || {}).kg), 0); const proc = document.getElementById('bc-proc').checked; const pe = proc ? 0 : n0(document.getElementById('bc-perg').value); const h = estadoHumedad(document.getElementById('bc-hum').value);
  document.getElementById('bc-perg').disabled = proc; document.getElementById('bc-partida').disabled = proc; if (proc) document.getElementById('bc-partida').checked = false;
  const f = pe ? kg / pe : null; document.getElementById('bc-factor').innerHTML = `Cereza seleccionada: <b>${num(redondear(kg, 1))} kg</b>${f ? ` · factor <b>${num(redondear(f, 2))}</b> kg de cereza por kg de pergamino <span style="color:${f < 4.4 || f > 5.8 ? 'var(--danger)' : 'inherit'}">(lo usual: 4,8 a 5,4)</span>` : ''}${h.t !== 'Sin medir' ? ` · humedad <b style="color:${h.c === 'mal' ? 'var(--danger)' : 'inherit'}">${h.t.toLowerCase()}</b>` : ''}`;
}
function guardarBenCosecha() {
  const ids = [...document.querySelectorAll('.bc-r:checked')].map(e => e.value); if (!ids.length) { toast('Seleccione la cereza que entró al beneficio.', 'err'); return; }
  const proc = document.getElementById('bc-proc').checked; const pe = proc ? null : n0(document.getElementById('bc-perg').value); if (!proc && !pe) { toast('Escriba los kilos de pergamino seco, o marque que el café aún está secando.', 'err'); return; }
  const rs = registros.filter(r => ids.includes(r.id)); const kg = rs.reduce((s, r) => s + n0(r.kg), 0); const f = k => document.getElementById(k).value;
  const b = { id: uid('bn'), loteId: rs[0].loteId, fecha: f('bc-fecha'), metodo: f('bc-metodo'), kgEntrada: redondear(kg, 2), kgSalida: pe, fermentacionHoras: n0(f('bc-ferm')) || null, secado: f('bc-secado'), secadoInicio: f('bc-sini') || null, secadoFin: f('bc-sfin') || null, kgPasilla: n0(f('bc-pas')) || null, humedad: n0(f('bc-hum')) || null, tipo: rs[0].tipo || 'Principal', pasada: rs[0].pasada || 1, registroIds: ids, creado: ahoraISO() };
  if (b.fecha < rs.map(r => r.fecha).sort().pop()) { toast('La fecha del beneficio no puede ser anterior a la recolección.', 'err'); return; }
  if (b.secadoInicio && b.secadoFin && b.secadoFin < b.secadoInicio) { toast('El fin del secado no puede ser anterior al inicio.', 'err'); return; }
  b.codigo = codigoBache(b); beneficios.push(b); rs.forEach(r => { r.beneficioId = b.id; });
  registrarCambio('beneficio', b.id, 'Bache ' + b.codigo, 'Creación', num(redondear(kg, 1)) + ' kg de cereza (' + ids.length + ' pesadas)' + (pe ? ' → ' + num(pe) + ' kg de pergamino · factor ' + num(redondear(kg / pe, 2)) : ' · en secado') + ' · ' + b.metodo, { loteId: b.loteId, registroIds: ids });
  let txt = 'Bache ' + b.codigo + ' guardado' + (pe ? ' · factor ' + num(redondear(kg / pe, 2)) : ' · en proceso');
  if (pe && document.getElementById('bc-partida').checked) { const p = { id: uid('pt'), clase: 'Lote comercial', fecha: b.fecha, tipo: 'Pergamino seco', proceso: b.metodo, humedad: b.humedad, factor: null, taza: null, notas: '', beneficioIds: [b.id], kg: null, fincaId: (lotes.find(l => l.id === b.loteId) || {}).fincaId || '' }; p.codigo = nuevoCodigoLC(p);
    partidas.push(p); registrarCambio('partida', p.id, p.codigo, 'Creación', 'Desde el bache ' + b.codigo + ' · ' + num(pe) + ' kg', { beneficioId: b.id }); txt += ' · lote comercial ' + p.codigo; }
  guardarEstado(); closeModal(); render(); toast(txt, 'ok');
}
function editarBache22(id) {
  const b = beneficios.find(x => x.id === id); if (!b) return; const x = infoBache(b);
  openModal(`<h3>Bache ${esc(b.codigo || '')}</h3><p class="hint">${num(redondear(x.kgC, 1))} kg de cereza de ${x.rs.length} pesadas · ${esc(x.lotes.join(', '))}${x.vend ? ' · <b>' + num(redondear(x.vend, 1)) + ' kg ya vendidos</b>' : ''}</p>
    <div class="fgrid c3"><label class="f">Fecha del beneficio<input id="eb-fecha" type="date" value="${esc(b.fecha)}"></label><label class="f">Proceso<select id="eb-met">${['Lavado', 'Honey', 'Natural', 'Semilavado', 'Fermentación controlada'].map(m => `<option ${m === b.metodo ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="f">Horas de fermentación<input id="eb-ferm" type="number" min="0" value="${b.fermentacionHoras || ''}"></label>
      <label class="f">Método de secado<select id="eb-sec">${['Marquesina solar', 'Patio / elba', 'Secador mecánico', 'Silo'].map(m => `<option ${m === b.secado ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="f">Inicio del secado<input id="eb-sini" type="date" value="${esc(b.secadoInicio || '')}"></label><label class="f">Fin del secado<input id="eb-sfin" type="date" value="${esc(b.secadoFin || '')}"></label>
      <label class="f">Pergamino seco (kg)<input id="eb-kg" type="number" min="0" step="0.1" value="${b.kgSalida != null ? b.kgSalida : ''}"></label><label class="f">Humedad final (%)<input id="eb-hum" type="number" step="0.1" value="${b.humedad || ''}"></label><label class="f">Pasilla (kg)<input id="eb-pas" type="number" step="0.1" value="${b.kgPasilla || ''}"></label>
      <label class="f" style="grid-column:1/-1">Observaciones<input id="eb-obs" value="${esc(b.obs || '')}"></label></div>
    <label class="f" style="margin-top:10px">Motivo del cambio (obligatorio)<input id="eb-mot" placeholder="Ej. terminó el secado"></label>
    <div class="modal-actions"><button class="btn danger-ghost" onclick="closeModal();eliminarBeneficio('${id}')" ${x.vend ? 'disabled title="Ya tiene ventas"' : ''}>Eliminar bache</button><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarBache22('${id}')">Guardar</button></div>`, true);
}
function guardarBache22(id) {
  const b = beneficios.find(x => x.id === id); const g = k => document.getElementById(k).value; const mot = g('eb-mot').trim(); if (!mot) { toast('Escriba el motivo del cambio.', 'err'); return; }
  const nuevo = { fecha: g('eb-fecha'), metodo: g('eb-met'), fermentacionHoras: n0(g('eb-ferm')) || null, secado: g('eb-sec'), secadoInicio: g('eb-sini') || null, secadoFin: g('eb-sfin') || null, kgSalida: g('eb-kg') === '' ? null : n0(g('eb-kg')), humedad: n0(g('eb-hum')) || null, kgPasilla: n0(g('eb-pas')) || null, obs: g('eb-obs').trim() };
  const vend = vendidoDeBache(b); if (vend > 0.01 && n0(nuevo.kgSalida) + 0.05 < vend) { toast('Ya se vendieron ' + num(redondear(vend, 1)) + ' kg de este bache; no puede quedar con menos.', 'err'); return; }
  const ult = registrosDeBeneficio(b).map(r => r.fecha).sort().pop(); if (ult && nuevo.fecha < ult) { toast('La fecha del beneficio no puede ser anterior a la recolección (' + fechaCorta(ult) + ').', 'err'); return; }
  const cambios = Object.keys(nuevo).filter(k => String(b[k] == null ? '' : b[k]) !== String(nuevo[k] == null ? '' : nuevo[k])).map(k => k + ': ' + (b[k] == null || b[k] === '' ? '—' : b[k]) + ' → ' + (nuevo[k] == null || nuevo[k] === '' ? '—' : nuevo[k]));
  if (!cambios.length) { closeModal(); return; } Object.assign(b, nuevo); b.modificado = ahoraISO(); registrarCambio('beneficio', b.id, 'Bache ' + (b.codigo || ''), 'Edición', cambios.join(' · ') + ' · Motivo: ' + mot, { motivo: mot });
  guardarEstado(); closeModal(); render(); toast('Bache actualizado', 'ok');
}

/* ---------- Pestaña Beneficio y lotes comerciales (Cosecha) ---------- */
function renderBeneficio22(host) {
  const an = csSt.anio; const bs = beneficios.filter(b => String(b.fecha).slice(0, 4) === an && (csSt.ciclo === 'Todos' || (b.tipo || 'Principal') === csSt.ciclo)).sort((a, b) => b.fecha.localeCompare(a.fecha)); const X = bs.map(b => ({ b, x: infoBache(b) }));
  const rsA = registros.filter(r => String(r.fecha).slice(0, 4) === an && (csSt.ciclo === 'Todos' || (r.tipo || 'Principal') === csSt.ciclo)); const kgReg = rsA.reduce((s, r) => s + n0(r.kg), 0); const kgBen = rsA.filter(r => r.beneficioId).reduce((s, r) => s + n0(r.kg), 0);
  const cps = X.reduce((s, o) => s + o.x.kgS, 0); const kgCcps = X.filter(o => o.x.kgS).reduce((s, o) => s + o.x.kgC, 0); const enLC = X.reduce((s, o) => s + (o.x.lcs.length ? o.x.kgS : 0), 0); const vend = X.reduce((s, o) => s + o.x.vend, 0);
  const lcs = partidas.filter(p => (p.beneficioIds || []).some(id => bs.some(b => b.id === id))).sort((a, b) => b.fecha.localeCompare(a.fecha)); const hum = X.filter(o => o.x.hum.c === 'mal').length;
  const flujo = [['Cereza registrada', kgReg, 'var(--cereza)'], ['Cereza beneficiada', kgBen, 'var(--c3)'], ['Pergamino seco (CPS)', cps, 'var(--c1)'], ['En lotes comerciales', enLC, 'var(--c2)'], ['Vendido', vend, 'var(--accent)'], ['Disponible en bodega', Math.max(0, cps - vend), 'var(--c4)']]; const fm = Math.max(1, kgReg);
  host.innerHTML = `<div class="k19-grid">${kpi19('Cereza sin beneficiar', num(Math.round(kgReg - kgBen)) + ' <small>kg</small>', kgReg ? num(Math.round((kgReg - kgBen) / kgReg * 100)) + ' % de lo recolectado' : '', kgReg - kgBen > 0.5 ? 'medio' : 'bien', 'i-cosecha')}${kpi19('Baches', bs.length, X.filter(o => o.x.est === 'En proceso').length + ' en secado', '', 'i-oper')}${kpi19('Pergamino seco', num(Math.round(cps)) + ' <small>kg</small>', num(redondear(cps / CARGA, 2)) + ' cargas', '', 'i-venta')}
      ${kpi19('Factor cereza : CPS', kgCcps && cps ? num(redondear(kgCcps / cps, 2)) : '—', 'kg de cereza por kg de pergamino', '', 'i-analisis')}${kpi19('Humedad fuera de rango', hum, 'rango ideal ' + humRango22().join(' a ') + ' %', hum ? 'mal' : 'bien', 'i-lote')}${kpi19('Disponible para vender', num(Math.round(Math.max(0, cps - vend))) + ' <small>kg</small>', num(redondear(Math.max(0, cps - vend) / CARGA, 2)) + ' cargas', '', 'i-finanzas')}</div>
    <div class="card"><div class="title">Balance de masa del café ${an} <span class="sub">de la cereza recolectada al pergamino vendido</span></div><div class="flujo22">${flujo.map(([t, v, c], i) => `<div class="fj22"><span>${t}</span><div><i style="width:${Math.max(0.5, v / fm * 100 * (i >= 2 ? (kgCcps && cps ? kgCcps / cps : 5) : 1))}%;background:${c}"></i></div><b class="mono">${num(Math.round(v))} kg</b></div>`).join('')}</div><p class="hint" style="margin:8px 0 0">Las barras del pergamino se muestran en equivalente de cereza (× factor) para compararlas con lo recolectado.</p></div>
    <div class="card"><div class="title">Baches <span class="sub">cada bache conoce sus pesadas exactas</span><span class="mp-actions" style="margin-left:auto"><button class="btn primary small" onclick="abrirBeneficioCosecha()">+ Registrar bache</button></span></div><div class="tscroll"><table class="dtable"><thead><tr><th>Código</th><th>Fecha</th><th>Origen</th><th class="num">Cereza</th><th>Proceso · secado</th><th class="num">Días secado</th><th class="num">Humedad</th><th class="num">CPS</th><th class="num">Factor</th><th>Lote comercial</th><th class="num">Disponible</th><th>Estado</th><th></th></tr></thead><tbody>
      ${X.map(({ b, x }) => `<tr><td>${chipCod(b.codigo || codigoBache(b))}</td><td>${fechaCorta(b.fecha)}</td><td>${esc(x.lotes.join(', '))}<br><small style="color:var(--text-faint)">${x.rs.length} pesadas · ${x.personas} personas · ${esc(x.pases.join(' '))}</small></td><td class="num">${num(redondear(x.kgC, 1))}</td><td>${esc(b.metodo || '—')}${b.fermentacionHoras ? ' · ' + num(b.fermentacionHoras) + ' h' : ''}<br><small style="color:var(--text-faint)">${esc(b.secado || '')}</small></td><td class="num">${x.dSec != null ? x.dSec : '—'}</td>
        <td class="num">${b.humedad ? num(b.humedad) + ' %' : '—'}<br><span class="fr22 ${x.hum.c}">${x.hum.t}</span></td><td class="num">${x.kgS ? num(redondear(x.kgS, 1)) : '—'}</td><td class="num">${x.factor ? num(redondear(x.factor, 2)) : '—'}</td><td>${x.lcs.map(p => chipCod(p.codigo)).join(' ') || (x.kgS ? '<small style="color:var(--text-faint)">sin lote</small>' : '—')}</td><td class="num">${x.kgS ? num(redondear(x.disp, 1)) : '—'}</td>
        <td><span class="pill ${x.est === 'Vendido' ? 'cerrada' : x.est === 'En proceso' ? 'ejecucion' : ''}">${x.est}</span></td><td class="actions"><button class="btn ghost small" onclick="editarBache22('${b.id}')">${x.est === 'En proceso' ? 'Completar' : 'Editar'}</button></td></tr>`).join('') || '<tr><td colspan="13" class="tb-na">Sin baches en este filtro.</td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="title">Lotes comerciales y microlotes <span class="sub">el café que se vende junto, con su origen</span><span class="mp-actions" style="margin-left:auto"><button class="btn primary small" onclick="abrirPartida()">+ Lote comercial</button></span></div>${tablaLC22(lcs)}</div>`;
}
function infoLC(p) { const bs = (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean); const X = bs.map(infoBache); const kgS = kgPartida(p), kgC = X.reduce((s, x) => s + x.kgC, 0);
  const humP = bs.filter(b => b.humedad).length ? bs.reduce((s, b) => s + n0(b.humedad) * n0(b.kgSalida), 0) / (bs.filter(b => b.humedad).reduce((s, b) => s + n0(b.kgSalida), 0) || 1) : null;
  return { bs, kgS, kgC, pesadas: X.reduce((s, x) => s + x.rs.length, 0), lotes: [...new Set(X.flatMap(x => x.lotes))], vend: vendidoDePartida(p.id), disp: disponiblePartida(p), hum: p.humedad || humP, cos: cosechaDePartida(p) }; }
function tablaLC22(lcs) {
  return `<div class="tscroll"><table class="dtable"><thead><tr><th>Código</th><th>Clase</th><th>Fecha</th><th>Baches</th><th>Origen</th><th class="num">Cereza</th><th class="num">CPS</th><th class="num">Humedad</th><th class="num">Factor</th><th class="num">Taza</th><th class="num">Vendido</th><th class="num">Disponible</th><th></th></tr></thead><tbody>
    ${lcs.map(p => { const x = infoLC(p); return `<tr><td>${chipCod(p.codigo)}${p.nombre ? `<br><small>${esc(p.nombre)}</small>` : ''}</td><td>${esc(p.clase || 'Lote comercial')}</td><td>${fechaCorta(p.fecha)}</td><td>${x.bs.map(b => `<span class="mono" style="font-size:10.5px">${esc(b.codigo || '')}</span>`).join('<br>')}</td><td>${esc(x.lotes.join(', '))}<br><small style="color:var(--text-faint)">${x.pesadas} pesadas · ${esc(x.cos)}</small></td><td class="num">${num(Math.round(x.kgC))}</td><td class="num">${num(redondear(x.kgS, 1))}</td><td class="num">${x.hum ? num(redondear(x.hum, 1)) + ' %' : '—'}</td><td class="num">${p.factor ? num(p.factor) : '—'}</td><td class="num">${p.taza ? num(p.taza) : '—'}</td><td class="num">${num(redondear(x.vend, 1))}</td><td class="num">${x.disp > 0.5 ? '<b>' + num(redondear(x.disp, 1)) + '</b>' : '<span class="pill cerrada">Vendido</span>'}</td>
      <td class="actions"><button class="btn ghost small" onclick="abrirTraza22('${esc(p.codigo)}')">Trazabilidad</button><button class="btn ghost small" onclick="abrirPartida('${p.id}')">Editar</button></td></tr>`; }).join('') || '<tr><td colspan="13" class="tb-na">Sin lotes comerciales.</td></tr>'}</tbody></table></div><p class="hint" style="margin:10px 0 0">Factor de rendimiento: kilos de pergamino seco para obtener 70 kg de excelso (entre más bajo, mejor el pago). Un microlote es un lote pequeño y diferenciado, con su perfil de taza.</p>`;
}

/* ---------- Lote comercial: clase, nombre o perfil, y código automático con los baches elegidos ---------- */
const _abrirPartida21 = abrirPartida;
abrirPartida = function (id) {
  _abrirPartida21(id); const p = id ? partidas.find(x => x.id === id) : null; const grid = document.querySelector('#modal .fgrid, .modal .fgrid'); const cod = document.getElementById('pa-cod'); if (!cod) return;
  cod.dataset.auto = id ? '' : '1'; cod.addEventListener('keydown', () => { cod.dataset.auto = ''; });
  const extra = document.createElement('div'); extra.className = 'fgrid c2'; extra.style.marginTop = '10px';
  extra.innerHTML = `<label class="f">Clase<select id="pa-clase" onchange="recodLC22()"><option ${!p || p.clase !== 'Microlote' ? 'selected' : ''}>Lote comercial</option><option ${p && p.clase === 'Microlote' ? 'selected' : ''}>Microlote</option></select></label><label class="f">Nombre o perfil (opcional)<input id="pa-nom" value="${esc((p && p.nombre) || '')}" placeholder="Ej. Castillo lavado · notas a panela"></label>`;
  const fg = cod.closest('.fgrid'); if (fg) fg.after(extra);
  document.querySelectorAll('.pa-b').forEach(e => e.addEventListener('change', recodLC22)); recodLC22();
};
function recodLC22() { const cod = document.getElementById('pa-cod'); if (!cod || cod.dataset.auto !== '1') return; const ids = [...document.querySelectorAll('.pa-b:checked')].map(e => e.value); cod.value = nuevoCodigoLC({ id: '_nuevo', fecha: document.getElementById('pa-fecha').value, beneficioIds: ids, clase: (document.getElementById('pa-clase') || {}).value }); }
const _guardarPartida21 = guardarPartida;
guardarPartida = function (id) { const clase = (document.getElementById('pa-clase') || {}).value || 'Lote comercial', nombre = ((document.getElementById('pa-nom') || {}).value || '').trim(); const cod = document.getElementById('pa-cod').value.trim(); const antes = new Set(partidas.map(p => p.id));
  if (partidas.some(p => p.id !== id && p.codigo === cod)) { toast('Ya existe un lote comercial con el código ' + cod + '.', 'err'); return; }
  _guardarPartida21(id); const p = id ? partidas.find(x => x.id === id) : partidas.find(x => !antes.has(x.id)); if (!p) return; const nuevo = !id; p.clase = clase; p.nombre = nombre;
  registrarCambio('partida', p.id, p.codigo, nuevo ? 'Creación' : 'Edición', clase + ' · ' + num(Math.round(kgPartida(p))) + ' kg · baches ' + (p.beneficioIds || []).map(b => (beneficios.find(x => x.id === b) || {}).codigo || '').join(', ')); guardarEstado(); render(); };

/* ---------- Ventas: código propio y retención en la fuente según la norma vigente en la fecha ---------- */
const UVT_ANIO = { 2024: 47065, 2025: 49799, 2026: 52374 };
function uvtDe(an) { const c = (contaConfig && contaConfig.uvt) || {}; return n0(c[an]) || UVT_ANIO[an] || UVT_ANIO[2026]; }
/* Compras de café pergamino o cereza (art. 1.2.4.6.8 del DUR 1625 de 2016): 0,5 % sobre pagos desde la base.
   Base de 160 UVT; el Decreto 572 de 2025 la bajó a 70 UVT desde el 1 de junio de 2025, pero el Consejo de Estado suspendió ese cambio el 7 de mayo de 2026 y la DIAN volvió a 160 UVT desde el 8 de mayo de 2026.
   La base se mide con las compras del mismo comprador al mismo vendedor en el mismo día. Verifique siempre con su contador. */
function reglaRetencion(bruto, fecha, terceroId, ventaId) {
  const f = String(fecha || hoyLocal()); const an = Number(f.slice(0, 4)); const c = (contaConfig && contaConfig.retencionCafe) || {}; const pct = c.pct != null ? n0(c.pct) : 0.5;
  const baseUVT = c.baseUVT != null ? n0(c.baseUVT) : (f >= '2025-06-01' && f < '2026-05-08' ? 70 : 160); const base = baseUVT * uvtDe(an);
  const mismoDia = terceroId ? ventas.filter(v => v.id !== ventaId && v.fecha === f && v.terceroId === terceroId).reduce((s, v) => s + valorVenta(v).bruto, 0) : 0;
  const aplica = bruto + mismoDia >= base; return { pct: aplica ? pct : 0, base, baseUVT, uvt: uvtDe(an), mismoDia, aplica };
}
const _abrirVenta21 = abrirVenta;
abrirVenta = function (id) {
  _abrirVenta21(id); const e = document.getElementById('vt-ret'); if (!e) return; const v = id ? ventas.find(x => x.id === id) : null;
  e.dataset.auto = !v || v.retencionAuto ? '1' : ''; e.addEventListener('keydown', () => { e.dataset.auto = ''; });
  const tot = document.getElementById('vt-tot'); if (tot && !document.getElementById('vt-ret-h')) tot.insertAdjacentHTML('afterend', '<p class="hint" id="vt-ret-h" style="margin:8px 0 0"></p>');
  const h3 = document.querySelector('.modal h3, #modal h3'); if (h3 && v) h3.insertAdjacentHTML('beforeend', ' <span class="mono" style="font-size:12px;color:var(--text-faint)">' + esc(codigoVenta(v)) + '</span>');
  totVenta();
};
const _totVenta21 = totVenta;
totVenta = function () {
  const e = document.getElementById('vt-ret'); let r = null;
  if (e) { const pk = [...document.querySelectorAll('.vt-pk')].reduce((s, x) => s + n0(x.value), 0); const kg = pk || n0((document.getElementById('vt-kg') || {}).value); const precio = n0((document.getElementById('vt-pc') || {}).value) / CARGA;
    r = reglaRetencion(kg * precio, (document.getElementById('vt-fecha') || {}).value, (document.getElementById('vt-ter') || {}).value || null, window._vDraft && window._vDraft.id); if (e.dataset.auto === '1') e.value = r.pct; }
  _totVenta21();
  const h = document.getElementById('vt-ret-h'); if (h && r) h.innerHTML = e.dataset.auto === '1' ? `Retención calculada: <b>${num(r.pct)} %</b> — ${r.aplica ? 'la venta' + (r.mismoDia ? ' (sumada a las del mismo día con este comprador)' : '') + ' llega a la base de ' : 'no llega a la base de '}${num(r.baseUVT)} UVT (${fmt(r.base)}, UVT ${fmt(r.uvt)}). Si el comprador retuvo otro valor, escríbalo y queda manual.` : 'Retención escrita a mano. Para volver al cálculo automático, borre el valor y abra de nuevo la venta.';
};
const _guardarVenta21 = guardarVenta;
guardarVenta = function (id) { const e = document.getElementById('vt-ret'); const auto = !!(e && e.dataset.auto === '1'); const antes = new Set(ventas.map(v => v.id)); _guardarVenta21(id); const v = id ? ventas.find(x => x.id === id) : ventas.find(x => !antes.has(x.id)); if (!v) return; v.retencionAuto = auto;
  if (!id) { v.codigo = codigoVenta(v); registrarCambio('venta', v.id, 'Venta ' + v.codigo, 'Creación', num(redondear(v.kg, 1)) + ' kg a ' + terceroNombre(v.terceroId, v.comprador) + ' · ' + ((v.partidas || []).length ? 'lotes ' + v.partidas.map(x => (partidas.find(p => p.id === x.partidaId) || {}).codigo).join(', ') : 'sin lote comercial')); }
  guardarEstado(); };
const _coVentas21 = coVentas;
coVentas = function () { _coVentas21(); const vs = ventas.filter(v => String(v.fecha).slice(0, 4) === coSt.anio).sort((a, b) => b.fecha.localeCompare(a.fecha)); const filas = document.querySelectorAll('#co-cuerpo table.dtable tbody tr'); const tablas = document.querySelectorAll('#co-cuerpo table.dtable'); const t = tablas[tablas.length - 1]; if (!t) return;
  [...t.querySelectorAll('tbody tr')].forEach((tr, i) => { const v = vs[i]; if (!v || !tr.cells[0]) return; tr.cells[0].insertAdjacentHTML('beforeend', '<br>' + chipCod(codigoVenta(v))); if (!(v.partidas || []).length && tr.cells[2]) tr.cells[2].insertAdjacentHTML('beforeend', `<br><button class="link" onclick="abrirVenta('${v.id}')">Asignar lote comercial</button>`); }); };
coPartidas = function () { const host = document.getElementById('co-cuerpo'); const libres = beneficiosLibres().filter(b => n0(b.kgSalida));
  host.innerHTML = `${libres.length ? `<div class="card"><div class="title">Pergamino sin lote comercial <span class="sub">${libres.length} bache(s) · ${num(Math.round(libres.reduce((s, b) => s + n0(b.kgSalida), 0)))} kg</span></div><p class="hint" style="margin-top:0">Agrupe los baches en lotes comerciales para vender con trazabilidad exacta.</p><div class="mp-btns"><button class="btn primary small" onclick="abrirPartida()">Crear lote comercial</button><button class="btn ghost small" onclick="partidasSemanales()">Uno por semana</button></div></div>` : ''}
    <div class="card"><div class="title">Lotes comerciales y microlotes</div>${tablaLC22(partidas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)))}</div>`; };

const _renderComercial21 = renderComercial;
renderComercial = function () { codigosAlDia(); return _renderComercial21.apply(this, arguments); };

/* ---------- Consulta de trazabilidad por cualquier código ---------- */
function resolverCodigo22(q) {
  q = String(q || '').trim().toUpperCase(); if (!q) return null; const eq = c => !!c && String(c).toUpperCase() === q; let o;
  if ((o = ventas.find(v => eq(codigoVenta(v)) || eq(v.documento)))) return { tipo: 'venta', o };
  if ((o = partidas.find(p => eq(p.codigo)))) return { tipo: 'partida', o };
  if ((o = beneficios.find(b => eq(b.codigo || codigoBache(b))))) return { tipo: 'bache', o };
  if ((o = registros.find(r => eq(codigoPesada(r)) || (r.codigosAnteriores || []).some(eq)))) return { tipo: 'pesada', o };
  if ((o = pases.find(p => eq(p.codigo)))) return { tipo: 'pase', o };
  if ((o = pagos.find(p => eq(p.codigo)))) return { tipo: 'pago', o };
  if ((o = adelantos.find(a => eq(a.codigo)))) return { tipo: 'movimiento', o };
  if ((o = trabajadores.find(t => eq(codPersona(t))))) return { tipo: 'persona', o };
  if ((o = lotes.find(l => eq(siglaDeLote(l.id) + '-' + codLoteCorto(l)) || eq(codLoteCorto(l))))) return { tipo: 'lote', o };
  return null;
}
function sugerencias22(q) { q = String(q || '').trim().toUpperCase(); if (q.length < 2) return []; const L = []; const add = (c, t) => { if (c && String(c).toUpperCase().includes(q) && L.length < 12 && !L.some(x => x.c === c)) L.push({ c, t }); };
  ventas.forEach(v => add(codigoVenta(v), 'Venta ' + fechaCorta(v.fecha))); partidas.forEach(p => add(p.codigo, p.clase || 'Lote comercial')); beneficios.forEach(b => add(b.codigo || codigoBache(b), 'Bache ' + fechaCorta(b.fecha))); pases.forEach(p => add(p.codigo, 'Pase')); pagos.forEach(p => add(p.codigo, 'Liquidación')); trabajadores.forEach(t => add(codPersona(t), t.nombre)); registros.forEach(r => add(codigoPesada(r), 'Pesada · ' + r.recolector)); return L; }
function cadena22(ref) {
  const R = new Set(), B = new Set(), P = new Set(), V = new Set(); let estimado = false;
  const upV = v => { (v.partidas || []).forEach(x => { const p = partidas.find(q => q.id === x.partidaId); if (p) P.add(p); }); if (!(v.partidas || []).length) { estimado = true; origenVenta(v).partes.forEach(pt => pt.beneficios.forEach(o => B.add(o.b))); } };
  const upP = p => (p.beneficioIds || []).forEach(id => { const b = beneficios.find(x => x.id === id); if (b) B.add(b); }); const upB = b => registrosDeBeneficio(b).forEach(r => R.add(r));
  const dnR = r => { const b = beneficioDeRegistro(r); if (b) B.add(b); }; const dnB = b => partidas.filter(p => (p.beneficioIds || []).includes(b.id)).forEach(p => P.add(p)); const dnP = p => ventas.filter(v => (v.partidas || []).some(x => x.partidaId === p.id)).forEach(v => V.add(v));
  const t = ref.tipo, o = ref.o;
  if (t === 'venta') { V.add(o); upV(o); P.forEach(upP); B.forEach(upB); }
  else if (t === 'partida') { P.add(o); upP(o); B.forEach(upB); dnP(o); }
  else if (t === 'bache') { B.add(o); upB(o); dnB(o); P.forEach(dnP); }
  else { (t === 'pesada' ? [o] : t === 'pase' ? regsDePase(o) : t === 'pago' ? registros.filter(r => (o.registroIds || []).includes(r.id) || r.pagoId === o.id) : t === 'persona' ? registros.filter(r => r.trabajadorId === o.id && String(r.fecha).slice(0, 4) === hoyLocal().slice(0, 4)) : t === 'lote' ? registros.filter(r => r.loteId === o.id && String(r.fecha).slice(0, 4) === hoyLocal().slice(0, 4)) : []).forEach(r => R.add(r)); R.forEach(dnR); B.forEach(dnB); P.forEach(dnP); }
  const Rs = [...R].sort((a, b) => a.fecha.localeCompare(b.fecha)); const G = [...new Set(Rs.map(pagoDeRegistro).filter(Boolean))];
  return { R: Rs, B: [...B], P: [...P], V: [...V], G, estimado };
}
function asientosDeCadena(c) { try { const L = libroDiario(); const ids = new Set([...c.V, ...c.G, ...c.P, ...c.B].map(x => x.id)); const dias = new Set(c.R.map(r => r.fecha + '|' + (r.loteId || '')));
  return L.asientos.filter(a => (a.ref && ids.has(a.ref)) || (a.origen === 'Recolección' && dias.has(a.fecha + '|' + (a.loteId || '')))); } catch (e) { return []; } }
function abrirTraza22(code) { coSt.trazaQ = code; coSt.tab = 'traza'; if (typeof closeModal === 'function') try { closeModal(); } catch (e) {} if (vistaActual !== 'comercial') ir('comercial'); else renderComercial(); }
const _coTraza21 = coTraza;
coTraza = function () {
  const host = document.getElementById('co-cuerpo'); const q = coSt.trazaQ || ''; const ref = resolverCodigo22(q);
  const buscador = `<div class="card tz22-bus"><div class="title">Consultar trazabilidad <span class="sub">escriba cualquier código: venta, lote comercial, bache, pase, pesada, liquidación o persona</span></div>
    <div class="tz22-in"><input id="tz-q" value="${esc(q)}" placeholder="Ej. ${esc(ventas[0] ? codigoVenta(ventas[0]) : 'TESO-V26-001-3')}" oninput="sugTraza22(this.value)" onkeydown="if(event.key==='Enter'){coSt.trazaQ=this.value.trim();renderComercial()}" autocomplete="off"><button class="btn primary small" onclick="coSt.trazaQ=document.getElementById('tz-q').value.trim();renderComercial()">Consultar</button>${q ? `<button class="btn ghost small" onclick="coSt.trazaQ='';renderComercial()">Limpiar</button>` : ''}</div><div id="tz-sug" class="tz22-sug"></div>
    ${q && !ref ? `<p class="hint" style="color:var(--danger)">No se encontró el código «${esc(q)}».${codigoConDV(q) ? '' : ' Revise que esté completo: su último dígito es un verificador.'}</p>` : ''}</div>`;
  if (!ref) { if (!q) { _coTraza21(); host.insertAdjacentHTML('afterbegin', buscador); } else host.innerHTML = buscador; return; }
  if (ref.tipo === 'venta') { coSt.trazaVenta = ref.o.id; coSt.trazaPartida = null; } else if (ref.tipo === 'partida') { coSt.trazaPartida = ref.o.id; coSt.trazaVenta = null; }
  const c = cadena22(ref); const kgC = c.R.reduce((s, r) => s + n0(r.kg), 0); const kgS = c.B.reduce((s, b) => s + n0(b.kgSalida), 0); const kgV = c.V.reduce((s, v) => s + n0(v.kg), 0); const As = asientosDeCadena(c);
  const porLote = new Map(), porPer = new Map(); c.R.forEach(r => { const a = porLote.get(r.loteId) || { kg: 0, n: 0, v: 0 }; a.kg += n0(r.kg); a.n++; a.v += pagoRegistro(r); porLote.set(r.loteId, a); const b = porPer.get(r.trabajadorId) || { kg: 0, n: 0, v: 0 }; b.kg += n0(r.kg); b.n++; b.v += pagoRegistro(r); porPer.set(r.trabajadorId, b); });
  const caja = (t, v, s) => `<div class="tz22-c"><span>${t}</span><b>${v}</b><small>${s || ''}</small></div>`; const nombreRef = { venta: 'Venta', partida: 'Lote comercial', bache: 'Bache', pesada: 'Pesada', pase: 'Pase', pago: 'Liquidación', movimiento: 'Movimiento', persona: 'Persona', lote: 'Lote' }[ref.tipo];
  const control = []; if (c.estimado) control.push(['medio', 'La venta no tiene lote comercial asignado: el origen se estimó con los baches más antiguos disponibles. Asígnele su lote comercial para que la trazabilidad sea exacta.']);
  if (c.V.length && c.P.length) c.P.forEach(p => { if (vendidoDePartida(p.id) > kgPartida(p) + 0.5) control.push(['mal', 'El lote ' + p.codigo + ' tiene más kilos vendidos (' + num(Math.round(vendidoDePartida(p.id))) + ') que su pergamino (' + num(Math.round(kgPartida(p))) + ').']); });
  c.B.forEach(b => { const x = infoBache(b); if (x.factor && (x.factor < 4.2 || x.factor > 6)) control.push(['medio', 'El bache ' + (b.codigo || '') + ' tiene un factor de ' + num(redondear(x.factor, 2)) + ' kg de cereza por kg de pergamino, fuera de lo usual (4,8 a 5,4): revise los kilos.']); if (!registrosDeBeneficio(b).length) control.push(['medio', 'El bache ' + (b.codigo || '') + ' no tiene pesadas ligadas.']); });
  if (ref.tipo !== 'pesada' && c.R.length && c.R.some(r => !r.beneficioId) && c.B.length) control.push(['medio', c.R.filter(r => !r.beneficioId).length + ' pesada(s) del origen aún no tienen bache.']);
  host.innerHTML = buscador + `<div class="card tz22"><div class="title">${nombreRef} ${chipCod(q.toUpperCase())} <span class="sub">${c.estimado ? 'origen estimado' : 'cadena exacta'} · ${c.R.length} pesadas · ${c.B.length} baches · ${c.P.length} lotes comerciales · ${c.V.length} ventas</span></div>
    <div class="tz22-cad">${caja('Venta', c.V.map(v => esc(codigoVenta(v))).join('<br>') || '—', c.V.length ? num(redondear(kgV, 1)) + ' kg · ' + esc([...new Set(c.V.map(v => terceroNombre(v.terceroId, v.comprador)))].join(', ')) : 'sin vender')}${caja('Lote comercial', c.P.map(p => esc(p.codigo)).join('<br>') || '—', c.P.length ? num(redondear(c.P.reduce((s, p) => s + kgPartida(p), 0), 1)) + ' kg CPS' : '')}${caja('Baches', c.B.map(b => esc(b.codigo || codigoBache(b))).join('<br>') || '—', kgS ? num(redondear(kgS, 1)) + ' kg CPS · factor ' + (kgS ? num(redondear(c.B.reduce((s, b) => s + infoBache(b).kgC, 0) / kgS, 2)) : '—') : '')}
      ${caja('Pases', [...new Set(c.R.map(r => (paseDe(r) || {}).codigo).filter(Boolean))].join('<br>') || '—', num(new Set(c.R.map(r => r.fecha)).size) + ' días')}${caja('Lotes', [...porLote.keys()].map(id => esc(nombreLote(id))).join('<br>') || '—', num(redondear(kgC, 1)) + ' kg cereza')}${caja('Recolectores', porPer.size + ' personas', fmt(c.R.reduce((s, r) => s + pagoRegistro(r), 0)) + ' en recolección')}${caja('Contabilidad', As.length + ' asientos', c.G.length + ' liquidación(es)')}</div>
    ${control.length ? control.map(([t, m]) => `<div class="fl-sug ${t === 'mal' ? 'alerta' : ''}" style="margin-top:10px"><b>${t === 'mal' ? 'Inconsistencia' : 'Revise'}</b><span>${esc(m)}</span></div>`).join('') : '<div class="fl-sug" style="margin-top:10px"><b>Cadena consistente</b><span>Cada kilo vendido tiene su bache, sus pesadas y su pago; el balance de masa cuadra.</span></div>'}
    <div class="grid g2" style="margin-top:14px"><div><div class="sec-label" style="margin-top:0">1 · Pesadas de origen</div><div class="tscroll" style="max-height:320px"><table class="dtable"><thead><tr><th>Fecha</th><th>Código</th><th>Recolector</th><th class="num">Kg</th><th class="num">Valor</th><th>Pago</th><th>Bache</th></tr></thead><tbody>${c.R.map(r => { const pg = pagoDeRegistro(r), bn = beneficioDeRegistro(r); return `<tr><td>${fechaCorta(r.fecha)}</td><td class="mono" style="font-size:10.5px">${esc(codigoPesada(r))}</td><td>${esc(r.recolector)}</td><td class="num">${num(redondear(r.kg, 1))}</td><td class="num">${fmt(pagoRegistro(r))}</td><td class="mono" style="font-size:10.5px">${pg ? esc(pg.codigo || 'pagado') : '<span style="color:var(--warn)">pendiente</span>'}</td><td class="mono" style="font-size:10.5px">${bn ? esc(bn.codigo || '') : '—'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="tb-na">Sin pesadas ligadas.</td></tr>'}</tbody>${c.R.length ? `<tfoot><tr><td colspan="3">Total</td><td class="num">${num(redondear(kgC, 1))}</td><td class="num">${fmt(c.R.reduce((s, r) => s + pagoRegistro(r), 0))}</td><td colspan="2"></td></tr></tfoot>` : ''}</table></div></div>
      <div><div class="sec-label" style="margin-top:0">2 · Resumen del origen</div><table class="dtable"><thead><tr><th>Lote</th><th class="num">Kg cereza</th><th class="num">%</th><th class="num">Pesadas</th><th class="num">$ recolección</th></tr></thead><tbody>${[...porLote.entries()].map(([id, a]) => `<tr><td>${esc(nombreLote(id))}</td><td class="num">${num(redondear(a.kg, 1))}</td><td class="num">${num(Math.round(a.kg / (kgC || 1) * 100))} %</td><td class="num">${a.n}</td><td class="num">${fmt(a.v)}</td></tr>`).join('')}</tbody></table>
        <table class="dtable" style="margin-top:10px"><thead><tr><th>Recolector</th><th class="num">Kg</th><th class="num">Pesadas</th><th class="num">Valor</th></tr></thead><tbody>${[...porPer.entries()].sort((a, b) => b[1].kg - a[1].kg).map(([id, a]) => `<tr><td>${esc(nombreTrabajador(id))} <span class="mono" style="font-size:10px;color:var(--text-faint)">${esc(codPersonaDeId(id))}</span></td><td class="num">${num(redondear(a.kg, 1))}</td><td class="num">${a.n}</td><td class="num">${fmt(a.v)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="sec-label">3 · Asientos contables relacionados</div><div class="tscroll" style="max-height:260px"><table class="dtable"><thead><tr><th>Fecha</th><th>Origen</th><th>Descripción</th><th>Débito</th><th>Crédito</th></tr></thead><tbody>${As.map(a => `<tr><td>${fechaCorta(a.fecha)} ${a.fecha.slice(2, 4)}</td><td>${esc(a.origen)}</td><td style="font-size:11.5px">${esc(a.desc)}</td><td class="mono" style="font-size:11px">${a.lineas.filter(l => l.debe).map(l => esc(l.cuenta) + ' · ' + fmt(l.debe)).join('<br>')}</td><td class="mono" style="font-size:11px">${a.lineas.filter(l => l.haber).map(l => esc(l.cuenta) + ' · ' + fmt(l.haber)).join('<br>')}</td></tr>`).join('') || '<tr><td colspan="5" class="tb-na">Sin asientos.</td></tr>'}</tbody></table></div></div>`;
  if (ref.tipo === 'venta' || ref.tipo === 'partida') { const html0 = host.innerHTML; try { _coTraza21(); const det = host.innerHTML; host.innerHTML = html0; const w = document.createElement('div'); w.innerHTML = det; const sel = w.querySelector('.chip-row'); if (sel) sel.remove(); host.appendChild(w); } catch (e) { host.innerHTML = html0; } }
};
function sugTraza22(v) { const h = document.getElementById('tz-sug'); if (!h) return; const L = sugerencias22(v); h.innerHTML = L.map(x => `<button class="chip-btn" onclick="coSt.trazaQ='${esc(x.c)}';renderComercial()"><span class="mono">${esc(x.c)}</span> <small>${esc(x.t)}</small></button>`).join(''); }
