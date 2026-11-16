import fs from 'node:fs'
import path from 'node:path'

const DIST_DIR = path.resolve('dist')
const ASSETS_DIR = path.resolve('dist/assets')
const WARN_CHUNK_SIZE_BYTES = 500 * 1024 // 500 kB
const MAX_INITIAL_PAYLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function runBudgetCheck() {
  console.log('='.repeat(72))
  console.log(' HelioNet Production Bundle Budget Checker')
  console.log('='.repeat(72))

  if (!fs.existsSync(DIST_DIR)) {
    console.error('ERROR: dist/ directory not found. Please run `vite build` first.')
    process.exit(1)
  }

  const indexPath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: dist/index.html not found.')
    process.exit(1)
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8')
  const indexSize = fs.statSync(indexPath).size

  // Extract linked assets in index.html
  const linkMatches = [...indexHtml.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/g)]
  const initialAssetPaths = new Set()
  for (const m of linkMatches) {
    const assetRel = m[1].replace(/^\//, '')
    const fullPath = path.resolve(DIST_DIR, assetRel)
    if (fs.existsSync(fullPath)) {
      initialAssetPaths.add(fullPath)
    }
  }

  let initialPayloadBytes = indexSize
  const initialRows = [{ file: 'dist/index.html', size: indexSize, type: 'HTML' }]

  for (const filePath of initialAssetPaths) {
    const size = fs.statSync(filePath).size
    initialPayloadBytes += size
    const ext = path.extname(filePath).toLowerCase()
    initialRows.push({
      file: path.relative(DIST_DIR, filePath),
      size,
      type: ext === '.js' ? 'JS' : ext === '.css' ? 'CSS' : ext.replace('.', '').toUpperCase(),
    })
  }

  console.log('\n--- 1. Initial Entry Payload (Linked in index.html) ---')
  console.log(`${'File'.padEnd(45)} ${'Type'.padEnd(8)} ${'Size'.padStart(12)}`)
  console.log('-'.repeat(67))
  for (const row of initialRows) {
    console.log(`${row.file.padEnd(45)} ${row.type.padEnd(8)} ${formatSize(row.size).padStart(12)}`)
  }
  console.log('-'.repeat(67))
  console.log(
    `Total Initial Payload: ${formatSize(initialPayloadBytes)} (Budget Limit: ${formatSize(MAX_INITIAL_PAYLOAD_BYTES)})`
  )

  let failed = false
  if (initialPayloadBytes > MAX_INITIAL_PAYLOAD_BYTES) {
    console.error(`\x1b[31m[FAIL]\x1b[0m Initial payload exceeded budget: ${formatSize(initialPayloadBytes)} > ${formatSize(MAX_INITIAL_PAYLOAD_BYTES)}`)
    failed = true
  } else {
    console.log('\x1b[32m[PASS]\x1b[0m Initial payload is within budget.')
  }

  // Inspect all JS chunks in dist/assets
  console.log('\n--- 2. JS Chunks Budget Inspection (Warn if > 500 kB) ---')
  console.log(`${'Asset Chunk'.padEnd(45)} ${'Size'.padStart(12)}   ${'Status'.padEnd(10)}`)
  console.log('-'.repeat(70))

  let warnedChunks = 0
  if (fs.existsSync(ASSETS_DIR)) {
    const files = fs.readdirSync(ASSETS_DIR)
    for (const file of files) {
      if (!file.endsWith('.js')) continue
      const filePath = path.join(ASSETS_DIR, file)
      const size = fs.statSync(filePath).size
      const isWarn = size > WARN_CHUNK_SIZE_BYTES
      if (isWarn) warnedChunks++
      const statusStr = isWarn ? '\x1b[33mWARN (>500kB)\x1b[0m' : '\x1b[32mOK\x1b[0m'
      console.log(`${('assets/' + file).padEnd(45)} ${formatSize(size).padStart(12)}   ${statusStr}`)
    }
  }

  console.log('-'.repeat(70))
  if (warnedChunks > 0) {
    console.log(`\x1b[33m[NOTE]\x1b[0m ${warnedChunks} JS chunk(s) exceeded 500 kB warning threshold. (Acceptable for heavy 3D/WASM bundles).`)
  } else {
    console.log('\x1b[32m[PASS]\x1b[0m All JS chunks are under 500 kB.')
  }

  console.log('\n' + '='.repeat(72))
  if (failed) {
    console.log('\x1b[31mBundle Budget Check FAILED.\x1b[0m')
    process.exit(1)
  } else {
    console.log('\x1b[32mBundle Budget Check PASSED successfully.\x1b[0m')
    process.exit(0)
  }
}

runBudgetCheck()
