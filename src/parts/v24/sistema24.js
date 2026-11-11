/* ================= v24 · Robustez: cierre de periodos con bloqueo real, respaldos verificables, auditoría de integridad y control de almacenamiento ================= */

/* ---------- 1 · Cierre de periodos: lo que pertenece a un mes cerrado no se puede crear, cambiar ni borrar ---------- */
const CAMPOS_CIERRE = { registros: ['fecha', 'kg', 'horas', 'trabajadorId', 'loteId', 'modalidad', 'tarifa', 'valorJornal', 'alim', 'alimValor', 'tipo'], labores: ['fecha', 'costo', 'manoObra', 'insumosCosto', 'loteId', 'tipo'],
  ventas: ['fecha', 'kg', 'precio', 'retencion', 'descuentos', 'bonificacion', 'terceroId'], pagos: ['fecha', 'valorBruto', 'valorNeto', 'anticipos', 'cuota', 'descuentos', 'bonificacion', 'medio', 'trabajadorId'],
  adelantos: ['fecha', 'valor', 'tipo', 'trabajadorId', 'medio'], beneficios: ['fecha', 'kgEntrada', 'kgSalida', 'loteId'], movimientos: ['fecha', 'valor', 'tipo', 'cuenta', 'medio', 'intereses', 'lineas'], insumos: ['fecha', 'costo'] };
