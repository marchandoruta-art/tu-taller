DO $$
DECLARE _c integer;
BEGIN
  SELECT public.auto_stop_vehicle_timers() INTO _c;
  RAISE NOTICE 'auto_stop_vehicle_timers closed % timers', _c;
END $$;