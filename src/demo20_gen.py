#!/usr/bin/env python3
# Datos de ejemplo v20 sobre la finca real de Omar (El Tesoro, Ocamonte, Santander, ~1.970 msnm):
# forma del lote tomada de su foto de Google Earth, casa (Punto A), punto principal y vía veredal.
# Cosechas, personas, ventas y cifras siguen siendo de ejemplo.
import json, random, math, datetime as dt
random.seed(20); R2 = random.Random(29)
hoy = dt.date(2026, 10, 29)
def d(x): return x.isoformat()

# ---------- Geometría desde la foto (px → m, corrigiendo inclinación y norte) ----------
PX = [(657,527),(705,468),(790,415),(865,388),(980,377),(1178,398),(1190,437),(1508,567),(1370,660),(1260,712),(1200,730),(1090,741),(1030,737),(955,788),(920,788)]
M_PX, TILT, ANG = 50 / 317.0, 0.62, math.radians(15)
CX = sum(p[0] for p in PX) / len(PX); CY = sum(p[1] for p in PX) / len(PX)
def mundo(p):
    sx = (p[0] - CX) * M_PX; sy = -(p[1] - CY) * M_PX / TILT
    N = (-math.sin(ANG), math.cos(ANG)); E = (math.cos(ANG), math.sin(ANG))
    return (sx * E[0] + sy * E[1], sx * N[0] + sy * N[1])
def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
P0 = [mundo(p) for p in PX]
F = math.sqrt(10000 / area(P0))           # se lleva a 1,0 ha (área registrada); la foto inclinada da ≈0,84 ha
esc = lambda q: (round(q[0] * F, 2), round(q[1] * F, 2))
POLY = [esc(q) for q in P0]
CASA = esc(mundo((703, 503))); PRINCIPAL = esc(mundo((1070, 545)))
VIA = [esc(mundo(q)) for q in [(470,915),(560,885),(700,845),(830,810),(920,792),(955,788),(1030,737),(1090,741),(1200,730),(1260,712),(1370,660),(1508,575),(1600,610),(1700,640),(1800,660),(1920,700),(2000,730)]]
# Relieve: ladera que baja hacia la vía (sur-sureste), ~30 % de pendiente, 1.970 msnm en el punto principal
def zt(x, y):
    dd = -0.5 * x + 0.866 * y
    return round(1970 + 0.30 * (dd - (-0.5 * PRINCIPAL[0] + 0.866 * PRINCIPAL[1])) + 1.6 * math.sin(x / 23.0) * math.cos(y / 31.0), 1)

fincas = [{'id': 'f1', 'nombre': 'El Tesoro', 'propietario': 'Familia (ejemplo)', 'vereda': 'Ocamonte', 'municipio': 'Ocamonte', 'departamento': 'Santander', 'areaTotal': 1.0, 'altitud': 1970,
           'geoRef': {'lat': 6.34211, 'lon': -73.12086}, 'notas': 'Forma tomada de la foto de Google Earth (aproximada). Para el área exacta, exporte el polígono como KML e impórtelo.'}]
fincas[0]['forma'] = {'pts': [[x, y, zt(x, y)] for x, y in POLY], 'fuente': 'Foto Google Earth (aprox.)'}
fincas[0]['puntos'] = [{'id': 'pt1', 'tipo': 'Casa', 'nombre': 'Casa (Punto A)', 'x': CASA[0], 'y': CASA[1], 'z': zt(*CASA)},
                       {'id': 'pt2', 'tipo': 'Referencia', 'nombre': 'Punto principal', 'x': PRINCIPAL[0], 'y': PRINCIPAL[1], 'z': zt(*PRINCIPAL)}]
fincas[0]['vias'] = [{'id': 'via1', 'nombre': 'Vía veredal', 'pts': [[x, y] for x, y in VIA]}]
xs = [p[0] for p in POLY]; ys = [p[1] for p in POLY]
fincas[0]['alturas'] = [{'x': x, 'y': y, 'z': zt(x, y)} for x in range(int(min(xs)) - 30, int(max(xs)) + 31, 25) for y in range(int(min(ys)) - 30, int(max(ys)) + 31, 25)]


