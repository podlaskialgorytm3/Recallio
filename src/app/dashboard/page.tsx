"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface QuestionSet {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  _count: {
    questions: number;
  };
}

interface ActiveSession {
  id: string;
  questionSetId: string;
  status: string;
  rounds: { roundNumber: number }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);

  // Wallet State
  const [wallet, setWallet] = useState<{hasOwnKey: boolean; checkedRemaining: number; generatedRemaining: number} | null>(null);
  const [fulfillmentMsg, setFulfillmentMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [setsRes, historyRes, walletRes] = await Promise.all([
        fetch("/api/sets"),
        fetch("/api/history"),
        fetch("/api/user/wallet"),
      ]);

      if (setsRes.ok) {
        const data = await setsRes.json();
        setSets(data);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setActiveSessions(
          historyData.filter((s: ActiveSession) => s.status === "active")
        );
      }

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    // Check for Stripe session fulfillment
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");

    const fulfillPayment = async () => {
      try {
        const res = await fetch("/api/checkout/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        if (data.success) {
          setFulfillmentMsg("Płatność zatwierdzona! Limity zostały dodane do Twojego portfela.");
          // remove params from url without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error("Fulfillment error:", err);
      } finally {
        if (status === "authenticated") fetchData();
      }
    };

    if (success === "true" && sessionId) {
      fulfillPayment();
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleStartSession = async (setId: string) => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: setId }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/session/${data.id}/config`);
      }
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    setResumingId(sessionId);
    try {
      const res = await fetch(`/api/session/${sessionId}/resume`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();

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

  const handleDeleteSet = async (setId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten zestaw?")) return;
    try {
      const res = await fetch(`/api/sets/${setId}`, { method: "DELETE" });
      if (res.ok) {
        setSets(sets.filter((s) => s.id !== setId));
      }
    } catch (error) {
      console.error("Error deleting set:", error);
    }
  };

  const handleToggleVisibility = async (setId: string, currentPublic: boolean) => {
    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !currentPublic }),
      });
      if (res.ok) {
        setSets(sets.map((s) => s.id === setId ? { ...s, isPublic: !currentPublic } : s));
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>
            Witaj, <span className="text-gradient">{session?.user?.name || session?.user?.email?.split("@")[0]}</span>! 👋
          </h1>
          <p>Wybierz zestaw pytań lub wgraj nowy, aby rozpocząć naukę.</p>
        </div>
        <div className="dashboard-hero-actions" style={{ position: "relative" }}>
          <div className="tooltip-bubble animate-fade-in-up" style={{
            position: "absolute",
            top: "-40px",
            right: 0,
            background: "var(--accent-gradient)",
            color: "white",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "0.8rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-glow)",
            zIndex: 10,
            pointerEvents: "none"
          }}>
            ✨ Nowość: Inteligentne tworzenie z AI!
          </div>
          <Link href="/sets/create" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            ➕ Kreacja zestawu
          </Link>
        </div>
      </div>

      {fulfillmentMsg && (
        <div style={{ background: "var(--success-color)", color: "white", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", textAlign: "center" }}>
          {fulfillmentMsg}
        </div>
      )}

      {/* Wallet Widget */}
      {wallet && (
        <div className="card-static animate-fade-in-up" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>💳</span> Twój Portfel AI
          </h2>
          {wallet.hasOwnKey ? (
            <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--success-color)", padding: "1rem", borderRadius: "8px", color: "var(--success-color)", fontWeight: "bold" }}>
              Korzystasz z własnego klucza API Gemini. Nielimitowany dostęp do generowania i sprawdzania pytań!
            </div>
          ) : (
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Pytania do wygenerowania</span>
                  <span style={{ fontWeight: "bold" }}>{wallet.generatedRemaining}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (wallet.generatedRemaining / 100) * 100)}%`, height: "100%", background: "var(--accent-primary)", borderRadius: "4px" }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Pytania do sprawdzenia</span>
                  <span style={{ fontWeight: "bold" }}>{wallet.checkedRemaining}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (wallet.checkedRemaining / 100) * 100)}%`, height: "100%", background: "var(--success-color)", borderRadius: "4px" }} />
                </div>
              </div>
              {wallet.generatedRemaining === 0 && wallet.checkedRemaining === 0 && (
                <div style={{ width: "100%", marginTop: "1rem" }}>
                  <Link href="/pricing" className="btn btn-primary" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
                    🛒 Dokup pakiet
                  </Link>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginLeft: "1rem" }}>
                    lub podepnij własny klucz w <Link href="/settings" style={{ color: "var(--accent-primary)" }}>Ustawieniach</Link>.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {sets.length === 0 ? (
        <div className="card-static">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>Brak zestawów pytań</h3>
            <p>Utwórz swój pierwszy zestaw pytań ręcznie lub wgraj plik JSON, aby rozpocząć naukę!</p>
            <div className="dashboard-hero-actions">
              <Link href="/sets/create" className="btn btn-primary btn-lg">
                ➕ Kreacja zestawu
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="set-grid">
          {sets.map((set, index) => {
            const activeSession = activeSessions.find(
              (s) => s.questionSetId === set.id
            );

            return (
              <div
                key={set.id}
                className="set-card"
                style={{ animationDelay: `${index * 0.07}s` }}
              >
                {/* Gradient border glow (visible on hover) */}
                <div className="set-card-glow" />

                {/* Card content */}
                <div className="set-card-inner">
                  {/* Header: title + actions */}
                  <div className="set-card-header">
                    <h3 className="set-card-title">{set.name}</h3>
                    <div className="set-card-header-actions">
                      <button
                        onClick={() => handleToggleVisibility(set.id, set.isPublic)}
                        className={`set-badge ${set.isPublic ? "set-badge-public" : "set-badge-private"}`}
                        title={set.isPublic ? "Zmień na prywatny" : "Zmień na publiczny"}
                      >
                        <span className="set-badge-icon">{set.isPublic ? "🌍" : "🔒"}</span>
                        {set.isPublic ? "Publiczny" : "Prywatny"}
                      </button>
                      <button
                        onClick={() => handleDeleteSet(set.id)}
                        className="set-delete-btn"
                        title="Usuń zestaw"
                      >
                        <span className="set-delete-icon">🗑️</span>
                      </button>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="set-card-meta">
                    <div className="set-meta-item">
                      <span className="set-meta-icon">📝</span>
                      <span>{set._count.questions} pytań</span>
                    </div>
                    <div className="set-meta-divider" />
                    <div className="set-meta-item">
                      <span className="set-meta-icon">📅</span>
                      <span>
                        {new Date(set.createdAt).toLocaleDateString("pl-PL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="set-card-actions">
                    {activeSession ? (
                      <button
                        onClick={() => handleResumeSession(activeSession.id)}
                        className="set-action-btn set-action-resume"
                        disabled={resumingId === activeSession.id}
                        style={{ animationDelay: `${index * 0.07 + 0.1}s` }}
                      >
                        <span className="set-action-icon">▶️</span>
                        <span className="set-action-label">
                          {resumingId === activeSession.id ? (
                            <>
                              <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                              Wznawianie
                            </>
                          ) : (
                            "Kontynuuj"
                          )}
                        </span>
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleStartSession(set.id)}
                      className="set-action-btn set-action-primary"
                      style={{ animationDelay: `${index * 0.07 + 0.15}s` }}
                    >
                      <span className="set-action-icon set-action-icon-rocket">🚀</span>
                      <span className="set-action-label">
                        {activeSession ? "Nowa sesja" : "Rozpocznij"}
                      </span>
                    </button>
                    <Link
                      href={`/study/${set.id}`}
                      className="set-action-btn set-action-secondary"
                      style={{ animationDelay: `${index * 0.07 + 0.2}s` }}
                    >
                      <span className="set-action-icon">📖</span>
                      <span className="set-action-label">Nauka</span>
                    </Link>
                    <Link
                      href={`/sets/${set.id}/edit`}
                      className="set-action-btn set-action-secondary"
                      style={{ animationDelay: `${index * 0.07 + 0.25}s` }}
                    >
                      <span className="set-action-icon">✏️</span>
                      <span className="set-action-label">Edytuj</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
