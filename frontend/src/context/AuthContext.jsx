import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState('');

  const refreshMe = useCallback(async () => {
    try {
      setError('');
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setBooted(true);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email, password) => {
    setError('');
    const res = await api.login(email, password);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload) => {
    setError('');
    const res = await api.register(payload);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    setError('');
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, booted, error, setError, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
