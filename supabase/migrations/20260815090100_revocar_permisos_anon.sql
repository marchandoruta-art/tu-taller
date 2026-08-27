-- Retirada de permisos al rol publico `anon`.
--
-- La migracion 20260803153655 ya hizo este revoke, pero con un bucle de una sola
-- pasada sobre las tablas que existian ese dia. `client_reminders`, creada despues,
-- nacio con INSERT/SELECT/UPDATE/DELETE/TRUNCATE para `anon` heredados de los
-- privilegios por defecto del esquema.
--
-- Hoy RLS lo contiene porque no hay ninguna politica para `anon` (verificado: cero
-- politicas que incluyan ese rol en `public` y en `storage`). Pero el permiso sobra,
-- y TRUNCATE no lo detiene RLS. Se ataja el origen en vez de la consecuencia: los
-- privilegios por defecto, para que cubra tambien las tablas que se creen manana.
--
-- La aplicacion no usa `anon` para datos: el portal de cliente va por edge functions
-- con `service_role`.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- En produccion hay dos juegos de privilegios por defecto, uno por cada rol que crea
-- tablas (`postgres` y `supabase_admin`), y ambos conceden todo a `anon`. Ese es el
-- origen real: cada tabla nueva nace con permisos para el rol publico.
DO $$
DECLARE
  _rol text;
BEGIN
  FOREACH _rol IN ARRAY ARRAY['postgres', 'supabase_admin']
  LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = _rol);
    BEGIN
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon', _rol);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon', _rol);
      -- Solo el privilegio por defecto, no las funciones ya creadas: ninguna de las
      -- actuales concede EXECUTE a `anon` (verificado), asi que revocar hacia atras no
      -- cambiaria nada y si podria romper algo no previsto. Lo que se ataja es que la
      -- proxima funcion SECURITY DEFINER nazca invocable por el rol publico, que es
      -- exactamente el invariante del que dependen los guardas de la migracion anterior.
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon', _rol);
      RAISE NOTICE 'Privilegios por defecto de % retirados a anon.', _rol;
    EXCEPTION WHEN insufficient_privilege THEN
      -- Alterar los de otro rol exige pertenecer a el. Si no se puede, se avisa en
      -- vez de abortar: el REVOKE sobre las tablas existentes ya ha surtido efecto.
      RAISE WARNING 'Sin permiso para alterar los privilegios por defecto de %. Queda pendiente.', _rol;
    END;
  END LOOP;
END $$;
