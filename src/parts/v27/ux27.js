/* ================= v27 · Claridad: navegación por áreas, subnavegación, menús compactos, plegables y exportación de tablas ================= */
const AREAS27 = [
  { k: 'inicio', t: 'Inicio', ic: 'i-hoy', d: 'Lo de hoy, indicadores y reportes', v: ['hoy', 'mando', 'tablero', 'analisis', 'reportes'] },
  { k: 'cosecha', t: 'Cosecha y personal', ic: 'i-cosecha', d: 'Pesadas, pases, beneficio, liquidación y pagos', v: ['panel', 'personal'] },
  { k: 'labores', t: 'Labores', ic: 'i-plan', d: 'Plan semanal, órdenes de trabajo y labores', v: ['planeacion', 'operacion'] },
  { k: 'cultivo', t: 'Cultivo', ic: 'i-mapa', d: 'Maqueta, lotes, seguimiento, plan agronómico, suelo y diseño', v: ['mapa', 'lote', 'campo', 'agronomia', 'suelo', 'disenos'] },
  { k: 'comercial', t: 'Comercial', ic: 'i-venta', d: 'Ventas, trazabilidad y de la finca a la taza', v: ['comercial', 'taza'] },
  { k: 'finanzas', t: 'Finanzas', ic: 'i-finanzas', d: 'Contabilidad, caja, créditos y costos', v: ['finanzas'] },
  { k: 'finca', t: 'Finca y legal', ic: 'i-finca', d: 'Finca, lotes, predio y cumplimiento', v: ['gestion', 'legal'] }
];
const CORTO27 = { hoy: 'Hoy', mando: 'Centro de mando', tablero: 'Tablero', analisis: 'Análisis', reportes: 'Reportes', panel: 'Cosecha', personal: 'Personal', planeacion: 'Plan semanal', operacion: 'Órdenes y labores', mapa: 'Maqueta', lote: 'Ficha del lote', campo: 'Seguimiento', agronomia: 'Plan agronómico', suelo: 'Suelo y clima', disenos: 'Diseño', comercial: 'Ventas y trazabilidad', taza: 'Finca a la taza', finanzas: 'Contabilidad', gestion: 'Finca y lotes', legal: 'Predio y cumplimiento' };
const ICONO27 = { hoy: 'i-hoy', mando: 'i-tablero', tablero: 'i-tablero', analisis: 'i-analisis', reportes: 'i-reporte', panel: 'i-cosecha', personal: 'i-personal', planeacion: 'i-plan', operacion: 'i-oper', mapa: 'i-mapa', lote: 'i-lote', campo: 'i-labor', agronomia: 'i-calendario', suelo: 'i-suelo', disenos: 'i-diseno', comercial: 'i-venta', taza: 'i-venta', finanzas: 'i-finanzas', gestion: 'i-finca', legal: 'i-reporte' };
const areaDe27 = v => AREAS27.find(a => a.v.includes(v)) || AREAS27[0];
const ultimaDeArea27 = {}; const abiertas27 = new Set();
const CHEV27 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const ico27 = (id, c) => `<svg class="${c || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* ---------- Menú lateral por áreas (acordeón): reutiliza los mismos botones, sus insignias y sus atajos ---------- */
function armarMenu27() { const side = document.querySelector('.sidebar'); if (!side || side.dataset.v27) return; side.dataset.v27 = '1';
  const items = {}; side.querySelectorAll('.nav-item[data-nav]').forEach(b => { items[b.dataset.nav] = b; }); side.querySelectorAll('.nav-group').forEach(g => g.remove());
  const nav = document.createElement('nav'); nav.className = 'nav27'; nav.setAttribute('aria-label', 'Áreas');
  AREAS27.forEach(a => { const g = document.createElement('div'); g.className = 'area27'; g.dataset.area = a.k;
    const vs = a.v.filter(v => VISTAS[v] && items[v]); if (!vs.length) return;
    g.innerHTML = `<button class="area27-h" type="button" onclick="clicArea27('${a.k}')" aria-expanded="false">${ico27(a.ic, 'area27-i')}<span>${a.t}</span><span class="area27-b" hidden></span>${vs.length > 1 ? CHEV27.replace('<svg ', '<svg class="area27-c" ') : ''}</button><div class="area27-l"></div>`;
    const l = g.querySelector('.area27-l'); vs.forEach(v => { const b = items[v]; const svg = b.querySelector('svg'); if (svg) svg.remove(); const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = CORTO27[v] || t.textContent; l.appendChild(b); });
    if (vs.length === 1) g.classList.add('solo'); nav.appendChild(g); });
  side.querySelectorAll('.nav-item[data-nav]').forEach(b => { if (!b.closest('.nav27')) b.remove(); });
  const brand = side.querySelector('.brand'); brand.insertAdjacentElement('afterend', nav); actualizarInsignias27(); }
function clicArea27(k) { const a = AREAS27.find(x => x.k === k); if (!a) return; const vs = a.v.filter(v => VISTAS[v]);
  if (vs.length === 1) { ir(vs[0]); return; } const cur = areaDe27(vistaActual).k === k;
  if (cur) { if (cerradas27.has(k)) cerradas27.delete(k); else cerradas27.add(k); pintarMenu27(); return; }
  ir(ultimaDeArea27[k] && vs.includes(ultimaDeArea27[k]) ? ultimaDeArea27[k] : vs[0]); }
const cerradas27 = new Set();
function pintarMenu27() { const cur = areaDe27(vistaActual).k; document.querySelectorAll('.area27').forEach(g => { const k = g.dataset.area; const ab = !g.classList.contains('solo') && (k === cur ? !cerradas27.has(k) : abiertas27.has(k));
    g.classList.toggle('activa', k === cur); g.classList.toggle('abierta', ab); const h = g.querySelector('.area27-h'); if (h) h.setAttribute('aria-expanded', String(ab)); }); }
function actualizarInsignias27() { document.querySelectorAll('.area27').forEach(g => { let n = 0, mal = false; g.querySelectorAll('.nav-item .badge:not([hidden])').forEach(b => { const x = parseInt(b.textContent, 10); if (x) { n += x; if (!b.classList.contains('soft')) mal = true; } });
    const s = g.querySelector('.area27-b'); if (s) { s.hidden = !n; s.textContent = n; s.classList.toggle('mal', mal); } }); }

/* ---------- Cabecera: área como antetítulo y subnavegación entre las páginas del área ---------- */
function armarCabecera27() { const ph = document.querySelector('.page-head'); if (ph && !document.getElementById('eyebrow27')) ph.insertAdjacentHTML('afterbegin', '<span class="eyebrow27" id="eyebrow27"></span>');
  const ct = document.getElementById('content'); if (ct && !document.getElementById('subnav27')) ct.insertAdjacentHTML('afterbegin', '<nav class="subnav27" id="subnav27" aria-label="Páginas del área"></nav>'); }
function pintarCabecera27(name) { const a = areaDe27(name); const vs = a.v.filter(v => VISTAS[v]); const eb = document.getElementById('eyebrow27'); if (eb) eb.innerHTML = `${ico27(a.ic)}${a.t}`;
  const sn = document.getElementById('subnav27'); if (!sn) return; sn.hidden = vs.length < 2;
  sn.innerHTML = vs.map(v => `<button type="button" class="${v === name ? 'on' : ''}" onclick="ir('${v}')" ${v === name ? 'aria-current="page"' : ''}>${ico27(ICONO27[v] || a.ic)}<span>${CORTO27[v] || VISTAS[v].t}</span></button>`).join(''); }
const _showView26 = showView;
showView = function (name) { _showView26.apply(this, arguments); const v = vistaActual; ultimaDeArea27[areaDe27(v).k] = v; try { armarMenu27(); armarCabecera27(); pintarCabecera27(v); pintarMenu27(); } catch (e) { dlog('✗ menú: ' + e.message, 'err'); } programarPase27(); };

/* Móvil: «Más» muestra todas las áreas con sus páginas */
abrirMas = function () { hojaAcciones('Todas las secciones', AREAS27.flatMap(a => a.v.filter(v => VISTAS[v]).map((v, i) => ({ ic: ICONO27[v] || a.ic, t: (i === 0 ? a.t + ' · ' : '') + (CORTO27[v] || VISTAS[v].t), s: VISTAS[v].s, fn: () => ir(v) })))); };

/* ---------- Pase de claridad sobre lo que cada vista dibuja ---------- */
let _pase27 = 0;
function programarPase27() { if (_pase27) return; _pase27 = requestAnimationFrame(() => { _pase27 = 0; try { pase27(document.getElementById('content')); actualizarInsignias27(); } catch (e) { dlog('✗ claridad: ' + e.message, 'err'); } }); }
function pase27(root) { if (!root) return; pestanas27(root); acciones27(root); plegables27(root); diasCosecha27(root); personas27(root); alertas27(root); tablas27(root); }
try { const mo = new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !(n.classList && (n.classList.contains('menu27') || n.classList.contains('acc27')))))) programarPase27(); }); document.addEventListener('DOMContentLoaded', () => { const c = document.getElementById('content'); if (c) mo.observe(c, { childList: true, subtree: true }); }); const c0 = document.getElementById('content'); if (c0) mo.observe(c0, { childList: true, subtree: true }); } catch (e) {}

/* 1. Barras con muchas pestañas: las primeras a la vista y el resto en «Más» (la activa siempre visible) */
function pestanas27(root) { root.querySelectorAll('.cs-tabs, [role=tablist]').forEach(bar => { if (bar.dataset.p27 || bar.closest('.modal-box')) return; const bs = [...bar.children].filter(b => b.tagName === 'BUTTON' && /\S/.test(b.textContent) && !/^[‹›]$/.test(b.textContent.trim()));
  const lim = bar.classList.contains('cs-tabs') ? 6 : 8; if (bs.length <= lim + 1) return; bar.dataset.p27 = '1'; const on = bs.find(b => b.classList.contains('on') || b.classList.contains('active') || b.getAttribute('aria-selected') === 'true');
  let vis = bs.slice(0, lim - 1); if (on && !vis.includes(on)) vis = vis.slice(0, lim - 2).concat([on]); const ocultos = bs.filter(b => !vis.includes(b)); ocultos.forEach(b => b.classList.add('p27-oculto'));
  const m = document.createElement('button'); m.type = 'button'; m.className = 'p27-mas' + (ocultos.includes(on) ? ' on' : ''); m.innerHTML = `Más <b>${ocultos.length}</b> ${CHEV27}`; m.onclick = ev => { ev.stopPropagation(); menu27(m, ocultos.map(b => ({ t: b.textContent.trim(), fn: () => b.click() }))); }; bar.appendChild(m); }); }

/* 2. Acciones por fila: una acción a la vista y el resto en «⋯»; lo destructivo nunca queda suelto */
const DESTR27 = /eliminar|borrar|anular|quitar|✕|×/i;
function acciones27(root) { root.querySelectorAll('td.actions, td:last-child, .cs-dia-a, .worker-head > span[style*="display:flex"], .mp-actions.fila').forEach(c => { if (c.dataset.a27 || c.closest('.modal-box') || c.closest('thead')) return;
  const bs = [...c.querySelectorAll(':scope > button, :scope > a.btn, :scope > span > button')].filter(b => !b.closest('.acc27')); if (bs.length < 2) return; c.dataset.a27 = '1';
  const prim = bs.find(b => !DESTR27.test(b.textContent + (b.getAttribute('aria-label') || '')) && !b.classList.contains('danger-ghost')) || null; const resto = bs.filter(b => b !== prim);
  resto.forEach(b => b.classList.add('a27-oculto')); const k = document.createElement('button'); k.type = 'button'; k.className = 'acc27'; k.setAttribute('aria-label', 'Más acciones'); k.title = 'Más acciones'; k.innerHTML = '<i></i><i></i><i></i>';
  k.onclick = ev => { ev.stopPropagation(); menu27(k, resto.map(b => ({ t: (b.textContent.trim() === '✕' || b.textContent.trim() === '×') ? 'Eliminar' : (b.textContent.trim() || b.getAttribute('aria-label') || 'Acción'), peligro: DESTR27.test(b.textContent + (b.getAttribute('aria-label') || '')) || b.classList.contains('danger-ghost'), fn: () => b.click() }))); };
  if (prim) prim.insertAdjacentElement('afterend', k); else c.appendChild(k); c.classList.add('c27'); }); }
function menu27(ancla, items) { cerrarMenu27(); const m = document.createElement('div'); m.className = 'menu27'; m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.peligro ? 'peligro' : ''}">${esc(it.t)}</button>`).join(''); document.body.appendChild(m);
  m.querySelectorAll('button').forEach(b => b.onclick = () => { cerrarMenu27(); items[+b.dataset.i].fn(); }); const r = ancla.getBoundingClientRect(); const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px'; m.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px'; setTimeout(() => { const b = m.querySelector('button'); if (b) b.focus(); }, 0); }
