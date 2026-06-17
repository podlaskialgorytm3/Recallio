"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface PublicSet {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  _count: { questions: number };
  user: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sets, setSets] = useState<PublicSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingSession, setStartingSession] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchPublicSets();
    }
  }, [status, router]);

  const fetchPublicSets = async () => {
    try {
      const res = await fetch("/api/sets/public");
      if (res.ok) {
        const data = await res.json();
        setSets(data);
      }
    } catch (error) {
      console.error("Error fetching public sets:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) return sets;
    const query = searchQuery.toLowerCase();
    return sets.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        getAuthorName(s.user).toLowerCase().includes(query)
    );
  }, [sets, searchQuery]);

  const handleStartSession = async (setId: string) => {
    setStartingSession(setId);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: setId }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/session/${data.id}/config`);
      }
    } catch (error) {
      console.error("Error creating session:", error);
    } finally {
      setStartingSession(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie publicznych zestawów...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up" style={{ opacity: 0 }}>
        <h1>
          <span className="text-gradient">🌍 Przeglądaj zestawy</span>
        </h1>
        <p>Odkrywaj publiczne zestawy pytań udostępnione przez społeczność</p>
      </div>

      {/* Search */}
      <div
        className="card-static animate-fade-in-up"
        style={{ opacity: 0, animationDelay: "0.1s", marginBottom: "var(--space-xl)" }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="input"
            placeholder="Szukaj po nazwie zestawu lub autorze..."
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
        {searchQuery && (
          <p
            style={{
              marginTop: "var(--space-md)",
              fontSize: "0.85rem",
              color: "var(--text-tertiary)",
            }}
          >
            Znaleziono {filteredSets.length} z {sets.length} zestawów
          </p>
        )}
      </div>

      {/* Sets Grid */}
      {filteredSets.length === 0 ? (
        <div className="card-static">
          <div className="empty-state">
            <div className="empty-state-icon">
              {searchQuery ? "🔍" : "📭"}
            </div>
            <h3>
              {searchQuery
                ? "Brak wyników"
                : "Brak publicznych zestawów"}
            </h3>
            <p>
              {searchQuery
                ? `Nie znaleziono zestawów pasujących do "${searchQuery}"`
                : "Nikt jeszcze nie udostępnił swoich zestawów. Bądź pierwszy!"}
            </p>
            {!searchQuery && (
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                Udostępnij swój zestaw
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="session-grid">
          {filteredSets.map((set, index) => {
            const authorName = getAuthorName(set.user);
            const isOwn = set.userId === session?.user?.id;

            return (
              <div
                key={set.id}
                className="card animate-fade-in-up"
                style={{
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  <h3 style={{ flex: 1, marginRight: "var(--space-sm)" }}>
                    {set.name}
                  </h3>
                  {isOwn && (
                    <span className="badge badge-info">Twój zestaw</span>
                  )}
                </div>

                <div className="explore-author">
                  <div className="explore-author-avatar">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <span>{authorName}</span>
                </div>

                <div className="session-card-meta">
                  <span>📝 {set._count.questions} pytań</span>
                  <span className="dot" />
                  <span>
                    📅{" "}
                    {new Date(set.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "var(--space-lg)",
                    display: "flex",
                    gap: "var(--space-sm)",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/study/${set.id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    📖 Tryb nauki
                  </Link>
                  <button
                    onClick={() => handleStartSession(set.id)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={startingSession === set.id}
                  >
                    {startingSession === set.id ? (
                      <>
                        <span
                          className="loading-spinner"
                          style={{ width: 16, height: 16, borderWidth: 2 }}
                        />
                        ...
                      </>
                    ) : (
                      "🚀 Rozpocznij sesję"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getAuthorName(user: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.name) return user.name;
  return user.email.split("@")[0];
}
