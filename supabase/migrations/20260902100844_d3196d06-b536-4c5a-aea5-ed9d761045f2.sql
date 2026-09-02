CREATE TABLE public.marketer_levels (
  level integer PRIMARY KEY,
  name text NOT NULL,
  min_students integer NOT NULL,
  max_students integer,
  commission_percent numeric NOT NULL,
  shield text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketer_levels TO anon;
GRANT SELECT ON public.marketer_levels TO authenticated;
GRANT ALL ON public.marketer_levels TO service_role;

ALTER TABLE public.marketer_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "levels readable by all" ON public.marketer_levels FOR SELECT USING (true);
CREATE POLICY "admins manage levels" ON public.marketer_levels FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

INSERT INTO public.marketer_levels (level, name, min_students, max_students, commission_percent, shield) VALUES
  (1, 'المستوى الأول — البداية', 0, 50, 10, NULL),
  (2, 'المستوى الثاني — صاعد', 51, 150, 12, NULL),
  (3, 'المستوى الثالث — نشيط', 151, 400, 14, NULL),
  (4, 'المستوى الرابع — محترف', 401, 900, 16, NULL),
  (5, 'المستوى الخامس — متميّز', 901, 1800, 18, NULL),
  (6, 'المستوى السادس — خبير', 1801, 3000, 21, NULL),
  (7, 'المستوى السابع — قائد', 3001, 5000, 24, NULL),
  (8, 'نخبة الموسم', 5001, 20000, 27, 'درع الـ 20k الفاخر'),
  (9, 'أسطورة الملك', 20001, 50000, 30, 'درع الـ 50k الذهبي'),
  (10, 'قمة الإنجاز', 50001, 100000, 32, 'درع الـ 100k الماسي'),
  (11, 'الملك — الشريك الاستراتيجي', 100001, NULL, 35, NULL);

CREATE TABLE public.marketer_email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'marketer_signup',
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.marketer_email_otps TO service_role;

ALTER TABLE public.marketer_email_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX marketer_email_otps_email_idx ON public.marketer_email_otps (email, created_at DESC);

ALTER TABLE public.marketers
  ADD COLUMN IF NOT EXISTS season_students integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_year text,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS discount_offset numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_students integer NOT NULL DEFAULT 0;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS is_new_customer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS level_at_time integer;

ALTER TABLE public.promo_redemptions
  ADD COLUMN IF NOT EXISTS academic_year text;

ALTER TABLE public.promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_promo_code_id_student_id_key;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS academic_year_start_month integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS repeat_commission_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_offset_percent numeric NOT NULL DEFAULT 5;

UPDATE public.platform_settings SET max_uses_per_student = 5 WHERE id = 1 AND max_uses_per_student < 5;

CREATE TRIGGER trg_marketer_levels_updated_at
  BEFORE UPDATE ON public.marketer_levels
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();