# ---------- Entorno tal como se ve en la foto (coberturas, construcciones, sombrío) ----------
def pol(px): return [list(esc(mundo(q))) for q in px]
def ang_surcos(a, b):
    p, q = esc(mundo(a)), esc(mundo(b)); return round(math.degrees(math.atan2(q[1] - p[1], q[0] - p[0])) + 90, 1)
entorno = [
  {'tipo': 'bosque', 'nombre': 'Bosque y monte', 'pts': pol([(-200,-120),(560,-120),(600,120),(640,250),(560,330),(470,420),(360,470),(250,600),(-200,700)])},
  {'tipo': 'potrero', 'nombre': 'Potrero', 'pts': pol([(250,600),(360,470),(470,420),(560,450),(657,527),(760,640),(900,780),(820,810),(650,840),(470,900),(300,960),(150,980),(-200,1000),(-200,700)])},
  {'tipo': 'rastrojo', 'nombre': 'Rastrojo alto', 'pts': pol([(560,-120),(930,-120),(950,140),(860,260),(780,300),(700,330),(640,250),(600,120)])},
  {'tipo': 'potrero', 'nombre': 'Potrero norte', 'pts': pol([(680,150),(860,140),(900,260),(820,240),(740,230),(690,200)])},
  {'tipo': 'cafe', 'nombre': 'Cafetal vecino norte', 'angulo': ang_surcos((1250,200),(1400,265)), 'surcos': 1.6, 'pts': pol([(930,-120),(1500,-120),(1460,60),(1520,200),(1580,330),(1560,420),(1508,567),(1190,437),(1178,398),(980,377),(865,388),(860,300),(950,140)])},
  {'tipo': 'potrero', 'nombre': 'Potrero y casas', 'pts': pol([(1500,-120),(2100,-120),(2100,260),(1760,200),(1620,170),(1460,60)])},
  {'tipo': 'cafe', 'nombre': 'Cafetal vecino oriente', 'angulo': ang_surcos((1780,280),(1840,420)), 'surcos': 1.6, 'pts': pol([(1520,200),(1760,200),(2100,260),(2100,700),(1900,650),(1800,560),(1700,500),(1590,430),(1580,330)])},
  {'tipo': 'patio', 'nombre': 'Explanada', 'pts': pol([(1590,430),(1680,385),(1770,395),(1800,460),(1760,520),(1690,520),(1620,480)])},
  {'tipo': 'cafe', 'nombre': 'Cafetal vecino sur', 'angulo': ang_surcos((1450,760),(1700,820)), 'surcos': 1.6, 'pts': pol([(960,800),(1050,760),(1200,745),(1380,690),(1520,600),(1640,650),(1900,720),(2100,760),(2100,1050),(900,1050)])},
  {'tipo': 'rastrojo', 'nombre': 'Rastrojo sur', 'pts': pol([(470,900),(650,840),(820,810),(960,800),(900,1050),(400,1050)])},
  {'tipo': 'construccion', 'nombre': 'Casa vecina', 'techo': 'zinc', 'pts': pol([(722,168),(800,166),(802,197),(724,199)])},
  {'tipo': 'construccion', 'nombre': 'Casa vecina', 'techo': 'azul', 'pts': pol([(1462,72),(1512,70),(1514,98),(1466,100)])},
  {'tipo': 'construccion', 'nombre': 'Bodega vecina', 'techo': 'zinc', 'pts': pol([(1585,118),(1662,122),(1660,150),(1583,146)])},
  {'tipo': 'construccion', 'nombre': 'Caseta', 'techo': 'zinc', 'pts': pol([(1733,412),(1766,410),(1768,446),(1735,448)])},
  {'tipo': 'construccion', 'nombre': 'Casa vecina', 'techo': 'zinc', 'pts': pol([(605,822),(690,816),(692,850),(607,856)])},
  {'tipo': 'construccion', 'nombre': 'Casa vecina', 'techo': 'teja', 'pts': pol([(492,866),(560,862),(562,900),(494,904)])},
  {'tipo': 'construccion', 'nombre': 'Casa (Punto A)', 'techo': 'zinc', 'pts': pol([(690,492),(716,490),(718,512),(692,514)])},
]
fincas[0]['entorno'] = entorno; fincas[0]['fondo'] = 'potrero'
fincas[0]['vias'] += [{'id': 'via2', 'nombre': 'Camino', 'ancho': 2.6, 'pts': [list(esc(mundo(q))) for q in [(945,-120),(955,0),(965,90),(948,150),(900,215),(850,250)]]},
                      {'id': 'via3', 'nombre': 'Acceso', 'ancho': 3.2, 'pts': [list(esc(mundo(q))) for q in [(1640,470),(1720,500),(1800,550),(1870,610),(1920,660)]]}]
