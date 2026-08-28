"use client";

import { useTheme, Theme } from "../context/ThemeContext";

const themes: {
  id: Theme;
  label: string;
  iconPath: string;
}[] = [
  {
    id: "light",
    label: "Light",
    iconPath:
      "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    id: "dark",
    label: "Dark",
    iconPath:
      "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="grid grid-cols-2 gap-1 p-1 rounded"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      {themes.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-label={t.label}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[12px]"
            style={{
              background: isActive ? "var(--bg-surface)" : "transparent",
              border: `1px solid ${isActive ? "var(--border-bright)" : "transparent"}`,
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={t.iconPath} />
            </svg>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
