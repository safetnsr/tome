import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { parse as parseToml } from "toml";

// --- Types ---

export interface FileNode {
  name: string;
  path: string; // relative to root
  absolutePath: string;
  type: "file" | "directory";
  ext: string;
  size: number;
  modified: Date;
  children?: FileNode[];
  meta?: PageMeta;
}

export interface PageMeta {
  title?: string;
  icon?: string;
  style?: "highlight" | "compact" | "full" | "raw" | "hero" | "aside";
  hidden?: boolean;
  pinned?: boolean;
  order?: number;
  description?: string;
  badge?: string;
  color?: string;
  collapsed?: boolean;  // for directories: start collapsed in nav
  cover?: string;       // image path for cards layout
  redirect?: string;    // redirect to another path
  tags?: string[];
}

export interface ViewConfig {
  display?: {
    layout?: "list" | "cards" | "table" | "timeline" | "grid" | "kanban";
    sort?: "name" | "modified" | "created" | "manual" | "size" | "type";
    order?: "asc" | "desc";
    hidden?: string[];
    pinned?: string[];
    columns?: number;       // for grid/cards layout
    showMeta?: boolean;     // show file size + modified date
    showPreview?: boolean;  // show first lines of markdown files
    previewLines?: number;  // how many lines to preview (default 3)
    groupBy?: "type" | "ext" | "tag" | "none"; // group items
    emptyMessage?: string;  // custom message for empty dirs
    maxDepth?: number;      // max recursion depth for this dir
    showCount?: boolean;    // show child count on directories
  };
  header?: {
    title?: string;         // override folder name as title
    description?: string;   // shown below title
    icon?: string;
    banner?: string;        // image path for banner above content
  };
  theme?: {
    accent?: string;        // hex color for accent
    bg?: string;            // override background
    font?: string;          // font family override
    borderRadius?: string;  // card border radius
    compact?: boolean;      // tighter spacing
  };
  nav?: {
    expanded?: boolean;     // start expanded in sidebar
    hidden?: boolean;       // hide from sidebar entirely
    label?: string;         // override name in sidebar
    icon?: string;          // override icon in sidebar
    separator?: "before" | "after" | "both"; // visual separator
    position?: number;      // manual sidebar ordering
  };
  pages?: Record<string, PageMeta>;
  aliases?: Record<string, string>;  // url aliases: "intro" → "README.md"
  virtual?: VirtualPage[];  // pages that don't exist on disk
}

export interface VirtualPage {
  name: string;
  title: string;
  content: string;  // markdown content
  icon?: string;
  pinned?: boolean;
}

// --- Defaults ---

const DEFAULT_HIDDEN = [
  /^\./,           // dotfiles
  /^node_modules$/,
  /^dist$/,
  /^\.view\.(toml|yaml|json)$/,
];

const FILE_TYPE_MAP: Record<string, string> = {
  ".md": "markdown", ".json": "json", ".toml": "toml",
  ".yaml": "yaml", ".yml": "yaml",
  ".ts": "code", ".js": "code", ".py": "code", ".sh": "code",
  ".css": "code", ".html": "code", ".sql": "code", ".go": "code",
  ".rs": "code", ".rb": "code", ".java": "code", ".c": "code",
  ".cpp": "code", ".h": "code", ".lua": "code",
  ".png": "image", ".jpg": "image", ".jpeg": "image",
  ".gif": "image", ".webp": "image", ".svg": "image",
  ".txt": "text", ".log": "text", ".csv": "text",
};

// --- Scanner ---

