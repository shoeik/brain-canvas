import type { BrainEdge, BrainNode, Space } from "../types";
import { createId } from "./id";
import { DEFAULT_FONT_SIZE, DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "../theme/theme";

const LEVEL_GAP_X = 260;
const SIBLING_GAP_Y = 88;

interface OutlineItem {
  content: string;
  children: OutlineItem[];
}

interface LayoutItem {
  item: OutlineItem;
  depth: number;
  y: number;
  children: LayoutItem[];
}

export function parseOpmlToSpace(text: string, fallbackName: string): Space {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid OPML/XML file.");
  }

  const body = findFirstElement(doc.documentElement, "body");
  if (!body) {
    throw new Error("Invalid OPML: missing body element.");
  }

  const roots = childOutlineElements(body).map(parseOutlineElement).filter((item) => item.content || item.children.length);
  if (!roots.length) {
    throw new Error("Invalid OPML: no outline elements found.");
  }

  const head = findFirstElement(doc.documentElement, "head");
  const title = head ? findFirstElement(head, "title")?.textContent?.trim() : undefined;
  return outlinesToSpace(roots, title || fallbackName.replace(/\.(opml|xml)$/i, "") || "Imported OPML");
}

function parseOutlineElement(el: Element): OutlineItem {
  const content = (el.getAttribute("text") ?? el.getAttribute("title") ?? "").trim();
  return {
    content,
    children: childOutlineElements(el).map(parseOutlineElement),
  };
}

function childOutlineElements(parent: Element): Element[] {
  return Array.from(parent.children).filter((child) => child.tagName.toLowerCase() === "outline");
}

function findFirstElement(parent: Element, tagName: string): Element | undefined {
  const wanted = tagName.toLowerCase();
  if (parent.tagName.toLowerCase() === wanted) return parent;
  return Array.from(parent.getElementsByTagName("*")).find((el) => el.tagName.toLowerCase() === wanted);
}

function outlinesToSpace(roots: OutlineItem[], name: string): Space {
  let nextLeafY = 0;

  const layoutTree = (item: OutlineItem, depth: number): LayoutItem => {
    const children = item.children.map((child) => layoutTree(child, depth + 1));
    const y = children.length
      ? (children[0].y + children[children.length - 1].y) / 2
      : nextLeafY++ * SIBLING_GAP_Y;
    return { item, depth, y, children };
  };

  const layouts = roots.map((root) => layoutTree(root, 0));
  const nodes: BrainNode[] = [];
  const edges: BrainEdge[] = [];

  const addLayout = (layout: LayoutItem, parentId?: string) => {
    const id = createId();
    const node: BrainNode = {
      id,
      type: "brain",
      position: { x: layout.depth * LEVEL_GAP_X, y: layout.y },
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      selected: false,
      data: {
        content: layout.item.content,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        fontSize: DEFAULT_FONT_SIZE,
      },
    };
    nodes.push(node);

    if (parentId) {
      edges.push({ id: createId("e"), source: parentId, target: id });
    }

    for (const child of layout.children) addLayout(child, id);
  };

  for (const layout of layouts) addLayout(layout);
  if (nodes[0]) nodes[0].selected = true;

  const now = Date.now();
  return {
    id: createId("space"),
    name,
    createdAt: now,
    updatedAt: now,
    nodes,
    edges,
    settings: { nodeStyle: "dark" },
  };
}
