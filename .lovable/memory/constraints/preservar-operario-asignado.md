---
name: Preservar operario asignado
description: El operario asignado a un vehículo se mantiene siempre, incluso al cambiar de estado (terminado, entregado, etc.). El trigger handle_vehicle_status_workflow NO debe nullificar assigned_to.
type: constraint
---
Cuando un vehículo cambia de estado (a terminado, facturado, entregado, presupuestar, etc.), NO eliminar `assigned_to`. El operario permanece vinculado al vehículo para trazabilidad y para que aparezca en su carga histórica.

Los timers activos SÍ se cierran automáticamente cuando el estado sale de 'recibido'/'en_reparacion', pero la asignación se conserva.

**Why:** El usuario quiere trazabilidad total del operario responsable en cada vehículo, sin perder la referencia al cambiar de estado.
