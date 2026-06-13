"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface RoundAnswer {
  id: string;
  userAnswer: string;
  score: number | null;
  feedback: string | null;
  answeredAt: string;
  question: {
    id: string;
    externalId: number;
    question: string;
    answer: string;
  };
}

interface Round {
  id: string;
  roundNumber: number;
  averageScore: number | null;
  createdAt: string;
  completedAt: string | null;
  answers: RoundAnswer[];
}

interface SessionDetail {
  id: string;
  status: string;
  mode: string;
  threshold: number;
  createdAt: string;
  questionSet: {
    name: string;
    questions: { id: string }[];
  };
  rounds: Round[];
}

export default function SessionDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSession();
    }
  }, [status, router, fetchSession]);

  if (loading || !session) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie szczegółów sesji...</p>
      </div>
    );
  }

  const chartData = session.rounds
    .filter((r) => r.averageScore !== null)
    .map((r) => ({
      name: `Tura ${r.roundNumber}`,
      score: Math.round(r.averageScore!),
      threshold: session.threshold,
    }));

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <button onClick={() => router.push("/history")} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
            ← Wróć
          </button>
          <span className={`badge ${session.status === "finished" ? "badge-success" : "badge-warning"}`}>
            {session.status === "finished" ? "Zakończona" : "W trakcie"}
          </span>
        </div>
        <h1>
          <span className="text-gradient">{session.questionSet.name}</span>
        </h1>
        <p>
          {new Date(session.createdAt).toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" • "}
          Tryb: {session.mode === "random" ? "Losowy" : "Po kolei"}
          {" • "}
          Próg: {session.threshold}%
        </p>
      </div>

      {/* Stats */}
      <div className="stats-row animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <div className="stat-value text-gradient">{session.rounds.length}</div>
          <div className="stat-label">Tury</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{session.questionSet.questions.length}</div>
          <div className="stat-label">Pytań łącznie</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {session.rounds.length > 0 && session.rounds[session.rounds.length - 1].averageScore !== null
              ? `${Math.round(session.rounds[session.rounds.length - 1].averageScore!)}%`
              : "—"}
          </div>
          <div className="stat-label">Wynik ostatniej tury</div>
        </div>
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
          <h3 style={{ marginBottom: "var(--space-lg)" }}>📈 Postęp nauki</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgba(26, 26, 62, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#scoreGradient)"
                name="Wynik (%)"
              />
              <Line
                type="monotone"
                dataKey="threshold"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Próg"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rounds */}
      <div>
        <h3 style={{ marginBottom: "var(--space-lg)" }}>Szczegóły tur</h3>
        {session.rounds.map((round) => (
          <div
            key={round.id}
            className="card-static animate-fade-in-up"
            style={{ marginBottom: "var(--space-md)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <span className="badge badge-info">Tura {round.roundNumber}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {round.answers.length} pytań
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                {round.averageScore !== null && (
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        round.averageScore >= session.threshold
                          ? "var(--success)"
                          : "var(--error)",
                    }}
                  >
                    {Math.round(round.averageScore)}%
                  </span>
                )}
                <span style={{ transition: "transform 0.2s", transform: expandedRound === round.id ? "rotate(180deg)" : "rotate(0)" }}>
                  ▼
                </span>
              </div>
            </div>

            {expandedRound === round.id && (
              <div style={{ marginTop: "var(--space-lg)" }}>
                <div className="question-list">
                  {round.answers.map((answer) => {
                    const passed = (answer.score ?? 0) >= session.threshold;
                    return (
                      <div key={answer.id} className="question-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-md)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flex: 1 }}>
                            <span className="question-item-number">{answer.question.externalId}</span>
                            <span className="question-item-text" style={{ fontWeight: 600 }}>
                              {answer.question.question}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                              🕐 {new Date(answer.answeredAt).toLocaleString("pl-PL", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <span style={{ fontWeight: 700, color: passed ? "var(--success)" : "var(--error)" }}>
                              {answer.score ?? 0}%
                            </span>
                            <span>{passed ? "✅" : "❌"}</span>
                          </div>
                        </div>
                        <div style={{ paddingLeft: "calc(32px + var(--space-md))" }}>
                          <div style={{ marginBottom: "var(--space-sm)" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                              Twoja odpowiedź:
                            </span>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {answer.userAnswer}
                            </p>
                          </div>
                          {answer.feedback && (
                            <div>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                                🤖 Feedback:
                              </span>
                              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                {answer.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
