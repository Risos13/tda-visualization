// Base API configuration
// In development, use the full URL to the backend service
// In production, use the relative path (handled by Nginx proxy)
export const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/api' 
  : '/api';

console.log('[API] Base URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    ME: `${API_BASE_URL}/auth/me`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  DATASETS: {
    BASE: `${API_BASE_URL}/datasets`,
    UPLOAD: `${API_BASE_URL}/datasets/upload`,
    BY_ID: (id) => `${API_BASE_URL}/datasets/${id}`,
    PROCESS: (id) => `${API_BASE_URL}/datasets/${id}/process`,
  },
  TDA: {
    BASE: `${import.meta.env.VITE_TDA_SERVICE_URL || '/tda'}`,
  },
};

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Cache': 'no-cache',
};

// Helper function for making API requests
export const apiRequest = async (url, options = {}) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    // Log request details
    console.log(`[API] [${requestId}] Making request to: ${url}`, { 
      method: options.method || 'GET', 
      headers: options.headers,
      body: options.body 
    });
    
    // Ensure we have proper CORS headers
    const headers = {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    };

    // Add CORS headers if not already set
    if (!headers['Origin']) {
      headers['Origin'] = window.location.origin;
    }
    
    // Ensure credentials are included for CORS
    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include', // Important for cookies and CORS
      mode: 'cors', // Ensure CORS mode is enabled
    };
    
    // Log the actual request being made
    console.log(`[API] [${requestId}] Fetch options:`, {
      method: fetchOptions.method,
      headers: { ...fetchOptions.headers, 'Authorization': '[REDACTED]' }, // Don't log the full token
      credentials: fetchOptions.credentials,
      mode: fetchOptions.mode,
      body: fetchOptions.body ? JSON.parse(fetchOptions.body) : undefined
    });
    
    const response = await fetch(url, fetchOptions);
    
    // Log response details
    console.log(`[API] [${requestId}] Response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      redirected: response.redirected,
      type: response.type,
      url: response.url
    });

    // Clone the response to read it multiple times if needed
    const responseClone = response.clone();
    
    // Try to parse the response as JSON, fallback to text if it fails
    let data;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      // First try to parse as JSON if content-type matches
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, get as text and try to parse it anyway (might be JSON with wrong content-type)
        const text = await response.text();
        console.log(`[API] [${requestId}] Non-JSON response:`, text);
        
        // Try to parse as JSON even if content-type doesn't match
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { message: text };
        }
      }
      
      // Log the parsed data
      console.log(`[API] [${requestId}] Parsed response data:`, data);
      
      // If response is not OK, throw an error with the response data
      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        error.requestId = requestId;
        throw error;
      }
      
      return data;
      
    } catch (error) {
      // If we have a response but failed to parse it, include the status in the error
      if (response) {
        error.status = response.status;
        error.statusText = response.statusText;
      }
      console.error(`[API] [${requestId}] Request failed:`, error);
      throw error;
    }
    
  } catch (error) {
    // Log the full error for debugging
    console.error(`[API] [${requestId}] Unhandled error in apiRequest:`, error);
    
    // Re-throw with a more user-friendly message if needed
    if (!error.status) {
      error.message = `Network error: ${error.message}`;
    }
    throw error;
  }
};
