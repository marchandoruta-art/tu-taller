-- =============================================
-- MULTI-TENANCY: Aislamiento completo de datos por organización
-- =============================================

-- 1. Crear tabla de organizaciones
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL
);

-- Habilitar RLS en organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Añadir organization_id a profiles
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Añadir organization_id a user_roles
ALTER TABLE public.user_roles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Añadir organization_id a todas las tablas de datos
ALTER TABLE public.vehicles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.owners ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.parts ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.time_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_photos ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_files ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_messages ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_anomalies ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scheduled_deliveries ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Función SECURITY DEFINER para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 6. Función para verificar si usuario pertenece a organización
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 7. Función para verificar si usuario es admin de su organización
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id AND ur.organization_id = p.organization_id
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;

-- =============================================
-- ELIMINAR TODAS LAS POLÍTICAS ANTIGUAS
-- =============================================

-- organizations (nueva tabla, no tiene políticas)

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- user_roles
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- vehicles
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Only admin can delete vehicles" ON public.vehicles;

-- owners
DROP POLICY IF EXISTS "Only admin can view owners" ON public.owners;
DROP POLICY IF EXISTS "Authenticated users can insert owners" ON public.owners;
DROP POLICY IF EXISTS "Authenticated users can update owners" ON public.owners;
DROP POLICY IF EXISTS "Only admin can update owners" ON public.owners;
DROP POLICY IF EXISTS "Only admin can delete owners" ON public.owners;

-- parts
DROP POLICY IF EXISTS "Authenticated users can view parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can delete parts" ON public.parts;

-- time_logs
DROP POLICY IF EXISTS "Authenticated users can view time_logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can insert own time_logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can update own time_logs" ON public.time_logs;

-- attendance_logs
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance_logs;

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- vehicle_photos
DROP POLICY IF EXISTS "Anyone authenticated can view vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Anyone authenticated can insert vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Anyone authenticated can update vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Anyone authenticated can delete vehicle photos" ON public.vehicle_photos;

-- vehicle_files
DROP POLICY IF EXISTS "Authenticated users can view files" ON public.vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can insert files" ON public.vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON public.vehicle_files;

-- vehicle_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.vehicle_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.vehicle_messages;

-- vehicle_anomalies
DROP POLICY IF EXISTS "Authenticated users can view anomalies" ON public.vehicle_anomalies;
DROP POLICY IF EXISTS "Authenticated users can insert anomalies" ON public.vehicle_anomalies;
DROP POLICY IF EXISTS "Authenticated users can update anomalies" ON public.vehicle_anomalies;
DROP POLICY IF EXISTS "Authenticated users can delete anomalies" ON public.vehicle_anomalies;

-- scheduled_deliveries
DROP POLICY IF EXISTS "Anyone authenticated can view scheduled deliveries" ON public.scheduled_deliveries;
DROP POLICY IF EXISTS "Anyone authenticated can insert scheduled deliveries" ON public.scheduled_deliveries;
DROP POLICY IF EXISTS "Anyone authenticated can update scheduled deliveries" ON public.scheduled_deliveries;
DROP POLICY IF EXISTS "Anyone authenticated can delete scheduled deliveries" ON public.scheduled_deliveries;

-- app_settings
DROP POLICY IF EXISTS "Admins can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;

-- =============================================
-- CREAR NUEVAS POLÍTICAS CON AISLAMIENTO
-- =============================================

-- ORGANIZATIONS
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "Anyone can create organization during signup"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

-- PROFILES (con aislamiento por organización)
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can manage profiles"
  ON public.profiles FOR ALL
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- USER_ROLES (con aislamiento por organización)
CREATE POLICY "Users can view roles in their org"
  ON public.user_roles FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "Org admins can manage roles"
  ON public.user_roles FOR ALL
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "Allow insert during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- VEHICLES
CREATE POLICY "Org users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org admins can delete vehicles"
  ON public.vehicles FOR DELETE
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- OWNERS
CREATE POLICY "Org users can view owners"
  ON public.owners FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert owners"
  ON public.owners FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update owners"
  ON public.owners FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org admins can delete owners"
  ON public.owners FOR DELETE
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- PARTS
CREATE POLICY "Org users can view parts"
  ON public.parts FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert parts"
  ON public.parts FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update parts"
  ON public.parts FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can delete parts"
  ON public.parts FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- TIME_LOGS
CREATE POLICY "Org users can view time_logs"
  ON public.time_logs FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert time_logs"
  ON public.time_logs FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

CREATE POLICY "Users can update own time_logs"
  ON public.time_logs FOR UPDATE
  USING (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

-- ATTENDANCE_LOGS
CREATE POLICY "Users can view own attendance in org"
  ON public.attendance_logs FOR SELECT
  USING (organization_id = public.get_user_organization_id() AND (auth.uid() = user_id OR public.is_org_admin()));

CREATE POLICY "Users can insert own attendance"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON public.attendance_logs FOR UPDATE
  USING (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications in org"
  ON public.notifications FOR SELECT
  USING (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

CREATE POLICY "Org users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (organization_id = public.get_user_organization_id() AND auth.uid() = user_id);

-- VEHICLE_PHOTOS
CREATE POLICY "Org users can view vehicle photos"
  ON public.vehicle_photos FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert vehicle photos"
  ON public.vehicle_photos FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update vehicle photos"
  ON public.vehicle_photos FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can delete vehicle photos"
  ON public.vehicle_photos FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- VEHICLE_FILES
CREATE POLICY "Org users can view vehicle files"
  ON public.vehicle_files FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert vehicle files"
  ON public.vehicle_files FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can delete vehicle files"
  ON public.vehicle_files FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- VEHICLE_MESSAGES
CREATE POLICY "Org users can view vehicle messages"
  ON public.vehicle_messages FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert vehicle messages"
  ON public.vehicle_messages FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

-- VEHICLE_ANOMALIES
CREATE POLICY "Org users can view vehicle anomalies"
  ON public.vehicle_anomalies FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert vehicle anomalies"
  ON public.vehicle_anomalies FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update vehicle anomalies"
  ON public.vehicle_anomalies FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can delete vehicle anomalies"
  ON public.vehicle_anomalies FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- SCHEDULED_DELIVERIES
CREATE POLICY "Org users can view scheduled deliveries"
  ON public.scheduled_deliveries FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can insert scheduled deliveries"
  ON public.scheduled_deliveries FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can update scheduled deliveries"
  ON public.scheduled_deliveries FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org users can delete scheduled deliveries"
  ON public.scheduled_deliveries FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- APP_SETTINGS
CREATE POLICY "Org admins can view app settings"
  ON public.app_settings FOR SELECT
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "Org admins can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "Org admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "Org admins can delete app settings"
  ON public.app_settings FOR DELETE
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- =============================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_organization ON public.owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_parts_organization ON public.parts(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_organization ON public.time_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_organization ON public.attendance_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_organization ON public.vehicle_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_files_organization ON public.vehicle_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_messages_organization ON public.vehicle_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_anomalies_organization ON public.vehicle_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_deliveries_organization ON public.scheduled_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_organization ON public.app_settings(organization_id);

-- Trigger para actualizar updated_at en organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();