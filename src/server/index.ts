import { Hono } from "hono";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  scanDirectory,
  readFileContent,
  findLandingPage,
  loadViewConfig,
  applyFilter,
  applyPin,
  applyStatusBadges,
  type FileNode,
} from "./scanner.js";
import { renderContent, renderMarkdown } from "./renderer.js";

const ROOT = resolve(process.argv[2] || ".");
const PORT = parseInt(process.env.PORT || "3333", 10);
const STATIC_DIR = resolve(import.meta.dir, "../../dist");

console.log(`[lair] scanning ${ROOT}`);
console.log(`[lair] http://localhost:${PORT}`);

let tree: FileNode[] = [];
const wsClients = new Set<any>();

async function refresh() {
  tree = await scanDirectory(ROOT);
}

await refresh();
setInterval(refresh, 5000);

// Watch for file changes and notify WS clients
import { watch } from "chokidar";
const watcher = watch(ROOT, {
  ignored: /(^|[\/\\])\.|node_modules|\.git/,
  persistent: true,
  ignoreInitial: true,
  depth: 10,
});

watcher.on("all", async (event, path) => {
  await refresh();
  const msg = JSON.stringify({ type: "refresh", event, path });
  for (const ws of wsClients) {
    try { ws.send(msg); } catch { wsClients.delete(ws); }
  }
});

const app = new Hono();

// --- API Routes ---

// Get full file tree
app.get("/api/tree", async (c) => {
  await refresh();
  return c.json({ tree: serializeTree(tree) });
});

// Get file/directory content
app.get("/api/content/*", async (c) => {
  const pagePath = c.req.path.replace("/api/content/", "").replace(/\/$/, "");
  
  if (!pagePath) {
    // Root
    const landing = findLandingPage(tree);
    const rootConfig = await loadViewConfig(ROOT);
    let html = "";
    if (landing) {
      const text = await readFileContent(landing);
      html = renderContent(text, landing);
    }
    // Apply new features to root children
    const processedChildren = await processDirectoryNodes(tree, rootConfig, ROOT);
    return c.json({
      type: "directory",
      path: "",
      config: rootConfig,
      landingHtml: html,
      children: serializeTree(processedChildren),
    });
  }

  const node = findNode(tree, pagePath);
  if (!node) return c.json({ error: "not found" }, 404);

  if (node.type === "directory") {
    const children = node.children || [];
    const landing = findLandingPage(children);
    const dirConfig = await loadViewConfig(node.absolutePath);
    let landingHtml = "";
    if (landing) {
      const text = await readFileContent(landing);
      landingHtml = renderContent(text, landing);
    }
    // Apply new features to directory children
    const processedChildren = await processDirectoryNodes(children, dirConfig, node.absolutePath);
    return c.json({
      type: "directory",
      path: pagePath,
      config: dirConfig,
      landingHtml,
      children: serializeTree(processedChildren),
    });
  }

  // File
  const text = await readFileContent(node);
  const html = renderContent(text, node);
  return c.json({
    type: "file",
    path: pagePath,
    name: node.name,
    ext: node.ext,
    size: node.size,
    modified: node.modified,
    meta: node.meta,
    html,
    raw: text,
  });
});

// Get view config for a directory
app.get("/api/config/*", async (c) => {
  const dirPath = c.req.path.replace("/api/config/", "").replace(/\/$/, "");
  const fullPath = dirPath ? join(ROOT, dirPath) : ROOT;
  
  if (!fullPath.startsWith(ROOT)) return c.json({ error: "forbidden" }, 403);
  
  const config = await loadViewConfig(fullPath);
  
  // Also read raw TOML for the editor
  let rawToml = "";
  try {
    rawToml = await readFile(join(fullPath, ".view.toml"), "utf-8");
  } catch { /* no config file */ }
  
  return c.json({ config, rawToml, dirPath });
});

