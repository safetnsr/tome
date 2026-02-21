import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BookOpen, ChevronRight, File, Folder, Sun, Moon, Monitor } from "lucide-react"
import type { FileNode } from "../types"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  tree: FileNode[]
  currentPath: string
  onNavigate: (path: string) => void
  theme: "light" | "dark" | "system"
  onThemeChange: (theme: "light" | "dark" | "system") => void
}

export function AppSidebar({ tree, currentPath, onNavigate, theme, onThemeChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => onNavigate("")}
              className="cursor-pointer"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <BookOpen className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">lair</span>
                <span className="text-xs text-muted-foreground">workspace viewer</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-1 px-2 py-1">
              <button
                onClick={() => onThemeChange("light")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  theme === "light" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="size-4" />
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  theme === "dark" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Moon className="size-4" />
              </button>
              <button
                onClick={() => onThemeChange("system")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  theme === "system" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="size-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function TreeItem({
  node,
  currentPath,
  onNavigate,
  depth = 0,
}: {
  node: FileNode
  currentPath: string
  onNavigate: (path: string) => void
  depth?: number
}) {
  const isActive = currentPath === node.path || currentPath.startsWith(node.path + "/")
  const displayName = node.meta?.title || cleanName(node.name)

  if (node.type === "directory" && node.children?.length) {
    return (
      <Collapsible defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={currentPath === node.path}
              onClick={(e) => {
                e.preventDefault()
                onNavigate(node.path)
              }}
              className="cursor-pointer"
            >
              <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              <Folder className="size-4 shrink-0" />
              <span className="truncate">{displayName}</span>
              {node.meta?.badge && (
                <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {node.meta.badge}
                </span>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child) => (
                <SidebarMenuSubItem key={child.path}>
                  {child.type === "directory" && child.children?.length ? (
                    <TreeItem
                      node={child}
                      currentPath={currentPath}
                      onNavigate={onNavigate}
                      depth={depth + 1}
                    />
                  ) : (
                    <SidebarMenuSubButton
                      isActive={currentPath === child.path}
                      onClick={() => onNavigate(child.path)}
                      className="cursor-pointer"
                    >
                      <File className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {child.meta?.title || cleanName(child.name)}
                      </span>
                    </SidebarMenuSubButton>
                  )}
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={currentPath === node.path}
        onClick={() => onNavigate(node.path)}
        className="cursor-pointer"
      >
        {node.type === "directory" ? (
          <Folder className="size-4 shrink-0" />
        ) : (
          <File className="size-4 shrink-0" />
        )}
        <span className="truncate">{displayName}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function cleanName(name: string): string {
  return name
    .replace(/\.(md|txt|json|toml|yaml|yml|ts|js|py|sh)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/^(\d+)\s/, "$1. ")
}
