ALTER TABLE public.app_settings
ADD CONSTRAINT app_settings_key_organization_unique UNIQUE (key, organization_id);