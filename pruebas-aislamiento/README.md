# Pruebas de aislamiento entre talleres

Comprueban que ningún usuario de un taller puede acceder a datos de otro.

## Ejecutar

```bash
./pruebas-aislamiento/ejecutar.sh
```

Necesitas Docker arrancado y Python 3. Tarda un par de minutos. Los informes se
escriben en `pruebas-aislamiento/informes/`.

## Qué hace

1. **Levanta una réplica desechable** de la base de datos en Docker y le aplica las
   migraciones de `supabase/migrations/`, una a una. Si alguna falla, lo dice.
2. **Audita el esquema**: qué tablas tienen RLS, qué políticas hay, si alguna deja
   pasar sin filtrar por taller, si el rol público `anon` tiene permisos de más y si
   alguna función `SECURITY DEFINER` se ejecuta sin `search_path` fijado.
3. **Ejecuta la batería**: crea dos talleres ficticios con un usuario cada uno y, tabla
   por tabla, intenta que el usuario del taller B lea, modifique, borre o escriba datos
   del taller A. También lo intenta contra los ficheros de Storage y contra las
   funciones RPC.

No se usa ningún dato real. Los dos talleres y todo su contenido los inventa la propia
batería, y se borran y rehacen en cada ejecución. Nada de esto toca producción.

## Cómo leer el informe

El veredicto final es `PASA` o `FALLA`. Los resultados se clasifican así:

| | |
|---|---|
| **Fallo crítico** | Un taller alcanza datos o ficheros de otro. Es una fuga. |
| **Regresión** | El aislamiento se apretó de más y el usuario ya no ve ni lo suyo. La app se rompería. |
| **Fuga de metadatos** | No expone datos de clientes, pero permite sondear la plantilla o la estructura de otro taller. |
| **Informativo** | Comportamiento deliberado. Por ejemplo, buscar un taller por su código de invitación. |

La columna **«Acceso propio»** de la tabla de resultados es el control positivo: confirma
que el usuario sigue viendo lo suyo. Sin ella, una aplicación completamente rota también
daría verde, porque no dejaría pasar nada a nadie.

## Alcance

Cubre las tablas con columna `organization_id` en las cuatro operaciones, los dos buckets
de Storage y las funciones RPC que puede invocar un usuario autenticado.

Quedan fuera las Edge Functions, que se ejecutan con `service_role` y por diseño no están
sujetas a RLS: se auditan revisando su código, no con esta batería.
