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

            return (
              <Link
                key={session.id}
                href={`/history/${session.id}`}
                className="card animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s`, opacity: 0, textDecoration: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ flex: 1 }}>{session.questionSet.name}</h3>
                  <span className={`badge ${isFinished ? "badge-success" : "badge-warning"}`}>
                    {isFinished ? "Zakończona" : "W trakcie"}
                  </span>
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
