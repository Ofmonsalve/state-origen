#!/bin/bash
# Arma la app completa (un solo archivo) a partir de las partes en src/ y la deja en index.html
set -e
cd "$(dirname "$0")/src"
[ -d node_modules ] || npm ci
python3 merge34.py
cp state-origen-v34.html ../index.html
echo "Listo: index.html"
