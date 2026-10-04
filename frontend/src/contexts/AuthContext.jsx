import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiRequest } from '../config/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
        error: null
      };
    case 'REGISTER_SUCCESS':
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'REGISTER_FAIL':
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        console.log('[Auth] loadUser: token found, fetching /auth/me');
        const data = await apiRequest(API_ENDPOINTS.AUTH.ME, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('[Auth] loadUser: success', data);
        dispatch({
          type: 'USER_LOADED',
          payload: data.user
        });
      } catch (err) {
        console.error('[Auth] loadUser: error', err);
        dispatch({ type: 'AUTH_ERROR', payload: err.message });
      }
    } else {
      console.log('[Auth] loadUser: no token found');
      dispatch({ type: 'AUTH_ERROR', payload: 'No token found' });
    }
  }, []);

  // Register user
  const register = async (formData) => {
    try {
      console.log('[Auth] register: attempting registration');
      const data = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      console.log('[Auth] register: success', data);
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: data
      });
      return { success: true };
    } catch (err) {
      console.error('[Auth] register: error', err);
      dispatch({
        type: 'REGISTER_FAIL',
        payload: err.message || 'Registration failed'
      });
      return { success: false, error: err.message };
    }
  };

  // Login user
  const login = async (formData) => {
    try {
      console.log('[Auth] login: attempting login');
      const data = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      console.log('[Auth] login: success', data);
      
      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      
      // Dispatch success action with user data
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: data
      });
      
      // Load user data to ensure auth state is up to date
      await loadUser();
      
      return { success: true };
    } catch (err) {
      console.error('[Auth] login: error', err);
      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.message || 'Login failed'
      });
      return { success: false, error: err.message };
    }
  };

  // Logout
  const logout = () => {
    console.log('[Auth] logout');
    try {
      localStorage.removeItem('token');
    } catch (e) {
      console.error('[Auth] Failed to remove token from localStorage', e);
    }
    dispatch({ type: 'LOGOUT' });
  };

  // Clear errors
  const clearErrors = () => {
    console.log('[Auth] clearErrors');
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  // Set loading
  const setLoading = (isLoading) => {
    console.log(`[Auth] setLoading: ${isLoading}`);
    dispatch({
      type: 'SET_LOADING',
      payload: isLoading
    });
  };

  // Load user on mount
  useEffect(() => {
    console.log('[Auth] useEffect: loading user');
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        error: state.error,
        loadUser,
        register,
        login,
        logout,
        clearErrors,
        setLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
