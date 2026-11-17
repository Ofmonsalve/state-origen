#!/bin/bash
# Arma la app completa (un solo archivo) a partir de las partes en src/ y la deja en index.html
set -e
cd "$(dirname "$0")/src"
[ -d node_modules ] || npm ci
python3 merge36.py
cp state-origen-v36.html ../index.html
echo "Listo: index.html"
