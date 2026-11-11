/* ================= v34 · La historia del café como parte central de la trazabilidad: relato escrito con los datos, galería de historias, la historia dentro del certificado de trazabilidad y en Reportes ================= */
const f34 = d => { try { return fechaLarga(d); } catch (e) { return d; } };
const lista34 = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
/* El relato: solo afirma lo que está registrado; lo estimado se dice como estimado */
function relato34(H) { const R = []; const { f, T, O, pt, pa } = H, C = H.clima, cu = H.cultivo || {}, S = H.suelo, B = H.beneficio || {}, cat = O && O.cat; const add = (t, ps) => { const p = ps.filter(Boolean).join(' '); if (p) R.push({ t, p }); };
  const lugar = [f.vereda && 'la vereda ' + f.vereda, f.municipio, f.departamento].filter(Boolean).join(', '); const vars = (cu.variedades || []);
  add('El origen', [
    'Este café nació en la finca ' + (f.nombre || '') + (lugar ? ', en ' + lugar : '') + (cu.alt ? ', a ' + num(Math.round(cu.alt)) + ' metros sobre el nivel del mar' : '') + '.',
    H.l ? 'Viene del ' + (/^lote/i.test(H.l.nombre) ? H.l.nombre : 'lote ' + H.l.nombre) + (cu.ha ? ', de ' + gr32(cu.ha, 2) + (n0(cu.ha) === 1 ? ' hectárea' : ' hectáreas') : '') + (vars.length ? ', sembrado con ' + lista34(vars) : '') + (cu.siembra ? ' el ' + f34(cu.siembra) : '') + '.' : '',
    cu.edad != null ? 'Cuando se recogió esta cosecha los árboles tenían ' + gr32(cu.edad) + ' años' + (cu.sitios ? ' y el lote contaba ' + num(cu.sitios) + ' plantas' + (cu.ds ? ', trazadas a ' + num(cu.ds) + ' por ' + num(cu.dp) + ' metros' : '') : '') + '.' : '']);
  if (S) { const niv = k => nivelSuelo32(k, S[k]); const nm = r => (r[0] === 'pH' || r[0] === 'CICE') ? r[1] : r[1].toLowerCase(); const bajos = REF_SUELO32.filter(r => niv(r[0]) === 'bajo').map(nm), bien = REF_SUELO32.filter(r => niv(r[0]) === 'adecuado').map(nm);
    add('El suelo', [
      'La tierra donde creció es ' + (S.textura ? 'de textura ' + String(S.textura).toLowerCase() : 'la del análisis') + (S.pH != null && S.pH !== '' ? ', con un pH de ' + num(S.pH) : '') + (S.MO != null && S.MO !== '' ? ' y ' + num(S.MO) + ' % de materia orgánica' : '') + ', según el análisis del ' + f34(S.fecha) + '.',
      bien.length ? 'Frente a los intervalos de referencia para café, están en nivel adecuado ' + lista34(bien.slice(0, 5)) + '.' : '',
      bajos.length ? 'Por debajo del intervalo están ' + lista34(bajos.slice(0, 5)) + ', y con ese diagnóstico se planeó la fertilización.' : '']); }
  if (H.flor) add('La floración', [
    (H.flor.estimada ? 'No hay un registro de la floración; se estima que ocurrió hacia el ' : 'El lote floreció el ') + f34(H.flor.fecha) + (H.flor.intensidad ? ', con intensidad ' + String(H.flor.intensidad).toLowerCase() : '') + '.',
    H.diasFlor != null ? 'Desde la flor hasta la primera recolección pasaron ' + num(H.diasFlor) + ' días: ese es el tiempo que el grano tuvo para formarse y madurar.' : '']);
  if (C) add('El clima que vivió el grano', [
    'En esos ' + num(C.dias) + ' días' + (C.cobertura < 99 ? ' (con mediciones en ' + num(C.n) + ')' : '') + ' cayeron ' + num(Math.round(C.lluvia)) + ' milímetros de lluvia, repartidos en ' + num(C.diasLluvia) + ' días lluviosos.',
    C.tmed != null ? 'La temperatura media fue de ' + gr32(C.tmed) + ' °C.' : '',
    C.tmaxAbs ? 'El día más caliente fue el ' + f34(C.tmaxAbs.fecha) + ', con ' + gr32(n0(C.tmaxAbs.tmax)) + ' °C' + (C.tminAbs ? ', y la noche más fría la del ' + f34(C.tminAbs.fecha) + ', con ' + gr32(n0(C.tminAbs.tmin)) + ' °C' : '') + '.' : '',
    C.amplitud != null ? 'Entre el día y la noche la temperatura cambió en promedio ' + gr32(C.amplitud) + ' °C.' : '',
    C.rachaSeca >= 5 ? 'El periodo seco más largo duró ' + num(C.rachaSeca) + ' días' + (C.rachaFin ? ' y terminó el ' + f34(C.rachaFin) : '') + '.' : '',
    C.gdd ? 'En total el grano acumuló ' + num(Math.round(C.gdd)) + ' grados-día sobre 10 °C.' : '']);
  if (T && T.kgCereza) add('La cosecha', [
    'Se recogió a mano' + (H.ini ? (H.fin && H.fin !== H.ini ? ' entre el ' + f34(H.ini) + ' y el ' + f34(H.fin) : ' el ' + f34(H.ini)) : '') + ': ' + num(Math.round(T.kgCereza)) + ' kilos de cereza' + (T.recolectores.length ? ' en manos de ' + num(T.recolectores.length) + ' recolectores' : '') + (T.jornadas ? ', en ' + num(T.jornadas) + ' jornadas' : '') + '.',
    H.L && H.L.lab && H.L.lab.length ? 'En los meses previos el lote recibió ' + num(H.L.lab.length) + ' labores registradas, entre ellas ' + lista34([...new Set(H.L.lab.map(x => String(x.tipo || '').toLowerCase()).filter(Boolean))].slice(0, 3)) + '.' : '']);
  if (B.sal) add('El beneficio', [
    'La cereza se procesó por el método ' + (lista34((B.metodos || []).map(m => String(m).toLowerCase())) || 'registrado en la finca') + (B.ferm && B.ferm.length ? ', con ' + gr32(media32(B.ferm), 0) + ' horas de fermentación' : '') + (B.secado && B.secado.length ? ' y secado en ' + lista34(B.secado.map(s => String(s).toLowerCase())) : '') + '.',
    'De ' + num(Math.round(B.ent)) + ' kilos de cereza salieron ' + num(Math.round(B.sal)) + ' kilos de pergamino seco' + (B.rel ? ': ' + gr32(B.rel, 2) + ' kilos de cereza por cada kilo de pergamino' : '') + '.',
    B.humedad ? 'El lote se guardó con ' + num(B.humedad) + ' % de humedad' + (B.factor ? ' y factor de rendimiento ' + num(B.factor) : '') + '.' : '']);
  if (O && (O.tr || O.t || cat)) add('De la trilla a la taza', [
    O.tr ? 'En la trilla del ' + f34(O.tr.fecha) + ' se obtuvieron ' + num(redondear(O.tr.kgExcelso, 1)) + ' kilos de café excelso' + (O.tr.calidad ? ' de calidad ' + O.tr.calidad : '') + '.' : '',
    O.t ? 'Se tostó el ' + f34(O.t.fecha) + ': ' + num(redondear(O.t.kgVerde, 1)) + ' kilos de café verde dieron ' + num(redondear(O.t.kgTostado, 1)) + ' kilos tostados.' : '',
    cat ? 'En la catación del ' + f34(cat.fecha) + ' obtuvo ' + gr32(puntajeSCA(cat), 2) + ' puntos en la escala SCA' + (cat.catador ? ', evaluado por ' + cat.catador : '') + '.' : '',
    cat && cat.notas ? 'En taza: ' + String(cat.notas).replace(/\.$/, '') + '.' : '',
    pt ? 'El ' + f34(pt.fecha) + ' se empacaron ' + num(pt.unidades) + ' unidades con el código ' + pt.codigo + '.' : '']);
  if (H.diasTotal) add('En resumen', ['De la siembra al último paso registrado hay ' + num(H.diasTotal) + ' días de historia y ' + num(H.eventos.length) + ' hitos con fecha. Cada cifra de este relato sale de los registros de la finca y puede verificarse con el código ' + H.codigo + '.']);
  return R; }
