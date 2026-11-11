# Ajustes de v20 sobre el HTML ensamblado (se ejecuta dentro de merge20.py con s y rep disponibles)
# ---- Vistas nuevas: Reportes y Ficha del lote ----
rep("  gestion:    { t:'Finca y lotes',  s:'Datos catastrales, lotes, bloques y variedades' },\n};",
    "  gestion:    { t:'Finca y lotes',  s:'Datos catastrales, lotes, bloques y variedades' },\n"
    "  reportes:   { t:'Reportes',       s:'Informes PDF de gerencia, cosecha, campo, ventas y finanzas con diseño profesional' },\n"
    "  lote:       { t:'Ficha del lote', s:'Todo sobre un lote: forma real, plantas, sanidad, suelo, producción, labores y costos' },\n};")
rep("comercial:renderComercial }[name];", "comercial:renderComercial, reportes:renderReportes, lote:renderFichaLote }[name];")
rep('<section class="view" id="view-comercial"><div id="co-root"></div></section>',
    '<section class="view" id="view-comercial"><div id="co-root"></div></section>\n'
    '  <section class="view" id="view-reportes"><div id="rep-root"></div></section>\n'
    '  <section class="view" id="view-lote"><div id="fl-root"></div></section>')
# ---- Íconos nuevos ----
rep('<symbol id="i-pdf" viewBox="0 0 24 24">',
    '<symbol id="i-reporte" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 17v-3M12 17v-6M15 17v-4"/></symbol>'
    '<symbol id="i-lote" viewBox="0 0 24 24"><path d="M4 7.5 9 4l6 2.5L20 4v12.5L15 20l-6-2.5L4 20z"/><path d="M8.5 9.5c1.5-1 3.5-.6 4.4.9.9 1.6.2 3.5-1.4 4.3"/><path d="M9 14.5c1-.2 2-.8 2.7-1.7"/></symbol>'
    '<symbol id="i-pdf" viewBox="0 0 24 24">')
# ---- Barra lateral reorganizada ----
a = s.index('    <button class="nav-item" data-nav="hoy"'); b = s.index('    <div class="side-foot">')
NAV = '''    <div class="nav-group">Inicio</div>
    <button class="nav-item" data-nav="hoy" onclick="ir('hoy')"><svg><use href="#i-hoy"/></svg>Hoy<span class="badge" id="badge-hoy" hidden></span></button>
    <button class="nav-item" data-nav="tablero" onclick="ir('tablero')"><svg><use href="#i-tablero"/></svg>Tablero</button>
    <button class="nav-item" data-nav="reportes" onclick="ir('reportes')"><svg><use href="#i-reporte"/></svg>Reportes<span class="badge soft">PDF</span></button>
    <div class="nav-group">Campo</div>
    <button class="nav-item" data-nav="mapa" onclick="ir('mapa')"><svg><use href="#i-mapa"/></svg>Maqueta y muestreos</button>
    <button class="nav-item" data-nav="lote" onclick="ir('lote')"><svg><use href="#i-lote"/></svg>Ficha del lote</button>
    <button class="nav-item" data-nav="agronomia" onclick="ir('agronomia')"><svg><use href="#i-calendario"/></svg>Plan agronómico</button>
    <button class="nav-item" data-nav="suelo" onclick="ir('suelo')"><svg><use href="#i-suelo"/></svg>Suelo y clima</button>
    <div class="nav-group">Cosecha y operación</div>
    <button class="nav-item" data-nav="panel" onclick="ir('panel')"><svg><use href="#i-cosecha"/></svg>Cosecha</button>
    <button class="nav-item" data-nav="planeacion" onclick="ir('planeacion')"><svg><use href="#i-plan"/></svg>Planeación<span class="badge soft" id="badge-plan" hidden></span></button>
    <button class="nav-item" data-nav="operacion" onclick="ir('operacion')"><svg><use href="#i-oper"/></svg>Operación</button>
    <button class="nav-item" data-nav="personal" onclick="ir('personal')"><svg><use href="#i-personal"/></svg>Personal</button>
    <div class="nav-group">Negocio</div>
    <button class="nav-item" data-nav="comercial" onclick="ir('comercial')"><svg><use href="#i-venta"/></svg>Ventas y trazabilidad</button>
    <button class="nav-item" data-nav="finanzas" onclick="ir('finanzas')"><svg><use href="#i-finanzas"/></svg>Contabilidad y finanzas</button>
    <div class="nav-group">Estrategia</div>
    <button class="nav-item" data-nav="disenos" onclick="ir('disenos')"><svg><use href="#i-diseno"/></svg>Diseño de cultivo</button>
    <button class="nav-item" data-nav="analisis" onclick="ir('analisis')"><svg><use href="#i-analisis"/></svg>Análisis</button>
    <div class="nav-group">Configuración</div>
    <button class="nav-item" data-nav="gestion" onclick="ir('gestion')"><svg><use href="#i-finca"/></svg>Finca y lotes</button>
'''
s = s[:a] + NAV + s[b:]
