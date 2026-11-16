import { useRef, useEffect, useCallback } from 'react'

/** Message sent TO the worker. */
export interface WorkerRequest<T = unknown> {
  id: string
  type: string
  payload: T
}

/** Message received FROM the worker. */
export interface WorkerResponse<T = unknown> {
  id: string
  type: string
  payload: T
  error?: string
}

type ResponseHandler<T> = (response: WorkerResponse<T>) => void

/**
 * Wraps a Web Worker in a React hook.
 * - Terminates the worker on unmount.
 * - Routes responses by id to registered handlers.
 * - Rule 3: heavy compute must never block the main thread.
 */
export function useWorker(
  factory: () => Worker,
): {
  post: <Req, Res>(request: WorkerRequest<Req>, onResponse: ResponseHandler<Res>) => void
  terminate: () => void
} {
  const workerRef = useRef<Worker | null>(null)
  const handlersRef = useRef<Map<string, ResponseHandler<unknown>>>(new Map())

  useEffect(() => {
    const worker = factory()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse<unknown>>) => {
      const { id } = event.data
      const handler = handlersRef.current.get(id)
      if (handler) {
        handler(event.data)
        handlersRef.current.delete(id)
      }
    }

    worker.onerror = (err) => {
      console.error('[useWorker] Uncaught worker error:', err)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      handlersRef.current.clear()
    }
  }, [factory])

  const post = useCallback(
    <Req, Res>(request: WorkerRequest<Req>, onResponse: ResponseHandler<Res>) => {
      if (!workerRef.current) return
      handlersRef.current.set(request.id, onResponse as ResponseHandler<unknown>)
      workerRef.current.postMessage(request)
    },
    [],
  )

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    handlersRef.current.clear()
  }, [])

  return { post, terminate }
}
