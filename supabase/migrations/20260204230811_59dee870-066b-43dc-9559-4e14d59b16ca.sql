-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Update existing profiles to use email prefix as default username
UPDATE public.profiles SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;