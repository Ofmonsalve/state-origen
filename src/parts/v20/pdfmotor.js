/* ================= v20: motor de informes PDF (diseño editorial) =================
   Uso: const R = new InformePDF({ titulo, subtitulo, codigo, periodo }); R.portada(); R.seccion('01', 'Título'); R.kpis([...]); R.tabla({...}); R.guardar('archivo.pdf');
   Todo se dibuja en vectores (texto seleccionable) con la tipografía Figtree incrustada. */
const PDFC = {
  tinta: [22, 34, 27], tinta2: [70, 86, 77], tenue: [128, 141, 133], linea: [222, 228, 224], lavado: [245, 247, 243], lavado2: [236, 241, 235],
  marca: [30, 107, 69], marcaOsc: [15, 52, 35], marcaMed: [32, 84, 58], oro: [190, 145, 66], oroClaro: [233, 214, 172], cereza: [158, 52, 39],
  ok: [39, 128, 79], alerta: [196, 125, 14], mal: [184, 42, 30], info: [44, 108, 160], blanco: [255, 255, 255],
  okClaro: [229, 243, 234], alertaClaro: [251, 241, 222], malClaro: [250, 231, 228], infoClaro: [228, 238, 248],
  serie: [[42, 120, 214], [235, 104, 52], [27, 160, 112], [222, 153, 0], [212, 102, 150], [110, 145, 54]]
};
const TONO_PDF = { ok: ['ok', 'okClaro'], alerta: ['alerta', 'alertaClaro'], mal: ['mal', 'malClaro'], info: ['info', 'infoClaro'], marca: ['marca', 'lavado2'], oro: ['oro', 'lavado'] };
function fechaLarga(f) { if (!f) return ''; const d = parseFecha(String(f).slice(0, 10)); return d.getUTCDate() + ' de ' + MESES_L[d.getUTCMonth()].toLowerCase() + ' de ' + d.getUTCFullYear(); }
function fechaPDF(f) { if (!f) return '—'; const d = parseFecha(String(f).slice(0, 10)); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MESES_L[d.getUTCMonth()].slice(0, 3).toLowerCase() + ' ' + d.getUTCFullYear(); }
const pdfPesos = v => (v < 0 ? '−$' : '$') + Math.round(Math.abs(n0(v))).toLocaleString('es-CO');
const pdfPesosM = v => { const a = Math.abs(n0(v)); const s = v < 0 ? '−' : ''; return a >= 1e6 ? s + '$' + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',') + ' M' : a >= 1e3 ? s + '$' + Math.round(a / 1e3).toLocaleString('es-CO') + ' mil' : s + '$' + Math.round(a); };
const pdfKg = (v, d) => num(redondear(n0(v), d == null ? 0 : d)) + ' kg';
const pdfPct = (v, d) => v == null || !isFinite(v) ? '—' : num(redondear(v, d == null ? 1 : d)) + ' %';

class InformePDF {
  constructor(o) {
    this.o = Object.assign({ titulo: 'Informe', subtitulo: '', codigo: 'INF', periodo: '', horizontal: false }, o || {});
    const { jsPDF } = window.jspdf; this.doc = new jsPDF({ unit: 'mm', format: this.o.formato || 'a4', orientation: this.o.horizontal ? 'landscape' : 'portrait', compress: true });
    const d = this.doc; this.W = d.internal.pageSize.getWidth(); this.H = d.internal.pageSize.getHeight(); this.M = this.o.margen || 16; this.x0 = this.M; this.x1 = this.W - this.M; this.cw = this.x1 - this.x0; this.y = this.M;
    this.fam = 'helvetica'; this.uni = false;
    try { if (typeof FUENTES_PDF !== 'undefined') { Object.entries(FUENTES_PDF).forEach(([n, b]) => d.addFileToVFS(n + '.ttf', b));
      d.addFont('Figtree-Regular.ttf', 'Figtree', 'normal'); d.addFont('Figtree-SemiBold.ttf', 'Figtree', 'medium'); d.addFont('Figtree-Bold.ttf', 'Figtree', 'bold'); d.addFont('Figtree-ExtraBold.ttf', 'Figtree', 'black');
      d.setFont('Figtree', 'normal'); this.fam = 'Figtree'; this.uni = true; } } catch (e) { this.fam = 'helvetica'; this.uni = false; }
    const f = this.o.fincaId ? fincas.find(x => x.id === this.o.fincaId) : (fincasActivas()[0] || fincas[0]);
    this.finca = f || { nombre: 'Finca' }; this.emitido = hoyLocal();
    this.ref = (this.o.codigo || 'INF') + '-' + this.emitido.replace(/-/g, '');
  }
  t(s) { if (Array.isArray(s)) return s.map(x => this.t(x)); s = s == null ? '' : String(s); if (!this.uni) return pdfT(s); return s.replace(/[\u2713\u2714]/g, '•').replace(/\u25B2/g, '↑').replace(/\u25BC/g, '↓').replace(/[\u2610\u25A1]/g, '____').replace(/\u2248/g, '~').replace(/\u25CF/g, '•'); }
  f(estilo, tam, color) { const d = this.doc; const st = this.uni ? (estilo || 'normal') : (estilo === 'bold' || estilo === 'black' || estilo === 'medium' ? 'bold' : 'normal'); d.setFont(this.fam, st); d.setFontSize(tam || 9); d.setTextColor(...(color || PDFC.tinta)); return this; }
  fill(c) { this.doc.setFillColor(...c); return this; }
  draw(c, w) { this.doc.setDrawColor(...c); this.doc.setLineWidth(w == null ? 0.2 : w); return this; }
  texto(s, x, y, o) { this.doc.text(this.t(s), x, y, o || {}); }
  ancho(s) { return this.doc.getTextWidth(this.t(s)); }
  anchoT(t) { return this.doc.getTextWidth(t) + (this._cs || 0) * String(t).length; }
  partir(s, w, sinCortarPalabras) { // corte de líneas midiendo cada palabra con la fuente activa (exacto con la fuente incrustada)
    const out = []; String(Array.isArray(s) ? s.join(' ') : this.t(s)).split('\n').forEach(par => { const pal = par.split(/\s+/).filter(Boolean); let l = '';
      pal.forEach(p => { const cand = l ? l + ' ' + p : p; if (this.anchoT(cand) <= w || !l) { if (!l && this.anchoT(p) > w && !sinCortarPalabras) { let frag = ''; for (const ch of p) { if (this.anchoT(frag + ch) > w && frag) { out.push(frag); frag = ch; } else frag += ch; } l = frag; } else l = cand; } else { out.push(l); l = p; } });
      out.push(l); }); return out.length ? out : ['']; }
  espaciado(v) { this._cs = v || 0; try { this.doc.setCharSpace(v || 0); } catch (e) {} }
  // Ajusta el tamaño de letra para que el texto quepa en el ancho
  ajustar(s, w, tam, min) { let t = tam; this.doc.setFontSize(t); while (t > (min || 6) && this.ancho(s) > w) { t -= 0.5; this.doc.setFontSize(t); } return t; }

