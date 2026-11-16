import { useState, useEffect, useCallback } from 'react'

/** Asset manifest entry — describes one optional asset and its fallback. */
export interface ManifestEntry {
  /** URL relative to /public/assets/ */
  path: string
  /** Human-readable label for the fallback */
  fallbackLabel: string
}

export interface AssetManifest {
  [key: string]: ManifestEntry
}

/** Result returned by useAsset. */
export interface AssetResult {
  /** Resolved URL if loaded, null if not yet resolved. */
  url: string | null
  /** True when the asset failed to load and the fallback is active. */
  usingFallback: boolean
  /** True while the fetch is in progress. */
  loading: boolean
}

/**
 * Tries to load an asset by its manifest key.
 * On failure returns { usingFallback: true } — the caller renders
 * its procedural fallback.
 *
 * Rule 6: every asset must have a procedural fallback.
 * Rule 5: this hook never throws.
 */
export function useAsset(key: string, manifest: AssetManifest): AssetResult {
  const [state, setState] = useState<AssetResult>({
    url: null,
    usingFallback: false,
    loading: true,
  })

  const entry = manifest[key]

  const tryLoad = useCallback(() => {
    if (!entry) {
      setState({ url: null, usingFallback: true, loading: false })
      return
    }

    const url = `/assets/${entry.path}`

    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          setState({ url, usingFallback: false, loading: false })
        } else {
          setState({ url: null, usingFallback: true, loading: false })
        }
      })
      .catch(() => {
        setState({ url: null, usingFallback: true, loading: false })
      })
  }, [entry])

  useEffect(() => {
    tryLoad()
  }, [tryLoad])

  return state
}

/** Load the manifest JSON from /assets/manifest.json.
 *  Returns an empty manifest if the file is missing (Rule 6). */
export async function loadManifest(): Promise<AssetManifest> {
  try {
    const res = await fetch('/assets/manifest.json')
    if (!res.ok) return {}
    const data: unknown = await res.json()
    if (typeof data === 'object' && data !== null) {
      return data as AssetManifest
    }
    return {}
  } catch {
    return {}
  }
}
