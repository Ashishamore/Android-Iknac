import './admin.css'
import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import App from './App'

/** The desktop web panel: the provider workspace and the Control Centre. */
export function mountPanel(root: Root) {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
