/* ================= v20: informes de suelo, clima, planeación, comercial, finanzas y estrategia + centro de reportes ================= */

/* ---------- 9. Suelo y plan de fertilización ---------- */
function repSuelo(p) {
  const l = lotes.find(x => x.id === p.lote) || lotesActivos()[0]; if (!l) return; const an = suelos.filter(s => s.loteId === l.id).sort((a, b) => b.fecha.localeCompare(a.fecha)); const su = an[0];
  if (!su) { toast('El lote no tiene análisis de suelo registrado.', 'err'); return; }
  const R = new InformePDF({ titulo: 'Análisis de suelo y plan de fertilización', subtitulo: l.nombre + ' · interpretación, relaciones entre bases, enmiendas y dosis por planta', codigo: 'SUE', periodo: 'Análisis del ' + fechaPDF(su.fecha), fincaId: l.fincaId }); R.portada();
  R.kv([['Lote', l.nombre, true], ['Laboratorio', su.laboratorio || '—'], ['Profundidad', (su.profundidad || 20) + ' cm'], ['Textura', su.textura || '—'], ['Variedad', nombreVariedad(l.variedadId) || '—'], ['Edad del cultivo', num(redondear(edadLote(l) || 0, 1)) + ' años']], 2);
  R.seccion(1, 'Interpretación del análisis', 'Niveles frente a los rangos de referencia para café que usted puede ajustar en Suelo y clima.');
  const K = [['pH', 'pH', ''], ['MO', 'Materia orgánica', '%'], ['P', 'Fósforo (P)', 'mg/kg'], ['K', 'Potasio (K)', 'cmol/kg'], ['Ca', 'Calcio (Ca)', 'cmol/kg'], ['Mg', 'Magnesio (Mg)', 'cmol/kg'], ['Al', 'Aluminio (Al)', 'cmol/kg'], ['S', 'Azufre (S)', 'mg/kg'], ['B', 'Boro (B)', 'mg/kg'], ['Zn', 'Zinc (Zn)', 'mg/kg'], ['Cu', 'Cobre (Cu)', 'mg/kg'], ['Fe', 'Hierro (Fe)', 'mg/kg'], ['Mn', 'Manganeso (Mn)', 'mg/kg'], ['CICE', 'CIC efectiva', 'cmol/kg']];
  const prev = an[1];
  R.tabla({ cols: [{ t: 'Elemento', w: 1.7 }, { t: 'Resultado', a: 'right' }, { t: 'Unidad', w: 0.9 }, { t: 'Nivel', w: 1.4 }, { t: prev ? 'Análisis anterior (' + fechaPDF(prev.fecha) + ')' : 'Análisis anterior', a: 'right', w: 1.6 }],
    filas: K.filter(([k]) => su[k] != null).map(([k, t, u]) => { const nv = nivelSuelo(k, su[k]); return [t, { t: num(su[k]), b: true }, u, { t: nv.n, chip: tonoSev(nv.t) }, prev && prev[k] != null ? num(prev[k]) + (n0(su[k]) > n0(prev[k]) ? '  ▲' : n0(su[k]) < n0(prev[k]) ? '  ▼' : '') : '—']; }), primeraFuerte: true });
  R.tabla({ titulo: 'Relaciones entre bases', cols: [{ t: 'Relación', w: 2 }, { t: 'Valor', a: 'right' }, { t: 'Rango ideal', w: 1.4 }, { t: 'Lectura', w: 1 }],
    filas: relacionesSuelo(su).map(([t, v, rg, txt, u]) => [t, num(redondear(v, 1)) + (u ? ' ' + u : ''), txt, v >= rg[0] && v <= rg[1] ? { t: 'En rango', chip: 'ok' } : { t: v < rg[0] ? 'Baja' : 'Alta', chip: 'alerta' }]) });
  const rec = recomendacionSuelo(su);
  R.seccion(2, 'Plan de fertilización del año', 'Requerimiento ajustado por densidad (' + num(Math.round(rec.factores.dens)) + ' pl/ha) y edad del cultivo; ' + num(rec.factores.plantas) + ' plantas en ' + num(redondear(rec.factores.ha, 2)) + ' ha.');
  R.kpis([['N', rec.req.N], ['P2O5', rec.req.P2O5], ['K2O', rec.req.K2O], ['MgO', rec.req.MgO], ['S', rec.req.S]].map(([t, v]) => ({ t: t + ' kg/ha/año', v: num(Math.round(v)) })), 5);
  if (rec.cal) R.nota(rec.tipoCal + ': ' + num(rec.cal) + ' t/ha (' + num(Math.round(rec.cal * 1000 * rec.factores.ha)) + ' kg en el lote, ' + num(Math.ceil(rec.cal * 1000 * rec.factores.ha / 50)) + ' bultos de 50 kg). Aplíquela al menos un mes antes de fertilizar y con el suelo húmedo.', 'alerta', 'Enmienda');
  const tot = rec.productos.reduce((s, x) => s + n0(x.costo), 0);
  R.tabla({ cols: [{ t: 'Producto', w: 1.8 }, { t: 'kg/ha/año', a: 'right' }, { t: 'kg en el lote', a: 'right' }, { t: 'Bultos', a: 'right', w: 0.8 }, { t: 'g por planta por aplicación', a: 'right', w: 1.4 }, { t: 'Costo', a: 'right' }],
    filas: rec.productos.map(x => [x.nombre, num(Math.round(x.kgHa)), num(Math.round(x.kgLote)), num(redondear(x.bultos, 1)), num(Math.round(x.gPlanta)), pdfPesos(x.costo)]), total: ['Costo estimado de insumos del año', '', '', '', '', pdfPesos(tot)], primeraFuerte: true });
  const cfg = cfgSuelo(); const meses = (cfg.mesesFert || [3, 9]).map(m => MESES_L[m - 1]);
  R.nota('Dividido en ' + meses.length + ' aplicaciones (' + meses.join(' y ').toLowerCase() + '), con el suelo húmedo y la fertilización en media luna arriba de la planta en terreno pendiente. ' + (rec.notas || []).join(' '), 'info', 'Cómo aplicar');
  R.nota('Cálculo orientativo con los rangos y dosis de referencia que usted puede ajustar. Confírmelo con su asistente técnico o el extensionista del Comité de Cafeteros antes de comprar.', 'alerta');
  R.guardar(nombreArchivo('suelo-fertilizacion-' + l.nombre));
}

/* ---------- 10. Clima y balance hídrico ---------- */
function repClima(p) {
  const f = fincasActivas()[0] || fincas[0]; if (!f) return; const an = String(p.anio || hoyLocal().slice(0, 4)); const cl = climaDe(f.id).filter(x => String(x.fecha).slice(0, 4) === an); const cfg = cfgClima();
  const R = new InformePDF({ titulo: 'Clima y balance hídrico', subtitulo: 'Lluvia, temperatura, humedad, agua en el suelo, floraciones y alertas', codigo: 'CLI', periodo: 'Año ' + an, fincaId: f.id }); R.portada();
  const lluvia = cl.reduce((s, x) => s + n0(x.lluvia), 0); const dLl = cl.filter(x => n0(x.lluvia) >= 1).length; const tmed = cl.length ? cl.reduce((s, x) => s + (n0(x.tmax) + n0(x.tmin)) / 2, 0) / cl.length : 0; const res = resumenClima(f.id);
  const norm = (normalesFinca(f.id) || { vals: [] }).vals; const mesesN = Array.from({ length: 12 }, (_, i) => i);
  R.seccion(1, 'Resumen del año');
  R.kpis([{ t: 'Lluvia acumulada', v: num(Math.round(lluvia)) + ' mm', s: norm.length ? 'normal anual ' + num(norm.reduce((a, b) => a + b, 0)) + ' mm' : '' }, { t: 'Días con lluvia', v: num(dLl), s: 'de ' + num(cl.length) + ' registrados' }, { t: 'Temperatura media', v: num(redondear(tmed, 1)) + ' °C' }, { t: 'Agua en el suelo hoy', v: num(Math.round(res.humedad || 0)) + ' %', tono: (res.humedad || 0) < 40 ? 'alerta' : 'ok' }], 4);
  const porMes = mesesN.map(m => cl.filter(x => Number(String(x.fecha).slice(5, 7)) === m + 1)); const llM = porMes.map(a => a.length ? a.reduce((s, x) => s + n0(x.lluvia), 0) : null);
  R.barras({ cats: MESES_L.map(m => m.slice(0, 3)), series: [{ nombre: 'Lluvia ' + an + ' (mm)', vals: llM.map(v => v || 0), color: PDFC.serie[0] }].concat(norm.length ? [{ nombre: 'Normal (mm)', tipo: 'linea', vals: norm, color: PDFC.oro }] : []), fmt: v => num(Math.round(v)), alto: 60, titulo: 'Lluvia mensual frente a la normal', der: 'mm' });
  const tM = porMes.map(a => a.length ? a.reduce((s, x) => s + n0(x.tmax), 0) / a.length : null), tm = porMes.map(a => a.length ? a.reduce((s, x) => s + n0(x.tmin), 0) / a.length : null);
  R.lineas({ cats: MESES_L.map(m => m.slice(0, 3)), series: [{ nombre: 'Máxima (°C)', vals: tM, color: PDFC.serie[1] }, { nombre: 'Mínima (°C)', vals: tm, color: PDFC.serie[0] }], fmt: v => num(Math.round(v)), alto: 46, titulo: 'Temperatura promedio', min0: false });
  R.seccion(2, 'Balance hídrico', 'Agua disponible en el suelo (capacidad ' + num((cfg.balance || {}).cad || 120) + ' mm) según lluvia y evapotranspiración del cafetal.');
  const bal = balanceHidrico(f.id, sumarDias(hoyLocal(), -120));
  R.lineas({ cats: bal.map(b => fechaCorta(b.fecha)), series: [{ nombre: 'Agua en el suelo (%)', vals: bal.map(b => b.pct), color: PDFC.serie[2], area: true, puntos: false }], fmt: v => num(Math.round(v)), alto: 50, titulo: 'Últimos 120 días' });
  R.tabla({ cols: [{ t: 'Mes', w: 1 }, { t: 'Lluvia', a: 'right' }, { t: 'Normal', a: 'right' }, { t: 'Diferencia', a: 'right' }, { t: 'Días de lluvia', a: 'right' }, { t: 'T. máx.', a: 'right' }, { t: 'T. mín.', a: 'right' }, { t: 'Humedad rel.', a: 'right' }],
    filas: mesesN.filter(m => porMes[m].length).map(m => { const a = porMes[m]; const ll = llM[m]; const nn = norm[m]; return [MESES_L[m], num(Math.round(ll)) + ' mm', nn != null ? num(nn) + ' mm' : '—', nn ? { t: (ll >= nn ? '+' : '') + num(Math.round((ll - nn) / nn * 100)) + ' %', color: ll < nn * 0.6 ? 'alerta' : null } : '—', String(a.filter(x => n0(x.lluvia) >= 1).length), num(redondear(tM[m], 1)) + ' °C', num(redondear(tm[m], 1)) + ' °C', num(Math.round(a.reduce((s, x) => s + n0(x.hr), 0) / a.length)) + ' %']; }) });
  const al = alertasClima(f.id); R.seccion(3, 'Alertas y recomendaciones'); if (!al.length) R.nota('Sin alertas climáticas activas.', 'ok'); al.forEach(a => R.nota(a.txt, tonoSev(a.t)));
  R.guardar(nombreArchivo('clima-' + an));
}

