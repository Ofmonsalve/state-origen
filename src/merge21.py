#!/usr/bin/env python3
# Ensambla state-origen-v21.html: v20 (merge20.py) + parts/v21
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge20.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v20.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v21', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes21.py'))
rep("</style>", P('cosecha21.css') + "\n</style>")
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", P('cosecha21.js') + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v21.html'), 'w', encoding='utf-8').write(s)
print('v21 ok', len(s))
