/* ================= ESTRUCTURA: edición, unificar, dividir, áreas y trazabilidad ================= */
let bitacora = [];
let mostrarHistoricos = false;
let loteSel = new Set();
const COL_BIT = 'bitacora';
const activo = x => !!x && x.estado !== 'inactivo';
const fincasActivas = () => fincas.filter(activo);
const lotesActivos = () => lotes.filter(activo);
function ahoraISO() { const d = new Date(); return hoyLocal() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
function tarifaDe(r) { if (r && r.tarifa !== undefined && r.tarifa !== null && r.tarifa !== '') return n0(r.tarifa); const t = trabajadores.find(x => x.id === (r && r.trabajadorId)); return t ? n0(t.tarifaPorKg) : 0; }

function registrarCambio(entidad, refId, nombre, accion, detalle, extra) {
  bitacora.push(Object.assign({ id: uid('bt'), fecha: hoyLocal(), hora: ahoraISO(), entidad, refId, nombre, accion, detalle: detalle || '' }, extra || {}));
}
function etiquetaEstado(x, tipo) {
  if (activo(x)) return '';
  const lista = tipo === 'finca' ? fincas : lotes;
  const destinos = (x.destino || []).map(id => (lista.find(y => y.id === id) || {}).nombre).filter(Boolean);
  const txt = x.motivoBaja === 'Unificación' ? 'Unificado en ' + destinos.join(', ')
    : x.motivoBaja === 'División' ? 'Dividido en ' + destinos.join(', ')
    : 'Retirado' + (x.motivoBaja ? ' · ' + x.motivoBaja.toLowerCase() : '');
  return ` <span class="pill programada" title="Histórico desde ${esc(x.vigenteHasta || '')}">${esc(txt)}</span>`;
}
function linajeAscendente(id, lista) {
  const out = new Set(); const pila = [id];
  while (pila.length) { const x = lista.find(y => y.id === pila.pop()); (x && x.origen || []).forEach(o => { if (!out.has(o)) { out.add(o); pila.push(o); } }); }
  return [...out];
}
function linajeDescendente(id, lista) {
  const out = new Set(); const pila = [id];
  while (pila.length) { const x = lista.find(y => y.id === pila.pop()); (x && x.destino || []).forEach(o => { if (!out.has(o)) { out.add(o); pila.push(o); } }); }
  return [...out];
}

/* ---------- Edición genérica con bitácora ---------- */
const CONTRATOS = ['Término indefinido','Término fijo','Prestación de servicios'];
const CATEGORIAS_ACTIVO = ['Infraestructura','Maquinaria','Vehículo','Otro'];
const ESQUEMAS = {
  finca: { titulo:'finca', lista:() => fincas, campos:[['nombre','Nombre de la finca','text',1],['propietario','Propietario'],['vereda','Vereda'],['municipio','Municipio'],['departamento','Departamento'],['matricula','Matrícula inmobiliaria'],['cedulaCatastral','Cédula catastral'],['areaTotal','Área total (ha)','number'],['altitud','Altitud (msnm)','number'],['lat','Latitud'],['lon','Longitud']] },
  lote: { titulo:'lote', lista:() => lotes, campos:[['nombre','Nombre del lote','text',1],['codigo','Código del lote (mapa)'],['variedadId','Variedad','variedad'],['hectareas','Hectáreas','number'],['fechaSiembra','Fecha de siembra','date'],['densidad','Densidad'],['cedulaCatastral','Cédula catastral del predio'],['altitud','Altitud (msnm)','number']] },
  bloque: { titulo:'bloque', lista:() => bloques, campos:[['nombre','Nombre del bloque','text',1],['loteId','Lote','lote']] },
  variedad: { titulo:'variedad', lista:() => variedades, campos:[['nombre','Nombre de la variedad','text',1]] },
  trabajador: { titulo:'recolector', lista:() => trabajadores, campos:[['nombre','Nombre','text',1],['telefono','Teléfono'],['tarifaPorKg','Tarifa por kg ($)','number']] },
  empleado: { titulo:'empleado', lista:() => empleados, campos:[['nombre','Nombre','text',1],['cedula','Cédula'],['cargo','Cargo'],['fechaIngreso','Fecha de ingreso','date'],['contrato','Contrato','contrato'],['salario','Salario mensual ($)','number']] },
  activo: { titulo:'activo', lista:() => activos, campos:[['nombre','Nombre','text',1],['categoria','Categoría','categoria'],['fecha','Fecha de adquisición','date'],['costo','Costo de adquisición ($)','number'],['vidaUtil','Vida útil (años)','number'],['valorResidual','Valor residual ($)','number']] },
};
const CAMPOS_SENSIBLES = ['hectareas','areaTotal','tarifaPorKg','salario','costo','vidaUtil'];
function inputCampo(tipo, [k, lbl, t], valor) {
  const id = 'ed-' + k;
  if (t === 'variedad') return `<label class="f">${lbl}<select id="${id}"><option value="">Sin variedad</option>${variedades.map(v=>`<option value="${v.id}" ${v.id===valor?'selected':''}>${esc(v.nombre)}</option>`).join('')}</select></label>`;
  if (t === 'lote') return `<label class="f">${lbl}<select id="${id}">${lotes.filter(l => activo(l) || l.id === valor).map(l=>`<option value="${l.id}" ${l.id===valor?'selected':''}>${esc(l.nombre)} · ${esc(nombreFinca(l.fincaId))}</option>`).join('')}</select></label>`;
  if (t === 'contrato' || t === 'categoria') { const ops = t === 'contrato' ? CONTRATOS : CATEGORIAS_ACTIVO; return `<label class="f">${lbl}<select id="${id}">${ops.map(o=>`<option ${o===valor?'selected':''}>${o}</option>`).join('')}</select></label>`; }
  return `<label class="f">${lbl}<input id="${id}" type="${t==='number'?'number':(t==='date'?'date':'text')}" ${t==='number'?'step="any"':''} value="${esc(valor ?? '')}"></label>`;
}
function editarEntidad(tipo, id) {
  const E = ESQUEMAS[tipo]; const x = E.lista().find(y => y.id === id); if (!x) return;
  const vals = Object.assign({}, x); if (tipo === 'lote' && !vals.codigo) vals.codigo = codigoLote(x);
  openModal(`
    <h3>Editar ${E.titulo}: ${esc(x.nombre)}</h3>
    <p class="hint">Los cambios quedan en el historial con la fecha, el valor anterior y el nuevo. Los registros pasados conservan su vínculo; si cambia el nombre, se actualiza en todos ellos.</p>
    <div class="fgrid c2">${E.campos.map(c => inputCampo(tipo, c, vals[c[0]])).join('')}</div>
    <div class="sec-label">Registro del cambio</div>
    <div class="fgrid c2">
      <label class="f">Fecha efectiva<input id="ed-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Motivo (opcional)<input id="ed-motivo" placeholder="Ej. Corrección de medición, compra de terreno"></label>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarEdicion('${tipo}','${id}')">Guardar cambios</button></div>`, true);
}
function guardarEdicion(tipo, id) {
  try {
    const E = ESQUEMAS[tipo]; const x = E.lista().find(y => y.id === id); if (!x) return;
    const fecha = document.getElementById('ed-fecha').value || hoyLocal(), motivo = document.getElementById('ed-motivo').value.trim();
    const cambios = [];
    for (const [k, lbl, t, req] of E.campos) {
      let v = document.getElementById('ed-' + k).value; if (t !== 'number') v = String(v).trim();
      if (req && !v) { alert('El campo "' + lbl + '" no puede quedar vacío.'); return; }
      if (t === 'number' && v !== '' && n0(v) < 0) { alert('El campo "' + lbl + '" no puede ser negativo.'); return; }
      if (k === 'codigo') v = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const antes = x[k] ?? '';
      if (String(antes) !== String(v)) cambios.push({ campo:k, etiqueta:lbl, antes, despues: (t === 'number' && v !== '' ? Number(v) : v) });
    }
    if (!cambios.length) { closeModal(); toast('No hubo cambios'); return; }
    if (tipo === 'lote' && cambios.some(c => c.campo === 'nombre') && lotes.some(l => l.id !== id && activo(l) && l.fincaId === x.fincaId && l.nombre.toLowerCase() === String(cambios.find(c=>c.campo==='nombre').despues).toLowerCase())) { alert('Ya existe un lote activo con ese nombre en la misma finca.'); return; }
    if (tipo === 'lote' && cambios.some(c => c.campo === 'codigo') && muestreos.some(m => m.loteId === id)) {
      if (!confirmarCodigo) { confirmarCodigo = true; alert('Este lote ya tiene muestreos con plantas codificadas. Si cambia el código, los muestreos anteriores conservan sus códigos viejos. Pulse Guardar otra vez para confirmar.'); return; }
    }
    confirmarCodigo = false;
    // Conserva el valor histórico de la tarifa en los registros ya hechos
    if (tipo === 'trabajador' && cambios.some(c => c.campo === 'tarifaPorKg')) registros.forEach(r => { if (r.trabajadorId === id && (r.tarifa === undefined || r.tarifa === null || r.tarifa === '')) r.tarifa = n0(x.tarifaPorKg); });
    if (tipo === 'lote' && cambios.some(c => c.campo === 'hectareas')) { (x.areaHistorial = x.areaHistorial || []).push({ fecha, antes:n0(x.hectareas), despues:n0(cambios.find(c=>c.campo==='hectareas').despues), motivo: motivo || 'Edición' }); }
    if (tipo === 'finca' && cambios.some(c => c.campo === 'areaTotal')) { (x.areaHistorial = x.areaHistorial || []).push({ fecha, antes:n0(x.areaTotal), despues:n0(cambios.find(c=>c.campo==='areaTotal').despues), motivo: motivo || 'Edición' }); }
    const nombreAntes = x.nombre;
    cambios.forEach(c => { x[c.campo] = c.despues; });
    if (cambios.some(c => c.campo === 'nombre')) { (x.alias = x.alias || []).includes(nombreAntes) || x.alias.push(nombreAntes); propagarNombre(tipo, id, nombreAntes, x.nombre); }
    if (tipo === 'lote' && cambios.some(c => c.campo === 'variedadId')) registros.forEach(r => { if (r.loteId === id && r.fecha >= fecha) { r.variedadId = x.variedadId; r.variedad = r.variedadNombre = nombreVariedad(x.variedadId); } });
    registrarCambio(tipo, id, x.nombre, 'Edición', (motivo ? motivo + '. ' : '') + cambios.map(c => c.etiqueta + ': ' + fmtValor(c.antes) + ' → ' + fmtValor(c.despues)).join(' · '), { fechaEfectiva: fecha, cambios });
    closeModal(); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo();
    toast(E.titulo.charAt(0).toUpperCase() + E.titulo.slice(1) + ' actualizado: ' + cambios.length + ' cambio(s) en el historial');
  } catch (e) { dlog('✗ guardarEdicion: ' + e.message, 'err'); alert('No se pudo guardar. (' + e.message + ')'); }
}
let confirmarCodigo = false;
function fmtValor(v) { if (v === '' || v == null) return '—'; const vv = variedades.find(z => z.id === v) || lotes.find(z => z.id === v); return vv ? vv.nombre : String(v); }
function propagarNombre(tipo, id, viejo, nuevo) {
  if (tipo === 'finca') {
    registros.forEach(r => { if (r.fincaId === id || (!r.fincaId && r.finca === viejo)) r.finca = nuevo; });
    ventas.forEach(v => { if (v.finca === viejo) v.finca = nuevo; }); insumos.forEach(i => { if (i.finca === viejo) i.finca = nuevo; });
  }
  if (tipo === 'lote') {
    const l = lotes.find(z => z.id === id); const fn = l ? nombreFinca(l.fincaId) : '';
    registros.forEach(r => { if (r.loteId === id || (!r.loteId && r.lote === viejo && (!fn || r.finca === fn))) { r.lote = nuevo; r.loteNombre = nuevo; if (!r.loteId) r.loteId = id; } });
    ventas.forEach(v => { if (v.lote === viejo) v.lote = nuevo; }); insumos.forEach(i => { if (i.lote === viejo) i.lote = nuevo; });
  }
  if (tipo === 'bloque') registros.forEach(r => { if (r.bloqueId === id) { r.bloque = nuevo; r.bloqueNombre = nuevo; } });
  if (tipo === 'variedad') registros.forEach(r => { if (r.variedadId === id || (!r.variedadId && r.variedad === viejo)) { r.variedad = nuevo; r.variedadNombre = nuevo; } });
  if (tipo === 'trabajador') registros.forEach(r => { if (r.trabajadorId === id) r.recolector = nuevo; });
}

/* ---------- Ajuste de área ---------- */
const MOTIVOS_AREA = ['Compra o anexión de terreno','Venta o cesión de terreno','Renovación o zoqueo de una parte','Cambio de uso del suelo','Corrección de medición','Otro'];
function abrirAjusteArea(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  const campo = tipo === 'finca' ? 'areaTotal' : 'hectareas'; const actual = n0(x[campo]);
  openModal(`
    <h3>Aumentar o reducir el área · ${esc(x.nombre)}</h3>
    <p class="hint">El área anterior queda registrada con su fecha. Los indicadores por hectárea de periodos pasados se pueden reconstruir desde este historial.</p>
    <div class="fgrid c2">
      <label class="f">Área actual (ha)<input value="${num(actual)}" disabled></label>
      <label class="f">Nueva área (ha)<input id="aa-nueva" type="number" step="0.01" min="0" value="${actual || ''}" oninput="document.getElementById('aa-dif').textContent = difArea(${actual}, this.value)"></label>
      <label class="f">Fecha efectiva<input id="aa-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Motivo<select id="aa-motivo">${MOTIVOS_AREA.map(m=>`<option>${m}</option>`).join('')}</select></label>
    </div>
    <label class="f" style="margin-top:12px;">Observación<input id="aa-obs" placeholder="Ej. Se anexan 0,2 ha compradas al vecino, escritura 1234"></label>
    <p class="hint" style="margin-top:10px;" id="aa-dif"></p>
    ${(x.areaHistorial||[]).length ? `<div class="sec-label">Historial de área</div>${x.areaHistorial.slice().reverse().map(h=>`<div class="kv"><span>${fechaCorta(h.fecha)} ${parseFecha(h.fecha).getUTCFullYear()} · ${esc(h.motivo)}</span><b>${num(h.antes)} → ${num(h.despues)} ha</b></div>`).join('')}` : ''}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarAjusteArea('${tipo}','${id}')">Guardar nueva área</button></div>`);
}
function difArea(antes, nueva) { const d = n0(nueva) - n0(antes); if (!nueva || !d) return ''; return (d > 0 ? 'Aumenta ' : 'Se reduce ') + num(redondear(Math.abs(d), 3)) + ' ha (' + (d > 0 ? '+' : '−') + num(redondear(Math.abs(d) / (n0(antes) || 1) * 100, 1)) + ' %).'; }
function guardarAjusteArea(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  const campo = tipo === 'finca' ? 'areaTotal' : 'hectareas'; const antes = n0(x[campo]);
  const nueva = n0(document.getElementById('aa-nueva').value), fecha = document.getElementById('aa-fecha').value || hoyLocal();
  const motivo = document.getElementById('aa-motivo').value, obs = document.getElementById('aa-obs').value.trim();
  if (nueva <= 0) { alert('La nueva área debe ser mayor que cero. Para dejar de usar el lote, use "Retirar".'); return; }
  if (nueva === antes) { alert('La nueva área es igual a la actual.'); return; }
  (x.areaHistorial = x.areaHistorial || []).push({ fecha, antes, despues:nueva, motivo: motivo + (obs ? ': ' + obs : '') });
  x[campo] = tipo === 'lote' ? String(nueva) : nueva;
  if (tipo === 'lote' && x.diseno) { const g = geomLote(x); if (g) x.densidad = num(Math.round(g.total / g.ha)) + ' plantas/ha'; }
  registrarCambio(tipo, id, x.nombre, nueva > antes ? 'Aumento de área' : 'Reducción de área', num(antes) + ' → ' + num(nueva) + ' ha · ' + motivo + (obs ? ': ' + obs : ''), { fechaEfectiva: fecha });
  closeModal(); guardarEstado(); renderTodo(); toast('Área actualizada: ' + num(antes) + ' → ' + num(nueva) + ' ha');
}

/* ---------- Dividir un lote ---------- */
function otsAbiertasDe(loteIds) { return ordenes.filter(o => loteIds.includes(o.loteId) && !['Cerrada','Cancelada'].includes(o.estado)); }
let divLoteId = null;
function abrirDividirLote(id) {
  const l = lotes.find(x => x.id === id); if (!l || !activo(l)) return; divLoteId = id;
  const ha = n0(l.hectareas);
  openModal(`
    <h3>Dividir el lote ${esc(l.nombre)}</h3>
    <p class="hint">El lote original queda como histórico, con toda su cosecha, labores, muestreos y órdenes. Los lotes nuevos nacen vinculados a él, así la trazabilidad se puede seguir hacia atrás.</p>
    <div class="fgrid c3">
      <label class="f">Número de lotes nuevos<select id="dv-n" onchange="pintarPartes(${ha})">${[2,3,4,5,6].map(n=>`<option>${n}</option>`).join('')}</select></label>
      <label class="f">Fecha efectiva<input id="dv-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Motivo<input id="dv-motivo" placeholder="Ej. Renovación por zoqueo de la mitad"></label>
    </div>
    <div class="sec-label">Lotes resultantes · área original ${ha ? num(ha) + ' ha' : 'sin registrar'}</div>
    <div id="dv-partes"></div>
    <p class="hint" id="dv-suma" style="margin-top:8px;"></p>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:6px;"><input id="dv-diseno" type="checkbox" style="width:auto;" ${l.diseno?'checked':''} ${l.diseno?'':'disabled'}> Copiar el diseño de siembra (distancias, orientación, pendiente) a los lotes nuevos</label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarDivision('${id}')">Dividir lote</button></div>`, true);
  pintarPartes(ha);
}
function pintarPartes(ha) {
  const n = +document.getElementById('dv-n').value; const l = lotes.find(x => x.id === divLoteId);
  const base = l ? l.nombre : 'Lote';
  const previo = [...document.querySelectorAll('#dv-partes .dv-row')].map(r => [r.querySelector('.dv-nom').value, r.querySelector('.dv-ha').value]);
  document.getElementById('dv-partes').innerHTML = Array.from({ length:n }, (_, i) => `<div class="fgrid c2 dv-row" style="margin-bottom:8px;">
    <input class="dv-nom" id="dv-nom-${i}" aria-label="Nombre del lote ${i+1}" value="${esc(previo[i] ? previo[i][0] : base + '-' + String.fromCharCode(65 + i))}">
    <input class="dv-ha" id="dv-ha-${i}" type="number" step="0.01" min="0" aria-label="Hectáreas del lote ${i+1}" placeholder="Hectáreas" value="${previo[i] ? previo[i][1] : (ha ? redondear(ha / n, 3) : '')}" oninput="sumaPartes(${ha})"></div>`).join('');
  sumaPartes(ha);
}
function sumaPartes(ha) {
  const s = [...document.querySelectorAll('#dv-partes .dv-ha')].reduce((a, e) => a + n0(e.value), 0);
  const el = document.getElementById('dv-suma'); if (!el) return;
  el.innerHTML = 'Suma: <b>' + num(redondear(s, 3)) + ' ha</b>' + (ha ? (Math.abs(s - ha) < 0.001 ? ' · coincide con el área original.' : (s < ha ? ' · quedan ' + num(redondear(ha - s, 3)) + ' ha sin asignar (se registrarán como área retirada).' : ' · <span class="neg">supera el área original en ' + num(redondear(s - ha, 3)) + ' ha.</span>')) : '');
}
function confirmarDivision(id) {
  try {
    const l = lotes.find(x => x.id === id); if (!l) return;
    const partes = [...document.querySelectorAll('#dv-partes .dv-row')].map(r => ({ nombre: r.querySelector('.dv-nom').value.trim(), ha: n0(r.querySelector('.dv-ha').value) }));
    const fecha = document.getElementById('dv-fecha').value || hoyLocal(), motivo = document.getElementById('dv-motivo').value.trim();
    const copiar = document.getElementById('dv-diseno').checked; const ha = n0(l.hectareas);
    if (partes.some(p => !p.nombre)) { alert('Ponga nombre a todos los lotes nuevos.'); return; }
    if (new Set(partes.map(p => p.nombre.toLowerCase())).size !== partes.length) { alert('Los lotes nuevos deben tener nombres distintos.'); return; }
    if (partes.some(p => lotes.some(z => activo(z) && z.id !== id && z.fincaId === l.fincaId && z.nombre.toLowerCase() === p.nombre.toLowerCase()))) { alert('Ya existe un lote activo con alguno de esos nombres en la finca.'); return; }
    if (partes.some(p => p.ha <= 0)) { alert('Indique el área de cada lote nuevo.'); return; }
    const suma = partes.reduce((a, p) => a + p.ha, 0);
    if (ha && suma - ha > 0.001) { alert('La suma de las áreas (' + num(redondear(suma,3)) + ' ha) supera el área del lote original (' + num(ha) + ' ha). Use "Aumentar o reducir área" primero si el lote creció.'); return; }
    const abiertas = otsAbiertasDe([id]);
    if (abiertas.length) { alert('El lote tiene ' + abiertas.length + ' orden(es) de trabajo abiertas (' + abiertas.map(o=>o.numero).join(', ') + '). Ciérrelas, cancélelas o cámbieles el lote antes de dividirlo.'); return; }
    const nuevos = partes.map((p, i) => ({ id: uid('l'), fincaId: l.fincaId, nombre: p.nombre, variedadId: l.variedadId, hectareas: String(p.ha), fechaSiembra: l.fechaSiembra, densidad: l.densidad, cedulaCatastral: l.cedulaCatastral, altitud: l.altitud,
      diseno: copiar && l.diseno ? clonar(l.diseno) : undefined, codigo: (l.codigo || codigoLote(l)) + String.fromCharCode(65 + i), origen: [id], vigenteDesde: fecha, areaHistorial: [{ fecha, antes: 0, despues: p.ha, motivo: 'Creado por división de ' + l.nombre }] }));
    nuevos.forEach(n => { if (!n.diseno) delete n.diseno; lotes.push(n); });
    l.estado = 'inactivo'; l.motivoBaja = 'División'; l.vigenteHasta = fecha; l.destino = nuevos.map(n => n.id);
    const resto = ha ? redondear(ha - suma, 3) : 0;
    registrarCambio('lote', id, l.nombre, 'División', 'Dividido en ' + nuevos.map(n => n.nombre + ' (' + num(n.hectareas) + ' ha)').join(', ') + (resto > 0 ? ' · ' + num(resto) + ' ha retiradas' : '') + (motivo ? ' · ' + motivo : ''), { fechaEfectiva: fecha, relacionados: nuevos.map(n => n.id) });
    nuevos.forEach(n => registrarCambio('lote', n.id, n.nombre, 'Creación por división', 'Proviene de ' + l.nombre + ' · ' + num(n.hectareas) + ' ha', { fechaEfectiva: fecha, relacionados: [id] }));
    closeModal(); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo();
    toast(l.nombre + ' dividido en ' + nuevos.length + ' lotes; su historia se conserva');
  } catch (e) { dlog('✗ confirmarDivision: ' + e.message, 'err'); alert('No se pudo dividir el lote. (' + e.message + ')'); }
}

/* ---------- Unificar lotes ---------- */
function toggleLoteSel(id, on) { if (on) loteSel.add(id); else loteSel.delete(id); pintarBarraLotes(); }
function pintarBarraLotes() {
  const b = document.getElementById('lotes-barra'); if (!b) return;
  const n = [...loteSel].filter(id => activo(lotes.find(l => l.id === id))).length;
  b.innerHTML = `<label class="f" style="flex-direction:row;align-items:center;gap:8px;font-weight:600;"><input type="checkbox" style="width:auto;" ${mostrarHistoricos?'checked':''} onchange="mostrarHistoricos=this.checked;renderGestionTablas()"> Mostrar lotes históricos</label>
    <span style="margin-left:auto;display:flex;gap:8px;align-items:center;"><span class="hint" style="margin:0;">${n ? n + ' seleccionado(s)' : 'Marque 2 o más lotes para unificarlos'}</span>
    <button class="btn ghost small" ${n >= 2 ? '' : 'disabled'} onclick="abrirUnificarLotes()">Unificar seleccionados</button></span>`;
}
function abrirUnificarLotes() {
  const sel = lotes.filter(l => loteSel.has(l.id) && activo(l));
  if (sel.length < 2) { alert('Marque al menos dos lotes activos para unificarlos.'); return; }
  const fincasSel = new Set(sel.map(l => l.fincaId));
  if (fincasSel.size > 1) { alert('Solo se pueden unificar lotes de la misma finca. Traslade primero los lotes a la misma finca.'); return; }
  const suma = sel.reduce((a, l) => a + n0(l.hectareas), 0);
  const vars = [...new Set(sel.map(l => l.variedadId || ''))];
  const conDiseno = sel.filter(l => l.diseno);
  openModal(`
    <h3>Unificar ${sel.length} lotes</h3>
    <p class="hint">${sel.map(l => '<b>' + esc(l.nombre) + '</b> (' + (n0(l.hectareas) ? num(l.hectareas) + ' ha' : 'sin área') + ')').join(', ')} pasan a ser históricos con toda su información. El lote nuevo los registra como origen.</p>
    <div class="fgrid c2">
      <label class="f">Nombre del lote unificado<input id="un-nombre" value="${esc(sel.map(l => l.nombre).join(' + '))}"></label>
      <label class="f">Área total (ha)<input id="un-ha" type="number" step="0.01" value="${redondear(suma, 3) || ''}"></label>
      <label class="f">Variedad<select id="un-var"><option value="">${vars.length > 1 ? 'Mixta / sin definir' : 'Sin variedad'}</option>${variedades.map(v => `<option value="${v.id}" ${vars.length === 1 && vars[0] === v.id ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select></label>
      <label class="f">Diseño de siembra<select id="un-dis"><option value="">Definirlo después</option>${conDiseno.map(l => `<option value="${l.id}">Copiar el de ${esc(l.nombre)}</option>`).join('')}</select></label>
      <label class="f">Fecha efectiva<input id="un-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Motivo<input id="un-motivo" placeholder="Ej. Manejo agronómico unificado"></label>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarUnificacion()">Unificar lotes</button></div>`, true);
}
function confirmarUnificacion() {
  try {
    const sel = lotes.filter(l => loteSel.has(l.id) && activo(l)); if (sel.length < 2) return;
    const nombre = document.getElementById('un-nombre').value.trim(), ha = n0(document.getElementById('un-ha').value);
    const fecha = document.getElementById('un-fecha').value || hoyLocal(), motivo = document.getElementById('un-motivo').value.trim();
    const varId = document.getElementById('un-var').value, disId = document.getElementById('un-dis').value;
    if (!nombre) { alert('Ponga nombre al lote unificado.'); return; }
    if (lotes.some(z => activo(z) && !loteSel.has(z.id) && z.fincaId === sel[0].fincaId && z.nombre.toLowerCase() === nombre.toLowerCase())) { alert('Ya existe un lote activo con ese nombre en la finca.'); return; }
    if (ha <= 0) { alert('Indique el área del lote unificado.'); return; }
    const abiertas = otsAbiertasDe(sel.map(l => l.id));
    if (abiertas.length) { alert('Hay órdenes de trabajo abiertas en estos lotes (' + abiertas.map(o => o.numero).join(', ') + '). Ciérrelas o cancélelas antes de unificar.'); return; }
    const base = sel.find(l => l.id === disId);
    const nuevo = { id: uid('l'), fincaId: sel[0].fincaId, nombre, variedadId: varId, hectareas: String(ha), fechaSiembra: sel.map(l => l.fechaSiembra).filter(Boolean).sort()[0] || '', densidad: base ? base.densidad : '', origen: sel.map(l => l.id), vigenteDesde: fecha,
      areaHistorial: [{ fecha, antes: 0, despues: ha, motivo: 'Creado por unificación de ' + sel.map(l => l.nombre).join(', ') }] };
    if (base && base.diseno) nuevo.diseno = clonar(base.diseno);
    lotes.push(nuevo);
    sel.forEach(l => { l.estado = 'inactivo'; l.motivoBaja = 'Unificación'; l.vigenteHasta = fecha; l.destino = [nuevo.id];
      registrarCambio('lote', l.id, l.nombre, 'Unificación', 'Unificado en ' + nombre + (motivo ? ' · ' + motivo : ''), { fechaEfectiva: fecha, relacionados: [nuevo.id] }); });
    registrarCambio('lote', nuevo.id, nombre, 'Creación por unificación', 'Proviene de ' + sel.map(l => l.nombre + ' (' + num(n0(l.hectareas)) + ' ha)').join(', ') + ' · ' + num(ha) + ' ha', { fechaEfectiva: fecha, relacionados: sel.map(l => l.id) });
    loteSel.clear(); closeModal(); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo();
    toast(sel.length + ' lotes unificados en ' + nombre + '; su historia se conserva');
  } catch (e) { dlog('✗ confirmarUnificacion: ' + e.message, 'err'); alert('No se pudo unificar. (' + e.message + ')'); }
}

/* ---------- Trasladar lote, retirar y reactivar ---------- */
function abrirTrasladarLote(id) {
  const l = lotes.find(x => x.id === id); if (!l) return;
  const destinos = fincasActivas().filter(f => f.id !== l.fincaId);
  if (!destinos.length) { alert('No hay otra finca activa a la cual trasladar el lote. Créela primero.'); return; }
  openModal(`<h3>Trasladar ${esc(l.nombre)} a otra finca</h3>
    <p class="hint">La cosecha y las labores ya registradas quedan en ${esc(nombreFinca(l.fincaId))}, donde ocurrieron. Lo que se registre desde la fecha efectiva queda en la finca nueva.</p>
    <div class="fgrid c2"><label class="f">Finca de destino<select id="tr-finca">${destinos.map(f => `<option value="${f.id}">${esc(f.nombre)}</option>`).join('')}</select></label>
    <label class="f">Fecha efectiva<input id="tr-fecha" type="date" value="${hoyLocal()}"></label></div>
    <label class="f" style="margin-top:12px;">Motivo<input id="tr-motivo" placeholder="Ej. Englobe de predios"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarTraslado('${id}')">Trasladar lote</button></div>`);
}
function confirmarTraslado(id) {
  const l = lotes.find(x => x.id === id); if (!l) return;
  const destino = document.getElementById('tr-finca').value, fecha = document.getElementById('tr-fecha').value || hoyLocal(), motivo = document.getElementById('tr-motivo').value.trim();
  trasladarLote(l, destino, fecha, motivo); closeModal(); guardarEstado(); refreshMasterSelects(); renderTodo();
  toast(l.nombre + ' trasladado a ' + nombreFinca(destino));
}
function trasladarLote(l, fincaDestino, fecha, motivo) {
  const antes = l.fincaId; (l.fincasHistorial = l.fincasHistorial || []).push({ fecha, desde: antes, hacia: fincaDestino, motivo });
  l.fincaId = fincaDestino;
  registrarCambio('lote', l.id, l.nombre, 'Traslado de finca', nombreFinca(antes) + ' → ' + nombreFinca(fincaDestino) + (motivo ? ' · ' + motivo : ''), { fechaEfectiva: fecha, relacionados: [antes, fincaDestino] });
}
const MOTIVOS_BAJA = ['Venta del terreno','Cambio de uso del suelo','Abandono','Renovación total','Otro'];
function abrirRetirar(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  if (tipo === 'finca' && lotes.some(l => l.fincaId === id && activo(l))) { alert('La finca tiene lotes activos. Retírelos, trasládelos o unifique la finca antes de retirarla.'); return; }
  if (tipo === 'lote' && otsAbiertasDe([id]).length) { alert('El lote tiene órdenes de trabajo abiertas. Ciérrelas o cancélelas antes de retirarlo.'); return; }
  openModal(`<h3>Retirar ${tipo === 'finca' ? 'la finca' : 'el lote'} ${esc(x.nombre)}</h3>
    <p class="hint">Deja de aparecer para registros nuevos, pero toda su información sigue disponible en los informes y en su historia. Se puede reactivar.</p>
    <div class="fgrid c2"><label class="f">Motivo<select id="rt-motivo">${MOTIVOS_BAJA.map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="f">Fecha efectiva<input id="rt-fecha" type="date" value="${hoyLocal()}"></label></div>
    <label class="f" style="margin-top:12px;">Observación<input id="rt-obs"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarRetiro('${tipo}','${id}')">Retirar</button></div>`);
}
function confirmarRetiro(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  const motivo = document.getElementById('rt-motivo').value, fecha = document.getElementById('rt-fecha').value || hoyLocal(), obs = document.getElementById('rt-obs').value.trim();
  x.estado = 'inactivo'; x.motivoBaja = motivo; x.vigenteHasta = fecha;
  registrarCambio(tipo, id, x.nombre, 'Retiro', motivo + (obs ? ': ' + obs : ''), { fechaEfectiva: fecha });
  loteSel.delete(id); closeModal(); guardarEstado(); refreshMasterSelects(); renderTodo(); toast(x.nombre + ' retirado; su historia se conserva');
}
function reactivar(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  if (x.motivoBaja === 'Unificación' || x.motivoBaja === 'División') { alert('Este ' + tipo + ' fue reemplazado por ' + (x.destino || []).map(d => (lista.find(y => y.id === d) || {}).nombre).join(', ') + '. Para volver atrás, divida o unifique de nuevo; así la historia queda completa.'); return; }
  if (tipo === 'lote' && !activo(fincas.find(f => f.id === x.fincaId))) { alert('La finca de este lote está retirada. Reactive primero la finca o traslade el lote.'); return; }
  delete x.estado; delete x.motivoBaja; delete x.vigenteHasta;
  registrarCambio(tipo, id, x.nombre, 'Reactivación', '', { fechaEfectiva: hoyLocal() });
  guardarEstado(); refreshMasterSelects(); renderTodo(); toast(x.nombre + ' reactivado');
}

/* ---------- Fincas: unificar y separar ---------- */
function abrirUnificarFincas() {
  const act = fincasActivas(); if (act.length < 2) { alert('Se necesitan al menos dos fincas activas para unificar.'); return; }
  openModal(`<h3>Unificar fincas</h3>
    <p class="hint">Las fincas elegidas quedan como históricas. Sus lotes activos pasan a la finca unificada con su historia completa; la cosecha ya registrada sigue figurando en la finca donde ocurrió.</p>
    <div class="sec-label">Fincas a unificar</div>
    ${act.map(f => `<label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" class="uf-chk" value="${f.id}" style="width:auto;" onchange="sugerirFincaUnificada()"> ${esc(f.nombre)} · ${lotes.filter(l => l.fincaId === f.id && activo(l)).length} lote(s)${n0(f.areaTotal) ? ' · ' + num(f.areaTotal) + ' ha' : ''}</label>`).join('')}
    <div class="fgrid c2" style="margin-top:10px;">
      <label class="f">Nombre de la finca unificada<input id="uf-nombre"></label>
      <label class="f">Área total (ha)<input id="uf-ha" type="number" step="0.01"></label>
      <label class="f">Datos catastrales<select id="uf-base"><option value="">Completarlos después</option>${act.map(f => `<option value="${f.id}">Copiar los de ${esc(f.nombre)}</option>`).join('')}</select></label>
      <label class="f">Fecha efectiva<input id="uf-fecha" type="date" value="${hoyLocal()}"></label>
    </div>
    <label class="f" style="margin-top:12px;">Motivo<input id="uf-motivo" placeholder="Ej. Englobe de predios, nueva matrícula"></label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarUnificarFincas()">Unificar fincas</button></div>`, true);
}
function sugerirFincaUnificada() {
  const ids = [...document.querySelectorAll('.uf-chk:checked')].map(c => c.value); const fs = fincas.filter(f => ids.includes(f.id));
  document.getElementById('uf-nombre').value = fs.map(f => f.nombre).join(' + ');
  const s = fs.reduce((a, f) => a + n0(f.areaTotal), 0); document.getElementById('uf-ha').value = s ? redondear(s, 3) : '';
}
function confirmarUnificarFincas() {
  try {
    const ids = [...document.querySelectorAll('.uf-chk:checked')].map(c => c.value); const fs = fincas.filter(f => ids.includes(f.id));
    const nombre = document.getElementById('uf-nombre').value.trim(), ha = n0(document.getElementById('uf-ha').value), fecha = document.getElementById('uf-fecha').value || hoyLocal();
    const motivo = document.getElementById('uf-motivo').value.trim(), baseId = document.getElementById('uf-base').value;
    if (fs.length < 2) { alert('Marque al menos dos fincas.'); return; }
    if (!nombre) { alert('Ponga nombre a la finca unificada.'); return; }
    const base = fincas.find(f => f.id === baseId) || {};
    const nueva = Object.assign({}, ['propietario','vereda','municipio','departamento','altitud','lat','lon'].reduce((o, k) => (base[k] ? (o[k] = base[k], o) : o), {}),
      { id: uid('f'), nombre, areaTotal: ha || '', origen: fs.map(f => f.id), vigenteDesde: fecha, areaHistorial: ha ? [{ fecha, antes: 0, despues: ha, motivo: 'Creada por unificación' }] : [] });
    fincas.push(nueva);
    lotes.filter(l => ids.includes(l.fincaId) && activo(l)).forEach(l => trasladarLote(l, nueva.id, fecha, 'Unificación de fincas'));
    fs.forEach(f => { f.estado = 'inactivo'; f.motivoBaja = 'Unificación'; f.vigenteHasta = fecha; f.destino = [nueva.id];
      registrarCambio('finca', f.id, f.nombre, 'Unificación', 'Unificada en ' + nombre + (motivo ? ' · ' + motivo : ''), { fechaEfectiva: fecha, relacionados: [nueva.id] }); });
    registrarCambio('finca', nueva.id, nombre, 'Creación por unificación', 'Proviene de ' + fs.map(f => f.nombre).join(', '), { fechaEfectiva: fecha, relacionados: ids });
    closeModal(); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo(); toast('Fincas unificadas en ' + nombre);
  } catch (e) { dlog('✗ confirmarUnificarFincas: ' + e.message, 'err'); alert('No se pudo unificar. (' + e.message + ')'); }
}
function abrirSepararFinca(id) {
  const f = fincas.find(x => x.id === id); if (!f) return;
  const ls = lotes.filter(l => l.fincaId === id && activo(l));
  if (ls.length < 1) { alert('La finca no tiene lotes activos para separar.'); return; }
  openModal(`<h3>Separar parte de ${esc(f.nombre)} en una finca nueva</h3>
    <p class="hint">Elija los lotes que pasan a la finca nueva. ${esc(f.nombre)} sigue activa con los demás. La historia de cada lote se conserva y la cosecha pasada sigue en ${esc(f.nombre)}.</p>
    <div class="sec-label">Lotes que se separan</div>
    ${ls.map(l => `<label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" class="sf-chk" value="${l.id}" style="width:auto;" onchange="document.getElementById('sf-ha').value = redondear([...document.querySelectorAll('.sf-chk:checked')].reduce((a,c)=>a+n0((lotes.find(x=>x.id===c.value)||{}).hectareas),0),3)||''"> ${esc(l.nombre)}${n0(l.hectareas) ? ' · ' + num(l.hectareas) + ' ha' : ''}</label>`).join('')}
    <div class="fgrid c2" style="margin-top:10px;">
      <label class="f">Nombre de la finca nueva<input id="sf-nombre"></label>
      <label class="f">Área de la finca nueva (ha)<input id="sf-ha" type="number" step="0.01"></label>
      <label class="f">Fecha efectiva<input id="sf-fecha" type="date" value="${hoyLocal()}"></label>
      <label class="f">Motivo<input id="sf-motivo" placeholder="Ej. Venta parcial, sucesión, nueva matrícula"></label>
    </div>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:10px;"><input id="sf-restar" type="checkbox" style="width:auto;" checked> Restar esa área del área total de ${esc(f.nombre)}</label>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmarSepararFinca('${id}')">Crear finca nueva</button></div>`, true);
}
function confirmarSepararFinca(id) {
  try {
    const f = fincas.find(x => x.id === id); if (!f) return;
    const ids = [...document.querySelectorAll('.sf-chk:checked')].map(c => c.value);
    const nombre = document.getElementById('sf-nombre').value.trim(), ha = n0(document.getElementById('sf-ha').value), fecha = document.getElementById('sf-fecha').value || hoyLocal(), motivo = document.getElementById('sf-motivo').value.trim();
    if (!ids.length) { alert('Marque los lotes que pasan a la finca nueva.'); return; }
    if (!nombre) { alert('Ponga nombre a la finca nueva.'); return; }
    if (fincas.some(x => activo(x) && x.nombre.toLowerCase() === nombre.toLowerCase())) { alert('Ya existe una finca activa con ese nombre.'); return; }
    const nueva = { id: uid('f'), nombre, areaTotal: ha || '', vereda: f.vereda, municipio: f.municipio, departamento: f.departamento, origen: [id], vigenteDesde: fecha, areaHistorial: ha ? [{ fecha, antes: 0, despues: ha, motivo: 'Separada de ' + f.nombre }] : [] };
    fincas.push(nueva); (f.destino = f.destino || []).push(nueva.id);
    lotes.filter(l => ids.includes(l.id)).forEach(l => trasladarLote(l, nueva.id, fecha, 'Separación de finca'));
    if (document.getElementById('sf-restar').checked && ha && n0(f.areaTotal)) { const antes = n0(f.areaTotal), despues = redondear(Math.max(0, antes - ha), 3); (f.areaHistorial = f.areaHistorial || []).push({ fecha, antes, despues, motivo: 'Separación de ' + nombre }); f.areaTotal = despues; }
    registrarCambio('finca', id, f.nombre, 'Separación', 'Se separan ' + ids.length + ' lote(s) en la finca ' + nombre + (motivo ? ' · ' + motivo : ''), { fechaEfectiva: fecha, relacionados: [nueva.id] });
    registrarCambio('finca', nueva.id, nombre, 'Creación por separación', 'Proviene de ' + f.nombre, { fechaEfectiva: fecha, relacionados: [id] });
    closeModal(); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo(); toast('Finca ' + nombre + ' creada con ' + ids.length + ' lote(s)');
  } catch (e) { dlog('✗ confirmarSepararFinca: ' + e.message, 'err'); alert('No se pudo separar. (' + e.message + ')'); }
}

/* ---------- Historia y trazabilidad ---------- */
function resumenLote(id) {
  const regs = registros.filter(r => r.loteId === id);
  return { kg: regs.reduce((a, r) => a + n0(r.kg), 0), dias: new Set(regs.map(r => r.fecha)).size, labores: labores.filter(l => l.loteId === id).reduce((a, l) => a + n0(l.costo), 0),
    ots: ordenes.filter(o => o.loteId === id).length, muestreos: new Set(muestreos.filter(m => m.loteId === id).map(m => m.campanaId || m.fecha)).size,
    benef: beneficios.filter(b => b.loteId === id).reduce((a, b) => a + n0(b.kgSalida), 0) };
}
function verHistoria(tipo, id) {
  const lista = tipo === 'finca' ? fincas : lotes; const x = lista.find(y => y.id === id); if (!x) return;
  const asc = linajeAscendente(id, lista), desc = linajeDescendente(id, lista);
  const eventos = bitacora.filter(b => b.refId === id || (b.relacionados || []).includes(id)).sort((a, b) => (b.hora || b.fecha).localeCompare(a.hora || a.fecha));
  let prod = '';
  if (tipo === 'lote') {
    const filas = [id].concat(asc).map(lid => { const l = lotes.find(z => z.id === lid); const r = resumenLote(lid); return { l, r }; }).filter(o => o.l);
    const tot = filas.reduce((a, o) => ({ kg: a.kg + o.r.kg, lab: a.lab + o.r.labores, ben: a.ben + o.r.benef }), { kg: 0, lab: 0, ben: 0 });
    prod = `<div class="sec-label">Producción y trabajo${asc.length ? ', incluidos los lotes de origen' : ''}</div>
      <div class="tscroll"><table class="dtable" style="min-width:520px;"><thead><tr><th>Lote</th><th>Vigencia</th><th class="num">Cereza (kg)</th><th class="num">Pergamino (kg)</th><th class="num">Labores ($)</th><th class="num">OT</th><th class="num">Muestreos</th></tr></thead>
      <tbody>${filas.map(o => `<tr><td>${esc(o.l.nombre)}${o.l.id === id ? '' : ' <span class="hint" style="margin:0;">origen</span>'}</td><td>${o.l.vigenteDesde ? fechaCorta(o.l.vigenteDesde) : 'inicio'} – ${o.l.vigenteHasta ? fechaCorta(o.l.vigenteHasta) : 'hoy'}</td><td class="num">${num(o.r.kg)}</td><td class="num">${num(o.r.benef)}</td><td class="num">${fmt(o.r.labores)}</td><td class="num">${o.r.ots}</td><td class="num">${o.r.muestreos}</td></tr>`).join('')}</tbody>
      ${filas.length > 1 ? `<tfoot><tr><td colspan="2">Total con historia</td><td class="num">${num(tot.kg)}</td><td class="num">${num(tot.ben)}</td><td class="num">${fmt(tot.lab)}</td><td colspan="2"></td></tr></tfoot>` : ''}</table></div>`;
  } else {
    const ls = lotes.filter(l => l.fincaId === id || (l.fincasHistorial || []).some(h => h.desde === id || h.hacia === id));
    const kg = registros.filter(r => r.fincaId === id || (!r.fincaId && r.finca === x.nombre)).reduce((a, r) => a + n0(r.kg), 0);
    prod = `<div class="sec-label">Lotes que han pertenecido a esta finca</div>${ls.map(l => `<div class="kv"><span>${esc(l.nombre)}${etiquetaEstado(l, 'lote')}</span><b>${n0(l.hectareas) ? num(l.hectareas) + ' ha' : '—'}${l.fincaId !== id ? ' · hoy en ' + esc(nombreFinca(l.fincaId)) : ''}</b></div>`).join('') || '<p class="hint">Sin lotes.</p>'}
      <div class="kv"><span>Cereza registrada en esta finca</span><b>${num(kg)} kg</b></div>`;
  }
  const nom = arr => arr.map(i => (lista.find(z => z.id === i) || {}).nombre).filter(Boolean).map(esc).join(', ');
  openModal(`
    <h3>Historia de ${esc(x.nombre)}</h3>
    <div class="kv"><span>Estado</span><b>${activo(x) ? 'Activo' : etiquetaEstado(x, tipo)}</b></div>
    ${x.vigenteDesde ? `<div class="kv"><span>Vigente desde</span><b>${fechaCorta(x.vigenteDesde)} ${parseFecha(x.vigenteDesde).getUTCFullYear()}</b></div>` : ''}
    ${asc.length ? `<div class="kv"><span>Proviene de</span><b>${nom(asc)}</b></div>` : ''}
    ${desc.length ? `<div class="kv"><span>Continúa en</span><b>${nom(desc)}</b></div>` : ''}
    ${(x.alias || []).length ? `<div class="kv"><span>Nombres anteriores</span><b>${x.alias.map(esc).join(', ')}</b></div>` : ''}
    ${(x.areaHistorial || []).length ? `<div class="sec-label">Área en el tiempo</div>${x.areaHistorial.map(h => `<div class="kv"><span>${fechaCorta(h.fecha)} ${parseFecha(h.fecha).getUTCFullYear()} · ${esc(h.motivo)}</span><b>${num(h.antes)} → ${num(h.despues)} ha</b></div>`).join('')}` : ''}
    ${prod}
    <div class="sec-label">Cambios registrados</div>
    ${eventos.length ? eventos.map(b => `<div class="kv"><span>${fechaCorta(b.fechaEfectiva || b.fecha)} ${parseFecha(b.fechaEfectiva || b.fecha).getUTCFullYear()} · <b style="font-family:var(--f-body);color:var(--text);">${esc(b.accion)}</b>${b.refId !== id ? ' (' + esc(b.nombre) + ')' : ''}<br>${esc(b.detalle)}</span></div>`).join('') : '<p class="hint">Sin cambios registrados desde que se creó.</p>'}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`, true);
}

/* ---------- Acciones por fila ---------- */
function accionesFinca(id) {
  const f = fincas.find(x => x.id === id); if (!f) return;
  const items = [{ ic:'i-orden', t:'Editar datos', s:'Nombre, ubicación, catastro, área', fn:() => editarEntidad('finca', id) }, { ic:'i-analisis', t:'Ver historia', s:'Cambios, lotes y área en el tiempo', fn:() => verHistoria('finca', id) }];
  if (activo(f)) items.push({ ic:'i-finca', t:'Aumentar o reducir área', s:'Con fecha y motivo', fn:() => abrirAjusteArea('finca', id) },
    { ic:'i-mapa', t:'Separar lotes en una finca nueva', s:'Venta parcial, sucesión, nueva matrícula', fn:() => abrirSepararFinca(id) },
    { ic:'i-plan', t:'Unificar con otras fincas', s:'Englobe de predios', fn:abrirUnificarFincas },
    { ic:'i-oper', t:'Retirar finca', s:'Deja de usarse, la historia se conserva', fn:() => abrirRetirar('finca', id) });
  else items.push({ ic:'i-hoy', t:'Reactivar finca', s:'Volver a usarla', fn:() => reactivar('finca', id) });
  if (!tieneHistoria('finca', id)) items.push({ ic:'i-oper', t:'Eliminar', s:'Solo si no tiene ningún dato asociado', fn:() => eliminarFinca(id) });
  hojaAcciones(esc(f.nombre), items);
}
function accionesLote(id) {
  const l = lotes.find(x => x.id === id); if (!l) return;
  const items = [{ ic:'i-orden', t:'Editar datos', s:'Nombre, código, variedad, siembra, área', fn:() => editarEntidad('lote', id) }, { ic:'i-analisis', t:'Ver historia y trazabilidad', s:'Origen, cambios y producción acumulada', fn:() => verHistoria('lote', id) }];
  if (activo(l)) items.push({ ic:'i-finca', t:'Aumentar o reducir área', s:'Con fecha y motivo', fn:() => abrirAjusteArea('lote', id) },
    { ic:'i-mapa', t:'Dividir en varios lotes', s:'El original queda como histórico', fn:() => abrirDividirLote(id) },
    { ic:'i-ir', t:'Trasladar a otra finca', s:'La cosecha pasada queda donde ocurrió', fn:() => abrirTrasladarLote(id) },
    { ic:'i-oper', t:'Retirar lote', s:'Deja de usarse, la historia se conserva', fn:() => abrirRetirar('lote', id) });
  else items.push({ ic:'i-hoy', t:'Reactivar lote', s:'Volver a usarlo', fn:() => reactivar('lote', id) });
  if (!tieneHistoria('lote', id)) items.push({ ic:'i-oper', t:'Eliminar', s:'Solo si no tiene ningún dato asociado', fn:() => eliminarLote(id) });
  hojaAcciones(esc(l.nombre), items);
}
function tieneHistoria(tipo, id) {
  if (tipo === 'finca') return lotes.some(l => l.fincaId === id || (l.fincasHistorial || []).some(h => h.desde === id)) || registros.some(r => r.fincaId === id) || bitacora.some(b => b.refId === id);
  return registros.some(r => r.loteId === id) || bloques.some(b => b.loteId === id) || ordenes.some(o => o.loteId === id) || muestreos.some(m => m.loteId === id) || labores.some(x => x.loteId === id) || beneficios.some(x => x.loteId === id) || (lotes.find(l => l.id === id) || {}).origen || bitacora.some(b => b.refId === id && b.accion !== 'Creación');
}

/* ---------- Tablas de Gestión ---------- */
function renderGestionTablas() {
  const fs = fincas.filter(f => mostrarHistoricos || activo(f));
  document.getElementById('fincas-barra').innerHTML = `<label class="f" style="flex-direction:row;align-items:center;gap:8px;font-weight:600;"><input type="checkbox" style="width:auto;" ${mostrarHistoricos?'checked':''} onchange="mostrarHistoricos=this.checked;renderGestionTablas()"> Mostrar fincas históricas</label>
    <button class="btn ghost small" style="margin-left:auto;" ${fincasActivas().length >= 2 ? '' : 'disabled'} onclick="abrirUnificarFincas()">Unificar fincas</button>`;
  document.getElementById('tabla-fincas').innerHTML = `<thead><tr><th>Nombre</th><th>Ubicación</th><th class="num">Área total</th><th class="num">Lotes activos</th><th>Matrícula</th><th></th></tr></thead>
    <tbody>${fs.map(f => `<tr style="${activo(f) ? '' : 'opacity:.7'}"><td><b style="color:var(--text);font-weight:650;">${esc(f.nombre)}</b>${etiquetaEstado(f, 'finca')}${f.propietario ? '<br><span style="color:var(--text-faint);font-size:11.5px;">' + esc(f.propietario) + '</span>' : ''}</td><td>${esc([f.vereda, f.municipio, f.departamento].filter(Boolean).join(', ') || '—')}</td><td class="num">${f.areaTotal ? num(f.areaTotal) + ' ha' : '—'}</td><td class="num">${lotes.filter(l => l.fincaId === f.id && activo(l)).length}</td><td>${esc(f.matricula || '—')}</td>
      <td class="actions"><button class="btn ghost small" onclick="editarEntidad('finca','${f.id}')">Editar</button> <button class="btn ghost small" onclick="accionesFinca('${f.id}')" aria-label="Más acciones">Más…</button></td></tr>`).join('') || '<tr><td colspan="6" style="color:var(--text-faint);">Sin fincas aún</td></tr>'}</tbody>`;

  const ls = lotes.filter(l => mostrarHistoricos || activo(l));
  pintarBarraLotes();
  document.getElementById('tabla-lotes').innerHTML = `<thead><tr><th style="width:28px;"></th><th>Lote</th><th>Finca</th><th>Variedad</th><th class="num">Hectáreas</th><th>Siembra</th><th>Densidad</th><th></th></tr></thead>
    <tbody>${ls.map(l => `<tr style="${activo(l) ? '' : 'opacity:.7'}"><td>${activo(l) ? `<input type="checkbox" style="width:auto;" aria-label="Seleccionar ${esc(l.nombre)}" ${loteSel.has(l.id) ? 'checked' : ''} onchange="toggleLoteSel('${l.id}',this.checked)">` : ''}</td>
      <td><b style="color:var(--text);font-weight:650;">${esc(l.nombre)}</b> <span class="mono" style="font-size:11px;color:var(--text-faint);">${esc(l.codigo || codigoLote(l))}</span>${etiquetaEstado(l, 'lote')}${(l.origen || []).length ? '<br><span style="color:var(--text-faint);font-size:11.5px;">Proviene de ' + esc(l.origen.map(o => nombreLote(o)).join(', ')) + '</span>' : ''}</td>
      <td>${esc(nombreFinca(l.fincaId))}</td><td>${esc(nombreVariedad(l.variedadId))}</td><td class="num">${n0(l.hectareas) ? num(l.hectareas) : '—'}</td><td>${l.fechaSiembra ? fechaCorta(l.fechaSiembra) + ' ' + parseFecha(l.fechaSiembra).getUTCFullYear() : '—'}</td><td>${esc(l.densidad || '—')}</td>
      <td class="actions"><button class="btn ghost small" onclick="editarEntidad('lote','${l.id}')">Editar</button> <button class="btn ghost small" onclick="accionesLote('${l.id}')" aria-label="Más acciones">Más…</button></td></tr>`).join('') || '<tr><td colspan="8" style="color:var(--text-faint);">Sin lotes aún</td></tr>'}</tbody>`;

  document.getElementById('tabla-bloques').innerHTML = `<thead><tr><th>Bloque</th><th>Lote</th><th></th></tr></thead>
    <tbody>${bloques.map(b => `<tr><td>${esc(b.nombre)}</td><td>${esc(nombreLote(b.loteId))}</td><td class="actions"><button class="btn ghost small" onclick="editarEntidad('bloque','${b.id}')">Editar</button> <button class="btn danger-ghost" onclick="eliminarBloque('${b.id}')">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--text-faint);">Sin bloques aún</td></tr>'}</tbody>`;
  document.getElementById('tabla-variedades').innerHTML = `<thead><tr><th>Variedad</th><th class="num">Lotes</th><th></th></tr></thead>
    <tbody>${variedades.map(v => `<tr><td>${esc(v.nombre)}</td><td class="num">${lotes.filter(l => l.variedadId === v.id && activo(l)).length}</td><td class="actions"><button class="btn ghost small" onclick="editarEntidad('variedad','${v.id}')">Editar</button> <button class="btn danger-ghost" onclick="eliminarVariedad('${v.id}')">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--text-faint);">Sin variedades aún</td></tr>'}</tbody>`;
  renderBitacora();
}
function renderBitacora() {
  const host = document.getElementById('tabla-bitacora'); if (!host) return;
  const fe = document.getElementById('bt-filtro'); const f = fe ? fe.value : 'todas';
  const ent = { finca:'Finca', lote:'Lote', bloque:'Bloque', variedad:'Variedad', trabajador:'Recolector', empleado:'Empleado', activo:'Activo' };
  const lista = bitacora.filter(b => f === 'todas' || b.entidad === f).sort((a, b) => (b.hora || b.fecha).localeCompare(a.hora || a.fecha));
  host.innerHTML = `<thead><tr><th>Registrado</th><th>Fecha efectiva</th><th>Tipo</th><th>Nombre</th><th>Acción</th><th>Detalle</th></tr></thead>
    <tbody>${lista.map(b => `<tr><td class="mono" style="font-size:12px;">${esc(b.hora || b.fecha)}</td><td>${fechaCorta(b.fechaEfectiva || b.fecha)}</td><td>${ent[b.entidad] || esc(b.entidad)}</td><td>${esc(b.nombre)}</td><td><b style="color:var(--text);font-weight:600;">${esc(b.accion)}</b></td><td style="min-width:240px;">${esc(b.detalle)}</td></tr>`).join('') || '<tr><td colspan="6" style="color:var(--text-faint);">Aún no hay cambios registrados. Cada edición, división, unificación o ajuste de área aparecerá aquí.</td></tr>'}</tbody>`;
}
