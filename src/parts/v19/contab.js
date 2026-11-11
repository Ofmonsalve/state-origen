/* ================= CONTABILIDAD: plan de cuentas y asientos automáticos ================= */
/* Estructura basada en el PUC colombiano (Decreto 2650 de 1993), simplificada para una finca cafetera.
   Es contabilidad de gestión: no reemplaza la contabilidad oficial ni la asesoría del contador. */
const PUC = [
  ['1105', 'Caja', 'A'], ['1110', 'Bancos', 'A'], ['1305', 'Clientes', 'A'], ['1330', 'Anticipos a trabajadores', 'A'], ['1355', 'Retenciones y anticipos de impuestos', 'A'],
  ['1405', 'Inventario de insumos agrícolas', 'A'], ['1410', 'Café en proceso (cultivo y cosecha)', 'A'], ['1430', 'Café pergamino en bodega', 'A'],
  ['1504', 'Terrenos', 'A'], ['1516', 'Construcciones y edificaciones', 'A'], ['1520', 'Maquinaria y equipo', 'A'], ['1540', 'Vehículos', 'A'], ['1580', 'Plantaciones de café', 'A'], ['1592', 'Depreciación y amortización acumulada', 'A'],
  ['2105', 'Obligaciones financieras', 'P'], ['2205', 'Proveedores', 'P'], ['2335', 'Costos y gastos por pagar', 'P'], ['2505', 'Salarios y jornales por pagar', 'P'], ['2610', 'Prestaciones y seguridad social por pagar', 'P'],
  ['3105', 'Capital del propietario', 'K'], ['3605', 'Resultado del ejercicio', 'K'], ['3705', 'Resultados acumulados', 'K'],
  ['4105', 'Ventas de café', 'I'], ['4175', 'Descuentos en ventas', 'I'], ['4210', 'Ingresos financieros', 'I'], ['4295', 'Otros ingresos', 'I'],
  ['5105', 'Gastos de personal administrativo', 'G'], ['5115', 'Impuestos (predial y otros)', 'G'], ['5135', 'Servicios (energía, agua, internet, contador)', 'G'], ['5145', 'Mantenimiento administrativo', 'G'], ['5160', 'Depreciación administrativa', 'G'], ['5195', 'Gastos diversos', 'G'],
  ['5235', 'Transporte y fletes de venta', 'G'], ['5305', 'Gastos financieros (intereses, comisiones, 4×1000)', 'G'],
  ['6105', 'Costo del café vendido', 'C'],
  ['7105', 'Insumos agrícolas', 'Q'], ['7205', 'Mano de obra de recolección', 'Q'], ['7210', 'Jornales de labores', 'Q'], ['7215', 'Nómina fija de campo', 'Q'], ['7220', 'Prestaciones y seguridad social de campo', 'Q'], ['7230', 'Labores contratadas (sin detalle)', 'Q'],
  ['7310', 'Depreciación de producción', 'Q'], ['7315', 'Mantenimiento, combustible y herramientas', 'Q'], ['7320', 'Beneficio y secado', 'Q'], ['7325', 'Amortización de plantaciones', 'Q'], ['7395', 'Otros costos de producción', 'Q'],
];
const CLASE_NOM = { A: 'Activo', P: 'Pasivo', K: 'Patrimonio', I: 'Ingreso', G: 'Gasto', C: 'Costo de ventas', Q: 'Costo de producción' };
function cuentas() { const m = new Map(PUC.map(c => [c[0], { cod: c[0], nombre: c[1], clase: c[2] }])); (cuentasExtra || []).forEach(c => m.set(c.cod, { cod: c.cod, nombre: c.nombre, clase: c.clase || claseDeCodigo(c.cod) })); return m; }
function claseDeCodigo(c) { const d = String(c)[0]; return { 1: 'A', 2: 'P', 3: 'K', 4: 'I', 5: 'G', 6: 'C', 7: 'Q' }[d] || 'G'; }
const nomCuenta = cod => (cuentas().get(cod) || { nombre: cod }).nombre;
const CONTA_DEF = { factorPrestacional: 0.52, retencionVentaPct: 0, insumosBodega: false, nominaPagadaAuto: true, diasCarencia: 30, fechaInicio: '', saldos: {}, vidaPlantacion: 6 };
function cfgConta() { return Object.assign({}, CONTA_DEF, contaConfig || {}); }
/* Categorías de egresos e ingresos para el formulario de movimientos */
const CATEG_EGRESO = [['1405', 'Insumos para bodega (fertilizantes, agroquímicos)'], ['7105', 'Insumos aplicados directamente'], ['7210', 'Jornales de labores (sin orden de trabajo)'], ['7315', 'Herramientas, combustible y mantenimiento'], ['7320', 'Beneficio y secado (energía, agua, leña)'], ['7395', 'Otros costos de producción'],
  ['2610', 'Pago de seguridad social y prestaciones'], ['5115', 'Impuestos (predial, industria y comercio)'], ['5135', 'Servicios (energía, agua, internet, contador)'], ['5145', 'Mantenimiento de la casa y oficina'], ['5195', 'Otros gastos de administración'], ['5235', 'Transporte y fletes de venta'], ['5305', 'Gastos bancarios y financieros']];
