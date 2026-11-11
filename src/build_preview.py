import json
s=open('state-origen-v33.html',encoding='utf-8').read()
exec(open('demo26.py',encoding='utf-8').read()); _d=json.load(open('demo20.json',encoding='utf-8')); _d.update(demo26()); demo=json.dumps(_d, ensure_ascii=False)
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("async function initStorage() {\n","async function initStorage() {\n  if (window.__DEMO__) { await Promise.resolve(); aplicarEstado(window.__DEMO__); recordarEscrito(); document.getElementById('sync-label').textContent = 'Vista previa · no se guarda'; dlog('· Vista previa con datos de ejemplo: no se guarda nada', 'ok'); return; }\n")
rep("function guardarEstado() {\n","function guardarEstado() {\n  if (window.__DEMO__) return Promise.resolve();\n")
rep("  else lbl.textContent = dbNS ? 'Sincronizado' : 'Guardado en este equipo';","  else lbl.textContent = window.__DEMO__ ? 'Vista previa · no se guarda' : (dbNS ? 'Sincronizado' : 'Guardado en este equipo');")
rep("<title>State Origen</title>","<title>State Origen · vista previa</title>")
banner='<div style="position:sticky;top:0;z-index:45;background:var(--warn);color:#fff;font:600 12.5px/1.4 var(--f-body);padding:7px max(16px, env(safe-area-inset-left, 0px));text-align:center;">Vista previa: la forma de la finca es la de tu foto; cosechas, personas y cifras son de ejemplo. Nada de lo que hagas aquí se guarda.</div>'
rep('<div class="shell">', banner+'<div class="shell">')
rep('<script>\n/* (avisos y alert', '<script>window.__DEMO__ = '+demo+';</script>\n<script>\n/* (avisos y alert')
s=s.replace("location.hash.slice(1);\n  try { showView(VISTAS[h] ? h : 'hoy'); }","location.hash.slice(1);\n  try { showView(VISTAS[h] ? h : 'tablero'); }")
open('state-origen-preview.html','w',encoding='utf-8').write(s)
print('ok', len(s))
