# Brain Canvas

> 脳内の連想を外部化するための、個人用思考ツール（v0.1 MVP）

単なるマインドマップではなく、Freeform / MindNode / TheBrain / Obsidian Canvas の
中間のような「ノードで考える体験」を検証するための土台です。AI・RSS・認証・同期・
共有は **意図的に未実装**。すべてブラウザ内で完結し、GitHub Pages 等の静的ホスティングで動作します。

## 技術構成

| 領域 | 採用 |
| --- | --- |
| ビルド | Vite 5 |
| UI | React 18 + TypeScript |
| キャンバス | React Flow (`@xyflow/react` v12) |
| 状態管理 | Zustand + zundo（Undo/Redo） |
| ルーティング | React Router (HashRouter) |
| 保存 | localStorage（自動保存） |

## セットアップ

```bash
npm install
npm run dev      # 開発サーバ
npm run build    # 型チェック + 本番ビルド (dist/)
npm run preview  # ビルド成果物のプレビュー
```

---

## ディレクトリ構成

```
src/
├─ main.tsx                 # エントリ。React Flow の CSS もここで読み込む
├─ App.tsx                  # ルーティング + テーマ → CSS 変数の反映
├─ index.css               # チャ―ム/ノードのスタイル + CSS 変数
├─ types/
│  └─ index.ts             # 型定義の集約（ノード/スペース/永続化）
├─ theme/
│  └─ theme.ts             # 配色・ノードスタイル・各種デフォルト値
├─ lib/                     # 純粋ロジック（UI 非依存・テスト容易）
│  ├─ id.ts                # ID 生成
│  ├─ content.ts           # content からの種別推定（URL/YouTube/画像）
│  ├─ mindmap.ts           # エッジから親子関係/子孫/折りたたみを導出
│  └─ storage.ts           # localStorage 読み書き + Export/Import + migrate
├─ store/
│  ├─ useAppStore.ts       # 永続的な真実（テーマ + 全 Space）。自動保存
│  └─ useCanvasStore.ts    # 編集中スペースの作業コピー。Undo/Redo はここに限定
├─ hooks/
│  ├─ useCanvasShortcuts.ts# Tab/Enter/Shift+Tab/Delete/Undo/Copy などのキーバインド
│  └─ useCanvasPaste.ts    # 画像/URL/テキスト/ノードの貼り付け処理
├─ components/
│  └─ ThemeToggle.tsx
└─ features/
   ├─ spaces/
   │  └─ SpaceListPage.tsx # Space 一覧・作成・削除・Export/Import
   └─ canvas/
      ├─ CanvasPage.tsx     # Space ロード + 自動保存の橋渡し + チャ―ム
      ├─ BrainCanvas.tsx    # React Flow 本体。操作をストア操作へ変換
      ├─ nodes/
      │  ├─ BrainNode.tsx   # 唯一のノード種。編集/リサイズ/折りたたみ
      │  ├─ NodeContent.tsx # content の描画（text/link/youtube/image）
      │  └─ index.ts        # nodeTypes 登録
      └─ components/
         ├─ Toolbar.tsx       # Undo/Redo/Fit/フォントサイズ
         ├─ SearchBox.tsx     # ノード検索 → フォーカス
         └─ CanvasSettings.tsx# ノードスタイル切替
```

## 状態管理方針

**2 ストア構成**で「永続化の真実」と「編集中の作業コピー」を分離しています。

1. **`useAppStore`（永続レイヤー）** — テーマと全 Space（ノード/エッジ含む）を保持。
   変更のたびに `localStorage` へ自動保存。Space の作成/削除/リネームを担当。
2. **`useCanvasStore`（作業レイヤー）** — アクティブな Space の `nodes`/`edges`/`settings`
   を保持。ノード操作はすべてここで起き、**Undo/Redo（zundo `temporal`）はこのストアに限定**
   されるため、Space 切り替えをまたいで undo が暴発しません。

