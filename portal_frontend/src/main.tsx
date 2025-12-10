import React from 'react'
import { createRoot } from 'react-dom/client'
import GeneratedPortalPage from './GeneratedPortalPage'
import './index.css'

const rootElem = document.getElementById('root')!
createRoot(rootElem).render(
  <React.StrictMode>
    <GeneratedPortalPage />
  </React.StrictMode>
)
