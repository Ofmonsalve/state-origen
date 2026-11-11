#!/usr/bin/env python3
# Ensambla state-origen-v25.html: v24 + parts/v25 (PDF editorial y fase D: predio y cumplimiento)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge24.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v24.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v25', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes25.py'))
rep("</style>", P('predio25.css') + "\n</style>")
JS = [n for n in ['pdf25.js', 'predio25.js', 'cumple25.js'] if os.path.exists(os.path.join(B, 'parts', 'v25', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v25.html'), 'w', encoding='utf-8').write(s)
print('v25 ok', len(s), JS)
