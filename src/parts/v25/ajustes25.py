# Ajustes v25 sobre el HTML v24 (s y rep disponibles)
rep("const APP_VERSION = '24.0';", "const APP_VERSION = '25.0';")
rep("  mando:      { t:'Centro de mando',", "  legal:      { t:'Predio y cumplimiento', s:'Catastro, registro, propiedad, predial, documentos, contratos, aguas, certificaciones, matriz legal, seguridad y salud, y riesgos' },\n  mando:      { t:'Centro de mando',")
rep("campo:renderCampo, mando:renderMando }[name];", "campo:renderCampo, mando:renderMando, legal:renderLegal }[name];")
rep('  <section class="view" id="view-mando"><div id="md-root"></div></section>', '  <section class="view" id="view-mando"><div id="md-root"></div></section>\n  <section class="view" id="view-legal"><div id="lg-root"></div></section>')
rep('''    <button class="nav-item" data-nav="gestion" onclick="ir('gestion')"><svg><use href="#i-finca"/></svg>Finca y lotes</button>''',
    '''    <button class="nav-item" data-nav="gestion" onclick="ir('gestion')"><svg><use href="#i-finca"/></svg>Finca y lotes</button>\n    <button class="nav-item" data-nav="legal" onclick="ir('legal')"><svg><use href="#i-reporte"/></svg>Predio y cumplimiento</button>''')
