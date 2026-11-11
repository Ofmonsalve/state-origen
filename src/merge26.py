#!/usr/bin/env python3
# Ensambla state-origen-v26.html: v25 + parts/v26 (PDF editorial y fase F: de la finca a la taza)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge25.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v25.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v26', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes26.py'))
rep("</style>", P('taza26.css') + "\n</style>")
JS = [n for n in ['taza26.js', 'taza26ui.js'] if os.path.exists(os.path.join(B, 'parts', 'v26', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v26.html'), 'w', encoding='utf-8').write(s)
print('v26 ok', len(s), JS)