データの流れは一方向です：

```
キャンバス編集 → useCanvasStore（履歴付き） → CanvasPage の subscribe → useAppStore.commitCanvas → localStorage
```

zundo は `partialize` で `nodes`/`edges` のみを履歴対象にし、`equality` でグラフが
変化しない set（編集モード切替など）を履歴から除外、`handleSet` の debounce(350ms) で
ドラッグや連続入力を 1 履歴にまとめています。

> Redux ではなく Zustand を選んだ理由：React Flow 公式が推奨する最小構成で、ストアを
> React 外（イベントハンドラ）からも `getState()` で触れるためキーバインド実装が素直になります。

## データ構造

ノードは **1 種類のみ**。「種類」を持たず、`content` から描画形態を推定します（型なし設計）。

```ts
// React Flow ノードの data 部分
interface BrainNodeData {
  content: string;       // 本文 / URL / YouTube URL / 画像 data URL
  width: number;
  height: number;
  fontSize: number;
  collapsed?: boolean;   // 折りたたみ状態
  meta?: LinkMeta;       // 将来の Bookmark 拡張用（title/description/image）— MVP では未使用
}

// 親子関係はノードに持たせず「エッジ」から導出する（freeform 接続とツリーを統一）
interface Space {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: BrainNode[];    // React Flow Node<BrainNodeData>
  edges: Edge[];
  settings: { nodeStyle: "dark" | "light" | "plain" };
}

interface PersistedState {
  version: number;       // スキーマ移行用
  theme: "dark" | "light";
  spaces: Space[];
}
```

**設計判断**: 親子（マインドマップ階層）は `parentId` を持たず、エッジ `source → target` から
導出します（`lib/mindmap.ts`）。これにより自由な接続と階層が 1 つのグラフに統一され、
Tab（子）/ Enter（兄弟）/ Shift+Tab（親変更）/ 折りたたみがすべてエッジ操作で完結します。

## 操作方法

| 操作 | 動作 |
| --- | --- |
| 空白をダブルクリック/ダブルタップ | その位置にノード生成 → 即編集 |
| ノードをダブルクリック | 編集モード（Esc で確定） |
| ドラッグ | 移動。左ドラッグの空白部分は範囲選択（囲んで複数選択） |
| 二本指スクロール / ホイール | パン（Ctrl/⌘+ホイールでカーソル中心ズーム） |
| 中/右ドラッグ | パン |
| ハンドルをドラッグ | ノード同士を接続（どのハンドルも source/target） |
| Tab | 選択ノードの子を生成 |
| Enter | 兄弟を生成 |
| Shift+Tab | 親を変更（祖父母へ繋ぎ替え） |
| Delete / Backspace | 削除 |
| ⌘C / ⌘V | コピー / ペースト |
| Option(または⌘)+ドラッグ | 複製 |
| ⌘Z / ⌘⇧Z | 取り消し / やり直し |
| ノード右上の [+]/[−] | 子の折りたたみ/展開 |
| 画像/URL を貼り付け | 画像ノード / リンクノードを生成（YouTube はサムネイル表示） |

---

## 今後の拡張ポイント

設計上、以下を**スキーマ変更なし**で追加できます。

- **AI 要約 / 関連ノード提案 / 思考整理**: `lib/` に純粋関数として AI 呼び出し層を足し、
  結果を `BrainNodeData.meta` や新規ノード生成（`addNode` / `onConnect`）に流すだけ。
  ストアの操作は既に揃っています。
- **RSS 取り込み**: 取り込み元を `addNode(position, url)` に渡せばリンクノード化。
  種別推定（`content.ts`）が URL を自動でリンク表示にします。
- **Bookmark メタ（title/description/og:image）**: `LinkMeta` を埋める enrichment ステップを
  追加し、`NodeContent` の link/youtube 分岐で `meta` があればリッチ表示に切替。
