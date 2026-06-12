"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface SessionHistory {
  id: string;
  status: string;
  mode: string;
  threshold: number;
  createdAt: string;
  completedAt: string | null;
  questionSet: {
    name: string;
    _count: { questions: number };
  };
  rounds: {
    id: string;
    roundNumber: number;
    averageScore: number | null;
  }[];
}

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchHistory();
    }
  }, [status, router, fetchHistory]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Czy na pewno chcesz usunąć tę sesję z historii?")) return;

    try {
      const res = await fetch(`/api/session/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleResume = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResumingId(sessionId);

    try {
      const res = await fetch(`/api/session/${sessionId}/resume`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();

        // Store round data in sessionStorage (same format as config page)
        sessionStorage.setItem(
          `session_${sessionId}_round`,
          JSON.stringify({ round: data.round, questions: data.questions })
        );
        sessionStorage.setItem(
          `session_${sessionId}_questionIndex`,
          data.resumeIndex.toString()
        );
        sessionStorage.setItem(
          `session_${sessionId}_answers`,
          JSON.stringify(data.existingAnswers || [])
        );

        if (data.allAnswered) {
          // All questions answered - go to round summary
          router.push(`/session/${sessionId}/round-summary`);
        } else {
          router.push(`/session/${sessionId}/question`);
        }
      }
    } catch (error) {
      console.error("Error resuming session:", error);
    } finally {
      setResumingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie historii...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <span className="text-gradient">Historia sesji</span> 📊
        </h1>
        <p>Przeglądaj swoje wcześniejsze sesje nauki i śledź postępy.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card-static">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Brak historii</h3>
            <p>Nie masz jeszcze żadnych zakończonych sesji. Rozpocznij naukę!</p>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Przejdź do Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="session-grid">
          {sessions.map((session, index) => {
            const lastRound = session.rounds[session.rounds.length - 1];
            const finalScore = lastRound?.averageScore ?? null;
            const isFinished = session.status === "finished";
            const isActive = session.status === "active";

            return (
              <div
                key={session.id}
                className="card animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Link
                    href={`/history/${session.id}`}
                    style={{ flex: 1, textDecoration: "none", color: "inherit" }}
                  >
                    <h3 style={{ flex: 1 }}>{session.questionSet.name}</h3>
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <span className={`badge ${isFinished ? "badge-success" : "badge-warning"}`}>
                      {isFinished ? "Zakończona" : "W trakcie"}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="btn btn-danger"
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                      title="Usuń sesję"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="session-card-meta">
                  <span>
                    📅{" "}
                    {new Date(session.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="stats-row" style={{ marginTop: "var(--space-lg)" }}>
                  <div className="stat-card" style={{ padding: "var(--space-md)" }}>
                    <div className="stat-value" style={{ fontSize: "1.3rem" }}>
                      {session.rounds.length}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>Tury</div>
                  </div>
                  <div className="stat-card" style={{ padding: "var(--space-md)" }}>
                    <div className="stat-value" style={{ fontSize: "1.3rem" }}>
                      {session.questionSet._count.questions}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>Pytań</div>
                  </div>
                  <div className="stat-card" style={{ padding: "var(--space-md)" }}>
                    <div
                      className="stat-value"
                      style={{
                        fontSize: "1.3rem",
                        color: finalScore !== null
                          ? finalScore >= session.threshold
                            ? "var(--success)"
                            : "var(--error)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {finalScore !== null ? `${Math.round(finalScore)}%` : "—"}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>Wynik</div>
                  </div>
                </div>

                <div style={{ marginTop: "var(--space-lg)", display: "flex", gap: "var(--space-sm)" }}>
                  {isActive && (
                    <button
                      onClick={(e) => handleResume(e, session.id)}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={resumingId === session.id}
                    >
                      {resumingId === session.id ? (
                        <>
                          <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                          Wznawianie...
                        </>
                      ) : (
                        "▶️ Kontynuuj"
                      )}
                    </button>
                  )}
                  <Link
                    href={`/history/${session.id}`}
                    className="btn btn-secondary"
                    style={{ flex: isActive ? undefined : 1, textAlign: "center" }}
                  >
                    📋 Szczegóły
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
