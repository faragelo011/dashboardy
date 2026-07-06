"use client";

import { Moon, Sun } from "lucide-react";

import { DsIcon } from "@/components/ds/icon";
import { IconButton } from "@/components/ds/icon-button";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconButton
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <DsIcon icon={Sun} /> : <DsIcon icon={Moon} />}
    </IconButton>
  );
}
