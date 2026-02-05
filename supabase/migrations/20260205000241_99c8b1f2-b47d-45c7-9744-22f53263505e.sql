-- Drop the existing update policy
DROP POLICY IF EXISTS "Users with permissions can update vehicles" ON public.vehicles;

-- Create separate policies for better control

-- Policy 1: Users with edit permission can update vehicles (except check_out status)
CREATE POLICY "Editors can update non-checkout vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (
  (user_can_edit(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  AND status <> 'check_out'::vehicle_status
);

-- Policy 2: Users with checkin permission can perform check-in (aguardando_entrada -> check_in)
CREATE POLICY "Checkin users can update to checkin status" 
ON public.vehicles 
FOR UPDATE 
USING (
  user_can_checkin(auth.uid()) 
  AND status = 'aguardando_entrada'::vehicle_status
);

-- Policy 3: Users with checkout permission can perform check-out (check_in -> check_out)
CREATE POLICY "Checkout users can update to checkout status" 
ON public.vehicles 
FOR UPDATE 
USING (
  user_can_checkout(auth.uid()) 
  AND status = 'check_in'::vehicle_status
);