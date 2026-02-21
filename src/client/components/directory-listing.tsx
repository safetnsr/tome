import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Folder, File, ArrowRight, Pin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import type { FileNode, ViewConfig, LinkItem } from "../types"
import { cn } from "@/lib/utils"

interface DirectoryListingProps {
  nodes: FileNode[]
  config?: ViewConfig | null
  dirPath: string
  onNavigate: (path: string) => void
}

function cleanName(name: string): string {
  return name
    .replace(/\.(md|txt|json|toml|yaml|yml|ts|js|py|sh)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/^(\d+)\s/, "$1. ")
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toISOString().split("T")[0]
}

// --- Status badge ---
function StatusBadge({ badge }: { badge?: "fresh" | "stale" | null }) {
  if (!badge) return null
  if (badge === "fresh") {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20">
        fresh
      </span>
    )
  }
  if (badge === "stale") {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground/60 border border-border">
        stale
      </span>
    )
  }
  return null
}

// --- Embed preview ---
function EmbedPreview({
  node,
  embedConfig,
}: {
  node: FileNode
  embedConfig?: ViewConfig["embed"]
}) {
  const [expanded, setExpanded] = useState(!embedConfig?.collapsed)
  const maxLines = embedConfig?.maxLines
  const collapsed = embedConfig?.collapsed ?? false

  if (!node.embedHtml) return null

  // Truncate by lines if maxLines set
  let html = node.embedHtml
  let truncated = false
  if (maxLines && maxLines > 0) {
    const lines = html.split("\n")
    if (lines.length > maxLines) {
      html = lines.slice(0, maxLines).join("\n")
      truncated = true
    }
  }

  const isCollapsible = collapsed

  if (isCollapsible) {
    return (
      <div className="mt-2 rounded-lg border border-border/60 overflow-hidden">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 transition-colors"
        >
          <span className="font-medium">preview</span>
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        {expanded && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {expanded && truncated && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-t border-border/40 italic">
            truncated to {maxLines} lines
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="mt-2 rounded-lg border border-border/60 bg-muted/10 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {truncated && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-t border-border/40 italic">
          truncated to {maxLines} lines
        </div>
      )}
    </div>
  )
}

// --- Links section ---
function LinksSection({ links }: { links: LinkItem[] }) {
  if (!links || links.length === 0) return null
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Links
      </div>
      <div className="flex flex-col gap-0.5">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              "hover:bg-accent group w-full border border-transparent hover:border-border/50"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {link.icon ? (
              <span className="text-base leading-none shrink-0">{link.icon}</span>
            ) : (
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 font-medium text-sm">{link.title}</span>
            <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

function LinkCard({ link }: { link: LinkItem }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border border-dashed p-4 text-left transition-colors",
        "hover:border-primary/50 hover:bg-accent/50 group"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        {link.icon ? (
          <span className="text-lg leading-none">{link.icon}</span>
        ) : (
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium truncate text-sm">{link.title}</span>
        <ExternalLink className="size-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </div>
      <div className="text-xs text-muted-foreground truncate">{link.url}</div>
    </a>
  )
}

// --- Pin separator ---
function PinnedSeparator() {
  return (
    <div className="flex items-center gap-2 py-1 px-1">
      <div className="h-px flex-1 bg-border/50" />
    </div>
  )
}

export function DirectoryListing({ nodes, config, dirPath, onNavigate }: DirectoryListingProps) {
  const layout = config?.display?.layout || "list"
  const showMeta = config?.display?.showMeta !== false
  const columns = config?.display?.columns || 3
  const links = config?.links || []
  const embedConfig = config?.embed

  // Split pinned and non-pinned nodes
  const pinnedNodes = nodes.filter((n) => n.isPinned)
  const regularNodes = nodes.filter((n) => !n.isPinned)
  const hasPinned = pinnedNodes.length > 0
  const hasRegular = regularNodes.length > 0

  return (
    <div>
      {config?.header && (
        <DirectoryHeader header={config.header} dirPath={dirPath} />
      )}
      {layout === "cards" || layout === "grid" ? (
        <>
          {hasPinned && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                <Pin className="size-3" />
                Pinned
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {pinnedNodes.map((node) => (
                  <CardItem
                    key={node.path}
                    node={node}
                    showMeta={showMeta}
                    onNavigate={onNavigate}
                    embedConfig={embedConfig}
                  />
                ))}
              </div>
              {hasRegular && <div className="mt-3 mb-1 h-px bg-border/40" />}
            </div>
          )}
          {hasRegular && (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {regularNodes.map((node) => (
                <CardItem
                  key={node.path}
                  node={node}
                  showMeta={showMeta}
                  onNavigate={onNavigate}
                  embedConfig={embedConfig}
                />
              ))}
            </div>
          )}
          {links.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Links
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {links.map((link, i) => (
                  <LinkCard key={i} link={link} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-0.5">
          {hasPinned && (
            <>
              {pinnedNodes.map((node) => (
                <ListItem
                  key={node.path}
                  node={node}
                  showMeta={showMeta}
                  onNavigate={onNavigate}
                  embedConfig={embedConfig}
                />
              ))}
              {hasRegular && <PinnedSeparator />}
            </>
          )}
          {regularNodes.map((node) => (
            <ListItem
              key={node.path}
              node={node}
              showMeta={showMeta}
              onNavigate={onNavigate}
              embedConfig={embedConfig}
            />
          ))}
          {links.length > 0 && (
            <LinksSection links={links} />
          )}
        </div>
      )}
      {nodes.length === 0 && links.length === 0 && (
        <div className="py-12 text-center text-muted-foreground italic">
          {config?.display?.emptyMessage || "nothing here yet"}
        </div>
      )}
    </div>
  )
}

function DirectoryHeader({ header, dirPath }: { header: ViewConfig["header"]; dirPath: string }) {
  if (!header) return null
  return (
    <div className="mb-6">
      {header.banner && (
        <img
          src={`/raw/${dirPath ? dirPath + "/" : ""}${header.banner}`}
          alt=""
          className="w-full rounded-xl mb-4 object-cover max-h-48"
        />
      )}
      {header.title && (
        <h1 className="text-2xl font-bold mb-1">
          {header.icon && <span className="mr-2">{header.icon}</span>}
          {header.title}
        </h1>
      )}
      {header.description && (
        <p className="text-muted-foreground">{header.description}</p>
      )}
    </div>
  )
}

function ListItem({ node, showMeta, onNavigate, embedConfig }: {
  node: FileNode
  showMeta: boolean
  onNavigate: (path: string) => void
  embedConfig?: ViewConfig["embed"]
}) {
  const displayName = node.meta?.title || cleanName(node.name)
  const childCount = node.children?.length || 0
  const size = node.type === "file" ? formatSize(node.size) : `${childCount} ${childCount === 1 ? "item" : "items"}`
  const hasEmbed = !!node.embedHtml

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg transition-colors",
        node.isPinned && "bg-primary/5 border border-primary/20"
      )}
    >
      <button
        onClick={() => onNavigate(node.path)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
          "hover:bg-accent group w-full",
          node.meta?.style === "highlight" && "bg-accent/50 border border-border",
          node.meta?.style === "hero" && "bg-accent/50 border border-primary rounded-xl py-4 mb-1",
          node.isPinned && "rounded-b-none"
        )}
        style={node.meta?.color ? { borderLeft: `3px solid ${node.meta.color}` } : undefined}
      >
        {node.isPinned && (
          <Pin className="size-3 shrink-0 text-primary/60" />
        )}
        {!node.isPinned && (
          node.type === "directory" ? (
            <Folder className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <File className="size-4 shrink-0 text-muted-foreground" />
          )
        )}
        {node.isPinned && (
          node.type === "directory" ? (
            <Folder className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <File className="size-4 shrink-0 text-muted-foreground" />
          )
        )}
        <span className={cn("flex-1 font-medium", node.meta?.style === "hero" && "text-lg")}>
          {displayName}
        </span>
        {node.statusBadge && <StatusBadge badge={node.statusBadge} />}
        {node.meta?.badge && (
          <Badge variant="secondary" className="text-xs">{node.meta.badge}</Badge>
        )}
        {node.meta?.description && (
          <span className="text-sm text-muted-foreground hidden sm:block max-w-[300px] truncate">
            {node.meta.description}
          </span>
        )}
        {showMeta && (
          <span className="text-xs text-muted-foreground shrink-0">
            {size} · {timeAgo(node.modified)}
          </span>
        )}
        <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
      {hasEmbed && (
        <div className="px-3 pb-2">
          <EmbedPreview node={node} embedConfig={embedConfig} />
        </div>
      )}
    </div>
  )
}

function CardItem({ node, showMeta, onNavigate, embedConfig }: {
  node: FileNode
  showMeta: boolean
  onNavigate: (path: string) => void
  embedConfig?: ViewConfig["embed"]
}) {
  const displayName = node.meta?.title || cleanName(node.name)
  const childCount = node.children?.length || 0
  const size = node.type === "file" ? formatSize(node.size) : `${childCount} ${childCount === 1 ? "item" : "items"}`
  const hasEmbed = !!node.embedHtml

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border p-4 text-left transition-colors",
        "hover:border-primary/50 hover:bg-accent/50 cursor-pointer",
        node.isPinned && "border-primary/30 bg-primary/5"
      )}
      onClick={() => onNavigate(node.path)}
      style={node.meta?.color ? { borderLeft: `3px solid ${node.meta.color}` } : undefined}
    >
      <div className="flex items-center gap-2">
        {node.isPinned && <Pin className="size-3 shrink-0 text-primary/60" />}
        {node.type === "directory" ? (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <File className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium truncate">{displayName}</span>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {node.statusBadge && <StatusBadge badge={node.statusBadge} />}
          {node.meta?.badge && (
            <Badge variant="secondary" className="text-xs">{node.meta.badge}</Badge>
          )}
        </div>
      </div>
      {node.meta?.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{node.meta.description}</p>
      )}
      {node.meta?.tags?.length ? (
        <div className="flex gap-1 flex-wrap">
          {node.meta.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      ) : null}
      {hasEmbed && (
        <div onClick={(e) => e.stopPropagation()}>
          <EmbedPreview node={node} embedConfig={embedConfig} />
        </div>
      )}
      {showMeta && (
        <div className="text-xs text-muted-foreground mt-auto pt-1 opacity-60">
          {size} · {timeAgo(node.modified)}
        </div>
      )}
    </div>
  )
}
