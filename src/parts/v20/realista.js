/* ================= v20: maqueta realista (vista aérea procedimental fiel a la finca) =================
   Coberturas del entorno (finca.entorno: bosque, potrero, cafetal, patio, rastrojo, construcción), árboles de sombrío (finca.sombrio),
   vías (finca.vias) y los cafetos reales de cada lote. Suelo por píxel con ruido y sombreado del relieve; árboles, cafetos y techos en vectores. */
let MAQ_REAL = true;   // vista realista por defecto
try { const v = localStorage.getItem('so-maq-vista'); if (v) MAQ_REAL = v === 'real'; } catch (e) {}
const PAL_REAL = { lote: 'rgba(0,0,0,0)', bosque: 'rgba(0,0,0,0)', surco: 'rgba(0,0,0,0)', planta: 'rgba(0,0,0,0)', texto: '#FFFFFF', bg: '#13211A', suave: '#E4EDE2', curva: '#F3E7C6', real: true };
function paletaReal(pal) { return Object.assign({}, pal, PAL_REAL, { tierraBaja: pal.tierraBaja || '#E3EBDD' }); }
function hash2(ix, iy, s) { let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vruido(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s) { return vruido(x, y, s) * 0.55 + vruido(x * 2.03, y * 2.03, s + 7) * 0.28 + vruido(x * 4.1, y * 4.1, s + 13) * 0.17; }
const COBERTURAS = { lote: 1, potrero: 2, bosque: 3, cafe: 4, patio: 5, rastrojo: 6, construccion: 7, agua: 8 };
const TEX_REAL = new Map();
function cajaRealFinca(fincaId) {
  const f = fincas.find(x => x.id === fincaId) || {}; let c = null; const add = pts => (pts || []).forEach(p => { const x = n0(p[0] != null ? p[0] : p.x), y = n0(p[1] != null ? p[1] : p.y); c = c ? { x0: Math.min(c.x0, x), y0: Math.min(c.y0, y), x1: Math.max(c.x1, x), y1: Math.max(c.y1, y) } : { x0: x, y0: y, x1: x, y1: y }; });
  const dist = distribucionFinca(fincaId); dist.polys.forEach(o => add(o.poly)); if (f.forma) add(f.forma.pts); (f.entorno || []).forEach(e => add(e.pts));
  if (!c) { const T = terrenoFinca(fincaId); c = Object.assign({}, T.caja); }
  const m = 0.35 * Math.max(c.x1 - c.x0, c.y1 - c.y0); return { x0: c.x0 - m, y0: c.y0 - m, x1: c.x1 + m, y1: c.y1 + m };
}
function texturaReal(fincaId) {
  const f = fincas.find(x => x.id === fincaId) || {}; const dist = distribucionFinca(fincaId);
  const key = fincaId + '|' + JSON.stringify([f.entorno, f.forma && f.forma.pts.length, [...dist.polys.values()].map(o => o.poly.length + ':' + o.poly[0])]).length + '|' + JSON.stringify((f.entorno || []).map(e => e.pts[0])) + '|' + [...dist.polys.values()].map(o => o.poly.map(p => p.join(',')).join(';')).join('|');
  if (TEX_REAL.has(key)) return TEX_REAL.get(key);
  const caja = cajaRealFinca(fincaId); const ancho = caja.x1 - caja.x0, alto = caja.y1 - caja.y0; const mpp = Math.max(0.14, Math.max(ancho, alto) / 2200);
  const w = Math.ceil(ancho / mpp), h = Math.ceil(alto / mpp); const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return null;
  const aTex = (x, y) => [(x - caja.x0) / mpp, (caja.y1 - y) / mpp];
  // 1. Máscara de coberturas (canal R = tipo, G = ángulo de surcos, B = distancia entre surcos × 40)
  ctx.fillStyle = 'rgb(' + COBERTURAS[f.fondo || 'potrero'] + ',0,0)'; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
  const pintar = (pts, tipo, ang, sp) => { if (!pts || pts.length < 3) return; ctx.beginPath(); pts.forEach((p, i) => { const q = aTex(n0(p[0] != null ? p[0] : p.x), n0(p[1] != null ? p[1] : p.y)); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath();
    ctx.fillStyle = 'rgb(' + COBERTURAS[tipo] + ',' + Math.round(((ang || 0) % 180 + 180) % 180 / 180 * 255) + ',' + Math.round((sp || 1.6) * 40) + ')'; ctx.fill(); };
  (f.entorno || []).filter(e => e.tipo !== 'construccion').forEach(e => pintar(e.pts, e.tipo in COBERTURAS ? e.tipo : 'rastrojo', e.angulo, e.surcos));
  dist.polys.forEach(o => pintar(o.poly, 'lote'));
  const mask = ctx.getImageData(0, 0, w, h).data;
  // 2. Sombreado del relieve en una rejilla gruesa
  const T = terrenoFinca(fincaId); const L = [-0.55, 0.55, 0.63]; const nl = Math.hypot(...L); L.forEach((v, i) => L[i] = v / nl);
  const tw = T.nx + 1, th = T.ny + 1; const sh = new Float32Array(tw * th);
  for (let iy = 0; iy < th; iy++) for (let ix = 0; ix < tw; ix++) { const zx = (T.Z[iy * tw + Math.min(tw - 1, ix + 1)] - T.Z[iy * tw + Math.max(0, ix - 1)]) / (2 * T.c), zy = (T.Z[Math.min(th - 1, iy + 1) * tw + ix] - T.Z[Math.max(0, iy - 1) * tw + ix]) / (2 * T.c);
    sh[iy * tw + ix] = 0.8 + 0.34 * ((-zx * L[0] - zy * L[1] + L[2]) / Math.hypot(zx, zy, 1)); }
  const sombra = (x, y) => { let gx = (x - (T.caja.x0 - T.c / 2)) / T.c, gy = (y - (T.caja.y0 - T.c / 2)) / T.c; gx = Math.max(0, Math.min(tw - 1.001, gx)); gy = Math.max(0, Math.min(th - 1.001, gy)); const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const a = sh[iy * tw + ix], b = sh[iy * tw + ix + 1], c = sh[(iy + 1) * tw + ix], d = sh[(iy + 1) * tw + ix + 1]; return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  // 3. Color por píxel
  const img = ctx.createImageData(w, h); const D = img.data; const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let j = 0; j < h; j++) { const y = caja.y1 - (j + 0.5) * mpp;
    for (let i = 0; i < w; i++) { const x = caja.x0 + (i + 0.5) * mpp; const o = (j * w + i) * 4; const tipo = Math.round(mask[o]); let r, g, b;
      const n1 = fbm(x / 9, y / 9, 3), n3 = hash2(i, j, 5);
      if (tipo === 3) { // bosque: copas grandes
        const c = fbm(x / 3.2, y / 3.2, 11); const luz = fbm((x - 0.6) / 3.2, (y + 0.6) / 3.2, 11) - c; const t = Math.max(0, Math.min(1, c * 1.25 - 0.1));
        r = 26 + 44 * t + 90 * luz; g = 46 + 58 * t + 110 * luz; b = 26 + 26 * t + 60 * luz; if (c < 0.3) { r *= 0.55; g *= 0.6; b *= 0.6; } }
      else if (tipo === 4 || tipo === 1) { // cafetal en surcos (vecinos) / suelo bajo sombrío (lote)
        if (tipo === 1) { const c = fbm(x / 1.3, y / 1.3, 21), c2 = fbm(x / 6, y / 6, 23); r = 108 + 30 * c + 16 * c2; g = 104 + 26 * c + 10 * c2; b = 66 + 14 * c; if (fbm(x / 0.7, y / 0.7, 27) > 0.6) { r -= 22; g -= 6; b -= 14; } }   // suelo del lote con arvenses bajas: los cafetos se dibujan encima
        else { const ang = mask[o + 1] / 255 * Math.PI, sp = Math.max(1, mask[o + 2] / 40), dp = sp * 0.62; const ca = Math.cos(ang), sa = Math.sin(ang);
          const s = (x * ca + y * sa) / sp, t = (-x * sa + y * ca) / dp; const fr = s - Math.floor(s) - 0.5, fp = t - Math.floor(t) - 0.5; const dd = (fr * sp / 0.6) ** 2 + (fp * dp / 0.52) ** 2;
          if (dd < 1) { const hl = Math.max(0, -fr - fp) * 0.9; r = 44 + 30 * hl + 16 * n1; g = 84 + 44 * hl + 18 * n1; b = 38 + 16 * hl; }
          else if (dd < 1.5 && fr > 0) { r = 40; g = 52; b = 32; }   // sombra de la planta
          else { r = 112 + 26 * n1; g = 112 + 18 * n1; b = 70 + 10 * n1; } } }
      else if (tipo === 5) { r = 192 + 22 * n1; g = 172 + 18 * n1; b = 132 + 14 * n1; }   // patio / suelo desnudo
      else if (tipo === 6) { const c = fbm(x / 2.2, y / 2.2, 31); r = 74 + 50 * c; g = 104 + 46 * c; b = 50 + 20 * c; }   // rastrojo
      else if (tipo === 8) { r = 70; g = 98; b = 104; }
      else { const c = fbm(x / 6, y / 6, 41), c2 = fbm(x / 1.1, y / 1.1, 47); r = 92 + 44 * c + 18 * c2; g = 124 + 34 * c + 16 * c2; b = 58 + 14 * c + 6 * c2; if (fbm(x / 1.6, y / 1.6, 43) > 0.72) { r -= 26; g -= 20; b -= 14; } if (fbm(x / 14, y / 14, 49) > 0.66) { r += 16; g += 8; } }   // potrero
      const k = sombra(x, y) * (0.94 + 0.12 * n3); D[o] = clamp(r * k); D[o + 1] = clamp(g * k); D[o + 2] = clamp(b * k); D[o + 3] = 255; } }
  ctx.putImageData(img, 0, 0);
  const res = { cv, caja, mpp }; TEX_REAL.set(key, res); if (TEX_REAL.size > 4) TEX_REAL.delete(TEX_REAL.keys().next().value); return res;
}
/* ---- Capas vectoriales: vías, construcciones, árboles y cafetos ---- */
function dibujarViasReal(ctx, f, V) {
  (f.vias || []).forEach(v => { if (!v.pts || v.pts.length < 2) return; const an = n0(v.ancho) || 4.2; ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [[an * 1.3, 'rgba(70,58,38,0.55)'], [an, '#B99B6C'], [an * 0.62, '#C8AD80'], [an * 0.12, 'rgba(150,124,86,0.6)']].forEach(([wm, col], i) => { trazarLinea(ctx, v.pts, V); ctx.strokeStyle = col; ctx.lineWidth = Math.max(i === 3 ? 0.4 : 1.2, wm * V.k); ctx.stroke(); });
    ctx.restore(); });
}
function dibujarConstrucciones(ctx, f, V) {
  (f.entorno || []).filter(e => e.tipo === 'construccion' && e.pts && e.pts.length >= 3).forEach(e => { const pts = e.pts.map(p => [n0(p[0]), n0(p[1])]);
    ctx.save(); ctx.fillStyle = 'rgba(14,22,14,0.42)'; trazarPoligono(ctx, pts.map(p => [p[0] + 1.6, p[1] - 1.6]), V); ctx.fill();
    const col = e.techo === 'teja' ? ['#A65E44', '#C07656'] : e.techo === 'azul' ? ['#5E7FA3', '#7D9CBD'] : ['#8E979E', '#B3BABF'];
    trazarPoligono(ctx, pts, V); ctx.fillStyle = col[0]; ctx.fill(); ctx.clip();
    const c = centroidePol(pts); const a = V.aPantalla(c[0], c[1]); const b = cajaPts(pts); const larg = (b.x1 - b.x0) >= (b.y1 - b.y0);
    ctx.fillStyle = col[1]; if (larg) { const q = V.aPantalla(b.x0, c[1]); ctx.fillRect(q[0] - 2, q[1] - (b.y1 - b.y0) * V.k, (b.x1 - b.x0) * V.k + 4, (b.y1 - b.y0) * V.k); } else { const q = V.aPantalla(b.x0, b.y1); ctx.fillRect(q[0], q[1] - 2, (b.x1 - b.x0) * V.k / 2, (b.y1 - b.y0) * V.k + 4); }
    ctx.restore(); ctx.save(); trazarPoligono(ctx, pts, V); ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore(); });
}
function dibujarArbol(ctx, s, rr, tipo, sem) {
  const rnd = mulberry32(sem); ctx.save();
  if (tipo === 'platano') { ctx.fillStyle = 'rgba(12,20,10,0.35)'; ctx.beginPath(); ctx.ellipse(s[0] + rr * 0.35, s[1] + rr * 0.35, rr * 0.95, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + rnd(); ctx.fillStyle = ['#7FA046', '#93B254', '#6F9140'][k % 3]; ctx.beginPath(); ctx.ellipse(s[0] + Math.cos(a) * rr * 0.45, s[1] + Math.sin(a) * rr * 0.45, rr * 0.55, rr * 0.2, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return; }
  ctx.fillStyle = 'rgba(8,16,8,0.36)'; ctx.beginPath(); ctx.ellipse(s[0] + rr * 0.45, s[1] + rr * 0.45, rr * 1.05, rr * 0.95, 0.4, 0, Math.PI * 2); ctx.fill();
  const tonos = tipo === 'nogal' ? [[34, 60, 30], [52, 84, 40], [72, 108, 52], [96, 132, 66]] : [[30, 56, 28], [46, 78, 36], [64, 100, 46], [88, 124, 58]];
  const n = 9 + Math.floor(rnd() * 5);
  for (let capa = 0; capa < 4; capa++) { const fr = [0.62, 0.46, 0.32, 0.18][capa], rd = [0.46, 0.36, 0.27, 0.17][capa]; const dx = -rr * [0, 0.06, 0.14, 0.22][capa];
    for (let k = 0; k < n; k++) { const a = rnd() * Math.PI * 2, dd = rr * fr * Math.sqrt(rnd()); const rad = rr * rd * (0.7 + rnd() * 0.6); const c = tonos[capa];
      ctx.fillStyle = 'rgb(' + c.map(v => Math.round(v + (rnd() - 0.5) * 14)).join(',') + ')'; ctx.beginPath(); ctx.arc(s[0] + Math.cos(a) * dd + dx, s[1] + Math.sin(a) * dd + dx, rad, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}
function dibujarSombrio(ctx, f, V, W, H) {
  (f.sombrio || []).forEach((t, i) => { const s = V.aPantalla(n0(t.x), n0(t.y)); const rr = n0(t.r || 4) * V.k; if (s[0] < -rr * 2 || s[1] < -rr * 2 || s[0] > W + rr * 2 || s[1] > H + rr * 2) return; if (rr < 0.7) return; dibujarArbol(ctx, s, rr, t.tipo, 1000 + i); });
}
function dibujarCafetos(ctx, fincaId, V, W, H) {
  lotesDeFinca(fincaId).forEach(l => { const g = geomLote(l); if (!g) return; const r = Math.min(g.ds, g.dp) * 0.42 * V.k; const marcas = new Set(marcasPlanta.filter(m => m.loteId === l.id && m.estado === 'Faltante').map(m => m.codigo));
    ctx.save(); trazarPoligono(ctx, g.poly, V); ctx.clip();
    if (r < 0.9) { ctx.fillStyle = 'rgba(40,78,34,0.55)'; g.plantas.forEach(p => { if (marcas.has(p.cod)) return; const s = V.aPantalla(p.x, p.y); ctx.fillRect(s[0] - 0.6, s[1] - 0.6, 1.2, 1.2); }); ctx.restore(); return; }
    const vis = g.plantas.filter(p => { if (marcas.has(p.cod)) return false; const s = V.aPantalla(p.x, p.y); return s[0] > -r && s[1] > -r && s[0] < W + r && s[1] < H + r; });
    ctx.fillStyle = 'rgba(12,22,10,0.4)'; vis.forEach(p => { const s = V.aPantalla(p.x, p.y); ctx.beginPath(); ctx.arc(s[0] + r * 0.35, s[1] + r * 0.35, r, 0, Math.PI * 2); ctx.fill(); });
    vis.forEach((p, k) => { const s = V.aPantalla(p.x, p.y); const rv = r * (0.86 + hash2(p.i, p.j, 3) * 0.3); ctx.fillStyle = hash2(p.i, p.j, 9) > 0.5 ? '#2F5A2A' : '#355F2C'; ctx.beginPath(); ctx.arc(s[0], s[1], rv, 0, Math.PI * 2); ctx.fill();
      if (r > 2) { ctx.fillStyle = '#4E7E3C'; ctx.beginPath(); ctx.arc(s[0] - rv * 0.22, s[1] - rv * 0.22, rv * 0.55, 0, Math.PI * 2); ctx.fill(); } });
    ctx.restore(); });
}
function dibujarRealFinca(ctx, T, V, pal) {
  const fid = T.fincaId; const f = fincas.find(x => x.id === fid) || {}; const tex = texturaReal(fid); const W = ctx.canvas.clientWidth || ctx.canvas.width, H = ctx.canvas.clientHeight || ctx.canvas.height;
  ctx.save(); ctx.fillStyle = '#5E7444'; ctx.fillRect(-5, -5, 1e5, 1e5);
  if (tex) { const p = V.aPantalla(tex.caja.x0, tex.caja.y1); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tex.cv, p[0], p[1], (tex.caja.x1 - tex.caja.x0) * V.k, (tex.caja.y1 - tex.caja.y0) * V.k); }
  dibujarViasReal(ctx, f, V); dibujarCafetos(ctx, fid, V, W, H); dibujarConstrucciones(ctx, f, V); dibujarSombrio(ctx, f, V, W, H);
  // borde del lote: brillo suave y línea clara, como en Google Earth
  ctx.restore();
}
const _dibujarFondoRelieve19 = dibujarFondoRelieve;
dibujarFondoRelieve = function (ctx, T, V, pal, opts) {
  if (!(pal && pal.real)) return _dibujarFondoRelieve19(ctx, T, V, pal, opts);
  try { dibujarRealFinca(ctx, T, V, pal); } catch (e) { dlog('✗ vista realista: ' + e.message, 'err'); return _dibujarFondoRelieve19(ctx, T, V, pal, opts); }
  if (MAQ_CURVAS_REAL) { const cf = curvasFinca(T); ctx.save(); ctx.strokeStyle = '#F6EBCB'; ctx.lineJoin = 'round'; cf.curvas.forEach(o => { ctx.globalAlpha = o.mayor ? 0.38 : 0.16; ctx.lineWidth = o.mayor ? 1 : 0.6; o.lineas.forEach(l => { trazarLinea(ctx, l, V); ctx.stroke(); }); }); ctx.restore(); }
};
let MAQ_CURVAS_REAL = false;
try { MAQ_CURVAS_REAL = localStorage.getItem('so-maq-curvas') === '1'; } catch (e) {}
// En modo realista los rótulos y la vía plana no se repiten; la paleta se cambia en el punto de dibujo
const _paletaMaqueta19 = paletaMaqueta;
paletaMaqueta = function () { const p = _paletaMaqueta19(); return MAQ_REAL ? paletaReal(p) : p; };
const _dibujarViasFinca20 = dibujarViasFinca;
dibujarViasFinca = function (ctx, f, V, pal) { if (pal && pal.real) return; return _dibujarViasFinca20(ctx, f, V, pal); };
function cambiarVistaMaqueta(v) { MAQ_REAL = v === 'real'; try { localStorage.setItem('so-maq-vista', v); } catch (e) {} if (typeof renderMapa === 'function' && vistaActual === 'mapa') renderMapa(); if (vistaActual === 'tablero' && typeof tbMaqueta === 'function') tbMaqueta(); pintarSelectorVista(); }
function cambiarCurvasReal() { MAQ_CURVAS_REAL = !MAQ_CURVAS_REAL; try { localStorage.setItem('so-maq-curvas', MAQ_CURVAS_REAL ? '1' : '0'); } catch (e) {} if (vistaActual === 'mapa') dibujarMapa(); pintarSelectorVista(); }
function pintarSelectorVista() {
  const host = document.getElementById('mp-modos'); if (!host) return; let sv = document.getElementById('mp-vista-real');
  if (!sv) { sv = document.createElement('div'); sv.id = 'mp-vista-real'; sv.className = 'capas seg'; sv.setAttribute('role', 'tablist'); sv.setAttribute('aria-label', 'Estilo de la maqueta'); host.insertAdjacentElement('afterend', sv); }
  sv.innerHTML = `<button class="${MAQ_REAL ? 'on' : ''}" onclick="cambiarVistaMaqueta('real')">Realista</button><button class="${MAQ_REAL ? '' : 'on'}" onclick="cambiarVistaMaqueta('plano')">Plano técnico</button>${MAQ_REAL ? `<button class="${MAQ_CURVAS_REAL ? 'on' : ''}" onclick="cambiarCurvasReal()" title="Mostrar curvas de nivel">Curvas</button>` : ''}`;
}
const _renderMapa19 = renderMapa;
renderMapa = function () { const r = _renderMapa19.apply(this, arguments); try { pintarSelectorVista(); } catch (e) {} return r; };

// Muestras de color de la textura realista (para vestir el relieve 3D) — promedio suavizado
function texturaRealDatos(fid) {
  const tex = texturaReal(fid); if (!tex) return null; if (tex.datos) return tex.datos;
  try { const f = Math.max(1, Math.round(1.2 / tex.mpp)); const w = Math.ceil(tex.cv.width / f), h = Math.ceil(tex.cv.height / f); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(tex.cv, 0, 0, w, h);
    tex.datos = { d: x.getImageData(0, 0, w, h).data, w, h, mpp: tex.mpp * tex.cv.width / w, caja: tex.caja }; return tex.datos; } catch (e) { return null; }
}
