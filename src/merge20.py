#!/usr/bin/env python3
# Ensambla state-origen-v20.html: base v19 (merge19.py) + partes de parts/v20.
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge19.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v4.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v20', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
rep("const APP_VERSION = '19.0';", "const APP_VERSION = '20.0';")
EXTRA = os.path.join(B, 'parts', 'v20', 'ajustes.py')
if os.path.exists(EXTRA): exec(open(EXTRA, encoding='utf-8').read())
if os.path.exists(os.path.join(B, 'parts', 'v20', 'estilos.css')): rep("</style>", P('estilos.css') + "\n</style>")
JS = ['fuentes.js', 'finca_real.js', 'realista.js', 'pdfmotor.js', 'reportes.js', 'reportes2.js', 'fichalote.js', 'ux.js']
codigo = '\n'.join(P(n) for n in JS if os.path.exists(os.path.join(B, 'parts', 'v20', n)))
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", codigo + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v20.html'), 'w', encoding='utf-8').write(s)
print('v20 ok', len(s))
