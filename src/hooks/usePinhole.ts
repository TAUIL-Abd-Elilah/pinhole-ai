import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { quantizeEmbedding } from '../lib/embedding.ts'
import { InferenceClient } from '../lib/inference-client.ts'
import {
  clearPhotos as clearStoredPhotos,
  deletePhoto as deleteStoredPhoto,
  fileIdentity,
  listPhotos,
  savePhoto,
  storedEmbedding,
  type StoredPhoto,
} from '../lib/photo-db.ts'
import { WasmSearchIndex } from '../lib/wasm-search-index.ts'

export interface DisplayPhoto extends StoredPhoto {
  url: string
  score?: number
}

export interface ModelProgress {
  file: string
  progress: number
}

export interface PinholeMetrics {
  photos: number
  compactIndexBytes: number
  avoidedUploadBytes: number
  searchMs: number | null
  textInferenceMs: number | null
  imageInferenceMs: number | null
  backend: 'wasm-simd' | 'scalar-js' | 'starting'
  threads: number | null
}

interface DemoManifestItem {
  file: string
  name: string
  type?: string
}

export function usePinhole() {
  const clientRef = useRef<InferenceClient | null>(null)
  const indexRef = useRef<WasmSearchIndex | null>(null)
  const [storedPhotos, setStoredPhotos] = useState<StoredPhoto[]>([])
  const [modelStatus, setModelStatus] = useState<'starting' | 'ready' | 'error'>('starting')
  const [modelProgress, setModelProgress] = useState<ModelProgress>({ file: 'model', progress: 0 })
  const [threads, setThreads] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, name: '' })
  const [lastError, setLastError] = useState<string | null>(null)
  const [searchMs, setSearchMs] = useState<number | null>(null)
  const [textInferenceMs, setTextInferenceMs] = useState<number | null>(null)
  const [imageInferenceMs, setImageInferenceMs] = useState<number | null>(null)

  const refreshPhotos = useCallback(async () => {
    const photos = await listPhotos()
    setStoredPhotos(photos.reverse())
    const items = photos.map((photo) => ({ id: photo.id, embedding: storedEmbedding(photo) }))
    indexRef.current = await WasmSearchIndex.create(
      items,
      `${import.meta.env.BASE_URL}wasm/pinhole-index.wasm`,
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    const client = new InferenceClient()
    clientRef.current = client
    void refreshPhotos().catch((error: unknown) => {
      if (cancelled) return
      setLastError(error instanceof Error ? error.message : String(error))
    })
    void client
      .load((file, progress) => setModelProgress({ file, progress }))
      .then((loadedThreads) => {
        if (cancelled) return
        setThreads(loadedThreads)
        setModelStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setModelStatus('error')
        setLastError(error instanceof Error ? error.message : String(error))
      })

    return () => {
      cancelled = true
      client.dispose()
      clientRef.current = null
    }
  }, [refreshPhotos])

  const displayPhotos = useMemo<DisplayPhoto[]>(() => {
    const withUrls = storedPhotos.map((photo) => ({
      ...photo,
      url: URL.createObjectURL(photo.thumbnail),
      score: scores.get(photo.id),
    }))
    if (scores.size > 0) {
      withUrls.sort((left, right) => (right.score ?? -Infinity) - (left.score ?? -Infinity))
    }
    return withUrls
  }, [scores, storedPhotos])

  useEffect(
    () => () => {
      displayPhotos.forEach((photo) => URL.revokeObjectURL(photo.url))
    },
    [displayPhotos],
  )

  const importFiles = useCallback(
    async (files: File[]) => {
      const client = clientRef.current
      if (!client || files.length === 0) return
      setImporting(true)
      setLastError(null)
      setScores(new Map())

      const images = files.filter((file) => file.type.startsWith('image/'))
      setImportProgress({ current: 0, total: images.length, name: '' })
      const existing = new Set(storedPhotos.map((photo) => photo.id))
      const timings: number[] = []

      try {
        for (let index = 0; index < images.length; index += 1) {
          const file = images[index]
          if (!file) continue
          setImportProgress({ current: index, total: images.length, name: file.name })
          const id = await fileIdentity(file)
          if (existing.has(id)) continue

          const { value: result, elapsedMs } = await client.embedImage(file)
          const compact = quantizeEmbedding(result.embedding)
          timings.push(elapsedMs)
          await savePhoto({
            id,
            name: file.name,
            type: file.type,
            width: result.width,
            height: result.height,
            bytes: file.size,
            importedAt: Date.now() + index,
            sourceModifiedAt: file.lastModified,
            thumbnail: result.thumbnail,
            embedding: Uint8Array.from(compact.values).buffer,
            embeddingScale: compact.scale,
          })
          existing.add(id)
          setImportProgress({ current: index + 1, total: images.length, name: file.name })
        }
        if (timings.length > 0) {
          setImageInferenceMs(timings.reduce((sum, value) => sum + value, 0) / timings.length)
        }
        await refreshPhotos()
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error))
      } finally {
        setImporting(false)
      }
    },
    [refreshPhotos, storedPhotos],
  )

  const loadDemo = useCallback(async () => {
    setLastError(null)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo/manifest.json`)
      if (!response.ok) throw new Error('The demo roll is not available in this build')
      const manifest = (await response.json()) as DemoManifestItem[]
      const files = await Promise.all(
        manifest.map(async (item) => {
          const imageResponse = await fetch(`${import.meta.env.BASE_URL}demo/${item.file}`)
          if (!imageResponse.ok) throw new Error(`Could not load ${item.name}`)
          const blob = await imageResponse.blob()
          return new File([blob], item.name, {
            type: item.type ?? blob.type ?? 'image/webp',
            lastModified: 1_786_000_000_000,
          })
        }),
      )
      await importFiles(files)
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error))
    }
  }, [importFiles])

  const search = useCallback(
    async (nextQuery = query) => {
      const cleanQuery = nextQuery.trim()
      const client = clientRef.current
      const index = indexRef.current
      if (!cleanQuery || !client || !index || index.size === 0) return

      setSearching(true)
      setLastError(null)
      try {
        const { value: embedding, elapsedMs } = await client.embedText(cleanQuery)
        const searchStarted = performance.now()
        const results = index.search(embedding, Math.min(48, index.size))
        setSearchMs(performance.now() - searchStarted)
        setTextInferenceMs(elapsedMs)
        setScores(new Map(results.map((result) => [result.id, result.score])))
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error))
      } finally {
        setSearching(false)
      }
    },
    [query],
  )

  const resetSearch = useCallback(() => {
    setQuery('')
    setScores(new Map())
    setSearchMs(null)
    setTextInferenceMs(null)
  }, [])

  const removePhoto = useCallback(
    async (id: string) => {
      await deleteStoredPhoto(id)
      setScores((current) => {
        const next = new Map(current)
        next.delete(id)
        return next
      })
      await refreshPhotos()
    },
    [refreshPhotos],
  )

  const clearPhotos = useCallback(async () => {
    await clearStoredPhotos()
    resetSearch()
    await refreshPhotos()
  }, [refreshPhotos, resetSearch])

  const metrics: PinholeMetrics = {
    photos: storedPhotos.length,
    compactIndexBytes: storedPhotos.length * (512 + 4),
    avoidedUploadBytes: storedPhotos.reduce((sum, photo) => sum + photo.bytes, 0),
    searchMs,
    textInferenceMs,
    imageInferenceMs,
    backend: indexRef.current?.backend ?? 'starting',
    threads,
  }

  return {
    photos: displayPhotos,
    modelStatus,
    modelProgress,
    query,
    setQuery,
    scoresActive: scores.size > 0,
    searching,
    importing,
    importProgress,
    lastError,
    metrics,
    importFiles,
    loadDemo,
    search,
    resetSearch,
    removePhoto,
    clearPhotos,
  }
}
