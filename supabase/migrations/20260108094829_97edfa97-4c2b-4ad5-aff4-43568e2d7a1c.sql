-- Drop and recreate the function with correct syntax
DROP FUNCTION IF EXISTS public.use_activation_code(text, uuid);

CREATE OR REPLACE FUNCTION public.use_activation_code(p_code TEXT, p_business_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code_id uuid;
    v_subscription_id uuid;
BEGIN
    -- Find valid unused code
    SELECT id INTO v_code_id
    FROM public.activation_codes
    WHERE code = p_code
      AND is_used = false
      AND (expires_at IS NULL OR expires_at > now());
    
    IF v_code_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Mark code as used
    UPDATE public.activation_codes
    SET is_used = true,
        used_by_business_id = p_business_id,
        used_at = now()
    WHERE id = v_code_id;
    
    -- Find the latest subscription for this business
    SELECT id INTO v_subscription_id
    FROM public.subscriptions
    WHERE business_id = p_business_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Activate subscription
    IF v_subscription_id IS NOT NULL THEN
        UPDATE public.subscriptions
        SET status = 'active',
            started_at = now(),
            expires_at = now() + INTERVAL '1 year'
        WHERE id = v_subscription_id;
    END IF;
    
    RETURN true;
END;
$$;