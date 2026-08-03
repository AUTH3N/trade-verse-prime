-- 1. SECURITY DEFINER function exposure
-- Trigger-only functions must never be callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

-- has_role must stay callable by signed-in users (used by RLS policies /
-- server functions acting as the user), but not by anonymous callers.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. otp_codes: server-only table (service role / admin client access only)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.otp_codes FROM anon, authenticated;
GRANT ALL ON TABLE public.otp_codes TO service_role;

DROP POLICY IF EXISTS "otp_codes_no_client_access" ON public.otp_codes;
CREATE POLICY "otp_codes_no_client_access"
  ON public.otp_codes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3. user_roles: read-own only; writes reserved for trusted server-side code
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM anon, authenticated;
REVOKE SELECT ON TABLE public.user_roles FROM anon;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

DROP POLICY IF EXISTS "user_roles_no_client_insert" ON public.user_roles;
CREATE POLICY "user_roles_no_client_insert"
  ON public.user_roles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_client_update" ON public.user_roles;
CREATE POLICY "user_roles_no_client_update"
  ON public.user_roles
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_client_delete" ON public.user_roles;
CREATE POLICY "user_roles_no_client_delete"
  ON public.user_roles
  FOR DELETE
  TO anon, authenticated
  USING (false);