import { useState, useCallback } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "./components/app-sidebar"
import { PageBreadcrumbs } from "./components/breadcrumbs"
import { DirectoryListing } from "./components/directory-listing"
import { FileViewer } from "./components/file-viewer"
import { ConfigEditor, ConfigGearButton } from "./components/config-editor"
import { useTree, useContent, useWebSocket } from "./hooks/use-tome"
import { useTheme } from "./hooks/use-theme"

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.slice(1)
    return hash || ""
  })
  const [configOpen, setConfigOpen] = useState(false)
  const { tree, loading: treeLoading, refetch: refetchTree } = useTree()
  const { content, loading: contentLoading, refetch: refetchContent } = useContent(currentPath)
  const { theme, setTheme } = useTheme()

  const navigate = useCallback((path: string) => {
    setCurrentPath(path)
    window.location.hash = path
  }, [])

  // Real-time updates via WebSocket
  useWebSocket(
    useCallback((data: any) => {
      if (data.type === "refresh" || data.type === "config-changed") {
        refetchTree()
        refetchContent()
      }
    }, [refetchTree, refetchContent])
  )

  const isDirectory = content?.type === "directory"
  const configDirPath = isDirectory ? (content?.path || "") : ""

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          tree={tree}
          currentPath={currentPath}
          onNavigate={navigate}
          theme={theme}
          onThemeChange={setTheme}
        />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <div className="flex-1">
              <PageBreadcrumbs path={currentPath} onNavigate={navigate} />
            </div>
            {isDirectory && (
              <ConfigGearButton onClick={() => setConfigOpen(true)} />
            )}
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-4xl">
              {(treeLoading || contentLoading) && !content ? (
                <LoadingSkeleton />
              ) : content?.type === "directory" ? (
                <DirectoryContent
                  content={content}
                  onNavigate={navigate}
                />
              ) : content?.type === "file" ? (
                <FileViewer content={content} />
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  page not found
                </div>
              )}
            </div>
          </main>
        </SidebarInset>

        {/* Config editor sheet */}
        <ConfigEditor
          dirPath={configDirPath}
          open={configOpen}
          onOpenChange={setConfigOpen}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function DirectoryContent({
  content,
  onNavigate,
}: {
  content: any
  onNavigate: (path: string) => void
}) {
  const hasCustomLayout = content.config?.display?.layout && content.config.display.layout !== "list"
  const children = content.children || []
  const landingChildren = children.filter((n: any) =>
    !["_about.md", "README.md", "index.md"].includes(n.name)
  )

  return (
    <div>
      {hasCustomLayout ? (
        <>
          <DirectoryListing
            nodes={landingChildren}
            config={content.config}
            dirPath={content.path}
            onNavigate={onNavigate}
          />
          {content.landingHtml && (
            <>
              <Separator className="my-6" />
              <div className="prose" dangerouslySetInnerHTML={{ __html: content.landingHtml }} />
            </>
          )}
        </>
      ) : (
        <>
          {content.landingHtml && (
            <div className="prose" dangerouslySetInnerHTML={{ __html: content.landingHtml }} />
          )}
          {content.landingHtml && children.length > 0 && <Separator className="my-6" />}
          <DirectoryListing
            nodes={children}
            config={content.config}
            dirPath={content.path}
            onNavigate={onNavigate}
          />
        </>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-2 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
