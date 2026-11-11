// Pruebas v21: cosecha con pago por kilo/jornal/nómina, alimentación proporcional, edición auditada, bloqueos, liquidación, anulación y beneficio ligado.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v21.html'), 'utf8');
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
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', variedadId: 'v1', hectareas: '0.35' }], bloques: [], trabajadores: [{ id: 't1', nombre: 'Walter', tarifaPorKg: 900 }], empleados: [{ id: 'e1', nombre: 'Omar', cargo: 'CEO', salario: 0 }, { id: 'e2', nombre: 'Jairo', cargo: 'Mayordomo', salario: 1500000 }], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [{ id: 'a1', trabajadorId: 't1', valor: 20000, aplicado: false }], pagos: [] }, 'datos/planeacion': { config: { valorJornal: 65000, alimentacion: 17000 }, plantillas: [] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s);
  ok(d.getElementById('cs-root') && E('tbSt.periodo') === 'anio', 'Vista Cosecha nueva y tablero abre en el año en curso');
  // Asistente: día por kilo a $1.000, Walter 60 kg 8 h, Omar (nómina sin salario) 30 kg 4 h, Jairo (nómina con salario) 20 kg 8 h
  w.openWizard(); await tick(); w.elegirLote({ fincaId: 'f1', loteId: 'l1', loteNombre: 'Lote 1' }); await tick(); E("wiz.fecha='2026-10-20'"); w.wizNext(); await tick(); w.elegirTipo('Secundaria'); await tick(); w.wizNext(); await tick();
  ok(d.getElementById('chip-personas').textContent.includes('Omar') && d.getElementById('chip-personas').textContent.includes('Nómina'), 'El personal de nómina aparece para registrar cosecha');
  E("wiz.tarifa=1000; wiz.alim=true"); w.agregarPersonaConocida('t1'); ['6', '0'].forEach(k => w.keyTap(k)); w.keyConfirm();
  w.agregarPersonaConocida('emp:e1'); ['3', '0'].forEach(k => w.keyTap(k)); w.keyConfirm(); E("wiz.personas[1].horas=4");
  w.agregarPersonaConocida('emp:e2'); ['2', '0'].forEach(k => w.keyTap(k)); w.keyConfirm();
  w.wizNext(); await tick(); ok(d.getElementById('wiz-body').textContent.includes('Confirme'), 'Resumen antes de guardar'); w.wizNext(); await tick(300);
  const R = E('registros.map(r => ({ n: r.recolector, m: r.modalidad, t: r.tarifa, kg: r.kg, h: r.horas, pago: pagoRegistro(r), alim: alimRegistro(r), costo: costoRegistro(r), emp: r.empleadoId, tipo: r.tipo }))');
  ok(R.length === 3 && R.every(r => r.tipo === 'Secundaria'), '3 registros de mitaca guardados');
  const wil = R.find(r => r.n === 'Walter'), om = R.find(r => r.n === 'Omar'), ja = R.find(r => r.n === 'Jairo');
  ok(wil.pago === 60000 && wil.alim === 17000 && wil.costo === 77000, 'Por kilo: 60 kg × $1.000 + alimentación completa (8 h) como costo de la finca');
  ok(om.pago === 30000 && om.alim === 8500 && om.emp === 'e1', 'Nómina sin salario: pago por kilo y alimentación proporcional (4 h = $8.500)');
  ok(ja.m === 'nomina' && ja.pago === 0, 'Nómina con salario: sin pago aparte');
  ok(E("trabajadores.some(t => t.empleadoId === 'e1')") && E("bitacora.filter(b => b.entidad === 'registro' && b.accion === 'Creación').length") === 3, 'Personal de nómina vinculado y cada registro con su historial de creación');
  // Edición auditada
  const id = E("registros.find(r => r.recolector === 'Walter').id"); w.abrirEditarRegistro(id); await tick(); d.getElementById('er-kg').value = '65'; w.guardarEdicionRegistro(id); await tick();
  ok(E(`registros.find(r => r.id === '${id}').kg`) === 60, 'Sin motivo no deja editar');
  d.getElementById('er-motivo').value = 'error de digitación'; w.guardarEdicionRegistro(id); await tick(150);
  ok(E(`registros.find(r => r.id === '${id}').kg`) === 65 && E(`bitacora.some(b => b.refId === '${id}' && b.accion === 'Edición' && /60 → 65/.test(b.detalle))`), 'Edición guardada con antes → después y motivo en el historial');
  // Ajustar día: valor del kilo $1.100
  const k = E(`grupoDia(registros.find(r => r.id === '${id}'))`); w.abrirEditarDia(k); await tick(); d.getElementById('er-tarifa').value = '1100'; d.getElementById('er-motivo').value = 'ajuste de tarifa de mitaca'; w.guardarEdicionDia(k); await tick(150);
  ok(E(`registros.find(r => r.id === '${id}').tarifa`) === 1100, 'Ajustar el día cambia el valor del kilo de todos sus registros');
  // Liquidación de Walter: 65 × 1.100 − adelanto 20.000
  w.ir('personal'); await tick(); w.abrirModalPago('t1'); await tick(); await w.confirmarPago('t1'); await tick(300);
  const pg = E("pagos[0]"); ok(pg && pg.valorBruto === 71500 && pg.valorNeto === 51500 && pg.registroIds.length === 1, 'Liquidación: bruto $71.500, neto $51.500, ligada al registro');
  ok(E(`registros.find(r => r.id === '${id}').pagoId`) === pg.id && descargas.some(f => f.startsWith('comprobante-')), 'El registro queda marcado como pagado y se genera el comprobante');
  w.abrirEditarRegistro(id); await tick(); d.getElementById('er-kg').value = '70'; d.getElementById('er-motivo').value = 'x'; w.guardarEdicionRegistro(id); await tick();
  ok(E(`registros.find(r => r.id === '${id}').kg`) === 65 && /anule primero/.test([...d.querySelectorAll('.toast')].map(t => t.textContent).join(' ')), 'No deja cambiar los kilos de un registro pagado');
  w.closeModal(); w.eliminarRegistroCosecha(id); await tick(); ok(E('registros.length') === 3, 'No deja eliminar un registro pagado');
  // Anular pago
  w.anularPago(pg.id); await tick(); d.getElementById('an-motivo').value = 'tarifa equivocada'; w.confirmarAnularPago(pg.id); await tick(150);
  ok(!E('pagos.length') && !E(`registros.find(r => r.id === '${id}').pagoId`) && E("adelantos[0].aplicado") === false && E("bitacora.some(b => b.accion === 'Anulación')"), 'Anular el pago libera los registros y el adelanto, con historial');
  // Beneficio ligado y partida
  w.ir('panel'); await tick(); w.abrirBeneficioCosecha(); await tick(); d.getElementById('bc-fecha').value = '2026-10-25'; d.getElementById('bc-perg').value = '23';
  w.guardarBenCosecha(); await tick(200); const b = E('beneficios[0]');
  ok(b && b.kgEntrada === 115 && b.registroIds.length === 3 && E("registros.every(r => r.beneficioId)") && E('partidas.length') === 1 && E('partidas[0].beneficioIds[0]') === b.id, 'Beneficio liga los 3 registros (115 kg) y crea la partida');
  w.eliminarRegistroCosecha(id); await tick(); ok(E('registros.length') === 3, 'No deja eliminar cereza ya beneficiada');
  // Eliminar día bloqueado y eliminar un registro libre con motivo
  w.eliminarBeneficio(b.id); await tick(150); ok(!E('beneficios.length') && E("registros.every(r => !r.beneficioId)"), 'Eliminar el beneficio libera la cereza');
  const idJ = E("registros.find(r => r.recolector === 'Jairo').id"); w.eliminarRegistroCosecha(idJ); await tick(); d.getElementById('el-motivo').value = 'duplicado'; w.confirmarEliminarRegistros([idJ]); await tick(150);
  ok(E('registros.length') === 2 && E(`bitacora.some(b => b.refId === '${idJ}' && b.accion === 'Eliminación' && b.antes && b.motivo === 'duplicado')`), 'Eliminar guarda el registro completo y el motivo en el historial');
  // Contabilidad: partida doble con alimentación en especie
  const cu = E("(() => { let mal = 0; libroDiario().asientos.forEach(a => { const dd = a.lineas.reduce((s, l) => s + l.debe, 0), hh = a.lineas.reduce((s, l) => s + l.haber, 0); if (Math.abs(dd - hh) > 1) mal++; }); const rc = libroDiario().asientos.filter(a => a.origen === 'Recolección'); return { mal, rc: rc.length, l: rc[0] && rc[0].lineas.map(l => l.cuenta).join(',') }; })()");
  ok(cu.mal === 0 && cu.rc === 1 && cu.l.includes('1105'), 'Asiento de recolección cuadra: costo, por pagar y alimentación entregada');
  // Persistencia
  await tick(300); const r2 = await abrir(store); ok(r2.w.eval('registros.length') === 2 && r2.w.eval("registros.some(r => r.modalidad && r.creado)"), 'Tras recargar persisten los registros con su forma de pago y auditoría');
  r2.w.ir('panel'); await tick(); ok(r2.d.getElementById('cs-dias').textContent.includes('Walter'), 'La vista Cosecha lista los registros por día');
  const all = errores.concat(r2.errores); ok(!all.length, 'Sin errores de JavaScript' + (all.length ? ': ' + all.slice(0, 4).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
