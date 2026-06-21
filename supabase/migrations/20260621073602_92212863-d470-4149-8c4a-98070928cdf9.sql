-- Restore Data API grants revoked during security hardening.
-- Auth-only tables (every policy scopes to auth.uid() or has_role).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;

-- Subscriptions: read by owner via RLS; writes go through edge functions (service_role).
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Activation codes: managed by admin (RLS) and edge functions.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;

-- User roles: read by user (RLS) and admin; writes by admin only via RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Public-facing views (catalogue, anonymous browsing).
GRANT SELECT ON public.public_catalog TO anon, authenticated;
GRANT SELECT ON public.public_categories TO anon, authenticated;
GRANT SELECT ON public.public_product_images TO anon, authenticated;

-- Function execute permissions needed by triggers / edge functions / clients.
GRANT EXECUTE ON FUNCTION public.use_activation_code(text, uuid) TO authenticated;