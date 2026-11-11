/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */
const VISTAS = {
  hoy:        { t:'Hoy',            s:'Lo que pasa hoy en la finca' },
  panel:      { t:'Cosecha',        s:'Producción, productividad y margen por lote, recolector y ciclo' },
  planeacion: { t:'Planeación',     s:'Plan semanal, órdenes de trabajo y presupuesto de labores' },
  operacion:  { t:'Operación',      s:'Beneficio, inventario de pergamino, labores y activos' },
  personal:   { t:'Personal',       s:'Recolectores, adelantos, tirillas de pago y nómina fija' },
  finanzas:   { t:'Finanzas',       s:'Estado de resultados consolidado de la finca' },
  analisis:   { t:'Análisis',       s:'Tendencias, variabilidad y rendimiento por hectárea' },
  gestion:    { t:'Finca y lotes',  s:'Datos catastrales, lotes, bloques y variedades' },
};
let vistaActual = 'hoy';
function showView(name) {
  if (!VISTAS[name]) name = 'hoy';
  vistaActual = name;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  document.getElementById('page-title').textContent = VISTAS[name].t;
  document.getElementById('page-sub').textContent = VISTAS[name].s;
  try { document.title = (name === 'hoy' ? '' : VISTAS[name].t + ' · ') + 'State Origen'; } catch (e) {}
  const r = { hoy:renderHoy, panel:render, planeacion:renderPlaneacion, personal:() => { renderTrabajadores(); renderOperacion(); }, analisis:renderAnalisis, gestion:renderGestionTablas, operacion:renderOperacion, finanzas:renderFinanzas }[name];
  try { r && r(); } catch (e) { dlog('✗ ' + name + ': ' + e.message, 'err'); }
  try { if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name); } catch (e) {}
}
function ir(name) { showView(name); try { window.scrollTo({ top:0, behavior:'instant' }); } catch (e) { window.scrollTo(0,0); } }
function irLabores() { ir('operacion'); showOp('labores'); setTimeout(() => { const el = document.getElementById('lb-fecha'); if (el) { if (!el.value) el.value = hoyLocal(); el.focus(); } }, 60); }
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VISTAS[h] && h !== vistaActual) ir(h); });
window.addEventListener('scroll', () => { const t = document.getElementById('topbar'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive:true });

function temaEfectivo() { const a = document.documentElement.getAttribute('data-theme'); if (a) return a; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function cambiarTema() {
  const nuevo = temaEfectivo() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nuevo);
  try { localStorage.setItem('so-tema', nuevo); } catch (e) {}
  toast(nuevo === 'dark' ? 'Tema oscuro activado' : 'Tema claro activado');
}
function aplicarTemaGuardado() { try { const t = localStorage.getItem('so-tema'); if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t); } catch (e) {} }

function toast(msg, tipo, accion) {
  const stack = document.getElementById('toast-stack'); if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (tipo === 'err' ? ' err' : '');
  el.setAttribute('role', tipo === 'err' ? 'alert' : 'status');
  const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = tipo === 'err' ? '!' : '✓';
  const m = document.createElement('span'); m.className = 'msg'; m.textContent = msg;
  el.appendChild(ic); el.appendChild(m);
  if (accion) { const b = document.createElement('button'); b.className = 'act'; b.textContent = accion.label; b.onclick = () => { el.remove(); try { accion.fn(); } catch (e) { dlog('✗ ' + e.message, 'err'); } }; el.appendChild(b); }
  while (stack.children.length > 2) stack.firstChild.remove();
  stack.appendChild(el);
  setTimeout(() => el.remove(), accion ? 7000 : (tipo === 'err' ? 6000 : 2800));
}
window.alert = function (msg) { try { toast(String(msg), 'err'); } catch (e) {} };

/* Eliminación con "Deshacer": se aplica de inmediato y se puede revertir durante 7 segundos. */
function conDeshacer(etiqueta, fn) {
  const antes = clonar(estadoActual());
  try { fn(); } catch (e) { toast('No se pudo completar: ' + e.message, 'err'); return; }
  toast(etiqueta, null, { label:'Deshacer', fn:() => {
    aplicarEstado(antes); guardarEstado(); refreshMasterSelects(); refreshFilters(); renderTodo(); toast('Restaurado');
  } });
}

