# G_atelier_coutur Mobile (React Native / Expo)

This is a minimal Expo React Native scaffold to consume the same backend as the web app.

Quick start

1. Install dependencies:

```bash
cd G_atelier_coutur/mobile
npm install
```

2. Start Expo:

```bash
npm start
# or
npx expo start
```

3. Configure backend URL via environment variables (see below).  The project now uses `src/utils/env.js` to read `EXPO_PUBLIC_` variables.


## Configuration & environment variables

The mobile app determines the correct API endpoint and OAuth redirect URL using `src/utils/env.js`.  It respects the following variables:

- `EXPO_PUBLIC_ENV` – set to `local` (default) or `prod` to pick the corresponding URLs.
- `EXPO_PUBLIC_API_BASE_URL_LOCAL` – local API address (e.g. `http://10.0.2.2:8080/api`).
- `EXPO_PUBLIC_API_BASE_URL_PROD` – production API URL (for Render, etc.).
- `EXPO_PUBLIC_FRONTEND_BASE_URL_LOCAL` / `_PROD` – frontend host used during OAuth flows.
- `EXPO_PUBLIC_OAUTH_REDIRECT_URL` – override the redirect URI if needed.

Example start command for local development on a specific IP:

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=172.20.10.5 \
EXPO_PUBLIC_API_BASE_URL_LOCAL=http://172.20.10.5:8080/api \
npx expo start --clear --lan
```

### Notes on backend databases

When deploying the backend you can point it at MySQL or PostgreSQL.  In
`src/utils/env.js` there are commented template lines showing how to expose
the database URL for each engine.  Once your PostgreSQL instance is ready,
uncomment the `DB_URL_PG` variable and comment out the MySQL one.


What’s included

- `App.js` — navigation and app entry
- `src/api/backend.js` — axios instance with token handling
- `src/screens/*` — Login, Home, Profile, Rendezvous placeholders

Next steps

- Implement full UI matching web features (Abonnement, Rendezvous creation, profile photo upload).
- Wire endpoints used by the web backend and reuse business logic.
