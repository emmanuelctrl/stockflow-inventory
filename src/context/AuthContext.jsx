import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './AuthContextValue';

const STORAGE_KEY = 'stockflow_owner_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY));
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

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, error, loading, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
