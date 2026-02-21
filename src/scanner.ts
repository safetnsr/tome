import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative, extname, basename, dirname } from "node:path";
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
  content?: string;
  meta?: PageMeta;
}

export interface PageMeta {
  title?: string;
  icon?: string;
  style?: "highlight" | "compact" | "full" | "raw";
  hidden?: boolean;
  pinned?: boolean;
}

export interface ViewConfig {
  display?: {
    layout?: "list" | "cards" | "table" | "timeline";
    sort?: "name" | "modified" | "created" | "manual";
    hidden?: string[];
    pinned?: string[];
  };
  pages?: Record<string, PageMeta>;
}

// --- Defaults ---

const DEFAULT_HIDDEN = [
  /^\./,           // dotfiles
  /^_(?!about)/,   // underscore prefix (except _about)
  /^node_modules$/,
  /^\.git$/,
  /^dist$/,
  /^\.view\.(toml|yaml|json)$/,
];

const FILE_TYPE_MAP: Record<string, string> = {
  ".md": "markdown",
  ".json": "json",
  ".toml": "toml",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".ts": "code",
  ".js": "code",
  ".py": "code",
  ".sh": "code",
  ".css": "code",
  ".html": "code",
  ".sql": "code",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".svg": "image",
  ".txt": "text",
  ".log": "text",
  ".csv": "text",
};

// --- Scanner ---

export async function scanDirectory(
  rootPath: string,
  currentPath: string = rootPath,
  depth: number = 0,
  maxDepth: number = 10
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];

  const entries = await readdir(currentPath, { withFileTypes: true });
  const viewConfig = await loadViewConfig(currentPath);
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relPath = relative(rootPath, fullPath);

    // check hidden
    if (isHidden(entry.name, viewConfig)) continue;

    const stats = await stat(fullPath);

    if (entry.isDirectory()) {
      const children = await scanDirectory(rootPath, fullPath, depth + 1, maxDepth);
      nodes.push({
        name: entry.name,
        path: relPath,
        absolutePath: fullPath,
        type: "directory",
        ext: "",
        size: 0,
        modified: stats.mtime,
        children,
        meta: viewConfig?.pages?.[entry.name + "/"],
      });
    } else {
      const ext = extname(entry.name).toLowerCase();
      nodes.push({
        name: entry.name,
        path: relPath,
        absolutePath: fullPath,
        type: "file",
        ext,
        size: stats.size,
        modified: stats.mtime,
        meta: viewConfig?.pages?.[entry.name],
      });
    }
  }

  // sort
  return sortNodes(nodes, viewConfig);
}

export async function readFileContent(node: FileNode): Promise<string> {
  if (node.type === "directory") return "";
  const fileType = FILE_TYPE_MAP[node.ext] || "text";
  if (fileType === "image") return ""; // images served separately
  if (node.size > 1024 * 1024) return "[file too large to display]"; // 1MB limit
  return await readFile(node.absolutePath, "utf-8");
}

export function getFileType(ext: string): string {
  return FILE_TYPE_MAP[ext] || "text";
}

// --- View Config ---

async function loadViewConfig(dirPath: string): Promise<ViewConfig | null> {
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
  // check default hidden patterns
  for (const pattern of DEFAULT_HIDDEN) {
    if (pattern.test(name)) return true;
  }
  // check config hidden
  if (config?.display?.hidden) {
    for (const glob of config.display.hidden) {
      if (matchGlob(name, glob)) return true;
    }
  }
  return false;
}

function matchGlob(name: string, glob: string): boolean {
  // simple glob: *.ext or exact match
  if (glob.startsWith("*.")) {
    return name.endsWith(glob.slice(1));
  }
  return name === glob || name === glob.replace(/\/$/, "");
}

function sortNodes(nodes: FileNode[], config: ViewConfig | null): FileNode[] {
  const sortBy = config?.display?.sort || "name";
  const pinned = new Set(config?.display?.pinned || ["_about.md", "README.md"]);

  return nodes.sort((a, b) => {
    // directories first
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    // pinned items first
    const aPinned = pinned.has(a.name);
    const bPinned = pinned.has(b.name);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    // then sort
    if (sortBy === "modified") return b.modified.getTime() - a.modified.getTime();
    return a.name.localeCompare(b.name);
  });
}

// --- Landing page detection ---

export function findLandingPage(nodes: FileNode[]): FileNode | null {
  for (const name of ["_about.md", "README.md", "index.md"]) {
    const found = nodes.find((n) => n.name === name);
    if (found) return found;
  }
  return null;
}
