#!/usr/bin/env python3
# Ensambla state-origen-v23.html: v22 (merge22.py) + parts/v23 (Fase B: campo)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge22.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v22.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v23', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes23.py'))
rep("</style>", P('campo23.css') + "\n</style>")
js = '\n'.join(P(n) for n in ['diseno23.js', 'campo23.js', 'ot23.js'])
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", js + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v23.html'), 'w', encoding='utf-8').write(s)
print('v23 ok', len(s))
