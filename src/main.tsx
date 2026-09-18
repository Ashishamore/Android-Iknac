import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import { createRoot } from 'react-dom/client'
import { ADMIN_BASE } from './lib/adminBase'

const root = createRoot(document.getElementById('root')!)

/**
 * Two web apps on one origin: the phone prototype at /, and the desktop
 * admin panel at /Adminpannel. Sharing the origin is the point — what the
 * panel changes (flags, suspensions, campaigns, commission) reaches an open
 * renter or provider app straight away.
 */
if (window.location.pathname.toLowerCase().startsWith(ADMIN_BASE.toLowerCase())) {
  void import('../admin/src/panel').then((m) => m.mountPanel(root))
} else {
  void import('./phone').then((m) => m.mountPhone(root))
}
