"use client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowUpRight,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import { useState } from "react";
import { api, setCSRF } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/identity";
const schema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export function Login({
  onLogin,
  demoEnabled = false,
}: {
  onLogin: () => void;
  demoEnabled?: boolean;
}) {
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <main className="vector-access-page">
      <div className="access-orb access-orb-one" aria-hidden="true" />
      <div className="access-orb access-orb-two" aria-hidden="true" />
      <header className="vector-access-masthead">
        <Wordmark linked={false} />
        <Link href="/api-reference" className="access-reference">
          Platform reference <ArrowUpRight size={15} />
        </Link>
      </header>
      <div className="vector-access-heading">
        <span className="micro-label">A DIFFERENT PERSPECTIVE</span>
        <h1>
          Clarity starts here<span>.</span>
        </h1>
        <p>One workspace. Every signal connected.</p>
      </div>
      <section className="vector-access-card" aria-labelledby="access-title">
        <div className="access-symbol">
          <LockKeyhole size={27} />
        </div>
        <h2 id="access-title">Welcome to your workspace</h2>
        <p>Sign in to take a closer look at what matters.</p>
        {demoEnabled && (
          <div
            className="demo-login-hint"
            role="note"
            aria-label="Demo sign-in hint"
          >
            <strong>Demo account</strong>
            <div>
              <span>Email</span>
              <code>admin@sentinelml.example</code>
            </div>
            <div>
              <span>Password</span>
              <code>LocalDemo!2026</code>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit(async (values) => {
            setError("");
            try {
              const result = await api<{ user: User; csrf_token: string }>(
                "/auth/login",
                { method: "POST", body: JSON.stringify(values) },
              );
              setCSRF(result.csrf_token);
              onLogin();
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <label htmlFor="access-email">Work email</label>
          <input
            id="access-email"
            type="email"
            autoComplete="username"
            placeholder="you@organization.example"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <small className="field-error" id="email-error">
              {errors.email.message}
            </small>
          )}
          <label htmlFor="access-password">Password</label>
          <div className="access-password">
            <input
              id="access-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your secure password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <small className="field-error" id="password-error">
              {errors.password.message}
            </small>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button
            disabled={isSubmitting || demoPending}
            aria-label="Sign in to SentinelML"
          >
            {isSubmitting ? "Signing in…" : "Sign in to workspace"}
            <ArrowRight size={18} />
          </Button>
        </form>
        {demoEnabled && (
          <div className="demo-access">
            <div className="demo-access-divider">
              <span>or explore the platform</span>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={demoPending || isSubmitting}
              onClick={async () => {
                setError("");
                setDemoPending(true);
                try {
                  const result = await api<{ user: User; csrf_token: string }>(
                    "/auth/demo",
                    { method: "POST" },
                  );
                  setCSRF(result.csrf_token);
                  onLogin();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setDemoPending(false);
                }
              }}
            >
              {demoPending ? "Opening demo…" : "Try the live demo"}
              <ArrowRight size={17} />
            </Button>
            <small>Synthetic transactions. No email or password needed.</small>
          </div>
        )}
        <footer>
          <LockKeyhole size={12} /> Organization-scoped access
        </footer>
      </section>
      <footer className="vector-access-footer">
        SentinelML / Designed for considered decisions.
      </footer>
    </main>
  );
}
