# Ajustes v22 sobre el HTML v21 (s y rep disponibles)
rep("const APP_VERSION = '21.0';", "const APP_VERSION = '22.0';")
# Contabilidad: anticipos, préstamos y pagos con cuotas, descuentos y bonificaciones
rep("  adelantos.forEach(a => asiento(a.fecha, 'Adelanto', 'Adelanto a ' + nombreTrabajador(a.trabajadorId), [['1330', n0(a.valor), 0], ['1105', 0, n0(a.valor)]], { tercero: a.trabajadorId }));",
    "  adelantos.forEach(a => asientoMovPersonal22(a, asiento));")
rep("  pagos.forEach(p => asiento(p.fecha, 'Pago a recolector', 'Pago a ' + nombreTrabajador(p.trabajadorId) + ' · ' + num(p.kgTotal) + ' kg', [['2505', n0(p.valorBruto), 0], ['1330', 0, n0(p.adelantosDescontados)], ['1105', 0, n0(p.valorNeto)]], { tercero: p.trabajadorId }));",
    "  pagos.forEach(p => asientoPago22(p, asiento));")
# Recolector: cédula (forma parte de su código)
rep("trabajador: { titulo:'recolector', lista:() => trabajadores, campos:[['nombre','Nombre','text',1],['telefono','Teléfono'],['tarifaPorKg','Tarifa por kg ($)','number']] }",
    "trabajador: { titulo:'recolector', lista:() => trabajadores, campos:[['nombre','Nombre','text',1],['documento','Cédula'],['telefono','Teléfono'],['tarifaPorKg','Tarifa por kg ($)','number']] }")
rep('          <input id="nt-telefono" placeholder="Teléfono (opcional)">', '          <input id="nt-documento" placeholder="Cédula (para su código)">\n          <input id="nt-telefono" placeholder="Teléfono (opcional)">')
rep("    trabajadores.push({ id: uid('t'), nombre, telefono, tarifaPorKg: tarifa });", "    const documento = ((document.getElementById('nt-documento') || {}).value || '').trim(); trabajadores.push({ id: uid('t'), nombre, documento, telefono, tarifaPorKg: tarifa }); const _nd = document.getElementById('nt-documento'); if (_nd) _nd.value = '';")
# Subtítulo de la vista
rep("panel:      { t:'Cosecha',        s:'Registro diario de recolección, forma de pago, liquidación y beneficio de cada pasada' },", "panel:      { t:'Cosecha',        s:'Pesadas con código, pases, productividad, liquidación semanal, baches y lotes comerciales' },")
# Comercial: «partida» pasa a llamarse lote comercial, como en el Excel v13
rep("['partidas', 'Partidas y bodega']", "['partidas', 'Lotes comerciales y bodega']")
rep('onclick="abrirPartida()">+ Partida</button>', 'onclick="abrirPartida()">+ Lote comercial</button>')
rep("kpi19('Partidas abiertas'", "kpi19('Lotes comerciales abiertos'")
rep("beneficiosLibres().length + ' beneficios sin partida'", "beneficiosLibres().length + ' bache(s) sin lote comercial'")
