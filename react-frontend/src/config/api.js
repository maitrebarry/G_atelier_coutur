// central configuration for API endpoints used by the web app
// this mirrors the mobile `env.js` approach in the other project.

const LOCAL_DEFAULT = 'http://localhost:8081/api';

// CRA requires env vars to begin with REACT_APP_
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || LOCAL_DEFAULT;

export default API_BASE_URL;
