/* ================= v26 · Fase F — de la finca a la taza: catación, trilla, tostión, empaque, inventario, pedidos, cafetería y exportación, con costos encadenados, contabilidad y trazabilidad hasta la planta ================= */
const DOC_TAZA = 'datos/taza', COL_PED = 'pedidos', COL_POS = 'pos';
const LLAVES_TAZA = ['cataciones', 'trillas', 'perfiles', 'tostiones', 'skus', 'lotesPT', 'ajustesPT', 'menu', 'negocios', 'tazaConfig'];
const TZ = { cataciones: [], trillas: [], perfiles: [], tostiones: [], skus: [], lotesPT: [], ajustesPT: [], menu: [], negocios: [], tazaConfig: {}, pedidos: [], pos: [] };
let _tazaCargada = false, _tazaPedida = false;
const _estadoActual25 = estadoActual; estadoActual = function () { const e = _estadoActual25(); Object.keys(TZ).forEach(k => { e[k] = TZ[k]; }); return e; };
function aplicarTaza(d) { d = clonar(d || {}); LLAVES_TAZA.forEach(k => { TZ[k] = k === 'tazaConfig' ? (d[k] || {}) : (Array.isArray(d[k]) ? d[k] : []); }); }
const _aplicarEstado25 = aplicarEstado; aplicarEstado = function (d) { _aplicarEstado25(d); if (d && LLAVES_TAZA.concat(['pedidos', 'pos']).some(k => d[k] != null)) { aplicarTaza(d); TZ.pedidos = clonar(d.pedidos || []); TZ.pos = clonar(d.pos || []); _tazaCargada = true; } };
const porMes26 = (arr, col, docs) => { const m = {}; arr.forEach(x => { const k = String(x.fecha || 'sin-fecha').slice(0, 7); (m[k] = m[k] || []).push(x); }); Object.keys(m).forEach(k => { docs[col + '/' + k] = { items: m[k] }; }); Object.keys(_ultimoEscrito || {}).forEach(p => { if (p.indexOf(col + '/') === 0 && !(p in docs)) docs[p] = { items: [] }; }); };
const _dividirEstado25 = dividirEstado; dividirEstado = function (est) { const docs = _dividirEstado25(est); if (_tazaCargada || !dbNS) { const o = {}; LLAVES_TAZA.forEach(k => { o[k] = est[k] || (k === 'tazaConfig' ? {} : []); }); docs[DOC_TAZA] = o; porMes26(est.pedidos || [], COL_PED, docs); porMes26(est.pos || [], COL_POS, docs); } return docs; };
const _recordarEscrito25 = recordarEscrito; recordarEscrito = function () { _recordarEscrito25.apply(this, arguments); if (dbNS && !_tazaPedida) { _tazaPedida = true; cargarTaza26(); } };
async function cargarTaza26() { try { const [s, pe, po] = await Promise.all([dbNS.doc(DOC_TAZA).get(), dbNS.collection(COL_PED).get(), dbNS.collection(COL_POS).get()]);
    aplicarTaza(s.exists ? s.data() : {}); const items = q => { const L = []; q.docs.forEach(x => { const b = x.data(); if (b && Array.isArray(b.items)) clonar(b.items).forEach(i => L.push(i)); _ultimoEscrito[(x.ref && x.ref.path) || (x.id && x.id.indexOf('/') > 0 ? x.id : '')] = JSON.stringify(b); }); return L; };
    TZ.pedidos = items(pe); TZ.pos = items(po); _tazaCargada = true; _ultimoEscrito[DOC_TAZA] = JSON.stringify(s.exists ? s.data() : {}); Object.keys(_ultimoEscrito).forEach(k => { if (!k) delete _ultimoEscrito[k]; });
    const mes = (col, arr) => { const m = {}; arr.forEach(x => { const k = String(x.fecha || 'sin-fecha').slice(0, 7); (m[k] = m[k] || []).push(x); }); Object.keys(m).forEach(k => { _ultimoEscrito[col + '/' + k] = JSON.stringify({ items: m[k] }); }); }; mes(COL_PED, TZ.pedidos); mes(COL_POS, TZ.pos);
    _versionDatos++; try { if (vistaActual === 'taza') renderTaza(); if (vistaActual === 'mando') renderMando(); } catch (e) {} } catch (e) { _tazaPedida = false; dlog('✗ taza: ' + e.message, 'err'); } }

