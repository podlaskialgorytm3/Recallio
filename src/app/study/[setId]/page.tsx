"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

type StudyMode = "choose" | "list" | "reels";

export default function StudyPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const setId = params.setId as string;

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<StudyMode>("choose");

  // List mode state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  // Reels mode state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"none" | "left" | "right">("none");

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  // Keyboard + touch navigation for reels mode
  useEffect(() => {
    if (mode !== "reels" || !setData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setAnswerRevealed((prev) => !prev);
      }
    };

    // Touch swipe support for mobile
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) goNext();
        else goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mode, setData, currentIndex]);

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

  const goNext = () => {
    if (!setData || currentIndex >= setData.questions.length - 1) return;
    setSlideDirection("left");
    setAnswerRevealed(false);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSlideDirection("none");
    }, 200);
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setSlideDirection("right");
    setAnswerRevealed(false);
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
      setSlideDirection("none");
    }, 200);
  };

  if (loading || !setData) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie zestawu...</p>
      </div>
    );
  }

  // ==================== MODE CHOOSER ====================
  if (mode === "choose") {
    return (
      <div className="page-container" style={{ maxWidth: 700 }}>
        <div className="page-header" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <Link
              href="/dashboard"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem" }}
            >
              &larr; Dashboard
            </Link>
          </div>
          <h1>
            <span className="text-gradient">{setData.name}</span> 📖
          </h1>
          <p>{setData.questions.length} pytań w zestawie</p>
        </div>

        <div style={{ marginTop: "var(--space-xl)" }}>
          <h3
            style={{
              textAlign: "center",
              marginBottom: "var(--space-xl)",
              color: "var(--text-secondary)",
            }}
          >
            Wybierz tryb nauki
          </h3>

          <div className="study-mode-grid">
            <button
              className="study-mode-option card-static animate-fade-in-up"
              style={{ opacity: 0, animationDelay: "0.1s" }}
              onClick={() => setMode("reels")}
            >
              <div className="study-mode-icon">🎴</div>
              <h3>Pojedyncze pytania</h3>
              <p>
                Przeglądaj pytania jedno po drugim, jak rolki. Skup się na
                jednym pytaniu naraz.
              </p>
              <span className="badge badge-success">Zalecany</span>
            </button>

            <button
              className="study-mode-option card-static animate-fade-in-up"
              style={{ opacity: 0, animationDelay: "0.2s" }}
              onClick={() => setMode("list")}
            >
              <div className="study-mode-icon">📋</div>
              <h3>Wszystkie pytania</h3>
              <p>
                Wyświetl listę wszystkich pytań z wyszukiwarką. Rozwijaj
                odpowiedzi według potrzeb.
              </p>
              <span className="badge badge-info">Klasyczny</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== REELS MODE ====================
  if (mode === "reels") {
    const currentQ = setData.questions[currentIndex];
    const total = setData.questions.length;
    const progress = ((currentIndex + 1) / total) * 100;

    return (
      <div className={`reels-container ${isFullscreen ? "fullscreen-active" : ""}`} ref={containerRef}>
        {/* Top bar */}
        <div className="reels-top-bar">
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              onClick={() => setMode("choose")}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            >
              &larr; Powrót
            </button>
            <button
              onClick={toggleFullscreen}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
              title={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
          <span className="reels-title">{setData.name}</span>
          <span className="reels-counter">
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="reels-progress">
          <div
            className="reels-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="reels-card-wrapper">
          <div
            className={`reels-card ${
              slideDirection === "left"
                ? "reels-slide-out-up"
                : slideDirection === "right"
                  ? "reels-slide-out-down"
                  : "reels-slide-in"
            }`}
            key={currentIndex}
          >
            <div className="reels-question-number">
              Pytanie {currentQ.externalId}
            </div>

            <div className="reels-question-text">{currentQ.question}</div>

            {!answerRevealed ? (
              <button
                className="btn btn-primary btn-lg reels-reveal-btn"
                onClick={() => setAnswerRevealed(true)}
              >
                👁️ Pokaż odpowiedź
              </button>
            ) : (
              <div className="reels-answer animate-fade-in-up" style={{ opacity: 0 }}>
                <div className="reels-answer-label">Odpowiedź:</div>
                <div className="reels-answer-text">{currentQ.answer}</div>
              </div>
            )}
          </div>
        </div>

        {/* Vertical navigation - right side */}
        <div className="reels-side-nav">
          <button
            className="reels-nav-btn"
            onClick={goPrev}
            disabled={currentIndex === 0}
            title="Poprzednie (↑)"
          >
            ▲
          </button>

          <div className="reels-side-dots">
            {setData.questions.map((_, i) => (
              <button
                key={i}
                className={`reels-dot ${i === currentIndex ? "active" : ""} ${
                  i < currentIndex ? "visited" : ""
                }`}
                onClick={() => {
                  setAnswerRevealed(false);
                  setCurrentIndex(i);
                }}
                title={`Pytanie ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="reels-nav-btn"
            onClick={goNext}
            disabled={currentIndex === total - 1}
            title="Następne (↓)"
          >
            ▼
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="reels-hint">
          ↑ ↓ nawigacja &nbsp;·&nbsp; Spacja – pokaż/ukryj odpowiedź &nbsp;·&nbsp; Swipe na mobile
        </div>
      </div>
    );
  }

  // ==================== LIST MODE ====================
  return (
    <div className={`page-container ${isFullscreen ? "fullscreen-active" : ""}`} style={{ maxWidth: 900 }} ref={containerRef}>
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            marginBottom: "var(--space-sm)",
          }}
        >
          <button
            onClick={() => setMode("choose")}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem" }}
          >
            &larr; Zmień tryb
          </button>
          <button
            onClick={toggleFullscreen}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem" }}
            title={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
          >
            {isFullscreen ? "🗗 Wyjdź" : "⛶ Pełny ekran"}
          </button>
          <span className="badge badge-info">Tryb nauki – lista</span>
        </div>
        <h1>
          <span className="text-gradient">{setData.name}</span> 📖
        </h1>
        <p>{setData.questions.length} pytań w zestawie</p>
      </div>

      {/* Search & Controls */}
      <div
        className="card-static animate-fade-in-up"
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-md)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
              <span
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.1rem",
                  opacity: 0.5,
                }}
              >
                🔍
              </span>
            </div>
          </div>
          <button onClick={toggleAll} className="btn btn-secondary">
            {allExpanded ? "🔼 Zwiń wszystkie" : "🔽 Rozwiń wszystkie"}
          </button>
        </div>
        {searchQuery && (
          <p
            style={{
              marginTop: "var(--space-md)",
              fontSize: "0.85rem",
              color: "var(--text-tertiary)",
            }}
          >
            Znaleziono {filteredQuestions.length} z {setData.questions.length}{" "}
            pytań
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
              style={{
                animationDelay: `${Math.min(index * 0.03, 0.5)}s`,
                opacity: 0,
              }}
            >
              <div
                className="study-card-header"
                onClick={() => toggleQuestion(question.id)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    flex: 1,
                  }}
                >
                  <span
                    className="question-item-number"
                    style={{
                      width: 36,
                      height: 36,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {question.externalId}
                  </span>
                  <span className="study-card-question">
                    {question.question}
                  </span>
                </div>
                <span
                  className="study-card-chevron"
                  style={{
                    transition: "transform 0.3s ease",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                    fontSize: "0.9rem",
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  ▼
                </span>
              </div>

              {isExpanded && (
                <div className="study-card-answer">
                  <div className="study-answer-label">Odpowiedź:</div>
                  <div className="study-answer-text">{question.answer}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && searchQuery && (
        <div
          className="card-static"
          style={{ textAlign: "center", padding: "var(--space-3xl)" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>
            🔍
          </div>
          <h3>Brak wyników</h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "var(--space-sm)",
            }}
          >
            Nie znaleziono pytań pasujących do &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
