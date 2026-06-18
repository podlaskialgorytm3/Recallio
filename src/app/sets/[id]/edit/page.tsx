"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

interface EditQuestion {
  id?: string; // existing questions have an id from the database
  tempId: string; // client-side identifier
  question: string;
  answer: string;
  externalId?: number;
  isNew?: boolean;
  isModified?: boolean;
}

function generateTempId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function EditSetPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const setId = params.id as string;

  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [questions, setQuestions] = useState<EditQuestion[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<EditQuestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const questionRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const fetchSet = useCallback(async () => {
    try {
      const res = await fetch(`/api/sets/${setId}`);
      if (!res.ok) {
        setError("Nie udało się załadować zestawu.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!data.isOwner) {
        setError("Nie masz uprawnień do edycji tego zestawu.");
        setLoading(false);
        return;
      }

      setName(data.name);
      setOriginalName(data.name);

      const loadedQuestions: EditQuestion[] = data.questions.map(
        (q: { id: string; question: string; answer: string; externalId: number }) => ({
          id: q.id,
          tempId: generateTempId(),
          question: q.question,
          answer: q.answer,
          externalId: q.externalId,
          isNew: false,
          isModified: false,
        })
      );

      setQuestions(loadedQuestions);
      setOriginalQuestions(
        loadedQuestions.map((q) => ({ ...q }))
      );
    } catch {
      setError("Wystąpił błąd podczas ładowania zestawu.");
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSet();
    }
  }, [status, router, fetchSet]);

  const addQuestion = () => {
    if (questions.length >= 200) {
      setError("Maksymalna liczba pytań to 200.");
      return;
    }
    const newQ: EditQuestion = {
      tempId: generateTempId(),
      question: "",
      answer: "",
      isNew: true,
      isModified: false,
    };
    setQuestions((prev) => [...prev, newQ]);
    setError("");

    setTimeout(() => {
      const el = questionRefs.current.get(newQ.tempId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 100);
  };

  const removeQuestion = (tempId: string) => {
    if (questions.length <= 1) {
      setError("Zestaw musi zawierać przynajmniej jedno pytanie.");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
    setError("");
  };

  const updateQuestion = (
    tempId: string,
    field: "question" | "answer",
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const updated = { ...q, [field]: value };
        // Mark as modified if it's an existing question and content changed
        if (q.id) {
          const original = originalQuestions.find((oq) => oq.id === q.id);
          if (original) {
            updated.isModified =
              updated.question !== original.question ||
              updated.answer !== original.answer;
          }
        }
        return updated;
      })
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccessMsg("");

    if (!name.trim()) {
      setError("Podaj nazwę zestawu.");
      return;
    }

    const validQuestions = questions.filter(
      (q) => q.question.trim() && q.answer.trim()
    );

    if (validQuestions.length === 0) {
      setError("Dodaj przynajmniej jedno pytanie z odpowiedzią.");
      return;
    }

    const partiallyFilled = questions.filter(
      (q) =>
        (q.question.trim() && !q.answer.trim()) ||
        (!q.question.trim() && q.answer.trim())
    );

    if (partiallyFilled.length > 0) {
      setError(
        `${partiallyFilled.length} pytanie/pytań ma niekompletne dane. Uzupełnij lub usuń je.`
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          questions: validQuestions.map((q, index) => ({
            ...(q.id ? { id: q.id } : {}),
            question: q.question.trim(),
            answer: q.answer.trim(),
            externalId: index + 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Błąd podczas zapisywania zmian.");
        setSaving(false);
        return;
      }

      setSuccessMsg("Zmiany zostały zapisane!");
      // Update originals so "modified" indicators reset
      setOriginalName(name.trim());
      setOriginalQuestions(
        questions
          .filter((q) => q.question.trim() && q.answer.trim())
          .map((q) => ({ ...q, isModified: false, isNew: false }))
      );
      setQuestions((prev) =>
        prev.map((q) => ({ ...q, isModified: false, isNew: false }))
      );

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Wystąpił błąd serwera.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    tempId: string,
    field: "question" | "answer"
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (field === "question") {
        const answerEl = document.getElementById(`edit-answer-${tempId}`);
        answerEl?.focus();
      } else if (field === "answer") {
        const lastQ = questions[questions.length - 1];
        if (lastQ.tempId === tempId) {
          addQuestion();
        } else {
          const currentIndex = questions.findIndex((q) => q.tempId === tempId);
          if (currentIndex < questions.length - 1) {
            const nextEl = questionRefs.current.get(
              questions[currentIndex + 1].tempId
            );
            nextEl?.focus();
          }
        }
      }
    }
  };

  const filledCount = questions.filter(
    (q) => q.question.trim() && q.answer.trim()
  ).length;

  const hasChanges =
    name !== originalName ||
    questions.length !== originalQuestions.length ||
    questions.some((q) => q.isNew || q.isModified);

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie zestawu...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: 850 }}>
        <div className="card-static">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>{error}</h3>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn btn-primary btn-lg"
              style={{ marginTop: "var(--space-lg)" }}
            >
              Wróć do dashboardu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 850 }}>
      <div className="page-header">
        <h1>
          <span className="text-gradient">Edytuj zestaw</span>
        </h1>
        <p>Modyfikuj pytania, dodawaj nowe lub usuwaj zbędne.</p>
      </div>

      {/* Set Name */}
      <div
        className="card-static animate-fade-in-up"
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div className="input-group">
          <label htmlFor="edit-set-name">Nazwa zestawu</label>
          <input
            id="edit-set-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa zestawu pytań"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="manual-create-toolbar animate-fade-in-up"
        style={{ animationDelay: "0.05s", opacity: 0 }}
      >
        <div className="manual-create-counter">
          <span className="manual-create-counter-number">{filledCount}</span>
          <span className="manual-create-counter-label">
            {filledCount === 1
              ? "pytanie"
              : filledCount >= 2 && filledCount <= 4
              ? "pytania"
              : "pytań"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          {hasChanges && (
            <span className="badge badge-warning animate-fade-in">
              Niezapisane zmiany
            </span>
          )}
          <button
            onClick={addQuestion}
            className="btn btn-primary"
            disabled={questions.length >= 200}
          >
            ➕ Dodaj pytanie
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="auth-error animate-fade-in"
          style={{ marginBottom: "var(--space-lg)" }}
        >
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div
          className="edit-success-msg animate-fade-in"
          style={{ marginBottom: "var(--space-lg)" }}
        >
          ✅ {successMsg}
        </div>
      )}

      {/* Question Cards */}
      <div className="manual-create-list">
        {questions.map((q, index) => (
          <div
            key={q.tempId}
            className={`manual-create-card ${q.isNew ? "manual-create-card-new" : ""} ${q.isModified ? "manual-create-card-modified" : ""}`}
          >
            <div className="manual-create-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <div className="manual-create-card-number">
                  <span>{index + 1}</span>
                </div>
                {q.isNew && (
                  <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                    NOWE
                  </span>
                )}
                {q.isModified && !q.isNew && (
                  <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                    ZMIENIONE
                  </span>
                )}
              </div>
              <div className="manual-create-card-actions">
                <button
                  onClick={() => moveQuestion(index, "up")}
                  className="manual-create-action-btn"
                  disabled={index === 0}
                  title="Przesuń w górę"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveQuestion(index, "down")}
                  className="manual-create-action-btn"
                  disabled={index === questions.length - 1}
                  title="Przesuń w dół"
                >
                  ▼
                </button>
                <button
                  onClick={() => removeQuestion(q.tempId)}
                  className="manual-create-action-btn manual-create-action-btn-danger"
                  title="Usuń pytanie"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="manual-create-card-body">
              <div className="input-group">
                <label htmlFor={`edit-question-${q.tempId}`}>Pytanie</label>
                <input
                  id={`edit-question-${q.tempId}`}
                  ref={(el) => {
                    if (el) questionRefs.current.set(q.tempId, el);
                  }}
                  type="text"
                  className="input"
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(q.tempId, "question", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, q.tempId, "question")}
                  placeholder="Wpisz pytanie..."
                />
              </div>
              <div className="input-group">
                <label htmlFor={`edit-answer-${q.tempId}`}>Odpowiedź</label>
                <textarea
                  id={`edit-answer-${q.tempId}`}
                  className="textarea"
                  value={q.answer}
                  onChange={(e) =>
                    updateQuestion(q.tempId, "answer", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, q.tempId, "answer")}
                  placeholder="Wpisz odpowiedź..."
                  style={{ minHeight: "80px" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div
        className="manual-create-bottom"
      >
        <button
          onClick={addQuestion}
          className="btn btn-secondary btn-lg btn-full"
          disabled={questions.length >= 200}
          style={{ marginBottom: "var(--space-md)" }}
        >
          ➕ Dodaj kolejne pytanie
        </button>

        <button
          onClick={handleSubmit}
          className="btn btn-primary btn-lg btn-full"
          disabled={saving || filledCount === 0 || !hasChanges}
        >
          {saving ? (
            <>
              <span
                className="loading-spinner"
                style={{ width: 20, height: 20, borderWidth: 2 }}
              />
              Zapisywanie...
            </>
          ) : (
            `💾 Zapisz zmiany (${filledCount} pytań)`
          )}
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="btn btn-secondary btn-lg btn-full"
          style={{ marginTop: "var(--space-sm)" }}
        >
          ← Wróć do dashboardu
        </button>
      </div>
    </div>
  );
}
