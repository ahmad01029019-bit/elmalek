
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','student','marketer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  stage text,
  track text,
  edu_type text,
  avatar_url text,
  wallet_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, stage, track, edu_type)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'stage',
    NEW.raw_user_meta_data->>'track',
    NEW.raw_user_meta_data->>'edu_type');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TEACHERS
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  bio text,
  avatar_url text,
  stages text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers_public_read" ON public.teachers FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "teachers_admin_all" ON public.teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COURSES
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'ثانوي',
  grade text,
  track text,
  edu_type text NOT NULL DEFAULT 'عام',
  price numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.course_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT ALL ON public.course_sections TO service_role;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_public_read" ON public.course_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sections_admin_all" ON public.course_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.course_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  youtube_id text,
  duration_minutes int NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lesson_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL
);
GRANT SELECT ON public.lesson_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_attachments TO authenticated;
GRANT ALL ON public.lesson_attachments TO service_role;
ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attach_public_read" ON public.lesson_attachments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "attach_admin_all" ON public.lesson_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- QUIZZES
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "quizzes_admin_all" ON public.quizzes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'mcq',
  body text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  marks numeric NOT NULL DEFAULT 1,
  teacher_note text,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  score numeric NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_own" ON public.quiz_attempts FOR ALL TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer text,
  is_correct boolean,
  awarded_marks numeric NOT NULL DEFAULT 0,
  feedback text,
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempt_answers TO authenticated;
GRANT ALL ON public.attempt_answers TO service_role;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_own" ON public.attempt_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND (a.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND (a.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ENROLLMENTS / PROGRESS / CART / WALLET
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  price_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enroll_own" ON public.enrollments FOR ALL TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_own" ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  kind text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_own" ON public.wallet_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- LIBRARY
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'ثانوي',
  cover_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO authenticated;
GRANT ALL ON public.library_books TO service_role;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_public_read" ON public.library_books FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "books_admin_all" ON public.library_books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  title text NOT NULL,
  pdf_url text,
  solution_youtube_id text,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.book_chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_chapters TO authenticated;
GRANT ALL ON public.book_chapters TO service_role;
ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_public_read" ON public.book_chapters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chapters_admin_all" ON public.book_chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MARKETERS
CREATE TABLE public.marketers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'pending',
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketers TO authenticated;
GRANT ALL ON public.marketers TO service_role;
ALTER TABLE public.marketers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketers_own" ON public.marketers FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid REFERENCES public.marketers(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL DEFAULT 10,
  commission_percent numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  uses_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_owner" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid()));

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_read" ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid()));

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'محفظة إلكترونية',
  account_ref text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_owner" ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid()));

-- SEED
INSERT INTO public.teachers (id, name, slug, subject, bio, stages) VALUES
 ('11111111-1111-1111-1111-111111111111','أ. محمد السيد','mohamed-elsayed','الرياضيات','خبرة 15 عامًا في تدريس الرياضيات للثانوية العامة والأزهرية.','{"ثانوي"}'),
 ('22222222-2222-2222-2222-222222222222','أ. سارة إبراهيم','sara-ibrahim','اللغة الإنجليزية','متخصصة في مناهج اللغات والثانوية العامة.','{"إعدادي","ثانوي"}'),
 ('33333333-3333-3333-3333-333333333333','أ. أحمد فتحي','ahmed-fathy','الفيزياء','شرح مبسط للفيزياء مع تدريبات وامتحانات إلكترونية.','{"ثانوي"}');

INSERT INTO public.courses (id, teacher_id, title, description, subject, stage, grade, track, edu_type, price, is_free, cover_url) VALUES
 ('aaaaaaa1-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','التفاضل والتكامل — الصف الثالث الثانوي','كورس شامل لمنهج التفاضل والتكامل مع حل الامتحانات السابقة.','الرياضيات','ثانوي','الثالث الثانوي','علمي','عام',350,false,null),
 ('aaaaaaa1-0000-4000-8000-000000000002','22222222-2222-2222-2222-222222222222','مراجعة اللغة الإنجليزية — الثالث الإعدادي','مراجعة نهائية مجانية على منهج اللغة الإنجليزية.','اللغة الإنجليزية','إعدادي','الثالث الإعدادي',null,'عام',0,true,null),
 ('aaaaaaa1-0000-4000-8000-000000000003','33333333-3333-3333-3333-333333333333','الفيزياء الحديثة — الثالث الثانوي','شرح الفصول مع اختبارات إلكترونية بتصحيح فوري.','الفيزياء','ثانوي','الثالث الثانوي','علمي','أزهري',300,false,null),
 ('aaaaaaa1-0000-4000-8000-000000000004','22222222-2222-2222-2222-222222222222','أساسيات القواعد الإنجليزية — مجاني','دروس مجانية في القواعد لجميع المراحل.','اللغة الإنجليزية','ثانوي','الأول الثانوي','لغات','لغات',0,true,null);