const CATEG_INGRESO = [['4295', 'Otros ingresos (subsidios, arriendos, venta de pasilla)'], ['4210', 'Rendimientos financieros']];
const TIPOS_MOV = { egreso: 'Compra o gasto', ingreso: 'Otro ingreso', prestamo: 'Préstamo recibido', abono: 'Abono a préstamo', aporte: 'Aporte del propietario', retiro: 'Retiro del propietario', traslado: 'Traslado entre caja y banco', inversion: 'Inversión en activo o siembra', manual: 'Asiento manual' };
const CTA_MEDIO = { Caja: '1105', Banco: '1110', 'Crédito': '2205' };
function saldoMovimiento(m) { if (m.tipo !== 'egreso' && m.tipo !== 'inversion') return 0; if (m.medio !== 'Crédito') return 0; return Math.max(0, n0(m.valor) - (m.pagos || []).reduce((s, p) => s + n0(p.valor), 0)); }
function finDeMes(ym) { const d = parseFecha(ym + '-01'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return isoFecha(d); }
function mesesEntre(a, b) { const out = []; if (!a || !b) return out; let d = String(a).slice(0, 7); b = String(b); while (d <= b.slice(0, 7)) { out.push(d); const x = parseFecha(d + '-01'); x.setUTCMonth(x.getUTCMonth() + 1); d = isoFecha(x).slice(0, 7); } return out; }
function areaEmpleado(e) { return /admin|contad|secretar|gerent/i.test(e.cargo || '') ? 'adm' : 'campo'; }
function cuentaActivo(a) { const c = String(a.categoria || '').toLowerCase(); return c.includes('veh') ? '1540' : c.includes('maquin') || c.includes('equipo') ? '1520' : c.includes('terreno') ? '1504' : c.includes('planta') || c.includes('cultivo') || c.includes('siembra') ? '1580' : '1516'; }
/* ---- Generación del libro diario ---- */
let _libroCache = { k: null, v: null }; let _versionDatos = 0;
function libroDiario() {
  const k = _versionDatos + '|' + hoyLocal();
  if (_libroCache.k === k) return _libroCache.v;
  const cf = cfgConta(); const A = []; const hoyS = hoyLocal();
  const asiento = (fecha, origen, desc, lineas, extra) => { const ls = lineas.filter(l => Math.abs(l[1] || 0) + Math.abs(l[2] || 0) > 0.004).map(l => ({ cuenta: l[0], debe: Math.round((l[1] || 0) * 100) / 100, haber: Math.round((l[2] || 0) * 100) / 100, loteId: l[3] || (extra && extra.loteId) || null }));
    const sinFecha = !/^\d{4}-\d{2}-\d{2}/.test(String(fecha || '')); if (sinFecha) fecha = ini;
    if (ls.length) A.push(Object.assign({ fecha, origen, desc: sinFecha ? desc + ' (sin fecha: llevado a la apertura)' : desc, lineas: ls }, extra || {})); };
  // Saldos iniciales
  const ini = cf.fechaInicio || [registros, ventas, labores, beneficios, movimientos, insumos].flat().map(x => x.fecha).filter(Boolean).sort()[0] || hoyS;
  const S = cf.saldos || {}; const sal = [['1105', S.caja], ['1110', S.bancos], ['1305', S.clientes], ['1405', S.insumos], ['1430', S.inventarioCafe], ['1504', S.terrenos], ['1516', S.construcciones], ['1520', S.maquinaria], ['1580', S.plantaciones]].filter(x => n0(x[1]));
  const pas = [['2105', S.obligaciones], ['2205', S.proveedores]].filter(x => n0(x[1]));
  if (sal.length || pas.length) { const act = sal.reduce((s, x) => s + n0(x[1]), 0), pa = pas.reduce((s, x) => s + n0(x[1]), 0); asiento(ini, 'Saldos iniciales', 'Apertura de la contabilidad de la finca', sal.map(x => [x[0], n0(x[1]), 0]).concat(pas.map(x => [x[0], 0, n0(x[1])])).concat([['3105', act - pa < 0 ? pa - act : 0, act - pa > 0 ? act - pa : 0]])); }
  // Ventas y cobros
  ventas.forEach(v => { const x = valorVenta(v); const ter = v.terceroId || v.comprador;
    asiento(v.fecha, 'Venta', 'Venta de café a ' + terceroNombre(v.terceroId, v.comprador) + ' · ' + num(redondear(v.kg, 1)) + ' kg', [['1305', x.neto, 0], ['1355', x.ret, 0], ['4175', n0(v.descuentos), 0], ['4105', 0, x.bruto + n0(v.bonificacion)]], { ref: v.id, tercero: ter });
    const cobros = (v.cobros && v.cobros.length) ? v.cobros : (v.formaPago === 'Crédito' ? [] : [{ fecha: v.fecha, valor: x.neto, cuenta: v.cuenta || 'Caja' }]);
    cobros.forEach(c => asiento(c.fecha, 'Cobro', 'Cobro a ' + terceroNombre(v.terceroId, v.comprador), [[CTA_MEDIO[c.cuenta] || '1105', n0(c.valor), 0], ['1305', 0, n0(c.valor)]], { ref: v.id, tercero: ter })); });
  // Recolección: causación diaria por lote
  const recol = new Map(); registros.forEach(r => { const k = r.fecha + '|' + (r.loteId || ''); const o = recol.get(k) || { c: 0, p: 0 }; o.c += typeof costoRegistro === 'function' ? costoRegistro(r) : n0(r.kg) * tarifaDe(r); o.p += typeof pagoRegistro === 'function' ? pagoRegistro(r) : n0(r.kg) * tarifaDe(r); recol.set(k, o); });
  recol.forEach((o, k) => { const [f, l] = k.split('|'); asiento(f, 'Recolección', 'Recolección del día' + (l ? ' · ' + nombreLote(l) : ''), [['7205', o.c, 0, l || null], ['2505', 0, o.p], ['1105', 0, o.c - o.p]], { loteId: l || null }); });
  adelantos.forEach(a => asiento(a.fecha, 'Adelanto', 'Adelanto a ' + nombreTrabajador(a.trabajadorId), [['1330', n0(a.valor), 0], ['1105', 0, n0(a.valor)]], { tercero: a.trabajadorId }));
  pagos.forEach(p => asiento(p.fecha, 'Pago a recolector', 'Pago a ' + nombreTrabajador(p.trabajadorId) + ' · ' + num(p.kgTotal) + ' kg', [['2505', n0(p.valorBruto), 0], ['1330', 0, n0(p.adelantosDescontados)], ['1105', 0, n0(p.valorNeto)]], { tercero: p.trabajadorId }));
  // Labores
  labores.forEach(lb => { const cIns = cf.insumosBodega ? '1405' : '1105';
    if (lb.manoObra != null || lb.insumosCosto != null) asiento(lb.fecha, 'Labor', lb.tipo + (lb.otNumero ? ' · ' + lb.otNumero : ''), [['7210', n0(lb.manoObra), 0, lb.loteId], ['7105', n0(lb.insumosCosto), 0, lb.loteId], ['1105', 0, n0(lb.manoObra)], [cIns, 0, n0(lb.insumosCosto)]], { loteId: lb.loteId, ref: lb.id });
    else asiento(lb.fecha, 'Labor', lb.tipo + (lb.insumo ? ' · ' + lb.insumo : ''), [[lb.insumo ? '7230' : '7210', n0(lb.costo), 0, lb.loteId], ['1105', 0, n0(lb.costo)]], { loteId: lb.loteId, ref: lb.id }); });
  insumos.forEach(i => { const l = lotes.find(x => x.nombre === i.lote); asiento(i.fecha, 'Compra', 'Insumo: ' + (i.nombre || ''), [['7105', n0(i.costo), 0, l ? l.id : null], ['1105', 0, n0(i.costo)]]); });
  // Nómina fija mensual
  const fin = [hoyS, ...ventas.map(v => v.fecha)].filter(f => /^\d{4}-\d{2}/.test(String(f || ""))).sort().pop(); const meses = mesesEntre(ini, fin);
  empleados.forEach(e => { const desde = e.fechaIngreso || ini; meses.forEach(m => { if (m < desde.slice(0, 7) || (e.fechaRetiro && m > e.fechaRetiro.slice(0, 7))) return; const fm = finDeMes(m); if (fm > hoyS && m !== hoyS.slice(0, 7)) return; const f = fm > hoyS ? hoyS : fm;
    const sal = n0(e.salario) * (m === desde.slice(0, 7) ? Math.max(0, (30 - Number(desde.slice(8, 10)) + 1) / 30) : 1); const fp = /prestaci|servicio|jornal/i.test(e.contrato || '') ? 0 : n0(cf.factorPrestacional); const adm = areaEmpleado(e) === 'adm';
    asiento(f, 'Nómina', 'Nómina de ' + e.nombre + ' · ' + mesCorto(m), [[adm ? '5105' : '7215', sal, 0], [adm ? '5105' : '7220', sal * fp, 0], ['2505', 0, sal], ['2610', 0, sal * fp]], { tercero: e.id });
    if (cf.nominaPagadaAuto) asiento(f, 'Pago de nómina', 'Pago de nómina de ' + e.nombre, [['2505', sal, 0], ['1105', 0, sal]], { tercero: e.id }); }); });
  // Activos: alta (si no vienen de un movimiento) y depreciación mensual
  activos.forEach(a => { const cta = cuentaActivo(a); if (!a.movId && n0(a.costo)) asiento(a.fecha || ini, 'Activo', 'Alta de ' + a.nombre + ' (aporte del propietario)', [[cta, n0(a.costo), 0], ['3105', 0, n0(a.costo)]]);
    const dep = depreciacionAnual(a) / 12; if (!dep || cta === '1504') return; const d0 = (a.fecha || ini).slice(0, 7); let acum = 0; const tope = n0(a.costo) - n0(a.valorResidual);
    if (d0 < ini.slice(0, 7)) { const previos = Math.min(tope, dep * (mesesEntre(d0 + '-01', ini).length - 1)); if (previos > 0.5) { acum = previos; asiento(ini, 'Activo', 'Depreciación acumulada de ' + a.nombre + ' a la apertura', [['3105', previos, 0], ['1592', 0, previos]]); } }
    meses.forEach(m => { if (m < d0 || acum >= tope - 0.5) return; const f = finDeMes(m) > hoyS ? hoyS : finDeMes(m); if (finDeMes(m) > hoyS && m !== hoyS.slice(0, 7)) return; const v = Math.min(dep, tope - acum); acum += v;
      asiento(f, 'Depreciación', 'Depreciación de ' + a.nombre, [[cta === '1580' ? '7325' : (/veh|oficina|casa/i.test(a.categoria + ' ' + a.nombre) ? '5160' : '7310'), v, 0], ['1592', 0, v]]); }); });
  // Movimientos financieros
  movimientos.forEach(m => { const med = CTA_MEDIO[m.medio] || '1105'; const v = n0(m.valor); const t = m.terceroId;
    if (m.tipo === 'egreso') { asiento(m.fecha, 'Egreso', m.concepto || nomCuenta(m.cuenta), [[m.cuenta || '7395', v, 0, m.loteId], [med, 0, v]], { tercero: t, loteId: m.loteId, ref: m.id }); (m.pagos || []).forEach(p => asiento(p.fecha, 'Pago a proveedor', 'Pago: ' + (m.concepto || ''), [['2205', n0(p.valor), 0], [CTA_MEDIO[p.medio] || '1110', 0, n0(p.valor)]], { tercero: t, ref: m.id })); }
    else if (m.tipo === 'ingreso') asiento(m.fecha, 'Ingreso', m.concepto || nomCuenta(m.cuenta), [[med === '2205' ? '1305' : med, v, 0], [m.cuenta || '4295', 0, v]], { tercero: t, ref: m.id });
    else if (m.tipo === 'prestamo') asiento(m.fecha, 'Préstamo', m.concepto || 'Préstamo recibido', [[med === '2205' ? '1110' : med, v, 0], ['2105', 0, v]], { tercero: t, ref: m.id });
    else if (m.tipo === 'abono') asiento(m.fecha, 'Abono a préstamo', m.concepto || 'Abono a préstamo', [['2105', v, 0], ['5305', n0(m.intereses), 0], [med === '2205' ? '1110' : med, 0, v + n0(m.intereses)]], { tercero: t, ref: m.id });
    else if (m.tipo === 'aporte') asiento(m.fecha, 'Aporte', m.concepto || 'Aporte del propietario', [[med === '2205' ? '1110' : med, v, 0], ['3105', 0, v]], { ref: m.id });
    else if (m.tipo === 'retiro') asiento(m.fecha, 'Retiro', m.concepto || 'Retiro del propietario', [['3105', v, 0], [med === '2205' ? '1105' : med, 0, v]], { ref: m.id });
    else if (m.tipo === 'traslado') asiento(m.fecha, 'Traslado', m.concepto || 'Traslado', [[m.destino === 'Caja' ? '1105' : '1110', v, 0], [m.destino === 'Caja' ? '1110' : '1105', 0, v]], { ref: m.id });
    else if (m.tipo === 'inversion') { asiento(m.fecha, 'Inversión', m.concepto || 'Inversión', [[m.cuenta || '1520', v, 0, m.loteId], [med, 0, v]], { tercero: t, ref: m.id, loteId: m.loteId }); (m.pagos || []).forEach(p => asiento(p.fecha, 'Pago a proveedor', 'Pago: ' + (m.concepto || ''), [['2205', n0(p.valor), 0], [CTA_MEDIO[p.medio] || '1110', 0, n0(p.valor)]], { tercero: t, ref: m.id })); }
    else if (m.tipo === 'manual') asiento(m.fecha, 'Manual', m.concepto || 'Asiento manual', (m.lineas || []).map(l => [l.cuenta, n0(l.debe), n0(l.haber), l.loteId]), { ref: m.id }); });
  // Costeo: costos de producción → café en proceso → café en bodega → costo de ventas (promedio ponderado)
  A.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const porMesQ = new Map(); A.forEach(a => a.lineas.forEach(l => { if (cuentas().get(l.cuenta) && cuentas().get(l.cuenta).clase === 'Q') { const k = a.fecha.slice(0, 7); const o = porMesQ.get(k) || {}; o[l.cuenta] = (o[l.cuenta] || 0) + l.debe - l.haber; porMesQ.set(k, o); } }));
  let wip = 0, invKg = n0(S.inventarioCafeKg), invVal = n0(S.inventarioCafe), costoProm = invKg ? invVal / invKg : 0; const costeo = [];
  const mesesTodos = [...new Set(meses.concat([...porMesQ.keys()]))].sort();
  mesesTodos.forEach(m => { const f = finDeMes(m) > hoyS ? hoyS : finDeMes(m); const q = porMesQ.get(m) || {}; const tot = Object.values(q).reduce((s, v) => s + v, 0);
    if (Math.abs(tot) > 0.5) { asiento(f, 'Cierre de costos', 'Traslado de costos de producción de ' + mesCorto(m) + ' al café en proceso', [['1410', tot, 0]].concat(Object.entries(q).map(([c, v]) => [c, 0, v])), { cierre: true }); wip += tot; }
    const kg = beneficios.filter(b => String(b.fecha).slice(0, 7) === m).reduce((s, b) => s + n0(b.kgSalida), 0);
    // El café en proceso se reparte entre la producción del año en proporción a lo que falta por producir (cosecha esperada del año)
    const an = m.slice(0, 4); const prodAntes = beneficios.filter(b => String(b.fecha).slice(0, 4) === an && String(b.fecha).slice(0, 7) < m).reduce((s, b) => s + n0(b.kgSalida), 0);
    const esperada = produccionEsperadaAnio(an); const restante = Math.max(kg, esperada - prodAntes); const fr = m.slice(5) === '12' || an < hoyS.slice(0, 4) && m === mesesTodos.filter(x => x.slice(0, 4) === an).pop() ? 1 : Math.min(1, kg / (restante || kg || 1));
    const absorbe = kg > 0 ? wip * fr : 0;
    if (kg > 0 && absorbe > 0.5) { asiento(f, 'Producción', 'Café pergamino producido en ' + mesCorto(m) + ' · ' + num(Math.round(kg)) + ' kg (' + Math.round(fr * 100) + ' % del costo acumulado)', [['1430', absorbe, 0], ['1410', 0, absorbe]], { cierre: true }); invVal += absorbe; invKg += kg; costeo.push({ mes: m, kg, costo: absorbe, unit: absorbe / kg, fr }); wip -= absorbe; }
    else if (kg > 0) { invKg += kg; costeo.push({ mes: m, kg, costo: 0, unit: 0, fr: 0 }); }
    costoProm = invKg > 0 ? invVal / invKg : costoProm;
    ventas.filter(v => String(v.fecha).slice(0, 7) === m).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(v => { const c = Math.min(invVal, n0(v.kg) * costoProm); invKg = Math.max(0, invKg - n0(v.kg)); invVal = Math.max(0, invVal - c);
      if (c > 0.5) asiento(v.fecha, 'Costo de venta', 'Costo del café vendido · ' + num(redondear(v.kg, 1)) + ' kg a ' + fmt(costoProm * CARGA) + '/carga', [['6105', c, 0], ['1430', 0, c]], { ref: v.id, cierre: true }); }); });
  A.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.cierre ? 1 : 0) - (b.cierre ? 1 : 0)); A.forEach((a, i) => a.n = i + 1);
  const res = { asientos: A, costeo, wip, invKg, invVal, costoProm, ini }; _libroCache = { k, v: res }; return res;
}
function produccionEsperadaAnio(an) {
  const man = (cfgConta().produccionEsperada || {})[an]; if (n0(man)) return n0(man);
  const hecha = beneficios.filter(b => String(b.fecha).slice(0, 4) === an).reduce((s, b) => s + n0(b.kgSalida), 0);
  if (an !== hoyLocal().slice(0, 4)) return hecha;
  // Año en curso: lo producido más la cereza que falta por recoger según la proyección de los lotes, convertida a pergamino
  let falta = 0; try { lotesActivos().forEach(l => { const pr = proyeccionLote(l); if (pr && pr.kgCereza) { const hecho = registros.filter(x => x.loteId === l.id && x.fecha >= pr.campana.fecha).reduce((a, x) => a + n0(x.kg), 0); falta += Math.max(0, pr.kgCereza - hecho); } }); } catch (e) {}
  const sinBenef = Math.max(0, registros.filter(r => String(r.fecha).slice(0, 4) === an).reduce((s, r) => s + n0(r.kg), 0) / (n0(cfgMapa().factorPergamino) || 5) - hecha);
  return hecha + sinBenef + falta / (n0(cfgMapa().factorPergamino) || 5);
}
/* ---- Saldos y estados ---- */
function saldosCuentas(desde, hasta, opts) {
  const L = libroDiario(); const m = new Map(); opts = opts || {};
  L.asientos.forEach(a => { if ((desde && a.fecha < desde) || (hasta && a.fecha > hasta)) return; if (opts.sinCierre && a.cierre) return; a.lineas.forEach(l => { const o = m.get(l.cuenta) || { debe: 0, haber: 0 }; o.debe += l.debe; o.haber += l.haber; m.set(l.cuenta, o); }); });
  return m;
}
function saldoNat(cod, o) { const c = (cuentas().get(cod) || { clase: claseDeCodigo(cod) }).clase; const d = o ? o.debe - o.haber : 0; return ['A', 'G', 'C', 'Q'].includes(c) ? d : -d; }
function estadoResultados(desde, hasta) {
  const s = saldosCuentas(desde, hasta); const v = cod => saldoNat(cod, s.get(cod)); const grupo = pref => [...s.keys()].filter(c => c.startsWith(pref)).reduce((a, c) => a + v(c), 0);
  const ventasBrutas = v('4105'), desc = -v('4175'), ingresos = ventasBrutas - desc; const costo = grupo('61'); const bruta = ingresos - costo;
  const adm = grupo('51'), vent = grupo('52'), oper = bruta - adm - vent; const otrosIng = v('4210') + v('4295'), fin = grupo('53'); const antes = oper + otrosIng - fin;
  const prod = saldosCuentas(desde, hasta, { sinCierre: true }); const costosProd = [...prod.keys()].filter(c => c.startsWith('7')).map(c => ({ cod: c, v: saldoNat(c, prod.get(c)) })).filter(x => Math.abs(x.v) > 0.5).sort((a, b) => b.v - a.v);
  const kgProd = beneficios.filter(b => (!desde || b.fecha >= desde) && (!hasta || b.fecha <= hasta)).reduce((a, b) => a + n0(b.kgSalida), 0); const kgVend = ventas.filter(x => (!desde || x.fecha >= desde) && (!hasta || x.fecha <= hasta)).reduce((a, x) => a + n0(x.kg), 0);
  const detalle = pref => [...s.keys()].filter(c => c.startsWith(pref)).map(c => ({ cod: c, v: v(c) })).filter(x => Math.abs(x.v) > 0.5);
  return { ventasBrutas, desc, ingresos, costo, bruta, adm, vent, oper, otrosIng, fin, antes, costosProd, totalProd: costosProd.reduce((a, x) => a + x.v, 0), kgProd, kgVend, dAdm: detalle('51'), dVent: detalle('52'), dFin: detalle('53') };
}
function balanceGeneral(hasta) {
  const s = saldosCuentas(null, hasta); const v = cod => saldoNat(cod, s.get(cod)); const todas = [...s.keys()];
  const resultadoAnio = (() => { const an = hasta.slice(0, 4); const er = estadoResultados(an + '-01-01', hasta); return er.antes; })();
  const resultadosAnt = (() => { const an = hasta.slice(0, 4); const s2 = saldosCuentas(null, (Number(an) - 1) + '-12-31'); return [...s2.keys()].filter(c => /^[4567]/.test(c)).reduce((a, c) => a + (c[0] === '4' ? saldoNat(c, s2.get(c)) : -saldoNat(c, s2.get(c))), 0); })();
  const grp = codes => codes.map(c => ({ cod: c, v: v(c) })).filter(x => Math.abs(x.v) > 0.5);
  const corr = grp(['1105', '1110', '1305', '1330', '1355', '1405', '1410', '1430']), nocorr = grp(['1504', '1516', '1520', '1540', '1580', '1592']);
  const extraA = grp(todas.filter(c => c[0] === '1' && !corr.concat(nocorr).some(x => x.cod === c))); const pasC = grp(['2205', '2335', '2505', '2610']), pasL = grp(['2105']); const extraP = grp(todas.filter(c => c[0] === '2' && !pasC.concat(pasL).some(x => x.cod === c)));
  const cap = v('3105') + todas.filter(c => c[0] === '3' && c !== '3105').reduce((a, c) => a + v(c), 0);
  const sum = a => a.reduce((x, y) => x + y.v, 0); const activo = sum(corr) + sum(nocorr) + sum(extraA), pasivo = sum(pasC) + sum(pasL) + sum(extraP);
  return { corr, nocorr: nocorr.concat(extraA), pasC: pasC.concat(extraP), pasL, cap, resultadosAnt, resultadoAnio, activo, pasivo, patrimonio: cap + resultadosAnt + resultadoAnio, totCorr: sum(corr), totPasC: sum(pasC) + sum(extraP), dif: activo - pasivo - (cap + resultadosAnt + resultadoAnio) };
}
function flujoEfectivo(meses) {
  const L = libroDiario(); const out = meses.map(m => ({ m, entra: {}, sale: {}, ini: 0, fin: 0 }));
  const etiq = c => ({ '1305': 'Cobros de ventas', '4295': 'Otros ingresos', '4210': 'Otros ingresos', '2105': 'Préstamos', '3105': 'Aportes y retiros', '2505': 'Recolección y nómina', '1330': 'Adelantos a trabajadores', '2205': 'Proveedores', '2610': 'Seguridad social y prestaciones' })[c] || (c[0] === '7' ? 'Labores e insumos' : c[0] === '5' ? 'Gastos de administración y financieros' : c[0] === '1' ? (c >= '1500' ? 'Inversiones' : 'Insumos para bodega') : 'Otros');
  let saldo = 0; const primero = meses[0];
  L.asientos.forEach(a => { const cajas = a.lineas.filter(l => l.cuenta === '1105' || l.cuenta === '1110'); if (!cajas.length) return; const neto = cajas.reduce((s, l) => s + l.debe - l.haber, 0);
    if (a.fecha < primero + '-01' || a.origen === 'Saldos iniciales') { saldo += neto; return; } const i = meses.indexOf(a.fecha.slice(0, 7)); if (i < 0) return;
    const otras = a.lineas.filter(l => l.cuenta !== '1105' && l.cuenta !== '1110'); if (!otras.length) return; const tot = otras.reduce((s, l) => s + Math.abs(l.debe - l.haber), 0) || 1;
    otras.forEach(l => { const part = neto * Math.abs(l.debe - l.haber) / tot; const e = etiq(l.cuenta); if (part >= 0) out[i].entra[e] = (out[i].entra[e] || 0) + part; else out[i].sale[e] = (out[i].sale[e] || 0) - part; }); });
  out.forEach(o => { o.ini = saldo; o.tEntra = Object.values(o.entra).reduce((a, b) => a + b, 0); o.tSale = Object.values(o.sale).reduce((a, b) => a + b, 0); saldo += o.tEntra - o.tSale; o.fin = saldo; });
  return out;
}
function cartera(hasta) {
  hasta = hasta || hoyLocal(); const cxc = ventas.filter(v => saldoVenta(v) > 0.5).map(v => { const venc = v.vence || v.fecha; const dias = Math.round((parseFecha(hasta) - parseFecha(venc)) / 864e5); return { tipo: 'cobrar', tercero: terceroNombre(v.terceroId, v.comprador), fecha: v.fecha, vence: venc, dias, saldo: saldoVenta(v), ref: v }; });
  const cxp = movimientos.filter(m => saldoMovimiento(m) > 0.5).map(m => { const venc = m.vence || m.fecha; return { tipo: 'pagar', tercero: terceroNombre(m.terceroId), fecha: m.fecha, vence: venc, dias: Math.round((parseFecha(hasta) - parseFecha(venc)) / 864e5), saldo: saldoMovimiento(m), ref: m, concepto: m.concepto }; });
  const edad = d => d <= 0 ? 'Al día' : d <= 30 ? '1 a 30 días' : d <= 60 ? '31 a 60 días' : d <= 90 ? '61 a 90 días' : 'Más de 90 días';
  return { cxc, cxp, edad };
}
function costosPorLote(desde, hasta) {
  const L = libroDiario(); const porLote = new Map(); let sinLote = 0;
  L.asientos.forEach(a => { if (a.cierre || a.fecha < desde || a.fecha > hasta) return; a.lineas.forEach(l => { if (!String(l.cuenta).startsWith('7')) return; const v = l.debe - l.haber; if (l.loteId) porLote.set(l.loteId, (porLote.get(l.loteId) || 0) + v); else sinLote += v; }); });
  const ls = lotesActivos(); const haTot = ls.reduce((s, l) => s + n0(l.hectareas), 0) || 1; const fc = n0(cfgMapa().factorPergamino) || 5; const an = hasta.slice(0, 4);
  // Ingresos y kilos vendidos por lote según el origen de cada venta (partidas exactas o estimación por antigüedad)
  const ing = new Map(), kgV = new Map(); ventas.filter(v => v.fecha >= desde && v.fecha <= hasta).forEach(v => { const o = origenVenta(v); const x = valorVenta(v); const tot = n0(v.kg) || 1; o.partes.forEach(p => p.beneficios.forEach(b => { ing.set(b.b.loteId, (ing.get(b.b.loteId) || 0) + x.neto * b.kg / tot); kgV.set(b.b.loteId, (kgV.get(b.b.loteId) || 0) + b.kg); })); });
  return ls.map(l => { const ha = n0(l.hectareas); const directo = porLote.get(l.id) || 0; const asignado = sinLote * ha / haTot; const kg = beneficios.filter(b => b.loteId === l.id && b.fecha >= desde && b.fecha <= hasta).reduce((s, b) => s + n0(b.kgSalida), 0);
    let falta = 0; if (an === hoyLocal().slice(0, 4) && hasta >= hoyLocal()) { try { const pr = proyeccionLote(l); if (pr && pr.kgCereza) falta = Math.max(0, pr.kgCereza - registros.filter(x => x.loteId === l.id && x.fecha >= pr.campana.fecha).reduce((a, x) => a + n0(x.kg), 0)) / fc; } catch (e) {} }
    const esperado = kg + falta; const total = directo + asignado; const unit = esperado ? total / esperado : null; const vend = kgV.get(l.id) || 0; const costoVend = unit != null ? unit * vend : 0;
    return { l, ha, directo, asignado, total, kg, esperado, porHa: ha ? total / ha : 0, porCarga: unit != null ? unit * CARGA : null, ingresos: ing.get(l.id) || 0, kgVend: vend, costoVend, margen: (ing.get(l.id) || 0) - costoVend }; });
}

/* Invalida el libro cuando cambian los datos */
(function () { const g = window.guardarEstado; if (typeof g === 'function') window.guardarEstado = function () { _versionDatos++; return g.apply(this, arguments); };
  ['aplicarEstado', 'aplicarMaestros', 'aplicarFinanzas', 'aplicarRegistros', 'aplicarComercial', 'aplicarContable', 'aplicarMovimientos', 'aplicarPlan', 'aplicarOrdenes'].forEach(n => { const o = window[n]; if (typeof o === 'function') window[n] = function () { _versionDatos++; return o.apply(this, arguments); }; }); })();
