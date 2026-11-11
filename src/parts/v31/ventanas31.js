/* ================= v31 · Ventanas con encabezado, ícono, secciones agrupadas y botones fijos ================= */
const ICONOS31 = [[/cosecha|pesada|recolec|pase|d[ií]a de/i, 'i-cosecha', '#E3271D'], [/orden|labor|plan/i, 'i-orden', '#FF8A00'], [/pago|liquid|anticipo|pr[eé]stamo|movimiento|caja|cr[eé]dito|venta|cobro|contab/i, 'i-finanzas', '#4845C9'],
  [/lote|finca|predio|muestreo|suelo|clima|floraci|variedad|bloque/i, 'i-mapa', '#28A745'], [/persona|empleado|trabajador/i, 'i-personal', '#0A84FF'], [/informe|reporte|pdf|respaldo|excel/i, 'i-reporte', '#5856D6'], [/eliminar|descartar|anular/i, 'i-tablero', '#D70015']];
const _openModal30 = openModal;
openModal = function (html, ancho) { const r = _openModal30.apply(this, arguments); try { const b = document.getElementById('modal-box'); const h = b.querySelector(':scope > h3, :scope > div > h3'); if (h && !h.dataset.v31) { h.dataset.v31 = '1'; const t = h.textContent; const ic = ICONOS31.find(([re]) => re.test(t)) || [null, 'i-orden', '#1E8449'];
      h.classList.add('mh31'); h.insertAdjacentHTML('afterbegin', `<span class="mh31-i" style="background:${ic[2]}"><svg><use href="#${ic[1]}"/></svg></span>`); }
    b.querySelectorAll(':scope > .fgrid, :scope > div > .fgrid').forEach(g => g.classList.add('grupo31')); b.classList.toggle('con-acciones31', !!b.querySelector('.modal-actions')); } catch (e) {} return r; };
