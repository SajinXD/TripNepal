

DROP TABLE IF EXISTS public.push_tokens          CASCADE;
DROP TABLE IF EXISTS public.notifications        CASCADE;
DROP TABLE IF EXISTS public.payouts              CASCADE;
DROP TABLE IF EXISTS public.transactions         CASCADE;
DROP TABLE IF EXISTS public.chat_messages        CASCADE;
DROP TABLE IF EXISTS public.chat_threads         CASCADE;
DROP TABLE IF EXISTS public.reviews              CASCADE;
DROP TABLE IF EXISTS public.bookings             CASCADE;
DROP TABLE IF EXISTS public.trip_plans           CASCADE;
DROP TABLE IF EXISTS public.saved_destinations   CASCADE;
DROP TABLE IF EXISTS public.destinations         CASCADE;
DROP TABLE IF EXISTS public.kyc_documents        CASCADE;
DROP TABLE IF EXISTS public.kyc_verifications    CASCADE;
DROP TABLE IF EXISTS public.guide_profiles       CASCADE;
DROP TABLE IF EXISTS public.profiles             CASCADE;

DROP TYPE IF EXISTS user_role        CASCADE;
DROP TYPE IF EXISTS kyc_status       CASCADE;
DROP TYPE IF EXISTS booking_status   CASCADE;
DROP TYPE IF EXISTS payment_status   CASCADE;
DROP TYPE IF EXISTS trip_category    CASCADE;
DROP TYPE IF EXISTS document_type    CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      

CREATE TYPE user_role AS ENUM ('tourist', 'guide', 'admin');
CREATE TYPE kyc_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected', 'resubmit');
CREATE TYPE booking_status AS ENUM ('requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE trip_category AS ENUM ('trekking', 'cultural', 'adventure', 'wildlife', 'spiritual', 'sightseeing', 'food', 'photography');
CREATE TYPE document_type AS ENUM ('citizenship', 'passport', 'driving_license', 'guide_license', 'selfie');

CREATE TABLE public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role NOT NULL DEFAULT 'tourist',
  full_name          TEXT NOT NULL,
  phone              TEXT UNIQUE,
  email              TEXT,
  avatar_url         TEXT,
  date_of_birth      DATE,
  gender             TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  nationality        TEXT,
  country            TEXT,
  bio                TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en','ne')),
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role  ON public.profiles(role);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);

CREATE TABLE public.kyc_verifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status               kyc_status NOT NULL DEFAULT 'not_submitted',
  full_name_legal      TEXT,
  citizenship_number   TEXT,
  passport_number      TEXT,
  date_of_birth        DATE,
  permanent_address    TEXT,
  current_address      TEXT,
  submitted_at         TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ,
  reviewed_by          UUID REFERENCES public.profiles(id),
  rejection_reason     TEXT,
  resubmission_count   INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_status ON public.kyc_verifications(status);

