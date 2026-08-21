import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { startQuiz, saveAnswer, submitQuiz, getAttemptResult } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "أداء الاختبار | منصة المُلك" },
      {
        name: "description",
        content: "أدِّ الاختبار الإلكتروني مع مؤقّت وحفظ تلقائي وتصحيح فوري على منصة المُلك.",
      },
      { property: "og:title", content: "أداء الاختبار | منصة المُلك" },
      { property: "og:description", content: "اختبارات إلكترونية بتصحيح تلقائي وملاحظات." },
    ],
  }),
  component: QuizPage,
});

type Question = {
  id: string;
  question_type: string;
  body: string;
  options: unknown;
  marks: number;
  position: number;
};

function optionList(options: unknown): string[] {
  if (Array.isArray(options)) return options.map((o) => String(o));
  return [];
}

function QuizPage() {
  const { quizId } = Route.useParams();
  const start = useServerFn(startQuiz);
  const save = useServerFn(saveAnswer);
  const submit = useServerFn(submitQuiz);
  const result = useServerFn(getAttemptResult);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  const session = useQuery({
    queryKey: ["quiz-start", quizId],
    queryFn: async () => {
      const res = await start({ data: { quizId } });
      setAnswers(res.answers);
      setAttemptId(res.attempt.id);
      const startedAt = new Date(res.attempt.started_at).getTime();
      const limit = (res.quiz.duration_minutes || 0) * 60;
      if (limit > 0) {
        setSeconds(Math.max(0, limit - Math.floor((Date.now() - startedAt) / 1000)));
      }
      return res;
    },
    retry: false,
  });

  const resultQuery = useQuery({
    queryKey: ["quiz-result", attemptId, submitted],
    enabled: !!attemptId && submitted,
    queryFn: () => result({ data: { attemptId: attemptId! } }),
  });

  useEffect(() => {
    if (seconds === null || submitted) return;
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => (s === null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [seconds === null, submitted]);

  const questions = useMemo(
    () => [...((session.data?.questions ?? []) as Question[])].sort((a, b) => a.position - b.position),
    [session.data],
  );

  async function handleSubmit(auto = false) {
    if (!attemptId || busy) return;
    setBusy(true);
    try {
      const res = await submit({ data: { attemptId } });
      setSubmitted(true);
      toast.success(
        auto ? `انتهى الوقت — درجتك ${res.score} من ${res.total}` : `تم التسليم: ${res.score} من ${res.total}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تسليم الاختبار");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (seconds === 0 && !submitted && attemptId) void handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, submitted, attemptId]);

  async function setAnswer(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    if (!attemptId) return;
    try {
      await save({ data: { attemptId, questionId, answer: value } });
    } catch {
      /* الحفظ التلقائي سيعاد مع التغيير التالي */
    }
  }

  if (session.isError) {
    return (
      <AppShell title="الاختبار">
        <p className="rounded-2xl card-soft p-8 text-center text-sm text-muted-foreground">
          {session.error instanceof Error ? session.error.message : "تعذّر فتح الاختبار"}
        </p>
      </AppShell>
    );
  }

  if (submitted) {
    const r = resultQuery.data;
    return (
      <AppShell title="نتيجة الاختبار">
        <div className="space-y-4">
          <div className="rounded-2xl card-soft p-5">
            <p className="text-sm text-muted-foreground">{r?.title}</p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {r?.score ?? 0} / {r?.total ?? 0}
            </p>
            <Progress className="mt-3" value={r && r.total ? (r.score / r.total) * 100 : 0} />
          </div>

          {(r?.items ?? []).map((item, i) => (
            <div key={i} className="rounded-2xl card-soft p-5">
              <div className="flex items-start gap-2">
                {item.isCorrect === false ? (
                  <XCircle className="mt-1 size-4 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{item.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">إجابتك: {item.answer || "—"}</p>
                  {item.feedback && (
                    <p className="mt-2 rounded-lg bg-primary-soft p-2 text-sm text-primary">
                      {item.feedback}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    الدرجة: {item.awarded} من {item.marks}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <Link to="/records" className="inline-block text-sm font-semibold text-primary">
            عرض السجل الدراسي
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={session.data?.quiz.title ?? "الاختبار"}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl card-soft p-4">
          <p className="text-sm text-muted-foreground">
            عدد الأسئلة: {questions.length} — الدرجة الكلية: {session.data?.totalMarks ?? 0}
          </p>
          {seconds !== null && (
            <span className="inline-flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
              <Clock className="size-4" />
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl card-soft p-5">
            <p className="font-semibold">
              {idx + 1}. {q.body}{" "}
              <span className="text-xs font-normal text-muted-foreground">({q.marks} درجة)</span>
            </p>

            {q.question_type === "essay" ? (
              <Textarea
                className="mt-3"
                rows={4}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                maxLength={5000}
              />
            ) : (
              <div className="mt-3 space-y-2">
                {(q.question_type === "true_false"
                  ? ["صح", "خطأ"]
                  : optionList(q.options)
                ).map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleSubmit(false)} disabled={busy || questions.length === 0}>
            {busy ? "جارٍ التسليم..." : "تسليم الاختبار"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/subjects">حفظ والاستكمال لاحقًا</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
