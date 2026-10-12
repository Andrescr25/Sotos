#!/usr/bin/env bash
# Regenera los íconos PNG de la app a partir de assets/icon.svg (y su versión
# maskable). Requiere macOS (qlmanage y sips vienen con el sistema).
#
#   bash scripts/generate-icons.sh
set -euo pipefail
cd "$(dirname "$0")/.."

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

render() { # <svg> <tamaño> <salida>
  qlmanage -t -s "$2" -o "$tmp" "$1" >/dev/null 2>&1
  mv "$tmp/$(basename "$1").png" "$3"
}

render assets/icon.svg 1024 assets/icon.png
render assets/icon-maskable.svg 1024 "$tmp/maskable-1024.png"

resize() { # <entrada> <tamaño> <salida>
  sips -z "$2" "$2" "$1" --out "$3" >/dev/null
}

resize assets/icon.png 48 assets/favicon.png
resize assets/icon.png 180 public/apple-touch-icon.png
resize assets/icon.png 192 public/icon-192.png
resize assets/icon.png 512 public/icon-512.png
resize "$tmp/maskable-1024.png" 512 public/icon-maskable-512.png

echo "Íconos generados: assets/icon.png, assets/favicon.png y public/*.png"
