import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import { createRoot } from 'react-dom/client'
import { mountPanel } from './panel'

mountPanel(createRoot(document.getElementById('root')!))
