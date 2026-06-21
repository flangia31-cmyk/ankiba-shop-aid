
-- Tighten storage policies: only the owning business can modify/delete its product images.
-- Path convention: first folder segment = business_id (already used by upload code).
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;

CREATE POLICY "Business owners can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.user_id = auth.uid()
  )
);

-- Lock down subscription self-escalation: users can no longer UPDATE their own subscriptions.
-- All activations/renewals must go through the activate-subscription edge function (service role).
DROP POLICY IF EXISTS "Users can update their business subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their business subscriptions" ON public.subscriptions;

-- Revoke client access to use_activation_code: only service role should call it now.
REVOKE EXECUTE ON FUNCTION public.use_activation_code(text, uuid) FROM PUBLIC, anon, authenticated;
