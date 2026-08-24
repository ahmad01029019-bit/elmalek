import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { STAGES, TRACKS, EDU_TYPES, formatEGP } from "@/lib/education";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | منصة المُلك" },
      {
        name: "description",
        content: "إدارة المعلمين والكورسات والدروس والاختبارات والمكتبة والمسوقين في منصة المُلك.",
      },
      { property: "og:title", content: "لوحة الإدارة | منصة المُلك" },
      { property: "og:description", content: "إدارة كاملة لمحتوى المنصة التعليمية." },
    ],
  }),
  component: AdminPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl card-soft p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Picker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? "اختر"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AdminPage() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return (
      <AppShell title="لوحة الإدارة">
        <p className="rounded-2xl card-soft p-8 text-center text-sm text-muted-foreground">
          هذه الصفحة متاحة لمديري المنصة فقط.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة الإدارة">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="teachers">المعلمون</TabsTrigger>
          <TabsTrigger value="courses">الكورسات</TabsTrigger>
          <TabsTrigger value="lessons">الدروس</TabsTrigger>
          <TabsTrigger value="quizzes">الاختبارات</TabsTrigger>
          <TabsTrigger value="library">المكتبة</TabsTrigger>
          <TabsTrigger value="students">الطلاب</TabsTrigger>
          <TabsTrigger value="marketers">المسوّقون</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersTab />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>
        <TabsContent value="lessons">
          <LessonsTab />
        </TabsContent>
        <TabsContent value="quizzes">
          <QuizzesTab />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="marketers">
          <MarketersTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [teachers, courses, students, enrollments] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
      ]);
      return {
        teachers: teachers.count ?? 0,
        courses: courses.count ?? 0,
        students: students.count ?? 0,
        enrollments: enrollments.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "المعلمون", value: data?.teachers ?? 0 },
    { label: "الكورسات", value: data?.courses ?? 0 },
    { label: "الحسابات", value: data?.students ?? 0 },
    { label: "الاشتراكات", value: data?.enrollments ?? 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl card-soft p-5">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-2xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function useRefresh(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}

function TeachersTab() {
  const refresh = useRefresh(["admin-teachers", "admin-courses"]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subject, setSubject] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0]);

  const { data: teachers } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("*").order("created_at");
      return data ?? [];
    },
  });

  async function add() {
    if (!name || !slug || !subject) { toast.error("أكمل الاسم والمعرّف والمادة"); return; }
    const { error } = await supabase.from("teachers").insert({
      name,
      slug: slug.trim().toLowerCase(),
      subject,
      bio: bio || null,
      avatar_url: avatar || null,
      stages: [stage],
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة المعلم");
    setName("");
    setSlug("");
    setSubject("");
    setBio("");
    setAvatar("");
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إضافة معلم">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </Field>
          <Field label="المعرّف بالرابط (إنجليزي)">
            <Input dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={60} />
          </Field>
          <Field label="المادة">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} />
          </Field>
          <Field label="المرحلة">
            <Picker
              value={stage}
              onChange={setStage}
              options={STAGES.map((s) => ({ value: s, label: s }))}
            />
          </Field>
          <Field label="رابط الصورة">
            <Input dir="ltr" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          </Field>
          <Field label="نبذة">
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          إضافة المعلم
        </Button>
      </Section>

      <Section title="المعلمون الحاليون">
        <ul className="divide-y divide-border">
          {(teachers ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.subject} — /teachers/{t.slug}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(teachers ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">لا يوجد معلمون بعد.</p>
          )}
        </ul>
      </Section>
    </div>
  );
}

