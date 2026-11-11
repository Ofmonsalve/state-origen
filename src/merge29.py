#!/usr/bin/env python3
# Ensambla state-origen-v29.html: v28 + parts/v29 (PDF editorial y menos botones y diseño adaptable)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge28.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v28.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v29', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes29.py'))
rep("</style>", P('ux29.css') + "\n</style>")
JS = [n for n in ['ux29.js'] if os.path.exists(os.path.join(B, 'parts', 'v29', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v29.html'), 'w', encoding='utf-8').write(s)
print('v29 ok', len(s), JS)
