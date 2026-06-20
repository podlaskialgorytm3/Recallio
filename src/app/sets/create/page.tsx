"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface ManualQuestion {
  tempId: string;
  question: string;
  answer: string;
}

function generateTempId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function CreateSetPage() {
  const { status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { tempId: generateTempId(), question: "", answer: "" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const questionRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const addQuestion = () => {
    if (questions.length >= 200) {
      setError("Maksymalna liczba pytań to 200.");
      return;
    }
    const newQ: ManualQuestion = {
      tempId: generateTempId(),
      question: "",
      answer: "",
    };
    setQuestions((prev) => [...prev, newQ]);
    setError("");

    // Focus the new question input after render
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
      prev.map((q) => (q.tempId === tempId ? { ...q, [field]: value } : q))
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

    // Check for partially filled questions
    const partiallyFilled = questions.filter(
      (q) =>
        (q.question.trim() && !q.answer.trim()) ||
        (!q.question.trim() && q.answer.trim())
    );

    if (partiallyFilled.length > 0) {
      setError(
        `${partiallyFilled.length} pytanie/pytań ma niekompletne dane (brak pytania lub odpowiedzi). Uzupełnij lub usuń je.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          questions: validQuestions.map((q, index) => ({
            id: index + 1,
            question: q.question.trim(),
            answer: q.answer.trim(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Błąd podczas zapisywania zestawu.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Wystąpił błąd serwera.");
      setLoading(false);
    }
  };

  const filledCount = questions.filter(
    (q) => q.question.trim() && q.answer.trim()
  ).length;

  const handleKeyDown = (
    e: React.KeyboardEvent,
    tempId: string,
    field: "question" | "answer"
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (field === "question") {
        // Move focus to the answer field of the same question
        const answerEl = document.getElementById(`answer-${tempId}`);
        answerEl?.focus();
      } else if (field === "answer") {
        // If it's the last question, add a new one
        const lastQ = questions[questions.length - 1];
        if (lastQ.tempId === tempId) {
          addQuestion();
        } else {
          // Move to the next question's question field
          const currentIndex = questions.findIndex(
            (q) => q.tempId === tempId
          );
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

  return (
    <div className="page-container" style={{ maxWidth: 850 }}>
      <div className="page-header">
        <h1>
          <span className="text-gradient">Utwórz zestaw ręcznie</span>
        </h1>
        <p>Dodawaj pytania i odpowiedzi jedno po drugim.</p>
      </div>

      {/* Set Name */}
      <div
        className="card-static animate-fade-in-up"
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div className="input-group">
          <label htmlFor="set-name">Nazwa zestawu</label>
          <input
            id="set-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Biologia - Rozdział 3"
          />
        </div>
      </div>

      {/* Questions Counter */}
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
                : "pytań"}{" "}
            gotowych
          </span>
        </div>
        <button
          onClick={addQuestion}
          className="btn btn-primary"
          disabled={questions.length >= 200}
        >
          ➕ Dodaj pytanie
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="auth-error animate-fade-in"
          style={{ marginBottom: "var(--space-lg)" }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Question Cards */}
      <div className="manual-create-list">
        {questions.map((q, index) => (
          <div
            key={q.tempId}
            className="manual-create-card animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, opacity: 0 }}
          >
            <div className="manual-create-card-header">
              <div className="manual-create-card-number">
                <span>{index + 1}</span>
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
                <label htmlFor={`question-${q.tempId}`}>Pytanie</label>
                <input
                  id={`question-${q.tempId}`}
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
                <label htmlFor={`answer-${q.tempId}`}>Odpowiedź</label>
                <textarea
                  id={`answer-${q.tempId}`}
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

            {/* Completion indicator */}
            {q.question.trim() && q.answer.trim() && (
              <div className="manual-create-card-complete">
                ✅ Kompletne
              </div>
            )}
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Add more + Submit */}
      <div
        className="manual-create-bottom animate-fade-in-up"
        style={{ animationDelay: "0.1s", opacity: 0 }}
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
          disabled={loading || filledCount === 0}
        >
          {loading ? (
            <>
              <span
                className="loading-spinner"
                style={{ width: 20, height: 20, borderWidth: 2 }}
              />
              Zapisywanie...
            </>
          ) : (
            `✅ Zapisz zestaw (${filledCount} pytań)`
          )}
        </button>
      </div>
    </div>
  );
}