const LISTAS_CIERRE = { registros: [() => registros, v => { registros = v; }], labores: [() => labores, v => { labores = v; }], ventas: [() => ventas, v => { ventas = v; }], pagos: [() => pagos, v => { pagos = v; }], adelantos: [() => adelantos, v => { adelantos = v; }], beneficios: [() => beneficios, v => { beneficios = v; }], movimientos: [() => movimientos, v => { movimientos = v; }], insumos: [() => insumos, v => { insumos = v; }] };
function cierreHasta() { return ((contaConfig || {}).cierre || {}).hasta || ''; }
function finCierre() { const h = cierreHasta(); return h ? finDeMes(h) : ''; }
function fechaCerrada(f) { const L = finCierre(); return !!L && !!f && String(f).slice(0, 10) <= L; }
const firmaCierre = (k, x) => JSON.stringify(CAMPOS_CIERRE[k].map(c => x[c] == null ? null : x[c])) + (k === 'ventas' ? JSON.stringify((x.cobros || []).filter(c => fechaCerrada(c.fecha)).map(c => [c.fecha, n0(c.valor)])) : '') + (k === 'movimientos' ? JSON.stringify((x.pagos || []).filter(c => fechaCerrada(c.fecha)).map(c => [c.fecha, n0(c.valor)])) : '');
let _base24 = null;
function tomarBase24() { _base24 = {}; Object.keys(LISTAS_CIERRE).forEach(k => { const m = new Map(); LISTAS_CIERRE[k][0]().forEach(x => m.set(x.id, clonar(x))); _base24[k] = m; }); }
/* Compara con lo último guardado: si algo de un mes cerrado cambió, lo devuelve a como estaba */
function verificarCierre24() {
  const L = finCierre(); if (!L || !_base24) return [];
  const viol = [];
  Object.keys(LISTAS_CIERRE).forEach(k => { const [get, set] = LISTAS_CIERRE[k]; const base = _base24[k] || new Map(); let arr = get().slice(); let cambio = false; const ids = new Set(arr.map(x => x.id));
    arr = arr.map(x => { const b = base.get(x.id); const cerradoAhora = fechaCerrada(x.fecha), cerradoAntes = b && fechaCerrada(b.fecha);
      if (!b) { if (cerradoAhora) { viol.push({ k, t: 'creado', x }); cambio = true; return null; } return x; }
      if ((cerradoAhora || cerradoAntes) && firmaCierre(k, x) !== firmaCierre(k, b)) { viol.push({ k, t: 'modificado', x }); cambio = true; return Object.assign(clonar(b), { codigo: x.codigo || b.codigo }); }
      return x; }).filter(Boolean);
    base.forEach((b, id) => { if (!ids.has(id) && fechaCerrada(b.fecha)) { viol.push({ k, t: 'eliminado', x: b }); arr.push(clonar(b)); cambio = true; } });
    if (cambio) set(arr); });
  return viol;
}
const _guardarEstado22 = guardarEstado;
guardarEstado = function () {
  try { const v = verificarCierre24(); if (v.length) { const meses = [...new Set(v.map(x => String(x.x.fecha || '').slice(0, 7)))].join(', ');
      toast('El periodo hasta ' + mesLargo24(cierreHasta()) + ' está cerrado: se revirtieron ' + v.length + ' cambio(s) (' + meses + '). Reabra el periodo con su motivo si necesita corregir.', 'err');
      registrarCambio('cierre', 'bloqueo', 'Cierre de periodo', 'Cambio bloqueado', v.map(x => x.k + ' ' + x.t + ' ' + (x.x.fecha || '')).slice(0, 8).join(' · '));
      setTimeout(() => { try { renderTodo(); } catch (e) {} }, 0); } } catch (e) { dlog('✗ cierre: ' + e.message, 'err'); }
  const p = _guardarEstado22.apply(this, arguments); tomarBase24(); return p;
};
const _recordarEscrito21 = recordarEscrito; recordarEscrito = function () { _recordarEscrito21.apply(this, arguments); tomarBase24(); };
function mesLargo24(m) { if (!m) return '—'; return ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(m.slice(5, 7)) - 1] + ' de ' + m.slice(0, 4); }
/* Revisión previa al cierre de un mes */
function prechequeoCierre(mes) { const ini = mes + '-01', fin = finDeMes(mes); const P = [];
  const sinPago = registros.filter(r => r.fecha >= ini && r.fecha <= fin && modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)); if (sinPago.length) P.push(['medio', sinPago.length + ' pesada(s) del mes sin pagar: se podrán pagar después, pero quedarán como cuenta por pagar.']);
  const ab = ordenes.filter(o => o.fechaProgramada >= ini && o.fechaProgramada <= fin && !['Cerrada', 'Cancelada'].includes(o.estado)); if (ab.length) P.push(['medio', ab.length + ' orden(es) de trabajo del mes sin cerrar: su costo no entrará al mes.']);
  const desc = libroDiario().asientos.filter(a => a.fecha >= ini && a.fecha <= fin && Math.abs(a.lineas.reduce((s, l) => s + l.debe - l.haber, 0)) > 1); if (desc.length) P.push(['mal', desc.length + ' asiento(s) descuadrados en el mes.']);
  const bens = beneficios.filter(b => b.fecha >= ini && b.fecha <= fin && !n0(b.kgSalida)); if (bens.length) P.push(['medio', bens.length + ' bache(s) del mes aún sin kilos de pergamino.']);
  const vsl = ventas.filter(v => v.fecha >= ini && v.fecha <= fin && !(v.partidas || []).length); if (vsl.length) P.push(['medio', vsl.length + ' venta(s) del mes sin lote comercial.']);
  return P; }
function abrirCierre24() { const h = cierreHasta(); const sig = h ? isoFecha(new Date(Date.UTC(Number(h.slice(0, 4)), Number(h.slice(5, 7)), 1))).slice(0, 7) : sumarDias(hoyLocal().slice(0, 7) + '-01', -1).slice(0, 7); const P = prechequeoCierre(sig); const hist = ((contaConfig || {}).cierre || {}).historial || [];
  openModal(`<h3>Cierre de periodos</h3><p class="hint">Cerrar un mes congela su contabilidad: cosecha, pagos, ventas, labores, beneficios y movimientos con fecha de ese mes o anterior ya no se pueden crear, cambiar ni borrar. Así los informes ya entregados no cambian. Se puede reabrir con un motivo, que queda en el historial.</p>
    <div class="budget-box"><div><div class="n">${h ? mesLargo24(h) : 'ninguno'}</div><div class="l">Cerrado hasta</div></div><div class="total"><div class="n">${mesLargo24(sig)}</div><div class="l">Siguiente por cerrar</div></div></div>
    <div class="sec-label">Revisión antes de cerrar ${mesLargo24(sig)}</div>${P.length ? P.map(([t, m]) => `<div class="fl-sug ${t === 'mal' ? 'alerta' : ''}" style="margin-bottom:6px"><b>${t === 'mal' ? 'Corrija antes de cerrar' : 'Revise'}</b><span>${esc(m)}</span></div>`).join('') : '<div class="fl-sug"><b>Todo en orden</b><span>No hay pendientes en el mes.</span></div>'}
    ${hist.length ? `<div class="sec-label">Historial</div><div class="fl-tl">${hist.slice().reverse().slice(0, 12).map(x => `<div><time>${esc(x.fecha)}</time><span><b>${esc(x.accion)}</b> · ${esc(mesLargo24(x.hasta))}${x.motivo ? ' · ' + esc(x.motivo) : ''}</span></div>`).join('')}</div>` : ''}
    <label class="f" id="ci24-mw" style="margin-top:10px">Motivo (obligatorio para reabrir)<input id="ci24-m"></label>
    <div class="modal-actions">${h ? `<button class="btn danger-ghost" onclick="reabrirCierre24()">Reabrir ${mesLargo24(h)}</button>` : ''}<button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="cerrarMes24('${sig}')" ${sig > hoyLocal().slice(0, 7) || P.some(p => p[0] === 'mal') ? 'disabled' : ''}>Cerrar ${mesLargo24(sig)}</button></div>`, true); }
