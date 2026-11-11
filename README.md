# State Origen

Sistema de gestión para fincas cafeteras: cosecha y pagos, cultivo, beneficio, de la finca a la taza, finanzas, personal, informes PDF y trazabilidad. Es una aplicación de un solo archivo (`index.html`) que funciona en celular, tableta y computador.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `index.html` | La app armada, lista para abrir o publicar |
| `src/state-origen-v18.html` | Base de la app |
| `src/parts/vNN/` | Código de cada versión (JS, CSS y ajustes) |
| `src/mergeNN.py` | Ensambla cada versión sobre la anterior |
| `src/test_*.js` | Pruebas automáticas (jsdom) |
| `build.sh` | Arma `index.html` desde `src/` |

## Armar y probar

```bash
./build.sh                      # genera index.html
cd src && python3 build_preview.py && node test_v32.js   # pruebas con datos de ejemplo
```

## Datos

Este repositorio guarda **el programa**, no los datos de la finca. Fuera de Claude la app guarda en el navegador de cada equipo hasta que se conecte una base de datos propia (pendiente: Supabase).
