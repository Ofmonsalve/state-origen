/* ================= MAQUETA REAL: forma de lotes, relieve, curvas de nivel y surcos ================= */
/* Marco de referencia: cada finca tiene un plano local en metros (x hacia el oriente, y hacia el norte).
   Un lote con forma guarda sus vértices en ese plano (dibujados, de coordenadas GPS o de un archivo KML/GeoJSON/GPX).
   Un lote sin forma se representa con un rectángulo esquemático de su área, ubicado junto a los demás.
   El relieve sale de las altitudes conocidas (vértices GPS y puntos de la finca); si no hay, se construye
   con la pendiente y la dirección de caída que se indicaron en el diseño de cada lote. */
const GEO_CACHE = new Map(); const _geoSet = GEO_CACHE.set.bind(GEO_CACHE); GEO_CACHE.set = (k, v) => { if (GEO_CACHE.size > 160) GEO_CACHE.clear(); return _geoSet(k, v); };
function geoLimpiarCache() { GEO_CACHE.clear(); }
function areaPoligono(p) { let a = 0; for (let i = 0, n = p.length; i < n; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; }
function centroidePol(p) { let a = 0, cx = 0, cy = 0; for (let i = 0, n = p.length; i < n; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n]; const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f; }
  if (Math.abs(a) < 1e-9) { const n = p.length || 1; return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n]; } return [cx / (3 * a), cy / (3 * a)]; }
function dentroPol(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) c = !c; } return c; }
function cajaPts(p) { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; }
function perimetroPol(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; }
function hashTxt(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function proyectarLL(lat, lon, ref) { return [(lon - ref.lon) * Math.cos(ref.lat * Math.PI / 180) * 111320, (lat - ref.lat) * 110574]; }
function desproyectar(x, y, ref) { return [ref.lat + y / 110574, ref.lon + x / (Math.cos(ref.lat * Math.PI / 180) * 111320)]; }

/* ---- Distribución de la finca ---- */
function dirCaida(d) { const az = (n0(d && d.orientacion) % 360) * Math.PI / 180; return [Math.sin(az), Math.cos(az)]; }   // vector hacia donde baja
function rectEsquematico(l, cx, cy) {
  const d = l.diseno || {}; const A = Math.max(0.05, n0(l.hectareas) || 0.5) * 10000; const r = Math.min(6, Math.max(0.25, n0(d.relacion) || 1.6));
  const corto = Math.sqrt(A / r), largo = A / corto;           // el lado largo sigue el contorno
  const u = dirCaida(d), v = [u[1], -u[0]];                      // u: pendiente abajo · v: a lo largo del contorno
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + v[0] * a * largo / 2 + u[0] * b * corto / 2, cy + v[1] * a * largo / 2 + u[1] * b * corto / 2]);
}
function lotesDeFinca(fincaId, incluirHist) { return lotes.filter(l => l.fincaId === fincaId && (incluirHist || activo(l))); }
function distribucionFinca(fincaId) {
  const f = fincas.find(x => x.id === fincaId) || {};
  const ls = lotesDeFinca(fincaId, true).filter(l => activo(l) || (l.forma && l.forma.pts && l.forma.pts.length >= 3));
  const key = 'dist|' + fincaId + '|' + JSON.stringify(ls.map(l => [l.id, l.hectareas, l.diseno && [l.diseno.relacion, l.diseno.orientacion], l.forma && l.forma.pts, l.estado])) + JSON.stringify(f.forma || null);
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  const conForma = ls.filter(l => l.forma && Array.isArray(l.forma.pts) && l.forma.pts.length >= 3);
  let ocupado = conForma.length ? conForma.map(l => cajaPts(l.forma.pts)).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })) : null;
  if (!ocupado && f.forma && f.forma.pts && f.forma.pts.length >= 3) ocupado = cajaPts(f.forma.pts);
  const polys = new Map(); const sinForma = [];
  ls.forEach(l => {
    if (l.forma && Array.isArray(l.forma.pts) && l.forma.pts.length >= 3) { polys.set(l.id, { poly: l.forma.pts.map(p => [n0(p[0]), n0(p[1])]), esquematico: false }); return; }
    if (activo(l)) sinForma.push(l);
  });
  // Lotes sin forma: rectángulos en una cuadrícula al oriente de lo ya dibujado
  const cols = Math.max(1, Math.ceil(Math.sqrt(sinForma.length))); const cajas = sinForma.map(l => cajaPts(rectEsquematico(l, 0, 0)));
  const anchoCol = cajas.length ? Math.max(...cajas.map(b => b.x1 - b.x0)) + 18 : 0, altoFila = cajas.length ? Math.max(...cajas.map(b => b.y1 - b.y0)) + 18 : 0;
  const x0 = ocupado ? ocupado.x1 + 30 + anchoCol / 2 : 0, y0 = ocupado ? (ocupado.y0 + ocupado.y1) / 2 + altoFila * (Math.ceil(sinForma.length / cols) - 1) / 2 : 0;
  sinForma.forEach((l, k) => { const cx = x0 + (k % cols) * anchoCol, cy = y0 - Math.floor(k / cols) * altoFila; polys.set(l.id, { poly: rectEsquematico(l, cx, cy), esquematico: true }); });
  const res = { finca: f, polys, lotes: ls.filter(l => polys.has(l.id)) };
  GEO_CACHE.set(key, res); return res;
}