function cerrarMenu27() { document.querySelectorAll('.menu27').forEach(m => m.remove()); }
document.addEventListener('click', e => { if (!e.target.closest('.menu27')) cerrarMenu27(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu27(); }); window.addEventListener('scroll', cerrarMenu27, true);

/* 3. Formularios de alta y parámetros plegados hasta que se necesiten */
const PLEG27 = /^(Parámetros|Configuración|Nuevo recolector|Nuevo empleado|Nuevo |Nueva |Agregar |Referencias)/i; const pleg27Abiertos = new Set();
function plegables27(root) { root.querySelectorAll('.card').forEach(card => { if (card.dataset.f27) return; const t = card.querySelector(':scope > .title'); if (!t) return; const txt = t.textContent.trim(); if (!PLEG27.test(txt) || !card.querySelector('input, select, textarea')) return;
  card.dataset.f27 = '1'; card.classList.add('f27'); const key = vistaActual + '|' + txt.slice(0, 40); if (!pleg27Abiertos.has(key)) card.classList.add('cerrada');
  t.setAttribute('role', 'button'); t.tabIndex = 0; t.insertAdjacentHTML('beforeend', `<span class="f27-x">${/^(Nuevo|Nueva|Agregar)/i.test(txt) ? '+ Abrir' : 'Ajustar'}</span>`);
  const tg = () => { card.classList.toggle('cerrada'); if (card.classList.contains('cerrada')) pleg27Abiertos.delete(key); else pleg27Abiertos.add(key); }; t.onclick = e => { if (e.target.closest('input,select,button:not(.f27-x)')) return; tg(); }; t.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tg(); } }; }); }

