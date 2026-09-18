import './index.css'
import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import App from './App'
import { appFor } from './app/routes'
import { initNavigation } from './navigation'
import { resolveStartup, useSession } from './store/session'

/** The phone prototype: the renter app, the provider app and the login flow. */
export function mountPhone(root: Root) {
  // Open the right app for the URL (/customer, /renter or /) and who's signed in.
  const start = resolveStartup()
  useSession.setState({ section: start.section })
  initNavigation(appFor(start.section), start.path)

  // Enables :active press styles on iOS Safari.
  document.addEventListener('touchstart', () => {}, { passive: true })

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
