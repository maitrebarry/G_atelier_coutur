// expose the current environment: "local" or "prod" ("staging" etc if you like)
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// determine host for development based on platform or explicit override
const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// try to pull the real dev machine IP from expo manifest's debuggerHost
let inferredHost = null;
if (Constants.manifest && Constants.manifest.debuggerHost) {
  inferredHost = Constants.manifest.debuggerHost.split(':')[0];
} else if (
  Constants.expoConfig &&
  Constants.expoConfig.packagerOpts &&
  Constants.expoConfig.packagerOpts.dev &&
  Constants.expoConfig.packagerOpts.dev.host
) {
  inferredHost = Constants.expoConfig.packagerOpts.dev.host.split(':')[0];
}
const DEV_HOST =
  process.env.EXPO_PUBLIC_DEV_HOST ||
  inferredHost ||
  LOCALHOST; // if nothing else, use platform localhost (10.0.2.2 on Android)

export const APP_ENV = process.env.EXPO_PUBLIC_ENV || 'local';

// local and prod base URLs for the API
const API_BASE_URL_LOCAL =
  process.env.EXPO_PUBLIC_API_BASE_URL_LOCAL || `http://${DEV_HOST}:8081/api`;
const API_BASE_URL_PROD =
  process.env.EXPO_PUBLIC_API_BASE_URL_PROD || 'https://g-atelier-backend.onrender.com';

export const API_BASE_URL =
  (APP_ENV === 'prod' ? API_BASE_URL_PROD : API_BASE_URL_LOCAL).replace(/\/$/, '');

// log for debugging when app starts; makes it easy to verify what host is being used
console.log('env: APP_ENV=', APP_ENV);
console.log('env: DEV_HOST=', DEV_HOST);
console.log('env: API_BASE_URL_LOCAL=', API_BASE_URL_LOCAL);
console.log('env: API_BASE_URL_PROD=', API_BASE_URL_PROD);
console.log('env: API_BASE_URL=', API_BASE_URL);



// Database connection strings (this file lives in mobile but illustrates
// how you can switch databases on the backend). Keep the one you're using
// and comment the other; when PostgreSQL is ready you can uncomment the PG
// URL and comment out the MySQL one below.

// export const DB_URL_MYSQL =
//   process.env.EXPO_PUBLIC_DB_URL_MYSQL || 'mysql://user:pass@localhost:3306/mydb';
// export const DB_URL_PG =
//   process.env.EXPO_PUBLIC_DB_URL_PG || 'postgres://user:pass@localhost:5432/mydb';
