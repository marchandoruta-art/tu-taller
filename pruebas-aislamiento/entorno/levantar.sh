#!/usr/bin/env bash
# Levanta un Postgres local con el esquema de tu-taller aplicado desde sus migraciones.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${1:-$(cd "$AQUI/../.." && pwd)}"
CONTENEDOR="taller-audit-db"
PUERTO="${PUERTO:-54329}"
PSQL=(docker exec -i "$CONTENEDOR" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
docker run -d --name "$CONTENEDOR" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p "$PUERTO:5432" \
  postgres:15-alpine >/dev/null

printf 'Esperando a Postgres'
until docker exec "$CONTENEDOR" pg_isready -U postgres -q 2>/dev/null; do
  printf '.'; sleep 1
done
echo

"${PSQL[@]}" < "$AQUI/bootstrap.sql" >/dev/null
echo "Entorno base listo."

# pg_cron y pg_net no existen en la imagen: los sustituyen los stubs del bootstrap.
aplicadas=0
fallidas=0
: > "$AQUI/migraciones-fallidas.log"

for archivo in "$REPO"/supabase/migrations/*.sql; do
  nombre="$(basename "$archivo")"
  if sed -E '/CREATE EXTENSION IF NOT EXISTS (pg_cron|pg_net)/Id' "$archivo" | "${PSQL[@]}" >/dev/null 2>"$AQUI/.err"; then
    aplicadas=$((aplicadas + 1))
  else
    fallidas=$((fallidas + 1))
    { echo "=== $nombre"; cat "$AQUI/.err"; echo; } >> "$AQUI/migraciones-fallidas.log"
  fi
done
rm -f "$AQUI/.err"

echo "Migraciones aplicadas: $aplicadas  ·  fallidas: $fallidas"
[ "$fallidas" -gt 0 ] && echo "Detalle en $AQUI/migraciones-fallidas.log"

"${PSQL[@]}" -tAc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'" \
  | xargs -I{} echo "Tablas en public: {}"
"${PSQL[@]}" -tAc "select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'" \
  | xargs -I{} echo "Politicas RLS: {}"

echo "Conexion: postgresql://postgres:postgres@localhost:$PUERTO/postgres"
