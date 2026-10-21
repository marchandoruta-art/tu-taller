# Auditoria de aislamiento — proyecto `local-taller-audit-db`

Fecha: 2026-10-21  ·  Columna de tenant: `organization_id`

## Resumen

- Tablas analizadas: **26**
- Tablas sin RLS activado: **0**
- Tablas sin columna de tenant: **2**
- Politicas totales: **95**
- Politicas que aislan por usuario (`auth.uid()`): **13**
- Politicas sin ningun filtro de aislamiento: **0**
- De esas, alcanzables por el rol publico `anon`: **0**
- Funciones SECURITY DEFINER sin `search_path` fijado: **0**

## Informativo — politicas acotadas al propio usuario

Aislan por identidad en vez de por taller. Es mas restrictivo, no menos: correcto para datos personales.

- `organizations` · DELETE · Organization owners can delete their org — `(owner_id = auth.uid())`
- `organizations` · INSERT · Authenticated users can create organizations — `(owner_id = auth.uid())`
- `organizations` · SELECT · Organization owners can view their org — `(owner_id = auth.uid())`
- `profiles` · INSERT · Users can insert own profile — `(auth.uid() = user_id)`
- `profiles` · SELECT · Users can view their own profile — `(user_id = auth.uid())`
- `profiles` · UPDATE · Users can update own profile — `(auth.uid() = user_id)`
- `push_subscriptions` · DELETE · Users can delete own push sub — `(auth.uid() = user_id)`
- `push_subscriptions` · INSERT · Users can insert own push sub — `(auth.uid() = user_id)`
- `push_subscriptions` · SELECT · Users can view own push sub — `(auth.uid() = user_id)`
- `push_subscriptions` · UPDATE · Users can update own push sub — `(auth.uid() = user_id)`
- `user_roles` · SELECT · Users can view own role — `(auth.uid() = user_id)`
- `user_roles` · SELECT · Users can view their own role — `(user_id = auth.uid())`
- `vehicle_messages` · INSERT · Users can insert own messages — `(auth.uid() = user_id)`

## Informativo — operaciones sin politica

Sin politica, Postgres deniega por defecto. No es una fuga: es funcionalidad bloqueada.

- `attendance_logs`: DELETE
- `audit_log`: DELETE, UPDATE
- `vehicle_archives`: INSERT, UPDATE
- `vehicle_status_history`: UPDATE

## Informativo — tablas sin columna de tenant

Deben aislarse por join con su tabla padre. Verificar una a una.

- `organizations`
- `propietarios_plataforma`

## Veredicto

**PASA**
