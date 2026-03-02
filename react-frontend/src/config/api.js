// Central API configuration for web app.
// Convention aligned with mobile `src/utils/env.js`.

const stripPort = (value) => (value ? String(value).split(':')[0] : null);

const normalizeApiUrl = (value) => {
  if (!value) return null;
  let out = String(value).trim().replace(/\/$/, '');
  if (!/\/api$/i.test(out)) out = `${out}/api`;
  return out;
};

const webHost =
  typeof window !== 'undefined' ? stripPort(window.location?.hostname) : null;
const devHost = webHost || 'localhost';
const apiPort = process.env.REACT_APP_API_PORT || '8081';

export const APP_ENV = process.env.REACT_APP_ENV || 'local';

// Explicit URL wins in all modes.
const EXPLICIT_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || null;
const API_BASE_URL_LOCAL =
  process.env.REACT_APP_API_BASE_URL_LOCAL || `http://${devHost}:${apiPort}/api`;
const API_BASE_URL_PROD =
  process.env.REACT_APP_API_BASE_URL_PROD || 'https://g-atelier-backend.onrender.com/api';

const rawBaseUrl =
  APP_ENV === 'prod'
    ? EXPLICIT_API_BASE_URL || API_BASE_URL_PROD
    : EXPLICIT_API_BASE_URL || API_BASE_URL_LOCAL;

export const API_BASE_URL = normalizeApiUrl(rawBaseUrl);

console.log('web env: APP_ENV=', APP_ENV);
console.log('web env: API_BASE_URL=', API_BASE_URL);

export default API_BASE_URL;
