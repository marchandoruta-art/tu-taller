#!/usr/bin/env bash
# Entorno de pruebas de aislamiento multi-taller. Un solo comando:
#
#     ./pruebas-aislamiento/ejecutar.sh
#
# Levanta un Postgres desechable, le aplica las migraciones del repositorio,
# audita el esquema y ejecuta la bateria de aislamiento entre dos talleres
# ficticios. Los informes quedan en pruebas-aislamiento/informes/.
#
# No toca produccion ni usa datos reales: los dos talleres y sus datos son
# inventados por la propia bateria.
#
# Requisitos: Docker y Python 3.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! docker info >/dev/null 2>&1; then
  echo "Docker no esta arrancado. Abre Docker Desktop y vuelve a lanzarlo." >&2
  exit 1
fi

echo "== 1/3  Replica local del esquema =="
"$AQUI/entorno/levantar.sh" "$(cd "$AQUI/.." && pwd)"

echo
echo "== 2/3  Auditoria estatica del esquema =="
python3 "$AQUI/auditar_rls.py" --local taller-audit-db

echo
echo "== 3/3  Bateria de aislamiento entre talleres =="
python3 "$AQUI/bateria_aislamiento.py"
