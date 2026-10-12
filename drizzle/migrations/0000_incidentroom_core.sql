-- ===== Enums =====
CREATE TYPE public.team_role AS ENUM ('owner', 'responder', 'viewer');
CREATE TYPE public.incident_status AS ENUM ('detected','investigating','mitigating','monitoring','resolved');
CREATE TYPE public.action_priority AS ENUM ('critical','high','medium','low');
CREATE TYPE public.action_status AS ENUM ('pending','in_progress','done');
CREATE TYPE public.event_kind AS ENUM ('update','decision','system','status','people');
CREATE TYPE public.notif_category AS ENUM ('mentions','assignments','updates','system');

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== Teams =====
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'responder',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX team_members_user_idx ON public.team_members(user_id);
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_member(_team uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team AND user_id = _user)
$$;
CREATE OR REPLACE FUNCTION public.can_edit_team(_team uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team AND user_id = _user AND role IN ('owner','responder'))
$$;
CREATE OR REPLACE FUNCTION public.is_team_owner(_team uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team AND user_id = _user AND role = 'owner')
$$;
CREATE OR REPLACE FUNCTION public.shares_team(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members m1 JOIN public.team_members m2 ON m1.team_id = m2.team_id
                 WHERE m1.user_id = _a AND m2.user_id = _b)
$$;

CREATE POLICY "profiles visible to self and teammates" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_team(auth.uid(), id));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "members read team" ON public.teams FOR SELECT TO authenticated USING (public.is_team_member(id, auth.uid()));
CREATE POLICY "owners rename team" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_owner(id, auth.uid())) WITH CHECK (public.is_team_owner(id, auth.uid()));
CREATE POLICY "members read membership" ON public.team_members FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));

-- ===== Incidents =====
CREATE SEQUENCE public.incident_ref_seq START 2001;
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  ref text NOT NULL UNIQUE DEFAULT ('INC-' || nextval('public.incident_ref_seq')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  sev smallint NOT NULL CHECK (sev BETWEEN 1 AND 4),
  status public.incident_status NOT NULL DEFAULT 'detected',
  team_label text NOT NULL DEFAULT 'Platform' CHECK (char_length(team_label) <= 60),
  impact text NOT NULL DEFAULT 'Impact being assessed' CHECK (char_length(impact) <= 300),
  systems text[] NOT NULL DEFAULT '{}',
  commander_id uuid,
  tech_id uuid,
  comms_id uuid,
  observer_id uuid,
  current_text text NOT NULL DEFAULT 'Incident declared.' CHECK (char_length(current_text) <= 1000),
  current_by uuid,
  current_at timestamptz NOT NULL DEFAULT now(),
  root_cause text CHECK (char_length(root_cause) <= 2000),
  resolution text CHECK (char_length(resolution) <= 2000),
  summary text CHECK (char_length(summary) <= 4000),
  is_sample boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidents_team_idx ON public.incidents(team_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read incidents" ON public.incidents FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "editors create incidents" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_team(team_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "editors update incidents" ON public.incidents FOR UPDATE TO authenticated
  USING (public.can_edit_team(team_id, auth.uid())) WITH CHECK (public.can_edit_team(team_id, auth.uid()));
CREATE POLICY "owners delete incidents" ON public.incidents FOR DELETE TO authenticated USING (public.is_team_owner(team_id, auth.uid()));

-- ===== Events (timeline) =====
CREATE TABLE public.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  kind public.event_kind NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  note text CHECK (char_length(note) <= 2000),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_events_inc_idx ON public.incident_events(incident_id, created_at DESC);
GRANT SELECT, INSERT ON public.incident_events TO authenticated;
GRANT ALL ON public.incident_events TO service_role;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.incident_events FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "editors add events" ON public.incident_events FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_team(team_id, auth.uid()) AND actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.team_id = incident_events.team_id));

-- ===== Actions =====
CREATE TABLE public.incident_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  owner_id uuid NOT NULL,
  priority public.action_priority NOT NULL DEFAULT 'medium',
  status public.action_status NOT NULL DEFAULT 'pending',
  due_label text CHECK (char_length(due_label) <= 30),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX incident_actions_inc_idx ON public.incident_actions(incident_id);
CREATE INDEX incident_actions_owner_idx ON public.incident_actions(owner_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_actions TO authenticated;
GRANT ALL ON public.incident_actions TO service_role;
ALTER TABLE public.incident_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read actions" ON public.incident_actions FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "editors add actions" ON public.incident_actions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_team(team_id, auth.uid()) AND public.is_team_member(team_id, owner_id)
    AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.team_id = incident_actions.team_id));
CREATE POLICY "editors update actions" ON public.incident_actions FOR UPDATE TO authenticated
  USING (public.can_edit_team(team_id, auth.uid())) WITH CHECK (public.can_edit_team(team_id, auth.uid()) AND public.is_team_member(team_id, owner_id));
CREATE POLICY "editors delete actions" ON public.incident_actions FOR DELETE TO authenticated USING (public.can_edit_team(team_id, auth.uid()));

