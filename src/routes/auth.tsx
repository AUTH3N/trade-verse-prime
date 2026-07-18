import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";
import { toast } from "sonner";
import { Loader2, Mail, Phone, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Vyro" },
      { name: "description", content: "Sign in to Vyro paper trading." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Tab = "email" | "phone";

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("email");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/home", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            V
          </div>
          <div>
            <div className="text-lg font-semibold">Vyro</div>
            <div className="text-xs text-muted-foreground">Paper trading for Indian markets</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue. New here? An account is created automatically.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold hover:bg-surface-2/70 transition"
          >
            <GoogleGlyph />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm">
            <TabButton active={tab === "email"} onClick={() => setTab("email")}>
              <Mail className="size-4" /> Email
            </TabButton>
            <TabButton active={tab === "phone"} onClick={() => setTab("phone")}>
              <Phone className="size-4" /> Phone OTP
            </TabButton>
          </div>

          {tab === "email" ? <EmailForm /> : <PhoneForm />}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree that Vyro is a paper trading simulator using virtual funds only.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 font-medium transition ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

async function handleGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    toast.error(result.error.message || "Google sign-in failed");
    return;
  }
  if (result.redirected) return;
  window.location.href = "/home";
}

function EmailForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) {
          toast.info("Check your email to confirm, then sign in.");
          return;
        }
        window.location.href = "/home";
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/home";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New to Vyro? Create account"}
      </button>
    </form>
  );
}

function PhoneForm() {
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestPhoneOtp({ data: { phone } });
      setStep("code");
      setDevCode(res.devCode);
      toast.success("OTP sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await verifyPhoneOtp({ data: { phone, code } });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      // Phone OTP → sign in via a deterministic pseudo-email/password so a
      // Supabase account exists (real SMS-linked Supabase auth plugs in with
      // a provider). This keeps sessions consistent across the app.
      const derivedEmail = `phone_${phone.replace(/\D/g, "")}@vyro.local`;
      const derivedPass = `otp_${phone.replace(/\D/g, "")}_vyro`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: derivedEmail,
        password: derivedPass,
      });
      if (signInErr) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: derivedEmail,
          password: derivedPass,
          options: { data: { phone } },
        });
        if (signUpErr) throw signUpErr;
        await supabase.auth.signInWithPassword({ email: derivedEmail, password: derivedPass });
      }
      window.location.href = "/home";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Phone number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="+919000000000"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Send OTP
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
        Code sent to {phone}.{" "}
        <button type="button" onClick={() => setStep("phone")} className="text-primary underline">
          Change
        </button>
      </div>
      {devCode && (
        <div className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-1 font-semibold">
            <ShieldCheck className="size-3.5" /> Dev mode
          </div>
          <div className="mt-1">
            SMS delivery isn't wired yet. Your code is <span className="font-mono">{devCode}</span>
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground">6-digit code</label>
        <input
          type="text"
          inputMode="numeric"
          required
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg font-mono tracking-[0.5em] outline-none focus:border-primary"
          placeholder="000000"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Verify & continue
      </button>
    </form>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.6 14.7 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
      />
    </svg>
  );
}
