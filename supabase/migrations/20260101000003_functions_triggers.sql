

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tourist')
  )
  ON CONFLICT (id) DO NOTHING;

  
  IF (NEW.raw_user_meta_data->>'role') = 'guide' THEN
    INSERT INTO public.guide_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.kyc_verifications (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_guide_profiles_updated_at
  BEFORE UPDATE ON public.guide_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_kyc_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_trip_plans_updated_at
  BEFORE UPDATE ON public.trip_plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.update_guide_rating()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.guide_profiles
  SET
    average_rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE),
    total_reviews  = (SELECT COUNT(*)                  FROM public.reviews WHERE reviewee_id = NEW.reviewee_id AND is_guide_review = TRUE)
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_update_guide_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  WHEN (NEW.is_guide_review = TRUE)
  EXECUTE PROCEDURE public.update_guide_rating();

CREATE OR REPLACE FUNCTION public.handle_booking_completed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.guide_profiles
    SET total_trips_completed = total_trips_completed + 1
    WHERE id = NEW.guide_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_booking_completed();

CREATE OR REPLACE FUNCTION public.update_chat_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_thread chat_threads%ROWTYPE;
BEGIN
  SELECT * INTO v_thread FROM public.chat_threads WHERE id = NEW.thread_id;

  UPDATE public.chat_threads
  SET
    last_message    = NEW.message,
    last_message_at = NEW.created_at,
    tourist_unread  = CASE
                        WHEN NEW.sender_id <> v_thread.tourist_id THEN COALESCE(v_thread.tourist_unread, 0) + 1
                        ELSE 0
                      END,
    guide_unread    = CASE
                        WHEN NEW.sender_id <> v_thread.guide_id THEN COALESCE(v_thread.guide_unread, 0) + 1
                        ELSE 0
                      END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_chat_thread_on_message();

