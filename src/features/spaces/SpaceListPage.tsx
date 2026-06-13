import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { downloadJson, exportToJson, parseImportedJson } from "../../lib/storage";
import { parseOpmlToSpace } from "../../lib/opml";
import ThemeToggle from "../../components/ThemeToggle";

const EXAMPLES = ["AI時代の情報収集", "個人開発", "人生設計", "UIアイデア"];

export default function SpaceListPage() {
  const navigate = useNavigate();
  const spaces = useAppStore((s) => s.spaces);
  const theme = useAppStore((s) => s.theme);
  const createSpace = useAppStore((s) => s.createSpace);
  const deleteSpace = useAppStore((s) => s.deleteSpace);
  const importSpace = useAppStore((s) => s.importSpace);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const [name, setName] = useState("");
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const jsonFileInput = useRef<HTMLInputElement>(null);
  const opmlFileInput = useRef<HTMLInputElement>(null);

  const create = (value: string) => {
    const space = createSpace(value);
    navigate(`/space/${space.id}`);
  };

  const onCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create(name);
  };

  const onExport = () => {
    const json = exportToJson({ version: 1, theme, spaces });
    downloadJson(`brain-canvas-${new Date().toISOString().slice(0, 10)}.json`, json);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const state = parseImportedJson(await file.text());
      replaceAll(state);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  };

  const onImportOpmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const space = importSpace(parseOpmlToSpace(await file.text(), file.name));
      navigate(`/space/${space.id}`);
    } catch (err) {
      alert(`OPML Import failed: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
      setImportMenuOpen(false);
    }
  };

  return (
    <div className="space-list">
      <div className="space-list__header">
        <div className="space-list__title">Brain Canvas</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bc-btn" onClick={onExport}>
            Export
          </button>
          <div className="import-menu">
            <button className="bc-btn" onClick={() => setImportMenuOpen((open) => !open)}>
              Import
            </button>
            {importMenuOpen && (
              <div className="import-menu__panel">
                <button
                  className="import-menu__item"
                  onClick={() => {
                    setImportMenuOpen(false);
                    jsonFileInput.current?.click();
                  }}
                >
                  JSON Import
                </button>
                <button
                  className="import-menu__item"
                  onClick={() => {
                    setImportMenuOpen(false);
                    opmlFileInput.current?.click();
                  }}
                >
                  OPML Import
                </button>
              </div>
            )}
          </div>
          <input ref={jsonFileInput} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          <input ref={opmlFileInput} type="file" accept=".opml,.xml,text/xml,application/xml" hidden onChange={onImportOpmlFile} />
          <ThemeToggle />
        </div>
      </div>
      <p className="space-list__subtitle">
        脳内の連想を外部化する場所。Space を作って、考え始めましょう。
      </p>

      <form className="space-list__create" onSubmit={onCreateSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新しい Space の名前…"
          aria-label="New space name"
        />
        <button className="bc-btn bc-btn--primary" type="submit">
          作成
        </button>
      </form>

      {spaces.length === 0 ? (
        <div className="space-list__empty">
          <p>まだ Space がありません。</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="bc-btn" onClick={() => create(ex)}>
                + {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-grid">
          {spaces.map((sp) => (
            <button
              key={sp.id}
              className="space-card"
              onClick={() => navigate(`/space/${sp.id}`)}
            >
              <span className="space-card__name">{sp.name}</span>
              <span className="space-card__meta">
                {sp.nodes.length} nodes · {new Date(sp.updatedAt).toLocaleDateString()}
              </span>
              <span
                className="space-card__delete"
                role="button"
                aria-label="Delete space"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`「${sp.name}」を削除しますか？`)) deleteSpace(sp.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