const textoRelato34 = H => ['LA HISTORIA DE ESTE CAFÉ · ' + H.nombre + ' (' + H.codigo + ')'].concat(relato34(H).map(r => r.t.toUpperCase() + '\n' + r.p)).join('\n\n');
function copiarRelato34(tipo, id) { const H = datosHistoria32(tipo, id); if (!H) return; const t = textoRelato34(H); const fin = () => toast('Relato copiado: péguelo donde lo necesite.', 'ok'); try { navigator.clipboard.writeText(t).then(fin, () => verTexto32(t)); } catch (e) { verTexto32(t); } }

/* La ventana de la historia abre con el relato */
const _historia34 = historia32; historia32 = function (tipo, id) { _historia34.apply(this, arguments); try { const box = document.getElementById('modal-box'); const hero = box && box.querySelector('.h32-hero'); if (!hero || box.querySelector('.h34-rel')) return; const H = datosHistoria32(tipo, id); const R = relato34(H); if (!R.length) return;
  hero.insertAdjacentHTML('afterend', `<div class="h34-rel"><div class="h34-rel-c"><span class="h34-k">El relato</span><button class="link" onclick="copiarRelato34('${esc(tipo)}','${esc(id)}')">Copiar el relato</button></div>${R.map((r, i) => `<p${i === 0 ? ' class="h34-p1"' : ''}><b>${esc(r.t)}.</b> ${esc(r.p)}</p>`).join('')}<div class="h34-nota">Escrito a partir de los registros de la finca. Abajo, los datos que lo respaldan.</div></div>`); } catch (e) { if (typeof dlog === 'function') dlog('✗ relato: ' + e.message, 'err'); } };

