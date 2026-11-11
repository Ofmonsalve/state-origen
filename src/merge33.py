#!/usr/bin/env python3
# Ensambla state-origen-v33.html: v32 + parts/v33 (informes con resumen ejecutivo y control del documento, gráficas y módulos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge32.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v32.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v33', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
rep("const APP_VERSION = '32.0';", "const APP_VERSION = '33.0';")
CSS = [n for n in ['v33.css'] if os.path.exists(os.path.join(B, 'parts', 'v33', n))]
if CSS: rep("</style>", P('v33.css') + "\n</style>")
JS = [n for n in ['pdf33.js', 'ux33.js'] if os.path.exists(os.path.join(B, 'parts', 'v33', n))]
M = "/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */"
rep(M, '\n'.join(P(n) for n in JS) + "\n" + M)
open(os.path.join(B, 'state-origen-v33.html'), 'w', encoding='utf-8').write(s)
print('v33 ok', len(s), JS, CSS)
