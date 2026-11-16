import React from 'react'

interface ModelBoundaryProps {
  children: React.ReactNode
  fallback: React.ReactNode
}

interface ModelBoundaryState {
  hasError: boolean
}

/**
 * Three.js-safe React ErrorBoundary that switches seamlessly to a procedural
 * Three.js fallback subtree if a GLTF model fails to load or decode.
 */
export class ModelBoundary extends React.Component<ModelBoundaryProps, ModelBoundaryState> {
  constructor(props: ModelBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ModelBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: unknown): void {
    console.warn('[ModelBoundary] Falling back to procedural geometry:', error)
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
