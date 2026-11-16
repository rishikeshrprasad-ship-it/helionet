import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const BASE_URL = 'http://localhost:5173'
const OUTPUT_DIR = path.resolve('docs/ui-capture')
const JPEG_DIR = path.join(OUTPUT_DIR, 'jpeg')
const SHEET_DIR = path.join(OUTPUT_DIR, 'contact-sheets')
const ZIP_PATH = path.resolve('docs/ui-capture.zip')

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'tablet', width: 1024, height: 768, isMobile: false, hasTouch: false },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
]

const PHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('Could not locate Chrome or Edge executable on this machine.')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function checkServerUp() {
  const res = await fetch(BASE_URL)
  if (!res.ok) {
    throw new Error(`App at ${BASE_URL} responded with HTTP ${res.status}`)
  }
  console.log(`[Setup] Confirmed app responding at ${BASE_URL} (HTTP ${res.status})`)
}

function ensureDirs() {
  for (const d of [OUTPUT_DIR, JPEG_DIR, SHEET_DIR]) {
    fs.mkdirSync(d, { recursive: true })
  }
}

/**
 * Helper page evaluates blankness (>2% pixels != #0E0F12) and converts PNG -> JPEG (< 1 MB).
 */
async function processImage(helperPage, pngPath, jpegPath) {
  const b64 = fs.readFileSync(pngPath).toString('base64')
  const dataUrl = `data:image/png;base64,${b64}`

  const result = await helperPage.evaluate(async (url) => {
    const img = new Image()
    img.src = url
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const totalPixels = canvas.width * canvas.height
    let nonBgCount = 0

    // Background is #0E0F12 -> rgb(14, 15, 18)
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i]
      const g = imgData[i + 1]
      const b = imgData[i + 2]
      if (Math.abs(r - 14) > 5 || Math.abs(g - 15) > 5 || Math.abs(b - 18) > 5) {
        nonBgCount++
      }
    }

    const diffPct = (nonBgCount / totalPixels) * 100
    const jpegUrl85 = canvas.toDataURL('image/jpeg', 0.85)
    const jpegUrl70 = canvas.toDataURL('image/jpeg', 0.70)
    return {
      width: img.width,
      height: img.height,
      diffPct,
      isBlank: diffPct <= 2.0,
      jpegBase64_85: jpegUrl85.split(',')[1],
      jpegBase64_70: jpegUrl70.split(',')[1],
    }
  }, dataUrl)

  let jpgBuf = Buffer.from(result.jpegBase64_85, 'base64')
  if (jpgBuf.length > 1024 * 1024) {
    jpgBuf = Buffer.from(result.jpegBase64_70, 'base64')
  }
  fs.writeFileSync(jpegPath, jpgBuf)

  return {
    isBlank: result.isBlank,
    diffPct: Number(result.diffPct.toFixed(2)),
    jpegBytes: jpgBuf.length,
  }
}

/**
 * Capture screenshot with blank retry up to 3 times.
 */
async function captureAndVerify({
  page,
  helperPage,
  fileName,
  stepNum,
  section,
  state,
  simHour,
  viewportName,
  route,
  description,
  clipElementSelector = null,
  fullPage = false,
  waitMs = 1500,
  stepConsoleMessages,
  manifestRows,
}) {
  const pngPath = path.join(OUTPUT_DIR, fileName)
  const jpegName = fileName.replace(/\.png$/i, '.jpg')
  const jpegPath = path.join(JPEG_DIR, jpegName)

  if (waitMs > 0) {
    await sleep(waitMs)
  }

  let check = null
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (clipElementSelector) {
      const el = await page.$(clipElementSelector)
      if (!el) {
        console.warn(`[Warn] Selector not found for crop: ${clipElementSelector} (${fileName})`)
        await page.screenshot({ path: pngPath, fullPage })
      } else {
        const box = await el.boundingBox()
        if (!box || box.width <= 1 || box.height <= 1) {
          console.warn(`[Warn] Zero-size bounding box for ${clipElementSelector} (${fileName})`)
          await page.screenshot({ path: pngPath, fullPage })
        } else {
          await el.screenshot({ path: pngPath })
        }
      }
    } else {
      await page.screenshot({ path: pngPath, fullPage })
    }

    check = await processImage(helperPage, pngPath, jpegPath)
    if (!check.isBlank || attempt === 4) {
      break
    }
    console.warn(`[Retry ${attempt}/3] ${fileName} looked blank (${check.diffPct}% non-bg). Waiting 1500ms...`)
    await sleep(1500)
  }

  const statusFlag = check.isBlank ? 'BLANK' : 'OK'
  console.log(`[Captured] ${fileName} | ${statusFlag} (${check.diffPct}% non-#0E0F12) | JPG ${(check.jpegBytes / 1024).toFixed(1)} KB`)

  manifestRows.push({
    fileName,
    stepNum,
    section,
    state,
    simHour,
    viewport: viewportName,
    route,
    description,
    blankStatus: statusFlag,
    diffPct: check.diffPct,
    consoleMessages: [...stepConsoleMessages],
  })

  return pngPath
}

async function setupViewport(page, vp) {
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  })
  if (vp.isMobile) {
    await page.setUserAgent(PHONE_UA)
  } else {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    )
  }
}

async function waitForLoadingFinish(page) {
  await page.waitForFunction(
    () => !document.querySelector('div[role="status"][aria-label^="Loading:"]'),
    { timeout: 15000 }
  ).catch(() => {})
}

async function scrubToHour(page, targetHour, currentHour) {
  const diff = Math.round(targetHour - currentHour)
  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      await page.keyboard.press('ArrowRight')
      await sleep(60)
    }
  } else if (diff < 0) {
    for (let i = 0; i < Math.abs(diff); i++) {
      await page.keyboard.press('ArrowLeft')
      await sleep(60)
    }
  }
  return targetHour
}

/**
 * Collect DOM computed styles and visible text labels on desktop views for STYLE_INVENTORY.md.
 */