-- ===== Audit log (written only by triggers) =====
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  incident_ref text,
  actor_id uuid,
  verb text NOT NULL,
  object text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_team_idx ON public.audit_log(team_id, created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));

-- ===== Notifications (written only by triggers) =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category public.notif_category NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications mark read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== AI usage (rate limiting, server-written) =====
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task text NOT NULL,
  provider text NOT NULL,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_idx ON public.ai_usage(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai usage read" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own ai usage insert" ON public.ai_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ===== Triggers =====
CREATE OR REPLACE FUNCTION public.touch_incident() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN NEW.resolved_at := now(); END IF;
  IF NEW.status <> 'resolved' THEN NEW.resolved_at := NULL; END IF;
  -- immutable fields
  NEW.team_id := OLD.team_id; NEW.ref := OLD.ref; NEW.created_by := OLD.created_by; NEW.started_at := OLD.started_at;
  RETURN NEW;
END $$;
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_incident();

CREATE OR REPLACE FUNCTION public.audit_incident() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.id, NEW.ref, auth.uid(), 'created incident', NEW.ref || ' · ' || NEW.title);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.id, NEW.ref, auth.uid(), 'changed status', upper(OLD.status::text) || ' → ' || upper(NEW.status::text));
    FOR m IN SELECT user_id FROM team_members WHERE team_id = NEW.team_id AND user_id IS DISTINCT FROM auth.uid() LOOP
      INSERT INTO notifications(user_id, category, title, body)
        VALUES (m.user_id, 'updates', NEW.ref || ' is now ' || upper(NEW.status::text), NEW.title);
    END LOOP;
  END IF;
  IF NEW.sev IS DISTINCT FROM OLD.sev THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.id, NEW.ref, auth.uid(), 'changed severity', 'SEV-' || OLD.sev || ' → SEV-' || NEW.sev);
  END IF;
  IF NEW.commander_id IS DISTINCT FROM OLD.commander_id THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.id, NEW.ref, auth.uid(), 'changed incident commander', NEW.ref);
  END IF;
  IF NEW.current_text IS DISTINCT FROM OLD.current_text THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.id, NEW.ref, auth.uid(), 'updated current status', left(NEW.current_text, 80));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER incidents_audit_ins AFTER INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.audit_incident();
CREATE TRIGGER incidents_audit_upd AFTER UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.audit_incident();

CREATE OR REPLACE FUNCTION public.audit_incident_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
    VALUES (OLD.team_id, NULL, OLD.ref, auth.uid(), 'deleted incident', OLD.ref || ' · ' || OLD.title);
  RETURN OLD;
END $$;
CREATE TRIGGER incidents_audit_del BEFORE DELETE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.audit_incident_delete();

CREATE OR REPLACE FUNCTION public.audit_action() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text; owner_name text;
BEGIN
  SELECT ref INTO r FROM incidents WHERE id = NEW.incident_id;
  SELECT coalesce(nullif(display_name,''), email) INTO owner_name FROM profiles WHERE id = NEW.owner_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.incident_id, r, auth.uid(), 'assigned action to ' || coalesce(owner_name,'teammate'), NEW.title);
    IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
      INSERT INTO notifications(user_id, category, title, body) VALUES (NEW.owner_id, 'assignments', 'You were assigned an action', NEW.title || ' · ' || r);
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN NEW.completed_at := now(); END IF;
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.incident_id, r, auth.uid(), CASE WHEN NEW.status = 'done' THEN 'completed action' ELSE 'moved action to ' || NEW.status::text END, NEW.title);
  ELSIF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.incident_id, r, auth.uid(), 'reassigned action to ' || coalesce(owner_name,'teammate'), NEW.title);
    IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
      INSERT INTO notifications(user_id, category, title, body) VALUES (NEW.owner_id, 'assignments', 'You were assigned an action', NEW.title || ' · ' || r);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER actions_audit_ins AFTER INSERT ON public.incident_actions FOR EACH ROW EXECUTE FUNCTION public.audit_action();
CREATE TRIGGER actions_audit_upd AFTER UPDATE ON public.incident_actions FOR EACH ROW EXECUTE FUNCTION public.audit_action();

CREATE OR REPLACE FUNCTION public.audit_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  IF NEW.kind IN ('update','decision','system') THEN
    SELECT ref INTO r FROM incidents WHERE id = NEW.incident_id;
    INSERT INTO audit_log(team_id, incident_id, incident_ref, actor_id, verb, object)
      VALUES (NEW.team_id, NEW.incident_id, r, NEW.actor_id,
        CASE NEW.kind WHEN 'decision' THEN 'recorded decision' WHEN 'system' THEN 'logged system event' ELSE 'posted update' END,
        left(coalesce(NEW.note, NEW.title), 80));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER events_audit AFTER INSERT ON public.incident_events FOR EACH ROW EXECUTE FUNCTION public.audit_event();

