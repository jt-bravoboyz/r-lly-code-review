REVOKE ALL ON FUNCTION public.can_read_split_check_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_split_check_target(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_insert_split_check_target(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_split_check_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_split_check_target(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_split_check_target(uuid) TO authenticated;