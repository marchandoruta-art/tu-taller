
CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  _target_user_id uuid,
  _org_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow org admins or org owners to call this
  IF NOT (is_org_admin() AND get_user_organization_id() = _org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE user_id = _target_user_id;

  -- Update user_roles
  UPDATE public.user_roles
  SET organization_id = _org_id
  WHERE user_id = _target_user_id;
END;
$$;