/* ---- Relieve ---- */
function puntosAltitud(fincaId) {
  const f = fincas.find(x => x.id === fincaId) || {}; const pts = [];
  lotesDeFinca(fincaId, true).forEach(l => (l.forma && l.forma.pts || []).forEach(p => { if (p[2] != null && p[2] !== '' && isFinite(p[2])) pts.push([n0(p[0]), n0(p[1]), n0(p[2])]); }));
  (f.alturas || []).forEach(p => { if (isFinite(p.z)) pts.push([n0(p.x), n0(p.y), n0(p.z)]); });
  (f.puntos || []).forEach(p => { if (p.z != null && p.z !== '' && isFinite(p.z)) pts.push([n0(p.x), n0(p.y), n0(p.z)]); });
  (f.forma && f.forma.pts || []).forEach(p => { if (p[2] != null && p[2] !== '' && isFinite(p[2])) pts.push([n0(p[0]), n0(p[1]), n0(p[2])]); });
  return pts;
}
function ajustePlano(pts) {   // mínimos cuadrados z = a + b x + c y
  const n = pts.length; let sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  pts.forEach(([x, y, z]) => { sx += x; sy += y; sz += z; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; });
  const M = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], V = [sz, sxz, syz];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M); if (Math.abs(D) < 1e-6) return [sz / n, 0, 0];
  const col = k => M.map((f, i) => f.map((v, j) => j === k ? V[i] : v));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}
