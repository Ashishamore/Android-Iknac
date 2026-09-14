import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { OverlayRootContext, useOverlayRoot } from './overlayContext'

export function OverlayRootProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  return (
    <OverlayRootContext.Provider value={node}>
      {children}
      <div ref={setNode} className="pointer-events-none absolute inset-0 z-50" />
    </OverlayRootContext.Provider>
  )
}

/** Render children into the device's overlay layer. Children must opt into pointer events. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const node = useOverlayRoot()
  return node ? createPortal(children, node) : null
}
