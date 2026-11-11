// Pruebas v26: fase F (de la finca a la taza).
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-v26.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const deepFreeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
function crearNube(store) { const sd = p => ({ exists: p in store, data: () => p in store ? deepFreeze(JSON.parse(JSON.stringify(store[p]))) : undefined }); const sc = c => { const docs = Object.keys(store).filter(k => k.startsWith(c + '/')).map(k => ({ id: k, data: () => deepFreeze(JSON.parse(JSON.stringify(store[k]))) })); return { empty: !docs.length, docs }; };
  return { doc: p => ({ get: async () => sd(p), set: async d => { store[p] = JSON.parse(JSON.stringify(d)); }, onSnapshot: fn => { fn(sd(p)); return () => {}; } }), collection: c => ({ get: async () => sc(c), onSnapshot: fn => { fn(sc(c)); return () => {}; } }) }; }
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms)); const descargas = [];
async function abrir(store) { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/#panel', beforeParse(w) { w.alert = () => {}; w.confirm = () => false; const n = crearNube(store);
  w.claude = { use: async k => k === 'db' ? n : (k === 'downloads' ? { save: async f => descargas.push(f.filename) } : null) }; w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = q => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(400); return { w: dom.window, d: dom.window.document, errores }; }
(async () => {
  const hoy = new Date().toISOString().slice(0, 10); const mes = hoy.slice(0, 7);
  const store = { 'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro', municipio: 'Pinchote', departamento: 'Santander', altitud: 1550, areaTotal: 1 }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', nombre: 'La Loma', fincaId: 'f1', variedadId: 'v1', altitud: 1600, area: 1 }], bloques: [], trabajadores: [{ id: 't1', nombre: 'Walter Mejía', documento: '1098765447' }], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] },
    'datos/comercial': { partidas: [{ id: 'pa1', codigo: 'PT-ET-26-01', fecha: mes + '-02', tipo: 'Pergamino seco', proceso: 'Lavado', beneficioIds: [], kg: 500 }], terceros: [{ id: 'te1', nombre: 'Tienda Café Bogotá', nit: '900123456', tipo: 'Cliente' }] },
    'datos/contable': { contaConfig: { fechaInicio: mes + '-01', saldos: { inventarioCafe: 15000000, inventarioCafeKg: 1000, caja: 20000000 } }, presupuestos: {}, cuentasExtra: [] } };
  let { w, d, errores } = await abrir(store); const E = s => w.eval(s); await tick(300);
  ok(E('_tazaCargada') === true, 'La cadena de valor se carga de la nube (vacía) antes de poder guardarse');
  ok(E("Math.round(libroDiario().costoProm)") === 15000, 'Costo promedio del pergamino en bodega: $15.000/kg');
  w.ir('taza'); await tick(); ok(d.querySelectorAll('#tz-root .lg-tabs button:not(.p27-mas)').length === 9 && d.getElementById('tz-root').textContent.includes('Lleve su café'), 'Vista con 9 pestañas y guía de inicio');
  const g = (k, v) => { const el = d.getElementById('lg-' + k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
  // Producto
  w.abrirTz('skus'); await tick(); g('codigo', 'et 250 g'); g('nombre', 'El Tesoro 250 g grano'); g('gramos', '250'); g('precio', '30000'); g('costoEmpaque', '2000'); g('vidaUtil', '180'); g('minimo', '50'); w.guardarTz('skus', ''); await tick();
  ok(E("TZ.skus[0].codigo") === 'ET-250-G', 'Producto creado con código normalizado ET-250-G');
  // Trilla: valida disponible del lote comercial
  w.abrirTz('trillas'); await tick(); g('partidaId', 'pa1'); g('kgCPS', '600'); g('kgExcelso', '480'); w.guardarTz('trillas', ''); await tick(); ok(E('TZ.trillas.length') === 0, 'No deja trillar más pergamino del que tiene el lote comercial');
  g('kgCPS', '400'); g('kgExcelso', '320'); g('kgPasilla', '20'); g('maquila', '400000'); g('medio', 'Caja'); g('calidad', 'Excelso UGQ'); w.guardarTz('trillas', ''); await tick();
  const tri = E('TZ.trillas[0]'); const it = E('infoTrilla(TZ.trillas[0])');
  ok(/^TRI-.+-01$/.test(tri.codigo) && Math.round(it.factorReal * 10) === 875 && Math.round(it.cps) === 6000000 && Math.round(it.kgVerdeCosto) === 20000, 'Trilla ' + tri.codigo + ': factor 87,5; pergamino a costo $6.000.000; verde a $20.000/kg con maquila');
  ok(E("disponiblePartida(partidas[0])") === 100 && E("partidas[0].factor") === 87.5, 'El lote comercial queda con 100 kg disponibles y su factor real');
  // Perfil y tostión
  w.abrirTz('perfiles'); await tick(); g('nombre', 'Medio filtrados'); g('nivel', 'Medio'); g('mermaObjetivo', '15'); w.guardarTz('perfiles', ''); await tick();
  w.abrirTz('tostiones'); await tick(); g('trillaId', tri.id); g('perfilId', E('TZ.perfiles[0].id')); g('kgVerde', '100'); g('kgTostado', '84'); g('costoProceso', '160000'); g('medio', 'Caja'); w.guardarTz('tostiones', ''); await tick();
  const its = E('infoTostion(TZ.tostiones[0])'); ok(Math.round(its.merma) === 16 && Math.round(its.delta) === 1 && Math.round(its.kgTostCosto) === 25714, 'Tostión: merma 16 % (+1 vs perfil); costo $25.714/kg tostado');
  ok(Math.round(E('infoTrilla(TZ.trillas[0]).disp')) === 220, 'Quedan 220 kg de verde en la trilla');
  // Empaque con validación
  w.abrirTz('lotesPT'); await tick(); g('skuId', E('TZ.skus[0].id')); g('tostionId', E('TZ.tostiones[0].id')); g('unidades', '400'); w.guardarTz('lotesPT', ''); await tick(); ok(E('TZ.lotesPT.length') === 0, 'No deja empacar más café del que hay tostado (400 × 250 g = 100 kg > 84 kg)');
  g('unidades', '200'); g('medio', 'Caja'); w.guardarTz('lotesPT', ''); await tick(); const lp = E('TZ.lotesPT[0]'); const ilp = E('infoLotePT(TZ.lotesPT[0])');
  ok(/^ET-250-G-\d{6}-1$/.test(lp.codigo) && Math.round(ilp.unit) === 8429 && ilp.existencia === 200, 'Lote ' + lp.codigo + ': 200 bolsas a $8.429 c/u (café $6.429 + empaque $2.000)');
  // Pedido FIFO con comisión
  w.abrirPedido(); await tick(); d.getElementById('pd-canal').value = 'WEB'; d.getElementById('pd-canal').dispatchEvent(new w.Event('change')); d.getElementById('pd-ter').value = 'te1'; d.querySelector('.pl-und').value = '30'; d.querySelector('.pl-und').dispatchEvent(new w.Event('input'));
  ok(d.getElementById('pd-com').value === '3.5', 'La comisión del canal web se toma de la configuración (3,5 %)'); w.guardarPedido26(''); await tick();
  const ped = E('TZ.pedidos[0]'); const vp = E('valorPedido(TZ.pedidos[0])');
  ok(ped && ped.lineas[0].lotePTId === lp.id && vp.neto === 900000 && vp.com === 31500 && Math.round(vp.costo) === 252857 && Math.round(vp.margen) === 615643, 'Pedido ' + ped.codigo + ': 30 bolsas, neto $900.000, comisión $31.500, costo $252.857, margen $615.643');
  ok(E('infoLotePT(TZ.lotesPT[0]).existencia') === 170, 'El lote queda con 170 bolsas');
  w.abrirPedido(); await tick(); d.querySelector('.pl-und').value = '500'; w.guardarPedido26(''); await tick(); ok(E('TZ.pedidos.length') === 1, 'No deja vender más bolsas de las que hay');
  w.cobrarPedido26(ped.id); await tick(); w.guardarCobro26(ped.id); await tick(); ok(E('TZ.pedidos[0].cobro.medio') === 'Banco', 'Cobro registrado');
  // Cafetería
  w.abrirTz('menu'); await tick(); g('nombre', 'Capuchino'); g('precio', '8640'); g('gramosCafe', '18'); g('otrosCosto', '1200'); g('impuesto', '8'); w.guardarTz('menu', ''); await tick();
  const es = E('escandallo(TZ.menu[0])'); ok(Math.round(es.neto) === 8000 && Math.round(es.cafe) === 463 && Math.round(es.foodCost) === 21, 'Escandallo: precio neto $8.000, café $463, costo 21 %');
  E("tzSt.tab='cafeteria'"); w.renderTaza(); await tick(); d.getElementById('pos-u').value = '10'; w.venderPOS26(); await tick();
  const vpos = E('valorPOS(TZ.pos[0])'); ok(E('TZ.pos[0].tostionId') === E('TZ.tostiones[0].id') && vpos.total === 86400 && Math.round(vpos.imp) === 6400, 'Venta de barra: 10 capuchinos, $86.400 con $6.400 de impuesto; descuenta café de la tostión');
  // Catación y exportación
  w.abrirTz('cataciones'); await tick(); g('partidaId', 'pa1'); g('fragancia', '8'); g('sabor', '8'); g('residual', '7.75'); g('acidez', '8'); g('cuerpo', '7.75'); g('balance', '7.75'); g('general', '8'); g('notas', 'panela, mandarina'); w.guardarTz('cataciones', ''); await tick();
  ok(E('puntajeSCA(TZ.cataciones[0])') === 85.25 && E('partidas[0].taza') === 85.25, 'Catación SCA 85,25 (excelente); el lote comercial guarda su puntaje');
  w.abrirTz('negocios'); await tick(); g('trillaId', tri.id); g('kg', '70'); g('modalidad', 'Diferencial'); g('bolsa', '3.2'); g('diferencial', '0.6'); g('trm', '4000'); g('logistica', '1500'); g('estado', 'Cerrado'); g('fechaCierre', E('hoyLocal()')); w.guardarTz('negocios', ''); await tick();
  const ng = E('infoNegocio(TZ.negocios[0])'); ok(Math.round(ng.copkg) === 32010 && Math.round(ng.contrib) === 12010 && ng.senal !== 'Bajo el precio piso', 'Exportación: 3,80 USD/lb → $32.010/kg neto; contribución $12.010/kg sobre el costo real');
  ok(Math.round(E('infoTrilla(TZ.trillas[0]).disp')) === 150, 'La venta de verde descuenta 70 kg de la trilla');
  // Contabilidad
  E('_versionDatos++'); const L = E('libroDiario()'); const sal = c => L.asientos.reduce((s, a) => s + a.lineas.filter(l => l.cuenta === c).reduce((x, l) => x + l.debe - l.haber, 0), 0);
  const des = L.asientos.filter(a => Math.abs(a.lineas.reduce((s, l) => s + l.debe - l.haber, 0)) > 1).length; ok(des === 0, 'Todos los asientos cuadran');
  ok(Math.round(sal('1430')) === 9000000, 'El pergamino sale de la bodega (1430) a costo promedio por la trilla');
  ok(Math.round(sal('1435')) === Math.round(150 * 20000), 'Café verde en bodega (1435): 150 kg × $20.000 = $3.000.000');
  ok(Math.round(sal('1445')) === Math.round(170 * E('infoLotePT(TZ.lotesPT[0]).unit')), 'Producto terminado (1445): 170 bolsas a costo');
  ok(Math.round(sal('4120')) === -900000 && Math.abs(sal('4125') + 70 * E('precioCOPkg(TZ.negocios[0])')) < 1 && Math.round(sal('4140')) === -80000, 'Ingresos: producto $900.000, verde $2.240.700, cafetería $80.000');
  ok(Math.round(sal('6120')) === 252857 && Math.round(sal('6125')) === 1400000 && Math.round(sal('5295')) === 31500 && Math.round(sal('2408')) === -6400, 'Costos de venta, comisión del canal e impuesto al consumo por pagar');
  ok(Math.abs(E('balanceGeneral(hoyLocal()).dif')) < 2 && Math.round(E("estadoResultados(hoyLocal().slice(0,4)+'-01-01', hoyLocal()).ventasProducto")) === Math.round(900000 + 80000 + 70 * E('precioCOPkg(TZ.negocios[0])')), 'Balance cuadra y el estado de resultados incluye las ventas de producto, verde y cafetería');
  // Trazabilidad desde la bolsa
  const rc = E(`resolverCodigo22('${lp.codigo}')`); ok(rc && rc.tipo === 'partida' && rc.o.id === 'pa1', 'El código de la bolsa lleva al lote comercial de origen');
  w.abrirTraza22(lp.codigo); await tick(200); const tx = d.getElementById('co-cuerpo').textContent; ok(tx.includes('Cadena industrial') && tx.includes(tri.codigo) && tx.includes(E('TZ.tostiones[0].codigo')), 'La trazabilidad muestra la cadena industrial bolsa → tostión → trilla → lote');
  ok(E(`sugerencias22('PED').some(x => x.t === 'Pedido')`), 'El buscador sugiere códigos de pedidos');
  // Auditoría y mando
  E("TZ.skus[0].minimo = 500"); ok(E("auditoria24().items.some(a => a.area === 'De la finca a la taza' && /bajo el mínimo/.test(a.msg))"), 'Alerta de producto bajo el mínimo'); E("TZ.skus[0].minimo = 50");
  w.ir('mando'); await tick(200); ok(d.getElementById('md-root').textContent.includes('De la finca a la taza'), 'El centro de mando incluye el índice de la cadena de valor');
  // Pestañas
  w.ir('taza'); for (const t of ['resumen', 'calidad', 'trilla', 'tostion', 'productos', 'pedidos', 'cafeteria', 'exportacion', 'rentabilidad']) { E(`tzSt.tab='${t}'`); w.renderTaza(); await tick(60); const tx = d.getElementById('tz-cuerpo').textContent; ok(tx.length > 80 && !/undefined|NaN|No se pudo/.test(tx), 'Pestaña ' + t); }
  const K = E('cadenaValorKg26()'); ok(K && K.precio > K.pergamino && Math.round(K.precio) === 120000, 'Valor agregado: $120.000 netos por kg de producto vendido');
  // PDF
  w.repTaza(); await tick(400); w.fichaLotePT26(lp.id); await tick(300); w.remision26(ped.id); await tick(300);
  ok(descargas.some(f => /de-la-finca-a-la-taza/.test(f)) && descargas.some(f => /ficha-lote-/.test(f)) && descargas.some(f => /remision-/.test(f)), 'Informe completo, ficha del lote y remisión en PDF');
  ok(E("REPORTES.some(r => r.id === 'taza')"), 'El informe aparece en el centro de reportes');
  // Persistencia
  await w.guardarEstado(); await tick(200); ok(store['datos/taza'] && store['datos/taza'].trillas.length === 1 && store['pedidos/' + mes].items.length === 1 && store['pos/' + mes].items.length === 1, 'Se guarda en datos/taza y en las colecciones mensuales de pedidos y barra');
  ({ w, d, errores } = await abrir(store)); await tick(400); ok(w.eval('TZ.lotesPT.length') === 1 && w.eval('TZ.pedidos.length') === 1 && w.eval('TZ.pos.length') === 1 && w.eval('infoLotePT(TZ.lotesPT[0]).existencia') === 170, 'Al recargar, la cadena completa sigue igual');
  ok(errores.length === 0, 'Sin errores de ejecución' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
