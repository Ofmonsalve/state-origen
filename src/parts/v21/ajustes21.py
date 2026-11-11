# Ajustes v21 sobre el HTML v20 (s y rep disponibles)
import re
rep("const APP_VERSION = '20.0';", "const APP_VERSION = '21.0';")
# Vista Cosecha nueva
a = s.index('<section class="view active" id="view-panel">'); b = s.index('</section>', a)
s = s[:a] + '<section class="view active" id="view-panel"><div id="cs-root"></div>' + s[b:]
# Tablero y Hoy: el tablero abre en el año en curso
rep("let tbSt = { periodo:'ult30',", "let tbSt = { periodo:'anio',")
# Pagos pendientes del tablero: por registro sin liquidar
s = re.sub(r"bruto \+= registros\.filter\(r => r\.trabajadorId === t\.id && \(!up \|\| r\.fecha > up\.periodoFin\) && tbDeFinca\(r, 'registro'\)\)\.reduce\(\(a, r\) => a \+ n0\(r\.kg\) \* tarifaDe\(r\), 0\);",
           "bruto += pendientesPago(t.id).filter(r => tbDeFinca(r, 'registro')).reduce((a, r) => a + pagoRegistro(r), 0);", s)
# Simulador de tarifa del tablero
s = s.replace("n0(x.kg) * (tarifaDe(x) + n0(opt.deltaTarifa))", "(costoRegistro(x) + (modalidadDe(x) === 'kilo' ? n0(x.kg) * n0(opt.deltaTarifa) : 0))")
# Todo cálculo de costo de recolección pasa por costoRegistro (kilo, jornal, nómina y alimentación)
s, n = re.subn(r"n0\((\w+)\.kg\)\s*\*\s*tarifaDe\(\1\)", r"costoRegistro(\1)", s)
print('reemplazos de costo:', n)
rep("panel:      { t:'Cosecha',        s:'Producción, productividad y margen por lote, recolector y ciclo' },", "panel:      { t:'Cosecha',        s:'Registro diario de recolección, forma de pago, liquidación y beneficio de cada pasada' },")