INSERT INTO public.course_sections (id, course_id, title, position) VALUES
 ('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','الوحدة الأولى: النهايات',1),
 ('bbbbbbb1-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000002','المراجعة النهائية',1),
 ('bbbbbbb1-0000-4000-8000-000000000004','aaaaaaa1-0000-4000-8000-000000000004','القواعد الأساسية',1);

INSERT INTO public.lessons (id, course_id, section_id, title, youtube_id, duration_minutes, is_preview, position) VALUES
 ('ccccccc1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','مقدمة النهايات','WUvTyaaNkzM',22,true,1),
 ('ccccccc1-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','قواعد حساب النهايات','kJQP7kiw5Fk',31,false,2),
 ('ccccccc1-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000002','مراجعة الأزمنة','yPYZpwSpKmA',28,true,1),
 ('ccccccc1-0000-4000-8000-000000000004','aaaaaaa1-0000-4000-8000-000000000004','bbbbbbb1-0000-4000-8000-000000000004','Present Simple','2Vv-BfVoq4g',18,true,1);

INSERT INTO public.quizzes (id, course_id, lesson_id, title, duration_minutes) VALUES
 ('ddddddd1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','ccccccc1-0000-4000-8000-000000000001','اختبار النهايات',20),
 ('ddddddd1-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000002','ccccccc1-0000-4000-8000-000000000003','اختبار الأزمنة',15);

INSERT INTO public.questions (quiz_id, question_type, body, options, correct_answer, marks, teacher_note, position) VALUES
 ('ddddddd1-0000-4000-8000-000000000001','mcq','ما هي نهاية الدالة س² عندما تؤول س إلى 2؟','["2","4","8","0"]','4',2,'عوّض مباشرة في الدالة لأنها متصلة.',1),
 ('ddddddd1-0000-4000-8000-000000000001','truefalse','النهاية عند نقطة قد توجد حتى لو كانت الدالة غير معرفة عندها.','["صح","خطأ"]','صح',1,'وجود النهاية لا يشترط تعريف الدالة عند النقطة.',2),
 ('ddddddd1-0000-4000-8000-000000000001','essay','اشرح بأسلوبك مفهوم النهاية وأهميتها في التفاضل.','[]',null,3,'يراعى ذكر الاقتراب من القيمة وأهمية النهاية في تعريف المشتقة.',3),
 ('ddddddd1-0000-4000-8000-000000000002','mcq','Choose the correct form: He ____ to school every day.','["go","goes","going","gone"]','goes',2,'الفاعل مفرد غائب يأخذ s في المضارع البسيط.',1),
 ('ddddddd1-0000-4000-8000-000000000002','essay','Write three sentences about your daily routine.','[]',null,3,'يُراعى استخدام المضارع البسيط وصحة التراكيب.',2);

INSERT INTO public.library_books (id, title, description, subject, stage) VALUES
 ('eeeeeee1-0000-4000-8000-000000000001','كتاب الملك في الرياضيات','بنك أسئلة شامل مع فيديوهات حل لكل تمرين.','الرياضيات','ثانوي'),
 ('eeeeeee1-0000-4000-8000-000000000002','كتاب الملك في اللغة الإنجليزية','تدريبات وامتحانات مع شرح الحل بالفيديو.','اللغة الإنجليزية','إعدادي');

INSERT INTO public.book_chapters (book_id, title, solution_youtube_id, position) VALUES
 ('eeeeeee1-0000-4000-8000-000000000001','الفصل الأول: الجبر','WUvTyaaNkzM',1),
 ('eeeeeee1-0000-4000-8000-000000000001','الفصل الثاني: الهندسة الفراغية','kJQP7kiw5Fk',2),
 ('eeeeeee1-0000-4000-8000-000000000002','Unit 1: Vocabulary','yPYZpwSpKmA',1);

INSERT INTO public.promo_codes (code, discount_percent, commission_percent) VALUES ('WELCOME10',10,10);