CREATE OR REPLACE FUNCTION public.create_booking_with_thread(
  p_tourist_id        UUID,
  p_guide_id          UUID,
  p_trip_plan_id      UUID,
  p_start_date        DATE,
  p_end_date          DATE,
  p_start_time        TIME,
  p_travelers_count   SMALLINT,
  p_trip_category     trip_category,
  p_district          TEXT,
  p_special_requests  TEXT,
  p_price_per_day_npr NUMERIC,
  p_total_price_npr   NUMERIC,
  p_platform_fee_npr  NUMERIC,
  p_guide_payout_npr  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_thread_id  UUID;
BEGIN
  
  IF NOT EXISTS (
    SELECT 1 FROM public.guide_profiles
    WHERE id = p_guide_id AND is_verified = TRUE AND is_online = TRUE
  ) THEN
    RAISE EXCEPTION 'GUIDE_NOT_AVAILABLE' USING HINT = 'Guide is not verified or not online';
  END IF;

  
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE guide_id = p_guide_id
      AND status IN ('pending', 'accepted')
      AND NOT (end_date < p_start_date OR start_date > p_end_date)
  ) THEN
    RAISE EXCEPTION 'GUIDE_ALREADY_BOOKED' USING HINT = 'Guide is already booked for these dates';
  END IF;

  
  INSERT INTO public.bookings (
    tourist_id, guide_id, trip_plan_id,
    start_date, end_date, start_time,
    travelers_count, trip_category, district,
    special_requests, daily_rate_npr,
    total_amount_npr, service_fee_npr, subtotal_npr
  )
  VALUES (
    p_tourist_id, p_guide_id, p_trip_plan_id,
    p_start_date, p_end_date, p_start_time,
    p_travelers_count, p_trip_category, p_district,
    p_special_requests, p_price_per_day_npr,
    p_total_price_npr, p_platform_fee_npr, p_guide_payout_npr
  )
  RETURNING id INTO v_booking_id;

  
  INSERT INTO public.chat_threads (booking_id, tourist_id, guide_id)
  VALUES (v_booking_id, p_tourist_id, p_guide_id)
  RETURNING id INTO v_thread_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'thread_id',  v_thread_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_guides(
  p_district    TEXT        DEFAULT NULL,
  p_languages   TEXT[]      DEFAULT NULL,
  p_max_price   NUMERIC     DEFAULT NULL,
  p_categories  trip_category[] DEFAULT NULL,
  p_lat         FLOAT       DEFAULT NULL,
  p_lng         FLOAT       DEFAULT NULL,
  p_radius_km   INT         DEFAULT 50
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
  specializations     trip_category[],
  operating_districts TEXT[],
  years_experience    SMALLINT,
  current_lat         DOUBLE PRECISION,
  current_lng         DOUBLE PRECISION,
  distance_km         FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    pr.full_name,
    pr.avatar_url,
    pr.bio,
    gp.bio_long as bio_guide,
    gp.average_rating as rating,
    gp.total_reviews as review_count,
    gp.total_trips_completed as total_trips,
    gp.price_per_hour as price_per_hour_npr,
    gp.price_per_day as price_per_day_npr,
    gp.languages_spoken as languages,
    gp.specializations,
    gp.service_areas as operating_districts,
    gp.years_of_experience as years_experience,
    gp.current_lat,
    gp.current_lng,
    
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND gp.current_lat IS NOT NULL AND gp.current_lng IS NOT NULL
      THEN (
        6371 * acos(
          LEAST(1.0, cos(radians(p_lat)) * cos(radians(gp.current_lat)) *
          cos(radians(gp.current_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(gp.current_lat)))
        )
      )
      ELSE NULL
    END AS distance_km
  FROM public.guide_profiles gp
  JOIN public.profiles pr ON pr.id = gp.id
  WHERE
    gp.is_verified = TRUE
    AND gp.is_online = TRUE
    
    AND (p_district IS NULL OR p_district = ANY(gp.service_areas))
    
    AND (p_languages IS NULL OR gp.languages_spoken && p_languages)
    
    AND (p_max_price IS NULL OR gp.price_per_day <= p_max_price)
    
    AND (p_categories IS NULL OR gp.specializations && p_categories)
    
    AND (
      p_lat IS NULL OR p_lng IS NULL OR gp.current_lat IS NULL OR gp.current_lng IS NULL
      OR (
        6371 * acos(
          LEAST(1.0, cos(radians(p_lat)) * cos(radians(gp.current_lat)) *
          cos(radians(gp.current_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(gp.current_lat)))
        ) <= p_radius_km
      )
    )
  ORDER BY
    gp.average_rating DESC NULLS LAST,
    distance_km ASC NULLS LAST,
    gp.total_trips_completed DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.nearby_destinations(
  p_lat       FLOAT,
  p_lng       FLOAT,
  p_radius_km INT DEFAULT 50
)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  district      TEXT,
  province      TEXT,
  description   TEXT,
  short_desc    TEXT,
  category      trip_category[],
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  elevation_m   INTEGER,
  image_urls    TEXT[],
  entry_fee_npr NUMERIC,
  best_season   TEXT[],
  avg_visit_hrs NUMERIC,
  distance_km   FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.name, d.district, d.province, d.description, d.short_desc,
    d.category, d.lat, d.lng, d.elevation_m, d.image_urls, d.entry_fee_npr,
    d.best_season, d.avg_visit_hrs,
    (
      6371 * acos(
        LEAST(1.0, cos(radians(p_lat)) * cos(radians(d.lat)) *
        cos(radians(d.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(d.lat)))
      )
    )::FLOAT AS distance_km
  FROM public.destinations d
  WHERE
    d.is_active = TRUE
    AND (
      6371 * acos(
        LEAST(1.0, cos(radians(p_lat)) * cos(radians(d.lat)) *
        cos(radians(d.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(d.lat)))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.guide_dashboard_stats(p_guide_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_today_earnings    NUMERIC(12,2);
  v_week_earnings     NUMERIC(12,2);
  v_pending_requests  INTEGER;
  v_completed_trips   INTEGER;
  v_avg_rating        NUMERIC(3,2);
  v_total_reviews     INTEGER;
BEGIN
  
  SELECT COALESCE(SUM(t.amount_npr), 0)
  INTO v_today_earnings
  FROM public.transactions t
  JOIN public.bookings b ON b.id = t.booking_id
  WHERE b.guide_id = p_guide_id
    AND t.status = 'released'
    AND t.completed_at::DATE = CURRENT_DATE;

  
  SELECT COALESCE(SUM(t.amount_npr), 0)
  INTO v_week_earnings
  FROM public.transactions t
  JOIN public.bookings b ON b.id = t.booking_id
  WHERE b.guide_id = p_guide_id
    AND t.status = 'released'
    AND t.completed_at >= date_trunc('week', NOW());

  
  SELECT COUNT(*)
  INTO v_pending_requests
  FROM public.bookings
  WHERE guide_id = p_guide_id AND status = 'requested';

  
  SELECT COALESCE(total_trips_completed, 0)
  INTO v_completed_trips
  FROM public.guide_profiles
  WHERE id = p_guide_id;

  
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0), COUNT(*)
  INTO v_avg_rating, v_total_reviews
  FROM public.reviews
  WHERE reviewee_id = p_guide_id AND is_guide_review = TRUE;

  RETURN jsonb_build_object(
    'today_earnings_npr', v_today_earnings,
    'week_earnings_npr',  v_week_earnings,
    'pending_requests',   v_pending_requests,
    'completed_trips',    v_completed_trips,
    'avg_rating',         v_avg_rating,
    'total_reviews',      v_total_reviews
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_booking_and_release_payout(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking   bookings%ROWTYPE;
  v_txn_id    UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status <> 'accepted' THEN
    RAISE EXCEPTION 'BOOKING_NOT_ACCEPTED' USING HINT = 'Booking must be accepted before completion';
  END IF;

  
  UPDATE public.bookings
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_booking_id;

  
  UPDATE public.transactions
  SET status = 'released', completed_at = NOW()
  WHERE booking_id = p_booking_id AND status = 'held'
  RETURNING id INTO v_txn_id;

  
  IF v_txn_id IS NOT NULL THEN
    INSERT INTO public.payouts (guide_id, transaction_id, amount_npr)
    SELECT b.guide_id, v_txn_id, b.subtotal_npr
    FROM public.bookings b
    WHERE b.id = p_booking_id;
  END IF;

  RETURN jsonb_build_object('booking_id', p_booking_id, 'transaction_id', v_txn_id, 'status', 'completed');
END;
$$;