// Save view config for a directory
app.put("/api/config/*", async (c) => {
  const dirPath = c.req.path.replace("/api/config/", "").replace(/\/$/, "");
  const fullPath = dirPath ? join(ROOT, dirPath) : ROOT;
  
  if (!fullPath.startsWith(ROOT)) return c.json({ error: "forbidden" }, 403);
  
  const body = await c.req.json();
  const tomlContent = body.toml;
  
  if (typeof tomlContent !== "string") {
    return c.json({ error: "toml field required" }, 400);
  }
  
  // Validate TOML before saving
  try {
    const { parse } = await import("toml");
    parse(tomlContent);
  } catch (e: any) {
    return c.json({ error: `Invalid TOML: ${e.message}` }, 400);
  }
  
  await writeFile(join(fullPath, ".view.toml"), tomlContent, "utf-8");
  await refresh();
  
  // Notify WS clients
  const msg = JSON.stringify({ type: "config-changed", dirPath });
  for (const ws of wsClients) {
    try { ws.send(msg); } catch { wsClients.delete(ws); }
  }
  
  return c.json({ ok: true });
});

// Raw file serving (images, downloads)
app.get("/raw/*", async (c) => {
  const filePath = c.req.path.replace("/raw/", "");
  const fullPath = join(ROOT, filePath);
  if (!fullPath.startsWith(ROOT)) return c.text("forbidden", 403);
  try {
    const file = Bun.file(fullPath);
    return new Response(file);
  } catch {
    return c.text("not found", 404);
  }
});

// Serve static SPA files for production
app.get("*", async (c) => {
  const reqPath = c.req.path;
  
  // Try serving static file from dist
  try {
    const filePath = reqPath === "/" ? "/index.html" : reqPath;
    const file = Bun.file(join(STATIC_DIR, filePath));
    if (await file.exists()) return new Response(file);
  } catch {}
  
  // Fallback to index.html for SPA routing
  try {
    const indexFile = Bun.file(join(STATIC_DIR, "index.html"));
    if (await indexFile.exists()) return new Response(indexFile, { headers: { "content-type": "text/html" } });
  } catch {}
  
  return c.text("not found - run `bun run build` first", 404);
});

// --- Feature processors ---

/**
 * Process directory nodes applying all new features:
 * filter → pin → status → embed
 */
async function processDirectoryNodes(
  nodes: FileNode[],
  config: any,
  dirPath: string
): Promise<FileNode[]> {
  // 1. Apply filter (hide/only)
  let processed = applyFilter(nodes, config);

  // 2. Apply pin (mark + sort to top)
  processed = applyPin(processed, config);

  // 3. Apply status badges
  processed = applyStatusBadges(processed, config);

  // 4. Apply embed (load HTML content for embedded files)
  if (config?.embed?.files && config.embed.files.length > 0) {
    const embedSet = new Set(config.embed.files as string[]);
    processed = await Promise.all(
      processed.map(async (node) => {
        if (node.type === "file" && embedSet.has(node.name)) {
          try {
            const text = await readFileContent(node);
            const html = renderMarkdown(text);
            return { ...node, embedHtml: html };
          } catch {
            return node;
          }
        }
        return node;
      })
    );
  }

  return processed;
}

// --- Helpers ---

function serializeTree(nodes: FileNode[]): any[] {
  return nodes.map(n => ({
    name: n.name,
    path: n.path,
    type: n.type,
    ext: n.ext,
    size: n.size,
    modified: n.modified,
    meta: n.meta,
    children: n.children ? serializeTree(n.children) : undefined,
    embedHtml: n.embedHtml,
    isPinned: n.isPinned,
    statusBadge: n.statusBadge,
  }));
}

function findNode(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split("/").filter(Boolean);
  let current = nodes;
  for (let i = 0; i < parts.length; i++) {
    const found = current.find((n) => n.name === parts[i]);
    if (!found) return null;
    if (i === parts.length - 1) return found;
    if (found.type === "directory" && found.children) {
      current = found.children;
    } else {
      return null;
    }
  }
  return null;
}

// --- Start ---

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    // WebSocket upgrade
    if (req.url.endsWith("/ws")) {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) { wsClients.add(ws); },
    close(ws) { wsClients.delete(ws); },
    message() {},
  },
});

console.log(`[lair] listening on http://localhost:${server.port}`);
