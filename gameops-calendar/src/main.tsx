import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 清理可能导致崩溃的旧格式localStorage数据
try {
  const raw = localStorage.getItem('gameops-calendar-events');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem('gameops-calendar-events');
    }
  }
} catch {
  localStorage.removeItem('gameops-calendar-events');
  localStorage.removeItem('gameops-calendar-comments');
  localStorage.removeItem('gameops-calendar-changelogs');
  localStorage.removeItem('gameops-calendar-sharelinks');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
