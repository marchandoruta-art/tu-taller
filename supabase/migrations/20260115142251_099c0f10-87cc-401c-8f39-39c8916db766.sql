-- Allow vehicles to be created without owner (owner_id nullable)
ALTER TABLE public.vehicles ALTER COLUMN owner_id DROP NOT NULL;

-- Drop the foreign key constraint and recreate it to allow null
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.owners(id) ON DELETE SET NULL;