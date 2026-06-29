"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("nav");
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <Button variant="icon" size="icon" onClick={toggleTheme} aria-label={t("theme")}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
