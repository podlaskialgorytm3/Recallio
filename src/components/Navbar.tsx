"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { useState, useEffect, useCallback } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Close with animation
  const closeMenu = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setClosing(false);
    }, 300);
  }, []);

  // Close on route change
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (!session) return null;

  const initial = session.user?.email?.charAt(0).toUpperCase() || "U";
  const displayName = session.user?.name || session.user?.email || "";

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/sets/create", label: "Kreacja zestawu", icon: "➕" },
    { href: "/explore", label: "Przeglądaj", icon: "🌍" },
    { href: "/history", label: "Historia", icon: "📋" },
    { href: "/pricing", label: "Cennik / Plany", icon: "💳" },
    { href: "/settings", label: "Ustawienia", icon: "⚙️" },
  ];

  if ((session.user as any).role === "ADMIN") {
    links.push({ href: "/admin", label: "Admin", icon: "🛡️" });
  }

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <Link href="/dashboard" className="navbar-logo">
          <img src="/icon-192x192.png" alt="Recallio Logo" style={{ width: 28, height: 28, borderRadius: "6px", marginRight: "8px", boxShadow: "0 2px 8px rgba(139, 92, 246, 0.4)" }} />
          <span className="text-gradient">Recallio</span>
        </Link>

        {/* ── DESKTOP: nav links ── */}
        <div className="navbar-links">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`navbar-link ${pathname === l.href ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* ── DESKTOP: right side ── */}
        <div className="navbar-user">
          <ThemeToggle />
          <Link href="/profile" className="navbar-profile-link" title="Edytuj profil">
            <span className="navbar-username">{displayName}</span>
            <div className="navbar-avatar">{initial}</div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-secondary navbar-signout-btn"
          >
            Wyloguj
          </button>
        </div>

        {/* ── MOBILE: hamburger ── */}
        <div className="navbar-mobile-right">
          <ThemeToggle />
          <button
            className="navbar-hamburger"
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={menuOpen}
          >
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER — only in DOM when open ── */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <div
            className={`mobile-menu-overlay${closing ? " closing" : ""}`}
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside className={`mobile-menu${closing ? " closing" : ""}`} aria-label="Menu nawigacyjne">
            {/* User block */}
            <div className="mobile-menu-user">
              <div className="mobile-menu-avatar">{initial}</div>
              <div className="mobile-menu-user-info">
                <span className="mobile-menu-user-name">{displayName}</span>
                <Link href="/profile" className="mobile-menu-profile-link" onClick={closeMenu}>
                  Edytuj profil →
                </Link>
              </div>
            </div>

            {/* Links */}
            <nav className="mobile-menu-nav">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`mobile-menu-link ${pathname === l.href ? "active" : ""}`}
                  onClick={closeMenu}
                >
                  <span className="mobile-menu-link-icon">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Sign out */}
            <div className="mobile-menu-footer">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn btn-danger btn-full"
              >
                🚪 Wyloguj się
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
