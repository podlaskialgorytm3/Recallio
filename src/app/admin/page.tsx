"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: {
    questionSets: number;
    sessions: number;
  };
}

interface AdminSet {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
  _count: {
    questions: number;
    sessions: number;
  };
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"users" | "sets">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sets, setSets] = useState<AdminSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    if (status === "authenticated") {
      // @ts-ignore - session.user.role is injected via NextAuth
      if (session?.user?.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }

      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, setsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/sets")
      ]);

      if (!usersRes.ok || !setsRes.ok) {
        throw new Error("Błąd autoryzacji lub pobierania danych");
      }

      const usersData = await usersRes.json();
      const setsData = await setsRes.json();

      setUsers(usersData);
      setSets(setsData);
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie panelu administratora...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up" style={{ opacity: 0 }}>
        <h1>
          <span className="text-gradient">🛡️ Panel Administratora</span>
        </h1>
        <p>Zarządzaj użytkownikami oraz przeglądaj utworzone przez nich zestawy.</p>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: "var(--space-md)" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.1s" }}>
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Użytkownicy ({users.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "sets" ? "active" : ""}`}
          onClick={() => setActiveTab("sets")}
        >
          Zestawy Pytań ({sets.length})
        </button>
      </div>

      <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.2s" }}>
        {activeTab === "users" && (
          <div className="card-static">
            <h3>Lista Użytkowników</h3>
            <div className="table-responsive" style={{ marginTop: "1rem" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "0.5rem" }}>Email</th>
                    <th style={{ padding: "0.5rem" }}>Imię</th>
                    <th style={{ padding: "0.5rem" }}>Rola</th>
                    <th style={{ padding: "0.5rem" }}>Utworzono</th>
                    <th style={{ padding: "0.5rem" }}>Zestawy</th>
                    <th style={{ padding: "0.5rem" }}>Sesje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem" }}>{u.email}</td>
                      <td style={{ padding: "0.5rem" }}>{u.name || "-"}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "0.5rem" }}>{u._count.questionSets}</td>
                      <td style={{ padding: "0.5rem" }}>{u._count.sessions}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "1rem" }}>Brak użytkowników.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sets" && (
          <div className="card-static">
            <h3>Lista Zestawów Pytań</h3>
            <div className="table-responsive" style={{ marginTop: "1rem" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "0.5rem" }}>Nazwa</th>
                    <th style={{ padding: "0.5rem" }}>Autor</th>
                    <th style={{ padding: "0.5rem" }}>Pytania</th>
                    <th style={{ padding: "0.5rem" }}>Widoczność</th>
                    <th style={{ padding: "0.5rem" }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {sets.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem" }}>{s.name}</td>
                      <td style={{ padding: "0.5rem" }}>{s.user.email}</td>
                      <td style={{ padding: "0.5rem" }}>{s._count.questions}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {s.isPublic ? (
                          <span className="badge badge-success">Publiczny</span>
                        ) : (
                          <span className="badge badge-info">Prywatny</span>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <Link href={`/sets/${s.id}`} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                          Podgląd
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {sets.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>Brak zestawów.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
