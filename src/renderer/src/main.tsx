import React from 'react'
import { createRoot } from 'react-dom/client'
import { FinanceProvider } from './store'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><FinanceProvider><App/></FinanceProvider></React.StrictMode>)
