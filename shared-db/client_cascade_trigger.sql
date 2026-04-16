CREATE OR REPLACE FUNCTION cascade_delete_client_data()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id TEXT;
  v_num_id TEXT;
BEGIN
  -- Extract the NUMERIC id as text (e.g. "1")
  v_num_id := OLD.id::TEXT;
  -- Construct the CLI prefixed ID that is used in some tables
  v_client_id := 'CLI-' || OLD.id::TEXT;

  -- Purge relational data across the platform
  DELETE FROM public.sessions WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.documents WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.schedule WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.academic_baselines WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.probes WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.program_mastery WHERE "clientId" IN (v_num_id, v_client_id);
  DELETE FROM public.mass_trials WHERE "clientId" IN (v_num_id, v_client_id);
  
  -- Prevent "table does not exist" errors nicely during execution in case certain tables aren't deployed yet
  BEGIN DELETE FROM public.daily_routines WHERE "clientId" IN (v_num_id, v_client_id); EXCEPTION WHEN undefined_table THEN END;
  BEGIN DELETE FROM public.transaction_sheets WHERE "clientId" IN (v_num_id, v_client_id); EXCEPTION WHEN undefined_table THEN END;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cascade_delete_client_data ON public.clients;
CREATE TRIGGER trg_cascade_delete_client_data
AFTER DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION cascade_delete_client_data();
