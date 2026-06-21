
-- 1. Public catalog view (security definer - exposes only safe fields)
CREATE OR REPLACE VIEW public.public_catalog
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.name,
  p.selling_price,
  p.image_url,
  p.category_id,
  p.business_id,
  p.is_visible,
  p.created_at,
  b.name AS business_name,
  b.phone AS business_phone
FROM public.products p
JOIN public.businesses b ON b.id = p.business_id
WHERE p.is_visible = true AND p.stock_quantity > 0;

GRANT SELECT ON public.public_catalog TO anon, authenticated;

-- 2. Public categories view
CREATE OR REPLACE VIEW public.public_categories
WITH (security_invoker = false) AS
SELECT DISTINCT c.id, c.name
FROM public.categories c
WHERE EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.category_id = c.id AND p.is_visible = true
);

GRANT SELECT ON public.public_categories TO anon, authenticated;

-- 3. Public product images view (only for visible products)
CREATE OR REPLACE VIEW public.public_product_images
WITH (security_invoker = false) AS
SELECT pi.id, pi.product_id, pi.image_url, pi.display_order
FROM public.product_images pi
JOIN public.products p ON p.id = pi.product_id
WHERE p.is_visible = true;

GRANT SELECT ON public.public_product_images TO anon, authenticated;

-- 4. Remove permissive anon policies
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;

-- 5. Re-add product_images SELECT policy for business owners
CREATE POLICY "Business owners can view product images"
ON public.product_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.businesses b ON b.id = p.business_id
    WHERE p.id = product_images.product_id AND b.user_id = auth.uid()
  )
);

-- 6. Fix use_activation_code to verify business ownership
CREATE OR REPLACE FUNCTION public.use_activation_code(p_code text, p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_code_id uuid;
    v_subscription_id uuid;
    v_duration_months integer;
    v_amount integer;
BEGIN
    -- Verify caller owns the business
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: business does not belong to user';
    END IF;

    SELECT id, duration_months, amount INTO v_code_id, v_duration_months, v_amount
    FROM public.activation_codes
    WHERE code = p_code
      AND is_used = false
      AND (expires_at IS NULL OR expires_at > now());

    IF v_code_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.activation_codes
    SET is_used = true,
        used_by_business_id = p_business_id,
        used_at = now()
    WHERE id = v_code_id;

    SELECT id INTO v_subscription_id
    FROM public.subscriptions
    WHERE business_id = p_business_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription_id IS NOT NULL THEN
        UPDATE public.subscriptions
        SET status = 'active',
            plan_id = CASE WHEN v_duration_months = 1 THEN 'monthly' ELSE 'annual' END,
            amount = v_amount,
            currency = 'FC',
            started_at = now(),
            expires_at = now() + (v_duration_months || ' months')::interval
        WHERE id = v_subscription_id;
    END IF;

    RETURN true;
END;
$function$;
