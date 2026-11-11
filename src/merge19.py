#!/usr/bin/env python3
# Ensambla state-origen-v4.html (v19) a partir de la base v18 y las partes de parts/v19.
import os, re
B = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(B, 'state-origen-v18.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v19', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)

rep("const APP_VERSION = '18.0';", "const APP_VERSION = '19.0';")

# ---------- Estado y persistencia ----------
rep("let muestreos = [], marcasPlanta = [], planesMuestreo = [], mapaConfig = {}, bitacora = [];",
    "let muestreos = [], marcasPlanta = [], planesMuestreo = [], mapaConfig = {}, bitacora = [];\n"
    "let suelos = [], clima = [], disenos = [], planesAgro = [], climaConfig = {}, partidas = [], terceros = [], movimientos = [], contaConfig = {}, presupuestos = {}, cuentasExtra = [];")
rep("const COL_BITACORA = 'bitacora';",
    "const COL_BITACORA = 'bitacora';\nconst DOC_AGRO = 'datos/agronomia', DOC_COMERCIAL = 'datos/comercial', DOC_CONTABLE = 'datos/contable', COL_CLIMA = 'clima', COL_MOV = 'movimientos';")
rep("function estadoActual() { return { fincas,variedades,lotes,bloques,trabajadores,adelantos,pagos,registros,insumos,ventas,beneficios,empleados,activos,labores,plantillas,ordenes,planConfig,muestreos,marcasPlanta,planesMuestreo,mapaConfig,bitacora }; }",
    "function estadoActual() { return { fincas,variedades,lotes,bloques,trabajadores,adelantos,pagos,registros,insumos,ventas,beneficios,empleados,activos,labores,plantillas,ordenes,planConfig,muestreos,marcasPlanta,planesMuestreo,mapaConfig,bitacora,suelos,clima,disenos,planesAgro,climaConfig,partidas,terceros,movimientos,contaConfig,presupuestos,cuentasExtra }; }")
rep("  aplicarMapa(d); muestreos = d.muestreos || []; bitacora = d.bitacora || [];\n}",
    "  aplicarMapa(d); muestreos = d.muestreos || []; bitacora = d.bitacora || [];\n  aplicarAgro(d); aplicarComercial(d); aplicarContable(d); clima = d.clima || []; movimientos = d.movimientos || [];\n}\n"
    "function aplicarAgro(d) { d = clonar(d || {}); suelos = d.suelos || []; disenos = d.disenos || []; planesAgro = d.planesAgro || []; climaConfig = d.climaConfig || {}; }\n"
    "function aplicarComercial(d) { d = clonar(d || {}); partidas = d.partidas || []; terceros = d.terceros || []; }\n"
    "function aplicarContable(d) { d = clonar(d || {}); contaConfig = d.contaConfig || d.config || {}; presupuestos = d.presupuestos || {}; cuentasExtra = d.cuentasExtra || []; }\n"
    "function aplicarClima(docs) { clima = []; docs.forEach(s => { const b = s.data(); if (b && Array.isArray(b.items)) clonar(b.items).forEach(x => clima.push(x)); }); }\n"
    "function aplicarMovimientos(docs) { movimientos = []; docs.forEach(s => { const b = s.data(); if (b && Array.isArray(b.items)) clonar(b.items).forEach(x => movimientos.push(x)); }); }")
