

CREATE TABLE IF NOT EXISTS public.license_verifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id         uuid NOT NULL REFERENCES public.guide_profiles(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'not_submitted'
                   CHECK (status IN ('not_submitted','pending','approved','rejected')),
  license_number   text,
  license_url      text,
  submitted_at     timestamptz,
  reviewed_at      timestamptz,
  reviewed_by      uuid REFERENCES public.profiles(id),
  rejection_reason text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(guide_id)
);

CREATE INDEX IF NOT EXISTS idx_license_guide ON public.license_verifications(guide_id);

ALTER TABLE public.license_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_guide_select" ON public.license_verifications;
DROP POLICY IF EXISTS "license_guide_insert" ON public.license_verifications;
DROP POLICY IF EXISTS "license_guide_update" ON public.license_verifications;
DROP POLICY IF EXISTS "license_admin_all"    ON public.license_verifications;

CREATE POLICY "license_guide_select" ON public.license_verifications FOR SELECT TO authenticated USING (guide_id = auth.uid());
CREATE POLICY "license_guide_insert" ON public.license_verifications FOR INSERT TO authenticated WITH CHECK (guide_id = auth.uid());
CREATE POLICY "license_guide_update" ON public.license_verifications FOR UPDATE TO authenticated USING (guide_id = auth.uid());
CREATE POLICY "license_admin_all"    ON public.license_verifications FOR ALL    TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.sync_license_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.guide_profiles
  SET ntb_license_status = NEW.status
  WHERE id = NEW.guide_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_license_status ON public.license_verifications;
CREATE TRIGGER trg_sync_license_status
  AFTER INSERT OR UPDATE OF status ON public.license_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_license_status();
