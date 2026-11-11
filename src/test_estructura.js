// Pruebas del módulo Mapa y muestreos con nube congelada y alert/confirm bloqueados.
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
async function abrir(store, opts = {}) {
  const errores = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) {
      w.alert = () => {}; w.confirm = () => false;
      const nube = opts.sinNube ? null : crearNube(store);
      w.claude = opts.sinClaude ? undefined : { use: async n => n === 'db' ? nube : (n === 'downloads' ? { save: async f => { descargas.push(f.filename); } } : null) };
      w.addEventListener('error', e => errores.push(e.message));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
      w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {};
    } });
  await new Promise(r => setTimeout(r, 350));
  return { w: dom.window, d: dom.window.document, errores };
}
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const val = (d, id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); el.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); };
const clickTxt = (d, sel, txt) => { const b = [...d.querySelectorAll(sel)].find(x => x.textContent.includes(txt)); if (!b) throw new Error('No hay botón: ' + txt); b.click(); };
const toasts = d => [...d.querySelectorAll('.toast')].map(t => t.textContent).join(' | ');
const allItems = (store, col) => Object.keys(store).filter(k => k.startsWith(col + '/')).flatMap(k => store[k].items);

(async () => {
  const store = {
    'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro', areaTotal: 3 }, { id: 'f2', nombre: 'La Esperanza', areaTotal: 2 }], variedades: [{ id: 'v1', nombre: 'Castillo' }, { id: 'v2', nombre: 'Caturra' }],
      lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', variedadId: 'v1', hectareas: '0.6', diseno: { distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 0, pendiente: 30, trazado: 'contorno' } }, { id: 'l2', fincaId: 'f1', nombre: 'Lote 2', variedadId: 'v1', hectareas: '0.4' }, { id: 'l3', fincaId: 'f2', nombre: 'Lote A', variedadId: 'v2', hectareas: '1' }],
      bloques: [], trabajadores: [{ id: 't1', nombre: 'Ana', tarifaPorKg: 700 }], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [{ id: 'v1', finca: 'El Tesoro', lote: 'Lote 1', kg: 10, precio: 18000 }], beneficios: [], labores: [], adelantos: [], pagos: [] },
    'registros/2026-10': { items: [{ id: 'g1', fincaId: 'f1', loteId: 'l1', lote: 'Lote 1', finca: 'El Tesoro', fecha: '2026-10-05', anio: 2026, tipo: 'Principal', pasada: 1, trabajadorId: 't1', recolector: 'Ana', horas: 8, kg: 100 },
      { id: 'g2', fincaId: 'f1', loteId: 'l2', lote: 'Lote 2', finca: 'El Tesoro', fecha: '2026-10-06', anio: 2026, tipo: 'Principal', pasada: 1, trabajadorId: 't1', recolector: 'Ana', horas: 8, kg: 50 }] },
  };
  let { w, d, errores } = await abrir(store);
  w.ir('gestion'); w.showSub('lotes'); await tick();

  // Editar lote: renombrar y cambiar área
  w.editarEntidad('lote', 'l1'); await tick();
  val(d, 'ed-nombre', 'Lote Central'); val(d, 'ed-hectareas', '0.65'); val(d, 'ed-motivo', 'Medición con GPS');
  clickTxt(d, '#modal-box button', 'Guardar cambios'); await tick(200);
  ok(w.eval("lotes.find(l=>l.id==='l1').nombre") === 'Lote Central', 'Editar: el lote se renombra');
  ok(w.eval("registros.find(r=>r.id==='g1').lote") === 'Lote Central' && w.eval("ventas[0].lote") === 'Lote Central', 'El nombre nuevo se propaga a cosecha y ventas');
  ok(w.eval("lotes.find(l=>l.id==='l1').alias[0]") === 'Lote 1' && w.eval("lotes.find(l=>l.id==='l1').areaHistorial[0].antes") === 0.6, 'Se guardan el nombre anterior y el área anterior');
  ok(allItems(store, 'bitacora').some(b => b.accion === 'Edición' && b.detalle.includes('Medición con GPS') && b.detalle.includes('Lote 1 → Lote Central')), 'La edición queda en el historial de cambios (nube)');

  // Editar finca
  w.editarEntidad('finca', 'f1'); await tick(); val(d, 'ed-nombre', 'El Tesoro de Ocamonte'); clickTxt(d, '#modal-box button', 'Guardar cambios'); await tick(150);
  ok(w.eval("registros.every(r=>r.finca==='El Tesoro de Ocamonte')") && w.eval("ventas[0].finca") === 'El Tesoro de Ocamonte', 'Renombrar finca actualiza cosecha y ventas');
  // Tarifa: el pago histórico no cambia
  const pagoAntes = w.eval("registros.reduce((a,r)=>a+n0(r.kg)*tarifaDe(r),0)");
  w.editarEntidad('trabajador', 't1'); await tick(); val(d, 'ed-tarifaPorKg', '800'); clickTxt(d, '#modal-box button', 'Guardar cambios'); await tick(150);
  ok(w.eval("registros.reduce((a,r)=>a+n0(r.kg)*tarifaDe(r),0)") === pagoAntes && pagoAntes === 105000, 'Subir la tarifa no cambia lo ya recolectado (' + pagoAntes + ')');

  // Ajuste de área
  w.abrirAjusteArea('lote', 'l2'); await tick(); val(d, 'aa-nueva', '0.5'); val(d, 'aa-motivo', 'Compra o anexión de terreno');
  ok(d.getElementById('aa-dif').textContent.includes('Aumenta 0,1 ha'), 'Ajuste de área muestra la diferencia');
  clickTxt(d, '#modal-box button', 'Guardar nueva área'); await tick(150);
  ok(w.eval("lotes.find(l=>l.id==='l2').hectareas") === '0.5' && w.eval("lotes.find(l=>l.id==='l2').areaHistorial.length") === 1, 'Área aumentada con historial');

  // Dividir Lote Central (0,65 ha) en 2
  w.abrirDividirLote('l1'); await tick();
  val(d, 'dv-ha-0', '0.4'); val(d, 'dv-ha-1', '0.3');
  clickTxt(d, '#modal-box button', 'Dividir lote'); await tick(80);
  ok(toasts(d).includes('supera el área'), 'División: no permite superar el área original');
  val(d, 'dv-ha-1', '0.25'); val(d, 'dv-nom-0', 'Central Norte'); val(d, 'dv-nom-1', 'Central Sur'); val(d, 'dv-motivo', 'Zoqueo de la mitad');
  clickTxt(d, '#modal-box button', 'Dividir lote'); await tick(200);
  const nuevos = w.eval("lotes.filter(l=>(l.origen||[]).includes('l1')).map(l=>({n:l.nombre,ha:l.hectareas,dis:!!l.diseno,cod:l.codigo}))");
  ok(nuevos.length === 2 && nuevos[0].ha === '0.4' && nuevos.every(n => n.dis), 'Se crean 2 lotes con el diseño heredado');
  ok(w.eval("lotes.find(l=>l.id==='l1').estado") === 'inactivo' && w.eval("registros.find(r=>r.id==='g1').loteId") === 'l1', 'El lote original queda histórico y su cosecha sigue vinculada');
  ok(!w.eval("lotesActivos().some(l=>l.id==='l1')"), 'El lote histórico ya no aparece para registros nuevos');
  const idNorte = w.eval("lotes.find(l=>l.nombre==='Central Norte').id");
  w.verHistoria('lote', idNorte); await tick();
  ok(d.getElementById('modal-box').textContent.includes('Proviene de') && d.getElementById('modal-box').textContent.includes('Total con historia') && d.getElementById('modal-box').textContent.includes('100'), 'La historia del lote nuevo muestra su origen y la cosecha del original');
  w.closeModal();

  // Unificar Central Sur + Lote 2
  const idSur = w.eval("lotes.find(l=>l.nombre==='Central Sur').id");
  w.toggleLoteSel(idSur, true); w.toggleLoteSel('l2', true); w.abrirUnificarLotes(); await tick();
  ok(d.getElementById('un-ha').value === '0.75', 'Unificar propone la suma de áreas (0,75 ha)');
  val(d, 'un-nombre', 'Lote Sur Unificado'); clickTxt(d, '#modal-box button', 'Unificar lotes'); await tick(200);
  const uni = w.eval("lotes.find(l=>l.nombre==='Lote Sur Unificado')");
  ok(uni && uni.origen.length === 2 && w.eval(`lotes.find(l=>l.id==='${idSur}').estado`) === 'inactivo' && w.eval("lotes.find(l=>l.id==='l2').estado") === 'inactivo', 'Unificación: lote nuevo con 2 orígenes; los originales quedan históricos');
  w.verHistoria('lote', uni.id); await tick();
  ok(d.getElementById('modal-box').textContent.includes('Lote Central'), 'La trazabilidad sigue dos niveles hacia atrás (hasta el lote original)');
  w.closeModal();
  // Unificar lotes de fincas distintas: bloqueado
  w.toggleLoteSel(idNorte, true); w.toggleLoteSel('l3', true); w.abrirUnificarLotes(); await tick();
  ok(toasts(d).includes('misma finca'), 'No unifica lotes de fincas distintas');
  w.eval('loteSel.clear()');

  // Trasladar Lote A a El Tesoro
  w.abrirTrasladarLote('l3'); await tick(); clickTxt(d, '#modal-box button', 'Trasladar lote'); await tick(150);
  ok(w.eval("lotes.find(l=>l.id==='l3').fincaId") === 'f1' && w.eval("lotes.find(l=>l.id==='l3').fincasHistorial.length") === 1, 'Traslado de lote a otra finca con historial');

  // Unificar fincas
  w.showSub('fincas'); await tick();
  w.abrirUnificarFincas(); await tick();
  d.querySelectorAll('.uf-chk').forEach(c => { c.checked = true; c.dispatchEvent(new w.Event('change')); });
  ok(d.getElementById('uf-ha').value === '5', 'Unificar fincas suma las áreas (5 ha)');
  val(d, 'uf-nombre', 'Hacienda Unificada'); clickTxt(d, '#modal-box button', 'Unificar fincas'); await tick(200);
  const fu = w.eval("fincas.find(f=>f.nombre==='Hacienda Unificada')");
  ok(fu && w.eval(`lotesActivos().every(l=>l.fincaId==='${fu.id}')`) && w.eval("fincasActivas().length") === 1, 'Los lotes activos pasan a la finca unificada');
  ok(w.eval("registros.find(r=>r.id==='g1').fincaId") === 'f1', 'La cosecha pasada sigue en la finca donde ocurrió');

  // Separar finca
  w.abrirSepararFinca(fu.id); await tick();
  const chk = d.querySelector('.sf-chk'); chk.checked = true; chk.dispatchEvent(new w.Event('change'));
  val(d, 'sf-nombre', 'La Esperanza II'); clickTxt(d, '#modal-box button', 'Crear finca nueva'); await tick(200);
  ok(w.eval("fincas.some(f=>f.nombre==='La Esperanza II' && (f.origen||[]).length===1)") && w.eval("fincasActivas().length") === 2, 'Separar: finca nueva con su origen');
  // Retirar y reactivar
  const lr = w.eval("lotesActivos()[0].id");
  w.abrirRetirar('lote', lr); await tick(); clickTxt(d, '#modal-box button', 'Retirar'); await tick(150);
  ok(w.eval(`lotes.find(l=>l.id==='${lr}').estado`) === 'inactivo', 'Retirar lote');
  w.reactivar('lote', lr); await tick(150);
  ok(w.eval(`activo(lotes.find(l=>l.id==='${lr}'))`), 'Reactivar lote');
  w.reactivar('lote', 'l1'); await tick();
  ok(toasts(d).includes('reemplazado'), 'No reactiva un lote reemplazado por división');

  // Tablas y historial
  w.mostrarHistoricos = true; w.eval('mostrarHistoricos=true'); w.renderGestionTablas();
  ok(d.getElementById('tabla-lotes').textContent.includes('Dividido en Central Norte, Central Sur') && d.getElementById('tabla-lotes').textContent.includes('Unificado en Lote Sur Unificado'), 'La tabla muestra el destino de los lotes históricos');
  w.showSub('historial'); await tick();
  const nBit = d.querySelectorAll('#tabla-bitacora tbody tr').length;
  ok(nBit >= 14, 'Historial de cambios con ' + nBit + ' eventos');
  // Recarga
  const r2 = await abrir(store);
  ok(r2.w.eval('bitacora.length') === nBit && r2.w.eval("lotes.length") === 6 && r2.w.eval("fincas.length") === 4, 'Tras recargar persisten lotes, fincas e historial');
  const all = errores.concat(r2.errores);
  ok(all.length === 0, 'Sin errores de JavaScript' + (all.length ? ': ' + all.join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