rep("  Object.keys(otMes).forEach(k => { docs[COL_OT + '/' + k] = { items: otMes[k] }; });\n  return docs;",
    "  Object.keys(otMes).forEach(k => { docs[COL_OT + '/' + k] = { items: otMes[k] }; });\n"
    "  docs[DOC_AGRO] = { suelos: est.suelos || [], disenos: est.disenos || [], planesAgro: est.planesAgro || [], climaConfig: est.climaConfig || {} };\n"
    "  docs[DOC_COMERCIAL] = { partidas: est.partidas || [], terceros: est.terceros || [] };\n"
    "  docs[DOC_CONTABLE] = { contaConfig: est.contaConfig || {}, presupuestos: est.presupuestos || {}, cuentasExtra: est.cuentasExtra || [] };\n"
    "  const clMes = {}; (est.clima || []).forEach(c => { const k = String(c.fecha || 'sin-fecha').slice(0, 7); (clMes[k] = clMes[k] || []).push(c); });\n"
    "  Object.keys(clMes).forEach(k => { docs[COL_CLIMA + '/' + k] = { items: clMes[k] }; });\n"
    "  const mvMes = {}; (est.movimientos || []).forEach(m => { const k = String(m.fecha || 'sin-fecha').slice(0, 7); (mvMes[k] = mvMes[k] || []).push(m); });\n"
    "  Object.keys(mvMes).forEach(k => { docs[COL_MOV + '/' + k] = { items: mvMes[k] }; });\n  return docs;")
rep("const esDocMensual = p => p.indexOf(COL_REGISTROS + '/') === 0 || p.indexOf(COL_OT + '/') === 0 || p.indexOf(COL_MU + '/') === 0 || p.indexOf(COL_BITACORA + '/') === 0;",
    "const esDocMensual = p => [COL_REGISTROS, COL_OT, COL_MU, COL_BITACORA, COL_CLIMA, COL_MOV].some(c => p.indexOf(c + '/') === 0);")
rep("    dbNS.collection(COL_OT).onSnapshot(aplicar(q => aplicarOrdenes(q.docs)), alError);",
    "    dbNS.collection(COL_OT).onSnapshot(aplicar(q => aplicarOrdenes(q.docs)), alError);\n"
    "    dbNS.doc(DOC_AGRO).onSnapshot(aplicar(s => { if (s.exists) aplicarAgro(s.data()); }), alError);\n"
    "    dbNS.doc(DOC_COMERCIAL).onSnapshot(aplicar(s => { if (s.exists) aplicarComercial(s.data()); }), alError);\n"
    "    dbNS.doc(DOC_CONTABLE).onSnapshot(aplicar(s => { if (s.exists) aplicarContable(s.data()); }), alError);\n"
    "    dbNS.collection(COL_CLIMA).onSnapshot(aplicar(q => aplicarClima(q.docs)), alError);\n"
    "    dbNS.collection(COL_MOV).onSnapshot(aplicar(q => aplicarMovimientos(q.docs)), alError);")
rep("      const [m, f, regs, legado, pl, ots, mp, mus, bts] = await Promise.all([ dbNS.doc(DOC_MAESTROS).get(), dbNS.doc(DOC_FINANZAS).get(), dbNS.collection(COL_REGISTROS).get(), dbNS.doc(DOC_LEGADO).get(), dbNS.doc(DOC_PLAN).get(), dbNS.collection(COL_OT).get(), dbNS.doc(DOC_MAPA).get(), dbNS.collection(COL_MU).get(), dbNS.collection(COL_BITACORA).get() ]);\n"
    "      aplicarPlan(pl.exists ? pl.data() : {}); aplicarOrdenes(ots.docs); aplicarMapa(mp.exists ? mp.data() : {}); aplicarMuestreos(mus.docs); aplicarBitacora(bts.docs);\n"
    "      if (m.exists || f.exists || !regs.empty || pl.exists || !ots.empty || mp.exists || !mus.empty || !bts.empty) {",
    "      const [m, f, regs, legado, pl, ots, mp, mus, bts, ag, co, ct, cl, mv] = await Promise.all([ dbNS.doc(DOC_MAESTROS).get(), dbNS.doc(DOC_FINANZAS).get(), dbNS.collection(COL_REGISTROS).get(), dbNS.doc(DOC_LEGADO).get(), dbNS.doc(DOC_PLAN).get(), dbNS.collection(COL_OT).get(), dbNS.doc(DOC_MAPA).get(), dbNS.collection(COL_MU).get(), dbNS.collection(COL_BITACORA).get(), dbNS.doc(DOC_AGRO).get(), dbNS.doc(DOC_COMERCIAL).get(), dbNS.doc(DOC_CONTABLE).get(), dbNS.collection(COL_CLIMA).get(), dbNS.collection(COL_MOV).get() ]);\n"
    "      aplicarPlan(pl.exists ? pl.data() : {}); aplicarOrdenes(ots.docs); aplicarMapa(mp.exists ? mp.data() : {}); aplicarMuestreos(mus.docs); aplicarBitacora(bts.docs);\n"
    "      aplicarAgro(ag.exists ? ag.data() : {}); aplicarComercial(co.exists ? co.data() : {}); aplicarContable(ct.exists ? ct.data() : {}); aplicarClima(cl.docs); aplicarMovimientos(mv.docs);\n"
    "      if (m.exists || f.exists || !regs.empty || pl.exists || !ots.empty || mp.exists || !mus.empty || !bts.empty || ag.exists || co.exists || ct.exists || !cl.empty || !mv.empty) {")
