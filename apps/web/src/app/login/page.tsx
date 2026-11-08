
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed. Check your credentials.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      if (data.authenticated) {
        router.push("/");
        router.refresh();
        return;
      }

      setMode("login");
      setPassword("");
      setNotice("Account created successfully! Please sign in.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6fa] p-5">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[#111827] p-12 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-2xl font-bold">
                P
              </div>
              <span className="text-2xl font-bold">PayPilot</span>
            </div>

            <div className="mt-24">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
                Personal Finance AI
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight">
                Take control of your money.
                <span className="text-violet-400">
                  {" "}Build a smarter financial future.
                </span>
              </h1>
              <p className="mt-6 leading-7 text-slate-400">
                Track your accounts, understand your spending and discover
                useful financial insights in one place.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 PayPilot AI. All rights reserved.
          </p>
        </section>

        <section className="flex items-center justify-center p-7 py-14 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-10 md:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">
                  P
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  PayPilot
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold text-violet-600">
              {isRegister ? "GET STARTED" : "WELCOME BACK"}
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {isRegister ? "Create your account" : "Sign in to your account"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isRegister
                ? "Create your PayPilot account to start managing your finances."
                : "Enter your account details to access your financial dashboard."}
            </p>

            <form
              onSubmit={isRegister ? handleRegister : handleLogin}
              className="mt-9 space-y-5"
            >
              {isRegister && (
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegister ? "Create a password" : "Enter your password"
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                >
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? isRegister
                    ? "Creating account..."
                    : "Signing in..."
                  : isRegister
                    ? "Create Account →"
                    : "Sign In →"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              {isRegister
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegister ? "login" : "register");
                  setError("");
                  setNotice("");
                }}
                className="font-semibold text-violet-600 hover:text-violet-700"
              >
                {isRegister ? "Sign In" : "Create Account"}
              </button>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              Secure sign-in powered by PayPilot AI.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