async function collectComputedStyles(page, viewLabel) {
  return await page.evaluate((viewLabel) => {
    const textColors = {}
    const bgColors = {}
    const borderColors = {}
    const fontFamilies = {}
    const fontSizes = {}
    const smallTexts = []
    const borderRadii = {}
    const boxShadows = {}
    const backdropFilters = {}
    const gradients = {}
    const panelSignatures = {}
    const visibleLabels = new Set()

    function describeEl(el) {
      const tag = el.tagName.toLowerCase()
      const aria = el.getAttribute('aria-label')
      const role = el.getAttribute('role')
      const h2 = el.querySelector('h1, h2, h3')
      const labelPart = aria ? `[aria-label="${aria}"]` : h2 ? `[heading="${h2.textContent.trim().slice(0, 30)}"]` : role ? `[role="${role}"]` : ''
      const idPart = el.id ? `#${el.id}` : ''
      return `${tag}${idPart}${labelPart}`
    }

    function addCount(map, key, comp) {
      if (!key || key === 'none' || key === 'normal' || key === '0px') return
      if (!map[key]) map[key] = { count: 0, components: new Set() }
      map[key].count++
      if (map[key].components.size < 8) map[key].components.add(comp)
    }

    const all = document.querySelectorAll('*')
    for (const el of all) {
      if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'HTML', 'NOSCRIPT', 'BR'].includes(el.tagName)) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue

      const comp = describeEl(el)

      // Colors
      textColors[cs.color] = (textColors[cs.color] || 0) + 1
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
        bgColors[cs.backgroundColor] = (bgColors[cs.backgroundColor] || 0) + 1
      }
      if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') {
        borderColors[cs.borderTopColor] = (borderColors[cs.borderTopColor] || 0) + 1
      }

      // Fonts
      fontFamilies[cs.fontFamily] = (fontFamilies[cs.fontFamily] || 0) + 1
      fontSizes[cs.fontSize] = (fontSizes[cs.fontSize] || 0) + 1

      const px = parseFloat(cs.fontSize)
      // Check direct text content
      let directText = ''
      for (const n of el.childNodes) {
        if (n.nodeType === 3) directText += n.textContent
      }
      directText = directText.trim()
      if (directText.length > 0) {
        visibleLabels.add(directText)
        if (px < 12) {
          smallTexts.push({ size: cs.fontSize, text: directText.slice(0, 60), component: comp })
        }
      }

      // Radii, shadows, backdrop, gradients
      if (cs.borderRadius && cs.borderRadius !== '0px') addCount(borderRadii, cs.borderRadius, comp)
      if (cs.boxShadow && cs.boxShadow !== 'none') addCount(boxShadows, cs.boxShadow, comp)
      const bf = cs.backdropFilter || cs.webkitBackdropFilter
      if (bf && bf !== 'none') addCount(backdropFilters, bf, comp)
      if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
        addCount(gradients, cs.backgroundImage, comp)
      }

      // Panel sameness check
      if (['ASIDE', 'SECTION', 'DIV', 'NAV'].includes(el.tagName) && rect.width > 160 && rect.height > 60) {
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.borderTopWidth !== '0px' && cs.borderRadius !== '0px') {
          const sig = `radius=${cs.borderRadius} | border=${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor} | bg=${cs.backgroundColor}`
          if (!panelSignatures[sig]) panelSignatures[sig] = []
          panelSignatures[sig].push(comp)
        }
      }
    }

    const serializeMap = (m) => {
      const out = {}
      for (const [k, v] of Object.entries(m)) {
        out[k] = { count: v.count, components: [...v.components] }
      }
      return out
    }

    return {
      viewLabel,
      textColors,
      bgColors,
      borderColors,
      fontFamilies,
      fontSizes,
      smallTexts,
      borderRadii: serializeMap(borderRadii),
      boxShadows: serializeMap(boxShadows),
      backdropFilters: serializeMap(backdropFilters),
      gradients: serializeMap(gradients),
      panelSignatures,
      visibleLabels: [...visibleLabels],
    }
  }, viewLabel)
}

function mergeStyleInventories(snapshots) {
  const agg = {
    textColors: {},
    bgColors: {},
    borderColors: {},
    fontFamilies: {},
    fontSizes: {},
    smallTexts: [],
    borderRadii: {},
    boxShadows: {},
    backdropFilters: {},
    gradients: {},
    panelSignatures: {},
    labelsBySection: {},
  }

  for (const snap of snapshots) {
    for (const [k, v] of Object.entries(snap.textColors)) agg.textColors[k] = (agg.textColors[k] || 0) + v
    for (const [k, v] of Object.entries(snap.bgColors)) agg.bgColors[k] = (agg.bgColors[k] || 0) + v
    for (const [k, v] of Object.entries(snap.borderColors)) agg.borderColors[k] = (agg.borderColors[k] || 0) + v
    for (const [k, v] of Object.entries(snap.fontFamilies)) agg.fontFamilies[k] = (agg.fontFamilies[k] || 0) + v
    for (const [k, v] of Object.entries(snap.fontSizes)) agg.fontSizes[k] = (agg.fontSizes[k] || 0) + v
    for (const st of snap.smallTexts) agg.smallTexts.push({ ...st, view: snap.viewLabel })

    for (const key of ['borderRadii', 'boxShadows', 'backdropFilters', 'gradients']) {
      for (const [val, info] of Object.entries(snap[key])) {
        if (!agg[key][val]) agg[key][val] = { count: 0, components: new Set() }
        agg[key][val].count += info.count
        for (const c of info.components) agg[key][val].components.add(c)
      }
    }

    for (const [sig, comps] of Object.entries(snap.panelSignatures)) {
      if (!agg.panelSignatures[sig]) agg.panelSignatures[sig] = new Set()
      for (const c of comps) agg.panelSignatures[sig].add(`${snap.viewLabel}: ${c}`)
    }

    agg.labelsBySection[snap.viewLabel] = snap.visibleLabels
  }
  return agg
}

