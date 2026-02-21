import { useState, useEffect, useCallback, useRef } from "react"
import type { FileNode, ContentResponse } from "../types"

export function useTree() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch("/api/tree")
      const data = await res.json()
      setTree(data.tree)
    } catch (e) {
      console.error("Failed to fetch tree:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTree() }, [fetchTree])

  return { tree, loading, refetch: fetchTree }
}

export function useContent(path: string) {
  const [content, setContent] = useState<ContentResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const url = path ? `/api/content/${path}` : "/api/content/"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Not found")
      const data = await res.json()
      setContent(data)
    } catch (e) {
      console.error("Failed to fetch content:", e)
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { fetchContent() }, [fetchContent])

  return { content, loading, refetch: fetchContent }
}

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage(data)
      } catch {}
    }

    ws.onclose = () => {
      // reconnect after 2s
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
      }, 2000)
    }

    return () => { ws.close() }
  }, [onMessage])
}

export function useConfig(dirPath: string) {
  const [rawToml, setRawToml] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/config/${dirPath}`)
      const data = await res.json()
      setRawToml(data.rawToml || "")
      setError(null)
    } catch (e) {
      console.error("Failed to fetch config:", e)
    }
  }, [dirPath])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const saveConfig = useCallback(async (toml: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/config/${dirPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toml }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save")
        return false
      }
      setRawToml(toml)
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [dirPath])

  return { rawToml, setRawToml, saving, error, saveConfig, refetch: fetchConfig }
}
