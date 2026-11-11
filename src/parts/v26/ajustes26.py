# Ajustes v26 sobre el HTML v25 (s y rep disponibles): fase F, de la finca a la taza
rep("const APP_VERSION = '25.0';", "const APP_VERSION = '26.0';")
rep("  mando:      { t:'Centro de mando',", "  taza:       { t:'De la finca a la taza', s:'Catación, trilla, tostión, empaque, inventario, pedidos por canal, cafetería y exportación, con costo real y trazabilidad hasta la planta' },\n  mando:      { t:'Centro de mando',")
rep("mando:renderMando, legal:renderLegal }[name];", "mando:renderMando, legal:renderLegal, taza:renderTaza }[name];")
rep('  <section class="view" id="view-legal"><div id="lg-root"></div></section>', '  <section class="view" id="view-legal"><div id="lg-root"></div></section>\n  <section class="view" id="view-taza"><div id="tz-root"></div></section>')
rep('''    <button class="nav-item" data-nav="comercial" onclick="ir('comercial')"><svg><use href="#i-venta"/></svg>Ventas y trazabilidad</button>''',
    '''    <button class="nav-item" data-nav="comercial" onclick="ir('comercial')"><svg><use href="#i-venta"/></svg>Ventas y trazabilidad</button>\n    <button class="nav-item" data-nav="taza" onclick="ir('taza')"><svg><use href="#i-tablero"/></svg>De la finca a la taza</button>''')
# Contabilidad: la trilla consume pergamino mes a mes a costo promedio; el resto de la cadena entra antes del orden final
rep("const cf = cfgConta(); const A = []; const hoyS = hoyLocal();", "const cf = cfgConta(); const A = []; const hoyS = hoyLocal(); _costoTrilla26 = {};")
rep("{ ref: v.id, cierre: true }); }); });", "{ ref: v.id, cierre: true }); }); _cpLibro26 = costoProm; { const r26 = trillaMes26(m, invKg, invVal, costoProm, asiento); invKg = r26.invKg; invVal = r26.invVal; } });")
rep("  A.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.cierre ? 1 : 0) - (", "  _cpLibro26 = costoProm; asientosTaza26(asiento);\n  A.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.cierre ? 1 : 0) - (")
