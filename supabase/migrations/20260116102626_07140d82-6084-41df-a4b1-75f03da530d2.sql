-- Actualizar el trigger de nuevo usuario para NO asignar organización automáticamente
-- La organización se asigna manualmente en el flujo de onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Solo crear perfil básico sin organización
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    -- Crear rol por defecto sin organización (se asigna en onboarding)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mecanico');
    
    RETURN NEW;
END;
$$;