DROP VIEW IF EXISTS public.course_curriculum;

CREATE TABLE public.course_curriculum (
  lesson_id uuid PRIMARY KEY REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id uuid,
  title text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  preview_youtube_id text
);

GRANT SELECT ON public.course_curriculum TO anon, authenticated;
GRANT ALL ON public.course_curriculum TO service_role;

ALTER TABLE public.course_curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY curriculum_published_read ON public.course_curriculum
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_curriculum.course_id AND c.is_published = true)
);

CREATE OR REPLACE FUNCTION private.sync_course_curriculum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.course_curriculum WHERE lesson_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.course_curriculum (lesson_id, course_id, section_id, title, duration_minutes, is_preview, position, preview_youtube_id)
  VALUES (NEW.id, NEW.course_id, NEW.section_id, NEW.title, NEW.duration_minutes, NEW.is_preview, NEW.position,
          CASE WHEN NEW.is_preview THEN NEW.youtube_id ELSE NULL END)
  ON CONFLICT (lesson_id) DO UPDATE SET
    course_id = EXCLUDED.course_id,
    section_id = EXCLUDED.section_id,
    title = EXCLUDED.title,
    duration_minutes = EXCLUDED.duration_minutes,
    is_preview = EXCLUDED.is_preview,
    position = EXCLUDED.position,
    preview_youtube_id = EXCLUDED.preview_youtube_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_course_curriculum() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_course_curriculum
AFTER INSERT OR UPDATE OR DELETE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION private.sync_course_curriculum();

INSERT INTO public.course_curriculum (lesson_id, course_id, section_id, title, duration_minutes, is_preview, position, preview_youtube_id)
SELECT l.id, l.course_id, l.section_id, l.title, l.duration_minutes, l.is_preview, l.position,
       CASE WHEN l.is_preview THEN l.youtube_id ELSE NULL END
FROM public.lessons l
ON CONFLICT (lesson_id) DO NOTHING;