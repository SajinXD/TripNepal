-- ============================================================================
-- Trip Nepal — Complete Database Setup
-- Paste the entire file into the Supabase SQL Editor and run once.
-- Safe to re-run on a FRESH database (drops everything first).
-- ============================================================================

-- ============================================================================
-- SECTION 0: CLEANUP — drop all existing objects
-- Note: Drop tables CASCADE first — this automatically removes all their
-- triggers and indexes. Only the auth.users trigger needs explicit drop.
-- ============================================================================

-- This trigger lives on auth.users (which we never drop), so drop it explicitly.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables in reverse dependency order (CASCADE removes triggers + indexes).
DROP TABLE IF EXISTS public.push_tokens         CASCADE;
DROP TABLE IF EXISTS public.notifications       CASCADE;
DROP TABLE IF EXISTS public.payouts             CASCADE;
DROP TABLE IF EXISTS public.transactions        CASCADE;
DROP TABLE IF EXISTS public.chat_messages       CASCADE;
DROP TABLE IF EXISTS public.chat_threads        CASCADE;
DROP TABLE IF EXISTS public.chat_requests       CASCADE;
DROP TABLE IF EXISTS public.reviews             CASCADE;
DROP TABLE IF EXISTS public.bookings            CASCADE;
DROP TABLE IF EXISTS public.saved_destinations  CASCADE;
DROP TABLE IF EXISTS public.destinations        CASCADE;
DROP TABLE IF EXISTS public.trip_plans          CASCADE;
DROP TABLE IF EXISTS public.kyc_documents       CASCADE;
DROP TABLE IF EXISTS public.kyc_verifications   CASCADE;
DROP TABLE IF EXISTS public.guide_profiles      CASCADE;
DROP TABLE IF EXISTS public.profiles            CASCADE;

-- Drop functions after tables (no dependent triggers remain).
DROP FUNCTION IF EXISTS public.handle_new_user()         CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS public.update_guide_rating()     CASCADE;
DROP FUNCTION IF EXISTS public.recalc_guide_rating()     CASCADE;
DROP FUNCTION IF EXISTS public.handle_booking_completed() CASCADE;
DROP FUNCTION IF EXISTS public.update_chat_thread_on_message() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin()                CASCADE;
DROP FUNCTION IF EXISTS public.create_booking_with_thread(uuid,uuid,uuid,date,date,time,smallint,trip_category,text,text,numeric,numeric,numeric,numeric) CASCADE;
DROP FUNCTION IF EXISTS public.search_guides(text,text[],numeric,trip_category[],float,float,int) CASCADE;
DROP FUNCTION IF EXISTS public.nearby_destinations(float,float,int) CASCADE;
DROP FUNCTION IF EXISTS public.guide_dashboard_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.complete_booking_and_release_payout(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(uuid) CASCADE;

DROP TYPE IF EXISTS public.user_role       CASCADE;
DROP TYPE IF EXISTS public.kyc_status      CASCADE;
DROP TYPE IF EXISTS public.booking_status  CASCADE;
DROP TYPE IF EXISTS public.payment_status  CASCADE;
DROP TYPE IF EXISTS public.trip_category   CASCADE;
DROP TYPE IF EXISTS public.document_type   CASCADE;

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- SECTION 2: ENUMS
-- ============================================================================

CREATE TYPE public.user_role      AS ENUM ('tourist', 'guide', 'admin');
CREATE TYPE public.kyc_status     AS ENUM ('not_submitted', 'pending', 'approved', 'rejected', 'resubmit');
CREATE TYPE public.booking_status AS ENUM ('requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE public.trip_category  AS ENUM ('trekking', 'cultural', 'adventure', 'wildlife', 'spiritual', 'sightseeing', 'food', 'photography', 'local', 'other');
CREATE TYPE public.document_type  AS ENUM ('citizenship', 'passport', 'driving_license', 'guide_license', 'selfie');

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS (needed before triggers)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================================================
-- SECTION 4: TABLES
-- ============================================================================

-- PROFILES
CREATE TABLE public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               public.user_role NOT NULL DEFAULT 'tourist',
  full_name          text NOT NULL,
  phone              text UNIQUE,
  email              text UNIQUE,
  avatar_url         text,
  date_of_birth      date,
  gender             text CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en','ne')),
  country            text,
  bio                text,
  is_active          boolean DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX idx_profiles_role  ON public.profiles(role);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);

-- KYC VERIFICATIONS
CREATE TABLE public.kyc_verifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              public.kyc_status NOT NULL DEFAULT 'not_submitted',
  full_name_legal     text NOT NULL,
  citizenship_number  text,
  passport_number     text,
  date_of_birth       date NOT NULL,
  permanent_address   text NOT NULL,
  current_address     text,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES public.profiles(id),
  rejection_reason    text,
  resubmission_count  int DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX idx_kyc_status ON public.kyc_verifications(status);
CREATE INDEX idx_kyc_user   ON public.kyc_verifications(user_id);

-- KYC DOCUMENTS
CREATE TABLE public.kyc_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_id          uuid NOT NULL REFERENCES public.kyc_verifications(id) ON DELETE CASCADE,
  document_type   public.document_type NOT NULL,
  file_url        text NOT NULL,
  file_size_bytes int,
  mime_type       text,
  uploaded_at     timestamptz DEFAULT now()
);
CREATE INDEX idx_kyc_docs_kyc ON public.kyc_documents(kyc_id);

