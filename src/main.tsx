import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { appFor } from './app/routes'
import { initNavigation } from './navigation'
import { resolveStartup, useSession } from './store/session'

// Open the right app for the URL (/customer, /renter or /) and who's signed in.
const start = resolveStartup()
useSession.setState({ section: start.section })
initNavigation(appFor(start.section), start.path)

// Enables :active press styles on iOS Safari.
document.addEventListener('touchstart', () => {}, { passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