rep("  plantillas = lim(plantillas); ordenes = lim(ordenes); muestreos = lim(muestreos); marcasPlanta = lim(marcasPlanta); planesMuestreo = lim(planesMuestreo); bitacora = lim(bitacora);\n}",
    "  plantillas = lim(plantillas); ordenes = lim(ordenes); muestreos = lim(muestreos); marcasPlanta = lim(marcasPlanta); planesMuestreo = lim(planesMuestreo); bitacora = lim(bitacora);\n"
    "  suelos = lim(suelos); clima = lim(clima); disenos = lim(disenos); planesAgro = lim(planesAgro); partidas = lim(partidas); terceros = lim(terceros); movimientos = lim(movimientos); cuentasExtra = lim(cuentasExtra);\n"
    "  if (!climaConfig || typeof climaConfig !== 'object') climaConfig = {}; if (!contaConfig || typeof contaConfig !== 'object') contaConfig = {}; if (!presupuestos || typeof presupuestos !== 'object') presupuestos = {};\n"
    "}")
rep("['aplicarEstado','aplicarMaestros','aplicarFinanzas','aplicarRegistros','aplicarPlan','aplicarOrdenes','aplicarMapa','aplicarMuestreos','aplicarBitacora'].forEach(n => {",
    "['aplicarEstado','aplicarMaestros','aplicarFinanzas','aplicarRegistros','aplicarPlan','aplicarOrdenes','aplicarMapa','aplicarMuestreos','aplicarBitacora','aplicarAgro','aplicarComercial','aplicarContable','aplicarClima','aplicarMovimientos'].forEach(n => {")
rep("  [render, renderGestionTablas, renderTrabajadores, renderOperacion, renderFinanzas, renderAnalisis, renderPlaneacion, renderHoy, renderMapa, renderTablero].forEach(fn => {",
    "  [render, renderGestionTablas, renderTrabajadores, renderOperacion, renderFinanzas, renderAnalisis, renderPlaneacion, renderHoy, renderMapa, renderTablero, renderSueloClima, renderDisenos, renderAgronomia, renderComercial].forEach(fn => {")

# ---------- Navegación ----------
rep("""    <button class="nav-item" data-nav="mapa" onclick="ir('mapa')"><svg><use href="#i-mapa"/></svg>Mapa y muestreos</button>""",
    """    <button class="nav-item" data-nav="agronomia" onclick="ir('agronomia')"><svg><use href="#i-calendario"/></svg>Plan agronómico</button>
    <button class="nav-item" data-nav="mapa" onclick="ir('mapa')"><svg><use href="#i-mapa"/></svg>Maqueta y muestreos</button>
    <button class="nav-item" data-nav="suelo" onclick="ir('suelo')"><svg><use href="#i-suelo"/></svg>Suelo y clima</button>
    <button class="nav-item" data-nav="disenos" onclick="ir('disenos')"><svg><use href="#i-diseno"/></svg>Diseño de cultivo</button>""")
