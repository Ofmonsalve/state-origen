// Pruebas v27: claridad (áreas, subnavegación, menús compactos, plegables, días y personas resumidos, exportación de tablas) y referencia del salario mínimo.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-preview.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 80) => new Promise(r => setTimeout(r, ms)); const descargas = [];
(async () => { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/#hoy', beforeParse(w) { w.alert = () => {}; w.confirm = () => false;
    w.claude = { use: async k => k === 'downloads' ? { save: async f => descargas.push(f) } : null }; w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(1500); const w = dom.window, d = w.document, E = s => w.eval(s);
  // Menú por áreas
  w.ir('panel'); await tick(150);
  ok(d.querySelectorAll('.nav27 .area27').length === 7 && d.querySelectorAll('.sidebar .nav-group').length === 0, 'El menú lateral pasa de 22 entradas en 6 grupos a 7 áreas');
  ok(d.querySelectorAll('.nav27 .nav-item[data-nav]').length === Object.keys(E('VISTAS')).length, 'Todas las páginas siguen en el menú, dentro de su área');
  ok(d.querySelector('.area27[data-area="cosecha"]').classList.contains('abierta') && !d.querySelector('.area27[data-area="cultivo"]').classList.contains('abierta'), 'Solo se despliega el área en la que está');
  ok(d.getElementById('eyebrow27').textContent.includes('Cosecha y personal') && [...d.querySelectorAll('#subnav27 button')].map(b => b.textContent.trim()).join('|') === 'Cosecha|Personal', 'Antetítulo del área y subnavegación Cosecha | Personal');
  w.clicArea27('cultivo'); await tick(150); ok(E('vistaActual') === 'mapa' && d.querySelectorAll('#subnav27 button').length === 6, 'Tocar un área abre su primera página y muestra sus 6 páginas');
  w.ir('lote'); await tick(); w.ir('panel'); await tick(); w.clicArea27('cultivo'); await tick(150); ok(E('vistaActual') === 'lote', 'Al volver a un área abre la última página usada en ella');
  w.clicArea27('finanzas'); await tick(); ok(E('vistaActual') === 'finanzas' && d.getElementById('subnav27').hidden, 'Un área con una sola página va directo y sin subnavegación');
  // Cosecha: días resumidos y acciones compactas
  w.ir('panel'); await tick(250); const dias = [...d.querySelectorAll('#cs-dias .cs-dia')];
  ok(dias.length === 17 && !dias[0].classList.contains('cerrado') && dias.slice(1).every(x => x.classList.contains('cerrado')), 'Registro diario: el último día abierto y los anteriores resumidos');
  ok(dias.filter(x => !x.classList.contains('d27-fuera')).length === 8 && d.querySelector('.d27-mas'), 'Se muestran 8 días y un botón para ver los anteriores');
  d.querySelector('.d27-mas').click(); await tick(150); ok([...d.querySelectorAll('#cs-dias .cs-dia')].filter(x => !x.classList.contains('d27-fuera')).length === 17, '«Ver días anteriores» muestra el resto');
  dias[2].querySelector('.cs-dia-h').click(); await tick(); ok(!dias[2].classList.contains('cerrado'), 'Un toque en el encabezado abre el día');
  const fila = dias[0].querySelector('tbody tr td.c27'); ok(fila && fila.querySelector('.acc27') && [...fila.querySelectorAll('button')].filter(b => !b.classList.contains('a27-oculto') && !b.classList.contains('acc27')).length <= 1, 'Cada pesada muestra a lo sumo una acción y el resto en «⋯»');
  const btnsAntes = 261; const btnsAhora = [...d.getElementById('view-panel').querySelectorAll('button')].filter(b => !b.closest('.a27-oculto') && !b.classList.contains('a27-oculto') && !b.closest('.cerrado > :not(.cs-dia-h)') && !b.closest('.d27-fuera')).length; ok(btnsAhora < btnsAntes / 2, 'Botones visibles en Cosecha: ' + btnsAntes + ' → ' + btnsAhora);
  fila.querySelector('.acc27').click(); await tick(); const mi = [...d.querySelectorAll('.menu27 button')]; ok(mi.map(b => b.textContent).join('|') === 'Historial|Eliminar' && mi[1].classList.contains('peligro'), 'El menú «⋯» ofrece Historial y Eliminar (marcado como peligroso)');
  mi[0].click(); await tick(150); ok(d.querySelector('.modal-overlay.open, .modal-overlay.show, .modal.open') || /Historial|historial/.test(d.body.textContent), 'La acción del menú ejecuta la original (abre el historial)'); try { w.closeModal(); } catch (e) {}
  // Personal compacto y referencia del mínimo
  w.ir('personal'); await tick(250); const cards = [...d.querySelectorAll('#lista-trabajadores .worker-card')];
  ok(cards.length === 5 && cards.every(c => c.classList.contains('cerrada')) && cards[0].querySelector('.w27-res').textContent.includes('-$50.000'), 'Personal: una fila por persona con su neto a pagar (Ana Ríos −$50.000)');
  cards[0].querySelector('.worker-head').click(); await tick(); ok(!cards[0].classList.contains('cerrada'), 'Un toque abre el detalle de la persona');
  const nuevo = [...d.querySelectorAll('#view-personal .card.f27')].find(c => /Nuevo recolector/.test(c.textContent)); ok(nuevo && nuevo.classList.contains('cerrada'), 'El formulario de nuevo recolector queda plegado');
  const C = E('cumplimiento27("2026")'); ok(C.smmlv === 1750905 && Math.round(C.min8) === 58364 && C.dias === 73 && Math.round(C.kgMin) === Math.round(58363.5 / C.tProm), 'Mínimo 2026: $1.750.905 → $58.364 por jornada de 8 h; ' + C.bajo + ' de ' + C.dias + ' jornadas por debajo');
  ok(d.getElementById('cm27-host').textContent.includes('salario mínimo') && E("auditoria24().items.some(a => /salario mínimo diario/.test(a.msg))"), 'Tarjeta de pago frente al mínimo y alerta en el centro de mando');
  ok(Math.round(E('minimoDia27("2026-05-01", 4)')) === 29182 && E('smmlv27(2025)') === 1423500, 'Proporcional a las horas y por año');
  // Pestañas largas en «Más»
  w.ir('legal'); await tick(250); const bar = d.querySelector('#lg-root .cs-tabs'); const vis = [...bar.querySelectorAll('button')].filter(b => !b.classList.contains('p27-oculto'));
  ok(vis.length === 6 && bar.querySelector('.p27-mas').textContent.includes('5'), 'Predio y cumplimiento: 5 pestañas a la vista y 5 en «Más»');
  bar.querySelector('.p27-mas').click(); await tick(); const it = [...d.querySelectorAll('.menu27 button')].find(b => b.textContent === 'Riesgos'); it.click(); await tick(250); ok(E('lgSt.tab') === 'riesgos' && [...d.querySelectorAll('#lg-root .cs-tabs button.on')].some(b => !b.classList.contains('p27-oculto')), 'Elegir una pestaña de «Más» la abre y la deja visible');
  // Alertas largas
  w.ir('mando'); await tick(300); const al = d.querySelector('#md-root .md24-al'); ok(al && al.querySelectorAll('.l27-oculto').length > 0 && al.querySelectorAll('.l27-mas').length === 1, 'Centro de alertas: 6 a la vista y «Ver todas»');
  al.querySelector('.l27-mas').click(); await tick(); ok(!al.querySelector('.l27-oculto') && !al.querySelector('.l27-mas'), '«Ver todas» despliega el resto');
  // Tablas a CSV
  w.ir('panel'); await tick(250); const card = [...d.querySelectorAll('#view-panel .card')].find(c => c.querySelector('.csv27') && /Pasadas/.test(c.textContent)); ok(!!card, 'Las tablas tienen botón de descarga');
  card.querySelector('.csv27').click(); await tick(); [...d.querySelectorAll('.menu27 button')][0].click(); await tick(300); const f = descargas.pop();
  const txt = f ? await new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(f.data); }) : ''; const lin = txt.replace(/^﻿/, '').split('\r\n');
  ok(f && /\.csv$/.test(f.filename) && lin[0].startsWith('Ciclo · pasada;Lote;Fechas') && lin.length === 6 && !/Planilla PDF/.test(txt), 'CSV para Excel: encabezados, 5 pases, separador «;» y sin botones');
  // Móvil: «Más» con todas las secciones
  let hoja = null; const _h = w.hojaAcciones; w.eval('hojaAcciones = (t, items) => { window.__hoja = { t, n: items.length }; }'); w.abrirMas(); hoja = w.__hoja; ok(hoja && hoja.n === Object.keys(E('VISTAS')).length, 'En el celular, «Más» lista las ' + (hoja && hoja.n) + ' páginas por área');
  // Sin regresiones visibles
  for (const v of Object.keys(E('VISTAS'))) { w.ir(v); await tick(60); } ok(errores.length === 0 && !/✗/.test(E("(document.getElementById('debug-log')||{}).textContent || ''")), 'Todas las páginas abren sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
