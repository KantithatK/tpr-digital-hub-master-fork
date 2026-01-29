import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import NotifyProvider from "@/tpr/contexts/NotifyProvider";

createRoot(document.getElementById('root')).render(
  <NotifyProvider>
    <StrictMode>
       <App />
    </StrictMode>
  </NotifyProvider>
)
