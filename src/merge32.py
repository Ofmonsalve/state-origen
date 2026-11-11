#!/usr/bin/env python3
# Ensambla state-origen-v31.html: v30 + parts/v31 (PDF editorial y guardado seguro, edición y formatos)
import os, subprocess
B = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', os.path.join(B, 'merge31.py')], check=True, stdout=subprocess.DEVNULL)
s = open(os.path.join(B, 'state-origen-v31.html'), encoding='utf-8').read()
P = lambda n: open(os.path.join(B, 'parts', 'v32', n), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a)); s = s.replace(a, b)
exec(P('ajustes32.py'))
rep("</style>", P('v32.css') + "\n</style>")
QR = 'const qrcode32 = (function () {\n' + open(os.path.join(B, 'node_modules/qrcode-generator/dist/qrcode.js'), encoding='utf-8').read().split('(function (factory) {')[0] + "\nqrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];\nreturn qrcode; })();\n"
JS = ['base32.js', 'personas32.js', 'historia32.js', 'campo32.js']
rep("/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */", QR + '\n'.join(P(n) for n in JS) + "\n/* ================= APP SHELL: rutas, títulos, tema, avisos, deshacer ================= */")
open(os.path.join(B, 'state-origen-v32.html'), 'w', encoding='utf-8').write(s)
print('v32 ok', len(s), JS)
