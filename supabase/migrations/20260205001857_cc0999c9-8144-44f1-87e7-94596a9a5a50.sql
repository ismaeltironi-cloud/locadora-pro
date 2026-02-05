-- Add defect description field to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN defect_description TEXT;