# Sombrío: árboles del lote (densos como en la foto) y árboles sueltos del potrero
def dentro(x, y, P):
    c = False; j = len(P) - 1
    for i in range(len(P)):
        xi, yi = P[i]; xj, yj = P[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
RS = random.Random(77); somb = []
bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys); intentos = 0
while len(somb) < 120 and intentos < 20000:
    intentos += 1; x = RS.uniform(bx0, bx1); y = RS.uniform(by0, by1)
    if not dentro(x, y, POLY): continue
    r = RS.uniform(3.2, 6.4) if RS.random() > 0.18 else RS.uniform(1.8, 2.4)
    if any((x - t['x']) ** 2 + (y - t['y']) ** 2 < (0.62 * (r + t['r'])) ** 2 for t in somb): continue
    somb.append({'x': round(x, 1), 'y': round(y, 1), 'r': round(r, 1), 'tipo': 'platano' if r < 2.5 else RS.choice(['guamo', 'guamo', 'nogal'])})
pot = entorno[1]['pts']; pb = cajaP = (min(p[0] for p in pot), max(p[0] for p in pot), min(p[1] for p in pot), max(p[1] for p in pot)); k = 0
while k < 14:
    x = RS.uniform(pb[0], pb[1]); y = RS.uniform(pb[2], pb[3])
    if dentro(x, y, pot) and not dentro(x, y, POLY): somb.append({'x': round(x, 1), 'y': round(y, 1), 'r': round(RS.uniform(2.5, 4.5), 1), 'tipo': 'guamo'}); k += 1
fincas[0]['sombrio'] = []   # sin árboles: se muestra el diseño real del cultivo

variedades = [{'id': 'v1', 'nombre': 'Castillo'}, {'id': 'v2', 'nombre': 'Cenicafé 1'}]
lotes = [{'id': 'l1', 'fincaId': 'f1', 'nombre': 'Lote El Tesoro', 'codigo': 'T1', 'variedadId': 'v1', 'hectareas': '1.0', 'fechaSiembra': '2021-04-10',
          'forma': {'pts': [[x, y, zt(x, y)] for x, y in POLY], 'fuente': 'Foto Google Earth (aprox.)', 'actualizada': '2026-10-29'},
          'diseno': {'distSurcos': 1.5, 'distPlantas': 1, 'relacion': 1.6, 'orientacion': 150, 'pendiente': 30, 'trazado': 'contorno'}}]

# ---------- Personas ----------
nom = ['Ana Ríos', 'Luis Gómez', 'Rosa Pérez', 'Jairo Díaz', 'Marta Suárez']
trab = [{'id': 't%d' % i, 'nombre': n, 'tarifaPorKg': 750 if i == 2 else 700, 'telefono': '', 'documento': ''} for i, n in enumerate(nom)]
skill = {t['id']: random.uniform(0.8, 1.2) for t in trab}

# ---------- Cosecha por pasadas (cada ~14 días, 3 a 4 días por pasada) ----------
regs = []; rid = 0
inicios = [dt.date(2026, 8, 24), dt.date(2026, 9, 7), dt.date(2026, 9, 21), dt.date(2026, 10, 5), dt.date(2026, 10, 19)]
pico = dt.date(2026, 10, 8)
for npas, ini in enumerate(inicios, 1):
    dias = 4 if abs((ini - pico).days) < 12 else 3
    for k in range(dias):
        x = ini + dt.timedelta(days=k)
        if x >= hoy: break
        fac = max(0.3, 1 - abs((x - pico).days) / 40)
        cuadrilla = random.sample(trab, 5 if fac > 0.7 else 4)
        for t in cuadrilla:
            h = random.choice([7, 7.5, 8, 8, 8.5])
            kg = round(h * 7.6 * skill[t['id']] * fac * random.uniform(0.85, 1.12), 1)
            rid += 1
            regs.append({'id': 'g%d' % rid, 'fincaId': 'f1', 'loteId': 'l1', 'loteNombre': 'Lote El Tesoro', 'lote': 'Lote El Tesoro', 'finca': 'El Tesoro', 'variedadId': 'v1', 'variedad': 'Castillo',
                         'anio': 2026, 'tipo': 'Principal', 'pasada': npas, 'fecha': d(x), 'trabajadorId': t['id'], 'recolector': t['nombre'], 'horas': h, 'kg': kg, 'tarifa': t['tarifaPorKg']})