/* ---------- 11. Plan agronómico anual ---------- */
function repPlanAgro(p) {
  const f = fincasActivas()[0] || fincas[0]; const an = Number(p.anio || hoyLocal().slice(0, 4)); const acts = actividadesAnio(an, f.id).map(a => ({ a, c: costoActividad(a), s: estadoActividad(a) })); const ls = lotesDeFinca(f.id);
  const R = new InformePDF({ titulo: 'Plan agronómico anual', subtitulo: 'Calendario de labores por lote, insumos, jornales, presupuesto y cumplimiento', codigo: 'AGR', periodo: 'Año ' + an, fincaId: f.id, horizontal: true }); R.portada({ alto: 42 });
  const tot = acts.reduce((s, x) => s + x.c.total, 0), ej = acts.filter(x => x.s.e === 'Ejecutada'); const venc = acts.filter(x => x.s.e === 'Vencida');
  R.kpis([{ t: 'Actividades', v: String(acts.length), s: ls.length + ' lote(s)' }, { t: 'Jornales', v: num(Math.round(acts.reduce((s, x) => s + x.c.jornales, 0))) }, { t: 'Presupuesto', v: pdfPesosM(tot) }, { t: 'Ejecutadas', v: String(ej.length), s: num(Math.round(ej.length / (acts.length || 1) * 100)) + ' %', tono: 'ok' }, { t: 'Vencidas', v: String(venc.length), tono: venc.length ? 'mal' : 'ok' }], 5);
  R.seccion(1, 'Calendario por lote');
  R.tabla({ cols: [{ t: 'Lote', w: 1.3 }].concat(MESES_L.map(m => ({ t: m.slice(0, 3), w: 1 }))), fs: 6.4, zebra: false,
    filas: ls.map(l => [l.nombre].concat(MESES_L.map((_, i) => acts.filter(x => x.a.loteId === l.id && x.a.mes === i + 1).map(x => (x.s.e === 'Ejecutada' ? '✓ ' : x.s.e === 'Vencida' ? '! ' : '') + x.a.tipo.replace(/\s*\(.*\)/, '').replace('Control de ', 'Ctrl. ').replace('Fertilización', 'Fertiliz.')).join('\n') || ' '))) });
  R.nota('• ejecutada · ! vencida sin ejecutar. Las actividades se marcan como ejecutadas al cerrar la orden de trabajo o registrar la labor del mismo tipo en el lote y el mes.', 'info');
  const porMes = MESES_L.map((_, i) => acts.filter(x => x.a.mes === i + 1).reduce((s, x) => s + x.c.total, 0)); const ejMes = MESES_L.map((_, i) => ej.filter(x => x.a.mes === i + 1).reduce((s, x) => s + n0(x.s.lab && x.s.lab.costo), 0));
  R.barras({ cats: MESES_L.map(m => m.slice(0, 3)), series: [{ nombre: 'Presupuesto', vals: porMes, color: PDFC.lavado2.map(v => v - 40) }, { nombre: 'Ejecutado', vals: ejMes, color: PDFC.marca }], fmt: fmtCorto, alto: 52, titulo: 'Presupuesto y ejecución por mes' });
  R.seccion(2, 'Detalle de actividades');
  R.tabla({ cols: [{ t: 'Mes', w: 0.8 }, { t: 'Lote', w: 1.2 }, { t: 'Labor', w: 2.2 }, { t: 'Insumos', w: 2.6 }, { t: 'Jornales', a: 'right', w: 0.8 }, { t: 'Mano de obra', a: 'right', w: 1.1 }, { t: 'Insumos', a: 'right', w: 1.1 }, { t: 'Total', a: 'right', w: 1.1 }, { t: 'Estado', w: 1 }], fs: 7.4,
    filas: acts.sort((x, y) => x.a.mes - y.a.mes).map(x => [MESES_L[x.a.mes - 1].slice(0, 3), nombreLote(x.a.loteId), x.a.tipo, (x.a.insumos || []).map(i => i.nombre + ' ' + num(Math.round(i.cantHa * x.c.ha)) + ' ' + i.unidad).join(', ') || '—', num(redondear(x.c.jornales, 1)), pdfPesos(x.c.mo), pdfPesos(x.c.ins), { t: pdfPesos(x.c.total), b: true }, { t: x.s.e, chip: x.s.e === 'Ejecutada' ? 'ok' : x.s.e === 'Vencida' ? 'mal' : 'info' }]),
    total: ['Total', '', '', '', num(Math.round(acts.reduce((s, x) => s + x.c.jornales, 0))), pdfPesos(acts.reduce((s, x) => s + x.c.mo, 0)), pdfPesos(acts.reduce((s, x) => s + x.c.ins, 0)), pdfPesos(tot), ''] });
  R.guardar(nombreArchivo('plan-agronomico-' + an));
}

/* ---------- 12. Orden de trabajo (rediseño) ---------- */
function exportarOTPDF(id) {
  const o = ordenes.find(x => x.id === id); if (!o) return; if (!window.jspdf) { toast('No se pudo cargar el generador de PDF.', 'err'); return; }
  const lote = lotes.find(l => l.id === o.loteId) || {}; const pre = o.presupuesto || {};
  const R = new InformePDF({ titulo: 'Orden de trabajo ' + o.numero, subtitulo: o.tipo + ' · ' + (lote.nombre || '') + (o.prioridad === 'Alta' ? ' · PRIORIDAD ALTA' : ''), codigo: 'OT', periodo: diaSemana(o.fechaProgramada) + ' ' + fechaPDF(o.fechaProgramada), fincaId: lote.fincaId }); R.portada({ alto: 44 });
  R.kpis([{ t: 'Estado', v: o.estado, tono: o.estado === 'Cerrada' ? 'ok' : o.prioridad === 'Alta' ? 'mal' : 'marca' }, { t: 'Área', v: num(redondear(o.area, 2)) + ' ha' }, { t: 'Jornales previstos', v: num(redondear(pre.jornales, 1)), s: (o.trabajadores || 1) + ' trabajador(es)' }, { t: 'Presupuesto', v: pdfPesos(pre.total), s: 'mano de obra ' + pdfPesosM(pre.manoObra) }], 4);
  R.seccion(1, 'Ubicación y responsables');
  R.kv([['Finca', nombreFinca(lote.fincaId) || '—', true], ['Lote', (lote.nombre || '—') + (lote.variedadId ? ' · ' + nombreVariedad(lote.variedadId) : ''), true], ['Fecha programada', diaSemana(o.fechaProgramada) + ' ' + fechaPDF(o.fechaProgramada)], ['Responsable', o.responsable || 'Sin asignar'], ['Emitida por', 'Jefe de campo'], ['Prioridad', o.prioridad || 'Media']], 2);
  const img = lote.id ? imagenMaquetaLote(lote, 'estructura', 1500, 820) : null; if (img) R.imagen(img, R.cw, R.cw * 820 / 1500, 'Ubicación del lote a intervenir.');
  R.seccion(2, 'Labor a realizar'); R.parrafo(o.tipo, { estilo: 'bold', tam: 11, color: PDFC.tinta }); R.parrafo(o.especificacion || 'Sin especificación técnica.');
  R.columnas(2, [x => { x.subtitulo('Herramientas y equipos'); x.parrafo(o.herramientas || '—'); }, x => { x.subtitulo('Elementos de protección (EPP)'); x.parrafo(o.epp || '—'); }]);
  R.tabla({ titulo: 'Insumos a entregar', cols: [{ t: 'Producto', w: 2.2 }, { t: 'Cantidad', a: 'right' }, { t: 'Unidad', w: 0.8 }, { t: 'Costo', a: 'right' }, { t: 'Entregado', w: 1 }, { t: 'Devuelto', w: 1 }], filas: (o.insumos || []).map(i => [i.nombre, num(redondear(i.cantidad, 2)), i.unidad, pdfPesos(n0(i.cantidad) * n0(i.costoUnit)), '________', '________']), vacio: 'Esta labor no requiere insumos.' });
  R.seccion(3, 'Registro de ejecución', 'Diligenciar en campo y entregar a administración.');
  R.tabla({ cols: [{ t: 'Fecha de ejecución' }, { t: 'Hora de inicio' }, { t: 'Hora de terminación' }, { t: 'Jornales reales' }, { t: 'Avance (%)' }, { t: 'Área ejecutada (ha)' }], filas: [[' ', ' ', ' ', ' ', ' ', ' '], [' ', ' ', ' ', ' ', ' ', ' ']], zebra: false });
  R.subtitulo('Observaciones y novedades'); for (let k = 0; k < 4; k++) { R.asegurar(8); R.y += 7; R.draw(PDFC.linea, 0.25); R.doc.line(R.x0, R.y, R.x1, R.y); } R.y += 4;
  R.firmas([['Emite', 'Jefe de campo'], ['Recibe', 'Jefe de cuadrilla'], ['Verifica', 'Administración']]);
  R.guardar('orden-' + o.numero + '-' + pdfT(nombreLote(o.loteId)).replace(/\s+/g, '-') + '.pdf');
  if (o.estado === 'Programada') { o.estado = 'Emitida'; o.emitida = hoyLocal(); guardarEstado(); renderPlaneacion(); verOT(o.id); }
}