/* 4. Cosecha: los días anteriores se muestran resumidos; se abren con un toque */
let diasVisibles27 = 8; const dias27Abiertos = new Set();
function diasCosecha27(root) { const host = root.querySelector('#cs-dias') || root.querySelector('#cs-cuerpo'); if (!host) return; const ds = [...host.querySelectorAll('.cs-dia')]; if (!ds.length || (!ds.some(d => !d.dataset.d27) && host.dataset.d27 === String(diasVisibles27))) return; host.dataset.d27 = String(diasVisibles27);
  ds.forEach((d, i) => { const key = (d.querySelector('.cs-dia-h b') || {}).textContent || i; if (!d.dataset.d27) { d.dataset.d27 = '1'; const h = d.querySelector('.cs-dia-h'); if (h) { h.classList.add('d27-h'); (h.firstElementChild || h).insertAdjacentHTML('afterbegin', `<span class="d27-c">${CHEV27}</span>`); h.onclick = e => { if (e.target.closest('button, .acc27')) return; d.classList.toggle('cerrado'); if (d.classList.contains('cerrado')) dias27Abiertos.delete(key); else dias27Abiertos.add(key); }; }
      d.classList.toggle('cerrado', i > 0 && !dias27Abiertos.has(key)); }
    d.classList.toggle('d27-fuera', i >= diasVisibles27); });
  const prev = host.querySelector('.d27-mas'); if (prev) prev.remove(); if (ds.length > diasVisibles27) ds[diasVisibles27 - 1].insertAdjacentHTML('afterend', `<button type="button" class="btn ghost d27-mas" onclick="diasVisibles27+=10;programarPase27()">Ver ${Math.min(10, ds.length - diasVisibles27)} días anteriores <small>(${ds.length - diasVisibles27} más)</small></button>`); }

