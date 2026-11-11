// Prueba de extremo a extremo del módulo Planeación con nube simulada (datos CONGELADOS) y alert/confirm bloqueados.
const fs = require('fs');
const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2]||'state-origen.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>')
           .replace(/<link[^>]+fonts[^>]+>/g, '');

const deepFreeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
function crearNube(store) {
  const subs = [];
  const snapDoc = p => ({ exists: p in store, data: () => p in store ? deepFreeze(JSON.parse(JSON.stringify(store[p]))) : undefined });
  const snapCol = c => { const docs = Object.keys(store).filter(k => k.startsWith(c + '/')).map(k => ({ id: k, data: () => deepFreeze(JSON.parse(JSON.stringify(store[k]))) })); return { empty: !docs.length, docs }; };
  const notificar = () => subs.forEach(s => s());
  return {
    doc: p => ({ get: async () => snapDoc(p), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); setTimeout(notificar, 0); }, onSnapshot: (fn) => { subs.push(() => fn(snapDoc(p))); fn(snapDoc(p)); return () => {}; } }),
    collection: c => ({ get: async () => snapCol(c), onSnapshot: (fn) => { subs.push(() => fn(snapCol(c))); fn(snapCol(c)); return () => {}; } }),
  };
}
const descargas = [];
async function abrir(store) {
  const errores = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) {
      w.alert = () => {}; w.confirm = () => false; w.prompt = () => null;
      const nube = crearNube(store);
      w.claude = { use: async n => n === 'db' ? nube : (n === 'downloads' ? { save: async f => { descargas.push(f.filename); } } : null) };
      w.addEventListener('error', e => errores.push(e.message));
      w.HTMLCanvasElement.prototype.getContext = () => null;
    } });
  await new Promise(r => setTimeout(r, 300));
  return { w: dom.window, d: dom.window.document, errores };
}
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const val = (d, id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); el.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); };
const clickTxt = (d, sel, txt) => { const b = [...d.querySelectorAll(sel)].find(x => x.textContent.includes(txt)); if (!b) throw new Error('No hay botón: ' + txt); b.click(); };
const toasts = d => [...d.querySelectorAll('.toast')].map(t => t.textContent).join(' | ');