-- ===== Signup: profile + personal team =====
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t uuid; nm text;
BEGIN
  nm := coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''), nullif(NEW.raw_user_meta_data->>'name',''), split_part(NEW.email, '@', 1));
  INSERT INTO profiles(id, display_name, email) VALUES (NEW.id, left(nm, 80), coalesce(NEW.email,''));
  INSERT INTO teams(name) VALUES (left(nm, 60) || '''s team') RETURNING id INTO t;
  INSERT INTO team_members(team_id, user_id, role) VALUES (t, NEW.id, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Team management RPCs =====
CREATE OR REPLACE FUNCTION public.add_team_member(_team uuid, _email text, _role public.team_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT is_team_owner(_team, auth.uid()) THEN RAISE EXCEPTION 'Only team owners can add members'; END IF;
  SELECT id INTO u FROM profiles WHERE lower(email) = lower(trim(_email));
  IF u IS NULL THEN RAISE EXCEPTION 'No IncidentRoom account uses that email. Ask them to sign up first.'; END IF;
  INSERT INTO team_members(team_id, user_id, role) VALUES (_team, u, _role)
    ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO audit_log(team_id, actor_id, verb, object) VALUES (_team, auth.uid(), 'added team member as ' || _role::text, _email);
END $$;

CREATE OR REPLACE FUNCTION public.remove_team_member(_team uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_team_owner(_team, auth.uid()) THEN RAISE EXCEPTION 'Only team owners can remove members'; END IF;
  IF _user = auth.uid() THEN RAISE EXCEPTION 'Owners cannot remove themselves'; END IF;
  DELETE FROM team_members WHERE team_id = _team AND user_id = _user;
  INSERT INTO audit_log(team_id, actor_id, verb, object) VALUES (_team, auth.uid(), 'removed team member', _user::text);
END $$;

-- Sample data: isolated, flagged is_sample, only into the caller's own team
CREATE OR REPLACE FUNCTION public.load_sample_incidents(_team uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); i1 uuid; i2 uuid;
BEGIN
  IF NOT is_team_owner(_team, me) THEN RAISE EXCEPTION 'Only team owners can load sample data'; END IF;
  INSERT INTO incidents(team_id, title, sev, status, team_label, impact, systems, commander_id, tech_id, comms_id, current_text, current_by, root_cause, resolution, is_sample, started_at, created_by)
    VALUES (_team, '[Sample] Checkout API latency', 1, 'mitigating', 'Payments', '28% of checkout requests', ARRAY['API','Database'], me, me, me,
      'Database connection pool saturation is causing elevated API latency.', me, 'Database connection pool saturation.', 'Connection pool increased to 250.', true, now() - interval '18 minutes', me)
    RETURNING id INTO i1;
  INSERT INTO incident_events(incident_id, team_id, kind, title, note, actor_id, created_at) VALUES
    (i1, _team, 'system', 'Incident detected', 'Checkout p95 latency above 2s for 3 minutes.', me, now() - interval '18 minutes'),
    (i1, _team, 'update', 'Investigation started', 'API latency appears correlated with database load.', me, now() - interval '14 minutes'),
    (i1, _team, 'decision', 'Database issue identified', 'Primary database showing connection saturation.', me, now() - interval '11 minutes'),
    (i1, _team, 'status', 'Mitigation deployed', 'Connection pool increased from 100 → 250.', me, now() - interval '8 minutes');
  INSERT INTO incident_actions(incident_id, team_id, title, owner_id, priority, status, due_label, created_by) VALUES
    (i1, _team, 'Verify checkout recovery', me, 'high', 'pending', '15 min', me),
    (i1, _team, 'Identify source of latency', me, 'critical', 'done', NULL, me);
  INSERT INTO incidents(team_id, title, sev, status, team_label, impact, systems, commander_id, current_text, current_by, is_sample, started_at, created_by)
    VALUES (_team, '[Sample] Delayed analytics events', 3, 'monitoring', 'Data', 'Dashboards delayed by ~15 min', ARRAY['Infrastructure'], me,
      'Queue consumers scaled up; backlog draining steadily.', me, true, now() - interval '72 minutes', me)
    RETURNING id INTO i2;
  INSERT INTO incident_events(incident_id, team_id, kind, title, note, actor_id, created_at) VALUES
    (i2, _team, 'system', 'Incident detected', 'Event lag above 10 minutes.', me, now() - interval '72 minutes');
END $$;

CREATE OR REPLACE FUNCTION public.clear_sample_incidents(_team uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_team_owner(_team, auth.uid()) THEN RAISE EXCEPTION 'Only team owners can clear sample data'; END IF;
  DELETE FROM incidents WHERE team_id = _team AND is_sample = true;
END $$;

REVOKE EXECUTE ON FUNCTION public.add_team_member, public.remove_team_member, public.load_sample_incidents, public.clear_sample_incidents FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_team_member, public.remove_team_member, public.load_sample_incidents, public.clear_sample_incidents TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents, public.incident_events, public.incident_actions, public.notifications;