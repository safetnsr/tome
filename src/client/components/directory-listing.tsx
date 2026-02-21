import { Badge } from "@/components/ui/badge"
import { Folder, File, ArrowRight } from "lucide-react"
import type { FileNode, ViewConfig } from "../types"
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

export function DirectoryListing({ nodes, config, dirPath, onNavigate }: DirectoryListingProps) {
  const layout = config?.display?.layout || "list"
  const showMeta = config?.display?.showMeta !== false
  const columns = config?.display?.columns || 3

  return (
    <div>
      {config?.header && (
        <DirectoryHeader header={config.header} dirPath={dirPath} />
      )}
      {layout === "cards" || layout === "grid" ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {nodes.map((node) => (
            <CardItem
              key={node.path}
              node={node}
              showMeta={showMeta}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {nodes.map((node) => (
            <ListItem
              key={node.path}
              node={node}
              showMeta={showMeta}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
      {nodes.length === 0 && (
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

function ListItem({ node, showMeta, onNavigate }: {
  node: FileNode; showMeta: boolean; onNavigate: (path: string) => void
}) {
  const displayName = node.meta?.title || cleanName(node.name)
  const childCount = node.children?.length || 0
  const size = node.type === "file" ? formatSize(node.size) : `${childCount} ${childCount === 1 ? "item" : "items"}`

  return (
    <button
      onClick={() => onNavigate(node.path)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        "hover:bg-accent group w-full",
        node.meta?.style === "highlight" && "bg-accent/50 border border-border",
        node.meta?.style === "hero" && "bg-accent/50 border border-primary rounded-xl py-4 mb-1"
      )}
      style={node.meta?.color ? { borderLeft: `3px solid ${node.meta.color}` } : undefined}
    >
      {node.type === "directory" ? (
        <Folder className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <File className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={cn("flex-1 font-medium", node.meta?.style === "hero" && "text-lg")}>
        {displayName}
      </span>
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
  )
}

function CardItem({ node, showMeta, onNavigate }: {
  node: FileNode; showMeta: boolean; onNavigate: (path: string) => void
}) {
  const displayName = node.meta?.title || cleanName(node.name)
  const childCount = node.children?.length || 0
  const size = node.type === "file" ? formatSize(node.size) : `${childCount} ${childCount === 1 ? "item" : "items"}`

  return (
    <button
      onClick={() => onNavigate(node.path)}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border p-4 text-left transition-colors",
        "hover:border-primary/50 hover:bg-accent/50"
      )}
      style={node.meta?.color ? { borderLeft: `3px solid ${node.meta.color}` } : undefined}
    >
      <div className="flex items-center gap-2">
        {node.type === "directory" ? (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <File className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium truncate">{displayName}</span>
        {node.meta?.badge && (
          <Badge variant="secondary" className="text-xs ml-auto">{node.meta.badge}</Badge>
        )}
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
      {showMeta && (
        <div className="text-xs text-muted-foreground mt-auto pt-1 opacity-60">
          {size} · {timeAgo(node.modified)}
        </div>
      )}
    </button>
  )
}
