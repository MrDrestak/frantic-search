import './index.css';
import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),  // traces + unhandled promise rejections
    Sentry.httpClientIntegration(),      // errores de red (fetch/XHR no-2xx)
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo salió mal. Por favor recarga la página.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
