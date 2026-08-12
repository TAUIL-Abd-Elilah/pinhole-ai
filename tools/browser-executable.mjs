import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

function addUnder(candidates, root, relativePath) {
  if (root) candidates.push(join(root, relativePath))
}

export function browserExecutablePath() {
  const configured = process.env.CHROME_PATH
  if (configured) {
    if (existsSync(configured)) return configured
    throw new Error(`CHROME_PATH does not exist: ${configured}`)
  }

  const candidates = []
  if (process.platform === 'win32') {
    addUnder(candidates, process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe')
    addUnder(candidates, process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe')
    addUnder(candidates, process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')
    addUnder(candidates, process.env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe')
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
    )
  }

  candidates.push(chromium.executablePath())
  const executable = candidates.find((candidate) => existsSync(candidate))
  if (executable) return executable

  throw new Error(
    'No Chromium-family browser found. Install Chrome/Chromium, run ' +
      '`npx playwright-core install chromium`, or set CHROME_PATH.',
  )
}
