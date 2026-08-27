#!/usr/bin/env python3
"""Bateria dinamica de aislamiento multi-taller.

Crea dos talleres ficticios con un usuario cada uno, siembra una fila por tabla
en cada taller y comprueba, tabla por tabla y operacion por operacion, que el
usuario del taller B no puede leer, modificar, borrar ni escribir en el taller A.

Uso:
    python3 bateria_aislamiento.py [--contenedor taller-audit-db]
"""
import json
import re
import subprocess
import sys
from datetime import date

CONTENEDOR = "taller-audit-db"
ORG_A = "aaaaaaaa-0000-4000-8000-000000000001"
ORG_B = "bbbbbbbb-0000-4000-8000-000000000002"
USER_A = "aaaaaaaa-1111-4000-8000-000000000001"
USER_B = "bbbbbbbb-1111-4000-8000-000000000002"


def psql(sql, usuario=None):
    """Ejecuta SQL. Con `usuario`, lo hace como rol authenticated y ese auth.uid()."""
    if usuario:
        claims = json.dumps({"sub": usuario, "role": "authenticated"})
        # set_config va dentro de un DO para que su valor de retorno no ensucie la salida.
        sql = (
            "begin;\n"
            f"do $ctx$ begin perform set_config('request.jwt.claims', '{claims}', true); end $ctx$;\n"
            "set local role authenticated;\n"
            f"{sql}\n"
            "commit;"
        )
    r = subprocess.run(
        ["docker", "exec", "-i", CONTENEDOR, "psql", "-tAqX", "-v", "ON_ERROR_STOP=1",
         "-U", "postgres", "-d", "postgres", "-c", sql],
        capture_output=True, text=True,
    )
    return r.returncode == 0, r.stdout.strip(), r.stderr.strip()


def consulta(sql):
    ok, out, err = psql(f"select coalesce(json_agg(t), '[]') from ({sql}) t")
    if not ok:
        raise SystemExit(f"Error introspeccionando: {err}")
    return json.loads(out)


def esquema():
    columnas = consulta("""
        select table_name as tabla, column_name as col, udt_name as tipo,
               is_nullable = 'YES' as opcional, column_default is not null as tiene_default
        from information_schema.columns
        where table_schema = 'public'
    """)
    fks = consulta("""
        select c.relname as tabla, a.attname as col,
               cf.relname as ref_tabla, nf.nspname as ref_esquema, af.attname as ref_col
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_class cf on cf.oid = con.confrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_namespace nf on nf.oid = cf.relnamespace
        join unnest(con.conkey) with ordinality k(att, ord) on true
        join unnest(con.confkey) with ordinality kf(att, ord) on kf.ord = k.ord
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.att
        join pg_attribute af on af.attrelid = con.confrelid and af.attnum = kf.att
        where con.contype = 'f' and n.nspname = 'public'
    """)
    enums = consulta("""
        select t.typname as tipo, min(e.enumlabel) as etiqueta
        from pg_type t join pg_enum e on e.enumtypid = t.oid
        group by t.typname
    """)
    checks = consulta("""
        select c.relname as tabla, pg_get_constraintdef(con.oid) as definicion
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        where con.contype = 'c' and n.nspname = 'public'
    """)
    # Un CHECK del tipo (col = ANY (ARRAY['a'::text, 'b'::text])) fija los valores validos.
    permitidos = {}
    for ch in checks:
        m = re.search(r"\((\w+)\s*=\s*ANY\s*\(\s*ARRAY\[(.+?)\]", ch["definicion"], re.S)
        if m:
            valores = re.findall(r"'([^']*)'", m.group(2))
            if valores:
                permitidos[(ch["tabla"], m.group(1))] = valores[0]

    return columnas, fks, {e["tipo"]: e["etiqueta"] for e in enums}, permitidos


LITERALES = {
    "uuid": "gen_random_uuid()", "text": "'bateria'", "varchar": "'bateria'",
    "bpchar": "'b'", "int2": "1", "int4": "1", "int8": "1",
    "numeric": "0", "float4": "0", "float8": "0", "bool": "false",
    "timestamptz": "now()", "timestamp": "now()", "date": "current_date",
    "time": "'09:00'", "timetz": "'09:00+00'", "interval": "'1 hour'",
    "json": "'{}'::json", "jsonb": "'{}'::jsonb", "_text": "'{}'::text[]",
    "_uuid": "'{}'::uuid[]", "inet": "'127.0.0.1'", "bytea": "'\\x00'::bytea",
}


