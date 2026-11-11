#!/usr/bin/env python3
# Ensambla state-origen-v27.html: v26 + parts/v27 (PDF editorial y claridad y diseño)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge26.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v26.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v27', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes27.py'))
rep("</style>", P('ux27.css') + "\n</style>")
JS = [n for n in ['mejoras27.js', 'ux27.js'] if os.path.exists(os.path.join(B, 'parts', 'v27', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v27.html'), 'w', encoding='utf-8').write(s)
print('v27 ok', len(s), JS)
