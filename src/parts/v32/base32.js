/* ================= v32 · Base: códigos QR, fotos (personas, evidencias, plantas), avatares y datos nuevos ================= */
const X32 = () => { if (!planConfig.x32) planConfig.x32 = {}; const x = planConfig.x32; x.wa = x.wa || {}; x.diag = x.diag || []; return x; };

/* ---------- QR ---------- */
function qrMatriz32(txt) { try { const q = qrcode32(0, 'M'); q.addData(String(txt), 'Byte'); q.make(); const n = q.getModuleCount(); return { n, d: (r, c) => q.isDark(r, c) }; } catch (e) { return null; } }
function qrSVG32(txt, px, color) { const m = qrMatriz32(txt); if (!m) return ''; let p = ''; for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.d(r, c)) p += `M${c + 2} ${r + 2}h1v1h-1z`;
  return `<svg class="qr32" viewBox="0 0 ${m.n + 4} ${m.n + 4}" width="${px || 160}" height="${px || 160}" role="img" aria-label="Código QR" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="${color || '#111'}"/></svg>`; }
function qrPDF32(doc, txt, x, y, lado) { const m = qrMatriz32(txt); if (!m) return; const u = lado / (m.n + 2); doc.setFillColor(255, 255, 255); doc.rect(x, y, lado, lado, 'F'); doc.setFillColor(20, 20, 22); for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.d(r, c)) doc.rect(x + (c + 1) * u, y + (r + 1) * u, u + 0.02, u + 0.02, 'F'); }
const sinTildes32 = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- Fotos: cada imagen en su propio documento (no carga el resto de los datos) ---------- */
const IMG32 = new Map();
function reducirImagen32(file, max, q) { return new Promise((ok, mal) => { const fr = new FileReader(); fr.onerror = () => mal(new Error('No se pudo leer la imagen.')); fr.onload = () => { const im = new Image(); im.onerror = () => mal(new Error('El archivo no es una imagen válida.'));
  im.onload = () => { try { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q || 0.7)); } catch (e) { mal(e); } }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
function pedirFoto32(camara) { return new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (camara) i.setAttribute('capture', 'environment'); i.style.display = 'none'; document.body.appendChild(i); let listo = false; const fin = f => { if (listo) return; listo = true; i.remove(); ok(f || null); };
  i.addEventListener('change', () => fin(i.files && i.files[0])); i.addEventListener('cancel', () => fin(null)); if (window.__foto32) { fin(window.__foto32); return; } i.click(); }); }
async function guardarImg32(id, d) { IMG32.set(id, d); if (window.__DEMO__) return; if (dbNS) await dbNS.doc('img32/' + id).set({ d, t: ahoraISO() }); else try { localStorage.setItem('so-img-' + id, d); } catch (e) { throw new Error('Este equipo no tiene espacio para guardar la foto sin conexión.'); } }
async function leerImg32(id) { if (!id) return null; if (IMG32.has(id)) return IMG32.get(id); let d = null; try { if (dbNS) { const s = await dbNS.doc('img32/' + id).get(); d = s.exists ? (s.data() || {}).d : null; } if (!d) d = localStorage.getItem('so-img-' + id); } catch (e) {} IMG32.set(id, d || null); return d || null; }
async function borrarImg32(id) { IMG32.delete(id); try { if (dbNS) await dbNS.doc('img32/' + id).delete(); localStorage.removeItem('so-img-' + id); } catch (e) {} }
function hidratar32(root) { (root || document).querySelectorAll('img[data-i32]:not([data-ok])').forEach(im => { im.dataset.ok = '1'; leerImg32(im.dataset.i32).then(d => { if (d) { im.src = d; im.hidden = false; } else im.remove(); }); }); }
/* Tomar o elegir una foto, reducirla y guardarla. Devuelve el id o null. */
async function nuevaFoto32(pref, camara, max, q) { const f = await pedirFoto32(camara); if (!f) return null; if (!/^image\//.test(f.type || 'image/jpeg')) { toast('Elija un archivo de imagen.', 'err'); return null; }
  try { const d = await reducirImagen32(f, max || 1100, q || 0.66); if (d.length > 235000) { const d2 = await reducirImagen32(f, Math.round((max || 1100) * 0.7), 0.55); const id = uid(pref); await guardarImg32(id, d2); return id; } const id = uid(pref); await guardarImg32(id, d); return id; } catch (e) { toast('No se pudo guardar la foto: ' + e.message, 'err'); return null; } }

/* ---------- Personas: recolectores y empleados con foto o avatar ---------- */
function persona32(id) { const t = trabajadores.find(x => x.id === id); if (t) return { p: t, tipo: 'trabajador', rol: 'Recolector', doc: t.documento, lista: trabajadores }; const e = (typeof empleados !== 'undefined' ? empleados : []).find(x => x.id === id); return e ? { p: e, tipo: 'empleado', rol: e.cargo || 'Empleado', doc: e.cedula, lista: empleados } : null; }
const personas32 = () => trabajadores.map(t => ({ id: t.id, nombre: t.nombre, rol: 'Recolector', p: t })).concat((typeof empleados !== 'undefined' ? empleados : []).map(e => ({ id: e.id, nombre: e.nombre, rol: e.cargo || 'Empleado', p: e })));
function tono32(s) { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar32(p, cls) { p = p || {}; return `<span class="av32 ${cls || ''}" style="--h:${tono32(p.nombre)}" aria-hidden="true"><b>${esc(iniciales(p.nombre || '?'))}</b>${p.fotoId ? `<img data-i32="${esc(p.fotoId)}" alt="" hidden>` : ''}</span>`; }
function codigoPersona32(id) { const x = persona32(id); if (!x) return ''; const i = x.lista.indexOf(x.p) + 1; return (x.tipo === 'trabajador' ? 'R' : 'E') + '-' + String(i).padStart(3, '0'); }
function qrPersona32(id) { const x = persona32(id); if (!x) return ''; const f = fincasActivas()[0] || {}; return ['STATE ORIGEN', sinTildes32(f.nombre || ''), codigoPersona32(id), sinTildes32(x.p.nombre), x.doc ? 'CC ' + x.doc : '', 'ID ' + id].filter(Boolean).join(' | '); }

/* El plan semanal desde Reportes: si la semana en pantalla no tiene órdenes, se usa la semana con órdenes más cercana (próxima o, si no hay, la última) */
const _planSemanal32 = exportarPlanSemanalPDF; exportarPlanSemanalPDF = function () { const base = semanaBase; try { if (!otsDeSemana(base).length && ordenes.length) { const sem = [...new Set(ordenes.filter(o => o.fechaProgramada && o.estado !== 'Cancelada').map(o => lunesDe(o.fechaProgramada)))].sort(); const prox = sem.find(s => s >= base) || sem[sem.length - 1]; if (prox) { semanaBase = prox; toast('La semana en pantalla no tiene órdenes: se generó la semana ' + semanaISO(prox) + '.'); } } return _planSemanal32.apply(this, arguments); } finally { semanaBase = base; } };

const _openModal32 = openModal; openModal = function () { const b = document.getElementById('modal-box'); if (b) b.classList.remove('m32-xl'); return _openModal32.apply(this, arguments); };
