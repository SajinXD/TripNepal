-- ============================================================
-- MIGRATION: 20260101000002_rls_policies.sql
-- Trip Nepal — Row Level Security Policies
-- ============================================================

-- Enable RLS on all user-facing tables
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Check if caller is admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone authenticated can read profiles (guides are public)
CREATE POLICY "profiles_read_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only the owner can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger will handle INSERT (see migration 3)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin can do anything
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- GUIDE PROFILES
-- ============================================================

CREATE POLICY "guide_profiles_read_all"
  ON public.guide_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "guide_profiles_update_own"
  ON public.guide_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "guide_profiles_insert_own"
  ON public.guide_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "guide_profiles_admin_all"
  ON public.guide_profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- KYC VERIFICATIONS
-- ============================================================

-- Guide can see their own KYC
CREATE POLICY "kyc_select_own"
  ON public.kyc_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Guide can insert their own KYC
CREATE POLICY "kyc_insert_own"
  ON public.kyc_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only service role (Edge Functions) or admin can update
CREATE POLICY "kyc_update_admin_or_service"
  ON public.kyc_verifications FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- DESTINATIONS — public read
-- ============================================================

CREATE POLICY "destinations_read_all"
  ON public.destinations FOR SELECT
  USING (TRUE);

CREATE POLICY "destinations_admin_write"
  ON public.destinations FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- TRIP PLANS
-- ============================================================

CREATE POLICY "trip_plans_select_own"
  ON public.trip_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "trip_plans_insert_own"
  ON public.trip_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trip_plans_update_own"
  ON public.trip_plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "trip_plans_delete_own"
  ON public.trip_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- BOOKINGS
-- ============================================================

-- Tourist can see their own bookings; guide can see bookings assigned to them
CREATE POLICY "bookings_select_participant"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    tourist_id = auth.uid()
    OR guide_id = auth.uid()
    OR public.is_admin()
  );

-- Only tourists can create bookings (guide_id is server-validated)
CREATE POLICY "bookings_insert_tourist"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (tourist_id = auth.uid());

-- Updates go through Edge Functions (service role), but allow participant updates too
CREATE POLICY "bookings_update_participant"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    tourist_id = auth.uid()
    OR guide_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE POLICY "transactions_select_participant"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- Inserts only via service role (Edge Functions use service key)
CREATE POLICY "transactions_insert_service"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());



-- ============================================================
-- CHAT THREADS
-- ============================================================

CREATE POLICY "chat_threads_participant"
  ON public.chat_threads FOR ALL
  TO authenticated
  USING (
    tourist_id = auth.uid()
    OR guide_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- CHAT MESSAGES
-- ============================================================

-- Read: only thread participants
CREATE POLICY "chat_messages_read_participant"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = thread_id
        AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())
    )
    OR public.is_admin()
  );

-- Write: sender must be a thread participant
CREATE POLICY "chat_messages_insert_participant"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = thread_id
        AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())
    )
  );

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE POLICY "reviews_read_all"
  ON public.reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- PUSH TOKENS
-- ============================================================

CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
