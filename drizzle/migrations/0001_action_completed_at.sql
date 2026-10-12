CREATE OR REPLACE FUNCTION public.stamp_action() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN NEW.completed_at := now(); END IF;
  IF NEW.status <> 'done' THEN NEW.completed_at := NULL; END IF;
  NEW.team_id := OLD.team_id; NEW.incident_id := OLD.incident_id; NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;
CREATE TRIGGER actions_stamp BEFORE UPDATE ON public.incident_actions FOR EACH ROW EXECUTE FUNCTION public.stamp_action();
CREATE OR REPLACE FUNCTION public.guard_event_team() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER events_guard BEFORE INSERT ON public.incident_events FOR EACH ROW
  WHEN (current_user = 'authenticated') EXECUTE FUNCTION public.guard_event_team();