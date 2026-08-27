# Informe de aislamiento entre talleres

**Proyecto:** adaptación multi-taller de la aplicación de gestión
**Fecha:** 15 de agosto de 2026
**Alcance:** partidas 4.1 (arquitectura multi-taller) y 4.2 (aislamiento de datos)

---

## 1. Qué se entrega

1. **Un entorno de pruebas reproducible**, en la carpeta `pruebas-aislamiento/`. Se
   ejecuta con un solo comando y no toca la base de datos real:

   ```bash
   ./pruebas-aislamiento/ejecutar.sh
   ```

   Levanta una copia desechable de la base de datos, le aplica las migraciones del
   repositorio una a una, audita el esquema y lanza la batería de pruebas. Los informes
   se escriben en `pruebas-aislamiento/informes/`.

2. **Este informe** y los dos que genera la propia ejecución:
   `informes/bateria-2026-08-15.md` y `informes/local-taller-audit-db-2026-08-15.md`.

3. **Dos migraciones correctoras**, ya aplicadas a producción (apartado 4).

---

## 2. Qué se ha comprobado

La pregunta que responde la batería es una sola: **¿puede un taller llegar a los datos
de otro?**

Para contestarla se crean dos talleres ficticios, A y B, con un usuario cada uno, y se
intenta sistemáticamente que el usuario de B lea, modifique, borre o escriba datos de A.
El usuario de B se prueba **como administrador** de su propio taller, que es el caso más
favorable para un atacante.

Se ejecutaron **153 comprobaciones**:

| Superficie | Comprobaciones | Resultado |
|---|---|---|
| Tablas de datos (23 tablas × 6 pruebas) | 138 | Sin fugas |
| Ficheros en Storage (2 buckets × 4 pruebas) | 8 | Sin fugas |
| Funciones RPC | 7 | Sin fugas |

Los datos son inventados por la propia batería y se rehacen en cada ejecución. **En
ningún momento se usan datos reales de clientes, vehículos ni matrículas.**

### El control positivo

Una batería que solo comprobara denegaciones daría verde también sobre una aplicación
completamente rota, porque una aplicación que no deja pasar a nadie tampoco deja pasar
las fugas. Por eso cada tabla incluye además una comprobación de que **el usuario sí
sigue viendo lo suyo**. Es la columna «Acceso propio» del informe detallado.

Esto no es teórico: al añadir ese control aparecieron dos tablas
(`push_subscriptions` y `notifications`) en las que la propia batería estaba sembrando
mal los datos y, por tanto, sus pruebas de aislamiento no estaban probando nada. Se
corrigió antes de dar ningún resultado por bueno.

---

## 3. Hallazgos

### 3.1 Crítico — un taller podía llevarse un empleado de otro

**Función afectada:** `assign_user_to_organization`.

Esta función se ejecuta con privilegios elevados, lo que significa que **las reglas de
seguridad por filas no la cubren**. Su control de acceso verificaba que quien llama sea
administrador de su propio taller, pero nunca comprobaba a qué taller pertenecía el
usuario de destino.

Consecuencia: el administrador del taller B podía reasignarse un empleado del taller A
sin más que indicar su identificador. El empleado cambiaba de taller en la base de datos,
y con él su rol y sus accesos.

Se reprodujo a mano sobre la réplica local, no solo mediante el script, para descartar
que fuese un artefacto de la herramienta.

**Corregido.** La función ahora rechaza la operación si el usuario de destino ya
pertenece a otro taller. El alta legítima de un empleado nuevo no se ve afectada, porque
en ese momento el usuario todavía no tiene taller asignado. Se verificó ejecutando el
flujo completo de alta después del cambio.

### 3.2 Leve — cuatro funciones permitían sondear la plantilla de otro taller

`get_user_organization_id`, `get_user_role`, `user_belongs_to_org` e `is_org_owner`
aceptaban cualquier identificador de usuario y respondían. No exponían datos de clientes,
pero sí permitían averiguar quién trabaja dónde y con qué rol.

**Corregido.** Las cuatro se han acotado al usuario que hace la llamada o a compañeros de
su mismo taller.

