// Pruebas v22: códigos con dígito verificador, pases, productividad, liquidación semanal con préstamos, baches, lotes comerciales, retención vigente y trazabilidad por código.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v22.html'), 'utf8');
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
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', variedadId: 'v1', hectareas: '0.35' }], bloques: [],
      trabajadores: [{ id: 't1', nombre: 'Walter Mejía', documento: '1098765447', tarifaPorKg: 900 }, { id: 't2', nombre: 'Ana María Ruiz', documento: '63333302', tarifaPorKg: 900 }], empleados: [{ id: 'e1', nombre: 'Omar', cargo: 'CEO', salario: 0, cedula: '91000011' }], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] }, 'datos/planeacion': { config: { valorJornal: 65000, alimentacion: 17000, cosecha: { tarifaKg: 1000 } }, plantillas: [] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s);
  // 1 · Normas de los códigos
  ok(E("siglaBase('Finca El Tesoro')") === 'TESO' && E("siglaBase('La Esperanza')") === 'ESPE' && E("siglaBase('Hacienda San José')") === 'SJOS', 'Sigla de finca: una palabra → 4 letras; dos → inicial + 3 letras (sin «Finca», «el», «la»)');
  ok(E("codPersonaBase({ nombre: 'Juan Carlos Pérez Gómez', documento: '1234547' })") === 'JCPG47' && E("codPersonaBase({ nombre: 'María de los Ángeles Díaz' })") === 'MAD00', 'Código de persona: iniciales + 2 dígitos de la cédula (sin cédula → 00)');
  ok(E("dv11('800197268')") === 4, 'Dígito verificador módulo 11 con pesos DIAN (NIT 800.197.268 → 4)');
  ok(E("codCosecha(2026,'Principal')") === '26P' && E("codCosecha(2027,'Secundaria')") === '27M', 'Código de cosecha: 26P principal, 27M mitaca');
  // 2 · Asistente con condición y verdes; pesada con código y pase creado
  w.openWizard(); await tick(); w.elegirLote({ fincaId: 'f1', loteId: 'l1', loteNombre: 'Lote 1' }); await tick(); E("wiz.fecha='2026-10-26'"); w.wizNext(); await tick(); w.elegirTipo('Principal'); await tick(); w.wizNext(); await tick();
  ok(!!d.querySelector('#wiz-body .cs-cond'), 'El asistente pide la condición del día y el % de verdes');
  E("wiz.tarifa=1000; wiz.alim=false; wiz.condicion='Lluvia'; wiz.verdes=3.2"); w.agregarPersonaConocida('t1'); ['8', '0'].forEach(k => w.keyTap(k)); w.keyConfirm(); E("wiz.personas[0].horas=8");
  w.agregarPersonaConocida('t2'); ['1', '2', '0'].forEach(k => w.keyTap(k)); w.keyConfirm(); E("wiz.personas[1].horas=8");
  w.wizNext(); await tick(); w.wizNext(); await tick(300);
  const r1 = E("registros.find(r => r.trabajadorId === 't1')");
  ok(r1 && r1.condicion === 'Lluvia' && r1.verdes === 3.2, 'La pesada guarda condición y % de verdes');
  ok(/^TESO-26P-P01-D01-L01-WM47-\d$/.test(r1.codigo) && E(`codigoConDV('${r1.codigo}')`), 'Código de la pesada legible y con dígito verificador: ' + r1.codigo);
  ok(E("pases.length") === 1 && E("pases[0].codigo") === '26P-P01' && E("pases[0].clase") === 'Graneo' && E("registros.every(r => r.paseId === pases[0].id)"), 'El pase 26P-P01 se crea solo y liga sus pesadas');
  ok(E("trabajadores.find(t => t.id === 't2').codigo") === 'AMR02' && E("fincas[0].sigla") === 'TESO', 'Códigos de persona y sigla de finca quedan guardados');
  // Segundo día del pase: más pesadas (por código, el día 2)
  E(`registros.push(Object.assign({}, registros[0], { id: 'gx1', fecha: '2026-10-27', kg: 70, horas: 7, condicion: 'Normal', verdes: null, codigo: null, creado: '2026-10-27T18:00:00' }), Object.assign({}, registros[1], { id: 'gx2', fecha: '2026-10-27', kg: 100, horas: 8, condicion: 'Normal', verdes: 2, codigo: null, creado: '2026-10-27T18:00:01' })); asegurarCodigos();`);
  ok(/-D02-/.test(E("registros.find(r => r.id === 'gx1').codigo")), 'La segunda fecha del pase es el día 02 en el código');
  // 3 · Pase cerrado bloquea registros
  E("pases[0].estado = 'Cerrado'"); w.openWizard(); await tick(); w.elegirLote({ fincaId: 'f1', loteId: 'l1', loteNombre: 'Lote 1' }); await tick(); E("wiz.fecha='2026-10-28'"); w.wizNext(); await tick(); w.elegirTipo('Principal'); await tick(); w.wizNext(); await tick();
  w.agregarPersonaConocida('t1'); ['1', '0'].forEach(k => w.keyTap(k)); w.keyConfirm(); w.wizNext(); await tick(); const nAntes = E('registros.length'); await w.confirmarGuardado(); await tick();
  ok(E('registros.length') === nAntes, 'Un pase cerrado no admite registros nuevos'); E("pases[0].estado = 'Abierto'"); try { w.closeWizard(); } catch (e) {}
  // 4 · Edición con kg de mañana y tarde
  w.abrirEditarRegistro('gx1'); await tick(); d.getElementById('er-kgm').value = '40'; d.getElementById('er-kgt').value = '35'; d.getElementById('er-motivo').value = 'pesadas separadas'; w.guardarEdicionRegistro('gx1'); await tick(150);
  ok(E("registros.find(r => r.id === 'gx1').kg") === 75 && E("bitacora.some(b => b.refId === 'gx1' && /Kg mañana/.test(b.detalle))"), 'Kg mañana + tarde = kg total, con el cambio en el historial');
  // 5 · Pestañas
  for (const t of ['pases', 'productividad', 'liquidacion', 'beneficio', 'registros']) { E(`csSt.tab='${t}';csSt.anio='2026'`); w.renderCosecha(); await tick(); const txt = d.getElementById('cs-root').textContent; ok(txt.length > 200 && !/undefined|NaN|No se pudo mostrar/.test(txt), 'Pestaña de cosecha: ' + t); }
  E("csSt.tab='productividad'"); w.renderCosecha(); await tick(); ok(d.querySelectorAll('#cs-root .fr22').length >= 2 && d.querySelector('#cs-root svg.g22'), 'Productividad: franjas frente al estándar y gráfico día a día');
  ok(E("franja22(13, estandar22('Principal','Normal'))") === 'Óptimo' && E("franja22(8, estandar22('Principal','Normal'))") === 'Bajo' && E("franja22(8, estandar22('Principal','Lluvia'))") === 'Bajo-óptimo', 'El estándar depende de la condición: 8 kg/h es bajo normal pero aceptable con lluvia');
  // 6 · Movimientos y liquidación semanal (semana que cierra el sábado 31/10/2026)
  E("adelantos.push({ id: 'm1', trabajadorId: 't1', fecha: '2026-10-26', tipo: 'Anticipo', valor: 30000, medio: 'Caja', aplicado: false }, { id: 'm2', trabajadorId: 't1', fecha: '2026-10-26', tipo: 'Préstamo', valor: 100000, nCuotas: 2, medio: 'Caja', aplicado: false }, { id: 'm3', trabajadorId: 't2', fecha: '2026-10-27', tipo: 'Bonificación', valor: 10000, aplicado: false })");
  const C = '2026-10-31'; ok(E(`cierreSemana('2026-10-26')`) === C, 'La semana del lunes 26 cierra el sábado 31');
  const L1 = E(`liqPersona('t1','${C}')`); ok(L1.bruto === 155000 && L1.ant === 30000 && L1.cuotaSug === 50000 && L1.neto === 75000, 'Walter: 155 kg × $1.000 − anticipo $30.000 − cuota $50.000 = $75.000');
  E(`csSt.tab='liquidacion';csSt.semana='${C}'`); w.renderCosecha(); await tick(); w.abrirLiquidar22('t1', C); await tick(); await w.confirmarLiquidar22('t1', C); await tick(300);
  const pg = E("pagos.find(p => p.trabajadorId === 't1')"); ok(pg && pg.valorNeto === 75000 && pg.cuota === 50000 && pg.anticipos === 30000 && pg.codigo === 'TESO-LQ-S261031-WM47', 'Pago con código ' + (pg && pg.codigo) + ' y descuentos detallados');
  ok(E("deudaPrestamos('t1')") === 50000 && E("adelantos.some(a => a.tipo === 'Cuota préstamo' && a.pagoId === pagos[0].id && a.generado)"), 'La cuota queda como movimiento y la deuda baja a $50.000');
  ok(E("registros.filter(r => r.trabajadorId === 't1').every(r => r.pagoId)") && descargas.some(f => f.startsWith('comprobante-teso-lq')), 'Las pesadas quedan pagadas y sale el comprobante');
  await w.liquidarTodos22(C); await tick(300); const pa = E("pagos.find(p => p.trabajadorId === 't2')"); ok(pa && pa.valorNeto === 220000 + 10000 && pa.bonificacion === 10000 && descargas.some(f => f.startsWith('planilla-liquidacion')), 'Liquidar a todos: Ana $220.000 + bonificación $10.000 y planilla de la semana');
  const Lg = E("ledgerPersona('t1')"); ok(Lg[Lg.length - 1].saldo === 0 && Lg[Lg.length - 1].deudaAc === 50000, 'Estado de cuenta: saldo $0 y deuda $50.000 tras el pago');
  // 7 · Contabilidad cuadra
  const cont = E("(() => { _versionDatos++; const L = libroDiario(); let d = 0, h = 0, p = 0; L.asientos.forEach(a => a.lineas.forEach(l => { d += l.debe; h += l.haber; if (l.cuenta === '1365') p += l.debe - l.haber; })); return { d: Math.round(d), h: Math.round(h), p }; })()");
  ok(cont.d === cont.h && cont.p === 50000, 'Contabilidad: débitos = créditos y préstamos a trabajadores (1365) en $50.000');
  // 8 · Anular devuelve todo
  w.anularPago(pg.id); await tick(); d.getElementById('an-motivo').value = 'prueba'; w.confirmarAnularPago(pg.id); await tick(200);
  ok(E("deudaPrestamos('t1')") === 100000 && E("adelantos.find(a => a.id === 'm1').aplicado") === false && E("registros.filter(r => r.trabajadorId === 't1').every(r => !r.pagoId)"), 'Anular el pago devuelve las pesadas, el anticipo y la cuota');
  // 9 · Bache en proceso, completado, lote comercial
  E("csSt.tab='beneficio'"); w.renderCosecha(); w.abrirBeneficioCosecha(); await tick(); d.getElementById('bc-proc').checked = true; w.pintarBenCosecha(); d.getElementById('bc-fecha').value = '2026-10-28'; d.getElementById('bc-sini').value = '2026-10-28'; w.guardarBenCosecha(); await tick(200);
  const b = E('beneficios[0]'); ok(b && /^TESO-26P-B01-\d$/.test(b.codigo) && b.kgSalida == null && E('infoBache(beneficios[0]).est') === 'En proceso' && E('registros.every(r => r.beneficioId === beneficios[0].id)'), 'Bache ' + (b && b.codigo) + ' en secado con sus 4 pesadas');
  w.editarBache22(b.id); await tick(); d.getElementById('eb-kg').value = '74'; d.getElementById('eb-hum').value = '11'; d.getElementById('eb-sfin').value = '2026-11-02'; d.getElementById('eb-mot').value = 'terminó el secado'; w.guardarBache22(b.id); await tick(150);
  const x = E('infoBache(beneficios[0])'); ok(x.kgS === 74 && Math.abs(x.factor - 375 / 74) < 0.01 && x.dSec === 5 && x.hum.t === 'En rango', 'Bache completado: 74 kg CPS, factor ' + (x.factor || 0).toFixed(2) + ', 5 días de secado, humedad en rango');
  w.abrirPartida(); await tick(); d.querySelectorAll('.pa-b').forEach(e => { e.checked = true; }); w.recodLC22(); const codLC = d.getElementById('pa-cod').value; w.guardarPartida(''); await tick(150);
  ok(/^TESO-26P-LC01-\d$/.test(codLC) && E('partidas[0].codigo') === codLC && E('partidas[0].clase') === 'Lote comercial', 'Lote comercial ' + codLC + ' con el bache');
  // 10 · Retención según la norma de la fecha
  ok(E("reglaRetencion(9000000,'2026-10-01').pct") === 0.5 && E("reglaRetencion(5000000,'2026-10-01').pct") === 0 && E("reglaRetencion(5000000,'2025-10-01').pct") === 0.5 && E("reglaRetencion(5000000,'2025-10-01').baseUVT") === 70, 'Retención en compras de café: 160 UVT hoy, 70 UVT entre jun-2025 y may-2026');
  // Venta con el lote comercial
  E(`ventas.push({ id: 'vt1', fecha: '2026-11-02', terceroId: null, comprador: 'Cooperativa', partidas: [{ partidaId: partidas[0].id, kg: 74 }], kg: 74, precio: 22400, retencion: 0, formaPago: 'Contado', cuenta: 'Caja', cobros: [] }); asegurarCodigos();`);
  const cv = E("ventas[0].codigo"); ok(/^TESO-V26-001-\d$/.test(cv), 'La venta recibe su código ' + cv);
  // 11 · Trazabilidad por código, hacia atrás y hacia adelante
  const c1 = E(`(() => { const c = cadena22(resolverCodigo22('${cv}')); return { R: c.R.length, B: c.B.length, P: c.P.length, V: c.V.length, est: c.estimado }; })()`); ok(c1.R === 4 && c1.B === 1 && c1.P === 1 && c1.V === 1 && !c1.est, 'Desde la venta: 1 lote comercial → 1 bache → 4 pesadas (exacta)');
  const c2 = E(`(() => { const c = cadena22(resolverCodigo22(registros[0].codigo)); return c.V.map(v => v.codigo); })()`); ok(c2.length === 1 && c2[0] === cv, 'Desde una pesada se llega a la venta');
  ok(E("resolverCodigo22('wm47').tipo") === 'persona' && E("resolverCodigo22('26P-P01').tipo") === 'pase', 'El buscador reconoce personas y pases');
  E(`coSt.trazaQ='${cv}';coSt.tab='traza'`); w.ir('comercial'); await tick(200); const tz = d.getElementById('co-cuerpo').textContent;
  ok(tz.includes('Cadena consistente') && tz.includes('Asientos contables relacionados') && tz.includes(codLC), 'Consulta de trazabilidad: cadena completa, control y asientos');
  // 12 · Persistencia
  await w.guardarEstado(); await tick(200); ok(Array.isArray(store['datos/comercial'].pases) && store['datos/comercial'].pases.length === 1 && store['datos/finanzas'].beneficios[0].codigo === b.codigo, 'Pases y códigos se guardan en la nube');
  ({ w, d, errores } = await abrir(store)); ok(w.eval('pases.length') === 1 && w.eval("registros.find(r => r.id === 'gx1').codigo") === E("registros.find(r => r.id === 'gx1').codigo"), 'Al recargar, los pases y los códigos siguen iguales');
  ok(errores.length === 0, 'Sin errores de ejecución' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