-- GUIDE PROFILES
CREATE TABLE public.guide_profiles (
  id                      uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  years_of_experience     int DEFAULT 0,
  guide_license_number    text UNIQUE,
  license_expiry_date     date,
  bio_long                text,
  languages_spoken        text[] DEFAULT '{english}',
  specializations         public.trip_category[] DEFAULT '{sightseeing}',
  service_areas           text[] DEFAULT '{}',
  price_per_hour          numeric(10,2),
  price_per_day           numeric(10,2),
  price_per_trek_day      numeric(10,2),
  min_booking_hours       int DEFAULT 2,
  is_online               boolean DEFAULT false,
  is_verified             boolean DEFAULT false,
  current_lat             double precision,
  current_lng             double precision,
  last_location_update    timestamptz,
  total_trips_completed   int DEFAULT 0,
  average_rating          numeric(3,2) DEFAULT 0,
  total_reviews           int DEFAULT 0,
  total_earnings          numeric(12,2) DEFAULT 0,
  response_time_minutes   int,
  acceptance_rate         numeric(5,2),
  price_negotiable        boolean DEFAULT false,
  ntb_license_url         text,
  ntb_license_status      text DEFAULT 'not_submitted',
  area_prices             jsonb DEFAULT '{}'::jsonb,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
CREATE INDEX idx_guide_online    ON public.guide_profiles(is_online) WHERE is_online = true;
CREATE INDEX idx_guide_verified  ON public.guide_profiles(is_verified);
CREATE INDEX idx_guide_areas     ON public.guide_profiles USING gin(service_areas);
CREATE INDEX idx_guide_languages ON public.guide_profiles USING gin(languages_spoken);
CREATE INDEX idx_guide_location  ON public.guide_profiles(current_lat, current_lng);

-- DESTINATIONS
CREATE TABLE public.destinations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text UNIQUE NOT NULL,
  description             text,
  short_description       text,
  district                text NOT NULL,
  province                text,
  category                public.trip_category[] DEFAULT '{sightseeing}',
  latitude                double precision NOT NULL,
  longitude               double precision NOT NULL,
  altitude_m              int,
  cover_image_url         text,
  gallery_urls            text[],
  best_season             text[],
  difficulty_level        text CHECK (difficulty_level IN ('easy','moderate','hard','expert')),
  estimated_duration_hours int,
  entry_fee_npr           numeric(10,2),
  estimated_cost_npr      numeric(10,2),
  tags                    text[],
  is_featured             boolean DEFAULT false,
  is_active               boolean DEFAULT true,
  view_count              int DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
CREATE INDEX idx_dest_district ON public.destinations(district);
CREATE INDEX idx_dest_featured ON public.destinations(is_featured) WHERE is_featured = true;
CREATE INDEX idx_dest_category ON public.destinations USING gin(category);
CREATE INDEX idx_dest_tags     ON public.destinations USING gin(tags);
CREATE INDEX idx_dest_search   ON public.destinations USING gin(name gin_trgm_ops);
CREATE INDEX idx_dest_location ON public.destinations(latitude, longitude);

-- SAVED DESTINATIONS
CREATE TABLE public.saved_destinations (
  user_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE CASCADE,
  saved_at       timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, destination_id)
);

