-- Create enum for roles (if not exists workaround)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'client');
    END IF;
END$$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (if not exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
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

-- Drop policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create activation_codes table if not exists
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_by_business_id uuid REFERENCES public.businesses(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on activation_codes
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for activation_codes
DROP POLICY IF EXISTS "Admins can view all activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Admins can create activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Admins can update activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Admins can delete activation codes" ON public.activation_codes;

-- Policy: Admins can view all codes
CREATE POLICY "Admins can view all activation codes"
ON public.activation_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can create codes
CREATE POLICY "Admins can create activation codes"
ON public.activation_codes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update codes
CREATE POLICY "Admins can update activation codes"
ON public.activation_codes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can delete codes
CREATE POLICY "Admins can delete activation codes"
ON public.activation_codes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert first admin user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('c4417e82-319e-488c-97c4-ba0176dfdf8e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;