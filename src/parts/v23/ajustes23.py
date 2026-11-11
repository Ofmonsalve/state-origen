# Ajustes v23 sobre el HTML v22 (s y rep disponibles)
rep("const APP_VERSION = '22.0';", "const APP_VERSION = '23.0';")
rep("  lote:       { t:'Ficha del lote', s:'Todo sobre un lote: forma real, plantas, sanidad, suelo, producción, labores y costos' },",
    "  lote:       { t:'Ficha del lote', s:'Todo sobre un lote: forma real, plantas, sanidad, suelo, producción, labores y costos' },\n"
    "  campo:      { t:'Seguimiento del cultivo', s:'Floración y calendario, fenología BBCH, estimación de cosecha, censo de plantas, arvenses, labores con tarifa y ENSO' },")
rep("reportes:renderReportes, lote:renderFichaLote }[name];", "reportes:renderReportes, lote:renderFichaLote, campo:renderCampo }[name];")
rep('  <section class="view" id="view-lote"><div id="fl-root"></div></section>', '  <section class="view" id="view-lote"><div id="fl-root"></div></section>\n  <section class="view" id="view-campo"><div id="cp-root"></div></section>')
rep('''    <button class="nav-item" data-nav="agronomia" onclick="ir('agronomia')"><svg><use href="#i-calendario"/></svg>Plan agronómico</button>''',
    '''    <button class="nav-item" data-nav="campo" onclick="ir('campo')"><svg><use href="#i-labor"/></svg>Seguimiento del cultivo</button>\n    <button class="nav-item" data-nav="agronomia" onclick="ir('agronomia')"><svg><use href="#i-calendario"/></svg>Plan agronómico</button>''')