export async function scanDirectory(
  rootPath: string,
  currentPath: string = rootPath,
  depth: number = 0,
  maxDepth: number = 10,
  parentConfig: ViewConfig | null = null
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];

  const viewConfig = await loadViewConfig(currentPath);
  const effectiveMaxDepth = viewConfig?.display?.maxDepth ?? maxDepth;
  if (depth > effectiveMaxDepth) return [];

  const entries = await readdir(currentPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relPath = relative(rootPath, fullPath);

    if (isHidden(entry.name, viewConfig)) continue;

    const stats = await stat(fullPath);

    if (entry.isDirectory()) {
      const children = await scanDirectory(rootPath, fullPath, depth + 1, effectiveMaxDepth, viewConfig);
      const dirMeta = viewConfig?.pages?.[entry.name + "/"] || {};
      nodes.push({
        name: entry.name,
        path: relPath,
        absolutePath: fullPath,
        type: "directory",
        ext: "",
        size: 0,
        modified: stats.mtime,
        children,
        meta: dirMeta,
      });
    } else {
      const ext = extname(entry.name).toLowerCase();
      const fileMeta = viewConfig?.pages?.[entry.name] || {};
      nodes.push({
        name: entry.name,
        path: relPath,
        absolutePath: fullPath,
        type: "file",
        ext,
        size: stats.size,
        modified: stats.mtime,
        meta: fileMeta,
      });
    }
  }

  // add virtual pages
  if (viewConfig?.virtual) {
    for (const vp of viewConfig.virtual) {
      nodes.push({
        name: vp.name,
        path: relative(rootPath, join(currentPath, vp.name)),
        absolutePath: join(currentPath, vp.name),
        type: "file",
        ext: ".md",
        size: vp.content.length,
        modified: new Date(),
        meta: {
          title: vp.title,
          icon: vp.icon,
          pinned: vp.pinned,
        },
      });
    }
  }

  return sortNodes(nodes, viewConfig);
}

export async function readFileContent(node: FileNode): Promise<string> {
  if (node.type === "directory") return "";
  const fileType = FILE_TYPE_MAP[node.ext] || "text";
  if (fileType === "image") return "";
  if (node.size > 2 * 1024 * 1024) return "[file too large to display]";
  try {
    return await readFile(node.absolutePath, "utf-8");
  } catch {
    return "[could not read file]";
  }
}

export function getFileType(ext: string): string {
  return FILE_TYPE_MAP[ext] || "text";
}

export async function loadViewConfig(dirPath: string): Promise<ViewConfig | null> {
  try {
    const tomlPath = join(dirPath, ".view.toml");
    const content = await readFile(tomlPath, "utf-8");
    return parseToml(content) as ViewConfig;
  } catch {
    return null;
  }
}

// --- Helpers ---

function isHidden(name: string, config: ViewConfig | null): boolean {
  for (const pattern of DEFAULT_HIDDEN) {
    if (pattern.test(name)) return true;
  }
  if (config?.display?.hidden) {
    for (const glob of config.display.hidden) {
      if (matchGlob(name, glob)) return true;
    }
  }
  return false;
}

function matchGlob(name: string, glob: string): boolean {
  if (glob.startsWith("*.")) return name.endsWith(glob.slice(1));
  if (glob.endsWith("/")) return name === glob.replace(/\/$/, "");
  return name === glob;
}

function sortNodes(nodes: FileNode[], config: ViewConfig | null): FileNode[] {
  const sortBy = config?.display?.sort || "name";
  const order = config?.display?.order || "asc";
  const pinned = new Set(config?.display?.pinned || ["_about.md", "README.md"]);

  const sorted = nodes.sort((a, b) => {
    // pinned first
    const aPinned = pinned.has(a.name) || a.meta?.pinned;
    const bPinned = pinned.has(b.name) || b.meta?.pinned;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    // manual order via meta.order
    if (a.meta?.order !== undefined && b.meta?.order !== undefined) {
      return a.meta.order - b.meta.order;
    }

    // directories first (unless sorting by type)
    if (sortBy !== "type" && a.type !== b.type) return a.type === "directory" ? -1 : 1;

    let cmp = 0;
    switch (sortBy) {
      case "modified": cmp = b.modified.getTime() - a.modified.getTime(); break;
      case "created": cmp = a.modified.getTime() - b.modified.getTime(); break;
      case "size": cmp = b.size - a.size; break;
      case "type": cmp = a.ext.localeCompare(b.ext); break;
      default: cmp = a.name.localeCompare(b.name);
    }
    return order === "desc" ? -cmp : cmp;
  });

  return sorted;
}

export function findLandingPage(nodes: FileNode[]): FileNode | null {
  for (const name of ["_about.md", "README.md", "index.md"]) {
    const found = nodes.find((n) => n.name === name);
    if (found) return found;
  }
  return null;
}
