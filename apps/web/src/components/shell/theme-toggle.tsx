"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ssm:theme";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

const applyTheme = (theme: Theme) => {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (window.localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((window.localStorage.getItem(STORAGE_KEY) as Theme | null) === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const cycle = () => {
    const currentIndex = options.findIndex((option) => option.value === theme);
    const nextTheme = options[(currentIndex + 1) % options.length].value;
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const current = options.find((option) => option.value === theme) ?? options[2];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${current.label}`}
      aria-label={`Switch theme (currently ${current.label.toLowerCase()})`}
      className="grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--foreground)]"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
