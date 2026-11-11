// Pruebas v20: centro de reportes (20 PDF), ficha del lote, tablero por pestañas, explicaciones plegables, finca real y navegación.
const fs = require('fs');
const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-preview.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const descargas = [];
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
(async () => {
  const errores = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(w) { w.alert = () => {}; w.confirm = () => false; w.prompt = () => null;
      w.claude = { use: async n => n === 'downloads' ? { save: async f => { descargas.push({ n: f.filename, size: f.data && f.data.size }); } } : null };
      w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null;
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(500);
  const w = dom.window, d = w.document, E = s => w.eval(s);
  const diag = () => [...d.querySelectorAll('#debug-body .dp-line')].map(l => l.textContent).filter(t => t.includes('✗'));
  // Finca real
  ok(E("fincas[0].forma.fuente").includes('Google Earth') && E("lotes.length") === 1 && Math.abs(E("geomLote(lotes[0]).haForma") - 1) < 0.02, 'Finca real: un lote con la forma de la foto, ajustado a 1 ha');
  ok(E("fincas[0].vias.length") >= 1 && E("fincas[0].puntos.some(p => /Punto A/.test(p.nombre))") && E("fincas[0].entorno.length") > 8 && E("fincas[0].sombrio.length") === 0, 'Vía, casa (Punto A) y entorno cargados, sin árboles (diseño del cultivo a la vista)');
  ok(E("MAQ_REAL") === true && E("paletaMaqueta().real") === true, 'La maqueta arranca en vista realista');
  // Navegación
  ok(!!d.querySelector('.nav-item[data-nav="reportes"]') && !!d.querySelector('.nav-item[data-nav="lote"]'), 'Menú con Reportes y Ficha del lote');
  // Reportes
  w.ir('reportes'); await tick();
  ok(d.querySelectorAll('.rep-card').length === 29 && d.getElementById('page-title').textContent === 'Reportes', 'Centro de reportes con 28 descargables');
  E("repSt.cat='Finanzas';renderReportes()"); await tick(); ok(d.querySelectorAll('.rep-card').length === 7, 'Filtro por categoría (7 financieros)'); E("repSt.cat='Todos';renderReportes()"); await tick();
  for (const id of E("REPORTES.map(r => r.id)")) { const btn = d.querySelector('.rep-card[data-rep="' + id + '"] .rep-go'); const antes = descargas.length; btn.click(); await tick(120); ok(descargas.length === antes + 1 && descargas[descargas.length - 1].size > 3000, 'PDF ' + id + ' → ' + (descargas[descargas.length - 1] || {}).n); }
  ok(E("(() => { const R = new InformePDF({ titulo: 'x' }); return R.fam })()") === 'Figtree', 'Tipografía Figtree incrustada en los PDF');
  // Ficha del lote
  w.ir('lote'); await tick();
  ok(d.getElementById('fl-root').textContent.includes('Lote El Tesoro') && d.getElementById('fl-root').textContent.includes('Plantas vivas'), 'Ficha del lote con identificación');
  for (const t of ['resumen', 'sanidad', 'suelo', 'produccion', 'labores', 'costos', 'historia']) { E("flTab('" + t + "')"); await tick(); ok(!/No se pudo calcular|undefined|NaN/.test(d.getElementById('fl-cuerpo').textContent) && d.getElementById('fl-cuerpo').textContent.length > 40, 'Ficha del lote: pestaña ' + t); }
  // Tablero por pestañas
  w.ir('tablero'); await tick(150);
  ok(d.querySelectorAll('#view-tablero .tb-nav button').length === 7, 'Tablero con 7 pestañas');
  const visibles = () => [...d.querySelectorAll('#view-tablero .tb-sec.tb-on')].map(s => s.id);
  ok(visibles().join() === 'sec-resumen', 'Arranca mostrando solo el resumen');
  E("cambiarTabTablero('rent')"); await tick(); ok(visibles().includes('sec-rent') && !visibles().includes('sec-resumen'), 'Pestaña Rentabilidad y caja');
  E("irSeccionTb('sec-madur')"); await tick(80); ok(visibles().includes('sec-proy'), 'Un enlace a una sección cambia a su pestaña');
  // Explicaciones plegadas
  w.ir('finanzas'); await tick(120); ok(d.querySelectorAll('#content details.ayuda').length > 0, 'Explicaciones largas plegadas (' + d.querySelectorAll('#content details.ayuda').length + ')');
  // Búsqueda
  ok(E("catalogoComandos().some(c => c.sec === 'Reportes PDF')") && E("catalogoComandos().some(c => /Ficha de Lote El Tesoro/.test(c.t))"), 'La búsqueda encuentra reportes y fichas de lote');
  const dg = diag(); ok(errores.length === 0 && dg.length === 0, 'Sin errores' + (errores.length || dg.length ? ': ' + errores.concat(dg).slice(0, 5).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
