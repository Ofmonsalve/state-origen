# Ajustes v34: el relato abre el pasaporte y la historia entra al certificado de trazabilidad
rep("const APP_VERSION = '33.0';", "const APP_VERSION = '34.0';")
rep("try { R.portada(); } catch (e) {}\n  R.seccion(1, 'Origen', 'Dónde nació este café');", "try { R.portada(); } catch (e) {}\n  try { relatoPDF34(R, H); } catch (e) {}\n  R.seccion(1, 'Origen', 'Dónde nació este café');")
rep("  R.firmas([['Certifica', 'Propietario de la finca'], ['Recibe', terceroNombre(v.terceroId, v.comprador)]]);", "  try { historiaEnCertificado34(R, o); } catch (e) { if (typeof dlog === 'function') dlog('✗ historia en certificado: ' + e.message, 'err'); }\n  R.firmas([['Certifica', 'Propietario de la finca'], ['Recibe', terceroNombre(v.terceroId, v.comprador)]]);")
