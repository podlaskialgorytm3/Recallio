"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Błąd rejestracji");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Wystąpił nieoczekiwany błąd");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ marginBottom: "var(--space-md)", display: "flex", justifyContent: "center" }}>
            <img src="/icon-192x192.png" alt="Recallio Logo" style={{ width: 64, height: 64, borderRadius: "16px", boxShadow: "0 6px 16px rgba(139, 92, 246, 0.4)" }} />
          </div>
          <h1 className="text-gradient">
            {isRegister ? "Utwórz konto" : "Zaloguj się"}
          </h1>
          <p>
            {isRegister
              ? "Zarejestruj się, aby rozpocząć naukę"
              : "Witaj z powrotem! Kontynuuj naukę"}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="input-group animate-fade-in-up">
              <label htmlFor="name">Imię (opcjonalne)</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Twoje imię"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="twoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="loading-spinner"
                  style={{ width: 20, height: 20, borderWidth: 2 }}
                />
                Ładowanie...
              </>
            ) : isRegister ? (
              "Zarejestruj się"
            ) : (
              "Zaloguj się"
            )}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister ? "Masz już konto?" : "Nie masz konta?"}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Zaloguj się" : "Zarejestruj się"}
          </button>
        </div>
      </div>
    </div>
  );
}
