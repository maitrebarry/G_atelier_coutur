import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Helper function to get token
const getToken = () => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Create axios instance with base URL

const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (error.response?.status === 402) {
      try {
        if (window.location.pathname !== '/abonnement') {
          window.location.href = '/abonnement';
        }
      } catch (e) {
        /* ignore */
      }
      return Promise.reject(error);
    }

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
  // Ensure any previous "seen subscription modal" flag is cleared on auth change.
  // sessionStorage is not affected by cookie clearing in the browser, so removing
  // this key here guarantees the expiry-modal can reappear after a fresh login.
  try {
    sessionStorage.removeItem('__SUB_MODAL_KEY__');
    localStorage.removeItem('__SUB_MODAL_KEY__');
  } catch (e) {
    /* ignore */
  }

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
  // Remove auth-related data and any session modal suppression flag so a
  // subsequent login starts with a clean UI state.
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userData');
  try {
    sessionStorage.removeItem('__SUB_MODAL_KEY__');
    localStorage.removeItem('__SUB_MODAL_KEY__');
  } catch (e) {
    /* ignore */
  }
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
