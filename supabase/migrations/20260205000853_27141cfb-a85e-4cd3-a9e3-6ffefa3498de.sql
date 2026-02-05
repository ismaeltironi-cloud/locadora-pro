-- Drop all existing update policies for vehicles
DROP POLICY IF EXISTS "Editors can update non-checkout vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Checkin users can update to checkin status" ON public.vehicles;
DROP POLICY IF EXISTS "Checkout users can update to checkout status" ON public.vehicles;

-- Create a single comprehensive update policy with proper USING and WITH CHECK
CREATE POLICY "Users can update vehicles based on permissions" 
ON public.vehicles 
FOR UPDATE 
USING (
  -- Can update if: admin, or has edit permission, or has checkin/checkout permission for the current status
  has_role(auth.uid(), 'admin'::app_role)
  OR user_can_edit(auth.uid())
  OR (user_can_checkin(auth.uid()) AND status = 'aguardando_entrada'::vehicle_status)
  OR (user_can_checkout(auth.uid()) AND status = 'check_in'::vehicle_status)
)
WITH CHECK (
  -- Allow the update if:
  -- 1. Admin can do anything except edit check_out vehicles (unless changing to check_out)
  -- 2. Editors can update non-checkout vehicles
  -- 3. Checkin users can change to check_in status
  -- 4. Checkout users can change to check_out status
  has_role(auth.uid(), 'admin'::app_role)
  OR (user_can_edit(auth.uid()) AND status <> 'check_out'::vehicle_status)
  OR (user_can_checkin(auth.uid()) AND status = 'check_in'::vehicle_status)
  OR (user_can_checkout(auth.uid()) AND status = 'check_out'::vehicle_status)
);