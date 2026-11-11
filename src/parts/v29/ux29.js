/* ================= v29 · Menos botones a la vista y diseño que se ajusta a celular, tablet y computador ================= */

/* 1. Barras de acciones: queda a la vista solo la acción principal; el resto va a «⋯» */
const SOLO_MENU29 = '.cs-dia-a, .worker-head > span';
function barras29(root) { root.querySelectorAll('.mp-actions, .week-actions, .mp-btns, .cs-dia-a, .worker-head > span, .fl-head .mp-actions').forEach(c => { if (c.dataset.b29 || c.closest('.modal-box, .menu27, .mapa-zoom, .quick, .week-nav')) return;
  const bs = [...c.querySelectorAll(':scope > button, :scope > a.btn, :scope > span > button, :scope > span > a.btn')].filter(b => !b.classList.contains('acc27') && !b.classList.contains('a27-oculto') && !b.closest('.acc27')); if (bs.length < 2) return; c.dataset.b29 = '1'; c.dataset.a27 = '1';
  const soloMenu = c.matches(SOLO_MENU29); const prim = soloMenu ? null : (bs.find(b => b.classList.contains('primary')) || bs.find(b => /^\s*\+/.test(b.textContent)) || (c.matches('.mp-btns') ? null : bs[0])); const resto = bs.filter(b => b !== prim);
  if (c.matches('.mp-btns') && !prim && bs.length <= 3 && !c.closest('#md-root')) { c.dataset.b29 = ''; c.dataset.a27 = ''; return; }
  resto.forEach(b => b.classList.add('a27-oculto')); const k = document.createElement('button'); k.type = 'button'; k.className = 'acc27 acc29'; k.title = 'Más opciones'; k.setAttribute('aria-label', 'Más opciones'); k.innerHTML = '<i></i><i></i><i></i>';
  k.onclick = ev => { ev.stopPropagation(); menu27(k, resto.map(b => { const t = (b.textContent || '').replace(/\s+/g, ' ').trim(); return { t: t === '✕' || t === '×' ? 'Eliminar' : (t || b.getAttribute('aria-label') || 'Acción'), peligro: DESTR27.test(t + (b.getAttribute('aria-label') || '')) || b.classList.contains('danger-ghost'), fn: () => b.click() }; })); };
  c.appendChild(k); c.classList.add('b29'); }); }

/* 2. Filas de tablas y alertas: se tocan completas (como una lista de iOS) en vez de tener un botón cada una */
const CHEV29 = '<span class="chev29" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
function filas29(root) { root.querySelectorAll('table.dtable tbody tr, table tbody tr').forEach(tr => { if (tr.dataset.f29 || tr.closest('.modal-box') || !tr.children.length) return; tr.dataset.f29 = '1';
  const td = tr.lastElementChild; if (!td || td.tagName !== 'TD') return; const bs = [...td.querySelectorAll('button, a.btn')].filter(b => !b.classList.contains('a27-oculto') && !b.classList.contains('acc27') && !b.closest('.acc27')); const tieneMenu = !!td.querySelector('.acc27');
  if (bs.length !== 1 || td.querySelector('input, select, textarea')) return; const b = bs[0]; const t = (b.textContent || '') + (b.getAttribute('aria-label') || '');
  if (DESTR27.test(t) || b.classList.contains('danger-ghost')) { if (tieneMenu) return; b.classList.add('a27-oculto'); const k = document.createElement('button'); k.type = 'button'; k.className = 'acc27'; k.title = 'Más opciones'; k.innerHTML = '<i></i><i></i><i></i>'; k.onclick = ev => { ev.stopPropagation(); menu27(k, [{ t: 'Eliminar', peligro: true, fn: () => b.click() }]); }; td.appendChild(k); return; }
  if (tr.closest('thead, tfoot')) return; b.classList.add('a27-oculto'); tr.classList.add('fila29'); tr.title = b.textContent.trim(); if (!tieneMenu) td.insertAdjacentHTML('beforeend', CHEV29);
  tr.onclick = e => { if (e.target.closest('button, a, input, select, textarea, label, .acc27, .menu27, [onclick]:not(tr)')) return; b.click(); }; }); }
function alertas29(root) { root.querySelectorAll('.alert-row, .md24-a').forEach(r => { if (r.dataset.r29) return; const bs = [...r.querySelectorAll('button')]; if (bs.length !== 1) return; r.dataset.r29 = '1'; const b = bs[0];
  b.classList.add('a27-oculto'); r.classList.add('fila29'); r.insertAdjacentHTML('beforeend', CHEV29); r.onclick = e => { if (e.target.closest('a, input, select')) return; b.click(); }; }); }