- **Backlinks / Related Highlight**: 親子導出（`mindmap.ts`）と同じ要領でエッジを走査する
  セレクタを追加するだけ。グラフは既に双方向に辿れます。
- **思考履歴**: zundo の `temporal` 履歴を可視化 UI に接続。

## MVP で削った機能（意図的に未実装）

- AI 機能全般（要約・提案・整理）
- RSS 取り込み
- 認証 / 同期 / 共有（完全にローカル・単一ブラウザ）
- URL のメタ情報取得（title/description/og:image）— サーバ不要の静的前提のため
- YouTube のタイトル/概要取得・埋め込み再生（サムネイルのみ）
- ノードの「種類」分け（あえて 1 種類に統一）

## 改善候補

- 画像を data URL で localStorage に保存しているため**容量制限（数 MB）に当たりやすい**。
  → IndexedDB（Blob 保存）への移行が次の一手。
- リサイズ/ドラッグ中の `commitCanvas` 書き込み頻度の最適化（保存の debounce）。
- 折りたたみ計算 `computeHidden` の差分化（巨大グラフ向け）。
- モバイルのダブルタップ判定・ピンチズームの作り込み。
- Undo の粒度調整（選択変更を履歴から完全に除外）。
- ノードの z-index / 整列（グリッドスナップ）など Freeform 的な仕上げ。

---

## GitHub Pages へのデプロイ手順

このリポジトリ名は `brain-canvas` を想定し、`vite.config.ts` の `base` を `/brain-canvas/`
に設定済みです（公開 URL: `https://<user>.github.io/brain-canvas/`）。

**自動デプロイ（推奨・設定済み）**

1. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を
   **GitHub Actions** に設定する。
2. `main` ブランチに push する。`.github/workflows/deploy.yml` がビルドして Pages へ公開します。

**手動デプロイ（任意）**

```bash
npm i -D gh-pages   # 同梱済み
npm run deploy      # dist を gh-pages ブランチへ公開
```

> リポジトリ名を変える場合は `vite.config.ts` の `base`（または環境変数 `VITE_BASE`）を
> `/<repo-name>/` に合わせてください。ユーザーサイト（`<user>.github.io`）として公開する
> 場合は `base` を `/` にします。

## GitHub Pages 運用時の制約

- **サーバ処理なし**：og:image 取得・OAuth・API プロキシ等は不可（静的配信のみ）。
- **ルーティングは HashRouter**：`#/space/...` 形式。Pages にはリライト機構が無いため、
  深いリンクの再読込で 404 にならないようハッシュルーティングを採用しています。
- **保存はブラウザ単位**：localStorage はオリジン+ブラウザに紐づくため、端末間で共有されません。
  バックアップ/移行は JSON Export/Import を使用。
- **localStorage 容量**：画像を data URL で抱えると上限（おおむね 5–10MB）に注意。
- `public/.nojekyll` を同梱し、Jekyll による処理を無効化しています。

## 今後 Vercel へ移行する場合の変更点

ほぼそのまま動きますが、よりクリーンにするなら：

1. **`base` を `/` に**：Vercel はルート配信のため `vite.config.ts` の `base` を `"/"` に。
   （環境変数 `VITE_BASE=/` を渡すだけでも可）
2. **HashRouter → BrowserRouter**（任意）：Vercel は SPA リライトに対応するため、
   `App.tsx` を `BrowserRouter` に変えてきれいな URL にできます（`vercel.json` で
   全ルートを `index.html` に rewrite）。
3. **CI 不要**：`.github/workflows/deploy.yml` は削除し、Vercel の Git 連携に任せる。
   ビルドコマンド `npm run build` / 出力ディレクトリ `dist` を指定。
4. **将来のサーバ機能**：og:image 取得などは Vercel の Serverless/Edge Functions
   （`api/` ディレクトリ）で実装可能になります（GitHub Pages では不可だった部分）。
