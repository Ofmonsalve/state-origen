// Pruebas del nuevo shell: rutas, Hoy, paleta de comandos, deshacer, tema, asistente de cosecha y PDF, con nube congelada y alert/confirm bloqueados.
const fs = require('fs');
const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v4.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const deepFreeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
function crearNube(store) {
  const subs = [];
  const snapDoc = p => ({ exists: p in store, data: () => p in store ? deepFreeze(JSON.parse(JSON.stringify(store[p]))) : undefined });
  const snapCol = c => { const docs = Object.keys(store).filter(k => k.startsWith(c + '/')).map(k => ({ id: k, data: () => deepFreeze(JSON.parse(JSON.stringify(store[k]))) })); return { empty: !docs.length, docs }; };
  return {
    doc: p => ({ get: async () => snapDoc(p), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); setTimeout(() => subs.forEach(s => s()), 0); }, onSnapshot: fn => { subs.push(() => fn(snapDoc(p))); fn(snapDoc(p)); return () => {}; } }),
    collection: c => ({ get: async () => snapCol(c), onSnapshot: fn => { subs.push(() => fn(snapCol(c))); fn(snapCol(c)); return () => {}; } }),
  };
}
const descargas = [];
async function abrir(store, hash, opts = {}) {
  const errores = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/' + (hash || ''),
    beforeParse(w) {
      w.alert = () => {}; w.confirm = () => false; w.prompt = () => null;
      const nube = opts.sinNube ? null : crearNube(store);
      w.claude = { use: async n => n === 'db' ? nube : (n === 'downloads' ? { save: async f => { descargas.push(f.filename); } } : null) };
      w.addEventListener('error', e => errores.push(e.message));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
      w.Element.prototype.scrollIntoView = function () {};
    } });
  await new Promise(r => setTimeout(r, 350));
  return { w: dom.window, d: dom.window.document, errores };
}
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tecla = (d, key, extra = {}) => d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', Object.assign({ key, bubbles: true }, extra)));

