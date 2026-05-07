
-- Revoke EXECUTE from anon and public on all SECURITY DEFINER functions in public schema.
-- These functions are used internally by RLS/triggers (which bypass EXECUTE grants when SECURITY DEFINER)
-- or are RPCs that should only be callable by authenticated users.

-- Helper functions used by RLS / triggers — no API exposure needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_organization_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vehicle_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_delivered_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vehicle_completed_push() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_old_delivered_vehicles() FROM PUBLIC, anon, authenticated;

-- RPCs callable from the app — only authenticated users
REVOKE EXECUTE ON FUNCTION public.assign_user_to_organization(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_today_appointments() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_workshop_contact_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lookup_organization_by_slug(text) FROM PUBLIC, anon;

-- Re-grant explicitly to authenticated where the app needs to call via RPC
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_today_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workshop_contact_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_organization_by_slug(text) TO authenticated;
