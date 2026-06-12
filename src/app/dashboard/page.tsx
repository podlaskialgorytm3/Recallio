"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface QuestionSet {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    questions: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSets = useCallback(async () => {
    try {
      const res = await fetch("/api/sets");
      if (res.ok) {
        const data = await res.json();
        setSets(data);
      }
    } catch (error) {
      console.error("Error fetching sets:", error);
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
      fetchSets();
    }
  }, [status, router, fetchSets]);

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
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>
            Witaj, <span className="text-gradient">{session?.user?.name || session?.user?.email?.split("@")[0]}</span>! 👋
          </h1>
          <p>Wybierz zestaw pytań lub wgraj nowy, aby rozpocząć naukę.</p>
        </div>
        <Link href="/sets/upload" className="btn btn-primary btn-lg">
          ➕ Wgraj nowy zestaw
        </Link>
      </div>

      {sets.length === 0 ? (
        <div className="card-static">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>Brak zestawów pytań</h3>
            <p>Wgraj swój pierwszy plik JSON z pytaniami, aby rozpocząć naukę!</p>
            <Link href="/sets/upload" className="btn btn-primary btn-lg">
              Wgraj plik JSON
            </Link>
          </div>
        </div>
      ) : (
        <div className="session-grid">
          {sets.map((set, index) => (
            <div
              key={set.id}
              className="card animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3>{set.name}</h3>
                <button
                  onClick={() => handleDeleteSet(set.id)}
                  className="btn btn-danger"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                  title="Usuń zestaw"
                >
                  🗑️
                </button>
              </div>
              <div className="session-card-meta">
                <span>📝 {set._count.questions} pytań</span>
                <span className="dot" />
                <span>
                  📅{" "}
                  {new Date(set.createdAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div style={{ marginTop: "var(--space-lg)", display: "flex", gap: "var(--space-sm)" }}>
                <button
                  onClick={() => handleStartSession(set.id)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  🚀 Rozpocznij sesję
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