rep("""    <div class="nav-group">Personas y dinero</div>
    <button class="nav-item" data-nav="personal" onclick="ir('personal')"><svg><use href="#i-personal"/></svg>Personal</button>
    <button class="nav-item" data-nav="finanzas" onclick="ir('finanzas')"><svg><use href="#i-finanzas"/></svg>Finanzas</button>""",
    """    <div class="nav-group">Negocio</div>
    <button class="nav-item" data-nav="comercial" onclick="ir('comercial')"><svg><use href="#i-venta"/></svg>Ventas y trazabilidad</button>
    <button class="nav-item" data-nav="finanzas" onclick="ir('finanzas')"><svg><use href="#i-finanzas"/></svg>Contabilidad y finanzas</button>
    <button class="nav-item" data-nav="personal" onclick="ir('personal')"><svg><use href="#i-personal"/></svg>Personal</button>""")
rep("""  <symbol id="i-plus" viewBox="0 0 24 24">""",
    """  <symbol id="i-calendario" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.2h2M11 17.2h2"/></symbol>
  <symbol id="i-suelo" viewBox="0 0 24 24"><path d="M3 10h18"/><path d="M3 14.5h18M3 19h18" opacity=".55"/><path d="M12 10V6.5"/><path d="M12 7c0-2.2 1.6-3.6 4-3.8-.1 2.4-1.7 3.8-4 3.8ZM12 8.2C12 6.5 10.8 5.3 9 5.2c0 1.8 1.2 3 3 3Z"/><circle cx="7" cy="16.8" r=".5"/><circle cx="16" cy="12.3" r=".5"/></symbol>
  <symbol id="i-diseno" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><path d="M7 16.5h10"/></symbol>
  <symbol id="i-venta" viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></symbol>
  <symbol id="i-lluvia" viewBox="0 0 24 24"><path d="M7 15.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6 1.3A3.4 3.4 0 0 1 17 15.5Z"/><path d="M9 18.5l-1 2M13 18.5l-1 2M17 18.5l-1 2"/></symbol>
  <symbol id="i-cuentas" viewBox="0 0 24 24"><path d="M5 3.5h14v17l-2.3-1.5-2.4 1.5-2.3-1.5-2.4 1.5-2.3-1.5L5 20.5Z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24">""")
rep("""  mapa:       { t:'Mapa y muestreos', s:'Lotes con surcos y plantas codificadas, sanidad, floración y proyección' },""",
    """  mapa:       { t:'Maqueta y muestreos', s:'Finca y lotes con su forma real, relieve, surcos en curvas de nivel, plantas codificadas y mapas de calor' },
  suelo:      { t:'Suelo y clima',  s:'Análisis de suelo por lote, enmiendas y fertilización, lluvia, temperatura y balance hídrico' },
  disenos:    { t:'Diseño de cultivo', s:'Evaluación técnica y financiera de diseños de siembra y de su ejecución' },
  agronomia:  { t:'Plan agronómico', s:'Calendario anual y mensual de labores por lote, presupuesto y cumplimiento' },
  comercial:  { t:'Ventas y trazabilidad', s:'Partidas de café, ventas, compradores y trazabilidad de cada kilo vendido hasta la planta' },""")
rep("""  finanzas:   { t:'Finanzas',       s:'Estado de resultados consolidado de la finca' },""",
    """  finanzas:   { t:'Contabilidad y finanzas', s:'Movimientos, libros, estados financieros, cartera, presupuesto, costos por lote e indicadores' },""")
rep("analisis:renderAnalisis, gestion:renderGestionTablas, operacion:renderOperacion, finanzas:renderFinanzas }[name];",
    "analisis:renderAnalisis, gestion:renderGestionTablas, operacion:renderOperacion, finanzas:renderFinanzas, suelo:renderSueloClima, disenos:renderDisenos, agronomia:renderAgronomia, comercial:renderComercial }[name];")

