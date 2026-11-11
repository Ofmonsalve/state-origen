#!/usr/bin/env python3
# Ensambla state-origen-v30.html: v29 + parts/v30 (PDF editorial y guía de puesta al día)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge29.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v29.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v30', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes30.py'))
rep("</style>", P('guia30.css') + "\n</style>")
JS = [n for n in ['guia30.js'] if os.path.exists(os.path.join(B, 'parts', 'v30', n))]
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v30.html'), 'w', encoding='utf-8').write(s)
print('v30 ok', len(s), JS)
