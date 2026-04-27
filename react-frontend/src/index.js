import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// Custom styles
import './assets/css/app.css';
import './assets/css/icons.css';
import './assets/css/dark-theme.css';
import './assets/css/semi-dark.css';
import './assets/css/header-colors.css';
import './assets/css/logo_icon.css';
import './assets/css/mesure.css';
import './assets/css/modele.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA (production only)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service worker registered.', reg.scope))
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}