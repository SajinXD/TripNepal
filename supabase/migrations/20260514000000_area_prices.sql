

ALTER TABLE public.guide_profiles
  ADD COLUMN IF NOT EXISTS area_prices jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_areas text[] DEFAULT '{}';