/* El relato y la ciencia de datos en PDF */
function relatoPDF34(R, H) { const rel = relato34(H); if (!rel.length) return; R.seccion(0, 'La historia de este café', 'Relato escrito con los registros de la finca: cada cifra se respalda en las secciones siguientes.'); rel.forEach(r => { R.asegurar(22); R.subtitulo(r.t); R.y += 0.5; R.parrafo(r.p, { tam: 9.4 }); R.y += 1.5; }); }
function cienciaPDF34(R, H, n) { const C = H.clima, S = H.suelo;
  if (S) { R.seccion(n++, 'El suelo del café', 'Análisis del ' + fechaPDF(S.fecha) + (S.laboratorio ? ' · ' + S.laboratorio : '') + ', frente a los intervalos de referencia para café.');
    R.tabla({ cols: [{ t: 'Parámetro', w: 1.6 }, { t: 'Valor', a: 'right' }, { t: 'Unidad' }, { t: 'Intervalo adecuado', a: 'right', w: 1.3 }, { t: 'Interpretación', w: 1.2 }], fs: 8, comparar: false,
      filas: [['Textura', S.textura || '—', '', '', '']].concat(REF_SUELO32.filter(r => S[r[0]] != null && S[r[0]] !== '').map(r => { const nv = nivelSuelo32(r[0], S[r[0]]); return [r[1], num(S[r[0]]), r[2], num(r[3]) + ' – ' + num(r[4]), nv ? { t: nv, chip: nv === 'adecuado' ? 'ok' : 'alerta' } : '']; })) }); }
  if (H.flor || C) { R.seccion(n++, 'Floración y clima del grano', C ? 'Del ' + fechaPDF(C.desde) + ' al ' + fechaPDF(C.hasta) + ' · ' + num(C.n) + ' días medidos' : 'Sin registros de clima en el periodo.');
    if (H.flor) R.kv([['Floración', fechaPDF(H.flor.fecha) + (H.flor.estimada ? ' (estimada)' : ''), true], ['Fuente', H.flor.fuente], ['Días de flor a cosecha', num(H.diasFlor)], ['Grados-día (base 10 °C)', C ? num(Math.round(C.gdd)) : '—']], 2);
    if (C) { const fd = x => x ? fechaPDF(x.fecha) : ''; R.tabla({ cols: [{ t: 'Variable', w: 1.8 }, { t: 'Valor', a: 'right' }, { t: 'Detalle', w: 2.2 }], fs: 8, comparar: false, filas: [
        ['Temperatura media', C.tmed != null ? gr32(C.tmed) + ' °C' : '—', C.tDesv != null ? 'variación diaria ± ' + gr32(C.tDesv) + ' °C' : ''],
        ['Máxima absoluta', C.tmaxAbs ? gr32(n0(C.tmaxAbs.tmax)) + ' °C' : '—', fd(C.tmaxAbs)], ['Mínima absoluta', C.tminAbs ? gr32(n0(C.tminAbs.tmin)) + ' °C' : '—', fd(C.tminAbs)],
        ['Media de las máximas', C.tmaxMed != null ? gr32(C.tmaxMed) + ' °C' : '—', num(C.diasCalor) + ' días sobre 30 °C'], ['Media de las mínimas', C.tminMed != null ? gr32(C.tminMed) + ' °C' : '—', num(C.diasFrio) + ' días bajo 13 °C'],
        ['Amplitud térmica diaria', C.amplitud != null ? gr32(C.amplitud) + ' °C' : '—', 'máxima ' + gr32(C.amplitudMax) + ' °C'], ['Lluvia acumulada', num(Math.round(C.lluvia)) + ' mm', num(C.diasLluvia) + ' días con lluvia'],
        ['Día más lluvioso', C.lluviaMax ? num(Math.round(n0(C.lluviaMax.lluvia))) + ' mm' : '—', fd(C.lluviaMax)], ['Periodo seco más largo', num(C.rachaSeca) + ' días', C.rachaFin ? 'hasta ' + fechaPDF(C.rachaFin) : ''],
        ['Humedad relativa media', C.hrMed != null ? gr32(C.hrMed, 0) + ' %' : '—', C.hrMin && C.hrMax ? 'entre ' + gr32(n0(C.hrMin.hr), 0) + ' y ' + gr32(n0(C.hrMax.hr), 0) + ' %' : '']] });
      if (C.meses.length > 1) R.barras({ cats: C.meses.map(m => MESES[+m.ym.slice(5) - 1]), series: [{ nombre: 'Lluvia (mm)', vals: C.meses.map(m => m.lluvia), color: PDFC.serie[0] }], fmt: v => num(Math.round(v)), alto: 42, titulo: 'Lluvia por mes durante la formación del grano' }); } }
  if (H.eventos && H.eventos.length) { R.seccion(n++, 'Línea de tiempo', H.diasTotal ? num(H.diasTotal) + ' días de historia, de la siembra al último paso registrado.' : '');
    R.tabla({ cols: [{ t: 'Fecha', w: 0.9 }, { t: 'Hito', w: 1.5 }, { t: 'Detalle', w: 3 }, { t: 'Días', a: 'right', w: 0.6 }], fs: 7.8, comparar: false, filas: H.eventos.map(e => [fechaPDF(e.f), { t: e.t, b: true }, e.d || '', e.dias ? '+' + num(e.dias) : '']) }); }
  return n; }