# Beneficio por pasada
benef = []; bid = 0
for npas in sorted(set(r['pasada'] for r in regs)):
    rs = [r for r in regs if r['pasada'] == npas]; ce = sum(r['kg'] for r in rs)
    ult = max(dt.date.fromisoformat(r['fecha']) for r in rs)
    fb = min(ult + dt.timedelta(days=6), hoy - dt.timedelta(days=1))
    if fb <= ult: continue
    bid += 1; benef.append({'id': 'b%d' % bid, 'loteId': 'l1', 'fecha': d(fb), 'metodo': 'Lavado', 'kgEntrada': round(ce, 1), 'kgSalida': round(ce / random.uniform(4.95, 5.25), 1),
                            'fermentacionHoras': random.choice([16, 18, 20]), 'secado': 'Marquesina solar', 'pasada': npas})

labores = []; lid = 0
for f, tp, c in [('2026-08-28', 'Control de malezas (guadaña)', 246000), ('2026-09-30', 'Control de malezas (guadaña)', 246000), ('2026-10-15', 'Control de broca (repase)', 328000)]:
    lid += 1; labores.append({'id': 'lb%d' % lid, 'loteId': 'l1', 'fecha': f, 'tipo': tp, 'insumo': '', 'cantidad': '', 'costo': c, 'responsable': 'Jairo Díaz'})
insumos = [{'id': 'i1', 'fecha': '2026-08-20', 'finca': 'El Tesoro', 'lote': '', 'nombre': 'Costales y lonas', 'costo': 120000}]
empleados = []
activos = [{'id': 'a1', 'nombre': 'Marquesina solar 3,40 × 6,60 m', 'categoria': 'Infraestructura', 'fecha': '2025-09-01', 'costo': 3800000, 'vidaUtil': 10, 'valorResidual': 0, 'ubicacion': 'Junto a la casa'},
           {'id': 'a2', 'nombre': 'Despulpadora manual', 'categoria': 'Maquinaria', 'fecha': '2023-02-10', 'costo': 2900000, 'vidaUtil': 10, 'valorResidual': 300000, 'ubicacion': 'Beneficiadero'},
           {'id': 'a3', 'nombre': 'Guadaña', 'categoria': 'Maquinaria', 'fecha': '2024-06-01', 'costo': 1450000, 'vidaUtil': 5, 'valorResidual': 100000}]
adelantos = [{'id': 'ad1', 'trabajadorId': 't0', 'fecha': '2026-10-24', 'valor': 50000, 'motivo': 'Mercado', 'aplicado': False}]
ots = []
def ot(n, f, tp, est, jor, ins, prio='Media', real=None):
    mo = jor * 82000; ic = sum(i['cantidad'] * i['costoUnit'] for i in ins)
    o = {'id': 'o%d' % n, 'numero': 'OT-%04d' % n, 'estado': est, 'prioridad': prio, 'fechaProgramada': f, 'loteId': 'l1', 'area': 1.0, 'tipo': tp, 'responsable': 'Jairo Díaz', 'trabajadores': 2,
         'especificacion': 'Ejemplo de especificación técnica.', 'herramientas': '', 'epp': '', 'insumos': ins, 'presupuesto': {'jornales': jor, 'manoObra': mo, 'insumos': ic, 'total': mo + ic, 'valorJornal': 65000, 'alimentacion': 17000}}
    if real: o['real'] = {'fecha': f, 'jornales': real, 'avance': 100, 'insumos': ins, 'manoObra': real * 82000, 'insumosCosto': ic, 'total': real * 82000 + ic}
    ots.append(o)