/* ---------- 13. Plan semanal (rediseño) ---------- */
function exportarPlanSemanalPDF() {
  if (!window.jspdf) { toast('No se pudo cargar el generador de PDF.', 'err'); return; }
  const ini = semanaBase, fin = sumarDias(ini, 6); const ots = otsDeSemana(ini).sort((a, b) => (a.fechaProgramada || '').localeCompare(b.fechaProgramada || '') || (ORDEN_PRIORIDAD[a.prioridad] ?? 1) - (ORDEN_PRIORIDAD[b.prioridad] ?? 1));
  if (!ots.length) { toast('La semana ' + semanaISO(ini) + ' no tiene órdenes programadas.', 'err'); return; }
  const R = new InformePDF({ titulo: 'Plan semanal de labores · semana ' + semanaISO(ini), subtitulo: 'Órdenes de trabajo, responsables, jornales, presupuesto e insumos a alistar', codigo: 'SEM', periodo: fechaPDF(ini) + ' – ' + fechaPDF(fin), horizontal: true }); R.portada({ alto: 42 });
  const tj = ots.reduce((s, o) => s + n0(o.presupuesto && o.presupuesto.jornales), 0), tp = ots.reduce((s, o) => s + n0(o.presupuesto && o.presupuesto.total), 0);
  R.kpis([{ t: 'Órdenes', v: String(ots.length), s: ots.filter(o => o.prioridad === 'Alta').length + ' de prioridad alta' }, { t: 'Jornales', v: num(redondear(tj, 1)) }, { t: 'Presupuesto', v: pdfPesos(tp) }, { t: 'Lotes', v: String(new Set(ots.map(o => o.loteId)).size) }], 4);
  R.tabla({ cols: [{ t: 'Día', w: 1.1 }, { t: 'OT', w: 0.8 }, { t: 'Labor', w: 2.4 }, { t: 'Lote', w: 1.4 }, { t: 'Área', a: 'right', w: 0.6 }, { t: 'Responsable', w: 1.3 }, { t: 'Trab.', a: 'right', w: 0.5 }, { t: 'Jornales', a: 'right', w: 0.7 }, { t: 'Presupuesto', a: 'right', w: 1.1 }, { t: 'Estado', w: 1 }], fs: 7.8,
    filas: ots.map(o => [diaSemana(o.fechaProgramada) + ' ' + fechaCorta(o.fechaProgramada), { t: o.numero, b: true }, o.tipo, nombreLote(o.loteId), num(redondear(o.area, 2)), o.responsable || '—', String(o.trabajadores || 1), num(redondear(o.presupuesto && o.presupuesto.jornales, 1)), pdfPesos(o.presupuesto && o.presupuesto.total), { t: o.estado + (o.prioridad === 'Alta' ? ' · alta' : ''), chip: o.prioridad === 'Alta' ? 'mal' : o.estado === 'Cerrada' ? 'ok' : 'info' }]),
    total: ['Total semana', String(ots.length), '', '', '', '', '', num(redondear(tj, 1)), pdfPesos(tp), ''] });
  const req = consolidarInsumos(ots.filter(o => o.estado !== 'Cerrada'));
  if (req.length) R.tabla({ titulo: 'Insumos a alistar en bodega', cols: [{ t: 'Producto', w: 2.5 }, { t: 'Cantidad', a: 'right' }, { t: 'Unidad' }, { t: 'Valor', a: 'right' }, { t: 'Alistado', w: 1 }], filas: req.map(x => [x.nombre, num(redondear(x.cantidad, 2)), x.unidad, pdfPesos(x.valor), '☐']) });
  R.nota('Mano de obra = jornales × (valor del jornal + alimentación). Cada orden tiene su propio formato con el registro de ejecución.', 'info');
  R.firmas([['Elaboró', 'Jefe de campo'], ['Aprobó', 'Administración']]);
  R.guardar('plan-semanal-S' + semanaISO(ini) + '-' + parseFecha(ini).getUTCFullYear() + '.pdf');
}

/* ---------- 14. Ventas ---------- */
function repVentas(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const vs = ventas.filter(v => String(v.fecha).slice(0, 4) === an).sort((a, b) => a.fecha.localeCompare(b.fecha)); const val = vs.map(v => ({ v, x: valorVenta(v), s: saldoVenta(v) }));
  const R = new InformePDF({ titulo: 'Informe comercial de ventas', subtitulo: 'Ventas, precios, compradores, calidad, partidas y cartera', codigo: 'VEN', periodo: 'Año ' + an }); R.portada();
  const kg = vs.reduce((s, v) => s + n0(v.kg), 0), neto = val.reduce((s, o) => s + o.x.neto, 0), bruto = val.reduce((s, o) => s + o.x.bruto, 0), sal = val.reduce((s, o) => s + o.s, 0); const ref = precioRefCarga().v;
  R.kpis([{ t: 'Ventas netas', v: pdfPesosM(neto), s: vs.length + ' ventas' }, { t: 'Pergamino vendido', v: num(redondear(kg / CARGA, 2)) + ' cargas', s: pdfKg(kg, 1) }, { t: 'Precio promedio', v: kg ? pdfPesosM(bruto / kg * CARGA) : '—', s: 'por carga de 125 kg' }, { t: 'Por cobrar', v: pdfPesosM(sal), tono: sal > 0 ? 'alerta' : 'ok' }], 4);
  R.seccion(1, 'Detalle de ventas');
  R.tabla({ cols: [{ t: 'Fecha', w: 0.9 }, { t: 'Comprador', w: 2 }, { t: 'Documento', w: 1.1 }, { t: 'Partidas', w: 1.2 }, { t: 'Kilos', a: 'right', w: 0.8 }, { t: '$ / carga', a: 'right', w: 1 }, { t: 'Neto', a: 'right', w: 1.1 }, { t: 'Cobro', w: 1 }], fs: 7.8,
    filas: val.map(({ v, x, s }) => [fechaPDF(v.fecha), terceroNombre(v.terceroId, v.comprador), v.documento || '—', (v.partidas || []).map(q => (partidas.find(z => z.id === q.partidaId) || {}).codigo).filter(Boolean).join(', ') || '—', num(redondear(v.kg, 1)), pdfPesos(n0(v.precio) * CARGA), pdfPesos(x.neto), s > 0.5 ? { t: 'Debe ' + pdfPesosM(s), chip: 'alerta' } : { t: 'Cobrada', chip: 'ok' }]),
    total: ['Total', '', '', '', num(redondear(kg, 1)), kg ? pdfPesos(bruto / kg * CARGA) : '', pdfPesos(neto), sal ? pdfPesosM(sal) : ''], vacio: 'Sin ventas en el año.' });
  const porC = {}; val.forEach(({ v, x }) => { const k = terceroNombre(v.terceroId, v.comprador); porC[k] = porC[k] || { v: 0, kg: 0 }; porC[k].v += x.neto; porC[k].kg += n0(v.kg); });
  R.columnas(2, [x => { x.dona(Object.entries(porC).map(([k, o]) => ({ t: k.replace(' (ejemplo)', ''), v: o.v, vt: pdfPesosM(o.v) })), { titulo: 'Por comprador', radio: 15, centro: pdfPesosM(neto), centroSub: 'ventas netas' }); },
    x => { x.lineas({ cats: vs.map(v => fechaCorta(v.fecha)), series: [{ nombre: 'Precio por carga', vals: vs.map(v => n0(v.precio) * CARGA), color: PDFC.oro }], fmt: v => '$' + (v / 1e6).toFixed(2).replace('.', ',') + ' M', alto: 44, titulo: 'Precio por carga en cada venta', min0: false, refs: ref ? [{ v: ref, t: 'Referencia' }] : [] }); }], 8);
  const cart = cartera().cxc; R.seccion(2, 'Cartera por cobrar');
  R.tabla({ cols: [{ t: 'Comprador', w: 2 }, { t: 'Fecha', w: 1 }, { t: 'Vence', w: 1 }, { t: 'Días', a: 'right', w: 0.7 }, { t: 'Saldo', a: 'right' }], filas: cart.map(c => [c.tercero, fechaPDF(c.fecha), fechaPDF(c.vence), { t: c.dias > 0 ? c.dias + ' vencida' : String(-c.dias) + ' por vencer', color: c.dias > 0 ? 'mal' : null }, pdfPesos(c.saldo)]), total: ['Total', '', '', '', pdfPesos(cart.reduce((s, c) => s + c.saldo, 0))], vacio: 'Sin cuentas por cobrar.' });
  R.guardar(nombreArchivo('ventas-' + an));
}