# ---------- Vista Mapa ----------
rep("""    <div class="chip-row">
      <select id="mp-lote" onchange="mapaCambiarLote(this.value)" aria-label="Lote"></select>
      <div class="mp-actions">
        <button class="btn ghost small" onclick="abrirDisenoLote()">Diseño del lote</button>
        <button class="btn ghost small" onclick="abrirPlanMuestreo()">Plan de muestreo</button>
        <button class="btn primary small" onclick="abrirRegistroMuestreo()">+ Registrar muestreo</button>
      </div>
    </div>""",
    """    <div class="chip-row mp-head">
      <select id="mp-finca" onchange="mapaCambiarFinca(this.value)" aria-label="Finca"></select>
      <div class="capas seg" id="mp-modos" role="tablist" aria-label="Vista">
        <button data-m="finca" onclick="mapaModo('finca')">Finca</button><button data-m="lote" onclick="mapaModo('lote')">Lote</button><button data-m="3d" onclick="mapaModo('3d')">Relieve 3D</button>
      </div>
      <select id="mp-lote" class="solo-lote" onchange="mapaCambiarLote(this.value)" aria-label="Lote"></select>
      <div class="mp-actions">
        <button class="btn ghost small solo-lote" onclick="abrirEditorForma('lote')">Forma</button>
        <button class="btn ghost small solo-lote" onclick="abrirDisenoLote()">Diseño</button>
        <button class="btn ghost small" onclick="abrirPlanMuestreoMapa()">Plan de muestreo</button>
        <button class="btn primary small" onclick="abrirRegistroMuestreo()">+ Registrar muestreo</button>
      </div>
    </div>""")
rep("""          <span class="mp-plan-chip" id="mp-plan-chip" hidden></span>
        </div>""",
    """          <span class="mp-plan-chip" id="mp-plan-chip" hidden></span>
          <div class="mp-3d" id="mp-3d-ctl" hidden><button class="icon-btn" onclick="mapaGirar(-30)" aria-label="Girar a la izquierda">⟲</button><button class="icon-btn" onclick="mapaGirar(30)" aria-label="Girar a la derecha">⟳</button><label>Relieve <select id="mp-exag" onchange="mapaSt.exag=Number(this.value);dibujarMapa()"><option value="1">×1</option><option value="1.6">×1,6</option><option value="2.5">×2,5</option><option value="4">×4</option></select></label></div>
        </div>""")
rep("""        <div class="card"><div class="title">Planta seleccionada</div><div id="mp-planta">""",
    """        <div class="card"><div class="title" id="mp-planta-t">Planta seleccionada</div><div id="mp-planta">""")
rep("""        <div class="card"><div class="title">Estado del lote</div><div id="mp-lote-info"></div></div>""",
    """        <div class="card"><div class="title" id="mp-info-t">Estado del lote</div><div id="mp-lote-info"></div></div>""")

# ---------- Vistas nuevas y Finanzas ----------
a = s.index('  <section class="view" id="view-finanzas">'); b = s.index('  <!-- ======================= VISTA: ANÁLISIS')
s = s[:a] + P('vistas.html') + '\n' + s[b:]


# ---------- Tablero v19 ----------
rep("""        <div id="sec-resumen" class="tb-sec">
          <div class="tb-brief">
            <div class="tb-brief-l"><div class="tb-eyebrow">Lectura del periodo</div><p id="tb-lectura"></p></div>
            <div class="tb-brief-r"><div class="tb-eyebrow">Decisiones sugeridas</div><div id="tb-decisiones"></div></div>
          </div>
          <div class="kpis" id="tb-kpis"></div>
        </div>""", """        <div id="sec-resumen" class="tb-sec">
          <div class="tb-hero">
            <div class="tb-brief tb-brief-v">
              <div class="tb-brief-l"><div class="tb-eyebrow">Lectura del periodo</div><p id="tb-lectura"></p></div>
              <div class="tb-brief-r"><div class="tb-eyebrow">Decisiones sugeridas</div><div id="tb-decisiones"></div></div>
            </div>
            <div class="card tb-maq-card"><div class="title">Maqueta de la finca <span class="sub">estado de cada lote en su forma real</span></div>
              <div class="capas" id="tb-maq-capas" role="tablist" aria-label="Capa de la maqueta"></div>
              <div id="tb-maq" class="tb-maq"></div><div class="mapa-legend tb-leg" id="tb-maq-leg" style="margin-top:8px"></div>
              <button class="link" onclick="ir('mapa')" style="align-self:flex-start">Abrir la maqueta completa y la vista 3D</button></div>
          </div>
          <div class="kpis" id="tb-kpis"></div>
          <div class="tb-pulso" id="tb-pulso"></div>
        </div>""")
