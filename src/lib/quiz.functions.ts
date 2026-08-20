import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const quizIdInput = z.object({ quizId: z.string().uuid() });
const saveInput = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string().max(5000),
});
const submitInput = z.object({ attemptId: z.string().uuid() });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function courseOfQuiz(db: Awaited<ReturnType<typeof admin>>, quizId: string) {
  const { data: quiz } = await db
    .from("quizzes")
    .select("id,title,duration_minutes,course_id,lesson_id,lessons(course_id)")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) throw new Error("الاختبار غير موجود");
  const courseId = quiz.course_id ?? quiz.lessons?.course_id ?? null;
  return { quiz, courseId };
}

async function assertAccess(
  db: Awaited<ReturnType<typeof admin>>,
  userId: string,
  courseId: string | null,
) {
  const { data: role } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (role) return;
  if (!courseId) throw new Error("لا يمكن الوصول لهذا الاختبار");
  const { data: course } = await db
    .from("courses")
    .select("is_free,is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (course?.is_free && course.is_published) return;
  const { data: enrolled } = await db
    .from("enrollments")
    .select("id")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrolled) throw new Error("يجب الاشتراك في الكورس أولًا");
}

export const startQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => quizIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { quiz, courseId } = await courseOfQuiz(db, data.quizId);
    await assertAccess(db, context.userId, courseId);

    const { data: questions } = await db
      .from("questions")
      .select("id,question_type,body,options,marks,position")
      .eq("quiz_id", quiz.id)
      .order("position", { ascending: true });

    const totalMarks = (questions ?? []).reduce((s, q) => s + Number(q.marks ?? 0), 0);

    let { data: attempt } = await db
      .from("quiz_attempts")
      .select("id,status,started_at,score,total_marks")
      .eq("quiz_id", quiz.id)
      .eq("student_id", context.userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (!attempt) {
      const { data: created, error } = await db
        .from("quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          student_id: context.userId,
          status: "in_progress",
          score: 0,
          total_marks: totalMarks,
        })
        .select("id,status,started_at,score,total_marks")
        .single();
      if (error) throw new Error(error.message);
      attempt = created;
    }

    const { data: saved } = await db
      .from("attempt_answers")
      .select("question_id,answer")
      .eq("attempt_id", attempt.id);

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration_minutes: quiz.duration_minutes,
        course_id: courseId,
      },
      attempt,
      totalMarks,
      questions: questions ?? [],
      answers: Object.fromEntries((saved ?? []).map((a) => [a.question_id, a.answer ?? ""])),
    };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: attempt } = await db
      .from("quiz_attempts")
      .select("id,student_id,status")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.student_id !== context.userId) throw new Error("محاولة غير صالحة");
    if (attempt.status !== "in_progress") throw new Error("تم تسليم هذا الاختبار");

    const { data: existing } = await db
      .from("attempt_answers")
      .select("id")
      .eq("attempt_id", attempt.id)
      .eq("question_id", data.questionId)
      .maybeSingle();

    if (existing) {
      await db.from("attempt_answers").update({ answer: data.answer }).eq("id", existing.id);
    } else {
      await db.from("attempt_answers").insert({
        attempt_id: attempt.id,
        question_id: data.questionId,
        answer: data.answer,
        awarded_marks: 0,
      });
    }
    return { ok: true };
  });

async function gradeEssay(question: string, expected: string | null, answer: string, marks: number) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !answer.trim()) {
    return { awarded: 0, feedback: "لم تتم الإجابة أو تعذّر التصحيح الآلي، بانتظار مراجعة المعلم." };
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت مصحح امتحانات عربي. صحّح إجابة الطالب وأعد JSON فقط بالشكل {\"score\": رقم, \"feedback\": \"ملاحظة عربية قصيرة\"} حيث score بين 0 والدرجة القصوى.",
          },
          {
            role: "user",
            content: `السؤال: ${question}\nالدرجة القصوى: ${marks}\nالإجابة النموذجية: ${expected ?? "غير متوفرة"}\nإجابة الطالب: ${answer}`,
          },
        ],
      }),
    });
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? (JSON.parse(match[0]) as { score?: number; feedback?: string }) : null;
    const awarded = Math.max(0, Math.min(marks, Number(parsed?.score ?? 0)));
    return { awarded, feedback: parsed?.feedback ?? "تم التصحيح." };
  } catch {
    return { awarded: 0, feedback: "تعذّر التصحيح الآلي، بانتظار مراجعة المعلم." };
  }
}

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: attempt } = await db
      .from("quiz_attempts")
      .select("id,student_id,status,quiz_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.student_id !== context.userId) throw new Error("محاولة غير صالحة");

    const { data: questions } = await db
      .from("questions")
      .select("id,question_type,body,correct_answer,marks,teacher_note")
      .eq("quiz_id", attempt.quiz_id);

    const { data: answers } = await db
      .from("attempt_answers")
      .select("id,question_id,answer")
      .eq("attempt_id", attempt.id);

    let score = 0;
    let total = 0;

    for (const q of questions ?? []) {
      const marks = Number(q.marks ?? 0);
      total += marks;
      const row = (answers ?? []).find((a) => a.question_id === q.id);
      const given = (row?.answer ?? "").trim();

      let awarded = 0;
      let isCorrect: boolean | null = null;
      let feedback = q.teacher_note ?? "";

      if (q.question_type === "essay") {
        const graded = await gradeEssay(q.body, q.correct_answer, given, marks);
        awarded = graded.awarded;
        feedback = [graded.feedback, q.teacher_note].filter(Boolean).join(" — ");
      } else {
        isCorrect =
          given.length > 0 &&
          given.toLowerCase() === String(q.correct_answer ?? "").trim().toLowerCase();
        awarded = isCorrect ? marks : 0;
        feedback = [isCorrect ? "إجابة صحيحة" : "إجابة غير صحيحة", q.teacher_note]
          .filter(Boolean)
          .join(" — ");
      }

      score += awarded;

      if (row) {
        await db
          .from("attempt_answers")
          .update({ is_correct: isCorrect, awarded_marks: awarded, feedback })
          .eq("id", row.id);
      } else {
        await db.from("attempt_answers").insert({
          attempt_id: attempt.id,
          question_id: q.id,
          answer: "",
          is_correct: isCorrect,
          awarded_marks: 0,
          feedback,
        });
      }
    }

    await db
      .from("quiz_attempts")
      .update({
        status: "submitted",
        score: Math.round(score * 100) / 100,
        total_marks: total,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    return { score: Math.round(score * 100) / 100, total };
  });

export const getAttemptResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: attempt } = await db
      .from("quiz_attempts")
      .select("id,student_id,status,score,total_marks,quiz_id,quizzes(title)")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.student_id !== context.userId) throw new Error("محاولة غير صالحة");

    const { data: rows } = await db
      .from("attempt_answers")
      .select("question_id,answer,is_correct,awarded_marks,feedback,questions(body,marks,position)")
      .eq("attempt_id", attempt.id);

    const items = (rows ?? [])
      .map((r) => ({
        question: r.questions?.body ?? "",
        marks: Number(r.questions?.marks ?? 0),
        position: r.questions?.position ?? 0,
        answer: r.answer ?? "",
        isCorrect: r.is_correct,
        awarded: Number(r.awarded_marks ?? 0),
        feedback: r.feedback ?? "",
      }))
      .sort((a, b) => a.position - b.position);

    return {
      title: attempt.quizzes?.title ?? "اختبار",
      status: attempt.status,
      score: Number(attempt.score ?? 0),
      total: Number(attempt.total_marks ?? 0),
      items,
    };
  });
