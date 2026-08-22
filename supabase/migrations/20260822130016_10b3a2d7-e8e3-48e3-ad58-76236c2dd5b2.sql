-- 1. Move SECURITY DEFINER functions out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = private, public;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
ALTER FUNCTION private.handle_new_user() SET search_path = private, public;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

-- helper: enrollment check
CREATE OR REPLACE FUNCTION private.is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = _user_id AND e.course_id = _course_id);
$$;
REVOKE ALL ON FUNCTION private.is_enrolled(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_enrolled(uuid, uuid) TO authenticated, service_role;

-- 2. lessons
DROP POLICY IF EXISTS lessons_public_read ON public.lessons;
CREATE POLICY lessons_preview_read ON public.lessons
FOR SELECT TO anon, authenticated
USING (
  is_preview = true
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.is_published = true)
);
CREATE POLICY lessons_enrolled_read ON public.lessons
FOR SELECT TO authenticated
USING (private.is_enrolled(auth.uid(), lessons.course_id));

-- 3. lesson_attachments
DROP POLICY IF EXISTS attach_public_read ON public.lesson_attachments;
CREATE POLICY attach_preview_read ON public.lesson_attachments
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_attachments.lesson_id AND l.is_preview = true AND c.is_published = true
  )
);
CREATE POLICY attach_enrolled_read ON public.lesson_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_attachments.lesson_id
      AND private.is_enrolled(auth.uid(), l.course_id)
  )
);

-- 4. quizzes
DROP POLICY IF EXISTS quizzes_public_read ON public.quizzes;
CREATE POLICY quizzes_enrolled_read ON public.quizzes
FOR SELECT TO authenticated
USING (
  (quizzes.course_id IS NOT NULL AND private.is_enrolled(auth.uid(), quizzes.course_id))
  OR (
    quizzes.lesson_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = quizzes.lesson_id AND private.is_enrolled(auth.uid(), l.course_id)
    )
  )
);

-- 5. course_sections
DROP POLICY IF EXISTS sections_public_read ON public.course_sections;
CREATE POLICY sections_published_read ON public.course_sections
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_sections.course_id AND c.is_published = true)
);

-- 6. book_chapters
DROP POLICY IF EXISTS chapters_public_read ON public.book_chapters;
CREATE POLICY chapters_published_read ON public.book_chapters
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.library_books b WHERE b.id = book_chapters.book_id AND b.is_published = true)
);

-- 7. Public-safe curriculum view (titles/durations only; video ids only for preview lessons)
CREATE OR REPLACE VIEW public.course_curriculum
WITH (security_invoker = off) AS
SELECT
  l.id,
  l.course_id,
  l.section_id,
  l.title,
  l.duration_minutes,
  l.is_preview,
  l.position,
  CASE WHEN l.is_preview THEN l.youtube_id ELSE NULL END AS youtube_id
FROM public.lessons l
JOIN public.courses c ON c.id = l.course_id
WHERE c.is_published = true;

GRANT SELECT ON public.course_curriculum TO anon, authenticated, service_role;