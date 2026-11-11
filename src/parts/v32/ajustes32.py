# Ajustes v32: historia del café en ventana (no PDF directo), versión
rep("const APP_VERSION = '31.0';", "const APP_VERSION = '32.0';")
rep("""<button class="link" onclick="fichaLotePT26('${p.id}')">Ficha PDF</button>""", """<button class="link" onclick="historia32('pt','${p.id}')">Historia del café</button>""")
