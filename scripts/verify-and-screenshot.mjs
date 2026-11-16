import puppeteer from 'puppeteer-core'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const ARTIFACT_DIR = 'C:\\Users\\Rishikesh\\.gemini\\antigravity\\brain\\fe68668d-d50c-490e-b3fe-b52ca2155e2f'
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
  })

  // Wait for server to be responsive
  for (let i = 0; i < 40; i++) {
    await sleep(250)
    try {
      const res = await fetch(BASE_URL)
      if (res.ok) {
        console.log(`Server ready at ${BASE_URL}`)
        return proc
      }
    } catch {
      // ignore
    }
  }
  throw new Error('Vite preview server failed to start')
}

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  }

  const serverProc = await startServer()

  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=angle'],
    })

    const page = await browser.newPage()

    // Helper to evaluate bounding boxes and assert no overlap between visible panels
    async function checkPanelOverlaps(sceneLabel, viewport) {
      const overlaps = await page.evaluate(() => {
        // Find visible panel/HUD elements
        const selectors = [
          'header[role="banner"]',
          'section[aria-label="Space Weather Hazard Alert"]',
          'aside[aria-label="Space Weather Probability Forecast"]',
          'aside[aria-label="Satellite Constellation Health"]',
          'aside[aria-label="Lunar Rover Radiation Dose Meter"]',
          'section[aria-label="Simulation Timeline Controls"]',
          'button[aria-label*="agent audit log drawer"]',
          'aside[aria-label="Space Weather Telemetry Peek Sheet"]',
          'aside[aria-label="Space Weather Telemetry Panel Sheet"]',
        ]

        const elements = []
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          if (el) {
            const rect = el.getBoundingClientRect()
            const style = window.getComputedStyle(el)
            if (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0'
            ) {
              elements.push({
                name: sel,
                domEl: el,
                rect: {
                  top: rect.top,
                  bottom: rect.bottom,
                  left: rect.left,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height,
                },
              })
            }
          }
        }

        const foundOverlaps = []
        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const a = elements[i]
            const b = elements[j]

            // Ignore parent-child ancestor relationships (e.g. tablet header containing agent pill)
            if (a.domEl.contains(b.domEl) || b.domEl.contains(a.domEl)) {
              continue
            }
            const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left))
            const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top))
            const intersectionArea = xOverlap * yOverlap

            if (intersectionArea > 0) {
              foundOverlaps.push({
                a: a.name,
                b: b.name,
                intersectionArea,
                xOverlap,
                yOverlap,
              })
            }
          }
        }

        return {
          elementCount: elements.length,
          elements: elements.map((e) => ({ name: e.name, rect: e.rect })),
          overlaps: foundOverlaps,
        }
      })

      console.log(`[DOM Check] ${sceneLabel} @ ${viewport.width}x${viewport.height}: ${overlaps.elementCount} panels, ${overlaps.overlaps.length} overlaps`)
      if (overlaps.overlaps.length > 0) {
        console.error('OVERLAPS DETECTED:', JSON.stringify(overlaps.overlaps, null, 2))
        throw new Error(`Panel collision detected in ${sceneLabel} at ${viewport.width}x${viewport.height}`)
      }
      return overlaps
    }

    // Viewports
    const VIEWPORTS = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 1024, height: 768 },
      { name: 'phone', width: 390, height: 844 },
    ]

    console.log('\n--- 1. Testing Orbit and Surface Scene Layouts & Overlaps ---')
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 })

      // Orbit Scene
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
      // Run simulation from landing if needed
      await page.evaluate(() => {
        window.__HELIO_STORE__?.getState()?.setScene('orbit')
      })
      await sleep(600)
      await checkPanelOverlaps('Orbit Scene', vp)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `scene-orbit-${vp.width}x${vp.height}.png`),
      })

      // Surface Scene
      await page.evaluate(() => {
        window.__HELIO_STORE__?.getState()?.setScene('surface')
      })
      await sleep(600)
      await checkPanelOverlaps('Surface Scene', vp)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `scene-surface-${vp.width}x${vp.height}.png`),
      })
    }

    console.log('\n--- 2. Phone Bottom Sheet Snap States (peek, half, hidden) ---')
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
    await page.evaluate(() => {
      window.__HELIO_STORE__?.getState()?.setScene('orbit')
    })
    await sleep(400)

    // Peek (default)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phone-sheet-peek-390x844.png') })

    // Half
    const expandBtn = await page.$('aside[aria-label="Space Weather Telemetry Peek Sheet"] div[role="button"]')
    if (expandBtn) await expandBtn.click()
    await sleep(400)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phone-sheet-half-390x844.png') })

    // Hidden
    const hideBtn = await page.$('button[aria-label="Hide panel completely"]')
    if (hideBtn) await hideBtn.click()
    await sleep(400)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phone-sheet-hidden-390x844.png') })

    console.log('\n--- 3. AlertCard Statuses (CONFIRMED, WATCH, RESOLVED, FALSE_ALARM) ---')
    const ALERT_STATUSES = ['CONFIRMED', 'WATCH', 'RESOLVED', 'FALSE_ALARM']
    for (const status of ALERT_STATUSES) {
      for (const width of [1440, 390]) {
        const height = width === 1440 ? 900 : 844
        await page.setViewport({ width, height, deviceScaleFactor: 2 })
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
        await page.evaluate((st) => {
          const store = window.__HELIO_STORE__?.getState()
          if (store) {
            store.setScene('orbit')
            store.setAlert({
              visible: true,
              status: st,
              event: 'Illustrative replay inspired by the February 2022 storm',
              probability: st === 'CONFIRMED' ? 0.95 : st === 'WATCH' ? 0.86 : 0.2,
              leadTime: 18.0,
            })
          }
        }, status)
        await sleep(500)
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, `alert-status-${status.toLowerCase()}-${width}x${height}.png`),
        })
      }
    }

    console.log('\n--- 4. Agent Drawer (Open) at 1440, 1024, 390 ---')
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 })
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
      await page.evaluate(() => {
        const store = window.__HELIO_STORE__?.getState()
        if (store) {
          store.setScene('orbit')
          store.setAgentLog({ drawerOpen: true })
        }
      })
      await sleep(600)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `agent-drawer-open-${vp.width}x${vp.height}.png`),
      })
    }

    console.log('\n--- 5. Validation Modal (both events) at 1440, 1024, 390 ---')
    for (const ev of ['feb2022', 'may2024']) {
      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 })
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
        await page.evaluate((evt) => {
          const store = window.__HELIO_STORE__?.getState()
          if (store) {
            store.setScene('orbit')
            store.setValidationEvent(evt)
            store.setValidationOpen(true)
          }
        }, ev)
        await sleep(800)
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, `validation-modal-${ev}-${vp.width}x${vp.height}.png`),
        })
      }
    }

    console.log('\n--- 6. 2D Fallback Telemetry View (?nowebgl=1) at 1440, 1024, 390 ---')
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 })
      await page.goto(`${BASE_URL}/?nowebgl=1`, { waitUntil: 'networkidle0' })
      await sleep(600)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `nowebgl-fallback-${vp.width}x${vp.height}.png`),
      })
    }

    console.log('\n--- 7. About Page at 1440, 1024, 390 ---')
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 })
      await page.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle0' })
      await sleep(600)
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `about-page-nav-${vp.width}x${vp.height}.png`),
      })
    }

    console.log('\nALL CHECKS AND SCREENSHOTS COMPLETED SUCCESSFULLY!')
  } finally {
    if (browser) await browser.close()
    serverProc.kill()
  }
}

main().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
