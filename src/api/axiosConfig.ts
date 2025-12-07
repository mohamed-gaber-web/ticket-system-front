import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: false, // Set to true if you need to send cookies
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }

    // Always set Content-Type
    config.headers['Content-Type'] = 'application/json';

    // Add token if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Log request for debugging (remove in production)
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
    });

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
    // Log successful response (remove in production)
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    // Log error response
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });

    const originalRequest = error.config;

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const userType = localStorage.getItem('userType');

      if (refreshToken && userType) {
        try {
          const { data } = await axios.post(
            'http://localhost:5000/api/auth/refresh-token',
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
            originalRequest.headers = {} as any;
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
