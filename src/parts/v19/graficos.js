/* ================= v19: gráficas SVG reutilizables y avisos flotantes ================= */
let _gTip = null;
function tooltipsGlobales() {
  const host = document.getElementById('content'); if (!host || host._tips19) return; host._tips19 = true;
  _gTip = document.createElement('div'); _gTip.className = 'tb-tip'; _gTip.hidden = true; document.body.appendChild(_gTip);
  host.addEventListener('pointermove', e => { if (e.target.closest && e.target.closest('#view-tablero')) return; const t = e.target.closest && e.target.closest('[data-tip]');
    host.querySelectorAll('.hit.on').forEach(x => x !== t && x.classList.remove('on'));
    if (!t) { _gTip.hidden = true; return; } if (t.classList.contains('hit')) t.classList.add('on');
    _gTip.textContent = t.getAttribute('data-tip'); _gTip.hidden = false; const w = _gTip.offsetWidth; _gTip.style.left = Math.min(window.innerWidth - w - 12, Math.max(12, e.clientX - w / 2)) + 'px'; _gTip.style.top = Math.max(8, e.clientY - _gTip.offsetHeight - 14) + 'px'; });
  host.addEventListener('pointerleave', () => { if (_gTip) _gTip.hidden = true; });
}
function escalaBonita(mn, mx, n) {
  if (mn === mx) { mx = mn + 1; } const rg = mx - mn; const base = Math.pow(10, Math.floor(Math.log10(rg / (n || 5))));
  const paso = [1, 2, 2.5, 5, 10].map(f => f * base).find(t => rg / t <= (n || 5)) || rg; const a = Math.floor(mn / paso) * paso, b = Math.ceil(mx / paso) * paso; const t = []; for (let v = a; v <= b + paso * 1e-6; v += paso) t.push(+v.toFixed(10)); return { a, b, t };
}
const fmtEje = v => Math.abs(v) >= 1e6 ? fmtCorto(v) : num(redondear(v, Math.abs(v) < 10 ? 1 : 0));
/* Barras (agrupadas o apiladas) con líneas opcionales en eje derecho.
   o = { cats:[], series:[{ nombre, vals, color, tipo:'barra'|'linea'|'area', eje:'der', apilar:true, punteada:true }], alto, fmt, fmt2, etiquetaCada, marcaCat, minY, refY:[{v,txt}] } */
