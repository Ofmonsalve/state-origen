#!/usr/bin/env python3
# Ensambla state-origen-v39.html: v38 + parts/v39 (informes con resumen ejecutivo y control del documento, gráficas y módulos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge38.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v38.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v39', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes39.py'))
CSS = [n for n in ['v39.css'] if os.path.exists(os.path.join(B, 'parts', 'v39', n))]
if CSS: rep("</style>", P('v39.css') + "\n</style>")
JS = [n for n in ['cosecha39.js'] if os.path.exists(os.path.join(B, 'parts', 'v39', n))]
M = "/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */"
rep(M, '\n'.join(P(n) for n in JS) + "\n" + M)
open(os.path.join(B, 'state-origen-v39.html'), 'w', encoding='utf-8').write(s)
print('v39 ok', len(s), JS, CSS)