(async () => {
  const hoy = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); })();
  const ayer = (() => { const x = new Date(Date.now() - 864e5); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); })();
  const store = {
    'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', hectareas: '0.6' }, { id: 'l2', fincaId: 'f1', nombre: 'Lote 2', hectareas: '' }], bloques: [], trabajadores: [{ id: 't1', nombre: 'Ana Ríos', tarifaPorKg: 700 }], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [{ id: 'a1', trabajadorId: 't1', valor: 20000, aplicado: false }], pagos: [] },
    'datos/planeacion': { config: { valorJornal: 65000, alimentacion: 17000 }, plantillas: [] },
  };
  store['ordenes/' + ayer.slice(0,7)] = { items: [{ id: 'o1', numero: 'OT-0001', estado: 'Emitida', prioridad: 'Alta', fechaProgramada: ayer, loteId: 'l1', area: 0.6, tipo: 'Fertilización edáfica', responsable: '', trabajadores: 2, insumos: [], presupuesto: { jornales: 1.5, manoObra: 123000, insumos: 0, total: 123000 } }] };
  store['ordenes/' + hoy.slice(0,7)] = store['ordenes/' + hoy.slice(0,7)] || { items: [] };
  store['ordenes/' + hoy.slice(0,7)].items.push({ id: 'o2', numero: 'OT-0002', estado: 'Programada', prioridad: 'Media', fechaProgramada: hoy, loteId: 'l1', area: 0.6, tipo: 'Control de malezas (guadaña)', responsable: 'Jorge', trabajadores: 1, insumos: [], presupuesto: { jornales: 1.8, manoObra: 147600, insumos: 0, total: 147600 } });
  store['registros/' + hoy.slice(0,7)] = { items: [{ id: 'g1', fincaId: 'f1', loteId: 'l1', lote: 'Lote 1', finca: 'El Tesoro', fecha: hoy, anio: +hoy.slice(0,4), tipo: 'Principal', pasada: 1, trabajadorId: 't1', recolector: 'Ana Ríos', horas: 8, kg: 96 }] };

  let { w, d, errores } = await abrir(store);
  ok(d.getElementById('view-hoy').classList.contains('active') && d.getElementById('page-title').textContent === 'Hoy', 'Arranca en Hoy');
  ok(!d.querySelector('#hoy-tareas .skel'), 'Los esqueletos de carga se reemplazan al llegar los datos');
  ok(d.getElementById('hoy-tareas').textContent.includes('Control de malezas') && d.getElementById('hoy-tareas').textContent.includes('96 kg'), 'Para hoy: orden del día y cosecha de hoy');
  const al = d.getElementById('hoy-alertas').textContent;
  ok(al.includes('OT-0001') && al.includes('sin hectáreas') && (al.includes('adelantos') || al.includes('anticipos')), 'Alertas: orden vencida, lote sin hectáreas y adelantos');
  ok(d.getElementById('badge-hoy').textContent === '1' && !d.getElementById('badge-hoy').hidden, 'Insignia de alertas críticas en Hoy');
  ok(d.getElementById('hoy-setup').textContent.includes('Complete sus datos'), 'Guía de puesta en marcha visible mientras falten pasos');
  ok(d.getElementById('hoy-kpis').textContent.includes('96 kg'), 'Indicador de cosecha del mes');

  // Navegación
  w.ir('planeacion'); await tick();
  ok(d.getElementById('page-title').textContent === 'Planeación' && w.location.hash === '#planeacion', 'Navegar actualiza título y enlace (#planeacion)');
  ok(d.querySelector('.nav-item[data-nav="planeacion"]').classList.contains('active') && d.querySelector('.tabbar [data-nav="planeacion"]').classList.contains('active'), 'Barra lateral y barra inferior marcan la sección');
  ({ w, d } = await abrir(store, '#finanzas'));
  ok(d.getElementById('view-finanzas').classList.contains('active'), 'Abrir con #finanzas va directo a Finanzas');

  // Paleta de comandos
  tecla(d, 'k', { ctrlKey: true }); await tick();
  ok(d.getElementById('cmd-overlay').classList.contains('open'), 'Ctrl+K abre la paleta');
  const q = d.getElementById('cmd-q'); q.value = 'ot-0001'; q.dispatchEvent(new w.Event('input')); await tick();
  ok(d.getElementById('cmd-list').textContent.includes('OT-0001'), 'La paleta encuentra órdenes por número');
  tecla(d, 'Enter'); await tick(120);
  ok(!d.getElementById('cmd-overlay').classList.contains('open') && d.getElementById('modal-box').textContent.includes('OT-0001'), 'Enter abre el detalle de la orden');
  w.closeModal();
  tecla(d, 'k', { ctrlKey: true }); await tick(); q.value = 'fertilizacion'; q.dispatchEvent(new w.Event('input')); await tick();
  ok(d.getElementById('cmd-list').textContent.includes('Fertilización edáfica'), 'La búsqueda ignora tildes');
  tecla(d, 'Escape'); await tick();
  ok(!d.getElementById('cmd-overlay').classList.contains('open'), 'Esc cierra la paleta');

  // Deshacer
  w.ir('gestion'); w.showSub('lotes'); await tick();
  w.eliminarLote('l2'); await tick(200);
  ok(w.eval('lotes.length') === 1 && store['datos/maestros'].lotes.length === 1, 'Eliminar lote aplica de inmediato y guarda');
  const btn = [...d.querySelectorAll('.toast .act')].find(b => b.textContent === 'Deshacer');
  ok(!!btn, 'El aviso ofrece Deshacer');
  btn.click(); await tick(250);
  ok(w.eval('lotes.length') === 2 && store['datos/maestros'].lotes.length === 2, 'Deshacer restaura el lote también en la nube');
  w.eliminarFinca('f1'); await tick();
  ok(w.eval('fincas.length') === 1, 'Integridad: no se elimina una finca con lotes');

  // Tema
  w.cambiarTema(); await tick();
  ok(d.documentElement.getAttribute('data-theme') === 'dark', 'Cambiar tema activa oscuro');

  // Registrar (hoja de acciones) y asistente de cosecha
  w.abrirRegistrar(); await tick();
  ok(d.querySelectorAll('#modal-box .cmd-item').length >= 6, 'Hoja "Registrar" con ' + d.querySelectorAll('#modal-box .cmd-item').length + ' acciones');
  d.querySelector('#modal-box .cmd-item').click(); await tick();
  ok(d.getElementById('wiz-overlay').classList.contains('open'), 'Desde Registrar se abre el asistente de cosecha');
  w.elegirLote({ fincaId: 'f1', loteId: 'l1', loteNombre: 'Lote 1' }); await tick();
  w.wizNext(); await tick(); w.wizNext(); await tick();
  w.agregarPersonaConocida('t1'); await tick();
  ['1','2','0'].forEach(k => w.keyTap(k)); w.keyConfirm(); await tick();
  w.wizNext(); await tick(); w.wizNext(); await tick(250);
  ok(w.eval('registros.length') === 2, 'El asistente guarda la cosecha (120 kg)');
  w.ir('panel'); await tick();
  ok(d.getElementById('stat-row').textContent.includes('216'), 'El panel de cosecha suma 96 + 120 = 216 kg');
  ok(d.querySelector('#chart-lote svg rect') && /var\(--/.test(d.querySelector('#chart-lote svg').innerHTML), 'Las gráficas usan colores del tema');
  w.exportarInformePDF(); await tick(300);
  ok(descargas.some(f => f.startsWith('informe-state-origen')), 'Informe de cosecha en PDF');

  // Sin nube: funciona con el navegador
  const r2 = await abrir({}, '', { sinNube: true });
  ok(/este equipo|Sin conexión/.test(r2.d.getElementById('sync-label').textContent) && r2.d.getElementById('hoy-setup').textContent.includes('Complete sus datos'), 'Sin nube arranca con guía de inicio y guardado local');
  const all = errores.concat(r2.errores);
  ok(all.length === 0, 'Sin errores de JavaScript' + (all.length ? ': ' + all.join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