function marcarSync(estado) {
  const p = document.getElementById('sync-pill'); if (!p) return;
  p.classList.toggle('saving', estado === 'saving'); p.classList.toggle('error', estado === 'error');
  const lbl = document.getElementById('sync-label');
  if (estado === 'saving') lbl.textContent = 'Guardando…';
  else if (estado === 'error') lbl.textContent = 'Sin guardar';
  else lbl.textContent = dbNS ? 'Sincronizado' : 'Guardado en este equipo';
}

/* ================= HOY ================= */
function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches'); }
function alertasActuales() {
  const hoyS = hoyLocal(); const out = [];
  ordenes.filter(o => o.fechaProgramada < hoyS && !['Cerrada','Cancelada'].includes(o.estado))
    .sort((a,b) => a.fechaProgramada.localeCompare(b.fechaProgramada))
    .forEach(o => out.push({ sev:'danger', html:`<b>${esc(o.numero)} · ${esc(o.tipo)}</b> estaba programada para el ${fechaCorta(o.fechaProgramada)} y sigue ${esc(o.estado.toLowerCase())}.`, fn:`verOT('${o.id}')`, cta:'Abrir' }));
  const sinHa = lotes.filter(l => !n0(l.hectareas));
  if (sinHa.length) out.push({ sev:'warn', html:`<b>${sinHa.length} lote(s) sin hectáreas</b> (${esc(sinHa.slice(0,3).map(l=>l.nombre).join(', '))}${sinHa.length>3?'…':''}). Sin área no se calculan kg/ha ni presupuestos por hectárea.`, fn:"ir('gestion');showSub('lotes')", cta:'Completar' });
  const pend = adelantos.filter(a => !a.aplicado);
  if (pend.length) { const tot = pend.reduce((a,x)=>a+n0(x.valor),0); const per = new Set(pend.map(a=>a.trabajadorId)).size;
    out.push({ sev:'info', html:`<b>${fmt(tot)} en adelantos</b> pendientes de descontar a ${per} recolector(es).`, fn:"ir('personal')", cta:'Ver' }); }
  const producido = beneficios.reduce((a,b)=>a+n0(b.kgSalida),0), vendido = ventas.reduce((a,v)=>a+n0(v.kg),0);
  if (vendido > producido && beneficios.length) out.push({ sev:'danger', html:`<b>Inventario negativo:</b> se han vendido ${num(vendido)} kg de pergamino y el beneficio registra ${num(producido)} kg.`, fn:"ir('operacion');showOp('inventario')", cta:'Revisar' });
  const sinResp = ordenes.filter(o => !['Cerrada','Cancelada'].includes(o.estado) && !o.responsable && o.fechaProgramada >= hoyS && o.fechaProgramada <= sumarDias(hoyS, 7));
  if (sinResp.length) out.push({ sev:'warn', html:`<b>${sinResp.length} orden(es) de esta semana sin responsable</b> asignado.`, fn:"ir('planeacion');showPl('ordenes')", cta:'Asignar' });
  return out;
}
function renderHoy() {
  const hoyS = hoyLocal(); const d = parseFecha(hoyS);
  document.getElementById('hoy-saludo').textContent = saludo();
  const finca = fincas[0] ? fincas[0].nombre : '';
  document.getElementById('hoy-fecha').textContent = DIAS_LARGOS[(d.getUTCDay()+6)%7] + ' ' + d.getUTCDate() + ' de ' + ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][d.getUTCMonth()] + ' de ' + d.getUTCFullYear() + ' · semana ' + semanaISO(hoyS) + (finca ? ' · ' + finca : '');
  const bf = document.getElementById('brand-finca'); if (bf) bf.textContent = finca ? finca + (fincas.length > 1 ? ' y ' + (fincas.length-1) + ' más' : '') : 'Gestión de finca cafetera';

  // Guía de puesta en marcha
  const pasos = [
    { ok: fincas.length > 0, t:'Registra tu finca', s:'Nombre, ubicación, matrícula y coordenadas', fn:"ir('gestion');showSub('fincas')" },
    { ok: lotes.some(l => n0(l.hectareas) > 0), t:'Crea los lotes con sus hectáreas', s:'Base para kg/ha, presupuestos y órdenes', fn:"ir('gestion');showSub('lotes')" },
    { ok: trabajadores.length > 0, t:'Agrega a tus recolectores', s:'Con su tarifa por kilo', fn:"ir('personal')" },
    { ok: plantillas.length > 0, t:'Revisa las plantillas de labor', s:'Jornales e insumos por hectárea', fn:"ir('planeacion');showPl('presupuesto')" },
    { ok: ordenes.length > 0, t:'Programa tu primera orden de trabajo', s:'Desde una plantilla, escalada al lote', fn:'abrirNuevaOT()' },
  ];
  const hechos = pasos.filter(p => p.ok).length;
  document.getElementById('hoy-setup').innerHTML = hechos === pasos.length ? '' : `
    <div class="card setup"><div class="title">Pon en marcha tu finca <span class="sub">${hechos} de ${pasos.length} listos</span></div>
      <div class="bar"><i style="width:${hechos/pasos.length*100}%"></i></div>
      ${pasos.map(p => `<div class="step${p.ok?' done':''}"><span class="chk">✓</span><div class="tx"><b>${p.t}</b><small>${p.s}</small></div>${p.ok?'':`<button class="btn ghost small" onclick="${p.fn}">Hacerlo</button>`}</div>`).join('')}
    </div>`;

  // Para hoy
  const deHoy = ordenes.filter(o => o.fechaProgramada === hoyS && o.estado !== 'Cancelada').sort((a,b)=>(ORDEN_PRIORIDAD[a.prioridad]??1)-(ORDEN_PRIORIDAD[b.prioridad]??1));
  const kgHoy = registros.filter(r => r.fecha === hoyS).reduce((a,r)=>a+n0(r.kg),0);
  const cerradasHoy = deHoy.filter(o=>o.estado==='Cerrada').length;
  document.getElementById('hoy-tareas-sub').textContent = deHoy.length ? cerradasHoy + ' de ' + deHoy.length + ' cerradas' : '';
  let tareas = deHoy.map(o => `<button class="task-row" style="--st:${COLOR_ESTADO[o.estado]}" onclick="verOT('${o.id}')">
      <div class="tx"><b>${esc(o.tipo)}</b><small>${esc(o.numero)} · ${esc(nombreLote(o.loteId))} · ${num(redondear(o.area,2))} ha · ${esc(o.responsable||'sin responsable')}</small></div>${pillEstado(o.estado)}</button>`).join('');
  if (kgHoy) tareas += `<button class="task-row" style="--st:var(--s2)" onclick="ir('panel')"><div class="tx"><b>${num(kgHoy)} kg de cereza recolectados hoy</b><small>${registros.filter(r=>r.fecha===hoyS).length} registro(s) de cosecha</small></div></button>`;
  document.getElementById('hoy-tareas').innerHTML = tareas || `<div class="empty">No hay órdenes programadas para hoy.<br><button class="link" onclick="abrirNuevaOT()">Programar una orden</button></div>`;

  // Alertas
  const al = alertasActuales();
  document.getElementById('hoy-alertas').innerHTML = al.length ? al.map(a => `<div class="alert-row"><span class="sev ${a.sev}"></span><div class="tx">${a.html}</div><button class="btn ghost small" onclick="${a.fn}">${a.cta}</button></div>`).join('')
    : '<div class="empty">Todo en orden: no hay órdenes vencidas ni datos incompletos.</div>';
  const nDanger = al.filter(a=>a.sev==='danger').length;
  const b = document.getElementById('badge-hoy'); if (b) { b.hidden = !nDanger; b.textContent = nDanger; }
  const abiertas = ordenes.filter(o => !['Cerrada','Cancelada'].includes(o.estado));
  const bp = document.getElementById('badge-plan'); if (bp) { bp.hidden = !abiertas.length; bp.textContent = abiertas.length; }

  // Indicadores
  const mes = hoyS.slice(0,7);
  const kgMes = registros.filter(r => String(r.fecha||'').slice(0,7) === mes).reduce((a,r)=>a+n0(r.kg),0);
  const otsSem = otsDeSemana(lunesDe(hoyS));
  const presuSem = otsSem.reduce((a,o)=>a+n0(o.presupuesto&&o.presupuesto.total),0);
  const r = resultadoFinanciero();
  document.getElementById('hoy-kpis').innerHTML = `
    <div class="sc"><div class="n">${num(kgMes)} kg</div><div class="l">Cereza recolectada este mes</div></div>
    <div class="sc"><div class="n">${abiertas.length}</div><div class="l">Órdenes de trabajo abiertas</div></div>
    <div class="sc"><div class="n">${fmt(presuSem)}</div><div class="l">Presupuesto de labores esta semana</div></div>
    <div class="sc"><div class="n ${r.utilidad<0?'neg':''}">${fmt(r.utilidad)}</div><div class="l">Utilidad acumulada · margen ${pct(r.utilidad, r.ventas)}</div></div>`;
}
function resultadoFinanciero() {
  const v = ventas.reduce((a,x)=>a+n0(x.kg)*n0(x.precio),0);
  const ins = insumos.reduce((a,i)=>a+n0(i.costo),0);
  const rec = registros.reduce((a,x)=>{ const t = trabajadores.find(y=>y.id===x.trabajadorId); return a+n0(x.kg)*(t?n0(t.tarifaPorKg):0); },0);
  const lab = labores.reduce((a,l)=>a+n0(l.costo),0);
  const nom = empleados.reduce((a,e)=>a+n0(e.salario),0);
  const dep = activos.reduce((a,x)=>a+depreciacionAnual(x),0)/12;
  return { ventas:v, utilidad: v - ins - rec - lab - nom - dep };
}