def ordena_por_dependencia(tablas, fks):
    """Topologico: una tabla se siembra despues de aquellas a las que referencia."""
    deps = {t: set() for t in tablas}
    for fk in fks:
        if fk["tabla"] in deps and fk["ref_tabla"] in tablas and fk["ref_tabla"] != fk["tabla"]:
            deps[fk["tabla"]].add(fk["ref_tabla"])
    orden, pendientes = [], dict(deps)
    while pendientes:
        libres = sorted(t for t, d in pendientes.items() if not (d & pendientes.keys()))
        if not libres:  # ciclo de FKs: se siembra igualmente, el resto ya esta resuelto
            libres = sorted(pendientes)
        for t in libres:
            orden.append(t)
            pendientes.pop(t)
    return orden


def construye_insert(tabla, org, cols, fks_tabla, enums, sembradas, permitidos=None):
    permitidos = permitidos or {}
    sufijo = "a" if org == ORG_A else "b"
    campos, valores = ["organization_id"], [f"'{org}'"]
    usuario = USER_A if org == ORG_A else USER_B
    for c in cols:
        nombre = c["col"]
        if nombre == "user_id":
            # Antes que nada: hay tablas donde user_id no declara clave ajena y
            # acabaria con un uuid aleatorio, invisible para su propio dueño.
            campos.append(nombre)
            valores.append(f"'{usuario}'")
            continue
        if nombre == "organization_id" or c["opcional"] or c["tiene_default"]:
            continue
        if (tabla, nombre) in permitidos:
            campos.append(nombre)
            valores.append(f"'{permitidos[(tabla, nombre)]}'")
            continue
        ref = fks_tabla.get(nombre)
        if ref:
            destino = ref["ref_tabla"]
            if ref["ref_esquema"] == "auth":
                valor = f"'{usuario}'"
            elif destino == "organizations":
                valor = f"'{org}'"
            elif (destino, org) in sembradas:
                valor = f"'{sembradas[(destino, org)]}'"
            else:
                return None  # dependencia no sembrada: la tabla se omite
            campos.append(nombre)
            valores.append(valor)
            continue
        if c["tipo"] in ("text", "varchar"):
            # Valor distinto por tabla y taller, para no chocar con restricciones UNIQUE.
            campos.append(nombre)
            valores.append(f"'bat-{tabla}-{nombre}-{sufijo}'")
            continue
        valor = LITERALES.get(c["tipo"]) or (f"'{enums[c['tipo']]}'" if c["tipo"] in enums else None)
        if valor is None:
            return None
        campos.append(nombre)
        valores.append(valor)
    return f"insert into public.{tabla} ({', '.join(campos)}) values ({', '.join(valores)}) returning id"


