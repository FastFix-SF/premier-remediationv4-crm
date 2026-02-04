-- Migration: Add admin authentication tables for multi-tenant CRM login
-- These tables support phone OTP login for tenant owners/admins
-- Required for register-tenant-user function to work

-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_phone ON public.admin_users(phone);

-- Enable RLS but allow all operations (service role handles access)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid errors
DROP POLICY IF EXISTS "Service role full access to admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to read their own admin_users entry" ON public.admin_users;
DROP POLICY IF EXISTS "Allow service role full access" ON public.admin_users;

-- Create policies for admin_users
CREATE POLICY "Service role full access to admin_users" ON public.admin_users
  FOR ALL USING (true) WITH CHECK (true);

-- Create mt_team_directory table for team member management with multi-tenant support
-- This table links auth users to tenants (businesses) with specific roles
-- Note: Named mt_team_directory to avoid conflict with existing team_directory table
CREATE TABLE IF NOT EXISTS public.mt_team_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tenant_id UUID,  -- References business ID (tenant)
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'sales_rep', 'technician', 'viewer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt_team_directory_user_id ON public.mt_team_directory(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_team_directory_tenant_id ON public.mt_team_directory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_team_directory_phone ON public.mt_team_directory(phone);
CREATE INDEX IF NOT EXISTS idx_mt_team_directory_email ON public.mt_team_directory(email);

-- Composite unique constraint: one user per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mt_team_directory_tenant_user_unique'
  ) THEN
    ALTER TABLE public.mt_team_directory
      ADD CONSTRAINT mt_team_directory_tenant_user_unique UNIQUE (tenant_id, user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.mt_team_directory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access to mt_team_directory" ON public.mt_team_directory;
DROP POLICY IF EXISTS "Users can read their own mt_team_directory entries" ON public.mt_team_directory;

-- Create policies for mt_team_directory
CREATE POLICY "Service role full access to mt_team_directory" ON public.mt_team_directory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their own mt_team_directory entries" ON public.mt_team_directory
  FOR SELECT USING (auth.uid() = user_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mt_team_directory_updated_at ON public.mt_team_directory;
CREATE TRIGGER update_mt_team_directory_updated_at
  BEFORE UPDATE ON public.mt_team_directory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for compatibility (team_directory alias pointing to mt_team_directory)
-- This allows existing code to use either name
CREATE OR REPLACE VIEW public.team_directory AS
SELECT
  id,
  user_id,
  tenant_id,
  name,
  email,
  phone,
  role,
  status,
  created_at,
  updated_at
FROM public.mt_team_directory;

-- Enable inserts/updates through the view
CREATE OR REPLACE RULE team_directory_insert AS ON INSERT TO public.team_directory
DO INSTEAD INSERT INTO public.mt_team_directory (user_id, tenant_id, name, email, phone, role, status)
VALUES (NEW.user_id, NEW.tenant_id, NEW.name, NEW.email, NEW.phone, NEW.role, NEW.status)
RETURNING *;

CREATE OR REPLACE RULE team_directory_update AS ON UPDATE TO public.team_directory
DO INSTEAD UPDATE public.mt_team_directory
SET user_id = NEW.user_id,
    tenant_id = NEW.tenant_id,
    name = NEW.name,
    email = NEW.email,
    phone = NEW.phone,
    role = NEW.role,
    status = NEW.status,
    updated_at = NOW()
WHERE id = OLD.id
RETURNING *;