/* ---------- Cuentas nuevas del plan ---------- */
[['1435', 'Café verde (excelso)', 'A'], ['1440', 'Café tostado', 'A'], ['1445', 'Producto terminado empacado', 'A'], ['1460', 'Insumos de cafetería', 'A'], ['2408', 'IVA e impuestos al consumo por pagar', 'P'],
  ['4120', 'Ventas de café tostado y empacado', 'I'], ['4125', 'Ventas de café verde (exportación)', 'I'], ['4140', 'Ventas de cafetería', 'I'], ['5295', 'Comisiones de canales y pasarelas', 'G'], ['6120', 'Costo del café procesado vendido', 'C'], ['6125', 'Costo del café verde vendido', 'C'], ['6140', 'Costo de ventas de cafetería', 'C']].forEach(c => { if (!PUC.some(x => x[0] === c[0])) PUC.push(c); });

/* ---------- Configuración ---------- */
const CANALES = [['POS', 'Punto de venta (cafetería)'], ['WEB', 'Tienda web propia'], ['MKP', 'Marketplace'], ['RED', 'Redes sociales y WhatsApp'], ['B2B', 'Empresas y regalos'], ['HOR', 'HORECA (cafés, hoteles, restaurantes)'], ['EXP', 'Exportación']];
function cfgTaza() { return Object.assign({ comisiones: { WEB: 3.5, MKP: 15, RED: 0, B2B: 0, HOR: 0, POS: 0, EXP: 0 }, ivaProducto: 0, impoconsumo: 0, trm: 4000, mermaObjetivo: 15 }, TZ.tazaConfig || {}); }
const nomCanal = k => (CANALES.find(c => c[0] === k) || [k, k])[1];

/* ---------- Costos encadenados (a costo promedio del pergamino de la contabilidad) ---------- */
let _costoTrilla26 = {}, _enLibro26 = false, _cpLibro26 = 0;
const _libroDiario25 = libroDiario;
libroDiario = function () { if (_enLibro26) return { costoProm: _cpLibro26, asientos: [], costeo: [] }; _enLibro26 = true; try { return _libroDiario25.apply(this, arguments); } finally { _enLibro26 = false; } };
function ld26() { try { return libroDiario(); } catch (e) { return { costoProm: 0 }; } }
/* Se ejecuta dentro del libro diario, mes a mes: la trilla saca el pergamino de la bodega a su costo promedio del momento */
function trillaMes26(m, invKg, invVal, costoProm, asiento) { TZ.trillas.filter(t => String(t.fecha).slice(0, 7) === m).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(t => { const kg = n0(t.kgCPS); const c = Math.min(invVal, kg * costoProm); _costoTrilla26[t.id] = c; invKg = Math.max(0, invKg - kg); invVal = Math.max(0, invVal - c);
    if (c > 0.5) asiento(t.fecha, 'Trilla', 'Pergamino a trilla · ' + (t.codigo || '') + ' · ' + num(redondear(kg, 1)) + ' kg', [['1435', c, 0], ['1430', 0, c]], { ref: t.id, cierre: true }); }); return { invKg, invVal }; }
function costoCPSTrilla(t) { ld26(); return _costoTrilla26[t.id] != null ? _costoTrilla26[t.id] : n0(t.kgCPS) * n0(ld26().costoProm); }
function infoTrilla(t) { const cps = costoCPSTrilla(t); const tot = cps + n0(t.maquila); const ex = n0(t.kgExcelso); const tost = TZ.tostiones.filter(s => s.trillaId === t.id).reduce((s, x) => s + n0(x.kgVerde), 0); const vend = TZ.negocios.filter(n => n.trillaId === t.id && n.estado === 'Cerrado').reduce((s, n) => s + n0(n.kg), 0);
  const merma = Math.max(0, n0(t.kgCPS) - ex - n0(t.kgPasilla)); return { cps, total: tot, kgVerdeCosto: ex ? tot / ex : 0, factorReal: ex ? n0(t.kgCPS) / ex * 70 : null, rendimiento: n0(t.kgCPS) ? ex / n0(t.kgCPS) * 100 : null, merma, disp: Math.max(0, ex - tost - vend), usado: tost + vend }; }