function terrenoFinca(fincaId) {
  const dist = distribucionFinca(fincaId); const f = dist.finca || {};
  const reales = puntosAltitud(fincaId);
  const zr = reales.map(p => p[2]); const realesUtiles = reales.length >= 3 && (Math.max(...zr) - Math.min(...zr)) > 0.5;
  const key = 'ter|' + fincaId + '|' + JSON.stringify(reales) + '|' + JSON.stringify([...dist.polys.entries()].map(([id, o]) => [id, o.poly.map(p => [Math.round(p[0]), Math.round(p[1])])])) + JSON.stringify(dist.lotes.map(l => [l.altitud, l.diseno && [l.diseno.pendiente, l.diseno.orientacion]])) + f.altitud;
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  // Caja de trabajo con margen
  let caja = null; dist.polys.forEach(o => { const b = cajaPts(o.poly); caja = caja ? { x0: Math.min(caja.x0, b.x0), y0: Math.min(caja.y0, b.y0), x1: Math.max(caja.x1, b.x1), y1: Math.max(caja.y1, b.y1) } : b; });
  if (f.forma && f.forma.pts && f.forma.pts.length >= 3) { const b = cajaPts(f.forma.pts); caja = caja ? { x0: Math.min(caja.x0, b.x0), y0: Math.min(caja.y0, b.y0), x1: Math.max(caja.x1, b.x1), y1: Math.max(caja.y1, b.y1) } : b; }
  (f.puntos || []).forEach(p => { if (!caja) caja = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; caja = { x0: Math.min(caja.x0, p.x), y0: Math.min(caja.y0, p.y), x1: Math.max(caja.x1, p.x), y1: Math.max(caja.y1, p.y) }; });
  if (!caja) caja = { x0: -50, y0: -50, x1: 50, y1: 50 };
  const m = Math.max(40, 0.45 * Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0));
  caja = { x0: caja.x0 - m, y0: caja.y0 - m, x1: caja.x1 + m, y1: caja.y1 + m };
  // Relieve: con altitudes medidas, plano de tendencia + interpolación suave de los residuos;
  // sin ellas, un plano con la pendiente y la dirección promedio de los lotes y ondulaciones suaves de ladera.
  const base = n0(f.altitud) || 1600; const sintetico = !realesUtiles; let zEn, uT = [0, -1];
  if (realesUtiles) {
    const plano = ajustePlano(reales); const resid = reales.map(([x, y, z]) => [x, y, z - (plano[0] + plano[1] * x + plano[2] * y)]);
    let nn = 0; reales.forEach((p, i) => { let m = Infinity; reales.forEach((q, j) => { if (i !== j) m = Math.min(m, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2); }); nn += Math.sqrt(m); }); nn /= reales.length; const r2 = Math.max(64, (nn * 0.8) ** 2); { const gn = Math.hypot(plano[1], plano[2]); if (gn > 1e-6) uT = [-plano[1] / gn, -plano[2] / gn]; }
    zEn = (x, y) => { let sw = 0, sv = 0; for (let k = 0; k < resid.length; k++) { const p = resid[k]; const d2 = (p[0] - x) ** 2 + (p[1] - y) ** 2; const w = 1 / ((d2 + r2) * (d2 + r2)); sw += w; sv += w * p[2]; } return plano[0] + plano[1] * x + plano[2] * y + (sw ? sv / sw : 0); };
  } else {
    let ux = 0, uy = 0, ss = 0, wt = 0; dist.lotes.forEach(l => { const d = l.diseno || {}; const w = n0(l.hectareas) || 0.5; const u = dirCaida(d); ux += u[0] * w; uy += u[1] * w; ss += Math.min(1.2, n0(d.pendiente) / 100) * w; wt += w; });
    const nu = Math.hypot(ux, uy) || 1; const u = wt ? [ux / nu, uy / nu] : [0, -1]; const sl = wt ? ss / wt : 0.25;
    const cx = (caja.x0 + caja.x1) / 2, cy = (caja.y0 + caja.y1) / 2; const v = [-u[1], u[0]];
    uT = u; const semilla = (hashTxt(fincaId || 'f') % 1000) / 97; const A = Math.max(0.8, sl * 7);
    zEn = (x, y) => { const a = (x - cx) * u[0] + (y - cy) * u[1], b = (x - cx) * v[0] + (y - cy) * v[1];
      return base - sl * a + A * Math.sin(b / 47 + semilla) * Math.cos(a / 83 - semilla * 0.7) + 0.45 * A * Math.sin(b / 23 + a / 61 + semilla * 1.9) + 0.18 * A * Math.cos(b / 11 - a / 17 + semilla); };
  }
  // Rejilla
  const ancho = caja.x1 - caja.x0, alto = caja.y1 - caja.y0;
  const c = Math.max(1, Math.sqrt(ancho * alto / 26000)); const nx = Math.ceil(ancho / c), ny = Math.ceil(alto / c);
  const Z = new Float32Array((nx + 1) * (ny + 1)); let zmin = Infinity, zmax = -Infinity;
  for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) { const z = zEn(caja.x0 + ix * c, caja.y0 + iy * c); Z[iy * (nx + 1) + ix] = z; if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
  const T = { fincaId, caja, c, nx, ny, Z, zmin, zmax, sintetico, nReales: reales.length, u: uT,
    z(x, y) { const fx = Math.min(nx - 1e-6, Math.max(0, (x - caja.x0) / c)), fy = Math.min(ny - 1e-6, Math.max(0, (y - caja.y0) / c)); const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const a = Z[iy * (nx + 1) + ix], b = Z[iy * (nx + 1) + ix + 1], d = Z[(iy + 1) * (nx + 1) + ix], e = Z[(iy + 1) * (nx + 1) + ix + 1]; return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + d * (1 - tx) * ty + e * tx * ty; },
    grad(x, y) { const h = c; return [(this.z(x + h, y) - this.z(x - h, y)) / (2 * h), (this.z(x, y + h) - this.z(x, y - h)) / (2 * h)]; } };
  GEO_CACHE.set(key, T); return T;
}

