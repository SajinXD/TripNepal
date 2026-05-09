-- ============================================================
-- MIGRATION: 20260101000005_storage.sql
-- Trip Nepal — Storage Buckets & Policies
-- ============================================================

-- ============================================================
-- BUCKETS
-- ============================================================

-- Public bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', TRUE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public bucket for destination images (managed by admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'destination-images', 'destination-images', TRUE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- PRIVATE bucket for KYC documents (citizenship, license, selfie)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents', 'kyc-documents', FALSE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- PRIVATE bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 'chat-attachments', FALSE,
  20971520,  -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS — avatars (public read, own write)
-- ============================================================

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================
-- STORAGE RLS — destination-images (public read, admin write)
-- ============================================================

CREATE POLICY "destination_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'destination-images');

CREATE POLICY "destination_images_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'destination-images'
    AND public.is_admin()
  );

CREATE POLICY "destination_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'destination-images'
    AND public.is_admin()
  );

-- ============================================================
-- STORAGE RLS — kyc-documents (PRIVATE: own guide + admin only)
-- ============================================================

-- Guides can upload their own KYC documents
-- Path convention: kyc-documents/{user_id}/{filename}
CREATE POLICY "kyc_docs_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Guides can read their own KYC documents; admins can read all
CREATE POLICY "kyc_docs_read_own_or_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_admin()
    )
  );

-- Guides can delete/replace their own documents (for resubmission)
CREATE POLICY "kyc_docs_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "kyc_docs_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================
-- STORAGE RLS — chat-attachments (PRIVATE: thread participants only)
-- Path convention: chat-attachments/{thread_id}/{filename}
-- ============================================================

-- Upload: must be a thread participant
CREATE POLICY "chat_attachments_upload_participant"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id = ((storage.foldername(name))[1])::UUID
        AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())
    )
  );

-- Read: must be a thread participant
CREATE POLICY "chat_attachments_read_participant"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM public.chat_threads ct
        WHERE ct.id = ((storage.foldername(name))[1])::UUID
          AND (ct.tourist_id = auth.uid() OR ct.guide_id = auth.uid())
      )
      OR public.is_admin()
    )
  );

-- Admins can manage all storage
CREATE POLICY "storage_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (public.is_admin());
