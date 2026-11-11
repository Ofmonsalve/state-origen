/* ---- Colores para lienzo ---- */
function hexRgb(h) { h = String(h || '').trim(); if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; } if (h[0] === '#') h = h.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mezclaRGB(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); }
const rgbTxt = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp01 = t => Math.max(0, Math.min(1, t));
function rampaSalud(t, sentido, pal) {   // verde → ámbar → rojo (o al revés si más es mejor)
  t = clamp01(t); if (sentido === 'bueno') t = 1 - t;
  const g = hexRgb(pal.good), w = hexRgb(pal.warn), d = hexRgb(pal.danger);
  return t < 0.5 ? mezclaRGB(g, w, t / 0.5) : mezclaRGB(w, d, (t - 0.5) / 0.5);
}
function paletaMaqueta() {
  const p = paletaTema(); const oscuro = temaEfectivo() === 'dark';
  return Object.assign(p, { oscuro, tierraBaja: oscuro ? '#17201A' : '#E3EBDD', tierraAlta: oscuro ? '#2A2A20' : '#EFE6D2', luz: oscuro ? 0.9 : 1, curva: oscuro ? '#8C7A55' : '#A88B5C', bosque: oscuro ? '#1D2B21' : '#CFDCC6' });
}
const PALETA_PDF_MAQ = Object.assign({}, PALETA_PDF, { oscuro: false, tierraBaja: '#EEF3EA', tierraAlta: '#F5EEDF', luz: 1, curva: '#B8935A', bosque: '#DCE6D5' });

/* ---- Relieve sombreado (imagen en caché por finca y tema) ---- */
const RELIEVE_CACHE = new Map();
function imagenRelieve(T, pal) {
  const key = T.fincaId + '|' + pal.tierraBaja + '|' + T.zmin + '|' + T.zmax + '|' + T.nx + 'x' + T.ny;
  if (RELIEVE_CACHE.has(key)) return RELIEVE_CACHE.get(key);
  const cv = document.createElement('canvas'); const w = T.nx + 1, h = T.ny + 1; cv.width = w; cv.height = h; const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return null;
  const img = ctx.createImageData(w, h); const lo = hexRgb(pal.tierraBaja), hi = hexRgb(pal.tierraAlta); const rango = (T.zmax - T.zmin) || 1;
  const L = [-0.55, 0.55, 0.63]; const nl = Math.hypot(...L); L[0] /= nl; L[1] /= nl; L[2] /= nl;
  for (let iy = 0; iy < h; iy++) for (let ix = 0; ix < w; ix++) {
    const z = T.Z[iy * w + ix]; const zx = (T.Z[iy * w + Math.min(w - 1, ix + 1)] - T.Z[iy * w + Math.max(0, ix - 1)]) / (2 * T.c), zy = (T.Z[Math.min(h - 1, iy + 1) * w + ix] - T.Z[Math.max(0, iy - 1) * w + ix]) / (2 * T.c);
    const nn = Math.hypot(zx, zy, 1); const lam = (-zx * L[0] - zy * L[1] + L[2]) / nn; const sh = 0.72 + 0.42 * lam;
    const base = mezclaRGB(lo, hi, (z - T.zmin) / rango); const o = ((h - 1 - iy) * w + ix) * 4;
    img.data[o] = Math.min(255, base[0] * sh * pal.luz); img.data[o + 1] = Math.min(255, base[1] * sh * pal.luz); img.data[o + 2] = Math.min(255, base[2] * sh * pal.luz); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); RELIEVE_CACHE.set(key, cv); if (RELIEVE_CACHE.size > 12) RELIEVE_CACHE.delete(RELIEVE_CACHE.keys().next().value); return cv;
}
const CURVAS_CACHE = new Map();
function curvasFinca(T) {
  const key = T.fincaId + '|' + T.zmin + '|' + T.zmax + '|' + T.nx; if (CURVAS_CACHE.has(key)) return CURVAS_CACHE.get(key);
  const rango = T.zmax - T.zmin; const paso = rango > 120 ? 5 : (rango > 40 ? 2 : 1); const mayor = paso === 5 ? 25 : 10;
  const niv = []; for (let z = Math.ceil(T.zmin / paso) * paso; z < T.zmax; z += paso) niv.push(z);
  const cn = curvasNivel({ x0: T.caja.x0, y0: T.caja.y0, c: T.c, nx: T.nx, ny: T.ny, Z: T.Z }, niv).map(o => ({ z: o.z, mayor: Math.abs(o.z / mayor - Math.round(o.z / mayor)) < 1e-6, lineas: o.lineas.map(l => suavizar(l, 1)) }));
  const r = { paso, mayor, curvas: cn }; CURVAS_CACHE.set(key, r); if (CURVAS_CACHE.size > 12) CURVAS_CACHE.delete(CURVAS_CACHE.keys().next().value); return r;
}