function writeStyleInventory(agg) {
  const lines = []
  lines.push('# HelioNet Desktop UI Style Inventory')
  lines.push('')
  lines.push('Extracted automatically from live computed styles (`getComputedStyle`) across desktop (1440x900) views.')
  lines.push('')

  const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])

  lines.push('## 1. Distinct Colours (with Element Counts)')
  lines.push('')
  lines.push('### Text Colours (`color`)')
  lines.push('| Computed Colour | Count |')
  lines.push('| :--- | ---: |')
  for (const [c, n] of sortDesc(agg.textColors)) lines.push(`| \`${c}\` | ${n} |`)
  lines.push('')

  lines.push('### Background Colours (`backgroundColor`)')
  lines.push('| Computed Colour | Count |')
  lines.push('| :--- | ---: |')
  for (const [c, n] of sortDesc(agg.bgColors)) lines.push(`| \`${c}\` | ${n} |`)
  lines.push('')

  lines.push('### Border Colours (`borderTopColor`)')
  lines.push('| Computed Colour | Count |')
  lines.push('| :--- | ---: |')
  for (const [c, n] of sortDesc(agg.borderColors)) lines.push(`| \`${c}\` | ${n} |`)
  lines.push('')

  lines.push('## 2. Typography: Font Families & Sizes')
  lines.push('')
  lines.push('### Font Families')
  lines.push('| Font Family | Count |')
  lines.push('| :--- | ---: |')
  for (const [f, n] of sortDesc(agg.fontFamilies)) lines.push(`| \`${f}\` | ${n} |`)
  lines.push('')

  lines.push('### Font Sizes')
  lines.push('| Font Size | Count |')
  lines.push('| :--- | ---: |')
  for (const [s, n] of sortDesc(agg.fontSizes)) lines.push(`| \`${s}\` | ${n} |`)
  lines.push('')

  lines.push('### Text Smaller Than 12px')
  if (agg.smallTexts.length === 0) {
    lines.push('None detected across inspected desktop views.')
  } else {
    lines.push('| View | Font Size | Component | Sample Text |')
    lines.push('| :--- | :--- | :--- | :--- |')
    for (const item of agg.smallTexts) {
      lines.push(`| ${item.view} | \`${item.size}\` | \`${item.component}\` | ${item.text.replace(/\|/g, '\\|')} |`)
    }
  }
  lines.push('')

  const writeDetailMap = (title, map) => {
    lines.push(`### ${title}`)
    const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count)
    if (entries.length === 0) {
      lines.push('None detected.')
    } else {
      lines.push('| Value | Count | Sample Components |')
      lines.push('| :--- | ---: | :--- |')
      for (const [val, info] of entries) {
        lines.push(`| \`${val.replace(/\|/g, '\\|')}\` | ${info.count} | ${[...info.components].slice(0, 4).join(', ')} |`)
      }
    }
    lines.push('')
  }

  lines.push('## 3. Radii, Shadows, Blurs & Gradients')
  lines.push('')
  writeDetailMap('Border Radii', agg.borderRadii)
  writeDetailMap('Box Shadows', agg.boxShadows)
  writeDetailMap('Backdrop Filters (Blur)', agg.backdropFilters)
  writeDetailMap('Gradients', agg.gradients)

  lines.push('## 4. Panel Sameness Audit (Identical Radius + Border + Background)')
  lines.push('')
  lines.push('| Signature (`radius | border | bg`) | Matching Panel Count | Components |')
  lines.push('| :--- | ---: | :--- |')
  const sigEntries = Object.entries(agg.panelSignatures).sort((a, b) => b[1].size - a[1].size)
  for (const [sig, comps] of sigEntries) {
    lines.push(`| \`${sig}\` | ${comps.size} | ${[...comps].slice(0, 6).join('; ')} |`)
  }
  lines.push('')

  lines.push('## 5. Multi-Meaning Colour Audit')
  lines.push('')
  lines.push('| Colour / Token | Observed Meanings Across UI |')
  lines.push('| :--- | :--- |')
  lines.push('| **Amber (`#F2A33A` / `rgb(242, 163, 58)`)** | Primary CTA button ("Run the simulation"), "ORBIT VIEW" badge, `WATCH` alert status dot, `ILLUSTRATIVE MODEL` & `Illustrative data` badges, Timeline scrubber accent, Flare Class badge (A/B/C/M), Dose Meter elevated warning (>45%), Dijkstra rerouting status, Agent step icon (`⚡`), Sun / warning accents |')
  lines.push('| **Red-Orange (`#E5533D` / `rgb(229, 83, 61)`)** | `CONFIRMED` alert status dot, X-class flare badge, Dose Meter high warning (>80%), Lost satellite indicator, Storm hazard badge |')
  lines.push('| **Slate Blue (`#7FA6C9` / `rgb(127, 166, 201)`)** | "Dive to Moon →" / Surface View badge, Active satellite links count, Sky-View Factor metric, Terrain / Rover path |')
  lines.push('| **Moss Green (`#7BAE7F` / `rgb(123, 174, 127)`)** | `RESOLVED` status dot, `SHELTERED` status badge, Nominal satellite count, `Optimal` network status, `ONNX MODEL` badge |')
  lines.push('')

  lines.push('## 6. Visible Text Labels by Section (Exact Copy)')
  lines.push('')
  for (const [sec, labels] of Object.entries(agg.labelsBySection)) {
    lines.push(`### ${sec}`)
    for (const lbl of labels) {
      lines.push(`- ${JSON.stringify(lbl)}`)
    }
    lines.push('')
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'STYLE_INVENTORY.md'), lines.join('\n'), 'utf8')
  console.log(`[Style Inventory] Written docs/ui-capture/STYLE_INVENTORY.md`)
}