function infoTostion(s) { const t = TZ.trillas.find(x => x.id === s.trillaId); const ct = t ? infoTrilla(t).kgVerdeCosto : 0; const costoVerde = n0(s.kgVerde) * ct; const tot = costoVerde + n0(s.costoProceso); const merma = n0(s.kgVerde) ? (1 - n0(s.kgTostado) / n0(s.kgVerde)) * 100 : null;
  const perfil = TZ.perfiles.find(p => p.id === s.perfilId); const emp = TZ.lotesPT.filter(p => p.tostionId === s.id).reduce((a, p) => a + kgDeLotePT(p), 0); const bar = TZ.pos.filter(p => p.tostionId === s.id).reduce((a, p) => a + kgCafePOS(p), 0);
  return { costoVerde, total: tot, kgTostCosto: n0(s.kgTostado) ? tot / n0(s.kgTostado) : 0, merma, delta: merma != null && perfil && perfil.mermaObjetivo ? merma - n0(perfil.mermaObjetivo) : null, perfil, empacado: emp, barra: bar, disp: Math.max(0, n0(s.kgTostado) - emp - bar), trilla: t }; }
function skuDe(id) { return TZ.skus.find(s => s.id === id) || null; }
function kgDeLotePT(p) { const s = skuDe(p.skuId); return s ? n0(p.unidades) * n0(s.gramos) / 1000 : 0; }
function infoLotePT(p) { const s = skuDe(p.skuId) || {}; const t = TZ.tostiones.find(x => x.id === p.tostionId); const ckg = t ? infoTostion(t).kgTostCosto : 0; const cafe = kgDeLotePT(p) * ckg, emp = n0(p.unidades) * n0(s.costoEmpaque); const tot = cafe + emp;
  const vend = TZ.pedidos.filter(o => o.estado !== 'Anulado').flatMap(o => o.lineas || []).filter(l => l.lotePTId === p.id).reduce((a, l) => a + n0(l.unidades), 0); const aj = TZ.ajustesPT.filter(a => a.lotePTId === p.id).reduce((a, x) => a + n0(x.unidades), 0);
  const vence = s.vidaUtil ? sumarDias(p.fecha, n0(s.vidaUtil)) : null; return { sku: s, cafe, emp, total: tot, unit: n0(p.unidades) ? tot / n0(p.unidades) : 0, vendidas: vend, ajustes: aj, existencia: n0(p.unidades) - vend - aj, vence, tostion: t }; }
function kgCafePOS(v) { const it = TZ.menu.find(m => m.id === v.itemId); return it ? n0(v.unidades) * n0(it.gramosCafe) / 1000 : 0; }
function costoPOS(v) { const it = TZ.menu.find(m => m.id === v.itemId) || {}; const t = TZ.tostiones.find(x => x.id === v.tostionId); const ckg = t ? infoTostion(t).kgTostCosto : 0; return { cafe: kgCafePOS(v) * ckg, otros: n0(v.unidades) * n0(it.otrosCosto), get total() { return this.cafe + this.otros; } }; }
function valorPedido(o) { const L = (o.lineas || []).map(l => { const s = skuDe(l.skuId) || {}; const p = TZ.lotesPT.find(x => x.id === l.lotePTId); const bruto = n0(l.unidades) * n0(l.precio != null && l.precio !== '' ? l.precio : s.precio); const costo = p ? n0(l.unidades) * infoLotePT(p).unit : 0; return { l, s, bruto, costo }; });
  const bruto = L.reduce((a, x) => a + x.bruto, 0); const desc = bruto * n0(o.descuento) / 100; const neto = bruto - desc; const iva = neto * n0(o.iva) / 100; const com = neto * n0(o.comision) / 100; const costo = L.reduce((a, x) => a + x.costo, 0);
  return { L, bruto, desc, neto, iva, total: neto + iva, com, flete: n0(o.flete), costo, margen: neto - com - n0(o.flete) - costo, margenPct: neto ? (neto - com - n0(o.flete) - costo) / neto * 100 : null, unidades: L.reduce((a, x) => a + n0(x.l.unidades), 0) }; }
