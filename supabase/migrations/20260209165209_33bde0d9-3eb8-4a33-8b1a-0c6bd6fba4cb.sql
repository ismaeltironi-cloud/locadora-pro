
-- Add new columns to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS chassis text;
