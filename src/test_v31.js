// Pruebas v31: sin nube no se pierde nada (aviso, cola local y subida al reconectar), edición de lo que solo se podía borrar, órdenes que se abren con un clic y formato de moneda/número.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v31.html'), 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '').replace(/<link[^>]+fonts[^>]+>/g, '');
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));
const freeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(freeze); } return o; };
function nube(store) { const sd = p => ({ exists: p in store, id: p.split('/').pop(), ref: { path: p }, data: () => p in store ? freeze(JSON.parse(JSON.stringify(store[p]))) : undefined }); const sc = c => { const docs = Object.keys(store).filter(k => k.startsWith(c + '/') && k.split('/').length === 2).map(sd); return { empty: !docs.length, docs }; };
  return { doc: p => ({ get: async () => sd(p), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); }, onSnapshot: fn => { setTimeout(() => fn(sd(p)), 0); return () => {}; } }), collection: c => ({ get: async () => sc(c), onSnapshot: fn => { setTimeout(() => fn(sc(c)), 0); return () => {}; } }) }; }
const almacen = {}; // localStorage compartido entre aperturas (mismo equipo)
function abrir(db) { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://e.org/#hoy', beforeParse(w) { w.alert = () => {}; w.confirm = () => false; w.claude = { use: async k => k === 'db' ? db : null };
    Object.defineProperty(w, 'localStorage', { value: { getItem: k => k in almacen ? almacen[k] : null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: k => { delete almacen[k]; } } });
    w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {}; } }); dom.errores = errores; return dom; }
(async () => {
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [], lotes: [{ id: 'l1', nombre: 'Uno', fincaId: 'f1', hectareas: 0.35 }], bloques: [], trabajadores: [{ id: 't1', nombre: 'Walter', documento: '1' }], empleados: [], activos: [] }, 'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [{ id: 'lb1', fecha: '2026-11-01', loteId: 'l1', tipo: 'Podas', costo: 50000 }], adelantos: [], pagos: [] },
    'ordenes/2026-11': { items: [{ id: 'o1', numero: 'OT-0007', estado: 'Programada', fechaProgramada: '2026-11-10', loteId: 'l1', tipo: 'Podas', presupuesto: { total: 100000, jornales: 1 } }] } };
  // 1) Sin nube
  let dom = abrir(null); await tick(1800); let w = dom.window, d = w.document, E = s => w.eval(s);
  ok(d.getElementById('nube31') && /Sin conexión a la nube/.test(d.getElementById('nube31').textContent) && /Sin conexión/.test(d.getElementById('sync-label').textContent), 'Sin nube: aviso rojo fijo y estado «Sin conexión a la nube»');
  E("trabajadores.push({ id: 'tLocal', nombre: 'Persona sin conexión', documento: '9' })"); await w.guardarEstado(); await tick(700);
  ok(almacen['so-pendiente-nube'] && JSON.parse(almacen['so-pendiente-nube']).estado.trabajadores.some(t => t.id === 'tLocal'), 'Lo registrado sin nube queda en espera en este equipo');
  ok(/sin conexión a la nube/i.test((d.querySelector('.modal-box') || {}).textContent || ''), 'Al primer guardado sin nube se avisa claramente con opción de descargar respaldo');
  // 2) Vuelve la nube: ofrece subir sin pisar lo de la nube
  dom = abrir(nube(store)); await tick(2600); w = dom.window; d = w.document; const E2 = s => w.eval(s);
  ok(/no se habían subido/.test((d.querySelector('.modal-box') || {}).textContent || '') && /1 nuevo/.test(d.querySelector('.modal-box').textContent), 'Con nube: ofrece subir los datos que quedaron en espera (1 persona nueva)');
  w.subir31(); await tick(800); ok(store['datos/maestros'].trabajadores.length === 2 && store['datos/maestros'].trabajadores.some(t => t.id === 'tLocal') && store['datos/maestros'].trabajadores.some(t => t.id === 't1') && !almacen['so-pendiente-nube'], 'Se suben y se unen con lo de la nube; la espera se limpia');
  ok(!d.getElementById('nube31') && /Sincronizado/.test(d.getElementById('sync-label').textContent), 'Con nube: sin aviso y estado «Sincronizado · hora»');
  // 3) Editar una labor (antes solo eliminar)
  w.ir('operacion'); try { w.showOp('labores'); } catch (e) {} await tick(250); const fila = [...d.querySelectorAll('#tabla-labores tbody tr')][0]; ok(fila && [...fila.querySelectorAll('button')].some(b => /editar31\('labor'/.test(b.getAttribute('onclick') || '')), 'Las labores ahora tienen «Editar»');
  w.editar31('labor', 'lb1'); await tick(150); const costo = d.getElementById('lg-costo'); ok(costo && costo.classList.contains('f31-moneda') && /^\$ 50\.000$/.test(w.HTMLInputElement.prototype.__lookupGetter__ ? Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').get.call(costo) : ''), 'El costo se muestra como moneda: $ 50.000');
  costo.value = '75.500'; ok(costo.value === '75500', 'Se lee como número limpio (75500) aunque se escriba con puntos');
  w.guardar31('labor', 'lb1'); await tick(500); ok(E2("labores.find(x => x.id === 'lb1').costo") === 75500 && store['datos/finanzas'].labores[0].costo === 75500, 'La labor editada se guarda en la nube');
  // 4) Formatos de campos
  w.openModal('<h3>Prueba</h3><div class="fgrid c2"><label class="f">Hectáreas<input id="t-ha" type="number" value="0.35"></label><label class="f">Valor del kilo ($)<input id="t-v" type="number" value="900"></label><label class="f">Nombre<input id="t-n" value="Ana"></label></div>'); await tick(120);
  const vis = id => Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').get.call(d.getElementById(id));
  ok(vis('t-ha') === '0,35' && d.getElementById('t-ha').value === '0.35' && vis('t-v') === '$ 900' && d.getElementById('t-n').type === 'text' && vis('t-n') === 'Ana', 'Número con coma decimal (0,35), moneda con $ (900) y texto como texto');
  d.getElementById('t-v').value = 1250000; ok(vis('t-v') === '$ 1.250.000', 'Moneda con separador de miles: $ 1.250.000'); w.closeModal();
  ok(d.querySelector('.modal-box') && true, 'Ventanas con encabezado e ícono'); w.openModal('<h3>Editar recolector</h3><p class="hint">x</p>'); await tick(50); ok(d.querySelector('#modal-box h3 .mh31-i'), 'El encabezado de la ventana lleva su ícono'); w.closeModal();
  // 5) Órdenes de trabajo con un clic
  w.ir('hoy'); await tick(250); const enl = d.querySelector('.ot31'); ok(enl && enl.textContent === 'OT-0007', 'Los números de orden en pantalla son enlaces');
  enl.click(); await tick(150); ok(/OT-0007/.test((d.querySelector('.modal-box') || {}).textContent || ''), 'Tocar el número abre la ventana de la orden con sus datos'); w.closeModal();
  ok(dom.errores.length === 0, 'Sin errores' + (dom.errores.length ? ': ' + dom.errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
