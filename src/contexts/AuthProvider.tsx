import React, { useReducer, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthState } from './AuthContext';
import {
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  getCurrentUser,
  onAuthStateChange,
} from '../lib/auth';
import type { User, LoginCredentials, SignupCredentials } from '../lib/auth';

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication failed',
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check current auth state on mount
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return unsubscribe;
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await authLogin(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch {
      dispatch({ type: 'LOGIN_ERROR' });
      throw new Error('Login failed');
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await authSignup(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch {
      dispatch({ type: 'LOGIN_ERROR' });
      throw new Error('Signup failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authLogout();
      dispatch({ type: 'LOGOUT' });
    } catch {
      throw new Error('Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
