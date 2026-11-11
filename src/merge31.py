#!/usr/bin/env python3
# Ensambla state-origen-v31.html: v30 + parts/v31 (PDF editorial y guardado seguro, edición y formatos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge30.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v30.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v31', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes31.py'))
rep("</style>", P('ventanas31.css') + "\n</style>")
JS = [n for n in ['nube31.js', 'edicion31.js', 'ventanas31.js'] if os.path.exists(os.path.join(B, 'parts', 'v31', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v31.html'), 'w', encoding='utf-8').write(s)
print('v31 ok', len(s), JS)