/* ---------- 15. Certificado de trazabilidad (rediseño) ---------- */
function repTraza(p) {
  const v = ventas.find(x => x.id === p.venta) || ventas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; if (!v) { toast('No hay ventas registradas.', 'err'); return; }
  const o = origenVenta(v); const lista = []; o.partes.forEach(q => q.beneficios.forEach(b => lista.push(b))); const t = trazaDeBeneficios(lista); const x = valorVenta(v); const tot = lista.reduce((s, z) => s + z.kg, 0) || 1;
  const R = new InformePDF({ titulo: 'Certificado de origen y trazabilidad', subtitulo: 'Del lote y la planta hasta el comprador · ' + trazaCodigo(v), codigo: 'TRZ', periodo: 'Venta del ' + fechaPDF(v.fecha) }); R.portada();
  R.kpis([{ t: 'Comprador', v: terceroNombre(v.terceroId, v.comprador).replace(' (ejemplo)', '') }, { t: 'Cantidad', v: pdfKg(v.kg, 1), s: num(redondear(v.kg / CARGA, 2)) + ' cargas' }, { t: 'Código de trazabilidad', v: trazaCodigo(v) }, { t: 'Valor neto', v: pdfPesosM(x.neto) }], 4);
  R.seccion(1, 'Origen', 'Finca, lote, variedad, altitud y ubicación del café vendido.');
  t.lotes.forEach(li => { const ref = li.f.geoRef; const c = li.g ? centroidePol(li.g.poly) : null; const ll = c && ref ? desproyectar(c[0], c[1], ref) : null;
    R.kv([['Finca', li.f.nombre || '—', true], ['Ubicación', [li.f.vereda && 'Vereda ' + li.f.vereda, li.f.municipio, li.f.departamento].filter(Boolean).join(', ') || '—'], ['Lote', li.l.nombre + ' · ' + num(Math.round(li.kg / tot * 100)) + ' % del café', true], ['Variedad', li.variedad || '—'], ['Altitud', li.g ? num(Math.round(li.g.zmin)) + ' – ' + num(Math.round(li.g.zmax)) + ' msnm' : '—'], ['Área del lote', li.g ? num(redondear(li.g.ha, 2)) + ' ha' : '—'], ['Coordenadas', ll ? ll[0].toFixed(5) + ', ' + ll[1].toFixed(5) : '—'], ['Plantas', li.g ? num(li.g.total) : '—']], 2);
    const img = imagenMaquetaLote(li.l, 'estructura', 1500, 820); if (img) R.imagen(img, R.cw, R.cw * 820 / 1500, li.l.nombre + ' · vista realista con su forma y sombrío.'); });
  R.seccion(2, 'Cosecha y beneficio');
  R.kv([['Recolección', t.ini ? fechaPDF(t.ini) + ' – ' + fechaPDF(t.fin) : '—'], ['Cereza atribuida', pdfKg(t.kgCereza) + ' en ' + t.jornadas + ' jornadas'], ['Recolectores', String(t.recolectores.length)], ['Exactitud del origen', o.exacto ? 'exacta por partidas' : 'estimada por antigüedad']], 2);
  R.tabla({ cols: [{ t: 'Partida', w: 1 }, { t: 'Beneficio', w: 1 }, { t: 'Lote', w: 1.3 }, { t: 'Proceso', w: 1 }, { t: 'Fermentación', a: 'right' }, { t: 'Secado', w: 1.3 }, { t: 'Kilos', a: 'right' }],
    filas: o.partes.flatMap(q => q.beneficios.map(b => [q.partida.codigo, fechaPDF(b.b.fecha), nombreLote(b.b.loteId), b.b.metodo || '—', b.b.fermentacionHoras ? b.b.fermentacionHoras + ' h' : '—', b.b.secado || '—', pdfKg(b.kg, 1)])) });
  const pq = o.partes.map(q => q.partida).filter(q => q.humedad || q.factor || q.taza);
  if (pq.length) R.tabla({ titulo: 'Calidad física y en taza', cols: [{ t: 'Partida' }, { t: 'Humedad', a: 'right' }, { t: 'Factor de rendimiento', a: 'right' }, { t: 'Puntaje de taza', a: 'right' }], filas: pq.map(q => [q.codigo, q.humedad ? num(q.humedad) + ' %' : '—', q.factor ? num(q.factor) : '—', q.taza ? { t: num(q.taza), b: true } : '—']) });
  R.seccion(3, 'Manejo del cultivo', 'Labores aplicadas en los once meses previos a la cosecha.');
  const lab = t.lotes.flatMap(li => li.lab.map(lb => ({ lb, l: li.l }))).sort((a, b) => a.lb.fecha.localeCompare(b.lb.fecha));
  R.tabla({ cols: [{ t: 'Fecha', w: 0.9 }, { t: 'Lote', w: 1.2 }, { t: 'Labor', w: 2 }, { t: 'Insumos', w: 2.2 }], fs: 7.6, filas: lab.map(({ lb, l }) => [fechaPDF(lb.fecha), l.nombre, lb.tipo, lb.insumo || '—']), vacio: 'Sin labores registradas.' });
  t.lotes.forEach(li => { if (li.carencia != null) R.nota('Última aplicación fitosanitaria en ' + li.l.nombre + ': ' + li.carencia + ' días antes de iniciar la cosecha.', li.carencia >= 30 ? 'ok' : 'alerta', 'Periodo de carencia'); });
  R.firmas([['Certifica', 'Propietario de la finca'], ['Recibe', terceroNombre(v.terceroId, v.comprador)]]);
  R.o.pieNota = 'La cosecha se atribuye a cada beneficio por las fechas de registro del mismo lote · Ref. ' + R.ref;
  R.guardar('trazabilidad-' + trazaCodigo(v).toLowerCase() + '.pdf');
}
function fichaTrazaPDF() { const T = window._traza; if (T && T.esVenta && T.cab) return repTraza({ venta: T.cab.id }); if (coSt.trazaVenta) return repTraza({ venta: coSt.trazaVenta }); return repTraza({}); }

