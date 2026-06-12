"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ResultData {
  question: string;
  externalId: number;
  score: number;
  feedback: string;
  correctAnswer: string;
  userAnswer: string;
}

export default function ResultPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [result, setResult] = useState<ResultData | null>(null);
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const storedResult = sessionStorage.getItem(`session_${sessionId}_lastResult`);
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push(`/dashboard`);
    }

    // Get threshold from session
    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setThreshold(data.threshold || 70))
      .catch(() => {});
  }, [status, sessionId, router]);

  const handleNext = () => {
    const roundDataStr = sessionStorage.getItem(`session_${sessionId}_round`);
    const indexStr = sessionStorage.getItem(`session_${sessionId}_questionIndex`);

    if (!roundDataStr || !indexStr) {
      router.push("/dashboard");
      return;
    }

    const roundData = JSON.parse(roundDataStr);
    const currentIndex = parseInt(indexStr);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= roundData.questions.length) {
      // All questions answered → round summary
      router.push(`/session/${sessionId}/round-summary`);
    } else {
      // Next question
      sessionStorage.setItem(`session_${sessionId}_questionIndex`, nextIndex.toString());
      router.push(`/session/${sessionId}/question`);
    }
  };

  if (!result) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie wyniku...</p>
      </div>
    );
  }

  const passed = result.score >= threshold;
  const circumference = 2 * Math.PI * 68;
  const offset = circumference - (result.score / 100) * circumference;
  const strokeColor = passed ? "var(--success)" : "var(--error)";

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="card-static animate-scale-in" style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
        <div style={{ marginBottom: "var(--space-sm)", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Pytanie {result.externalId}
        </div>
        <h3 style={{ marginBottom: "var(--space-2xl)", fontSize: "1.1rem", lineHeight: 1.5 }}>
          {result.question}
        </h3>

        {/* Score Circle */}
        <div className="score-circle" style={{ marginBottom: "var(--space-xl)" }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle className="score-circle-bg" cx="80" cy="80" r="68" />
            <circle
              className="score-circle-progress"
              cx="80"
              cy="80"
              r="68"
              stroke={strokeColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="score-circle-text">
            <div className="score-circle-value" style={{ color: strokeColor }}>
              {result.score}%
            </div>
            <div className="score-circle-label">
              {passed ? "Zaliczone ✅" : "Niezaliczone ❌"}
            </div>
          </div>
        </div>

        {/* Badge */}
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <span className={`badge ${passed ? "badge-success" : "badge-error"}`} style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}>
            {passed ? `Powyżej progu (${threshold}%)` : `Poniżej progu (${threshold}%)`}
          </span>
        </div>
      </div>

      {/* AI Feedback */}
      <div className="feedback-card animate-fade-in-up" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          🤖 Feedback AI
        </h3>
        <p className="feedback-text">{result.feedback}</p>
      </div>

      {/* Correct Answer */}
      <div className="feedback-card animate-fade-in-up" style={{ marginBottom: "var(--space-lg)", animationDelay: "0.1s", opacity: 0 }}>
        <h3 style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          📖 Wzorcowa odpowiedź
        </h3>
        <p className="feedback-text">{result.correctAnswer}</p>
      </div>

      {/* User's Answer */}
      <div className="feedback-card animate-fade-in-up" style={{ marginBottom: "var(--space-xl)", animationDelay: "0.2s", opacity: 0 }}>
        <h3 style={{ marginBottom: "var(--space-md)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          ✍️ Twoja odpowiedź
        </h3>
        <p className="feedback-text" style={{ color: "var(--text-tertiary)" }}>
          {result.userAnswer}
        </p>
      </div>

      <button onClick={handleNext} className="btn btn-primary btn-lg btn-full">
        {(() => {
          const roundDataStr = sessionStorage.getItem(`session_${sessionId}_round`);
          const indexStr = sessionStorage.getItem(`session_${sessionId}_questionIndex`);
          if (roundDataStr && indexStr) {
            const roundData = JSON.parse(roundDataStr);
            const currentIndex = parseInt(indexStr);
            if (currentIndex + 1 >= roundData.questions.length) {
              return "📊 Podsumowanie tury";
            }
          }
          return "➡️ Następne pytanie";
        })()}
      </button>
    </div>
  );
}
