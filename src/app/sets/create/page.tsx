"use client";

import Link from "next/link";

export default function CreateSetChooserPage() {
  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
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
          <span className="text-gradient">Kreacja zestawu</span> ➕
        </h1>
        <p>Wybierz w jaki sposób chcesz utworzyć swój nowy zestaw pytań.</p>
      </div>

      <div style={{ marginTop: "var(--space-xl)", maxWidth: "600px", margin: "var(--space-xl) auto 0" }}>
        <div className="study-mode-grid" style={{ gridTemplateColumns: "1fr" }}>
          
          {/* Upload JSON */}
          <Link 
            href="/sets/upload" 
            className="study-mode-option card-static animate-fade-in-up" 
            style={{ opacity: 0, animationDelay: "0.1s", height: "100%", textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div className="study-mode-icon">📤</div>
            <h3>Wgraj zestaw</h3>
            <p>
              Masz gotowy plik JSON z pytaniami wyeksportowany wcześniej? Wgraj go tutaj, aby błyskawicznie dodać zestaw.
            </p>
          </Link>

          {/* Manual */}
          <Link 
            href="/sets/create/manual" 
            className="study-mode-option card-static animate-fade-in-up" 
            style={{ opacity: 0, animationDelay: "0.2s", height: "100%", textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div className="study-mode-icon">✍️</div>
            <h3>Utwórz zestaw ręcznie</h3>
            <p>
              Dodawaj pytania jedno po drugim. Samodzielnie wpisuj treści oraz poprawne odpowiedzi do każdego punktu.
            </p>
            <span className="badge badge-info">Klasyczny</span>
          </Link>

          {/* Smart Creation */}
          <Link 
            href="/sets/create/smart" 
            className="study-mode-option card-static animate-fade-in-up" 
            style={{ opacity: 0, animationDelay: "0.3s", height: "100%", textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div className="study-mode-icon">🧠</div>
            <h3>Inteligentne tworzenie zestawów</h3>
            <p>
              Wgraj notatki (PDF, TXT, MD) i pozwól sztucznej inteligencji wygenerować pytania i odpowiedzi za Ciebie.
            </p>
            <span className="badge badge-success">Nowość</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
