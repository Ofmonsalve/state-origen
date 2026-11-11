/* ================= v28 · Informes con lenguaje visual sobrio (inspirado en Apple): paleta refinada, tablas ligeras, cifras protagonistas, cifras clave en la portada y glosario automático ================= */
Object.assign(PDFC, { tinta: [29, 29, 31], tinta2: [72, 72, 76], tenue: [134, 134, 139], linea: [226, 226, 231], lavado: [249, 249, 251], lavado2: [242, 242, 247],
  marca: [30, 132, 73], marcaOsc: [21, 74, 45], marcaMed: [36, 110, 66], oro: [201, 150, 62], oroClaro: [238, 220, 182],
  ok: [36, 138, 61], alerta: [199, 110, 0], mal: [215, 40, 35], info: [0, 108, 214], okClaro: [232, 246, 236], alertaClaro: [255, 243, 224], malClaro: [253, 234, 233], infoClaro: [230, 241, 253],
  serie: [[0, 122, 255], [255, 149, 0], [52, 168, 83], [230, 167, 0], [255, 45, 85], [88, 86, 214]] });
(function () {
  const P = InformePDF.prototype;
  const _texto = P.texto; P.texto = function (s, x, y, o) { if (this._txt && this._txt.length < 4000) { const v = Array.isArray(s) ? s.join(' ') : String(s == null ? '' : s); if (v.length < 600) this._txt.push(v); } return _texto.call(this, s, x, y, o); };
  const _portada25 = P.portada;
  P.portada = function (o) { this._txt = []; const r = _portada25.call(this, o); if (this.portadaCompleta) { const oo = Object.assign({}, this.o, o || {}); const hImg = this.o.horizontal ? this.H * 0.55 : 150; let y = (this._img28 !== false ? hImg - 6 : 150) + 13;
      this.f('black', 30); const tamT = this.ajustar(oo.titulo, this.W - 2 * this.M, 30, 20); y += this.partir(oo.titulo, this.W - 2 * this.M).slice(0, 3).length * tamT * 0.43 + 7; this.f('normal', 10.5); y += this.partir(oo.subtitulo || '', this.W - 2 * this.M - 20).slice(0, 3).length * 5; this._yLibre = y; } return r; };

  /* Cabecera interna más ligera */
  P.cabeceraContinua = function () { const d = this.doc; this.sello(this.M, 7.2); this.espaciado(0.6); this.f('bold', 6.2, PDFC.marca); this.texto('STATE ORIGEN', this.M + 9.6, 10.6); this.espaciado(0);
    const xa = this.M + 9.6 + this.ancho('STATE ORIGEN') + 12 * 0.6 + 3; this.f('medium', 7.6, PDFC.tinta); this.texto(this.o.titulo, xa, 10.6);
    this.f('normal', 6.8, PDFC.tenue); this.texto([this.seccionActual, this.finca.nombre].filter(Boolean).join(' · '), this.x1, 10.6, { align: 'right' }); this.draw(PDFC.linea, 0.2); d.line(this.M, 14.2, this.x1, 14.2); this.y = 23; };

  /* Secciones: número discreto en el color de acento y título grande */
  P.seccion = function (n, titulo, desc) { const d = this.doc; if (this.y > this.H - 70) this.nuevaPagina(); else this.asegurar(desc ? 40 : 32); if (this.y > 30) this.y += 5;
    this.seccionActual = titulo; (this.secciones = this.secciones || []).push({ n, titulo, pag: d.getCurrentPageInfo().pageNumber }); let y = this.y;
    if (n) { this.espaciado(0.6); this.f('bold', 7, PDFC.marca); this.texto('SECCIÓN ' + String(n).padStart(2, '0'), this.x0, y - 3.4); this.espaciado(0); y += 2; }
    this.f('black', 17, PDFC.tinta); this.texto(titulo, this.x0, y + 1.6); this.y = y + 6;
    if (desc) { this.f('normal', 8.8, PDFC.tinta2); const ls = this.partir(desc, this.cw); this.texto(ls, this.x0, this.y + 1.2); this.y += ls.length * 3.9 + 3.6; } else this.y += 1.5;
    this.draw(PDFC.linea, 0.2); d.line(this.x0, this.y, this.x1, this.y); this.y += 6; this._sec28 = { pag: d.getCurrentPageInfo().pageNumber, y0: y - (n ? 9 : 6), y1: this.y, n, titulo, desc }; return this; };
  /* Si lo primero de una sección no cabe, el título se lleva a la página siguiente con su contenido (nunca queda huérfano) */
  P.asegurar = function (h) { if (this.y + h <= this.H - 17) return false; const s = this._sec28, d = this.doc; if (s && s.pag === d.getCurrentPageInfo().pageNumber && Math.abs(this.y - s.y1) < 0.01 && !this._moviendo28) { this.fill(PDFC.blanco); d.rect(this.x0 - 1, s.y0 - 1, this.cw + 2, s.y1 - s.y0 + 1, 'F'); this.nuevaPagina(); this._moviendo28 = true; const idx = (this.secciones || []).pop(); try { this.seccion(s.n, s.titulo, s.desc); } finally { this._moviendo28 = false; } if (!idx) this.secciones.pop(); return true; } this.nuevaPagina(); return true; };
  P.subtitulo = function (s, der) { this.asegurar(13); this.f('bold', 10, PDFC.tinta); this.texto(s, this.x0, this.y); if (der) { this.f('normal', 7.4, PDFC.tenue); this.texto(der, this.x1, this.y, { align: 'right' }); } this.y += 5.4; return this; };

  /* Tarjetas de cifras: fondo gris claro, sin bordes, cifra grande */
  P.kpis = function (items, cols) { if (!this._kpisPortada && this.portadaCompleta) this._kpisPortada = items.filter(k => k && k.v).slice(0, 4);
    cols = cols || Math.min(4, items.length); const gap = 3.6, w = (this.cw - gap * (cols - 1)) / cols, h = 24; const d = this.doc;
    for (let i = 0; i < items.length; i += cols) { this.asegurar(h + 4);
      items.slice(i, i + cols).forEach((k, j) => { const x = this.x0 + j * (w + gap), y = this.y; const tono = TONO_PDF[k.tono] ? PDFC[TONO_PDF[k.tono][0]] : null;
        this.fill(PDFC.lavado2); d.roundedRect(x, y, w, h, 3.2, 3.2, 'F'); let xl = x + 4.2; if (tono) { this.fill(tono); d.circle(x + 5.4, y + 6.1, 1.1, 'F'); xl = x + 8; }
        this.espaciado(0.3); this.f('bold', 6, PDFC.tenue); this.ajustar(String(k.t).toUpperCase(), w - (xl - x) - 3, 6, 4.6); this.texto(String(k.t).toUpperCase(), xl, y + 7); this.espaciado(0);
        this.f('black', 16.5, tono && k.tono === 'mal' ? PDFC.mal : PDFC.tinta); this.ajustar(k.v, w - 8, 16.5, 9); this.texto(k.v, x + 4.2, y + 15.8);
        if (k.s) { if (k.stono) { const [c] = TONO_PDF[k.stono === 'ok' ? 'ok' : k.stono === 'mal' ? 'mal' : k.stono] || TONO_PDF.info; this.f('bold', 6.6, PDFC[c]); this.texto(this.partir(k.s, w - 8)[0], x + 4.2, y + 20.8); }
          else { this.f('normal', 6.8, PDFC.tenue); this.texto(this.partir(k.s, w - 8)[0], x + 4.2, y + 20.8); } } });
      this.y += h + gap; }
    this.y += 1.5; return this; };

  /* Tablas como listas: encabezado discreto, separadores finos, total con regla y sin columnas comparativas vacías */
  const vacio = v => { const t = (v && typeof v === 'object') ? v.t : v; return t == null || /^\s*(\$\s?0|0|—|-|0 %|0,0 %|)\s*$/.test(String(t)); };
  P.tabla = function (o) { o = Object.assign({}, o); let cols = o.cols.slice(); let filas = (o.filas || []).map(f => f.slice()); let total = o.total ? o.total.slice() : null;
    if (filas.length && o.comparar !== false) { const anio = cols.map((c, i) => i > 0 && /^\d{4}$/.test(String(c.t)) && filas.every(f => vacio(f[i])) && (!total || vacio(total[i]))); if (anio.some(Boolean)) { const quitar = cols.map((c, i) => anio[i] || /^variaci/i.test(String(c.t))); cols = cols.filter((c, i) => !quitar[i]); filas = filas.map(f => f.filter((x, i) => !quitar[i])); if (total) total = total.filter((x, i) => !quitar[i]); } }
    const d = this.doc; const fs = o.fs || 8.2; const tot = cols.reduce((s, c) => s + (c.w || 1), 0); const ws = cols.map(c => (c.w || 1) / tot * this.cw);
    const xs = []; let acc = this.x0; ws.forEach(w => { xs.push(acc); acc += w; }); const pad = 2;
    const cab = () => { this.asegurar(16); this.espaciado(0.35); let hh = 0; const ls = cols.map((c, i) => { this.f('bold', 6.1); const l = this.partir(String(c.t || '').toUpperCase(), ws[i] - 2 * pad, true); hh = Math.max(hh, l.length); return l; }); const hc = 3.4 + (hh - 1) * 2.6 + 3;
      cols.forEach((c, i) => { const a = c.a || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad; this.f('bold', 6.1, PDFC.tenue); this.texto(ls[i], x, this.y + 4.2, { align: a }); });
      this.espaciado(0); this.y += hc; this.draw(PDFC.tinta, 0.35); d.line(this.x0, this.y, this.x1, this.y); this.y += 0.4; };
    if (o.titulo) { this.asegurar(30); this.subtitulo(o.titulo, o.der); }
    cab(); const celda = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : { t: v };
    const pintarFila = (fila, k, esTotal) => { const cs = fila.map(celda); this.f(esTotal ? 'bold' : 'normal', fs); const ls = cs.map((c, i) => this.partir(c.t == null ? '' : c.t, ws[i] - 2 * pad)); const n = Math.max(1, ...ls.map(l => l.length)); const h = n * fs * 0.42 + 2 * pad + 0.8;
      if (this.asegurar(h + 1)) cab();
      if (esTotal) { this.draw(PDFC.tinta, 0.35); d.line(this.x0, this.y, this.x1, this.y); this.fill(PDFC.lavado2); d.rect(this.x0, this.y + 0.2, this.cw, h, 'F'); }
      else if (o.zebra === true && k % 2 === 1) { this.fill(PDFC.lavado); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      if (o.fondo && o.fondo(fila, k)) { this.fill(PDFC[o.fondo(fila, k)] || PDFC.lavado); d.rect(this.x0, this.y, this.cw, h, 'F'); }
      cs.forEach((c, i) => { const a = cols[i] ? (cols[i].a || 'left') : 'left'; if (!cols[i]) return; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad; const yb = this.y + pad + fs * 0.36 + 0.4;
        if (c.chip) { const tono = TONO_PDF[c.chip] || TONO_PDF.info; this.f('bold', fs - 1.2); const tw = this.ancho(c.t) + 5; const cx = a === 'right' ? x - tw : a === 'center' ? x - tw / 2 : x;
          this.fill(PDFC[tono[1]]); d.roundedRect(cx, this.y + pad - 0.3, tw, fs * 0.42 + 1.8, (fs * 0.42 + 1.8) / 2, (fs * 0.42 + 1.8) / 2, 'F'); this.f('bold', fs - 1.2, PDFC[tono[0]]); this.texto(c.t, cx + 2.5, yb); return; }
        if (c.barra != null) { const bw = (ws[i] - 2 * pad) * 0.6; const bx = xs[i] + pad; this.fill(PDFC.lavado2); d.roundedRect(bx, this.y + pad + 0.6, bw, 2.2, 1.1, 1.1, 'F'); this.fill(PDFC[c.color || 'marca']); d.roundedRect(bx, this.y + pad + 0.6, Math.max(0.8, bw * Math.min(1, Math.max(0, c.barra))), 2.2, 1.1, 1.1, 'F');
          this.f('bold', fs - 0.6, PDFC.tinta); this.texto(c.t, xs[i] + ws[i] - pad, yb, { align: 'right' }); return; }
        this.f(c.b || esTotal ? 'bold' : (i === 0 && o.primeraFuerte ? 'medium' : 'normal'), c.tam || fs, c.color ? PDFC[c.color] : (c.suave ? PDFC.tenue : PDFC.tinta)); this.texto(ls[i], x, yb, { align: a }); });
      this.y += h + (esTotal ? 0.2 : 0); if (!esTotal) { this.draw(PDFC.linea, 0.18); d.line(this.x0, this.y, this.x1, this.y); } };
    filas.forEach((f, k) => pintarFila(f, k, false));
    if (!filas.length) { this.fill(PDFC.lavado); d.roundedRect(this.x0, this.y + 1, this.cw, 10, 2, 2, 'F'); this.f('normal', 8.2, PDFC.tenue); this.texto(o.vacio || 'Sin registros en el periodo.', this.x0 + this.cw / 2, this.y + 7, { align: 'center' }); this.y += 12; }
    if (total) pintarFila(total, 0, true);
    if (o.pie) { this.y += 2.4; this.f('normal', 7, PDFC.tenue); const ls = this.partir(o.pie, this.cw); this.texto(ls, this.x0, this.y + 2); this.y += ls.length * 3.2; }
    this.y += 6; return this; };

  /* Notas y destacados en tonos claros */
  P.nota = function (s, tono, titulo) { const [c, cl] = TONO_PDF[tono || 'info'] || TONO_PDF.info; this.f('normal', 8.4); const ls = this.partir(s, this.cw - 16); const h = Math.max(12, ls.length * 3.9 + (titulo ? 10 : 7));
    this.asegurar(h + 3); const d = this.doc; this.fill(PDFC[cl]); d.roundedRect(this.x0, this.y, this.cw, h, 3, 3, 'F'); this.fill(PDFC[c]); d.circle(this.x0 + 6.4, this.y + 5.9, 2.4, 'F'); this.f('black', 7.4, PDFC.blanco); this.texto(tono === 'mal' || tono === 'alerta' ? '!' : tono === 'ok' ? '✓' : 'i', this.x0 + 6.4, this.y + 6.9, { align: 'center' });
    let yy = this.y + 6.4; if (titulo) { this.f('bold', 9, PDFC.tinta); this.texto(titulo, this.x0 + 12, yy); yy += 4.6; } this.f('normal', 8.4, PDFC.tinta2); this.texto(ls, this.x0 + 12, yy); this.y += h + 4; return this; };
  P.destacados = function (items, titulo) { if (!items || !items.length) return this; const d = this.doc; this.f('normal', 8); const colW = (this.cw - 4) / 2; const alturas = items.map(it => this.partir(it.d || '', colW - 13).length * 3.6 + 11); const filas = Math.ceil(items.length / 2);
    if (titulo) { this.asegurar(16); this.subtitulo(titulo); }
    for (let r = 0; r < filas; r++) { const hmax = Math.max(alturas[2 * r] || 0, alturas[2 * r + 1] || 0); this.asegurar(hmax + 4); [0, 1].forEach(c => { const it = items[2 * r + c]; if (!it) return; const x = this.x0 + c * (colW + 4), y = this.y; const [col, cl] = TONO_PDF[it.tono] || TONO_PDF.info;
        this.fill(PDFC.lavado2); d.roundedRect(x, y, colW, hmax, 3, 3, 'F'); this.fill(PDFC[col]); d.roundedRect(x + 4, y + 4, 4.6, 4.6, 1.2, 1.2, 'F'); this.f('black', 6.6, PDFC.blanco); this.texto(it.tono === 'mal' || it.tono === 'alerta' ? '!' : it.tono === 'ok' ? '✓' : 'i', x + 6.3, y + 7.4, { align: 'center' });
        this.f('bold', 8.8, PDFC.tinta); this.texto(this.partir(it.t, colW - 14)[0], x + 11, y + 7.6); this.f('normal', 7.8, PDFC.tinta2); this.texto(this.partir(it.d || '', colW - 13), x + 11, y + 11.8); }); this.y += hmax + 3.5; }
    this.y += 2; return this; };
  P.marcoGrafica = function (o, h) { const alto = h || o.alto || 58; this.asegurar(alto + (o.titulo ? 10 : 3) + 7); if (o.titulo) this.subtitulo(o.titulo, o.der);
    const ley = (o.series || []).length > 1 || o.leyenda; if (ley) { this.leyenda((o.series || []).map((s, i) => ({ t: s.nombre, color: s.color || PDFC.serie[i % 6], linea: s.tipo === 'linea' })), this.x0 + 1, this.y + 1); this.y += 5; }
    this.fill(PDFC.lavado); this.doc.roundedRect(this.x0, this.y - 1, this.cw, alto + 1, 3, 3, 'F'); return alto; };

  /* Cifras clave en la portada y glosario automático al final */
  const _pie25 = P.pie;
  P.pie = function () { const d = this.doc; if (this.portadaCompleta && this._kpisPortada && this._kpisPortada.length && this.yIndice) { const yInfo = this.yIndice - 26; const top = Math.max((this._yLibre || 190) + 2, yInfo - 30); if (yInfo - 8 - top >= 15) { d.setPage(1); const K = this._kpisPortada; const gap = 3, w = (this.W - 2 * this.M - gap * (K.length - 1)) / K.length, h = 17;
      K.forEach((k, i) => { const x = this.M + i * (w + gap); this.opacidad(0.1); this.fill(PDFC.blanco); d.roundedRect(x, top, w, h, 3, 3, 'F'); this.opacidad(1); this.espaciado(0.4); this.f('bold', 5.6, PDFC.oroClaro); this.ajustar(String(k.t).toUpperCase(), w - 7, 5.6, 4.4); this.texto(String(k.t).toUpperCase(), x + 3.6, top + 5.6); this.espaciado(0);
        this.f('black', 14, PDFC.blanco); this.ajustar(k.v, w - 7, 14, 8); this.texto(k.v, x + 3.6, top + 13); }); d.setPage(d.getNumberOfPages()); } }
    return _pie25.call(this); };
  const _guardar = P.guardar, _blob = P.blob;
  P.agregarGlosario = function () { if (this._glosarioHecho || !this.portadaCompleta || this.o.glosario === false) return; this._glosarioHecho = true; const txt = (this._txt || []).join(' \n ').toLowerCase(); const T = GLOSARIO28.filter(g => g.re.test(txt)); if (T.length < 3) return;
    const d = this.doc; const colW = (this.cw - 8) / 2; this.f('normal', 7.4); const alt = T.map(g => this.partir(g.d, colW).length * 3.3 + 6.4);
    let totalG = 34; for (let i = 0; i < T.length; i += 2) totalG += Math.max(alt[i], alt[i + 1] || 0); if (this.y + totalG > this.H - 22 && totalG < this.H - 60) this.nuevaPagina(); else this.y += 6; this.seccion((this.secciones || []).filter(x => x.n).length + 1, 'Glosario', 'Definiciones de los términos y siglas usados en este informe.');
    for (let i = 0; i < T.length; i += 2) { const h = Math.max(alt[i], alt[i + 1] || 0); this.asegurar(h + 1); [0, 1].forEach(c => { const g = T[i + c]; if (!g) return; const x = this.x0 + c * (colW + 8); this.f('bold', 8, PDFC.tinta); this.texto(g.t, x, this.y + 3); this.f('normal', 7.4, PDFC.tinta2); this.texto(this.partir(g.d, colW), x, this.y + 6.6); }); this.y += h; } };
  P.guardar = function (nombre) { try { this.agregarGlosario(); } catch (e) {} return _guardar.call(this, nombre); };
  P.blob = function () { try { this.agregarGlosario(); } catch (e) {} return _blob.call(this); };
})();
const GLOSARIO28 = [
  ['Carga', /\bcargas?\b/, '125 kg de café pergamino seco; unidad con que se negocia el café en Colombia.'],
  ['Café pergamino seco (CPS)', /pergamino/, 'Grano con su cascarilla, despulpado, lavado y secado al 10–12 % de humedad; así se vende a la cooperativa.'],
  ['Factor de conversión', /factor de conversi/, 'Kilos de cereza necesarios para obtener un kilo de pergamino seco. Lo usual está entre 4,8 y 5,4.'],
  ['Factor de rendimiento', /factor de rendimiento|factor real/, 'Kilos de pergamino seco que hacen falta para sacar 70 kg de excelso en la trilla. Referencia FNC: 92,8; menor es mejor.'],
  ['Excelso', /excelso/, 'Café verde trillado y clasificado por tamaño (malla), apto para exportación o tostión.'],
  ['Pasada o pase', /\bpasadas?\b|\bpases?\b/, 'Recorrido completo de recolección por un lote; agrupa los días en que se cosechó el mismo ciclo.'],
  ['Mitaca', /mitaca/, 'Cosecha secundaria del año, de menor volumen que la cosecha principal.'],
  ['Productividad (kg/h)', /kg\/h|kg por hora|productividad/, 'Kilos de cereza recolectados por hora de trabajo; mide el rendimiento de la cuadrilla.'],
  ['Jornada', /jornadas?\b/, 'Un día de trabajo de una persona en un lote; base para comparar pagos y productividad.'],
  ['Margen bruto', /margen bruto/, 'Utilidad bruta (ingresos menos costo de lo vendido) dividida por los ingresos.'],
  ['EBITDA', /ebitda/, 'Resultado operativo antes de intereses, impuestos, depreciaciones y amortizaciones; aproxima la caja que genera la operación.'],
  ['ROA', /\broa\b|rentabilidad del activo/, 'Rentabilidad del activo: resultado del periodo dividido por el total de activos.'],
  ['Liquidez corriente', /liquidez/, 'Activo corriente dividido por pasivo corriente; mayor que 1 indica capacidad de pagar las deudas de corto plazo.'],
  ['Prueba ácida', /prueba ácida/, 'Liquidez sin contar los inventarios; mide la capacidad de pago inmediata.'],
  ['Punto de equilibrio', /punto de equilibrio/, 'Volumen de ventas en el que los ingresos cubren todos los costos; por encima se genera utilidad.'],
  ['Costo por carga', /costo por carga|costo de producción por carga/, 'Costo total de producción dividido por las cargas producidas; se compara con el precio de venta.'],
  ['Depreciación', /depreciaci/, 'Reparto del costo de un activo (máquina, construcción, plantación) a lo largo de su vida útil.'],
  ['Retención en la fuente', /retenci/, 'Anticipo del impuesto de renta que el comprador descuenta en la venta de café (0,5 % sobre la base vigente).'],
  ['UVT', /\buvt\b/, 'Unidad de Valor Tributario fijada cada año por la DIAN para expresar topes y bases tributarias.'],
  ['SMMLV', /smmlv|salario mínimo/, 'Salario mínimo mensual legal vigente: $1.750.905 en 2026.'],
  ['Umbral de acción', /umbral/, 'Nivel de una plaga o enfermedad a partir del cual conviene intervenir (por ejemplo, broca 2 %, roya 5 %).'],
  ['Escala BBCH', /bbch/, 'Codificación internacional de las etapas de desarrollo de la planta, de la brotación a la madurez del fruto.'],
  ['Balance hídrico', /balance hídrico|evapotranspiraci/, 'Diferencia entre la lluvia y el agua que consume el cultivo (evapotranspiración); indica déficit o exceso de agua.'],
  ['ENSO', /\benso\b|el niño|la niña/, 'Fenómeno El Niño–Oscilación del Sur; altera las lluvias y la temperatura en la zona cafetera.'],
  ['Protocolo SCA', /\bsca\b/, 'Método de catación de la Specialty Coffee Association; 80 puntos o más se considera café de especialidad.'],
  ['Merma de tostión', /merma/, 'Porcentaje de peso que pierde el café verde al tostarse; suele estar entre 12 y 20 %.'],
  ['FIFO', /fifo|vence primero/, 'Primero en entrar, primero en salir: se despacha antes el lote que vence primero.'],
  ['Escandallo', /escandallo/, 'Desglose del costo de una bebida o producto: café, insumos y empaque, frente a su precio.'],
  ['Diferencial', /diferencial/, 'Prima o descuento en dólares por libra que se suma al precio de la bolsa de Nueva York.'],
  ['TRM', /\btrm\b/, 'Tasa representativa del mercado: pesos colombianos por dólar del día.'],
  ['GTC 45', /gtc 45|gtc45/, 'Guía técnica colombiana para identificar peligros y valorar riesgos de seguridad y salud en el trabajo.'],
  ['Número predial nacional', /número predial|npn/, 'Código de 30 dígitos que identifica el predio en el catastro.'],
  ['Trazabilidad', /trazabilidad/, 'Capacidad de seguir un kilo de café desde la pesada en el lote hasta el comprador o la taza.'],
  ['Avalúo catastral', /avalúo/, 'Valor del predio fijado por el catastro; es la base del impuesto predial.']
].map(([t, re, d]) => ({ t, re, d }));