/* ---- Curvas de nivel (cuadrados marchantes) ---- */
function curvasNivel(R, niveles) {
  // R: { x0, y0, c, nx, ny, Z } ; devuelve [{ z, lineas:[[ [x,y],... ]] }]
  const { nx, ny, Z, c } = R, x0 = R.x0, y0 = R.y0, W = nx + 1;
  const porNivel = niveles.map(() => []);
  const zs = niveles.slice(); if (!zs.length) return [];
  const paso = zs.length > 1 ? zs[1] - zs[0] : 1, z0 = zs[0];
  const pt = (ax, ay, za, bx, by, zb, L) => { const t = (L - za) / ((zb - za) || 1e-9); return [x0 + (ax + (bx - ax) * t) * c, y0 + (ay + (by - ay) * t) * c]; };
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const a = Z[iy * W + ix], b = Z[iy * W + ix + 1], d = Z[(iy + 1) * W + ix], e = Z[(iy + 1) * W + ix + 1];
    const mn = Math.min(a, b, d, e), mx = Math.max(a, b, d, e);
    let k0 = Math.ceil((mn - z0) / paso), k1 = Math.floor((mx - z0) / paso); k0 = Math.max(0, k0); k1 = Math.min(zs.length - 1, k1);
    for (let k = k0; k <= k1; k++) {
      const L = zs[k] + 1e-7; const ca = (a > L ? 1 : 0) | (b > L ? 2 : 0) | (e > L ? 4 : 0) | (d > L ? 8 : 0);
      if (ca === 0 || ca === 15) continue;
      // bordes: 0 abajo (a-b), 1 derecha (b-e), 2 arriba (d-e), 3 izquierda (a-d)
      const kE = [iy * nx + ix, (nx * (ny + 1)) + iy * W + ix + 1, (iy + 1) * nx + ix, (nx * (ny + 1)) + iy * W + ix];
      const P = [() => pt(ix, iy, a, ix + 1, iy, b, L), () => pt(ix + 1, iy, b, ix + 1, iy + 1, e, L), () => pt(ix, iy + 1, d, ix + 1, iy + 1, e, L), () => pt(ix, iy, a, ix, iy + 1, d, L)];
      const seg = (p, q) => porNivel[k].push([kE[p], kE[q], P[p](), P[q]()]);
      switch (ca) {
        case 1: case 14: seg(0, 3); break; case 2: case 13: seg(0, 1); break; case 3: case 12: seg(1, 3); break;
        case 4: case 11: seg(1, 2); break; case 6: case 9: seg(0, 2); break; case 7: case 8: seg(2, 3); break;
        case 5: case 10: { const cen = (a + b + d + e) / 4; if ((cen > L) === (ca === 5)) { seg(0, 1); seg(2, 3); } else { seg(0, 3); seg(1, 2); } break; }
      }
    }
  }
  return porNivel.map((segs, k) => ({ z: zs[k], lineas: encadenar(segs) }));
}
function encadenar(segs) {
  const ady = new Map(); segs.forEach((s, i) => { [s[0], s[1]].forEach(e => { const l = ady.get(e); if (l) l.push(i); else ady.set(e, [i]); }); });
  const usado = new Uint8Array(segs.length); const out = [];
  const caminar = (i0, desde) => { const linea = []; let i = i0, e = desde;
    const s0 = segs[i0]; if (s0[0] === desde) { linea.push(s0[2]); } else linea.push(s0[3]);
    while (i != null && !usado[i]) { usado[i] = 1; const s = segs[i]; const otro = s[0] === e ? s[1] : s[0]; linea.push(s[0] === e ? s[3] : s[2]); e = otro; const sig = (ady.get(e) || []).find(j => !usado[j]); i = sig; }
    return linea; };
  ady.forEach((l, e) => { if (l.length === 1 && !usado[l[0]]) out.push(caminar(l[0], e)); });
  segs.forEach((s, i) => { if (!usado[i]) out.push(caminar(i, s[0])); });
  return out.filter(l => l.length >= 2);
}
function recortarLinea(linea, poly, caja) {   // trozos de la línea dentro del polígono
  const trozos = []; let act = null; const cj = caja || cajaPts(poly); const dentro = (x, y) => x >= cj.x0 && x <= cj.x1 && y >= cj.y0 && y <= cj.y1 && dentroPol(x, y, poly);
  const corte = (p, q) => { let a = p, b = q; const ina = dentro(a[0], a[1]); for (let k = 0; k < 14; k++) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (dentro(m[0], m[1]) === ina) a = m; else b = m; } return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  for (let k = 0; k < linea.length; k++) { const p = linea[k]; const dn = dentro(p[0], p[1]);
    if (dn) { if (!act) { act = []; if (k > 0) act.push(corte(linea[k - 1], p)); } act.push(p); }
    else if (act) { act.push(corte(linea[k - 1], p)); trozos.push(act); act = null; } }
  if (act) trozos.push(act);
  return trozos.filter(t => t.length >= 2);
}
function largoLinea(l) { let s = 0; for (let k = 1; k < l.length; k++) s += Math.hypot(l[k][0] - l[k - 1][0], l[k][1] - l[k - 1][1]); return s; }
function puntosALoLargo(l, paso, inicio) {
  const out = []; let s = inicio, acc = 0;
  for (let k = 1; k < l.length; k++) { const a = l[k - 1], b = l[k]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (s <= acc + d && d > 0) { const t = (s - acc) / d; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, s]); s += paso; } acc += d; }
  return out;
}
function suavizar(l, it) { let p = l; for (let r = 0; r < (it || 2); r++) { if (p.length < 3) return p; const q = [p[0]]; for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } q.push(p[p.length - 1]); p = q; } return p; }
function rasterRegion(T, caja, c) {   // rejilla de altitudes recortada a una caja, con celda c
  const nx = Math.max(2, Math.ceil((caja.x1 - caja.x0) / c)), ny = Math.max(2, Math.ceil((caja.y1 - caja.y0) / c)); const Z = new Float32Array((nx + 1) * (ny + 1));
  for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) Z[iy * (nx + 1) + ix] = T.z(caja.x0 + ix * c, caja.y0 + iy * c);
  return { x0: caja.x0, y0: caja.y0, c, nx, ny, Z };
}
function lineasRectas(poly, n, dir, sep) {   // líneas paralelas (dirección dir, separadas sep a lo largo de n) recortadas
  const ts = poly.map(p => p[0] * n[0] + p[1] * n[1]); const t0 = Math.min(...ts), t1 = Math.max(...ts); const out = [];
  for (let t = t0 + sep / 2; t < t1; t += sep) {
    const xs = [];
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ta = a[0] * n[0] + a[1] * n[1] - t, tb = b[0] * n[0] + b[1] * n[1] - t;
      if ((ta > 0) !== (tb > 0)) { const f = ta / (ta - tb); const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; xs.push([p, p[0] * dir[0] + p[1] * dir[1]]); } }
    xs.sort((a, b) => a[1] - b[1]);
    for (let k = 0; k + 1 < xs.length; k += 2) out.push({ t, linea: [xs[k][0], xs[k + 1][0]] });
  }
  return out;
}

