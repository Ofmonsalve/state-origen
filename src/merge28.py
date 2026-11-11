#!/usr/bin/env python3
# Ensambla state-origen-v28.html: v27 + parts/v28 (PDF editorial y estilo iOS, informes y descargables)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge27.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v27.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v28', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes28.py'))
rep("</style>", P('ios28.css') + "\n</style>")
JS = [n for n in ['pdf28.js', 'descargas28.js'] if os.path.exists(os.path.join(B, 'parts', 'v28', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v28.html'), 'w', encoding='utf-8').write(s)
print('v28 ok', len(s), JS)
