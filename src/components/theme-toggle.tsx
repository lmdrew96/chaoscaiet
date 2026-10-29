"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

// The theme lives on <html data-theme>, set before paint by the layout's inline
// script, so the button reads it from there rather than keeping its own copy.
const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerTheme = (): Theme => "dark";

export const ThemeToggle = (): React.ReactNode => {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  const toggle = (): void => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("caiet:theme", next);
    } catch (err) {
      console.warn("couldn't save theme choice", err);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="nav-icon cursor-pointer"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun size={24} strokeWidth={2} /> : <Moon size={24} strokeWidth={2} />}
    </button>
  );
};
