/* ================= v22 · Fase A — trazabilidad rigurosa: códigos legibles con dígito verificador, pases como entidad ================= */
/* Toma como referencia el «Sistema de trazabilidad v13» (Excel) y corrige sus límites: los códigos se guardan con historial
   (no se recalculan en silencio), los pases tienen estado, y cada eslabón (pesada → bache → lote comercial → venta → asientos) se puede consultar en ambos sentidos. */

/* ---------- Persistencia: pases en el documento comercial ---------- */
let pases = [];
const _estadoActual21 = estadoActual;
estadoActual = function () { const e = _estadoActual21(); e.pases = pases; return e; };
const _aplicarComercial21 = aplicarComercial;
aplicarComercial = function (d) { _aplicarComercial21(d); pases = clonar((d || {}).pases || []); };
const _dividirEstado21 = dividirEstado;
dividirEstado = function (est) { const docs = _dividirEstado21(est); docs[DOC_COMERCIAL].pases = est.pases || []; return docs; };

/* ---------- Normas de los códigos ---------- */
const STOP_SIGLA = new Set(['FINCA', 'HACIENDA', 'PREDIO', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y']);
const STOP_NOMBRE = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y']);
function palabras22(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); }
/* Sigla de 4 letras: una palabra → sus 4 primeras letras; dos o más → inicial de la primera + 3 letras de la última (sin «Finca», «de», «el»…) */
function siglaBase(nombre) { const w = palabras22(nombre).filter(x => !STOP_SIGLA.has(x)); if (!w.length) return 'FNCA'; const s = w.length === 1 ? w[0] : w[0][0] + w[w.length - 1].slice(0, 3); return (s + 'XXXX').slice(0, 4); }
function siglaFinca(f) { if (!f) return 'FNCA'; if (f.sigla) return f.sigla; const base = siglaBase(f.nombre); const otras = fincas.filter(x => x.id !== f.id && x.sigla).map(x => x.sigla); let s = base, n = 2; while (otras.includes(s)) s = base + n++; return s; }
function siglaDeLote(loteId) { const l = lotes.find(x => x.id === loteId); return siglaFinca(fincas.find(f => f.id === (l && l.fincaId)) || fincas[0]); }
/* Código corto del lote: «Lote 3» → L03 · «Lote 3A» → L3A · otro nombre → su código (p. ej. LOT01) */
function codLoteCorto(l) { if (!l) return 'L00'; if (l.codigo) return codigoLote(l); const n = String(l.nombre || ''); let m = n.match(/^\s*lote\s*(\d+)\s*$/i); if (m) return 'L' + m[1].padStart(2, '0'); m = n.match(/^\s*lote\s*(\d+)\s*([a-z])\s*$/i); if (m) return 'L' + m[1] + m[2].toUpperCase(); return codigoLote(l); }
/* Persona: iniciales de nombres y apellidos + 2 últimos dígitos de la cédula (sin cédula → 00, con alerta) */
function docPersona(t) { if (!t) return ''; if (t.documento) return t.documento; const e = t.empleadoId && empleados.find(x => x.id === t.empleadoId); return (e && (e.cedula || e.documento)) || ''; }
function codPersonaBase(t) { const w = palabras22(t && t.nombre).filter(x => !STOP_NOMBRE.has(x) && /^[A-Z]/.test(x)); const ini = (w.map(x => x[0]).join('') || 'X').slice(0, 4); const d = String(docPersona(t)).replace(/\D/g, ''); return ini + (d.length >= 2 ? d.slice(-2) : '00'); }
function codPersona(t) { if (!t) return 'X00'; if (t.codigo) return t.codigo; const base = codPersonaBase(t); const usados = trabajadores.filter(x => x.id !== t.id && x.codigo).map(x => x.codigo); let s = base, i = 0; while (usados.includes(s)) s = base + 'BCDEFGHJK'[i++]; return s; }
function codPersonaDeId(id) { return codPersona(trabajadores.find(t => t.id === id)); }
/* Dígito verificador módulo 11 con los pesos de la DIAN, sobre los dígitos del código */
const PESOS_DIAN = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
function dv11(s) { const d = String(s).replace(/\D/g, '').split('').reverse(); let t = 0; d.forEach((c, i) => { t += Number(c) * PESOS_DIAN[i % 15]; }); const r = t % 11; return r > 1 ? 11 - r : r; }
function conDV(cuerpo) { return cuerpo + '-' + dv11(cuerpo); }
function codigoConDV(c) { const m = String(c || '').trim().toUpperCase().match(/^(.*)-(\d)$/); return !!m && dv11(m[1]) === Number(m[2]); }
/* Cosecha: año + P (principal) o M (mitaca) */
function codCosecha(anio, tipo) { return String(anio || hoyLocal().slice(0, 4)).slice(2, 4) + (tipo === 'Secundaria' ? 'M' : 'P'); }
function cosechaDeRegistro(r) { return codCosecha(r.anio || String(r.fecha).slice(0, 4), r.tipo || 'Principal'); }
function cosechaPorFecha(f) { const m = Number(String(f || hoyLocal()).slice(5, 7)); const cos = Object.assign({ principal: [9, 10, 11, 12], mitaca: [4, 5, 6] }, (climaConfig && climaConfig.cosecha) || {}); return codCosecha(String(f || hoyLocal()).slice(0, 4), (cos.mitaca || []).includes(m) ? 'Secundaria' : 'Principal'); }

/* ---------- Pases: uno por cosecha y número; guardan clase, estado y notas ---------- */
const CLASES_PASE = ['Graneo', 'Pase', 'Repase', 'Re-re'];
function clavePase(r) { return (r.anio || String(r.fecha).slice(0, 4)) + '|' + (r.tipo || 'Principal') + '|' + (r.pasada || 1); }
function asegurarPases() {
  registros.forEach(r => { const k = clavePase(r); let p = pases.find(x => x.clave === k);
    if (!p) { const [a, t, n] = k.split('|'); p = { id: uid('ps'), clave: k, anio: Number(a), tipo: t, numero: Number(n), codigo: codCosecha(a, t) + '-P' + String(n).padStart(2, '0'), clase: Number(n) === 1 ? 'Graneo' : 'Pase', estado: 'Abierto', creado: ahoraISO() }; pases.push(p); }
    if (r.paseId !== p.id) r.paseId = p.id; });
}
function paseDe(r) { return pases.find(p => p.clave === clavePase(r)) || null; }
function regsDePase(p) { return registros.filter(r => clavePase(r) === p.clave); }
function resumenPase(p) { const rs = regsDePase(p); const fs = [...new Set(rs.map(r => r.fecha))].sort(); const kg = rs.reduce((s, r) => s + n0(r.kg), 0), h = rs.reduce((s, r) => s + n0(r.horas), 0), v = rs.reduce((s, r) => s + pagoRegistro(r), 0), c = rs.reduce((s, r) => s + costoRegistro(r), 0);
  const lotesP = [...new Set(rs.map(r => r.loteId || r.lote))]; const bens = [...new Set(rs.map(r => r.beneficioId).filter(Boolean))].map(id => beneficios.find(b => b.id === id)).filter(Boolean);
  return { rs, fechas: fs, ini: fs[0], fin: fs[fs.length - 1], dias: fs.length, kg, horas: h, valor: v, costo: c, personas: new Set(rs.map(r => r.trabajadorId)).size, lotes: lotesP, kgh: h ? kg / h : null, pk: kg ? c / kg : null, sinBen: rs.filter(r => !r.beneficioId).reduce((s, r) => s + n0(r.kg), 0), sinPago: rs.filter(r => modalidadDe(r) !== 'nomina' && !pagoDeRegistro(r)).length, bens }; }
let _diasPase = null; /* caché de fechas por pase durante asegurarCodigos */
function diaDelPase(r) { const k = clavePase(r); const fs = _diasPase ? _diasPase.get(k) : [...new Set(registros.filter(x => clavePase(x) === k).map(x => x.fecha))].sort(); return Math.max(1, (fs || []).indexOf(r.fecha) + 1); }

/* ---------- Código de cada eslabón ---------- */
function cuerpoPesada(r) { const l = lotes.find(x => x.id === r.loteId); const t = trabajadores.find(x => x.id === r.trabajadorId);
  return siglaDeLote(r.loteId) + '-' + cosechaDeRegistro(r) + '-P' + String(r.pasada || 1).padStart(2, '0') + '-D' + String(diaDelPase(r)).padStart(2, '0') + '-' + codLoteCorto(l) + '-' + codPersona(t); }
function codigoPesada(r) { return r.codigo || conDV(cuerpoPesada(r)); }
/* Consecutivo: el mayor número ya usado con ese prefijo + 1 (nunca se reutiliza un número) */
function siguienteNum(lista, pref, excluir) { let m = 0; lista.forEach(x => { if (excluir && x.id === excluir) return; const c = String(x.codigo || ''); if (c.indexOf(pref) !== 0) return; const n = parseInt(c.slice(pref.length), 10); if (n > m) m = n; }); return m + 1; }
function cosechaDeBache(b) { return b.tipo ? codCosecha(String(b.fecha).slice(0, 4), b.tipo) : cosechaPorFecha(b.fecha); }
function codigoBache(b) { if (b.codigo) return b.codigo; const pref = siglaDeLote(b.loteId) + '-' + cosechaDeBache(b) + '-B'; return conDV(pref + String(siguienteNum(beneficios, pref, b.id)).padStart(2, '0')); }
function cosechaDePartida(p) { const bs = (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean); return bs[0] ? cosechaDeBache(bs[0]) : cosechaPorFecha(p.fecha); }
function nuevoCodigoLC(p) { const bs = (p.beneficioIds || []).map(id => beneficios.find(b => b.id === id)).filter(Boolean); const sig = bs[0] ? siglaDeLote(bs[0].loteId) : siglaFinca(fincas.find(f => f.id === p.fincaId) || fincas[0]);
  const pref = sig + '-' + cosechaDePartida(p) + '-' + (p.clase === 'Microlote' ? 'ML' : 'LC'); return conDV(pref + String(siguienteNum(partidas, pref, p.id)).padStart(2, '0')); }
siguienteCodigoPartida = function (fecha, p) { return nuevoCodigoLC(Object.assign({ fecha: fecha || hoyLocal(), beneficioIds: [] }, p || {})); };
function codigoVenta(v) { if (v.codigo) return v.codigo; const o = (v.partidas || []).map(x => partidas.find(p => p.id === x.partidaId)).filter(Boolean)[0]; const s0 = o && /^[A-Z]{4}\d?-/.test(String(o.codigo || '')) ? String(o.codigo).split('-')[0] : null; const sig = s0 || siglaFinca(fincas.find(f => f.id === v.fincaId) || fincas[0]);
  const pref = sig + '-V' + String(v.fecha || hoyLocal()).slice(2, 4) + '-'; return conDV(pref + String(siguienteNum(ventas, pref, v.id)).padStart(3, '0')); }
trazaCodigo = function (v) { return codigoVenta(v); };
function codigoLiquidacion(p) { if (p.codigo) return p.codigo; const t = trabajadores.find(x => x.id === p.trabajadorId); const sig = (() => { const r = registros.find(x => (p.registroIds || []).includes(x.id)); return r ? siglaDeLote(r.loteId) : siglaFinca(fincas[0]); })();
  const k = p.tipoLiq === 'Retiro' ? 'R' : p.tipoLiq === 'Pase' ? 'P' : 'S'; let c = sig + '-LQ-' + k + String(p.semana || p.fecha || hoyLocal()).replace(/-/g, '').slice(2) + '-' + codPersona(t); let i = 1; const base = c; while (pagos.some(x => x.id !== p.id && x.codigo === c)) c = base + '-' + (++i); return c; }
function codigoMovimiento(m) { if (m.codigo) return m.codigo; const pref = 'MOV-' + String(m.fecha || hoyLocal()).slice(2, 4) + '-'; return pref + String(siguienteNum(adelantos, pref, m.id)).padStart(4, '0'); }

/* Asigna los códigos que falten y, si un dato que forma el código cambió (fecha, lote, pase o persona), lo actualiza dejando el código anterior en el historial.
   También liga a su bache las pesadas de los beneficios anteriores a v21 (que se atribuían por fechas), para que la cadena quede exacta y guardada. */
function asegurarCodigos() {
  fincas.forEach(f => { if (!f.sigla) f.sigla = siglaFinca(f); });
  trabajadores.slice().sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach(t => { if (!t.codigo) t.codigo = codPersona(t); });
  asegurarPases();
  beneficios.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.id).localeCompare(String(b.id))).forEach(b => {
    if (!(b.registroIds && b.registroIds.length) && !registros.some(r => r.beneficioId === b.id)) { const rs = _registrosDeBeneficio21(b).filter(r => !r.beneficioId); if (rs.length) { b.registroIds = rs.map(r => r.id); b.ligadoPorFechas = true; rs.forEach(r => { r.beneficioId = b.id; }); } } });
  _diasPase = new Map(); registros.forEach(r => { const k = clavePase(r); if (!_diasPase.has(k)) _diasPase.set(k, new Set()); _diasPase.get(k).add(r.fecha); }); _diasPase.forEach((v, k) => _diasPase.set(k, [...v].sort()));
  try {
    const vistos = new Set();
    registros.slice().sort((a, b) => String(a.creado || a.fecha).localeCompare(String(b.creado || b.fecha)) || String(a.id).localeCompare(String(b.id))).forEach(r => {
      const cu = cuerpoPesada(r); let c = conDV(cu); let i = 0; while (vistos.has(c)) { i++; c = conDV(cu + 'ABCDEFGHJK'[i - 1]); } vistos.add(c);
      if (r.codigo && r.codigo !== c) { r.codigosAnteriores = (r.codigosAnteriores || []).concat([r.codigo]).slice(-6); }
      r.codigo = c; });
  } finally { _diasPase = null; }
  beneficios.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.id).localeCompare(String(b.id))).forEach(b => { if (!b.codigo) b.codigo = codigoBache(b); });
  partidas.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).forEach(p => { if (!p.codigo) p.codigo = nuevoCodigoLC(p); });
  ventas.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.id).localeCompare(String(b.id))).forEach(v => { if (!v.codigo) v.codigo = codigoVenta(v); });
  pagos.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).forEach(p => { if (!p.codigo) p.codigo = codigoLiquidacion(p); });
  adelantos.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).forEach(m => { if (!m.codigo) m.codigo = codigoMovimiento(m); });
}
/* Los códigos se aseguran al abrir la cosecha o la parte comercial, y antes de cada guardado */
function codigosAlDia() { try { asegurarCodigos(); } catch (e) { dlog('✗ códigos: ' + e.message, 'err'); } }
const _guardarEstado21 = guardarEstado;
guardarEstado = function () { try { asegurarCodigos(); } catch (e) { dlog('✗ códigos: ' + e.message, 'err'); } return _guardarEstado21.apply(this, arguments); };

/* El beneficio conoce exactamente qué pesadas entraron (v21); los anteriores siguen con la regla por fechas */
const _registrosDeBeneficio21 = registrosDeBeneficio;
registrosDeBeneficio = function (b) { if (b && Array.isArray(b.registroIds) && b.registroIds.length) return registros.filter(r => b.registroIds.includes(r.id) || r.beneficioId === b.id); const ligados = registros.filter(r => r.beneficioId === b.id); return ligados.length ? ligados : _registrosDeBeneficio21(b); };

/* Etiqueta visual de un código (monoespaciado, con verificación del dígito) */
function chipCod(c, extra) { if (!c) return '—'; return `<span class="cod22 ${codigoConDV(c) ? '' : 'sin-dv'}" title="${esc(c)}${codigoConDV(c) ? ' · dígito verificador correcto' : ''}" onclick="event.stopPropagation();abrirTraza22('${esc(c)}')">${esc(c)}</span>${extra || ''}`; }
