# Plan: mejoras 12, 13, 14, 15, 17, 21, 23, 25

Voy a entregarlas en 3 bloques para poder revisarlas por partes.

---

## Bloque A — Cliente y comunicación

### 14. Notificación automática al marcar "Terminado"
- Ya existe el trigger `notify_vehicle_completed_push` que avisa a los admins.
- Añadir: al pasar a `terminado`, la ficha ofrece un botón visible **"Avisar al cliente por WhatsApp"** con plantilla ya rellenada (cliente, matrícula, taller, horario). Configurable desde Ajustes → Mensajes (`whatsapp_ready_template`).
- Registro en el timeline del vehículo cuando se pulsa (para saber si ya se avisó).

### 15. Recordatorio de vehículos sin recoger
- Extender `remind-pending-vehicles` (o nuevo bloque en la misma) para detectar vehículos en estado `terminado` con más de **48h** sin pasar a `entregado`.
- A las 10:00h Europe/Madrid crea notificación interna para admin/oficina: "Cliente sin recoger el vehículo XXX (2 días)".
- En la ficha aparece badge amarillo "⏰ Sin recoger hace X días" cuando `terminado > 48h`.
- Botón 1-click WhatsApp con plantilla `whatsapp_pickup_reminder_template`.

### 13. Portal cliente para aprobar trabajos adicionales
- Reutilizo `client_portal_tokens` + `PortalView` que ya existen.
- Nueva tabla `client_approvals` (id, vehicle_id, description, requested_by, status enum `pendiente|aprobado|rechazado`, client_response_at, organization_id).
- En la ficha vehículo, botón **"Solicitar aprobación al cliente"** → crea entrada + genera enlace portal + botón WhatsApp con el enlace.
- En `PortalView` (público, sin login) el cliente ve la lista de aprobaciones pendientes con botones **Aprobar / Rechazar**. Firma no requerida (queda registrado token + timestamp + IP).
- Edge function `respond-approval` valida token del portal, guarda respuesta, notifica al admin (toast + push).
- Registro en timeline del vehículo.

---

## Bloque B — Citas, búsqueda y notificaciones

### 17. Confirmación de cita por el cliente
- Nueva columna en `appointments`: `confirmation_status` enum `pendiente|confirmada|cancelada`, `confirmation_token` uuid, `confirmed_at`.
- Al crear cita, botón **"Pedir confirmación por WhatsApp"** con link único `/cita/:token`.
- Página pública `AppointmentConfirm` mostrando datos de la cita + botones **Confirmar / Cancelar** (edge function `respond-appointment` valida token y actualiza estado).
- En la lista de Citas, badge de estado con color (gris pendiente, verde confirmada, rojo cancelada).
- Recordatorio del día antes (17:00h) solo se envía si no ha sido confirmada.

### 21. Exportar historial de cliente
- En `ClientHistory.tsx` añadir botón **"Exportar historial"** que genera CSV con: todos los vehículos del cliente, fechas, matrículas, trabajos realizados, piezas, horas totales.
- Reutiliza `src/lib/exportCsv.ts` (ya existe).
- Formato limpio, listo para adjuntar por email al cliente si lo pide.

### 23. Notificaciones agrupadas
- En `Notifications.tsx` y en el dropdown de la campana: agrupar por tipo y vehículo.
- Ejemplo: en vez de 8 líneas "Nueva foto añadida" mostrar "8 fotos añadidas al vehículo XXX".
- Grupo colapsable: click expande y muestra las notificaciones individuales.
- Botón "Marcar grupo como leído".
- Sin cambios en la tabla `notifications`, solo en la capa de presentación.

---

## Bloque C — Seguridad y admin

### 12. Reconocimiento de VIN por cámara
- Ya existe `ScanTechnicalSheetButton` (usa Lovable AI para leer ficha técnica).
- Añadir botón hermano **"Escanear VIN"** en la ficha del vehículo y en el diálogo de recepción.
- Usa Lovable AI Gateway (`google/gemini-2.5-flash`) para leer VIN de foto/etiqueta del parabrisas.
- Rellena automáticamente los campos `vin`, `brand`, `model`, `year` si los detecta.
- Edge function `scan-vin` (nueva) similar a `scan-vehicle-document` pero con prompt específico para VIN.

### 25. Log de auditoría visible
- Ya tenemos datos: `vehicle_status_history`, `notifications`, `time_logs`, `attendance_logs`.
- Nueva página **`/admin/audit`** (solo admin) con timeline unificado filtrable por: usuario, tipo (cambios estado, timers, asistencia, aprobaciones cliente, borrados), rango de fechas.
- Vista de lista con paginación (50 items).
- CSV export del log filtrado.
- Añadir tabla `audit_log` (id, user_id, organization_id, action, entity_type, entity_id, details jsonb, created_at) para eventos que hoy no se registran (borrados, cambios de asignación, aprobaciones portal). Trigger en `vehicles` para DELETE/UPDATE de `assigned_to`.

---

## Detalles técnicos

- **DB (migraciones):** `client_approvals`, `audit_log`, columnas nuevas en `appointments` (`confirmation_status`, `confirmation_token`, `confirmed_at`). Todas con GRANT + RLS por `organization_id`. Tokens con policy pública SOLO desde edge function (service_role).
- **Edge functions nuevas:** `respond-approval`, `respond-appointment`, `scan-vin`. Extender `remind-pending-vehicles`.
- **Rutas públicas nuevas:** `/aprobacion/:token`, `/cita/:token`.
- **Ajustes:** 3 plantillas nuevas de WhatsApp (`whatsapp_ready_template`, `whatsapp_pickup_reminder_template`, `whatsapp_appointment_confirm_template`).
- **Permisos:** todo lo administrativo (audit, aprobaciones) restringido a admin/oficina. Portal cliente sigue siendo público con token.
- **Mobile-first:** todos los botones nuevos accesibles a 430px.

---

## Orden de entrega

1. Bloque A (comunicación cliente) — mayor impacto operativo
2. Bloque B (citas, exportes, notificaciones agrupadas)
3. Bloque C (VIN + auditoría)

¿Lanzo en este orden los tres bloques seguidos, o prefieres validar Bloque A antes de pasar al B?
