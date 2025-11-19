import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

// Environment configuration
const CELLER_HUT_API_URL =
  process.env.CELLER_HUT_API_URL || 'https://api.ekasicart.com';
const CELLER_HUT_API_TIMEOUT = parseInt(
  process.env.CELLER_HUT_API_TIMEOUT || '30000',
);

// Create axios instance for Ekasi Cart API
const cellerHutAPI = axios.create({
  baseURL: CELLER_HUT_API_URL,
  timeout: Number(12000),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Store for authentication token
let authToken: string | null = null;

// Set authentication token
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Get authentication token
export const getAuthToken = (): string | null => {
  return authToken;
};

// Request interceptor for authentication
cellerHutAPI.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add authentication token if available
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Log request for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Ekasi Cart API] ${config.method?.toUpperCase()} ${config.url}`,
      );
    }

    return config;
  },
  (error) => {
    console.error('[Ekasi Cart API] Request error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor for data extraction and error handling
cellerHutAPI.interceptors.response.use(
  (response: AxiosResponse) => {
    // Extract data from Ekasi Cart response wrapper
    // Ekasi Cart format: { status: "success", message: "...", data: {...} }
    // Transform to: {...} (direct data)

    if (response.data && typeof response.data === 'object') {
      // If response has Ekasi Cart wrapper format
      if (
        response.data.status === 'success' &&
        response.data.data !== undefined
      ) {
        return {
          ...response,
          data: response.data.data,
        };
      }

      // If response already has direct data format
      return response;
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle Ekasi Cart error format
    if (error.response?.data) {
      const errorData = error.response.data as any;

      // Transform Ekasi Cart error format to standard format
      if (errorData.status === 'error') {
        const transformedError = {
          statusCode: error.response.status,
          message: errorData.message || 'An error occurred',
          errors: errorData.errors || {},
        };

        // Log error for debugging
        console.error('[Ekasi Cart API] Error:', transformedError);

        // Create new error with transformed data
        const newError = new Error(transformedError.message);
        (newError as any).statusCode = transformedError.statusCode;
        (newError as any).errors = transformedError.errors;

        return Promise.reject(newError);
      }
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('[Ekasi Cart API] Request timeout');
      return Promise.reject(
        new Error('Request timeout - Ekasi Cart API not responding'),
      );
    }

    if (error.code === 'ERR_NETWORK') {
      console.error('[Ekasi Cart API] Network error');
      return Promise.reject(
        new Error('Network error - Unable to reach Ekasi Cart API'),
      );
    }

    // Default error handling
    console.error('[Ekasi Cart API] Unexpected error:', error);
    return Promise.reject(error);
  },
);

// Health check function
export const checkCellerHutHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${CELLER_HUT_API_URL}/health`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('[Ekasi Cart API] Health check failed:', error);
    return false;
  }
};

export default cellerHutAPI;
