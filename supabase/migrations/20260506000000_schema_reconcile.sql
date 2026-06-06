

ALTER TABLE public.bookings
  ADD COLUMN trip_category trip_category,
  ADD COLUMN district text,
  ADD COLUMN special_requests text;

ALTER TABLE public.chat_threads
  ADD COLUMN last_message text,
  ADD COLUMN tourist_unread int default 0,
  ADD COLUMN guide_unread int default 0;

ALTER TABLE public.reviews
  ADD COLUMN is_guide_review boolean default false;

CREATE TABLE public.payouts (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guide_profiles(id) on delete restrict,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount_npr numeric(12,2) not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides view own payouts" ON public.payouts FOR SELECT TO authenticated USING (auth.uid() = guide_id);
CREATE POLICY "payouts_insert_service" ON public.payouts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
