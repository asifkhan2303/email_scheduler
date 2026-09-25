import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function Login() {
  const { loginWithGoogle, loginWithPassword, register } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) =>
          loginWithGoogle(response.credential).catch((err) => setError(errorMessage(err, "Google login failed")))
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 336,
        shape: "pill"
      });

      setGoogleReady(true);
    };

    document.body.appendChild(script);
    return () => script.remove();
  }, [clientId, loginWithGoogle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "login") await loginWithPassword(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-center text-[28px] font-bold text-ink">{mode === "login" ? "Login" : "Create account"}</h1>

        <div className="mt-6" ref={buttonRef} />

        {!clientId && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.
          </p>
        )}
        {clientId && !googleReady && (
          <div className="h-11 w-full animate-pulse rounded-full bg-line" />
        )}

        <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          {mode === "login" ? "or sign in with email" : "or sign up with email"}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-brand"
            />
          )}

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email ID"
            className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-brand"
          />

          <input
            required
            type="password"
            minLength={mode === "signup" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-brand"
          />

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="font-medium text-brand-dark hover:underline"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </main>
  );
}
