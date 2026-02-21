import type { FileNode } from "./scanner.js";

export function htmlPage(title: string, nav: string, content: string, breadcrumbs: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — tome</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-header">
        <a href="/" class="logo">tome</a>
      </div>
      <div class="sidebar-tree">
        ${nav}
      </div>
    </nav>
    <main class="content">
      <div class="breadcrumbs">${breadcrumbs}</div>
      <article class="page">
        ${content}
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderNav(nodes: FileNode[], currentPath: string, basePath: string = ""): string {
  let html = "<ul>";
  for (const node of nodes) {
    const href = node.type === "directory" ? `/page/${node.path}/` : `/page/${node.path}`;
    const isActive = currentPath === node.path || currentPath.startsWith(node.path + "/");
    const icon = node.meta?.icon || (node.type === "directory" ? "📁" : fileIcon(node.ext));
    const displayName = node.meta?.title || cleanName(node.name);

    html += `<li class="${isActive ? "active" : ""}">`;
    html += `<a href="${href}"><span class="nav-icon">${icon}</span> ${displayName}</a>`;

    if (node.type === "directory" && node.children && isActive) {
      html += renderNav(node.children, currentPath, node.path);
    }
    html += "</li>";
  }
  html += "</ul>";
  return html;
}

export function renderBreadcrumbs(path: string): string {
  if (!path) return `<a href="/">home</a>`;
  const parts = path.split("/").filter(Boolean);
  let html = `<a href="/">home</a>`;
  let accumulated = "";
  for (const part of parts) {
    accumulated += (accumulated ? "/" : "") + part;
    html += ` <span class="sep">/</span> <a href="/page/${accumulated}">${cleanName(part)}</a>`;
  }
  return html;
}

export function renderDirectoryListing(nodes: FileNode[], dirPath: string): string {
  let html = `<div class="directory-listing">`;
  for (const node of nodes) {
    const href = node.type === "directory" ? `/page/${node.path}/` : `/page/${node.path}`;
    const icon = node.meta?.icon || (node.type === "directory" ? "📁" : fileIcon(node.ext));
    const displayName = node.meta?.title || cleanName(node.name);
    const childCount = node.children?.length || 0;
    const size = node.type === "file" ? formatSize(node.size) : `${childCount} ${childCount === 1 ? "item" : "items"}`;
    const modified = timeAgo(node.modified);

    html += `<a href="${href}" class="dir-item${node.meta?.style === 'highlight' ? ' highlight' : ''}">
      <span class="dir-icon">${icon}</span>
      <span class="dir-name">${displayName}</span>
      <span class="dir-meta">${size} · ${modified}</span>
    </a>`;
  }
  html += "</div>";
  return html;
}

// --- Helpers ---

function cleanName(name: string): string {
  return name
    .replace(/\.(md|txt|json|toml|yaml|yml|ts|js|py|sh)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/^(\d+)\s/, "$1. ");
}

function fileIcon(ext: string): string {
  const icons: Record<string, string> = {
    ".md": "📄", ".json": "📋", ".toml": "⚙️", ".yaml": "⚙️", ".yml": "⚙️",
    ".ts": "🟦", ".js": "🟨", ".py": "🐍", ".sh": "💻",
    ".png": "🖼️", ".jpg": "🖼️", ".jpeg": "🖼️", ".gif": "🖼️", ".webp": "🖼️", ".svg": "🖼️",
    ".css": "🎨", ".html": "🌐", ".sql": "🗃️",
  };
  return icons[ext] || "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

// fix "1 items" → "1 item"

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toISOString().split("T")[0];
}

const CSS = `
  :root {
    --bg: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --text-link: #58a6ff;
    --accent: #58a6ff;
    --highlight-bg: #1f2937;
    --code-bg: #161b22;
    --sidebar-width: 280px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    height: 100%;
  }

  a { color: var(--text-link); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .layout {
    display: flex;
    height: 100vh;
  }

  /* sidebar */
  .sidebar {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 0;
  }

  .sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
  }
  .logo:hover { text-decoration: none; color: var(--accent); }

  .sidebar-tree {
    padding: 8px 0;
  }

  .sidebar-tree ul {
    list-style: none;
    padding-left: 0;
  }

  .sidebar-tree ul ul {
    padding-left: 16px;
  }

  .sidebar-tree li a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 20px;
    color: var(--text-muted);
    font-size: 14px;
    transition: all 0.15s;
  }

  .sidebar-tree li a:hover {
    color: var(--text);
    background: var(--bg-tertiary);
    text-decoration: none;
  }

  .sidebar-tree li.active > a {
    color: var(--text);
    background: var(--bg-tertiary);
    border-right: 2px solid var(--accent);
  }

  .nav-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }

  /* content */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 48px;
    max-width: 900px;
  }

  .breadcrumbs {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .breadcrumbs a { color: var(--text-muted); }
  .breadcrumbs a:hover { color: var(--text-link); }
  .breadcrumbs .sep { margin: 0 6px; opacity: 0.5; }

  /* article */
  .page h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px; }
  .page h2 { font-size: 22px; font-weight: 600; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .page h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; }
  .page p { margin: 0 0 16px; }
  .page ul, .page ol { margin: 0 0 16px; padding-left: 24px; }
  .page li { margin: 4px 0; }
  .page blockquote { border-left: 3px solid var(--accent); padding: 8px 16px; margin: 16px 0; color: var(--text-muted); background: var(--bg-secondary); border-radius: 4px; }
  .page table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .page th, .page td { padding: 8px 12px; text-align: left; border: 1px solid var(--border); }
  .page th { background: var(--bg-secondary); font-weight: 600; }
  .page img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
  .page code { background: var(--code-bg); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: "SF Mono", Monaco, Consolas, monospace; }
  .page pre { background: var(--code-bg); padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; border: 1px solid var(--border); }
  .page pre code { background: none; padding: 0; font-size: 13px; }
  .page strong { font-weight: 600; }
  .page a { color: var(--text-link); }
  .page hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* directory listing */
  .directory-listing {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dir-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    color: var(--text);
    transition: background 0.15s;
  }
  .dir-item:hover { background: var(--bg-secondary); text-decoration: none; }
  .dir-item.highlight { background: var(--highlight-bg); border: 1px solid var(--border); }

  .dir-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
  .dir-name { flex: 1; font-weight: 500; }
  .dir-meta { color: var(--text-muted); font-size: 13px; flex-shrink: 0; }

  .image-container { text-align: center; }

  /* responsive */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .content { padding: 16px; }
  }
`;
