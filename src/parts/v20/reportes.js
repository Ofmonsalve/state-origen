/* ================= v20: centro de reportes e informes de gerencia, cosecha, personal y campo ================= */
const PERIODOS_REP = [['ult30', 'Últimos 30 días'], ['mes', 'Este mes'], ['mesAnt', 'Mes anterior'], ['trim', 'Últimos 3 meses'], ['anio', 'Año en curso'], ['anioAnt', 'Año anterior'], ['todo', 'Todo el historial']];
function rangoReporte(p) {
  const h = hoyLocal(); const a = Number(h.slice(0, 4)); let r;
  if (p === 'mes') r = { desde: h.slice(0, 8) + '01', hasta: h };
  else if (p === 'mesAnt') { const d = parseFecha(h.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() - 1); const m = isoFecha(d).slice(0, 7); r = { desde: m + '-01', hasta: finDeMes(m) }; }
  else if (p === 'trim') r = { desde: sumarDias(h, -89), hasta: h };
  else if (p === 'anio') r = { desde: a + '-01-01', hasta: h };
  else if (p === 'anioAnt') r = { desde: (a - 1) + '-01-01', hasta: (a - 1) + '-12-31' };
  else if (p === 'todo') r = tbRango('todo');
  else r = { desde: sumarDias(h, -29), hasta: h };
  r.txt = fechaPDF(r.desde) + ' – ' + fechaPDF(r.hasta); r.clave = p; return r;
}
function lunesDe(f) { const d = parseFecha(f); const w = (d.getUTCDay() + 6) % 7; return sumarDias(f, -w); }
function semanasRango(r) { const out = []; let s = lunesDe(r.desde); while (s <= r.hasta) { out.push(s); s = sumarDias(s, 7); } return out; }
function pasadasCosecha() {
  const m = new Map(); registros.forEach(x => { const k = (x.anio || String(x.fecha).slice(0, 4)) + '|' + (x.tipo || 'Principal') + '|' + (x.pasada || 1); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return [...m.entries()].map(([k, rs]) => { const [anio, tipo, pas] = k.split('|'); const fs = rs.map(x => x.fecha).sort(); return { k, anio, tipo, pasada: Number(pas), regs: rs, ini: fs[0], fin: fs[fs.length - 1] }; }).sort((a, b) => b.ini.localeCompare(a.ini));
}
const tonoSev = s => s === 'danger' || s === 'mal' ? 'mal' : s === 'warn' || s === 'medio' ? 'alerta' : s === 'ok' || s === 'good' ? 'ok' : 'info';
function deltaTxt(a, b, inv) { if (!b) return null; const d = (a - b) / Math.abs(b) * 100; if (!isFinite(d)) return null; return { t: (d >= 0 ? '▲ ' : '▼ ') + num(Math.abs(Math.round(d))) + ' % vs periodo anterior', tono: (d >= 0) !== !!inv ? 'ok' : 'mal' }; }
function kpiD(t, v, a, b, inv, extra) { const d = deltaTxt(a, b, inv); return Object.assign({ t, v, s: d ? d.t : (extra || ''), stono: d ? d.tono : null }, {}); }
function nombreArchivo(base) { return (base + '-' + hoyLocal()).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').toLowerCase() + '.pdf'; }

/* ---------- 1. Informe ejecutivo ---------- */
function repEjecutivo(p) {
  const r = rangoReporte(p.periodo); const m = tbMetricas(r); const pv = tbMetricas(tbPrevio(r)); const MT = metas(); const ref = precioRefCarga(); const fid = (fincasActivas()[0] || {}).id;
  const R = new InformePDF({ titulo: 'Informe ejecutivo de la finca', subtitulo: 'Resultados, producción, estado del cultivo, proyección y decisiones del periodo', codigo: 'EJE', periodo: r.txt }); R.portada();
  const ha = lotesAlcance().reduce((s, l) => s + (n0(l.hectareas) || 0), 0);
  R.seccion(1, 'Lectura del periodo');
  R.rico([['En el periodo se recolectaron '], [pdfKg(m.kg) + ' de cereza', true], [' en ' + num(m.jornadas) + ' jornadas (' + num(redondear(m.kgh, 1)) + ' kg por hora) y salieron '], [num(redondear(m.cargas, 1)) + ' cargas de pergamino seco', true],
    [m.factor ? ' con un factor de conversión de ' + num(redondear(m.factor, 2)) + '. ' : '. '], ['Cada carga costó '], [m.costoCarga ? pdfPesos(m.costoCarga) : '—', true], [' frente a un precio de referencia de '], [ref.v ? pdfPesos(ref.v) : '—', true],
    [' (' + ref.fuente + '). El resultado económico del periodo es '], [pdfPesos(m.resultadoEco), true], [ha ? ', equivalente a ' + pdfPesos(m.resultadoEco / ha) + ' por hectárea.' : '.']]);
  R.kpis([kpiD('Cereza recolectada', pdfKg(m.kg), m.kg, pv.kg), kpiD('Pergamino seco', num(redondear(m.cargas, 1)) + ' cargas', m.cargas, pv.cargas), kpiD('Costo por carga', m.costoCarga ? pdfPesosM(m.costoCarga) : '—', m.costoCarga, pv.costoCarga, true, 'meta ' + pdfPesosM(MT.metaCostoCarga)),
    kpiD('Productividad', num(redondear(m.kgh, 1)) + ' kg/h', m.kgh, pv.kgh, false, 'meta ' + num(MT.metaKgH) + ' kg/h'), kpiD('Ingresos por ventas', pdfPesosM(m.ingresos), m.ingresos, pv.ingresos), kpiD('Resultado económico', pdfPesosM(m.resultadoEco), m.resultadoEco, pv.resultadoEco),
    { t: 'Factor de conversión', v: m.factor ? num(redondear(m.factor, 2)) : '—', s: 'meta ' + num(MT.metaFactor), stono: m.factor && m.factor <= MT.metaFactor * 1.02 ? 'ok' : 'alerta' }, { t: 'Área en café', v: num(redondear(ha, 2)) + ' ha', s: lotesAlcance().length + ' lote(s) activos' }], 4);
  if (fid) { const img = imagenMaquetaFinca(fid, 'Sanidad general', 1600, 900); if (img) R.imagen(img, R.cw, R.cw * 900 / 1600, 'Maqueta de la finca con el índice de sanidad general del último muestreo sobre la forma real del lote (escala 1 sano – 5 muy afectado).'); }
  R.seccion(2, 'Rentabilidad del periodo', 'Ingreso económico = ventas del periodo más el pergamino nuevo en bodega valorado al precio de referencia.');
  R.cascada([{ t: 'Ingreso económico', v: m.ingresoEco, total: true }, { t: 'Recolección', v: -m.recoleccion }, { t: 'Labores', v: -m.labCosto }, { t: 'Insumos', v: -m.insCosto }, { t: 'Nómina fija', v: -m.nomina }, { t: 'Depreciación', v: -m.deprec }, { t: 'Resultado económico', v: m.resultadoEco, total: true }], { alto: 62 });
  const fl = (t, v, b) => [{ t, b }, { t: pdfPesos(v), b }, { t: m.cargas ? pdfPesos(v / m.cargas) : '—', b }, { t: ha ? pdfPesos(v / ha) : '—', b }];
  R.tabla({ cols: [{ t: 'Concepto', w: 2.6 }, { t: 'Total', a: 'right' }, { t: 'Por carga', a: 'right' }, { t: 'Por hectárea', a: 'right' }], filas: [fl('Ventas de pergamino', m.ingresos), fl('Pergamino nuevo en bodega (a referencia)', m.inventarioNuevo), fl('Recolección', -m.recoleccion), fl('Labores', -m.labCosto), fl('Insumos', -m.insCosto), fl('Nómina fija', -m.nomina), fl('Depreciación', -m.deprec)], total: fl('Resultado económico', m.resultadoEco, true) });
  R.seccion(3, 'Producción', 'Cereza recolectada por semana y productividad de la cuadrilla.');
  let sem = semanasRango(r); { const i0 = sem.findIndex(s0 => m.regs.some(x => x.fecha >= s0 && x.fecha <= sumarDias(s0, 6))); if (i0 > 0) sem = sem.slice(i0); } const kgS = sem.map(s => m.regs.filter(x => x.fecha >= s && x.fecha <= sumarDias(s, 6)).reduce((a, x) => a + n0(x.kg), 0)); const hS = sem.map(s => m.regs.filter(x => x.fecha >= s && x.fecha <= sumarDias(s, 6)).reduce((a, x) => a + n0(x.horas), 0));
  R.barras({ cats: sem.map(s => fechaCorta(s)), series: [{ nombre: 'Cereza (kg)', vals: kgS, color: PDFC.cereza }, { nombre: 'kg por hora', tipo: 'linea', eje: 'der', vals: kgS.map((k, i) => hS[i] ? k / hS[i] : null), color: PDFC.serie[0] }], fmt: v => num(Math.round(v)), fmt2: v => num(redondear(v, 1)), alto: 58, titulo: 'Cereza por semana', der: 'kg · kg/h' });
  R.seccion(4, 'Estado del cultivo', 'Último muestreo de cada variable por lote, comparado con su umbral de acción.');
  const filasC = []; lotesAlcance().forEach(l => ['Broca', 'Roya', 'Sanidad general', 'Nutrición', 'Maduración', 'Floración'].forEach(tp => { const c = ultimaCampana(l.id, tp); if (!c) return; const t = TIPOS_MUESTREO[tp]; const u = t.umbral ? t.umbral() : null; const pct_ = t.unidad === '%';
    const est = u == null ? { t: '—' } : c.prom <= u ? { t: 'Bajo el umbral', chip: 'ok' } : c.prom <= u * 2 ? { t: 'Sobre el umbral', chip: 'alerta' } : { t: 'Crítico', chip: 'mal' };
    filasC.push([l.nombre, tp, fechaPDF(c.fecha), String(c.n || (c.regs || []).length), num(redondear(c.prom, 1)) + (pct_ ? ' %' : ''), u == null ? '—' : num(u) + (pct_ ? ' %' : ''), est]); }));
  R.tabla({ cols: [{ t: 'Lote', w: 1.6 }, { t: 'Variable', w: 1.5 }, { t: 'Fecha', w: 1.1 }, { t: 'Plantas', a: 'right', w: 0.8 }, { t: 'Promedio', a: 'right' }, { t: 'Umbral', a: 'right', w: 0.9 }, { t: 'Lectura', w: 1.3 }], filas: filasC, vacio: 'Sin muestreos registrados.' });
  const l0 = lotesAlcance()[0];
  if (l0) { const a = imagenMaquetaLote(l0, 'Broca', 1100, 900), b = imagenMaquetaLote(l0, 'Roya', 1100, 900); const w = (R.cw - 6) / 2, h = w * 900 / 1100;
    if (a || b) { R.asegurar(h + 12); R.columnas(2, [x => { x.f('bold', 8.4, PDFC.tinta); x.texto('Broca · ' + l0.nombre, x.x0, x.y); x.y += 2.5; x.imagen(a, w, h); }, x => { x.f('bold', 8.4, PDFC.tinta); x.texto('Roya · ' + l0.nombre, x.x0, x.y); x.y += 2.5; x.imagen(b, w, h); }], 6); } }
  R.seccion(5, 'Proyección de cosecha y maduración');
  const cm = curvaMaduracion(); const conC = cm.lotesP.filter(x => x.sem); const falta = cm.lotesP.reduce((a, x) => a + x.falta, 0); const kgJ = m.jornadas ? m.kg / m.jornadas : 0;
  if (conC.length) { const tot = Array.from({ length: cm.semanas }, (_, k) => conC.reduce((a, x) => a + x.sem[k], 0)); let ult = tot.length - 1; while (ult > 3 && tot[ult] < Math.max(...tot) * 0.01) ult--; const pk = tot.indexOf(Math.max(...tot));
    R.kpis([{ t: 'Cereza por recoger', v: pdfKg(falta) }, { t: 'Cargas por venir', v: num(redondear(falta / (m.factor || MT.metaFactor) / CARGA, 1)) }, { t: 'Valor a referencia', v: ref.v ? pdfPesosM(falta / (m.factor || MT.metaFactor) / CARGA * ref.v) : '—' }, { t: 'Semana pico', v: fechaCorta(sumarDias(hoyLocal(), pk * 7)), s: kgJ ? num(Math.ceil(tot[pk] / kgJ / 6)) + ' recolectores por día' : '' }], 4);
    R.barras({ cats: tot.slice(0, ult + 2).map((_, k) => fechaCorta(sumarDias(hoyLocal(), k * 7))), series: [{ nombre: 'Cereza madura proyectada (kg)', vals: tot.slice(0, ult + 2), color: PDFC.cereza }], fmt: v => num(Math.round(v)), etiquetas: true, alto: 52, marca: pk, titulo: 'Cereza madura por semana', der: 'kg' });
  } else R.nota('Registre un conteo de frutos y un muestreo de maduración para proyectar la cosecha por semana.', 'info');
  R.seccion(6, 'Caja, bodega y cartera');
  const inv = inventario(); const cart = cartera(); const cxc = cart.cxc.reduce((s, x) => s + x.saldo, 0), cxp = cart.cxp.reduce((s, x) => s + x.saldo, 0);
  R.kv([['Pergamino en bodega', pdfKg(inv.disp, 1) + ' · ' + num(redondear(inv.disp / CARGA, 2)) + ' cargas', true], ['Valor a precio de referencia', ref.v ? pdfPesos(inv.disp / CARGA * ref.v) : '—', true], ['Cuentas por cobrar', pdfPesos(cxc)], ['Cuentas por pagar', pdfPesos(cxp)], ['Pergamino producido en el año', pdfKg(inv.prod, 1)], ['Pergamino vendido en el año', pdfKg(inv.vend, 1)]], 2);
  R.seccion(7, 'Decisiones sugeridas', 'Generadas por reglas a partir de los datos del periodo; confírmelas en campo.');
  let dec = []; try { dec = decisionesSugeridas(m, calidadDatos(m)); } catch (e) {}
  if (!dec.length) R.nota('No hay alertas que requieran decisión en este periodo.', 'ok'); dec.forEach(d => R.nota(d.d || '', tonoSev(d.sev), d.t));
  R.guardar(nombreArchivo('informe-ejecutivo-' + (R.finca.nombre || 'finca')));
}

/* ---------- 2. Informe de cosecha ---------- */
function repCosecha(p) {
  const r = rangoReporte(p.periodo); const regs = registros.filter(x => enRango(x.fecha, r)); const m = tbMetricas(r); const MT = metas();
  const R = new InformePDF({ titulo: 'Informe de cosecha', subtitulo: 'Pasadas, recolectores, productividad, costos de recolección y beneficio', codigo: 'COS', periodo: r.txt }); R.portada();
  const kg = regs.reduce((a, x) => a + n0(x.kg), 0), horas = regs.reduce((a, x) => a + n0(x.horas), 0), pago = regs.reduce((a, x) => a + n0(x.kg) * tarifaDe(x), 0); const recs = new Set(regs.map(x => x.trabajadorId || x.recolector)); const dias = new Set(regs.map(x => x.fecha));
  const ben = beneficios.filter(b => enRango(b.fecha, r)); const ce = ben.reduce((a, b) => a + n0(b.kgEntrada), 0), pe = ben.reduce((a, b) => a + n0(b.kgSalida), 0);
  R.seccion(1, 'Resumen de la cosecha');
  R.kpis([{ t: 'Cereza recolectada', v: pdfKg(kg), s: num(dias.size) + ' días de recolección' }, { t: 'Jornadas', v: num(m.jornadas), s: num(recs.size) + ' recolectores' }, { t: 'Productividad', v: num(redondear(horas ? kg / horas : 0, 1)) + ' kg/h', s: 'meta ' + num(MT.metaKgH) + ' kg/h', stono: horas && kg / horas >= MT.metaKgH ? 'ok' : 'alerta' }, { t: 'kg por jornada', v: num(redondear(m.jornadas ? kg / m.jornadas : 0, 1)) },
    { t: 'Pago de recolección', v: pdfPesosM(pago), s: kg ? pdfPesos(pago / kg) + ' por kg' : '' }, { t: 'Pergamino obtenido', v: pdfKg(pe, 1), s: num(redondear(pe / CARGA, 2)) + ' cargas' }, { t: 'Factor de conversión', v: pe ? num(redondear(ce / pe, 2)) : '—', s: 'meta ' + num(MT.metaFactor), stono: pe && ce / pe <= MT.metaFactor * 1.02 ? 'ok' : 'alerta' }, { t: 'Costo recolección por carga', v: pe ? pdfPesosM(pago / (kg / (ce / pe || MT.metaFactor) / CARGA)) : '—' }], 4);
  R.seccion(2, 'Pasadas', 'Cada pasada agrupa los días de recolección del mismo ciclo.');
  const pas = pasadasCosecha().filter(x => x.regs.some(y => enRango(y.fecha, r))).sort((a, b) => a.ini.localeCompare(b.ini));
  const fp = pas.map(x => { const rs = x.regs.filter(y => enRango(y.fecha, r)); const k = rs.reduce((a, y) => a + n0(y.kg), 0), h = rs.reduce((a, y) => a + n0(y.horas), 0), c = rs.reduce((a, y) => a + n0(y.kg) * tarifaDe(y), 0);
    return [x.tipo + ' · pasada ' + x.pasada, fechaPDF(x.ini) + ' – ' + fechaPDF(x.fin), String(new Set(rs.map(y => y.fecha)).size), String(new Set(rs.map(y => y.trabajadorId)).size), pdfKg(k, 1), num(redondear(h, 1)), num(redondear(h ? k / h : 0, 1)), pdfPesos(c), k ? pdfPesos(c / k) : '—']; });
  R.tabla({ cols: [{ t: 'Pasada', w: 1.6 }, { t: 'Fechas', w: 1.9 }, { t: 'Días', a: 'right', w: 0.6 }, { t: 'Recol.', a: 'right', w: 0.7 }, { t: 'Cereza', a: 'right', w: 1.1 }, { t: 'Horas', a: 'right', w: 0.8 }, { t: 'kg/h', a: 'right', w: 0.7 }, { t: 'Pago', a: 'right', w: 1.2 }, { t: '$/kg', a: 'right', w: 0.8 }], filas: fp, primeraFuerte: true,
    total: ['Total', '', String(dias.size), String(recs.size), pdfKg(kg, 1), num(redondear(horas, 1)), num(redondear(horas ? kg / horas : 0, 1)), pdfPesos(pago), kg ? pdfPesos(pago / kg) : '—'] });
  const fechas = [...dias].sort(); const kgD = fechas.map(f => regs.filter(x => x.fecha === f).reduce((a, x) => a + n0(x.kg), 0)); const hD = fechas.map(f => regs.filter(x => x.fecha === f).reduce((a, x) => a + n0(x.horas), 0));
  R.barras({ cats: fechas.map(f => fechaCorta(f)), series: [{ nombre: 'Cereza (kg)', vals: kgD, color: PDFC.cereza }, { nombre: 'kg por hora', tipo: 'linea', eje: 'der', vals: kgD.map((k, i) => hD[i] ? k / hD[i] : null), color: PDFC.serie[0] }], fmt: v => num(Math.round(v)), fmt2: v => num(redondear(v, 1)), alto: 60, titulo: 'Recolección por día', der: 'kg · kg/h' });
  R.seccion(3, 'Recolectores');
  const porT = [...recs].map(id => { const rs = regs.filter(x => (x.trabajadorId || x.recolector) === id); const t = trabajadores.find(z => z.id === id); const k = rs.reduce((a, y) => a + n0(y.kg), 0), h = rs.reduce((a, y) => a + n0(y.horas), 0), c = rs.reduce((a, y) => a + n0(y.kg) * tarifaDe(y), 0);
    return { n: t ? t.nombre : (rs[0] && rs[0].recolector) || id, k, h, c, d: new Set(rs.map(y => y.fecha)).size }; }).sort((a, b) => b.k - a.k);
  R.tabla({ cols: [{ t: 'Recolector', w: 1.8 }, { t: 'Participación', w: 1.8 }, { t: 'Días', a: 'right', w: 0.6 }, { t: 'Cereza', a: 'right' }, { t: 'Horas', a: 'right', w: 0.8 }, { t: 'kg/h', a: 'right', w: 0.7 }, { t: 'kg/día', a: 'right', w: 0.8 }, { t: 'Pago bruto', a: 'right', w: 1.1 }],
    filas: porT.map(x => [x.n, { t: num(Math.round(x.k / (kg || 1) * 100)) + ' %', barra: x.k / (porT[0] ? porT[0].k : 1) }, String(x.d), pdfKg(x.k, 1), num(redondear(x.h, 1)), { t: num(redondear(x.h ? x.k / x.h : 0, 1)), color: x.h && x.k / x.h >= MT.metaKgH ? 'ok' : null, b: x.h && x.k / x.h >= MT.metaKgH }, num(Math.round(x.d ? x.k / x.d : 0)), pdfPesos(x.c)]),
    total: ['Total', '100 %', String(dias.size), pdfKg(kg, 1), num(redondear(horas, 1)), num(redondear(horas ? kg / horas : 0, 1)), num(Math.round(dias.size ? kg / dias.size : 0)), pdfPesos(pago)], primeraFuerte: true });
  R.seccion(4, 'Beneficio y calidad', 'Conversión de cereza a pergamino seco por cada beneficio del periodo.');
  R.tabla({ cols: [{ t: 'Fecha', w: 1 }, { t: 'Lote', w: 1.4 }, { t: 'Método', w: 0.9 }, { t: 'Fermentación', a: 'right', w: 1 }, { t: 'Secado', w: 1.3 }, { t: 'Cereza', a: 'right' }, { t: 'Pergamino', a: 'right' }, { t: 'Factor', a: 'right', w: 0.7 }],
    filas: ben.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(b => [fechaPDF(b.fecha), nombreLote(b.loteId) || '—', b.metodo || '—', b.fermentacionHoras ? b.fermentacionHoras + ' h' : '—', b.secado || '—', pdfKg(b.kgEntrada, 1), pdfKg(b.kgSalida, 1), { t: n0(b.kgSalida) ? num(redondear(n0(b.kgEntrada) / n0(b.kgSalida), 2)) : '—', color: n0(b.kgSalida) && n0(b.kgEntrada) / n0(b.kgSalida) > MT.metaFactor * 1.04 ? 'alerta' : null }]),
    total: ['Total', '', '', '', '', pdfKg(ce, 1), pdfKg(pe, 1), pe ? num(redondear(ce / pe, 2)) : '—'], vacio: 'Sin beneficios en el periodo.' });
  const pts = partidas.filter(x => enRango(x.fecha, r));
  if (pts.length) R.tabla({ titulo: 'Partidas de pergamino y calidad', cols: [{ t: 'Partida', w: 1.1 }, { t: 'Fecha' }, { t: 'Kilos', a: 'right' }, { t: 'Humedad', a: 'right' }, { t: 'Factor de rendimiento', a: 'right', w: 1.3 }, { t: 'Puntaje de taza', a: 'right', w: 1.1 }],
    filas: pts.map(x => [x.codigo, fechaPDF(x.fecha), pdfKg(kgPartida(x), 1), x.humedad ? num(x.humedad) + ' %' : '—', x.factor ? num(x.factor) : '—', x.taza ? { t: num(x.taza), b: true, color: x.taza >= 84 ? 'ok' : null } : '—']) });
  R.guardar(nombreArchivo('informe-cosecha'));
}

/* ---------- 3. Planilla de liquidación de una pasada ---------- */
function repPlanilla(p) {
  const pa = pasadasCosecha().find(x => x.k === p.pasada) || pasadasCosecha()[0]; if (!pa) { toast('No hay pasadas registradas.', 'err'); return; }
  const R = new InformePDF({ titulo: 'Planilla de liquidación de recolección', subtitulo: pa.tipo + ' · pasada ' + pa.pasada + ' · kilos por día, valor a pagar y firmas', codigo: 'PLA', periodo: fechaPDF(pa.ini) + ' – ' + fechaPDF(pa.fin), horizontal: true }); R.portada({ alto: 42 });
  const fechas = [...new Set(pa.regs.map(x => x.fecha))].sort(); const ids = [...new Set(pa.regs.map(x => x.trabajadorId || x.recolector))];
  const filas = ids.map(id => { const t = trabajadores.find(z => z.id === id) || { nombre: id }; const rs = pa.regs.filter(x => (x.trabajadorId || x.recolector) === id); const k = rs.reduce((a, x) => a + n0(x.kg), 0), h = rs.reduce((a, x) => a + n0(x.horas), 0), v = rs.reduce((a, x) => a + pagoRegistro(x), 0);
    const ad = adelantos.filter(a => a.trabajadorId === id && !a.aplicado).reduce((s, a) => s + n0(a.valor), 0); return { t, rs, k, h, v, ad, neto: v - ad }; }).sort((a, b) => b.k - a.k);
  const tot = filas.reduce((a, x) => ({ k: a.k + x.k, h: a.h + x.h, v: a.v + x.v, ad: a.ad + x.ad, neto: a.neto + x.neto }), { k: 0, h: 0, v: 0, ad: 0, neto: 0 });
  R.kpis([{ t: 'Cereza de la pasada', v: pdfKg(tot.k, 1) }, { t: 'Recolectores', v: String(filas.length), s: fechas.length + ' días' }, { t: 'Valor bruto', v: pdfPesos(tot.v) }, { t: 'Adelantos por descontar', v: pdfPesos(tot.ad) }, { t: 'Neto a pagar', v: pdfPesos(tot.neto), tono: 'ok' }], 5);
  const cols = [{ t: 'Recolector', w: 2.2 }].concat(fechas.map(f => ({ t: diaSemana(f).slice(0, 3) + ' ' + fechaCorta(f), a: 'right', w: 0.9 })), [{ t: 'Total kg', a: 'right', w: 1 }, { t: 'Horas', a: 'right', w: 0.7 }, { t: 'Tarifa', a: 'right', w: 0.8 }, { t: 'Bruto', a: 'right', w: 1.1 }, { t: 'Adelantos', a: 'right', w: 1 }, { t: 'Neto', a: 'right', w: 1.1 }, { t: 'Firma', w: 1.8 }]);
  R.tabla({ cols, fs: 8, primeraFuerte: true, filas: filas.map(x => [x.t.nombre].concat(fechas.map(f => { const k = x.rs.filter(y => y.fecha === f).reduce((a, y) => a + n0(y.kg), 0); return k ? num(redondear(k, 1)) : { t: '—', suave: true }; }),
      [{ t: num(redondear(x.k, 1)), b: true }, num(redondear(x.h, 1)), (x.rs.every(y => modalidadDe(y) === 'kilo') ? pdfPesos(x.k ? x.v / x.k : n0(x.t.tarifaPorKg)) + '/kg' : 'Mixta'), pdfPesos(x.v), x.ad ? { t: '−' + pdfPesos(x.ad), color: 'mal' } : '—', { t: pdfPesos(x.neto), b: true }, ' '])),
    total: ['Total'].concat(fechas.map(f => num(redondear(pa.regs.filter(y => y.fecha === f).reduce((a, y) => a + n0(y.kg), 0), 1))), [num(redondear(tot.k, 1)), num(redondear(tot.h, 1)), '', pdfPesos(tot.v), tot.ad ? '−' + pdfPesos(tot.ad) : '—', pdfPesos(tot.neto), '']) });
  R.nota('Valor bruto = kilos de cereza × tarifa por kilo vigente el día de la recolección. Los adelantos pendientes se descuentan al liquidar; verifique el neto con cada recolector antes de firmar.', 'info');
  R.firmas([['Elaboró', 'Administración'], ['Revisó', 'Jefe de campo'], ['Aprobó y pagó', 'Propietario']]);
  R.guardar(nombreArchivo('planilla-pasada-' + pa.pasada));
}

/* ---------- 4. Productividad de recolectores ---------- */
function repProductividad(p) {
  const r = rangoReporte(p.periodo); const regs = registros.filter(x => enRango(x.fecha, r)); const MT = metas();
  const R = new InformePDF({ titulo: 'Productividad de recolectores', subtitulo: 'Rendimiento por persona, constancia y comparación con la meta', codigo: 'PRO', periodo: r.txt }); R.portada();
  const ids = [...new Set(regs.map(x => x.trabajadorId || x.recolector))];
  const D = ids.map(id => { const t = trabajadores.find(z => z.id === id) || { nombre: id }; const rs = regs.filter(x => (x.trabajadorId || x.recolector) === id); const porDia = [...new Set(rs.map(x => x.fecha))].map(f => { const q = rs.filter(x => x.fecha === f); const k = q.reduce((a, x) => a + n0(x.kg), 0), h = q.reduce((a, x) => a + n0(x.horas), 0); return { f, k, h, kh: h ? k / h : 0 }; });
    const k = rs.reduce((a, x) => a + n0(x.kg), 0), h = rs.reduce((a, x) => a + n0(x.horas), 0); const media = porDia.reduce((a, x) => a + x.kh, 0) / (porDia.length || 1); const sd = Math.sqrt(porDia.reduce((a, x) => a + (x.kh - media) ** 2, 0) / (porDia.length || 1));
    const mejor = porDia.slice().sort((a, b) => b.k - a.k)[0]; return { t, k, h, kh: h ? k / h : 0, dias: porDia.length, cv: media ? sd / media * 100 : 0, mejor, porDia }; }).sort((a, b) => b.kh - a.kh);
  const kgT = D.reduce((a, x) => a + x.k, 0), hT = D.reduce((a, x) => a + x.h, 0);
  R.seccion(1, 'Resumen');
  R.kpis([{ t: 'Productividad de la cuadrilla', v: num(redondear(hT ? kgT / hT : 0, 1)) + ' kg/h', s: 'meta ' + num(MT.metaKgH) + ' kg/h' }, { t: 'Recolectores', v: String(D.length) }, { t: 'Sobre la meta', v: String(D.filter(x => x.kh >= MT.metaKgH).length), tono: 'ok' }, { t: 'Bajo la meta', v: String(D.filter(x => x.kh < MT.metaKgH).length), tono: 'alerta' }], 4);
  R.seccion(2, 'Kilos por hora frente a la meta', 'La línea vertical marca la meta de ' + num(MT.metaKgH) + ' kg/h.');
  R.barrasH(D.map(x => ({ t: x.t.nombre, s: num(x.dias) + ' días · ' + pdfKg(x.k), v: x.kh, vt: num(redondear(x.kh, 1)) + ' kg/h', meta: MT.metaKgH, tono: x.kh >= MT.metaKgH ? 'ok' : 'alerta' })), { etiqueta: 50, valor: 22, fila: 7 });
  R.seccion(3, 'Detalle por recolector', 'Constancia = variación del rendimiento diario (menor es más estable).');
  R.tabla({ cols: [{ t: 'Recolector', w: 1.7 }, { t: 'Días', a: 'right', w: 0.6 }, { t: 'Cereza', a: 'right' }, { t: 'Horas', a: 'right', w: 0.8 }, { t: 'kg/h', a: 'right', w: 0.7 }, { t: 'kg/día', a: 'right', w: 0.8 }, { t: 'Constancia', a: 'right', w: 1 }, { t: 'Mejor día', w: 1.5 }],
    filas: D.map(x => [x.t.nombre, String(x.dias), pdfKg(x.k, 1), num(redondear(x.h, 1)), { t: num(redondear(x.kh, 1)), b: true, color: x.kh >= MT.metaKgH ? 'ok' : 'alerta' }, num(Math.round(x.dias ? x.k / x.dias : 0)), { t: num(Math.round(x.cv)) + ' %', chip: x.cv < 15 ? 'ok' : x.cv < 30 ? 'alerta' : 'mal' }, x.mejor ? fechaPDF(x.mejor.f) + ' · ' + pdfKg(x.mejor.k) : '—']), primeraFuerte: true });
  const fechas = [...new Set(regs.map(x => x.fecha))].sort();
  if (fechas.length > 1) R.lineas({ cats: fechas.map(f => fechaCorta(f)), series: D.slice(0, 6).map((x, i) => ({ nombre: x.t.nombre, vals: fechas.map(f => { const d = x.porDia.find(z => z.f === f); return d ? d.kh : null; }), color: PDFC.serie[i % 6] })), fmt: v => num(redondear(v, 1)), alto: 62, titulo: 'kg por hora de cada recolector por día', min0: false });
  R.guardar(nombreArchivo('productividad-recolectores'));
}

/* ---------- 5. Tirilla de pago (rediseño) ---------- */
function generarPDFTirilla(trabajador, pago, adelantosAplicados) {
  if (!window.jspdf) { toast('No se pudo cargar el generador de PDF. Intente de nuevo.', 'err'); return; }
  const R = new InformePDF({ titulo: 'Comprobante de pago', subtitulo: pago.motivo || 'Pago de recolección', codigo: 'PAG', periodo: fechaPDF(pago.periodoInicio) + ' – ' + fechaPDF(pago.periodoFin), formato: 'a5', margen: 11 });
  R.portada({ alto: 40 });
  R.kv([['Trabajador', trabajador.nombre, true], ['Documento', trabajador.documento || '—'], ['Fecha de pago', fechaPDF(pago.fecha)], ['Tarifa por kilo', pdfPesos(pago.kgTotal ? pago.valorBruto / pago.kgTotal : n0(trabajador.tarifaPorKg))]], 2);
  const rs = registros.filter(x => x.trabajadorId === trabajador.id && x.fecha >= pago.periodoInicio && x.fecha <= pago.periodoFin).sort((a, b) => a.fecha.localeCompare(b.fecha));
  R.tabla({ cols: [{ t: 'Fecha', w: 1.1 }, { t: 'Lote', w: 1.5 }, { t: 'Horas', a: 'right', w: 0.7 }, { t: 'Kilos', a: 'right', w: 0.8 }, { t: 'Valor', a: 'right', w: 1.1 }], fs: 7.8,
    filas: rs.map(x => [fechaPDF(x.fecha), nombreLote(x.loteId) || x.lote || '—', num(x.horas || 0), num(redondear(x.kg, 1)), pdfPesos(pagoRegistro(x))]), total: ['Total', '', num(redondear(rs.reduce((a, x) => a + n0(x.horas), 0), 1)), num(redondear(pago.kgTotal, 1)), pdfPesos(pago.valorBruto)], vacio: 'Pago sin detalle de días.' });
  if ((adelantosAplicados || []).length) R.tabla({ titulo: 'Adelantos descontados', cols: [{ t: 'Fecha' }, { t: 'Motivo', w: 1.8 }, { t: 'Valor', a: 'right' }], fs: 7.8, filas: adelantosAplicados.map(a => [fechaPDF(a.fecha), a.motivo || '—', '−' + pdfPesos(a.valor)]) });
  R.asegurar(22); const d = R.doc; R.fill(PDFC.marcaOsc); d.roundedRect(R.x0, R.y, R.cw, 17, 2, 2, 'F'); R.espaciado(0.6); R.f('bold', 7, PDFC.oro); R.texto('NETO A PAGAR', R.x0 + 5, R.y + 7); R.espaciado(0); R.f('black', 16, PDFC.blanco); R.texto(pdfPesos(pago.valorNeto), R.x1 - 5, R.y + 11.5, { align: 'right' });
  R.f('normal', 6.8, [190, 214, 200]); R.texto(num(redondear(pago.kgTotal, 1)) + ' kg de cereza', R.x0 + 5, R.y + 12.5); R.y += 22;
  R.firmas([['Firma del trabajador', trabajador.nombre], ['Entrega', R.finca.nombre]]);
  R.guardar('tirilla-pago-' + trabajador.nombre.replace(/\s+/g, '-') + '-' + pago.fecha + '.pdf');
}

/* ---------- 6. Ficha técnica del lote ---------- */
function repFichaLote(p) {
  const l = lotes.find(x => x.id === p.lote) || lotesActivos()[0]; if (!l) { toast('No hay lotes.', 'err'); return; } const g = geomLote(l); const f = fincas.find(x => x.id === l.fincaId) || {};
  const R = new InformePDF({ titulo: 'Ficha técnica del lote', subtitulo: l.nombre + (g ? ' · código ' + g.cod : '') + ' · identificación, diseño, suelo, sanidad, producción, labores y costos', codigo: 'LOT', periodo: 'Al ' + fechaPDF(hoyLocal()), fincaId: l.fincaId }); R.portada();
  const img = imagenMaquetaLote(l, 'estructura', 1600, 1000); if (img) R.imagen(img, R.cw, R.cw * 1000 / 1600, 'Vista realista del lote con su forma, cafetos, sombrío y vía. Escala y norte en la imagen.');
  const pr = proyeccionLote(l) || {}; const ref = f.geoRef; const c = g ? centroidePol(g.poly) : null; const ll = c && ref && typeof desproyectar === 'function' ? desproyectar(c[0], c[1], ref) : null; const edad = edadLote(l);
  R.seccion(1, 'Identificación y diseño de siembra');
  R.kv([['Finca', f.nombre || '—', true], ['Código del lote', g ? g.cod : (l.codigo || '—'), true], ['Variedad', nombreVariedad(l.variedadId) || '—'], ['Fecha de siembra', l.fechaSiembra ? fechaPDF(l.fechaSiembra) : '—'], ['Edad', edad ? num(redondear(edad, 1)) + ' años' : '—'], ['Área registrada', num(n0(l.hectareas)) + ' ha'],
    ['Área de la forma', g ? num(redondear(g.haForma, 3)) + ' ha' : '—'], ['Fuente de la forma', (l.forma && l.forma.fuente) || 'esquemática'], ['Distancia surcos × plantas', g ? num(g.ds) + ' × ' + num(g.dp) + ' m' : '—'], ['Trazado', g ? (g.trazado === 'contorno' ? 'en curvas de nivel' : g.trazado) : '—'],
    ['Surcos', g ? num(g.nS) : '—'], ['Plantas trazadas', g ? num(g.total) : '—'], ['Plantas vivas', pr.vivas != null ? num(pr.vivas) : '—'], ['Plantas faltantes', pr.faltantes != null ? num(pr.faltantes) : '—', false, pr.faltantes ? 'alerta' : null],
    ['Densidad', g ? num(Math.round(g.total / g.ha)) + ' pl/ha' : '—'], ['Altitud', g ? num(Math.round(g.zmin)) + ' – ' + num(Math.round(g.zmax)) + ' msnm' : (f.altitud ? num(f.altitud) + ' msnm' : '—')], ['Pendiente media', g ? num(Math.round(g.pend)) + ' %' : '—'], ['Centro del lote', ll ? ll[0].toFixed(5) + ', ' + ll[1].toFixed(5) : '—']], 2);
  R.seccion(2, 'Estado sanitario y nutricional', 'Último muestreo de cada variable con su lectura frente al umbral.');
  const tipos = ['Broca', 'Roya', 'Sanidad general', 'Nutrición', 'Desarrollo', 'Frutos (proyección)', 'Floración', 'Maduración']; const fil = [];
  tipos.forEach(tp => { const cc = ultimaCampana(l.id, tp); if (!cc) return; const t = TIPOS_MUESTREO[tp]; const u = t.umbral ? t.umbral() : null; const pc = t.unidad === '%';
    fil.push([tp, fechaPDF(cc.fecha), String((cc.regs || []).length), num(redondear(cc.prom, 1)) + (pc ? ' %' : t.unidad ? ' ' + t.unidad : ''), num(redondear(cc.max != null ? cc.max : Math.max(...(cc.regs || [{ valor: 0 }]).map(x => n0(x.valor))), 1)), u == null ? { t: '—', suave: true } : (cc.prom <= u ? { t: 'En rango', chip: 'ok' } : cc.prom <= 2 * u ? { t: 'Sobre umbral', chip: 'alerta' } : { t: 'Crítico', chip: 'mal' })]); });
  R.tabla({ cols: [{ t: 'Variable', w: 1.7 }, { t: 'Fecha', w: 1.1 }, { t: 'Plantas', a: 'right', w: 0.8 }, { t: 'Promedio', a: 'right' }, { t: 'Máximo', a: 'right', w: 0.9 }, { t: 'Lectura', w: 1.2 }], filas: fil, vacio: 'Sin muestreos.' });
  const caps = [['Broca', 'Broca'], ['Roya', 'Roya'], ['Nutrición', 'Nutrición'], ['Maduración', 'Maduración']].filter(([k]) => ultimaCampana(l.id, k));
  for (let i = 0; i < caps.length; i += 2) { const par = caps.slice(i, i + 2); const w = (R.cw - 6) / 2, h = w * 0.78; R.asegurar(h + 10);
    R.columnas(2, par.map(([k, t]) => x => { x.f('bold', 8.2, PDFC.tinta); x.texto('Mapa de calor · ' + t, x.x0, x.y); x.y += 2.5; x.imagen(imagenMaquetaLote(l, k, 1100, 860), w, h); }), 6); }
  const su = suelos.filter(s => s.loteId === l.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  R.seccion(3, 'Suelo', su ? 'Análisis del ' + fechaLarga(su.fecha) + ' · ' + (su.laboratorio || '') + ' · ' + (su.textura || '') : 'Sin análisis de suelo registrado.');
  if (su) { const K = [['pH', 'pH', ''], ['MO', 'Materia orgánica', '%'], ['P', 'Fósforo', 'mg/kg'], ['K', 'Potasio', 'cmol/kg'], ['Ca', 'Calcio', 'cmol/kg'], ['Mg', 'Magnesio', 'cmol/kg'], ['Al', 'Aluminio', 'cmol/kg'], ['B', 'Boro', 'mg/kg'], ['CICE', 'CIC efectiva', 'cmol/kg']];
    R.tabla({ cols: [{ t: 'Elemento', w: 1.6 }, { t: 'Valor', a: 'right' }, { t: 'Unidad', w: 0.9 }, { t: 'Nivel', w: 1.4 }], filas: K.filter(([k]) => su[k] != null).map(([k, t, u]) => { const nv = nivelSuelo(k, su[k]); return [t, num(su[k]), u, { t: nv.n, chip: tonoSev(nv.t) }]; }) });
    const rec = recomendacionSuelo(su); if (rec && rec.productos) R.nota('Requerimiento orientativo por hectárea al año: N ' + num(rec.req.N) + ' kg · P2O5 ' + num(rec.req.P2O5) + ' kg · K2O ' + num(rec.req.K2O) + ' kg · MgO ' + num(rec.req.MgO) + ' kg' + (rec.cal ? ' · ' + rec.tipoCal + ' ' + num(rec.cal) + ' t/ha' : '') + '. Ver el informe de suelo y plan de fertilización para el detalle de productos.', 'info', 'Fertilización'); }
  R.seccion(4, 'Producción');
  const pas = pasadasCosecha().map(x => ({ x, rs: x.regs.filter(y => y.loteId === l.id) })).filter(o => o.rs.length).sort((a, b) => a.x.ini.localeCompare(b.x.ini));
  const ben = beneficios.filter(b => b.loteId === l.id);
  R.kpis([{ t: 'Cereza recolectada (año)', v: pdfKg(registros.filter(x => x.loteId === l.id && String(x.fecha).slice(0, 4) === hoyLocal().slice(0, 4)).reduce((a, x) => a + n0(x.kg), 0)) }, { t: 'Pergamino (año)', v: pdfKg(ben.filter(b => String(b.fecha).slice(0, 4) === hoyLocal().slice(0, 4)).reduce((a, b) => a + n0(b.kgSalida), 0), 1) },
    { t: 'Proyección de cereza', v: pr.kgCereza != null ? pdfKg(pr.kgCereza) : '—', s: pr.kgPerg ? num(redondear(pr.kgPerg / CARGA, 1)) + ' cargas estimadas' : '' }, { t: 'Rendimiento estimado', v: pr.kgPerg && g ? num(Math.round(pr.kgPerg / g.ha)) + ' kg/ha' : '—', s: 'pergamino seco' }], 4);
  R.tabla({ cols: [{ t: 'Pasada', w: 1.6 }, { t: 'Fechas', w: 1.8 }, { t: 'Recolectores', a: 'right', w: 0.9 }, { t: 'Cereza', a: 'right' }, { t: 'kg/h', a: 'right', w: 0.7 }], filas: pas.map(({ x, rs }) => { const k = rs.reduce((a, y) => a + n0(y.kg), 0), h = rs.reduce((a, y) => a + n0(y.horas), 0); return [x.tipo + ' · ' + x.pasada, fechaPDF(x.ini) + ' – ' + fechaPDF(x.fin), String(new Set(rs.map(y => y.trabajadorId)).size), pdfKg(k, 1), num(redondear(h ? k / h : 0, 1))]; }) });
  R.seccion(5, 'Labores realizadas', 'Últimos doce meses.');
  const lab = labores.filter(x => x.loteId === l.id && x.fecha >= sumarDias(hoyLocal(), -365)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  R.tabla({ cols: [{ t: 'Fecha', w: 1 }, { t: 'Labor', w: 2 }, { t: 'Insumos', w: 2 }, { t: 'Responsable', w: 1.2 }, { t: 'Costo', a: 'right', w: 1 }], fs: 7.8, filas: lab.map(x => [fechaPDF(x.fecha), x.tipo, x.insumo || '—', x.responsable || '—', pdfPesos(x.costo)]), total: ['Total', '', '', '', pdfPesos(lab.reduce((s, x) => s + n0(x.costo), 0))], vacio: 'Sin labores registradas.' });
  try { const an = hoyLocal().slice(0, 4); const cl = costosPorLote(an + '-01-01', hoyLocal()).find(x => x.l.id === l.id);
    if (cl) { R.seccion(6, 'Costos del lote en el año', 'Contabilidad de costos: directos del lote más la parte asignada de los costos comunes de la finca.');
      R.kpis([{ t: 'Costo total', v: pdfPesosM(cl.total), s: 'directo ' + pdfPesosM(cl.directo) + ' · asignado ' + pdfPesosM(cl.asignado) }, { t: 'Costo por carga', v: pdfPesosM(cl.porCarga) }, { t: 'Costo por hectárea', v: pdfPesosM(cl.porHa) }, { t: 'Margen de lo vendido', v: pdfPesosM(cl.margen), tono: cl.margen >= 0 ? 'ok' : 'mal' }], 4);
      R.kv([['Pergamino producido', pdfKg(cl.kg, 1)], ['Pergamino esperado en el año', pdfKg(cl.esperado, 1)], ['Pergamino vendido', pdfKg(cl.kgVend, 1)], ['Ingresos por ventas', pdfPesos(cl.ingresos)], ['Costo de lo vendido', pdfPesos(cl.costoVend)], ['Margen', pdfPesos(cl.margen), true]], 2); } } catch (e) {}
  R.guardar(nombreArchivo('ficha-lote-' + (g ? g.cod : l.nombre)));
}

/* ---------- 7. Informe fitosanitario y de muestreos ---------- */
function repSanidad(p) {
  const l = lotes.find(x => x.id === p.lote) || lotesActivos()[0]; if (!l) return; const g = geomLote(l); const cfg = cfgMapa();
  const R = new InformePDF({ titulo: 'Informe fitosanitario y de muestreos', subtitulo: l.nombre + ' · broca, roya, sanidad, nutrición y desarrollo con mapas de calor sobre la forma real', codigo: 'FIT', periodo: 'Al ' + fechaPDF(hoyLocal()), fincaId: l.fincaId }); R.portada();
  const vars = [['Broca', 'Broca', 'Porcentaje de frutos perforados en una rama del tercio medio.'], ['Roya', 'Roya', 'Porcentaje de hojas con lesiones de roya.'], ['Sanidad general', 'Sanidad general', 'Índice visual de 1 (sana) a 5 (muy afectada).'], ['Nutrición', 'Nutrición', 'Severidad visual de deficiencia de 0 a 4 y elemento observado.'], ['Desarrollo', 'Desarrollo', 'Altura de la planta en cm.']];
  let n = 0;
  vars.forEach(([tp, cap, desc]) => { const c = ultimaCampana(l.id, tp); if (!c) return; n++; const t = TIPOS_MUESTREO[tp]; const u = t.umbral ? t.umbral() : null; const pc = t.unidad === '%'; const hist = campanas(l.id, tp);
    R.seccion(n, tp, desc + ' Último muestreo: ' + fechaLarga(c.fecha) + ', ' + (c.regs || []).length + ' plantas.');
    const vals = (c.regs || []).map(x => n0(x.valor)); const sobre = u == null ? [] : (c.regs || []).filter(x => n0(x.valor) > u);
    R.kpis([{ t: 'Promedio', v: num(redondear(c.prom, 1)) + (pc ? ' %' : ''), tono: u == null ? 'marca' : c.prom <= u ? 'ok' : c.prom <= 2 * u ? 'alerta' : 'mal', s: u != null ? 'umbral ' + num(u) + (pc ? ' %' : '') : '' }, { t: 'Máximo', v: num(redondear(Math.max(...vals, 0), 1)) + (pc ? ' %' : '') }, { t: 'Plantas sobre umbral', v: u == null ? '—' : String(sobre.length), s: u == null ? '' : num(Math.round(sobre.length / (vals.length || 1) * 100)) + ' % de la muestra' }, { t: 'Tendencia', v: hist.length > 1 ? (hist[0].prom > hist[1].prom ? '▲ sube' : '▼ baja') : '—', s: hist.length > 1 ? 'antes ' + num(redondear(hist[1].prom, 1)) + (pc ? ' %' : '') : 'primer muestreo' }], 4);
    const w = R.cw * 0.6, h = w * 0.8; R.asegurar(h + 6); const y0 = R.y;
    R.columnas(2, [x => { x.imagen(imagenMaquetaLote(l, tp, 1200, 960), x.cw, x.cw * 0.8); }, x => { x.f('bold', 8.4, PDFC.tinta); x.texto(u != null ? 'Plantas sobre el umbral' : 'Plantas con mayor valor', x.x0, x.y + 2); x.y += 6;
      (u != null ? sobre : (c.regs || []).slice()).sort((a, b) => n0(b.valor) - n0(a.valor)).slice(0, 14).forEach(rg => { x.f('medium', 7.6, PDFC.tinta); x.texto(rg.codigo, x.x0, x.y); x.f('bold', 7.6, u != null ? PDFC.mal : PDFC.tinta); x.texto(num(redondear(rg.valor, 1)) + (pc ? ' %' : '') + (rg.opcion && rg.opcion !== 'Ninguna' ? ' · ' + rg.opcion : ''), x.x1, x.y, { align: 'right' }); x.draw(PDFC.linea, 0.12); x.doc.line(x.x0, x.y + 1.6, x.x1, x.y + 1.6); x.y += 5; });
      if (u != null && !sobre.length) { x.f('normal', 8, PDFC.ok); x.texto('Ninguna planta supera el umbral.', x.x0, x.y); x.y += 5; } }], 6); void y0;
    if (hist.length > 1) R.lineas({ cats: hist.slice().reverse().map(h => fechaCorta(h.fecha)), series: [{ nombre: tp, vals: hist.slice().reverse().map(h => h.prom), color: PDFC.cereza, area: true }], fmt: v => num(redondear(v, 1)), alto: 40, titulo: 'Historial de muestreos', der: pc ? '%' : '' });
    if (tp === 'Nutrición') { const cnt = {}; (c.regs || []).forEach(x => { if (x.opcion && x.opcion !== 'Ninguna') cnt[x.opcion] = (cnt[x.opcion] || 0) + 1; }); const it = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
      if (it.length) R.barrasH(it.map(([k, v]) => ({ t: k, v: v / (c.regs.length || 1) * 100, vt: num(Math.round(v / c.regs.length * 100)) + ' %', tono: 'mal' })), { titulo: 'Deficiencias observadas (% de plantas)', etiqueta: 44 }); }
    if (u != null && c.prom > u) R.nota(tp === 'Broca' ? 'Supera el umbral de ' + num(u) + ' %. Priorice el repase de frutos maduros, sobremaduros y caídos en los focos del mapa, y evalúe control según el manejo integrado de Cenicafé.' : tp === 'Roya' ? 'Supera el umbral de ' + num(u) + ' %. Revise el programa de control preventivo, especialmente con lluvias frecuentes.' : 'Supera el umbral de acción; revise los focos marcados en el mapa.', c.prom > 2 * u ? 'mal' : 'alerta', 'Acción recomendada'); });
  const fal = marcasPlanta.filter(m => m.loteId === l.id && m.estado === 'Faltante');
  if (g) { R.seccion(++n, 'Plantas faltantes', num(fal.length) + ' plantas faltantes de ' + num(g.total) + ' trazadas (' + num(redondear(fal.length / g.total * 100, 1)) + ' %).'); R.imagen(imagenMaquetaLote(l, 'faltantes', 1600, 1000), R.cw, R.cw * 1000 / 1600, 'Densidad de plantas faltantes (resiembra).');
    if (fal.length) R.tabla({ cols: [{ t: 'Código' }, { t: 'Surco', a: 'right' }, { t: 'Planta', a: 'right' }, { t: 'Marcada', a: 'right' }], fs: 7.6, filas: fal.slice(0, 60).map(x => { const pc = parseCodigo(x.codigo); return [x.codigo, String(pc.i), String(pc.j), fechaPDF(x.fecha)]; }), pie: fal.length > 60 ? 'Se muestran 60 de ' + fal.length + ' plantas.' : '' }); }
  void cfg; R.guardar(nombreArchivo('fitosanitario-' + (g ? g.cod : l.nombre)));
}

/* ---------- 8. Hoja de campo de muestreo (rediseño) ---------- */
function exportarHojaMuestreoPDF(planId) {
  const plan = planesMuestreo.find(p => p.id === planId); if (!plan) return; const l = lotes.find(x => x.id === plan.loteId); const g = geomLote(l); if (!g) return;
  if (!window.jspdf) { toast('No se pudo cargar el generador de PDF.', 'err'); return; } const t = TIPOS_MUESTREO[plan.tipo];
  const R = new InformePDF({ titulo: 'Hoja de campo · ' + plan.tipo, subtitulo: l.nombre + ' · ' + g.cod + ' · ' + plan.codigos.length + ' plantas a evaluar en el orden numerado', codigo: 'MUE', periodo: fechaPDF(plan.fecha), fincaId: l.fincaId }); R.portada({ alto: 42 });
  R.kv([['Responsable', plan.responsable || '________________'], ['Fecha', fechaPDF(plan.fecha)], ['Hora de inicio', '________'], ['Hora de terminación', '________']], 2);
  R.nota('Método: ' + t.desc + ' Recorra el lote en el orden numerado del croquis; si una planta falta, evalúe la siguiente del mismo surco y anótelo.', 'info', 'Instrucciones');
  try { const L = lienzoPDF(1600, 1000);
    if (L) { dibujarLote(L.ctx, L.W, L.H, l, g, Object.assign({}, PALETA_PDF), { zoom: 1, panX: 0, panY: 0 }, { capa: 'estructura', plan }); R.imagen(L.cv.toDataURL('image/png'), R.cw, R.cw * 1000 / 1600, 'Croquis técnico del lote con las plantas del plan numeradas.'); } } catch (e) { dlog('· croquis no disponible: ' + e.message); }
  R.tabla({ cols: [{ t: '#', w: 0.4 }, { t: 'Código', w: 1.4 }, { t: 'Surco / planta', w: 1 }].concat(t.campos.map(c => ({ t: c, w: 1.2 })), [{ t: 'Observación', w: 2 }]), fs: 8.4, zebra: true,
    filas: plan.codigos.map((cod, i) => { const pc = parseCodigo(cod); return [String(i + 1), { t: cod, b: true }, pc.i + ' / ' + pc.j].concat(t.campos.map(() => ' '), [' ']); }) });
  R.firmas([['Evaluó', plan.responsable || ''], ['Revisó', 'Jefe de campo']]);
  R.guardar('muestreo-' + pdfT(plan.tipo).split(' ')[0].toLowerCase() + '-' + g.cod + '-' + plan.fecha + '.pdf');
}
