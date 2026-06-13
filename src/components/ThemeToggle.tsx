"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={theme === "dark" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={theme === "dark" ? "Jasny motyw" : "Ciemny motyw"}
    >
      <div className={`theme-toggle-track ${theme}`}>
        <span className="theme-toggle-icon theme-toggle-sun">☀️</span>
        <span className="theme-toggle-icon theme-toggle-moon">🌙</span>
        <div className="theme-toggle-thumb" />
      </div>
    </button>
  );
}
