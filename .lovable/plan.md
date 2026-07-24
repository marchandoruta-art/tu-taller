
## Objetivo
Que admin/oficina pueda ver en tiempo real qué vehículos están siendo trabajados ahora mismo (cronómetro corriendo), quién los trabaja y desde cuándo.

## Qué se construye

**Nueva página `/en-curso` (Trabajo en curso)**
- Accesible desde la Sidebar (solo admin/oficina) con un badge que muestra el número de timers activos.
- Lista en tiempo real de los `time_logs` con `ended_at IS NULL` de la organización.
- Cada fila muestra:
  - Matrícula + marca/modelo (clicable → ficha del vehículo)
  - Operario asignado (nombre + rol)
  - Hora de inicio + cronómetro corriendo (HH:MM:SS actualizado cada segundo)
  - Estado actual del vehículo (badge)
  - Prioridad (con color)
- Estado vacío: "Ahora mismo no hay ningún cronómetro activo".
- Filtro rápido: por operario.

**Actualización en tiempo real**
- Suscripción Realtime a la tabla `time_logs` (INSERT/UPDATE/DELETE) → recarga la lista al instante cuando alguien inicia o detiene un timer.
- El contador HH:MM:SS de cada fila se actualiza localmente cada segundo.

**Badge en Sidebar**
- Nuevo hook `useActiveTimersCount` (parecido a `usePendingAssignedCount`) que devuelve el número de timers activos en la organización.
- Punto/contador ámbar sobre el icono de la nueva entrada del menú.

## Detalles técnicos
- Nueva ruta en `src/App.tsx`: `/en-curso` → `src/pages/ActiveWork.tsx`, protegida a roles `admin` y `oficina`.
- Query base:
  ```
  time_logs (ended_at IS NULL)
    join vehicles(plate, brand, model, status, priority)
    join profiles(full_name) on user_id
  ```
- Realtime: `supabase.channel('active-timers').on('postgres_changes', { table: 'time_logs' }, ...)` con cleanup en unmount (según regla del proyecto).
- RLS ya existente en `time_logs` limita a la organización; no hacen falta migraciones.
- No se toca la lógica de timers ni de asignación; solo lectura.

## Fuera del alcance
- No se cambia el `ActiveTimerBanner` (banner personal del operario, se queda igual).
- No se añaden acciones de "detener a distancia" (se puede añadir después si lo pides).
