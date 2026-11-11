// Pruebas de los módulos v19 sobre los datos de ejemplo de la vista previa: todas las vistas y pestañas, invariantes contables y trazabilidad.
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
    beforeParse(w) {
      w.alert = () => {}; w.confirm = () => false; w.prompt = () => null;
      w.claude = { use: async n => n === 'downloads' ? { save: async f => { descargas.push(f.filename); } } : null };
      w.addEventListener('error', e => errores.push(e.message));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
      w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {};
    } });
  await tick(500);
  const w = dom.window, d = w.document, E = s => w.eval(s);
  const diag = () => [...d.querySelectorAll('#debug-body .dp-line')].map(l => l.textContent).filter(t => t.includes('✗'));
  const txt = id => (d.getElementById(id) || { textContent: '' }).textContent;
  const sinFallo = id => !/No se pudo calcular|undefined|NaN/.test(txt(id));

  // Vistas principales
  for (const v of ['hoy', 'tablero', 'panel', 'planeacion', 'operacion', 'personal', 'analisis', 'mapa', 'suelo', 'disenos', 'agronomia', 'comercial', 'finanzas', 'gestion']) {
    w.ir(v); await tick();
    ok(d.getElementById('view-' + v).classList.contains('active') && sinFallo('view-' + v), 'Vista ' + v + ' sin errores visibles');
  }

  // Maqueta: finca, lote y 3D con cada capa
  w.ir('mapa'); await tick();
  for (const m of ['finca', 'lote', '3d']) { w.mapaModo(m); await tick(); for (const c of E('CAPAS.map(c=>c[0])')) { w.mapaCapa(c); } }
  ok(diag().length === 0, 'Maqueta: modos finca, lote y 3D con todas las capas');
  const g = E('geomLote(lotes[0])');
  ok(g && !g.esquematico && g.poly.length >= 3, 'Los lotes de ejemplo tienen forma real (polígono de ' + g.poly.length + ' vértices)');
  const fuera = E(`(() => { const g = geomLote(lotes[0]); const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }; return g.plantas.filter(p => !dentro(p.x, p.y, g.poly)).length; })()`);
  ok(fuera === 0, 'Todas las plantas quedan dentro de la forma del lote');
  const sup = E(`(() => { const g = geomLote(lotes[0]); const s = superficieCalor(g, 'Broca'); return { n: s.pts ? s.pts.length : 0, sin: !!s.sinDatos }; })()`);
  ok(sup.n > 0 && !sup.sin, 'Mapa de calor de broca calculado sobre la forma del lote (' + sup.n + ' puntos medidos)');

  // Suelo y clima
  w.ir('suelo'); E("scSt.tab='suelo'; renderSueloClima()"); await tick();
  ok(sinFallo('sc-root') && /pH/.test(txt('sc-root')) && /(Cal|cal|enmienda)/.test(txt('sc-root')), 'Suelo: análisis con pH e interpretación de enmiendas');
  E("scSt.tab='clima'; renderSueloClima()"); await tick();
  ok(sinFallo('sc-root') && /(Lluvia|lluvia)/.test(txt('sc-root')) && /(balance|Balance)/.test(txt('sc-root')), 'Clima: lluvia y balance hídrico');

  // Diseños de cultivo
  w.ir('disenos'); await tick();
  const ev = E('disenos.map(evaluarDiseno).map(e => ({ vpn: e.vpn, tir: e.tir }))');
  ok(ev.length >= 2 && ev.every(e => Number.isFinite(e.vpn)), 'Diseños: ' + ev.length + ' alternativas con VPN calculado');
  ok(/VPN/.test(txt('ds-root')) && /TIR/.test(txt('ds-root')), 'Diseños: comparación con VPN y TIR');

  // Plan agronómico
  w.ir('agronomia'); E("agSt.vista='anual'; renderAgronomia()"); await tick();
  ok(sinFallo('ag-root') && E('planesAgro.length') > 0, 'Plan agronómico anual');
  E("agSt.vista='mensual'; renderAgronomia()"); await tick();
  ok(sinFallo('ag-root'), 'Plan agronómico mensual');

  // Comercial y trazabilidad
  w.ir('comercial');
  for (const t of ['ventas', 'partidas', 'traza', 'terceros']) { E(`coSt.tab='${t}'; renderComercial()`); await tick(); ok(sinFallo('co-root'), 'Ventas y trazabilidad: pestaña ' + t); }
  E("coSt.tab='traza'; coSt.trazaVenta = ventas[0].id; coSt.trazaPartida = null; renderComercial()"); await tick();
  const tz = txt('co-root');
  ok(/Lote|lote/.test(tz) && /(recolector|Recolector)/.test(tz) && /(beneficio|Beneficio)/.test(tz), 'La trazabilidad de una venta llega a beneficio, lotes y recolectores');
  E('fichaTrazaPDF(ventas[0].id)'); await tick(300);
  ok(descargas.some(f => /traza/i.test(f)), 'Ficha de trazabilidad en PDF (' + descargas.filter(f => /traza/i.test(f))[0] + ')');

  // Contabilidad: invariantes
  w.ir('finanzas');
  for (const t of ['resumen', 'movimientos', 'estados', 'flujo', 'cartera', 'presupuesto', 'lotes', 'libros', 'renta', 'config']) { w.finTab(t); await tick(); ok(sinFallo('fin-cuerpo'), 'Contabilidad: pestaña ' + t); }
  const cuadre = E('(() => { const L = libroDiario(); let mal = 0, D = 0, H = 0; L.asientos.forEach(a => { const dd = a.lineas.reduce((s, l) => s + l.debe, 0), hh = a.lineas.reduce((s, l) => s + l.haber, 0); D += dd; H += hh; if (Math.abs(dd - hh) > 1) mal++; }); return { mal, n: L.asientos.length, D, H }; })()');
  ok(cuadre.n > 50 && cuadre.mal === 0 && Math.abs(cuadre.D - cuadre.H) < 1, 'Partida doble: ' + cuadre.n + ' asientos, todos cuadran');
  const bg = E('(() => { const b = balanceGeneral(hoyLocal()); return { a: b.activo, p: b.pasivo, pt: b.patrimonio }; })()');
  ok(Math.abs(bg.a - bg.p - bg.pt) < 2, 'Balance general: activo = pasivo + patrimonio (' + Math.round(bg.a) + ')');
  for (const p of ['anio', 'trim', 'mes']) { E(`finSt.periodo='${p}'; finSt.tab='estados'; renderFinanzas()`); await tick(); ok(sinFallo('fin-cuerpo'), 'Estados financieros por ' + p); }
  E('exportarLibroCSV()'); await tick(200);
  ok(descargas.some(f => /\.csv$/.test(f)), 'Exporta el libro diario');

  // Tablero v19
  w.ir('tablero'); await tick(150);
  ok(sinFallo('view-tablero') && d.querySelector('#view-tablero svg'), 'Tablero con gráficas');
  for (const p of E("[...document.querySelectorAll('[data-per], #tb-periodo option')].map(o=>o.value||o.dataset.per).filter(Boolean)").slice(0, 6)) { E(`tbSt.periodo='${p}'; renderTablero()`); await tick(); }
  ok(diag().length === 0, 'Tablero en todos los periodos');

  // Modo oscuro y móvil no aplica en jsdom; errores
  const dg = diag();
  ok(errores.length === 0 && dg.length === 0, 'Sin errores de JavaScript ni en el diagnóstico' + (errores.length || dg.length ? ': ' + errores.concat(dg).slice(0, 5).join(' / ') : ''));
})().catch(e => { console.error('✗ EXCEPCIÓN', e); process.exitCode = 1; });
