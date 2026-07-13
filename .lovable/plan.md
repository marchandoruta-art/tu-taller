## Completar las 4 tareas pendientes

### 1. Botón "Escanear VIN" visible en detalle de vehículo
En `src/pages/VehicleDetail.tsx`, junto a los campos de datos técnicos (VIN/bastidor), añadir `<ScanVinButton />` que rellene automáticamente el VIN, marca y año detectados. Solo visible para admin/oficina/mecánico con permiso de edición.

### 2. Botón "Avisar cliente por WhatsApp" al marcar `terminado`
En `VehicleDetail.tsx`, cuando `status === 'terminado'` y el vehículo tiene `owner.phone`, mostrar un botón destacado verde "Avisar cliente por WhatsApp" que use el hook existente `useWhatsAppMessage` con la plantilla actual. Registrar el envío como entrada en el timeline/mensajes internos del vehículo.

### 3. Confirmación de citas por WhatsApp en página Citas
En `src/pages/Appointments.tsx`:
- Añadir badge de estado (`Pendiente` / `Confirmada` / `Cancelada`) leyendo `confirmation_status`.
- Botón "Pedir confirmación por WhatsApp" que abre `wa.me` con mensaje que incluye el enlace público `/cita/:token` (generando token si no existe aún).
- Filtro rápido por estado de confirmación.

### 4. Notificaciones agrupadas por tipo y vehículo
En `src/pages/Notifications.tsx`:
- Agrupar el array por clave `type + entity_id` (o por vehículo cuando el mensaje lo referencie).
- Cada grupo se muestra como una tarjeta colapsable con contador ("3 mensajes de MAT-1234"), fecha más reciente y expandible.
- "Marcar todo el grupo como leído" además del actual "marcar todas".
- Sin cambios de esquema en la tabla `notifications`.

### Detalles técnicos
- No hay migraciones nuevas: `confirmation_status`/`token` ya existen en `appointments`, y `notifications` no cambia.
- Reutilizar `useWhatsAppMessage`, `ScanVinButton`, y el patrón de `PortalShareDialog` para generar tokens de cita si faltan.
- El registro del aviso WhatsApp al cliente se guarda en `vehicle_messages` con un tipo `client_notification` para verlo en el timeline.
- Mobile-first, dark mode, sin tocar lógica de facturación.