function valorPOS(v) { const it = TZ.menu.find(m => m.id === v.itemId) || {}; const total = n0(v.unidades) * n0(v.precio != null ? v.precio : it.precio); const imp = n0(it.impuesto); const neto = total / (1 + imp / 100); const c = costoPOS(v); return { total, neto, imp: total - neto, costo: c.total, cafe: c.cafe, margen: neto - c.total }; }
function escandallo(it) { const t = TZ.tostiones.filter(s => infoTostion(s).disp > 0).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] || TZ.tostiones[0]; const ckg = t ? infoTostion(t).kgTostCosto : 0; const cafe = n0(it.gramosCafe) / 1000 * ckg; const costo = cafe + n0(it.otrosCosto);
  const neto = n0(it.precio) / (1 + n0(it.impuesto) / 100); return { cafe, costo, neto, foodCost: neto ? costo / neto * 100 : null, margen: neto - costo }; }

/* ---------- Asientos contables de toda la cadena industrial y comercial ---------- */
function asientosTaza26(asiento) {
  TZ.trillas.forEach(t => { if (n0(t.maquila)) asiento(t.fecha, 'Trilla', 'Maquila de trilla · ' + (t.codigo || ''), [['1435', n0(t.maquila), 0], [CTA_MEDIO[t.medio] || '1105', 0, n0(t.maquila)]], { ref: t.id }); });
  TZ.tostiones.forEach(s => { const x = infoTostion(s); if (x.costoVerde > 0.5) asiento(s.fecha, 'Tostión', 'Café verde a tostión · ' + (s.codigo || ''), [['1440', x.costoVerde, 0], ['1435', 0, x.costoVerde]], { ref: s.id });
    if (n0(s.costoProceso)) asiento(s.fecha, 'Tostión', 'Costo de proceso de tostión · ' + (s.codigo || ''), [['1440', n0(s.costoProceso), 0], [CTA_MEDIO[s.medio] || '1105', 0, n0(s.costoProceso)]], { ref: s.id }); });
  TZ.lotesPT.forEach(p => { const x = infoLotePT(p); if (x.cafe > 0.5) asiento(p.fecha, 'Empaque', 'Café tostado a empaque · ' + (p.codigo || ''), [['1445', x.cafe, 0], ['1440', 0, x.cafe]], { ref: p.id }); if (x.emp > 0.5) asiento(p.fecha, 'Empaque', 'Material de empaque · ' + (p.codigo || ''), [['1445', x.emp, 0], [CTA_MEDIO[p.medio] || '1105', 0, x.emp]], { ref: p.id }); });
  TZ.ajustesPT.forEach(a => { const p = TZ.lotesPT.find(x => x.id === a.lotePTId); if (!p) return; const c = n0(a.unidades) * infoLotePT(p).unit; if (c > 0.5) asiento(a.fecha, 'Ajuste de inventario', a.tipo + ' · ' + (p.codigo || ''), [['5195', c, 0], ['1445', 0, c]], { ref: a.id }); });
  TZ.pedidos.filter(o => o.estado !== 'Anulado').forEach(o => { const v = valorPedido(o); const ter = o.terceroId; const ing = o.canal === 'EXP' ? '4125' : '4120';
    asiento(o.fecha, 'Venta de producto', 'Pedido ' + (o.codigo || '') + ' · ' + nomCanal(o.canal), [['1305', v.total, 0], [ing, 0, v.neto], ['2408', 0, v.iva]], { ref: o.id, tercero: ter });
    if (v.com > 0.5) asiento(o.fecha, 'Comisión', 'Comisión ' + nomCanal(o.canal) + ' · ' + (o.codigo || ''), [['5295', v.com, 0], ['1305', 0, v.com]], { ref: o.id, tercero: ter });
    if (v.flete > 0.5) asiento(o.fecha, 'Flete', 'Flete del pedido ' + (o.codigo || ''), [['5235', v.flete, 0], [CTA_MEDIO[o.medioFlete] || '1105', 0, v.flete]], { ref: o.id });
    if (v.costo > 0.5) asiento(o.fecha, 'Costo de venta', 'Costo del producto · ' + (o.codigo || ''), [['6120', v.costo, 0], ['1445', 0, v.costo]], { ref: o.id });
    if (o.cobro && o.cobro.fecha) asiento(o.cobro.fecha, 'Cobro', 'Cobro del pedido ' + (o.codigo || ''), [[CTA_MEDIO[o.cobro.medio] || '1110', v.total - v.com, 0], ['1305', 0, v.total - v.com]], { ref: o.id, tercero: ter }); });
  TZ.pos.forEach(p => { const v = valorPOS(p); const med = p.medio === 'Efectivo' ? '1105' : '1110'; asiento(p.fecha, 'Venta cafetería', 'Cafetería · ' + num(p.unidades) + ' ' + ((TZ.menu.find(m => m.id === p.itemId) || {}).nombre || ''), [[med, v.total, 0], ['4140', 0, v.neto], ['2408', 0, v.imp]], { ref: p.id });
    if (v.cafe > 0.5) asiento(p.fecha, 'Costo cafetería', 'Café usado en barra', [['6140', v.cafe, 0], ['1440', 0, v.cafe]], { ref: p.id }); if (v.costo - v.cafe > 0.5) asiento(p.fecha, 'Costo cafetería', 'Otros insumos de barra', [['6140', v.costo - v.cafe, 0], ['1105', 0, v.costo - v.cafe]], { ref: p.id }); });
  TZ.negocios.filter(n => n.estado === 'Cerrado' && n.trillaId).forEach(n => { const t = TZ.trillas.find(x => x.id === n.trillaId); const c = n0(n.kg) * (t ? infoTrilla(t).kgVerdeCosto : 0); const ing = n0(n.kg) * precioCOPkg(n);
    asiento(n.fechaCierre || n.fecha, 'Exportación', 'Venta de café verde · ' + (n.codigo || ''), [['1305', ing, 0], ['4125', 0, ing]], { ref: n.id, tercero: n.terceroId }); if (c > 0.5) asiento(n.fechaCierre || n.fecha, 'Costo de venta', 'Costo del café verde · ' + (n.codigo || ''), [['6125', c, 0], ['1435', 0, c]], { ref: n.id }); });
}

