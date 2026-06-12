"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

interface Question {
  id: string;
  externalId: number;
  question: string;
  answer: string;
}

interface SetData {
  id: string;
  name: string;
  questions: Question[];
  _count: { questions: number };
}

export default function StudyPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const setId = params.setId as string;

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  const fetchSet = useCallback(async () => {
    try {
      const res = await fetch(`/api/sets/${setId}`);
      if (res.ok) {
        const data = await res.json();
        setSetData(data);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching set:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [setId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSet();
    }
  }, [status, router, fetchSet]);

  const filteredQuestions = useMemo(() => {
    if (!setData) return [];
    if (!searchQuery.trim()) return setData.questions;

    const query = searchQuery.toLowerCase();
    return setData.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query) ||
        q.externalId.toString().includes(query)
    );
  }, [setData, searchQuery]);

  const toggleQuestion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedIds(new Set(filteredQuestions.map((q) => q.id)));
      setAllExpanded(true);
    }
  };

  if (loading || !setData) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ladowanie zestawu...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
            &larr; Dashboard
          </Link>
          <span className="badge badge-info">Tryb nauki</span>
        </div>
        <h1>
          <span className="text-gradient">{setData.name}</span> 📖
        </h1>
        <p>{setData.questions.length} pytan w zestawie</p>
      </div>

      {/* Search & Controls */}
      <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", flexWrap: "wrap" }}>
          <div className="input-group" style={{ flex: 1, minWidth: 250 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="input"
                placeholder="Szukaj pytania lub odpowiedzi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "2.5rem", width: "100%" }}
              />
              <span style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.1rem",
                opacity: 0.5,
              }}>
                🔍
              </span>
            </div>
          </div>
          <button onClick={toggleAll} className="btn btn-secondary">
            {allExpanded ? "🔼 Zwiń wszystkie" : "🔽 Rozwiń wszystkie"}
          </button>
        </div>
        {searchQuery && (
          <p style={{ marginTop: "var(--space-md)", fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
            Znaleziono {filteredQuestions.length} z {setData.questions.length} pytan
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="study-list">
        {filteredQuestions.map((question, index) => {
          const isExpanded = expandedIds.has(question.id);

          return (
            <div
              key={question.id}
              className={`study-card animate-fade-in-up ${isExpanded ? "expanded" : ""}`}
              style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s`, opacity: 0 }}
            >
              <div
                className="study-card-header"
                onClick={() => toggleQuestion(question.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flex: 1 }}>
                  <span className="question-item-number" style={{ width: 36, height: 36, fontSize: "0.85rem", flexShrink: 0 }}>
                    {question.externalId}
                  </span>
                  <span className="study-card-question">{question.question}</span>
                </div>
                <span className="study-card-chevron" style={{
                  transition: "transform 0.3s ease",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                  fontSize: "0.9rem",
                  color: "var(--text-tertiary)",
                  flexShrink: 0,
                }}>
                  ▼
                </span>
              </div>

              {isExpanded && (
                <div className="study-card-answer">
                  <div className="study-answer-label">Odpowiedz:</div>
                  <div className="study-answer-text">{question.answer}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && searchQuery && (
        <div className="card-static" style={{ textAlign: "center", padding: "var(--space-3xl)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>🔍</div>
          <h3>Brak wynikow</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-sm)" }}>
            Nie znaleziono pytan pasujacych do &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
