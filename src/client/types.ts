export interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  ext: string
  size: number
  modified: string
  meta?: PageMeta
  children?: FileNode[]
  embedHtml?: string        // rendered HTML for embedded files
  isPinned?: boolean        // pinned via [pin] config
  statusBadge?: "fresh" | "stale" | null  // freshness badge
}

export interface PageMeta {
  title?: string
  icon?: string
  style?: string
  hidden?: boolean
  pinned?: boolean
  order?: number
  description?: string
  badge?: string
  color?: string
  tags?: string[]
}

export interface LinkItem {
  title: string
  url: string
  icon?: string
}

export interface ViewConfig {
  display?: {
    layout?: string
    sort?: string
    order?: string
    hidden?: string[]
    pinned?: string[]
    columns?: number
    showMeta?: boolean
    showPreview?: boolean
    previewLines?: number
    groupBy?: string
    emptyMessage?: string
    maxDepth?: number
    showCount?: boolean
  }
  header?: {
    title?: string
    description?: string
    icon?: string
    banner?: string
  }
  theme?: {
    accent?: string
    bg?: string
    font?: string
    borderRadius?: string
    compact?: boolean
  }
  nav?: {
    expanded?: boolean
    hidden?: boolean
    label?: string
    icon?: string
    separator?: string
    position?: number
  }
  pages?: Record<string, PageMeta>
  aliases?: Record<string, string>
  // New features
  pin?: {
    files?: string[]
  }
  filter?: {
    hide?: string[]
    only?: string[]
  }
  links?: LinkItem[]
  status?: {
    fresh?: string
    stale?: string
  }
  embed?: {
    files?: string[]
    maxLines?: number
    collapsed?: boolean
  }
}

export interface ContentResponse {
  type: "file" | "directory"
  path: string
  config?: ViewConfig | null
  landingHtml?: string
  children?: FileNode[]
  name?: string
  ext?: string
  size?: number
  modified?: string
  meta?: PageMeta
  html?: string
  raw?: string
}
