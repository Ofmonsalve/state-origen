/* ================= v31 · Editar todo lo registrado, órdenes de trabajo que se abren con un clic y formato de número, moneda y texto en los campos ================= */

/* ---------- Editores para lo que antes solo se podía eliminar ---------- */
const opsLotes31 = () => [['', '— Sin lote —']].concat(lotes.map(l => [l.id, l.nombre]));
const ED31 = {
  labor: { lista: () => labores, titulo: 'Labor agronómica', nombre: x => (x.tipo || 'Labor') + ' · ' + fechaCorta(x.fecha), re: () => { renderOperacion(); renderTodo(); },
    bloquea: x => x.otId ? 'Esta labor viene del cierre de la ' + (x.otNumero || 'orden de trabajo') + ': corríjala desde la orden (Anular cierre).' : '',
    campos: () => [{ k: 'fecha', t: 'Fecha', tipo: 'date', req: true }, { k: 'loteId', t: 'Lote', tipo: 'sel', ops: opsLotes31 }, { k: 'tipo', t: 'Labor', tipo: 'sel', ops: TIPOS_LABOR, req: true },
      { k: 'insumo', t: 'Insumo usado' }, { k: 'cantidad', t: 'Cantidad del insumo', tipo: 'num' }, { k: 'costo', t: 'Costo total ($)', tipo: 'num', req: true }, { k: 'responsable', t: 'Responsable' }, { k: 'notas', t: 'Observaciones', tipo: 'area', ancho: true }] },
  clima: { lista: () => clima, titulo: 'Registro de clima', nombre: x => 'Clima del ' + fechaCorta(x.fecha), re: () => renderSueloClima(),
    campos: () => [{ k: 'fecha', t: 'Fecha', tipo: 'date', req: true }, { k: 'lluvia', t: 'Lluvia (mm)', tipo: 'num' }, { k: 'tmax', t: 'Temperatura máxima (°C)', tipo: 'num' }, { k: 'tmin', t: 'Temperatura mínima (°C)', tipo: 'num' }, { k: 'hr', t: 'Humedad relativa (%)', tipo: 'num' }] },
  mov: { lista: () => adelantos, titulo: 'Anticipo, préstamo o descuento', nombre: x => tipoMov(x) + ' · ' + nombreTrabajador(x.trabajadorId), re: () => renderTodo(),
    bloquea: x => x.aplicado ? 'Ya se descontó en una liquidación: para corregirlo anule primero ese pago.' : '',
    campos: x => [{ k: 'fecha', t: 'Fecha', tipo: 'date', req: true }, { k: 'valor', t: 'Valor ($)', tipo: 'num', req: true }].concat(tipoMov(x) === 'Préstamo' ? [{ k: 'nCuotas', t: 'Número de cuotas', tipo: 'num' }] : [], ['Anticipo', 'Préstamo'].includes(tipoMov(x)) ? [{ k: 'medio', t: 'Pagado por', tipo: 'sel', ops: ['Caja', 'Banco'] }] : [], [{ k: 'motivo', t: 'Motivo o detalle', ancho: true }, { k: 'comprobante', t: 'N.º de comprobante' }]) }
};
function editar31(tipo, id) { const E = ED31[tipo]; const x = E.lista().find(r => r.id === id); if (!x) return; const b = E.bloquea && E.bloquea(x); if (b) { toast(b, 'err'); return; } const C = E.campos(x);
  openModal(`<h3>Editar ${esc(E.titulo.toLowerCase())}</h3><p class="hint">${esc(E.nombre(x))}. El cambio queda en el historial con el valor anterior y el nuevo.</p><div class="fgrid c2 lg-form">${C.map(c => campoHTML(c, x[c.k])).join('')}</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardar31('${tipo}','${id}')">Guardar cambios</button></div>`); }
function guardar31(tipo, id) { const E = ED31[tipo]; const x = E.lista().find(r => r.id === id); if (!x) return; const C = E.campos(x); const d = leerCampos(C); const falta = C.filter(c => c.req && (d[c.k] == null || d[c.k] === '')); if (falta.length) { toast('Complete: ' + falta.map(c => c.t.toLowerCase()).join(', ') + '.', 'err'); return; }
  const antes = clonar(x); Object.assign(x, d); x.modificado = ahoraISO(); const cambios = C.filter(c => String(antes[c.k] == null ? '' : antes[c.k]) !== String(x[c.k] == null ? '' : x[c.k])).map(c => c.t + ': ' + (antes[c.k] == null || antes[c.k] === '' ? '—' : antes[c.k]) + ' → ' + (x[c.k] == null || x[c.k] === '' ? '—' : x[c.k]));
  registrarCambio(tipo, id, E.nombre(x), 'Edición', cambios.join(' · ') || 'sin cambios'); guardarEstado(); closeModal(); try { E.re(); } catch (e) {} toast(E.titulo + ' actualizado.', 'ok'); }
/* Junto a cada «Eliminar» que no tenía «Editar», se agrega la edición (y la fila completa la abre) */
const EDITA31 = { eliminarLabor: id => `editar31('labor','${id}')`, eliminarBeneficio: id => `editarBache22('${id}')`, eliminarClima: id => `editar31('clima','${id}')`, eliminarMov22: id => `editar31('mov','${id}')` };
function editables31(root) { root.querySelectorAll('button[onclick^="eliminar"]').forEach(b => { if (b.dataset.e31) return; b.dataset.e31 = '1'; const m = /^(eliminar[A-Za-z0-9]+)\('([^']+)'\)/.exec(b.getAttribute('onclick') || ''); if (!m || !EDITA31[m[1]]) return; const c = b.parentElement;
  if ([...c.querySelectorAll('button')].some(x => /editar|abrir/i.test(x.getAttribute('onclick') || '') || /^Editar$/.test(x.textContent.trim()))) return; const e = document.createElement('button'); e.type = 'button'; e.className = 'btn ghost small'; e.textContent = 'Editar'; e.setAttribute('onclick', EDITA31[m[1]](m[2])); b.insertAdjacentElement('beforebegin', e); }); }

