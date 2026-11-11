# Ajustes v24 sobre el HTML v23 (s y rep disponibles)
rep("const APP_VERSION = '23.0';", "const APP_VERSION = '24.0';")
rep("  hoy:        { t:'Hoy',            s:'Lo que pasa hoy en la finca' },", "  hoy:        { t:'Hoy',            s:'Lo que pasa hoy en la finca' },\n  mando:      { t:'Centro de mando', s:'Índices de gestión, alertas priorizadas, cierre de periodos, respaldos e integridad de los datos' },")
rep("reportes:renderReportes, lote:renderFichaLote, campo:renderCampo }[name];", "reportes:renderReportes, lote:renderFichaLote, campo:renderCampo, mando:renderMando }[name];")
rep('  <section class="view" id="view-campo"><div id="cp-root"></div></section>', '  <section class="view" id="view-campo"><div id="cp-root"></div></section>\n  <section class="view" id="view-mando"><div id="md-root"></div></section>')
rep('''    <button class="nav-item" data-nav="hoy" onclick="ir('hoy')"><svg><use href="#i-hoy"/></svg>Hoy<span class="badge" id="badge-hoy" hidden></span></button>''',
    '''    <button class="nav-item" data-nav="hoy" onclick="ir('hoy')"><svg><use href="#i-hoy"/></svg>Hoy<span class="badge" id="badge-hoy" hidden></span></button>\n    <button class="nav-item" data-nav="mando" onclick="ir('mando')"><svg><use href="#i-tablero"/></svg>Centro de mando</button>''')
rep("['presupuesto', 'Presupuesto'], ['lotes', 'Costos por lote']", "['presupuesto', 'Presupuesto'], ['creditos', 'Créditos'], ['lotes', 'Costos por lote']")
rep("presupuesto: finPresupuesto, lotes: finLotes,", "presupuesto: finPresupuesto, creditos: finCreditos, lotes: finLotes,")
