-- Add visibility column to products table
ALTER TABLE public.products 
ADD COLUMN is_visible boolean NOT NULL DEFAULT true;