function cerrarMes24(mes) { if (prechequeoCierre(mes).some(p => p[0] === 'mal')) { toast('Hay asientos descuadrados en el mes.', 'err'); return; } guardarEstado(); const c = Object.assign({ historial: [] }, (contaConfig || {}).cierre || {}); c.hasta = mes; c.historial = (c.historial || []).concat([{ fecha: ahoraISO(), accion: 'Cierre', hasta: mes }]);
  contaConfig = Object.assign({}, contaConfig, { cierre: c }); registrarCambio('cierre', mes, 'Cierre de ' + mesLargo24(mes), 'Cierre', 'Periodo cerrado hasta ' + mes); guardarEstado(); closeModal(); renderTodo(); toast(mesLargo24(mes) + ' cerrado', 'ok'); }
function reabrirCierre24() { const m = document.getElementById('ci24-m').value.trim(); if (!m) { toast('Escriba el motivo para reabrir.', 'err'); return; } const c = Object.assign({ historial: [] }, (contaConfig || {}).cierre || {}); const ant = c.hasta;
  const d = parseFecha(ant + '-01'); d.setUTCMonth(d.getUTCMonth() - 1); c.hasta = isoFecha(d).slice(0, 7); c.historial = (c.historial || []).concat([{ fecha: ahoraISO(), accion: 'Reapertura', hasta: ant, motivo: m }]);
  contaConfig = Object.assign({}, contaConfig, { cierre: c }); registrarCambio('cierre', ant, 'Reapertura de ' + mesLargo24(ant), 'Reapertura', 'Motivo: ' + m); guardarEstado(); closeModal(); renderTodo(); toast(mesLargo24(ant) + ' reabierto', 'ok'); }

/* ---------- 2 · Respaldos: archivo completo con huella SHA-256 y restauración verificada ---------- */
/* SHA-256 en JavaScript puro (respaldo si el navegador no ofrece crypto.subtle) */
function sha256js(str) { const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const u = unescape(encodeURIComponent(str)); const b = new Uint8Array(u.length); for (let i = 0; i < u.length; i++) b[i] = u.charCodeAt(i); const l = b.length; const n = ((l + 9 + 63) >> 6) << 6; const m = new Uint8Array(n); m.set(b); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const w = new Uint32Array(64); const r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) { for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4); for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let [a, bb, c, d, e, f, g, h] = H; for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
    H = H.map((x, i) => (x + [a, bb, c, d, e, f, g, h][i]) >>> 0); }
  return H.map(x => x.toString(16).padStart(8, '0')).join(''); }