/* 5. Personal: cada persona en una fila compacta con lo que se le debe; el detalle se abre al tocarla */
const pers27Abiertas = new Set();
function personas27(root) { const host = root.querySelector('#lista-trabajadores'); if (!host) return; host.classList.add('p27'); [...host.querySelectorAll('.worker-card')].forEach(c => { if (c.dataset.w27) return; c.dataset.w27 = '1';
  const nombre = (c.querySelector('.name') || {}).textContent || ''; const stats = [...c.querySelectorAll('.ws')].map(w => ({ n: (w.querySelector('.n') || {}).textContent || '', l: (w.querySelector('.l') || {}).textContent || '' }));
  const neto = stats.find(s => /^Neto a pagar/i.test(s.l.trim())); const kg = stats.find(s => /Kg sin/i.test(s.l)); const deuda = stats.find(s => /Deuda/i.test(s.l)); const vacio = stats.every(s => /^[\s$0,.\-]*$/.test(s.n.replace(/[^\d$,.\-]/g, '')) && !/[1-9]/.test(s.n));
  const head = c.querySelector('.worker-head'); if (!head) return; head.classList.add('w27-h');
  head.querySelector('.who').insertAdjacentHTML('afterend', `<div class="w27-res">${kg && /[1-9]/.test(kg.n) ? `<span><small>Sin liquidar</small><b>${esc(kg.n)} kg</b></span>` : ''}${deuda && /[1-9]/.test(deuda.n) ? `<span><small>Deuda</small><b>${esc(deuda.n)}</b></span>` : ''}<span class="${neto && /-/.test(neto.n) ? 'neg' : neto && /[1-9]/.test(neto.n) ? 'pos' : ''}"><small>Neto a pagar</small><b>${esc(neto ? neto.n : '$0')}</b></span></div>`);
  const key = nombre.trim(); c.classList.toggle('cerrada', !pers27Abiertas.has(key)); c.classList.toggle('w27-vacio', vacio);
  head.onclick = e => { if (e.target.closest('button, .acc27, a')) return; c.classList.toggle('cerrada'); if (c.classList.contains('cerrada')) pers27Abiertas.delete(key); else pers27Abiertas.add(key); }; }); }

