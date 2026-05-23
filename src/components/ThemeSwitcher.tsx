"use client";

import { useTheme, Theme } from "../context/ThemeContext";

const themes: {
  id: Theme;
  title: string;
  iconPath: string;
}[] = [
  {
    id: "dark",
    title: "Dark mode",
    iconPath:
      "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  },
  {
    id: "light",
    title: "Light mode",
    iconPath:
      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    id: "red",
    title: "INITIAL Red",
    iconPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl w-full"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      {themes.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.title}
            aria-label={t.title}
            className="flex-1 flex items-center justify-center py-2 rounded-lg transition-all duration-200"
            style={{
              background: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "white" : "var(--text-muted)",
              boxShadow: isActive ? "0 1px 6px var(--accent-glow)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted)";
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={t.iconPath} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}