CREATE TABLE public.kyc_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_id         UUID NOT NULL REFERENCES public.kyc_verifications(id) ON DELETE CASCADE,
  document_type  document_type NOT NULL,
  file_url       TEXT NOT NULL,
  file_size_bytes INT,
  mime_type      TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.guide_profiles (
  id                   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  years_of_experience  INT DEFAULT 0,
  guide_license_number TEXT UNIQUE,
  license_expiry_date  DATE,
  bio_long             TEXT,
  languages_spoken     TEXT[]         DEFAULT '{english}',
  specializations      trip_category[] DEFAULT '{sightseeing}',
  service_areas        TEXT[]         DEFAULT '{}',
  price_per_hour       NUMERIC(10,2),
  price_per_day        NUMERIC(10,2),
  price_per_trek_day   NUMERIC(10,2),
  min_booking_hours    INT DEFAULT 2,
  is_online            BOOLEAN DEFAULT FALSE,
  is_verified          BOOLEAN DEFAULT FALSE,
  current_lat          DOUBLE PRECISION,
  current_lng          DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ,
  total_trips_completed INT DEFAULT 0,
  average_rating        NUMERIC(3,2) DEFAULT 0,
  total_reviews         INT DEFAULT 0,
  total_earnings        NUMERIC(12,2) DEFAULT 0,
  response_time_minutes INT,
  acceptance_rate       NUMERIC(5,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guide_online   ON public.guide_profiles(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_guide_verified ON public.guide_profiles(is_verified);
CREATE INDEX idx_guide_areas    ON public.guide_profiles USING GIN(service_areas);
CREATE INDEX idx_guide_lang     ON public.guide_profiles USING GIN(languages_spoken);

CREATE TABLE public.destinations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  description           TEXT,
  short_desc            TEXT,                  
  district              TEXT NOT NULL,
  province              TEXT,
  category              trip_category[] DEFAULT '{sightseeing}',
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  altitude_m            INT,
  cover_image_url       TEXT,
  gallery_urls          TEXT[],
  best_season           TEXT[],
  difficulty_level      TEXT CHECK (difficulty_level IN ('easy','moderate','hard','expert')),
  estimated_duration_hours INT,
  avg_visit_hrs         NUMERIC(4,1),           
  entry_fee_npr         NUMERIC(10,2),
  tags                  TEXT[],
  is_featured           BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  view_count            INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dest_district ON public.destinations(district);
CREATE INDEX idx_dest_featured ON public.destinations(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_dest_category ON public.destinations USING GIN(category);
CREATE INDEX idx_dest_tags     ON public.destinations USING GIN(tags);
CREATE INDEX idx_dest_search   ON public.destinations USING GIN(name gin_trgm_ops);
CREATE INDEX idx_dest_location ON public.destinations(latitude, longitude);

CREATE TABLE public.saved_destinations (
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  saved_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, destination_id)
);

CREATE TABLE public.trip_plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL DEFAULT 'My Nepal Trip',
  start_date              DATE,
  end_date                DATE,
  total_days              INT NOT NULL DEFAULT 3,
  budget_npr              NUMERIC(12,2),
  travelers_count         INT DEFAULT 1,
  trip_categories         trip_category[] DEFAULT '{sightseeing}',
  preferred_districts     TEXT[],
  special_requests        TEXT,
  itinerary               JSONB DEFAULT '[]',
  estimated_total_cost_npr NUMERIC(12,2),
  ai_model                TEXT,
  status                  TEXT DEFAULT 'ready' CHECK (status IN ('generating','ready','error')),
  error_message           TEXT,
  generated_at            TIMESTAMPTZ,
  is_saved                BOOLEAN DEFAULT TRUE,
  is_shared               BOOLEAN DEFAULT FALSE,
  share_token             TEXT UNIQUE,
  booked_guide_id         UUID REFERENCES public.guide_profiles(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trip_plans_tourist ON public.trip_plans(tourist_id);

CREATE TABLE public.bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  guide_id              UUID NOT NULL REFERENCES public.guide_profiles(id) ON DELETE RESTRICT,
  trip_plan_id          UUID REFERENCES public.trip_plans(id),
  
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  start_time            TIME,
  pickup_location       TEXT,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  destination_ids       UUID[],
  travelers_count       INT DEFAULT 1,
  trip_category         trip_category,
  district              TEXT,
  special_notes         TEXT,
  
  hourly_rate_npr       NUMERIC(10,2),
  daily_rate_npr        NUMERIC(10,2),
  total_hours           NUMERIC(6,2),
  total_days            INT,
  subtotal_npr          NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_fee_npr       NUMERIC(10,2) DEFAULT 0,
  total_amount_npr      NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  status                booking_status NOT NULL DEFAULT 'requested',
  requested_at          TIMESTAMPTZ DEFAULT NOW(),
  responded_at          TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  cancelled_by          UUID REFERENCES public.profiles(id),
  
  payment_status        payment_status DEFAULT 'pending',
  payment_method        TEXT,
  payment_transaction_id TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_tourist ON public.bookings(tourist_id);
CREATE INDEX idx_bookings_guide   ON public.bookings(guide_id);
CREATE INDEX idx_bookings_status  ON public.bookings(status);
CREATE INDEX idx_bookings_dates   ON public.bookings(start_date, end_date);

CREATE TABLE public.reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_guide_review     BOOLEAN DEFAULT TRUE,
  rating              INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             TEXT,
  punctuality_rating  INT CHECK (punctuality_rating BETWEEN 1 AND 5),
  knowledge_rating    INT CHECK (knowledge_rating BETWEEN 1 AND 5),
  friendliness_rating INT CHECK (friendliness_rating BETWEEN 1 AND 5),
  value_rating        INT CHECK (value_rating BETWEEN 1 AND 5),
  is_visible          BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);

CREATE TABLE public.chat_threads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  tourist_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message   TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  tourist_unread INT DEFAULT 0,
  guide_unread   INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_threads_tourist ON public.chat_threads(tourist_id);
CREATE INDEX idx_chat_threads_guide   ON public.chat_threads(guide_id);

CREATE TABLE public.chat_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        TEXT,
  attachment_url TEXT,
  message_type   TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','location','system')),
  is_read        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at DESC);

CREATE TABLE public.transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_npr             NUMERIC(12,2) NOT NULL,
  type                   TEXT NOT NULL CHECK (type IN ('payment','refund','payout','platform_fee')),
  status                 payment_status NOT NULL DEFAULT 'pending',
  gateway                TEXT,
  gateway_transaction_id TEXT,
  gateway_response       JSONB,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  completed_at           TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_txn_booking ON public.transactions(booking_id);
CREATE INDEX idx_txn_user    ON public.transactions(user_id);

CREATE TABLE public.payouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id       UUID NOT NULL REFERENCES public.guide_profiles(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES public.transactions(id),
  amount_npr     NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  paid_at        TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_guide ON public.payouts(guide_id);

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT,
  data       JSONB,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user   ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON public.notifications(user_id) WHERE is_read = FALSE;

CREATE TABLE public.push_tokens (
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  device_type TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, token)
);

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "profiles_read"        ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin"       ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "kyc_own_select"  ON public.kyc_verifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "kyc_own_insert"  ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_own_update"  ON public.kyc_verifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "kyc_docs_own"    ON public.kyc_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kyc_verifications k WHERE k.id = kyc_id AND k.user_id = auth.uid()));

