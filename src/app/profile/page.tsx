"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setNickname(data.name || "");
        setEmail(data.email || "");
        setCreatedAt(data.createdAt || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          name: nickname.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setNickname(data.name || "");
        setSaveResult({
          type: "success",
          message: "Profil został zaktualizowany!",
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

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie profilu...</p>
      </div>
    );
  }

  const displayName =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : nickname || email.split("@")[0];

  const initials = firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : (nickname || email).charAt(0).toUpperCase();

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header animate-fade-in-up" style={{ opacity: 0 }}>
        <h1>
          <span className="text-gradient">👤 Mój profil</span>
        </h1>
        <p>Zarządzaj swoimi danymi osobowymi</p>
      </div>

      {/* Profile Card */}
      <div
        className="profile-hero card-static animate-fade-in-up"
        style={{ opacity: 0, animationDelay: "0.1s", marginBottom: "var(--space-xl)" }}
      >
        <div className="profile-hero-inner">
          <div className="profile-avatar-large">{initials}</div>
          <div className="profile-hero-info">
            <h2>{displayName}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              {email}
            </p>
            <div className="profile-joined">
              📅 Dołączono:{" "}
              {new Date(createdAt).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div
        className="card-static animate-fade-in-up"
        style={{ opacity: 0, animationDelay: "0.2s", marginBottom: "var(--space-xl)" }}
      >
        <div className="settings-section-header">
          <div className="settings-section-icon">✏️</div>
          <div>
            <h3>Edycja danych</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
              Uzupełnij swoje dane osobowe
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-lg)" }}>
            <div className="input-group">
              <label htmlFor="profile-firstname">Imię</label>
              <input
                id="profile-firstname"
                type="text"
                className="input"
                placeholder="np. Jan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="input-group">
              <label htmlFor="profile-lastname">Nazwisko</label>
              <input
                id="profile-lastname"
                type="text"
                className="input"
                placeholder="np. Kowalski"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="profile-nickname">Nickname (pseudonim)</label>
            <input
              id="profile-nickname"
              type="text"
              className="input"
              placeholder="np. janko123"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              Wyświetlany na dashboardzie i w nawigacji
            </span>
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              Adres email nie może być zmieniony
            </span>
          </div>
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
            "💾 Zapisz profil"
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
