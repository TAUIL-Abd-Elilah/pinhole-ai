import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isolationReloadKey = 'pinhole-isolation-reload'

async function prepareCrossOriginIsolation(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
  } catch {
    return
  }
  if (window.crossOriginIsolated) {
    sessionStorage.removeItem(isolationReloadKey)
    return
  }
  if (sessionStorage.getItem(isolationReloadKey) === 'done') return

  await new Promise<void>((resolve) => {
    const requestIsolationStatus = () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'pinhole-isolation-status' })
    }
    const finishWithoutIsolation = () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', requestIsolationStatus)
      resolve()
    }
    const timeout = window.setTimeout(finishWithoutIsolation, 8000)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'pinhole-isolation-ready') return
      window.clearTimeout(timeout)
      sessionStorage.setItem(isolationReloadKey, 'done')
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    navigator.serviceWorker.addEventListener('controllerchange', requestIsolationStatus)
    requestIsolationStatus()
  })
}

const root = document.getElementById('root')!
root.innerHTML = '<p class="boot-state" role="status">Preparing private local AIâ€¦</p>'

void prepareCrossOriginIsolation().then(() => {
  root.replaceChildren()
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
