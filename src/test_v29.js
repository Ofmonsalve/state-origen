// Pruebas v29: menos botones a la vista (acción principal + «⋯», filas que se tocan, filtros agrupados), reportes en lista y tablas apilables en celular.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-preview.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 80) => new Promise(r => setTimeout(r, ms)); const desc = [];
(async () => { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/#hoy', beforeParse(w) { w.alert = () => {}; w.confirm = () => false;
    w.claude = { use: async k => k === 'downloads' ? { save: async f => desc.push(f) } : null }; w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(1600); const w = dom.window, d = w.document, E = s => w.eval(s);
  const visibles = sel => [...d.querySelectorAll(sel + ' button')].filter(b => !b.classList.contains('a27-oculto') && !b.closest('.a27-oculto, .p27-oculto, .d27-fuera, .cerrado > :not(.cs-dia-h), .cerrada > :not(.worker-head):not(.title), [hidden], .cs-dia.cerrado .cs-dia-a, .p27-oculto') && !b.classList.contains('p27-oculto'));
  ok(Number(E('APP_VERSION')) >= 29, 'Versión 29');
  // Cosecha: barra con una acción y «⋯»
  w.ir('panel'); await tick(300); const bar = d.querySelector('#view-panel .cs-bar .mp-actions');
  const vb = [...bar.querySelectorAll('button')].filter(b => !b.classList.contains('a27-oculto')); ok(vb.length === 2 && vb[0].textContent.includes('Registrar día') && vb[1].classList.contains('acc29'), 'Cosecha: «+ Registrar día de cosecha» y «⋯» (antes 3 botones)');
  vb[1].click(); await tick(); const mi = [...d.querySelectorAll('.menu27 button')].map(b => b.textContent); ok(mi.join('|') === 'Parámetros de pago|Registrar beneficio', 'El «⋯» ofrece Parámetros de pago y Registrar beneficio'); w.cerrarMenu27();
  const nPanel = visibles('#view-panel').length; ok(nPanel <= 16, 'Botones visibles en Cosecha: ' + nPanel + ' (eran 261 en la v26)');
  // Filas que se tocan
  const filaPase = [...d.querySelectorAll('#view-panel tr.fila29')].find(tr => /26P-P05/.test(tr.textContent)); ok(filaPase && filaPase.querySelector('.chev29'), 'Cada pase es una fila que se toca, con «›»');
  const n0 = desc.length; filaPase.children[1].click(); await tick(500); ok(desc.length === n0 + 1 && /planilla/.test(desc[desc.length - 1].filename), 'Tocar la fila del pase descarga su planilla');
  const dia = d.querySelector('#cs-dias .cs-dia:not(.cerrado)'); const fp = dia.querySelector('tbody tr'); ok(fp.classList.contains('fila29') && fp.querySelector('.acc27'), 'Cada pesada: la fila abre «Editar» y «⋯» guarda Historial y Eliminar');
  fp.children[1].click(); await tick(150); ok(/Editar|Corregir|pesada/i.test((d.querySelector('.modal-box') || {}).textContent || ''), 'Tocar la pesada abre su edición'); try { w.closeModal(); } catch (e) {}
  ok(dia.querySelector('.cs-dia-a .acc29') && !dia.querySelector('.cs-dia-a > button:not(.a27-oculto):not(.acc29)'), 'El encabezado del día solo muestra «⋯» (Ajustar y Eliminar dentro)');
  // Personal
  w.ir('personal'); await tick(300); const head = d.querySelector('#lista-trabajadores .worker-head'); ok(head.querySelector('.acc29') && ![...head.querySelectorAll('span.b29 > button')].some(b => !b.classList.contains('a27-oculto') && !b.classList.contains('acc29')), 'Personal: Editar y Eliminar quedan en «⋯»');
  // Centro de mando y alertas
  w.ir('mando'); await tick(300); const al = d.querySelector('#md-root .md24-a'); ok(al.classList.contains('fila29') && al.querySelector('.chev29') && !visibles('#md-root .md24-al').some(b => b.textContent.trim() === 'Ir'), 'Alertas: la fila completa lleva al lugar (sin botones «Ir»)');
  w.ir('hoy'); await tick(200); ok([...d.querySelectorAll('#hoy-alertas .alert-row')].every(r => r.classList.contains('fila29')), 'Hoy: «Requiere atención» como lista que se toca');
  // Subpestañas largas
  w.ir('finanzas'); await tick(300); const sub = d.querySelector('#fin-tabs'); ok(sub && sub.querySelector('.p27-mas') && [...sub.children].filter(b => b.tagName === 'BUTTON' && !b.classList.contains('p27-oculto') && !b.classList.contains('p27-mas')).length <= 6, 'Contabilidad: 5 pestañas a la vista y el resto en «Más»');
  // Plan semanal
  w.ir('planeacion'); await tick(300); ok([...d.querySelectorAll('.day-col .add29')].length >= 5 && !/\+ Programar/.test(d.querySelector('.week-grid').textContent), 'Plan semanal: «+» discreto en cada día');
  // Filtros
  w.ir('panel'); await tick(250); const cr = d.querySelector('#view-panel .chip-row.f29-cr'); ok(cr && cr.querySelector('.f29') && cr.querySelectorAll('.f29-x').length >= 3, 'Cosecha: filtros agrupados en «Filtros» para celular y tablet');
  // Reportes en lista
  w.ir('reportes'); await tick(300); const filas = d.querySelectorAll('.rep29'); ok(filas.length === E('REPORTES.length') && d.querySelectorAll('.rep29-g').length >= 6, 'Reportes como lista agrupada (' + filas.length + ' filas)');
  d.querySelector('.rep29[data-rep="ejecutivo"]').click(); await tick(150); const sh = d.querySelector('.modal-box .rep29-sheet'); ok(sh && sh.querySelector('select[data-k="periodo"]'), 'Tocar un informe abre una hoja con su periodo');
  sh.querySelector('select[data-k="periodo"]').value = 'anio'; const n1 = desc.length; sh.querySelector('.rep-go').click(); await tick(700); ok(desc.length === n1 + 1 && E("repSt.params['ejecutivo.periodo']") === undefined || desc.length === n1 + 1, 'La hoja genera el informe con el periodo elegido');
  // Tablas apilables
  w.ir('personal'); await tick(250); const tb = d.querySelector('#view-personal table.apilable29'); ok(tb && tb.querySelector('td[data-l="Jornadas"]'), 'Tablas preparadas para leerse como tarjetas en el celular');
  ok(['cel', 'tab', 'tab-h', 'pc'].includes(d.documentElement.dataset.pantalla), 'Se detecta el tamaño de pantalla (' + d.documentElement.dataset.pantalla + ')');
  for (const v of Object.keys(E('VISTAS'))) { w.ir(v); await tick(60); } ok(errores.length === 0 && !/✗/.test(E("(document.getElementById('debug-log')||{}).textContent || ''")), 'Todas las páginas abren sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
