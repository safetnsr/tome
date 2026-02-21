import { Hono } from "hono";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
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

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Core server factory ---

export interface LairOptions {
  root: string;
  port?: number;
}

export async function startLair(options: LairOptions) {
  const ROOT = resolve(options.root);
  const PORT = options.port ?? 3333;
  const STATIC_DIR = resolve(__dirname, "../../dist");

  console.log(`[lair] scanning ${ROOT}`);
  console.log(`[lair] http://localhost:${PORT}`);

  let tree: FileNode[] = [];
  const wsClients = new Set<any>();

  async function refresh() {
    tree = await scanDirectory(ROOT);
  }

  await refresh();
  const refreshInterval = setInterval(refresh, 5000);

  // Watch for file changes and notify WS clients
  const { watch } = await import("chokidar");
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

  app.get("/api/tree", async (c) => {
    await refresh();
    return c.json({ tree: serializeTree(tree) });
  });

  app.get("/api/content/*", async (c) => {
    const pagePath = c.req.path.replace("/api/content/", "").replace(/\/$/, "");

    if (!pagePath) {
      const landing = findLandingPage(tree);
      const rootConfig = await loadViewConfig(ROOT);
      let html = "";
      if (landing) {
        const text = await readFileContent(landing);
        html = renderContent(text, landing);
      }
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
      const processedChildren = await processDirectoryNodes(children, dirConfig, node.absolutePath);
      return c.json({
        type: "directory",
        path: pagePath,
        config: dirConfig,
        landingHtml,
        children: serializeTree(processedChildren),
      });
    }

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

  app.get("/api/config/*", async (c) => {
    const dirPath = c.req.path.replace("/api/config/", "").replace(/\/$/, "");
    const fullPath = dirPath ? join(ROOT, dirPath) : ROOT;

    if (!fullPath.startsWith(ROOT)) return c.json({ error: "forbidden" }, 403);

    const config = await loadViewConfig(fullPath);

    let rawToml = "";
    try {
      rawToml = await readFile(join(fullPath, ".view.toml"), "utf-8");
    } catch {}

    return c.json({ config, rawToml, dirPath });
  });

  app.put("/api/config/*", async (c) => {
    const dirPath = c.req.path.replace("/api/config/", "").replace(/\/$/, "");
    const fullPath = dirPath ? join(ROOT, dirPath) : ROOT;

    if (!fullPath.startsWith(ROOT)) return c.json({ error: "forbidden" }, 403);

    const body = await c.req.json();
    const tomlContent = body.toml;

    if (typeof tomlContent !== "string") {
      return c.json({ error: "toml field required" }, 400);
    }

    try {
      const { parse } = await import("toml");
      parse(tomlContent);
    } catch (e: any) {
      return c.json({ error: `Invalid TOML: ${e.message}` }, 400);
    }

    await writeFile(join(fullPath, ".view.toml"), tomlContent, "utf-8");
    await refresh();

    const msg = JSON.stringify({ type: "config-changed", dirPath });
    for (const ws of wsClients) {
      try { ws.send(msg); } catch { wsClients.delete(ws); }
    }

    return c.json({ ok: true });
  });

  // Raw file serving
  app.get("/raw/*", async (c) => {
    const filePath = c.req.path.replace("/raw/", "");
    const fullPath = join(ROOT, filePath);
    if (!fullPath.startsWith(ROOT)) return c.text("forbidden", 403);
    try {
      const content = await readFile(fullPath);
      const mime = getMimeType(filePath);
      return new Response(content, { headers: { "content-type": mime } });
    } catch {
      return c.text("not found", 404);
    }
  });

  // Serve static SPA files
  app.get("*", async (c) => {
    const reqPath = c.req.path;

    try {
      const filePath = reqPath === "/" ? "/index.html" : reqPath;
      const fullPath = join(STATIC_DIR, filePath);
      await stat(fullPath);
      const content = await readFile(fullPath);
      const mime = getMimeType(filePath);
      return new Response(content, { headers: { "content-type": mime } });
    } catch {}

    try {
      const indexPath = join(STATIC_DIR, "index.html");
      const content = await readFile(indexPath);
      return new Response(content, { headers: { "content-type": "text/html" } });
    } catch {}

    return c.text("not found - run `npm run build` first", 404);
  });

  // --- Feature processors ---

  async function processDirectoryNodes(
    nodes: FileNode[],
    config: any,
    dirPath: string
  ): Promise<FileNode[]> {
    let processed = applyFilter(nodes, config);
    processed = applyPin(processed, config);
    processed = applyStatusBadges(processed, config);

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

  function getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      html: 'text/html', css: 'text/css', js: 'application/javascript',
      json: 'application/json', png: 'image/png', jpg: 'image/jpeg',
      jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
      ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
      md: 'text/markdown', txt: 'text/plain', toml: 'text/plain',
    };
    return types[ext || ''] || 'application/octet-stream';
  }

  // --- Start server ---

  const server = serve({ fetch: app.fetch, port: PORT });

  // WebSocket server on same port
  const wss = new WebSocketServer({ server: server as any });
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    ws.on('close', () => wsClients.delete(ws));
  });

  console.log(`[lair] listening on http://localhost:${PORT}`);

  return {
    port: PORT,
    url: `http://localhost:${PORT}`,
    stop: async () => {
      clearInterval(refreshInterval);
      await watcher.close();
      wss.close();
      server.close();
    },
  };
}

// bin/lair.js imports this file and calls startLair() directly.
