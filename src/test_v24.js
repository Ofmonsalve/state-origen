// Pruebas v24: créditos con amortización, cierre de periodos con bloqueo, respaldo verificado, auditoría de integridad y centro de mando.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v24.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const deepFreeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
function crearNube(store) { const subs = []; const sd = p => ({ exists: p in store, data: () => p in store ? deepFreeze(JSON.parse(JSON.stringify(store[p]))) : undefined }); const sc = c => { const docs = Object.keys(store).filter(k => k.startsWith(c + '/')).map(k => ({ id: k, data: () => deepFreeze(JSON.parse(JSON.stringify(store[k]))) })); return { empty: !docs.length, docs }; };
  return { doc: p => ({ get: async () => sd(p), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); }, onSnapshot: fn => { fn(sd(p)); return () => {}; } }), collection: c => ({ get: async () => sc(c), onSnapshot: fn => { fn(sc(c)); return () => {}; } }) }; }
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms)); const descargas = [];
async function abrir(store) { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/#panel', beforeParse(w) { w.alert = () => {}; w.confirm = () => false; const n = crearNube(store);
  w.claude = { use: async k => k === 'db' ? n : (k === 'downloads' ? { save: async f => descargas.push(f.filename) } : null) }; w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = q => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(400); return { w: dom.window, d: dom.window.document, errores }; }