  /* ---------- Portada (franja superior de la primera página) ---------- */
  portada(o) {
    o = Object.assign({}, this.o, o || {}); const d = this.doc, W = this.W, M = this.M; const alto = Math.max(o.alto || 50, o.formato === 'a5' ? 44 : 50);
    this.fill(PDFC.marcaOsc); d.rect(0, 0, W, alto, 'F');
    this.relieveDecorativo(W * 0.52, 0, W * 0.48, alto);
    this.fill(PDFC.oro); d.rect(0, alto, W, 0.9, 'F');
    this.sello(M, 11);
    this.espaciado(0.9); this.f('bold', 7.2, PDFC.oro); this.texto('STATE ORIGEN', M + 10.5, 14.3); this.espaciado(0);
    this.f('normal', 6.6, [178, 205, 189]); this.texto('Gestión integral de finca cafetera', M + 10.5, 17.8);
    const anchoTit = W - 2 * M - (o.formato === 'a5' ? 40 : 76); this.f('black', 21, PDFC.blanco); const tamT = this.ajustar(o.titulo, anchoTit, 21, 14); this.f('normal', 8.8); const dosL = this.partir(o.subtitulo || '', anchoTit).length > 1; this.f('black', tamT, PDFC.blanco); this.texto(o.titulo, M, alto - (dosL ? 20 : 17));
    this.f('normal', 8.8, [196, 222, 207]); const sub = this.partir(o.subtitulo || '', anchoTit); if (sub.length > 1) { this.texto(sub.slice(0, 2), M, alto - 11.5); } else this.texto(sub, M, alto - 10.5);
    const xr = this.x1; this.f('bold', 9.2, PDFC.blanco); this.texto(this.finca.nombre || 'Finca', xr, 14, { align: 'right' });
    this.f('normal', 7, [178, 205, 189]); this.texto([this.finca.vereda && 'Vereda ' + this.finca.vereda, this.finca.municipio, this.finca.departamento].filter(Boolean).join(' · ') || ' ', xr, 18, { align: 'right' });
    if (this.finca.altitud && alto >= 48) this.texto(num(this.finca.altitud) + ' msnm' + (this.finca.areaTotal ? ' · ' + num(this.finca.areaTotal) + ' ha' : ''), xr, 21.6, { align: 'right' });
    const yP = Math.max(alto - 20.5, 24.5);
    if (o.periodo) { this.espaciado(0.5); this.f('bold', 6.2, PDFC.oro); this.texto('PERIODO', xr, yP, { align: 'right' }); this.espaciado(0); this.f('medium', 9, PDFC.blanco); this.texto(o.periodo, xr, yP + 4.5, { align: 'right' }); }
    this.f('normal', 6.6, [178, 205, 189]); this.texto('Emitido el ' + fechaLarga(this.emitido) + ' · ' + this.ref, xr, Math.max(alto - 10.5, yP + 10), { align: 'right' });
    this.y = alto + 10; this.pag1 = true; return this;
  }
  sello(x, y) { const d = this.doc; this.draw(PDFC.oro, 0.45); d.roundedRect(x, y - 0.5, 7.2, 7.2, 1.6, 1.6, 'S'); d.ellipse(x + 3.6, y + 3.1, 1.85, 2.6, 'S'); d.lines([[0.9, 1.1, 0.9, 2.3, 0, 3.4]], x + 3.6, y + 1.4, [1, 1], 'S'); }
  relieveDecorativo(x, y, w, h) {
    const d = this.doc; d.saveGraphicsState && d.saveGraphicsState();
    for (let i = 0; i < 9; i++) { const c = [24 + i * 2.2, 70 + i * 1.6, 49 + i * 1.2]; this.draw(c, 0.22); const yy = y + h * 0.08 + i * h * 0.105, a = 4 + i * 0.6;
      d.lines([[w * 0.18, -a, w * 0.32, a * 1.2, w * 0.5, 0], [w * 0.16, -a * 0.9, w * 0.34, a, w * 0.5, -a * 0.2]], x, yy, [1, 1], 'S'); }
    d.restoreGraphicsState && d.restoreGraphicsState();
  }
  cabeceraContinua() {
    const d = this.doc; this.espaciado(0.8); this.f('bold', 6.4, PDFC.oro); this.texto('STATE ORIGEN', this.M, 11); this.espaciado(0);
    const xa = this.M + this.ancho('STATE ORIGEN') + 12 * 0.8 + 4; this.f('medium', 7.6, PDFC.tinta2); this.texto(this.o.titulo, xa, 11);
    this.f('normal', 7, PDFC.tenue); this.texto([this.finca.nombre, this.o.periodo].filter(Boolean).join(' · '), this.x1, 11, { align: 'right' });
    this.draw(PDFC.linea, 0.25); d.line(this.M, 14, this.x1, 14); this.y = 22;
  }
  nuevaPagina() { this.doc.addPage(); this.cabeceraContinua(); }
  asegurar(h) { if (this.y + h > this.H - 17) { this.nuevaPagina(); return true; } return false; }
  espacio(h) { this.y += h == null ? 4 : h; return this; }

