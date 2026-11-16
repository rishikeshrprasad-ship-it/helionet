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
  { name: '390x844',  width: 390,  height: 844 },
]

async function run() {
  console.log('Starting Vite server programmatically...')
  const server = await createServer({
    server: { port: 5174, host: '127.0.0.1' },
  })
  await server.listen()
  console.log('Vite server running at http://127.0.0.1:5174/')

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
      console.log(`\n=== Capturing Landing at ${vp.name} (${vp.width}x${vp.height}) ===`)
      const page = await browser.newPage()
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })

      await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      
      if (vp.width === 390) {
        // Save loading screen snapshot around 300ms
        await new Promise((r) => setTimeout(r, 250))
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'loading-screen-390x844.png') })
        console.log('Saved: loading-screen-390x844.png')
        // Wait for full load and transition
        await new Promise((r) => setTimeout(r, 2000))
      } else {
        // Wait for loading screen to complete (at least 600ms) + scene render
        await new Promise((r) => setTimeout(r, 2200))
      }

      const landingPath = path.join(ARTIFACTS_DIR, `landing-flat-${vp.name}.png`)
      await page.screenshot({ path: landingPath })
      console.log(`Saved: landing-flat-${vp.name}.png`)

      await page.close()
    }
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    await server.close()
    console.log('Done.')
  }
}

run()