/* ---------- 16. Estados financieros ---------- */
function repEstados(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const d = an + '-01-01', h = an + '-12-31'; const corte = h > hoyLocal() ? hoyLocal() : h;
  const er = estadoResultados(d, h), ep = estadoResultados((an - 1) + '-01-01', (an - 1) + '-12-31'); const bg = balanceGeneral(corte); const I = indicadores({ desde: d, hasta: h });
  const R = new InformePDF({ titulo: 'Estados financieros', subtitulo: 'Estado de resultados, balance general, indicadores y notas', codigo: 'EEF', periodo: 'Año ' + an + ' · corte ' + fechaPDF(corte) }); R.portada();
  R.kpis([{ t: 'Ingresos', v: pdfPesosM(er.ingresos) }, { t: 'Utilidad bruta', v: pdfPesosM(er.bruta), s: I.margenBruto != null ? 'margen ' + pdfPct(I.margenBruto) : '' }, { t: 'Resultado antes de impuestos', v: pdfPesosM(er.antes), tono: er.antes >= 0 ? 'ok' : 'mal' }, { t: 'EBITDA', v: pdfPesosM(I.ebitda) }], 4);
  R.seccion(1, 'Estado de resultados', 'Comparado con el año anterior. Inventario valorado al costo de producción (promedio ponderado).');
  const f2 = (t, a, b, o) => [Object.assign({ t }, o || {}), Object.assign({ t: pdfPesos(a) }, o || {}), Object.assign({ t: pdfPesos(b) }, o || {}), b ? { t: ((a - b) / Math.abs(b) * 100 >= 0 ? '+' : '') + num(redondear((a - b) / Math.abs(b) * 100, 1)) + ' %', color: a - b >= 0 ? 'ok' : 'mal' } : '—', er.ingresos ? num(redondear(a / er.ingresos * 100, 1)) + ' %' : '—'];
  const det = (arr, arr2, neg) => arr.map(x => f2('     ' + nomCuenta(x.cod), neg ? -x.v : x.v, neg ? -((arr2 || []).find(y => y.cod === x.cod) || { v: 0 }).v : ((arr2 || []).find(y => y.cod === x.cod) || { v: 0 }).v, { suave: true }));
  R.tabla({ cols: [{ t: 'Concepto', w: 2.6 }, { t: an, a: 'right' }, { t: String(an - 1), a: 'right' }, { t: 'Variación', a: 'right', w: 0.8 }, { t: '% ingresos', a: 'right', w: 0.8 }], fs: 8, zebra: false,
    filas: [f2('Ventas de café', er.ventasBrutas, ep.ventasBrutas), f2('(−) Descuentos', -er.desc, -ep.desc), f2('Ingresos operacionales', er.ingresos, ep.ingresos, { b: true }), f2('(−) Costo del café vendido', -er.costo, -ep.costo), f2('Utilidad bruta', er.bruta, ep.bruta, { b: true }),
      f2('(−) Gastos de administración', -er.adm, -ep.adm)].concat(det(er.dAdm, ep.dAdm, true), [f2('(−) Gastos de ventas', -er.vent, -ep.vent), f2('Utilidad operacional', er.oper, ep.oper, { b: true }), f2('(+) Otros ingresos', er.otrosIng, ep.otrosIng), f2('(−) Gastos financieros', -er.fin, -ep.fin)]),
    total: f2('Resultado antes de impuestos', er.antes, ep.antes), fondo: f => /Utilidad|Ingresos operacionales/.test(f[0].t || '') ? 'lavado' : null });
  R.tabla({ titulo: 'Costo de producción del año', cols: [{ t: 'Cuenta', w: 2.4 }, { t: 'Valor', a: 'right' }, { t: 'Participación', w: 1.6 }], filas: er.costosProd.map(x => [nomCuenta(x.cod), pdfPesos(x.v), { t: num(Math.round(x.v / (er.totalProd || 1) * 100)) + ' %', barra: x.v / (er.totalProd || 1) }]), total: ['Total incurrido · ' + num(Math.round(er.kgProd)) + ' kg de pergamino', pdfPesos(er.totalProd), er.kgProd ? pdfPesos(er.totalProd / er.kgProd * CARGA) + ' / carga' : ''] });
  R.seccion(2, 'Balance general', 'Al ' + fechaLarga(corte) + '.');
  const fil = arr => arr.map(x => ['     ' + x.cod + ' · ' + nomCuenta(x.cod), pdfPesos(x.v)]);
  R.columnas(2, [x => { x.tabla({ cols: [{ t: 'Activo', w: 2.4 }, { t: 'Valor', a: 'right' }], fs: 7.6, filas: [[{ t: 'Activo corriente', b: true }, { t: pdfPesos(bg.totCorr), b: true }]].concat(fil(bg.corr), [[{ t: 'Activo no corriente', b: true }, { t: pdfPesos(bg.activo - bg.totCorr), b: true }]], fil(bg.nocorr)), total: ['Total activo', pdfPesos(bg.activo)], zebra: false }); },
    x => { x.tabla({ cols: [{ t: 'Pasivo y patrimonio', w: 2.4 }, { t: 'Valor', a: 'right' }], fs: 7.6, filas: [[{ t: 'Pasivo corriente', b: true }, { t: pdfPesos(bg.totPasC), b: true }]].concat(fil(bg.pasC), [[{ t: 'Pasivo no corriente', b: true }, { t: pdfPesos(bg.pasivo - bg.totPasC), b: true }]], fil(bg.pasL), [[{ t: 'Patrimonio', b: true }, { t: pdfPesos(bg.patrimonio), b: true }], ['     Capital y aportes', pdfPesos(bg.cap)], ['     Resultados de ejercicios anteriores', pdfPesos(bg.resultadosAnt)], ['     Resultado del ejercicio', pdfPesos(bg.resultadoAnio)]]), total: ['Total pasivo y patrimonio', pdfPesos(bg.pasivo + bg.patrimonio)], zebra: false }); }], 8);
  if (Math.abs(bg.dif || 0) > 1) R.nota('Diferencia de cuadre: ' + pdfPesos(bg.dif), 'mal');
  R.seccion(3, 'Indicadores financieros');
  R.tabla({ cols: [{ t: 'Indicador', w: 2 }, { t: 'Valor', a: 'right' }, { t: 'Cómo se calcula', w: 3 }], fs: 7.8, filas: [['Margen bruto', pdfPct(I.margenBruto), 'Utilidad bruta ÷ ingresos'], ['Margen antes de impuestos', pdfPct(I.margenNeto), 'Resultado antes de impuestos ÷ ingresos'], ['Rentabilidad del activo (ROA)', pdfPct(I.roa), 'Resultado ÷ activo total'],
    ['Liquidez corriente', I.liquidez == null ? '—' : num(redondear(I.liquidez, 2)) + ' veces', 'Activo corriente ÷ pasivo corriente'], ['Prueba ácida', I.acida == null ? '—' : num(redondear(I.acida, 2)) + ' veces', '(Activo corriente − inventarios) ÷ pasivo corriente'], ['Endeudamiento', pdfPct(I.endeud), 'Pasivo ÷ activo'],
    ['Días de cartera', I.diasCartera == null ? '—' : num(Math.round(I.diasCartera)) + ' días', 'Cuentas por cobrar ÷ ventas diarias (90 días)'], ['Costo de producción por carga', I.costoCargaProd == null ? '—' : pdfPesos(I.costoCargaProd), 'Costo cargado al pergamino ÷ cargas producidas'], ['Punto de equilibrio', I.eqCargas == null ? '—' : num(redondear(I.eqCargas, 1)) + ' cargas', 'Costos fijos ÷ margen por carga']] });
  R.nota('Contabilidad de gestión generada automáticamente a partir de la cosecha, labores, ventas, nómina, activos y movimientos registrados. No reemplaza los estados financieros certificados por un contador público.', 'info');
  R.guardar(nombreArchivo('estados-financieros-' + an));
}

/* ---------- 17. Flujo de caja ---------- */
function repFlujo(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const meses = mesesEntre(an + '-01-01', an === hoyLocal().slice(0, 4) ? hoyLocal() : an + '-12-31'); const F = flujoEfectivo(meses); const P = proyeccionCaja(3);
  const R = new InformePDF({ titulo: 'Flujo de caja', subtitulo: 'Entradas y salidas de efectivo por mes y proyección de los próximos tres meses', codigo: 'FLU', periodo: 'Año ' + an, horizontal: true }); R.portada({ alto: 42 });
  const tE = F.reduce((s, x) => s + x.tEntra, 0), tS = F.reduce((s, x) => s + x.tSale, 0);
  R.kpis([{ t: 'Saldo inicial', v: pdfPesosM(F[0] ? F[0].ini : 0) }, { t: 'Entradas', v: pdfPesosM(tE), tono: 'ok' }, { t: 'Salidas', v: pdfPesosM(tS), tono: 'mal' }, { t: 'Saldo final', v: pdfPesosM(F.length ? F[F.length - 1].fin : 0) }, { t: 'Saldo proyectado', v: pdfPesosM(P.length ? P[P.length - 1].saldo : 0), s: P.length ? 'a ' + mesCorto(P[P.length - 1].m) : '' }], 5);
  R.barras({ cats: F.map(x => mesCorto(x.m)), series: [{ nombre: 'Entradas', vals: F.map(x => x.tEntra), color: PDFC.serie[2] }, { nombre: 'Salidas', vals: F.map(x => x.tSale), color: PDFC.serie[1] }, { nombre: 'Saldo', tipo: 'linea', vals: F.map(x => x.fin), color: PDFC.tinta }], fmt: fmtCorto, alto: 58, titulo: 'Entradas, salidas y saldo por mes' });
  const cE = [...new Set(F.flatMap(x => Object.keys(x.entra)))], cS = [...new Set(F.flatMap(x => Object.keys(x.sale)))];
  const filas = [[{ t: 'Saldo inicial', b: true }].concat(F.map(x => ({ t: fmtCorto(x.ini), b: true })))].concat([[{ t: 'Entradas', b: true, color: 'ok' }].concat(F.map(() => ''))], cE.map(c => ['   ' + c].concat(F.map(x => x.entra[c] ? fmtCorto(x.entra[c]) : { t: '—', suave: true }))),
    [[{ t: 'Salidas', b: true, color: 'mal' }].concat(F.map(() => ''))], cS.map(c => ['   ' + c].concat(F.map(x => x.sale[c] ? fmtCorto(x.sale[c]) : { t: '—', suave: true }))));
  R.tabla({ cols: [{ t: 'Concepto', w: 3 }].concat(F.map(x => ({ t: mesCorto(x.m), a: 'right' }))), fs: 7, filas, total: ['Saldo final'].concat(F.map(x => fmtCorto(x.fin))), zebra: false });
  R.tabla({ titulo: 'Proyección', cols: [{ t: 'Mes' }, { t: 'Ventas esperadas', a: 'right' }, { t: 'Cobros de cartera', a: 'right' }, { t: 'Recolección', a: 'right' }, { t: 'Plan agronómico', a: 'right' }, { t: 'Proveedores', a: 'right' }, { t: 'Saldo', a: 'right' }],
    filas: P.map(x => [mesCorto(x.m), pdfPesos(x.ventas), pdfPesos(x.cobros), pdfPesos(-x.recol), pdfPesos(-x.plan), pdfPesos(-x.prov), { t: pdfPesos(x.saldo), b: true, color: x.saldo < 0 ? 'mal' : null }]) });
  R.guardar(nombreArchivo('flujo-de-caja-' + an));
}

