"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SessionConfigPage() {
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [mode, setMode] = useState<"sequential" | "random">("sequential");
  const [threshold, setThreshold] = useState(70);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sessionData, setSessionData] = useState<{
    questionSet: { name: string; questions: { id: string }[] };
  } | null>(null);

  // AI validation state
  const [aiStatus, setAiStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSession();
      validateAI();
    }
  }, [status]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
        setMode(data.mode || "sequential");
        setThreshold(data.threshold || 70);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateAI = async () => {
    setAiStatus("checking");
    setAiError(null);
    try {
      const res = await fetch("/api/settings/validate");
      const data = await res.json();
      if (data.valid) {
        setAiStatus("valid");
        setAiModel(data.model);
      } else {
        setAiStatus("invalid");
        setAiError(data.message);
      }
    } catch {
      setAiStatus("invalid");
      setAiError("Nie udało się sprawdzić połączenia z AI.");
    }
  };

  const handleStart = async () => {
    if (aiStatus !== "valid") return;
    setStarting(true);

    try {
      // Update session config
      await fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, threshold }),
      });

      // Create first round
      const roundRes = await fetch(`/api/session/${sessionId}/next-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (roundRes.ok) {
        const roundData = await roundRes.json();
        // Store round data in sessionStorage
        sessionStorage.setItem(
          `session_${sessionId}_round`,
          JSON.stringify(roundData)
        );
        sessionStorage.setItem(`session_${sessionId}_questionIndex`, "0");
        sessionStorage.setItem(
          `session_${sessionId}_answers`,
          JSON.stringify([])
        );
        router.push(`/session/${sessionId}/question`);
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie...</p>
      </div>
    );
  }

  const questionCount = sessionData?.questionSet?.questions?.length || 0;

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header" style={{ textAlign: "center" }}>
        <h1>
          <span className="text-gradient">Konfiguracja sesji</span>
        </h1>
        <p>{sessionData?.questionSet?.name}</p>
      </div>

      {/* AI Status Banner */}
      <div
        className={`ai-status-banner ${
          aiStatus === "checking"
            ? "ai-status-checking"
            : aiStatus === "valid"
              ? "ai-status-valid"
              : "ai-status-invalid"
        } animate-fade-in-up`}
        style={{ marginBottom: "var(--space-xl)", opacity: 0 }}
      >
        <div className="ai-status-icon">
          {aiStatus === "checking" && (
            <span className="loading-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
          )}
          {aiStatus === "valid" && "✅"}
          {aiStatus === "invalid" && "❌"}
        </div>
        <div className="ai-status-content">
          {aiStatus === "checking" && (
            <>
              <strong>Sprawdzanie połączenia z AI...</strong>
              <p>Weryfikacja klucza API i modelu Gemini</p>
            </>
          )}
          {aiStatus === "valid" && (
            <>
              <strong>AI gotowe do pracy</strong>
              <p>Model: {aiModel} — połączenie działa poprawnie</p>
            </>
          )}
          {aiStatus === "invalid" && (
            <>
              <strong>Brak połączenia z AI</strong>
              <p>{aiError}</p>
              <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
                <Link href="/settings" className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                  ⚙️ Przejdź do Ustawień
                </Link>
                <button
                  onClick={validateAI}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                >
                  🔄 Sprawdź ponownie
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
          <span style={{ fontSize: "2rem" }}>📝</span>
          <div>
            <h3>{questionCount} pytań</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              w tym zestawie
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-2xl)" }}>
          <label style={{ display: "block", marginBottom: "var(--space-md)", fontWeight: 600 }}>
            Tryb pytań
          </label>
          <div className="toggle-group">
            <button
              className={`toggle-option ${mode === "sequential" ? "active" : ""}`}
              onClick={() => setMode("sequential")}
            >
              📋 Po kolei
            </button>
            <button
              className={`toggle-option ${mode === "random" ? "active" : ""}`}
              onClick={() => setMode("random")}
            >
              🎲 Losowo
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "var(--space-md)", fontWeight: 600 }}>
            Próg zaliczenia
          </label>
          <div className="slider-value">
            <span className="text-gradient">{threshold}%</span>
          </div>
          <input
            type="range"
            className="slider"
            min={10}
            max={100}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "var(--space-sm)" }}>
            <span>10%</span>
            <span>100%</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "var(--space-md)", textAlign: "center" }}>
            Pytania z wynikiem poniżej {threshold}% trafią do kolejnej tury
          </p>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="btn btn-primary btn-lg btn-full"
        disabled={starting || aiStatus !== "valid"}
        title={aiStatus !== "valid" ? "Najpierw skonfiguruj połączenie z AI w Ustawieniach" : ""}
      >
        {starting ? (
          <>
            <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            Rozpoczynanie...
          </>
        ) : aiStatus !== "valid" ? (
          "🔒 Skonfiguruj AI, aby rozpocząć"
        ) : (
          "🚀 Rozpocznij naukę"
        )}
      </button>
    </div>
  );
}