(async () => {
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', variedadId: 'v1', hectareas: '0.6' }], bloques: [], trabajadores: [], empleados: [{ id: 'e1', nombre: 'Jorge Ruiz', cargo: 'Mayordomo', salario: 1600000 }], activos: [] },
                  'datos/finanzas': { insumos: [], ventas: [{ kg: 100, precio: 18000 }], beneficios: [], labores: [], adelantos: [], pagos: [] } };
  let { w, d, errores } = await abrir(store);
  w.showView('planeacion'); await tick();
  ok(d.getElementById('view-planeacion').classList.contains('active'), 'La vista Planeación abre');
  ok(d.querySelectorAll('#semana-grid .day-col').length === 7, 'El plan semanal muestra 7 días');

  // 1. Plantilla
  w.showPl('presupuesto'); await tick();
  ok(d.getElementById('pp-jornal').value === '65000', 'Parámetro de jornal por defecto 65.000');
  w.abrirPlantilla(); await tick();
  val(d, 'tp-nombre', 'Fertilización edáfica 2º semestre'); val(d, 'tp-tipo', 'Fertilización edáfica'); val(d, 'tp-jornales', '2.5');
  val(d, 'tp-espec', '50 g por planta en media luna'); val(d, 'tp-herr', 'Balde, medidor'); val(d, 'tp-epp', 'Guantes, botas');
  w.agregarInsumo('tpl'); await tick();
  val(d, 'ins-tpl-0-nombre', 'NPK 17-6-18'); val(d, 'ins-tpl-0-cant', '450'); val(d, 'ins-tpl-0-unidad', 'kg'); val(d, 'ins-tpl-0-costo', '3250');
  clickTxt(d, '#modal-box button', 'Guardar plantilla'); await tick(150);
  ok(w.eval('plantillas.length') === 1, 'Plantilla guardada');
  ok(d.getElementById('lista-plantillas').textContent.includes('/ha'), 'La plantilla muestra su costo por hectárea');

  // 2. Orden desde plantilla, escalada a 0.6 ha
  w.abrirNuevaOT('2026-10-29'); await tick();
  ok(d.getElementById('ot-jornales').value === '1.5', 'Jornales escalados al área (2,5 × 0,6 = 1,5)');
  ok(d.getElementById('ins-ot-0-cant').value === '270', 'Insumo escalado al área (450 × 0,6 = 270 kg)');
  val(d, 'ot-resp', 'Jorge Ruiz'); val(d, 'ot-trab', '2');
  // cambiar área a 0.5 recalcula
  val(d, 'ot-area', '0.5'); await tick();
  ok(d.getElementById('ins-ot-0-cant').value === '225', 'Cambiar el área recalcula insumos (225 kg)');
  val(d, 'ot-area', '0.6'); await tick();
  clickTxt(d, '#modal-box button', 'Crear orden'); await tick(200);
  const ot = w.eval('ordenes[0]');
  ok(ot && ot.numero === 'OT-0001' && ot.estado === 'Programada', 'OT-0001 creada como Programada');
  const esperado = 1.5 * (65000 + 17000) + 270 * 3250;
  ok(Math.round(ot.presupuesto.total) === esperado, 'Presupuesto correcto: ' + ot.presupuesto.total + ' = ' + esperado);
  ok(store['ordenes/2026-10'] && store['ordenes/2026-10'].items.length === 1, 'La orden quedó en la nube (ordenes/2026-10)');
  ok(store['datos/planeacion'].plantillas.length === 1, 'La plantilla quedó en la nube');
  w.semanaBase = '2026-10-26'; w.eval("semanaBase='2026-10-26'"); w.renderSemana();
  ok(d.getElementById('semana-grid').textContent.includes('OT-0001'), 'La orden aparece en el plan de la semana 44');
  ok(d.getElementById('tabla-insumos-semana').textContent.includes('NPK 17-6-18'), 'Insumos a alistar en bodega listados');

  // 3. PDF de campo => Emitida
  w.verOT(ot.id); await tick();
  clickTxt(d, '#modal-box button', 'Orden para campo'); await tick(300);
  ok(descargas.some(f => f.startsWith('orden-OT-0001')), 'PDF de la orden generado: ' + descargas.join(', '));
  ok(w.eval('ordenes[0].estado') === 'Emitida', 'Al emitir el PDF la orden pasa a Emitida');
  // plan semanal PDF
  w.exportarPlanSemanalPDF(); await tick(300);
  ok(descargas.some(f => f.startsWith('plan-semanal-S44')), 'PDF del plan semanal generado');

  // 4. En ejecución y cierre con desviación
  clickTxt(d, '#modal-box button', 'Marcar en ejecución'); await tick(150);
  ok(w.eval('ordenes[0].estado') === 'En ejecución', 'Orden en ejecución');
  clickTxt(d, '#modal-box button', 'Cerrar con lo ejecutado'); await tick();
  val(d, 'ci-jornales', '2'); val(d, 'ins-real-0-cant', '260'); val(d, 'ci-obs', 'Sobraron 10 kg');
  clickTxt(d, '#modal-box button', 'Cerrar orden y registrar costo'); await tick(200);
  const cerrada = w.eval('ordenes[0]');
  const real = 2 * 82000 + 260 * 3250;
  ok(cerrada.estado === 'Cerrada' && Math.round(cerrada.real.total) === real, 'Cierre con costo real ' + cerrada.real.total);
  const lab = w.eval('labores.find(l=>l.otId)');
  ok(lab && lab.costo === real && lab.otNumero === 'OT-0001', 'Se creó la labor vinculada en Operación');
  w.showView('finanzas'); w.finTab('libros'); await tick();
  ok(d.getElementById('fin-cuerpo').textContent.includes('Fertilización edáfica'), 'El costo de la labor genera su asiento en el libro diario');
  w.showView('planeacion'); w.showPl('presupuesto'); await tick();
  ok(/\+\d/.test(d.getElementById('presu-stats').textContent) || /−|-\d/.test(d.getElementById('presu-stats').textContent) || d.getElementById('presu-stats').textContent.includes('%'), 'Presupuesto muestra desviación');
  // intento de borrar la labor vinculada: debe bloquearse
  w.eliminarLabor(lab.id); await tick();
  ok(w.eval('labores.length') === 1 && toasts(d).includes('Anular cierre'), 'No se puede borrar una labor que viene de una OT');

  // 5. Recarga: todo persiste
  ({ w, d, errores: e2 } = await abrir(store));
  ok(w.eval('ordenes.length') === 1 && w.eval('ordenes[0].estado') === 'Cerrada' && w.eval('plantillas.length') === 1 && w.eval('labores.length') === 1, 'Tras recargar persisten orden cerrada, plantilla y labor');
  // anular cierre
  w.anularCierreOT(w.eval('ordenes[0].id')); await tick();
  d.getElementById('confirm-ok-btn').click(); await tick(200);
  ok(w.eval('ordenes[0].estado') === 'En ejecución' && w.eval('labores.length') === 0, 'Anular cierre retira la labor y reabre la orden');
  // cancelar y eliminar
  w.cancelarOT(w.eval('ordenes[0].id')); await tick(150);
  w.eliminarOT(w.eval('ordenes[0].id')); await tick(250);
  ok(w.eval('ordenes.length') === 0 && store['ordenes/2026-10'].items.length === 0, 'Cancelar y eliminar limpia también la nube');
  // validación sin lotes ni jornales
  w.abrirNuevaOT(); await tick(); val(d, 'ot-plantilla', ''); w.cambioPlantillaOT(); await tick(); w.quitarInsumo('ot',0); await tick(); val(d, 'ot-jornales', '');
  clickTxt(d, '#modal-box button', 'Crear orden'); await tick();
  ok(w.eval('ordenes.length') === 0 && toasts(d).includes('jornales'), 'Valida que la orden tenga jornales o insumos');
  // localStorage (sin nube)
  const all = errores.concat(e2);
  ok(all.length === 0, 'Sin errores de JavaScript' + (all.length ? ': ' + all.join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
