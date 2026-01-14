-- RPC: preview OT doc_no by calling the atomic next-number function
-- NOTE: this will advance the counter (it reserves a number). Use with care.

CREATE OR REPLACE FUNCTION public.tpr_preview_ot_doc_no(p_request_date date)
RETURNS TABLE(doc_no text, doc_period text, doc_seq integer)
LANGUAGE sql
AS $$
  SELECT doc_no, doc_period, doc_seq FROM public.tpr_next_ot_doc_no(p_request_date);
$$;