async function huella24(txt) { try { if (window.crypto && crypto.subtle && typeof TextEncoder !== 'undefined') { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } } catch (e) {} return sha256js(txt); }
function leerArchivoTexto(f) { if (f.text) return f.text(); return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => mal(r.error); r.readAsText(f); }); }
function conteoEstado(d) { return { registros: (d.registros || []).length, ventas: (d.ventas || []).length, beneficios: (d.beneficios || []).length, pagos: (d.pagos || []).length, labores: (d.labores || []).length, movimientos: (d.movimientos || []).length, lotes: (d.lotes || []).length, trabajadores: (d.trabajadores || []).length, ordenes: (d.ordenes || []).length, bitacora: (d.bitacora || []).length }; }
async function exportarRespaldo24(silencioso) {
  const datos = clonar(estadoActual()); const txt = JSON.stringify(datos); const h = await huella24(txt);
  const paquete = { app: 'State Origen', version: APP_VERSION, creado: ahoraISO(), finca: (fincasActivas()[0] || {}).nombre || '', conteo: conteoEstado(datos), sha256: h, datos };
  ofrecerDescarga(nombreArchivo('respaldo-state-origen').replace(/\.pdf$/, '.json'), new Blob([JSON.stringify(paquete)], { type: 'application/json' }));
  contaConfig = Object.assign({}, contaConfig, { ultimoRespaldo: { fecha: ahoraISO(), sha256: h, conteo: paquete.conteo } }); if (!silencioso) { registrarCambio('respaldo', 'export', 'Respaldo', 'Exportación', 'SHA-256 ' + h.slice(0, 16) + '…'); guardarEstado(); toast('Respaldo descargado · huella ' + h.slice(0, 12), 'ok'); } return paquete;
}
function abrirRestaurar24() { openModal(`<h3>Restaurar un respaldo</h3><p class="hint">Reemplaza TODOS los datos actuales por los del archivo. Antes de restaurar, la app descarga un respaldo de lo que hay ahora. Se verifica la huella del archivo para asegurar que no fue alterado.</p>
    <label class="f">Archivo de respaldo (.json)<input id="rs-f" type="file" accept=".json,application/json" onchange="leerRespaldo24(this)"></label><div id="rs-info" style="margin-top:10px"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger-ghost" id="rs-ok" disabled onclick="confirmarRestaurar24()">Restaurar</button></div>`); }
let _resp24 = null;
async function leerRespaldo24(inp) { const f = inp.files && inp.files[0]; const info = document.getElementById('rs-info'); _resp24 = null; document.getElementById('rs-ok').disabled = true; if (!f) return;
  try { const p = JSON.parse(await leerArchivoTexto(f)); if (p.app !== 'State Origen' || !p.datos) throw new Error('no es un respaldo de State Origen'); const h = await huella24(JSON.stringify(p.datos)); const ok = h === p.sha256; const c = conteoEstado(p.datos), a = conteoEstado(estadoActual());
    info.innerHTML = `<div class="fl-sug ${ok ? '' : 'alerta'}"><b>${ok ? 'Huella verificada' : 'La huella no coincide: el archivo fue modificado'}</b><span>Respaldo del ${esc(String(p.creado).slice(0, 16).replace('T', ' '))} · versión ${esc(p.version)} · ${esc(p.finca || '')}</span></div>
      <table class="dtable" style="margin-top:8px"><thead><tr><th>Datos</th><th class="num">En el respaldo</th><th class="num">Ahora</th></tr></thead><tbody>${Object.keys(c).map(k => `<tr><td>${k}</td><td class="num">${c[k]}</td><td class="num">${a[k]}</td></tr>`).join('')}</tbody></table>
      <label class="f" style="margin-top:10px">Escriba RESTAURAR para confirmar<input id="rs-conf" oninput="document.getElementById('rs-ok').disabled=this.value.trim().toUpperCase()!=='RESTAURAR'"></label>`; _resp24 = ok ? p : null; if (!ok) info.insertAdjacentHTML('beforeend', '<p class="hint" style="color:var(--danger)">Por seguridad no se restaura un archivo alterado.</p>'); }
  catch (e) { info.innerHTML = '<div class="fl-sug alerta"><b>No se pudo leer</b><span>' + esc(e.message) + '</span></div>'; } }