/* ---- Geometría de un lote ---- */
function polyLote(l) { if (!l) return null; const dist = distribucionFinca(l.fincaId); const o = dist.polys.get(l.id); return o ? o : null; }
function geomLote(l) {
  const d = l && l.diseno; if (!d || !n0(d.distSurcos) || !n0(d.distPlantas)) return null;
  const o = polyLote(l); if (!o) { if (!n0(l.hectareas)) return null; }
  const poly = o ? o.poly : rectEsquematico(l, 0, 0);
  const T = terrenoFinca(l.fincaId);
  const key = 'geo|' + l.id + '|' + JSON.stringify([d, l.codigo, l.nombre, l.hectareas, poly.map(p => [redondear(p[0], 2), redondear(p[1], 2)])]) + '|' + T.zmin + '|' + T.zmax + '|' + T.nReales;
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  const ds = n0(d.distSurcos), dp = n0(d.distPlantas);
  const caja = cajaPts(poly); const haForma = areaPoligono(poly) / 10000;
  // Pendiente media dentro del lote
  let gx = 0, gy = 0, nG = 0, zmn = Infinity, zmx = -Infinity; const pasoG = Math.max(1.2, Math.sqrt((caja.x1 - caja.x0) * (caja.y1 - caja.y0) / 900));
  poly.forEach(p => { const z = T.z(p[0], p[1]); zmn = Math.min(zmn, z); zmx = Math.max(zmx, z); });
  for (let y = caja.y0 + pasoG / 2; y < caja.y1; y += pasoG) for (let x = caja.x0 + pasoG / 2; x < caja.x1; x += pasoG) if (dentroPol(x, y, poly)) { const g = T.grad(x, y); gx += g[0]; gy += g[1]; nG++; const z = T.z(x, y); if (z < zmn) zmn = z; if (z > zmx) zmx = z; }
  if (nG) { gx /= nG; gy /= nG; }
  let pend = Math.hypot(gx, gy); let u = pend > 1e-4 ? [-gx / pend, -gy / pend] : dirCaida(d); if (pend < 1e-4) pend = n0(d.pendiente) / 100;
  const trazado = d.trazado || 'contorno';
  const izq = [-u[1], u[0]];
  let filas = [];
  if (trazado === 'contorno' && pend >= 0.03) {
    const c = Math.max(0.35, Math.min(1.2, Math.min(ds, dp) / 1.6));
    const R = rasterRegion(T, { x0: caja.x0 - c * 2, y0: caja.y0 - c * 2, x1: caja.x1 + c * 2, y1: caja.y1 + c * 2 }, c);
    const dh = ds * pend; const niveles = []; for (let z = zmx - dh / 2 + dh; z > zmn - dh; z -= dh) niveles.push(z); niveles.reverse();
    const cn = curvasNivel(R, niveles);
    cn.slice().reverse().forEach(nv => { nv.lineas.forEach(li => recortarLinea(li, poly, caja).forEach(tr => filas.push({ orden: -nv.z, linea: tr }))); });
  } else {
    const dirFila = trazado === 'pendiente' ? u : izq, nrm = trazado === 'pendiente' ? izq : u;
    filas = lineasRectas(poly, nrm, dirFila, ds).map(f => ({ orden: f.t, linea: f.linea }));
  }
  // Ordenar: de arriba hacia abajo y, en cada nivel, de izquierda a derecha mirando hacia la pendiente
  filas.forEach(f => { const m = f.linea[Math.floor(f.linea.length / 2)]; f.lat = m[0] * izq[0] + m[1] * izq[1];
    const a = f.linea[0], b = f.linea[f.linea.length - 1]; if ((a[0] - b[0]) * izq[0] + (a[1] - b[1]) * izq[1] < 0) f.linea = f.linea.slice().reverse(); });
  filas.sort((a, b) => (a.orden - b.orden) || (b.lat - a.lat));
  const cod = codigoLote(l); const surcos = [], plantas = [], idx = new Map(); let i = 0, nP = 0;
  filas.forEach(f => { const L = largoLinea(f.linea); if (L < dp * 0.6) return; i++; const pts = puntosALoLargo(f.linea, dp, Math.min(dp / 2, L / 2)); const fila = { i, linea: f.linea, largo: L, plantas: [] };
    pts.forEach((p, k) => { const pl = { i, j: k + 1, x: p[0], y: p[1], s: p[2], cod: cod + '-S' + String(i).padStart(2, '0') + '-P' + String(k + 1).padStart(3, '0') }; fila.plantas.push(pl); plantas.push(pl); idx.set(pl.cod, pl); });
    nP = Math.max(nP, pts.length); surcos.push(fila); });
  // Índice espacial para ubicar plantas al tocar
  const celda = Math.max(ds, dp) * 1.5; const malla = new Map();
  plantas.forEach(p => { const k = Math.floor(p.x / celda) + ',' + Math.floor(p.y / celda); const a = malla.get(k); if (a) a.push(p); else malla.set(k, [p]); });
  let zl = [Infinity, -Infinity]; poly.forEach(p => { const z = T.z(p[0], p[1]); zl = [Math.min(zl[0], z), Math.max(zl[1], z)]; });
  const ha = (o && !o.esquematico) ? haForma : (n0(l.hectareas) || haForma);
  const g = { cod, ds, dp, pend: pend * 100, u, izq, contorno: trazado === 'contorno', trazado, poly, caja, haForma, ha, esquematico: !o || o.esquematico,
    surcos, plantas, idx, malla, celda, nS: surcos.length, nP, total: plantas.length, zmin: zl[0], zmax: zl[1], fincaId: l.fincaId, terreno: T };
  GEO_CACHE.set(key, g); return g;
}
function posPlanta(g, i, j) { const p = g && g.idx.get(g.cod + '-S' + String(i).padStart(2, '0') + '-P' + String(j).padStart(3, '0')); return p ? { x: p.x, y: p.y, s: p.s } : null; }
function plantaCercana(g, x, y, radio) {
  const k0 = Math.floor(x / g.celda), k1 = Math.floor(y / g.celda); let mejor = null, dmin = radio == null ? Math.max(g.ds, g.dp) * 0.65 : radio;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) (g.malla.get((k0 + a) + ',' + (k1 + b)) || []).forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < dmin) { dmin = d; mejor = p; } });
  return mejor;
}
function codigoValido(g, cod) { return !!(g && g.idx.has(cod)); }
function puntosMuestreo(g, n, semilla) {
  const rnd = mulberry32(semilla || 7);
  const vivas = g.plantas.filter(p => { const m = typeof marcaDe === 'function' ? marcaDe(p.cod) : null; return !(m && m.estado === 'Faltante'); });
  n = Math.max(1, Math.min(n, vivas.length || g.total));
  // Evitar bordes: primeras y últimas dos plantas de cada surco, y los dos surcos extremos
  const nucleo = vivas.filter(p => { const s = g.surcos[p.i - 1]; return (g.nS <= 8 || (p.i > 2 && p.i < g.nS - 1)) && (s.plantas.length <= 8 || (p.j > 2 && p.j <= s.plantas.length - 2)); });
  const base = nucleo.length >= n ? nucleo : (vivas.length ? vivas : g.plantas);
  const b = g.caja; const asp = (b.x1 - b.x0) / ((b.y1 - b.y0) || 1); let cols = Math.max(1, Math.round(Math.sqrt(n * asp))), filas = Math.max(1, Math.ceil(n / cols));
  const celdas = new Map(); base.forEach(p => { const c = Math.min(cols - 1, Math.floor((p.x - b.x0) / ((b.x1 - b.x0) || 1) * cols)), r = Math.min(filas - 1, Math.floor((p.y - b.y0) / ((b.y1 - b.y0) || 1) * filas)); const k = r * cols + c; const a = celdas.get(k); if (a) a.push(p); else celdas.set(k, [p]); });
  const elegidos = new Set(); const grupos = [...celdas.values()].sort((a, b2) => b2.length - a.length);
  for (const gr of grupos) { if (elegidos.size >= n) break; elegidos.add(gr[Math.floor(rnd() * gr.length)].cod); }
  let guard = 0; while (elegidos.size < n && guard++ < n * 50) elegidos.add(base[Math.floor(rnd() * base.length)].cod);
  return [...elegidos].sort((a, b2) => { const pa = parseCodigo(a), pb = parseCodigo(b2); return pa.i - pb.i || pa.j - pb.j; });
}

