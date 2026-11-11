// Pruebas v23: diseño de siembra completo, floración y calendario, BBCH, estimación por conteo, censo y resiembra, arvenses, labores con tarifa y carencia, OT con equipo, chequeo y aprobación, ENSO.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v23.html'), 'utf8');
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
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro', altitud: 1700 }], variedades: [{ id: 'v1', nombre: 'Castillo' }, { id: 'v2', nombre: 'Cenicafé 1' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', codigo: 'LOT01', variedadId: 'v1', hectareas: '0.35', diseno: { distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 180, pendiente: 30, trazado: 'recto' } }], bloques: [],
      trabajadores: [{ id: 't1', nombre: 'Walter Mejía', documento: '1098765447' }], empleados: [{ id: 'e1', nombre: 'Omar', cargo: 'CEO', salario: 0 }], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] }, 'datos/planeacion': { config: { valorJornal: 65000, alimentacion: 17000 }, plantillas: [] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s);
  // 1 · Diseño completo
  const T0 = E("geomLote(lotes[0]).total"); const set = o => E(`geoLimpiarCache(); lotes[0].diseno = Object.assign({ distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 180, pendiente: 30, trazado: 'recto' }, ${JSON.stringify(o)}); geomLote(lotes[0])`);
  const gB = set({ borde: 1 }); ok(gB.total < T0 && gB.total > T0 * 0.7, 'Borde de 1 m sin sembrar: ' + T0 + ' → ' + gB.total + ' plantas');
  const gC = set({ caminoCada: 5 }); ok(gC.nS < E("(geoLimpiarCache(), lotes[0].diseno = { distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 180, pendiente: 30, trazado: 'recto' }, geomLote(lotes[0]).nS)") && Math.abs(gC.total / T0 - 5 / 6) < 0.08, 'Camino cada 5 surcos: se deja 1 de cada 6 surcos libre');
  const gD = set({ sistema: 'doble', distPar: 0.6, distSurcos: 1.8 }); ok(gD.sistema === 'doble' && gD.total > T0 * 0.9 && gD.surcos[0].plantas[0].cod === 'LOT01-S01-P001', 'Surcos dobles (0,6 m en el par, calle 1,8 m): ' + gD.total + ' plantas, códigos desde LOT01-S01-P001');
  const gK = set({ callejonCada: 20, callejonAncho: 2 }); ok(gK.total < T0 && gK.total > T0 * 0.8, 'Callejón de 2 m cada 20 m: ' + gK.total + ' plantas');
  const gT = set({ sobreTerreno: true }); ok(gT.total > T0 && gT.fT > 1, 'Distancias medidas en la ladera (pendiente ' + Math.round(gT.pend) + ' %): ' + T0 + ' → ' + gT.total + ' plantas');
  set({}); E("lotes[0].variedadesMix = [{ variedadId: 'v1', pct: 70 }, { variedadId: 'v2', pct: 30 }]"); const pv = E("plantasPorVariedad(lotes[0])"); ok(pv.length === 2 && pv.reduce((s, x) => s + x.n, 0) === T0 && pv.find(x => x.v === 'v1').n > pv.find(x => x.v === 'v2').n, 'Mezcla 70/30 de variedades reparte las plantas por surcos');
  // UI del diseño
  w.ir('mapa'); await tick(); E("mapaSt.loteId='l1'; mapaSt.modo='lote'"); w.abrirDisenoLote(); await tick(); ok(!!d.getElementById('dl-sis') && !!d.getElementById('dl-borde') && !!d.getElementById('dl-terr') && !!d.getElementById('dl-prev2'), 'El formulario de diseño tiene sistema, borde, caminos, callejones y distancias en la ladera');
  d.getElementById('dl-borde').value = '1'; w.guardarDisenoLote(); await tick(150); ok(E("lotes[0].diseno.borde") === 1 && E("lotes[0].variedadesMix.length") === 2, 'El diseño se guarda con sus campos nuevos y la mezcla de variedades');
  // 2 · Floración y calendario
  w.ir('campo'); await tick(); ok(d.getElementById('page-title').textContent.includes('Seguimiento') && d.querySelectorAll('#cp-root .cs-tabs button').length === 7, 'Vista Seguimiento del cultivo con 7 pestañas');
  w.abrirFloracion(); await tick(); d.getElementById('fl-f').value = '2026-03-10'; w.guardarFloracion(); await tick(100);
  const H = E("hitosFloracion(floraciones[0])"); ok(H[0].f === '2026-05-09' && H.find(h => h.tipo === 'cosecha').f === E("sumarDias('2026-03-10', diasFlorCosecha() - 15)"), 'Floración del 10/03: roya el 09/05 (60 días) y ventana de cosecha a ' + E('diasFlorCosecha()') + ' días');
  E("cpSt.anio=2026"); w.renderCampo(); await tick(); ok(d.querySelector('#cp-cuerpo svg.g22') && d.getElementById('cp-cuerpo').textContent.includes('Broca'), 'Calendario por floración dibujado');
  // 3 · BBCH
  E("cpSt.tab='fenologia'"); w.renderCampo(); w.abrirFenologia(); await tick(); d.getElementById('fe-b').value = '75'; d.getElementById('fe-f').value = '2026-06-01'; w.guardarFenologia(); await tick(100); ok(E("estadioActual('l1').bbch") === '75' && d.getElementById('cp-cuerpo').textContent.includes('Desarrollo del fruto'), 'Observación BBCH 75 y estadio actual del lote');
  // 4 · Estimación
  E("cpSt.tab='estimacion'"); w.renderCampo(); w.abrirConteo(); await tick(); d.getElementById('co-f').value = '2026-07-01'; d.getElementById('co-r').value = '20'; d.getElementById('co-fr').value = '30'; d.getElementById('co-p').value = '10'; w.guardarConteo(); await tick(100);
  const est = E("estimarConteo(conteos[0])"); ok(Math.abs(est.kgArb - 20 * 30 * E('cfgMapa().gFruto') / 1000 * 0.9) < 1e-6 && est.arboles === E('geomLote(lotes[0]).total') && Math.abs(est.kgCPS - est.kgCereza / 5) < 1e-6, 'Conteo: ' + est.kgArb.toFixed(3) + ' kg/árbol × ' + est.arboles + ' árboles = ' + Math.round(est.kgCereza) + ' kg de cereza');
  // 5 · Censo, novedades y resiembra
  E("cpSt.tab='censo'"); w.renderCampo(); w.abrirNovedades(); await tick(); d.getElementById('nv-c').value = 'S03-P005, S03-P006\nS10-P002\nS99-P999'; d.getElementById('nv-e').value = 'Faltante'; w.guardarNovedades(); await tick(100);
  ok(E("censoLote(lotes[0]).Faltante") === 3 && E("novedadesPlanta.length") === 3, '3 plantas marcadas como faltantes (el código inválido se rechaza)');
  ok(E("plantasVivas(lotes[0]).n") === E('geomLote(lotes[0]).total') - 3, 'Las faltantes se restan de los árboles vivos de la estimación');
  w.otResiembra23('l1'); await tick(100); const ot = E("ordenes.find(o => o.tipo === 'Resiembra')"); ok(ot && ot.insumos[0].cantidad === 3 && ot.presupuesto.total > 3 * 1200 && (ot.plantasObjetivo || []).length === 3, 'Orden de resiembra con 3 colinos, jornales y presupuesto ' + (ot && ot.presupuesto.total));
  // 6 · Arvenses
  ok(E("decisionArvenses({ agresivas: 35, nobles: 20 }).c") === 'mal' && E("decisionArvenses({ agresivas: 5, nobles: 60 }).t") === 'Mantener coberturas', 'Decisión de arvenses según cobertura de agresivas y nobles');
  // 7 · Labores con tarifa y carencia
  E("cpSt.tab='labores'"); w.renderCampo(); await tick(); ok(E("catLabores.length") >= 7, 'Catálogo de labores con tarifas de base');
  w.abrirLabor23(); await tick(); d.getElementById('lr-c').value = E("catLabores.find(c => /fungicida/.test(c.nombre)).id"); w.totLabor23(); d.getElementById('lr-f').value = '2026-10-25'; d.getElementById('lr-p').value = '2'; d.getElementById('lr-h').value = '4'; d.getElementById('lr-ic').value = '50000'; w.totLabor23(); w.guardarLabor23(); await tick(100);
  const lb = E("labores[labores.length-1]"); ok(lb.costo === 65000 + 17000 + 50000 && lb.carencia === 30, 'Fungicida: 2 personas × 4 h = 1 jornal ($65.000) + alimentación $17.000 + insumo $50.000; carencia 30 días');
  ok(!!E("enCarencia('l1','2026-11-10')") && !E("enCarencia('l1','2026-11-30')"), 'El lote queda en carencia hasta el 24/11/2026');
  // 8 · OT con chequeo y aprobación
  E("campoConfig.otAprobacion = true"); w.ir('planeacion'); await tick(); w.abrirCierreOT(ot.id); await tick(); ok(!!d.querySelector('.ci-eqr') && d.querySelectorAll('.ci-chk').length === 4, 'El cierre de la orden pide equipo, chequeo y evidencias');
  d.querySelector('.ci-eqp').value = 't1'; d.querySelector('.ci-eqh').value = '6'; w.jornalesEquipo23(); ok(d.getElementById('ci-jornales').value === '0.75', 'Los jornales salen de las horas del equipo (6 h = 0,75)');
  d.querySelector('.ci-evd').value = 'Foto'; d.querySelector('.ci-evu').value = 'https://ejemplo.org/foto.jpg'; const nLab = E('labores.length'); w.confirmarCierreOT(); await tick(150);
  const o2 = E(`ordenes.find(o => o.id === '${ot.id}')`); ok(o2.estado === 'Por aprobar' && E('labores.length') === nLab && o2.laborPendiente && o2.real.equipo.length === 1 && o2.real.evidencias.length === 1, 'Con aprobación activa, la orden queda por aprobar y su costo no se contabiliza aún');
  w.verOT(ot.id); await tick(); ok(d.querySelector('.act-row').textContent.includes('Aprobar'), 'La orden por aprobar muestra Aprobar y Devolver'); w.aprobarOT23(ot.id); await tick(100);
  ok(E(`ordenes.find(o => o.id === '${ot.id}').estado`) === 'Cerrada' && E('labores.length') === nLab + 1, 'Al aprobar, el costo entra a Labores y Finanzas');
  // Orden con agroquímico exige EPP y dosis
  E(`ordenes.push({ id: 'otq', numero: 'OT-9', loteId: 'l1', tipo: 'Control de roya (fungicida)', fechaProgramada: '2026-10-30', jornales: 1, insumos: [], estado: 'Programada', presupuesto: { total: 0 } })`); w.abrirCierreOT('otq'); await tick(); w.confirmarCierreOT(); await tick(); ok(E("ordenes.find(o => o.id === 'otq').estado") === 'Programada', 'Una orden con agroquímicos no cierra sin confirmar EPP y dosis');
  try { w.closeModal(); } catch (e) {}
  // 9 · ENSO
  E("cpSt.tab='enso'"); w.ir('campo'); await tick(); w.abrirEnso(); await tick(); d.getElementById('en-m').value = '2026-10'; d.getElementById('en-f').value = 'La Niña'; w.guardarEnso(); await tick(); ok(d.getElementById('cp-cuerpo').textContent.includes('La Niña') && d.getElementById('cp-cuerpo').textContent.includes('roya'), 'Fase ENSO con su efecto esperado');
  for (const t of ['floracion', 'fenologia', 'estimacion', 'censo', 'arvenses', 'labores', 'enso']) { E(`cpSt.tab='${t}';cpSt.anio=2026`); w.renderCampo(); await tick(); const tx = d.getElementById('cp-cuerpo').textContent; ok(tx.length > 100 && !/undefined|NaN|No se pudo/.test(tx), 'Pestaña ' + t); }
  // 10 · Persistencia
  await w.guardarEstado(); await tick(200); const ag = store['datos/agronomia']; ok(ag.floraciones.length === 1 && ag.fenologia.length === 1 && ag.conteos.length === 1 && ag.enso.length === 1 && ag.catLabores.length >= 7 && ag.novedadesPlanta.length === 3 && ag.campoConfig.otAprobacion === true, 'Todo se guarda en el documento de agronomía');
  ({ w, d, errores } = await abrir(store)); ok(w.eval('floraciones.length') === 1 && w.eval("lotes[0].diseno.borde") === 1 && w.eval("marcasPlanta.filter(m => m.estado === 'Faltante').length") === 3, 'Al recargar, todo sigue igual');
  ok(errores.length === 0, 'Sin errores de ejecución' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
