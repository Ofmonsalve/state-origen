/* ================= v25 · Motor PDF editorial: portada a página completa con la finca, índice automático, secciones con jerarquía, tarjetas, tablas y gráficas refinadas ================= */
(function () {
  const P = InformePDF.prototype; const _portada20 = P.portada, _seccion20 = P.seccion, _pie20 = P.pie;
  const FONDO_A = [12, 44, 30], FONDO_B = [6, 26, 18];
  P.opacidad = function (a) { try { this.doc.setGState(new this.doc.GState({ opacity: a })); } catch (e) {} return this; };
  P.degradado = function (x, y, w, h, c1, c2, pasos, vertical) { const d = this.doc; const n = pasos || 40; for (let i = 0; i < n; i++) { const c = mezclarPDF(c1, c2, i / (n - 1)); this.fill(c); if (vertical === false) d.rect(x + w * i / n, y, w / n + 0.3, h, 'F'); else d.rect(x, y + h * i / n, w, h / n + 0.3, 'F'); } return this; };
  P.pastilla = function (txt, x, y, tono, alinear) { const d = this.doc; const [c, cl] = TONO_PDF[tono] || TONO_PDF.marca; this.f('bold', 6.6); const w = this.ancho(txt) + 5; const xx = alinear === 'right' ? x - w : x; this.fill(PDFC[cl]); d.roundedRect(xx, y - 3.4, w, 4.8, 2.4, 2.4, 'F'); this.f('bold', 6.6, PDFC[c]); this.texto(txt, xx + 2.5, y); return w; };

  /* ---------- Portada a página completa (A4); los comprobantes conservan la franja compacta ---------- */
  P.portada = function (o) {
    o = Object.assign({}, this.o, o || {}); if (o.alto || o.formato === 'a5' || this.W < 200 || o.compacta) { const r = _portada20.call(this, o); this.degradadoFranja = true; return r; }
    const d = this.doc, W = this.W, H = this.H, M = this.M; this.portadaCompleta = true;
    this.degradado(0, 0, W, H, FONDO_A, FONDO_B, 70);
    let img = null; if (o.imagen !== false) { try { img = o.imagen || (this.finca.id && typeof imagenMaquetaFinca === 'function' ? imagenMaquetaFinca(this.finca.id, o.capaPortada || 'estructura', 1700, 1050) : null); } catch (e) { img = null; } }
    const hImg = this.o.horizontal ? H * 0.55 : 150;
    if (img) { try { const hN = W * 1050 / 1700; if (hN >= hImg) d.addImage(img, 'JPEG', 0, 0, W, hN, undefined, 'FAST'); else { const wN = hImg * 1700 / 1050; d.addImage(img, 'JPEG', (W - wN) / 2, 0, wN, hImg, undefined, 'FAST'); } } catch (e) {}
      const yF = hImg * 0.4, hF = hImg - yF + 2, nF = 48; for (let i = 0; i < nF; i++) { const t = (i + 1) / nF; this.opacidad(Math.min(1, t * t)); this.fill(mezclarPDF(FONDO_A, FONDO_B, 0.15)); d.rect(0, yF + hF * i / nF, W, hF / nF, 'F'); } this.opacidad(1); this.fill(mezclarPDF(FONDO_A, FONDO_B, 0.15)); d.rect(0, hImg + 1.9, W, 4, 'F');
      this.opacidad(0.55); this.fill(FONDO_B); d.rect(0, 0, W, 30, 'F'); this.opacidad(1); }
    else this.relieveDecorativo(W * 0.35, 18, W * 0.65, 120);
    this.sello(M, 12); this.espaciado(1); this.f('bold', 7.6, PDFC.oro); this.texto('STATE ORIGEN', M + 11, 15.6); this.espaciado(0); this.f('normal', 7, [196, 222, 207]); this.texto('Gestión integral de finca cafetera · de la finca a la taza', M + 11, 19.4);
    this.f('bold', 7.6, PDFC.blanco); this.texto(this.finca.nombre || '', W - M, 15.6, { align: 'right' }); this.f('normal', 6.8, [196, 222, 207]); this.texto(this.ref, W - M, 19.4, { align: 'right' });
    let y = img ? hImg - 6 : 150; const cod = 'INFORME · ' + String(o.codigo || 'INF'); this.espaciado(0.9); this.f('bold', 7, PDFC.oro); const cw = this.ancho(cod) + 8 + cod.length * 0.9; this.draw(PDFC.oro, 0.35); d.roundedRect(M, y - 4.4, cw, 6.6, 3.3, 3.3, 'S'); this.texto(cod, M + 4, y); this.espaciado(0);
    y += 13; this.f('black', 30, PDFC.blanco); const tamT = this.ajustar(o.titulo, W - 2 * M, 30, 20); const lt = this.partir(o.titulo, W - 2 * M).slice(0, 3); lt.forEach(l => { this.f('black', tamT, PDFC.blanco); this.texto(l, M, y); y += tamT * 0.43; });
    this.fill(PDFC.oro); d.rect(M, y - 1, 26, 1.1, 'F'); y += 8; this.f('normal', 10.5, [205, 226, 213]); const ls = this.partir(o.subtitulo || '', W - 2 * M - 20).slice(0, 3); ls.forEach(l => { this.texto(l, M, y); y += 5; });
    y = Math.max(y + 8, 218); const info = [['Finca', this.finca.nombre || '—'], ['Ubicación', [this.finca.vereda && 'Vereda ' + this.finca.vereda, this.finca.municipio, this.finca.departamento].filter(Boolean).join(' · ') || '—'], ['Periodo', o.periodo || '—'],
      ['Emitido', fechaLarga(this.emitido)], ['Altitud y área', [this.finca.altitud && num(this.finca.altitud) + ' msnm', this.finca.areaTotal && num(this.finca.areaTotal) + ' ha'].filter(Boolean).join(' · ') || '—'], ['Referencia', this.ref]];
    const cwI = (W - 2 * M) / 3; this.draw([60, 96, 76], 0.2); d.line(M, y - 6, W - M, y - 6);
    info.forEach((p, i) => { const x = M + (i % 3) * cwI, yy = y + Math.floor(i / 3) * 12; this.espaciado(0.5); this.f('bold', 6, PDFC.oro); this.texto(p[0].toUpperCase(), x, yy); this.espaciado(0); this.f('medium', 8.6, PDFC.blanco); this.texto(this.partir(p[1], cwI - 4)[0], x, yy + 4.6); });
    this.yIndice = y + 26; this.draw([60, 96, 76], 0.2); d.line(M, this.yIndice - 6, W - M, this.yIndice - 6);
    this.f('normal', 6.4, [150, 180, 162]); this.texto('Documento generado con los datos registrados en la plataforma. Las cifras de referencia deben confirmarse con su asesor técnico o contable.', M, H - 10);
    this.secciones = []; d.addPage(); this.cabeceraContinua(); this.pag1 = false; return this;
  };
  /* ---------- Cabecera de páginas internas ---------- */
  P.cabeceraContinua = function () {
    const d = this.doc; this.degradado(0, 0, this.W, 2.2, PDFC.marcaOsc, PDFC.marca, 30, false); this.fill(PDFC.oro); d.rect(0, 2.2, this.W * 0.18, 0.5, 'F');
    this.sello(this.M, 7.2); this.espaciado(0.8); this.f('bold', 6.2, PDFC.oro); this.texto('STATE ORIGEN', this.M + 9.6, 10.6); this.espaciado(0);
    const xa = this.M + 9.6 + this.ancho('STATE ORIGEN') + 12 * 0.8 + 3; this.f('bold', 7.6, PDFC.tinta); this.texto(this.o.titulo, xa, 10.6);
    this.f('normal', 6.8, PDFC.tenue); this.texto([this.seccionActual, this.finca.nombre].filter(Boolean).join(' · '), this.x1, 10.6, { align: 'right' });
    this.draw(PDFC.linea, 0.25); d.line(this.M, 14.2, this.x1, 14.2); this.y = 23;
  };
  /* ---------- Secciones con número, título, regla y registro para el índice ---------- */
  P.seccion = function (n, titulo, desc) {
    const d = this.doc; if (this.y > this.H * 0.74) this.nuevaPagina(); else this.asegurar(desc ? 34 : 26); if (this.y > 30) this.y += 4;
    this.seccionActual = titulo; (this.secciones = this.secciones || []).push({ n, titulo, pag: d.getCurrentPageInfo().pageNumber });
    const y = this.y; if (n) { this.fill(PDFC.marcaOsc); d.roundedRect(this.x0, y - 6.2, 10, 10, 2.2, 2.2, 'F'); this.fill(PDFC.oro); d.rect(this.x0, y + 2.6, 10, 1.2, 'F'); this.f('black', 10, PDFC.blanco); this.texto(String(n).padStart(2, '0'), this.x0 + 5, y + 0.6, { align: 'center' }); }
    const tx = this.x0 + (n ? 14 : 0); this.f('black', 14.5, PDFC.tinta); this.texto(titulo, tx, y + 0.8);
    this.y = y + 6.4; this.draw(PDFC.linea, 0.25); d.line(tx, this.y - 2.4, this.x1, this.y - 2.4);
    if (desc) { this.f('normal', 8.6, PDFC.tinta2); const ls = this.partir(desc, this.cw - (n ? 14 : 0)); this.texto(ls, tx, this.y + 2); this.y += ls.length * 3.8 + 4.5; } else this.y += 3;
    return this;
  };
  /* ---------- Tarjetas de indicadores ---------- */
  P.kpis = function (items, cols) {
    cols = cols || Math.min(4, items.length); const gap = 4, w = (this.cw - gap * (cols - 1)) / cols, h = 26; const d = this.doc;
    for (let i = 0; i < items.length; i += cols) { this.asegurar(h + 4);
      items.slice(i, i + cols).forEach((k, j) => { const x = this.x0 + j * (w + gap), y = this.y; const tono = TONO_PDF[k.tono] ? PDFC[TONO_PDF[k.tono][0]] : PDFC.marca;
        this.opacidad(0.07); this.fill(PDFC.tinta); d.roundedRect(x + 0.5, y + 0.8, w, h, 2.4, 2.4, 'F'); this.opacidad(1);
        this.fill(PDFC.blanco); this.draw(PDFC.linea, 0.25); d.roundedRect(x, y, w, h, 2.4, 2.4, 'FD'); this.fill(tono); d.roundedRect(x, y, w, 1.6, 0.8, 0.8, 'F'); d.rect(x, y + 0.8, w, 0.8, 'F');
        this.fill(mezclarPDF(tono, PDFC.blanco, 0.86)); d.circle(x + w - 5.5, y + 7.4, 2.6, 'F'); this.fill(tono); d.circle(x + w - 5.5, y + 7.4, 1, 'F');
        this.espaciado(0.35); this.f('bold', 6.1, PDFC.tenue); this.ajustar(String(k.t).toUpperCase(), w - 19, 6.1, 4.6); this.texto(String(k.t).toUpperCase(), x + 4.2, y + 7.8); this.espaciado(0);
        this.f('black', 15.5, PDFC.tinta); this.ajustar(k.v, w - 8, 15.5, 9); this.texto(k.v, x + 4.2, y + 16.6);
        if (k.s) { if (k.stono) { this.f('bold', 6.4); const s0 = this.partir(k.s, w - 12)[0]; const [c, cl] = TONO_PDF[k.stono === 'ok' ? 'ok' : k.stono === 'mal' ? 'mal' : k.stono] || TONO_PDF.info; const pw = Math.min(w - 8, this.ancho(s0) + 4.4); this.fill(PDFC[cl]); d.roundedRect(x + 4.2, y + 19.2, pw, 4.4, 2.2, 2.2, 'F'); this.f('bold', 6.4, PDFC[c]); this.texto(s0, x + 6.4, y + 22.3); }
          else { this.f('normal', 6.8, PDFC.tinta2); this.texto(this.partir(k.s, w - 8)[0], x + 4.2, y + 22.2); } } });
      this.y += h + gap + 1; }
    this.y += 1; return this;
  };
  /* ---------- Tablas con cabecera oscura, filas alternas y total destacado ---------- */
  P.tabla = function (o) {
    const d = this.doc; const fs = o.fs || 8.2; const cols = o.cols; const tot = cols.reduce((s, c) => s + (c.w || 1), 0); const ws = cols.map(c => (c.w || 1) / tot * this.cw);
    const xs = []; let acc = this.x0; ws.forEach(w => { xs.push(acc); acc += w; }); const pad = 1.9;
    const cab = () => { this.asegurar(16); this.espaciado(0.3); this.f('bold', 6.2, PDFC.blanco);
      let hh = 0; const ls = cols.map((c, i) => { const l = this.partir(String(c.t || '').toUpperCase(), ws[i] - 2 * pad, true); hh = Math.max(hh, l.length); return l; }); const hc = 3.6 + (hh - 1) * 2.6 + 3;
      this.fill(PDFC.marcaOsc); d.roundedRect(this.x0, this.y, this.cw, hc, 1.6, 1.6, 'F'); d.rect(this.x0, this.y + hc - 1.6, this.cw, 1.6, 'F');
      cols.forEach((c, i) => { const a = c.a || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad; this.f('bold', 6.2, [214, 232, 221]); this.texto(ls[i], x, this.y + 4.4, { align: a }); });
      this.espaciado(0); this.y += hc + 0.4; };
    if (o.titulo) { this.asegurar(30); this.subtitulo(o.titulo, o.der); }
    cab(); const celda = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : { t: v };
    const pintarFila = (fila, k, total) => {
      const cs = fila.map(celda); this.f(total ? 'bold' : 'normal', fs); const ls = cs.map((c, i) => this.partir(c.t == null ? '' : c.t, ws[i] - 2 * pad)); const n = Math.max(1, ...ls.map(l => l.length)); const h = n * fs * 0.42 + 2 * pad + 0.6;
      if (this.asegurar(h + 1)) cab();
      if (total) { this.fill(PDFC.lavado2); d.rect(this.x0, this.y + 0.4, this.cw, h, 'F'); this.fill(PDFC.oro); d.rect(this.x0, this.y, this.cw, 0.6, 'F'); }
      else if (o.zebra !== false && k % 2 === 1) { this.fill([248, 250, 246]); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      if (o.fondo && o.fondo(fila, k)) { this.fill(PDFC[o.fondo(fila, k)]); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      cs.forEach((c, i) => { const a = cols[i].a || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad; const yb = this.y + pad + fs * 0.36 + (total ? 0.4 : 0);
        if (c.chip) { const tono = TONO_PDF[c.chip] || TONO_PDF.info; this.f('bold', fs - 1.2); const tw = this.ancho(c.t) + 4.4; const cx = a === 'right' ? x - tw : a === 'center' ? x - tw / 2 : x;
          this.fill(PDFC[tono[1]]); d.roundedRect(cx, this.y + pad - 0.5, tw, fs * 0.42 + 1.6, 1.8, 1.8, 'F'); this.fill(PDFC[tono[0]]); d.circle(cx + 1.7, this.y + pad + fs * 0.21 + 0.3, 0.55, 'F'); this.f('bold', fs - 1.2, PDFC[tono[0]]); this.texto(c.t, cx + 2.8, yb); return; }
        if (c.barra != null) { const bw = (ws[i] - 2 * pad) * 0.6; const bx = xs[i] + pad; this.fill(PDFC.lavado2); d.roundedRect(bx, this.y + pad + 0.5, bw, 2.4, 1.2, 1.2, 'F'); this.fill(PDFC[c.color || 'marca']); d.roundedRect(bx, this.y + pad + 0.5, Math.max(0.8, bw * Math.min(1, Math.max(0, c.barra))), 2.4, 1.2, 1.2, 'F');
          this.f('bold', fs - 0.6, PDFC.tinta); this.texto(c.t, xs[i] + ws[i] - pad, yb, { align: 'right' }); return; }
        this.f(c.b || total ? 'bold' : (i === 0 && o.primeraFuerte ? 'medium' : 'normal'), c.tam || fs, c.color ? PDFC[c.color] : (c.suave ? PDFC.tenue : PDFC.tinta)); this.texto(ls[i], x, yb, { align: a }); });
      this.y += h + (total ? 0.4 : 0); if (!total) { this.draw([232, 237, 233], 0.15); d.line(this.x0, this.y, this.x1, this.y); } };
    (o.filas || []).forEach((f, k) => pintarFila(f, k, false));
    if (!(o.filas || []).length) { this.fill(PDFC.lavado); d.rect(this.x0, this.y, this.cw, 10, 'F'); this.f('normal', 8.2, PDFC.tenue); this.texto(o.vacio || 'Sin registros en el periodo.', this.x0 + this.cw / 2, this.y + 6, { align: 'center' }); this.y += 10; }
    if (o.total) pintarFila(o.total, 0, true);
    if (o.pie) { this.y += 2.4; this.f('normal', 7, PDFC.tenue); const ls = this.partir(o.pie, this.cw); this.texto(ls, this.x0, this.y + 2); this.y += ls.length * 3.2; }
    this.y += 6; return this;
  };
  /* ---------- Notas con ícono ---------- */
  P.nota = function (s, tono, titulo) {
    const [c, cl] = TONO_PDF[tono || 'info'] || TONO_PDF.info; this.f('normal', 8.4); const ls = this.partir(s, this.cw - 18); const h = Math.max(13, ls.length * 3.9 + (titulo ? 10 : 7));
    this.asegurar(h + 3); const d = this.doc; this.fill(PDFC[cl]); d.roundedRect(this.x0, this.y, this.cw, h, 2.4, 2.4, 'F'); this.fill(PDFC[c]); d.roundedRect(this.x0, this.y, 1.6, h, 0.8, 0.8, 'F');
    this.fill(PDFC[c]); d.circle(this.x0 + 8, this.y + 6.2, 2.8, 'F'); this.f('black', 8, PDFC.blanco); this.texto(tono === 'mal' || tono === 'alerta' ? '!' : tono === 'ok' ? '✓' : 'i', this.x0 + 8, this.y + 7.3, { align: 'center' });
    let yy = this.y + 6; if (titulo) { this.f('bold', 9, PDFC[c]); this.texto(titulo, this.x0 + 14, yy); yy += 4.6; }
    this.f('normal', 8.4, PDFC.tinta2); this.texto(ls, this.x0 + 14, yy); this.y += h + 4; return this;
  };
  P.subtitulo = function (s, der) { this.asegurar(13); const d = this.doc; this.fill(PDFC.oro); d.rect(this.x0, this.y - 3, 0.9, 3.8, 'F'); this.f('bold', 9.6, PDFC.tinta); this.texto(s, this.x0 + 2.8, this.y); if (der) { this.f('normal', 7.4, PDFC.tenue); this.texto(der, this.x1, this.y, { align: 'right' }); } this.y += 5; return this; };
  /* ---------- Gráficas: fondo del área, barras redondeadas ---------- */
  const _barras20 = P.barras, _lineas20 = P.lineas, _cascada20 = P.cascada;
  P.marcoGrafica = function (o, h) { const alto = h || o.alto || 58; this.asegurar(alto + (o.titulo ? 10 : 3) + 7); if (o.titulo) this.subtitulo(o.titulo, o.der);
    const ley = (o.series || []).length > 1 || o.leyenda; if (ley) { this.leyenda((o.series || []).map((s, i) => ({ t: s.nombre, color: s.color || PDFC.serie[i % 6], linea: s.tipo === 'linea' })), this.x0 + 1, this.y + 1); this.y += 5; }
    this.fill([249, 251, 248]); this.doc.roundedRect(this.x0, this.y - 1, this.cw, alto + 1, 2, 2, 'F'); return alto; };
  P.barras = function (o) { const d = this.doc; const rect0 = d.rect.bind(d); d.rect = (x, y, w, h, st) => { if (st === 'F' && w < this.cw * 0.5 && h > 1.2 && w > 1.2) { const r = Math.min(1.1, w / 3); d.roundedRect(x, y, w, h, r, r, 'F'); return d; } return rect0(x, y, w, h, st); };
    try { return _barras20.call(this, o); } finally { d.rect = rect0; } };
  P.cascada = function (items, o) { const d = this.doc; const rect0 = d.rect.bind(d); d.rect = (x, y, w, h, st) => { if (st === 'F' && w < this.cw * 0.5 && h > 1.2) { d.roundedRect(x, y, w, h, 0.9, 0.9, 'F'); return d; } return rect0(x, y, w, h, st); };
    try { return _cascada20.call(this, items, o); } finally { d.rect = rect0; } };
  /* ---------- Nuevos bloques: destacados y medidor ---------- */
  P.destacados = function (items, titulo) { // items: [{ t, d, tono }]
    if (!items || !items.length) return this; const d = this.doc; this.f('normal', 8); const alturas = items.map(it => this.partir(it.d || '', this.cw / 2 - 18).length * 3.6 + 9); const filas = Math.ceil(items.length / 2);
    const H = (titulo ? 9 : 4) + Array.from({ length: filas }, (_, r) => Math.max(alturas[2 * r] || 0, alturas[2 * r + 1] || 0)).reduce((a, b) => a + b, 0) + 3; this.asegurar(H + 3);
    this.degradado(this.x0, this.y, this.cw, H, PDFC.marcaOsc, [22, 66, 46], 24); this.fill(PDFC.oro); d.rect(this.x0, this.y, 30, 0.9, 'F'); let y = this.y + 6;
    if (titulo) { this.espaciado(0.6); this.f('bold', 7, PDFC.oro); this.texto(titulo.toUpperCase(), this.x0 + 5, y); this.espaciado(0); y += 5; }
    for (let r = 0; r < filas; r++) { let hmax = 0; [0, 1].forEach(c => { const it = items[2 * r + c]; if (!it) return; const x = this.x0 + 5 + c * this.cw / 2; const col = PDFC[(TONO_PDF[it.tono] || TONO_PDF.oro)[0]];
        this.fill(col); d.circle(x + 1.6, y + 1.6, 1.6, 'F'); this.f('bold', 8.8, PDFC.blanco); this.texto(this.partir(it.t, this.cw / 2 - 14)[0], x + 5.5, y + 2.6); this.f('normal', 7.8, [200, 222, 209]); const ls = this.partir(it.d || '', this.cw / 2 - 18); this.texto(ls, x + 5.5, y + 6.6); hmax = Math.max(hmax, alturas[2 * r + c]); }); y += hmax; }
    this.y += H + 4; return this; };
  P.medidor = function (x, y, r, v, etq) { const d = this.doc; const seg = (a0, a1, col, rr, gr) => { const pts = []; const n = Math.max(2, Math.ceil((a1 - a0) / 0.06)); for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); } for (let k = n; k >= 0; k--) { const a = a0 + (a1 - a0) * k / n; pts.push([x + (rr - gr) * Math.cos(a), y + (rr - gr) * Math.sin(a)]); } const s = []; for (let k = 1; k < pts.length; k++) s.push([pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]); this.fill(col); d.lines(s, pts[0][0], pts[0][1], [1, 1], 'F', true); };
    seg(Math.PI, 2 * Math.PI, PDFC.lavado2, r, r * 0.22); const col = v == null ? PDFC.tenue : v >= 80 ? PDFC.ok : v >= 60 ? PDFC.alerta : PDFC.mal; if (v != null) seg(Math.PI, Math.PI + Math.PI * Math.max(0.01, Math.min(1, v / 100)), col, r, r * 0.22);
    this.f('black', r * 0.9, PDFC.tinta); this.texto(v == null ? '—' : String(v), x, y - 0.5, { align: 'center' }); if (etq) { this.f('bold', 6.2, PDFC.tinta2); this.texto(this.partir(etq, r * 2.4)[0], x, y + 4.4, { align: 'center' }); } return this; };
  /* ---------- Pie con número de página e índice en la portada ---------- */
  P.pie = function () {
    const d = this.doc; const n = d.getNumberOfPages();
    if (this.portadaCompleta) { d.setPage(1); const secs = (this.secciones || []).filter(s => s.titulo); const y0 = this.yIndice; this.espaciado(0.8); this.f('bold', 6.4, PDFC.oro); this.texto('CONTENIDO', this.M, y0); this.espaciado(0);
      const colW = (this.W - 2 * this.M - 10) / 2; const porCol = Math.ceil(secs.length / 2); secs.slice(0, 16).forEach((s, i) => { const c = i >= porCol ? 1 : 0, r = i - c * porCol; const x = this.M + c * (colW + 10), y = y0 + 6 + r * 5.2; if (y > this.H - 16) return;
        this.f('bold', 7.4, PDFC.oro); this.texto(String(s.n || '').padStart(2, '0'), x, y); this.f('medium', 8, PDFC.blanco); this.texto(this.partir(s.titulo, colW - 22)[0], x + 7, y); this.f('normal', 7.4, [176, 204, 188]); this.texto(String(s.pag - 1), x + colW, y, { align: 'right' }); this.draw([52, 86, 68], 0.12); d.setLineDashPattern([0.4, 0.8], 0); d.line(x + 8 + this.ancho(this.partir(s.titulo, colW - 22)[0]) + 2, y - 0.6, x + colW - 5, y - 0.6); d.setLineDashPattern([], 0); }); }
    for (let i = this.portadaCompleta ? 2 : 1; i <= n; i++) { d.setPage(i); const y = this.H - 9.5; this.draw(PDFC.linea, 0.2); d.line(this.M, y - 4, this.W - this.M, y - 4);
      this.f('bold', 6.6, PDFC.tinta2); this.texto('State Origen · ' + (this.finca.nombre || '') + ' · ' + this.o.titulo, this.M, y);
      this.f('normal', 6.2, PDFC.tenue); this.texto(this.o.pieNota || ('Generado el ' + fechaLarga(this.emitido) + ' con los datos de la plataforma · Ref. ' + this.ref), this.M, y + 3.2);
      const t = 'Página ' + (this.portadaCompleta ? i - 1 : i) + ' de ' + (this.portadaCompleta ? n - 1 : n); this.f('bold', 6.8); const w = this.ancho(t) + 6; this.fill(PDFC.marcaOsc); d.roundedRect(this.W - this.M - w, y - 3.2, w, 5, 2.5, 2.5, 'F'); this.f('bold', 6.8, PDFC.blanco); this.texto(t, this.W - this.M - w / 2, y + 0.3, { align: 'center' }); }
  };
})();
/* Pares etiqueta–valor: el valor usa hasta el 68 % del ancho para que los códigos largos no se corten */
InformePDF.prototype.kv = function (pares, cols) {
  cols = cols || 2; const gw = (this.cw - (cols - 1) * 8) / cols; const filas = Math.ceil(pares.length / cols);
  for (let r = 0; r < filas; r++) { this.asegurar(8); for (let c = 0; c < cols; c++) { const p = pares[r * cols + c]; if (!p) continue; const x = this.x0 + c * (gw + 8);
    this.f(p[2] ? 'bold' : 'medium', 8.6); let v = this.partir(p[1], gw * 0.68)[0]; let tam = 8.6; while (tam > 6.4 && this.ancho(String(p[1])) > gw * 0.68) { tam -= 0.4; this.doc.setFontSize(tam); } if (this.ancho(String(p[1])) <= gw * 0.68) v = String(p[1]);
    this.f('normal', 8, PDFC.tenue); this.texto(this.partir(p[0], gw * 0.34)[0], x, this.y); this.f(p[2] ? 'bold' : 'medium', tam, p[3] ? PDFC[p[3]] : PDFC.tinta); this.texto(v, x + gw, this.y, { align: 'right' });
    this.draw(PDFC.linea, 0.15); this.doc.line(x, this.y + 2.2, x + gw, this.y + 2.2); }
    this.y += 6.4; }
  this.y += 2; return this; };
