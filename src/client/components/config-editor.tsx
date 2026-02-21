import { useState, useEffect, useCallback, useRef } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Settings, Save, AlertCircle, FileCode, Palette, Layout, Type } from "lucide-react"
import { useConfig } from "../hooks/use-tome"
import { cn } from "@/lib/utils"

interface ConfigEditorProps {
  dirPath: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LAYOUTS = ["list", "cards", "grid", "table", "timeline"]
const SORT_OPTIONS = ["name", "modified", "created", "size", "type", "manual"]
const GROUP_OPTIONS = ["none", "type", "ext", "tag"]

export function ConfigEditor({ dirPath, open, onOpenChange }: ConfigEditorProps) {
  const { rawToml, saving, error, saveConfig, refetch } = useConfig(dirPath)
  const [localToml, setLocalToml] = useState("")
  const [mode, setMode] = useState<"visual" | "raw">("visual")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      refetch()
    }
  }, [open, refetch])

  useEffect(() => {
    setLocalToml(rawToml)
  }, [rawToml])

  const debouncedSave = useCallback((toml: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await saveConfig(toml)
    }, 600)
  }, [saveConfig])

  const updateToml = useCallback((toml: string) => {
    setLocalToml(toml)
    debouncedSave(toml)
  }, [debouncedSave])

  // Parse current TOML into sections for visual editor
  const parsed = parseSimpleToml(localToml)

  const updateField = useCallback((section: string, key: string, value: string | boolean | number) => {
    const newToml = updateTomlField(localToml, section, key, value)
    updateToml(newToml)
  }, [localToml, updateToml])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            <span>configure view</span>
            {saving && <Badge variant="outline" className="text-xs animate-pulse">saving...</Badge>}
          </SheetTitle>
          <SheetDescription>
            {dirPath || "root"} / .view.toml
          </SheetDescription>
        </SheetHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mx-4 mt-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as "visual" | "raw")} className="flex-1 flex flex-col min-h-0 px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="visual" className="flex-1 gap-1.5">
              <Layout className="size-3.5" />
              visual
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex-1 gap-1.5">
              <FileCode className="size-3.5" />
              toml
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-6 pr-4">
                {/* Header */}
                <Section icon={<Type className="size-4" />} title="header">
                  <Field label="title" value={parsed.header?.title || ""} onChange={(v) => updateField("header", "title", v)} />
                  <Field label="description" value={parsed.header?.description || ""} onChange={(v) => updateField("header", "description", v)} />
                  <Field label="icon" value={parsed.header?.icon || ""} onChange={(v) => updateField("header", "icon", v)} />
                  <Field label="banner" value={parsed.header?.banner || ""} onChange={(v) => updateField("header", "banner", v)} placeholder="image path" />
                </Section>

                <Separator />

                {/* Display */}
                <Section icon={<Layout className="size-4" />} title="display">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">layout</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LAYOUTS.map(l => (
                        <button
                          key={l}
                          onClick={() => updateField("display", "layout", l)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs transition-colors",
                            parsed.display?.layout === l
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent"
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">sort</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SORT_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => updateField("display", "sort", s)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs transition-colors",
                            parsed.display?.sort === s
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">group by</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {GROUP_OPTIONS.map(g => (
                        <button
                          key={g}
                          onClick={() => updateField("display", "groupBy", g)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs transition-colors",
                            parsed.display?.groupBy === g
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field
                    label="columns"
                    value={String(parsed.display?.columns || 3)}
                    onChange={(v) => updateField("display", "columns", parseInt(v) || 3)}
                    type="number"
                  />

                  <ToggleField
                    label="show metadata"
                    checked={parsed.display?.showMeta !== false}
                    onChange={(v) => updateField("display", "showMeta", v)}
                  />

                  <ToggleField
                    label="show preview"
                    checked={parsed.display?.showPreview || false}
                    onChange={(v) => updateField("display", "showPreview", v)}
                  />
                </Section>

                <Separator />

                {/* Theme */}
                <Section icon={<Palette className="size-4" />} title="theme">
                  <Field
                    label="accent color"
                    value={parsed.theme?.accent || ""}
                    onChange={(v) => updateField("theme", "accent", v)}
                    placeholder="#3b82f6"
                  />
                  {parsed.theme?.accent && (
                    <div className="flex items-center gap-2">
                      <div
                        className="size-6 rounded border border-border"
                        style={{ backgroundColor: parsed.theme.accent }}
                      />
                      <span className="text-xs text-muted-foreground">{parsed.theme.accent}</span>
                    </div>
                  )}
                  <ToggleField
                    label="compact mode"
                    checked={parsed.theme?.compact || false}
                    onChange={(v) => updateField("theme", "compact", v)}
                  />
                </Section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 min-h-0 mt-4">
            <div className="flex flex-col h-[calc(100vh-220px)]">
              <textarea
                value={localToml}
                onChange={(e) => updateToml(e.target.value)}
                className="flex-1 w-full rounded-lg border border-border bg-muted p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="# .view.toml config"
                spellCheck={false}
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveConfig(localToml)}
                  disabled={saving}
                >
                  <Save className="size-3.5 mr-1.5" />
                  save now
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// --- Visual editor sub-components ---

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3 pl-6">
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  )
}

function ToggleField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// --- Simple TOML parser/updater (for visual editor) ---

function parseSimpleToml(toml: string): any {
  const result: any = {}
  let currentSection = ""

  for (const line of toml.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      const parts = currentSection.split(".")
      let obj = result
      for (const p of parts) {
        if (!obj[p]) obj[p] = {}
        obj = obj[p]
      }
      continue
    }

    const kvMatch = trimmed.match(/^([^=]+?)\s*=\s*(.+)$/)
    if (kvMatch) {
      const key = kvMatch[1].trim()
      let value: any = kvMatch[2].trim()
      if (value === "true") value = true
      else if (value === "false") value = false
      else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      else if (!isNaN(Number(value))) value = Number(value)

      const parts = currentSection.split(".")
      let obj = result
      for (const p of parts) {
        if (!obj[p]) obj[p] = {}
        obj = obj[p]
      }
      obj[key] = value
    }
  }

  return result
}

function updateTomlField(toml: string, section: string, key: string, value: string | boolean | number): string {
  const lines = toml.split("\n")
  const sectionHeader = `[${section}]`
  let inSection = false
  let sectionFound = false
  let keyFound = false
  const formattedValue = typeof value === "string" ? `"${value}"` : String(value)

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed === sectionHeader) {
      inSection = true
      sectionFound = true
      continue
    }

    if (trimmed.startsWith("[") && inSection) {
      // Entered a new section — insert before this line
      if (!keyFound) {
        lines.splice(i, 0, `${key} = ${formattedValue}`)
        keyFound = true
      }
      break
    }

    if (inSection) {
      const kvMatch = trimmed.match(/^([^=]+?)\s*=/)
      if (kvMatch && kvMatch[1].trim() === key) {
        lines[i] = `${key} = ${formattedValue}`
        keyFound = true
        break
      }
    }
  }

  if (!sectionFound) {
    // Add new section at end
    lines.push("", sectionHeader, `${key} = ${formattedValue}`)
    keyFound = true
  } else if (!keyFound) {
    // Append to existing section at end
    lines.push(`${key} = ${formattedValue}`)
  }

  return lines.join("\n")
}

// --- Gear button for triggering editor ---

export function ConfigGearButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
      title="edit .view.toml"
    >
      <Settings className="size-4" />
    </button>
  )
}