/* ---------- Exportación: precio en bolsa + diferencial → COP por kg, contribución y precio piso ---------- */
const LB_KG = 2.20462;
function precioUSDlb(n) { return n.modalidad === 'Diferencial' ? n0(n.bolsa) + n0(n.diferencial) : n0(n.precio); }
function precioCOPkg(n) { return precioUSDlb(n) * LB_KG * (n0(n.trm) || cfgTaza().trm) - n0(n.logistica); }
function infoNegocio(n) { const t = TZ.trillas.find(x => x.id === n.trillaId); const cv = t ? infoTrilla(t).kgVerdeCosto : n0(n.costoKg); const p = precioCOPkg(n); const contrib = p - cv; const trm = n0(n.trm) || cfgTaza().trm;
  const piso = (cv + n0(n.logistica)) * (1 + n0(n.margenMin) / 100); const pisoUSD = piso / LB_KG / trm; return { usdlb: precioUSDlb(n), copkg: p, costoKg: cv, contrib, contribTot: contrib * n0(n.kg), margen: p ? contrib / p * 100 : null, piso, pisoUSD, senal: precioUSDlb(n) >= pisoUSD ? (contrib / (p || 1) > 0.25 ? 'Muy favorable' : 'Favorable') : 'Bajo el precio piso' }; }

