
-- Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS taxpayer_type text DEFAULT 'nao_contribuinte',
  ADD COLUMN IF NOT EXISTS municipal_registration text,
  ADD COLUMN IF NOT EXISTS state_registration text;
