import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'onnx-wasm-public-serve',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Vite import-analysis wraps dynamic import(var) inside onnxruntime-web with
          // __vite__injectQuery(url, 'import'), which makes Vite reject /public assets.
          if (req.url && req.url.includes('/onnx-wasm/')) {
            const [pathname, query] = req.url.split('?')
            if (pathname.endsWith('.mjs') && query) {
              const params = new URLSearchParams(query)
              if (params.has('import')) {
                params.delete('import')
                const rest = params.toString()
                req.url = rest ? `${pathname}?${rest}` : pathname
              }
            }
          }
          next()
        })
      },
    },
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('onnxruntime-web')) return 'onnx'
          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) return 'r3f'
          if (id.includes('node_modules/three/')) return 'three-core'
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    pool: 'threads',
  },
})
