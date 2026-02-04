-- Drop the existing update policy
DROP POLICY IF EXISTS "Users with edit can update vehicles" ON public.vehicles;

-- Create a new policy that also allows checkout users to update status to check_out
CREATE POLICY "Users with permissions can update vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (
  (
    -- Users with edit or admin can update any vehicle not in check_out status
    ((user_can_edit(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) AND (status <> 'check_out'::vehicle_status))
    OR
    -- Users with checkin permission can update vehicles from aguardando_entrada to check_in
    (user_can_checkin(auth.uid()) AND status = 'aguardando_entrada'::vehicle_status)
    OR
    -- Users with checkout permission can update vehicles from check_in to check_out  
    (user_can_checkout(auth.uid()) AND status = 'check_in'::vehicle_status)
  )
);