-- TRIP PLANS
CREATE TABLE public.trip_plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                   text NOT NULL,
  start_date              date,
  end_date                date,
  total_days              int NOT NULL,
  budget_npr              numeric(12,2),
  travelers_count         int DEFAULT 1,
  trip_categories         public.trip_category[] DEFAULT '{sightseeing}',
  preferred_districts     text[],
  special_requests        text,
  itinerary               jsonb NOT NULL DEFAULT '[]',
  estimated_total_cost_npr numeric(12,2),
  ai_model                text DEFAULT 'claude-3-5-sonnet',
  ai_generated_at         timestamptz DEFAULT now(),
  is_saved                boolean DEFAULT true,
  is_shared               boolean DEFAULT false,
  share_token             text UNIQUE,
  booked_guide_id         uuid REFERENCES public.guide_profiles(id),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
CREATE INDEX idx_trip_plans_user  ON public.trip_plans(user_id);
CREATE INDEX idx_trip_plans_share ON public.trip_plans(share_token) WHERE share_token IS NOT NULL;

-- BOOKINGS
CREATE TABLE public.bookings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  guide_id             uuid NOT NULL REFERENCES public.guide_profiles(id) ON DELETE RESTRICT,
  trip_plan_id         uuid REFERENCES public.trip_plans(id),
  start_date           date NOT NULL,
  end_date             date NOT NULL,
  start_time           time,
  pickup_location      text,
  pickup_lat           double precision,
  pickup_lng           double precision,
  destinations         uuid[],
  travelers_count      int DEFAULT 1,
  special_notes        text,
  special_requests     text,
  trip_category        public.trip_category,
  district             text,
  hourly_rate_npr      numeric(10,2),
  daily_rate_npr       numeric(10,2),
  total_hours          numeric(6,2),
  total_days           int,
  subtotal_npr         numeric(12,2) NOT NULL,
  service_fee_npr      numeric(10,2) DEFAULT 0,
  total_amount_npr     numeric(12,2) NOT NULL,
  status               public.booking_status NOT NULL DEFAULT 'requested',
  requested_at         timestamptz DEFAULT now(),
  responded_at         timestamptz,
  started_at           timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  cancellation_reason  text,
  cancelled_by         uuid REFERENCES public.profiles(id),
  payment_status       public.payment_status DEFAULT 'pending',
  payment_method       text,
  payment_transaction_id text,
  selected_areas       text[] DEFAULT '{}',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE INDEX idx_bookings_tourist ON public.bookings(tourist_id);
CREATE INDEX idx_bookings_guide   ON public.bookings(guide_id);
CREATE INDEX idx_bookings_status  ON public.bookings(status);
CREATE INDEX idx_bookings_dates   ON public.bookings(start_date, end_date);

-- REVIEWS
CREATE TABLE public.reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating              int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text,
  punctuality_rating  int CHECK (punctuality_rating BETWEEN 1 AND 5),
  knowledge_rating    int CHECK (knowledge_rating BETWEEN 1 AND 5),
  friendliness_rating int CHECK (friendliness_rating BETWEEN 1 AND 5),
  value_rating        int CHECK (value_rating BETWEEN 1 AND 5),
  is_guide_review     boolean DEFAULT false,
  is_visible          boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_booking  ON public.reviews(booking_id);

-- CHAT REQUESTS
CREATE TABLE public.chat_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  message    text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tourist_id, guide_id)
);

-- CHAT THREADS
CREATE TABLE public.chat_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  tourist_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message    text,
  last_message_at timestamptz DEFAULT now(),
  tourist_unread  int DEFAULT 0,
  guide_unread    int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_chat_threads_tourist ON public.chat_threads(tourist_id);
CREATE INDEX idx_chat_threads_guide   ON public.chat_threads(guide_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_tourist_guide_no_booking
  ON public.chat_threads (tourist_id, guide_id) WHERE booking_id IS NULL;

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        text,
  attachment_url text,
  message_type   text DEFAULT 'text' CHECK (message_type IN ('text','image','location','system')),
  is_read        boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at DESC);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_npr            numeric(12,2) NOT NULL,
  type                  text NOT NULL CHECK (type IN ('payment','refund','payout','platform_fee')),
  status                public.payment_status NOT NULL DEFAULT 'pending',
  gateway               text,
  gateway_transaction_id text,
  gateway_response      jsonb,
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz,
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX idx_txn_booking ON public.transactions(booking_id);
CREATE INDEX idx_txn_user    ON public.transactions(user_id);

-- PAYOUTS
CREATE TABLE public.payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id       uuid NOT NULL REFERENCES public.guide_profiles(id) ON DELETE RESTRICT,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount_npr     numeric(12,2) NOT NULL,
  status         text DEFAULT 'pending',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  type       text,
  data       jsonb,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_notif_user   ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON public.notifications(user_id) WHERE is_read = false;

