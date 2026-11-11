// Pruebas v28: informes refinados (cifras en portada, glosario, columnas vacías), descargables nuevos y Excel válido.
const fs = require('fs'); const { JSDOM } = require('jsdom');
let html = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'state-origen-preview.html'), 'utf8');
const jspdfSrc = fs.readFileSync(__dirname + '/node_modules/jspdf/dist/jspdf.umd.min.js', 'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]+"><\/script>/, '<script>' + jspdfSrc.replace(/<\/script>/g, '<\\/script>') + '</script>').replace(/<link[^>]+fonts[^>]+>/g, '');
const ok = (c, m) => { if (!c) { console.error('✗ FALLA: ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const tick = (ms = 80) => new Promise(r => setTimeout(r, ms)); const desc = [];
(async () => { const errores = []; const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/#reportes', beforeParse(w) { w.alert = () => {}; w.confirm = () => false;
    w.claude = { use: async k => k === 'downloads' ? { save: async f => desc.push(f) } : null }; w.addEventListener('error', e => errores.push(e.message)); w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; } });
  await tick(1600); const w = dom.window, d = w.document, E = s => w.eval(s);
  const leer = f => new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(Buffer.from(fr.result)); fr.readAsArrayBuffer(f.data); });
  ok(Number(E('APP_VERSION')) >= 28 && E('REPORTES.length') === 29, 'Centro de reportes con 28 descargables (6 nuevos)');
  w.ir('reportes'); await tick(200); ok(/Excel/.test(d.querySelector('.rep-card[data-rep="excel"] .rep-go').textContent), 'La fila del Excel tiene su botón «Excel»');
  // Motor: columnas comparativas vacías, cifras en portada y glosario
  const motor = E(`(() => { const R = new InformePDF({ titulo: 'Prueba', imagen: false }); R.portada(); R.kpis([{ t: 'Ingresos', v: '$1 M' }, { t: 'Margen', v: '30 %' }]); R.seccion(1, 'Uno'); const y0 = R.y;
    R.tabla({ cols: [{ t: 'Concepto' }, { t: '2026', a: 'right' }, { t: '2025', a: 'right' }, { t: 'Variación' }], filas: [['Ventas de café por carga', '$5', '$0', '—'], ['Costo', '$2', '$0', '—']] }); R.texto('El EBITDA y la liquidez y el factor de conversión del pergamino', R.x0, R.y);
    R.agregarGlosario(); return { kp: (R._kpisPortada || []).length, glos: (R.secciones || []).some(s => s.titulo === 'Glosario'), txt: R._txt.join('|') }; })()`);
  ok(motor.kp === 2 && motor.glos, 'Las primeras cifras van a la portada y se agrega el glosario de los términos usados');
  ok(!/\|2025\|/.test(motor.txt) && !/VARIACI/.test(motor.txt) && /2026/.test(motor.txt), 'La columna del año anterior sin datos (y su variación) se omite');
  ok(E("GLOSARIO28.filter(g => g.re.test('el factor de conversión, la carga, el ebitda y la retención')).length") >= 4, 'Glosario con definiciones de carga, factor, EBITDA y retención');
  // Excel
  w.descargarExcel28(); await tick(200); const fx = desc.pop(); const buf = fx ? await leer(fx) : Buffer.alloc(0);
  ok(fx && /\.xlsx$/.test(fx.filename) && buf.slice(0, 2).toString() === 'PK' && buf.includes(Buffer.from('xl/worksheets/sheet3.xml')) && buf.includes(Buffer.from('Pesadas')), 'Libro de datos .xlsx (ZIP válido con hojas)');
  const hojas = E('hojasDatos28().map(h => h.n + ":" + h.filas.length)'); ok(hojas.some(h => /^Pesadas:73$/.test(h)) && hojas.some(h => /^Libro diario:\d{3,}/.test(h)) && hojas.length >= 15, 'Hojas: ' + hojas.join(', '));
  ok(E('crc32_28(utf8_28("123456789"))') === 0xCBF43926, 'CRC-32 correcto (verificación estándar)');
  ok(E('serial28("2026-11-03")') === 46329, 'Las fechas van como fechas de Excel');
  // PDFs nuevos
  const nuevos = ['agenda', 'campo', 'comprobantes', 'constancia', 'etiquetas']; for (const id of nuevos) { w.generarReporte(id); await tick(400); }
  const nombres = desc.map(f => f.filename); ok(['agenda-vencimientos', 'planilla-campo', 'comprobantes-', 'constancia-', 'etiquetas-'].every(n => nombres.some(x => x.includes(n) && /\.pdf$/.test(x))), 'Agenda, planilla de campo, comprobantes, constancia y etiquetas en PDF: ' + nombres.join(', '));
  const A = E('agenda28(60)'); ok(A.length >= 4 && A.some(a => a.area === 'Labores' && a.sev === 'mal') && A.every((a, i) => !i || A[i - 1].f <= a.f), 'Agenda ordenada por fecha con ' + A.length + ' pendientes y los vencidos en rojo');
  const C = E(`(() => { const t = trabajadores[0]; const rs = registros.filter(r => r.trabajadorId === t.id && r.fecha.startsWith('2026')); return { kg: Math.round(rs.reduce((s, r) => s + n0(r.kg), 0)), n: new Set(rs.map(r => r.fecha)).size }; })()`); ok(C.kg > 0 && C.n > 0, 'Constancia con ' + C.n + ' jornadas y ' + C.kg + ' kg');
  // Informes existentes siguen funcionando con el nuevo motor
  for (const r of E('REPORTES.map(r => r.id)').filter(x => !nuevos.includes(x) && x !== 'excel')) { const n0 = desc.length; w.generarReporte(r); await tick(500); if (desc.length === n0) ok(false, 'El informe ' + r + ' no se generó'); }
  ok(desc.length >= 27, 'Los 28 descargables se generan (' + desc.length + ')');
  ok(errores.length === 0 && !/✗/.test(E("(document.getElementById('debug-log')||{}).textContent || ''")), 'Sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
