# Datos de ejemplo v19: formas reales de lotes, relieve, suelo, clima, partidas, ventas, terceros, movimientos y configuración.
import math, random
R2 = random.Random(29)
# ---------- Relieve de la ladera (metros locales, x oriente, y norte) ----------
def zt(x, y):
    base = 1995 - 0.34 * (y + 0.25 * x)            # baja hacia el sur y un poco al occidente
    canada = -9 * math.exp(-((x - 0.55 * y - 150) ** 2) / (2 * 14 ** 2))   # quebrada que corta la finca
    loma = 4 * math.exp(-((x + 40) ** 2 + (y - 40) ** 2) / (2 * 45 ** 2))
    return round(base + canada + loma, 1)
def area(p):
    return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
def escalar(p, ha):
    a = area(p); cx = sum(q[0] for q in p) / len(p); cy = sum(q[1] for q in p) / len(p); f = math.sqrt(ha * 10000 / a)
    return [[round(cx + (q[0] - cx) * f, 2), round(cy + (q[1] - cy) * f, 2)] for q in p]
formas = {
  'l1': [[-95, 70], [-30, 82], [-12, 40], [-28, 5], [-80, 0], [-102, 32]],
  'l2': [[-5, 78], [52, 70], [60, 32], [30, 18], [-2, 30]],
  'l3': [[-92, -12], [-20, -6], [-5, -45], [-30, -92], [-88, -80], [-105, -45]],
  'l4': [[78, 60], [112, 48], [104, 0], [86, -55], [60, -50], [70, 5]],
}
for l in lotes:
    pts = escalar(formas[l['id']], float(l['hectareas']))
    l['forma'] = {'pts': [[q[0], q[1], round(zt(q[0], q[1]) + R2.uniform(-0.4, 0.4), 1)] for q in pts], 'fuente': 'GPS', 'actualizada': '2026-02-14'}
    l['diseno'] = {'distSurcos': 1.5 if l['id'] != 'l3' else 1.4, 'distPlantas': 1 if l['id'] != 'l3' else 0.8, 'relacion': 1.6, 'orientacion': 190, 'pendiente': 34, 'trazado': 'contorno'}
fincas[0].update({'geoRef': {'lat': 6.34211, 'lon': -73.12086}, 'altitud': 1980,
  'forma': {'pts': [[x, y, zt(x, y)] for x, y in [[-120, 95], [10, 100], [130, 75], [135, -75], [40, -110], [-125, -110]]], 'fuente': 'GPS'},
  'puntos': [{'id': 'pt1', 'tipo': 'Casa', 'nombre': 'Casa', 'x': 20, 'y': -20, 'z': zt(20, -20)}, {'id': 'pt2', 'tipo': 'Beneficiadero', 'nombre': 'Beneficiadero', 'x': 35, 'y': -32, 'z': zt(35, -32)},
             {'id': 'pt3', 'tipo': 'Marquesina', 'nombre': 'Marquesina solar', 'x': 8, 'y': -40, 'z': zt(8, -40)}, {'id': 'pt4', 'tipo': 'Agua', 'nombre': 'Nacimiento', 'x': 122, 'y': 70, 'z': zt(122, 70)}],
  'alturas': [{'x': x, 'y': y, 'z': zt(x, y)} for x in range(-120, 141, 40) for y in range(-110, 101, 35)]})