  /* ---------- Bloques de texto ---------- */
  seccion(n, titulo, desc) {
    this.asegurar(desc ? 30 : 22); if (this.y > 30) this.y += 3; const d = this.doc;
    if (n) { this.espaciado(0.6); this.f('black', 7.5, PDFC.oro); this.texto(String(n).padStart(2, '0'), this.x0, this.y); this.espaciado(0); }
    this.f('bold', 13, PDFC.tinta); this.texto(titulo, this.x0 + (n ? 8 : 0), this.y + 0.2);
    this.y += 3; this.draw(PDFC.tinta, 0.35); d.line(this.x0, this.y, this.x0 + 14, this.y); this.draw(PDFC.linea, 0.2); d.line(this.x0 + 14, this.y, this.x1, this.y); this.y += 5;
    if (desc) { this.f('normal', 8.4, PDFC.tinta2); const ls = this.partir(desc, this.cw); this.texto(ls, this.x0, this.y); this.y += ls.length * 3.7 + 2.5; }
    return this;
  }
  subtitulo(s, der) { this.asegurar(12); this.f('bold', 9.4, PDFC.tinta); this.texto(s, this.x0, this.y); if (der) { this.f('normal', 7.6, PDFC.tenue); this.texto(der, this.x1, this.y, { align: 'right' }); } this.y += 4.5; return this; }
  parrafo(s, o) {
    o = o || {}; const tam = o.tam || 9, lh = tam * 0.46; this.f(o.estilo || 'normal', tam, o.color || PDFC.tinta2); const ls = this.partir(s, o.ancho || this.cw);
    ls.forEach(l => { this.asegurar(lh + 1); this.f(o.estilo || 'normal', tam, o.color || PDFC.tinta2); this.texto(l, o.x || this.x0, this.y); this.y += lh; }); this.y += o.despues == null ? 2.5 : o.despues; return this;
  }
  // Párrafo con fragmentos en negrita: [['texto normal'], ['negrita', true], ...]
  rico(frag, o) {
    o = o || {}; const tam = o.tam || 9.6, lh = tam * 0.5, maxW = o.ancho || this.cw; let x = this.x0, lineas = [[]], w = 0;
    frag.forEach(([s, b]) => { String(s).split(/(\s+)/).forEach(p => { if (!p) return; this.f(b ? 'bold' : 'normal', tam); const pw = this.ancho(p); if (w + pw > maxW && p.trim()) { lineas.push([]); w = 0; if (!p.trim()) return; } lineas[lineas.length - 1].push([p, b, pw]); w += pw; }); });
    lineas.forEach(l => { this.asegurar(lh + 1); x = this.x0; l.forEach(([p, b, pw]) => { this.f(b ? 'bold' : 'normal', tam, b ? PDFC.tinta : PDFC.tinta2); this.texto(p, x, this.y); x += pw; }); this.y += lh; });
    this.y += 2.5; return this;
  }
  nota(s, tono, titulo) {
    const [c, cl] = TONO_PDF[tono || 'info'] || TONO_PDF.info; this.f('normal', 8.4); const ls = this.partir(s, this.cw - 12); const h = ls.length * 3.8 + (titulo ? 9.5 : 6);
    this.asegurar(h + 2); const d = this.doc; this.fill(PDFC[cl]); d.roundedRect(this.x0, this.y, this.cw, h, 1.8, 1.8, 'F'); this.fill(PDFC[c]); d.rect(this.x0, this.y, 1.1, h, 'F');
    let yy = this.y + 5.2; if (titulo) { this.f('bold', 8.6, PDFC[c]); this.texto(titulo, this.x0 + 6, yy); yy += 4.4; }
    this.f('normal', 8.4, PDFC.tinta2); this.texto(ls, this.x0 + 6, yy); this.y += h + 4; return this;
  }
  kv(pares, cols) {
    cols = cols || 2; const gw = (this.cw - (cols - 1) * 8) / cols; const filas = Math.ceil(pares.length / cols);
    for (let r = 0; r < filas; r++) { this.asegurar(8); for (let c = 0; c < cols; c++) { const p = pares[r * cols + c]; if (!p) continue; const x = this.x0 + c * (gw + 8);
      this.f('normal', 8.2, PDFC.tenue); this.texto(p[0], x, this.y); this.f(p[2] ? 'bold' : 'medium', 8.6, p[3] ? PDFC[p[3]] : PDFC.tinta); const v = this.partir(p[1], gw * 0.55); this.texto(v[0], x + gw, this.y, { align: 'right' });
      this.draw(PDFC.linea, 0.15); this.doc.line(x, this.y + 2.2, x + gw, this.y + 2.2); }
      this.y += 6.4; }
    this.y += 2; return this;
  }