/* Dentro del certificado de trazabilidad: la historia completa del lote comercial vendido */
function historiaEnCertificado34(R, o) { const pid = ((o.partes || [])[0] || {}).partida; if (!pid || !pid.id) return; const H = datosHistoria32('partida', pid.id); if (!H) return; relatoPDF34(R, H); cienciaPDF34(R, H, 4); }

/* La ficha antigua de trazabilidad se reemplaza por los documentos nuevos */
if (typeof fichaTrazaPDF === 'function') { const _ficha34 = fichaTrazaPDF; fichaTrazaPDF = function () { try { if (coSt.trazaVenta && ventas.find(v => v.id === coSt.trazaVenta)) return repTraza({ venta: coSt.trazaVenta }); if (coSt.trazaPartida && partidas.find(p => p.id === coSt.trazaPartida)) return pasaporte32('partida', coSt.trazaPartida); } catch (e) {} return _ficha34.apply(this, arguments); }; }

/* ---------- Galería: todas las historias, siempre a la vista ---------- */
function historias34() { const L = []; (TZ.lotesPT || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).forEach(p => { let nom = 'Café empacado'; try { nom = (infoLotePT(p).sku || {}).nombre || nom; } catch (e) {} let sca = null; try { const O = origenLote26(p); sca = O && O.cat ? puntajeSCA(O.cat) : null; } catch (e) {} L.push({ tipo: 'pt', id: p.id, cod: p.codigo, nom, fecha: p.fecha, et: 'Producto empacado', sca }); });
  partidas.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).forEach(p => L.push({ tipo: 'partida', id: p.id, cod: p.codigo, nom: (p.tipo || 'Café pergamino') + (p.proceso ? ' · ' + p.proceso : ''), fecha: p.fecha, et: 'Lote comercial', sca: p.taza ? n0(p.taza) : null })); return L; }
