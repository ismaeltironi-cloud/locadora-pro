-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a permissive policy that allows everyone (including anon) to view profiles
CREATE POLICY "Anyone can view profiles for login"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);