/* ---------- 18. Presupuesto frente a ejecución ---------- */
function repPresupuesto(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const P = presupuestos[an]; if (!P) { toast('No hay presupuesto para ' + an + '. Créelo en Contabilidad → Presupuesto.', 'err'); return; } const Rl = realPorGrupo(an);
  const G = [['ventas', 'Ventas de café', 1], ['otrosIng', 'Otros ingresos', 1], ['recoleccion', 'Recolección', -1], ['labores', 'Labores e insumos', -1], ['nomina', 'Nómina', -1], ['indirectos', 'Costos indirectos', -1], ['admin', 'Administración', -1], ['financieros', 'Financieros', -1]];
  const mesAct = an === hoyLocal().slice(0, 4) ? Number(hoyLocal().slice(5, 7)) : 12; const s = (a, n) => (a || []).slice(0, n).reduce((x, y) => x + n0(y), 0);
  const R = new InformePDF({ titulo: 'Presupuesto frente a ejecución', subtitulo: 'Comparación por rubro y por mes, con desviaciones', codigo: 'PRE', periodo: 'Año ' + an + ' · enero a ' + MESES_L[mesAct - 1].toLowerCase() }); R.portada();
  const ingP = s(P.ventas, mesAct) + s(P.otrosIng, mesAct), ingR = s(Rl.ventas, mesAct) + s(Rl.otrosIng, mesAct); const egP = G.filter(g => g[2] < 0).reduce((t, g) => t + s(P[g[0]], mesAct), 0), egR = G.filter(g => g[2] < 0).reduce((t, g) => t + s(Rl[g[0]], mesAct), 0);
  R.kpis([{ t: 'Ingresos reales', v: pdfPesosM(ingR), s: 'presupuesto ' + pdfPesosM(ingP), stono: ingR >= ingP ? 'ok' : 'mal' }, { t: 'Egresos reales', v: pdfPesosM(egR), s: 'presupuesto ' + pdfPesosM(egP), stono: egR <= egP ? 'ok' : 'mal' }, { t: 'Resultado real', v: pdfPesosM(ingR - egR) }, { t: 'Resultado presupuestado', v: pdfPesosM(ingP - egP) }], 4);
  R.tabla({ titulo: 'Acumulado a la fecha', cols: [{ t: 'Rubro', w: 2 }, { t: 'Presupuesto', a: 'right' }, { t: 'Real', a: 'right' }, { t: 'Desviación', a: 'right' }, { t: 'Ejecución', w: 1.6 }, { t: 'Presupuesto del año', a: 'right' }],
    filas: G.map(([k, t, sg]) => { const pp = s(P[k], mesAct), rr = s(Rl[k], mesAct); const dv = pp ? (rr - pp) / pp * 100 : 0; const bueno = sg > 0 ? rr >= pp : rr <= pp; return [t, pdfPesos(pp), pdfPesos(rr), pp ? { t: (dv >= 0 ? '+' : '') + num(Math.round(dv)) + ' %', color: bueno ? 'ok' : 'mal' } : '—', { t: pp ? num(Math.round(rr / pp * 100)) + ' %' : '—', barra: pp ? Math.min(1.2, rr / pp) / 1.2 : 0, color: bueno ? 'marca' : 'alerta' }, pdfPesos(s(P[k], 12))]; }), primeraFuerte: true });
  R.barras({ cats: MESES_L.map(m => m.slice(0, 3)), series: [{ nombre: 'Egresos presupuestados', vals: MESES_L.map((_, i) => G.filter(g => g[2] < 0).reduce((t, g) => t + n0((P[g[0]] || [])[i]), 0)), color: [190, 202, 194] }, { nombre: 'Egresos reales', vals: MESES_L.map((_, i) => i < mesAct ? G.filter(g => g[2] < 0).reduce((t, g) => t + n0((Rl[g[0]] || [])[i]), 0) : 0), color: PDFC.serie[1] }], fmt: fmtCorto, alto: 56, titulo: 'Egresos por mes' });
  R.guardar(nombreArchivo('presupuesto-ejecucion-' + an));
}

/* ---------- 19. Costos de producción ---------- */
function repCostos(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const d = an + '-01-01', h = an === hoyLocal().slice(0, 4) ? hoyLocal() : an + '-12-31'; const er = estadoResultados(d, h); const cl = costosPorLote(d, h); const L = libroDiario();
  const R = new InformePDF({ titulo: 'Costo de producción', subtitulo: 'Costo por carga, por kilo y por hectárea, composición del costo y costos por lote', codigo: 'CST', periodo: 'Año ' + an }); R.portada();
  const cs = L.costeo.filter(c => c.mes >= d.slice(0, 7) && c.mes <= h.slice(0, 7)); const kg = cs.reduce((a, c) => a + c.kg, 0), cargado = cs.reduce((a, c) => a + (c.costo || c.valor || 0), 0); const ha = lotesActivos().reduce((a, l) => a + n0(l.hectareas), 0);
  R.kpis([{ t: 'Costo incurrido', v: pdfPesosM(er.totalProd) }, { t: 'Costo por carga', v: er.kgProd ? pdfPesosM(er.totalProd / er.kgProd * CARGA) : '—', s: 'incurrido ÷ producido' }, { t: 'Costo por hectárea', v: ha ? pdfPesosM(er.totalProd / ha) : '—' }, { t: 'Inventario a costo', v: pdfPesosM(L.invVal), s: pdfKg(L.invKg, 1) + ' en bodega' }], 4);
  R.columnas(2, [x => { x.dona(er.costosProd.map((c, i) => ({ t: nomCuenta(c.cod), v: c.v, vt: pdfPesosM(c.v), color: PDFC.serie[i % 6] })), { titulo: 'Composición del costo', radio: 16, centro: pdfPesosM(er.totalProd), centroSub: 'costo del año' }); },
    x => { x.subtitulo('Lectura'); x.parrafo('El costo del año se carga al pergamino a medida que se produce, en proporción a la cosecha esperada (lo producido más lo que falta según la proyección de los lotes). Así el costo por carga no se infla al comienzo de la cosecha.', { tam: 8.4 }); x.kv([['Pergamino producido', pdfKg(er.kgProd, 1)], ['Pergamino vendido', pdfKg(er.kgVend, 1)], ['Costo del café vendido', pdfPesos(er.costo)], ['Costo promedio en bodega', pdfPesos(L.costoProm * CARGA) + ' / carga']], 1); }], 8);
  void kg; void cargado;
  R.tabla({ titulo: 'Costos por lote', cols: [{ t: 'Lote', w: 1.6 }, { t: 'Área', a: 'right', w: 0.6 }, { t: 'Directos', a: 'right' }, { t: 'Asignados', a: 'right' }, { t: 'Total', a: 'right' }, { t: 'Pergamino', a: 'right' }, { t: '$ / carga', a: 'right' }, { t: '$ / ha', a: 'right' }, { t: 'Margen vendido', a: 'right' }], fs: 7.8,
    filas: cl.map(x => [x.l.nombre, num(redondear(x.ha, 2)), pdfPesos(x.directo), pdfPesos(x.asignado), { t: pdfPesos(x.total), b: true }, pdfKg(x.kg, 1), pdfPesos(x.porCarga), pdfPesos(x.porHa), { t: pdfPesos(x.margen), color: x.margen >= 0 ? 'ok' : 'mal' }]), primeraFuerte: true });
  R.tabla({ titulo: 'Detalle por cuenta', cols: [{ t: 'Cuenta', w: 2.6 }, { t: 'Valor', a: 'right' }, { t: '$ / carga', a: 'right' }, { t: '$ / kg', a: 'right' }], filas: er.costosProd.map(c => [c.cod + ' · ' + nomCuenta(c.cod), pdfPesos(c.v), er.kgProd ? pdfPesos(c.v / er.kgProd * CARGA) : '—', er.kgProd ? pdfPesos(c.v / er.kgProd) : '—']), total: ['Total', pdfPesos(er.totalProd), er.kgProd ? pdfPesos(er.totalProd / er.kgProd * CARGA) : '—', er.kgProd ? pdfPesos(er.totalProd / er.kgProd) : '—'] });
  R.guardar(nombreArchivo('costo-produccion-' + an));
}