/* ---------- Catación (protocolo SCA tradicional de 100 puntos) ---------- */
const ATRIB_SCA = [['fragancia', 'Fragancia y aroma'], ['sabor', 'Sabor'], ['residual', 'Sabor residual'], ['acidez', 'Acidez'], ['cuerpo', 'Cuerpo'], ['balance', 'Balance'], ['uniformidad', 'Uniformidad'], ['limpia', 'Taza limpia'], ['dulzor', 'Dulzor'], ['general', 'Puntaje del catador']];
function puntajeSCA(c) { return ATRIB_SCA.reduce((s, [k]) => s + n0(c[k]), 0) - n0(c.defectos); }
function clasifSCA(p) { return p >= 90 ? { t: 'Excepcional', c: 'top' } : p >= 85 ? { t: 'Excelente', c: 'bien' } : p >= 80 ? { t: 'Muy bueno (especialidad)', c: 'bien' } : p > 0 ? { t: 'Por debajo de especialidad', c: 'medio' } : { t: '—', c: '' }; }

/* ---------- Códigos ---------- */
function sigla26() { return siglaFinca(fincasActivas()[0] || fincas[0]); }
function consecutivo26(lista, pref) { return siguienteNum(lista, pref) ; }
function codTrilla(f) { const pref = 'TRI-' + sigla26() + '-' + String(f || hoyLocal()).slice(2, 4) + '-'; return pref + String(consecutivo26(TZ.trillas, pref)).padStart(2, '0'); }
function codTostion(f) { const pref = 'TOS-' + sigla26() + '-' + String(f || hoyLocal()).replace(/-/g, '').slice(2) + '-'; return pref + String(consecutivo26(TZ.tostiones, pref)).padStart(2, '0'); }
function codLotePT(sku, f) { const pref = (sku ? sku.codigo : 'SKU') + '-' + String(f || hoyLocal()).replace(/-/g, '').slice(2) + '-'; return pref + consecutivo26(TZ.lotesPT, pref); }
function codPedido(canal, f) { const pref = 'PED-' + canal + '-' + String(f || hoyLocal()).slice(2, 4) + '-'; return pref + String(consecutivo26(TZ.pedidos, pref)).padStart(4, '0'); }

/* ---------- Trazabilidad industrial: bolsa o taza → tostión → trilla → lote comercial → baches → pesadas ---------- */
function cadenaIndustrial(ref) { const R = { pedidos: [], lotesPT: [], tostiones: [], trillas: [], pos: [] };
  if (ref.tipo === 'pedido') { R.pedidos = [ref.o]; R.lotesPT = (ref.o.lineas || []).map(l => TZ.lotesPT.find(p => p.id === l.lotePTId)).filter(Boolean); }
  if (ref.tipo === 'lotePT') R.lotesPT = [ref.o]; if (ref.tipo === 'tostion') R.tostiones = [ref.o]; if (ref.tipo === 'trilla') R.trillas = [ref.o];
  R.lotesPT.forEach(p => { const t = TZ.tostiones.find(x => x.id === p.tostionId); if (t && !R.tostiones.includes(t)) R.tostiones.push(t); });
  R.tostiones.forEach(s => { const t = TZ.trillas.find(x => x.id === s.trillaId); if (t && !R.trillas.includes(t)) R.trillas.push(t); });
  if (ref.tipo !== 'pedido') { const lp = R.lotesPT.length ? R.lotesPT : TZ.lotesPT.filter(p => R.tostiones.some(s => s.id === p.tostionId)); R.lotesPT = [...new Set(lp)]; R.pedidos = TZ.pedidos.filter(o => (o.lineas || []).some(l => R.lotesPT.some(p => p.id === l.lotePTId))); R.pos = TZ.pos.filter(v => R.tostiones.some(s => s.id === v.tostionId)); }
  const partidasIds = [...new Set(R.trillas.map(t => t.partidaId).filter(Boolean))]; return Object.assign(R, { partidas: partidasIds.map(id => partidas.find(p => p.id === id)).filter(Boolean) }); }
