
-- Add person_type and pessoa física fields to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'juridica',
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text;

-- Make cnpj nullable since pessoa física won't have it
ALTER TABLE public.clients ALTER COLUMN cnpj DROP NOT NULL;
