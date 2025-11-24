"use client";

import { useTheme } from "next-themes";

type ColorScheme = "light" | "dark";

export function useColorScheme(): { colorScheme: ColorScheme } {
  const { resolvedTheme } = useTheme();
  const scheme: ColorScheme = resolvedTheme === "dark" ? "dark" : "light";
  return { colorScheme: scheme };
}


