CREATE OR REPLACE FUNCTION public.share_split_item(_item_id uuid, _share boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_host_id uuid;
  v_caller_profile uuid;
BEGIN
  SELECT i.request_id, r.host_id
    INTO v_request_id, v_host_id
  FROM public.split_check_items i
  JOIN public.split_check_requests r ON r.id = i.request_id
  WHERE i.id = _item_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  SELECT id INTO v_caller_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_caller_profile IS NULL OR v_caller_profile <> v_host_id THEN
    RAISE EXCEPTION 'Only the tab host can share an item';
  END IF;

  DELETE FROM public.split_check_item_claims WHERE item_id = _item_id;

  IF _share THEN
    INSERT INTO public.split_check_item_claims (item_id, profile_id, quantity_claimed)
    SELECT _item_id, pid, 1
    FROM (
      SELECT v_host_id AS pid
      UNION
      SELECT t.profile_id FROM public.split_check_targets t
      WHERE t.request_id = v_request_id AND COALESCE(t.status, '') <> 'canceled'
    ) p
    WHERE pid IS NOT NULL
    ON CONFLICT (item_id, profile_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_split_item(uuid, boolean) TO authenticated;