function galeria34(max) { const L = historias34(); if (!L.length) return `<div class="card h34-g"><div class="title">La historia de cada café <span class="sub">de la siembra a la taza</span></div><p class="hint" style="margin:0">Aún no hay lotes comerciales ni producto empacado. Cuando registre el beneficio y arme su primer lote comercial, aquí aparece su historia: suelo, floración, clima del grano, cosecha, beneficio y taza.</p></div>`;
  const V = max ? L.slice(0, max) : L; return `<div class="card h34-g"><div class="title">La historia de cada café <span class="sub">${L.length} ${L.length === 1 ? 'historia' : 'historias'} · de la siembra a la taza</span></div>
    <div class="h34-gr">${V.map(x => `<button class="h34-c" onclick="historia32('${x.tipo}','${esc(x.id)}')"><span class="h34-e">${x.et}</span><b>${esc(x.nom)}</b><i>${esc(x.cod || '')}</i><span class="h34-m">${x.fecha ? fechaCorta(x.fecha) : ''}${x.sca ? ' · ' + gr32(x.sca, 2) + ' pts SCA' : ''}</span><span class="h34-v">Ver la historia ›</span></button>`).join('')}</div>
    ${max && L.length > max ? `<button class="link" style="margin-top:10px" onclick="todasHistorias34()">Ver las ${L.length} historias</button>` : ''}</div>`; }
function todasHistorias34() { openModal(`<h3>La historia de cada café</h3><p class="hint">Elija un café para ver su historia completa, del suelo y la floración hasta la taza.</p>${galeria34().replace('class="card h34-g"', 'class="h34-g"').replace(/<div class="title">.*?<\/div>/, '')}<div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`); }
const _renderComercial34 = renderComercial; renderComercial = function () { _renderComercial34.apply(this, arguments); try { const host = document.getElementById('co-cuerpo'); if (!host || coSt.tab !== 'traza' || host.querySelector('.h34-g')) return; host.insertAdjacentHTML('afterbegin', galeria34(6)); } catch (e) {} };
const _renderTaza34 = renderTaza; renderTaza = function () { _renderTaza34.apply(this, arguments); try { const root = document.getElementById('tz-root'); if (!root || root.querySelector('.h34-g') || !historias34().length) return; root.insertAdjacentHTML('beforeend', galeria34(6)); } catch (e) {} };
/* En Reportes: el pasaporte del café más reciente */
function repHistoria34() { const L = historias34(); if (!L.length) { toast('Aún no hay lotes comerciales ni producto empacado para contar su historia.', 'err'); return; } pasaporte32(L[0].tipo, L[0].id); }
if (typeof REPORTES !== 'undefined') REPORTES.push({ id: 'historia', cat: 'Comercial', t: 'La historia del café (pasaporte)', d: 'El relato del café más reciente y los datos que lo respaldan: origen, suelo, floración, clima del grano con máximas y mínimas, cosecha, beneficio, taza y línea de tiempo. Las demás historias están en Ventas y trazabilidad.', fn: repHistoria34, ic: 'i-venta', pag: '6–7' });
