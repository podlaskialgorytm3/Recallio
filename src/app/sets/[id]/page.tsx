"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Question {
  id: string;
  externalId: number;
  question: string;
  answer: string;
}

interface QuestionSet {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  isOwner: boolean;
  user: {
    email: string;
    name: string | null;
  };
  _count: {
    questions: number;
  };
  questions: Question[];
}

export default function SetPreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && params.id) {
      fetchSetDetails();
    }
  }, [status, params.id, router]);

  const fetchSetDetails = async () => {
    try {
      const res = await fetch(`/api/sets/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Nie znaleziono zestawu lub brak dostępu.");
        throw new Error("Wystąpił błąd podczas pobierania danych.");
      }
      
      const data = await res.json();
      setSet(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie zestawu...</p>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="page-container empty-state">
        <div className="empty-state-icon">🚫</div>
        <h3>Ups, coś poszło nie tak</h3>
        <p>{error || "Nie udało się załadować zestawu."}</p>
        <Link href="/explore" className="btn btn-primary">
          Wróć do przeglądania
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up" style={{ opacity: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>
              <span className="text-gradient">{set.name}</span>
            </h1>
            <p style={{ marginTop: "0.5rem" }}>
              Autor: <strong>{set.user.name || set.user.email}</strong> •{" "}
              {set.isPublic ? (
                <span className="badge badge-success">Publiczny</span>
              ) : (
                <span className="badge badge-info">Prywatny</span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href={`/session/${set.id}/config`} className="btn btn-primary">
              ▶ Rozpocznij naukę
            </Link>
            {set.isOwner && (
              <Link href={`/sets/${set.id}/edit`} className="btn btn-secondary">
                ✏️ Edytuj
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="stats-row animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.1s", marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <div className="stat-value">{set._count.questions}</div>
          <div className="stat-label">Liczba pytań</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{new Date(set.createdAt).toLocaleDateString()}</div>
          <div className="stat-label">Data utworzenia</div>
        </div>
      </div>

      <div className="card-static animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.2s" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Lista pytań</h3>
        <div className="study-list">
          {set.questions.map((q, index) => (
            <div key={q.id} className="study-card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                <span style={{ color: "var(--accent-primary)", marginRight: "0.5rem" }}>#{index + 1}</span>
                {q.question}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", paddingLeft: "1.5rem", borderLeft: "2px solid var(--border)", marginLeft: "0.5rem" }}>
                {q.answer}
              </div>
            </div>
          ))}
          {set.questions.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              Ten zestaw nie zawiera jeszcze żadnych pytań.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
