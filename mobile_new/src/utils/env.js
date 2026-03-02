// expose the current environment: "local" or "prod" ("staging" etc if needed)
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const stripPort = (value) => (value ? String(value).split(':')[0] : null);
const isLoopbackHost = (host) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1';

const normalizeApiUrl = (value) => {
  if (!value) return null;
  let out = String(value).trim().replace(/\/$/, '');
  if (!/\/api$/i.test(out)) out = `${out}/api`;
  return out;
};

const rewriteLoopbackForNative = (url, host) => {
  if (!url || !host || Platform.OS === 'web') return url;
  return url
    .replace('http://localhost:', `http://${host}:`)
    .replace('http://127.0.0.1:', `http://${host}:`)
    .replace('http://[::1]:', `http://${host}:`);
};

const webHost =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? stripPort(window.location?.hostname)
    : null;

// Expo SDKs expose dev host in different places depending on version/runtime.
const inferredHost =
  stripPort(Constants?.expoConfig?.hostUri) ||
  stripPort(Constants?.expoGoConfig?.debuggerHost) ||
  stripPort(Constants?.expoGoConfig?.hostUri) ||
  stripPort(Constants?.manifest2?.extra?.expoClient?.hostUri) ||
  stripPort(Constants?.manifest?.hostUri) ||
  stripPort(Constants?.manifest?.debuggerHost) ||
  null;

// If web host is LAN IP (e.g. 172.x/192.168.x), prefer it over inferred localhost.
const runtimeHost = webHost && !isLoopbackHost(webHost) ? webHost : inferredHost || webHost;

// Android emulator cannot reach host machine via localhost.
const emulatorAwareHost =
  Platform.OS === 'android' && isLoopbackHost(runtimeHost) ? '10.0.2.2' : runtimeHost;

const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST || emulatorAwareHost || 'localhost';

export const APP_ENV = process.env.EXPO_PUBLIC_ENV || 'local';

// Align with web style: one explicit base URL can be provided and wins over others.
// Example (LAN phone): EXPO_PUBLIC_API_BASE_URL=http://172.20.10.5:8081/api
const EXPLICIT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  null;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8081';

const API_BASE_URL_LOCAL =
  process.env.EXPO_PUBLIC_API_BASE_URL_LOCAL || `http://${DEV_HOST}:${API_PORT}/api`;
const API_BASE_URL_PROD =
  process.env.EXPO_PUBLIC_API_BASE_URL_PROD || 'https://g-atelier-backend.onrender.com/api';

// In local mode, explicit base URL must win (same behavior expected as web config).
const rawBaseUrl =
  APP_ENV === 'prod'
    ? EXPLICIT_API_BASE_URL || API_BASE_URL_PROD
    : EXPLICIT_API_BASE_URL || API_BASE_URL_LOCAL || `http://${DEV_HOST}:${API_PORT}/api`;

export const API_BASE_URL = rewriteLoopbackForNative(
  normalizeApiUrl(rawBaseUrl),
  DEV_HOST
);

// Log startup values to quickly diagnose mobile connection issues.
console.log('env: APP_ENV=', APP_ENV);
console.log('env: PLATFORM=', Platform.OS);
console.log('env: WEB_HOST=', webHost || '(none)');
console.log('env: DEV_HOST=', DEV_HOST);
console.log('env: API_PORT=', API_PORT);
console.log('env: EXPLICIT_API_BASE_URL=', EXPLICIT_API_BASE_URL || '(none)');
console.log('env: API_BASE_URL_LOCAL=', API_BASE_URL_LOCAL);
console.log('env: API_BASE_URL_PROD=', API_BASE_URL_PROD);
console.log('env: RAW_BASE_URL=', rawBaseUrl);
console.log('env: API_BASE_URL=', API_BASE_URL);



// Database connection strings (this file lives in mobile but illustrates
// how you can switch databases on the backend). Keep the one you're using
// and comment the other; when PostgreSQL is ready you can uncomment the PG
// URL and comment out the MySQL one below.

// export const DB_URL_MYSQL =
//   process.env.EXPO_PUBLIC_DB_URL_MYSQL || 'mysql://user:pass@localhost:3306/mydb';
// export const DB_URL_PG =
//   process.env.EXPO_PUBLIC_DB_URL_PG || 'postgres://user:pass@localhost:5432/mydb';
