
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "All users can view clients" ON public.clients;
DROP POLICY IF EXISTS "All users can view vehicles" ON public.vehicles;

-- Create permissive public SELECT policies (no auth required)
CREATE POLICY "Public can view clients"
ON public.clients
FOR SELECT
USING (true);

CREATE POLICY "Public can view vehicles"
ON public.vehicles
FOR SELECT
USING (true);
