-- Add amount column to activation_codes table for different subscription types
ALTER TABLE public.activation_codes 
ADD COLUMN amount integer NOT NULL DEFAULT 10000,
ADD COLUMN duration_months integer NOT NULL DEFAULT 12;