CREATE POLICY "guide_read_all"      ON public.guide_profiles FOR SELECT USING (TRUE);
CREATE POLICY "guide_insert_own"    ON public.guide_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "guide_update_own"    ON public.guide_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "dest_read_all"   ON public.destinations FOR SELECT USING (is_active = TRUE);
CREATE POLICY "dest_admin_rw"   ON public.destinations FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "saved_own" ON public.saved_destinations FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "trips_select" ON public.trip_plans FOR SELECT TO authenticated USING (tourist_id = auth.uid() OR is_shared = TRUE OR public.is_admin());
CREATE POLICY "trips_insert" ON public.trip_plans FOR INSERT TO authenticated WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "trips_update" ON public.trip_plans FOR UPDATE TO authenticated USING (tourist_id = auth.uid());
CREATE POLICY "trips_delete" ON public.trip_plans FOR DELETE TO authenticated USING (tourist_id = auth.uid());

CREATE POLICY "bookings_select" ON public.bookings FOR SELECT TO authenticated USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE TO authenticated USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());

CREATE POLICY "reviews_read"   ON public.reviews FOR SELECT USING (is_visible = TRUE);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_admin"  ON public.reviews FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "thread_participant" ON public.chat_threads FOR ALL TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid() OR public.is_admin());
CREATE POLICY "msg_read" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.tourist_id = auth.uid() OR t.guide_id = auth.uid())));
CREATE POLICY "msg_send" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.tourist_id = auth.uid() OR t.guide_id = auth.uid())));

CREATE POLICY "txn_own" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "payouts_guide_own" ON public.payouts FOR SELECT TO authenticated USING (guide_id = auth.uid() OR public.is_admin());

CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "push_own"        ON public.push_tokens FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_insert_own" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tourist')
  )
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.raw_user_meta_data->>'role') = 'guide' THEN
    INSERT INTO public.guide_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.kyc_verifications (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at        BEFORE UPDATE ON public.profiles           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_guide_updated_at           BEFORE UPDATE ON public.guide_profiles     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_kyc_updated_at             BEFORE UPDATE ON public.kyc_verifications  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated_at        BEFORE UPDATE ON public.bookings           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_trip_plans_updated_at      BEFORE UPDATE ON public.trip_plans         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated_at    BEFORE UPDATE ON public.transactions       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payouts_updated_at         BEFORE UPDATE ON public.payouts            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.update_guide_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.guide_profiles
  SET
    average_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE AND is_visible = TRUE), 0),
    total_reviews  = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE AND is_visible = TRUE)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_guide_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW WHEN (NEW.is_guide_review = TRUE)
  EXECUTE FUNCTION public.update_guide_rating();

CREATE OR REPLACE FUNCTION public.handle_booking_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.guide_profiles SET total_trips_completed = total_trips_completed + 1 WHERE id = NEW.guide_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_completed();

