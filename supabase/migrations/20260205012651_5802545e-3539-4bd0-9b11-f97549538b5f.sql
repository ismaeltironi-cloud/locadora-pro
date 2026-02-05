-- Add km column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN km integer NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.km IS 'Quilometragem do veículo';