/* ---- Interpolación espacial para mapas de calor ---- */
const SUP_CACHE = new Map();
function superficieCalor(g, v, celdaObjetivo) {
  const kS = g.fincaId + '|' + g.cod + '|' + g.total + '|' + g.poly.length + '|' + v + '|' + (celdaObjetivo || 0) + '|' + (typeof _versionDatos !== 'undefined' ? _versionDatos : 0) + '|' + muestreos.length + '|' + marcasPlanta.length;
  if (SUP_CACHE.has(kS)) return SUP_CACHE.get(kS); if (SUP_CACHE.size > 120) SUP_CACHE.clear();
  const r = superficieCalor0(g, v, celdaObjetivo); SUP_CACHE.set(kS, r); return r;
}
function superficieCalor0(g, v, celdaObjetivo) {
  // Rejilla regular sobre la caja del lote: vals (NaN fuera de alcance), celdas dentro del lote, y en(x,y) para consultar.
  const l = lotes.find(x => x.fincaId === g.fincaId && codigoLote(x) === g.cod) || null; const loteId = l ? l.id : null; const b = g.caja;
  const c = celdaObjetivo || Math.max(0.8, Math.sqrt((b.x1 - b.x0) * (b.y1 - b.y0) / 900));
  const nx = Math.max(1, Math.ceil((b.x1 - b.x0) / c)), ny = Math.max(1, Math.ceil((b.y1 - b.y0) / c));
  const base = { g, c, nx, ny, x0: b.x0, y0: b.y0, celdas: [], pts: [], vals: null };
  let valor;
  if (v === 'faltantes') {
    const fal = marcasPlanta.filter(mk => mk.loteId === loteId && mk.estado === 'Faltante').map(mk => g.idx.get(mk.codigo)).filter(Boolean);
    base.pts = fal.map(p => ({ x: p.x, y: p.y, cod: p.cod, i: p.i, j: p.j })); base.faltantes = fal.length; base.n = fal.length; base.prom = g.total ? fal.length / g.total * 100 : 0; base.campana = null;
    const R = Math.max(4, 2.2 * Math.max(g.ds, g.dp)); const esperadas = Math.PI * R * R / (g.ds * g.dp);
    valor = (x, y) => { let k = 0; for (const p of fal) { const d = Math.hypot(p.x - x, p.y - y); if (d < R) k += 1 - (d / R) ** 2; } return Math.min(100, k / (esperadas * 0.5) * 100); };
  } else {
    const campana = loteId ? ultimaCampana(loteId, v) : null; base.campana = campana;
    if (!campana) return Object.assign(base, { sinDatos: true, en: () => null });
    base.pts = campana.regs.map(rg => { const p = g.idx.get(rg.codigo); return p ? { x: p.x, y: p.y, v: n0(rg.valor), cod: rg.codigo, i: p.i, j: p.j, op: rg.opcion } : null; }).filter(Boolean);
    if (!base.pts.length) return Object.assign(base, { sinDatos: true, en: () => null });
    base.n = base.pts.length; base.prom = campana.prom; const h = Math.max(g.ds, g.dp) * 3; const pts = base.pts;
    valor = (x, y) => { let sw = 0, sv = 0; for (const p of pts) { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < 0.04) return p.v; const w = 1 / (d2 + h * h) ** 1.5; sw += w; sv += w * p.v; } return sv / sw; };
  }
  const vals = new Float32Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) { const x = b.x0 + (ix + 0.5) * c, y = b.y0 + (iy + 0.5) * c; const v2 = valor(x, y); vals[iy * nx + ix] = v2; if (dentroPol(x, y, g.poly)) base.celdas.push({ x, y, v: v2 }); }
  base.vals = vals;
  base.en = (x, y) => { const ix = Math.floor((x - b.x0) / c), iy = Math.floor((y - b.y0) / c); if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) return null; return vals[iy * nx + ix]; };
  return base;
}