async function confirmarRestaurar24() { if (!_resp24) return; const previo = await exportarRespaldo24(true); const p = _resp24; aplicarEstado(p.datos); contaConfig = Object.assign({}, contaConfig, { ultimoRespaldo: { fecha: previo.creado, sha256: previo.sha256, conteo: previo.conteo } });
  if (typeof aplicarAgro === 'function') aplicarAgro(p.datos); _base24 = null; registrarCambio('respaldo', 'restaurar', 'Respaldo', 'Restauración', 'Desde respaldo del ' + p.creado + ' · SHA-256 ' + p.sha256.slice(0, 16) + '…'); await _guardarEstado22(); tomarBase24(); closeModal(); renderTodo(); toast('Respaldo restaurado', 'ok'); }

/* ---------- 3 · Almacenamiento: tamaño de cada documento frente al límite de 256 KiB ---------- */
function usoAlmacen24() { const docs = dividirEstado(estadoActual()); return Object.keys(docs).map(k => ({ k, b: new Blob([JSON.stringify(docs[k])]).size })).sort((a, b) => b.b - a.b); }

/* ---------- 4 · Auditoría de integridad: revisa la coherencia de todo el sistema ---------- */
function auditoria24() {
  const A = []; const add = (sev, area, msg, fn, n) => A.push({ sev, area, msg, fn: fn || '', n: n == null ? 1 : n }); const hoy = hoyLocal();
  const idsLote = new Set(lotes.map(l => l.id)), idsT = new Set(trabajadores.map(t => t.id));
  // Cosecha
  const sinLote = registros.filter(r => !idsLote.has(r.loteId)); if (sinLote.length) add('mal', 'Cosecha', sinLote.length + ' pesada(s) con un lote que no existe.', "ir('panel')", sinLote.length);
  const sinP = registros.filter(r => !idsT.has(r.trabajadorId)); if (sinP.length) add('mal', 'Cosecha', sinP.length + ' pesada(s) de una persona que ya no existe.', "ir('panel')", sinP.length);
  const futuras = registros.filter(r => r.fecha > hoy); if (futuras.length) add('mal', 'Cosecha', futuras.length + ' pesada(s) con fecha futura.', "ir('panel')", futuras.length);
  const raras = registros.filter(r => n0(r.kg) <= 0 || n0(r.kg) > 300 || (n0(r.horas) > 0 && n0(r.kg) / n0(r.horas) > 40)); if (raras.length) add('medio', 'Cosecha', raras.length + ' pesada(s) con kilos fuera de lo normal (0, más de 300 kg o más de 40 kg/h).', "ir('panel')", raras.length);
  const dup = new Map(); registros.forEach(r => { const k = [r.fecha, r.trabajadorId, r.loteId, r.kg].join('|'); dup.set(k, (dup.get(k) || 0) + 1); }); const nd = [...dup.values()].filter(v => v > 1).length; if (nd) add('medio', 'Cosecha', nd + ' posible(s) registro(s) duplicado(s): misma persona, fecha, lote y kilos.', "ir('panel')", nd);
  const sinTar = registros.filter(r => modalidadDe(r) === 'kilo' && !n0(tarifaDe(r))); if (sinTar.length) add('mal', 'Cosecha', sinTar.length + ' pesada(s) por kilo sin valor del kilo: no generan pago.', "ir('panel')", sinTar.length);
  const viejas = registros.filter(r => modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r) && r.fecha < sumarDias(hoy, -21)); if (viejas.length) add('medio', 'Personal', viejas.length + ' pesada(s) con más de 3 semanas sin pagar.', "csSt.tab='liquidacion';ir('panel')", viejas.length);
  const sinBen = registros.filter(r => !r.beneficioId && r.fecha < sumarDias(hoy, -20)); if (sinBen.length) add('medio', 'Trazabilidad', num(Math.round(sinBen.reduce((s, r) => s + n0(r.kg), 0))) + ' kg de cereza con más de 20 días sin bache: la trazabilidad de esas ventas no es exacta.', "csSt.tab='beneficio';ir('panel')", sinBen.length);
  const carRec = registros.filter(r => { const c = typeof enCarencia === 'function' && enCarencia(r.loteId, r.fecha); return c && c.lb.fecha < r.fecha; }); if (carRec.length) add('mal', 'Inocuidad', carRec.length + ' pesada(s) recolectadas dentro del periodo de carencia de un producto aplicado.', "cpSt.tab='labores';ir('campo')", carRec.length);
  pases.filter(p => p.estado !== 'Cerrado').forEach(p => { const x = resumenPase(p); if (x.fin && x.fin < sumarDias(hoy, -30)) add('info', 'Cosecha', 'El pase ' + p.codigo + ' sigue abierto y su último registro es del ' + fechaCorta(x.fin) + '.', "csSt.tab='pases';ir('panel')"); });
  // Pagos y movimientos
  pagos.forEach(p => { const faltan = (p.registroIds || []).filter(id => !registros.some(r => r.id === id)); if (faltan.length) add('mal', 'Personal', 'El pago ' + (p.codigo || p.fecha) + ' incluye ' + faltan.length + ' pesada(s) que ya no existen.', "ir('personal')"); });
  const ant = adelantos.filter(a => !a.aplicado && tipoMov(a) === 'Anticipo' && a.fecha && a.fecha < sumarDias(hoy, -60)); if (ant.length) add('medio', 'Personal', ant.length + ' anticipo(s) con más de 60 días sin descontar.', "ir('personal')", ant.length);
  const sinCed = trabajadores.filter(t => !docPersona(t)); if (sinCed.length) add('info', 'Personal', sinCed.length + ' persona(s) sin cédula (' + sinCed.slice(0, 4).map(t => t.nombre).join(', ') + (sinCed.length > 4 ? '…' : '') + '): su código usa 00.', "ir('personal')", sinCed.length);
  // Beneficio, lotes comerciales y ventas
  beneficios.forEach(b => { const x = infoBache(b); if (!x.rs.length) add('medio', 'Trazabilidad', 'El bache ' + (b.codigo || b.fecha) + ' no tiene pesadas ligadas.', "csSt.tab='beneficio';ir('panel')"); if (x.factor && (x.factor < 4.2 || x.factor > 6)) add('medio', 'Calidad', 'El bache ' + (b.codigo || '') + ' tiene un factor de ' + num(redondear(x.factor, 2)) + ' (lo usual: 4,8 a 5,4).', `editarBache22('${b.id}')`);
    if (!n0(b.kgSalida) && b.fecha < sumarDias(hoy, -25)) add('medio', 'Beneficio', 'El bache ' + (b.codigo || '') + ' lleva más de 25 días sin kilos de pergamino.', `editarBache22('${b.id}')`); if (x.hum.c === 'mal') add('medio', 'Calidad', 'El bache ' + (b.codigo || '') + ' quedó húmedo (' + num(b.humedad) + ' %): riesgo de moho y castigo en el precio.', `editarBache22('${b.id}')`); });
  partidas.forEach(p => { if (!(p.beneficioIds || []).length) add('mal', 'Trazabilidad', 'El lote comercial ' + p.codigo + ' no tiene baches.', "coSt.tab='partidas';ir('comercial')"); if (vendidoDePartida(p.id) > kgPartida(p) + 0.5) add('mal', 'Inventario', 'El lote comercial ' + p.codigo + ' tiene más kilos vendidos que su pergamino.', `abrirTraza22('${esc(p.codigo)}')`); });
  ventas.filter(v => !(v.partidas || []).length).forEach(v => add('medio', 'Trazabilidad', 'La venta ' + codigoVenta(v) + ' no tiene lote comercial: su origen es estimado.', `abrirVenta('${v.id}')`));
  const prod = beneficios.reduce((s, b) => s + n0(b.kgSalida), 0), vend = ventas.reduce((s, v) => s + n0(v.kg), 0); if (vend > prod + 0.5 && beneficios.length) add('mal', 'Inventario', 'Se ha vendido más pergamino (' + num(Math.round(vend)) + ' kg) del producido (' + num(Math.round(prod)) + ' kg).', "ir('comercial')");
  ventas.filter(v => saldoVenta(v) > 0.5 && v.vence && v.vence < hoy).forEach(v => add('mal', 'Cartera', 'La venta ' + codigoVenta(v) + ' tiene ' + fmt(saldoVenta(v)) + ' vencidos desde el ' + fechaCorta(v.vence) + '.', `abrirCobro('${v.id}')`));
  // Contabilidad y finanzas
  try { const L = libroDiario(); const des = L.asientos.filter(a => Math.abs(a.lineas.reduce((s, l) => s + l.debe - l.haber, 0)) > 1); if (des.length) add('mal', 'Contabilidad', des.length + ' asiento(s) descuadrados.', "finSt.tab='libros';ir('finanzas')", des.length); } catch (e) { add('mal', 'Contabilidad', 'No se pudo generar el libro diario: ' + e.message, "ir('finanzas')"); }
  (typeof creditos !== 'undefined' ? creditos : []).forEach(c => { const e = estadoCredito(c); if (e.vencidas.length) add('mal', 'Créditos', c.codigo + ' (' + c.entidad + ') tiene ' + e.vencidas.length + ' cuota(s) vencida(s).', `finSt.tab='creditos';ir('finanzas');verCredito24('${c.id}')`); else if (e.prox && e.prox.fecha <= sumarDias(hoy, 10)) add('info', 'Créditos', 'Cuota de ' + fmt(e.prox.cuota) + ' de ' + c.codigo + ' vence el ' + fechaCorta(e.prox.fecha) + '.', `finSt.tab='creditos';ir('finanzas')`); });
  const h = cierreHasta(); const mesAnt = sumarDias(hoy.slice(0, 7) + '-01', -1).slice(0, 7); if (Number(hoy.slice(8, 10)) > 10 && (!h || h < mesAnt) && (registros.length || ventas.length)) add('info', 'Contabilidad', 'El mes de ' + mesLargo24(mesAnt) + ' aún no está cerrado.', 'abrirCierre24()');
  // Finca, lotes y campo
  lotesActivos().forEach(l => { if (!n0(l.hectareas)) add('medio', 'Finca', l.nombre + ' no tiene hectáreas.', "ir('gestion');showSub('lotes')"); if (!l.diseno) add('info', 'Finca', l.nombre + ' no tiene diseño de siembra: sin él no hay códigos de planta ni censo.', "ir('mapa')"); const c = typeof censoLote === 'function' ? censoLote(l) : null; if (c && c.pctFalla > 5) add('medio', 'Campo', l.nombre + ' tiene ' + num(redondear(c.pctFalla, 1)) + ' % de plantas faltantes.', "cpSt.tab='censo';ir('campo')"); });
  fincasActivas().forEach(f => { const s = lotes.filter(l => l.fincaId === f.id && activo(l)).reduce((a, l) => a + n0(l.hectareas), 0); if (n0(f.areaTotal) && s > n0(f.areaTotal) * 1.02) add('medio', 'Finca', 'Los lotes de ' + f.nombre + ' suman ' + num(redondear(s, 2)) + ' ha, más que el área total del predio (' + num(f.areaTotal) + ' ha).', "ir('gestion')"); });
  ordenes.filter(o => o.estado === 'Por aprobar' && (o.real || {}).fecha < sumarDias(hoy, -7)).forEach(o => add('medio', 'Operación', o.numero + ' lleva más de 7 días por aprobar.', `verOT('${o.id}')`));
  /* Las órdenes vencidas las reporta el centro de alertas de operación */
  // Sistema
  usoAlmacen24().forEach(d => { if (d.b > 256 * 1024 * 0.7) add(d.b > 256 * 1024 * 0.9 ? 'mal' : 'medio', 'Sistema', 'El documento ' + d.k + ' ocupa ' + num(Math.round(d.b / 1024)) + ' KiB de 256 KiB.', 'abrirSistema24()'); });
  const ur = (contaConfig || {}).ultimoRespaldo; if ((registros.length + ventas.length) > 0 && (!ur || ur.fecha.slice(0, 10) < sumarDias(hoy, -30))) add('medio', 'Sistema', ur ? 'El último respaldo es del ' + fechaCorta(ur.fecha.slice(0, 10)) + ': descargue uno nuevo.' : 'Aún no ha descargado ningún respaldo de sus datos.', 'exportarRespaldo24()');
  const peso = { mal: 3, medio: 1.5, info: 0.4 }; const pen = A.reduce((s, x) => s + peso[x.sev], 0);
  return { items: A.sort((a, b) => peso[b.sev] - peso[a.sev]), indice: Math.max(0, Math.round(100 - pen * 2.5)) };
}
