
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'receptionist', 'patient');
CREATE TYPE public.appointment_status AS ENUM ('Scheduled', 'Waiting', 'InConsultation', 'PendingPayment', 'Completed', 'Cancelled');

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ========== DOCTORS ==========
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  bio TEXT,
  working_hours_start TIME NOT NULL DEFAULT '09:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00',
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- ========== SERVICES ==========
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ========== APPOINTMENTS ==========
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'Scheduled',
  notes TEXT,
  walk_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, appointment_date, time_slot)
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- ========== APPOINTMENT SERVICES (billing items) ==========
CREATE TABLE public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  price_at_time NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- ========== PRESCRIPTIONS ==========
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  medications TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- ========== TRIGGERS: auto-create profile + default patient role on signup ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  -- Default new signups to patient role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== RLS POLICIES ==========

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins manage profiles" ON public.profiles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- doctors (publicly listable to authenticated users)
CREATE POLICY "Anyone authenticated views doctors" ON public.doctors
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins manage doctors" ON public.doctors
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors update own record" ON public.doctors
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- services
CREATE POLICY "Anyone authenticated views services" ON public.services
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins manage services" ON public.services
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- appointments
CREATE POLICY "Patients view own appointments" ON public.appointments
FOR SELECT TO authenticated USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
  OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

CREATE POLICY "Patients book own appointments" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Staff and patient update appointments" ON public.appointments
FOR UPDATE TO authenticated USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
  OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

CREATE POLICY "Patient or staff cancel" ON public.appointments
FOR DELETE TO authenticated USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
);

-- appointment_services
CREATE POLICY "View appointment services" ON public.appointment_services
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id AND (
      a.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
      OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = a.doctor_id AND d.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Doctor or staff add services" ON public.appointment_services
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.id = appointment_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Doctor or staff delete services" ON public.appointment_services
FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'receptionist')
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.id = appointment_id AND d.user_id = auth.uid()
  )
);

-- prescriptions
CREATE POLICY "View prescriptions" ON public.prescriptions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id AND (
      a.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = a.doctor_id AND d.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Doctor manages own prescriptions" ON public.prescriptions
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.id = appointment_id AND d.user_id = auth.uid()
  )
);

-- ========== REALTIME ==========
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER TABLE public.appointment_services REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_services;