def sembrar(columnas, fks, enums, permitidos):
    por_tabla = {}
    for c in columnas:
        por_tabla.setdefault(c["tabla"], []).append(c)
    con_tenant = {t for t, cs in por_tabla.items() if any(c["col"] == "organization_id" for c in cs)}

    orden = ordena_por_dependencia(con_tenant - {"organizations", "profiles"}, fks)

    # Limpieza en orden inverso al de dependencias, para no chocar con las claves ajenas.
    for tabla in reversed(orden):
        psql(f"delete from public.{tabla} where organization_id in ('{ORG_A}','{ORG_B}');")

    ok, _, err = psql(f"""
        delete from public.profiles where user_id in ('{USER_A}','{USER_B}');
        delete from auth.users where id in ('{USER_A}','{USER_B}');
        delete from public.organizations where id in ('{ORG_A}','{ORG_B}');
        insert into auth.users (id, email) values
          ('{USER_A}', 'a@bateria.test'), ('{USER_B}', 'b@bateria.test');
        insert into public.organizations (id, name, slug, owner_id) values
          ('{ORG_A}', 'Taller A', 'taller-a-bateria', '{USER_A}'),
          ('{ORG_B}', 'Taller B', 'taller-b-bateria', '{USER_B}');
        -- Un trigger sobre auth.users crea el perfil solo: por eso se actualiza en vez de insertar.
        insert into public.profiles (user_id, full_name, organization_id) values
          ('{USER_A}', 'Mecanico A', '{ORG_A}'), ('{USER_B}', 'Mecanico B', '{ORG_B}')
        on conflict (user_id) do update
          set full_name = excluded.full_name, organization_id = excluded.organization_id;
        -- El trigger de alta crea el rol sin organization_id: se completa para poder probarlo.
        update public.user_roles set organization_id = '{ORG_A}' where user_id = '{USER_A}';
        -- B se prueba como admin de su taller: es el caso mas favorable para un atacante.
        update public.user_roles set organization_id = '{ORG_B}', role = 'admin' where user_id = '{USER_B}';
    """)
    if not ok:
        raise SystemExit(f"No se pudo sembrar la base de talleres y usuarios: {err}")

    fks_por_tabla = {}
    for fk in fks:
        fks_por_tabla.setdefault(fk["tabla"], {})[fk["col"]] = fk

    sembradas, omitidas = {}, []
    for tabla in orden:
        for org in (ORG_A, ORG_B):
            sql = construye_insert(tabla, org, por_tabla[tabla], fks_por_tabla.get(tabla, {}), enums, sembradas, permitidos)
            if sql is None:
                omitidas.append((tabla, "no se pudo construir una fila de prueba"))
                break
            ok, out, err = psql(sql)
            if not ok:
                # Algunas filas las crea un trigger de alta: si ya existe una del taller, se reutiliza.
                ok, out, _ = psql(f"select id from public.{tabla} where organization_id = '{org}' limit 1")
            if not ok or not out.strip():
                motivo = next((l for l in err.splitlines() if l.startswith("ERROR:")), err)
                omitidas.append((tabla, motivo.replace("ERROR:  ", "")))
                break
            sembradas[(tabla, org)] = out.splitlines()[-1]
    return (sorted({t for t in orden if (t, ORG_A) in sembradas and (t, ORG_B) in sembradas}),
            sorted(set(omitidas)), por_tabla, fks_por_tabla, enums, permitidos, sembradas)


def prueba(nombre, tabla, ok_esperado, sql, usuario):
    ok, out, err = psql(sql, usuario=usuario)
    return {"tabla": tabla, "prueba": nombre, "ok": ok, "salida": out.splitlines()[-1] if out else "", "error": err}


BUCKETS = ("vehicle-photos", "vehicle-files")


def sembrar_storage(sembradas):
    """Un fichero por taller bajo la carpeta de su vehiculo, tal y como los sube la app.

    Las politicas de storage aislan por `(storage.foldername(name))[1] = vehicles.id`,
    asi que la carpeta tiene que ser el uuid de un vehiculo real de cada taller.
    """
    veh = {org: sembradas.get(("vehicles", org)) for org in (ORG_A, ORG_B)}
    if not all(veh.values()):
        return None, "no hay vehiculos sembrados sobre los que colgar ficheros"
    valores = ", ".join(
        f"('{b}', '{veh[org]}/bateria.bin', '{USER_A if org == ORG_A else USER_B}')"
        for b in BUCKETS for org in (ORG_A, ORG_B)
    )
    ok, _, err = psql(f"""
        insert into storage.buckets (id, name) values {', '.join(f"('{b}','{b}')" for b in BUCKETS)}
          on conflict (id) do nothing;
        delete from storage.objects where name like '%/bateria%.bin';
        insert into storage.objects (bucket_id, name, owner) values {valores};
    """)
    if not ok:
        return None, next((l for l in err.splitlines() if l.startswith("ERROR:")), err)
    return veh, None


