rep("const APP_VERSION = '42.0';", "const APP_VERSION = '43.0';")
# Números con coma decimal en Análisis
rep("${kgHora.toFixed(1)}", "${num(redondear(kgHora, 1))}", 3)
rep("${promedioDiario.toFixed(1)}", "${num(redondear(promedioDiario, 1))}", 2)
rep("${desv.toFixed(1)}", "${num(redondear(desv, 1))}")
rep("${cv.toFixed(0)}", "${num(Math.round(cv))}", 2)
rep("${slope.toFixed(2)}", "${num(redondear(slope, 2))}")
