

DO $$
DECLARE
  r RECORD;
  keep_id uuid;
BEGIN
  FOR r IN
    SELECT tourist_id, guide_id
    FROM public.chat_threads
    GROUP BY tourist_id, guide_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.chat_threads
    WHERE tourist_id = r.tourist_id AND guide_id = r.guide_id
    ORDER BY last_message_at DESC NULLS LAST, created_at ASC
    LIMIT 1;

    UPDATE public.chat_messages
    SET thread_id = keep_id
    WHERE thread_id IN (
      SELECT id FROM public.chat_threads
      WHERE tourist_id = r.tourist_id
        AND guide_id   = r.guide_id
        AND id        != keep_id
    );

    DELETE FROM public.chat_threads
    WHERE tourist_id = r.tourist_id
      AND guide_id   = r.guide_id
      AND id        != keep_id;
  END LOOP;
END $$;

ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS chat_threads_booking_id_key;
DROP INDEX IF EXISTS idx_chat_threads_tourist_guide_no_booking;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_tourist_guide_unique UNIQUE (tourist_id, guide_id);
