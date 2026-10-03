import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Screen = "home" | "assistant";
type Answers = Record<string, string>;

type Question = {
  id: string;
  eyebrow: string;
  question: string;
  help: string;
  type: "options" | "number";
  options?: { label: string; value: string; detail?: string }[];
  placeholder?: string;
  prefix?: string;
  suffix?: string;
};

const questions: Question[] = [
  {
    id: "goal",
    eyebrow: "Let’s start with your why",
    question: "What matters most to you?",
    help: "This helps us understand what your coverage needs to protect.",
    type: "options",
    options: [
      { label: "Protect my family", value: "family", detail: "Replace income and cover everyday needs" },
      { label: "Cover my mortgage", value: "mortgage", detail: "Help keep your family in their home" },
      { label: "Leave a legacy", value: "legacy", detail: "Create a lasting financial gift" },
    ],
  },
  {
    id: "age",
    eyebrow: "A little about you",
    question: "How old are you?",
    help: "Age is one of the key factors insurers use to estimate cost.",
    type: "number",
    placeholder: "Enter your age",
  },
  {
    id: "height",
    eyebrow: "A little about you",
    question: "What is your height in inches?",
    help: "Height is typically considered alongside other health information during underwriting.",
    type: "number",
    placeholder: "For example, 68",
    suffix: "IN",
  },
  {
    id: "income",
    eyebrow: "Your financial picture",
    question: "What is your annual household income?",
    help: "A common starting point is coverage equal to 7–10 years of income.",
    type: "number",
    placeholder: "Enter annual income",
    prefix: "$",
    suffix: "USD",
  },
  {
    id: "dependents",
    eyebrow: "Who you’re protecting",
    question: "How many people depend on your income?",
    help: "Include children, a partner, parents, or anyone you support financially.",
    type: "options",
    options: [
      { label: "Just me", value: "0" },
      { label: "1 person", value: "1" },
      { label: "2 people", value: "2" },
      { label: "3+ people", value: "3" },
    ],
  },
  {
    id: "health",
    eyebrow: "Your health",
    question: "How would you describe your overall health?",
    help: "This is only an estimate. A formal application may include additional health questions.",
    type: "options",
    options: [
      { label: "Excellent", value: "excellent", detail: "No ongoing conditions or medications" },
      { label: "Good", value: "good", detail: "Minor or well-managed conditions" },
      { label: "Fair", value: "fair", detail: "One or more ongoing health concerns" },
    ],
  },
  {
    id: "medical",
    eyebrow: "Your health history",
    question: "Do you have an ongoing medical condition?",
    help: "A broad answer is enough for this early estimate—you don’t need to share a diagnosis here.",
    type: "options",
    options: [
      { label: "No ongoing conditions", value: "none" },
      { label: "Yes, well managed", value: "managed", detail: "Stable with routine care or medication" },
      { label: "Yes, needs ongoing care", value: "ongoing", detail: "Requires regular monitoring or treatment" },
      { label: "Prefer not to say", value: "unspecified" },
    ],
  },
  {
    id: "tobacco",
    eyebrow: "One last health question",
    question: "Have you used tobacco or nicotine recently?",
    help: "Nicotine use can meaningfully affect life insurance pricing and available policy options.",
    type: "options",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
      { label: "Prefer not to say", value: "unspecified" },
    ],
  },
  {
    id: "budget",
    eyebrow: "Make it comfortable",
    question: "What monthly payment feels manageable?",
    help: "We’ll keep your protection goal grounded in what works for your budget.",
    type: "options",
    options: [
      { label: "Under $50", value: "50" },
      { label: "$50–$100", value: "100" },
      { label: "$100–$200", value: "200" },
      { label: "$200+", value: "250" },
    ],
  },
];

