/* ================= v33 · Informes de nivel directivo: resumen ejecutivo automático (cifras clave, puntos de atención y contenido) y página de control del documento (alcance, origen de los datos, QR de referencia y firmas) en todos los informes con portada ================= */
(function () {
  const P = InformePDF.prototype;
  const _kpis = P.kpis, _nota = P.nota, _tabla = P.tabla, _seccion = P.seccion, _guardar = P.guardar, _blob = P.blob;
  P.kpis = function (items, cols) { if (!this._res33 && this.portadaCompleta) { this._k33 = this._k33 || []; (items || []).forEach(k => { if (k && k.v && k.t && !this._k33.some(z => z.t === k.t)) this._k33.push(Object.assign({ sec: this.seccionActual }, k)); }); } return _kpis.apply(this, arguments); };
  P.nota = function (s, tono, titulo) { if (!this._res33 && this.portadaCompleta && (tono === 'mal' || tono === 'alerta') && s) { (this._n33 = this._n33 || []).push({ s: String(s), tono, titulo, sec: this.seccionActual }); } return _nota.apply(this, arguments); };
  P.tabla = function (o) { if (!this._res33 && o) { this._t33 = (this._t33 || 0) + 1; this._f33 = (this._f33 || 0) + ((o.filas || []).length); } return _tabla.apply(this, arguments); };
  P.seccion = function (n, titulo, desc) { const r = _seccion.apply(this, arguments); const S = this.secciones || []; if (S.length && desc) S[S.length - 1].desc = desc; return r; };
  ['barras', 'lineas', 'dona', 'cascada', 'barrasH', 'imagen'].forEach(m => { const f = P[m]; if (typeof f !== 'function') return; P[m] = function () { if (!this._res33) this._g33 = (this._g33 || 0) + 1; return f.apply(this, arguments); }; });

  const cuenta = n => { try { const v = (0, eval)(n); return Array.isArray(v) ? v.length : null; } catch (e) { return null; } };
  const FUENTES33 = [['registros', 'Pesadas de recolección'], ['pagos', 'Liquidaciones y pagos'], ['labores', 'Labores agronómicas'], ['ordenes', 'Órdenes de trabajo'], ['beneficios', 'Baches de beneficio'], ['ventas', 'Ventas de café'], ['movimientos', 'Movimientos contables'], ['muestreos', 'Muestreos de campo'], ['suelos', 'Análisis de suelo'], ['clima', 'Registros de clima'], ['floraciones', 'Floraciones'], ['lotes', 'Lotes'], ['trabajadores', 'Recolectores'], ['empleados', 'Empleados']];

  /* Página de control: se añade al final del informe */
  P.control33 = function () { const d = this.doc; const f = this.finca || {}; const n = (this.secciones || []).filter(x => x.n).length + 1;
    if (this.y > this.H - 120) this.nuevaPagina();
    this.seccion(n, 'Control del documento', 'Alcance, origen de los datos y firmas de quienes elaboran, revisan y aprueban este informe.');
    const yTop = this.y; const lado = 30; const xq = this.x1 - lado; const cw0 = this.cw, x10 = this.x1; this.cw = cw0 - lado - 8; this.x1 = this.x0 + this.cw;
    const ubic = [f.vereda, f.municipio, f.departamento].filter(Boolean).join(', ');
    this.kv([['Referencia', this.ref], ['Documento', this.o.titulo], ['Periodo', this.o.periodo || 'Datos a la fecha de emisión'], ['Emitido', fechaLarga(this.emitido) + ' · ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })], ['Finca', f.nombre || '—'], ['Ubicación', ubic || '—'], ['Contenido', [(this.secciones || []).length + ' secciones', (this._t33 || 0) + ' tablas (' + num(this._f33 || 0) + ' filas)', (this._g33 || 0) + ' gráficas y mapas'].join(' · ')], ['Plataforma', 'State Origen ' + (typeof APP_VERSION !== 'undefined' ? 'v' + APP_VERSION : '')]], 1);
    this.cw = cw0; this.x1 = x10; const yFin = this.y;
    try { qrPDF32(d, ['STATE ORIGEN', sinTildes32(f.nombre || ''), this.ref, sinTildes32(this.o.titulo), this.emitido].join(' | '), xq, yTop, lado); this.f('normal', 6.2, PDFC.tenue); this.texto('Referencia del documento', xq + lado / 2, yTop + lado + 3.4, { align: 'center' }); } catch (e) {}
    this.y = Math.max(yFin, yTop + lado + 7) + 3;
    const F = FUENTES33.map(([k, t]) => [t, cuenta(k)]).filter(x => x[1] != null && x[1] > 0);
    if (F.length) { const mitad = Math.ceil(F.length / 2); const filas = []; for (let i = 0; i < mitad; i++) { const a = F[i], b = F[i + mitad]; filas.push([a[0], num(a[1]), b ? b[0] : '', b ? num(b[1]) : '']); }
      this.tabla({ titulo: 'Origen de los datos', der: 'registros en la plataforma al emitir', cols: [{ t: 'Fuente', w: 2.2 }, { t: 'Registros', w: 1, a: 'right' }, { t: 'Fuente', w: 2.2 }, { t: 'Registros', w: 1, a: 'right' }], filas, comparar: false }); }
    this.nota('Las cifras salen de los registros hechos en la plataforma hasta la fecha y hora de emisión. Un registro posterior, una corrección o un cierre de mes pueden cambiarlas: para comparar dos versiones use la referencia del documento. Los valores de referencia técnica y tributaria son orientativos y deben confirmarse con el agrónomo o el contador.', 'info', 'Alcance y uso');
    this.firmas([['Elaboró', 'Nombre, firma y fecha'], ['Revisó', 'Nombre, firma y fecha'], ['Aprobó', 'Propietario o administrador']]); };

  /* Resumen ejecutivo: se dibuja al final y se mueve a la página 2 */
  P.resumen33 = function () { const d = this.doc; const K = (this._k33 || []).slice(0, this.o.horizontal ? 4 : 8); const N = (this._n33 || []).slice(0, this.o.horizontal ? 3 : 5); const S = (this.secciones || []).filter(s => s.titulo);
    if (!K.length && !N.length && S.length < 3) return false;
    this._res33 = true; this.seccionActual = 'Resumen ejecutivo'; this.nuevaPagina(); const pag = d.getCurrentPageInfo().pageNumber;
    this.espaciado(0.6); this.f('bold', 7, PDFC.marca); this.texto('DE UN VISTAZO', this.x0, this.y + 1); this.espaciado(0);
    this.f('black', 21, PDFC.tinta); this.texto('Resumen ejecutivo', this.x0, this.y + 10);
    this.f('normal', 9, PDFC.tinta2); const sub = [this.finca.nombre, this.o.periodo, 'emitido el ' + fechaLarga(this.emitido)].filter(Boolean).join(' · '); this.texto(this.partir(sub, this.cw)[0], this.x0, this.y + 15.6);
    this.y += 20; this.draw(PDFC.linea, 0.2); d.line(this.x0, this.y, this.x1, this.y); this.y += 6;
    if (K.length) { this.subtitulo('Cifras clave', K.length + ' indicadores del informe'); this.y += 1; _kpis.call(this, K, 4); }
    this.y += 2; this.subtitulo('Puntos de atención', N.length ? N.length + ' de ' + (this._n33 || []).length + ' señalados en el informe' : '');
    if (!N.length) { _nota.call(this, 'Este informe no incluye alertas para el periodo.', 'ok'); }
    else { this.y += 1; N.forEach(a => { const c = PDFC[a.tono === 'mal' ? 'mal' : 'alerta']; this.f('normal', 8.2); const ls = this.partir(a.s, this.cw - 9).slice(0, 2); const h = ls.length * 3.7 + (a.titulo ? 4.4 : 0) + 6.4; this.fill(PDFC.lavado); d.roundedRect(this.x0, this.y, this.cw, h, 2.4, 2.4, 'F'); this.fill(c); d.roundedRect(this.x0, this.y, 1.3, h, 0.6, 0.6, 'F');
        let y = this.y + 4.6; if (a.titulo) { this.f('bold', 8.4, PDFC.tinta); this.texto(a.titulo, this.x0 + 5, y); y += 4.4; } this.f('normal', 8.2, PDFC.tinta2); this.texto(ls, this.x0 + 5, y);
        if (a.sec) { this.f('normal', 6.4, PDFC.tenue); this.texto(this.partir(a.sec, 60)[0], this.x1 - 3, this.y + 4.4, { align: 'right' }); } this.y += h + 2.2; }); }
    const max = Math.max(0, Math.floor((this.H - 24 - this.y - 14) / (this.o.horizontal ? 5 : 8.4)));
    if (S.length && max >= 2) { this.y += 3; this.subtitulo('Contenido', 'sección y página'); this.y += 1.5;
      S.slice(0, max).forEach(s => { this.f('bold', 7.6, PDFC.marca); this.texto(String(s.n || '·').padStart(2, '0'), this.x0, this.y + 3); this.f('bold', 8.6, PDFC.tinta); this.texto(this.partir(s.titulo, this.cw - 30)[0], this.x0 + 8, this.y + 3);
        this.f('bold', 8, PDFC.tinta2); this.texto(String(s.pag - 1), this.x1, this.y + 3, { align: 'right' });
        if (s.desc && !this.o.horizontal) { this.f('normal', 7.2, PDFC.tenue); this.texto(this.partir(s.desc, this.cw - 30)[0], this.x0 + 8, this.y + 6.6); this.y += 8.4; } else this.y += 5;
        this.draw(PDFC.linea, 0.15); d.line(this.x0 + 8, this.y - 0.6, this.x1, this.y - 0.6); }); }
    const fin = d.getNumberOfPages(); if (fin !== pag) { for (let p = fin; p > pag; p--) d.deletePage(p); } // nunca más de una página
    try { d.movePage(pag, 2); } catch (e) { return false; }
    return true; };

  P.cerrar33 = function () { if (this._cierre33 || !this.portadaCompleta || this.o.resumen === false) return; this._cierre33 = true; try { if (this.agregarGlosario) this.agregarGlosario(); } catch (e) {}
    try { this.control33(); } catch (e) { if (typeof dlog === 'function') dlog('✗ control del documento: ' + e.message, 'err'); }
    try { const S = this.secciones || []; S.forEach(s => { s.pag += 1; }); const ok = this.resumen33(); if (!ok) S.forEach(s => { s.pag -= 1; }); this.doc.setPage(this.doc.getNumberOfPages()); }
    catch (e) { if (typeof dlog === 'function') dlog('✗ resumen ejecutivo: ' + e.message, 'err'); } };
  P.guardar = function (nombre) { this.cerrar33(); return _guardar.call(this, nombre); };
  P.blob = function () { this.cerrar33(); return _blob.call(this); };
})();