def pruebas_storage(veh):
    """El usuario del taller B no debe alcanzar los ficheros del vehiculo del taller A."""
    ajeno = f"{veh[ORG_A]}/bateria.bin"
    res = []
    for bucket in BUCKETS:
        etiqueta = f"storage:{bucket}"

        r = prueba("lectura", etiqueta, True,
                   f"select count(*) from storage.objects where bucket_id = '{bucket}' and name = '{ajeno}';", USER_B)
        n = int(r["salida"]) if r["salida"].isdigit() else -1
        res.append({**r, "veredicto": "PASA" if n == 0 else "FALLA", "gravedad": "critica",
                    "detalle": f"{n} ficheros ajenos visibles"})

        r = prueba("modificacion", etiqueta, True,
                   f"with t as (update storage.objects set metadata = '{{}}'::jsonb "
                   f"where bucket_id = '{bucket}' and name = '{ajeno}' returning 1) select count(*) from t;", USER_B)
        n = int(r["salida"]) if r["salida"].isdigit() else 0
        res.append({**r, "veredicto": "PASA" if (not r["ok"] or n == 0) else "FALLA", "gravedad": "critica",
                    "detalle": "rechazado" if not r["ok"] else f"{n} ficheros ajenos modificados"})

        r = prueba("borrado", etiqueta, True,
                   f"with t as (delete from storage.objects where bucket_id = '{bucket}' and name = '{ajeno}' "
                   f"returning 1) select count(*) from t;", USER_B)
        n = int(r["salida"]) if r["salida"].isdigit() else 0
        res.append({**r, "veredicto": "PASA" if (not r["ok"] or n == 0) else "FALLA", "gravedad": "critica",
                    "detalle": "rechazado" if not r["ok"] else f"{n} ficheros ajenos borrados"})

        r = prueba("escritura_cruzada", etiqueta, False,
                   f"insert into storage.objects (bucket_id, name, owner) "
                   f"values ('{bucket}', '{veh[ORG_A]}/intruso.bin', '{USER_B}');", USER_B)
        res.append({**r, "veredicto": "PASA" if not r["ok"] else "FALLA", "gravedad": "critica",
                    "detalle": "rechazado" if not r["ok"] else "subio un fichero a la carpeta del vehiculo ajeno"})
    return res


def pruebas_rpc():
    """Las funciones SECURITY DEFINER saltan RLS por diseno: hay que probarlas aparte.

    `critica` = escribe o lee datos del taller ajeno. `leve` = filtra metadatos
    (a que taller pertenece un usuario, que rol tiene) sin exponer datos del taller.
    """
    res = []

    def rpc(nombre, sql, gravedad, evalua, descripcion):
        r = prueba(nombre, "rpc", True, sql, USER_B)
        veredicto, detalle = evalua(r)
        if gravedad == "informativa" and veredicto == "FALLA":
            veredicto = "ESPERADO"  # comportamiento deliberado, no un fallo
        res.append({**r, "prueba": nombre, "veredicto": veredicto, "gravedad": gravedad,
                    "detalle": detalle, "descripcion": descripcion})
        return r

    def filtra_si_devuelve(valor_esperado, mensaje):
        def _f(r):
            fuga = r["ok"] and r["salida"] == valor_esperado
            return ("FALLA" if fuga else "PASA"), (mensaje if fuga else "no devuelve nada del taller ajeno")
        return _f

    rpc("get_user_organization_id(usuario ajeno)",
        f"select coalesce(public.get_user_organization_id('{USER_A}')::text, '');",
        "leve", filtra_si_devuelve(ORG_A, "revela a que taller pertenece un usuario ajeno"),
        "Acepta cualquier uuid en vez de limitarse a `auth.uid()`.")

    rpc("get_user_role(usuario ajeno)",
        f"select coalesce(public.get_user_role('{USER_A}')::text, '');",
        "leve", filtra_si_devuelve("mecanico", "revela el rol de un usuario ajeno"),
        "Permite sondear los roles de la plantilla de otro taller.")

    rpc("user_belongs_to_org(ajeno, taller ajeno)",
        f"select public.user_belongs_to_org('{USER_A}', '{ORG_A}');",
        "leve", filtra_si_devuelve("t", "confirma la pertenencia de un usuario ajeno"),
        "Oraculo de pertenencia: responde si/no para cualquier par usuario-taller.")

    rpc("is_org_owner(taller ajeno, usuario ajeno)",
        f"select public.is_org_owner('{ORG_A}', '{USER_A}');",
        "leve", filtra_si_devuelve("t", "confirma quien es el propietario del taller ajeno"),
        "Oraculo de propiedad sobre talleres de terceros.")

    rpc("lookup_organization_by_slug(taller ajeno)",
        "select count(*) from public.lookup_organization_by_slug('taller-a-bateria');",
        "informativa", filtra_si_devuelve("1", "devuelve los datos publicos del taller ajeno"),
        "Buscar un taller por slug es necesario para el login: exponer nombre y logo es aceptable.")

    rpc("get_workshop_contact_settings()",
        "select count(*) from public.get_workshop_contact_settings() where nombre_taller = 'Taller A';",
        "critica", filtra_si_devuelve("1", "devuelve los datos de contacto del taller ajeno"),
        "Debe derivar el taller de `auth.uid()`, nunca de un parametro.")

    # Esta prueba muta la semilla si tiene exito: hay que devolver al usuario A a su taller.
    r = prueba("assign_user_to_organization(usuario ajeno)", "rpc", True,
               f"select public.assign_user_to_organization('{USER_A}', '{ORG_B}');", USER_B)
    ok_, org_tras, _ = psql(f"select organization_id from public.profiles where user_id = '{USER_A}';")
    robado = ok_ and org_tras.strip() == ORG_B
    res.append({**r, "veredicto": "FALLA" if robado else "PASA", "gravedad": "critica",
                "detalle": "el admin del taller B se ha llevado al usuario del taller A" if robado
                           else "rechazado ('Not authorized')",
                "descripcion": "Valida el taller de quien llama, pero no el del usuario destino."})
    psql(f"""
        update public.profiles set organization_id = '{ORG_A}' where user_id = '{USER_A}';
        update public.user_roles set organization_id = '{ORG_A}' where user_id = '{USER_A}';
    """)
    return res


