#!/usr/bin/env python3
# Ensambla state-origen-v36.html: v35 + parts/v36 (informes con resumen ejecutivo y control del documento, gráficas y módulos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge35.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v35.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v36', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
rep("const APP_VERSION = '35.0';", "const APP_VERSION = '36.0';")
CSS = [n for n in ['v36.css'] if os.path.exists(os.path.join(B, 'parts', 'v36', n))]
if CSS: rep("</style>", P('v36.css') + "\n</style>")
JS = [n for n in ['pdf36.js', 'gps36.js'] if os.path.exists(os.path.join(B, 'parts', 'v36', n))]
M = "/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */"
rep(M, '\n'.join(P(n) for n in JS) + "\n" + M)
open(os.path.join(B, 'state-origen-v36.html'), 'w', encoding='utf-8').write(s)
print('v36 ok', len(s), JS, CSS)