const _resolverCodigo22 = resolverCodigo22;
resolverCodigo22 = function (q) { const r = _resolverCodigo22(q); if (r) return r; const s = String(q || '').trim().toUpperCase(); if (!s) return null; const eq = c => !!c && String(c).toUpperCase() === s; let o;
  if ((o = TZ.pedidos.find(x => eq(x.codigo)))) return industrial26({ tipo: 'pedido', o }); if ((o = TZ.lotesPT.find(x => eq(x.codigo)))) return industrial26({ tipo: 'lotePT', o });
  if ((o = TZ.tostiones.find(x => eq(x.codigo)))) return industrial26({ tipo: 'tostion', o }); if ((o = TZ.trillas.find(x => eq(x.codigo)))) return industrial26({ tipo: 'trilla', o }); return null; };
function industrial26(ref) { const c = cadenaIndustrial(ref); const p = c.partidas[0]; window._industrial26 = { ref, c }; return p ? { tipo: 'partida', o: p, industrial: { ref, c } } : { tipo: 'industrial', o: ref.o, industrial: { ref, c } }; }
const _cadena22 = cadena22; cadena22 = function (ref) { if (ref.tipo === 'industrial') return { R: [], B: [], P: [], V: [], G: [], estimado: false }; return _cadena22(ref); };
const _coTraza22 = coTraza;
coTraza = function () { window._industrial26 = null; _coTraza22(); const I = window._industrial26; if (!I) return; const c = I.c; const host = document.getElementById('co-cuerpo'); const card = host && host.querySelector('.tz22'); const caja = (t, v, s) => `<div class="tz22-c"><span>${t}</span><b>${v || '—'}</b><small>${s || ''}</small></div>`;
  const html = `<div class="card tz26"><div class="title">Cadena industrial <span class="sub">de la bolsa o la taza hasta el lote comercial</span></div><div class="tz22-cad" style="grid-template-columns:repeat(5,minmax(0,1fr))">
    ${caja('Pedidos y barra', c.pedidos.map(o => esc(o.codigo)).join('<br>') || (c.pos.length ? c.pos.length + ' ventas de barra' : ''), c.pedidos.length ? c.pedidos.map(o => esc(nombreTercero25(o.terceroId, o.cliente))).join(', ') : '')}${caja('Lote de producto', c.lotesPT.map(p => esc(p.codigo)).join('<br>'), c.lotesPT.map(p => { const x = infoLotePT(p); return num(p.unidades) + ' und · vence ' + (x.vence ? fechaCorta(x.vence) : '—'); }).join('<br>'))}
    ${caja('Tostión', c.tostiones.map(s => esc(s.codigo)).join('<br>'), c.tostiones.map(s => { const x = infoTostion(s); return (x.perfil ? esc(x.perfil.nombre) + ' · ' : '') + 'merma ' + num(redondear(x.merma, 1)) + ' %'; }).join('<br>'))}${caja('Trilla', c.trillas.map(t => esc(t.codigo)).join('<br>'), c.trillas.map(t => 'factor ' + num(redondear(infoTrilla(t).factorReal, 1))).join('<br>'))}
    ${caja('Lote comercial', c.partidas.map(p => esc(p.codigo)).join('<br>'), c.partidas.map(p => { const k = TZ.cataciones.filter(x => x.partidaId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; return k ? 'SCA ' + num(redondear(puntajeSCA(k), 2)) : ''; }).join(''))}</div></div>`;
  if (card) card.insertAdjacentHTML('beforebegin', html); else if (host) host.insertAdjacentHTML('beforeend', html); };
const _sugerencias22 = sugerencias22; sugerencias22 = function (q) { const L = _sugerencias22(q); const s = String(q || '').trim().toUpperCase(); if (s.length < 2) return L; const add = (c, t) => { if (c && String(c).toUpperCase().includes(s) && L.length < 14 && !L.some(x => x.c === c)) L.push({ c, t }); };
  TZ.pedidos.forEach(o => add(o.codigo, 'Pedido')); TZ.lotesPT.forEach(p => add(p.codigo, 'Lote de producto')); TZ.tostiones.forEach(t => add(t.codigo, 'Tostión')); TZ.trillas.forEach(t => add(t.codigo, 'Trilla')); return L; };