function CoursesTab() {
  const refresh = useRefresh(["admin-courses"]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0]);
  const [track, setTrack] = useState<string>(TRACKS[0]);
  const [eduType, setEduType] = useState<string>(EDU_TYPES[0]);
  const [price, setPrice] = useState("0");
  const [cover, setCover] = useState("");

  const isPrep = stage.includes("الإعدادي");

  const { data: teachers } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => (await supabase.from("teachers").select("id,name")).data ?? [],
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () =>
      (await supabase.from("courses").select("*,teachers(name)").order("created_at")).data ?? [],
  });

  async function add() {
    if (!title || !subject) { toast.error("أكمل عنوان الكورس والمادة"); return; }
    const numeric = Number(price) || 0;
    const { error } = await supabase.from("courses").insert({
      title,
      subject,
      description: description || null,
      teacher_id: teacherId || null,
      stage,
      track: isPrep ? null : track,
      edu_type: eduType,
      price: numeric,
      is_free: numeric === 0,
      is_published: true,
      cover_url: cover || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الكورس");
    setTitle("");
    setSubject("");
    setDescription("");
    setPrice("0");
    setCover("");
    refresh();
  }

  async function togglePublish(id: string, next: boolean) {
    const { error } = await supabase.from("courses").update({ is_published: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إضافة كورس">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان الكورس">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="المادة">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} />
          </Field>
          <Field label="المعلم">
            <Picker
              value={teacherId}
              onChange={setTeacherId}
              options={(teachers ?? []).map((t) => ({ value: t.id, label: t.name }))}
              placeholder="اختر المعلم"
            />
          </Field>
          <Field label="الصف">
            <Picker
              value={stage}
              onChange={setStage}
              options={STAGES.map((s) => ({ value: s, label: s }))}
            />
          </Field>
          {!isPrep && (
            <Field label="الشعبة">
              <Picker
                value={track}
                onChange={setTrack}
                options={TRACKS.map((t) => ({ value: t, label: t }))}
              />
            </Field>
          )}
          <Field label="النظام">
            <Picker
              value={eduType}
              onChange={setEduType}
              options={EDU_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Field>
          <Field label="السعر (0 = مجاني)">
            <Input
              type="number"
              min={0}
              dir="ltr"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="رابط صورة الغلاف">
            <Input dir="ltr" value={cover} onChange={(e) => setCover(e.target.value)} />
          </Field>
          <Field label="الوصف">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          إضافة الكورس
        </Button>
      </Section>

      <Section title="الكورسات">
        <ul className="divide-y divide-border">
          {(courses ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.stage} — {c.teachers?.name ?? "بدون معلم"} —{" "}
                  {c.is_free ? "مجاني" : formatEGP(Number(c.price))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => togglePublish(c.id, !c.is_published)}>
                  {c.is_published ? "إخفاء" : "نشر"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
          {(courses ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">لا توجد كورسات بعد.</p>
          )}
        </ul>
      </Section>
    </div>
  );
}

function LessonsTab() {
  const refresh = useRefresh(["admin-lessons"]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [youtube, setYoutube] = useState("");
  const [duration, setDuration] = useState("10");
  const [isPreview, setIsPreview] = useState("لا");
  const [fileTitle, setFileTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileLessonId, setFileLessonId] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,title")).data ?? [],
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () =>
      (
        await supabase
          .from("lessons")
          .select("id,title,position,youtube_id")
          .eq("course_id", courseId)
          .order("position")
      ).data ?? [],
  });

  async function add() {
    if (!courseId || !title) { toast.error("اختر الكورس واكتب عنوان الدرس"); return; }
    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      title,
      youtube_id: youtube || null,
      duration_minutes: Number(duration) || 0,
      is_preview: isPreview === "نعم",
      position: (lessons?.length ?? 0) + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الدرس");
    setTitle("");
    setYoutube("");
    refresh();
  }

  async function addFile() {
    if (!fileLessonId || !fileTitle || !fileUrl) { toast.error("أكمل بيانات الملف"); return; }
    const { error } = await supabase
      .from("lesson_attachments")
      .insert({ lesson_id: fileLessonId, title: fileTitle, file_url: fileUrl });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الملف");
    setFileTitle("");
    setFileUrl("");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إضافة درس">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكورس">
            <Picker
              value={courseId}
              onChange={setCourseId}
              options={(courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
              placeholder="اختر الكورس"
            />
          </Field>
          <Field label="عنوان الدرس">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="معرّف فيديو يوتيوب">
            <Input dir="ltr" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
          </Field>
          <Field label="المدة (دقائق)">
            <Input
              type="number"
              dir="ltr"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
          <Field label="درس تجريبي مجاني">
            <Picker
              value={isPreview}
              onChange={setIsPreview}
              options={[
                { value: "لا", label: "لا" },
                { value: "نعم", label: "نعم" },
              ]}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          إضافة الدرس
        </Button>
      </Section>

      <Section title="دروس الكورس المختار">
        <ul className="divide-y divide-border">
          {(lessons ?? []).map((l) => (
            <li key={l.id} className="flex items-center justify-between py-3">
              <p className="text-sm">
                {l.position}. {l.title}
              </p>
              <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(lessons ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">اختر كورسًا لعرض دروسه.</p>
          )}
        </ul>
      </Section>

      <Section title="إضافة ملف لدرس">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="الدرس">
            <Picker
              value={fileLessonId}
              onChange={setFileLessonId}
              options={(lessons ?? []).map((l) => ({ value: l.id, label: l.title }))}
              placeholder="اختر الدرس"
            />
          </Field>
          <Field label="اسم الملف">
            <Input value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} />
          </Field>
          <Field label="رابط الملف">
            <Input dir="ltr" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" onClick={addFile}>
          إضافة الملف
        </Button>
      </Section>
    </div>
  );
}

function QuizzesTab() {
  const refresh = useRefresh(["admin-quizzes", "admin-questions"]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("20");
  const [quizId, setQuizId] = useState("");
  const [qType, setQType] = useState("mcq");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState("");
  const [correct, setCorrect] = useState("");
  const [marks, setMarks] = useState("1");
  const [note, setNote] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,title")).data ?? [],
  });

  const { data: quizzes } = useQuery({
    queryKey: ["admin-quizzes", courseId],
    enabled: !!courseId,
    queryFn: async () =>
      (await supabase.from("quizzes").select("id,title,duration_minutes").eq("course_id", courseId))
        .data ?? [],
  });

  const { data: questions } = useQuery({
    queryKey: ["admin-questions", quizId],
    enabled: !!quizId,
    queryFn: async () =>
      (await supabase.from("questions").select("id,body,marks,position").eq("quiz_id", quizId).order("position"))
        .data ?? [],
  });

  async function addQuiz() {
    if (!courseId || !title) { toast.error("اختر الكورس واكتب عنوان الاختبار"); return; }
    const { error } = await supabase
      .from("quizzes")
      .insert({ course_id: courseId, title, duration_minutes: Number(duration) || 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الاختبار");
    setTitle("");
    refresh();
  }

  async function addQuestion() {
    if (!quizId || !body) { toast.error("اختر الاختبار واكتب نص السؤال"); return; }
    const opts =
      qType === "mcq"
        ? options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : qType === "true_false"
          ? ["صح", "خطأ"]
          : [];
    const { error } = await supabase.from("questions").insert({
      quiz_id: quizId,
      question_type: qType,
      body,
      options: opts,
      correct_answer: qType === "essay" ? correct || null : correct,
      marks: Number(marks) || 1,
      teacher_note: note || null,
      position: (questions?.length ?? 0) + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة السؤال");
    setBody("");
    setOptions("");
    setCorrect("");
    setNote("");
    refresh();
  }

  async function removeQuestion(id: string) {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إضافة اختبار">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="الكورس">
            <Picker
              value={courseId}
              onChange={setCourseId}
              options={(courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
              placeholder="اختر الكورس"
            />
          </Field>
          <Field label="عنوان الاختبار">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="المدة (دقائق)">
            <Input
              type="number"
              dir="ltr"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={addQuiz}>
          إضافة الاختبار
        </Button>
      </Section>

      <Section title="بنك الأسئلة">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاختبار">
            <Picker
              value={quizId}
              onChange={setQuizId}
              options={(quizzes ?? []).map((q) => ({ value: q.id, label: q.title }))}
              placeholder="اختر الاختبار"
            />
          </Field>
          <Field label="نوع السؤال">
            <Picker
              value={qType}
              onChange={setQType}
              options={[
                { value: "mcq", label: "اختيار من متعدد" },
                { value: "true_false", label: "صح / خطأ" },
                { value: "essay", label: "مقالي (تصحيح ذكي)" },
              ]}
            />
          </Field>
          <Field label="نص السؤال">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
          </Field>
          {qType === "mcq" && (
            <Field label="الاختيارات (سطر لكل اختيار)">
              <Textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3} />
            </Field>
          )}
          <Field label={qType === "essay" ? "الإجابة النموذجية" : "الإجابة الصحيحة"}>
            <Input value={correct} onChange={(e) => setCorrect(e.target.value)} />
          </Field>
          <Field label="الدرجة">
            <Input
              type="number"
              dir="ltr"
              min={0}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </Field>
          <Field label="ملاحظة تظهر بعد التصحيح">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        </div>
        <Button className="mt-4" onClick={addQuestion}>
          إضافة السؤال
        </Button>

        <ul className="mt-4 divide-y divide-border">
          {(questions ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between py-3">
              <p className="text-sm">
                {q.position}. {q.body}{" "}
                <span className="text-xs text-muted-foreground">({q.marks} درجة)</span>
              </p>
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function LibraryTab() {
  const refresh = useRefresh(["admin-books", "admin-chapters"]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0]);
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [bookId, setBookId] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [solution, setSolution] = useState("");

  const { data: books } = useQuery({
    queryKey: ["admin-books"],
    queryFn: async () => (await supabase.from("library_books").select("*").order("created_at")).data ?? [],
  });

  const { data: chapters } = useQuery({
    queryKey: ["admin-chapters", bookId],
    enabled: !!bookId,
    queryFn: async () =>
      (await supabase.from("book_chapters").select("id,title,position").eq("book_id", bookId).order("position"))
        .data ?? [],
  });

  async function addBook() {
    if (!title || !subject) { toast.error("أكمل عنوان الكتاب والمادة"); return; }
    const { error } = await supabase.from("library_books").insert({
      title,
      subject,
      stage,
      description: description || null,
      cover_url: cover || null,
      is_published: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الكتاب");
    setTitle("");
    setSubject("");
    setDescription("");
    setCover("");
    refresh();
  }

  async function addChapter() {
    if (!bookId || !chapterTitle) { toast.error("اختر الكتاب واكتب عنوان الفصل"); return; }
    const { error } = await supabase.from("book_chapters").insert({
      book_id: bookId,
      title: chapterTitle,
      pdf_url: pdfUrl || null,
      solution_youtube_id: solution || null,
      position: (chapters?.length ?? 0) + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الفصل");
    setChapterTitle("");
    setPdfUrl("");
    setSolution("");
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إضافة كتاب لمكتبة المُلك">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان الكتاب">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="المادة">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} />
          </Field>
          <Field label="الصف">
            <Picker
              value={stage}
              onChange={setStage}
              options={STAGES.map((s) => ({ value: s, label: s }))}
            />
          </Field>
          <Field label="رابط الغلاف">
            <Input dir="ltr" value={cover} onChange={(e) => setCover(e.target.value)} />
          </Field>
          <Field label="الوصف">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
        </div>
        <Button className="mt-4" onClick={addBook}>
          إضافة الكتاب
        </Button>
      </Section>

      <Section title="فصول الكتاب وفيديوهات الحل">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكتاب">
            <Picker
              value={bookId}
              onChange={setBookId}
              options={(books ?? []).map((b) => ({ value: b.id, label: b.title }))}
              placeholder="اختر الكتاب"
            />
          </Field>
          <Field label="عنوان الفصل">
            <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} />
          </Field>
          <Field label="رابط ملف PDF">
            <Input dir="ltr" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
          </Field>
          <Field label="معرّف فيديو الحل على يوتيوب">
            <Input dir="ltr" value={solution} onChange={(e) => setSolution(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" onClick={addChapter}>
          إضافة الفصل
        </Button>
        <ul className="mt-4 divide-y divide-border">
          {(chapters ?? []).map((c) => (
            <li key={c.id} className="py-2 text-sm">
              {c.position}. {c.title}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function StudentsTab() {
  const refresh = useRefresh(["admin-students"]);
  const [amount, setAmount] = useState("100");

  const { data: students } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100))
        .data ?? [],
  });

  async function topUp(id: string, current: number) {
    const value = Number(amount) || 0;
    const { error } = await supabase
      .from("profiles")
      .update({ wallet_balance: Math.round((current + value) * 100) / 100 })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase
      .from("wallet_transactions")
      .insert({ user_id: id, amount: value, kind: "topup", description: "شحن يدوي من الإدارة" });
    toast.success("تم شحن المحفظة");
    refresh();
  }

  return (
    <Section title="الطلاب وشحن المحافظ">
      <Field label="قيمة الشحن (ج.م)">
        <Input
          type="number"
          dir="ltr"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="max-w-40"
        />
      </Field>
      <ul className="mt-4 divide-y divide-border">
        {(students ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-semibold">{s.full_name || "بدون اسم"}</p>
              <p className="text-xs text-muted-foreground">
                {s.stage ?? "—"} — الرصيد: {formatEGP(Number(s.wallet_balance ?? 0))}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => topUp(s.id, Number(s.wallet_balance ?? 0))}>
              شحن
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function MarketersTab() {
  const refresh = useRefresh([
    "admin-marketers",
    "admin-promos",
    "admin-payouts",
    "admin-settings",
    "admin-notifications",
  ]);
  const [marketerId, setMarketerId] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [commission, setCommission] = useState("10");

  const { data: marketers } = useQuery({
    queryKey: ["admin-marketers"],
    queryFn: async () => (await supabase.from("marketers").select("*").order("created_at")).data ?? [],
  });

  const { data: promos } = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () =>
      (await supabase.from("promo_codes").select("*,marketers(display_name)").order("created_at")).data ?? [],
  });

  const { data: payouts } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () =>
      (await supabase.from("payouts").select("*,marketers(display_name)").order("created_at")).data ?? [],
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () =>
      (await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () =>
      (
        await supabase
          .from("admin_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });

  async function saveSettings(patch: {
    default_discount_percent?: number;
    default_commission_percent?: number;
    min_payout_amount?: number;
    max_uses_per_student?: number;
  }) {
    const { error } = await supabase.from("platform_settings").update(patch).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ الإعدادات");
    refresh();
  }

  async function updatePromo(id: string, patch: { discount_percent?: number; commission_percent?: number; is_active?: boolean }) {
    const { error } = await supabase.from("promo_codes").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }


  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("marketers").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function addPromo() {
    if (!marketerId || !code) { toast.error("اختر المسوّق واكتب الكود"); return; }
    const { error } = await supabase.from("promo_codes").insert({
      marketer_id: marketerId,
      code: code.trim().toUpperCase(),
      discount_percent: Number(discount) || 0,
      commission_percent: Number(commission) || 0,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة كود الخصم");
    setCode("");
    refresh();
  }

  async function setPayout(id: string, status: string) {
    const { error } = await supabase.from("payouts").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="إعدادات برنامج المسوقين">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="خصم الطالب الافتراضي %">
            <Input
              type="number"
              dir="ltr"
              defaultValue={String(settings?.default_discount_percent ?? 10)}
              onBlur={(e) => saveSettings({ default_discount_percent: Number(e.target.value) })}
            />
          </Field>
          <Field label="عمولة المسوّق الافتراضية %">
            <Input
              type="number"
              dir="ltr"
              defaultValue={String(settings?.default_commission_percent ?? 10)}
              onBlur={(e) => saveSettings({ default_commission_percent: Number(e.target.value) })}
            />
          </Field>
          <Field label="الحد الأدنى للسحب (ج.م)">
            <Input
              type="number"
              dir="ltr"
              defaultValue={String(settings?.min_payout_amount ?? 1000)}
              onBlur={(e) => saveSettings({ min_payout_amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="عدد مرات استخدام الكود لكل طالب">
            <Input
              type="number"
              dir="ltr"
              defaultValue={String(settings?.max_uses_per_student ?? 1)}
              onBlur={(e) => saveSettings({ max_uses_per_student: Number(e.target.value) })}
            />
          </Field>
        </div>
      </Section>

      <Section title="إشعارات الإدارة">
        <ul className="divide-y divide-border">
          {(notifications ?? []).map((n) => (
            <li key={n.id} className="py-3">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground">
                {n.body} — {new Date(n.created_at).toLocaleString("ar-EG")}
              </p>
            </li>
          ))}
          {(notifications ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">لا توجد إشعارات.</p>
          )}
        </ul>
      </Section>

      <Section title="حسابات المسوّقين">

        <ul className="divide-y divide-border">
          {(marketers ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold">{m.display_name}</p>
                <p className="text-xs text-muted-foreground">الحالة: {m.status}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "approved")}>
                  اعتماد
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "suspended")}>
                  إيقاف
                </Button>
              </div>
            </li>
          ))}
          {(marketers ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">لا يوجد مسوّقون بعد.</p>
          )}
        </ul>
      </Section>

      <Section title="أكواد الخصم">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="المسوّق">
            <Picker
              value={marketerId}
              onChange={setMarketerId}
              options={(marketers ?? []).map((m) => ({ value: m.id, label: m.display_name }))}
              placeholder="اختر المسوّق"
            />
          </Field>
          <Field label="الكود">
            <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
          </Field>
          <Field label="نسبة الخصم %">
            <Input
              type="number"
              dir="ltr"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field label="نسبة العمولة %">
            <Input
              type="number"
              dir="ltr"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={addPromo}>
          إضافة الكود
        </Button>
        <ul className="mt-4 divide-y divide-border">
          {(promos ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-bold" dir="ltr">
                {p.code}
              </span>
              <span className="text-muted-foreground">
                {p.marketers?.display_name ?? "—"} — الاستخدامات {p.uses_count}
              </span>
              <span className="flex items-center gap-1">
                خصم
                <Input
                  className="h-8 w-20"
                  type="number"
                  dir="ltr"
                  defaultValue={String(p.discount_percent)}
                  onBlur={(e) => updatePromo(p.id, { discount_percent: Number(e.target.value) })}
                />
              </span>
              <span className="flex items-center gap-1">
                عمولة
                <Input
                  className="h-8 w-20"
                  type="number"
                  dir="ltr"
                  defaultValue={String(p.commission_percent)}
                  onBlur={(e) => updatePromo(p.id, { commission_percent: Number(e.target.value) })}
                />
              </span>
              <Button
                size="sm"
                variant={p.is_active ? "ghost" : "outline"}
                onClick={() => updatePromo(p.id, { is_active: !p.is_active })}
              >
                {p.is_active ? "إيقاف" : "تفعيل"}
              </Button>
            </li>
          ))}
        </ul>

      </Section>

      <Section title="طلبات السحب">
        <ul className="divide-y divide-border">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <p className="text-sm">
                {p.marketers?.display_name ?? "—"} — {formatEGP(Number(p.amount))} — {p.method} —{" "}
                {p.status}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPayout(p.id, "paid")}>
                  تم الدفع
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPayout(p.id, "rejected")}>
                  رفض
                </Button>
              </div>
            </li>
          ))}
          {(payouts ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">لا توجد طلبات سحب.</p>
          )}
        </ul>
      </Section>
    </div>
  );
}