-- PUSH TOKENS
CREATE TABLE public.push_tokens (
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text NOT NULL,
  device_type text,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, token)
);

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'tourist')
  )
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.raw_user_meta_data->>'role') = 'guide' THEN
    INSERT INTO public.guide_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.kyc_verifications (user_id, full_name_legal, date_of_birth, permanent_address)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'), '1990-01-01', 'Nepal')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_guide_profiles_updated_at
  BEFORE UPDATE ON public.guide_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_kyc_updated_at
  BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_trip_plans_updated_at
  BEFORE UPDATE ON public.trip_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_chat_requests_updated_at
  BEFORE UPDATE ON public.chat_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recalculate guide rating after a review
CREATE OR REPLACE FUNCTION public.update_guide_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.guide_profiles
  SET
    average_rating = COALESCE(
      (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews
       WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE AND is_visible = TRUE),
      0),
    total_reviews = (
      SELECT COUNT(*) FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE AND is_visible = TRUE)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_guide_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  WHEN (NEW.is_guide_review = TRUE)
  EXECUTE FUNCTION public.update_guide_rating();

-- Increment total_trips_completed when booking completes
CREATE OR REPLACE FUNCTION public.handle_booking_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.guide_profiles
    SET total_trips_completed = total_trips_completed + 1
    WHERE id = NEW.guide_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_completed();

-- Update chat thread on new message
CREATE OR REPLACE FUNCTION public.update_chat_thread_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_thread public.chat_threads%ROWTYPE;
BEGIN
  SELECT * INTO v_thread FROM public.chat_threads WHERE id = NEW.thread_id;
  UPDATE public.chat_threads
  SET
    last_message    = NEW.message,
    last_message_at = NEW.created_at,
    tourist_unread  = CASE WHEN NEW.sender_id <> v_thread.tourist_id
                       THEN COALESCE(v_thread.tourist_unread, 0) + 1 ELSE 0 END,
    guide_unread    = CASE WHEN NEW.sender_id <> v_thread.guide_id
                       THEN COALESCE(v_thread.guide_unread, 0) + 1 ELSE 0 END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_thread_on_message();

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens       ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_read_all"    ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"   ON public.profiles FOR ALL    TO authenticated USING (public.is_admin());

-- KYC VERIFICATIONS
CREATE POLICY "kyc_select_own"       ON public.kyc_verifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "kyc_insert_own"       ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_update_own"       ON public.kyc_verifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- KYC DOCUMENTS
CREATE POLICY "kyc_docs_select_own"  ON public.kyc_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kyc_verifications WHERE id = kyc_id AND user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "kyc_docs_insert_own"  ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kyc_verifications WHERE id = kyc_id AND user_id = auth.uid()));

-- GUIDE PROFILES
CREATE POLICY "guide_profiles_read_all"    ON public.guide_profiles FOR SELECT USING (TRUE);
CREATE POLICY "guide_profiles_insert_own"  ON public.guide_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "guide_profiles_update_own"  ON public.guide_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "guide_profiles_admin_all"   ON public.guide_profiles FOR ALL    TO authenticated USING (public.is_admin());

-- DESTINATIONS (public read)
CREATE POLICY "destinations_read_all"    ON public.destinations FOR SELECT USING (TRUE);
CREATE POLICY "destinations_admin_write" ON public.destinations FOR ALL    TO authenticated USING (public.is_admin());

-- SAVED DESTINATIONS
CREATE POLICY "saved_destinations_own"   ON public.saved_destinations FOR ALL TO authenticated USING (auth.uid() = user_id);

-- TRIP PLANS
CREATE POLICY "trip_plans_select_own"    ON public.trip_plans FOR SELECT    TO authenticated USING (user_id = auth.uid() OR is_shared = TRUE);
CREATE POLICY "trip_plans_insert_own"    ON public.trip_plans FOR INSERT    TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "trip_plans_update_own"    ON public.trip_plans FOR UPDATE    TO authenticated USING (user_id = auth.uid());
CREATE POLICY "trip_plans_delete_own"    ON public.trip_plans FOR DELETE    TO authenticated USING (user_id = auth.uid());

-- BOOKINGS
CREATE POLICY "bookings_select_participant" ON public.bookings FOR SELECT TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());
CREATE POLICY "bookings_insert_tourist"     ON public.bookings FOR INSERT TO authenticated WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "bookings_update_participant" ON public.bookings FOR UPDATE TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());

-- REVIEWS
CREATE POLICY "reviews_read_all"    ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_own"  ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_admin_all"   ON public.reviews FOR ALL    TO authenticated USING (public.is_admin());

