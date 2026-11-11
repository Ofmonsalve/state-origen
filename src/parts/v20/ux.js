/* ================= v20: experiencia de uso — tablero por pestañas, explicaciones plegables, menú y búsqueda ================= */
const TB_TABS = [['resumen', 'Resumen', ['sec-resumen']], ['rent', 'Rentabilidad y caja', ['sec-rent', 'sec-caja', 'sec-fin']], ['prod', 'Producción y proyección', ['sec-prod', 'sec-lotes', 'sec-proy']],
  ['cultivo', 'Cultivo, clima y suelo', ['sec-salud', 'sec-clima']], ['equipo', 'Personas y operación', ['sec-personas', 'sec-oper']], ['analisis', 'Análisis', ['sec-disp']], ['datos', 'Calidad de datos', ['sec-datos']]];
let tbTab = 'resumen'; try { tbTab = localStorage.getItem('so-tbtab') || 'resumen'; } catch (e) {}
if (!TB_TABS.some(t => t[0] === tbTab)) tbTab = 'resumen';
function pintarTabsTablero() {
  const nav = document.querySelector('#view-tablero .tb-nav'); if (!nav) return;
  if (!nav.dataset.v20) { nav.dataset.v20 = '1'; nav.setAttribute('role', 'tablist'); nav.innerHTML = TB_TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" onclick="cambiarTabTablero('${k}')">${t}</button>`).join(''); }
  nav.querySelectorAll('button').forEach(b => { const on = b.dataset.tab === tbTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const vis = new Set((TB_TABS.find(t => t[0] === tbTab) || TB_TABS[0])[2]);
  document.querySelectorAll('#view-tablero .tb-sec').forEach(s => s.classList.toggle('tb-on', vis.has(s.id)));
  document.getElementById('view-tablero').classList.add('tb-tabs');
}
function cambiarTabTablero(k) { tbTab = k; try { localStorage.setItem('so-tbtab', k); } catch (e) {} pintarTabsTablero(); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
irSeccionTb = function (id) {
  const el = document.getElementById(id); if (!el) return; const sec = el.closest('.tb-sec') || el; const t = TB_TABS.find(x => x[2].includes(sec.id)); if (t && t[0] !== tbTab) cambiarTabTablero(t[0]);
  setTimeout(() => { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 40);
};
const _renderTablero19 = renderTablero;
renderTablero = function () { const r = _renderTablero19.apply(this, arguments); try { pintarTabsTablero(); } catch (e) {} return r; };

/* ---- Explicaciones largas plegadas: la pantalla muestra datos, la explicación queda a un toque ---- */
function plegarAyudas(raiz) {
  (raiz || document).querySelectorAll('.card p.hint, .card div.hint, .card .tb-nota').forEach(p => {
    if (p.dataset.pleg || p.closest('details.ayuda') || p.closest('.modal') || p.closest('#modal-box') || p.closest('.empty')) return; p.dataset.pleg = '1';
    const txt = (p.textContent || '').trim(); if (txt.length < 150 || p.querySelector('button, select, input')) return;
    const d = document.createElement('details'); d.className = 'ayuda'; const s = document.createElement('summary'); s.textContent = /calcul|=|÷|proporci/i.test(txt) ? 'Cómo se calcula' : 'Cómo leer este dato';
    p.parentNode.insertBefore(d, p); d.appendChild(s); d.appendChild(p); p.style.margin = '6px 0 0';
  });
}
let _plegPend = false;
function observarAyudas() {
  const host = document.getElementById('content'); if (!host || host._pleg20 || typeof MutationObserver === 'undefined') return; host._pleg20 = true;
  new MutationObserver(() => { if (_plegPend) return; _plegPend = true; (window.requestAnimationFrame || setTimeout)(() => { _plegPend = false; try { plegarAyudas(host); } catch (e) {} }); }).observe(host, { childList: true, subtree: true });
}
const _showView19 = showView;
showView = function (name) { const r = _showView19.apply(this, arguments); try { observarAyudas(); plegarAyudas(document.getElementById('content')); } catch (e) {} return r; };

/* ---- Menú «Más» (móvil) y búsqueda ---- */
window.abrirMas = function () {
  hojaAcciones('Todos los módulos', [
    { ic: 'i-tablero', t: 'Tablero', s: 'Resumen ejecutivo por pestañas', fn: () => ir('tablero') },
    { ic: 'i-reporte', t: 'Reportes PDF', s: VISTAS.reportes.s, fn: () => ir('reportes') },
    { ic: 'i-mapa', t: 'Maqueta y muestreos', s: 'Vista realista de la finca, mapas de calor y muestreos', fn: () => ir('mapa') },
    { ic: 'i-lote', t: 'Ficha del lote', s: VISTAS.lote.s, fn: () => ir('lote') },
    { ic: 'i-calendario', t: 'Plan agronómico', s: VISTAS.agronomia.s, fn: () => ir('agronomia') },
    { ic: 'i-suelo', t: 'Suelo y clima', s: VISTAS.suelo.s, fn: () => ir('suelo') },
    { ic: 'i-oper', t: 'Operación', s: VISTAS.operacion.s, fn: () => ir('operacion') },
    { ic: 'i-personal', t: 'Personal', s: VISTAS.personal.s, fn: () => ir('personal') },
    { ic: 'i-venta', t: 'Ventas y trazabilidad', s: VISTAS.comercial.s, fn: () => ir('comercial') },
    { ic: 'i-finanzas', t: 'Contabilidad y finanzas', s: VISTAS.finanzas.s, fn: () => ir('finanzas') },
    { ic: 'i-diseno', t: 'Diseño de cultivo', s: VISTAS.disenos.s, fn: () => ir('disenos') },
    { ic: 'i-analisis', t: 'Análisis', s: VISTAS.analisis.s, fn: () => ir('analisis') },
    { ic: 'i-finca', t: 'Finca y lotes', s: VISTAS.gestion.s, fn: () => ir('gestion') },
    { ic: 'i-buscar', t: 'Buscar o ejecutar', s: 'Órdenes, lotes, ventas, personas, reportes y acciones', fn: abrirComandos },
    { ic: 'i-tema', t: 'Cambiar tema', s: 'Claro u oscuro', fn: cambiarTema },
  ]);
};
const _catalogoComandos19 = catalogoComandos;
catalogoComandos = function () {
  const L = _catalogoComandos19.apply(this, arguments) || [];
  try { REPORTES.forEach(r => L.push({ sec: 'Reportes PDF', t: r.t, s: r.cat + ' · ' + r.d.slice(0, 70) + '…', ic: 'i-pdf', fn: () => { ir('reportes'); setTimeout(() => { const b = document.querySelector('.rep-card[data-rep="' + r.id + '"] .rep-go'); if (b) { b.scrollIntoView({ block: 'center' }); b.focus(); } }, 80); } }));
    lotesActivos().forEach(l => L.push({ sec: 'Lotes', t: 'Ficha de ' + l.nombre, s: 'Forma real, sanidad, suelo, producción y costos', ic: 'i-lote', fn: () => abrirFichaLote(l.id) })); } catch (e) {}
  return L;
};
