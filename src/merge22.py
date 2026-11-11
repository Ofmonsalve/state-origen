#!/usr/bin/env python3
# Ensambla state-origen-v22.html: v21 (merge21.py) + parts/v22 (Fase A: cosecha y trazabilidad)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge21.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v21.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v22', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes22.py'))
rep("</style>", P('traza22.css') + "\n</style>")
js = '\n'.join(P(n) for n in ['codigos22.js', 'cosecha22.js', 'liquida22.js', 'benef22.js'])
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", js + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v22.html'), 'w', encoding='utf-8').write(s)
print('v22 ok', len(s))
