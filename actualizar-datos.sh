#!/usr/bin/env bash
# Igual que actualizar-datos.cmd, para macOS o Linux.
set -euo pipefail
cd "$(dirname "$0")"
git pull --rebase --autostash
[ -d node_modules ] || npm ci --no-audit --no-fund
npm run data:tm
git add -f public/data/players.json data/transfermarkt.json
if git diff --cached --quiet; then echo "No hubo cambios en los datos."; exit 0; fi
git commit -m "Actualiza valores desde Transfermarkt"
git push
echo "Listo. Netlify publica los cambios en un par de minutos."