/* La trilla consume pergamino del lote comercial (como una venta) */
const _vendidoDePartida21 = vendidoDePartida;
vendidoDePartida = function (pid) { return _vendidoDePartida21(pid) + TZ.trillas.filter(t => t.partidaId === pid).reduce((s, t) => s + n0(t.kgCPS), 0); };

/* ---------- Integridad: reglas de la cadena industrial ---------- */
const _auditoria25 = auditoria24;
auditoria24 = function () { const r = _auditoria25(); const A = []; const add = (sev, msg, fn) => A.push({ sev, area: 'De la finca a la taza', msg, fn: fn || "ir('taza')", n: 1 });
  TZ.trillas.forEach(t => { const x = infoTrilla(t); if (x.disp < -0.05) add('mal', 'La trilla ' + t.codigo + ' tiene más café verde usado del que produjo.'); if (x.factorReal && (x.factorReal < 85 || x.factorReal > 100)) add('medio', 'La trilla ' + t.codigo + ' dio un factor de ' + num(redondear(x.factorReal, 1)) + ' (lo usual: 88 a 96): revise los kilos.'); });
  TZ.tostiones.forEach(s => { const x = infoTostion(s); if (x.disp < -0.05) add('mal', 'La tostión ' + s.codigo + ' tiene más café usado del que se tostó.'); if (x.merma != null && (x.merma < 10 || x.merma > 22)) add('medio', 'La tostión ' + s.codigo + ' tiene una merma de ' + num(redondear(x.merma, 1)) + ' % (lo usual: 12 a 20 %).'); });
  TZ.lotesPT.forEach(p => { const x = infoLotePT(p); if (x.existencia < 0) add('mal', 'El lote ' + p.codigo + ' tiene existencia negativa (' + num(x.existencia) + ').'); if (x.vence && x.existencia > 0 && x.vence < hoyLocal()) add('mal', 'El lote ' + p.codigo + ' venció el ' + fechaCorta(x.vence) + ' con ' + num(x.existencia) + ' unidades.'); else if (x.vence && x.existencia > 0 && x.vence <= sumarDias(hoyLocal(), 30)) add('medio', 'El lote ' + p.codigo + ' vence el ' + fechaCorta(x.vence) + ' con ' + num(x.existencia) + ' unidades.'); });
  TZ.skus.filter(s => s.activo !== false).forEach(s => { const ex = TZ.lotesPT.filter(p => p.skuId === s.id).reduce((a, p) => a + infoLotePT(p).existencia, 0); if (n0(s.minimo) && ex < n0(s.minimo)) add('medio', 'El producto ' + s.nombre + ' está bajo el mínimo (' + num(ex) + ' de ' + num(s.minimo) + ' unidades): programe tostión y empaque.'); });
  TZ.pedidos.filter(o => o.estado !== 'Anulado' && !(o.cobro && o.cobro.fecha) && o.fecha < sumarDias(hoyLocal(), -30)).forEach(o => add('medio', 'El pedido ' + o.codigo + ' tiene más de 30 días sin cobrar.'));
  TZ.menu.forEach(it => { const e = escandallo(it); if (e.foodCost != null && e.foodCost > 35) add('info', 'La bebida ' + it.nombre + ' tiene un costo del ' + num(Math.round(e.foodCost)) + ' % de su precio neto (referencia: menos de 30 %).'); });
  const peso = { mal: 3, medio: 1.5, info: 0.4 }; const items = r.items.concat(A).sort((a, b) => peso[b.sev] - peso[a.sev]); return { items, indice: Math.max(0, Math.round(100 - items.reduce((s, x) => s + peso[x.sev], 0) * 2.5)) }; };

/* ---------- Estado de resultados: suma las ventas de producto, café verde y cafetería ---------- */
const _estadoResultados25 = estadoResultados;
estadoResultados = function (desde, hasta) { const r = _estadoResultados25.apply(this, arguments); const s = saldosCuentas(desde, hasta); const x = ['4120', '4125', '4140'].reduce((a, c) => a + saldoNat(c, s.get(c)), 0);
  r.ventasProducto = x; if (Math.abs(x) > 0.004) { r.ventasBrutas += x; r.ingresos += x; r.bruta += x; r.oper += x; r.antes += x; } return r; };
