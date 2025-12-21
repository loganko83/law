import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import { registerServiceWorker, setupInstallPrompt } from './services/registerSW';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA
if (import.meta.env.PROD) {
  registerServiceWorker();
  setupInstallPrompt();
}