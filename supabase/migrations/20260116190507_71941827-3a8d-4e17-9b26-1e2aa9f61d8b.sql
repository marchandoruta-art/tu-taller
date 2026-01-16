-- Add INSERT policy for organizations table
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Add DELETE policy for organization owners
CREATE POLICY "Organization owners can delete their org" 
ON public.organizations FOR DELETE 
USING (owner_id = auth.uid());