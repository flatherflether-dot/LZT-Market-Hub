import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { loadModuleStyles } from '@core/module-loader'
import './styles/lolz-xf.css'
import './styles/global.css'

loadModuleStyles()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