  /* ---------- Indicadores ---------- */
  kpis(items, cols) {
    cols = cols || Math.min(4, items.length); const gap = 4, w = (this.cw - gap * (cols - 1)) / cols, h = 23; const d = this.doc;
    for (let i = 0; i < items.length; i += cols) { this.asegurar(h + 3);
      items.slice(i, i + cols).forEach((k, j) => { const x = this.x0 + j * (w + gap), y = this.y; const tono = TONO_PDF[k.tono] ? PDFC[TONO_PDF[k.tono][0]] : PDFC.marca;
        this.fill(PDFC.lavado); d.roundedRect(x, y, w, h, 1.8, 1.8, 'F'); this.fill(tono); d.rect(x, y + 4, 0.9, h - 8, 'F');
        this.espaciado(0.3); this.f('bold', 6.3, PDFC.tenue); this.ajustar(String(k.t).toUpperCase(), w - 12, 6.3, 5); this.texto(String(k.t).toUpperCase(), x + 4.5, y + 6.2); this.espaciado(0);
        this.f('black', 14, PDFC.tinta); this.ajustar(k.v, w - 8, 14, 9); this.texto(k.v, x + 4.5, y + 14.2);
        if (k.s) { this.f('normal', 6.9, k.stono ? PDFC[k.stono] : PDFC.tinta2); const s = this.partir(k.s, w - 8); this.texto(s[0], x + 4.5, y + 19.3); } });
      this.y += h + gap; }
    this.y += 1; return this;
  }

