import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './pages/App'

// Self-hosted fonts — Rule 6: no runtime CDN requests
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-mono/400.css'

// Global reset / token application
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
