"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";

/* ================================================================
   TYPES
   ================================================================ */

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

/* ================================================================
   TILT HOOK — lightweight 3D perspective follow on mouse
   ================================================================ */

function useTilt(maxDeg = 5) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * maxDeg * 2;
      const rotateY = (x - 0.5) * maxDeg * 2;
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.01)`;
    },
    [maxDeg]
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  }, []);

  return { ref, handleMove, handleLeave };
}

/* ================================================================
   EXPLORE CARD SUB-COMPONENT
   ================================================================ */

function ExploreCard({
  set,
  index,
  isOwn,
  authorName,
  startingSession,
  onStartSession,
}: {
  set: PublicSet;
  index: number;
  isOwn: boolean;
  authorName: string;
  startingSession: string | null;
  onStartSession: (id: string) => void;
}) {
  const { ref, handleMove, handleLeave } = useTilt(4);

  return (
    <div
      ref={ref}
      className="explore-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="explore-card-glow" />
      <div className="explore-card-inner">
        {/* Header */}
        <div className="explore-card-header">
          <h3 className="explore-card-title">{set.name}</h3>
          {isOwn && (
            <span className="explore-own-badge">
              <span className="explore-own-badge-shimmer" />
              Twój zestaw
            </span>
          )}
        </div>

        {/* Author */}
        <div className="explore-author-row">
          <div className="explore-avatar">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <span className="explore-author-name">{authorName}</span>
        </div>

        {/* Meta */}
        <div className="explore-card-meta">
          <div className="explore-meta-item">
            <span className="explore-meta-icon">📝</span>
            <span>{set._count.questions} pytań</span>
          </div>
          <div className="explore-meta-divider" />
          <div className="explore-meta-item">
            <span className="explore-meta-icon">📅</span>
            <span>
              {new Date(set.createdAt).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="explore-card-actions">
          <Link
            href={`/study/${set.id}`}
            className="explore-action-btn explore-action-secondary"
          >
            <span className="explore-action-icon">📖</span>
            <span className="explore-action-label">Tryb nauki</span>
          </Link>
          <button
            onClick={() => onStartSession(set.id)}
            className="explore-action-btn explore-action-primary"
            disabled={startingSession === set.id}
          >
            {startingSession === set.id ? (
              <>
                <span
                  className="loading-spinner"
                  style={{ width: 16, height: 16, borderWidth: 2 }}
                />
                <span className="explore-action-label">...</span>
              </>
            ) : (
              <>
                <span className="explore-action-icon explore-action-icon-rocket">
                  🚀
                </span>
                <span className="explore-action-label">Rozpocznij sesję</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sets, setSets] = useState<PublicSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

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
    <div className="explore-page">
      {/* Animated background blobs */}
      <div className="explore-bg" aria-hidden="true">
        <div className="explore-blob explore-blob-1" />
        <div className="explore-blob explore-blob-2" />
        <div className="explore-blob explore-blob-3" />
      </div>

      <div className="page-container" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="explore-header">
          <div className="explore-header-dot" />
          <h1 className="explore-heading">
            <span className="text-gradient">Przeglądaj zestawy</span>
          </h1>
          <p className="explore-subtitle">
            Odkrywaj publiczne zestawy pytań udostępnione przez społeczność
          </p>
        </div>

        {/* Search */}
        <div className={`explore-search ${searchFocused ? "explore-search-focused" : ""}`}>
          <div className="explore-search-inner">
            <span className={`explore-search-icon ${searchFocused || searchQuery ? "explore-search-icon-active" : ""}`}>
              🔍
            </span>
            <input
              type="text"
              className="explore-search-input"
              placeholder="Szukaj po nazwie zestawu lub autorze..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                className="explore-search-clear"
                onClick={() => setSearchQuery("")}
                title="Wyczyść"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="explore-search-count">
              Znaleziono <strong>{filteredSets.length}</strong> z{" "}
              <strong>{sets.length}</strong> zestawów
            </p>
          )}
        </div>

        {/* Grid */}
        {filteredSets.length === 0 ? (
          <div className="card-static">
            <div className="empty-state">
              <div className="empty-state-icon">
                {searchQuery ? "🔍" : "📭"}
              </div>
              <h3>
                {searchQuery ? "Brak wyników" : "Brak publicznych zestawów"}
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
          <div className="explore-grid">
            {filteredSets.map((set, index) => {
              const authorName = getAuthorName(set.user);
              const isOwn = set.userId === session?.user?.id;

              return (
                <ExploreCard
                  key={set.id}
                  set={set}
                  index={index}
                  isOwn={isOwn}
                  authorName={authorName}
                  startingSession={startingSession}
                  onStartSession={handleStartSession}
                />
              );
            })}
          </div>
        )}
      </div>
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