/* 3. Más barras con desborde: subpestañas antiguas y chips de filtro */
function desborde29(root) { root.querySelectorAll('.subnav, .chip-row.md24-ch').forEach(bar => { if (bar.dataset.p27 || bar.closest('.modal-box')) return; const bs = [...bar.children].filter(b => b.tagName === 'BUTTON'); const lim = window.innerWidth < 700 ? 3 : bar.classList.contains('subnav') ? 6 : 5; if (bs.length <= lim + 1) return; bar.dataset.p27 = '1';
  const on = bs.find(b => /\b(on|active|activo)\b/.test(b.className) || b.getAttribute('aria-selected') === 'true'); let vis = bs.slice(0, lim - 1); if (on && !vis.includes(on)) vis = vis.slice(0, lim - 2).concat([on]); const ocultos = bs.filter(b => !vis.includes(b)); ocultos.forEach(b => b.classList.add('p27-oculto'));
  const m = document.createElement('button'); m.type = 'button'; m.className = 'p27-mas' + (ocultos.includes(on) ? ' on' : ''); m.innerHTML = `Más <b>${ocultos.length}</b> ${CHEV27}`; m.onclick = ev => { ev.stopPropagation(); menu27(m, ocultos.map(b => ({ t: b.textContent.trim(), fn: () => b.click() }))); }; bar.appendChild(m); }); }

/* 4. Plan semanal: el «+ Programar» de cada día se vuelve un «+» discreto */
function plan29(root) { root.querySelectorAll('.day-col > button').forEach(b => { if (b.dataset.d29 || !/^\+\s*Programar/.test(b.textContent.trim())) return; b.dataset.d29 = '1'; b.classList.add('add29'); b.title = 'Programar una orden este día'; b.setAttribute('aria-label', 'Programar una orden este día'); b.textContent = '+'; }); }

/* 5. En el celular las tablas se leen como tarjetas: cada dato con su etiqueta */
function apilar29(root) { root.querySelectorAll('table.dtable, .tscroll > table, table.data').forEach(tb => { if (tb.dataset.s29 === String(tb.rows.length) || tb.closest('.modal-box')) return; tb.dataset.s29 = String(tb.rows.length); const ths = [...tb.querySelectorAll('thead th')].map(th => th.textContent.trim()); if (ths.length < 3) return; tb.classList.add('apilable29');
  tb.querySelectorAll('tbody tr, tfoot tr').forEach(tr => [...tr.children].forEach((td, i) => { if (ths[i] && !td.dataset.l) td.dataset.l = ths[i]; })); }); }

/* 6b. En celular y tablet los filtros se agrupan en un botón «Filtros» */
function filtros29(root) { root.querySelectorAll('.chip-row').forEach(cr => { const ss = [...cr.querySelectorAll(':scope > select, :scope > .chip-row > select, :scope > div > select')].filter(x => !x.closest('.mp-actions')); if (ss.length < 3) return;
  let b = cr.querySelector(':scope > .f29'); const activos = ss.slice(1).filter(x => x.selectedIndex > 0).length; if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'f29'; b.onclick = () => { cr.classList.toggle('f29-abierto'); }; ss[0].insertAdjacentElement('afterend', b); }
  const h29 = `<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Filtros${activos ? ` <b>${activos}</b>` : ''}`; if (b.dataset.h !== h29) { b.dataset.h = h29; b.innerHTML = h29; } ss.slice(1).forEach(x => { if (!x.classList.contains('f29-x')) x.classList.add('f29-x'); }); if (!cr.classList.contains('f29-cr')) cr.classList.add('f29-cr'); }); }