/* ---------- 20. Libro diario ---------- */
function repLibro(p) {
  const r = rangoReporte(p.periodo); const A = libroDiario().asientos.filter(a => enRango(a.fecha, r)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const R = new InformePDF({ titulo: 'Libro diario', subtitulo: 'Asientos contables generados por las operaciones de la finca', codigo: 'LIB', periodo: r.txt, horizontal: true }); R.portada({ alto: 40 });
  const filas = []; let D = 0, H = 0; A.forEach((a, i) => a.lineas.forEach((l, k) => { D += l.debe; H += l.haber; filas.push([k ? '' : { t: String(i + 1), suave: true }, k ? '' : fechaPDF(a.fecha), k ? '' : a.origen, k ? '' : a.desc, l.cuenta, nomCuenta(l.cuenta), l.debe ? pdfPesos(l.debe) : '', l.haber ? pdfPesos(l.haber) : '']); }));
  R.tabla({ cols: [{ t: 'N.º', w: 0.4 }, { t: 'Fecha', w: 0.9 }, { t: 'Origen', w: 0.9 }, { t: 'Descripción', w: 3 }, { t: 'Cuenta', w: 0.6 }, { t: 'Nombre de la cuenta', w: 2 }, { t: 'Débito', a: 'right', w: 1 }, { t: 'Crédito', a: 'right', w: 1 }], fs: 7, filas, total: ['', '', '', A.length + ' asientos', '', '', pdfPesos(D), pdfPesos(H)], zebra: false });
  R.guardar(nombreArchivo('libro-diario'));
}

/* ---------- 21. Información para la declaración de renta ---------- */
function repRenta(p) {
  const an = String(p.anio || hoyLocal().slice(0, 4)); const d = an + '-01-01', h = an + '-12-31'; const er = estadoResultados(d, h); const bg = balanceGeneral(h > hoyLocal() ? hoyLocal() : h); const sc = saldosCuentas(d, h); const ret = (sc.get('1355') || { debe: 0 }).debe;
  const R = new InformePDF({ titulo: 'Información para la declaración de renta', subtitulo: 'Patrimonio, ingresos, costos, deducciones y retenciones del año · insumo para su contador', codigo: 'REN', periodo: 'Año gravable ' + an }); R.portada();
  R.kpis([{ t: 'Patrimonio bruto', v: pdfPesosM(bg.activo) }, { t: 'Deudas', v: pdfPesosM(bg.pasivo) }, { t: 'Patrimonio líquido', v: pdfPesosM(bg.activo - bg.pasivo) }, { t: 'Retenciones en la fuente', v: pdfPesos(ret) }], 4);
  R.seccion(1, 'Patrimonio al 31 de diciembre');
  R.tabla({ cols: [{ t: 'Bien o derecho', w: 3 }, { t: 'Valor', a: 'right' }], filas: bg.corr.concat(bg.nocorr).map(x => [x.cod + ' · ' + nomCuenta(x.cod), pdfPesos(x.v)]).concat([[{ t: 'Deudas', b: true }, { t: pdfPesos(bg.pasivo), b: true }]], bg.pasC.concat(bg.pasL).map(x => ['     ' + nomCuenta(x.cod), pdfPesos(x.v)])), total: ['Patrimonio líquido', pdfPesos(bg.activo - bg.pasivo)] });
  R.seccion(2, 'Ingresos, costos y gastos');
  R.tabla({ cols: [{ t: 'Concepto', w: 3 }, { t: 'Valor', a: 'right' }], filas: [['Ingresos brutos por ventas de café', pdfPesos(er.ventasBrutas)], ['Otros ingresos', pdfPesos(er.otrosIng)], ['Devoluciones, rebajas y descuentos', pdfPesos(er.desc)], ['Costo del café vendido', pdfPesos(er.costo)], ['Gastos de administración', pdfPesos(er.adm)], ['Gastos de ventas', pdfPesos(er.vent)], ['Gastos financieros (intereses)', pdfPesos(er.fin)]], total: ['Renta líquida antes de beneficios tributarios', pdfPesos(er.antes)] });
  R.nota('Revise con su contador el tratamiento de la actividad agropecuaria, la renta presuntiva, los bienes a nombre de terceros y los soportes de costos. Esta información resume lo registrado en State Origen y no constituye asesoría tributaria.', 'alerta', 'Importante');
  R.guardar(nombreArchivo('informacion-renta-' + an));
}

/* ---------- 22. Activos y depreciación ---------- */
function repActivos() {
  const R = new InformePDF({ titulo: 'Activos y depreciación', subtitulo: 'Infraestructura, maquinaria y equipos de la finca con su vida útil y valor en libros', codigo: 'ACT', periodo: 'Al ' + fechaPDF(hoyLocal()) }); R.portada();
  const hoy = hoyLocal(); const filas = activos.map(a => { const anual = depreciacionAnual(a); const anios = a.fecha ? Math.max(0, (parseFecha(hoy) - parseFecha(a.fecha)) / 864e5 / 365.25) : 0; const acum = Math.min(n0(a.costo) - n0(a.valorResidual), anual * anios); return { a, anual, acum, libros: n0(a.costo) - acum, uso: n0(a.vidaUtil) ? Math.min(1, anios / n0(a.vidaUtil)) : 0 }; });
  const tot = filas.reduce((s, x) => ({ c: s.c + n0(x.a.costo), d: s.d + x.acum, l: s.l + x.libros, an: s.an + x.anual }), { c: 0, d: 0, l: 0, an: 0 });
  R.kpis([{ t: 'Costo histórico', v: pdfPesosM(tot.c) }, { t: 'Depreciación acumulada', v: pdfPesosM(tot.d) }, { t: 'Valor en libros', v: pdfPesosM(tot.l) }, { t: 'Depreciación anual', v: pdfPesosM(tot.an), s: pdfPesos(tot.an / 12) + ' al mes' }], 4);
  R.tabla({ cols: [{ t: 'Activo', w: 2.1 }, { t: 'Categoría', w: 1.1 }, { t: 'Desde', w: 1 }, { t: 'Costo', a: 'right', w: 1.15 }, { t: 'Vida', a: 'right', w: 0.65 }, { t: 'Dep. anual', a: 'right', w: 1.05 }, { t: 'Acumulada', a: 'right', w: 1.1 }, { t: 'En libros', a: 'right', w: 1.15 }, { t: 'Consumida', w: 1.1 }], fs: 7.2,
    filas: filas.map(x => [x.a.nombre, x.a.categoria || '—', fechaPDF(x.a.fecha), pdfPesos(x.a.costo), num(x.a.vidaUtil || 0) + ' a', pdfPesos(x.anual), pdfPesos(x.acum), { t: pdfPesos(x.libros), b: true }, { t: num(Math.round(x.uso * 100)) + ' %', barra: x.uso, color: x.uso > 0.8 ? 'alerta' : 'marca' }]), total: ['Total', '', '', pdfPesos(tot.c), '', pdfPesos(tot.an), pdfPesos(tot.d), pdfPesos(tot.l), ''], primeraFuerte: true });
  R.nota('Depreciación en línea recta sobre el costo menos el valor residual. Los terrenos no se deprecian.', 'info');
  R.guardar(nombreArchivo('activos-depreciacion'));
}

/* ---------- 23. Evaluación de diseños de cultivo ---------- */
function repDisenos() {
  if (!disenos.length) { toast('No hay diseños para evaluar.', 'err'); return; } const evs = disenos.map(evaluarDiseno); const S = evs[0].S; const mejor = evs.slice().sort((a, b) => b.vpn - a.vpn)[0];
  const R = new InformePDF({ titulo: 'Evaluación de diseños de cultivo', subtitulo: 'Producción esperada, inversión, flujo de caja, VPN, TIR y recuperación de cada alternativa', codigo: 'DIS', periodo: S.horizonte + ' años · tasa ' + S.tasa + ' %' }); R.portada();
  R.rico([['La alternativa con mayor valor presente neto es '], [mejor.d.nombre, true], [' con un VPN de '], [pdfPesos(mejor.vpn), true], [mejor.tir != null ? ', una TIR de ' + num(redondear(mejor.tir, 1)) + ' %' : ''], [' y recuperación de la inversión en ' + num(redondear(mejor.pay, 1)) + ' años, a un precio de ' + pdfPesos(S.precioCarga) + ' por carga.']]);
  R.tabla({ titulo: 'Comparación', cols: [{ t: 'Indicador', w: 1.8 }].concat(evs.map(e => ({ t: e.d.nombre, a: 'right', w: 1.4 }))), fs: 7.8, primeraFuerte: true,
    filas: [['Variedad'].concat(evs.map(e => e.d.variedad || '—')), ['Distancias'].concat(evs.map(e => num(e.d.distSurcos) + ' × ' + num(e.d.distPlantas) + ' m')), ['Plantas por hectárea'].concat(evs.map(e => num(e.dens))), ['Ciclo de renovación'].concat(evs.map(e => e.d.ciclo + ' años')), ['Producción pico'].concat(evs.map(e => num(Math.round(e.pico)) + ' kg/ha')), ['Cargas en el horizonte'].concat(evs.map(e => num(Math.round(e.cargasTot)))),
      ['Inversión inicial'].concat(evs.map(e => pdfPesos(e.invInicial))), ['Costo promedio por carga'].concat(evs.map(e => pdfPesos(e.costoCarga))), ['Precio de equilibrio'].concat(evs.map(e => pdfPesos(e.precioEq))), ['Recuperación'].concat(evs.map(e => num(redondear(e.pay, 1)) + ' años')),
      [{ t: 'VPN', b: true }].concat(evs.map(e => ({ t: pdfPesos(e.vpn), b: true, color: e === mejor ? 'ok' : null }))), [{ t: 'TIR', b: true }].concat(evs.map(e => ({ t: e.tir == null ? '—' : num(redondear(e.tir, 1)) + ' %', b: true })))] });
  const anios = evs[0].flujos.map(f => 'Año ' + f.anio);
  R.lineas({ cats: anios, series: evs.map((e, i) => { let acc = 0; return { nombre: e.d.nombre, vals: e.flujos.map(f => (acc += f.neto)), color: PDFC.serie[i % 6] }; }), fmt: fmtCorto, alto: 62, titulo: 'Flujo de caja acumulado', min0: false });
  R.barras({ cats: anios, series: evs.map((e, i) => ({ nombre: e.d.nombre, vals: e.flujos.map(f => f.cargas), color: PDFC.serie[i % 6] })), fmt: v => num(Math.round(v)), alto: 54, titulo: 'Cargas por hectárea por año' });
  R.tabla({ titulo: 'Supuestos', cols: [{ t: 'Supuesto', w: 2.4 }, { t: 'Valor', a: 'right' }], fs: 7.8, filas: [['Precio por carga', pdfPesos(S.precioCarga)], ['Tasa de descuento', S.tasa + ' %'], ['Horizonte', S.horizonte + ' años'], ['Colino', pdfPesos(S.colino)], ['Sostenimiento por hectárea al año', pdfPesos(S.sostenimientoHa)], ['Tarifa de recolección', pdfPesos(S.tarifaKgCereza) + ' / kg cereza'], ['Factor cereza → pergamino', num(S.factorCereza)], ['Pérdida por roya en variedades susceptibles sin control', S.perdidaRoyaSusceptible + ' %']] });
  R.nota('Proyección técnica y financiera con supuestos editables; no garantiza resultados. Valide densidades y variedades con el servicio de extensión.', 'info');
  R.guardar(nombreArchivo('evaluacion-disenos'));
}

/* ================= Centro de reportes ================= */
const REPORTES = [
  { id: 'ejecutivo', cat: 'Gerencia', t: 'Informe ejecutivo de la finca', d: 'Lectura del periodo, indicadores, rentabilidad en cascada, producción semanal, estado del cultivo con mapas de calor, proyección, caja y decisiones sugeridas.', p: ['periodo'], fn: repEjecutivo, ic: 'i-tablero', pag: '4–6' },
  { id: 'cosecha', cat: 'Cosecha y personal', t: 'Informe de cosecha', d: 'Pasadas, recolección por día, recolectores, pagos, beneficio, factor de conversión y calidad de las partidas.', p: ['periodo'], fn: repCosecha, ic: 'i-cosecha', pag: '3–4' },
  { id: 'planilla', cat: 'Cosecha y personal', t: 'Planilla de liquidación de la pasada', d: 'Kilos por recolector y por día, tarifa, valor bruto, adelantos, neto a pagar y espacio para firma.', p: ['pasada'], fn: repPlanilla, ic: 'i-personal', pag: '1–2' },
  { id: 'productividad', cat: 'Cosecha y personal', t: 'Productividad de recolectores', d: 'kg por hora frente a la meta, constancia, mejor día y evolución diaria de cada recolector.', p: ['periodo'], fn: repProductividad, ic: 'i-analisis', pag: '2' },
  { id: 'ficha', cat: 'Campo', t: 'Ficha técnica del lote', d: 'Vista realista, identificación, diseño de siembra, sanidad con mapas de calor, suelo, producción, labores y costos del lote.', p: ['lote'], fn: repFichaLote, ic: 'i-mapa', pag: '4–6' },
  { id: 'sanidad', cat: 'Campo', t: 'Informe fitosanitario y de muestreos', d: 'Broca, roya, sanidad, nutrición y desarrollo: mapas de calor, plantas sobre umbral, tendencia, deficiencias y faltantes.', p: ['lote'], fn: repSanidad, ic: 'i-labor', pag: '4–7' },
  { id: 'suelo', cat: 'Campo', t: 'Análisis de suelo y plan de fertilización', d: 'Interpretación de cada elemento, relaciones entre bases, enmiendas, productos, bultos y gramos por planta.', p: ['lote'], fn: repSuelo, ic: 'i-suelo', pag: '2–3' },
  { id: 'clima', cat: 'Campo', t: 'Clima y balance hídrico', d: 'Lluvia mensual frente a la normal, temperaturas, agua en el suelo y alertas.', p: ['anio'], fn: repClima, ic: 'i-lluvia', pag: '2–3' },
  { id: 'planagro', cat: 'Campo', t: 'Plan agronómico anual', d: 'Calendario por lote y mes, actividades con insumos, jornales, presupuesto y cumplimiento.', p: ['anio'], fn: repPlanAgro, ic: 'i-calendario', pag: '2–4' },
  { id: 'semanal', cat: 'Campo', t: 'Plan semanal de labores', d: 'Órdenes de la semana con responsables, jornales, presupuesto e insumos a alistar.', p: [], fn: () => exportarPlanSemanalPDF(), ic: 'i-plan', pag: '1–2' },
  { id: 'ventas', cat: 'Comercial', t: 'Informe comercial de ventas', d: 'Ventas, precio por carga, compradores, partidas y cartera por cobrar.', p: ['anio'], fn: repVentas, ic: 'i-venta', pag: '2' },
  { id: 'traza', cat: 'Comercial', t: 'Certificado de origen y trazabilidad', d: 'De la venta a la partida, el beneficio, la cosecha, el lote y su manejo, con la vista realista del lote.', p: ['venta'], fn: repTraza, ic: 'i-venta', pag: '2–3' },
  { id: 'estados', cat: 'Finanzas', t: 'Estados financieros', d: 'Estado de resultados comparativo, costo de producción, balance general e indicadores.', p: ['anio'], fn: repEstados, ic: 'i-finanzas', pag: '3' },
  { id: 'flujo', cat: 'Finanzas', t: 'Flujo de caja', d: 'Entradas y salidas por mes, saldo y proyección de tres meses.', p: ['anio'], fn: repFlujo, ic: 'i-cuentas', pag: '2' },
  { id: 'presupuesto', cat: 'Finanzas', t: 'Presupuesto frente a ejecución', d: 'Desviaciones por rubro y por mes con el acumulado a la fecha.', p: ['anio'], fn: repPresupuesto, ic: 'i-plan', pag: '2' },
  { id: 'costos', cat: 'Finanzas', t: 'Costo de producción', d: 'Costo por carga, por kilo y por hectárea, composición y costos por lote.', p: ['anio'], fn: repCostos, ic: 'i-oper', pag: '2' },
  { id: 'libro', cat: 'Finanzas', t: 'Libro diario', d: 'Asientos contables del periodo con débitos y créditos.', p: ['periodo'], fn: repLibro, ic: 'i-cuentas', pag: 'variable' },
  { id: 'renta', cat: 'Finanzas', t: 'Información para la declaración de renta', d: 'Patrimonio, ingresos, costos, gastos y retenciones para su contador.', p: ['anio'], fn: repRenta, ic: 'i-finanzas', pag: '2' },
  { id: 'activos', cat: 'Finanzas', t: 'Activos y depreciación', d: 'Infraestructura y equipos con vida útil, depreciación y valor en libros.', p: [], fn: repActivos, ic: 'i-finca', pag: '1' },
  { id: 'disenos', cat: 'Estrategia', t: 'Evaluación de diseños de cultivo', d: 'Comparación técnica y financiera: producción, inversión, flujo, VPN, TIR y supuestos.', p: [], fn: repDisenos, ic: 'i-diseno', pag: '2–3' },
];
let repSt = { cat: 'Todos', params: {} };
try { const g = JSON.parse(localStorage.getItem('so-rep') || '{}'); if (g && g.params) repSt.params = g.params; } catch (e) {}
function opcionesParam(k) {
  const an = Number(hoyLocal().slice(0, 4)); const anios = [...new Set([an].concat(registros.map(r => Number(String(r.fecha).slice(0, 4))), ventas.map(v => Number(String(v.fecha).slice(0, 4)))))].filter(Boolean).sort((a, b) => b - a);
  if (k === 'periodo') return PERIODOS_REP; if (k === 'anio') return anios.map(a => [String(a), String(a)]);
  if (k === 'lote') return lotesActivos().map(l => [l.id, l.nombre]); if (k === 'pasada') return pasadasCosecha().map(p => [p.k, p.tipo + ' · pasada ' + p.pasada + ' · ' + fechaCorta(p.ini) + '–' + fechaCorta(p.fin)]);
  if (k === 'venta') return ventas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(v => [v.id, fechaCorta(v.fecha) + ' ' + v.fecha.slice(0, 4) + ' · ' + num(Math.round(v.kg)) + ' kg · ' + terceroNombre(v.terceroId, v.comprador).replace(' (ejemplo)', '')]);
  return [];
}
const ETQ_PARAM = { periodo: 'Periodo', anio: 'Año', lote: 'Lote', pasada: 'Pasada', venta: 'Venta' };
function renderReportes() {
  const root = document.getElementById('rep-root'); if (!root) return; const cats = ['Todos'].concat([...new Set(REPORTES.map(r => r.cat))]);
  const lista = REPORTES.filter(r => repSt.cat === 'Todos' || r.cat === repSt.cat);
  root.innerHTML = `<div class="rep-hero"><div><div class="rep-eye">Centro de reportes</div><h2>${REPORTES.length} informes PDF listos para imprimir, enviar o archivar</h2><p>Diseño editorial con portada, indicadores, gráficas, mapas de la finca y paginación. Elija el periodo o el lote en cada tarjeta y genere el documento.</p></div>
      <div class="rep-hero-k"><div><b>${REPORTES.filter(r => r.cat === 'Finanzas').length}</b><span>financieros</span></div><div><b>${REPORTES.filter(r => r.cat === 'Campo').length}</b><span>de campo</span></div><div><b>${REPORTES.filter(r => r.cat === 'Cosecha y personal').length}</b><span>de cosecha</span></div></div></div>
    <div class="capas seg rep-cats" role="tablist">${cats.map(c => `<button class="${repSt.cat === c ? 'on' : ''}" onclick="repSt.cat='${c}';renderReportes()">${c}</button>`).join('')}</div>
    <div class="rep-grid">${lista.map(r => `<article class="rep-card" data-rep="${r.id}"><div class="rep-top"><span class="rep-ic"><svg><use href="#${r.ic}"/></svg></span><span class="rep-cat">${esc(r.cat)}</span><span class="rep-pag">${esc(r.pag)} pág.</span></div>
        <h3>${esc(r.t)}</h3><p>${esc(r.d)}</p>
        <div class="rep-params">${r.p.map(k => { const ops = opcionesParam(k); const v = repSt.params[r.id + '.' + k] || (k === 'periodo' ? 'ult30' : (ops[0] || [''])[0]); return `<label><span>${ETQ_PARAM[k]}</span><select data-k="${k}" onchange="repSt.params['${r.id}.${k}']=this.value;guardarRepSt()">${ops.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('') || '<option value="">Sin datos</option>'}</select></label>`; }).join('')}</div>
        <button class="btn primary small rep-go" onclick="generarReporte('${r.id}', this)"><svg width="15" height="15" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-pdf"/></svg>Generar PDF</button></article>`).join('')}</div>`;
}
function guardarRepSt() { try { localStorage.setItem('so-rep', JSON.stringify({ params: repSt.params })); } catch (e) {} }
function generarReporte(id, btn) {
  const r = REPORTES.find(x => x.id === id); if (!r) return; if (!window.jspdf) { toast('No se pudo cargar el generador de PDF. Revise la conexión.', 'err'); return; }
  const card = btn && btn.closest('.rep-card'); const p = {}; (r.p || []).forEach(k => { const s = card && card.querySelector('select[data-k="' + k + '"]'); p[k] = s ? s.value : (repSt.params[id + '.' + k] || (k === 'periodo' ? 'ult30' : '')); });
  if (btn) { btn.disabled = true; btn.classList.add('cargando'); btn.lastChild.textContent = 'Generando…'; }
  setTimeout(() => { try { r.fn(p); toast('Informe generado: ' + r.t, 'ok'); } catch (e) { dlog('✗ reporte ' + id + ': ' + e.message, 'err'); toast('No se pudo generar el informe: ' + e.message, 'err'); }
    if (btn) { btn.disabled = false; btn.classList.remove('cargando'); btn.lastChild.textContent = 'Generar PDF'; } }, 30);
}
