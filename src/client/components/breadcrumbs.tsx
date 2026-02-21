import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"
import { Fragment } from "react"

interface BreadcrumbsProps {
  path: string
  onNavigate: (path: string) => void
}

function cleanName(name: string): string {
  return name
    .replace(/\.(md|txt|json|toml|yaml|yml|ts|js|py|sh)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/^(\d+)\s/, "$1. ")
}

export function PageBreadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  if (!path) return null

  const parts = path.split("/").filter(Boolean)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => onNavigate("")}
            className="cursor-pointer flex items-center gap-1"
          >
            <Home className="size-3.5" />
            <span>home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {parts.map((part, i) => {
          const accumulated = parts.slice(0, i + 1).join("/")
          const isLast = i === parts.length - 1

          return (
            <Fragment key={accumulated}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{cleanName(part)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => onNavigate(accumulated)}
                    className="cursor-pointer"
                  >
                    {cleanName(part)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