  /* ---------- Tabla paginada ---------- */
  tabla(o) {
    const d = this.doc; const fs = o.fs || 8.2; const cols = o.cols; const tot = cols.reduce((s, c) => s + (c.w || 1), 0); const ws = cols.map(c => (c.w || 1) / tot * this.cw);
    const xs = []; let acc = this.x0; ws.forEach(w => { xs.push(acc); acc += w; }); const pad = 1.8;
    const cab = () => { this.asegurar(14); this.espaciado(0.25); this.f('bold', 6.3, PDFC.tenue);
      let hh = 0; const ls = cols.map((c, i) => { const l = this.partir(String(c.t || '').toUpperCase(), ws[i] - 2 * pad, true); hh = Math.max(hh, l.length); return l; });
      cols.forEach((c, i) => { const a = c.a || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad; this.texto(ls[i], x, this.y + 3.4, { align: a }); });
      this.espaciado(0); this.y += 3.4 + (hh - 1) * 2.6 + 2; this.draw(PDFC.tinta2, 0.3); d.line(this.x0, this.y, this.x1, this.y); this.y += 0.6; };
    if (o.titulo) { this.asegurar(28); this.subtitulo(o.titulo, o.der); }
    cab();
    const celda = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : { t: v };
    const pintarFila = (fila, k, total) => {
      const cs = fila.map(celda); this.f(total ? 'bold' : 'normal', fs);
      const ls = cs.map((c, i) => this.partir(c.t == null ? '' : c.t, ws[i] - 2 * pad)); const n = Math.max(1, ...ls.map(l => l.length)); const h = n * fs * 0.42 + 2 * pad + 0.4;
      if (this.asegurar(h + 1)) cab();
      if (total) { this.draw(PDFC.tinta, 0.4); d.line(this.x0, this.y, this.x1, this.y); this.fill(PDFC.lavado2); d.rect(this.x0, this.y + 0.2, this.cw, h, 'F'); }
      else if (o.zebra !== false && k % 2 === 1) { this.fill(PDFC.lavado); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      if (o.fondo && o.fondo(fila, k)) { this.fill(PDFC[o.fondo(fila, k)]); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      cs.forEach((c, i) => { const a = cols[i].a || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad;
        if (c.chip) { const tono = TONO_PDF[c.chip] || TONO_PDF.info; this.f('bold', fs - 1.2); const tw = this.ancho(c.t) + 4; const cx = a === 'right' ? x - tw : a === 'center' ? x - tw / 2 : x;
          this.fill(PDFC[tono[1]]); d.roundedRect(cx, this.y + pad - 0.4, tw, fs * 0.42 + 1.4, 1.4, 1.4, 'F'); this.f('bold', fs - 1.2, PDFC[tono[0]]); this.texto(c.t, cx + 2, this.y + pad + fs * 0.33); return; }
        if (c.barra != null) { const bw = (ws[i] - 2 * pad) * 0.62; const bx = xs[i] + pad; this.fill(PDFC.linea); d.roundedRect(bx, this.y + pad + 0.6, bw, 2.2, 1.1, 1.1, 'F'); this.fill(PDFC[c.color || 'marca']); d.roundedRect(bx, this.y + pad + 0.6, Math.max(0.6, bw * Math.min(1, Math.max(0, c.barra))), 2.2, 1.1, 1.1, 'F');
          this.f('medium', fs - 0.6, PDFC.tinta2); this.texto(c.t, xs[i] + ws[i] - pad, this.y + pad + fs * 0.33, { align: 'right' }); return; }
        this.f(c.b || total ? 'bold' : (i === 0 && o.primeraFuerte ? 'medium' : 'normal'), c.tam || fs, c.color ? PDFC[c.color] : (c.suave ? PDFC.tenue : PDFC.tinta)); this.texto(ls[i], x, this.y + pad + fs * 0.33, { align: a }); });
      this.y += h; if (!total) { this.draw(PDFC.linea, 0.15); d.line(this.x0, this.y, this.x1, this.y); } };
    (o.filas || []).forEach((f, k) => pintarFila(f, k, false));
    if (!(o.filas || []).length) { this.f('normal', 8.4, PDFC.tenue); this.texto(o.vacio || 'Sin registros en el periodo.', this.x0 + pad, this.y + 5); this.y += 8; }
    if (o.total) pintarFila(o.total, 0, true);
    if (o.pie) { this.y += 2; this.f('normal', 7, PDFC.tenue); const ls = this.partir(o.pie, this.cw); this.texto(ls, this.x0, this.y + 2); this.y += ls.length * 3.2; }
    this.y += 5; return this;
  }

  /* ---------- Gráficas vectoriales ---------- */
  leyenda(items, x, y) { let xx = x; items.forEach(it => { this.fill(it.color); if (it.linea) this.doc.rect(xx, y - 1.4, 4, 0.8, 'F'); else this.doc.roundedRect(xx, y - 2.3, 2.6, 2.6, 0.5, 0.5, 'F'); this.f('normal', 7, PDFC.tinta2); this.texto(it.t, xx + (it.linea ? 5.2 : 3.8), y); xx += (it.linea ? 5.2 : 3.8) + this.ancho(it.t) + 5; }); }
  marcoGrafica(o, h) {
    const alto = h || o.alto || 58; this.asegurar(alto + (o.titulo ? 9 : 2) + 6); if (o.titulo) this.subtitulo(o.titulo, o.der);
    const ley = (o.series || []).length > 1 || o.leyenda; if (ley) { this.leyenda((o.series || []).map((s, i) => ({ t: s.nombre, color: s.color || PDFC.serie[i % 6], linea: s.tipo === 'linea' })), this.x0, this.y + 1); this.y += 5; }
    return alto;
  }
  ejes(y0, h, x0, x1, E, fmt, der, E2, fmt2) {
    const d = this.doc; const yv = v => y0 + h - (v - E.a) / ((E.b - E.a) || 1) * h;
    E.t.forEach(t => { const yy = yv(t); this.draw(t === 0 ? PDFC.tinta2 : PDFC.linea, t === 0 ? 0.3 : 0.15); d.line(x0, yy, x1, yy); this.f('normal', 6.2, PDFC.tenue); this.texto((fmt || fmtCorto)(t), x0 - 1.6, yy + 1, { align: 'right' }); });
    if (E2) E2.t.forEach(t => { const yy = y0 + h - (t - E2.a) / ((E2.b - E2.a) || 1) * h; this.f('normal', 6.2, PDFC.tenue); this.texto((fmt2 || fmtCorto)(t), x1 + 1.6, yy + 1); });
    return yv;
  }
  barras(o) {
    const d = this.doc; const h = this.marcoGrafica(o); const izq = 15, der = o.series.some(s => s.eje === 'der') ? 14 : 2; const x0 = this.x0 + izq, x1 = this.x1 - der, y0 = this.y + 2; const n = o.cats.length || 1;
    const barS = o.series.filter(s => s.tipo !== 'linea'); const linS = o.series.filter(s => s.tipo === 'linea');
    const tops = o.apilar ? o.cats.map((_, k) => barS.reduce((a, s) => a + Math.max(0, n0(s.vals[k])), 0)) : barS.flatMap(s => s.vals.map(n0));
    const izqLin = linS.filter(s => s.eje !== 'der').flatMap(s => s.vals.filter(v => v != null).map(n0));
    const E = escalaBonita(Math.min(0, ...tops, ...izqLin), Math.max(1, ...tops, ...izqLin), 4); const yv = this.ejes(y0, h - 8, x0, x1, E, o.fmt);
    const dv = linS.filter(s => s.eje === 'der').flatMap(s => s.vals.filter(v => v != null).map(n0)); let E2 = null, yv2 = null;
    if (dv.length) { const mn = Math.min(...dv), mx = Math.max(...dv), pad = Math.max((mx - mn) * 0.2, Math.abs(mx) * 0.03, 1); E2 = escalaBonita(mn - pad, mx + pad, 4); yv2 = v => y0 + (h - 8) - (v - E2.a) / ((E2.b - E2.a) || 1) * (h - 8); this.ejes(y0, h - 8, x0, x1, E, () => '', true, E2, o.fmt2); }
    const bw = (x1 - x0) / n; const gw = bw * (o.anchoBarra || 0.66); const cada = Math.max(1, Math.ceil(n / Math.max(4, Math.floor((x1 - x0) / 13))));
    o.cats.forEach((c, k) => { const cx = x0 + bw * k + bw / 2;
      if (o.apilar) { let acc = 0; barS.forEach((s, i) => { const v = Math.max(0, n0(s.vals[k])); if (!v) return; const ya = yv(acc), yb = yv(acc + v); this.fill(s.color || PDFC.serie[i % 6]); d.rect(cx - gw / 2, yb, gw, ya - yb, 'F'); acc += v; }); }
      else { const w1 = gw / Math.max(1, barS.length); barS.forEach((s, i) => { const v = n0(s.vals[k]); const ya = yv(0), yb = yv(v); this.fill(s.color || PDFC.serie[i % 6]); d.rect(cx - gw / 2 + w1 * i + 0.15, Math.min(ya, yb), w1 - 0.3, Math.max(0.25, Math.abs(ya - yb)), 'F');
        if (o.etiquetas && n <= 16) { this.f('medium', 5.8, PDFC.tinta2); this.texto((o.fmtEtiqueta || o.fmt || fmtCorto)(v), cx - gw / 2 + w1 * i + w1 / 2, Math.min(ya, yb) - 1.2, { align: 'center' }); } }); }
      if (k % cada === 0) { this.f(o.marca === k ? 'bold' : 'normal', 6.2, o.marca === k ? PDFC.tinta : PDFC.tenue); this.texto(c, cx, y0 + h - 3.6, { align: 'center' }); } });
    linS.forEach((s, i) => { const f = s.eje === 'der' ? yv2 : yv; const col = s.color || PDFC.serie[(barS.length + i) % 6]; let prev = null; this.draw(col, 0.6);
      s.vals.forEach((v, k) => { if (v == null) { prev = null; return; } const p = [x0 + bw * k + bw / 2, f(n0(v))]; if (prev) d.line(prev[0], prev[1], p[0], p[1]); prev = p; });
      s.vals.forEach((v, k) => { if (v == null) return; this.fill(PDFC.blanco); this.draw(col, 0.45); d.circle(x0 + bw * k + bw / 2, f(n0(v)), 0.75, 'FD'); }); });
    (o.refs || []).forEach(r => { const yy = yv(r.v); d.setLineDashPattern([1.2, 1], 0); this.draw(PDFC.cereza, 0.3); d.line(x0, yy, x1, yy); d.setLineDashPattern([], 0); this.f('bold', 6, PDFC.cereza); this.texto(r.t, x1, yy - 1.2, { align: 'right' }); });
    this.y = y0 + h + 3; return this;
  }
  lineas(o) {
    const d = this.doc; const h = this.marcoGrafica(o); const x0 = this.x0 + 15, x1 = this.x1 - 2, y0 = this.y + 2; const n = o.cats.length || 1;
    const vals = o.series.flatMap(s => s.vals.filter(v => v != null).map(n0)).concat((o.refs || []).map(r => r.v)); let lo = o.min0 === false ? Math.min(...vals) : Math.min(0, ...vals), hi = Math.max(1, ...vals); if (o.min0 === false && hi - lo < Math.abs(hi) * 0.06) { const c = (hi + lo) / 2, m = Math.max(Math.abs(c) * 0.04, 1); lo = c - m; hi = c + m; } const E = escalaBonita(lo, hi, 4); const yv = this.ejes(y0, h - 8, x0, x1, E, o.fmt);
    const xv = k => x0 + (n === 1 ? (x1 - x0) / 2 : k * (x1 - x0) / (n - 1)); const cada = Math.max(1, Math.ceil(n / Math.max(4, Math.floor((x1 - x0) / 14))));
    o.series.forEach((s, i) => { const col = s.color || PDFC.serie[i % 6]; const pts = s.vals.map((v, k) => v == null ? null : [xv(k), yv(n0(v))]);
      if (s.area) { const ok = pts.filter(Boolean); if (ok.length > 1) { const seg = []; for (let k = 1; k < ok.length; k++) seg.push([ok[k][0] - ok[k - 1][0], ok[k][1] - ok[k - 1][1]]); seg.push([0, yv(Math.max(E.a, 0)) - ok[ok.length - 1][1]]); seg.push([ok[0][0] - ok[ok.length - 1][0], 0]);
        this.fill(mezclarPDF(col, PDFC.blanco, 0.82)); d.lines(seg, ok[0][0], ok[0][1], [1, 1], 'F', true); } }
      this.draw(col, s.grueso || 0.6); if (s.punteada) d.setLineDashPattern([1.4, 1], 0); let prev = null; pts.forEach(p => { if (p && prev) d.line(prev[0], prev[1], p[0], p[1]); prev = p; }); d.setLineDashPattern([], 0);
      if (n <= 24 && s.puntos !== false) pts.forEach(p => { if (!p) return; this.fill(PDFC.blanco); this.draw(col, 0.4); d.circle(p[0], p[1], 0.7, 'FD'); }); });
    (o.refs || []).forEach(r => { const yy = yv(r.v); d.setLineDashPattern([1.2, 1], 0); this.draw(PDFC.cereza, 0.3); d.line(x0, yy, x1, yy); d.setLineDashPattern([], 0); this.f('bold', 6, PDFC.cereza); this.texto(r.t, x1, yy - 1.2, { align: 'right' }); });
    o.cats.forEach((c, k) => { if (k % cada === 0 || k === n - 1) { this.f('normal', 6.2, PDFC.tenue); this.texto(c, xv(k), y0 + h - 3.6, { align: 'center' }); } });
    this.y = y0 + h + 3; return this;
  }
  barrasH(items, o) {
    o = o || {}; const d = this.doc; const lw = o.etiqueta || 48, vw = o.valor || 26; const fila = o.fila || 6.6; const mx = Math.max(1e-9, ...items.map(i => Math.max(Math.abs(n0(i.v)), n0(i.meta)))); if (o.titulo) this.subtitulo(o.titulo, o.der);
    items.forEach((it, k) => { this.asegurar(fila + 1); const y = this.y; this.f(it.b ? 'bold' : 'normal', 8, PDFC.tinta); const et = this.partir(it.t, lw - 2)[0]; this.texto(et, this.x0, y + 3.4);
      if (it.s) { this.f('normal', 6.4, PDFC.tenue); this.texto(it.s, this.x0, y + 6.3); }
      const bx = this.x0 + lw, bw = this.cw - lw - vw; this.fill(PDFC.lavado2); d.roundedRect(bx, y + 1.3, bw, 2.8, 1.4, 1.4, 'F'); this.fill(it.color || (TONO_PDF[it.tono] ? PDFC[TONO_PDF[it.tono][0]] : PDFC.marca)); d.roundedRect(bx, y + 1.3, Math.max(0.8, bw * Math.abs(n0(it.v)) / mx), 2.8, 1.4, 1.4, 'F');
      if (it.meta != null) { const mxx = bx + bw * Math.min(1, it.meta / mx); this.draw(PDFC.tinta, 0.5); d.line(mxx, y + 0.4, mxx, y + 5); }
      this.f('bold', 8, PDFC.tinta); this.texto(it.vt != null ? it.vt : num(it.v), this.x1, y + 3.4, { align: 'right' }); this.y += fila + (it.s ? 2.4 : 0); });
    this.y += 3; return this;
  }
  dona(items, o) {
    o = o || {}; const d = this.doc; const r = o.radio || 17, ri = r * 0.6; this.asegurar(2 * r + 8); if (o.titulo) this.subtitulo(o.titulo, o.der);
    const cx = this.x0 + r + 2, cy = this.y + r + 1; const tot = items.reduce((s, i) => s + Math.max(0, n0(i.v)), 0) || 1; let a0 = -Math.PI / 2;
    items.forEach((it, i) => { const a1 = a0 + Math.max(0, n0(it.v)) / tot * Math.PI * 2; const pts = []; const pasos = Math.max(2, Math.ceil((a1 - a0) / 0.08));
      for (let k = 0; k <= pasos; k++) { const a = a0 + (a1 - a0) * k / pasos; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      for (let k = pasos; k >= 0; k--) { const a = a0 + (a1 - a0) * k / pasos; pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); }
      const seg = []; for (let k = 1; k < pts.length; k++) seg.push([pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]);
      this.fill(it.color || PDFC.serie[i % 6]); d.lines(seg, pts[0][0], pts[0][1], [1, 1], 'F', true); a0 = a1; });
    if (o.centro) { this.f('black', 11, PDFC.tinta); this.texto(o.centro, cx, cy + 1, { align: 'center' }); if (o.centroSub) { this.f('normal', 5.8, PDFC.tenue); this.texto(o.centroSub, cx, cy + 4.6, { align: 'center' }); } }
    let ly = this.y + 4; const lx = this.x0 + 2 * r + 12;
    const xr = o.anchoLeyenda ? lx + o.anchoLeyenda : this.x1;
    items.forEach((it, i) => { this.fill(it.color || PDFC.serie[i % 6]); d.roundedRect(lx, ly - 2.4, 2.8, 2.8, 0.6, 0.6, 'F');
      const vtxt = (it.vt != null ? it.vt : num(it.v)) + '  ·  ' + num(Math.round(n0(it.v) / tot * 100)) + ' %'; this.f('bold', 7.6, PDFC.tinta); const vw = this.ancho(vtxt);
      this.f('normal', 7.6, PDFC.tinta2); const disp = xr - lx - 5 - vw - 3; let et = String(it.t);
      if (this.ancho(et) > disp) { if (disp > 18) { while (et.length > 3 && this.ancho(et + '…') > disp) et = et.slice(0, -1); et += '…'; this.texto(et, lx + 5, ly); }
        else { this.texto(this.partir(et, xr - lx - 5)[0], lx + 5, ly); ly += 3.6; } } else this.texto(et, lx + 5, ly);
      this.f('bold', 7.6, PDFC.tinta); this.texto(vtxt, xr, ly, { align: 'right' }); ly += 5.4; });
    this.y = Math.max(cy + r + 5, ly + 2); return this;
  }
  cascada(items, o) {
    o = o || {}; const d = this.doc; const h = this.marcoGrafica(Object.assign({ series: [] }, o)); const x0 = this.x0 + 15, x1 = this.x1 - 2, y0 = this.y + 2; const n = items.length;
    let acc = 0; const pts = items.map(it => { if (it.total) { acc = it.v; return { a: 0, b: it.v, it }; } const p = { a: acc, b: acc + it.v, it }; acc += it.v; return p; });
    const vs = pts.flatMap(p => [p.a, p.b]); const E = escalaBonita(Math.min(0, ...vs), Math.max(1, ...vs), 4); const yv = this.ejes(y0, h - 12, x0, x1, E, o.fmt || fmtCorto); const bw = (x1 - x0) / n;
    pts.forEach((p, i) => { const x = x0 + bw * i + bw * 0.17, w = bw * 0.66; const top = yv(Math.max(p.a, p.b)), hh = Math.max(0.3, Math.abs(yv(p.a) - yv(p.b)));
      this.fill(p.it.total ? (p.b >= 0 ? PDFC.marca : PDFC.mal) : (p.it.v >= 0 ? PDFC.serie[2] : PDFC.serie[1])); d.rect(x, top, w, hh, 'F');
      this.f('bold', 6.2, PDFC.tinta); this.texto(fmtCorto(p.it.v), x + w / 2, top - 1.3, { align: 'center' });
      this.f('normal', 6, PDFC.tinta2); this.texto(this.partir(p.it.t, bw - 1).slice(0, 2), x + w / 2, y0 + h - 8.5, { align: 'center' });
      if (i < n - 1) { this.draw(PDFC.tenue, 0.15); d.setLineDashPattern([0.8, 0.8], 0); d.line(x + w, yv(p.b), x + bw, yv(p.b)); d.setLineDashPattern([], 0); } });
    this.y = y0 + h + 3; return this;
  }
  imagen(url, w, h, pie) {
    if (!url) return this; this.asegurar(h + (pie ? 7 : 3)); const x = this.x0 + (this.cw - w) / 2; try { this.doc.addImage(url, /^data:image\/jpe?g/.test(url) ? 'JPEG' : 'PNG', x, this.y, w, h, undefined, 'FAST'); } catch (e) { return this; }
    this.draw(PDFC.linea, 0.25); this.doc.roundedRect(x, this.y, w, h, 1, 1, 'S'); this.y += h + 2.5;
    if (pie) { this.f('normal', 7, PDFC.tenue); this.texto(this.partir(pie, this.cw), this.x0 + this.cw / 2, this.y + 1.5, { align: 'center' }); this.y += 5; } this.y += 2; return this;
  }
  columnas(n, fns, gap) { // dibuja n bloques lado a lado; cada fn recibe (x, ancho) y devuelve altura usada
    gap = gap == null ? 8 : gap; const w = (this.cw - gap * (n - 1)) / n; const y0 = this.y; let mx = 0; const x0b = this.x0, x1b = this.x1, cwb = this.cw;
    fns.forEach((fn, i) => { this.y = y0; this.x0 = x0b + i * (w + gap); this.x1 = this.x0 + w; this.cw = w; fn(this); mx = Math.max(mx, this.y - y0); });
    this.x0 = x0b; this.x1 = x1b; this.cw = cwb; this.y = y0 + mx; return this;
  }
  firmas(et) {
    this.asegurar(30); this.y += 14; const w = (this.cw - (et.length - 1) * 10) / et.length; const d = this.doc;
    et.forEach((e, i) => { const x = this.x0 + i * (w + 10); this.draw(PDFC.tinta2, 0.3); d.line(x, this.y, x + w, this.y); this.f('bold', 7.6, PDFC.tinta); this.texto(Array.isArray(e) ? e[0] : e, x, this.y + 4); if (Array.isArray(e) && e[1]) { this.f('normal', 6.8, PDFC.tenue); this.texto(e[1], x, this.y + 7.4); } });
    this.y += 12; return this;
  }
  pie() {
    const d = this.doc; const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) { d.setPage(i); const y = this.H - 10; this.draw(PDFC.linea, 0.2); d.line(this.M, y - 3.5, this.W - this.M, y - 3.5);
      this.f('medium', 6.6, PDFC.tinta2); this.texto('State Origen · ' + (this.finca.nombre || '') + ' · ' + this.o.titulo, this.M, y);
      this.f('normal', 6.4, PDFC.tenue); this.texto(this.o.pieNota || ('Documento generado el ' + fechaLarga(this.emitido) + ' con los datos registrados en la plataforma · Ref. ' + this.ref), this.M, y + 3.2);
      this.f('bold', 7, PDFC.tinta); this.texto(i + ' / ' + n, this.W - this.M, y, { align: 'right' }); }
  }
  blob() { this.pie(); return this.doc.output('blob'); }
  guardar(nombre) { this.pie(); const b = this.doc.output('blob'); if (typeof ofrecerDescarga === 'function') ofrecerDescarga(nombre, b); else this.doc.save(nombre); return b; }
}
function mezclarPDF(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); }
function hexAPDF(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }

