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
  globalKeyCost: number;
  ownKeyCost: number;
  hasOwnKey: boolean;
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

  // User Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

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

  const handleDeleteSet = async (setId: string, setName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć zestaw "${setName}"? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Nie udało się usunąć zestawu.");
      }

      setSets(prev => prev.filter(s => s.id !== setId));
    } catch (err: any) {
      alert(err.message || "Wystąpił błąd podczas usuwania.");
    }
  };

  const handleEditUserClick = (user: AdminUser) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.name || "");
    setEditError("");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail, name: editName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nie udało się zaktualizować użytkownika.");
      }

      const updatedUser = await res.json();
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, email: updatedUser.email, name: updatedUser.name } : u));
      setEditingUser(null);
    } catch (err: any) {
      setEditError(err.message || "Wystąpił błąd.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Czy na pewno chcesz trwale usunąć użytkownika "${userEmail}" oraz wszystkie jego zestawy pytań i historię nauki?\nTa operacja jest NIEODWRACALNA.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nie udało się usunąć użytkownika.");
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || "Wystąpił błąd podczas usuwania.");
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
        {activeTab === "users" && (() => {
          const totalGlobalCost = users.reduce((sum, u) => sum + (u.globalKeyCost || 0), 0);
          return (
            <>
              <div className="stats-row animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.15s", marginBottom: "var(--space-lg)" }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "var(--accent-primary)" }}>
                    ${totalGlobalCost.toFixed(4)}
                  </div>
                  <div className="stat-label">Całkowity koszt klucza aplikacji (API)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{users.length}</div>
                  <div className="stat-label">Wszyscy użytkownicy</div>
                </div>
              </div>

              <div className="card-static">
                <h3>Lista Użytkowników</h3>
                <div className="table-responsive" style={{ marginTop: "1rem" }}>
                  <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "0.5rem" }}>Email</th>
                        <th style={{ padding: "0.5rem" }}>Imię</th>
                        <th style={{ padding: "0.5rem" }}>Rola</th>
                        <th style={{ padding: "0.5rem" }}>Koszty AI</th>
                        <th style={{ padding: "0.5rem" }}>Zestawy</th>
                        <th style={{ padding: "0.5rem" }}>Sesje</th>
                        <th style={{ padding: "0.5rem" }}>Akcje</th>
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
                          <td style={{ padding: "0.5rem" }}>
                            {u.hasOwnKey ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>Własny klucz</span>
                                <div style={{ background: "rgba(16, 185, 129, 0.2)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.85rem", color: "var(--success)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                  ${(u.ownKeyCost || 0).toFixed(4)}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Klucz Globalny</span>
                                <div style={{ background: "var(--bg-glass-hover)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.85rem", color: "var(--accent-primary)", border: "1px solid var(--border)" }}>
                                  ${(u.globalKeyCost || 0).toFixed(4)}
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.5rem" }}>{u._count.questionSets}</td>
                          <td style={{ padding: "0.5rem" }}>{u._count.sessions}</td>
                          <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                            <button 
                              onClick={() => handleEditUserClick(u)}
                              className="btn btn-secondary" 
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                            >
                              Edytuj
                            </button>
                            {/* Protect admin from deleting themselves via UI */}
                            {session?.user?.id !== u.id && (
                              <button 
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="btn btn-danger" 
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                              >
                                Usuń
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>Brak użytkowników.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}

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
                      <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                        <Link href={`/sets/${s.id}`} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                          Podgląd
                        </Link>
                        <button 
                          onClick={() => handleDeleteSet(s.id, s.name)}
                          className="btn btn-danger" 
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                        >
                          Usuń
                        </button>
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

      {/* User Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
          backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", justifyContent: "center", 
          alignItems: "center", zIndex: 1000
        }}>
          <div className="card-static animate-scale-in" style={{ width: "90%", maxWidth: "450px", padding: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Edytuj użytkownika</h3>
            
            {editError && (
              <div className="auth-error" style={{ marginBottom: "1rem" }}>
                {editError}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label>Email</label>
              <input 
                type="text" 
                className="input" 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
              />
            </div>

            <div className="input-group" style={{ marginBottom: "1.5rem" }}>
              <label>Imię / Pseudonim</label>
              <input 
                type="text" 
                className="input" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setEditingUser(null)} 
                className="btn btn-secondary" 
                disabled={editLoading}
              >
                Anuluj
              </button>
              <button 
                onClick={handleSaveUser} 
                className="btn btn-primary" 
                disabled={editLoading}
              >
                {editLoading ? "Zapisywanie..." : "Zapisz zmiany"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
