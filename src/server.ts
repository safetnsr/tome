import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  scanDirectory,
  readFileContent,
  findLandingPage,
  loadViewConfig,
  type FileNode,
} from "./scanner.js";
import { renderContent } from "./renderer.js";
import {
  htmlPage,
  renderNav,
  renderBreadcrumbs,
  renderDirectoryListing,
} from "./template.js";

// --- Config ---

const ROOT = resolve(process.argv[2] || ".");
const PORT = parseInt(process.env.PORT || "3333", 10);

console.log(`[tome] scanning ${ROOT}`);
console.log(`[tome] http://localhost:${PORT}`);

// --- Cache ---

let tree: FileNode[] = [];

async function refresh() {
  tree = await scanDirectory(ROOT);
}

await refresh();

// auto-refresh every 10 seconds
setInterval(refresh, 10000);

// --- App ---

const app = new Hono();

// Home — show root directory
app.get("/", async (c) => {
  await refresh();
  const landing = findLandingPage(tree);
  const rootConfig = await loadViewConfig(ROOT);
  const hasCustomLayout = rootConfig?.display?.layout && rootConfig.display.layout !== "list";
  let content = "";

  if (hasCustomLayout) {
    const listingNodes = tree.filter(n => n.name !== landing?.name);
    content = renderDirectoryListing(listingNodes, "", rootConfig);
    if (landing) {
      const text = await readFileContent(landing);
      content += "<hr />" + renderContent(text, landing);
    }
  } else if (landing) {
    const text = await readFileContent(landing);
    content = renderContent(text, landing);
    content += "<hr />" + renderDirectoryListing(tree, "");
  } else {
    content = renderDirectoryListing(tree, "");
  }

  const nav = renderNav(tree, "");
  const title = rootConfig?.header?.title || "home";
  return c.html(htmlPage(title, nav, content, renderBreadcrumbs("")));
});

// Raw file serving (for images, downloads)
app.get("/raw/*", async (c) => {
  const filePath = c.req.path.replace("/raw/", "");
  const fullPath = join(ROOT, filePath);

  // security: prevent path traversal
  if (!fullPath.startsWith(ROOT)) return c.text("forbidden", 403);

  try {
    const file = Bun.file(fullPath);
    return new Response(file);
  } catch {
    return c.text("not found", 404);
  }
});

// Page — show file or directory
app.get("/page/*", async (c) => {
  await refresh();
  const pagePath = c.req.path.replace("/page/", "").replace(/\/$/, "");

  // find the node in the tree
  const node = findNode(tree, pagePath);
  if (!node) return c.text("not found", 404);

  const nav = renderNav(tree, pagePath);
  const breadcrumbs = renderBreadcrumbs(pagePath);

  if (node.type === "directory") {
    const children = node.children || [];
    const landing = findLandingPage(children);
    const dirConfig = await loadViewConfig(node.absolutePath);
    const hasCustomLayout = dirConfig?.display?.layout && dirConfig.display.layout !== "list";
    let content = "";

    if (hasCustomLayout) {
      // custom layout takes priority — show listing first, landing content below
      const listingNodes = children.filter(n => n.name !== landing?.name);
      content = renderDirectoryListing(listingNodes, pagePath, dirConfig);
      if (landing) {
        const text = await readFileContent(landing);
        content += "<hr />" + renderContent(text, landing);
      }
    } else if (landing) {
      const text = await readFileContent(landing);
      content = renderContent(text, landing);
      content += "<hr />" + renderDirectoryListing(children, pagePath, dirConfig);
    } else {
      content = renderDirectoryListing(children, pagePath, dirConfig);
    }

    const title = dirConfig?.header?.title || node.meta?.title || node.name;
    return c.html(htmlPage(title, nav, content, breadcrumbs));
  }

  // file
  const text = await readFileContent(node);
  const content = renderContent(text, node);
  const title = node.meta?.title || node.name;
  return c.html(htmlPage(title, nav, content, breadcrumbs));
});

// --- Helpers ---

function findNode(nodes: FileNode[], path: string): FileNode | null {
  const parts = path.split("/").filter(Boolean);
  let current = nodes;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const found = current.find((n) => n.name === part);
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
  fetch: app.fetch,
});

console.log(`[tome] listening on http://localhost:${server.port}`);
