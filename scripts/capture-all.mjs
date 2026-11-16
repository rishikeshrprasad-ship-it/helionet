import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Rishikesh\\.gemini\\antigravity\\brain\\fe68668d-d50c-490e-b3fe-b52ca2155e2f'

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '390x844',  width: 390,  height: 844 },
]

async function run() {
  console.log('Starting Vite server programmatically...')
  const server = await createServer({
    server: { port: 5173, host: '127.0.0.1' },
  })
  await server.listen()
  console.log('Vite server running at http://127.0.0.1:5173/')

  console.log('Launching Chrome with WebGL...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
    ],
  })

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n=== Processing Viewport ${vp.name} (${vp.width}x${vp.height}) ===`)
      const page = await browser.newPage()
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })

      // 1. Alert Card Screen (Orbit View)
      console.log('1. Loading Landing and moving to Orbit View...')
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await new Promise((r) => setTimeout(r, 1200))

      // Click "Run the simulation"
      const runBtn = await page.$('button[aria-label="Run the simulation"]')
      if (runBtn) {
        await runBtn.click()
        await new Promise((r) => setTimeout(r, 1500))
      }

      const alertCardPath = path.join(ARTIFACTS_DIR, `alert-card-${vp.name}.png`)
      await page.screenshot({ path: alertCardPath })
      console.log(`Saved: alert-card-${vp.name}.png`)

      // 2. Research Drawer Screen (Agent Audit Log)
      console.log('2. Opening Agent Audit Log Drawer...')
      const drawerBtn = await page.$('button[aria-label="Open agent audit log drawer"]')
      if (drawerBtn) {
        await drawerBtn.click()
        await new Promise((r) => setTimeout(r, 1000))
      }

      const researchDrawerPath = path.join(ARTIFACTS_DIR, `research-drawer-${vp.name}.png`)
      await page.screenshot({ path: researchDrawerPath })
      console.log(`Saved: research-drawer-${vp.name}.png`)

      // Close drawer before opening modal
      const closeDrawerBtn = await page.$('button[aria-label="Close agent drawer"]')
      if (closeDrawerBtn) {
        await closeDrawerBtn.click()
        await new Promise((r) => setTimeout(r, 500))
      }

      // 3. Validation Modal Screen
      console.log('3. Opening Validation Modal...')
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Open validation comparison"]')
        if (btn) btn.click()
      })
      await new Promise((r) => setTimeout(r, 1200))

      const validationModalPath = path.join(ARTIFACTS_DIR, `validation-modal-${vp.name}.png`)
      await page.screenshot({ path: validationModalPath })
      console.log(`Saved: validation-modal-${vp.name}.png`)

      // Close modal
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Close validation modal"]')
        if (btn) btn.click()
      })
      await new Promise((r) => setTimeout(r, 500))

      // 4. About Page Screen
      console.log('4. Navigating to About Page...')
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="View about and credits"]')
        if (btn) {
          btn.click()
        } else {
          window.location.href = '/about'
        }
      })
      await new Promise((r) => setTimeout(r, 1200))

      const aboutPagePath = path.join(ARTIFACTS_DIR, `about-page-${vp.name}.png`)
      await page.screenshot({ path: aboutPagePath })
      console.log(`Saved: about-page-${vp.name}.png`)

      await page.close()
    }
    console.log('\nAll 12 screenshots successfully captured!')
  } finally {
    await browser.close()
    await server.close()
    console.log('Browser and Vite server closed.')
  }
}

run().catch((err) => {
  console.error('Screenshot script failed:', err)
  process.exit(1)
})