function fmtPaso(ts) { const st = ts.length > 1 ? Math.abs(ts[1] - ts[0]) : 0; const mx = Math.max(...ts.map(Math.abs)); if (mx >= 1e6 && st && st < 1e6) { const dec = Math.min(3, Math.max(1, Math.ceil(-Math.log10(st / 1e6) - 1e-9))); return t => (t / 1e6).toFixed(dec).replace('.', ',') + ' M'; } return fmtEje; }
function gCombo(o) {
  const W = o.ancho || 760, H = o.alto || 240, pl = 48, pr = o.series.some(s => s.eje === 'der') ? 48 : 14, pt = 16, pb = 30; const cw = W - pl - pr, ch = H - pt - pb; const n = o.cats.length || 1;
  const barras = o.series.filter(s => (s.tipo || 'barra') === 'barra' && s.eje !== 'der'); const apilar = barras.some(s => s.apilar);
  const izq = o.series.filter(s => s.eje !== 'der'); const der = o.series.filter(s => s.eje === 'der');
  const valsIzq = []; if (apilar) { for (let k = 0; k < n; k++) { let p = 0, ng = 0; barras.forEach(s => { const v = n0(s.vals[k]); if (v >= 0) p += v; else ng += v; }); valsIzq.push(p, ng); } izq.filter(s => s.tipo && s.tipo !== 'barra').forEach(s => s.vals.forEach(v => v != null && valsIzq.push(v))); }
  else izq.forEach(s => s.vals.forEach(v => v != null && valsIzq.push(n0(v)))); (o.refY || []).forEach(r => valsIzq.push(r.v));
  const E = escalaBonita(Math.min(o.minY == null ? 0 : o.minY, ...valsIzq, 0), Math.max(...valsIzq, 1), 5);
  const vd = []; der.forEach(s => s.vals.forEach(v => v != null && vd.push(n0(v)))); const E2 = der.length ? (o.der0 === false ? (() => { const mn = Math.min(...vd), mx = Math.max(...vd); const pad = Math.max((mx - mn) * 0.15, Math.abs(mx) * 0.03, 1); return escalaBonita(mn - pad, mx + pad, 4); })() : escalaBonita(Math.min(0, ...vd), Math.max(...vd, 1), 5)) : null;
  const y = v => pt + ch - (v - E.a) / ((E.b - E.a) || 1) * ch, y2 = v => pt + ch - (v - E2.a) / ((E2.b - E2.a) || 1) * ch; const bw = cw / n; const x = k => pl + bw * (k + 0.5);
  let s = '';
  E.t.forEach(t => { s += `<line x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="${t === 0 ? 'g-cero' : 'g-grid'}"/><text x="${pl - 6}" y="${(y(t) + 3.5).toFixed(1)}" class="g-ax" text-anchor="end">${(o.fmt || fmtEje)(t)}</text>`; });
  if (E2) E2.t.forEach(t => { s += `<text x="${W - pr + 6}" y="${(y2(t) + 3.5).toFixed(1)}" class="g-ax">${(o.fmt2 || fmtPaso(E2.t))(t)}</text>`; });
  const cada = o.etiquetaCada || Math.max(1, Math.ceil(n / Math.max(4, Math.floor(cw / 64))));
  o.cats.forEach((c, k) => { if (k % cada === 0 || k === n - 1 && n < 30) s += `<text x="${x(k).toFixed(1)}" y="${H - 9}" class="g-ax${o.marcaCat === k ? ' g-fuerte' : ''}" text-anchor="middle">${esc(c)}</text>`; });
  (o.bandas || []).forEach(b => { s += `<rect x="${(pl + bw * b.desde).toFixed(1)}" y="${pt}" width="${(bw * (b.hasta - b.desde)).toFixed(1)}" height="${ch}" style="fill:${b.color || 'var(--surface-2)'}" opacity="${b.op || 0.6}"/>`; });
  const gw = apilar ? Math.min(34, bw * 0.66) : Math.min(22, bw * 0.78 / Math.max(1, barras.length));
  if (apilar) for (let k = 0; k < n; k++) { let p = 0, ng = 0; barras.forEach(se => { const v = n0(se.vals[k]); if (!v) return; const y0 = v >= 0 ? y(p + v) : y(ng); const h = Math.abs(y(0) - y(Math.abs(v))); if (v >= 0) p += v; else ng += v;
      s += `<rect x="${(x(k) - gw / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${gw.toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" rx="2" style="fill:${se.color}" data-tip="${esc(o.cats[k])} · ${esc(se.nombre)}: ${(se.fmtTip || o.fmtTip || o.fmt || fmtEje)(v)}"/>`; }); }
  else barras.forEach((se, i) => se.vals.forEach((v, k) => { if (v == null) return; v = n0(v); const bx = x(k) - gw * barras.length / 2 + gw * i; const y0 = v >= 0 ? y(v) : y(0); const h = Math.abs(y(v) - y(0));
      s += `<rect x="${bx.toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(1, gw - 1.5).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" rx="2" style="fill:${se.color}" data-tip="${esc(o.cats[k])} · ${esc(se.nombre)}: ${(se.fmtTip || o.fmtTip || o.fmt || fmtEje)(v)}"/>`; }));
  o.series.filter(se => se.tipo === 'linea' || se.tipo === 'area').forEach(se => { const Y = se.eje === 'der' ? y2 : y; const pts = se.vals.map((v, k) => v == null ? null : [x(k), Y(n0(v))]);
    let d = '', on = false; pts.forEach(p => { if (!p) { on = false; return; } d += (on ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); on = true; });
    if (se.tipo === 'area') { const v = pts.filter(Boolean); if (v.length) s += `<path d="${d}L${v[v.length - 1][0].toFixed(1)},${(se.eje === 'der' ? y2(Math.max(E2.a, 0)) : y(Math.max(E.a, 0))).toFixed(1)}L${v[0][0].toFixed(1)},${(se.eje === 'der' ? y2(Math.max(E2.a, 0)) : y(Math.max(E.a, 0))).toFixed(1)}Z" style="fill:${se.color};opacity:.14"/>`; }
    s += `<path d="${d}" style="fill:none;stroke:${se.color};stroke-width:${se.grosor || 2};${se.punteada ? 'stroke-dasharray:5 4;' : ''}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (se.puntos !== false && n <= 40) pts.forEach((p, k) => { if (p) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${n > 20 ? 2.2 : 3}" style="fill:var(--surface);stroke:${se.color}" stroke-width="1.6" data-tip="${esc(o.cats[k])} · ${esc(se.nombre)}: ${(se.fmtTip || (se.eje === 'der' ? o.fmt2 : o.fmt) || fmtEje)(n0(se.vals[k]))}"/>`; });
    else pts.forEach((p, k) => { if (p) s += `<rect x="${(p[0] - bw / 2).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ch}" class="hit" data-tip="${esc(o.cats[k])} · ${esc(se.nombre)}: ${(se.fmtTip || (se.eje === 'der' ? o.fmt2 : o.fmt) || fmtEje)(n0(se.vals[k]))}"/>`; }); });
  (o.refY || []).forEach(r => { s += `<line x1="${pl}" x2="${W - pr}" y1="${y(r.v).toFixed(1)}" y2="${y(r.v).toFixed(1)}" class="g-ref"/><text x="${W - pr - 4}" y="${(y(r.v) - 5).toFixed(1)}" class="g-ax g-reft" text-anchor="end">${esc(r.txt)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="g19" role="img" aria-label="${esc(o.titulo || 'Gráfica')}">${s}</svg>`;
}
function gLeyenda(items) { return '<div class="g-leg">' + items.map(i => `<span><i style="background:${i.color};${i.linea ? 'height:3px;border-radius:2px;' : ''}${i.punteada ? 'background:none;border-top:2px dashed ' + i.color + ';height:0;' : ''}"></i>${esc(i.txt)}</span>`).join('') + '</div>'; }
/* Barra de referencia (bullet) con bandas bajo/medio/adecuado/alto */
function gBala(v, rangos, maxV, invertido) {
  // rangos: [bajoHasta, medioHasta, altoDesde?]; maxV escala
  const M = maxV || Math.max(v * 1.2, (rangos[2] || rangos[1]) * 1.4); const p = x => Math.max(0, Math.min(100, x / M * 100));
  const b1 = p(rangos[0]), b2 = p(rangos[1]), b3 = rangos[2] != null ? p(rangos[2]) : 100;
  return `<div class="bala"><i style="left:0;width:${b1}%" class="b-bajo"></i><i style="left:${b1}%;width:${b2 - b1}%" class="b-medio"></i><i style="left:${b2}%;width:${b3 - b2}%" class="b-ok"></i>${b3 < 100 ? `<i style="left:${b3}%;width:${100 - b3}%" class="b-alto"></i>` : ''}<b style="left:${p(v)}%"></b></div>`;
}
function kpi19(etq, val, sub, tono, icono) { return `<div class="k19 ${tono || ''}">${icono ? `<span class="k19-ic"><svg><use href="#${icono}"/></svg></span>` : ''}<div class="k19-l">${etq}</div><div class="k19-v">${val}</div>${sub ? `<div class="k19-s">${sub}</div>` : ''}</div>`; }
function subnav19(id, tabs, actual, fn) { return `<div class="subnav s19" id="${id}">${tabs.map(([k, t]) => `<button class="${k === actual ? 'active' : ''}" onclick="${fn}('${k}')">${t}</button>`).join('')}</div>`; }
function mesesAtras(n, hasta) { const out = []; const d = parseFecha((hasta || hoyLocal()).slice(0, 7) + '-01'); for (let k = n - 1; k >= 0; k--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - k, 1)); out.push(x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0')); } return out; }
const mesCorto = ym => MESES[Number(ym.slice(5, 7)) - 1] + (ym.slice(5, 7) === '01' ? ' ' + ym.slice(2, 4) : '');
function descargarCSV(nombre, filas) {
  const csv = '﻿' + filas.map(f => f.map(c => { const t = c == null ? '' : String(c); return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';')).join('\n');
  ofrecerDescarga(nombre, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}
