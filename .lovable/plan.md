
# Plan de implementación

Voy a entregar estas 6 mejoras en bloques independientes para que se puedan revisar/usar a medida que avanzan.

---

## 1. Exportación de datos (CSV / Excel)

**Dónde:** Dashboard, Histórico de Reparaciones, Productividad, Control de Carga, Asistencia.

- Botón **"Exportar"** en la cabecera de cada listado (icono Download).
- Genera **CSV** directamente desde el navegador (sin dependencias nuevas) usando los datos ya cargados + filtros activos.
- Para Excel real (.xlsx) en exportes importantes (Histórico y Productividad) añado la librería `xlsx` (SheetJS) y genero hoja con cabeceras, formato fecha y totales.
- Exporta lo visible tras filtros (rango de fechas, técnico, estado).

---

## 2. Etiquetas de prioridad en Kanban (#6)

**Dónde:** Tabla `vehicles`, `VehicleCard`, `Dashboard`.

- Nueva columna `priority` en `vehicles`: enum `baja | normal | alta | urgente` (default `normal`).
- Selector de prioridad en la ficha del vehículo (admin/oficina) y menú rápido en la tarjeta.
- En las tarjetas Kanban/Lista: borde/etiqueta de color (urgente = rojo pulsante, alta = naranja, baja = gris) y un icono ⚡ para urgentes.
- Filtro "Solo urgentes/altas" en el Dashboard.
- Orden por prioridad descendente como opción.

---

## 3. Portal cliente de solo lectura (#7)

**Dónde:** Ruta pública `/c/:token`.

- Nueva tabla `client_portal_tokens` (vehicle_id, token uuid, expires_at, organization_id).
- Botón en la ficha del vehículo (admin/oficina): **"Compartir con cliente"** → genera link único + botón WhatsApp con plantilla.
- Página pública sin login que muestra: matrícula, marca/modelo, estado actual con barra de progreso, resumen de trabajo, fotos (antes/después si las marcamos como compartibles), tareas del checklist completadas, fecha estimada y datos de contacto del taller.
- **No** muestra precios, propietario completo, ni datos internos.
- Edge function `get-portal-vehicle` valida token y devuelve solo datos permitidos (signed URLs para fotos).
- Token caducable (default 30 días) y revocable.

---

## 4. Recordatorios WhatsApp automáticos de citas (#9)

**Dónde:** Edge function programada + UI de citas.

- Extender la función `reminder-appointments` ya existente para generar a las **17:00h del día anterior** una notificación interna por cita con un **link WhatsApp pre-rellenado** (1 click) por cita pendiente.
- Plantilla configurable desde Ajustes → bloque "Mensajes": `whatsapp_reminder_template` con variables `{cliente}`, `{matricula}`, `{fecha}`, `{hora}`, `{taller}`.
- En la página Citas: badge "Recordatorio listo" + botón **Enviar WhatsApp** que abre `wa.me` con el mensaje.
- Cron pg_cron a las 17:00 Europe/Madrid.

---

## 5. Plantillas de tareas recurrentes (#10)

**Dónde:** Nueva sección en Ajustes + ficha vehículo.

- Nueva tabla `task_templates` (id, organization_id, name, tasks jsonb, created_by).
- En Ajustes nueva pestaña **"Plantillas de tareas"**: crear/editar/borrar plantillas tipo "Revisión ITV", "Cambio de aceite + filtros", "Pre-entrega", con su lista de tareas.
- En la ficha del vehículo, en el checklist, botón **"Aplicar plantilla"** → desplegable que añade las tareas de la plantilla a `client_tasks`.

---

## 6. Crear vehículo rápido por matrícula

**Dónde:** Diálogo "Nuevo vehículo" + atajo Cmd+K.

- En `NewVehicleDialog`: al introducir la matrícula y pulsar **Enter** o el botón **"Crear rápido"**:
  - Comprueba si ya existe vehículo activo con esa matrícula → abre directamente su ficha.
  - Si no existe pero hay un **archivo** o vehículo entregado previo con esa matrícula → pre-rellena marca, modelo, propietario y permite confirmar en 1 click.
  - Si no existe en absoluto → crea vehículo con `status='recibido'`, marca/modelo `Sin especificar` (editables después), y abre la ficha.
- En la paleta global (Cmd+K) y en el Dashboard, una caja "Crear/abrir matrícula" que hace lo mismo en una sola línea.
- Botón flotante en móvil "+ Matrícula" para entrada ultra-rápida en el taller.

---

## Detalles técnicos

- **DB:** 3 migraciones (priority enum + columna, `client_portal_tokens`, `task_templates`) con GRANT + RLS por `organization_id` y `is_org_admin()`/`is_org_owner()` según corresponda. Token portal con policy pública SOLO desde edge function (service_role).
- **Edge functions:** nueva `get-portal-vehicle` (pública con validación de token); ampliar `reminder-appointments`.
- **Cron:** pg_cron 17:00 Europe/Madrid → `reminder-appointments`.
- **Dependencia nueva:** `xlsx` (SheetJS) para exportes Excel.
- **Permisos:** prioridad editable por admin/oficina; portal y plantillas solo admin/oficina; mecánico/chapista solo ven.
- **Mobile-first:** todos los nuevos controles funcionan a 430px (caja matrícula rápida, selector prioridad, botones exportar accesibles desde menú "más").

---

## Orden de entrega sugerido

1. Matrícula rápida + Prioridades (impacto inmediato en el día a día)
2. Exportación de datos
3. Plantillas de tareas
4. Recordatorios WhatsApp
5. Portal cliente (lo más grande, último)

¿Lo lanzo en este orden o prefieres otro? ¿Confirmo todo o quitamos/cambiamos algo?
