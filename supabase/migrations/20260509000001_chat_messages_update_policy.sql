-- Allow participants in a thread to mark messages as read
CREATE POLICY "Mark messages read in own threads"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (t.tourist_id = auth.uid() OR t.guide_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (t.tourist_id = auth.uid() OR t.guide_id = auth.uid())
    )
  );

-- Allow guides to insert into chat_threads (needed when guide accepts a request)
CREATE POLICY "Guide can create chat thread"
  ON public.chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (guide_id = auth.uid());
