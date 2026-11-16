#!/usr/bin/env bash
# Renders every lab diagram with one layout into _shots/context-lab/<layout>/ at the repo root.
# Usage: plugins/plugin-architecture/test/context-lab/render.sh <layout-value> [extra first-line attrs]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
layout="${1:?layout value, e.g. hub}"
extra="${2:-}"
out="$root/_shots/context-lab/$layout"
mkdir -p "$out"
for src in "$here"/*.dgr; do
  name="$(basename "$src" .dgr)"
  # put layout= (and extras) on the first line that starts with "diagram "
  sed -E "0,/^diagram /s/^(diagram [^\n]*)$/\1 layout=$layout $extra/" "$src" > "$out/$name.dgr"
  node "$root/packages/cli/dist/main.js" build "$out/$name.dgr" --png >/dev/null 2>"$out/$name.err" || echo "FAIL $name: $(head -3 "$out/$name.err")"
done
ls "$out"/*.png 2>/dev/null | wc -l | xargs echo "pngs:"
