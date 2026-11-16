import puppeteer from 'puppeteer-core'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function debug() {
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
  await page.setViewport({ width: 1280, height: 800 })

  page.on('console', (msg) => {
    console.log('[BROWSER]', msg.type(), msg.text())
  })
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err)
  })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1500))

  await page.click('button[aria-label="Run the simulation"]')
  await new Promise((r) => setTimeout(r, 1000))

  await page.click('button[aria-label="Play simulation"]')

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const state = await page.evaluate(() => {
      const gl = (window).__THREE_DEVTOOLS__ || null
      const canvas = document.querySelector('canvas')
      return {
        canvasExists: !!canvas,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
      }
    })
    console.log(`Step ${i}:`, state)
  }

  await browser.close()
}

debug().catch(console.error)