`lookup_organization_by_slug` sí devuelve datos de otro taller, pero es deliberado: es lo
que permite localizar un taller por su código de invitación al registrarse. Queda
documentado como comportamiento esperado, no como fallo.

### 3.3 Permisos de más para el rol público

La tabla `client_reminders` conservaba permisos de lectura, escritura, borrado y
**vaciado completo** (`TRUNCATE`) para el rol público anónimo. Las reglas por filas lo
contenían en la práctica, pero conviene saber que **`TRUNCATE` no lo detienen esas
reglas**.

Investigando el origen, no era un descuido puntual sino algo sistemático: la
configuración de privilegios por defecto de la base de datos concede todos los permisos
al rol público, de modo que **cada tabla nueva nace con ellos**. Se corrigió el origen y
no solo el síntoma, para que cubra también las tablas que se creen en el futuro.

### 3.4 Sin credenciales sensibles en el repositorio

Se verificó que el repositorio no contiene ninguna clave de servicio (`service_role`). El
fichero de configuración solo incluye el identificador del proyecto, su dirección y la
clave pública, que en una aplicación de este tipo viaja al navegador por diseño. **El
requisito contractual sobre credenciales se cumple.**

Nota, ya fuera del ámbito de la seguridad de datos: los dos repositorios están
configurados como **públicos**, es decir, el código fuente es visible para cualquiera. No
supone una fuga de credenciales, pero es una decisión que conviene tomar
conscientemente.

---

## 4. Verificación sobre la base de datos real

Las correcciones se validaron primero en la réplica local y después se aplicaron a
producción. Comprobado tras aplicarlas:

| Comprobación | Resultado |
|---|---|
| Corrección crítica activa en producción | Sí |
| Tablas alcanzables por el rol público anónimo | Ninguna |
| Funciones de privilegio elevado ejecutables por el rol anónimo | Ninguna |
| Contenedores de ficheros públicos | Ninguno (los tres son privados) |
| Permisos por defecto para el rol anónimo | Retirados |

### Cómo se validó que la batería sirve de algo

Además del control positivo, se hizo un **control negativo**: se restauró a propósito la
versión vulnerable de la función y se volvió a lanzar la batería. Pasó a rojo, señalando
exactamente un fallo crítico. Al volver a aplicar la corrección, verde de nuevo.

Una batería que no es capaz de detectar un fallo reintroducido a propósito no demuestra
nada. Esta sí lo detecta.

---

## 5. Veredicto

**PASA** — 153 comprobaciones, 0 fallos críticos, 0 regresiones, 0 fugas de metadatos.

---

## 6. Fuera del alcance de esta batería

- **Las Edge Functions**, que se ejecutan con privilegios de servidor y por diseño no
  están sujetas a las reglas por filas. Se auditan revisando su código, no con esta
  batería.
- La tabla `organizations` no entra en el bucle porque no se aísla por taller sino por
  propietario, y `profiles` se aísla por identidad de usuario.

## 7. Pendiente de decisión del cliente

Se han localizado **16 filas sin taller asignado** en la base de datos real:

| Tabla | Filas |
|---|---|
| `push_subscriptions` | 6 |
| `app_settings` | 5 |
| `user_roles` | 3 |
| `profiles` | 2 |

El criterio de aceptación acordado es cero. No se han modificado porque son datos reales
y decidir a qué taller corresponde cada una es competencia del cliente.

Conviene resolverlo pronto por un motivo concreto: la comprobación de si un usuario es
administrador cruza las tablas `profiles` y `user_roles` exigiendo que coincidan **tanto
el usuario como el taller**. Un usuario descuadrado entre ambas tablas deja de ser
reconocido como administrador **sin ningún mensaje de error**, lo que se manifiesta como
un fallo intermitente e inexplicable en la aplicación.

## 8. Recomendación

Mientras dure la adaptación multi-taller, **congelar los cambios de estructura de base de
datos**. El hallazgo del apartado 3.3 ilustra por qué: una tabla creada durante el
desarrollo heredó permisos de más sin que nadie lo advirtiera. Cada cambio de esquema
introducido en paralelo obliga a repetir la verificación completa.