/* 6. Listas de alertas largas: las más importantes primero y el resto bajo «Ver todas» */
function alertas27(root) { root.querySelectorAll('.md24-al').forEach(l => { if (l.querySelector(':scope > .l27-mas')) return; const xs = [...l.children]; if (xs.length <= 7) return; xs.forEach((x, i) => { if (!x.classList.contains('l27-mas')) x.classList.toggle('l27-oculto', i >= 6); });
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small l27-mas'; b.textContent = 'Ver todas (' + xs.length + ')'; b.onclick = () => { xs.forEach(x => x.classList.remove('l27-oculto')); b.remove(); }; l.appendChild(b); }); }

/* 7. Toda tabla se puede descargar en CSV (abre en Excel) o copiar */
function tablas27(root) { root.querySelectorAll('.card').forEach(card => { if (card.dataset.t27) return; const tb = card.querySelector('table.dtable, table.data, table'); const t = card.querySelector(':scope > .title'); if (!tb || !t || tb.querySelectorAll('tbody tr').length < 2) return; card.dataset.t27 = '1';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'csv27'; b.title = 'Descargar o copiar la tabla'; b.setAttribute('aria-label', 'Descargar o copiar la tabla'); b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  b.onclick = ev => { ev.stopPropagation(); const nom = t.childNodes[0] ? String(t.childNodes[0].textContent).trim() : 'tabla'; menu27(b, [{ t: 'Descargar CSV (Excel)', fn: () => descargarCSV27(tb, nom) }, { t: 'Copiar la tabla', fn: () => copiarTabla27(tb) }]); }; t.appendChild(b); }); }
function filasTabla27(tb) { const ths = [...tb.querySelectorAll('thead th')].map(th => th.textContent.trim()); const util = ths.map((h, i) => h || [...tb.querySelectorAll('tbody tr')].some(tr => tr.children[i] && !tr.children[i].querySelector('button') && tr.children[i].textContent.trim()));
  const limpia = c => { const x = c.cloneNode(true); x.querySelectorAll('button, .acc27, svg').forEach(e => e.remove()); x.querySelectorAll('br').forEach(e => e.replaceWith(' · ')); return String(x.textContent || '').replace(/\s+/g, ' ').replace(/( · )+$/, '').trim(); };
  const filas = [ths.filter((h, i) => util[i])]; tb.querySelectorAll('tbody tr, tfoot tr').forEach(tr => { if (tr.hidden || tr.closest('[hidden]')) return; const cs = [...tr.children]; if (cs.length === 1 && cs[0].colSpan > 1) return; filas.push(cs.filter((c, i) => util[i] !== false).map(limpia)); }); return filas; }
function descargarCSV27(tb, nom) { const f = filasTabla27(tb); const csv = '﻿' + f.map(r => r.map(v => { const n = /^-?\$?\s?[\d.]+(,\d+)?(\s?(%|kg|ha|und))?$/.test(v) ? v.replace(/\$\s?/, '') : v; return /[;"\n]/.test(n) ? '"' + n.replace(/"/g, '""') + '"' : n; }).join(';')).join('\r\n');
  ofrecerDescarga(nombreArchivo(String(nom || 'tabla').slice(0, 40) || 'tabla').replace(/\.pdf$/, '.csv'), new Blob([csv], { type: 'text/csv;charset=utf-8' })); toast('Tabla descargada en CSV.'); }
function copiarTabla27(tb) { const t = filasTabla27(tb).map(r => r.join('\t')).join('\n'); try { navigator.clipboard.writeText(t).then(() => toast('Tabla copiada: péguela en Excel o en Sheets.'), () => toast('No se pudo copiar.', 'err')); } catch (e) { toast('No se pudo copiar.', 'err'); } }
