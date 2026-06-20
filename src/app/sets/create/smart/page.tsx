"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface GeneratedQuestion {
  id: number;
  question: string;
  answer: string;
  tempId?: string; // used for frontend keys
}

function generateTempId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function SmartCreatePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Form state
  const [files, setFiles] = useState<File[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [answerLength, setAnswerLength] = useState(50);
  const [difficulty, setDifficulty] = useState("Mieszany");
  const [language, setLanguage] = useState("Auto");
  const [topic, setTopic] = useState("");
  const [avoidDuplicates, setAvoidDuplicates] = useState(false);

  // Step 2: Preview state
  const [setName, setSetName] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length > 2) {
        setError("Możesz wgrać maksymalnie 2 pliki.");
        return;
      }
      setFiles(selected);
      setError("");
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError("Proszę wgrać przynajmniej jeden plik źródłowy.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("questionCount", questionCount.toString());
      formData.append("answerLength", answerLength.toString());
      formData.append("difficulty", difficulty);
      formData.append("language", language);
      if (topic) formData.append("topic", topic);
      if (avoidDuplicates) formData.append("avoidDuplicates", "true");

      const res = await fetch("/api/sets/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Wystąpił błąd serwera.");
        setLoading(false);
        return;
      }

      if (!data.questions || data.questions.length === 0) {
        setError("AI nie wygenerowało żadnych pytań. Spróbuj zmienić parametry.");
        setLoading(false);
        return;
      }

      // Add tempId to each question for rendering
      const qsWithId = data.questions.map((q: any) => ({
        ...q,
        tempId: generateTempId(),
      }));

      setQuestions(qsWithId);
      
      // Auto-fill set name based on first file
      let defaultName = files[0].name.replace(/\.[^/.]+$/, "");
      setSetName(`Zestaw AI: ${defaultName}`);
      
      setStep(2);
      setLoading(false);
    } catch (err) {
      setError("Wystąpił błąd podczas połączenia. Spróbuj ponownie.");
      setLoading(false);
    }
  };

  const removeQuestion = (tempId: string) => {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  };

  const updateQuestion = (tempId: string, field: "question" | "answer", value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === tempId ? { ...q, [field]: value } : q))
    );
  };

  const handleSaveSet = async () => {
    if (!setName.trim()) {
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

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setName.trim(),
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

  if (step === 1) {
    return (
      <div className="page-container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <div style={{ marginBottom: "var(--space-md)" }}>
            <Link
              href="/sets/create"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem" }}
            >
              &larr; Wróć do wyboru
            </Link>
          </div>
          <h1>
            <span className="text-gradient">Inteligentne tworzenie</span> 🧠
          </h1>
          <p>Skonfiguruj parametry, wgraj plik i pozwól AI wygenerować pytania.</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in" style={{ marginBottom: "var(--space-lg)" }}>
            ⚠️ {error}
          </div>
        )}

        <div className="card-static animate-fade-in-up">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            
            {/* File Upload */}
            <div className="input-group">
              <label>📄 Plik źródłowy (max 2 pliki: .pdf, .md, .txt)</label>
              <input
                type="file"
                accept=".pdf,.md,.txt"
                multiple
                className="input"
                onChange={handleFileChange}
                style={{ padding: "0.5rem" }}
              />
              {files.length > 0 && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Wybrano: {files.map(f => f.name).join(", ")}
                </div>
              )}
            </div>

            {/* Range sliders row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
              <div className="input-group">
                <label>
                  🔢 Ilość pytań: <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>{questionCount}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  style={{ accentColor: "var(--accent-primary)" }}
                />
              </div>

              <div className="input-group">
                <label>
                  📏 Długość odpowiedzi: <span style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>~{answerLength} słów</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={answerLength}
                  onChange={(e) => setAnswerLength(Number(e.target.value))}
                  style={{ accentColor: "var(--accent-primary)" }}
                />
              </div>
            </div>

            {/* Selects row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
              <div className="input-group">
                <label>🎯 Poziom trudności</label>
                <select 
                  className="input" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{ backgroundColor: "var(--bg-glass)", appearance: "none" }}
                >
                  <option value="Łatwy" style={{ color: "black" }}>Łatwy</option>
                  <option value="Średni" style={{ color: "black" }}>Średni</option>
                  <option value="Trudny" style={{ color: "black" }}>Trudny</option>
                  <option value="Mieszany" style={{ color: "black" }}>Mieszany</option>
                </select>
              </div>

              <div className="input-group">
                <label>🗣️ Język generowanych pytań</label>
                <select 
                  className="input" 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{ backgroundColor: "var(--bg-glass)", appearance: "none" }}
                >
                  <option value="Auto" style={{ color: "black" }}>Auto-wykryj z pliku</option>
                  <option value="Polski" style={{ color: "black" }}>Polski</option>
                  <option value="Angielski" style={{ color: "black" }}>Angielski</option>
                </select>
              </div>
            </div>

            {/* Topic */}
            <div className="input-group">
              <label>📚 Zakres tematyczny (opcjonalnie)</label>
              <input
                type="text"
                className="input"
                placeholder='np. "skup się tylko na rozdziale 3"'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Avoid Duplicates */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <input 
                type="checkbox" 
                id="avoid-duplicates"
                checked={avoidDuplicates}
                onChange={(e) => setAvoidDuplicates(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
              />
              <label htmlFor="avoid-duplicates" style={{ cursor: "pointer", color: "var(--text-secondary)", fontWeight: 500 }}>
                🔁 Unikaj duplikatów i staraj się urozmaicać pytania
              </label>
            </div>

            <button
              onClick={handleGenerate}
              className="btn btn-primary btn-lg btn-full"
              disabled={loading || files.length === 0}
              style={{ marginTop: "var(--space-sm)" }}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Generowanie przez AI... to może chwilę potrwać
                </>
              ) : (
                "✨ Wygeneruj pytania"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: PREVIEW
  return (
    <div className="page-container" style={{ maxWidth: 850 }}>
      <div className="page-header">
        <div style={{ marginBottom: "var(--space-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setStep(1)}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem" }}
          >
            &larr; Wróć do konfiguracji
          </button>
        </div>
        <h1>
          <span className="text-gradient">Podgląd zestawu AI</span> 👁️
        </h1>
        <p>Przejrzyj, edytuj lub usuń wygenerowane pytania, a następnie zapisz zestaw.</p>
      </div>

      <div className="card-static animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="input-group">
          <label htmlFor="set-name">Nazwa zestawu</label>
          <input
            id="set-name"
            type="text"
            className="input"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="np. Sieci Komputerowe - AI"
          />
        </div>
      </div>

      {error && (
        <div className="auth-error animate-fade-in" style={{ marginBottom: "var(--space-lg)" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="manual-create-list">
        {questions.map((q, index) => (
          <div key={q.tempId} className="manual-create-card animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s`, opacity: 0 }}>
            <div className="manual-create-card-header">
              <div className="manual-create-card-number">
                <span>{index + 1}</span>
              </div>
              <div className="manual-create-card-actions">
                <button
                  onClick={() => removeQuestion(q.tempId!)}
                  className="manual-create-action-btn manual-create-action-btn-danger"
                  title="Usuń pytanie"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="manual-create-card-body">
              <div className="input-group">
                <label>Pytanie</label>
                <input
                  type="text"
                  className="input"
                  value={q.question}
                  onChange={(e) => updateQuestion(q.tempId!, "question", e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Odpowiedź</label>
                <textarea
                  className="textarea"
                  value={q.answer}
                  onChange={(e) => updateQuestion(q.tempId!, "answer", e.target.value)}
                  style={{ minHeight: "100px" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="manual-create-bottom animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0, marginTop: "var(--space-xl)" }}>
        <button
          onClick={handleSaveSet}
          className="btn btn-primary btn-lg btn-full"
          disabled={loading || questions.length === 0}
        >
          {loading ? (
            <>
              <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              Zapisywanie...
            </>
          ) : (
            `✅ Zapisz zestaw (${questions.length} pytań)`
          )}
        </button>
      </div>
    </div>
  );
}