rep("""        <div id="sec-personas" class="tb-sec">""", """        <div id="sec-clima" class="tb-sec">
          <h2 class="tb-h">Clima y suelo <span>Agua disponible, floraciones y limitantes del suelo por lote</span></h2>
          <div class="tb-grid">
            <div class="card tb-span2"><div class="title">Lluvia y agua en el suelo <span class="sub">últimos 90 días</span></div><div id="tb-clima"></div></div>
            <div class="card"><div class="title">Suelo por lote <span class="sub">último análisis</span></div><div id="tb-suelo"></div></div>
          </div>
        </div>
        <div id="sec-personas" class="tb-sec">""")
rep("""        <div id="sec-proy" class="tb-sec">""", """        <div id="sec-fin" class="tb-sec">
          <h2 class="tb-h">Finanzas del año <span>Resultado contable y presupuesto a la fecha</span></h2>
          <div class="tb-grid">
            <div class="card tb-span2"><div class="title">Del ingreso al resultado <span class="sub">año en curso, inventario a costo</span></div><div id="tb-fin-casc"></div></div>
            <div class="card"><div class="title">Presupuesto</div><div id="tb-fin-pres"></div></div>
          </div>
        </div>
        <div id="sec-proy" class="tb-sec">""")
rep("""<button onclick="irSeccionTb('sec-salud')">Salud de las plantas</button><button onclick="irSeccionTb('sec-personas')">Personas</button><button onclick="irSeccionTb('sec-caja')">Caja y bodega</button>""",
    """<button onclick="irSeccionTb('sec-salud')">Salud de las plantas</button><button onclick="irSeccionTb('sec-clima')">Clima y suelo</button><button onclick="irSeccionTb('sec-personas')">Personas</button><button onclick="irSeccionTb('sec-caja')">Caja y bodega</button><button onclick="irSeccionTb('sec-fin')">Finanzas</button>""")
rep("""<div class="card"><div class="title">Cómo leer estos mapas</div><div class="hint" style="margin:0;line-height:1.7;">Cada cuadro representa un grupo de surcos y plantas. Los puntos son las plantas que se midieron; el color entre ellas se estima según las plantas medidas más cercanas, así que <b>más plantas muestreadas dan un mapa más fiel</b>. Use los planes de muestreo, que reparten las plantas por todo el lote. Toque un lote para abrirlo en el mapa con su capa.</div></div>""",
    """<div class="card"><div class="title">Cómo leer estos mapas</div><div class="hint" style="margin:0;line-height:1.7;">Cada mapa es el lote con su forma real (norte arriba). Los puntos son las plantas medidas; el color entre ellas se estima según las plantas medidas más cercanas, así que <b>más plantas muestreadas dan un mapa más fiel</b>. Verde es bien, ámbar es alerta y rojo es problema. Toque un lote para abrirlo en la maqueta con su capa y sus surcos.</div></div>""")

# ---------- Estilos y código ----------
rep("</style>", P('estilos.css') + "\n</style>")
JS = ['graficos.js', 'geo.js', 'maqueta.js', 'mapaui.js', 'forma.js', 'sueloclima.js', 'disenos.js', 'agronomia.js', 'comercial.js', 'contab.js', 'contab_ui.js', 'tablero19.js', 'shell19.js']
codigo = '\n'.join(P(n) for n in JS if os.path.exists(os.path.join(B, 'parts', 'v19', n)))
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", codigo + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v4.html'), 'w', encoding='utf-8').write(s)
print('v19 ok', len(s))
