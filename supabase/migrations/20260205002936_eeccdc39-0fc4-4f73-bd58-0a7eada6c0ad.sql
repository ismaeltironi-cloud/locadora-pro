-- Add tow truck (guincho) field to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN needs_tow BOOLEAN DEFAULT false;