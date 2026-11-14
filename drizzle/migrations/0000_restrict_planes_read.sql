DROP POLICY IF EXISTS "Los planes se pueden consultar" ON public.planes;

CREATE POLICY "Cada taller ve solo su plan"
ON public.planes
FOR SELECT
TO authenticated
USING (
  codigo = (
    SELECT o.plan FROM public.organizations o
    WHERE o.id = public.get_user_organization_id(auth.uid())
  )
  OR public.es_propietario_plataforma(auth.uid())
);