ot(1, '2026-09-30', 'Control de malezas (guadaña)', 'Cerrada', 3, [{'nombre': 'Gasolina', 'cantidad': 2, 'unidad': 'galón', 'costoUnit': 16500}], real=3)
ot(2, '2026-10-15', 'Control de broca (repase)', 'Cerrada', 4, [], real=4)
ot(3, '2026-10-27', 'Fertilización edáfica', 'En ejecución', 2.5, [{'nombre': 'NPK 17-6-18', 'cantidad': 450, 'unidad': 'kg', 'costoUnit': 3250}], 'Alta')
ot(4, '2026-10-30', 'Control de broca (repase)', 'Emitida', 3, [], 'Alta')
ot(5, '2026-11-04', 'Control de malezas (guadaña)', 'Programada', 3, [{'nombre': 'Gasolina', 'cantidad': 2, 'unidad': 'galón', 'costoUnit': 16500}])
plantillas = json.load(open('plantillas_demo.json'))['plantillas']
ventas = []; pagos = []
demo = {'fincas': fincas, 'variedades': variedades, 'lotes': lotes, 'bloques': [], 'trabajadores': trab, 'empleados': empleados, 'activos': activos, 'registros': regs, 'insumos': insumos, 'ventas': ventas,
        'beneficios': benef, 'labores': labores, 'adelantos': adelantos, 'pagos': pagos, 'plantillas': plantillas, 'ordenes': ots, 'planConfig': {'valorJornal': 65000, 'alimentacion': 17000},
        'muestreos': [], 'marcasPlanta': [], 'planesMuestreo': [], 'mapaConfig': {}, 'bitacora': []}

