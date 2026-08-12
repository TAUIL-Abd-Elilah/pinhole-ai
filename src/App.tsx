import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import { usePinhole, type DisplayPhoto } from './hooks/usePinhole.ts'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(milliseconds: number | null): string {
  if (milliseconds === null) return '—'
  return milliseconds < 1 ? `${Math.round(milliseconds * 1000)} µs` : `${milliseconds.toFixed(1)} ms`
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="m15.2 15.2 4.3 4.3" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11m0-11L7.5 8.5M12 4l4.5 4.5" />
      <path d="M5 14.5V20h14v-5.5" />
    </svg>
  )
}

function PhotoCard({
  photo,
  rank,
  scoresActive,
  onRemove,
}: {
  photo: DisplayPhoto
  rank: number
  scoresActive: boolean
  onRemove: (id: string) => void
}) {
  const percentage = photo.score === undefined ? null : Math.max(0, Math.min(99, photo.score * 100))
  const accessibleName = photo.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  return (
    <figure
      className="photo-card"
      data-rank={rank}
      data-searching={scoresActive ? 'true' : 'false'}
      style={{ '--rank-delay': `${Math.min(rank, 12) * 18}ms` } as React.CSSProperties}
    >
      <div className="photo-frame">
        <img src={photo.url} alt={accessibleName} />
        <button
          className="remove-photo"
          type="button"
          aria-label={`Remove ${photo.name}`}
          onClick={() => onRemove(photo.id)}
        >
          ×
        </button>
      </div>
      <figcaption>
        <span>{photo.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}</span>
        {percentage !== null && <strong>{percentage.toFixed(0)}%</strong>}
      </figcaption>
    </figure>
  )
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const contactSheetRef = useRef<HTMLElement>(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const {
    photos,
    modelStatus,
    modelProgress,
    query,
    setQuery,
    scoresActive,
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
  } = usePinhole()

  useEffect(() => {
    const updateNetworkState = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateNetworkState)
    window.addEventListener('offline', updateNetworkState)
    return () => {
      window.removeEventListener('online', updateNetworkState)
      window.removeEventListener('offline', updateNetworkState)
    }
  }, [])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    void search().then(() => {
      if (window.matchMedia('(max-width: 760px)').matches) {
        contactSheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const modelLabel =
    modelStatus === 'ready'
      ? isOnline
        ? `Local AI ready · ${metrics.threads ?? 1} thread${metrics.threads === 1 ? '' : 's'}`
        : 'Offline · local search active'
      : modelStatus === 'error'
        ? 'Local AI needs attention'
        : `Loading ${modelProgress.file} · ${modelProgress.progress.toFixed(0)}%`
  const offlineReady = !isOnline && modelStatus === 'ready'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="Pinhole home">
          <span className="aperture-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          <span>pinhole</span>
        </a>
        <a
          className="challenge-label"
          href="https://github.com/TAUIL-Abd-Elilah/pinhole-ai#measured-on-arm"
          target="_blank"
          rel="noreferrer"
          aria-label="View measured Arm64 optimization evidence"
        >
          Arm Mobile AI · evidence ↗
        </a>
        <div
          className={`engine-state engine-state--${offlineReady ? 'offline' : modelStatus}`}
          role="status"
          aria-live="polite"
          title={
            offlineReady
              ? `Browser networking is unavailable; local AI remains active with ${metrics.threads ?? 1} thread${metrics.threads === 1 ? '' : 's'}`
              : undefined
          }
        >
          <span />
          {modelLabel}
        </div>
      </header>

      <section className="workspace">
        <aside className="control-room">
          <div className="control-copy">
            <p className="eyebrow">Your camera roll stays yours</p>
            <h1>Find the photo<br />you remember.</h1>
            <p className="lede">
              Describe a moment. Pinhole finds it on this device—without an upload,
              an account, or a cloud.
            </p>
          </div>

          <form className="search-box" onSubmit={submitSearch} data-active={scoresActive}>
            <SearchIcon />
            <label htmlFor="photo-search">Describe what you remember</label>
            <input
              id="photo-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="a red bicycle near the sea"
              autoComplete="off"
              disabled={photos.length === 0}
            />
            <button
              type="submit"
              disabled={!query.trim() || photos.length === 0 || searching || modelStatus !== 'ready'}
            >
              {searching ? 'Finding…' : 'Find it'}
            </button>
            {scoresActive && (
              <button className="clear-query" type="button" onClick={resetSearch}>
                Show all
              </button>
            )}
          </form>

          <div className="import-actions">
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              multiple
              aria-label="Choose photos to index"
              onChange={(event) => {
                void importFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
            <button
              className="primary-action"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={importing || modelStatus !== 'ready'}
            >
              <ImportIcon />
              {importing ? `Indexing ${importProgress.current}/${importProgress.total}` : 'Choose photos'}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void loadDemo()}
              disabled={importing || modelStatus !== 'ready'}
            >
              Load demo roll
            </button>
          </div>

          {importing && (
            <div className="import-progress" aria-live="polite">
              <span style={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }} />
              <p>Developing {importProgress.name}</p>
            </div>
          )}

          {lastError && <div className="error-message" role="alert">{lastError}</div>}

          <dl className="instrument-strip" aria-label="Live local metrics">
            <div>
              <dt>Photos here</dt>
              <dd>{metrics.photos}</dd>
            </div>
            <div>
              <dt>Index</dt>
              <dd>{formatBytes(metrics.compactIndexBytes)}</dd>
            </div>
            <div>
              <dt>Vector search</dt>
              <dd>{formatTime(metrics.searchMs)}</dd>
            </div>
            <div>
              <dt>Text encoder</dt>
              <dd
                title={metrics.textCacheHit ? 'Repeated query served from the in-memory embedding cache' : undefined}
              >
                {metrics.textCacheHit ? 'cached' : formatTime(metrics.textInferenceMs)}
              </dd>
            </div>
          </dl>

          <div className="privacy-proof">
            <div className="privacy-orbit" aria-hidden="true"><span /></div>
            <p><strong>{formatBytes(metrics.avoidedUploadBytes)}</strong> not sent to an AI API</p>
            <small>INT8 TinyCLIP · {metrics.backend.replace('-', ' ')} · IndexedDB only</small>
          </div>
        </aside>

        <section
          ref={contactSheetRef}
          className="contact-sheet"
          aria-label="Your local photo index"
        >
          <div className="sheet-header">
            <div>
              <p>{scoresActive ? 'Closest moments' : 'Local contact sheet'}</p>
              <span>{scoresActive ? `“${query}”` : 'Newest first · thumbnails stay on this device'}</span>
            </div>
            {photos.length > 0 && (
              <button type="button" onClick={() => void clearPhotos()}>Clear local index</button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="empty-sheet">
              <div className="empty-frames" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <div>
                <p>No photos indexed yet.</p>
                <span>Choose a few photos or load the public demo roll. Originals are never stored.</span>
              </div>
            </div>
          ) : (
            <div className="photo-grid" data-results={scoresActive ? 'ranked' : 'all'}>
              {photos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  rank={index}
                  scoresActive={scoresActive}
                  onRemove={(id) => void removePhoto(id)}
                />
              ))}
            </div>
          )}

          <footer className="sheet-footer">
            <span>Inference boundary</span>
            <strong>browser ⟶ nowhere</strong>
            <span>Designed for Arm64 Android</span>
          </footer>
        </section>
      </section>
    </main>
  )
}

export default App
