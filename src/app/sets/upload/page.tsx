"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface QuestionPreview {
  id: number;
  question: string;
  answer: string;
}

export default function UploadPage() {
  const { status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<QuestionPreview[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const validateJSON = (content: string): QuestionPreview[] | null => {
    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        setError("Plik JSON musi zawierać tablicę pytań.");
        return null;
      }
      if (data.length === 0) {
        setError("Plik JSON jest pusty.");
        return null;
      }
      if (data.length > 200) {
        setError("Maksymalna liczba pytań to 200.");
        return null;
      }
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item.id && item.id !== 0) {
          setError(`Wiersz ${i + 1}: brak pola "id".`);
          return null;
        }
        if (!item.question) {
          setError(`Wiersz ${i + 1} (id: ${item.id}): brak pola "question".`);
          return null;
        }
        if (!item.answer) {
          setError(`Wiersz ${i + 1} (id: ${item.id}): brak pola "answer".`);
          return null;
        }
      }
      return data;
    } catch {
      setError("Nieprawidłowy format JSON. Sprawdź składnię pliku.");
      return null;
    }
  };

  const handleFile = async (selectedFile: File) => {
    setError("");
    setPreview([]);

    if (!selectedFile.name.endsWith(".json")) {
      setError("Proszę wybrać plik .json");
      return;
    }

    const content = await selectedFile.text();
    const questions = validateJSON(content);

    if (questions) {
      setFile(selectedFile);
      setPreview(questions);
      if (!name) {
        setName(selectedFile.name.replace(".json", ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleSubmit = async () => {
    if (!file || !preview.length) return;
    setLoading(true);
    setError("");

    try {
      const content = await file.text();
      const res = await fetch("/api/sets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || file.name.replace(".json", ""),
          questions: JSON.parse(content),
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

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>
          <span className="text-gradient">Wgraj zestaw pytań</span>
        </h1>
        <p>Wybierz plik JSON z pytaniami i odpowiedziami do nauki.</p>
      </div>

      <div className="card-static" style={{ marginBottom: "var(--space-xl)" }}>
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-zone-icon">📁</div>
          <p className="upload-zone-text">
            Przeciągnij plik JSON tutaj lub <strong>kliknij, aby wybrać</strong>
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "var(--space-sm)" }}>
            Maksymalnie 200 pytań. Format: {"[{id, question, answer}]"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="auth-error animate-fade-in" style={{ marginBottom: "var(--space-lg)" }}>
          ⚠️ {error}
        </div>
      )}

      {preview.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="card-static" style={{ marginBottom: "var(--space-lg)" }}>
            <div className="input-group">
              <label htmlFor="set-name">Nazwa zestawu</label>
              <input
                id="set-name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nazwa zestawu pytań"
              />
            </div>
          </div>

          <div className="card-static" style={{ marginBottom: "var(--space-lg)" }}>
            <h3 style={{ marginBottom: "var(--space-lg)" }}>
              Podgląd pytań ({preview.length})
            </h3>
            <div className="question-list">
              {preview.slice(0, 10).map((q, i) => (
                <div key={q.id} className="question-item animate-fade-in-up" style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                  <div className="question-item-left">
                    <span className="question-item-number">{q.id}</span>
                    <span className="question-item-text">{q.question}</span>
                  </div>
                </div>
              ))}
              {preview.length > 10 && (
                <p style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-md)" }}>
                  ... i {preview.length - 10} więcej pytań
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Zapisywanie...
              </>
            ) : (
              `✅ Zapisz zestaw (${preview.length} pytań)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
