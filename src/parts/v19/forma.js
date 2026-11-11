/* ---- Editor de forma: lote o finca (límite y puntos) ---- */
if (!CAPAS.some(c => c[0] === 'faltantes')) CAPAS.splice(CAPAS.findIndex(c => c[0] === 'marcas'), 0, ['faltantes', 'Faltantes']);
const TIPOS_PUNTO = Object.keys(ICONO_PUNTO);
let edF = null;   // { tipo:'lote'|'finca', id, fincaId, pts:[[x,y,z]], puntos:[], vista:{zoom,panX,panY}, arrastre, modo:'forma'|'punto', tab }
function abrirEditorForma(tipo) {
  const l = loteMapa(); const f = fincaMapa() || (l && fincas.find(x => x.id === l.fincaId));
  if (tipo === 'lote' && !l) { alert('Elija un lote.'); return; }
  if (!f) { alert('Primero cree la finca.'); return; }
  let pts = [];
  if (tipo === 'lote') pts = l.forma && l.forma.pts && l.forma.pts.length >= 3 ? clonar(l.forma.pts) : [];
  else pts = f.forma && f.forma.pts ? clonar(f.forma.pts) : [];
  edF = { tipo, id: tipo === 'lote' ? l.id : f.id, fincaId: f.id, pts, puntos: clonar(f.puntos || []), vista: { zoom: 1, panX: 0, panY: 0 }, modo: 'forma', tab: 'dibujo', caja: null };
  edF.caja = cajaEditor();
  const nombre = tipo === 'lote' ? 'lote ' + l.nombre : 'finca ' + f.nombre;
  openModal(`
    <h3>Forma del ${esc(nombre)}</h3>
    <p class="hint">Dibuje la forma tocando las esquinas sobre el plano, pegue coordenadas del GPS o importe un archivo de Google Earth, Avenza o una app de GPS (KML, GeoJSON o GPX). Con altitudes, la maqueta calcula el relieve real.</p>
    <div class="capas" role="tablist" id="ef-tabs" style="margin-bottom:12px;">
      <button class="on" data-t="dibujo" onclick="efTab('dibujo')">Dibujar</button><button data-t="gps" onclick="efTab('gps')">Coordenadas GPS</button><button data-t="archivo" onclick="efTab('archivo')">Archivo</button>
    </div>
    <div class="ef-layout">
      <div class="ef-lienzo"><canvas id="ef-canvas"></canvas>
        <div class="mapa-zoom"><button class="icon-btn" onclick="efZoom(1.3)" aria-label="Acercar">+</button><button class="icon-btn" onclick="efZoom(1/1.3)" aria-label="Alejar">−</button></div>
      </div>
      <div class="ef-panel">
        <div id="ef-tab-dibujo">
          ${tipo === 'finca' ? `<div class="capas" style="margin-bottom:10px;"><button id="ef-m-forma" class="on" onclick="efModo('forma')">Límite</button><button id="ef-m-punto" onclick="efModo('punto')">Puntos</button></div>` : ''}
          <p class="hint" id="ef-ayuda" style="margin:0 0 10px;"></p>
          <div class="ef-btns"><button class="btn ghost small" onclick="efDeshacer()">Quitar último punto</button><button class="btn ghost small" onclick="efLimpiar()">Empezar de nuevo</button>${tipo === 'lote' ? '<button class="btn ghost small" onclick="efRectangulo()">Partir de un rectángulo</button>' : ''}</div>
          <div id="ef-puntos-lista" style="margin-top:10px;"></div>
        </div>
        <div id="ef-tab-gps" hidden>
          <label class="f">Una esquina por línea: latitud, longitud y altitud (opcional)<textarea id="ef-gps" rows="8" placeholder="6.25184, -75.56359, 1720&#10;6.25210, -75.56301, 1735&#10;6.25162, -75.56270, 1748"></textarea></label>
          <button class="btn primary small" style="margin-top:8px;" onclick="efUsarGPS()">Usar estas coordenadas</button>
          <p class="hint" style="margin:8px 0 0;">Recorra el borde del lote con el celular y anote cada esquina; sirve la app de mapas o cualquier app de GPS. Decimales con punto.</p>
        </div>
        <div id="ef-tab-archivo" hidden>
          <input type="file" id="ef-archivo" accept=".kml,.geojson,.json,.gpx,application/vnd.google-earth.kml+xml,application/json" onchange="efLeerArchivo(this.files[0])">
          <div id="ef-arch-res" style="margin-top:10px;"></div>
        </div>
        <div class="budget-box" id="ef-res" style="margin-top:12px;"></div>
      </div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button>${tipo === 'lote' && l.forma ? '<button class="btn danger-ghost" onclick="efQuitarForma()">Volver a esquemático</button>' : ''}<button class="btn primary" onclick="efGuardar()">Guardar forma</button></div>`, true);
  efPrepararCanvas(); efPintar();
}
function cajaEditor() {
  const dist = distribucionFinca(edF.fincaId); let b = null; const add = q => { b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : q; };
  dist.polys.forEach(o => add(cajaPts(o.poly))); if (edF.pts.length) add(cajaPts(edF.pts)); edF.puntos.forEach(p => add({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }));
  if (!b) b = { x0: -60, y0: -60, x1: 60, y1: 60 }; const m = Math.max(15, 0.15 * Math.max(b.x1 - b.x0, b.y1 - b.y0)); return { x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m };
}
function efTab(t) { edF.tab = t; document.querySelectorAll('#ef-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); ['dibujo', 'gps', 'archivo'].forEach(k => { const e = document.getElementById('ef-tab-' + k); if (e) e.hidden = k !== t; }); }
function efModo(m) { edF.modo = m; ['forma', 'punto'].forEach(k => { const b = document.getElementById('ef-m-' + k); if (b) b.classList.toggle('on', k === m); }); efPintar(); }
function efZoom(f) { edF.vista.zoom = Math.min(30, Math.max(0.3, edF.vista.zoom * f)); efPintar(); }
function efDeshacer() { if (edF.modo === 'punto') edF.puntos.pop(); else edF.pts.pop(); efPintar(); }
function efLimpiar() { if (edF.modo === 'punto') edF.puntos = []; else edF.pts = []; efPintar(); }
function efRectangulo() { const l = lotes.find(x => x.id === edF.id); const o = distribucionFinca(edF.fincaId).polys.get(edF.id); const c = o ? centroidePol(o.poly) : [0, 0]; edF.pts = rectEsquematico(l, c[0], c[1]).map(p => [redondear(p[0], 2), redondear(p[1], 2), null]); efPintar(); }
function efV() { const cv = document.getElementById('ef-canvas'); const W = cv.clientWidth || 600, H = cv.clientHeight || 420; return vistaPlano(edF.caja, W, H, edF.vista, 24); }
function efPintar() {
  const cv = document.getElementById('ef-canvas'); if (!cv) return; const W = cv.clientWidth || 600, H = cv.clientHeight || 420; const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr;
  const area = edF.pts.length >= 3 ? areaPoligono(edF.pts) : 0;
  const ay = document.getElementById('ef-ayuda'); if (ay) ay.textContent = edF.modo === 'punto' ? 'Toque el plano para ubicar la casa, el beneficiadero, la marquesina u otro punto. Arrastre un punto para moverlo.' : 'Toque para agregar esquinas en orden alrededor del borde. Arrastre una esquina para moverla; toque el punto medio de un lado para insertar una esquina.';
  const l = edF.tipo === 'lote' ? lotes.find(x => x.id === edF.id) : null;
  const res = document.getElementById('ef-res');
  if (res) res.innerHTML = `<div><div class="n">${edF.pts.length}</div><div class="l">Esquinas</div></div><div><div class="n">${num(redondear(area / 10000, 3))} ha</div><div class="l">Área de la forma</div></div><div><div class="n">${num(Math.round(edF.pts.length >= 3 ? perimetroPol(edF.pts) : 0))} m</div><div class="l">Perímetro</div></div>${l ? `<div class="total"><div class="n">${num(l.hectareas || 0)} ha</div><div class="l">Área registrada${area && n0(l.hectareas) ? ' · ' + (area / 10000 - n0(l.hectareas) >= 0 ? '+' : '') + num(Math.round((area / 10000 - n0(l.hectareas)) / n0(l.hectareas) * 100)) + '%' : ''}</div></div>` : `<div class="total"><div class="n">${edF.puntos.length}</div><div class="l">Puntos de la finca</div></div>`}`;
  const lista = document.getElementById('ef-puntos-lista');
  if (lista) lista.innerHTML = edF.tipo === 'finca' && edF.puntos.length ? edF.puntos.map((p, i) => `<div class="ef-pt"><select onchange="edF.puntos[${i}].tipo=this.value;efPintar()">${TIPOS_PUNTO.map(t => `<option ${p.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select><input value="${esc(p.nombre || '')}" placeholder="Nombre" oninput="edF.puntos[${i}].nombre=this.value"><input type="number" value="${p.z == null ? '' : p.z}" placeholder="msnm" oninput="edF.puntos[${i}].z=this.value===''?null:Number(this.value)"><button class="btn danger-ghost" onclick="edF.puntos.splice(${i},1);efPintar()">✕</button></div>`).join('') : '';
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pal = paletaMaqueta(); const V = efV(); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  // Cuadrícula de 10 m
  const paso = [5, 10, 20, 50, 100].find(m => m * V.k >= 40) || 100; const a = V.aMundo(0, H), b = V.aMundo(W, 0);
  ctx.strokeStyle = pal.surco; ctx.lineWidth = 1; for (let x = Math.floor(a[0] / paso) * paso; x <= b[0]; x += paso) { const s = V.aPantalla(x, 0); ctx.beginPath(); ctx.moveTo(s[0], 0); ctx.lineTo(s[0], H); ctx.stroke(); }
  for (let y = Math.floor(a[1] / paso) * paso; y <= b[1]; y += paso) { const s = V.aPantalla(0, y); ctx.beginPath(); ctx.moveTo(0, s[1]); ctx.lineTo(W, s[1]); ctx.stroke(); }
  // Otros lotes
  const dist = distribucionFinca(edF.fincaId);
  dist.lotes.forEach(o => { if (edF.tipo === 'lote' && o.id === edF.id) return; const pp = dist.polys.get(o.id); ctx.save(); trazarPoligono(ctx, pp.poly, V); ctx.fillStyle = pal.bosque; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 0.7; ctx.strokeStyle = pal.suave; ctx.setLineDash(pp.esquematico ? [5, 4] : []); ctx.stroke(); ctx.restore();
    const c = centroidePol(pp.poly), s = V.aPantalla(c[0], c[1]); ctx.fillStyle = pal.suave; ctx.font = '600 11px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.nombre + (pp.esquematico ? ' (esquemático)' : ''), s[0], s[1]); });
  if (edF.tipo === 'lote') { const f = fincas.find(x => x.id === edF.fincaId); if (f && f.forma && f.forma.pts) { ctx.save(); trazarPoligono(ctx, f.forma.pts, V); ctx.setLineDash([8, 5]); ctx.strokeStyle = pal.texto; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.restore(); } }
  // Forma en edición
  if (edF.pts.length) {
    ctx.save(); trazarPoligono(ctx, edF.pts, V); if (edF.pts.length >= 3) { ctx.fillStyle = pal.acento; ctx.globalAlpha = 0.16; ctx.fill(); } ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = pal.acento; if (edF.tipo === 'finca') ctx.setLineDash([8, 5]); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    edF.pts.forEach((p, i) => { const q = edF.pts[(i + 1) % edF.pts.length]; if (edF.pts.length >= 2 && (i < edF.pts.length - 1 || edF.pts.length >= 3)) { const m = V.aPantalla((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.arc(m[0], m[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = pal.acento; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = pal.suave; ctx.fillText(num(redondear(Math.hypot(q[0] - p[0], q[1] - p[1]), 1)) + ' m', m[0], m[1] - 11); }
      const s = V.aPantalla(p[0], p[1]); ctx.fillStyle = pal.acento; ctx.beginPath(); ctx.arc(s[0], s[1], 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = pal.acentoTinta; ctx.font = '700 8.5px "JetBrains Mono", monospace'; ctx.fillText(String(i + 1), s[0], s[1] + 0.5); ctx.font = '500 10px "JetBrains Mono", monospace';
      if (p[2] != null && p[2] !== '') { ctx.fillStyle = pal.texto; ctx.fillText(Math.round(p[2]) + ' m', s[0], s[1] + 14); } });
    ctx.restore();
  }
  dibujarPuntosFinca(ctx, { puntos: edF.puntos }, V, pal);
  dibujarEscalaNorte(ctx, W, H, V.k, pal);
}
function efPrepararCanvas() {
  const cv = document.getElementById('ef-canvas'); if (!cv) return; let arr = null;
  const cerca = (sx, sy) => { const V = efV(); if (edF.modo === 'punto') { const i = edF.puntos.findIndex(p => { const s = V.aPantalla(p.x, p.y); return Math.hypot(s[0] - sx, s[1] - sy) < 12; }); return i >= 0 ? { tipo: 'punto', i } : null; }
    let i = edF.pts.findIndex(p => { const s = V.aPantalla(p[0], p[1]); return Math.hypot(s[0] - sx, s[1] - sy) < 11; }); if (i >= 0) return { tipo: 'vertice', i };
    if (edF.pts.length >= 3) for (let k = 0; k < edF.pts.length; k++) { const p = edF.pts[k], q = edF.pts[(k + 1) % edF.pts.length]; const m = V.aPantalla((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); if (Math.hypot(m[0] - sx, m[1] - sy) < 9) return { tipo: 'medio', i: k }; }
    return null; };
  cv.addEventListener('pointerdown', e => { const [x, y] = posCanvas(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} arr = { x, y, objetivo: cerca(x, y), px: edF.vista.panX, py: edF.vista.panY, movido: false };
    if (arr.objetivo && arr.objetivo.tipo === 'medio') { const k = arr.objetivo.i; const p = edF.pts[k], q = edF.pts[(k + 1) % edF.pts.length]; edF.pts.splice(k + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, null]); arr.objetivo = { tipo: 'vertice', i: k + 1 }; efPintar(); } });
  cv.addEventListener('pointermove', e => { if (!arr) return; const [x, y] = posCanvas(e); if (Math.abs(x - arr.x) + Math.abs(y - arr.y) > 3) arr.movido = true; if (!arr.movido) return;
    const V = efV(); const w = V.aMundo(x, y);
    if (arr.objetivo && arr.objetivo.tipo === 'vertice') { const p = edF.pts[arr.objetivo.i]; p[0] = redondear(w[0], 2); p[1] = redondear(w[1], 2); }
    else if (arr.objetivo && arr.objetivo.tipo === 'punto') { const p = edF.puntos[arr.objetivo.i]; p.x = redondear(w[0], 2); p.y = redondear(w[1], 2); }
    else { edF.vista.panX = arr.px + (x - arr.x); edF.vista.panY = arr.py + (y - arr.y); }
    efPintar(); });
  cv.addEventListener('pointerup', e => { if (!arr) return; const [x, y] = posCanvas(e);
    if (!arr.movido && !arr.objetivo) { const w = efV().aMundo(x, y);
      if (edF.modo === 'punto') edF.puntos.push({ id: uid('pt'), tipo: 'Casa', nombre: '', x: redondear(w[0], 2), y: redondear(w[1], 2), z: null });
      else edF.pts.push([redondear(w[0], 2), redondear(w[1], 2), null]);
      efPintar(); }
    arr = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); efZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
}
function refGeo(fincaId, latlons) {
  const f = fincas.find(x => x.id === fincaId); if (f.geoRef && isFinite(f.geoRef.lat)) return f.geoRef;
  const lat = latlons.reduce((a, p) => a + p[0], 0) / latlons.length, lon = latlons.reduce((a, p) => a + p[1], 0) / latlons.length;
  f.geoRef = { lat: redondear(lat, 6), lon: redondear(lon, 6) }; return f.geoRef;
}
function parsearCoordenadas(txt) {
  return String(txt || '').split(/\n+/).map(li => li.trim()).filter(Boolean).map(li => { const n = li.replace(/[;\t]/g, ',').split(/[,\s]+/).filter(Boolean).map(Number); return n.length >= 2 && n.every(isFinite) ? n : null; }).filter(Boolean)
    .map(n => (Math.abs(n[0]) > 90 && Math.abs(n[1]) <= 90) ? [n[1], n[0], n[2]] : [n[0], n[1], n[2]]);
}
function efUsarGPS() {
  const ll = parsearCoordenadas(document.getElementById('ef-gps').value);
  if (ll.length < 3) { alert('Se necesitan al menos tres esquinas con latitud y longitud.'); return; }
  const ref = refGeo(edF.fincaId, ll); edF.pts = ll.map(p => { const q = proyectarLL(p[0], p[1], ref); return [redondear(q[0], 2), redondear(q[1], 2), p[2] == null || !isFinite(p[2]) ? null : p[2]]; });
  edF.fuente = 'GPS'; edF.caja = cajaEditor(); edF.vista = { zoom: 1, panX: 0, panY: 0 }; efTab('dibujo'); efPintar(); toast(ll.length + ' esquinas ubicadas');
}
/* Lectura de KML, GeoJSON y GPX */
function leerGeoArchivo(texto, nombre) {
  const feats = []; const ext = String(nombre || '').toLowerCase().split('.').pop();
  const num3 = s => s.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(a => a.length >= 2 && isFinite(a[0]) && isFinite(a[1])).map(a => [a[1], a[0], a[2]]);
  if (ext === 'json' || ext === 'geojson' || texto.trim().startsWith('{')) {
    const j = JSON.parse(texto); const lista = j.type === 'FeatureCollection' ? j.features : (j.type === 'Feature' ? [j] : [{ type: 'Feature', properties: {}, geometry: j }]);
    lista.forEach((ft, i) => { const g = ft.geometry || {}; const nom = (ft.properties && (ft.properties.name || ft.properties.nombre || ft.properties.Name)) || ('Elemento ' + (i + 1));
      const anillo = c => c.map(p => [p[1], p[0], p[2]]);
      if (g.type === 'Polygon') feats.push({ nombre: nom, tipo: 'poligono', ll: anillo(g.coordinates[0]) });
      else if (g.type === 'MultiPolygon') g.coordinates.forEach((pc, k) => feats.push({ nombre: nom + (g.coordinates.length > 1 ? ' ' + (k + 1) : ''), tipo: 'poligono', ll: anillo(pc[0]) }));
      else if (g.type === 'LineString') feats.push({ nombre: nom, tipo: 'linea', ll: anillo(g.coordinates) });
      else if (g.type === 'Point') feats.push({ nombre: nom, tipo: 'punto', ll: [[g.coordinates[1], g.coordinates[0], g.coordinates[2]]] }); });
  } else {
    const doc = new DOMParser().parseFromString(texto, 'application/xml'); if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo no es un XML válido');
    if (ext === 'gpx' || doc.documentElement.nodeName.toLowerCase() === 'gpx') {
      const toLL = el => [Number(el.getAttribute('lat')), Number(el.getAttribute('lon')), el.getElementsByTagName('ele')[0] ? Number(el.getElementsByTagName('ele')[0].textContent) : null];
      [...doc.getElementsByTagName('trk')].forEach((t, i) => { const pts = [...t.getElementsByTagName('trkpt')].map(toLL); const nm = t.getElementsByTagName('name')[0]; if (pts.length >= 3) feats.push({ nombre: nm ? nm.textContent : 'Recorrido ' + (i + 1), tipo: 'poligono', ll: pts }); });
      [...doc.getElementsByTagName('rte')].forEach((t, i) => { const pts = [...t.getElementsByTagName('rtept')].map(toLL); const nm = t.getElementsByTagName('name')[0]; if (pts.length >= 3) feats.push({ nombre: nm ? nm.textContent : 'Ruta ' + (i + 1), tipo: 'poligono', ll: pts }); });
      [...doc.getElementsByTagName('wpt')].forEach((w, i) => { const nm = w.getElementsByTagName('name')[0]; feats.push({ nombre: nm ? nm.textContent : 'Punto ' + (i + 1), tipo: 'punto', ll: [toLL(w)] }); });
    } else {
      [...doc.getElementsByTagName('Placemark')].forEach((pm, i) => { const nm = pm.getElementsByTagName('name')[0]; const nom = nm ? nm.textContent.trim() : 'Elemento ' + (i + 1);
        const pols = [...pm.getElementsByTagName('Polygon')]; pols.forEach((pg, k) => { const ob = pg.getElementsByTagName('outerBoundaryIs')[0] || pg; const co = ob.getElementsByTagName('coordinates')[0]; if (co) feats.push({ nombre: nom + (pols.length > 1 ? ' ' + (k + 1) : ''), tipo: 'poligono', ll: num3(co.textContent) }); });
        if (!pols.length) { const ls = pm.getElementsByTagName('LineString')[0], pt = pm.getElementsByTagName('Point')[0];
          if (ls) { const co = ls.getElementsByTagName('coordinates')[0]; if (co) feats.push({ nombre: nom, tipo: 'linea', ll: num3(co.textContent) }); }
          else if (pt) { const co = pt.getElementsByTagName('coordinates')[0]; if (co) feats.push({ nombre: nom, tipo: 'punto', ll: num3(co.textContent) }); } } });
    }
  }
  feats.forEach(f => { if (f.tipo !== 'punto' && f.ll.length > 3) { const a = f.ll[0], b = f.ll[f.ll.length - 1]; if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) f.ll.pop(); } if (f.tipo === 'linea' && f.ll.length >= 3) f.tipo = 'poligono'; });
  return feats.filter(f => f.ll.length && f.ll.every(p => isFinite(p[0]) && isFinite(p[1])));
}
let efFeats = [];
function efLeerArchivo(file) {
  if (!file) return; const rd = new FileReader();
  rd.onload = () => { try { efFeats = leerGeoArchivo(String(rd.result), file.name); const pols = efFeats.filter(f => f.tipo === 'poligono');
      document.getElementById('ef-arch-res').innerHTML = pols.length ? '<div class="sec-label" style="margin-top:0">Polígonos encontrados</div>' + pols.map(f => { const i = efFeats.indexOf(f); return `<button class="mp-lote-row" onclick="efUsarFeat(${i})"><span><b>${esc(f.nombre)}</b><small>${f.ll.length} vértices${f.ll.some(p => p[2] != null && isFinite(p[2])) ? ' · con altitud' : ''}</small></span><b>Usar</b></button>`; }).join('') : '<p class="hint">No se encontraron polígonos en el archivo.</p>';
    } catch (e) { document.getElementById('ef-arch-res').innerHTML = '<p class="hint" style="color:var(--danger)">No se pudo leer el archivo: ' + esc(e.message) + '</p>'; } };
  rd.readAsText(file);
}
function efUsarFeat(i) { const f = efFeats[i]; const ref = refGeo(edF.fincaId, f.ll); edF.pts = f.ll.map(p => { const q = proyectarLL(p[0], p[1], ref); return [redondear(q[0], 2), redondear(q[1], 2), p[2] == null || !isFinite(p[2]) ? null : p[2]]; }); edF.fuente = 'archivo'; edF.caja = cajaEditor(); edF.vista = { zoom: 1, panX: 0, panY: 0 }; efTab('dibujo'); efPintar(); }
function poligonoValido(p) { if (p.length < 3) return 'Se necesitan al menos tres esquinas.'; const n = p.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue; const a = p[i], b = p[(i + 1) % n], c = p[j], d = p[(j + 1) % n];
    const o = (p1, p2, p3) => (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]); if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return 'Los lados de la forma se cruzan. Revise el orden de las esquinas.'; }
  return ''; }
function efGuardar() {
  const f = fincas.find(x => x.id === edF.fincaId);
  if (edF.tipo === 'lote') {
    const l = lotes.find(x => x.id === edF.id); const err = poligonoValido(edF.pts); if (err) { alert(err); return; }
    const ha = areaPoligono(edF.pts) / 10000; l.forma = { pts: edF.pts.map(p => [n0(p[0]), n0(p[1]), p[2] == null || p[2] === '' ? null : n0(p[2])]), fuente: edF.fuente || (l.forma && l.forma.fuente) || 'dibujo', actualizada: hoyLocal() };
    registrarCambio('lote', l.id, l.nombre, 'Forma del lote', num(redondear(ha, 3)) + ' ha · ' + edF.pts.length + ' esquinas · ' + l.forma.fuente);
    const dif = n0(l.hectareas) ? Math.abs(ha - n0(l.hectareas)) / n0(l.hectareas) : 1;
    geoLimpiarCache(); closeModal(); guardarEstado(); renderMapa(); renderGestionTablas();
    if (dif > 0.03) toast('Forma guardada: ' + num(redondear(ha, 3)) + ' ha medidas', null, { label: 'Usar como área del lote', fn: () => { const antes = l.hectareas; l.hectareas = String(redondear(ha, 3)); registrarCambio('lote', l.id, l.nombre, 'Ajuste de área', antes + ' ha → ' + l.hectareas + ' ha (medida de la forma)'); geoLimpiarCache(); guardarEstado(); renderMapa(); renderGestionTablas(); toast('Área actualizada a ' + l.hectareas + ' ha'); } });
    else toast('Forma guardada');
  } else {
    if (edF.pts.length && edF.pts.length < 3) { alert('El límite necesita al menos tres esquinas, o déjelo vacío.'); return; }
    if (edF.pts.length) { const err = poligonoValido(edF.pts); if (err) { alert(err); return; } }
    f.forma = edF.pts.length ? { pts: edF.pts.map(p => [n0(p[0]), n0(p[1]), p[2] == null || p[2] === '' ? null : n0(p[2])]), fuente: edF.fuente || 'dibujo' } : null;
    f.puntos = edF.puntos.map(p => ({ id: p.id || uid('pt'), tipo: p.tipo || 'Otro', nombre: String(p.nombre || '').trim(), x: n0(p.x), y: n0(p.y), z: p.z == null || p.z === '' ? null : n0(p.z) }));
    registrarCambio('finca', f.id, f.nombre, 'Mapa de la finca', (f.forma ? 'límite de ' + num(redondear(areaPoligono(f.forma.pts) / 10000, 2)) + ' ha · ' : '') + f.puntos.length + ' puntos');
    geoLimpiarCache(); closeModal(); guardarEstado(); renderMapa(); toast('Mapa de la finca guardado');
  }
}
function efQuitarForma() { const l = lotes.find(x => x.id === edF.id); confirmar('¿Quitar la forma real de ' + esc(l.nombre) + '? Volverá a dibujarse como un rectángulo esquemático.', () => { delete l.forma; registrarCambio('lote', l.id, l.nombre, 'Forma del lote', 'Forma retirada; vuelve a esquemática'); geoLimpiarCache(); closeModal(); guardarEstado(); renderMapa(); }); }

/* ---- Importar mapa completo de la finca ---- */
let impFeats = [];
function abrirImportarMapa() {
  const f = fincaMapa(); if (!f) return;
  openModal(`<h3>Importar mapa de ${esc(f.nombre)}</h3>
    <p class="hint">Suba el archivo con los lotes dibujados en Google Earth, Avenza Maps, QGIS o una app de GPS. Asigne cada polígono a un lote; los puntos se pueden guardar como casa, beneficiadero o marquesina, y sus altitudes alimentan el relieve.</p>
    <input type="file" accept=".kml,.geojson,.json,.gpx" onchange="impLeer(this.files[0])">
    <div id="imp-res" style="margin-top:12px;"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" id="imp-ok" disabled onclick="impAplicar()">Aplicar</button></div>`, true);
}
function impLeer(file) {
  if (!file) return; const rd = new FileReader(); const f = fincaMapa();
  rd.onload = () => { try { impFeats = leerGeoArchivo(String(rd.result), file.name); } catch (e) { document.getElementById('imp-res').innerHTML = '<p class="hint" style="color:var(--danger)">No se pudo leer: ' + esc(e.message) + '</p>'; return; }
    const ls = lotesDeFinca(f.id); const norm = s => String(s || '').normalize('NFD').replace(/[^a-z0-9]/gi, '').toLowerCase();
    document.getElementById('imp-res').innerHTML = impFeats.length ? `<div class="tscroll"><table class="dtable"><thead><tr><th>Elemento</th><th>Tipo</th><th>Usar como</th></tr></thead><tbody>${impFeats.map((ft, i) => {
      const sug = ft.tipo === 'poligono' ? (ls.find(l => norm(l.nombre) === norm(ft.nombre) || norm(l.codigo) === norm(ft.nombre)) || {}).id || '' : '';
      const ops = ft.tipo === 'poligono' ? `<option value="">No usar</option><option value="__finca">Límite de la finca</option>${ls.map(l => `<option value="${l.id}" ${l.id === sug ? 'selected' : ''}>Lote ${esc(l.nombre)}</option>`).join('')}` : `<option value="">No usar</option>${TIPOS_PUNTO.map(t => `<option value="pt:${t}">Punto: ${t}</option>`).join('')}<option value="alt">Solo altitud</option>`;
      return `<tr><td><b>${esc(ft.nombre)}</b><br><small style="color:var(--text-faint)">${ft.ll.length} punto(s)${ft.ll.some(p => p[2] != null && isFinite(p[2])) ? ' · con altitud' : ''}</small></td><td>${ft.tipo === 'poligono' ? 'Polígono' : 'Punto'}</td><td><select id="imp-${i}">${ops}</select></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="hint">El archivo no tiene polígonos ni puntos.</p>';
    document.getElementById('imp-ok').disabled = !impFeats.length; };
  rd.readAsText(file);
}
function impAplicar() {
  const f = fincaMapa(); const todos = impFeats.flatMap(x => x.ll); if (!todos.length) return; const ref = refGeo(f.id, todos); let n = 0;
  const conv = ll => ll.map(p => { const q = proyectarLL(p[0], p[1], ref); return [redondear(q[0], 2), redondear(q[1], 2), p[2] == null || !isFinite(p[2]) ? null : p[2]]; });
  f.puntos = f.puntos || []; f.alturas = f.alturas || [];
  impFeats.forEach((ft, i) => { const v = (document.getElementById('imp-' + i) || {}).value; if (!v) return; n++;
    if (v === '__finca') f.forma = { pts: conv(ft.ll), fuente: 'archivo' };
    else if (v.startsWith('pt:')) { const q = conv(ft.ll)[0]; f.puntos.push({ id: uid('pt'), tipo: v.slice(3), nombre: ft.nombre, x: q[0], y: q[1], z: q[2] }); }
    else if (v === 'alt') { const q = conv(ft.ll)[0]; if (q[2] != null) f.alturas.push({ x: q[0], y: q[1], z: q[2] }); }
    else { const l = lotes.find(x => x.id === v); if (l) { const pts = conv(ft.ll); if (poligonoValido(pts)) { n--; return; } l.forma = { pts, fuente: 'archivo', actualizada: hoyLocal() }; registrarCambio('lote', l.id, l.nombre, 'Forma del lote', 'Importada de archivo · ' + num(redondear(areaPoligono(pts) / 10000, 3)) + ' ha'); } } });
  registrarCambio('finca', f.id, f.nombre, 'Mapa de la finca', n + ' elementos importados');
  geoLimpiarCache(); closeModal(); guardarEstado(); renderMapa(); renderGestionTablas(); toast(n + ' elementos importados al mapa de la finca');
}