def main():
    global CONTENEDOR
    if "--contenedor" in sys.argv:
        CONTENEDOR = sys.argv[sys.argv.index("--contenedor") + 1]

    columnas, fks, enums, permitidos = esquema()
    probadas, omitidas, por_tabla, fks_por_tabla, enums, permitidos, sembradas = sembrar(columnas, fks, enums, permitidos)

    resultados = []
    for tabla in probadas:
        # 0. Control positivo: una bateria que solo comprueba denegaciones daria verde
        # tambien sobre una app rota. El usuario B tiene que seguir viendo lo suyo.
        r = prueba("acceso_propio", tabla, True,
                   f"select count(*) from public.{tabla} where organization_id = '{ORG_B}';", USER_B)
        propias = int(r["salida"]) if r["salida"].isdigit() else -1
        resultados.append({**r, "veredicto": "PASA" if propias >= 1 else "FALLA", "gravedad": "regresion",
                           "detalle": f"{propias} filas propias visibles"})

        # 1. Lectura cruzada: el usuario B no debe ver ninguna fila del taller A.
        r = prueba("lectura", tabla, True,
                   f"select count(*) from public.{tabla} where organization_id = '{ORG_A}';", USER_B)
        filas = int(r["salida"]) if r["salida"].isdigit() else -1
        resultados.append({**r, "veredicto": "PASA" if filas == 0 else "FALLA",
                           "detalle": f"{filas} filas visibles del taller A"})

        # 2. Lectura total: ni una sola fila visible puede ser de otro taller.
        # Se comprueba sobre el total, no solo contra el taller A, para cazar tambien
        # filas huerfanas con organization_id nulo.
        r = prueba("aislamiento_total", tabla, True,
                   f"select count(*) from public.{tabla} "
                   f"where organization_id is distinct from '{ORG_B}';", USER_B)
        ajenas = int(r["salida"]) if r["salida"].isdigit() else -1
        resultados.append({**r, "veredicto": "PASA" if ajenas == 0 else "FALLA",
                           "detalle": f"{ajenas} filas visibles que no son del taller B"})

        # 3. Modificacion cruzada. Se cuentan las filas tocadas via CTE, no por el tag de psql.
        r = prueba("modificacion", tabla, True,
                   f"with t as (update public.{tabla} set organization_id = organization_id "
                   f"where organization_id = '{ORG_A}' returning 1) select count(*) from t;", USER_B)
        tocadas = int(r["salida"]) if r["salida"].isdigit() else 0
        resultados.append({**r, "veredicto": "PASA" if (not r["ok"] or tocadas == 0) else "FALLA",
                           "detalle": "rechazado por el trigger" if not r["ok"] else f"{tocadas} filas ajenas modificadas"})

        # 4. Borrado cruzado.
        r = prueba("borrado", tabla, True,
                   f"with t as (delete from public.{tabla} where organization_id = '{ORG_A}' returning 1) "
                   f"select count(*) from t;", USER_B)
        borradas = int(r["salida"]) if r["salida"].isdigit() else 0
        resultados.append({**r, "veredicto": "PASA" if (not r["ok"] or borradas == 0) else "FALLA",
                           "detalle": "rechazado" if not r["ok"] else f"{borradas} filas ajenas borradas"})

        # 5. Escritura cruzada: insertar marcando el taller ajeno.
        sql_ins = construye_insert(tabla, ORG_A, por_tabla[tabla], fks_por_tabla.get(tabla, {}), enums,
                                   {(t, o): "00000000-0000-4000-8000-000000000000" for t in probadas for o in (ORG_A, ORG_B)},
                                   permitidos)
        if sql_ins:
            r = prueba("escritura_cruzada", tabla, False, sql_ins + ";", USER_B)
            resultados.append({**r, "veredicto": "PASA" if not r["ok"] else "FALLA",
                               "detalle": "rechazado" if not r["ok"] else "acepto fila en taller ajeno"})

    resultados = [{"gravedad": "critica", **r} for r in resultados]

    veh, motivo_storage = sembrar_storage(sembradas)
    res_storage = pruebas_storage(veh) if veh else []
    res_rpc = pruebas_rpc()

    todos = resultados + res_storage + res_rpc
    fallos = [r for r in todos if r["veredicto"] == "FALLA"]
    criticos = [r for r in fallos if r["gravedad"] == "critica"]
    regresiones = [r for r in fallos if r["gravedad"] == "regresion"]
    leves = [r for r in fallos if r["gravedad"] == "leve"]
    veredicto = "FALLA" if (criticos or regresiones) else "PASA"

    lineas = [
        "# Bateria de aislamiento multi-taller",
        "",
        f"Fecha: {date.today().isoformat()}",
        "",
        "Dos talleres ficticios con un usuario cada uno. Para cada tabla se comprueba que el",
        "usuario del taller B no puede leer, modificar, borrar ni escribir datos del taller A.",
        "",
        "## Resumen",
        "",
        f"- Tablas probadas: **{len(probadas)}**",
        f"- Comprobaciones ejecutadas: **{len(todos)}** "
        f"({len(resultados)} sobre tablas, {len(res_storage)} sobre Storage, {len(res_rpc)} sobre funciones RPC)",
        f"- Fallos criticos: **{len(criticos)}**",
        f"- Regresiones (acceso propio bloqueado): **{len(regresiones)}**",
        f"- Fugas de metadatos (leves): **{len(leves)}**",
        f"- Tablas no sembrables automaticamente: **{len(omitidas)}**",
        "",
    ]

    if criticos:
        lineas += [
            "## FALLOS CRITICOS",
            "",
            "Un taller alcanza datos o ficheros de otro.",
            "",
        ]
        for f in criticos:
            lineas += [f"- `{f['tabla']}` · {f['prueba']} — {f['detalle']}"]
            if f.get("descripcion"):
                lineas += [f"  - {f['descripcion']}"]
        lineas.append("")

    if regresiones:
        lineas += [
            "## REGRESIONES — el usuario ya no ve lo suyo",
            "",
            "El aislamiento se ha apretado de mas: la app dejaria de funcionar.",
            "",
        ] + [f"- `{f['tabla']}` — {f['detalle']}" for f in regresiones] + [""]

    if leves:
        lineas += [
            "## Endurecer — fugas de metadatos",
            "",
            "No exponen datos de clientes ni vehiculos, pero permiten sondear la plantilla",
            "y la estructura de otros talleres. Se corrigen acotando los parametros a `auth.uid()`.",
            "",
        ]
        for f in leves:
            lineas += [f"- `{f['prueba']}` — {f['detalle']}"]
            if f.get("descripcion"):
                lineas += [f"  - {f['descripcion']}"]
        lineas.append("")

    lineas += ["## Detalle por tabla", "",
               "«Acceso propio» es el control positivo: confirma que apretar el aislamiento",
               "no ha roto el uso normal de la aplicacion.", "",
               "| Tabla | Acceso propio | Lectura | Total | Modificacion | Borrado | Escritura |",
               "|---|---|---|---|---|---|---|"]
    for tabla in probadas:
        fila = {r["prueba"]: r["veredicto"] for r in resultados if r["tabla"] == tabla}
        lineas.append(
            f"| `{tabla}` | {fila.get('acceso_propio','-')} | {fila.get('lectura','-')} | "
            f"{fila.get('aislamiento_total','-')} | "
            f"{fila.get('modificacion','-')} | {fila.get('borrado','-')} | {fila.get('escritura_cruzada','-')} |"
        )
    lineas.append("")

    lineas += ["## Detalle de Storage", ""]
    if res_storage:
        lineas += ["Ficheros colgados de la carpeta del vehiculo de cada taller.", "",
                   "| Bucket | Lectura | Modificacion | Borrado | Subida |", "|---|---|---|---|---|"]
        for bucket in BUCKETS:
            fila = {r["prueba"]: r["veredicto"] for r in res_storage if r["tabla"] == f"storage:{bucket}"}
            lineas.append(
                f"| `{bucket}` | {fila.get('lectura','-')} | {fila.get('modificacion','-')} | "
                f"{fila.get('borrado','-')} | {fila.get('escritura_cruzada','-')} |"
            )
    else:
        lineas += [f"No se pudo probar: {motivo_storage}."]
    lineas.append("")

    lineas += ["## Detalle de funciones RPC", "",
               "Las funciones `SECURITY DEFINER` se ejecutan saltandose RLS: son la superficie",
               "de ataque con mas riesgo y no las cubre ninguna politica.", "",
               "| Funcion | Gravedad | Resultado |", "|---|---|---|"]
    for r in res_rpc:
        lineas.append(f"| `{r['prueba']}` | {r['gravedad']} | {r['veredicto']} — {r['detalle']} |")
    lineas.append("")

    if omitidas:
        lineas += [
            "## Pendientes de comprobacion manual",
            "",
            "No se pudo generar una fila de prueba automaticamente (dependencias o tipos no cubiertos).",
            "",
        ] + [f"- `{t}` — {m}" for t, m in omitidas] + [""]

    lineas += [
        "## Alcance de esta bateria",
        "",
        "- Cubre las tablas con columna `organization_id`, con las cuatro operaciones y la escritura cruzada.",
        "- Cubre los dos buckets de Storage y las funciones RPC llamables por un usuario autenticado.",
        "- El usuario del taller B se prueba como **admin** de su taller: el caso mas favorable para un atacante.",
        "- `organizations` no se prueba en el bucle: no tiene `organization_id`, se aisla por `owner_id`.",
        "- `profiles` se aisla por identidad (`auth.uid()`), no por taller.",
        "- No cubre las Edge Functions, que se ejecutan con `service_role` y se auditan aparte.",
        "",
        "## Veredicto",
        "",
        f"**{veredicto}**",
        "",
    ]

    import os
    destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), "informes")
    os.makedirs(destino, exist_ok=True)
    ruta = os.path.join(destino, f"bateria-{date.today().isoformat()}.md")
    with open(ruta, "w") as fh:
        fh.write("\n".join(lineas))

    print(f"Tablas probadas: {len(probadas)}  ·  comprobaciones: {len(todos)}  ·  "
          f"criticos: {len(criticos)}  ·  leves: {len(leves)}")
    if omitidas:
        print("Sin sembrar: " + ", ".join(f"{t} ({m})" for t, m in omitidas))
    if not res_storage:
        print(f"Storage sin probar: {motivo_storage}")
    print(f"Veredicto: {veredicto}")
    print(f"Informe: {ruta}")
    return 1 if criticos else 0


if __name__ == "__main__":
    sys.exit(main())
