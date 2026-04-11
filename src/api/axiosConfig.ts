import axios, { type AxiosRequestHeaders } from 'axios';

// Dynamically get API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased to 60 seconds for slow server responses (Railway cold starts)
  withCredentials: false, // Set to true if you need to send cookies
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }

    // Don't set Content-Type for FormData (file uploads)
    // Axios needs to set it automatically with the correct boundary
    const isFormData = config.data instanceof FormData;

    // Only set Content-Type to application/json if it's not FormData and not already set
    if (!isFormData && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Skip auth header for public auth endpoints (login, signup, reset)
    const publicAuthEndpoints = ['/auth/signin', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];
    const isPublicAuthRequest = publicAuthEndpoints.some((endpoint) => config.url?.includes(endpoint));

    // Add token if it exists and the request is not a public auth call
    const token = localStorage.getItem('token');
    if (token && !isPublicAuthRequest) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log('API Request:', { method: config.method?.toUpperCase(), url: config.url });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('API Response:', { status: response.status, url: response.config.url });
    }
    return response;
  },
  async (error) => {
    // Skip logging expected "not found" responses — these are handled gracefully by the callers
    if (error.response?.status !== 404) {
      console.error('API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.message || error.message,
      });
    }

    const originalRequest = error.config;

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const userType = localStorage.getItem('userType');

      if (refreshToken && userType) {
        try {
          const { data } = await axios.post(
            `${API_URL}/auth/refresh-token`,
            { refreshToken, userType },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          // Update token in localStorage
          localStorage.setItem('token', data.token);

          // Update Authorization header
          if (!originalRequest.headers) {
            originalRequest.headers = {} as AxiosRequestHeaders;
          }
          originalRequest.headers['Authorization'] = `Bearer ${data.token}`;

          // Retry original request
          return api(originalRequest);
        } catch (err) {
          // Refresh token failed - redirect to login
          console.error('Token refresh failed:', err);
          localStorage.clear();
          window.location.href = '/signin';
          return Promise.reject(err);
        }
      } else {
        // No refresh token - redirect to login
        localStorage.clear();
        window.location.href = '/signin';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
