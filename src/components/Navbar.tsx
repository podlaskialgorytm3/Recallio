"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const initial = session.user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <nav className="navbar">
      <Link href="/dashboard" className="navbar-logo">
        <span className="logo-icon">🧠</span>
        <span className="text-gradient">AnswearChecker</span>
      </Link>

      <div className="navbar-links">
        <Link
          href="/dashboard"
          className={`navbar-link ${pathname === "/dashboard" ? "active" : ""}`}
        >
          Dashboard
        </Link>
        <Link
          href="/sets/upload"
          className={`navbar-link ${pathname === "/sets/upload" ? "active" : ""}`}
        >
          Wgraj zestaw
        </Link>
        <Link
          href="/history"
          className={`navbar-link ${pathname === "/history" ? "active" : ""}`}
        >
          Historia
        </Link>
      </div>

      <div className="navbar-user">
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {session.user?.email}
        </span>
        <div className="navbar-avatar">{initial}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-secondary"
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
        >
          Wyloguj
        </button>
      </div>
    </nav>
  );
}