# ---------- Suelo ----------
suelos = [
  {'id': 'su0', 'loteId': 'l1', 'fecha': '2023-10-18', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco arcillosa', 'pH': 5.0, 'MO': 13.1, 'P': 11, 'K': 0.31, 'Ca': 2.4, 'Mg': 0.7, 'Al': 1.0, 'S': 13, 'B': 0.3, 'Zn': 2.1, 'Cu': 2.0, 'Fe': 110, 'Mn': 14, 'CICE': 6.2},
  {'id': 'su1', 'loteId': 'l1', 'fecha': '2025-11-12', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco arcillosa', 'pH': 4.9, 'MO': 12.4, 'P': 9, 'K': 0.24, 'Ca': 2.0, 'Mg': 0.55, 'Al': 1.3, 'S': 11, 'B': 0.24, 'Zn': 1.8, 'Cu': 1.9, 'Fe': 128, 'Mn': 16, 'CICE': 5.9}]
# ---------- Clima diario (normales de una ladera andina de Santander a ~1.970 m) ----------
normal = [70, 85, 135, 215, 230, 125, 95, 110, 175, 265, 225, 115]
clima = []; x = dt.date(2025, 1, 1); k = 0
while x <= hoy - dt.timedelta(days=1):
    m = x.month - 1; p_dia = min(0.85, normal[m] / 14 / 30 * 1.9)
    seco = dt.date(2026, 1, 8) <= x <= dt.date(2026, 2, 24)
    llueve = R2.random() < (0.07 if seco else p_dia)
    mm = round(R2.expovariate(1 / max(4, normal[m] / (p_dia * 30) if p_dia else 5)), 1) if llueve else 0.0
    if x == dt.date(2026, 2, 26): mm = 31.5
    if x == dt.date(2026, 2, 27): mm = 12.0
    if dt.date(2026, 10, 1) <= x <= dt.date(2026, 10, 20) and R2.random() < 0.5: mm = round(mm + R2.uniform(8, 25), 1)
    tmax = round(23.6 + (1.6 if seco else 0) - mm * 0.04 + R2.uniform(-1.4, 1.4), 1); tmin = round(14.6 + R2.uniform(-1.2, 1.0) - (0.8 if seco else 0), 1)
    k += 1; clima.append({'id': 'cl%d' % k, 'fincaId': 'f1', 'fecha': d(x), 'lluvia': mm, 'tmax': tmax, 'tmin': tmin, 'hr': round(min(98, 76 + mm * 0.6 + R2.uniform(-6, 8))), 'fuente': 'estación'})
    x += dt.timedelta(days=1)
# ---------- Terceros, partidas (una por pasada) y ventas ----------
terceros = [{'id': 'te1', 'nombre': 'Cooperativa de Caficultores (ejemplo)', 'tipo': 'Cliente', 'nit': '890.000.001-1', 'ciudad': 'San Gil'},
            {'id': 'te2', 'nombre': 'Comprador de cafés especiales (ejemplo)', 'tipo': 'Cliente', 'nit': '900.000.002-2', 'ciudad': 'Bucaramanga'},
            {'id': 'te3', 'nombre': 'Almacén Agropecuario (ejemplo)', 'tipo': 'Proveedor', 'nit': '800.000.003-3', 'ciudad': 'Ocamonte'},
            {'id': 'te4', 'nombre': 'Banco Agrario (ejemplo)', 'tipo': 'Entidad financiera', 'nit': '800.037.800-8'}]
partidas = []
for i, b in enumerate(sorted(benef, key=lambda z: z['fecha']), 1):
    partidas.append({'id': 'pa%d' % i, 'codigo': 'P-2026-%03d' % i, 'fecha': b['fecha'], 'tipo': 'Pergamino seco', 'proceso': 'Lavado', 'beneficioIds': [b['id']], 'kg': None,
                     'humedad': round(R2.uniform(10.6, 11.6), 1), 'factor': round(R2.uniform(91.5, 94.5), 1), 'taza': [None, 84.25, 85.0, 84.75, None][(i - 1) % 5], 'fincaId': 'f1'})
disp = {p['id']: sum(b['kgSalida'] for b in benef if b['id'] in p['beneficioIds']) for p in partidas}
vid = 0
for grupo in [partidas[0:2], partidas[2:4]]:
    if not grupo: continue
    kg = round(sum(disp[q['id']] for q in grupo), 1); fecha = d(min(dt.date.fromisoformat(grupo[-1]['fecha']) + dt.timedelta(days=3), hoy - dt.timedelta(days=1)))
    esp = any(q.get('taza') for q in grupo); vid += 1
    precio = (2420000 if esp else 2265000) / 125; credito = vid == 2
    v = {'id': 'v%d' % vid, 'fecha': fecha, 'terceroId': 'te2' if esp else 'te1', 'comprador': 'Comprador de cafés especiales (ejemplo)' if esp else 'Cooperativa de Caficultores (ejemplo)', 'kg': kg, 'precio': round(precio, 2),
         'partidas': [{'partidaId': q['id'], 'kg': round(disp[q['id']], 1)} for q in grupo], 'documento': 'Liquidación %04d' % (410 + vid), 'retencionPct': 0.5, 'retencion': round(kg * precio * 0.005),
         'bonificacion': 30000 if esp else 0, 'descuentos': 0, 'formaPago': 'Crédito' if credito else 'Contado', 'cuenta': 'Banco', 'factor': grupo[0]['factor']}
    neto = kg * precio + v['bonificacion'] - v['retencion']
    if credito: v['vence'] = d(dt.date.fromisoformat(fecha) + dt.timedelta(days=30)); v['cobros'] = []
    else: v['cobros'] = [{'fecha': fecha, 'valor': round(neto), 'cuenta': 'Banco'}]
    ventas.append(v)
# ---------- Pagos a recolectores al cierre de cada pasada ----------
pgid = 0
for npas in sorted(set(r['pasada'] for r in regs)):
    rs_p = [r for r in regs if r['pasada'] == npas]; fin = max(r['fecha'] for r in rs_p)
    if fin >= d(hoy - dt.timedelta(days=2)): continue
    for t in trab:
        rs = [r for r in rs_p if r['trabajadorId'] == t['id']]
        if not rs: continue
        bruto = round(sum(r['kg'] * r['tarifa'] for r in rs)); pgid += 1
        pagos.append({'id': 'pg%d' % pgid, 'trabajadorId': t['id'], 'periodoInicio': min(r['fecha'] for r in rs), 'periodoFin': fin, 'kgTotal': round(sum(r['kg'] for r in rs), 1), 'valorBruto': bruto,
                      'adelantosDescontados': 0, 'valorNeto': bruto, 'fecha': fin, 'motivo': 'Fin de pasada %d' % npas})
# ---------- Movimientos 2026 (escala de 1 ha) ----------
movimientos = []; mid = 0
def mov(**kw):
    global mid
    mid += 1; m = {'id': 'mv%d' % mid}; m.update(kw); movimientos.append(m)
for mes in range(1, 11):
    f = '2026-%02d-' % mes
    mov(tipo='egreso', fecha=f + '05', concepto='Energía y agua', cuenta='5135', valor=R2.choice([42000, 46000, 51000]), medio='Banco')
    if mes >= 3: mov(tipo='abono', fecha=f + '20', concepto='Cuota crédito marquesina', valor=210000, intereses=round(4000000 * 0.013 * (1 - (mes - 3) / 24)), medio='Banco', terceroId='te4')
mov(tipo='prestamo', fecha='2026-02-15', concepto='Crédito para marquesina y renovación', valor=4000000, medio='Banco', terceroId='te4')
mov(tipo='egreso', fecha='2026-03-15', concepto='Impuesto predial', cuenta='5115', valor=180000, medio='Banco')
mov(tipo='egreso', fecha='2026-07-02', concepto='Repuestos de guadaña', cuenta='7315', valor=160000, medio='Caja', terceroId='te3')
mov(tipo='egreso', fecha='2026-09-08', concepto='Lonas y costales para la cosecha', cuenta='7395', valor=140000, medio='Caja', terceroId='te3')
mov(tipo='egreso', fecha='2026-10-12', concepto='Fungicida preventivo para roya', cuenta='7105', valor=210000, medio='Crédito', vence='2026-11-12', terceroId='te3', loteId='l1', pagos=[])
mov(tipo='inversion', fecha='2026-03-01', concepto='Tanque tina de fermentación', cuenta='1520', valor=1200000, medio='Banco', vida=8)
activos.append({'id': 'act-mv', 'movId': 'mv%d' % mid, 'nombre': 'Tanque tina de fermentación', 'categoria': 'Maquinaria', 'fecha': '2026-03-01', 'costo': 1200000, 'vidaUtil': 8, 'valorResidual': 0})
mov(tipo='ingreso', fecha='2026-05-30', concepto='Venta de pasilla de mitaca', cuenta='4295', valor=160000, medio='Caja')
disenos = [
  {'id': 'ds1', 'nombre': 'Actual · 1,5 × 1 m en curvas', 'variedad': 'Castillo', 'distSurcos': 1.5, 'distPlantas': 1, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 5, 'inicio': 'siembra'},
  {'id': 'ds2', 'nombre': 'Tradicional 2 × 1,5 m', 'variedad': 'Castillo', 'distSurcos': 2, 'distPlantas': 1.5, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 6, 'inicio': 'siembra'},
  {'id': 'ds3', 'nombre': 'Muy alta densidad 1,4 × 0,8 m', 'variedad': 'Cenicafé 1', 'distSurcos': 1.4, 'distPlantas': 0.8, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 4, 'inicio': 'siembra'},
]
demo.update({'pagos': pagos, 'suelos': suelos, 'clima': clima, 'terceros': terceros, 'partidas': partidas, 'ventas': ventas, 'movimientos': movimientos, 'disenos': disenos, 'activos': activos, 'planesAgro': [],
  'climaConfig': {'normales': {'f1': normal}, 'cosecha': {'principal': [9, 10, 11, 12], 'mitaca': [4, 5]}, 'balance': {'cad': 120, 'kc': 0.95, 'lat': 6.34, 'umbralSeco': 2, 'diasSecos': 12, 'lluviaDisparo': 12, 'diasAFlor': 10}},
  'contaConfig': {'fechaInicio': '2026-01-01', 'saldos': {'caja': 600000, 'bancos': 7500000, 'terrenos': 60000000, 'construcciones': 25000000, 'plantaciones': 12000000, 'insumos': 0}, 'factorPrestacional': 0.35, 'retencionVentaPct': 0.5},
  'presupuestos': {}, 'cuentasExtra': []})
json.dump(demo, open('demo20_base.json', 'w'), ensure_ascii=False)
print('área foto %.2f ha → 1,00 ha' % (area(P0) / 1e4), 'registros', len(regs), 'kg', round(sum(r['kg'] for r in regs)), 'benef', len(benef), 'ventas', len(ventas), 'pagos', len(pagos))
