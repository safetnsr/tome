import type { ContentResponse } from "../types"

interface FileViewerProps {
  content: ContentResponse
}

export function FileViewer({ content }: FileViewerProps) {
  if (!content.html) {
    return (
      <div className="text-muted-foreground italic py-8 text-center">
        no content to display
      </div>
    )
  }

  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: content.html }}
    />
  )
}
