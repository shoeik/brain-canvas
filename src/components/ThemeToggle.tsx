import { useAppStore } from "../store/useAppStore";

export default function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  return (
    <button className="bc-btn" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
