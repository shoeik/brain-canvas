import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { canvasTheme, edgeStroke } from "./theme/theme";
import SpaceListPage from "./features/spaces/SpaceListPage";
import CanvasPage from "./features/canvas/CanvasPage";

/**
 * HashRouter (not BrowserRouter) is deliberate: GitHub Pages has no server to
 * rewrite deep links, so hash routing keeps refreshes and shared links working
 * under a project subpath without a 404 fallback hack.
 */
export default function App() {
  const theme = useAppStore((s) => s.theme);

  // Reflect the theme on <html> so chrome/background can use CSS variables.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const colors = canvasTheme[theme];
    root.style.setProperty("--canvas-bg", colors.background);
    root.style.setProperty("--chrome-bg", colors.chrome);
    root.style.setProperty("--text-color", colors.text);
    root.style.setProperty("--edge-stroke", edgeStroke[theme]);
  }, [theme]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SpaceListPage />} />
        <Route path="/space/:spaceId" element={<CanvasPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
