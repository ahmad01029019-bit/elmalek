CREATE TABLE IF NOT EXISTS public.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_discount_percent numeric NOT NULL DEFAULT 10,
  default_commission_percent numeric NOT NULL DEFAULT 10,
  min_payout_amount numeric NOT NULL DEFAULT 1000,
  max_uses_per_student int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_read ON public.platform_settings;
CREATE POLICY settings_read ON public.platform_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS settings_admin_write ON public.platform_settings;
CREATE POLICY settings_admin_write ON public.platform_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, student_id)
);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS redemptions_read ON public.promo_redemptions;
CREATE POLICY redemptions_read ON public.promo_redemptions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  ref_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_notifications_admin ON public.admin_notifications;
CREATE POLICY admin_notifications_admin ON public.admin_notifications FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS admin_notifications_admin_update ON public.admin_notifications;
CREATE POLICY admin_notifications_admin_update ON public.admin_notifications FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public AS $$
DECLARE
  _role public.app_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, stage, track, edu_type)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'stage',
    NEW.raw_user_meta_data->>'track',
    NEW.raw_user_meta_data->>'edu_type')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'marketer' THEN
    INSERT INTO public.marketers (user_id, display_name, phone, status)
    VALUES (NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email),
      NEW.raw_user_meta_data->>'phone',
      'approved')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.admin_notifications (kind, title, body, ref_id)
    VALUES ('marketer_signup', 'مسوّق جديد سجّل في المنصة',
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email), NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.promo_codes ALTER COLUMN discount_percent SET DEFAULT 10;
ALTER TABLE public.promo_codes ALTER COLUMN commission_percent SET DEFAULT 10;