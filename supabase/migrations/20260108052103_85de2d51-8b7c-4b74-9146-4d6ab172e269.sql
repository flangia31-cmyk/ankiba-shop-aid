-- Add activation_code column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS activation_code TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Create a function to set trial period on business creation
CREATE OR REPLACE FUNCTION public.set_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    business_id,
    plan_id,
    amount,
    status,
    started_at,
    trial_ends_at,
    expires_at
  ) VALUES (
    NEW.id,
    'trial',
    0,
    'trial',
    now(),
    now() + INTERVAL '1 month',
    now() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create trial subscription when business is created
DROP TRIGGER IF EXISTS create_trial_subscription ON public.businesses;
CREATE TRIGGER create_trial_subscription
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_subscription();

-- Make products table readable by everyone (for public catalog)
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
TO anon
USING (true);

-- Make businesses table readable by everyone (for public catalog)
CREATE POLICY "Anyone can view businesses" 
ON public.businesses 
FOR SELECT 
TO anon
USING (true);

-- Make categories readable by everyone
CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
TO anon
USING (true);