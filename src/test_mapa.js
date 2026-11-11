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
const iso = dt => dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');

(async () => {
  const store = {
    'datos/maestros': { fincas: [{ id: 'f1', nombre: 'El Tesoro' }], variedades: [{ id: 'v1', nombre: 'Castillo' }], lotes: [{ id: 'l1', fincaId: 'f1', nombre: 'Lote 1', variedadId: 'v1', hectareas: '0.6' }], bloques: [], trabajadores: [], empleados: [], activos: [] },
    'datos/finanzas': { insumos: [], ventas: [], beneficios: [], labores: [], adelantos: [], pagos: [] },
  };
  let { w, d, errores } = await abrir(store);
  w.ir('mapa'); await tick();
  ok(d.getElementById('page-title').textContent === 'Maqueta y muestreos', 'La sección Maqueta y muestreos abre');
  ok(d.getElementById('mp-lote-info').textContent.includes('Lotes activos'), 'Vista de finca con resumen del terreno');
  w.mapaCambiarLote('l1'); await tick();
  ok(d.getElementById('mp-lote-info').textContent.includes('Defina el diseño'), 'Sin diseño, invita a definirlo');

  // Diseño del lote
  w.abrirDisenoLote(); await tick();
  val(d, 'dl-ds', '1.5'); val(d, 'dl-dp', '1'); val(d, 'dl-rel', '1.6'); val(d, 'dl-ori', '20'); val(d, 'dl-pend', '35'); val(d, 'dl-traz', 'contorno');
  const prevTxt = d.getElementById('dl-prev').textContent;
  clickTxt(d, '#modal-box button', 'Guardar diseño'); await tick(200);
  const g = w.eval("geomLote(lotes[0])");
  const TOT = g.total, dens = g.total / g.ha;
  ok(prevTxt.includes(TOT.toLocaleString('es-CO').replace(/,/g, '.')) || prevTxt.includes(String(TOT)), 'La vista previa coincide con lo guardado (' + TOT + ' plantas)');
  ok(g.nS > 20 && g.cod === 'L1' && g.plantas.length === TOT && Math.abs(dens - 6667) < 0.12 * 6667, 'Geometría en curvas de nivel: ' + g.nS + ' surcos, ' + TOT + ' plantas, ' + Math.round(dens) + ' pl/ha (teórico 6.667)');
  ok(store['datos/maestros'].lotes[0].diseno && store['datos/maestros'].lotes[0].diseno.pendiente === 35, 'El diseño quedó en la nube');
  ok(d.getElementById('mp-lote-info').textContent.includes('pl/ha') && d.getElementById('mp-lote-info').textContent.includes('curvas de nivel'), 'Estado del lote: densidad y trazado en curvas de nivel');
  ok(w.eval("codigoPlanta(geomLote(lotes[0]),4,12)") === 'L1-S04-P012', 'Código de planta L1-S04-P012');

  // Selección por toque: convertir la posición de una planta a pantalla y volver
  const cod = w.eval("(() => { const g = geomLote(lotes[0]); const q = g.plantas[Math.floor(g.plantas.length*0.3)]; const p = _mapaT.aPantalla(q.x, q.y); return plantaEn(p[0], p[1]); })()");
  const esperado = w.eval('(() => { const g = geomLote(lotes[0]); return g.plantas[Math.floor(g.plantas.length*0.3)].cod; })()');
  ok(cod === esperado, 'Tocar una planta en el mapa la identifica (' + cod + ')');
  w.seleccionarPlanta(cod); await tick();
  ok(d.getElementById('mp-planta').textContent.includes(cod), 'Panel de planta seleccionada');
  w.mapaZoom(2); await tick();
  const cod2 = w.eval("(() => { const g = geomLote(lotes[0]); const q = g.plantas[Math.floor(g.plantas.length*0.6)]; const p = _mapaT.aPantalla(q.x, q.y); return plantaEn(p[0], p[1]); })()");
  ok(cod2 === w.eval('(() => { const g = geomLote(lotes[0]); return g.plantas[Math.floor(g.plantas.length*0.6)].cod; })()'), 'La identificación sigue funcionando con zoom');
  w.mapaAjustar();

  // Plan de muestreo de broca
  w.abrirPlanMuestreo(); await tick();
  val(d, 'pm-tipo', 'Broca'); val(d, 'pm-n', '30'); val(d, 'pm-resp', 'Jorge');
  clickTxt(d, '#modal-box button', 'Generar plan'); await tick(200);
  const plan = w.eval('planesMuestreo[0]');
  ok(plan && plan.codigos.length === 30 && new Set(plan.codigos).size === 30, 'Plan con 30 plantas distintas');
  const surcos = new Set(plan.codigos.map(c => +/-S(\d+)/.exec(c)[1]));
  ok(surcos.size >= 15 && Math.min(...surcos) >= 2 && Math.max(...surcos) <= g.nS - 1, 'Plantas repartidas en el lote y lejos de los bordes (' + surcos.size + ' surcos)');
  ok(store['datos/mapa'] && store['datos/mapa'].planes.length === 1, 'El plan quedó en la nube');
  ok(!d.getElementById('mp-plan-chip').hidden, 'El mapa muestra el plan activo');
  w.exportarHojaMuestreoPDF(plan.id); await tick(300);
  ok(descargas.some(f => f.startsWith('muestreo-broca-L1')), 'Hoja de campo del muestreo en PDF');

  // Resultados: 10 plantas con 4 de 50 perforados (8 %), 20 con 0 => 2,67 %
  w.abrirResultadosPlan(plan.id); await tick();
  plan.codigos.forEach((c, i) => { val(d, 'rv-' + i + '-0', '50'); val(d, 'rv-' + i + '-1', i < 10 ? '4' : '0'); });
  ok(d.getElementById('rm-res').textContent.includes('2,7%') && d.getElementById('rm-res').textContent.includes('Sobre umbral'), 'Resumen en vivo: 2,7 % sobre el umbral');
  clickTxt(d, '#modal-box button', 'Guardar resultados'); await tick(250);
  const mk = Object.keys(store).find(k => k.startsWith('muestreos/'));
  ok(mk && store[mk].items.length === 30, 'Muestreo guardado en la nube (' + mk + ')');
  ok(d.getElementById('tabla-muestreos').textContent.includes('Broca') && d.getElementById('tabla-muestreos').textContent.includes('10 planta(s) sobre 2%'), 'Historial muestra la campaña y plantas sobre umbral');
  ok(d.getElementById('mp-lote-info').textContent.includes('2,7%'), 'Semáforo de broca en el estado del lote');
  w.ir('hoy'); await tick();
  ok(d.getElementById('hoy-alertas').textContent.includes('Broca 2,7% en Lote 1'), 'Alerta de broca en Hoy');
  w.ir('mapa'); await tick();

  // Validación de datos imposibles
  w.abrirRegistroMuestreo(w.eval('geomLote(lotes[0]).plantas[100].cod')); await tick();
  val(d, 'rm-tipo', 'Roya'); await tick();
  val(d, 'rv-0-0', '10'); val(d, 'rv-0-1', '12');
  clickTxt(d, '#modal-box button', 'Guardar resultados'); await tick();
  ok(toasts(d).includes('superan a los evaluados'), 'Rechaza afectados mayores que evaluados');
  w.closeModal();

  // Floración hace 200 días => cosecha estimada en ~24 días
  const hace200 = iso(new Date(Date.now() - 200*864e5));
  w.abrirRegistroMuestreo(w.eval('geomLote(lotes[0]).plantas[400].cod')); await tick();
  val(d, 'rm-tipo', 'Floración'); await tick(); val(d, 'rm-fecha', hace200); val(d, 'rv-0-0', '3');
  clickTxt(d, '#modal-box button', 'Guardar resultados'); await tick(200);
  ok(d.getElementById('mp-lote-info').textContent.includes('Cosecha estimada de esa flor'), 'Floración registrada con cosecha estimada');
  w.ir('hoy'); await tick();
  ok(d.getElementById('hoy-alertas').textContent.includes('Cosecha estimada en Lote 1'), 'Hoy avisa la cosecha próxima por floración');
  w.ir('mapa'); await tick();

  // Proyección por conteo de frutos: 30 frutos × 20 ramas = 600 frutos/planta
  w.abrirRegistroMuestreo(w.eval('geomLote(lotes[0]).plantas[700].cod')); await tick();
  val(d, 'rm-tipo', 'Frutos (proyección)'); await tick(); val(d, 'rv-0-0', '30'); val(d, 'rv-0-1', '20');
  clickTxt(d, '#modal-box button', 'Guardar resultados'); await tick(200);
  const pr = w.eval('proyeccionLote(lotes[0])');
  ok(Math.round(pr.kgCereza) === Math.round(600 * TOT * 1.8 / 1000), 'Proyección: ' + Math.round(pr.kgCereza) + ' kg de cereza');
  // Marcar faltante reduce plantas vivas
  const P1 = w.eval('geomLote(lotes[0]).plantas[0].cod'); w.marcarPlanta(P1, 'Faltante'); await tick(150);
  ok(w.eval('proyeccionLote(lotes[0]).vivas') === TOT - 1, 'Una planta faltante deja ' + (TOT - 1) + ' vivas');
  ok(!w.eval('puntosMuestreo(geomLote(lotes[0]), ' + TOT + ', 7)').includes(P1), 'Los planes de muestreo evitan plantas faltantes');
  // Capas
  ['Broca','Roya','Sanidad general','Floración','Frutos (proyección)','marcas','estructura'].forEach(c => w.mapaCapa(c));
  ok(d.querySelectorAll('#mp-capas button').length === 11, 'Once capas en la maqueta (incluye faltantes)');

  // Eliminar campaña con deshacer
  const camp = w.eval("campanas('l1','Broca')[0].id");
  w.eliminarCampana(camp); await tick(150);
  ok(w.eval("muestreos.filter(m=>m.tipo==='Broca').length") === 0, 'Eliminar la campaña de broca');
  [...d.querySelectorAll('.toast .act')].find(b => b.textContent === 'Deshacer').click(); await tick(250);
  ok(w.eval("muestreos.filter(m=>m.tipo==='Broca').length") === 30, 'Deshacer la restaura');
  // Integridad del lote
  w.eliminarLote('l1'); await tick();
  ok(w.eval('lotes.length') === 1 && toasts(d).includes('muestreo'), 'No se elimina un lote con muestreos');

  // Recarga
  const r2 = await abrir(store); r2.w.ir('mapa'); await tick();
  ok(r2.w.eval('muestreos.length') === 32 && r2.w.eval('marcasPlanta.length') === 1 && r2.w.eval('planesMuestreo.length') === 1 && r2.w.eval('geomLote(lotes[0]).total') === TOT, 'Tras recargar persisten diseño, muestreos, marcas y plan');
  // Sin capacidades (navegador): arranca sin errores
  const r3 = await abrir({}, { sinClaude: true }); r3.w.ir('mapa'); await tick();
  ok(r3.d.getElementById('mapa-vacio').textContent.includes('Aún no hay lotes'), 'Sin datos: invita a crear lotes');
  const all = errores.concat(r2.errores, r3.errores);
  ok(all.length === 0, 'Sin errores de JavaScript' + (all.length ? ': ' + all.join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
