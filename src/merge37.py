#!/usr/bin/env python3
# Ensambla state-origen-v37.html: v36 + parts/v37 (informes con resumen ejecutivo y control del documento, gráficas y módulos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge36.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v36.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v37', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes37.py'))
CSS = [n for n in ['v37.css'] if os.path.exists(os.path.join(B, 'parts', 'v37', n))]
if CSS: rep("</style>", P('v37.css') + "\n</style>")
JS = [n for n in ['cosecha37.js', 'qr37.js'] if os.path.exists(os.path.join(B, 'parts', 'v37', n))]
M = "/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */"
rep(M, '\n'.join(P(n) for n in JS) + "\n" + M)
open(os.path.join(B, 'state-origen-v37.html'), 'w', encoding='utf-8').write(s)
print('v37 ok', len(s), JS, CSS)
