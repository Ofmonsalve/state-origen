#!/usr/bin/env python3
# Ensambla state-origen-v24.html: v23 + parts/v24 (robustez, centro de mando, créditos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge23.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v23.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v24', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes24.py'))
rep("</style>", P('mando24.css') + "\n</style>")
js = '\n'.join(P(n) for n in ['creditos24.js', 'sistema24.js', 'mando24.js'])
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", js + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v24.html'), 'w', encoding='utf-8').write(s)
print('v24 ok', len(s))