# ---------- Suelo ----------
suelos = [
  {'id': 'su0', 'loteId': 'l1', 'fecha': '2023-10-18', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco arcillosa', 'pH': 5.0, 'MO': 13.1, 'P': 11, 'K': 0.31, 'Ca': 2.4, 'Mg': 0.7, 'Al': 1.0, 'S': 13, 'B': 0.3, 'Zn': 2.1, 'Cu': 2.0, 'Fe': 110, 'Mn': 14, 'CICE': 6.2},
  {'id': 'su1', 'loteId': 'l1', 'fecha': '2025-11-12', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco arcillosa', 'pH': 4.8, 'MO': 12.4, 'P': 9, 'K': 0.24, 'Ca': 2.0, 'Mg': 0.55, 'Al': 1.4, 'S': 11, 'B': 0.24, 'Zn': 1.8, 'Cu': 1.9, 'Fe': 128, 'Mn': 16, 'CICE': 5.9},
  {'id': 'su2', 'loteId': 'l2', 'fecha': '2025-11-12', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franca', 'pH': 5.3, 'MO': 17.8, 'P': 21, 'K': 0.17, 'Ca': 3.6, 'Mg': 0.95, 'Al': 0.35, 'S': 16, 'B': 0.42, 'Zn': 3.2, 'Cu': 2.5, 'Fe': 96, 'Mn': 11, 'CICE': 8.1},
  {'id': 'su3', 'loteId': 'l3', 'fecha': '2025-11-12', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco arenosa', 'pH': 5.6, 'MO': 7.2, 'P': 34, 'K': 0.46, 'Ca': 4.8, 'Mg': 1.3, 'Al': 0.1, 'S': 22, 'B': 0.65, 'Zn': 4.1, 'Cu': 3.1, 'Fe': 72, 'Mn': 9, 'CICE': 9.8},
  {'id': 'su4', 'loteId': 'l4', 'fecha': '2025-11-12', 'laboratorio': 'Laboratorio de suelos (ejemplo)', 'profundidad': 20, 'textura': 'Franco limosa', 'pH': 5.1, 'MO': 15.5, 'P': 16, 'K': 0.29, 'Ca': 2.8, 'Mg': 0.45, 'Al': 0.7, 'S': 9, 'B': 0.28, 'Zn': 1.3, 'Cu': 1.6, 'Fe': 140, 'Mn': 18, 'CICE': 6.9},
]
# ---------- Clima diario ----------
normal = [70, 85, 135, 215, 230, 125, 95, 110, 175, 265, 225, 115]
clima = []; x = dt.date(2025, 1, 1); k = 0
while x <= hoy - dt.timedelta(days=1):
    m = x.month - 1; dias = 31; p_dia = min(0.85, normal[m] / 14 / 30 * 1.9)
    seco = (x >= dt.date(2026, 1, 8) and x <= dt.date(2026, 2, 24))
    llueve = R2.random() < (0.07 if seco else p_dia)
    mm = round(R2.expovariate(1 / max(4, normal[m] / (p_dia * 30) if p_dia else 5)), 1) if llueve else 0.0
    if x == dt.date(2026, 2, 26): mm = 31.5
    if x == dt.date(2026, 2, 27): mm = 12.0
    if x >= dt.date(2026, 10, 1) and x <= dt.date(2026, 10, 20) and R2.random() < 0.5: mm = round(mm + R2.uniform(8, 25), 1)
    tmax = round(24.8 + (1.6 if seco else 0) - mm * 0.04 + R2.uniform(-1.4, 1.4), 1); tmin = round(15.2 + R2.uniform(-1.2, 1.0) - (0.8 if seco else 0), 1)
    k += 1; clima.append({'id': 'cl%d' % k, 'fincaId': 'f1', 'fecha': d(x), 'lluvia': mm, 'tmax': tmax, 'tmin': tmin, 'hr': round(min(98, 74 + mm * 0.6 + R2.uniform(-6, 8))), 'fuente': 'estación'})
    x += dt.timedelta(days=1)
# ---------- Terceros, partidas y ventas ----------
terceros = [{'id': 'te1', 'nombre': 'Cooperativa de Caficultores (ejemplo)', 'tipo': 'Cliente', 'nit': '890.000.001-1', 'ciudad': 'San Gil'},
            {'id': 'te2', 'nombre': 'Trilladora Especiales (ejemplo)', 'tipo': 'Cliente', 'nit': '900.000.002-2', 'ciudad': 'Bucaramanga'},
            {'id': 'te3', 'nombre': 'Almacén Agropecuario (ejemplo)', 'tipo': 'Proveedor', 'nit': '800.000.003-3', 'ciudad': 'Ocamonte'},
            {'id': 'te4', 'nombre': 'Banco Agrario (ejemplo)', 'tipo': 'Entidad financiera', 'nit': '800.037.800-8'}]
partidas = []; pid = 0
bs = sorted(benef, key=lambda b: b['fecha']); grupo = []; sem_ant = None
def cerrar(g):
    global pid
    if not g: return
    pid += 1; partidas.append({'id': 'pa%d' % pid, 'codigo': 'P-2026-%03d' % pid, 'fecha': g[-1]['fecha'], 'tipo': 'Pergamino seco', 'proceso': 'Lavado', 'beneficioIds': [b['id'] for b in g], 'kg': None,
        'humedad': round(R2.uniform(10.6, 11.8), 1), 'factor': round(R2.uniform(91.5, 94.5), 1), 'taza': round(R2.choice([82.5, 83.25, 84, 84.75, 85.5]), 2) if pid % 3 == 0 else None, 'fincaId': 'f1'})
for b in bs:
    s_ = dt.date.fromisoformat(b['fecha']).isocalendar()[1]
    if sem_ant is not None and s_ != sem_ant: cerrar(grupo); grupo = []
    grupo.append(b); sem_ant = s_
cerrar(grupo)
disp = {p['id']: sum(b['kgSalida'] for b in benef if b['id'] in p['beneficioIds']) for p in partidas}
ventas = []; vid = 0
for i, p in enumerate(partidas[:-1]):
    if i % 2: continue
    lote_p = [p] + ([partidas[i + 1]] if i + 1 < len(partidas) - 1 else [])
    kg = round(sum(disp[q['id']] for q in lote_p), 1); fecha = d(min(dt.date.fromisoformat(lote_p[-1]['fecha']) + dt.timedelta(days=2), hoy - dt.timedelta(days=1)))
    esp = any(q.get('taza') for q in lote_p); vid += 1
    precio = (2380000 if esp else R2.choice([2210000, 2245000, 2270000, 2295000])) / 125
    credito = vid in (3,) or fecha >= '2026-10-20'
    v = {'id': 'v%d' % vid, 'fecha': fecha, 'terceroId': 'te2' if esp else 'te1', 'comprador': 'Trilladora Especiales (ejemplo)' if esp else 'Cooperativa de Caficultores (ejemplo)', 'kg': kg, 'precio': round(precio, 2),
         'partidas': [{'partidaId': q['id'], 'kg': round(disp[q['id']], 1)} for q in lote_p], 'documento': 'Liquidación %04d' % (310 + vid), 'retencionPct': 0.5, 'retencion': round(kg * precio * 0.005),
         'bonificacion': 45000 if esp else 0, 'descuentos': 0, 'formaPago': 'Crédito' if credito else 'Contado', 'cuenta': 'Banco', 'factor': lote_p[0]['factor']}
    neto = kg * precio + v['bonificacion'] - v['retencion']
    if credito: v['vence'] = d(dt.date.fromisoformat(fecha) + dt.timedelta(days=30)); v['cobros'] = [{'fecha': d(dt.date.fromisoformat(fecha) + dt.timedelta(days=12)), 'valor': round(neto * 0.5), 'cuenta': 'Banco'}] if vid == 3 else []
    else: v['cobros'] = [{'fecha': fecha, 'valor': round(neto), 'cuenta': 'Banco'}]
    ventas.append(v)
# ---------- Pagos semanales a recolectores (sábados), hasta la semana anterior ----------
pagos = []; pgid = 0
sab = dt.date(2026, 8, 22)
while sab <= hoy - dt.timedelta(days=7):
    for t in trab:
        ini_p = (sab - dt.timedelta(days=7)); rs = [r for r in regs if r['trabajadorId'] == t['id'] and d(ini_p) < r['fecha'] <= d(sab)]
        if not rs: continue
        bruto = round(sum(r['kg'] * r['tarifa'] for r in rs)); pgid += 1
        pagos.append({'id': 'pg%d' % pgid, 'trabajadorId': t['id'], 'periodoInicio': d(ini_p), 'periodoFin': d(sab), 'kgTotal': round(sum(r['kg'] for r in rs), 1), 'valorBruto': bruto, 'adelantosDescontados': 0, 'valorNeto': bruto, 'fecha': d(sab), 'motivo': 'Pago semanal'})
    sab += dt.timedelta(days=7)
# ---------- Movimientos 2026 ----------
movimientos = []; mid = 0
def mov(**kw):
    global mid
    mid += 1; m = {'id': 'mv%d' % mid}; m.update(kw); movimientos.append(m)
for mes in range(1, 11):
    f = '2026-%02d-' % mes
    mov(tipo='egreso', fecha=f + '05', concepto='Energía y agua', cuenta='5135', valor=R2.choice([78000, 84000, 91000]), medio='Banco')
    mov(tipo='egreso', fecha=f + '10', concepto='Seguridad social y prestaciones', cuenta='2610', valor=612000, medio='Banco')
    if mes >= 3: mov(tipo='abono', fecha=f + '20', concepto='Cuota crédito de renovación', valor=420000, intereses=round(8000000 * 0.013 * (1 - (mes - 3) / 24)), medio='Banco', terceroId='te4')
    mov(tipo='retiro', fecha=f + '28', concepto='Retiro para gastos personales', valor=1000000, medio='Banco')
mov(tipo='prestamo', fecha='2026-02-15', concepto='Crédito de renovación y marquesina', valor=8000000, medio='Banco', terceroId='te4')
mov(tipo='egreso', fecha='2026-03-15', concepto='Impuesto predial', cuenta='5115', valor=420000, medio='Banco')
mov(tipo='egreso', fecha='2026-07-02', concepto='Herramientas y repuestos de guadaña', cuenta='7315', valor=360000, medio='Caja', terceroId='te3')
mov(tipo='egreso', fecha='2026-09-08', concepto='Lonas y costales para la cosecha', cuenta='7395', valor=240000, medio='Caja', terceroId='te3')
mov(tipo='egreso', fecha='2026-10-03', concepto='Gas y energía del beneficiadero', cuenta='7320', valor=185000, medio='Caja')
mov(tipo='egreso', fecha='2026-10-12', concepto='Fungicida para roya', cuenta='7105', valor=310000, medio='Crédito', vence='2026-11-12', terceroId='te3', loteId='l2', pagos=[])
mov(tipo='egreso', fecha='2026-06-20', concepto='Honorarios del contador', cuenta='5135', valor=350000, medio='Banco')
mov(tipo='inversion', fecha='2026-03-01', concepto='Tanque tina de fermentación', cuenta='1520', valor=1800000, medio='Banco', vida=8)
activos.append({'id': 'act-mv', 'movId': 'mv%d' % mid, 'nombre': 'Tanque tina de fermentación', 'categoria': 'Maquinaria', 'fecha': '2026-03-01', 'costo': 1800000, 'vidaUtil': 8, 'valorResidual': 0})
mov(tipo='ingreso', fecha='2026-05-30', concepto='Venta de pasilla', cuenta='4295', valor=380000, medio='Caja')
disenos = [
  {'id': 'ds1', 'nombre': 'Tradicional 2 × 1,5 m', 'variedad': 'Castillo', 'distSurcos': 2, 'distPlantas': 1.5, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 6, 'inicio': 'siembra'},
  {'id': 'ds2', 'nombre': 'Alta densidad 1,5 × 1 m', 'variedad': 'Castillo', 'distSurcos': 1.5, 'distPlantas': 1, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 5, 'inicio': 'siembra'},
  {'id': 'ds3', 'nombre': 'Muy alta densidad 1,4 × 0,8 m', 'variedad': 'Cenicafé 1', 'distSurcos': 1.4, 'distPlantas': 0.8, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 4, 'inicio': 'siembra'},
  {'id': 'ds4', 'nombre': 'Caturra 1,5 × 1 m sin control de roya', 'variedad': 'Caturra', 'distSurcos': 1.5, 'distPlantas': 1, 'arreglo': 'Rectangular', 'plantasSitio': 1, 'area': 1, 'ciclo': 5, 'inicio': 'siembra', 'controlRoya': False},
]
demo.update({'pagos': pagos, 'fincas': fincas, 'lotes': lotes, 'suelos': suelos, 'clima': clima, 'terceros': terceros, 'partidas': partidas, 'ventas': ventas, 'movimientos': movimientos, 'disenos': disenos, 'activos': activos, 'planesAgro': [],
  'climaConfig': {'normales': {'f1': normal}, 'cosecha': {'principal': [9, 10, 11, 12], 'mitaca': [4, 5]}, 'balance': {'cad': 120, 'kc': 0.95, 'lat': 6.34, 'umbralSeco': 2, 'diasSecos': 12, 'lluviaDisparo': 12, 'diasAFlor': 10}},
  'contaConfig': {'fechaInicio': '2026-01-01', 'saldos': {'caja': 2200000, 'bancos': 39500000, 'terrenos': 180000000, 'construcciones': 62000000, 'plantaciones': 26000000, 'insumos': 0}, 'factorPrestacional': 0.35, 'retencionVentaPct': 0.5},
  'presupuestos': {}, 'cuentasExtra': []})
