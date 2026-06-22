import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/env';
import { cacheOnlineResponse, isOfflineForced, offlineHandle } from './offlineStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// attach auth token and start time
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.metadata = { startTime: new Date() };
  return config;
});

// log duration and errors
api.interceptors.response.use(
  (response) => {
    const { config } = response;
    if (config.metadata && config.metadata.startTime) {
      const duration = new Date() - config.metadata.startTime;
      console.log(`API ${config.url} took ${duration}ms`);
    }
    return response;
  },
  (error) => {
    if (error.config && error.config.metadata && error.config.metadata.startTime) {
      const duration = new Date() - error.config.metadata.startTime;
      console.warn(`API ${error.config.url} failed after ${duration}ms`);
    }
    return Promise.reject(error);
  }
);

const wrapOffline = (method) => {
  const onlineMethod = api[method].bind(api);
  api[method] = async (url, dataOrConfig, maybeConfig) => {
    const data = ['post', 'put', 'patch'].includes(method) ? dataOrConfig : undefined;

    if (isOfflineForced()) {
      const offlineData = await offlineHandle(method, url, data);
      return { data: offlineData, status: 200, statusText: 'OFFLINE', headers: {}, config: maybeConfig || dataOrConfig || {} };
    }

    try {
      const response = await onlineMethod(url, dataOrConfig, maybeConfig);
      cacheOnlineResponse(method, url, response?.data).catch(() => {});
      return response;
    } catch (error) {
      const isNetworkError = !error?.response || error?.code === 'ECONNABORTED' || /Network Error/i.test(error?.message || '');
      if (!isNetworkError) throw error;
      const offlineData = await offlineHandle(method, url, data);
      return { data: offlineData, status: 200, statusText: 'OFFLINE', headers: {}, config: maybeConfig || dataOrConfig || {} };
    }
  };
};

['get', 'post', 'put', 'delete'].forEach(wrapOffline);

export default api;
