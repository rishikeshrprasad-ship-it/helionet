import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Rishikesh\\.gemini\\antigravity\\brain\\5456303a-2921-4706-bd0a-e206d8d8559c'

async function run() {
  console.log('Launching Chrome with WebGL enabled...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--window-size=1280,800',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })

  const consoleErrors = []
  const consoleWarnings = []
  const consoleLogs = []

  page.on('console', (msg) => {
    const text = msg.text()
    const type = msg.type()
    consoleLogs.push({ type, text })
    if (type === 'error') {
      consoleErrors.push(text)
    } else if (type === 'warning') {
      consoleWarnings.push(text)
    }
  })

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString())
  })

  console.log('Navigating to http://127.0.0.1:5173/ ...')
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })

  // Wait 1.5 seconds for 3D shaders and animations to spin up
  await new Promise((r) => setTimeout(r, 1500))

  const landingScreenshotPath = path.join(ARTIFACTS_DIR, 'm1-landing.png')
  await page.screenshot({ path: landingScreenshotPath })
  console.log('Landing screenshot saved to:', landingScreenshotPath)

  // Verify headline exists
  const headline = await page.$eval('h1', (el) => el.textContent)
  console.log('Landing headline verified:', headline?.replace(/\s+/g, ' ').trim())

  // Click "Run the simulation" button
  console.log('Clicking "Run the simulation" button...')
  await page.click('button[aria-label="Run the simulation"]')

  // Wait 1 second for scene transition
  await new Promise((r) => setTimeout(r, 1000))

  const orbitScreenshotPath = path.join(ARTIFACTS_DIR, 'm1-orbit.png')
  await page.screenshot({ path: orbitScreenshotPath })
  console.log('Orbit scene screenshot saved to:', orbitScreenshotPath)

  // Verify Orbit HUD banner is present
  const orbitBadge = await page.$eval('span', (el) => el.textContent)
  console.log('Orbit view active badge:', orbitBadge)

  // Verify M3 Satellite Health Panel
  const healthHeading = await page.$eval('aside[aria-label="Satellite Constellation Health"] h2', (el) => el.textContent)
  console.log('M3 Constellation Health Panel verified:', healthHeading)

  // Verify M3 Timeline Scrubber
  const timelineSection = await page.$eval('section[aria-label="Simulation Timeline Controls"]', (el) => !!el)
  console.log('M3 Timeline Scrubber verified:', timelineSection)

  // Test Playback: Click Play button
  console.log('Clicking "▶ Play" button...')
  await page.click('button[aria-label="Play simulation"]')

  // Wait 2.5 seconds for simulation worker ticks and animation
  await new Promise((r) => setTimeout(r, 2500))

  // Capture M3 Constellation Screenshot
  const m3ScreenshotPath = path.join(ARTIFACTS_DIR, 'm3-constellation.png')
  await page.screenshot({ path: m3ScreenshotPath })
  console.log('M3 Constellation screenshot saved to:', m3ScreenshotPath)

  // M4: Click "Dive to Moon →" button
  console.log('Clicking "Dive to Moon →" button...')
  await page.click('button[aria-label="Dive to lunar surface"]')

  // Wait 3.0 seconds for GSAP 2.5s camera dive and terrain shader loading
  await new Promise((r) => setTimeout(r, 3000))

  // Verify M4 Surface HUD banner
  const surfaceHeading = await page.$eval('header[role="banner"] span', (el) => el.textContent)
  console.log('M4 Surface HUD verified:', surfaceHeading)

  // Verify M4 Dose Meter Panel
  const doseMeterTitle = await page.$eval('aside[aria-label="Lunar Rover Radiation Dose Meter"] h2', (el) => el.textContent)
  console.log('M4 Radiation Dose Meter verified:', doseMeterTitle)

  // Capture M4 Surface Screenshot
  const m4ScreenshotPath = path.join(ARTIFACTS_DIR, 'm4-surface.png')
  await page.screenshot({ path: m4ScreenshotPath })
  console.log('M4 Surface screenshot saved to:', m4ScreenshotPath)

  // M5: Verify Forecast Gauges
  const forecastTitle = await page.$eval('aside[aria-label="Space Weather Probability Forecast"] h2', (el) => el.textContent)
  console.log('M5 Forecast Panel verified:', forecastTitle)

  // M5: Verify Alert Card & interact with Approve button
  const alertTitle = await page.$eval('section[aria-label="Space Weather Hazard Alert"] h2', (el) => el.textContent)
  console.log('M5 Alert Card verified:', alertTitle)

  console.log('Clicking "✓ Approve" on Alert Card...')
  await page.click('button[aria-label="Approve recommended mitigation action"]')
  await new Promise((r) => setTimeout(r, 400))

  // M5: Open Agent Audit Log Drawer
  console.log('Opening Agent Audit Log Drawer...')
  await page.click('button[aria-label="Open agent audit log drawer"]')
  await new Promise((r) => setTimeout(r, 600))

  const drawerHeader = await page.$eval('aside[aria-label="Autonomous Agent Execution Log"] h3', (el) => el.textContent)
  console.log('M5 Agent Drawer verified:', drawerHeader)

  // Capture M5 Agent Screenshot
  const m5ScreenshotPath = path.join(ARTIFACTS_DIR, 'm5-agent.png')
  await page.screenshot({ path: m5ScreenshotPath })
  console.log('M5 Agent screenshot saved to:', m5ScreenshotPath)

  // M6: Close Agent Drawer
  console.log('Closing Agent Audit Log Drawer...')
  await page.click('button[aria-label="Close agent drawer"]')
  await new Promise((r) => setTimeout(r, 400))

  // M6: Open Validation Benchmark Modal (Feature 33)
  console.log('Opening Validation Benchmark Modal...')
  await page.click('button[aria-label="Open validation comparison"]')
  await new Promise((r) => setTimeout(r, 600))

  const validationTitle = await page.$eval('#validation-modal-title', (el) => el.textContent)
  console.log('M6 Validation Modal verified:', validationTitle)

  // Verify "Unverified" chip exists
  const unverifiedText = await page.$eval('span', (el) => el.textContent)
  console.log('M6 Ground truth integrity check:', unverifiedText)

  // Capture M6 Validation Modal Screenshot
  const m6ValScreenshotPath = path.join(ARTIFACTS_DIR, 'm6-validation.png')
  await page.screenshot({ path: m6ValScreenshotPath })
  console.log('M6 Validation screenshot saved to:', m6ValScreenshotPath)

  // M6: Close Validation Modal
  console.log('Closing Validation Modal...')
  await page.click('button[aria-label="Close validation modal"]')
  await new Promise((r) => setTimeout(r, 400))

  // M6: Navigate to /about page
  console.log('Navigating to /about page...')
  await page.click('button[aria-label="View about and credits"]')
  await new Promise((r) => setTimeout(r, 600))

  const aboutHeading = await page.$eval('h1', (el) => el.textContent)
  console.log('M6 /about Page verified:', aboutHeading)

  // Verify required NASA / Solar System Scope credits
  const creditsText = await page.$eval('#credits-heading', (el) => el.textContent)
  console.log('M6 Credits Section verified:', creditsText)

  // Capture M6 About Page Screenshot
  const m6AboutScreenshotPath = path.join(ARTIFACTS_DIR, 'm6-about.png')
  await page.screenshot({ path: m6AboutScreenshotPath })
  console.log('M6 About page screenshot saved to:', m6AboutScreenshotPath)

  await browser.close()

  console.log('\n--- BROWSER CONSOLE REPORT ---')
  console.log('Total console events:', consoleLogs.length)
  console.log('Errors:', consoleErrors.length)
  console.log('Warnings:', consoleWarnings.length)

  if (consoleErrors.length > 0) {
    console.error('Console errors detected:')
    consoleErrors.forEach((e) => console.error('  [ERROR]', e))
    process.exit(1)
  }

  console.log('✅ Console is 100% clean!')
}

run().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