(async () => {
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro', areaTotal: 1 }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', codigo: 'LOT01', variedadId: 'v1', hectareas: '0.35', diseno: { distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 180, pendiente: 30, trazado: 'recto' } }], bloques: [],
      trabajadores: [{ id: 't1', nombre: 'Walter Mejía', documento: '1098765447' }], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] }, 'datos/planeacion': { config: { valorJornal: 65000, alimentacion: 17000 }, plantillas: [] },
    'registros/2026-09': { items: [{ id: 'r1', fecha: '2026-09-10', anio: 2026, tipo: 'Principal', pasada: 1, loteId: 'l1', trabajadorId: 't1', recolector: 'Walter Mejía', kg: 80, horas: 8, modalidad: 'kilo', tarifa: 1000, creado: '2026-09-10T18:00' }] },
    'registros/2026-10': { items: [{ id: 'r2', fecha: '2026-10-05', anio: 2026, tipo: 'Principal', pasada: 2, loteId: 'l1', trabajadorId: 't1', recolector: 'Walter Mejía', kg: 90, horas: 8, modalidad: 'kilo', tarifa: 1000, creado: '2026-10-05T18:00' }] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s);
  // 1 · Créditos
  const T = E("tablaCredito({ monto: 12000000, tasaEA: 12, plazoMeses: 12, periodicidad: 1, graciaMeses: 0, sistema: 'cuota', fecha: '2026-01-15' })"); const i = Math.pow(1.12, 1 / 12) - 1, cuota = 12000000 * i / (1 - Math.pow(1 + i, -12));
  ok(T.n === 12 && Math.abs(T.cuotaFija - cuota) < 0.01 && Math.abs(T.filas.reduce((s, f) => s + f.capital, 0) - 12000000) < 0.5 && Math.abs(T.filas[11].saldoFin) < 0.5 && T.filas[0].fecha === '2026-02-15', 'Cuota fija: ' + Math.round(cuota) + ' mensual, 12 cuotas, saldo final 0');
  const Tg = E("tablaCredito({ monto: 10000000, tasaEA: 10, plazoMeses: 24, periodicidad: 3, graciaMeses: 6, sistema: 'abono', fecha: '2026-01-31' })"); ok(Tg.n === 8 && Tg.g === 2 && Tg.filas[0].capital === 0 && Tg.filas[1].capital === 0 && Math.abs(Tg.filas[2].capital - 10000000 / 6) < 0.01 && Tg.filas[0].fecha === '2026-04-30', 'Trimestral con 6 meses de gracia y abono constante: 2 cuotas solo intereses y 6 de capital igual');
  w.ir('finanzas'); await tick(); E("finSt.tab='creditos'"); w.renderFinanzas(); await tick(); w.abrirCredito24(); await tick();
  d.getElementById('cr-e').value = 'Banco Agrario'; d.getElementById('cr-f').value = '2026-08-01'; d.getElementById('cr-m').value = '6000000'; d.getElementById('cr-t').value = '14'; d.getElementById('cr-p').value = '12'; d.getElementById('cr-ct').value = '120000'; w.guardarCredito24(''); await tick(100);
  const c = E('creditos[0]'); ok(c && c.codigo === 'CRE-26-01' && E("movimientos.filter(m => m.creditoId === creditos[0].id).length") === 2, 'Crédito CRE-26-01 con su desembolso y sus costos como movimientos');
  w.pagarCuota24(c.id, 1); await tick(); w.confirmarCuota24(c.id, 1); await tick(100); const ec = E('estadoCredito(creditos[0])'); ok(ec.pagadas === 1 && ec.saldo < 6000000 && ec.estado === 'En mora', 'Cuota 1 pagada; el crédito queda en mora porque hay cuotas vencidas sin pagar (hoy es ' + E('hoyLocal()') + ')');
  const cont = E("(() => { _versionDatos++; const s = saldosCuentas(null, hoyLocal()); return saldoNat('2105', s.get('2105')); })()"); ok(Math.abs(cont - ec.saldo) < 1, 'El saldo contable de obligaciones financieras (2105) es igual al saldo del crédito: ' + Math.round(cont));
  // 2 · Cierre de periodos
  w.abrirCierre24(); await tick(); ok(d.querySelector('.modal-actions .btn.primary').textContent.includes('octubre'), 'El cierre propone el mes anterior (octubre 2026)'); w.cerrarMes24('2026-09'); await tick(100); ok(E('cierreHasta()') === '2026-09', 'Septiembre cerrado');
  E("registros.find(r => r.id === 'r1').kg = 999"); await w.guardarEstado(); await tick(); ok(E("registros.find(r => r.id === 'r1').kg") === 80, 'Cambiar una pesada de un mes cerrado se revierte');
  E("registros = registros.filter(r => r.id !== 'r1')"); await w.guardarEstado(); await tick(); ok(E("registros.some(r => r.id === 'r1')"), 'Borrar una pesada de un mes cerrado se revierte');
  E("registros.push({ id: 'r9', fecha: '2026-09-20', tipo: 'Principal', pasada: 1, loteId: 'l1', trabajadorId: 't1', kg: 50, horas: 6, modalidad: 'kilo', tarifa: 1000 })"); await w.guardarEstado(); await tick(); ok(!E("registros.some(r => r.id === 'r9')"), 'Crear una pesada con fecha de un mes cerrado se revierte');
  E("registros.find(r => r.id === 'r2').kg = 95"); await w.guardarEstado(); await tick(); ok(E("registros.find(r => r.id === 'r2').kg") === 95, 'Octubre (abierto) se puede corregir');
  w.abrirLiquidar22('t1', '2026-10-10'); await tick(); await w.confirmarLiquidar22('t1', '2026-10-10'); await tick(150); ok(E("registros.find(r => r.id === 'r1').pagoId") && E("pagos.length") === 1, 'Pagar en octubre una pesada de septiembre (mes cerrado) sí se permite');
  E("pagos[0].fecha = '2026-09-30'"); await w.guardarEstado(); await tick(); ok(E("pagos[0].fecha") !== '2026-09-30', 'Mover un pago a una fecha cerrada se revierte');
  w.abrirCierre24(); await tick(); d.getElementById('ci24-m').value = 'ajuste del contador'; w.reabrirCierre24(); await tick(100); ok(E('cierreHasta()') === '2026-08' && E("contaConfig.cierre.historial.length") === 2, 'Reabrir con motivo deja el historial');
  // 3 · Respaldo
  const paq = await w.exportarRespaldo24(); await tick(150); ok(paq && paq.sha256.length === 64 && paq.conteo.registros === 2 && descargas.some(f => /respaldo-state-origen.*\.json$/.test(f)), 'Respaldo con huella SHA-256 y conteos');
  const txt = JSON.stringify(paq); const f1 = new w.File([txt], 'r.json', { type: 'application/json' });
  E("registros.push({ id: 'rX', fecha: '2026-11-01', tipo: 'Principal', pasada: 3, loteId: 'l1', trabajadorId: 't1', kg: 10, horas: 2, modalidad: 'kilo', tarifa: 1000 })");
  w.abrirRestaurar24(); await tick(); await w.leerRespaldo24({ files: [f1] }); await tick(); ok(d.getElementById('rs-info').textContent.includes('Huella verificada'), 'La huella del respaldo se verifica');
  const malo = JSON.parse(txt); malo.datos.registros[0].kg = 1; await w.leerRespaldo24({ files: [new w.File([JSON.stringify(malo)], 'm.json')] }); await tick(); ok(d.getElementById('rs-info').textContent.includes('no coincide'), 'Un respaldo alterado se rechaza');
  await w.leerRespaldo24({ files: [f1] }); await tick(); await w.confirmarRestaurar24(); await tick(200); ok(!E("registros.some(r => r.id === 'rX')") && E('registros.length') === 2 && E('creditos.length') === 1, 'Restaurar devuelve los datos del respaldo');
  // 4 · Auditoría
  E("registros.push({ id: 'rd', fecha: '2026-10-05', tipo: 'Principal', pasada: 2, loteId: 'l1', trabajadorId: 't1', kg: 95, horas: 8, modalidad: 'kilo', tarifa: 0 }, { id: 'rf', fecha: '2030-01-01', loteId: 'zz', trabajadorId: 't1', kg: 10, modalidad: 'kilo', tarifa: 1000 })");
  const au = E('auditoria24()'); const m = au.items.map(x => x.msg).join(' | ');
  ok(/lote que no existe/.test(m) && /fecha futura/.test(m) && /sin valor del kilo/.test(m) && /duplicado/.test(m) && /cuota\(s\) vencida/.test(m) && /respaldo/.test(m) === false, 'La auditoría detecta lote inexistente, fecha futura, pesada sin tarifa, duplicados y cuotas vencidas');
  ok(au.indice < 100 && au.items[0].sev === 'mal', 'Índice de integridad ' + au.indice + ' con lo grave primero');
  // 5 · Centro de mando
  w.ir('mando'); await tick(200); const tx = d.getElementById('md-root').textContent; ok(d.querySelectorAll('.md24-i').length >= 9 && tx.includes('Índice global') && tx.includes('Centro de alertas') && d.querySelectorAll('.md24-a').length > 3, 'Centro de mando: 9 índices, índice global y alertas');
  ok(!/undefined|NaN/.test(tx), 'Sin valores vacíos en el centro de mando');
  w.informeIntegridad24(); await tick(200); ok(descargas.some(f => /informe-integridad/.test(f)), 'Informe de gestión e integridad en PDF');
  await w.guardarEstado(); await tick(200); ok(store['datos/contable'].creditos.length === 1 && store['datos/contable'].contaConfig.ultimoRespaldo, 'Créditos y control del sistema se guardan');
  ok(errores.length === 0, 'Sin errores de ejecución' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
