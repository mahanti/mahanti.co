import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    {import.meta.env.DEV && <Agentation />}
  </>
)