function ArrowIcon({ direction = "right" }: { direction?: "right" | "left" }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={direction === "right" ? "M5 12h14m-5-5 5 5-5 5" : "M19 12H5m5 5-5-5 5-5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2c.7 5.4 3.6 8.3 9 9-5.4.7-8.3 3.6-9 9-.7-5.4-3.6-8.3-9-9 5.4-.7 8.3-3.6 9-9Z" fill="currentColor" />
    </svg>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${light ? "text-white" : "text-ink"}`}>
      <div className={`flex size-9 items-center justify-center rounded-full border ${light ? "border-white/30" : "border-brand/25 bg-brand-soft text-brand"}`}>
        <ShieldIcon />
      </div>
      <div>
        <div className="font-display text-lg font-semibold leading-none tracking-tight">LincLife</div>
        <div className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? "text-white/60" : "text-muted"}`}>Powered by CodeLinc</div>
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-brand text-white shadow-[0_12px_30px_rgba(191,78,35,0.22)] hover:bg-brand-dark",
    secondary: "border border-line bg-white text-ink hover:border-brand/40 hover:bg-brand-soft",
    ghost: "text-muted hover:bg-black/5 hover:text-ink",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-canvas text-ink">
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a className="transition-colors hover:text-ink" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-ink" href="#why-linclife">Why LincLife</a>
          <Button variant="secondary" onClick={onStart} className="min-h-10 px-5">Start your plan</Button>
        </div>
        <div className="md:hidden"><Button variant="secondary" onClick={onStart} className="min-h-10 px-4">Get started</Button></div>
      </nav>

      <section className="relative mx-auto flex max-w-7xl justify-center overflow-hidden px-6 pb-24 pt-16 text-center lg:px-10 lg:pb-32 lg:pt-28">
        <div className="absolute left-1/2 top-1/2 -z-0 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative z-10 flex max-w-4xl flex-col items-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-4 py-2 text-xs font-semibold text-brand shadow-sm">
            <SparkIcon /> A clearer way to find coverage
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-8xl">
            Life insurance,<br />
            <span className="text-brand">made easy.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
            Meet your personal insurance guide. Answer a few simple questions and get a clear, explainable coverage recommendation—without the jargon.
          </p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button onClick={onStart} className="sm:min-w-48">Build my plan <ArrowIcon /></Button>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-ink transition-colors hover:bg-white">See how it works</a>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-medium text-muted">
            <span className="flex items-center gap-2"><span className="text-brand"><ShieldIcon /></span> Private & secure</span>
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" /> Takes about 5 minutes</span>
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" /> No commitment</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3 lg:px-10">
          {[
            ["01", "Tell us about you", "Share your goals, household needs, health, and comfortable monthly budget."],
            ["02", "See the thinking", "Your guide explains how each answer shapes your suggested coverage."],
            ["03", "Get a clear next step", "Review an easy-to-understand recommendation you can feel confident about."],
          ].map(([number, title, body]) => (
            <div key={number} className="group">
              <span className="font-display text-sm font-semibold text-brand">{number}</span>
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Recommendation({ answers, onRestart }: { answers: Answers; onRestart: () => void }) {
  const income = Number(answers.income) || 75000;
  const coverage = Math.round((income * (answers.dependents === "0" ? 6 : 9)) / 50000) * 50000;
  const term = answers.goal !== "legacy" || Number(answers.budget) <= 100;
  const age = Number(answers.age) || 35;
  const estimatedLow = Math.max(22, Math.round((coverage / 100000) * (age / 30) * (answers.health === "fair" ? 2.1 : 1.25)));
  const healthAdjustment = answers.medical === "ongoing" || answers.tobacco === "yes" ? 1.45 : 1;
  const estimatedHigh = Math.round(estimatedLow * 1.35 * healthAdjustment);

  return (
    <div className="animate-in mx-auto w-full max-w-3xl">
      <div className="mb-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"><ShieldIcon /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand">Your starting point</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">A plan shaped around you</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted">Based on what you shared, here’s a practical place to begin the conversation with a licensed professional.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_70px_rgba(73,48,36,0.1)]">
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {[
            ["Coverage", `$${coverage.toLocaleString()}`],
            ["Suggested type", term ? "Term life" : "Whole life"],
            ["Est. monthly", `$${estimatedLow}–$${estimatedHigh}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
        <div className="p-7 sm:p-9">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><SparkIcon /></div>
            <div>
              <h2 className="font-display text-xl font-semibold">Why this could fit</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {term
                  ? `Term life prioritizes more coverage at a typically lower initial cost. With ${answers.dependents === "0" ? "no dependents currently" : `${answers.dependents} or more people relying on your income`}, it can help protect your highest-need years without stretching your budget.`
                  : "Whole life may support your goal of leaving a legacy because it offers lifelong coverage and can build cash value over time, though premiums are generally higher than term insurance."}
              </p>
            </div>
          </div>
          <div className="mt-7 rounded-2xl bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">How we estimated coverage</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              We started with {answers.dependents === "0" ? "6" : "9"} years of your reported income, then considered your protection goal, number of dependents, age, health, and monthly comfort range.
            </p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1">Talk with a professional <ArrowIcon /></Button>
            <Button variant="secondary" onClick={onRestart}>Start over</Button>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-muted">This educational estimate is not an offer of coverage or financial advice. Final pricing and eligibility depend on underwriting.</p>
        </div>
      </div>
    </div>
  );
}

function Assistant({ onHome }: { onHome: () => void }) {
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [messages, setMessages] = useState<
    { role: "assistant" | "user"; content: string; detail?: string }[]
  >([
    {
      role: "assistant",
      content: "Hi, I’m your LincLife guide.",
      detail:
        "I can help you think through your life insurance needs, explain the tradeoffs, and build a starting recommendation with you. You can answer naturally or ask me questions at any point.",
    },
    {
      role: "assistant",
      content: questions[0].question,
      detail: questions[0].help,
    },
  ]);
  const done = step >= questions.length;
  const question = questions[step];

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, done]);

  const insight = useMemo(() => {
    const insights: Record<string, string> = {
      goal: "Your answers stay private and are only used to shape this educational estimate.",
      age: "Age is an important factor in both policy options and estimated premium ranges.",
      height: "Height is usually considered with weight and health history—not used on its own.",
      income: "Income helps anchor the amount of protection, so the estimate reflects your real life.",
      dependents: "More dependents can mean a greater need for income replacement and longer protection.",
      health: "Health can affect eligibility and pricing, but there are options for many health profiles.",
      medical: "Carriers evaluate each condition differently, including how long it has been stable.",
      tobacco: "Many carriers have different rate classes for recent nicotine use.",
      budget: "Term life often offers more coverage per dollar; permanent policies can support lifelong goals.",
    };
    return insights[question?.id] ?? "We explain how each answer affects your estimate.";
  }, [question?.id]);

  function resetChat() {
    setStep(0);
    setAnswers({});
    setDraft("");
    setSelectedValue("");
    setMessages([
      {
        role: "assistant",
        content: "Hi, I’m your LincLife guide.",
        detail:
          "I can help you think through your life insurance needs, explain the tradeoffs, and build a starting recommendation with you. You can answer naturally or ask me questions at any point.",
      },
      {
        role: "assistant",
        content: questions[0].question,
        detail: questions[0].help,
      },
    ]);
  }

  function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !question) return;

    const looksLikeQuestion =
      !selectedValue &&
      (text.endsWith("?") ||
        /^(why|what|how|can|could|should|does|do|is|are|will)\b/i.test(text));

    if (looksLikeQuestion) {
      setMessages((current) => [
        ...current,
        { role: "user", content: text },
        {
          role: "assistant",
          content: insight,
          detail: `When you’re ready, ${question.question.toLowerCase()}`,
        },
      ]);
      setDraft("");
      return;
    }

    const answerValue = selectedValue || text;
    const nextStep = step + 1;
    const nextQuestion = questions[nextStep];
    const acknowledgements: Record<string, string> = {
      goal: "That gives us a clear goal to work toward.",
      age: "Thanks—that helps me think about the options and likely cost range.",
      height: "Got it. That will be considered in context with your other health information.",
      income: "Thanks. I’ll use that to estimate a practical amount of income protection.",
      dependents: "Understood. I’ll account for the people who rely on you.",
      health: "Thanks for sharing. There are coverage paths for many different health profiles.",
      medical: "That’s helpful, and you don’t need to share any private diagnosis details here.",
      tobacco: "Got it. That can affect rate classes, so it’s useful to include.",
      budget: "That’s everything I need to build a useful starting point.",
    };

    setAnswers((current) => ({ ...current, [question.id]: answerValue }));
    setMessages((current) => [
      ...current,
      { role: "user", content: text },
      {
        role: "assistant",
        content: acknowledgements[question.id],
        detail: nextQuestion
          ? `${nextQuestion.question} ${nextQuestion.help}`
          : "I’ve put together a recommendation below and explained how I arrived at it.",
      },
    ]);
    setStep(nextStep);
    setDraft("");
    setSelectedValue("");
  }

  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <button onClick={onHome} className="rounded-lg focus-visible:outline-2 focus-visible:outline-brand"><Brand /></button>
          <div className="flex items-center gap-2">
            <span className="mr-2 hidden items-center gap-2 text-xs font-medium text-muted sm:flex">
              <span className="size-2 rounded-full bg-success" /> AI guide online
            </span>
            <Button variant="secondary" onClick={resetChat} className="min-h-10 px-4">New chat</Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl flex-col px-4 sm:px-6">
        <div className="flex-1 space-y-7 py-10 pb-72">
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.content}`}
              className={`animate-in flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                  <SparkIcon />
                </div>
              )}
              <div
                className={
                  message.role === "user"
                    ? "max-w-[80%] rounded-3xl rounded-br-md bg-brand-deep px-5 py-3.5 text-sm leading-6 text-white"
                    : "max-w-[85%] pt-1 text-sm leading-6 text-ink"
                }
              >
                <p className={message.role === "assistant" ? "font-semibold" : ""}>{message.content}</p>
                {message.detail && <p className="mt-1.5 font-normal leading-6 text-muted">{message.detail}</p>}
              </div>
            </div>
          ))}

          {done && (
            <div className="animate-in pt-3">
              <Recommendation answers={answers} onRestart={resetChat} />
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        {!done && (
          <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white to-transparent px-4 pb-5 pt-12">
            <div className="mx-auto max-w-3xl">
              {question.options && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {question.options.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => {
                        setDraft(option.label);
                        setSelectedValue(option.value);
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                        selectedValue === option.value
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-line bg-white text-ink hover:border-brand/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={sendMessage}
                className="rounded-3xl border border-line bg-white p-2 shadow-[0_16px_50px_rgba(61,43,34,0.16)] focus-within:border-brand/50"
              >
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSelectedValue("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Reply or ask a question..."
                  className="w-full resize-none bg-transparent px-4 py-2 text-sm leading-6 outline-none placeholder:text-muted/60"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <ShieldIcon /> Don’t share sensitive medical details
                  </span>
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Send message"
                    className="flex size-10 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowIcon />
                  </button>
                </div>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted">
                LincLife provides educational guidance, not financial or medical advice.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  return screen === "home" ? <Home onStart={() => setScreen("assistant")} /> : <Assistant onHome={() => setScreen("home")} />;
}
