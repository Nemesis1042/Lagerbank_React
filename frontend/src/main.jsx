import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Add loaded class to prevent FOUC
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.add('loaded')
}

root.render(
    <App />
)