/* ================= Hojas de acción: Registrar y Más ================= */
function hojaAcciones(titulo, items) {
  openModal(`<h3>${titulo}</h3><div style="display:flex;flex-direction:column;gap:4px;">${items.map((it,i)=>`
    <button class="cmd-item" data-i="${i}"><span class="ci"><svg viewBox="0 0 24 24"><use href="#${it.ic}"/></svg></span><span><b style="font-weight:650;">${it.t}</b>${it.s?`<br><span style="color:var(--text-faint);font-size:12px;">${it.s}</span>`:''}</span></button>`).join('')}</div>`);
  document.querySelectorAll('#modal-box .cmd-item').forEach(b => b.onclick = () => { closeModal(); items[+b.dataset.i].fn(); });
}
function abrirRegistrar() {
  hojaAcciones('Registrar', [
    { ic:'i-cosecha', t:'Cosecha del día', s:'Kilos y horas por recolector', fn:openWizard },
    { ic:'i-orden', t:'Orden de trabajo', s:'Programar una labor con presupuesto', fn:() => abrirNuevaOT() },
    { ic:'i-labor', t:'Labor agronómica', s:'Gasto de una labor sin orden', fn:irLabores },
    { ic:'i-oper', t:'Beneficio', s:'Cereza que entra y pergamino que sale', fn:() => { ir('operacion'); showOp('beneficio'); } },
    { ic:'i-personal', t:'Recolector', s:'Persona nueva con su tarifa', fn:() => { ir('personal'); setTimeout(()=>{ const e=document.getElementById('nt-nombre'); e&&e.focus(); },60); } },
  ]);
}
function abrirMas() {
  hojaAcciones('Más módulos', [
    { ic:'i-oper', t:'Operación', s:VISTAS.operacion.s, fn:() => ir('operacion') },
    { ic:'i-personal', t:'Personal', s:VISTAS.personal.s, fn:() => ir('personal') },
    { ic:'i-finanzas', t:'Finanzas', s:VISTAS.finanzas.s, fn:() => ir('finanzas') },
    { ic:'i-analisis', t:'Análisis', s:VISTAS.analisis.s, fn:() => ir('analisis') },
    { ic:'i-finca', t:'Finca y lotes', s:VISTAS.gestion.s, fn:() => ir('gestion') },
    { ic:'i-buscar', t:'Buscar o ejecutar', s:'Órdenes, lotes, personas y acciones', fn:abrirComandos },
    { ic:'i-tema', t:'Cambiar tema', s:'Claro u oscuro', fn:cambiarTema },
  ]);
}