/* ---------- Toda orden de trabajo mencionada en pantalla se abre con un clic ---------- */
function otLinks31(root) { if (typeof ordenes === 'undefined' || !ordenes.length) return; const porNum = new Map(ordenes.map(o => [String(o.numero), o.id])); const re = /\bOT-\d{3,6}\b/g;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || !re.test(n.nodeValue)) return NodeFilter.FILTER_REJECT; re.lastIndex = 0; return p.closest('button, a, input, select, textarea, .ot31, .modal-box, .menu27, svg, [onclick*="verOT"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
  const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
  nodos.forEach(n => { const t = n.nodeValue; const frag = document.createDocumentFragment(); let i = 0; t.replace(re, (m, pos) => { const id = porNum.get(m); if (!id) return m; frag.appendChild(document.createTextNode(t.slice(i, pos))); const b = document.createElement('button'); b.type = 'button'; b.className = 'ot31'; b.textContent = m; b.title = 'Abrir la orden ' + m; b.onclick = ev => { ev.stopPropagation(); verOT(id); }; frag.appendChild(b); i = pos + m.length; return m; });
    if (i) { frag.appendChild(document.createTextNode(t.slice(i))); n.parentNode.replaceChild(frag, n); } }); }

/* ---------- Formato de los campos: moneda con $, números con separador de miles, texto como texto ---------- */
const RE_MONEDA31 = /(\(\$\)|\$|valor|costo|precio|tarifa|salario|monto|maquila|flete|presupuesto|aval[uú]o|impuesto|ingreso|egreso|abono|cuota|descuento|bonificaci|anticipo|pr[eé]stamo|saldo|capital|inter[eé]s|pagad|pago|neto|bruto|ventas?\b|gasto|jornal|alimentaci|cobro|deuda|comisi[oó]n)/i;
const RE_NO_MONEDA31 = /(%|\bkg\b|kilos|horas|\bha\b|hect[aá]rea|cantidad|unidades|d[ií]as|meses|\bg\b|gramos|metros|°c|\blb\b|usd|trm|n\.º|n[uú]mero|plantas|densidad|altitud|msnm|factor|puntaje|merma|humedad|tasa|cuotas|a[ñn]o\b|ph\b|mm\b)/i;
function etiqueta31(i) { const l = i.closest('label'); if (l) return l.textContent || ''; const id = i.id && document.querySelector('label[for="' + i.id + '"]'); return (id && id.textContent) || i.getAttribute('aria-label') || i.placeholder || ''; }
function parse31(s) { s = String(s == null ? '' : s).replace(/[$\s]/g, '').replace(/[^\d.,\-]/g, ''); if (!s) return ''; const neg = s.startsWith('-'); s = s.replace(/-/g, '');
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(/\.(?=.*\.)/g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); return (neg ? '-' : '') + s; }
function mostrar31(v, moneda) { if (v === '' || v == null || isNaN(Number(v))) return ''; const n = Number(v); const t = n.toLocaleString('es-CO', { maximumFractionDigits: moneda ? 2 : 4 }); return moneda ? '$ ' + t : t; }
const DESC31 = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
function formatoCampos31(root) { (root || document).querySelectorAll('input[type="number"]:not([data-f31])').forEach(i => { if (i.closest('.mapa-zoom, .cs-tabs, [data-sin-formato]') || i.readOnly) return; i.dataset.f31 = '1'; const et = etiqueta31(i); const moneda = RE_MONEDA31.test(et) && !RE_NO_MONEDA31.test(et.replace(/\(\$\)/, ''));
  const raw0 = DESC31.get.call(i); i.type = 'text'; i.setAttribute('inputmode', 'decimal'); i.setAttribute('autocomplete', 'off'); i.classList.add(moneda ? 'f31-moneda' : 'f31-num');
  Object.defineProperty(i, 'value', { configurable: true, get() { return parse31(DESC31.get.call(this)); }, set(v) { DESC31.set.call(this, document.activeElement === this ? String(v == null ? '' : v).replace('.', ',') : mostrar31(parse31(v), moneda)); } });
  DESC31.set.call(i, mostrar31(raw0, moneda));
  i.addEventListener('focus', () => { const p = parse31(DESC31.get.call(i)); DESC31.set.call(i, p === '' ? '' : String(p).replace('.', ',')); try { i.select(); } catch (e) {} });
  i.addEventListener('blur', () => { DESC31.set.call(i, mostrar31(parse31(DESC31.get.call(i)), moneda)); });
  i.addEventListener('keydown', e => { if (e.key.length === 1 && !/[\d.,\-]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }); }); }
try { const mo31 = new MutationObserver(() => { if (window._f31) return; window._f31 = requestAnimationFrame(() => { window._f31 = 0; try { formatoCampos31(document.getElementById('modal-box')); formatoCampos31(document.getElementById('content')); } catch (e) {} }); });
  const arr31 = () => { ['modal-box', 'content'].forEach(id => { const el = document.getElementById(id); if (el) mo31.observe(el, { childList: true, subtree: true }); }); formatoCampos31(document); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arr31); else arr31(); } catch (e) {}

const _pase29b = pase27;
pase27 = function (root) { if (!root) return; editables31(root); _pase29b(root); otLinks31(root); };
