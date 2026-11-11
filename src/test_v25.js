// Pruebas v25: fase D (predio y cumplimiento) y motor PDF editorial.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v25.html'), 'utf8');
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
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro', areaTotal: 1, forma: { pts: [[0, 0], [100, 0], [100, 95], [0, 95]] } }], variedades: [], lotes: [], bloques: [], trabajadores: [{ id: 't1', nombre: 'Walter Mejía', documento: '1098765447' }], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] }, 'datos/comercial': { partidas: [], terceros: [{ id: 'te1', nombre: 'Omar Monsalve', nit: '91000011', tipo: 'Otro' }, { id: 'te2', nombre: 'Cooperativa', nit: '800197268', tipo: 'Cliente', tipoDoc: 'NIT', dvRut: '4' }] },
    'datos/legal': { predios: [], documentos: [{ id: 'dX', tipo: 'RUT', descripcion: 'RUT del propietario', vence: '2026-01-01', aviso: 30 }] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s); await tick(300);
  ok(E("_legalCargado") && E("LEG.documentos.length") === 1, 'El documento legal se carga de la nube antes de poder guardarse');
  w.ir('legal'); await tick(); ok(d.querySelectorAll('#lg-root .lg-tabs button:not(.p27-mas)').length === 10 && E("LEG.matrizLegal.length") === 12 && E("LEG.peligros.length") === 7 && E("LEG.riesgos.length") === 8, 'Vista con 10 pestañas; matriz legal, peligros y riesgos de base');
  // Predio con validaciones
  E("lgSt.tab='predios'"); w.renderLegal(); w.abrirEnt25('predios'); await tick(); const g = (k, v) => { d.getElementById('lg-' + k).value = v; };
  g('nombre', 'El Tesoro'); g('matricula', '319-12345'); g('npn', '1234'); w.guardarEnt25('predios', ''); await tick(); ok(E("LEG.predios.length") === 0, 'Un número predial que no tiene 30 dígitos se rechaza');
  g('npn', '682450000000000010123000000000'); g('areaCatastral', '1.2'); g('areaRegistral', '0.95'); g('areaMedida', '0.95'); g('fincaId', 'f1'); w.guardarEnt25('predios', ''); await tick(100);
  const p = E("LEG.predios[0]"); const ar = E("areasPredio(LEG.predios[0])"); ok(p && p.codigo === 'PRD-001' && ar.lista.length === 4 && ar.alerta && Math.round(ar.dif) === 26, 'Predio guardado; las áreas (catastral 1,2 vs 0,95 ha) difieren 26 % y se alerta');
  // Predial con pago contable
  w.abrirEnt25('avaluos'); await tick(); g('predioId', p.id); g('anio', '2026'); g('avaluo', '40000000'); g('tarifa', '7'); g('vence', '2026-06-30'); g('pagado', '200000'); g('fechaPago', '2026-03-10'); w.guardarEnt25('avaluos', ''); await tick(100);
  const ip = E("infoPredial(LEG.avaluos[0])"); ok(ip.calc === 280000 && ip.saldo === 80000 && ip.estado === 'Vencido', 'Predial: 40 M × 7 ‰ = $280.000; pagado $200.000; saldo $80.000 vencido');
  ok(E("movimientos.some(m => m.cuenta === '5115' && m.valor === 200000 && m.predialId === LEG.avaluos[0].id)"), 'El pago del predial entra a la contabilidad como gasto 5115');
  // Propietarios
  w.abrirEnt25('propietarios'); await tick(); g('predioId', p.id); g('terceroId', 'te1'); g('pct', '60'); w.guardarEnt25('propietarios', ''); await tick(80); ok(E(`sumaPropiedad('${p.id}')`) === 60 && E("alertasLegales().some(a => /suman 60/.test(a.msg))"), 'Propietarios que suman 60 % generan alerta');
  // Tradición con hipoteca vigente
  w.abrirEnt25('tradicion'); await tick(); g('predioId', p.id); g('numero', '5'); g('fecha', '2024-05-01'); g('naturaleza', 'Gravamen'); g('acto', 'Hipoteca abierta'); w.guardarEnt25('tradicion', ''); await tick(80); ok(E("LEG.tradicion.filter(gravamenVigente).length") === 1, 'La hipoteca sin cancelar queda como gravamen vigente');
  // Documentos y contratos
  ok(E("estadoDoc(LEG.documentos[0]).c") === 'mal', 'Un documento vencido se marca en rojo');
  E("LEG.documentos.push({ id: 'dT', tipo: 'Certificado de tradición', descripcion: 'Certificado', expedicion: '2026-08-01' })"); ok(E("estadoDoc(LEG.documentos[1]).t") === 'Tiene más de 30 días', 'El certificado de tradición con más de 30 días se señala');
  E("LEG.contratos.push({ id: 'cT', tipo: 'Arrendamiento', terceroId: 'te2', inicio: '2025-01-01', fin: sumarDias(hoyLocal(), 20), preaviso: 30 })"); ok(E("estadoContrato(LEG.contratos[0]).c") === 'mal', 'Contrato en periodo de preaviso: hay que avisar ya');
  // SST
  ok(E("nivelIPEVR({ nd: 6, ne: 2, nc: 60 }).NR") === 720 && E("nivelIPEVR({ nd: 6, ne: 2, nc: 60 }).nv") === 'I' && E("nivelIPEVR({ nd: 2, ne: 3, nc: 25 }).nv") === 'II' && E("nivelIPEVR({ nd: 2, ne: 1, nc: 10 }).nv") === 'IV', 'GTC 45: NP × NC y niveles I a IV');
  E("LEG.accidentes.push({ id: 'aX', fecha: sumarDias(hoyLocal(), -10), personaId: 't1', tipo: 'Accidente de trabajo', reportado: false })"); ok(E("reporteTardio(LEG.accidentes[0])") && E("alertasLegales().some(a => /no se ha reportado a la ARL/.test(a.msg))"), 'Un accidente sin reportar a la ARL en 2 días hábiles se alerta');
  // Riesgos
  const r = E("evalRiesgo({ prob: 4, impacto: 5, eficacia: 50 })"); ok(r.ih === 20 && r.ni.t === 'Extremo' && r.res === 10 && r.nr.t === 'Alto', 'Riesgo 4 × 5 = 20 extremo; con controles al 50 % queda 10 alto');
  // Terceros: DV y autorización
  ok(E("controlDV(terceros.find(t => t.id === 'te2')).c") === 'bien' && E("dvNIT('800197268')") === 4, 'DV de la DIAN verificado');
  // Índices y centro de mando
  const il = E('indiceLegal()'); ok(il != null && il < 100, 'Índice de cumplimiento ' + il); w.ir('mando'); await tick(200); ok(d.querySelectorAll('.md24-i').length >= 10 && d.getElementById('md-root').textContent.includes('Predio y cumplimiento'), 'El centro de mando suma el índice de predio y cumplimiento');
  // Todas las pestañas
  for (const t of ['resumen', 'predios', 'predial', 'propiedad', 'documentos', 'aguas', 'matriz', 'sst', 'riesgos', 'terceros']) { E(`lgSt.tab='${t}'`); w.ir('legal'); await tick(80); const tx = d.getElementById('lg-cuerpo').textContent; ok(tx.length > 80 && !/undefined|NaN|No se pudo/.test(tx), 'Pestaña ' + t); }
  // PDF de la ficha legal y portada nueva
  w.repLegal(); await tick(400); ok(descargas.some(f => /ficha-legal-cumplimiento/.test(f)), 'Ficha legal y de cumplimiento en PDF');
  ok(E("(() => { const R = new InformePDF({ titulo: 'Prueba', imagen: false }); R.portada(); R.seccion(1, 'Uno'); R.kpis([{ t: 'A', v: '1' }]); R.nuevaPagina(); R.seccion(2, 'Dos'); R.pie(); return R.portadaCompleta && R.secciones.length === 2 && R.doc.getNumberOfPages() === 3; })()"), 'Portada a página completa con índice de contenido');
  // Persistencia
  await w.guardarEstado(); await tick(200); ok(store['datos/legal'].predios.length === 1 && store['datos/legal'].avaluos.length === 1 && store['datos/legal'].matrizLegal.length === 12, 'Todo se guarda en el documento legal');
  ({ w, d, errores } = await abrir(store)); await tick(300); ok(w.eval('LEG.predios.length') === 1 && w.eval('LEG.propietarios.length') === 1, 'Al recargar, el predio y sus datos siguen');
  ok(errores.length === 0, 'Sin errores de ejecución' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
