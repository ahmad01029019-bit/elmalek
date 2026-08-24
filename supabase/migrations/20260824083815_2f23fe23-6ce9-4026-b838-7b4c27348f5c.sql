CREATE TABLE public.marketer_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  badge text,
  gradient text NOT NULL DEFAULT 'violet',
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketer_offers TO authenticated;
GRANT ALL ON public.marketer_offers TO service_role;

ALTER TABLE public.marketer_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_read_active" ON public.marketer_offers
  FOR SELECT TO authenticated
  USING (is_active OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "offers_admin_all" ON public.marketer_offers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.marketer_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid REFERENCES public.marketers(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketer_activity_logs TO authenticated;
GRANT ALL ON public.marketer_activity_logs TO service_role;

ALTER TABLE public.marketer_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_admin_read" ON public.marketer_activity_logs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "logs_own_read" ON public.marketer_activity_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketers m
    WHERE m.id = marketer_activity_logs.marketer_id AND m.user_id = auth.uid()
  ));

CREATE INDEX idx_marketer_logs_marketer ON public.marketer_activity_logs (marketer_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_marketer_offers_updated_at
  BEFORE UPDATE ON public.marketer_offers
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
