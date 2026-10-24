import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('jansetu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('jansetu_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('jansetu_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.error('Session verify error:', err.message);
        localStorage.removeItem('jansetu_token');
        localStorage.removeItem('jansetu_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: userData, token } = res.data;
      localStorage.setItem('jansetu_token', token);
      localStorage.setItem('jansetu_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      localStorage.removeItem('jansetu_token');
      localStorage.removeItem('jansetu_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const demoLogin = async (target) => {
    let email = 'admin@jansetu.gov.demo';
    let password = 'Password@123';

    if (typeof target === 'string') {
      if (target.includes('@')) {
        email = target;
      } else if (target === 'APPLICANT') {
        email = 'arjun@jansetu.demo';
      } else if (target === 'ADMIN' || target === 'RECORDS_ADMIN' || target === 'SUPER_ADMIN') {
        email = 'admin@jansetu.gov.demo';
      } else if (target === 'OFFICER_EDUCATION') {
        email = 'officer.education@jansetu.gov.demo';
      } else if (target === 'OFFICER_HOUSING') {
        email = 'officer.housing@jansetu.gov.demo';
      } else {
        email = 'admin@jansetu.gov.demo';
      }
    } else if (target && target.email) {
      email = target.email;
      if (target.password) password = target.password;
    }

    return login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role, loading, login, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
