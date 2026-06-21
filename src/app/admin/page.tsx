"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminPlan {
  id: string;
  name: string;
  description: string | null;
  checkLimit: number;
  generateLimit: number;
  price: number;
  resetType: string;
  resetPeriodDays: number | null;
  validDays: number | null;
  isActive: boolean;
  _count: {
    users: number;
    purchases: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  globalKeyCost: number;
  ownKeyCost: number;
  hasOwnKey: boolean;
  userSubscription?: {
    planId: string | null;
    checkedRemaining: number;
    generatedRemaining: number;
    plan?: { name: string };
  };
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

  const [activeTab, setActiveTab] = useState<"users" | "sets" | "plans">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sets, setSets] = useState<AdminSet[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // User Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "", description: "", checkLimit: 0, generateLimit: 0, price: 0,
    resetType: "ONETIME", resetPeriodDays: 30, validDays: 365, isActive: true
  });
  const [planFormLoading, setPlanFormLoading] = useState(false);
  const [planFormError, setPlanFormError] = useState("");

  // Limits Modal State
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [limitsUser, setLimitsUser] = useState<AdminUser | null>(null);
  const [limitsAction, setLimitsAction] = useState<"ADD_LIMITS" | "ASSIGN_PLAN">("ADD_LIMITS");
  const [limitsAddChecked, setLimitsAddChecked] = useState(0);
  const [limitsAddGenerated, setLimitsAddGenerated] = useState(0);
  const [limitsPlanId, setLimitsPlanId] = useState("");
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState("");

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
      const [usersRes, setsRes, plansRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/sets"),
        fetch("/api/admin/plans")
      ]);

      if (!usersRes.ok || !setsRes.ok || !plansRes.ok) {
        throw new Error("Błąd autoryzacji lub pobierania danych");
      }

      const usersData = await usersRes.json();
      const setsData = await setsRes.json();
      const plansData = await plansRes.json();

      setUsers(usersData);
      setSets(setsData);
      setPlans(plansData);
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

  const handleOpenPlanModal = (plan?: AdminPlan) => {
    setPlanFormError("");
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name, description: plan.description || "",
        checkLimit: plan.checkLimit, generateLimit: plan.generateLimit,
        price: plan.price, resetType: plan.resetType,
        resetPeriodDays: plan.resetPeriodDays || 30, validDays: plan.validDays || 365, isActive: plan.isActive
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: "", description: "", checkLimit: 100, generateLimit: 100, price: 9.99,
        resetType: "ONETIME", resetPeriodDays: 30, validDays: 365, isActive: true
      });
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    setPlanFormLoading(true);
    setPlanFormError("");

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : `/api/admin/plans`;
      const method = editingPlan ? "PATCH" : "POST";
      
      const payload: any = { ...planForm };
      if (planForm.resetType === "ONETIME") payload.resetPeriodDays = null;
      if (!planForm.validDays) payload.validDays = null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Wystąpił błąd podczas zapisywania planu.");
      }

      setIsPlanModalOpen(false);
      fetchData(); // reload plans
    } catch (err: any) {
      setPlanFormError(err.message || "Wystąpił błąd");
    } finally {
      setPlanFormLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć plan "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nie udało się usunąć planu.");
      }
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err: any) {
      alert(err.message || "Błąd podczas usuwania.");
    }
  };

  const handleOpenLimitsModal = (user: AdminUser) => {
    setLimitsUser(user);
    setLimitsAction("ADD_LIMITS");
    setLimitsAddChecked(0);
    setLimitsAddGenerated(0);
    setLimitsPlanId("");
    setLimitsError("");
    setIsLimitsModalOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!limitsUser) return;
    setLimitsLoading(true);
    setLimitsError("");

    try {
      const res = await fetch(`/api/admin/users/${limitsUser.id}/limits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: limitsAction,
          addChecked: limitsAddChecked,
          addGenerated: limitsAddGenerated,
          planId: limitsPlanId
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Wystąpił błąd");
      }

      setIsLimitsModalOpen(false);
      fetchData(); // Reload all data to refresh limits
    } catch (err: any) {
      setLimitsError(err.message || "Wystąpił błąd");
    } finally {
      setLimitsLoading(false);
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
        <button
          className={`tab-btn ${activeTab === "plans" ? "active" : ""}`}
          onClick={() => setActiveTab("plans")}
        >
          Plany ({plans.length})
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
                        <th style={{ padding: "0.5rem" }}>Portfel (L. pytań)</th>
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
                          <td style={{ padding: "0.5rem" }}>
                            {u.userSubscription ? (
                              <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                                <span>Sprawdzeń: <strong>{u.userSubscription.checkedRemaining}</strong></span>
                                <span>Generacji: <strong>{u.userSubscription.generatedRemaining}</strong></span>
                                {u.userSubscription.plan && (
                                  <span style={{ color: "var(--accent-primary)", fontSize: "0.75rem", marginTop: "2px" }}>
                                    {u.userSubscription.plan.name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Brak portfela</span>
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
                            <button 
                              onClick={() => handleOpenLimitsModal(u)}
                              className="btn btn-primary" 
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", background: "var(--accent-primary)", border: "none" }}
                            >
                              Portfel
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

        {activeTab === "plans" && (
          <div className="card-static">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Plany Subskrybcyjne i Pakiety</h3>
              <button onClick={() => handleOpenPlanModal()} className="btn btn-primary">➕ Nowy plan</button>
            </div>
            <div className="table-responsive" style={{ marginTop: "1rem" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "0.5rem" }}>Nazwa</th>
                    <th style={{ padding: "0.5rem" }}>Limity (Z / G)</th>
                    <th style={{ padding: "0.5rem" }}>Cena</th>
                    <th style={{ padding: "0.5rem" }}>Typ</th>
                    <th style={{ padding: "0.5rem" }}>Aktywni Użytk.</th>
                    <th style={{ padding: "0.5rem" }}>Status</th>
                    <th style={{ padding: "0.5rem" }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem" }}><strong>{p.name}</strong></td>
                      <td style={{ padding: "0.5rem" }}>{p.checkLimit} / {p.generateLimit}</td>
                      <td style={{ padding: "0.5rem" }}>{p.price} PLN</td>
                      <td style={{ padding: "0.5rem" }}>
                        {p.resetType === "CYCLIC" ? `Cykliczny (${p.resetPeriodDays} dni)` : "Jednorazowy"}
                      </td>
                      <td style={{ padding: "0.5rem" }}>{p._count.users}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {p.isActive ? (
                          <span className="badge badge-success">Aktywny</span>
                        ) : (
                          <span className="badge badge-warning">Wycofany</span>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleOpenPlanModal(p)} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                          Edytuj
                        </button>
                        {p._count.users === 0 && (
                          <button onClick={() => handleDeletePlan(p.id, p.name)} className="btn btn-danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                            Usuń
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>Brak utworzonych planów.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
          backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", justifyContent: "center", 
          alignItems: "center", zIndex: 1000
        }}>
          <div className="card-static animate-scale-in" style={{ width: "90%", maxWidth: "500px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "1rem" }}>{editingPlan ? "Edytuj Plan" : "Utwórz Nowy Plan"}</h3>
            
            {planFormError && (
              <div className="auth-error" style={{ marginBottom: "1rem" }}>
                {planFormError}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label>Nazwa Planu</label>
              <input type="text" className="input" value={planForm.name} onChange={(e) => setPlanForm({...planForm, name: e.target.value})} />
            </div>

            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label>Opis (Opcjonalny)</label>
              <input type="text" className="input" value={planForm.description} onChange={(e) => setPlanForm({...planForm, description: e.target.value})} />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Limit Sprawdzeń</label>
                <input type="number" className="input" value={planForm.checkLimit} onChange={(e) => setPlanForm({...planForm, checkLimit: Number(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Limit Generacji</label>
                <input type="number" className="input" value={planForm.generateLimit} onChange={(e) => setPlanForm({...planForm, generateLimit: Number(e.target.value)})} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Cena (PLN)</label>
                <input type="number" step="0.01" className="input" value={planForm.price} onChange={(e) => setPlanForm({...planForm, price: Number(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Status</label>
                <select className="input" value={planForm.isActive ? "1" : "0"} onChange={(e) => setPlanForm({...planForm, isActive: e.target.value === "1"})}>
                  <option value="1">Aktywny (Widoczny)</option>
                  <option value="0">Ukryty (Niewidoczny)</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label>Typ Planu</label>
              <select className="input" value={planForm.resetType} onChange={(e) => setPlanForm({...planForm, resetType: e.target.value})}>
                <option value="ONETIME">Jednorazowy (Brak odnowień)</option>
                <option value="CYCLIC">Cykliczny (Odnawia się automatycznie)</option>
              </select>
            </div>

            {planForm.resetType === "CYCLIC" && (
              <div className="input-group" style={{ marginBottom: "1rem" }}>
                <label>Odnawiaj co (Dni)</label>
                <input type="number" className="input" value={planForm.resetPeriodDays} onChange={(e) => setPlanForm({...planForm, resetPeriodDays: Number(e.target.value)})} />
              </div>
            )}

            {planForm.resetType === "ONETIME" && (
              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label>Ważność Pustego Pakietu (Dni - 0 = Bez limitu)</label>
                <input type="number" className="input" value={planForm.validDays} onChange={(e) => setPlanForm({...planForm, validDays: Number(e.target.value)})} />
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setIsPlanModalOpen(false)} className="btn btn-secondary" disabled={planFormLoading}>Anuluj</button>
              <button onClick={handleSavePlan} className="btn btn-primary" disabled={planFormLoading}>
                {planFormLoading ? "Zapisywanie..." : "Zapisz plan"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Limits / Wallet Modal */}
      {isLimitsModalOpen && limitsUser && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
          backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", justifyContent: "center", 
          alignItems: "center", zIndex: 1000
        }}>
          <div className="card-static animate-scale-in" style={{ width: "90%", maxWidth: "500px", padding: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Zarządzaj portfelem: {limitsUser.email}</h3>
            
            {limitsError && (
              <div className="auth-error" style={{ marginBottom: "1rem" }}>
                {limitsError}
              </div>
            )}

            <div className="dashboard-tabs" style={{ marginBottom: "1.5rem", borderBottom: "none" }}>
              <button className={`tab-btn ${limitsAction === "ADD_LIMITS" ? "active" : ""}`} onClick={() => setLimitsAction("ADD_LIMITS")}>
                Dodaj Limity
              </button>
              <button className={`tab-btn ${limitsAction === "ASSIGN_PLAN" ? "active" : ""}`} onClick={() => setLimitsAction("ASSIGN_PLAN")}>
                Przypisz Plan
              </button>
            </div>

            {limitsAction === "ADD_LIMITS" && (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Obecnie ma: {limitsUser.userSubscription?.checkedRemaining || 0} sprawdzeń i {limitsUser.userSubscription?.generatedRemaining || 0} generacji.
                </p>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Dodaj Sprawdzenia</label>
                    <input type="number" className="input" value={limitsAddChecked} onChange={(e) => setLimitsAddChecked(Number(e.target.value))} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Dodaj Generacje</label>
                    <input type="number" className="input" value={limitsAddGenerated} onChange={(e) => setLimitsAddGenerated(Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            {limitsAction === "ASSIGN_PLAN" && (
              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label>Wybierz Pakiet z listy</label>
                <select className="input" value={limitsPlanId} onChange={(e) => setLimitsPlanId(e.target.value)}>
                  <option value="">-- Wybierz plan --</option>
                  {plans.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.checkLimit}Z / {p.generateLimit}G)</option>
                  ))}
                </select>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  Przypisanie planu ręcznie nie pobiera od użytkownika opłaty, ale rejestruje się w historii transakcji jako darmowy przydział od administratora. Wartości z planu SUMUJĄ się z obecnym portfelem użytkownika.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setIsLimitsModalOpen(false)} className="btn btn-secondary" disabled={limitsLoading}>Anuluj</button>
              <button onClick={handleSaveLimits} className="btn btn-primary" disabled={limitsLoading || (limitsAction === "ASSIGN_PLAN" && !limitsPlanId)}>
                {limitsLoading ? "Zapisywanie..." : "Zatwierdź"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
