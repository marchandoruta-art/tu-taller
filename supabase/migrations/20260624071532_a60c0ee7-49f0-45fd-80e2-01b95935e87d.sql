GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

GRANT SELECT, DELETE ON public.vehicle_archives TO authenticated;
GRANT ALL ON public.vehicle_archives TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owners TO authenticated;
GRANT ALL ON public.owners TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_logs TO authenticated;
GRANT ALL ON public.time_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_status_history TO authenticated;
GRANT ALL ON public.vehicle_status_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_anomalies TO authenticated;
GRANT ALL ON public.vehicle_anomalies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_messages TO authenticated;
GRANT ALL ON public.vehicle_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_photos TO authenticated;
GRANT ALL ON public.vehicle_photos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_files TO authenticated;
GRANT ALL ON public.vehicle_files TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;