-- CHAT REQUESTS
CREATE POLICY "chat_requests_read_own"      ON public.chat_requests FOR SELECT TO authenticated USING (tourist_id = auth.uid() OR guide_id = auth.uid());
CREATE POLICY "chat_requests_tourist_insert" ON public.chat_requests FOR INSERT TO authenticated WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "chat_requests_update_own"    ON public.chat_requests FOR UPDATE TO authenticated USING (tourist_id = auth.uid() OR guide_id = auth.uid());
CREATE POLICY "chat_requests_tourist_delete" ON public.chat_requests FOR DELETE TO authenticated USING (tourist_id = auth.uid());

-- CHAT THREADS
CREATE POLICY "chat_threads_participant"    ON public.chat_threads FOR ALL TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());
CREATE POLICY "chat_threads_insert"         ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (guide_id = auth.uid() OR tourist_id = auth.uid());

-- CHAT MESSAGES
CREATE POLICY "chat_messages_read_participant" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = thread_id AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())) OR public.is_admin());
CREATE POLICY "chat_messages_insert_participant" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = thread_id AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())));
CREATE POLICY "chat_messages_update_participant" ON public.chat_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = thread_id AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = thread_id AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())));

-- TRANSACTIONS
CREATE POLICY "transactions_select_own"      ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "transactions_insert_admin"    ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- PAYOUTS
CREATE POLICY "payouts_select_own"           ON public.payouts FOR SELECT TO authenticated USING (auth.uid() = guide_id);
CREATE POLICY "payouts_insert_admin"         ON public.payouts FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- NOTIFICATIONS
CREATE POLICY "notifications_own"            ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- PUSH TOKENS
CREATE POLICY "push_tokens_own"              ON public.push_tokens FOR ALL    TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_tokens_insert_own"       ON public.push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SECTION 7: RPC FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_guides(
  p_district   TEXT           DEFAULT NULL,
  p_languages  TEXT[]         DEFAULT NULL,
  p_max_price  NUMERIC        DEFAULT NULL,
  p_categories public.trip_category[] DEFAULT NULL,
  p_lat        FLOAT          DEFAULT NULL,
  p_lng        FLOAT          DEFAULT NULL,
  p_radius_km  INT            DEFAULT 50
)
RETURNS TABLE (
  id                  UUID,
  full_name           TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  bio_guide           TEXT,
  rating              NUMERIC,
  review_count        INTEGER,
  total_trips         INTEGER,
  price_per_hour_npr  NUMERIC,
  price_per_day_npr   NUMERIC,
  languages           TEXT[],
  specializations     public.trip_category[],
  operating_districts TEXT[],
  years_experience    INT,
  current_lat         DOUBLE PRECISION,
  current_lng         DOUBLE PRECISION,
  distance_km         FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id, pr.full_name, pr.avatar_url, pr.bio, gp.bio_long,
    gp.average_rating, gp.total_reviews, gp.total_trips_completed,
    gp.price_per_hour, gp.price_per_day,
    gp.languages_spoken, gp.specializations, gp.service_areas,
    gp.years_of_experience,
    gp.current_lat, gp.current_lng,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND gp.current_lat IS NOT NULL AND gp.current_lng IS NOT NULL
      THEN (6371 * acos(LEAST(1.0, cos(radians(p_lat)) * cos(radians(gp.current_lat)) * cos(radians(gp.current_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(gp.current_lat)))))
      ELSE NULL
    END AS distance_km
  FROM public.guide_profiles gp
  JOIN public.profiles pr ON pr.id = gp.id
  WHERE
    gp.is_verified = TRUE
    AND gp.is_online = TRUE
    AND (p_district  IS NULL OR p_district = ANY(gp.service_areas))
    AND (p_languages IS NULL OR gp.languages_spoken && p_languages)
    AND (p_max_price IS NULL OR gp.price_per_day <= p_max_price)
    AND (p_categories IS NULL OR gp.specializations && p_categories)
  ORDER BY gp.average_rating DESC NULLS LAST, gp.total_trips_completed DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications SET is_read = TRUE WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$;

-- ============================================================================
-- SECTION 8: REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;

-- ============================================================================
-- SECTION 9: SEED DATA — 15 Nepal Destinations
-- ============================================================================

INSERT INTO public.destinations (name, slug, description, short_description, district, province, category, latitude, longitude, altitude_m, cover_image_url, difficulty_level, estimated_duration_hours, entry_fee_npr, estimated_cost_npr, best_season, tags, is_featured, is_active)
VALUES

('Pashupatinath Temple', 'pashupatinath-temple',
 'Sacred Hindu temple complex on the banks of the Bagmati River, a UNESCO World Heritage Site and one of the most important Shiva temples in the world.',
 'Sacred UNESCO Hindu temple complex on the Bagmati River.',
 'Kathmandu', 'Bagmati', ARRAY['spiritual','cultural']::public.trip_category[],
 27.7104, 85.3487, 1336,
 'https://unsplash.com/photos/a-group-of-people-standing-in-front-of-a-building-R2sI4cwPXqQ',
 'easy', 3, 1000, 3000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar'], ARRAY['unesco','hindu','heritage','shiva'], true, true),

('Boudhanath Stupa', 'boudhanath-stupa',
 'One of the largest spherical stupas in the world and a major Buddhist pilgrimage site with all-seeing eyes of Buddha.',
 'One of the world''s largest Buddhist stupas.',
 'Kathmandu', 'Bagmati', ARRAY['spiritual','cultural','photography']::public.trip_category[],
 27.7215, 85.3620, 1400,
 'https://unsplash.com/photos/white-and-gold-concrete-building-under-blue-sky-during-daytime-YtEzq-hnv5k',
 'easy', 2, 400, 2000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr'], ARRAY['unesco','buddhist','stupa','heritage'], true, true),

('Swayambhunath Stupa', 'swayambhunath-stupa',
 'The Monkey Temple — ancient religious complex atop a hill in the Kathmandu Valley with panoramic city views, sacred to both Buddhists and Hindus.',
 'Ancient hilltop temple with panoramic Kathmandu Valley views.',
 'Kathmandu', 'Bagmati', ARRAY['spiritual','cultural','sightseeing']::public.trip_category[],
 27.7149, 85.2904, 1336,
 'https://unsplash.com/photos/a-group-of-buildings-with-a-sky-in-the-background-Dk8jPwMPtAk',
 'easy', 2, 200, 1500,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'], ARRAY['monkey-temple','buddhist','panorama','hindu'], true, true),

('Phewa Lake & Pokhara Lakeside', 'pokhara-lakeside',
 'The second largest lake in Nepal in the heart of Pokhara, offering stunning reflections of the Annapurna range and a gateway to world-class adventure sports.',
 'Serene lake with Annapurna reflections & adventure sports gateway.',
 'Kaski', 'Gandaki', ARRAY['adventure','sightseeing','photography']::public.trip_category[],
 28.2096, 83.9509, 742,
 'https://unsplash.com/photos/a-group-of-boats-floating-on-top-of-a-lake-qp8TLTaXMn8',
 'easy', 4, 0, 4000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr'], ARRAY['lake','annapurna','paragliding','pokhara'], true, true),

('Annapurna Base Camp', 'annapurna-base-camp',
 'A breathtaking trek to 4,130m in the Annapurna Sanctuary, offering 360-degree views of Annapurna I, Machapuchare (Fishtail), and many other Himalayan giants.',
 'High-altitude base camp trek with stunning Himalayan panoramas.',
 'Kaski', 'Gandaki', ARRAY['trekking','adventure','photography']::public.trip_category[],
 28.5302, 83.8773, 4130,
 'https://unsplash.com/photos/a-beautiful-shot-of-mount-everest-with-prayer-flags-in-the-foreground-4uua9sUkSBo',
 'hard', 192, 3000, 80000,
 ARRAY['Oct','Nov','Dec','Mar','Apr','May'], ARRAY['annapurna','himalaya','trek','sanctuary'], true, true),

('Chitwan National Park', 'chitwan-national-park',
 'UNESCO World Heritage wilderness home to one-horned rhinos, Bengal tigers, gharial crocodiles, and hundreds of bird species. Offers jeep safaris and jungle walks.',
 'UNESCO wildlife park with rhinos, tigers & elephant safaris.',
 'Chitwan', 'Madhesh', ARRAY['wildlife','adventure','photography']::public.trip_category[],
 27.5291, 84.4333, 150,
 'https://unsplash.com/photos/four-person-riding-elephant-during-daytime-QU36RaoCM-Q',
 'easy', 6, 1500, 15000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr'], ARRAY['safari','rhino','tiger','unesco','jungle'], true, true),

('Lumbini — Birthplace of Buddha', 'lumbini',
 'The birthplace of Siddhartha Gautama, the Lord Buddha. A UNESCO World Heritage Site with the Maya Devi Temple, Ashoka Pillar, and the sacred Bodhi tree.',
 'UNESCO-listed birthplace of the Buddha with international monasteries.',
 'Rupandehi', 'Lumbini', ARRAY['spiritual','cultural']::public.trip_category[],
 27.4833, 83.2764, 150,
 'https://unsplash.com/photos/a-large-white-building-sitting-next-to-a-body-of-water-dZmL7oZy098',
 'easy', 5, 500, 5000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'], ARRAY['buddha','unesco','pilgrimage','spiritual'], true, true),

('Everest Base Camp', 'everest-base-camp',
 'The most iconic trek in the world at 5,364m. From Lukla through Sherpa villages, Tengboche monastery and glacial moraines to the foot of the world''s tallest mountain.',
 'World-famous trek to the base of the highest mountain on Earth.',
 'Solukhumbu', 'Koshi', ARRAY['trekking','adventure','photography']::public.trip_category[],
 27.9946, 86.8527, 5364,
 'https://unsplash.com/photos/a-large-rock-with-writing-on-it-in-front-of-a-mountain--I64We8WuBs',
 'expert', 336, 7500, 200000,
 ARRAY['Mar','Apr','May','Oct','Nov'], ARRAY['everest','himalaya','sherpa','ebc','trek'], true, true),

('Bhaktapur Durbar Square', 'bhaktapur-durbar-square',
 'Medieval city of artisans and living UNESCO World Heritage Site with stunning Newari architecture, the 55-window palace, and Nyatapola Temple.',
 'Medieval Newari city with UNESCO-listed durbar square.',
 'Bhaktapur', 'Bagmati', ARRAY['cultural','sightseeing','photography']::public.trip_category[],
 27.6710, 85.4298, 1401,
 'https://unsplash.com/photos/a-group-of-buildings-that-are-next-to-each-other-H9C496Nfd7Q',
 'easy', 4, 1500, 3000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'], ARRAY['unesco','newari','heritage','architecture'], true, true),

('Poon Hill Sunrise Trek', 'poon-hill-sunrise',
 'The most accessible Himalayan sunrise viewpoint at 3,210m, offering a spectacular 180-degree view of the Annapurna and Dhaulagiri ranges bathed in golden light.',
 'Iconic Himalayan sunrise viewpoint at 3,210m altitude.',
 'Myagdi', 'Gandaki', ARRAY['trekking','sightseeing','photography']::public.trip_category[],
 28.3961, 83.6924, 3210,
 'https://unsplash.com/photos/a-bunch-of-colorful-flags-are-hanging-in-front-of-a-mountain-aBX7Otg1oh8',
 'moderate', 48, 2000, 30000,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr'], ARRAY['sunrise','poon-hill','annapurna','ghorepani','trek'], true, true),

('Langtang Valley Trek', 'langtang-valley',
 'A classic Himalayan trek through Tamang heritage villages, yak pastures, and rhododendron forests with stunning views of Langtang Lirung (7,227m).',
 'Scenic valley trek through Tamang villages near Kathmandu.',
 'Rasuwa', 'Bagmati', ARRAY['trekking','adventure','cultural']::public.trip_category[],
 28.2093, 85.5140, 3430,
 'https://unsplash.com/photos/a-snow-covered-mountain-with-a-blue-sky-in-the-background--fq2UH77F6c',
 'moderate', 96, 3000, 50000,
 ARRAY['Mar','Apr','May','Oct','Nov','Dec'], ARRAY['langtang','tamang','valley','trek','himalaya'], false, true),

('Rara Lake', 'rara-lake',
 'Nepal''s largest lake hidden in the remote far-western mountains at 2,990m. Crystal-clear turquoise waters surrounded by dense pine forests and snow-capped peaks.',
 'Nepal''s largest pristine lake in remote far-western mountains.',
 'Mugu', 'Karnali', ARRAY['trekking','wildlife','photography']::public.trip_category[],
 29.5167, 82.0833, 2990,
 'https://unsplash.com/photos/calm-water-at-daytime-ILWZWWfT_Co',
 'moderate', 120, 3000, 60000,
 ARRAY['Apr','May','Sep','Oct','Nov'], ARRAY['rara','lake','remote','pristine','karnali'], false, true),

('Mustang Kingdom', 'mustang-kingdom',
 'The ancient forbidden kingdom hidden in the rain shadow of the Himalayas. White-washed villages, cave monasteries, and dramatic red-rock desert landscapes.',
 'Ancient forbidden kingdom with cave monasteries and desert landscapes.',
 'Mustang', 'Gandaki', ARRAY['cultural','trekking','adventure']::public.trip_category[],
 29.1800, 83.9600, 3800,
 'https://unsplash.com/photos/assorted-color-of-apparel-hanged-below-creek-across-glacier-mountain-dstd4DoLQ90',
 'hard', 144, 50000, 150000,
 ARRAY['Mar','Apr','May','Jun','Sep','Oct'], ARRAY['mustang','lo-manthang','forbidden','kingdom','tibet'], false, true),

('Gosainkunda Lake', 'gosainkunda-lake',
 'A sacred alpine lake at 4,380m on the Langtang National Park, believed to be the abode of Lord Shiva. Thousands of pilgrims visit during Janai Purnima festival.',
 'Sacred Himalayan lake at 4,380m, pilgrimage site of Lord Shiva.',
 'Rasuwa', 'Bagmati', ARRAY['spiritual','trekking','adventure']::public.trip_category[],
 28.1167, 85.4167, 4380,
 'https://unsplash.com/photos/people-on-beach-during-daytime-hialeYabeGI',
 'hard', 72, 3000, 40000,
 ARRAY['Jun','Jul','Aug','Sep','Oct'], ARRAY['gosainkunda','sacred','lake','shiva','pilgrimage'], false, true),

('Kathmandu Durbar Square', 'kathmandu-durbar-square',
 'The historic royal palace square in the heart of old Kathmandu with dozens of pagoda temples, courtyards, and the living goddess Kumari Ghar.',
 'Historic royal palace square with pagoda temples in old Kathmandu.',
 'Kathmandu', 'Bagmati', ARRAY['cultural','sightseeing','photography']::public.trip_category[],
 27.7043, 85.3068, 1310,
 'https://unsplash.com/photos/a-group-of-people-standing-in-front-of-a-building-FTxTyNog7BY',
 'easy', 3, 1000, 2500,
 ARRAY['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'], ARRAY['durbar-square','kumari','heritage','nepal','kathmandu'], true, true);

-- ============================================================================
-- SECTION 10: STORAGE BUCKETS & POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('destination-images', 'destination-images', TRUE, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', FALSE, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('licensed', 'licensed', FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- AVATARS — public read, owner write
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"   ON storage.objects;

CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload_own"   ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars_update_own"   ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars_delete_own"   ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- DESTINATION IMAGES — public read, admin write
DROP POLICY IF EXISTS "destination_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "destination_images_admin_write"  ON storage.objects;
DROP POLICY IF EXISTS "destination_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read destination images"  ON storage.objects;

CREATE POLICY "destination_images_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'destination-images');
CREATE POLICY "destination_images_admin_write"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'destination-images' AND public.is_admin());
CREATE POLICY "destination_images_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'destination-images' AND public.is_admin());

-- KYC DOCUMENTS — owner + admin only
DROP POLICY IF EXISTS "kyc_docs_upload_own"        ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_read_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_delete_own"        ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_update_own"        ON storage.objects;

CREATE POLICY "kyc_docs_upload_own"        ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "kyc_docs_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::TEXT OR public.is_admin()));
CREATE POLICY "kyc_docs_update_own"        ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "kyc_docs_delete_own"        ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- LICENSED DOCUMENTS — guide owner + admin only
DROP POLICY IF EXISTS "licensed_upload_own"        ON storage.objects;
DROP POLICY IF EXISTS "licensed_read_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "licensed_update_own"        ON storage.objects;
DROP POLICY IF EXISTS "licensed_delete_own"        ON storage.objects;

CREATE POLICY "licensed_upload_own"        ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'licensed' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "licensed_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'licensed' AND ((storage.foldername(name))[1] = auth.uid()::TEXT OR public.is_admin()));
CREATE POLICY "licensed_update_own"        ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'licensed' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "licensed_delete_own"        ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'licensed' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- CHAT ATTACHMENTS — thread participants only
DROP POLICY IF EXISTS "chat_attachments_upload_participant" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_read_participant"   ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_all"                   ON storage.objects;

CREATE POLICY "chat_attachments_upload_participant" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = ((storage.foldername(name))[1])::UUID AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())));
CREATE POLICY "chat_attachments_read_participant"   ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND (EXISTS (SELECT 1 FROM public.chat_threads ct WHERE ct.id = ((storage.foldername(name))[1])::UUID AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())) OR public.is_admin()));
CREATE POLICY "storage_admin_all"                   ON storage.objects FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Trip Nepal database setup complete. ' || COUNT(*) || ' destinations seeded.' AS status
FROM public.destinations;
