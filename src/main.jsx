import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import './index.css'
import App from './App.jsx'
import { bootstrapTheme } from './hooks/useTheme'
import { Web3Provider } from './components/providers/Web3Provider.jsx'
import RenderWakeup from './components/RenderWakeup.jsx'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1, // 10% of transactions
  });
}

// Global crash protection — prevent unhandled promise rejections from killing the app
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't let Firebase auth failures or API errors crash the app
  event.preventDefault();
});

bootstrapTheme();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RenderWakeup>
      <Web3Provider>
        <App />
      </Web3Provider>
    </RenderWakeup>
  </StrictMode>,
)
