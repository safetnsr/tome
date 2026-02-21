import { marked } from "marked";
import { getFileType, type FileNode } from "./scanner.js";

// --- Markdown ---

export function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
}

// --- JSON ---

export function renderJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return `<pre class="json-tree"><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
  } catch {
    return `<pre><code>${escapeHtml(content)}</code></pre>`;
  }
}

// --- TOML/YAML ---

export function renderKeyValue(content: string, lang: string): string {
  return `<pre class="kv-block"><code class="language-${lang}">${escapeHtml(content)}</code></pre>`;
}

// --- Code ---

export function renderCode(content: string, ext: string): string {
  const lang = ext.replace(".", "");
  return `<pre class="code-block"><code class="language-${lang}">${escapeHtml(content)}</code></pre>`;
}

// --- Image ---

export function renderImage(node: FileNode): string {
  return `<div class="image-container"><img src="/raw/${node.path}" alt="${node.name}" loading="lazy" /></div>`;
}

// --- Dispatch ---

export function renderContent(content: string, node: FileNode): string {
  const fileType = getFileType(node.ext);

  switch (fileType) {
    case "markdown":
      return renderMarkdown(content);
    case "json":
      return renderJson(content);
    case "toml":
    case "yaml":
      return renderKeyValue(content, fileType);
    case "code":
      return renderCode(content, node.ext);
    case "image":
      return renderImage(node);
    case "text":
    default:
      return `<pre class="text-block"><code>${escapeHtml(content)}</code></pre>`;
  }
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
