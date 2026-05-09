-- ============================================================
-- Chat Requests table
-- Tourists send a connect request to a guide; guide must accept
-- before a chat_thread is created and messaging opens.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_requests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tourist_id  uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  guide_id    uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  message     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(tourist_id, guide_id)
);

ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

-- Involved parties can read their own requests
CREATE POLICY "chat_requests_read_own"
  ON public.chat_requests FOR SELECT
  TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid());

-- Only tourists can create requests (tourist_id must be their own uid)
CREATE POLICY "chat_requests_tourist_insert"
  ON public.chat_requests FOR INSERT
  TO authenticated
  WITH CHECK (tourist_id = auth.uid());

-- Either party can update status (guide accepts/rejects, tourist cancels)
CREATE POLICY "chat_requests_update_own"
  ON public.chat_requests FOR UPDATE
  TO authenticated
  USING (tourist_id = auth.uid() OR guide_id = auth.uid());

-- Tourist can delete (cancel) their own request
CREATE POLICY "chat_requests_tourist_delete"
  ON public.chat_requests FOR DELETE
  TO authenticated
  USING (tourist_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_chat_requests_updated_at
  BEFORE UPDATE ON public.chat_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
