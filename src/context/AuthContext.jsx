import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './AuthContextValue';

const STORAGE_KEY = 'stockflow_owner_token';
const USER_STORAGE_KEY = 'stockflow_user_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  const [userToken, setUserToken] = useState(() => sessionStorage.getItem(USER_STORAGE_KEY));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('stockflow_user') || 'null'); } catch { return null; }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken } = await api.ownerLogin(password);
      sessionStorage.setItem(STORAGE_KEY, newToken);
      setToken(newToken);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (credential) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken, user: userData } = await api.googleAuth(credential);
      sessionStorage.setItem(USER_STORAGE_KEY, newToken);
      sessionStorage.setItem('stockflow_user', JSON.stringify(userData));
      setUserToken(newToken);
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  const userLogout = useCallback(() => {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem('stockflow_user');
    setUserToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, isAuthenticated: !!token, login, logout, error, loading, setError,
      userToken, isUserAuthenticated: !!userToken, user, googleLogin, userLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
