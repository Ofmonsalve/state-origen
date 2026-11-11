# Ajustes v30: guía de puesta al día
rep("const APP_VERSION = '29.0';", "const APP_VERSION = '30.0';")
rep("  hoy:        { t:'Hoy',            s:'Lo que pasa hoy en la finca' },", "  hoy:        { t:'Hoy',            s:'Lo que pasa hoy en la finca' },\n  pendientes: { t:'Puesta al día', s:'Lo que falta por completar en sus datos, con una guía paso a paso' },")
rep("taza:renderTaza }[name];", "taza:renderTaza, pendientes:renderPend30 }[name];")
rep('  <section class="view" id="view-taza"><div id="tz-root"></div></section>', '  <section class="view" id="view-taza"><div id="tz-root"></div></section>\n  <section class="view" id="view-pendientes"><div id="pd30-root"></div></section>')
rep('''    <button class="nav-item" data-nav="hoy" onclick="ir('hoy')"><svg><use href="#i-hoy"/></svg>Hoy<span class="badge" id="badge-hoy" hidden></span></button>''',
    '''    <button class="nav-item" data-nav="hoy" onclick="ir('hoy')"><svg><use href="#i-hoy"/></svg>Hoy<span class="badge" id="badge-hoy" hidden></span></button>\n    <button class="nav-item" data-nav="pendientes" onclick="ir('pendientes')"><svg><use href="#i-orden"/></svg>Puesta al día<span class="badge soft" id="badge-pend30" hidden></span></button>''')
