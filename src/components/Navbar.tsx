"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (!session) return null;

  const initial = session.user?.email?.charAt(0).toUpperCase() || "U";
  const displayName = session.user?.name || session.user?.email || "";

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/sets/upload", label: "Wgraj zestaw", icon: "📤" },
    { href: "/sets/create", label: "Utwórz zestaw", icon: "✏️" },
    { href: "/explore", label: "Przeglądaj", icon: "🌍" },
    { href: "/history", label: "Historia", icon: "📋" },
    { href: "/settings", label: "Ustawienia", icon: "⚙️" },
  ];

  return (
    <>
      <nav className="navbar">
        <Link href="/dashboard" className="navbar-logo">
          <span className="logo-icon">🧠</span>
          <span className="text-gradient">Recallio</span>
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`navbar-link ${pathname === l.href ? "active" : ""}`}
            >
              {l.icon} {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="navbar-user">
          <ThemeToggle />
          <Link href="/profile" className="navbar-profile-link" title="Edytuj profil">
            <span className="navbar-username">
              {displayName}
            </span>
            <div className="navbar-avatar">{initial}</div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-secondary navbar-signout-btn"
          >
            Wyloguj
          </button>
        </div>

        {/* Mobile right side */}
        <div className="navbar-mobile-right">
          <ThemeToggle />
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={menuOpen}
          >
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`mobile-menu ${menuOpen ? "mobile-menu-open" : ""}`}>
        {/* User info */}
        <div className="mobile-menu-user">
          <div className="mobile-menu-avatar">{initial}</div>
          <div className="mobile-menu-user-info">
            <span className="mobile-menu-user-name">{displayName}</span>
            <Link
              href="/profile"
              className="mobile-menu-profile-link"
              onClick={() => setMenuOpen(false)}
            >
              Edytuj profil →
            </Link>
          </div>
        </div>

        {/* Nav links */}
        <nav className="mobile-menu-nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`mobile-menu-link ${pathname === l.href ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
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
      </div>
    </>
  );
}
