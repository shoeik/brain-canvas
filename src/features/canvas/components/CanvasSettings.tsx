import type { NodeStyle } from "../../../types";
import { useCanvasStore } from "../../../store/useCanvasStore";

const OPTIONS: { value: NodeStyle; label: string }[] = [
  { value: "dark", label: "Dark Node" },
  { value: "light", label: "Light Node" },
  { value: "plain", label: "Plain Node" },
];

/** Per-space node appearance selector. */
export default function CanvasSettings() {
  const nodeStyle = useCanvasStore((s) => s.settings.nodeStyle);
  const setSettings = useCanvasStore((s) => s.setSettings);
  return (
    <div className="toolbar-group">
      <select
        value={nodeStyle}
        aria-label="Node style"
        onChange={(e) => setSettings({ nodeStyle: e.target.value as NodeStyle })}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
