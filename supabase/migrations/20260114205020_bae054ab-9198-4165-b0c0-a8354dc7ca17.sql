-- Add work_summary field to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS work_summary text;

-- Drop existing owner-related RLS policies to recreate with admin-only access
DROP POLICY IF EXISTS "Authenticated users can view owners" ON public.owners;
DROP POLICY IF EXISTS "Authenticated users can insert owners" ON public.owners;

-- Create policies for owners - only admin can view owner data, but all can insert
CREATE POLICY "Only admin can view owners"
ON public.owners
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert owners"
ON public.owners
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admin can update owners"
ON public.owners
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin can delete owners"
ON public.owners
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));