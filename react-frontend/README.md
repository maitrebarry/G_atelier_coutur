# G_atelier_coutur Web Frontend

This is the React (Create React App) frontend that talks to the same backend
as the mobile application.  It uses Axios for API calls and React Router for
navigation.

## Environment configuration

Variables are read from the usual `.env` files handled by CRA.  Only
variables prefixed with `REACT_APP_` are exposed to the browser.

The important keys are defined in `.env.example`:

```text
REACT_APP_API_BASE_URL=http://localhost:8081/api
```

You can override that when starting the dev server:

```bash
REACT_APP_API_BASE_URL=https://g-atelier-backend.onrender.com/api \
npm start
```

This value is consumed by `src/config/api.js` which exports `API_BASE_URL`.
All requests created in `src/api/api.js` use that constant.

### Deploying (Render, Netlify, etc.)

Set the environment variable `REACT_APP_API_BASE_URL` in the hosting service
to point at your deployed API. The frontend will rebuild with the correct
endpoint.

## Database comment block

For your backend, you can switch between MySQL and PostgreSQL by adjusting
environment variables.  The mobile configuration file contains commented
examples; you can follow the same pattern on the server side and uncomment
the relevant connection string once the database is ready.


## Running locally

```bash
cd react-frontend
npm install
npm start
```

The web app will then be available at `http://localhost:3000`.
