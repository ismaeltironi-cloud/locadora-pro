
-- Create secure RPC for username-to-email resolution (used by login page)
CREATE OR REPLACE FUNCTION public.get_email_for_login(_username TEXT)
RETURNS TABLE(email TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE username = lower(trim(_username))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_login TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_for_login TO authenticated;

-- Remove public SELECT policies
DROP POLICY IF EXISTS "Public can view clients" ON public.clients;
DROP POLICY IF EXISTS "Public can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can view profiles for login" ON public.profiles;

-- Restrict to authenticated users only
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);