async function generateContactSheets(browser, manifestRows) {
  console.log('\n[Generating Contact Sheets]')
  const groups = new Map()
  for (const row of manifestRows) {
    const key = `${row.stepNum}_${row.section}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  for (const [key, items] of groups.entries()) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
    const cardsHtml = items
      .map((item) => {
        const imgPath = path.join(OUTPUT_DIR, item.fileName)
        const b64 = fs.readFileSync(imgPath).toString('base64')
        return `
          <div class="card">
            <div class="meta">
              <strong>${item.fileName}</strong><br/>
              <span>${item.state} | ${item.viewport} | ${item.simHour !== null ? `Hour ${item.simHour}` : 'N/A'} | ${item.blankStatus}</span>
            </div>
            <img src="data:image/png;base64,${b64}" />
          </div>
        `
      })
      .join('\n')

    const cols = Math.min(items.length, 3)
    const html = `
      <!doctype html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 20px; background: #0E0F12; color: #E8E6E1; font-family: monospace; }
          h2 { margin: 0 0 16px 0; font-size: 16px; color: #F2A33A; }
          .grid { display: grid; grid-template-columns: repeat(${cols}, minmax(260px, 1fr)); gap: 16px; align-items: start; }
          .card { background: #16181D; border: 1px solid #2A2D34; border-radius: 8px; padding: 10px; }
          .meta { font-size: 11px; margin-bottom: 8px; line-height: 1.4; color: #8B8F98; word-break: break-word; }
          .meta strong { color: #E8E6E1; font-size: 12px; }
          img { width: 100%; height: auto; display: block; border-radius: 4px; border: 1px solid #2A2D34; }
        </style>
      </head>
      <body>
        <h2>Step ${key.replace('_', ': ')}</h2>
        <div class="grid">${cardsHtml}</div>
      </body>
      </html>
    `
    const sheetPage = await browser.newPage()
    try {
      await sheetPage.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
      await sheetPage.setContent(html, { waitUntil: 'domcontentloaded' })
      await sheetPage.evaluate(async () => {
        await Promise.all(
          Array.from(document.images).map((img) =>
            img.decode ? img.decode().catch(() => {}) : Promise.resolve()
          )
        )
      })
      const sheetPngPath = path.join(SHEET_DIR, `sheet_${safeKey}.png`)
      await sheetPage.screenshot({ path: sheetPngPath, fullPage: true })

      const stat = fs.statSync(sheetPngPath)
      if (stat.size > 2 * 1024 * 1024) {
        const sheetJpgPath = path.join(SHEET_DIR, `sheet_${safeKey}.jpg`)
        await sheetPage.screenshot({ path: sheetJpgPath, fullPage: true, type: 'jpeg', quality: 85 })
        fs.unlinkSync(sheetPngPath)
        console.log(`[Sheet] sheet_${safeKey}.jpg (PNG exceeded 2 MB -> JPEG ${(fs.statSync(sheetJpgPath).size / 1024).toFixed(1)} KB)`)
      } else {
        console.log(`[Sheet] sheet_${safeKey}.png (${(stat.size / 1024).toFixed(1)} KB)`)
      }
    } finally {
      await sheetPage.close()
    }
  }
}

async function run() {
  await checkServerUp()
  ensureDirs()

  const browserExe = findBrowserExecutable()
  console.log(`[Setup] Using browser: ${browserExe}`)

  const browser = await puppeteer.launch({
    executablePath: browserExe,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
    ],
  })

  const helperPage = await browser.newPage()
  const page = await browser.newPage()

  let currentStepLabel = 'init'
  let stepConsoleMessages = []
  const allConsoleMessages = []

  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      const text = msg.text()
      const entry = { step: currentStepLabel, type, text }
      stepConsoleMessages.push(`[${type.toUpperCase()}] ${text}`)
      allConsoleMessages.push(entry)
    }
  })

  page.on('pageerror', (err) => {
    const entry = { step: currentStepLabel, type: 'pageerror', text: err.toString() }
    stepConsoleMessages.push(`[PAGEERROR] ${err.toString()}`)
    allConsoleMessages.push(entry)
  })

  const manifestRows = []
  const notReachableList = []
  const styleSnapshots = []

  const setStep = (label) => {
    currentStepLabel = label
    stepConsoleMessages = []
  }

  try {
    // =========================================================================
    // STEP 01: Loading screen (all 3 viewports)
    // =========================================================================
    for (const vp of VIEWPORTS) {
      setStep(`01_loading_${vp.name}`)
      await setupViewport(page, vp)
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('div[role="status"][aria-label^="Loading:"]', { timeout: 10000 }).catch(() => {})
      // Capture immediately while loading screen (>= 650ms) is visible
      await sleep(100)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `01_loading_initial_${vp.width}x${vp.height}.png`,
        stepNum: '01',
        section: 'loading',
        state: 'initial',
        simHour: null,
        viewportName: `${vp.width}x${vp.height}`,
        route: '/',
        description: 'Loading screen with progress indicator and step label',
        waitMs: 0,
        stepConsoleMessages,
        manifestRows,
      })
    }

    // =========================================================================
    // MAIN JOURNEY PER VIEWPORT: Steps 02 to 18 (as applicable)
    // =========================================================================
    for (const vp of VIEWPORTS) {
      const isDesktop = vp.name === 'desktop'
      const isPhone = vp.name === 'phone'
      const vpTag = `${vp.width}x${vp.height}`

      await setupViewport(page, vp)
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await waitForLoadingFinish(page)

      // -----------------------------------------------------------------------
      // STEP 02: Landing Hero
      // -----------------------------------------------------------------------
      setStep(`02_landing_${vp.name}`)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `02_landing_hero_${vpTag}.png`,
        stepNum: '02',
        section: 'landing',
        state: 'hero',
        simHour: null,
        viewportName: vpTag,
        route: '/',
        description: 'Landing hero view with Sun 3D canvas and Run the simulation CTA',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })
      if (isDesktop) {
        styleSnapshots.push(await collectComputedStyles(page, '02_Landing_Hero'))
      }

      // -----------------------------------------------------------------------
      // STEP 03: Click "Run the simulation" -> Orbit view at Hour 0 (calm)
      // -----------------------------------------------------------------------
      setStep(`03_orbit_calm_${vp.name}`)
      await page.click('button[aria-label="Run the simulation"]')
      let curHour = 0
      await captureAndVerify({
        page,
        helperPage,
        fileName: `03_orbit_calm_${vpTag}.png`,
        stepNum: '03',
        section: 'orbit',
        state: 'calm',
        simHour: 0,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view right after clicking Run the simulation (Hour 0, calm)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })
      if (isDesktop) {
        styleSnapshots.push(await collectComputedStyles(page, '03_Orbit_Calm'))
      }

      // -----------------------------------------------------------------------
      // STEP 12: Header / navigation close-up (all 3 viewports)
      // -----------------------------------------------------------------------
      setStep(`12_header_nav_${vp.name}`)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `12_header_nav_${vpTag}.png`,
        stepNum: '12',
        section: 'header',
        state: 'navigation',
        simHour: curHour,
        viewportName: vpTag,
        route: '/',
        description: 'Top header and navigation controls close-up',
        clipElementSelector: 'header[role="banner"]',
        waitMs: 300,
        stepConsoleMessages,
        manifestRows,
      })

      // -----------------------------------------------------------------------
      // STEP 11: Timeline bar close-up (DESKTOP & PHONE)
      // -----------------------------------------------------------------------
      if (isDesktop || isPhone) {
        setStep(`11_timeline_bar_${vp.name}`)
        await captureAndVerify({
          page,
          helperPage,
          fileName: `11_timeline_bar_${vpTag}.png`,
          stepNum: '11',
          section: 'timeline',
          state: 'controls',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Timeline scrubber and playback controls close-up',
          clipElementSelector: 'section[aria-label="Simulation Timeline Controls"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
      }

      // -----------------------------------------------------------------------
      // STEP 04: Orbit view, Watch (Hour 3) + Step 09 Alert Card Watch crop
      // -----------------------------------------------------------------------
      setStep(`04_orbit_watch_${vp.name}`)
      curHour = await scrubToHour(page, 3, curHour)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `04_orbit_watch_${vpTag}.png`,
        stepNum: '04',
        section: 'orbit',
        state: 'watch',
        simHour: 3,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view at simulated hour 3 (WATCH alert status)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop || isPhone) {
        setStep(`09_alert_watch_${vp.name}`)
        if (isPhone) {
          const expandBtn = await page.$('button[aria-label="Expand to half view"]')
          if (expandBtn) await expandBtn.click()
          await sleep(400)
        }
        await captureAndVerify({
          page,
          helperPage,
          fileName: `09_alert_watch_${vpTag}.png`,
          stepNum: '09',
          section: 'alert_card',
          state: 'watch',
          simHour: 3,
          viewportName: vpTag,
          route: '/',
          description: 'Alert card close-up in WATCH status',
          clipElementSelector: 'section[aria-label="Space Weather Hazard Alert"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
        if (isPhone) {
          const collapseBtn = await page.$('button[aria-label="Collapse to peek height"]')
          if (collapseBtn) await collapseBtn.click()
          await sleep(300)
        }
      }

      // -----------------------------------------------------------------------
      // STEP 05: Orbit view, Confirmed (Hour 7) + Step 09 Alert Card Confirmed
      // -----------------------------------------------------------------------
      setStep(`05_orbit_confirmed_${vp.name}`)
      curHour = await scrubToHour(page, 7, curHour)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `05_orbit_confirmed_${vpTag}.png`,
        stepNum: '05',
        section: 'orbit',
        state: 'confirmed',
        simHour: 7,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view at simulated hour 7 (CONFIRMED storm state)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop) {
        styleSnapshots.push(await collectComputedStyles(page, '05_Orbit_Confirmed'))
      }

      if (isDesktop || isPhone) {
        setStep(`09_alert_confirmed_${vp.name}`)
        if (isPhone) {
          const expandBtn = await page.$('button[aria-label="Expand to half view"]')
          if (expandBtn) await expandBtn.click()
          await sleep(400)
        }
        await captureAndVerify({
          page,
          helperPage,
          fileName: `09_alert_confirmed_${vpTag}.png`,
          stepNum: '09',
          section: 'alert_card',
          state: 'confirmed',
          simHour: 7,
          viewportName: vpTag,
          route: '/',
          description: 'Alert card close-up in CONFIRMED status',
          clipElementSelector: 'section[aria-label="Space Weather Hazard Alert"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
        if (isPhone) {
          const collapseBtn = await page.$('button[aria-label="Collapse to peek height"]')
          if (collapseBtn) await collapseBtn.click()
          await sleep(300)
        }
      }

      // -----------------------------------------------------------------------
      // STEP 06: Orbit view, Satellites decaying/lost (Hour 11) + Step 10 Side Panels
      // -----------------------------------------------------------------------
      setStep(`06_orbit_decaying_${vp.name}`)
      curHour = await scrubToHour(page, 11, curHour)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `06_orbit_decaying_${vpTag}.png`,
        stepNum: '06',
        section: 'orbit',
        state: 'satellites_lost',
        simHour: 11,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view at simulated hour 11 (peak storm, satellites decaying/lost)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop) {
        setStep(`10_panels_orbit_${vp.name}`)
        await captureAndVerify({
          page,
          helperPage,
          fileName: `10_panel_forecast_${vpTag}.png`,
          stepNum: '10',
          section: 'side_panel',
          state: 'forecast',
          simHour: 11,
          viewportName: vpTag,
          route: '/',
          description: 'Forecast panel close-up',
          clipElementSelector: 'aside[aria-label="Space Weather Probability Forecast"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
        await captureAndVerify({
          page,
          helperPage,
          fileName: `10_panel_satellites_${vpTag}.png`,
          stepNum: '10',
          section: 'side_panel',
          state: 'satellite_health',
          simHour: 11,
          viewportName: vpTag,
          route: '/',
          description: 'Constellation Satellite Health panel close-up',
          clipElementSelector: 'aside[aria-label="Satellite Constellation Health"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
      }

      // -----------------------------------------------------------------------
      // STEP 07: Orbit view, Rerouted network (Hour 14)
      // -----------------------------------------------------------------------
      setStep(`07_orbit_rerouted_${vp.name}`)
      curHour = await scrubToHour(page, 14, curHour)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `07_orbit_rerouted_${vpTag}.png`,
        stepNum: '07',
        section: 'orbit',
        state: 'rerouted',
        simHour: 14,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view at simulated hour 14 (mesh routing active via Dijkstra)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      // -----------------------------------------------------------------------
      // STEP 08: Orbit view, Resolved (Hour 22) + Step 09 Alert Card Resolved
      // -----------------------------------------------------------------------
      setStep(`08_orbit_resolved_${vp.name}`)
      curHour = await scrubToHour(page, 22, curHour)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `08_orbit_resolved_${vpTag}.png`,
        stepNum: '08',
        section: 'orbit',
        state: 'resolved',
        simHour: 22,
        viewportName: vpTag,
        route: '/',
        description: 'Orbit view at simulated hour 22 (RESOLVED state)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop || isPhone) {
        setStep(`09_alert_resolved_${vp.name}`)
        if (isPhone) {
          const expandBtn = await page.$('button[aria-label="Expand to half view"]')
          if (expandBtn) await expandBtn.click()
          await sleep(400)
        }
        await captureAndVerify({
          page,
          helperPage,
          fileName: `09_alert_resolved_${vpTag}.png`,
          stepNum: '09',
          section: 'alert_card',
          state: 'resolved',
          simHour: 22,
          viewportName: vpTag,
          route: '/',
          description: 'Alert card close-up in RESOLVED status',
          clipElementSelector: 'section[aria-label="Space Weather Hazard Alert"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
        if (isPhone) {
          const collapseBtn = await page.$('button[aria-label="Collapse to peek height"]')
          if (collapseBtn) await collapseBtn.click()
          await sleep(300)
        }
      }

      // -----------------------------------------------------------------------
      // STEP 21: Phone only: Bottom sheet heights (peek, half, hidden)
      // -----------------------------------------------------------------------
      if (isPhone) {
        setStep('21_phone_bottom_sheet')
        // Already at peek
        await captureAndVerify({
          page,
          helperPage,
          fileName: `21_bottom_sheet_peek_${vpTag}.png`,
          stepNum: '21',
          section: 'phone_sheet',
          state: 'peek',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Phone bottom sheet in peek height',
          waitMs: 500,
          stepConsoleMessages,
          manifestRows,
        })

        await page.click('button[aria-label="Expand to half view"]')
        await captureAndVerify({
          page,
          helperPage,
          fileName: `21_bottom_sheet_half_${vpTag}.png`,
          stepNum: '21',
          section: 'phone_sheet',
          state: 'half',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Phone bottom sheet expanded to half height',
          waitMs: 500,
          stepConsoleMessages,
          manifestRows,
        })

        // Collapse to peek then hide
        const collapseBtn = await page.$('button[aria-label="Collapse to peek height"]')
        if (collapseBtn) await collapseBtn.click()
        await sleep(300)
        const hideBtn = await page.$('button[aria-label="Hide panel sheet"]')
        if (hideBtn) await hideBtn.click()
        await captureAndVerify({
          page,
          helperPage,
          fileName: `21_bottom_sheet_hidden_${vpTag}.png`,
          stepNum: '21',
          section: 'phone_sheet',
          state: 'hidden',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Phone bottom sheet hidden (floating restore pill)',
          waitMs: 500,
          stepConsoleMessages,
          manifestRows,
        })

        // Restore to peek
        const restoreBtn = await page.$('button[aria-label="Restore HUD bottom panel sheet"]')
        if (restoreBtn) await restoreBtn.click()
        await sleep(300)
      }

      // -----------------------------------------------------------------------
      // STEP 15: Agent drawer open & scrolled to bottom (all 3 viewports)
      // -----------------------------------------------------------------------
      setStep(`15_agent_drawer_${vp.name}`)
      if (isPhone) {
        const expandBtn = await page.$('button[aria-label="Expand to half view"]')
        if (expandBtn) await expandBtn.click()
        await sleep(300)
        const tabBtns = await page.$$('nav[aria-label="Panel Navigation Tabs"] button')
        for (const b of tabBtns) {
          const txt = await page.evaluate((el) => el.textContent || '', b)
          if (txt.trim() === 'Agent') {
            await b.click()
            break
          }
        }
      } else {
        await page.click('button[aria-label="Open agent audit log drawer"]')
      }

      await captureAndVerify({
        page,
        helperPage,
        fileName: `15_agent_drawer_open_${vpTag}.png`,
        stepNum: '15',
        section: 'agent_drawer',
        state: 'open',
        simHour: curHour,
        viewportName: vpTag,
        route: '/',
        description: 'Agent audit log drawer open showing 7-step execution trace',
        waitMs: 600,
        stepConsoleMessages,
        manifestRows,
      })

      // Scroll inner drawer container to bottom
      await page.evaluate((phone) => {
        if (phone) {
          const sheet = document.querySelector('aside[aria-label="Space Weather Telemetry Panel Sheet"]')
          if (sheet && sheet.children[2]) {
            sheet.children[2].scrollTop = sheet.children[2].scrollHeight
          }
        } else {
          const aside = document.querySelector('aside[aria-label="Autonomous Agent Execution Log"]')
          if (aside && aside.firstElementChild) {
            aside.firstElementChild.scrollTop = aside.firstElementChild.scrollHeight
          }
        }
      }, isPhone)

      await captureAndVerify({
        page,
        helperPage,
        fileName: `15_agent_drawer_bottom_${vpTag}.png`,
        stepNum: '15',
        section: 'agent_drawer',
        state: 'scrolled_bottom',
        simHour: curHour,
        viewportName: vpTag,
        route: '/',
        description: 'Agent audit log drawer scrolled to bottom showing analogs & citations',
        waitMs: 400,
        stepConsoleMessages,
        manifestRows,
      })

      // Close agent drawer / collapse phone sheet
      if (isPhone) {
        const collapseBtn = await page.$('button[aria-label="Collapse to peek height"]')
        if (collapseBtn) await collapseBtn.click()
      } else {
        const closeAgentBtn = await page.$('button[aria-label="Close agent audit log drawer"]')
        if (closeAgentBtn) await closeAgentBtn.click()
      }
      await sleep(400)

      // -----------------------------------------------------------------------
      // STEP 17: Validation Modal for each event (DESKTOP & PHONE)
      // -----------------------------------------------------------------------
      if (isDesktop || isPhone) {
        setStep(`17_validation_modal_${vp.name}`)
        if (isPhone) {
          await page.click('button[aria-label="Toggle navigation menu"]')
          await sleep(300)
          await page.click('button[aria-label="Open validation comparison"]')
        } else {
          await page.click('button[aria-label="Open validation comparison"]')
        }

        await captureAndVerify({
          page,
          helperPage,
          fileName: `17_validation_feb2022_${vpTag}.png`,
          stepNum: '17',
          section: 'validation',
          state: 'feb2022',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Validation modal comparing Feb 2022 storm metrics',
          waitMs: 1200,
          stepConsoleMessages,
          manifestRows,
        })

        if (isDesktop) {
          styleSnapshots.push(await collectComputedStyles(page, '17_Validation_Modal'))
        }

        // Switch to May 2024 event
        const valBtns = await page.$$('div[role="dialog"] button, aside button, button')
        for (const b of valBtns) {
          const txt = await page.evaluate((el) => el.textContent || '', b)
          if (txt.includes('May 2024')) {
            await b.click()
            break
          }
        }

        await captureAndVerify({
          page,
          helperPage,
          fileName: `17_validation_may2024_${vpTag}.png`,
          stepNum: '17',
          section: 'validation',
          state: 'may2024',
          simHour: curHour,
          viewportName: vpTag,
          route: '/',
          description: 'Validation modal comparing May 2024 (G5) storm metrics',
          waitMs: 1200,
          stepConsoleMessages,
          manifestRows,
        })

        await page.click('button[aria-label="Close validation modal"]')
        await sleep(400)
      }

      // -----------------------------------------------------------------------
      // STEP 13 (DESKTOP ONLY): Camera flight Orbit -> Surface (0.4s, 1.0s, 1.8s, 2.5s)
      // STEP 14: Surface view (terrain, rover moving, high dose, shelter reached)
      // -----------------------------------------------------------------------
      // Scrub to Hour 11 first for active storm / proton flux on lunar surface
      curHour = await scrubToHour(page, 11, curHour)
      await sleep(500)

      if (isPhone) {
        await page.click('button[aria-label="Toggle navigation menu"]')
        await sleep(300)
        await page.click('button[aria-label="Dive to lunar surface"]')
      } else {
        setStep(`13_camera_flight_${vp.name}`)
        await page.click('button[aria-label="Dive to lunar surface"]')
      }

      if (isDesktop) {
        const flightMarks = [400, 1000, 1800, 2500]
        let prevMark = 0
        for (const mark of flightMarks) {
          const delta = mark - prevMark
          await sleep(delta)
          prevMark = mark
          await captureAndVerify({
            page,
            helperPage,
            fileName: `13_flight_${(mark / 1000).toFixed(1)}s_${vpTag}.png`,
            stepNum: '13',
            section: 'camera_flight',
            state: `flight_${(mark / 1000).toFixed(1)}s`,
            simHour: curHour,
            viewportName: vpTag,
            route: '/',
            description: `Orbit-to-Surface camera transition frame at ${(mark / 1000).toFixed(1)}s`,
            waitMs: 0,
            stepConsoleMessages,
            manifestRows,
          })
        }
      } else {
        await sleep(2600)
      }

      // STEP 14a: Surface Terrain
      setStep(`14_surface_terrain_${vp.name}`)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `14_surface_terrain_${vpTag}.png`,
        stepNum: '14',
        section: 'surface',
        state: 'terrain',
        simHour: curHour,
        viewportName: vpTag,
        route: '/',
        description: 'Lunar south pole surface terrain, shelters, and initial rover position',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop) {
        styleSnapshots.push(await collectComputedStyles(page, '14_Surface_View'))
      }

      // Start playback at 240x speed to drive rover & accumulate dose
      if (isPhone) {
        // Set speed to 240x via speed selector popover, then play
        const speedBtn = await page.$('button[aria-label^="Playback speed"]')
        if (speedBtn) {
          await speedBtn.click()
          await sleep(200)
          const menuItems = await page.$$('div[role="menu"] button')
          for (const item of menuItems) {
            const t = await page.evaluate((el) => el.textContent, item)
            if (t && t.includes('240')) {
              await item.click()
              break
            }
          }
        }
      } else {
        const speedBtns = await page.$$('section[aria-label="Simulation Timeline Controls"] button')
        for (const b of speedBtns) {
          const t = await page.evaluate((el) => el.textContent, b)
          if (t && t.trim() === '240x') {
            await b.click()
            break
          }
        }
      }

      // Lower safety cap slider to 20 IDU on Desktop so dose meter turns amber/red clearly as dose accumulates
      if (isDesktop) {
        await page.evaluate(() => {
          const inp = document.getElementById('dose-cap-input')
          if (inp) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
            nativeSetter.call(inp, '20')
            inp.dispatchEvent(new Event('input', { bubbles: true }))
            inp.dispatchEvent(new Event('change', { bubbles: true }))
          }
        })
      }

      // Press Play
      const playBtn = await page.$('button[aria-label="Play simulation"]')
      if (playBtn) await playBtn.click()

      // STEP 14b: Rover moving
      setStep(`14_surface_rover_moving_${vp.name}`)
      await sleep(2500)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `14_surface_rover_moving_${vpTag}.png`,
        stepNum: '14',
        section: 'surface',
        state: 'rover_moving',
        simHour: null,
        viewportName: vpTag,
        route: '/',
        description: 'Lunar rover traversing toward shelter along Pareto route while accumulating dose',
        waitMs: 500,
        stepConsoleMessages,
        manifestRows,
      })

      // STEP 14c: Dose meter high
      setStep(`14_surface_dose_high_${vp.name}`)
      await sleep(3000)
      await captureAndVerify({
        page,
        helperPage,
        fileName: `14_surface_dose_high_${vpTag}.png`,
        stepNum: '14',
        section: 'surface',
        state: 'dose_high',
        simHour: null,
        viewportName: vpTag,
        route: '/',
        description: 'Surface scene with elevated radiation dose meter',
        waitMs: 500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop) {
        setStep('10_panel_dose_1440x900')
        await captureAndVerify({
          page,
          helperPage,
          fileName: `10_panel_dose_${vpTag}.png`,
          stepNum: '10',
          section: 'side_panel',
          state: 'dose_meter',
          simHour: null,
          viewportName: vpTag,
          route: '/',
          description: 'Radiation Dose Meter panel close-up',
          clipElementSelector: 'aside[aria-label="Lunar Rover Radiation Dose Meter"]',
          waitMs: 300,
          stepConsoleMessages,
          manifestRows,
        })
      }

      // STEP 14d: Shelter reached
      setStep(`14_surface_shelter_reached_${vp.name}`)
      await page.waitForFunction(
        () => document.body.innerText.includes('SHELTERED'),
        { timeout: 12000 }
      ).catch(() => {})
      const pauseBtn = await page.$('button[aria-label="Pause simulation"]')
      if (pauseBtn) await pauseBtn.click()
      await captureAndVerify({
        page,
        helperPage,
        fileName: `14_surface_shelter_reached_${vpTag}.png`,
        stepNum: '14',
        section: 'surface',
        state: 'shelter_reached',
        simHour: null,
        viewportName: vpTag,
        route: '/',
        description: 'Rover reached shelter (SHELTERED state active)',
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      // -----------------------------------------------------------------------
      // STEP 20 (DESKTOP ONLY): Hover and focus states
      // -----------------------------------------------------------------------
      if (isDesktop) {
        setStep('20_hover_and_focus')
        // Hover over button
        const diveOrOrbitBtn = await page.$('button[aria-label="Return to orbit view"]')
        if (diveOrOrbitBtn) await diveOrOrbitBtn.hover()
        await sleep(300)
        await captureAndVerify({
          page,
          helperPage,
          fileName: `20_hover_button_${vpTag}.png`,
          stepNum: '20',
          section: 'interaction',
          state: 'hover_button',
          simHour: null,
          viewportName: vpTag,
          route: '/',
          description: 'Hover state over top navigation button',
          waitMs: 200,
          stepConsoleMessages,
          manifestRows,
        })

        // Hover over Alert status chip or Dose meter badge
        const alertBadge = await page.$('section[aria-label="Space Weather Hazard Alert"] span')
        if (alertBadge) await alertBadge.hover()
        await sleep(300)
        await captureAndVerify({
          page,
          helperPage,
          fileName: `20_hover_chip_${vpTag}.png`,
          stepNum: '20',
          section: 'interaction',
          state: 'hover_chip',
          simHour: null,
          viewportName: vpTag,
          route: '/',
          description: 'Hover state over alert status chip',
          waitMs: 200,
          stepConsoleMessages,
          manifestRows,
        })

        // Hover over center of 3D canvas (shelter/terrain)
        await page.mouse.move(720, 450)
        await sleep(300)
        await captureAndVerify({
          page,
          helperPage,
          fileName: `20_hover_canvas_${vpTag}.png`,
          stepNum: '20',
          section: 'interaction',
          state: 'hover_canvas',
          simHour: null,
          viewportName: vpTag,
          route: '/',
          description: 'Mouse hovering over 3D lunar surface viewport',
          waitMs: 200,
          stepConsoleMessages,
          manifestRows,
        })

        // Press Tab 5 times to verify visible focus ring
        for (let t = 0; t < 5; t++) {
          await page.keyboard.press('Tab')
          await sleep(120)
        }
        await captureAndVerify({
          page,
          helperPage,
          fileName: `20_focus_tab5_${vpTag}.png`,
          stepNum: '20',
          section: 'interaction',
          state: 'focus_ring',
          simHour: null,
          viewportName: vpTag,
          route: '/',
          description: 'Visible focus ring after pressing Tab 5 times',
          waitMs: 200,
          stepConsoleMessages,
          manifestRows,
        })
      }

      // -----------------------------------------------------------------------
      // STEP 18: /about page, full-page screenshot (all 3 viewports)
      // -----------------------------------------------------------------------
      setStep(`18_about_page_${vp.name}`)
      if (isPhone) {
        await page.click('button[aria-label="Toggle navigation menu"]')
        await sleep(300)
        await page.click('button[aria-label="View about and credits"]')
      } else {
        await page.click('button[aria-label="View about and credits"]')
      }

      await captureAndVerify({
        page,
        helperPage,
        fileName: `18_about_fullpage_${vpTag}.png`,
        stepNum: '18',
        section: 'about',
        state: 'fullpage',
        simHour: null,
        viewportName: vpTag,
        route: '/about',
        description: 'Full-page screenshot of /about documentation & credits page',
        fullPage: true,
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })

      if (isDesktop) {
        styleSnapshots.push(await collectComputedStyles(page, '18_About_Page'))
      }

      // -----------------------------------------------------------------------
      // STEP 19: WebGL-unavailable fallback via ?nowebgl=1 (all 3 viewports)
      // -----------------------------------------------------------------------
      setStep(`19_nowebgl_${vp.name}`)
      await page.goto(`${BASE_URL}/?nowebgl=1`, { waitUntil: 'domcontentloaded' })
      await captureAndVerify({
        page,
        helperPage,
        fileName: `19_fallback_nowebgl_${vpTag}.png`,
        stepNum: '19',
        section: 'fallback',
        state: 'nowebgl',
        simHour: null,
        viewportName: vpTag,
        route: '/?nowebgl=1',
        description: '2D plain-HTML fallback when WebGL is disabled (?nowebgl=1)',
        fullPage: true,
        waitMs: 1500,
        stepConsoleMessages,
        manifestRows,
      })
    }

    // Record NOT REACHABLE states
    notReachableList.push({
      step: '09',
      item: 'Alert card close-up: FALSE_ALARM status',
      reason: 'Default UI replay (feb2022.json) crosses Kp >= 5.0 and confirms storm; no False Alarm scenario is selectable in the UI.',
    })
    notReachableList.push({
      step: '16',
      item: 'Math Lab drawer or panel',
      reason: 'No Math Lab drawer or interactive panel exists in the UI (mathematical engines are documented on /about).',
    })
    notReachableList.push({
      step: '19',
      item: 'Panel ErrorBoundary / dataError state',
      reason: 'No UI button or route triggers an artificial React ErrorBoundary crash or fetch error under normal running server conditions.',
    })

    // Close main simulation page before generating contact sheets to free WebGL resources
    await page.close()
    await helperPage.close()

    // Generate Contact Sheets
    await generateContactSheets(browser, manifestRows)

    // Write Style Inventory
    const mergedStyles = mergeStyleInventories(styleSnapshots)
    writeStyleInventory(mergedStyles)

    // Write MANIFEST.md
    const mLines = []
    mLines.push('# HelioNet UI Capture Manifest')
    mLines.push('')
    mLines.push(`- **Captured On:** ${new Date().toISOString()}`)
    mLines.push(`- **App URL:** ${BASE_URL}`)
    mLines.push(`- **Total Screenshots:** ${manifestRows.length}`)
    mLines.push(`- **Blank Screenshots:** ${manifestRows.filter((r) => r.blankStatus === 'BLANK').length}`)
    mLines.push(`- **Console Errors:** ${allConsoleMessages.filter((c) => c.type === 'error' || c.type === 'pageerror').length}`)
    mLines.push(`- **Console Warnings:** ${allConsoleMessages.filter((c) => c.type === 'warning').length}`)
    mLines.push('')
    mLines.push('## Captured Screenshots')
    mLines.push('')
    mLines.push('| File Name | Section | State | Sim Hour | Viewport | Route | Visible Content | Blank Check | Console Messages |')
    mLines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |')

    for (const r of manifestRows) {
      const hr = r.simHour !== null ? `${r.simHour}h` : '—'
      const msgs = r.consoleMessages.length > 0 ? r.consoleMessages.join('<br/>').replace(/\|/g, '\\|') : 'None'
      mLines.push(
        `| \`${r.fileName}\` | ${r.section} | ${r.state} | ${hr} | ${r.viewport} | \`${r.route}\` | ${r.description} | **${r.blankStatus}** (${r.diffPct}%) | ${msgs} |`
      )
    }

    mLines.push('')
    mLines.push('## NOT REACHABLE States')
    mLines.push('')
    mLines.push('| Step | Item | Reason Not Reachable via Visible UI |')
    mLines.push('| :--- | :--- | :--- |')
    for (const nr of notReachableList) {
      mLines.push(`| ${nr.step} | ${nr.item} | ${nr.reason} |`)
    }
    mLines.push('')

    fs.writeFileSync(path.join(OUTPUT_DIR, 'MANIFEST.md'), mLines.join('\n'), 'utf8')
    console.log(`\n[Manifest] Written docs/ui-capture/MANIFEST.md`)
  } finally {
    await browser.close()
  }

  // Create docs/ui-capture.zip
  console.log('\n[Zipping docs/ui-capture -> docs/ui-capture.zip]')
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH)
  const items = fs.readdirSync(OUTPUT_DIR).map((i) => `"${i}"`).join(' ')
  execSync(`tar -a -c -f "${ZIP_PATH}" -C "${OUTPUT_DIR}" ${items}`, { stdio: 'inherit' })

  const zipStat = fs.statSync(ZIP_PATH)
  console.log('\n' + '='.repeat(72))
  console.log(' UI CAPTURE COMPLETE')
  console.log('='.repeat(72))
  console.log(`Screenshots taken: ${manifestRows.length}`)
  console.log(`BLANK count: ${manifestRows.filter((r) => r.blankStatus === 'BLANK').length}`)
  console.log(`NOT REACHABLE count: ${notReachableList.length}`)
  console.log(`Console error count: ${allConsoleMessages.filter((c) => c.type === 'error' || c.type === 'pageerror').length}`)
  console.log(`Zip file: ${ZIP_PATH} (${(zipStat.size / (1024 * 1024)).toFixed(2)} MB)`)
  console.log(`Contact sheets path: ${SHEET_DIR}`)
  console.log('='.repeat(72))
}

run().catch((err) => {
  console.error('CAPTURE FAILED:', err)
  process.exit(1)
})