/* ================= Paleta de comandos (Ctrl/⌘ K) ================= */
let cmdItems = [], cmdSel = 0;
const normalizar = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function catalogoComandos() {
  const L = [];
  const nav = (t, s, fn, ic) => L.push({ sec:'Ir a', t, s, fn, ic });
  Object.keys(VISTAS).forEach(k => nav(VISTAS[k].t, VISTAS[k].s, () => ir(k), { hoy:'i-hoy', panel:'i-cosecha', planeacion:'i-plan', operacion:'i-oper', personal:'i-personal', finanzas:'i-finanzas', analisis:'i-analisis', gestion:'i-finca' }[k]));
  [['Plan semanal','planeacion',()=>showPl('semana')],['Órdenes de trabajo','planeacion',()=>showPl('ordenes')],['Presupuesto y plantillas','planeacion',()=>showPl('presupuesto')],
   ['Beneficio','operacion',()=>showOp('beneficio')],['Inventario de pergamino','operacion',()=>showOp('inventario')],['Labores agronómicas','operacion',()=>showOp('labores')],['Activos','operacion',()=>showOp('activos')],
   ['Recolectores','personal',()=>showPer('recolectores')],['Empleados fijos','personal',()=>showPer('empleados')],
   ['Fincas','gestion',()=>showSub('fincas')],['Lotes','gestion',()=>showSub('lotes')],['Bloques','gestion',()=>showSub('bloques')],['Variedades','gestion',()=>showSub('variedades')]]
    .forEach(([t,v,f]) => nav(t, VISTAS[v].t, () => { ir(v); f(); }, 'i-ir'));
  const acc = (t, s, fn, ic) => L.push({ sec:'Acciones', t, s, fn, ic });
  acc('Registrar cosecha', 'Asistente por pasos', openWizard, 'i-cosecha');
  acc('Nueva orden de trabajo', 'Programar una labor', () => abrirNuevaOT(), 'i-orden');
  acc('Nueva plantilla de labor', 'Estándar por hectárea', () => { ir('planeacion'); showPl('presupuesto'); abrirPlantilla(); }, 'i-plan');
  acc('Registrar labor', 'Gasto sin orden', irLabores, 'i-labor');
  acc('Plan semanal en PDF', 'Semana mostrada en Planeación', exportarPlanSemanalPDF, 'i-pdf');
  acc('Informe de cosecha en PDF', 'Con los filtros del panel', exportarInformePDF, 'i-pdf');
  acc('Cambiar tema', 'Claro u oscuro', cambiarTema, 'i-tema');
  acc('Ver diagnóstico del sistema', 'Registro técnico en vivo', toggleDebug, 'i-analisis');
  ordenes.slice().sort((a,b)=>String(b.numero).localeCompare(String(a.numero))).forEach(o => L.push({ sec:'Órdenes de trabajo', t:o.numero + ' · ' + o.tipo, s:nombreLote(o.loteId) + ' · ' + fechaCorta(o.fechaProgramada) + ' · ' + o.estado, fn:() => { ir('planeacion'); verOT(o.id); }, ic:'i-orden' }));
  lotes.forEach(l => L.push({ sec:'Lotes', t:l.nombre, s:nombreFinca(l.fincaId) + (n0(l.hectareas)?' · '+l.hectareas+' ha':''), fn:() => { ir('gestion'); showSub('lotes'); }, ic:'i-finca' }));
  trabajadores.forEach(t => L.push({ sec:'Personas', t:t.nombre, s:'Recolector · ' + fmt(t.tarifaPorKg) + '/kg', fn:() => ir('personal'), ic:'i-personal' }));
  empleados.forEach(e => L.push({ sec:'Personas', t:e.nombre, s:(e.cargo||'Empleado') , fn:() => { ir('personal'); showPer('empleados'); }, ic:'i-personal' }));
  return L;
}
function abrirComandos() {
  document.getElementById('cmd-overlay').classList.add('open');
  const q = document.getElementById('cmd-q'); q.value = ''; filtrarComandos(); setTimeout(() => q.focus(), 20);
}
function cerrarComandos() { document.getElementById('cmd-overlay').classList.remove('open'); }
function filtrarComandos() {
  const q = normalizar(document.getElementById('cmd-q').value).trim();
  const toks = q.split(/\s+/).filter(Boolean);
  const todos = catalogoComandos();
  cmdItems = toks.length ? todos.filter(c => { const h = normalizar(c.t + ' ' + c.s + ' ' + c.sec); return toks.every(t => h.includes(t)); }).slice(0, 40)
                         : todos.filter(c => c.sec !== 'Órdenes de trabajo' && c.sec !== 'Lotes' && c.sec !== 'Personas').slice(0, 30);
  cmdSel = 0; pintarComandos();
}
function pintarComandos() {
  const host = document.getElementById('cmd-list');
  if (!cmdItems.length) { host.innerHTML = '<div class="cmd-empty">Nada coincide. Prueba con el número de una orden, un lote o una acción.</div>'; return; }
  let html = '', sec = '';
  cmdItems.forEach((c,i) => {
    if (c.sec !== sec) { sec = c.sec; html += `<div class="cmd-sec">${esc(sec)}</div>`; }
    html += `<button class="cmd-item${i===cmdSel?' sel':''}" role="option" aria-selected="${i===cmdSel}" data-i="${i}"><span class="ci"><svg viewBox="0 0 24 24"><use href="#${c.ic||'i-ir'}"/></svg></span><span>${esc(c.t)}</span><small>${esc(c.s)}</small></button>`;
  });
  host.innerHTML = html;
  host.querySelectorAll('.cmd-item').forEach(b => { b.onclick = () => ejecutarComando(+b.dataset.i); b.onmousemove = () => { if (cmdSel !== +b.dataset.i) { cmdSel = +b.dataset.i; marcarSel(); } }; });
}
function marcarSel() { document.querySelectorAll('#cmd-list .cmd-item').forEach(b => { const s = +b.dataset.i === cmdSel; b.classList.toggle('sel', s); b.setAttribute('aria-selected', s); if (s) b.scrollIntoView({ block:'nearest' }); }); }
function ejecutarComando(i) { const c = cmdItems[i]; if (!c) return; cerrarComandos(); closeModal(); try { c.fn(); } catch (e) { toast('No se pudo abrir: ' + e.message, 'err'); } }
document.addEventListener('keydown', e => {
  const abierta = document.getElementById('cmd-overlay').classList.contains('open');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abierta ? cerrarComandos() : abrirComandos(); return; }
  const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');
  if (!abierta && e.key === '/' && !escribiendo && !document.querySelector('.modal-overlay.open, .wiz-overlay.open')) { e.preventDefault(); abrirComandos(); return; }
  if (abierta) {
    if (e.key === 'Escape') { e.preventDefault(); cerrarComandos(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); cmdSel = Math.min(cmdItems.length-1, cmdSel+1); marcarSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdSel = Math.max(0, cmdSel-1); marcarSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); ejecutarComando(cmdSel); }
    return;
  }
  if (e.key === 'Escape') {
    if (document.getElementById('keypad-overlay').classList.contains('open')) document.getElementById('keypad-overlay').classList.remove('open');
    else if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
  }
});
document.addEventListener('DOMContentLoaded', () => {});
(function prepararShell() {
  aplicarTemaGuardado();
  const q = document.getElementById('cmd-q'); if (q) q.addEventListener('input', filtrarComandos);
  const mo = document.getElementById('modal-overlay'); if (mo) mo.addEventListener('click', e => { if (e.target === mo) closeModal(); });
  const h = location.hash.slice(1);
  try { showView(VISTAS[h] ? h : 'hoy'); } catch (e) {}
})();
function envolverTablas() {
  const angostas = ['ratio-table','tabla-variedades','tabla-bloques','tabla-inventario'];
  document.querySelectorAll('table.dtable').forEach(t => {
    if (t.parentElement.classList.contains('tscroll')) return;
    const w = document.createElement('div'); w.className = 'tscroll' + (angostas.includes(t.id) ? ' narrow' : '');
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });
}
function alCargarDatos() {
  envolverTablas();
  marcarSync('ok');
  try { showView(vistaActual); } catch (e) { dlog('✗ ' + e.message, 'err'); }
  try { renderHoy(); } catch (e) { dlog('✗ renderHoy: ' + e.message, 'err'); }
}
