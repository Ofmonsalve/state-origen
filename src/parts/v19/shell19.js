/* ---- v19: integración con la navegación, Registrar, Más, paleta de comandos y alertas de Hoy ---- */
['renderSueloClima', 'renderDisenos', 'renderAgronomia', 'renderComercial'].forEach(n => { if (typeof window[n] !== 'function') window[n] = function () {}; });
window.abrirRegistrar = function () {
  hojaAcciones('Registrar', [
    { ic: 'i-cosecha', t: 'Cosecha del día', s: 'Kilos y horas por recolector', fn: openWizard },
    { ic: 'i-venta', t: 'Venta de café', s: 'Con su partida, comprador y forma de pago', fn: () => { ir('comercial'); abrirVenta(); } },
    { ic: 'i-cuentas', t: 'Compra o gasto', s: 'Insumos, servicios, impuestos y pagos', fn: () => { ir('finanzas'); abrirMovimiento(); } },
    { ic: 'i-orden', t: 'Orden de trabajo', s: 'Programar una labor con presupuesto', fn: () => abrirNuevaOT() },
    { ic: 'i-labor', t: 'Labor agronómica', s: 'Gasto de una labor sin orden', fn: irLabores },
    { ic: 'i-mapa', t: 'Muestreo de lote', s: 'Broca, roya, sanidad, nutrición, floración o frutos', fn: () => { ir('mapa'); abrirRegistroMuestreo(); } },
    { ic: 'i-lluvia', t: 'Lluvia y temperatura', s: 'Lectura del pluviómetro', fn: () => { ir('suelo'); scSt.tab = 'clima'; renderSueloClima(); abrirRegistroClima(); } },
    { ic: 'i-suelo', t: 'Análisis de suelo', s: 'Resultado del laboratorio por lote', fn: () => { scSt.tab = 'suelo'; ir('suelo'); abrirAnalisisSuelo(); } },
    { ic: 'i-oper', t: 'Beneficio', s: 'Cereza que entra y pergamino que sale', fn: () => { ir('operacion'); showOp('beneficio'); } },
    { ic: 'i-personal', t: 'Recolector', s: 'Persona nueva con su tarifa', fn: () => { ir('personal'); setTimeout(() => { const e = document.getElementById('nt-nombre'); e && e.focus(); }, 60); } },
  ]);
};
window.abrirMas = function () {
  hojaAcciones('Más módulos', [
    { ic: 'i-tablero', t: 'Tablero', s: VISTAS.tablero.s, fn: () => ir('tablero') },
    { ic: 'i-mapa', t: 'Maqueta y muestreos', s: VISTAS.mapa.s, fn: () => ir('mapa') },
    { ic: 'i-calendario', t: 'Plan agronómico', s: VISTAS.agronomia.s, fn: () => ir('agronomia') },
    { ic: 'i-suelo', t: 'Suelo y clima', s: VISTAS.suelo.s, fn: () => ir('suelo') },
    { ic: 'i-diseno', t: 'Diseño de cultivo', s: VISTAS.disenos.s, fn: () => ir('disenos') },
    { ic: 'i-oper', t: 'Operación', s: VISTAS.operacion.s, fn: () => ir('operacion') },
    { ic: 'i-venta', t: 'Ventas y trazabilidad', s: VISTAS.comercial.s, fn: () => ir('comercial') },
    { ic: 'i-finanzas', t: 'Contabilidad y finanzas', s: VISTAS.finanzas.s, fn: () => ir('finanzas') },
    { ic: 'i-personal', t: 'Personal', s: VISTAS.personal.s, fn: () => ir('personal') },
    { ic: 'i-analisis', t: 'Análisis', s: VISTAS.analisis.s, fn: () => ir('analisis') },
    { ic: 'i-finca', t: 'Finca y lotes', s: VISTAS.gestion.s, fn: () => ir('gestion') },
    { ic: 'i-buscar', t: 'Buscar o ejecutar', s: 'Órdenes, lotes, ventas, personas y acciones', fn: abrirComandos },
    { ic: 'i-tema', t: 'Cambiar tema', s: 'Claro u oscuro', fn: cambiarTema },
  ]);
};
(function () {
  const base = catalogoComandos; const ICV = { suelo: 'i-suelo', disenos: 'i-diseno', agronomia: 'i-calendario', comercial: 'i-venta', finanzas: 'i-finanzas' };
  window.catalogoComandos = function () {
    const L = base(); L.forEach(x => { if (!x.ic) { const k = Object.keys(VISTAS).find(v => VISTAS[v].t === x.t); x.ic = ICV[k] || 'i-ir'; } });
    const acc = (t, s, fn, ic) => L.push({ sec: 'Acciones', t, s, fn, ic });
    acc('Registrar venta', 'Partida, comprador y cobro', () => { ir('comercial'); abrirVenta(); }, 'i-venta');
    acc('Crear partida de café', 'Agrupar beneficios para vender con trazabilidad', () => { ir('comercial'); abrirPartida(); }, 'i-venta');
    acc('Registrar compra o gasto', 'Insumos, servicios, impuestos', () => { ir('finanzas'); abrirMovimiento(); }, 'i-cuentas');
    acc('Estados financieros', 'Resultados y balance general', () => { finSt.tab = 'estados'; ir('finanzas'); }, 'i-finanzas');
    acc('Flujo de caja y proyección', 'Próximos 6 meses', () => { finSt.tab = 'flujo'; ir('finanzas'); }, 'i-finanzas');
    acc('Libro diario', 'Asientos contables', () => { finSt.tab = 'libros'; finSt.libro = 'diario'; ir('finanzas'); }, 'i-cuentas');
    acc('Información para renta', 'Patrimonio, ingresos, costos y retenciones', () => { finSt.tab = 'renta'; ir('finanzas'); }, 'i-cuentas');
    acc('Generar plan agronómico del año', 'Con ciclo, suelo y edad de los lotes', () => { ir('agronomia'); abrirGenerarPlan(); }, 'i-calendario');
    acc('Registrar lluvia', 'Pluviómetro y temperatura', () => { scSt.tab = 'clima'; ir('suelo'); abrirRegistroClima(); }, 'i-lluvia');
    acc('Registrar análisis de suelo', 'Laboratorio por lote', () => { scSt.tab = 'suelo'; ir('suelo'); abrirAnalisisSuelo(); }, 'i-suelo');
    acc('Comparar diseños de siembra', 'VPN, TIR y producción', () => ir('disenos'), 'i-diseno');
    acc('Importar mapa de la finca', 'KML, GeoJSON o GPX', () => { ir('mapa'); mapaModo('finca'); abrirImportarMapa(); }, 'i-mapa');
    acc('Vista 3D del relieve', 'Maqueta de la finca', () => { ir('mapa'); mapaModo('3d'); }, 'i-mapa');
    ventas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30).forEach(v => L.push({ sec: 'Ventas', t: 'Venta ' + fechaCorta(v.fecha) + ' · ' + terceroNombre(v.terceroId, v.comprador), s: num(Math.round(n0(v.kg))) + ' kg · ' + fmt(valorVenta(v).neto), fn: () => { coSt.tab = 'traza'; coSt.trazaVenta = v.id; coSt.trazaPartida = null; ir('comercial'); }, ic: 'i-venta' }));
    partidas.forEach(p => L.push({ sec: 'Ventas', t: 'Partida ' + p.codigo, s: num(Math.round(kgPartida(p))) + ' kg · disponible ' + num(Math.round(disponiblePartida(p))), fn: () => { coSt.tab = 'traza'; coSt.trazaPartida = p.id; coSt.trazaVenta = null; ir('comercial'); }, ic: 'i-venta' }));
    terceros.forEach(t => L.push({ sec: 'Personas', t: t.nombre, s: t.tipo || 'Tercero', fn: () => { coSt.tab = 'terceros'; ir('comercial'); }, ic: 'i-personal' }));
    return L;
  };
  const alBase = alertasActuales;
  window.alertasActuales = function () {
    const out = alBase(); const hoyS = hoyLocal();
    try { fincasActivas().forEach(f => alertasClima(f.id).forEach(a => out.push({ sev: a.t === 'mal' ? 'danger' : 'warn', html: '<b>' + esc(f.nombre) + ':</b> ' + esc(a.txt), fn: "scSt.tab='clima';ir('suelo')", cta: 'Ver clima' }))); } catch (e) {}
    try { const venc = planesAgro.filter(a => a.anio === Number(hoyS.slice(0, 4)) && grupoDe(a.tipo) !== 'cosecha' && grupoDe(a.tipo) !== 'monitoreo' && estadoActividad(a).e === 'Vencida');
      if (venc.length) out.push({ sev: 'warn', html: `<b>${venc.length} actividad(es) del plan agronómico vencidas</b> sin ejecutar (${esc([...new Set(venc.map(a => abrevLabor(a.tipo)))].slice(0, 3).join(', '))}).`, fn: "agSt.vista='mensual';ir('agronomia')", cta: 'Revisar' });
      const pendMes = planesAgro.filter(a => a.anio === Number(hoyS.slice(0, 4)) && a.mes === Number(hoyS.slice(5, 7)) && !a.otId && grupoDe(a.tipo) !== 'cosecha' && grupoDe(a.tipo) !== 'monitoreo' && estadoActividad(a).e === 'Planeada');
      if (pendMes.length) out.push({ sev: 'info', html: `<b>${pendMes.length} actividad(es) del plan de este mes</b> todavía sin orden de trabajo.`, fn: "agSt.vista='mensual';agSt.mes=" + Number(hoyS.slice(5, 7)) + ";ir('agronomia')", cta: 'Generar órdenes' }); } catch (e) {}
    try { const c = cartera(hoyS); const vencidas = c.cxc.filter(x => x.dias > 0); if (vencidas.length) out.push({ sev: 'warn', html: `<b>${fmt(vencidas.reduce((s, x) => s + x.saldo, 0))} por cobrar vencidos</b> a ${esc([...new Set(vencidas.map(x => x.tercero))].join(', '))}.`, fn: "finSt.tab='cartera';ir('finanzas')", cta: 'Cobrar' });
      const porVencer = c.cxp.filter(x => x.dias >= -7); if (porVencer.length) out.push({ sev: 'info', html: `<b>${fmt(porVencer.reduce((s, x) => s + x.saldo, 0))} por pagar a proveedores</b> vence esta semana o ya venció.`, fn: "finSt.tab='cartera';ir('finanzas')", cta: 'Ver' }); } catch (e) {}
    try { const lib = beneficiosLibres(); if (lib.length >= 3) out.push({ sev: 'info', html: `<b>${lib.length} beneficios sin partida</b> (${num(Math.round(lib.reduce((s, b) => s + n0(b.kgSalida), 0)))} kg). Agrúpelos para vender con trazabilidad exacta.`, fn: "coSt.tab='partidas';ir('comercial')", cta: 'Crear partidas' }); } catch (e) {}
    return out;
  };
})();
