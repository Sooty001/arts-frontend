import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  logoutKeycloak,
  loginKeycloak,
  registerUserInKeycloak,
  registerUserProfile
} from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const checkAuthStatus = useCallback(() => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    const accessExpired = isAccessTokenExpired();
    const refreshExpired = isRefreshTokenExpired();

    const authenticated = (token && !accessExpired) || (refreshToken && !refreshExpired);
    setIsAuthenticated(authenticated);
  }, []);

  useEffect(() => {
    checkAuthStatus();
    const handleStorageChange = () => checkAuthStatus();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuthStatus]);

  const login = async (username, password) => {
    try {
      const tokens = await loginKeycloak(username, password);
      setIsAuthenticated(true);
      return tokens;
    } catch (error) {
      setIsAuthenticated(false);
      setUserProfile(null);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const keycloakUser = await registerUserInKeycloak(username, email, password);
      const profile = await registerUserProfile(keycloakUser.id, username);
      await login(username, password);
      return profile;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    logoutKeycloak();
    setIsAuthenticated(false);
    setUserProfile(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isAuthenticated && !userProfile) {
      setUserProfile({
        name: 'Текущий Пользователь',
        nickname: '',
        avatarUrl: '',
      });
    } else if (!isAuthenticated && userProfile) {
      setUserProfile(null);
    }
  }, [isAuthenticated, userProfile]);

  const authContextValue = {
    isAuthenticated,
    userProfile,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};