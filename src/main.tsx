import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);

// PWA Service Worker management
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Unregister any active service workers in dev mode to avoid Vite HMR caching collisions
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    // Register PWA Service Worker for production standalone app experience
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('DocuMind app updated. Refresh for latest version.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('DocuMind PWA Service Worker registration:', err);
        });
    });
  }
}

