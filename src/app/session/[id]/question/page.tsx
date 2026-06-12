"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Question {
  id: string;
  externalId: number;
  question: string;
  answer: string;
}

interface RoundData {
  round: { id: string; roundNumber: number };
  questions: Question[];
}

export default function QuestionPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Load round data from sessionStorage
    const stored = sessionStorage.getItem(`session_${sessionId}_round`);
    const storedIndex = sessionStorage.getItem(
      `session_${sessionId}_questionIndex`
    );

    if (stored) {
      setRoundData(JSON.parse(stored));
      setQuestionIndex(storedIndex ? parseInt(storedIndex) : 0);
    } else {
      router.push(`/dashboard`);
      return;
    }
    setLoading(false);
  }, [status, sessionId, router]);

  const handleSubmit = async () => {
    if (!roundData || !userAnswer.trim()) return;
    setSubmitting(true);

    const currentQuestion = roundData.questions[questionIndex];

    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userAnswer: userAnswer.trim(),
          roundId: roundData.round.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();

        // Save answer to list
        const answersKey = `session_${sessionId}_answers`;
        const existingAnswers = JSON.parse(
          sessionStorage.getItem(answersKey) || "[]"
        );
        existingAnswers.push({
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          correctAnswer: result.correctAnswer,
          userAnswer: userAnswer.trim(),
          score: result.score,
          feedback: result.feedback,
          externalId: currentQuestion.externalId,
        });
        sessionStorage.setItem(answersKey, JSON.stringify(existingAnswers));

        // Store result for result page
        sessionStorage.setItem(
          `session_${sessionId}_lastResult`,
          JSON.stringify({
            ...result,
            question: currentQuestion.question,
            externalId: currentQuestion.externalId,
          })
        );

        // Navigate to result page
        router.push(`/session/${sessionId}/result`);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !roundData) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie pytania...</p>
      </div>
    );
  }

  const currentQuestion = roundData.questions[questionIndex];
  const total = roundData.questions.length;
  const progress = ((questionIndex) / total) * 100;

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
          <span className="badge badge-info">
            Tura {roundData.round.roundNumber}
          </span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Pytanie {questionIndex + 1} / {total}
          </span>
        </div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
          <span className="question-item-number" style={{ width: 40, height: 40, fontSize: "0.9rem" }}>
            {currentQuestion.externalId}
          </span>
          <span className="badge badge-info">Pytanie</span>
        </div>

        <h2 style={{ fontSize: "1.3rem", lineHeight: 1.5, marginBottom: "var(--space-2xl)" }}>
          {currentQuestion.question}
        </h2>

        <div className="input-group">
          <label htmlFor="answer-input" style={{ fontSize: "0.95rem" }}>
            Twoja odpowiedź
          </label>
          <textarea
            id="answer-input"
            className="textarea"
            placeholder="Wpisz swoją odpowiedź..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSubmit();
            }}
            rows={5}
            disabled={submitting}
            autoFocus
          />
          <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
            Ctrl + Enter aby zatwierdzić
          </p>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="btn btn-primary btn-lg btn-full"
        disabled={submitting || !userAnswer.trim()}
      >
        {submitting ? (
          <>
            <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            <span>Ocenianie przez AI<span className="loading-dots"></span></span>
          </>
        ) : (
          "✅ Zatwierdź odpowiedź"
        )}
      </button>
    </div>
  );
}
