import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { QuantizedEmbedding } from './embedding.ts'

export interface StoredPhoto {
  id: string
  name: string
  type: string
  width: number
  height: number
  bytes: number
  importedAt: number
  sourceModifiedAt: number
  thumbnail: Blob
  embedding: ArrayBuffer
  embeddingScale: number
}

interface PinholeDatabase extends DBSchema {
  photos: {
    key: string
    value: StoredPhoto
    indexes: { 'by-imported-at': number }
  }
}

let databasePromise: Promise<IDBPDatabase<PinholeDatabase>> | null = null

function getDatabase(): Promise<IDBPDatabase<PinholeDatabase>> {
  databasePromise ??= openDB<PinholeDatabase>('pinhole-private-index', 1, {
    upgrade(database) {
      const photos = database.createObjectStore('photos', { keyPath: 'id' })
      photos.createIndex('by-imported-at', 'importedAt')
    },
  })
  return databasePromise
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  const database = await getDatabase()
  return database.getAllFromIndex('photos', 'by-imported-at')
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const database = await getDatabase()
  await database.put('photos', photo)
}

export async function deletePhoto(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('photos', id)
}

export async function clearPhotos(): Promise<void> {
  const database = await getDatabase()
  await database.clear('photos')
}

export function storedEmbedding(photo: StoredPhoto): QuantizedEmbedding {
  return {
    values: new Int8Array(photo.embedding),
    scale: photo.embeddingScale,
  }
}

export async function fileIdentity(file: File): Promise<string> {
  const fingerprint = new TextEncoder().encode(
    `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`,
  )
  const digest = await crypto.subtle.digest('SHA-256', fingerprint)
  return Array.from(new Uint8Array(digest).slice(0, 12), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}