/* ---------- Imágenes de la maqueta para los informes (siempre en tema claro) ---------- */
function lienzoPDF(wpx, hpx) { const cv = document.createElement('canvas'); cv.width = wpx; cv.height = hpx; const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return null; ctx.scale(2, 2); return { cv, ctx, W: wpx / 2, H: hpx / 2 }; }
function palPDFMaq() { const base = Object.assign({}, PALETA_PDF_MAQ); return (typeof paletaReal === 'function' && MAQ_REAL) ? paletaReal(base) : base; }
function imagenMaquetaFinca(fincaId, capa, wpx, hpx) {
  try { const L = lienzoPDF(wpx || 1600, hpx || 900); if (!L) return null;
    dibujarFinca(L.ctx, L.W, L.H, fincaId, palPDFMaq(), { zoom: 1, panX: 0, panY: 0, rot: 0 }, { capa: capa || 'estructura', margen: 26 });
    return L.cv.toDataURL('image/jpeg', 0.86); } catch (e) { dlog('✗ imagen de maqueta: ' + e.message, 'err'); return null; }
}
function imagenMaquetaLote(l, capa, wpx, hpx, extra) {
  try { const g = geomLote(l); if (!g) return null; const L = lienzoPDF(wpx || 1600, hpx || 1000); if (!L) return null;
    dibujarLote(L.ctx, L.W, L.H, l, g, palPDFMaq(), { zoom: 1, panX: 0, panY: 0 }, Object.assign({ capa: capa || 'estructura' }, extra || {})); return L.cv.toDataURL('image/jpeg', 0.86); } catch (e) { dlog('✗ imagen de lote: ' + e.message, 'err'); return null; }
}