alertas27 = function (root) { root.querySelectorAll('.md24-al').forEach(l => { if (l.dataset.todas || l.querySelector(':scope > .l27-mas')) return; const xs = [...l.children]; if (xs.length <= 7) return; xs.forEach((x, i) => x.classList.toggle('l27-oculto', i >= 6));
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small l27-mas'; b.textContent = 'Ver todas (' + xs.length + ')'; b.onclick = () => { l.dataset.todas = '1'; xs.forEach(x => x.classList.remove('l27-oculto')); b.remove(); }; l.appendChild(b); }); };
const _pase27b = pase27;
pase27 = function (root) { if (!root) return; barras29(root); _pase27b(root); filas29(root); alertas29(root); desborde29(root); plan29(root); apilar29(root); filtros29(root); };

/* 6. Reportes como lista agrupada: cada informe en una fila; al tocarla se eligen periodo o lote en una hoja */
const CATS_ORDEN29 = ['Gerencia', 'Cosecha y personal', 'Campo', 'Comercial', 'Finanzas', 'Estrategia', 'Datos'];
function resumenParams29(r) { return (r.p || []).map(k => { const ops = opcionesParam(k); const v = repSt.params[r.id + '.' + k] || (k === 'periodo' ? 'ult30' : (ops[0] || [''])[0]); return ((ops.find(o => o[0] === v) || ops[0] || ['', '—'])[1] || '').replace(' (ejemplo)', ''); }).filter(Boolean).join(' · '); }
renderReportes = function () { const root = document.getElementById('rep-root'); if (!root) return; const cats = ['Todos'].concat(CATS_ORDEN29.filter(c => REPORTES.some(r => r.cat === c)), [...new Set(REPORTES.map(r => r.cat))].filter(c => !CATS_ORDEN29.includes(c)));
  const lista = REPORTES.filter(r => repSt.cat === 'Todos' || r.cat === repSt.cat); const grupos = cats.slice(1).filter(c => lista.some(r => r.cat === c));
  root.innerHTML = `<div class="rep29-hero"><div><b>${REPORTES.length} informes y descargables</b><span>Toque uno para elegir periodo o lote; el botón de la derecha lo descarga de una vez.</span></div></div>
    <div class="capas seg rep-cats" role="tablist">${cats.map(c => `<button class="${repSt.cat === c ? 'on' : ''}" onclick="repSt.cat='${c}';renderReportes()">${c}</button>`).join('')}</div>
    ${grupos.map(g => `<div class="rep29-g"><div class="rep29-gt">${esc(g)}</div><div class="rep29-l">${lista.filter(r => r.cat === g).map(r => { const pr = resumenParams29(r); const xl = r.formato === 'xlsx';
      return `<article class="rep-card rep29" data-rep="${r.id}" onclick="if(!event.target.closest('.rep-go'))abrirReporte29('${r.id}')"><span class="rep29-i ${xl ? 'xl' : ''}"><svg><use href="#${r.ic}"/></svg></span><div class="rep29-t"><b>${esc(r.t)}</b><small>${esc(r.d)}</small>${pr ? `<em>${esc(pr)}</em>` : ''}</div>
        <button class="rep-go rep29-go ${xl ? 'xl' : ''}" onclick="event.stopPropagation();generarReporte('${r.id}', this)" title="${xl ? 'Descargar Excel' : 'Generar PDF'}"><span>${xl ? 'Excel' : 'PDF'}</span></button></article>`; }).join('')}</div></div>`).join('')}`; };
function abrirReporte29(id) { const r = REPORTES.find(x => x.id === id); if (!r) return; const xl = r.formato === 'xlsx';
  openModal(`<div class="rep-card rep29-sheet" data-rep="${r.id}"><div class="rep29-sh"><span class="rep29-i ${xl ? 'xl' : ''}"><svg><use href="#${r.ic}"/></svg></span><div><small>${esc(r.cat)} · ${esc(r.pag)}${/^\d|–/.test(r.pag) ? ' pág.' : ''}</small><h3>${esc(r.t)}</h3></div></div><p class="hint">${esc(r.d)}</p>
    ${(r.p || []).length ? `<div class="fgrid c2">${r.p.map(k => { const ops = opcionesParam(k); const v = repSt.params[r.id + '.' + k] || (k === 'periodo' ? 'ult30' : (ops[0] || [''])[0]); return `<label class="f">${ETQ_PARAM[k]}<select data-k="${k}" onchange="repSt.params['${r.id}.${k}']=this.value;guardarRepSt()">${ops.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('') || '<option value="">Sin datos</option>'}</select></label>`; }).join('')}</div>` : ''}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary rep-go" onclick="generarReporte('${r.id}', this);setTimeout(()=>{closeModal();renderReportes()},600)"><span>${xl ? 'Descargar Excel' : 'Generar PDF'}</span></button></div></div>`); }
generarReporte = function (id, btn) { const r = REPORTES.find(x => x.id === id); if (!r) return; if (!window.jspdf && r.formato !== 'xlsx') { toast('No se pudo cargar el generador de PDF. Revise la conexión.', 'err'); return; }
  const card = btn && btn.closest('.rep-card'); const p = {}; (r.p || []).forEach(k => { const s = card && card.querySelector('select[data-k="' + k + '"]'); p[k] = s ? s.value : (repSt.params[id + '.' + k] || (k === 'periodo' ? 'ult30' : (opcionesParam(k)[0] || [''])[0])); });
  const lbl = btn && (btn.querySelector('span') || btn.lastChild); const txt0 = lbl ? lbl.textContent : ''; if (btn) { btn.disabled = true; btn.classList.add('cargando'); if (lbl) lbl.textContent = '…'; }
  setTimeout(() => { try { r.fn(p); toast((r.formato === 'xlsx' ? 'Archivo listo: ' : 'Informe generado: ') + r.t, 'ok'); } catch (e) { dlog('✗ reporte ' + id + ': ' + e.message, 'err'); toast('No se pudo generar: ' + e.message, 'err'); }
    if (btn) { btn.disabled = false; btn.classList.remove('cargando'); if (lbl) lbl.textContent = txt0; } }, 30); };

/* 7. Tamaño de pantalla: clase en el documento para ajustes finos (celular, tablet, computador) */
function tamano29() { const w = window.innerWidth; const c = w < 640 ? 'cel' : w < 900 ? 'tab' : w < 1240 ? 'tab-h' : 'pc'; const de = document.documentElement; if (de.dataset.pantalla !== c) { de.dataset.pantalla = c; document.querySelectorAll('[data-p27]').forEach(b => { if (b.classList.contains('subnav') || b.classList.contains('md24-ch')) { b.dataset.p27 = ''; b.querySelectorAll('.p27-oculto').forEach(x => x.classList.remove('p27-oculto')); const m = b.querySelector('.p27-mas'); if (m) m.remove(); } }); programarPase27(); } }
tamano29(); window.addEventListener('resize', () => { clearTimeout(window._t29); window._t29 = setTimeout(tamano29, 120); });
