-- Supabase Vault RPCs for the dashboardy API (PostgREST).
-- Uses a single jsonb `payload` argument — reliable with hosted Supabase.
--
-- If replacing older (text,text,text) or (uuid) signatures, drop those first.

DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(jsonb);
DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(uuid);
DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(jsonb);
DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(text, text, text);

CREATE OR REPLACE FUNCTION public.dashboardy_vault_create_secret(payload jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
AS $$
    SELECT vault.create_secret(
        payload->>'p_secret',
        NULLIF(btrim(payload->>'p_name'), ''),
        COALESCE(btrim(payload->>'p_description'), '')
    );
$$;

CREATE FUNCTION public.dashboardy_vault_read_secret_text(payload jsonb)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
STABLE
AS $$
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE id = (payload->>'p_secret_id')::uuid
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.dashboardy_vault_create_secret(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dashboardy_vault_read_secret_text(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.dashboardy_vault_create_secret(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.dashboardy_vault_read_secret_text(jsonb) TO service_role;

-- PostgREST caches the API schema; without this, new RPCs can 404 until the next reload.
-- See: https://supabase.com/docs/guides/database/vault (use create_secret / wrappers, not raw INSERT)
NOTIFY pgrst, 'reload schema';
