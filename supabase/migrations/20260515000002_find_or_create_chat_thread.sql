

CREATE OR REPLACE FUNCTION public.find_or_create_chat_thread(
  p_tourist_id uuid,
  p_guide_id   uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.chat_threads (tourist_id, guide_id)
  VALUES (p_tourist_id, p_guide_id)
  ON CONFLICT (tourist_id, guide_id) DO NOTHING;

  SELECT id INTO v_id
  FROM public.chat_threads
  WHERE tourist_id = p_tourist_id AND guide_id = p_guide_id;

  RETURN v_id;
END;
$$;
