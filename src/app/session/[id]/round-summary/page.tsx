"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface AnswerResult {
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  score: number;
  feedback: string;
  externalId: number;
}

export default function RoundSummaryPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [threshold, setThreshold] = useState(70);
  const [loading, setLoading] = useState(true);
  const [startingNext, setStartingNext] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadData = useCallback(async () => {
    const answersStr = sessionStorage.getItem(`session_${sessionId}_answers`);
    const roundStr = sessionStorage.getItem(`session_${sessionId}_round`);

    if (!answersStr || !roundStr) {
      router.push("/dashboard");
      return;
    }

    const answersData = JSON.parse(answersStr);
    const roundData = JSON.parse(roundStr);

    setAnswers(answersData);
    setRoundNumber(roundData.round.roundNumber);

    // Get threshold
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const sessionData = await res.json();
        setThreshold(sessionData.threshold || 70);
      }
    } catch {}

    // Complete the round
    const avgScore = answersData.length > 0
      ? Math.round(answersData.reduce((sum: number, a: AnswerResult) => sum + a.score, 0) / answersData.length)
      : 0;

    try {
      await fetch(`/api/session/${sessionId}/complete-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: roundData.round.id,
          averageScore: avgScore,
        }),
      });
    } catch {}

    setLoading(false);
  }, [sessionId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadData();
    }
  }, [status, router, loadData]);

  useEffect(() => {
    // Show confetti if all passed
    if (!loading && answers.length > 0) {
      const failedCount = answers.filter((a) => a.score < threshold).length;
      if (failedCount === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [loading, answers, threshold]);

  const handleNextRound = async () => {
    setStartingNext(true);
    const failedQuestionIds = answers
      .filter((a) => a.score < threshold)
      .map((a) => a.questionId);

    try {
      const res = await fetch(`/api/session/${sessionId}/next-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: failedQuestionIds }),
      });

      if (res.ok) {
        const roundData = await res.json();
        sessionStorage.setItem(`session_${sessionId}_round`, JSON.stringify(roundData));
        sessionStorage.setItem(`session_${sessionId}_questionIndex`, "0");
        sessionStorage.setItem(`session_${sessionId}_answers`, JSON.stringify([]));
        router.push(`/session/${sessionId}/question`);
      }
    } catch (error) {
      console.error("Error:", error);
      setStartingNext(false);
    }
  };

  const handleFinish = async () => {
    try {
      await fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      });
    } catch {}

    // Clear session storage
    sessionStorage.removeItem(`session_${sessionId}_round`);
    sessionStorage.removeItem(`session_${sessionId}_questionIndex`);
    sessionStorage.removeItem(`session_${sessionId}_answers`);
    sessionStorage.removeItem(`session_${sessionId}_lastResult`);

    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Podsumowywanie tury...</p>
      </div>
    );
  }

  const avgScore = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length)
    : 0;
  const passedCount = answers.filter((a) => a.score >= threshold).length;
  const failedCount = answers.filter((a) => a.score < threshold).length;
  const allPassed = failedCount === 0;

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      {/* Confetti */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"][
                  Math.floor(Math.random() * 6)
                ],
                borderRadius: Math.random() > 0.5 ? "50%" : "0",
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="round-header animate-scale-in">
        <span className="badge badge-info" style={{ marginBottom: "var(--space-md)", display: "inline-block" }}>
          Tura {roundNumber}
        </span>
        <h1>
          {allPassed ? (
            <span className="text-gradient">Gratulacje! 🎉</span>
          ) : (
            <span className="text-gradient">Podsumowanie tury</span>
          )}
        </h1>
      </div>

      {allPassed && (
        <div className="congratulations animate-fade-in-up">
          <div className="congratulations-emoji">🏆</div>
          <h2>Wszystkie pytania zaliczone!</h2>
          <p>Odpowiedziałeś na wszystkie pytania powyżej progu {threshold}%.</p>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row animate-fade-in-up" style={{ marginBottom: "var(--space-xl)", animationDelay: "0.1s", opacity: 0 }}>
        <div className="stat-card">
          <div className="stat-value text-gradient">{avgScore}%</div>
          <div className="stat-label">Średni wynik</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{passedCount}</div>
          <div className="stat-label">Zaliczone</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: failedCount > 0 ? "var(--error)" : "var(--success)" }}>
            {failedCount}
          </div>
          <div className="stat-label">Do powtórzenia</div>
        </div>
      </div>

      {/* Question List */}
      <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)", animationDelay: "0.2s", opacity: 0 }}>
        <h3 style={{ marginBottom: "var(--space-lg)" }}>Wyniki pytań</h3>
        <div className="question-list">
          {answers.map((answer, index) => {
            const passed = answer.score >= threshold;
            return (
              <div key={index} className="question-item">
                <div className="question-item-left">
                  <span className="question-item-number">{answer.externalId}</span>
                  <span className="question-item-text">{answer.question}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <span
                    className="question-item-score"
                    style={{ color: passed ? "var(--success)" : "var(--error)" }}
                  >
                    {answer.score}%
                  </span>
                  <span>{passed ? "✅" : "❌"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-md)", flexDirection: "column" }}>
        {failedCount > 0 && (
          <button
            onClick={handleNextRound}
            className="btn btn-primary btn-lg btn-full"
            disabled={startingNext}
          >
            {startingNext ? (
              <>
                <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Przygotowywanie...
              </>
            ) : (
              `🔄 Kolejna tura (${failedCount} pytań do powtórzenia)`
            )}
          </button>
        )}
        <button onClick={handleFinish} className={`btn ${allPassed ? "btn-primary" : "btn-secondary"} btn-lg btn-full`}>
          {allPassed ? "🏠 Wróć do Dashboard" : "⏹️ Zakończ sesję"}
        </button>
      </div>
    </div>
  );
}