CREATE OR REPLACE FUNCTION public.update_chat_thread_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_thread public.chat_threads%ROWTYPE;
BEGIN
  SELECT * INTO v_thread FROM public.chat_threads WHERE id = NEW.thread_id;
  UPDATE public.chat_threads SET
    last_message    = LEFT(NEW.message, 80),
    last_message_at = NEW.created_at,
    tourist_unread  = CASE WHEN NEW.sender_id <> v_thread.tourist_id THEN COALESCE(v_thread.tourist_unread,0)+1 ELSE 0 END,
    guide_unread    = CASE WHEN NEW.sender_id <> v_thread.guide_id   THEN COALESCE(v_thread.guide_unread,0)+1   ELSE 0 END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_thread_on_message();

CREATE OR REPLACE FUNCTION public.create_booking_with_thread(
  p_tourist_id        UUID,
  p_guide_id          UUID,
  p_trip_plan_id      UUID,
  p_start_date        DATE,
  p_end_date          DATE,
  p_start_time        TIME,
  p_travelers_count   INT,
  p_trip_category     trip_category,
  p_district          TEXT,
  p_special_requests  TEXT,
  p_price_per_day_npr NUMERIC,
  p_total_price_npr   NUMERIC,
  p_platform_fee_npr  NUMERIC,
  p_guide_payout_npr  NUMERIC
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking_id UUID;
  v_thread_id  UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.guide_profiles WHERE id = p_guide_id AND is_verified = TRUE AND is_online = TRUE) THEN
    RAISE EXCEPTION 'GUIDE_NOT_AVAILABLE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings WHERE guide_id = p_guide_id AND status IN ('requested','accepted') AND NOT (end_date < p_start_date OR start_date > p_end_date)) THEN
    RAISE EXCEPTION 'GUIDE_ALREADY_BOOKED';
  END IF;

  INSERT INTO public.bookings (tourist_id, guide_id, trip_plan_id, start_date, end_date, start_time, travelers_count, trip_category, district, special_notes, daily_rate_npr, total_amount_npr, service_fee_npr, subtotal_npr)
  VALUES (p_tourist_id, p_guide_id, p_trip_plan_id, p_start_date, p_end_date, p_start_time, p_travelers_count, p_trip_category, p_district, p_special_requests, p_price_per_day_npr, p_total_price_npr, p_platform_fee_npr, p_guide_payout_npr)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.chat_threads (booking_id, tourist_id, guide_id)
  VALUES (v_booking_id, p_tourist_id, p_guide_id)
  RETURNING id INTO v_thread_id;

  RETURN jsonb_build_object('booking_id', v_booking_id, 'thread_id', v_thread_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_guides(
  p_district   TEXT            DEFAULT NULL,
  p_languages  TEXT[]          DEFAULT NULL,
  p_max_price  NUMERIC         DEFAULT NULL,
  p_categories trip_category[] DEFAULT NULL,
  p_lat        FLOAT           DEFAULT NULL,
  p_lng        FLOAT           DEFAULT NULL,
  p_radius_km  INT             DEFAULT 100
)
RETURNS TABLE (
  id                 UUID, full_name TEXT, avatar_url TEXT, bio TEXT, bio_guide TEXT,
  rating NUMERIC, review_count INT, total_trips INT,
  price_per_hour_npr NUMERIC, price_per_day_npr NUMERIC,
  languages TEXT[], specializations trip_category[],
  operating_districts TEXT[], years_experience INT,
  current_lat DOUBLE PRECISION, current_lng DOUBLE PRECISION, distance_km FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT gp.id, pr.full_name, pr.avatar_url, pr.bio, gp.bio_long,
    gp.average_rating, gp.total_reviews, gp.total_trips_completed,
    gp.price_per_hour, gp.price_per_day, gp.languages_spoken, gp.specializations,
    gp.service_areas, gp.years_of_experience, gp.current_lat, gp.current_lng,
    CASE WHEN p_lat IS NOT NULL AND gp.current_lat IS NOT NULL THEN
      6371 * acos(LEAST(1.0, cos(radians(p_lat)) * cos(radians(gp.current_lat)) *
        cos(radians(gp.current_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(gp.current_lat))))
    ELSE NULL END::FLOAT
  FROM public.guide_profiles gp
  JOIN public.profiles pr ON pr.id = gp.id
  WHERE gp.is_verified = TRUE AND gp.is_online = TRUE
    AND (p_district  IS NULL OR p_district  = ANY(gp.service_areas))
    AND (p_languages IS NULL OR gp.languages_spoken && p_languages)
    AND (p_max_price IS NULL OR gp.price_per_day <= p_max_price)
    AND (p_categories IS NULL OR gp.specializations && p_categories)
  ORDER BY gp.average_rating DESC NULLS LAST, gp.total_trips_completed DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.guide_dashboard_stats(p_guide_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_today_earn NUMERIC(12,2); v_week_earn NUMERIC(12,2);
  v_pending    INT;           v_completed INT;
  v_rating     NUMERIC(3,2);  v_reviews   INT;
BEGIN
  SELECT COALESCE(SUM(t.amount_npr),0) INTO v_today_earn FROM public.transactions t JOIN public.bookings b ON b.id = t.booking_id WHERE b.guide_id = p_guide_id AND t.status = 'released' AND t.completed_at::DATE = CURRENT_DATE;
  SELECT COALESCE(SUM(t.amount_npr),0) INTO v_week_earn  FROM public.transactions t JOIN public.bookings b ON b.id = t.booking_id WHERE b.guide_id = p_guide_id AND t.status = 'released' AND t.completed_at >= date_trunc('week', NOW());
  SELECT COUNT(*) INTO v_pending   FROM public.bookings WHERE guide_id = p_guide_id AND status = 'requested';
  SELECT COALESCE(total_trips_completed,0) INTO v_completed FROM public.guide_profiles WHERE id = p_guide_id;
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2),0), COUNT(*) INTO v_rating, v_reviews FROM public.reviews WHERE reviewee_id = p_guide_id AND is_guide_review = TRUE;
  RETURN jsonb_build_object('today_earnings_npr',v_today_earn,'week_earnings_npr',v_week_earn,'pending_requests',v_pending,'completed_trips',v_completed,'avg_rating',v_rating,'total_reviews',v_reviews);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.notifications SET is_read = TRUE WHERE user_id = p_user_id AND is_read = FALSE;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

INSERT INTO public.destinations (name, slug, description, short_desc, district, province, category, latitude, longitude, altitude_m, difficulty_level, avg_visit_hrs, entry_fee_npr, is_featured, cover_image_url, tags) VALUES
('Pashupatinath Temple',    'pashupatinath-temple',    'Sacred Hindu temple complex on the Bagmati River, UNESCO World Heritage Site.',     'Nepal''s most sacred Hindu temple.',        'Kathmandu', 'Bagmati',  '{spiritual,cultural}',    27.7106, 85.3487, 1400, 'easy',     2.0,  500,   TRUE, 'https://images.unsplash.com/photo-1605649461784-e69109bb0f7b?w=800', '{unesco,hindu,heritage,temple}'),
('Boudhanath Stupa',        'boudhanath-stupa',        'One of the largest spherical stupas in Nepal, a UNESCO World Heritage Site.',         'Iconic Buddhist stupa in Kathmandu.',       'Kathmandu', 'Bagmati',  '{spiritual,cultural}',    27.7215, 85.3620, 1400, 'easy',     2.0,  400,   TRUE, 'https://images.unsplash.com/photo-1583377353569-54fb2a02b4f4?w=800', '{unesco,buddhist,heritage,stupa}'),
('Everest Base Camp',       'everest-base-camp',       'The legendary trek to the foot of the world''s tallest mountain at 5364m.',          'Epic trek to foot of Mt. Everest.',         'Solukhumbu','Koshi',    '{trekking,adventure}',    28.0026, 86.8528, 5364, 'expert',   0.0,  0,     TRUE, 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800', '{everest,himalaya,trek,altitude}'),
('Pokhara Lakeside',        'pokhara-lakeside',        'Scenic lakeside town with stunning Annapurna range views, the trekking capital.',    'Nepal''s top tourist destination.',         'Kaski',     'Gandaki',  '{sightseeing,adventure}', 28.2096, 83.9856, 822,  'easy',     4.0,  0,     TRUE, 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800', '{lake,annapurna,paragliding,phewa}'),
('Chitwan National Park',   'chitwan-national-park',   'Wildlife safari in Nepal''s premier national park, home to rhinos and tigers.',      'World-class wildlife safari park.',         'Chitwan',   'Bagmati',  '{wildlife,adventure}',    27.5291, 84.3542, 150,  'easy',     8.0,  1000,  TRUE, 'https://images.unsplash.com/photo-1551105378-6ad90d9a64d6?w=800', '{safari,rhino,tiger,unesco,jungle}'),
('Lumbini',                 'lumbini',                 'The birthplace of Lord Buddha, UNESCO World Heritage Site.',                         'Birthplace of the Buddha.',                 'Rupandehi', 'Lumbini',  '{spiritual,cultural}',    27.4833, 83.2767, 150,  'easy',     4.0,  200,   TRUE, 'https://images.unsplash.com/photo-1562699804-0d2e0ccc89b3?w=800', '{buddha,unesco,pilgrimage,peace}'),
('Annapurna Circuit Trek',  'annapurna-circuit',       'Classic high-altitude trek crossing Thorong La pass at 5416m.',                     'The world''s most complete trek.',          'Manang',    'Gandaki',  '{trekking,adventure}',    28.6667, 84.0167, 5416, 'hard',     0.0,  3000,  TRUE, 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800', '{annapurna,thorong-la,trek,circuit}'),
('Bhaktapur Durbar Square', 'bhaktapur-durbar-square', 'Medieval city of artisans with stunning Newari architecture, UNESCO Heritage Site.', 'Best-preserved medieval city in Nepal.',    'Bhaktapur', 'Bagmati',  '{cultural,sightseeing}',  27.6710, 85.4298, 1401, 'easy',     3.0,  1500,  TRUE, 'https://images.unsplash.com/photo-1566996533071-2c578080c06e?w=800', '{unesco,heritage,newari,temple}'),
('Swayambhunath',           'swayambhunath',           'Ancient Buddhist temple complex atop a hill overlooking Kathmandu Valley.',          'The "Monkey Temple" of Kathmandu.',         'Kathmandu', 'Bagmati',  '{spiritual,cultural}',    27.7149, 85.2903, 1336, 'easy',     2.0,  200,   TRUE, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', '{buddhist,stupa,monkey,heritage}'),
('Nagarkot',                'nagarkot',                'Hilltop resort town famous for breathtaking sunrise views of the Himalayas.',        'Best Himalayan sunrise viewpoint.',         'Bhaktapur', 'Bagmati',  '{sightseeing,photography}',27.7167, 85.5167,2175, 'easy',     3.0,  0,     FALSE,'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800', '{sunrise,himalaya,viewpoint,photography}'),
('Phewa Lake',              'phewa-lake',              'Nepal''s second largest lake with stunning reflections of Machapuchare peak.',       'Iconic lake of Pokhara.',                   'Kaski',     'Gandaki',  '{sightseeing,adventure}', 28.2100, 83.9500, 742,  'easy',     3.0,  0,     FALSE,'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800', '{lake,pokhara,boat,fish-tail}'),
('Annapurna Base Camp',     'annapurna-base-camp',     'Trek to 4130m surrounded by the world''s 10th highest mountain.',                   'Annapurna mountain basecamp trek.',         'Kaski',     'Gandaki',  '{trekking,adventure}',    28.5300, 83.8780, 4130, 'hard',     0.0,  2000,  FALSE,'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800', '{annapurna,abc,trek,mountain}'),
('Patan Durbar Square',     'patan-durbar-square',     'Ancient royal palace complex in Lalitpur with fine Newari craftsmanship.',          'City of fine arts and crafts.',             'Lalitpur',  'Bagmati',  '{cultural,sightseeing}',  27.6733, 85.3253, 1341, 'easy',     2.5,  1000,  FALSE,'https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=800', '{heritage,newari,museum,lalitpur}'),
('Sarangkot',               'sarangkot',               'Popular viewpoint for sunrise and paragliding with panoramic Annapurna views.',     'Top paragliding launch site in Nepal.',     'Kaski',     'Gandaki',  '{adventure,photography}', 28.2389, 83.9639, 1592, 'easy',     3.0,  0,     FALSE,'https://images.unsplash.com/photo-1489769832850-d7ab6f3e3c1d?w=800', '{paragliding,sunrise,annapurna,viewpoint}'),
('Langtang Valley',         'langtang-valley',         'Beautiful trekking valley north of Kathmandu with Tamang culture and glaciers.',    'Closest trek to Kathmandu city.',           'Rasuwa',    'Bagmati',  '{trekking,wildlife}',     28.2120, 85.5157, 3430, 'moderate', 0.0,  3000,  FALSE,'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '{langtang,tamang,glacier,valley}');

