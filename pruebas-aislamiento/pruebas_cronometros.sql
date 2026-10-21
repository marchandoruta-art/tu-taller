\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.c(_n text,_ok boolean,_d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,52), _d; END $$;

DO $$
BEGIN
  PERFORM pg_temp.c('auto_stop_vehicle_timers ya no existe',
    NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_stop_vehicle_timers'));
  PERFORM pg_temp.c('la tarea cronometros-parada esta desprogramada',
    NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cronometros-parada'));
  PERFORM pg_temp.c('la columna de la hora de corte ya no esta',
    NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='organizations' AND column_name='vehicle_timer_cutoff'));
END $$;

-- Los festivos ahora quitan dias del formulario de citas.
DO $$
DECLARE
  _org  uuid := '77777777-7777-7777-7777-777777777777';
  _jefe uuid := '66666666-6666-6666-6666-666666666666';
  _lunes date := (date_trunc('week', CURRENT_DATE) + interval '7 days')::date;
  _n integer; _tras integer;
BEGIN
  INSERT INTO auth.users (id,email) VALUES (_jefe,'j@c.local');
  INSERT INTO public.organizations (id,name,slug,owner_id,citas_web_activas,
    citas_dias,citas_desde,citas_hasta,citas_duracion_min,citas_por_franja)
  VALUES (_org,'Taller C','taller-c',_jefe,true,'{1,2,3,4,5}','08:00','10:00',30,1);

  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-c', _lunes, 5);
  PERFORM pg_temp.c('5 dias laborables dan 20 huecos', _n = 20, 'huecos=' || _n);

  INSERT INTO public.organization_holidays (organization_id, date, name)
  VALUES (_org, _lunes, 'Fiesta local');

  SELECT count(*) INTO _tras FROM public.cita_publica_huecos('taller-c', _lunes, 5);
  PERFORM pg_temp.c('al marcar festivo el lunes, quedan 16', _tras = 16, 'huecos=' || _tras);
  PERFORM pg_temp.c('y no se ofrece ninguna hora de ese lunes',
    NOT EXISTS (SELECT 1 FROM public.cita_publica_huecos('taller-c', _lunes, 5) WHERE dia = _lunes));
END $$;
ROLLBACK;
