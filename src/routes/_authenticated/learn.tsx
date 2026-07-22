import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Lightbulb, PlayCircle, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learning Hub — Vyro" },
      { name: "description", content: "Tutorials, tips, and quizzes for stock and options paper trading." },
    ],
  }),
  component: LearnPage,
});

const LESSONS = [
  { id: "l1", title: "Stock Market Basics", mins: 8, level: "Beginner", icon: "📈", done: true },
  { id: "l2", title: "Reading a Candlestick Chart", mins: 6, level: "Beginner", icon: "🕯️", done: true },
  { id: "l3", title: "What Are Options?", mins: 10, level: "Beginner", icon: "🎯", done: false },
  { id: "l4", title: "The Greeks Explained", mins: 12, level: "Intermediate", icon: "🇬🇷", done: false },
  { id: "l5", title: "Iron Condor Strategy", mins: 15, level: "Advanced", icon: "🦅", done: false },
  { id: "l6", title: "Risk Management 101", mins: 9, level: "Beginner", icon: "🛡️", done: false },
];

const TIPS = [
  "Always define your max loss before entering a trade.",
  "Never risk more than 2% of your capital on a single position.",
  "Theta decay accelerates in the last week before expiry.",
  "High IV = expensive options. Consider selling premium.",
  "Cut losers quickly, let winners run.",
];

const QUIZ = [
  {
    q: "What does 'Delta' measure in options?",
    opts: [
      "Rate of change of option price vs. underlying price",
      "Time decay per day",
      "Interest rate sensitivity",
      "Volatility of the underlying",
    ],
    correct: 0,
  },
  {
    q: "You buy a NIFTY 24500 CE at ₹100. NIFTY is at 24450. This option is:",
    opts: ["In the money", "At the money", "Out of the money", "Deep in the money"],
    correct: 2,
  },
  {
    q: "Which strategy profits from low volatility?",
    opts: ["Long Straddle", "Iron Condor", "Long Call", "Protective Put"],
    correct: 1,
  },
];

function LearnPage() {
  const navigate = useNavigate();
  const [quizOpen, setQuizOpen] = useState(false);

  const completed = LESSONS.filter((l) => l.done).length;
  const total = LESSONS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="-mt-3 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate({ to: "/more" })} aria-label="Back">
          <ArrowLeft className="size-6 text-primary" />
        </button>
        <div className="text-base font-semibold">Learning Hub</div>
        <GraduationCap className="size-5 text-primary" />
      </div>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-surface-1 to-surface-1 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-6" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">Your progress</div>
            <div className="text-xs text-muted-foreground">
              {completed} of {total} lessons complete
            </div>
          </div>
          <div className="text-xl font-black tabular-nums text-primary">{pct}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section>
        <div className="mb-2 text-sm font-semibold text-muted-foreground">Lessons</div>
        <div className="space-y-2">
          {LESSONS.map((l) => (
            <button
              key={l.id}
              onClick={() =>
                l.done ? toast.success(`${l.title} · already completed`) : toast.info(`${l.title} — opening lesson`)
              }
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-1 p-3 text-left"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-background text-xl">
                {l.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{l.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{l.mins} min</span>
                  <span>·</span>
                  <span
                    className={
                      l.level === "Beginner"
                        ? "text-bull"
                        : l.level === "Intermediate"
                          ? "text-warn"
                          : "text-bear"
                    }
                  >
                    {l.level}
                  </span>
                </div>
              </div>
              {l.done ? (
                <CheckCircle2 className="size-5 text-bull" />
              ) : (
                <PlayCircle className="size-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-warn" /> Daily trading tips
        </div>
        <ul className="mt-3 space-y-2">
          {TIPS.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs text-muted-foreground">
              <span className="text-primary">›</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={() => setQuizOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/20 to-primary/5 p-4 text-left"
      >
        <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground text-xl">
          🧠
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">Take the quiz</div>
          <div className="text-xs text-muted-foreground">3 questions · test your options knowledge</div>
        </div>
        <span className="text-primary">›</span>
      </button>

      {quizOpen && <QuizModal onClose={() => setQuizOpen(false)} />}
    </div>
  );
}

function QuizModal({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUIZ[idx];
  const done = idx >= QUIZ.length;

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correct) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setIdx((n) => n + 1);
    }, 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface-1 p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">
            {done ? "Quiz complete" : `Question ${idx + 1} of ${QUIZ.length}`}
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {done ? (
          <div className="mt-6 text-center">
            <div className="text-5xl">{score === QUIZ.length ? "🏆" : score >= 2 ? "🎯" : "📚"}</div>
            <div className="mt-3 text-2xl font-black">
              {score} / {QUIZ.length}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {score === QUIZ.length
                ? "Perfect score. You're ready to trade."
                : "Keep learning — review the lessons above."}
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 text-base font-semibold">{q.q}</div>
            <div className="mt-4 space-y-2">
              {q.opts.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = picked !== null && i === q.correct;
                const isWrong = isPicked && i !== q.correct;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      isCorrect
                        ? "border-bull bg-bull/15 text-bull"
                        : isWrong
                          ? "border-bear bg-bear/15 text-bear"
                          : "border-border bg-background hover:border-primary"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
