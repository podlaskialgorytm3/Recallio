"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  checkLimit: number;
  generateLimit: number;
  price: number;
  resetType: string;
  resetPeriodDays: number | null;
}

function PricingContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);

  useEffect(() => {
    // Odczytywanie błędu po anulowaniu płatności
    if (searchParams?.get("canceled") === "true") {
      alert("Proces płatności został anulowany.");
    }

    const fetchPlans = async () => {
      try {
        // You could create a specific public endpoint, but we can reuse /api/admin/plans if we change permissions or we create a public one.
        // Wait, /api/admin/plans requires ADMIN. We need to create a public endpoint for plans: /api/plans/route.ts
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [searchParams]);

  const handleBuy = async (planId: string) => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setBuyLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Wystąpił błąd");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url; // Przekierowanie do Stripe
      }
    } catch (err: any) {
      alert(err.message || "Błąd podczas generowania płatności");
      setBuyLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie cennika...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
      <div className="animate-fade-in-up" style={{ opacity: 0 }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          Wybierz <span className="text-gradient">Plan</span> dla Siebie
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 3rem auto" }}>
          Wykup pakiety pytań, aby wygenerować dedykowane materiały z dokumentów lub pozwolić naszej Sztucznej Inteligencji sprawdzać i oceniać Twoje odpowiedzi.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2rem" }}>
        {plans.map((plan, index) => (
          <div 
            key={plan.id} 
            className="card-static animate-scale-in hover-glow" 
            style={{ 
              width: "100%", maxWidth: "350px", padding: "2rem", display: "flex", flexDirection: "column",
              animationDelay: `${index * 0.1}s`, opacity: 0, animationFillMode: "forwards"
            }}
          >
            <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{plan.name}</h3>
            
            <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "1rem 0", color: "var(--accent-primary)" }}>
              {plan.price} zł
            </div>
            
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", minHeight: "3em" }}>
              {plan.description || "Brak dodatkowego opisu."}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0", textAlign: "left" }}>
              <li style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--success-color)" }}>✓</span> {plan.checkLimit} pytań do sprawdzenia
              </li>
              <li style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--success-color)" }}>✓</span> {plan.generateLimit} pytań do wygenerowania
              </li>
              <li style={{ padding: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--info-color)" }}>ℹ</span> {plan.resetType === "CYCLIC" ? `Odnawia się co ${plan.resetPeriodDays} dni` : "Pakiet Jednorazowy"}
              </li>
            </ul>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: "auto", padding: "0.8rem", width: "100%", fontSize: "1.1rem" }}
              onClick={() => handleBuy(plan.id)}
              disabled={buyLoading === plan.id}
            >
              {buyLoading === plan.id ? "Przekierowywanie..." : "Wybierz Plan"}
            </button>
          </div>
        ))}

        {plans.length === 0 && (
          <div style={{ padding: "3rem", color: "var(--text-secondary)" }}>
            Aktualnie nie ma dostępnych pakietów do zakupu. Zgłoś się do administratora.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="loading-container" style={{ minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p className="loading-text">Ładowanie cennika...</p>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
