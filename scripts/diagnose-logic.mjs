import puppeteer from 'puppeteer-core'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function checkLogic() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader-webgl'],
  })

  const page = await browser.newPage()
  
  const consoleMessages = []
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => consoleMessages.push(`[PAGE_ERROR] ${err.toString()}`))

  console.log('Navigating to http://localhost:5173/...')
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1500))

  console.log('Clicking "Run the simulation"...')
  const runBtn = await page.$('button[aria-label="Run the simulation"]')
  if (runBtn) await runBtn.click()
  await new Promise(r => setTimeout(r, 1000))

  // Check state before play
  const timeInitial = await page.evaluate(() => {
    return document.querySelector('[aria-label="Simulation time scrubber"]')?.getAttribute('aria-valuenow') ||
           document.querySelector('input[type="range"]')?.value ||
           document.body.innerText.match(/T\+\d\d:\d\dh/)?.[0]
  })
  console.log('Initial time:', timeInitial)

  console.log('Clicking Play...')
  const playBtn = await page.$('button[aria-label="Play simulation"]')
  if (playBtn) {
    await playBtn.click()
  } else {
    console.log('Play button not found!')
  }

  // Set speed to 10x
  const speed10x = await page.$('button[aria-label="Set speed to 10x"]')
  if (speed10x) await speed10x.click()

  await new Promise(r => setTimeout(r, 3000))

  const timeAfterPlay = await page.evaluate(() => {
    return document.querySelector('input[type="range"]')?.value ||
           document.body.innerText.match(/T\+\d\d:\d\dh/)?.[0]
  })
  console.log('Time after 3s play at 10x:', timeAfterPlay)

  // Check Satellite counts
  const satCounts = await page.evaluate(() => {
    const text = document.body.innerText
    const match = text.match(/Nominal\s+(\d+)|Lost\s+(\d+)/g)
    return match || 'No sat counts match'
  })
  console.log('Sat counts:', satCounts)

  // Check Forecast values
  const forecastText = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Space weather probability forecast"]')
    return el ? el.innerText : 'Forecast not found'
  })
  console.log('Forecast text:\n', forecastText)

  // Check Alert Card
  const alertText = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Space weather alert card"]')
    return el ? el.innerText : 'Alert card not found'
  })
  console.log('Alert text:\n', alertText)

  console.log('\n--- Console Messages ---')
  console.log(consoleMessages.filter(m => !m.includes('THREE.Clock')).join('\n'))

  await browser.close()
}

checkLogic().catch(console.error)
