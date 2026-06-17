"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const GEMINI_MODELS = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Szybki i ekonomiczny – idealny do codziennej nauki",
    badge: "Zalecany",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Najdokładniejszy – lepsze oceny złożonych odpowiedzi",
    badge: "Premium",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Stabilna poprzednia generacja – sprawdzony i niezawodny",
    badge: null,
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Najszybszy i najtańszy – dla dużych zestawów pytań",
    badge: "Ekonomiczny",
  },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saveResult, setSaveResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSettings();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setHasExistingKey(data.hasApiKey);
        setMaskedKey(data.maskedApiKey);
        setSelectedModel(data.geminiModel || "gemini-2.5-flash");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    setTestResult(null);

    try {
      const body: { geminiApiKey?: string; geminiModel: string } = {
        geminiModel: selectedModel,
      };

      // Only send API key if user entered a new one
      if (apiKey.trim()) {
        body.geminiApiKey = apiKey.trim();
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setHasExistingKey(data.hasApiKey);
        setMaskedKey(data.maskedApiKey);
        setApiKey("");
        setSaveResult({
          type: "success",
          message: "Ustawienia zostały zapisane pomyślnie!",
        });
      } else {
        const error = await res.json();
        setSaveResult({
          type: "error",
          message: error.error || "Wystąpił błąd podczas zapisywania.",
        });
      }
    } catch {
      setSaveResult({
        type: "error",
        message: "Błąd połączenia z serwerem.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm("Czy na pewno chcesz usunąć swój klucz API?")) return;

    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: "", geminiModel: selectedModel }),
      });

      if (res.ok) {
        setHasExistingKey(false);
        setMaskedKey(null);
        setApiKey("");
        setSaveResult({
          type: "success",
          message: "Klucz API został usunięty. System użyje klucza globalnego.",
        });
      }
    } catch {
      setSaveResult({
        type: "error",
        message: "Błąd podczas usuwania klucza.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !hasExistingKey) {
      setTestResult({
        type: "error",
        message: "Wprowadź klucz API, aby go przetestować.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simple test: try to initialize and make a basic call
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const testAI = new GoogleGenerativeAI(keyToTest);
      const testModel = testAI.getGenerativeModel({ model: selectedModel });
      const result = await testModel.generateContent("Powiedz 'OK' jednym słowem.");
      const text = result.response.text();

      if (text) {
        setTestResult({
          type: "success",
          message: `Połączenie działa! Model "${selectedModel}" odpowiedział poprawnie.`,
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Nieznany błąd";
      setTestResult({
        type: "error",
        message: `Błąd połączenia: ${message.includes("API_KEY") ? "Nieprawidłowy klucz API" : message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie ustawień...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up" style={{ opacity: 0 }}>
        <h1>
          <span className="text-gradient">⚙️ Ustawienia</span>
        </h1>
        <p>Skonfiguruj swój klucz API i model Gemini do oceniania odpowiedzi.</p>
      </div>

      {/* API Key Section */}
      <div
        className="settings-section card-static animate-fade-in-up"
        style={{ opacity: 0, animationDelay: "0.1s", marginBottom: "var(--space-xl)" }}
      >
        <div className="settings-section-header">
          <div className="settings-section-icon">🔑</div>
          <div>
            <h3>Klucz API Gemini</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
              Wprowadź swój własny klucz API z{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-primary)", textDecoration: "underline" }}
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </div>

        {hasExistingKey && maskedKey && (
          <div className="settings-current-key">
            <div className="settings-key-badge">
              <span className="settings-key-dot" />
              Aktywny klucz
            </div>
            <code className="settings-key-value">{maskedKey}</code>
            <button
              onClick={handleClearKey}
              className="btn btn-danger"
              style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
              disabled={saving}
            >
              Usuń klucz
            </button>
          </div>
        )}

        <div className="input-group" style={{ marginTop: "var(--space-lg)" }}>
          <label htmlFor="api-key-input">
            {hasExistingKey ? "Nowy klucz API (opcjonalnie)" : "Klucz API"}
          </label>
          <div className="settings-api-input-wrapper">
            <input
              id="api-key-input"
              type={showApiKey ? "text" : "password"}
              className="input"
              placeholder={hasExistingKey ? "Wpisz nowy klucz, aby zmienić..." : "AIzaSy..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ paddingRight: "3rem" }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="settings-eye-btn"
              title={showApiKey ? "Ukryj klucz" : "Pokaż klucz"}
            >
              {showApiKey ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {apiKey.trim() && (
          <button
            onClick={handleTestKey}
            className="btn btn-secondary"
            disabled={testing}
            style={{ marginTop: "var(--space-md)" }}
          >
            {testing ? (
              <>
                <span
                  className="loading-spinner"
                  style={{ width: 16, height: 16, borderWidth: 2 }}
                />
                Testowanie...
              </>
            ) : (
              "🧪 Testuj połączenie"
            )}
          </button>
        )}

        {testResult && (
          <div
            className={`settings-result ${testResult.type === "success" ? "settings-result-success" : "settings-result-error"}`}
            style={{ marginTop: "var(--space-md)" }}
          >
            {testResult.type === "success" ? "✅" : "❌"} {testResult.message}
          </div>
        )}

        {!hasExistingKey && (
          <div className="settings-info" style={{ marginTop: "var(--space-lg)" }}>
            <span className="settings-info-icon">ℹ️</span>
            <span>
              Bez własnego klucza API system używa klucza globalnego. Ustaw własny klucz, aby mieć pełną kontrolę nad limitem i kosztami.
            </span>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div
        className="settings-section card-static animate-fade-in-up"
        style={{ opacity: 0, animationDelay: "0.2s", marginBottom: "var(--space-xl)" }}
      >
        <div className="settings-section-header">
          <div className="settings-section-icon">🤖</div>
          <div>
            <h3>Model Gemini</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
              Wybierz model AI do oceniania Twoich odpowiedzi
            </p>
          </div>
        </div>

        <div className="settings-models-grid">
          {GEMINI_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`settings-model-card ${selectedModel === model.id ? "selected" : ""}`}
            >
              <div className="settings-model-header">
                <div className="settings-model-radio">
                  <div
                    className={`settings-model-radio-dot ${selectedModel === model.id ? "active" : ""}`}
                  />
                </div>
                <span className="settings-model-name">{model.name}</span>
                {model.badge && (
                  <span
                    className={`badge ${
                      model.badge === "Zalecany"
                        ? "badge-success"
                        : model.badge === "Premium"
                          ? "badge-info"
                          : "badge-warning"
                    }`}
                  >
                    {model.badge}
                  </span>
                )}
              </div>
              <p className="settings-model-desc">{model.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div
        className="animate-fade-in-up"
        style={{
          opacity: 0,
          animationDelay: "0.3s",
          display: "flex",
          gap: "var(--space-md)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleSave}
          className="btn btn-primary btn-lg"
          disabled={saving}
        >
          {saving ? (
            <>
              <span
                className="loading-spinner"
                style={{ width: 18, height: 18, borderWidth: 2 }}
              />
              Zapisywanie...
            </>
          ) : (
            "💾 Zapisz ustawienia"
          )}
        </button>

        {saveResult && (
          <div
            className={`settings-result ${saveResult.type === "success" ? "settings-result-success" : "settings-result-error"}`}
          >
            {saveResult.type === "success" ? "✅" : "❌"} {saveResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
