import { useState, useEffect, useCallback } from "react"

type Theme = "light" | "dark" | "system"

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  document.documentElement.classList.remove("light", "dark")
  document.documentElement.classList.add(resolved)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("tome-theme") as Theme | null
    return stored || "system"
  })

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("tome-theme", t)
    applyTheme(t)
  }, [])

  useEffect(() => {
    applyTheme(theme)

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = () => applyTheme("system")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme

  return { theme, setTheme, resolvedTheme }
}
