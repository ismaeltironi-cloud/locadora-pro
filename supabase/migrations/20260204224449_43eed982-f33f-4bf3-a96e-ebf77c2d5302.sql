
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');

-- Create enum for vehicle status
CREATE TYPE public.vehicle_status AS ENUM ('aguardando_entrada', 'check_in', 'check_out', 'cancelado');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_checkin BOOLEAN DEFAULT false,
  can_checkout BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Create clients table (locadoras)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  status vehicle_status DEFAULT 'aguardando_entrada',
  checkin_at TIMESTAMP WITH TIME ZONE,
  checkout_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for plate lookup
CREATE INDEX idx_vehicles_plate ON public.vehicles(plate);

-- Create vehicle_photos table
CREATE TABLE public.vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('checkin', 'checkout')),
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  taken_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check permissions
CREATE OR REPLACE FUNCTION public.user_can_edit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_edit FROM public.user_roles WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_checkin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_checkin FROM public.user_roles WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_checkout(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_checkout FROM public.user_roles WHERE user_id = _user_id),
    false
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clients
CREATE POLICY "All users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users with edit can manage clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.user_can_edit(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users with edit can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.user_can_edit(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vehicles
CREATE POLICY "All users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users with edit can manage vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.user_can_edit(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users with edit can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (
  (public.user_can_edit(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  AND status != 'check_out'
);
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vehicle_photos
CREATE POLICY "All users can view photos" ON public.vehicle_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users with checkin can add checkin photos" ON public.vehicle_photos FOR INSERT TO authenticated WITH CHECK (
  (photo_type = 'checkin' AND public.user_can_checkin(auth.uid()))
  OR (photo_type = 'checkout' AND public.user_can_checkout(auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime for vehicles and vehicle_photos
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

-- Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true);

-- Storage policies
CREATE POLICY "Authenticated users can view photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos');

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
