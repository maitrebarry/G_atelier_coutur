import axios from 'axios';

// Helper function to get token
const getToken = () => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8081/api',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log(`[API] Request to ${config.url} - Token exists: ${!!token}`);
    if (token) {
      // Ensure Bearer prefix is present and correct
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = authHeader;
      console.log(`[API] Setting Authorization header: ${authHeader.substring(0, 20)}...`);
    } else {
      console.warn('[API] No token found for request');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or unauthorized, clear auth and redirect to login
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('userData');
      try {
        // ensure a clean redirect to login page
        window.location.href = '/login';
      } catch (e) {
        /* ignore */
      }
    }
    return Promise.reject(error);
  }
);

export const getUserData = () => {
  const data = localStorage.getItem('userData') || sessionStorage.getItem('userData');
  return data ? JSON.parse(data) : null;
};

export const setAuthData = (token, userData, remember = true) => {
  if (remember) {
    // Clear session storage to avoid conflicts
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  } else {
    // Clear local storage to avoid conflicts
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('userData', JSON.stringify(userData));
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userData');
};

export const hasRole = (allowedRoles) => {
  const user = getUserData();
  if (!user || !user.role) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  return allowedRoles === user.role;
};

export default api;
