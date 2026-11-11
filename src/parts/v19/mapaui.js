/* ---- Controlador de la vista Mapa: finca, lote y 3D ---- */
Object.assign(mapaSt, { modo: 'finca', fincaId: '', rot: -20, tilt: 52, exag: 1.6 });
let _fincaV = null;
function fincaMapa() { return fincas.find(f => f.id === mapaSt.fincaId) || null; }
function dibujarMapa() {
  const cv = document.getElementById('mapa-canvas'); if (!cv) return;
  const vacio = document.getElementById('mapa-vacio');
  const W = Math.max(280, cv.parentElement.clientWidth || 600), H = Math.round(Math.min(680, Math.max(380, W * (mapaSt.modo === '3d' ? 0.62 : 0.66))));
  const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  const ctx = cv.getContext && cv.getContext('2d'); const pal = paletaMaqueta();
  cv.classList.toggle('modo-3d', mapaSt.modo === '3d');
  if (mapaSt.modo !== 'lote') {
    _mapaT = null; const f = fincaMapa();
    if (!f || !lotesDeFinca(f.id).length) { vacio.hidden = false; vacio.innerHTML = '<b>Aún no hay lotes en esta finca</b><span>Cree la finca y sus lotes con hectáreas en Finca y lotes.</span><button class="btn primary small" onclick="ir(\'gestion\');showSub(\'lotes\')">Crear lote</button>'; if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); } return; }
    vacio.hidden = true; if (!ctx) { _fincaV = null; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mapaSt.modo === '3d') { dibujar3D(ctx, W, H, f.id, pal, mapaSt, { capa: mapaSt.capa, resaltar: mapaSt.loteId }); _fincaV = null; }
    else _fincaV = dibujarFinca(ctx, W, H, f.id, pal, mapaSt, { capa: mapaSt.capa, resaltar: mapaSt.hoverLote || null }).V;
    return;
  }
  const l = loteMapa(), g = l && geomLote(l);
  if (!g) {
    vacio.hidden = false;
    vacio.innerHTML = !lotes.length ? '<b>Aún no hay lotes</b><span>Crea la finca y sus lotes con hectáreas en Finca y lotes.</span><button class="btn primary small" onclick="ir(\'gestion\');showSub(\'lotes\')">Crear lote</button>'
      : '<b>Este lote todavía no tiene diseño</b><span>Indique la distancia entre surcos y entre plantas. Con la forma real del lote y el relieve, la app traza los surcos en curvas de nivel y codifica cada planta.</span><button class="btn primary small" onclick="abrirDisenoLote()">Definir diseño del lote</button>';
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); }
    _mapaT = null; return;
  }
  vacio.hidden = true;
  if (!ctx) { _mapaT = transformacion(g, W, H, mapaSt); return; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  _mapaT = dibujarLote(ctx, W, H, l, g, pal, mapaSt, { capa: mapaSt.capa, plan: planActivo(), sel: mapaSt.sel, hover: mapaSt.hover });
}
function plantaEn(sx, sy) { const l = loteMapa(), g = l && geomLote(l); if (!g || !_mapaT) return null; const [x, y] = _mapaT.aMundo(sx, sy); const p = plantaCercana(g, x, y); return p ? p.cod : null; }
function loteEn(sx, sy) { const f = fincaMapa(); if (!f || !_fincaV) return null; const [x, y] = _fincaV.aMundo(sx, sy); const dist = distribucionFinca(f.id); return dist.lotes.find(l => dentroPol(x, y, dist.polys.get(l.id).poly)) || null; }
function prepararCanvasMapa() {
  const cv = document.getElementById('mapa-canvas'); if (!cv || cv._listo) return; cv._listo = true;
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (_) {} _mapaPtr.set(e.pointerId, posCanvas(e)); const p = posCanvas(e); _mapaArr = { x: p[0], y: p[1], px: mapaSt.panX, py: mapaSt.panY, rot: mapaSt.rot, tilt: mapaSt.tilt, movido: false, dist: null, zoom: mapaSt.zoom }; });
  cv.addEventListener('pointermove', e => {
    const [x, y] = posCanvas(e);
    if (_mapaPtr.has(e.pointerId)) _mapaPtr.set(e.pointerId, [x, y]);
    if (_mapaPtr.size === 2 && _mapaArr) { const [a, b] = [..._mapaPtr.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (!_mapaArr.dist) _mapaArr.dist = d; else { mapaSt.zoom = _mapaArr.zoom; mapaZoom(d / _mapaArr.dist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } _mapaArr.movido = true; return; }
    if (_mapaArr && _mapaPtr.size === 1) { const dx = x - _mapaArr.x, dy = y - _mapaArr.y; if (Math.abs(dx) + Math.abs(dy) > 4) { _mapaArr.movido = true; cv.classList.add('arrastrando');
        if (mapaSt.modo === '3d' && !e.shiftKey) { mapaSt.rot = _mapaArr.rot + dx * 0.35; mapaSt.tilt = Math.max(18, Math.min(80, _mapaArr.tilt - dy * 0.25)); }
        else { mapaSt.panX = _mapaArr.px + dx; mapaSt.panY = _mapaArr.py + dy; }
        mostrarTip(null); dibujarMapa(); } return; }
    if (mapaSt.modo === 'finca') { const l = loteEn(x, y); const id = l ? l.id : null; if (id !== mapaSt.hoverLote) { mapaSt.hoverLote = id; cv.style.cursor = id ? 'pointer' : ''; dibujarMapa(); } mostrarTipLote(l, x, y); return; }
    if (mapaSt.modo !== 'lote') return;
    const cod = plantaEn(x, y);
    if (cod !== mapaSt.hover) { mapaSt.hover = cod; dibujarMapa(); }
    mostrarTip(cod, x, y);
  });
  const fin = e => { const [x, y] = posCanvas(e); _mapaPtr.delete(e.pointerId); cv.classList.remove('arrastrando');
    if (_mapaArr && !_mapaArr.movido && _mapaPtr.size === 0) {
      if (mapaSt.modo === 'lote') { const cod = plantaEn(x, y); if (cod) seleccionarPlanta(cod); }
      else if (mapaSt.modo === 'finca') { const l = loteEn(x, y); if (l) { mostrarTip(null); abrirLoteEnMapa(l.id); } }
    }
    if (_mapaPtr.size === 0) _mapaArr = null; };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('pointerleave', () => { if (mapaSt.hover || mapaSt.hoverLote) { mapaSt.hover = null; mapaSt.hoverLote = null; dibujarMapa(); } mostrarTip(null); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = posCanvas(e); mapaZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  if (window.ResizeObserver) { let anchoPrevio = 0, pendiente = 0;
    new ResizeObserver(entradas => { const ancho = Math.round(entradas[0].contentRect.width); if (ancho === anchoPrevio) return; anchoPrevio = ancho;
      cancelAnimationFrame(pendiente); pendiente = requestAnimationFrame(() => { if (document.getElementById('view-mapa').classList.contains('active')) dibujarMapa(); }); }).observe(cv.parentElement); }
}
function mostrarTipLote(l, sx, sy) {
  const tip = document.getElementById('mapa-tip'); if (!tip) return; if (!l) { tip.hidden = true; return; }
  const g = geomLote(l); const def = defCapa(mapaSt.capa); let extra = '';
  if (def && g) { const s = superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : mapaSt.capa); extra = s.sinDatos ? '<br>Sin muestreo de ' + esc(def[1].toLowerCase()) : '<br>' + esc(def[1]) + ': ' + num(redondear(s.prom, 1)) + esc(def[4]); }
  tip.innerHTML = `<b>${esc(l.nombre)}</b><br>${g ? num(redondear(g.ha, 2)) + ' ha · ' + num(g.total) + ' plantas · pendiente ' + num(Math.round(g.pend)) + '%' : num(l.hectareas) + ' ha · sin diseño'}${extra}<br><span style="opacity:.75">Toque para abrir el lote</span>`;
  tip.style.left = sx + 'px'; tip.style.top = sy + 'px'; tip.hidden = false;
}
function abrirLoteEnMapa(id) { mapaSt.loteId = id; mapaSt.modo = 'lote'; mapaSt.sel = null; mapaSt.hover = null; mapaSt.planId = null; mapaSt.zoom = 1; mapaSt.panX = 0; mapaSt.panY = 0; renderMapa(); }
function mapaModo(m) { if (m === '3d' && mapaSt.fincaId) { const T = terrenoFinca(mapaSt.fincaId); mapaSt.rot = Math.atan2(-T.u[0], -T.u[1]) * 180 / Math.PI + 25; } mapaSt.modo = m; mapaSt.zoom = 1; mapaSt.panX = 0; mapaSt.panY = 0; mapaSt.hover = null; mapaSt.hoverLote = null; mostrarTip(null); renderMapa(); }
function mapaCambiarFinca(id) { mapaSt.fincaId = id; const l = lotesDeFinca(id)[0]; mapaSt.loteId = l ? l.id : ''; mapaSt.sel = null; mapaSt.planId = null; mapaAjustar(); renderMapa(); }
function mapaCambiarLote(id) { mapaSt.loteId = id; const l = lotes.find(x => x.id === id); if (l) mapaSt.fincaId = l.fincaId; if (mapaSt.modo === 'finca') mapaSt.modo = 'lote'; mapaSt.sel = null; mapaSt.hover = null; mapaSt.planId = null; mapaAjustar(); renderMapa(); }
function mapaGirar(d) { mapaSt.rot += d; dibujarMapa(); }
function renderMapa() {
  if (!document.getElementById('view-mapa')) return;
  prepararCanvasMapa();
  if (!fincas.some(f => f.id === mapaSt.fincaId)) { const l0 = lotes.find(l => l.id === mapaSt.loteId); mapaSt.fincaId = (l0 && l0.fincaId) || (fincasActivas()[0] || fincas[0] || {}).id || ''; }
  if (!lotes.some(l => l.id === mapaSt.loteId && l.fincaId === mapaSt.fincaId)) { mapaSt.loteId = (lotesDeFinca(mapaSt.fincaId).find(l => geomLote(l)) || lotesDeFinca(mapaSt.fincaId)[0] || {}).id || ''; mapaSt.sel = null; }
  const fs = document.getElementById('mp-finca'); if (fs) fs.innerHTML = fincas.length ? fincas.filter(f => activo(f) || f.id === mapaSt.fincaId).map(f => `<option value="${f.id}" ${f.id === mapaSt.fincaId ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('') : '<option value="">Sin fincas</option>';
  const sel = document.getElementById('mp-lote');
  sel.innerHTML = lotesDeFinca(mapaSt.fincaId, true).filter(l => activo(l) || l.id === mapaSt.loteId || muestreos.some(m => m.loteId === l.id)).map(l => `<option value="${l.id}" ${l.id === mapaSt.loteId ? 'selected' : ''}>${esc(l.nombre)}${activo(l) ? '' : ' · histórico'}${geomLote(l) ? '' : ' · sin diseño'}</option>`).join('') || '<option value="">Sin lotes</option>';
  document.querySelectorAll('#mp-modos button').forEach(b => { const on = b.dataset.m === mapaSt.modo; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  document.getElementById('view-mapa').dataset.modo = mapaSt.modo;
  document.getElementById('mp-capas').innerHTML = CAPAS.filter(([k]) => mapaSt.modo === 'lote' || k !== 'marcas').map(([k, t]) => `<button role="tab" aria-selected="${mapaSt.capa === k}" class="${mapaSt.capa === k ? 'on' : ''}" onclick="mapaCapa('${k}')">${t}</button>`).join('');
  if (mapaSt.modo !== 'lote' && mapaSt.capa === 'marcas') mapaSt.capa = 'faltantes';
  const plan = planActivo(); const chip = document.getElementById('mp-plan-chip');
  if (plan && plan.loteId === mapaSt.loteId && mapaSt.modo === 'lote') { chip.hidden = false; chip.innerHTML = `Plan de ${esc(plan.tipo.toLowerCase())} · ${plan.codigos.length} plantas · ${fechaCorta(plan.fecha)} <button onclick="abrirResultadosPlan('${plan.id}')">Registrar</button><button onclick="exportarHojaMuestreoPDF('${plan.id}')">PDF</button><button onclick="cerrarPlanMapa()" aria-label="Ocultar plan">✕</button>`; }
  else { chip.hidden = true; if (plan && mapaSt.modo === 'lote') mapaSt.planId = null; }
  const ctl3 = document.getElementById('mp-3d-ctl'); if (ctl3) { ctl3.hidden = mapaSt.modo !== '3d'; const ex = document.getElementById('mp-exag'); if (ex) ex.value = mapaSt.exag; }
  renderLeyenda(); renderInfoLote(); renderPlantaSel(); renderTablaMuestreos(); renderParamsMapa();
  dibujarMapa();
}
function renderLeyenda() {
  const c = mapaSt.capa; const def = defCapa(c); let h = '';
  const T = mapaSt.fincaId ? terrenoFinca(mapaSt.fincaId) : null; const cf = T ? curvasFinca(T) : null;
  const curvas = cf ? `<span class="lg"><i style="background:transparent;border-top:1.5px solid var(--pergamino);border-radius:0;height:0;width:16px"></i>Curva de nivel cada ${cf.paso} m${T.sintetico ? ' (relieve estimado)' : ''}</span>` : '';
  if (c === 'estructura') h = (mapaSt.modo === 'lote' ? '<span class="lg"><i style="background:var(--accent)"></i>Planta</span><span class="lg" style="color:var(--danger)">✕ Faltante</span>' : '<span class="lg"><i style="background:var(--accent);opacity:.5"></i>Surcos</span>') + curvas;
  else if (c === 'marcas') h = Object.keys(ESTADOS_PLANTA).map(e => `<span class="lg"><i style="background:${ESTADOS_PLANTA[e]}"></i>${e}</span>`).join('');
  else if (def) {
    const ls = mapaSt.modo === 'lote' ? [loteMapa()].filter(Boolean) : lotesDeFinca(mapaSt.fincaId); const sups = ls.map(l => { const g = geomLote(l); return g ? superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : c) : null; }).filter(Boolean);
    const dom = dominioCapa(def[0], sups); const pal = paletaMaqueta(); const stops = [0, 0.25, 0.5, 0.75, 1].map(t => rgbTxt(rampaSalud(t, def[2], pal)));
    h = `<span class="hm-esc"><span>${num(redondear(dom[0], 1))}${esc(def[4])}</span><i style="background:linear-gradient(90deg, ${stops.join(',')})"></i><span>${num(redondear(dom[1], 1))}${esc(def[4])}${def[3] ? '' : ' o más'}</span></span><span class="lg"><i style="background:var(--surface);border:1.5px solid var(--text);"></i>Planta medida</span>${curvas}`;
  }
  if (planActivo() && mapaSt.modo === 'lote') h += '<span class="lg"><i class="ring"></i>Planta del plan de muestreo</span>';
  const camp = TIPOS_MUESTREO[c] && mapaSt.modo === 'lote' ? ultimaCampana(mapaSt.loteId, c) : null;
  const ayuda = mapaSt.modo === '3d' ? 'Arrastre para girar e inclinar · Mayús + arrastre para mover · rueda para acercar' : (mapaSt.modo === 'finca' ? 'Toque un lote para abrirlo · arrastre para mover · rueda o pellizco para acercar' : 'Arrastre para mover · rueda o pellizco para acercar');
  h += `<span class="nota">${camp ? 'Último muestreo: ' + fechaCorta(camp.fecha) + ' · ' + camp.n + ' plantas' : ayuda}</span>`;
  document.getElementById('mp-leyenda').innerHTML = h;
}
function renderInfoLote() {
  const host = document.getElementById('mp-lote-info'); const tit = document.getElementById('mp-info-t');
  if (mapaSt.modo !== 'lote') {
    const f = fincaMapa(); if (tit) tit.textContent = 'La finca';
    if (!f) { host.innerHTML = '<p class="hint" style="margin:0;">Sin finca.</p>'; return; }
    const ls = lotesDeFinca(f.id); const gs = ls.map(l => geomLote(l)).filter(Boolean); const T = terrenoFinca(f.id);
    const reales = ls.filter(l => l.forma && l.forma.pts && l.forma.pts.length >= 3).length; const area = gs.reduce((a, g) => a + g.ha, 0); const pl = gs.reduce((a, g) => a + g.total, 0);
    const pendM = gs.length ? gs.reduce((a, g) => a + g.pend * g.ha, 0) / (area || 1) : 0;
    host.innerHTML = `
      <div class="kv"><span>Lotes activos</span><b>${ls.length}</b></div>
      <div class="kv"><span>Área en café (forma del lote)</span><b>${num(redondear(area, 2))} ha</b></div>
      <div class="kv"><span>Plantas codificadas</span><b>${num(pl)}</b></div>
      <div class="kv"><span>Altitud</span><b>${num(Math.round(T.zmin))} a ${num(Math.round(T.zmax))} msnm</b></div>
      <div class="kv"><span>Pendiente media del café</span><b>${num(Math.round(pendM))}%</b></div>
      <div class="kv"><span>Lotes con forma real</span><b>${reales} de ${ls.length}</b></div>
      <div class="kv"><span>Fuente del relieve</span><b>${T.sintetico ? 'estimado con pendientes' : T.nReales + ' puntos con altitud'}</b></div>
      ${reales < ls.length ? `<p class="hint" style="margin:10px 0 0;">Los lotes con línea punteada son esquemáticos: dibuje su forma o impórtela desde el GPS para que la maqueta sea fiel.</p>` : ''}
      <div class="mp-btns"><button class="btn ghost small" onclick="abrirImportarMapa()">Importar KML / GeoJSON / GPX</button><button class="btn ghost small" onclick="abrirEditorForma('finca')">Límite y puntos de la finca</button></div>`;
    return;
  }
  if (tit) tit.textContent = 'Estado del lote';
  const l = loteMapa(); const g = l && geomLote(l);
  if (!g) { host.innerHTML = '<p class="hint" style="margin:0;">Defina el diseño del lote para ver su estructura, sanidad y proyección.</p>'; return; }
  const pr = proyeccionLote(l); const cfg = cfgMapa();
  const sem = (tipo) => { const c = ultimaCampana(l.id, tipo); if (!c) return '<b style="color:var(--text-faint);font-weight:500;">sin datos</b>';
    const u = TIPOS_MUESTREO[tipo].umbral(); const cls = c.prom <= u ? 'cerrada' : (c.prom <= 2 * u ? 'ejecucion' : 'cancelada');
    return `<b><span class="pill ${cls}">${num(redondear(c.prom, 1))}%</span> <span style="color:var(--text-faint);font-weight:500;font-size:11.5px;">${fechaCorta(c.fecha)}</span></b>`; };
  const flor = ultimaCampana(l.id, 'Floración'); const prom = g.total / (g.nS || 1);
  const dif = n0(l.hectareas) && !g.esquematico ? (g.haForma - n0(l.hectareas)) / n0(l.hectareas) * 100 : 0;
  host.innerHTML = `
    <div class="kv"><span>Código del lote</span><b>${esc(g.cod)}</b></div>
    <div class="kv"><span>Forma</span><b>${g.esquematico ? 'esquemática' : 'real · ' + esc((l.forma && l.forma.fuente) || 'dibujada')}</b></div>
    <div class="kv"><span>Área de la forma</span><b>${num(redondear(g.haForma, 3))} ha${Math.abs(dif) > 5 ? ` <span class="pill ejecucion">${dif > 0 ? '+' : ''}${num(Math.round(dif))}% vs registrada</span>` : ''}</b></div>
    <div class="kv"><span>Surcos · plantas por surco</span><b>${g.nS} · ${num(Math.round(prom))} en promedio</b></div>
    <div class="kv"><span>Plantas vivas / trazadas</span><b>${num(pr.vivas)} / ${num(g.total)}</b></div>
    <div class="kv"><span>Densidad</span><b>${num(Math.round(g.total / g.ha))} pl/ha</b></div>
    <div class="kv"><span>Altitud · pendiente</span><b>${num(Math.round(g.zmin))}–${num(Math.round(g.zmax))} m · ${num(Math.round(g.pend))}%</b></div>
    <div class="kv"><span>Trazado</span><b>${g.trazado === 'contorno' ? (g.pend >= 3 ? 'en curvas de nivel' : 'recto (terreno plano)') : g.trazado === 'pendiente' ? 'a favor de la pendiente' : 'recto'}</b></div>
    <div class="kv"><span>Broca (umbral ${num(cfg.umbralBroca)}%)</span>${sem('Broca')}</div>
    <div class="kv"><span>Roya (umbral ${num(cfg.umbralRoya)}%)</span>${sem('Roya')}</div>
    <div class="kv"><span>Última floración</span><b>${flor ? fechaCorta(flor.fecha) + ' · intensidad ' + num(redondear(flor.prom, 1)) : '—'}</b></div>
    <div class="kv"><span>Cosecha estimada de esa flor</span><b>${flor ? fechaCorta(sumarDias(flor.fecha, n0(cfg.diasFloracion))) + ' ' + parseFecha(sumarDias(flor.fecha, n0(cfg.diasFloracion))).getUTCFullYear() : '—'}</b></div>
    <div class="kv"><span>Proyección de cereza</span><b>${pr.kgCereza != null ? num(Math.round(pr.kgCereza)) + ' kg' : '—'}</b></div>
    <div class="kv"><span>Pergamino seco estimado</span><b>${pr.kgPerg != null ? num(Math.round(pr.kgPerg)) + ' kg · ' + num(redondear(pr.kgPerg / 125, 1)) + ' cargas' : '—'}</b></div>
    ${pr.kgCereza == null ? '<p class="hint" style="margin:10px 0 0;">Para proyectar la cosecha, haga un muestreo de frutos (capa Frutos).</p>' : ''}
    <div class="mp-btns"><button class="btn ghost small" onclick="abrirEditorForma('lote')">${g.esquematico ? 'Dibujar o importar la forma' : 'Editar la forma'}</button><button class="btn ghost small" onclick="abrirDisenoLote()">Diseño de siembra</button></div>`;
}
function renderPlantaSel() {
  const host = document.getElementById('mp-planta'); const tit = document.getElementById('mp-planta-t');
  if (mapaSt.modo !== 'lote') {
    if (tit) tit.textContent = 'Lotes';
    const def = defCapa(mapaSt.capa); const ls = lotesDeFinca(mapaSt.fincaId);
    host.innerHTML = ls.map(l => { const g = geomLote(l); let v = ''; if (def && g) { const s = superficieCalor(g, def[0] === 'faltantes' ? 'faltantes' : mapaSt.capa); v = s.sinDatos ? '<span class="hint" style="margin:0">sin datos</span>' : `<b class="mono">${num(redondear(s.prom, 1))}${esc(def[4])}</b>`; } else if (g) v = `<b class="mono">${num(g.total)} pl</b>`;
      return `<button class="mp-lote-row" onclick="abrirLoteEnMapa('${l.id}')"><span><b>${esc(l.nombre)}</b><small>${g ? num(redondear(g.ha, 2)) + ' ha · ' + num(Math.round(g.pend)) + '% · ' + (g.esquematico ? 'esquemático' : 'forma real') : 'sin diseño'}</small></span>${v}</button>`; }).join('') || '<p class="hint" style="margin:0">Sin lotes.</p>';
    return;
  }
  if (tit) tit.textContent = 'Planta seleccionada';
  const cod = mapaSt.sel; const l = loteMapa(); const g = l && geomLote(l);
  if (!cod || !g || !g.idx.has(cod)) { mapaSt.sel = null; host.innerHTML = '<p class="hint" style="margin:0;">Toca una planta del mapa para ver su código, su historial y marcarla.</p>'; return; }
  const p = g.idx.get(cod), mk = marcaDe(cod); const s = g.surcos[p.i - 1]; const z = g.terreno.z(p.x, p.y);
  const hist = muestreos.filter(m => m.codigo === cod).sort((a, b) => b.fecha.localeCompare(a.fecha));
  host.innerHTML = `
    <div class="planta-code">${esc(cod)}</div>
    <p class="hint" style="margin:2px 0 10px;">Surco ${p.i} de ${g.nS} · planta ${p.j} de ${s ? s.plantas.length : '—'} · a ${num(redondear(p.s, 1))} m del inicio del surco · ${num(Math.round(z))} msnm</p>
    ${hist.length ? hist.slice(0, 6).map(h => `<div class="kv"><span>${esc(h.tipo)} · ${fechaCorta(h.fecha)}</span><b>${num(redondear(h.valor, 1))}${TIPOS_MUESTREO[h.tipo] && TIPOS_MUESTREO[h.tipo].unidad === '%' ? '%' : ''}${h.opcion && h.opcion !== 'Ninguna' ? ' · ' + esc(h.opcion) : ''}</b></div>`).join('') : '<p class="hint" style="margin:0 0 6px;">Sin muestreos registrados en esta planta.</p>'}
    <div class="sec-label" style="margin-top:14px;">Marcar planta</div>
    <div class="marca-btns">${Object.keys(ESTADOS_PLANTA).map(e => `<button class="btn ghost small ${mk && mk.estado === e ? 'on' : ''}" onclick="marcarPlanta('${cod}','${e}')">${e}</button>`).join('')}${mk ? `<button class="btn danger-ghost" onclick="marcarPlanta('${cod}','')">Quitar marca</button>` : ''}</div>
    ${mk ? `<p class="hint" style="margin:8px 0 0;">Marcada como ${esc(mk.estado.toLowerCase())} el ${fechaCorta(mk.fecha)}.</p>` : ''}
    <button class="btn primary small block" style="margin-top:12px;" onclick="abrirRegistroMuestreo('${cod}')">Registrar muestreo en esta planta</button>`;
}
function agregarCodigoRes() {
  const el = document.getElementById('rm-cod'); const cod = String(el.value || '').trim().toUpperCase(); const g = geomLote(loteMapa());
  if (!codigoValido(g, cod)) { alert('Ese código no existe en este lote. Use el formato ' + g.cod + '-S04-P012.'); return; }
  if (!resDraft.codigos.includes(cod)) resDraft.codigos.push(cod); el.value = ''; pintarFilasRes();
}
function abrirRegistroMuestreo(codigo) {
  if (mapaSt.modo !== 'lote') { mapaSt.modo = 'lote'; renderMapa(); }
  const l = loteMapa(); const g = l && geomLote(l); if (!g) { abrirDisenoLote(); return; }
  const plan = planActivo();
  if (!codigo && plan && plan.loteId === l.id) { abrirResultadosPlan(plan.id); return; }
  abrirFormResultados(TIPOS_MUESTREO[mapaSt.capa] ? mapaSt.capa : 'Broca', codigo ? [codigo] : [], hoyLocal(), null, '');
}
function abrirPlanMuestreoMapa() { if (mapaSt.modo !== 'lote') { mapaSt.modo = 'lote'; renderMapa(); } abrirPlanMuestreo(); }

/* ---- Diseño de siembra ---- */
function abrirDisenoLote() {
  if (mapaSt.modo !== 'lote') { mapaSt.modo = 'lote'; renderMapa(); }
  const l = loteMapa(); if (!l) { alert('Primero crea un lote en Finca y lotes.'); return; }
  const d = Object.assign({ distSurcos: 1.5, distPlantas: 1, relacion: 1.6, orientacion: 180, pendiente: 30, trazado: 'contorno' }, l.diseno || {});
  const tieneForma = !!(l.forma && l.forma.pts && l.forma.pts.length >= 3); const T = terrenoFinca(l.fincaId);
  openModal(`
    <h3>Diseño de siembra · ${esc(l.nombre)}</h3>
    <p class="hint">Con estos datos, la forma del lote y el relieve, la app traza los surcos, numera cada planta y calcula la densidad. Si cambia el diseño después de muestrear, los códigos de las plantas pueden cambiar.</p>
    <div class="fgrid c3">
      <label class="f">Código del lote<input id="dl-codigo" value="${esc(l.codigo || codigoLote(l))}" maxlength="6"></label>
      <label class="f">Área registrada (ha)<input id="dl-ha" type="number" step="0.01" value="${esc(l.hectareas || '')}" oninput="previewDiseno()"></label>
      <label class="f">Variedad<input value="${esc(nombreVariedad(l.variedadId))}" disabled></label>
      <label class="f">Distancia entre surcos (m)<input id="dl-ds" type="number" step="0.05" value="${d.distSurcos}" oninput="previewDiseno()"></label>
      <label class="f">Distancia entre plantas (m)<input id="dl-dp" type="number" step="0.05" value="${d.distPlantas}" oninput="previewDiseno()"></label>
      <label class="f">Trazado de los surcos<select id="dl-traz" onchange="previewDiseno()"><option value="contorno" ${d.trazado === 'contorno' || !d.trazado ? 'selected' : ''}>En curvas de nivel</option><option value="recto" ${d.trazado === 'recto' ? 'selected' : ''}>Recto, atravesando la pendiente</option><option value="pendiente" ${d.trazado === 'pendiente' ? 'selected' : ''}>A favor de la pendiente</option></select></label>
    </div>
    <div class="sec-label">Relieve ${T.sintetico ? '' : '<span class="pill cerrada" style="margin-left:6px;">medido con altitudes</span>'}</div>
    <div class="fgrid c4">
      <label class="f">Pendiente promedio (%)<input id="dl-pend" type="number" step="1" value="${d.pendiente}" oninput="previewDiseno()" ${T.sintetico ? '' : 'title="Con altitudes medidas, la pendiente sale del relieve"'}></label>
      <label class="f">Hacia dónde baja (° desde el norte)<input id="dl-ori" type="number" step="5" value="${d.orientacion}" oninput="previewDiseno()"></label>
      <label class="f">Altitud media (msnm)<input id="dl-alt" type="number" step="10" value="${esc(l.altitud || (fincas.find(f => f.id === l.fincaId) || {}).altitud || '')}" oninput="previewDiseno()"></label>
      <label class="f">${tieneForma ? 'Forma' : 'Forma esquemática (largo ÷ ancho)'}${tieneForma ? `<input value="Real · ${num(redondear(areaPoligono(l.forma.pts) / 10000, 3))} ha" disabled>` : `<input id="dl-rel" type="number" step="0.1" value="${d.relacion}" oninput="previewDiseno()">`}</label>
    </div>
    <p class="hint" style="margin-top:6px;">0° = baja hacia el norte, 90° = oriente, 180° = sur, 270° = occidente. ${T.sintetico ? 'Si importa la forma con altitudes del GPS, el relieve y la pendiente se calculan solos.' : 'El relieve se calcula con las altitudes registradas; la pendiente y la dirección indicadas solo se usan si faltan datos.'}</p>
    <div class="sec-label">Resultado</div>
    <div class="budget-box" id="dl-prev"></div>
    <canvas id="dl-canvas" style="width:100%;height:240px;margin-top:12px;border-radius:12px;display:block;"></canvas>
    <div class="modal-actions"><button class="btn ghost" onclick="abrirEditorForma('lote')">${tieneForma ? 'Editar la forma' : 'Dibujar o importar la forma'}</button><span style="flex:1"></span><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarDisenoLote()">Guardar diseño</button></div>`, true);
  previewDiseno();
}
function leerDiseno() { const g = id => { const e = document.getElementById(id); return e ? e.value : ''; }; const l = loteMapa() || {}; const prev = l.diseno || {};
  return { distSurcos: n0(g('dl-ds')), distPlantas: n0(g('dl-dp')), relacion: n0(g('dl-rel')) || n0(prev.relacion) || 1.6, orientacion: n0(g('dl-ori')), pendiente: n0(g('dl-pend')), trazado: g('dl-traz') || 'contorno' }; }
function previewDiseno() {
  const l = loteMapa(); const alt = document.getElementById('dl-alt') ? document.getElementById('dl-alt').value : '';
  const tmp = Object.assign({}, l, { hectareas: document.getElementById('dl-ha').value, diseno: leerDiseno(), codigo: document.getElementById('dl-codigo').value, altitud: alt });
  const idx = lotes.indexOf(l); let ge = null; if (idx >= 0) { lotes[idx] = tmp; geoLimpiarCache(); try { ge = geomLote(tmp); } finally { lotes[idx] = l; } }
  document.getElementById('dl-prev').innerHTML = ge ? `<div><div class="n">${ge.nS}</div><div class="l">Surcos</div></div><div><div class="n">${num(Math.round(ge.total / (ge.nS || 1)))}</div><div class="l">Plantas por surco (prom.)</div></div><div><div class="n">${num(ge.total)}</div><div class="l">Plantas</div></div><div class="total"><div class="n">${num(Math.round(ge.total / ge.ha))}</div><div class="l">Plantas por hectárea</div></div>`
    : '<div style="grid-column:1/-1;color:var(--text-faint);font-size:13px;">Complete el área y las distancias para ver el resultado.</div>';
  const cv = document.getElementById('dl-canvas'); const ctx = cv && cv.getContext && cv.getContext('2d');
  if (ctx && ge) { const W = cv.clientWidth || 600, H = 240, dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); lotes[idx] = tmp; try { dibujarLote(ctx, W, H, tmp, ge, paletaMaqueta(), { zoom: 1, panX: 0, panY: 0 }, { capa: 'estructura' }); } finally { lotes[idx] = l; geoLimpiarCache(); } }
  else geoLimpiarCache();
}
function guardarDisenoLote() {
  const l = lotes.find(x => x.id === mapaSt.loteId); if (!l) return;
  const d = leerDiseno(); const ha = n0(document.getElementById('dl-ha').value);
  if (!ha) { alert('Indique el área del lote en hectáreas.'); return; }
  if (d.distSurcos < 0.5 || d.distPlantas < 0.3) { alert('Revise las distancias: entre surcos al menos 0,5 m y entre plantas al menos 0,3 m.'); return; }
  if (d.pendiente < 0 || d.pendiente > 150) { alert('La pendiente debe estar entre 0 y 150 %.'); return; }
  const antes = JSON.stringify([l.diseno, l.hectareas]);
  l.hectareas = String(ha); l.diseno = d; const alt = document.getElementById('dl-alt'); if (alt && alt.value) l.altitud = n0(alt.value);
  l.codigo = String(document.getElementById('dl-codigo').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || codigoLote(Object.assign({}, l, { codigo: '' }));
  geoLimpiarCache(); const g = geomLote(l); l.densidad = num(Math.round(g.total / g.ha)) + ' plantas/ha';
  if (antes !== JSON.stringify([l.diseno, l.hectareas])) registrarCambio('lote', l.id, l.nombre, 'Diseño de siembra', d.distSurcos + ' × ' + d.distPlantas + ' m · ' + num(g.total) + ' plantas');
  closeModal(); guardarEstado(); mapaAjustar(); renderMapa(); renderGestionTablas(); renderHoy();
  toast('Diseño guardado: ' + g.nS + ' surcos y ' + num(g.total) + ' plantas codificadas');
}
