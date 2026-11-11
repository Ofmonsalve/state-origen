/* ================= v20: finca real (vías, punto de referencia) ================= */
ICONO_PUNTO['Referencia'] = '◎'; ICONO_PUNTO['Vía'] = '═';
function dibujarViasFinca(ctx, f, V, pal) {
  (f.vias || []).forEach(v => { if (!v.pts || v.pts.length < 2) return; ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    trazarLinea(ctx, v.pts, V); ctx.strokeStyle = pal.bg; ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(5, 5.5 * V.k / 1.4); ctx.stroke();
    trazarLinea(ctx, v.pts, V); ctx.strokeStyle = pal.via || '#C8A46E'; ctx.globalAlpha = 1; ctx.lineWidth = Math.max(3, 3.6 * V.k / 1.4); ctx.stroke();
    // nombre a mitad de la vía, alineado con el tramo
    const n = v.pts.length; const i = Math.max(0, Math.floor(n / 2) - 1); const a = V.aPantalla(v.pts[i][0], v.pts[i][1]), b = V.aPantalla(v.pts[i + 1][0], v.pts[i + 1][1]);
    let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
    ctx.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); ctx.rotate(ang); ctx.font = 'italic 600 10px "Figtree", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3; ctx.strokeStyle = pal.bg; ctx.strokeText(v.nombre || 'Vía', 0, -6); ctx.fillStyle = pal.suave; ctx.fillText(v.nombre || 'Vía', 0, -6); ctx.restore(); });
}
const _dibujarPuntosFinca19 = dibujarPuntosFinca;
dibujarPuntosFinca = function (ctx, f, V, pal) { try { dibujarViasFinca(ctx, f || {}, V, pal); } catch (e) {} return _dibujarPuntosFinca19(ctx, f, V, pal); };
