#!/usr/bin/env python3
"""Auditoria estatica de aislamiento multi-tenant sobre un proyecto Supabase.

Uso:
    SUPABASE_ACCESS_TOKEN=sbp_xxx python3 auditar_rls.py <project_ref> [--tenant organization_id]
    python3 auditar_rls.py --local <contenedor> [--tenant organization_id]

Genera un informe markdown en informes/<project_ref>-<fecha>.md
"""
import json
import os
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import date

API = "https://api.supabase.com/v1/projects/{ref}/database/query"
OPERACIONES = {"SELECT", "INSERT", "UPDATE", "DELETE"}


def consultar(ref, token, sql):
    req = urllib.request.Request(
        API.format(ref=ref),
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "auditoria-rls/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        datos = json.loads(resp.read())
    if isinstance(datos, dict):
        raise SystemExit(f"Error de la API: {datos}")
    return datos


def consultar_local(contenedor, sql):
    """Mismo contrato que consultar(), contra un Postgres en Docker."""
    envoltorio = f"select coalesce(json_agg(t), '[]') from ({sql.strip().rstrip(';')}) t"
    salida = subprocess.run(
        ["docker", "exec", "-i", contenedor, "psql", "-tAqX", "-U", "postgres", "-d", "postgres", "-c", envoltorio],
        capture_output=True,
        text=True,
    )
    if salida.returncode != 0:
        raise SystemExit(f"Error de psql: {salida.stderr.strip()}")
    return json.loads(salida.stdout)


SQL_TABLAS = """
select c.relname as tabla,
       c.relrowsecurity as rls,
       exists (select 1 from information_schema.columns col
               where col.table_schema = 'public'
                 and col.table_name = c.relname
                 and col.column_name = '{tenant}') as tiene_tenant
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname
"""

SQL_POLITICAS = """
select c.relname as tabla,
       p.polname as politica,
       case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                     when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as op,
       coalesce((select string_agg(r.rolname, ',') from pg_roles r
                 where r.oid = any(p.polroles)), 'PUBLIC') as roles,
       coalesce(pg_get_expr(p.polqual, p.polrelid), '') as usando,
       coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') as con_check
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, op
"""

SQL_GRANTS = """
select table_name as tabla, grantee, string_agg(privilege_type, ',') as permisos
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
group by table_name, grantee
order by table_name
"""

SQL_FUNCIONES = """
select p.proname as funcion,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig, ','), '') as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname
"""


def clasifica(expr, tenant):
    """taller: aisla por organizacion. usuario: aisla por identidad (mas estricto). ninguno: no acota."""
    e = expr.lower()
    if tenant in e or "get_user_organization" in e or "user_belongs_to_org" in e or "is_org_" in e:
        return "taller"
    if "auth.uid()" in e:
        return "usuario"
    return "ninguno"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    tenant = "organization_id"
    if "--tenant" in sys.argv:
        tenant = sys.argv[sys.argv.index("--tenant") + 1]

    if "--json" in sys.argv:
        # Resultado de consulta_produccion.sql pegado desde el SQL editor de Lovable.
        ruta_json = sys.argv[sys.argv.index("--json") + 1]
        with open(ruta_json) as fh:
            datos = json.load(fh)
        if isinstance(datos, list):
            datos = datos[0]
        datos = datos.get("auditoria", datos)
        ref = "produccion-vzinqlkktnzgciigtycx"
        ejecutar = lambda _sql, seccion: datos[seccion]
    elif "--local" in sys.argv:
        contenedor = sys.argv[sys.argv.index("--local") + 1]
        ref = f"local-{contenedor}"
        ejecutar = lambda sql, _seccion: consultar_local(contenedor, sql)
    else:
        ref = sys.argv[1]
        token = os.environ.get("SUPABASE_ACCESS_TOKEN")
        if not token:
            raise SystemExit("Falta SUPABASE_ACCESS_TOKEN en el entorno.")
        ejecutar = lambda sql, _seccion: consultar(ref, token, sql)

    tablas = ejecutar(SQL_TABLAS.format(tenant=tenant), "tablas")
    politicas = ejecutar(SQL_POLITICAS, "politicas")
    grants_anon = {g["tabla"]: g["permisos"] for g in ejecutar(SQL_GRANTS, "grants_anon")}
    funciones = ejecutar(SQL_FUNCIONES, "funciones")

    cobertura = defaultdict(set)
    permisivas = []
    por_usuario = []
    for p in politicas:
        ops = OPERACIONES if p["op"] == "ALL" else {p["op"]}
        cobertura[p["tabla"]] |= ops
        expr = f"{p['usando']} {p['con_check']}".strip()
        alcance = clasifica(expr, tenant)
        if alcance == "ninguno":
            permisivas.append(p)
        elif alcance == "usuario":
            por_usuario.append(p)

    sin_rls = [t["tabla"] for t in tablas if not t["rls"]]
    sin_tenant = [t["tabla"] for t in tablas if not t["tiene_tenant"]]
    sin_search_path = [f["funcion"] for f in funciones if "search_path" not in f["config"]]
    # Solo es critico si la politica permisiva es alcanzable por el rol publico.
    criticas = [p for p in permisivas if "anon" in p["roles"] and grants_anon.get(p["tabla"])]

    lineas = [
        f"# Auditoria de aislamiento — proyecto `{ref}`",
        "",
        f"Fecha: {date.today().isoformat()}  ·  Columna de tenant: `{tenant}`",
        "",
        "## Resumen",
        "",
        f"- Tablas analizadas: **{len(tablas)}**",
        f"- Tablas sin RLS activado: **{len(sin_rls)}**",
        f"- Tablas sin columna de tenant: **{len(sin_tenant)}**",
        f"- Politicas totales: **{len(politicas)}**",
        f"- Politicas que aislan por usuario (`auth.uid()`): **{len(por_usuario)}**",
        f"- Politicas sin ningun filtro de aislamiento: **{len(permisivas)}**",
        f"- De esas, alcanzables por el rol publico `anon`: **{len(criticas)}**",
        f"- Funciones SECURITY DEFINER sin `search_path` fijado: **{len(sin_search_path)}**",
        "",
    ]

    if sin_rls:
        lineas += ["## CRITICO — tablas sin RLS", ""] + [f"- `{t}`" for t in sin_rls] + [""]

    if criticas:
        lineas += [
            "## CRITICO — politicas publicas sin aislamiento por taller",
            "",
            "Alcanzables sin autenticacion usando la clave publica del cliente.",
            "",
        ]
        for p in criticas:
            lineas += [
                f"### `{p['tabla']}` · {p['op']} · {p['politica']}",
                "",
                f"- Roles: `{p['roles']}`",
                f"- Permisos de `anon` sobre la tabla: `{grants_anon.get(p['tabla'], 'ninguno')}`",
                f"- Condicion: `{(p['usando'] or p['con_check'])[:300]}`",
                "",
            ]

    otras = [p for p in permisivas if p not in criticas]
    if otras:
        lineas += ["## Revisar — politicas sin filtro de aislamiento, no publicas", ""]
        lineas += [
            f"- `{p['tabla']}` · {p['op']} · {p['politica']} — `{(p['usando'] or p['con_check'])[:120]}`"
            for p in otras
        ]
        lineas.append("")

    # Un GRANT a anon sin politica que lo ampare no filtra hoy, pero deja la tabla
    # a una sola politica de distancia de ser publica. Y TRUNCATE ignora RLS.
    con_grants_anon = sorted(grants_anon)
    if con_grants_anon:
        lineas += [
            "## Endurecer — permisos concedidos al rol publico `anon`",
            "",
            "RLS lo bloquea mientras no exista una politica para `anon`, pero el permiso sobra.",
            "Corregir con `REVOKE ALL ON public.<tabla> FROM anon`.",
            "",
        ]
        lineas += [f"- `{t}` — `{grants_anon[t]}`" for t in con_grants_anon]
        lineas.append("")

    if por_usuario:
        lineas += [
            "## Informativo — politicas acotadas al propio usuario",
            "",
            "Aislan por identidad en vez de por taller. Es mas restrictivo, no menos: correcto para datos personales.",
            "",
        ]
        lineas += [
            f"- `{p['tabla']}` · {p['op']} · {p['politica']} — `{(p['usando'] or p['con_check'])[:120]}`"
            for p in por_usuario
        ]
        lineas.append("")

    incompletas = {t: OPERACIONES - c for t, c in cobertura.items() if OPERACIONES - c}
    if incompletas:
        lineas += [
            "## Informativo — operaciones sin politica",
            "",
            "Sin politica, Postgres deniega por defecto. No es una fuga: es funcionalidad bloqueada.",
            "",
        ]
        lineas += [f"- `{t}`: {', '.join(sorted(ops))}" for t, ops in sorted(incompletas.items())]
        lineas.append("")

    if sin_tenant:
        lineas += [
            "## Informativo — tablas sin columna de tenant",
            "",
            "Deben aislarse por join con su tabla padre. Verificar una a una.",
            "",
        ] + [f"- `{t}`" for t in sin_tenant] + [""]

    if sin_search_path:
        lineas += [
            "## Revisar — SECURITY DEFINER sin search_path",
            "",
        ] + [f"- `{f}()`" for f in sin_search_path] + [""]

    veredicto = "FALLA" if (sin_rls or criticas) else "PASA"
    lineas += ["## Veredicto", "", f"**{veredicto}**", ""]

    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), "informes")
    os.makedirs(destino, exist_ok=True)
    ruta = os.path.join(destino, f"{ref}-{date.today().isoformat()}.md")
    with open(ruta, "w") as fh:
        fh.write("\n".join(lineas))

    print(f"Tablas: {len(tablas)}  ·  sin RLS: {len(sin_rls)}  ·  criticas: {len(criticas)}")
    print(f"Veredicto: {veredicto}")
    print(f"Informe: {ruta}")
    return 1 if veredicto == "FALLA" else 0


if __name__ == "__main__":
    sys.exit(main())