/* ---- Transformación mundo ↔ pantalla (norte arriba) ---- */
function vistaPlano(caja, W, H, vista, margen) {
  const m = margen == null ? 36 : margen; const cx = (caja.x0 + caja.x1) / 2, cy = (caja.y0 + caja.y1) / 2;
  const k = Math.min((W - 2 * m) / Math.max(1, caja.x1 - caja.x0), (H - 2 * m) / Math.max(1, caja.y1 - caja.y0)) * (vista.zoom || 1);
  return { k, cx, cy, aPantalla: (x, y) => [W / 2 + (vista.panX || 0) + (x - cx) * k, H / 2 + (vista.panY || 0) - (y - cy) * k], aMundo: (sx, sy) => [cx + (sx - W / 2 - (vista.panX || 0)) / k, cy - (sy - H / 2 - (vista.panY || 0)) / k] };
}
function trazarPoligono(ctx, poly, V) { ctx.beginPath(); poly.forEach((p, i) => { const s = V.aPantalla(p[0], p[1]); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath(); }
function trazarLinea(ctx, l, V) { ctx.beginPath(); l.forEach((p, i) => { const s = V.aPantalla(p[0], p[1]); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); }
function dibujarFondoRelieve(ctx, T, V, pal, opts) {
  const img = imagenRelieve(T, pal);
  if (img) { const s = V.aPantalla(T.caja.x0 - T.c / 2, T.caja.y0 - T.c / 2); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(s[0], s[1]); ctx.scale(V.k * T.c, -V.k * T.c); ctx.drawImage(img, 0, 0); ctx.restore(); }
  if (opts && opts.sinCurvas) return;
  const cf = curvasFinca(T); ctx.save(); ctx.strokeStyle = pal.curva; ctx.lineJoin = 'round';
  cf.curvas.forEach(o => { ctx.globalAlpha = o.mayor ? 0.62 : 0.3; ctx.lineWidth = o.mayor ? 1.1 : 0.7; o.lineas.forEach(l => { trazarLinea(ctx, l, V); ctx.stroke(); }); });
  ctx.globalAlpha = 0.9; ctx.fillStyle = pal.curva; ctx.font = '600 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  cf.curvas.filter(o => o.mayor).forEach(o => o.lineas.forEach(l => { if (l.length < 8) return; const p = l[Math.floor(l.length * 0.4)], q = l[Math.floor(l.length * 0.4) + 1]; const a = V.aPantalla(p[0], p[1]), b = V.aPantalla(q[0], q[1]); let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang); ctx.fillStyle = pal.bg; ctx.globalAlpha = 0.75; const tx = Math.round(o.z) + ' m'; const w = ctx.measureText(tx).width; ctx.fillRect(-w / 2 - 2, -6, w + 4, 12); ctx.globalAlpha = 0.95; ctx.fillStyle = pal.curva; ctx.fillText(tx, 0, 0.5); ctx.restore(); }));
  ctx.restore();
}
function dibujarEscalaNorte(ctx, W, H, k, pal) {
  const metros = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(mm => mm * k >= 70) || 500;
  ctx.save(); ctx.fillStyle = pal.texto; ctx.strokeStyle = pal.texto; ctx.lineWidth = 1.5; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 0.85; ctx.fillStyle = pal.bg; ctx.fillRect(10, H - 40, metros * k + 16, 30); ctx.globalAlpha = 1; ctx.fillStyle = pal.texto;
  ctx.beginPath(); ctx.moveTo(18, H - 18); ctx.lineTo(18 + metros * k, H - 18); ctx.moveTo(18, H - 22); ctx.lineTo(18, H - 14); ctx.moveTo(18 + metros * k, H - 22); ctx.lineTo(18 + metros * k, H - 14); ctx.stroke();
  ctx.fillText(metros + ' m', 18, H - 25);
  ctx.beginPath(); ctx.moveTo(26, 16); ctx.lineTo(19, 34); ctx.lineTo(26, 30); ctx.lineTo(33, 34); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.fillText('N', 26, 48);
  ctx.restore();
}
const ICONO_PUNTO = { 'Casa':'⌂', 'Beneficiadero':'B', 'Marquesina':'M', 'Bodega':'▣', 'Agua':'≈', 'Acceso':'↗', 'Otro':'•' };
function dibujarPuntosFinca(ctx, f, V, pal) {
  (f.puntos || []).forEach(p => { const s = V.aPantalla(p.x, p.y); ctx.save(); ctx.fillStyle = pal.texto; ctx.strokeStyle = pal.bg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(s[0], s[1], 9, 0, Math.PI * 2); ctx.fillStyle = pal.bg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = pal.texto; ctx.stroke();
    ctx.fillStyle = pal.texto; ctx.font = '700 10px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ICONO_PUNTO[p.tipo] || '•', s[0], s[1] + 0.5);
    ctx.font = '600 10.5px "Figtree", sans-serif'; const tx = p.nombre || p.tipo; const anchoC = ctx.canvas.clientWidth || (ctx.canvas.width / (window.devicePixelRatio || 1)); const izq = s[0] + 12 + ctx.measureText(tx).width > anchoC - 4; ctx.textAlign = izq ? 'right' : 'left'; const xt = izq ? s[0] - 12 : s[0] + 12; ctx.lineWidth = 3; ctx.strokeStyle = pal.bg; ctx.strokeText(tx, xt, s[1]); ctx.fillText(tx, xt, s[1]); ctx.restore(); });
}

/* ---- Mapa de calor sobre la forma real ---- */
function defCapa(capa) { if (capa === 'marcas' || capa === 'estructura') return null; return (typeof VARS_SALUD !== 'undefined' && VARS_SALUD.find(x => x[0] === capa)) || [capa, capa, 'bueno', null, '']; }
function dominioCapa(capa, sup) { const def = defCapa(capa); if (!def) return [0, 1]; const vals = []; (sup || []).forEach(s => s && s.celdas && s.celdas.forEach(c => vals.push(c.v))); return dominioVar(def[0], vals); }
function dibujarCalor(ctx, sup, V, pal, def, dom, alfa) {
  if (!sup || !sup.vals || !sup.celdas.length) return;
  const cv = document.createElement('canvas'); cv.width = sup.nx; cv.height = sup.ny; const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  const img = c2.createImageData(sup.nx, sup.ny); const span = (dom[1] - dom[0]) || 1;
  for (let iy = 0; iy < sup.ny; iy++) for (let ix = 0; ix < sup.nx; ix++) { const v = sup.vals[iy * sup.nx + ix]; const col = rampaSalud((v - dom[0]) / span, def[2], pal); const o = ((sup.ny - 1 - iy) * sup.nx + ix) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
  c2.putImageData(img, 0, 0);
  ctx.save(); trazarPoligono(ctx, sup.g.poly, V); ctx.clip(); ctx.globalAlpha = alfa == null ? 0.78 : alfa; ctx.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  const s = V.aPantalla(sup.x0, sup.y0 + sup.ny * sup.c); ctx.drawImage(cv, s[0], s[1], sup.nx * sup.c * V.k, sup.ny * sup.c * V.k);
  ctx.restore();
}

/* ---- Lienzo: vista de la finca ---- */
function dibujarFinca(ctx, W, H, fincaId, pal, vista, opts) {
  opts = opts || {}; const dist = distribucionFinca(fincaId); const T = terrenoFinca(fincaId);
  ctx.save(); ctx.fillStyle = pal.tierraBaja; ctx.fillRect(0, 0, W, H);
  let caja = null; dist.polys.forEach(o => { const b = cajaPts(o.poly); caja = caja ? { x0: Math.min(caja.x0, b.x0), y0: Math.min(caja.y0, b.y0), x1: Math.max(caja.x1, b.x1), y1: Math.max(caja.y1, b.y1) } : b; });
  const f = dist.finca || {}; if (f.forma && f.forma.pts && f.forma.pts.length >= 3) { const b = cajaPts(f.forma.pts); caja = caja ? { x0: Math.min(caja.x0, b.x0), y0: Math.min(caja.y0, b.y0), x1: Math.max(caja.x1, b.x1), y1: Math.max(caja.y1, b.y1) } : b; }
  if (!caja) caja = T.caja; if (pal.real && !opts.ajustado) { const m = 0.16 * Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0); caja = { x0: caja.x0 - m, y0: caja.y0 - m, x1: caja.x1 + m, y1: caja.y1 + m }; }
  const V = vistaPlano(caja, W, H, vista, opts.margen);
  dibujarFondoRelieve(ctx, T, V, pal);
  if (f.forma && f.forma.pts && f.forma.pts.length >= 3) { ctx.save(); trazarPoligono(ctx, f.forma.pts, V); ctx.setLineDash([8, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = pal.texto; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore(); }
  const def = defCapa(opts.capa); const sups = def ? dist.lotes.map(l => { const g = geomLote(l); return g ? superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : opts.capa) : null; }) : [];
  const dom = def ? dominioCapa(def[0], sups) : null;
  dist.lotes.forEach((l, n) => {
    const o = dist.polys.get(l.id); const g = geomLote(l); const act = activo(l);
    ctx.save(); trazarPoligono(ctx, o.poly, V); ctx.fillStyle = pal.bosque; ctx.globalAlpha = act ? 0.55 : 0.25; ctx.fill(); ctx.restore();
    const sup = sups[n]; if (def && sup && !sup.sinDatos) dibujarCalor(ctx, sup, V, pal, def, dom, pal.real ? 0.6 : 0.92);
    if (g && (!def || !sup || sup.sinDatos) && g.ds * V.k > 2.2 && act) { ctx.save(); ctx.strokeStyle = pal.planta; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.8; g.surcos.forEach(s => { trazarLinea(ctx, s.linea, V); ctx.stroke(); }); ctx.restore(); }
    ctx.save(); trazarPoligono(ctx, o.poly, V); ctx.lineWidth = opts.resaltar === l.id ? 3 : 1.6; ctx.strokeStyle = opts.resaltar === l.id ? pal.acento : pal.texto; ctx.globalAlpha = act ? 0.85 : 0.4; if (o.esquematico) ctx.setLineDash([6, 4]); if (!act) ctx.setLineDash([2, 3]); ctx.stroke(); ctx.restore();
    const c = centroidePol(o.poly); const s = V.aPantalla(c[0], c[1]); if ((f.puntos || []).some(q => { const t = V.aPantalla(n0(q.x), n0(q.y)); return Math.hypot(t[0] - s[0], t[1] - s[1]) < 60; })) s[1] += 30;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.font = '700 12.5px "Figtree", sans-serif'; ctx.lineWidth = 3.5; ctx.strokeStyle = pal.bg; ctx.fillStyle = pal.texto;
    ctx.strokeText(l.nombre, s[0], s[1] - 7); ctx.fillText(l.nombre, s[0], s[1] - 7);
    const sub = act ? (num(redondear(g ? g.ha : n0(l.hectareas), 2)) + ' ha' + (sup && !sup.sinDatos && def ? ' · ' + num(redondear(sup.prom, 1)) + def[4] : '') + (o.esquematico ? ' · esquemático' : '')) : 'histórico';
    ctx.font = '500 10.5px "Figtree", sans-serif'; ctx.lineWidth = 3; ctx.fillStyle = pal.suave; ctx.strokeText(sub, s[0], s[1] + 8); ctx.fillText(sub, s[0], s[1] + 8); ctx.restore();
  });
  dibujarPuntosFinca(ctx, f, V, pal);
  if (!opts.sinEscala) dibujarEscalaNorte(ctx, W, H, V.k, pal);
  ctx.restore(); return { V, dist, dom, def };
}

/* ---- Lienzo: vista del lote ---- */
function dibujarLote(ctx, W, H, l, g, pal, vista, opts) {
  opts = opts || {}; if (!pal.tierraBaja) pal = Object.assign({}, PALETA_PDF_MAQ, pal);
  const T = g.terreno; const m = Math.max(4, 0.06 * Math.max(g.caja.x1 - g.caja.x0, g.caja.y1 - g.caja.y0));
  const V = vistaPlano({ x0: g.caja.x0 - m, y0: g.caja.y0 - m, x1: g.caja.x1 + m, y1: g.caja.y1 + m }, W, H, vista, 30); const k = V.k;
  ctx.save(); ctx.fillStyle = pal.tierraBaja; ctx.fillRect(0, 0, W, H);
  dibujarFondoRelieve(ctx, T, V, pal);
  // Lotes vecinos
  const dist = distribucionFinca(l.fincaId);
  dist.lotes.forEach(o => { if (o.id === l.id) return; const pp = dist.polys.get(o.id); ctx.save(); trazarPoligono(ctx, pp.poly, V); ctx.fillStyle = pal.bosque; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 0.5; ctx.strokeStyle = pal.suave; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.restore();
    const c = centroidePol(pp.poly), s = V.aPantalla(c[0], c[1]); ctx.save(); ctx.fillStyle = pal.suave; ctx.font = '600 11px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.8; ctx.fillText(o.nombre, s[0], s[1]); ctx.restore(); });
  // Lote
  ctx.save(); trazarPoligono(ctx, g.poly, V); ctx.fillStyle = pal.lote; ctx.globalAlpha = 0.62; ctx.fill(); ctx.restore();
  const capa = opts.capa || 'estructura'; const def = defCapa(capa === 'marcas' ? null : capa);
  let sup = null, dom = null, datos = null;
  if (def) { const tam = Math.max(g.caja.x1 - g.caja.x0, g.caja.y1 - g.caja.y0); sup = superficieCalor(g, capa, Math.max(0.6, tam / 70)); dom = dominioCapa(def[0], [sup]); if (!sup.sinDatos) dibujarCalor(ctx, sup, V, pal, def, dom, opts.alfaCalor == null ? (pal.real ? 0.52 : 0.7) : opts.alfaCalor); datos = TIPOS_MUESTREO[capa] ? valoresCapa(l.id, capa) : null; }
  ctx.save(); trazarPoligono(ctx, g.poly, V); ctx.clip();
  // Surcos
  if (g.ds * k > 2.6) { ctx.strokeStyle = pal.surco; ctx.globalAlpha = pal.oscuro ? 0.6 : 1; ctx.lineWidth = Math.max(0.6, Math.min(2.5, g.ds * k * 0.18)); ctx.lineJoin = 'round'; g.surcos.forEach(s => { trazarLinea(ctx, s.linea, V); ctx.stroke(); }); ctx.globalAlpha = 1; }
  // Plantas
  const r = Math.max(0.8, Math.min(g.ds, g.dp) * k * 0.27); const fino = r < 1.6;
  const marcas = new Map(); marcasPlanta.forEach(mk => { if (mk.loteId === l.id) marcas.set(mk.codigo, mk); });
  for (const p of g.plantas) {
    const s = V.aPantalla(p.x, p.y); if (s[0] < -10 || s[1] < -10 || s[0] > W + 10 || s[1] > H + 10) continue;
    const mk = marcas.get(p.cod);
    if (mk && mk.estado === 'Faltante') { ctx.strokeStyle = pal.danger; ctx.lineWidth = 1.3; const e = Math.max(r, 2.2); ctx.beginPath(); ctx.moveTo(s[0] - e, s[1] - e); ctx.lineTo(s[0] + e, s[1] + e); ctx.moveTo(s[0] + e, s[1] - e); ctx.lineTo(s[0] - e, s[1] + e); ctx.stroke(); continue; }
    let col = pal.planta, alpha = capa === 'estructura' ? 0.85 : 0.35, radio = r;
    if (datos && datos.mapa.has(p.cod)) { col = rgbTxt(rampaSalud((datos.mapa.get(p.cod) - dom[0]) / ((dom[1] - dom[0]) || 1), def[2], pal)); alpha = 1; radio = Math.max(r * 1.6, 3.2); }
    if (capa === 'marcas' && mk) { col = pal[{ 'Observación': 'warn', 'Tratada': 'info', 'Resiembra': 's5' }[mk.estado]] || pal.planta; alpha = 1; radio = Math.max(r * 1.5, 3); }
    ctx.globalAlpha = alpha; ctx.fillStyle = col;
    if (fino && alpha < 1) ctx.fillRect(s[0] - 0.8, s[1] - 0.8, 1.6, 1.6);
    else { ctx.beginPath(); ctx.arc(s[0], s[1], radio, 0, Math.PI * 2); ctx.fill(); if (alpha === 1 && radio >= 3) { ctx.lineWidth = 1; ctx.strokeStyle = pal.texto; ctx.globalAlpha = 0.55; ctx.stroke(); } }
  }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.save(); trazarPoligono(ctx, g.poly, V); ctx.lineWidth = 2; ctx.strokeStyle = pal.texto; ctx.globalAlpha = 0.8; if (g.esquematico) ctx.setLineDash([7, 4]); ctx.stroke(); ctx.restore();
  // Plan de muestreo
  const plan = opts.plan;
  if (plan) plan.codigos.forEach((cod, n) => { const p = g.idx.get(cod); if (!p) return; const s = V.aPantalla(p.x, p.y); const rr = Math.max(6, r * 2.4);
    ctx.lineWidth = 2; ctx.strokeStyle = pal.acento; ctx.fillStyle = pal.lote; ctx.beginPath(); ctx.arc(s[0], s[1], rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (rr >= 7) { ctx.fillStyle = pal.acento; ctx.font = '600 ' + Math.min(11, rr) + 'px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n + 1), s[0], s[1] + 0.5); } });
  [[opts.hover, 1.5, 0.6], [opts.sel, 2.5, 1]].forEach(([cod, lw, a]) => { const p = cod && g.idx.get(cod); if (!p) return; const s = V.aPantalla(p.x, p.y); ctx.globalAlpha = a; ctx.lineWidth = lw; ctx.strokeStyle = pal.texto; ctx.beginPath(); ctx.arc(s[0], s[1], Math.max(7, r * 2.6), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; });
  // Rótulos de surco al inicio de cada surco
  if (g.ds * k >= 10) { ctx.save(); ctx.fillStyle = pal.suave; ctx.font = '500 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeStyle = pal.bg; ctx.lineWidth = 3;
    const pasoS = g.ds * k >= 22 ? 1 : (g.ds * k >= 14 ? 2 : 5);
    g.surcos.forEach(s => { if ((s.i - 1) % pasoS) return; const a = s.linea[0], b = s.linea[1] || a; const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const q = V.aPantalla(a[0] - (b[0] - a[0]) / d * g.dp * 1.1, a[1] - (b[1] - a[1]) / d * g.dp * 1.1); ctx.strokeText('S' + String(s.i).padStart(2, '0'), q[0], q[1]); ctx.fillText('S' + String(s.i).padStart(2, '0'), q[0], q[1]); }); ctx.restore(); }
  dibujarPuntosFinca(ctx, dist.finca || {}, V, pal);
  dibujarEscalaNorte(ctx, W, H, k, pal);
  ctx.restore();
  return { k, aPantalla: V.aPantalla, aMundo: V.aMundo, sup, dom, def };
}
function transformacion(g, W, H, vista) { const m = Math.max(4, 0.06 * Math.max(g.caja.x1 - g.caja.x0, g.caja.y1 - g.caja.y0)); return vistaPlano({ x0: g.caja.x0 - m, y0: g.caja.y0 - m, x1: g.caja.x1 + m, y1: g.caja.y1 + m }, W, H, vista, 30); }

/* ---- Lienzo: vista 3D (proyección oblicua con relieve exagerado) ---- */
function dibujar3D(ctx, W, H, fincaId, pal, vista, opts) {
  opts = opts || {}; const T = terrenoFinca(fincaId); const dist = distribucionFinca(fincaId);
  ctx.save(); const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, pal.oscuro ? '#0F1712' : '#EAF0EC'); grad.addColorStop(1, pal.real ? (pal.oscuro ? '#0B110D' : '#D5DFD8') : pal.bg); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  const rot = (vista.rot || 0) * Math.PI / 180, tilt = (vista.tilt == null ? 52 : vista.tilt) * Math.PI / 180, ex = vista.exag || 1.6;
  let caja = null; dist.polys.forEach(o => { const b = cajaPts(o.poly); caja = caja ? { x0: Math.min(caja.x0, b.x0), y0: Math.min(caja.y0, b.y0), x1: Math.max(caja.x1, b.x1), y1: Math.max(caja.y1, b.y1) } : b; });
  if (!caja) caja = T.caja; { const w = caja.x1 - caja.x0, h = caja.y1 - caja.y0, M = Math.max(w, h); if (w < 0.7 * M) { const d = (0.7 * M - w) / 2; caja.x0 -= d; caja.x1 += d; } if (h < 0.7 * M) { const d = (0.7 * M - h) / 2; caja.y0 -= d; caja.y1 += d; } } const mg = 0.15 * Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0) + 10; caja = { x0: Math.max(T.caja.x0, caja.x0 - mg), y0: Math.max(T.caja.y0, caja.y0 - mg), x1: Math.min(T.caja.x1, caja.x1 + mg), y1: Math.min(T.caja.y1, caja.y1 + mg) };
  const cx = (caja.x0 + caja.x1) / 2, cy = (caja.y0 + caja.y1) / 2, zc = (T.zmin + T.zmax) / 2;
  const diag = Math.hypot(caja.x1 - caja.x0, caja.y1 - caja.y0); const k = Math.min(W, H * 1.5) / diag * 0.92 * (vista.zoom || 1);
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
  const P = (x, y, z) => { const dx = x - cx, dy = y - cy; const xr = dx * cr - dy * sr, yr = dx * sr + dy * cr; return [W / 2 + (vista.panX || 0) + xr * k, H * 0.56 + (vista.panY || 0) - yr * ct * k - (z - zc) * st * k * ex, yr]; };
  const n = Math.max(24, Math.min(110, Math.round(diag / 2.5))); const sx = (caja.x1 - caja.x0) / n, sy = (caja.y1 - caja.y0) / n;
  const def = defCapa(opts.capa); const sups = new Map(); let dom = null;
  if (def) { const arr = []; dist.lotes.forEach(l => { if (!activo(l)) return; const g = geomLote(l); if (!g) return; const s = superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : opts.capa); if (!s.sinDatos) { sups.set(l.id, s); arr.push(s); } }); dom = dominioCapa(def[0], arr); }
  const polys = dist.lotes.map(l => ({ l, o: dist.polys.get(l.id) })).filter(x => x.o);
  const lo = hexRgb(pal.tierraBaja), hi = hexRgb(pal.tierraAlta), bos = hexRgb(pal.bosque), planta = hexRgb(pal.planta); const rango = (T.zmax - T.zmin) || 1;
  const L = [-0.5, 0.5, 0.7]; const nl = Math.hypot(...L);
  const quads = []; const TXR = pal.real && typeof texturaRealDatos === 'function' ? texturaRealDatos(fincaId) : null;
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const x = caja.x0 + ix * sx, y = caja.y0 + iy * sy; const xm = x + sx / 2, ym = y + sy / 2;
    const z00 = T.z(x, y), z10 = T.z(x + sx, y), z11 = T.z(x + sx, y + sy), z01 = T.z(x, y + sy);
    const zx = ((z10 + z11) - (z00 + z01)) / (2 * sx), zy = ((z01 + z11) - (z00 + z10)) / (2 * sy);
    const lam = (-zx * L[0] - zy * L[1] + L[2]) / (nl * Math.hypot(zx, zy, 1)); const sh = 0.62 + 0.5 * lam;
    let col = mezclaRGB(lo, hi, ((z00 + z11) / 2 - T.zmin) / rango);
    const dentro = polys.find(p => dentroPol(xm, ym, p.o.poly));
    let realCol = false; if (TXR) { const px = Math.floor((xm - TXR.caja.x0) / TXR.mpp), py = Math.floor((TXR.caja.y1 - ym) / TXR.mpp); if (px >= 0 && py >= 0 && px < TXR.w && py < TXR.h) { const o = (py * TXR.w + px) * 4; col = [TXR.d[o], TXR.d[o + 1], TXR.d[o + 2]]; realCol = true; } }
    if (dentro) { if (!realCol) col = mezclaRGB(bos, planta, activo(dentro.l) ? 0.28 : 0.08); const s = sups.get(dentro.l.id);
      if (s) { const v = s.en(xm, ym); if (v != null) col = rampaSalud((v - dom[0]) / ((dom[1] - dom[0]) || 1), def[2], pal); } }
    const a = P(x, y, z00), b = P(x + sx, y, z10), c2 = P(x + sx, y + sy, z11), d = P(x, y + sy, z01);
    const shf = realCol ? 0.7 + 0.3 * sh : sh; quads.push({ prof: (a[2] + b[2] + c2[2] + d[2]) / 4, pts: [a, b, c2, d], col: [col[0] * shf, col[1] * shf, col[2] * shf].map(v => Math.min(255, Math.round(v * (pal.luz || 1)))) });
  }
  // Paredes del bloque (corte del terreno) para dar volumen
  const zb = T.zmin - Math.max(4, (T.zmax - T.zmin) * 0.12); const tierra = mezclaRGB(hexRgb(pal.tierraAlta), [96, 72, 48], pal.oscuro ? 0.55 : 0.42);
  const borde = []; for (let i = 0; i < n; i++) { borde.push([caja.x0 + i * sx, caja.y0, caja.x0 + (i + 1) * sx, caja.y0]); borde.push([caja.x0 + i * sx, caja.y1, caja.x0 + (i + 1) * sx, caja.y1]); borde.push([caja.x0, caja.y0 + i * sy, caja.x0, caja.y0 + (i + 1) * sy]); borde.push([caja.x1, caja.y0 + i * sy, caja.x1, caja.y0 + (i + 1) * sy]); }
  borde.forEach(([x1, y1, x2, y2], k) => { const a = P(x1, y1, T.z(x1, y1)), b = P(x2, y2, T.z(x2, y2)), c2 = P(x2, y2, zb), d = P(x1, y1, zb); const sh = 0.7 + 0.25 * ((k % 4) < 2 ? 1 : 0.5);
    quads.push({ prof: (a[2] + b[2]) / 2 + 1e-3, pts: [a, b, c2, d], col: tierra.map(v => Math.round(v * sh)) }); });
  quads.sort((p, q) => q.prof - p.prof);
  quads.forEach(q => { ctx.beginPath(); ctx.moveTo(q.pts[0][0], q.pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q.pts[i][0], q.pts[i][1]); ctx.closePath(); const c = rgbTxt(q.col); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 0.6; ctx.fill(); ctx.stroke(); });
  // Curvas mayores drapeadas
  const cf = curvasFinca(T); ctx.save(); ctx.strokeStyle = pal.curva; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
  cf.curvas.filter(o => o.mayor).forEach(o => o.lineas.forEach(li => { ctx.beginPath(); let on = false; li.forEach(p => { if (p[0] < caja.x0 || p[0] > caja.x1 || p[1] < caja.y0 || p[1] > caja.y1) { on = false; return; } const s = P(p[0], p[1], o.z + 0.05); if (!on) { ctx.moveTo(s[0], s[1]); on = true; } else ctx.lineTo(s[0], s[1]); }); ctx.stroke(); })); ctx.restore();
  // Surcos y bordes de lotes
  polys.forEach(({ l, o }) => { const g = geomLote(l);
    if (g && activo(l) && g.ds * k > 1.6 && !sups.has(l.id)) { ctx.save(); ctx.strokeStyle = pal.planta; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.9; g.surcos.forEach(s => { ctx.beginPath(); s.linea.forEach((p, i) => { const q = P(p[0], p[1], T.z(p[0], p[1]) + 0.3); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }); ctx.restore(); }
    ctx.save(); ctx.beginPath(); const per = []; o.poly.forEach((a, i) => { const b = o.poly[(i + 1) % o.poly.length]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const pasos = Math.max(1, Math.ceil(d / 2)); for (let t = 0; t < pasos; t++) { const x = a[0] + (b[0] - a[0]) * t / pasos, y = a[1] + (b[1] - a[1]) * t / pasos; per.push(P(x, y, T.z(x, y) + 0.2)); } });
    per.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.strokeStyle = opts.resaltar === l.id ? pal.acento : pal.texto; ctx.lineWidth = opts.resaltar === l.id ? 2.6 : 1.4; ctx.globalAlpha = activo(l) ? 0.85 : 0.35; if (o.esquematico) ctx.setLineDash([6, 4]); ctx.stroke(); ctx.restore(); });
  // Vista realista: vías y árboles de sombrío en volumen
  if (pal.real && dist.finca) { const f = dist.finca; const dentroC = (x, y) => x >= caja.x0 && x <= caja.x1 && y >= caja.y0 && y <= caja.y1;
    (f.vias || []).forEach(v => { const pts = v.pts.filter(q => dentroC(q[0], q[1])); if (pts.length < 2) return; ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [[1.3, 'rgba(60,48,30,0.5)'], [1, '#B99B6C'], [0.6, '#C8AD80']].forEach(([m, col]) => { ctx.beginPath(); pts.forEach((q, i) => { const sp = P(q[0], q[1], T.z(q[0], q[1]) + 0.2); i ? ctx.lineTo(sp[0], sp[1]) : ctx.moveTo(sp[0], sp[1]); }); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, (n0(v.ancho) || 4.2) * m * k); ctx.stroke(); }); ctx.restore(); });
    const arb = (f.sombrio || []).filter(t => dentroC(n0(t.x), n0(t.y))).map((t, i) => { const z = T.z(n0(t.x), n0(t.y)); const base = P(n0(t.x), n0(t.y), z); const alto = (t.tipo === 'platano' ? 3.5 : 7) * ex; const copa = P(n0(t.x), n0(t.y), z + alto * 0.85 / ex * ex); return { t, i, base, copa }; }).sort((a, b) => b.base[2] - a.base[2]);
    arb.forEach(({ t, i, base, copa }) => { const rr = Math.max(1.2, n0(t.r) * k * 0.95); ctx.save(); ctx.strokeStyle = 'rgba(70,52,34,0.8)'; ctx.lineWidth = Math.max(0.8, rr * 0.12); ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(copa[0], copa[1]); ctx.stroke(); ctx.restore(); dibujarArbol(ctx, copa, rr, t.tipo, 1000 + i); }); }
  // Rótulos
  polys.forEach(({ l, o }) => { const c = centroidePol(o.poly); const z = T.z(c[0], c[1]); const s = P(c[0], c[1], z + 20 / ex); const base = P(c[0], c[1], z);
    ctx.save(); ctx.strokeStyle = pal.texto; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(s[0], s[1]); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = '700 12px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = pal.bg; ctx.fillStyle = pal.texto; ctx.strokeText(l.nombre, s[0], s[1] - 4); ctx.fillText(l.nombre, s[0], s[1] - 4);
    ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.lineWidth = 3; ctx.fillStyle = pal.suave; const t2 = Math.round(z) + ' msnm'; ctx.strokeText(t2, s[0], s[1] + 9); ctx.fillText(t2, s[0], s[1] + 9); ctx.restore(); });
  (dist.finca && dist.finca.puntos || []).forEach(p => { const z = T.z(p.x, p.y); const s = P(p.x, p.y, z); ctx.save(); ctx.fillStyle = pal.bg; ctx.strokeStyle = pal.texto; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s[0], s[1] - 8, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = pal.texto; ctx.font = '700 9.5px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ICONO_PUNTO[p.tipo] || '•', s[0], s[1] - 7.5); ctx.restore(); });
  // Brújula
  ctx.save(); ctx.translate(30, 36); ctx.rotate(-rot); ctx.fillStyle = pal.texto; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-6, 4); ctx.lineTo(0, 0); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.font = '700 10px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', 0, -18); ctx.restore();
  ctx.save(); ctx.fillStyle = pal.suave; ctx.font = '500 11px "Figtree", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Relieve ×' + num(ex) + (T.sintetico ? ' · estimado con la pendiente de cada lote' : ' · de ' + T.nReales + ' puntos con altitud'), 14, H - 14); ctx.restore();
  ctx.restore(); return { dom, def };
}
