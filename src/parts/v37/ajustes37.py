rep("const APP_VERSION = '36.0';", "const APP_VERSION = '37.0';")
rep("  R.guardar(nombreArchivo('informe-cosecha'));", "  try { analisisCosecha37(R, r, regs, ben); } catch (e) { if (typeof dlog === 'function') dlog('✗ análisis de cosecha: ' + e.message, 'err'); }\n  R.guardar(nombreArchivo('informe-cosecha'));")
