import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, getUserProfile } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in (token exists)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (err) {
          console.error('Error parsing saved user:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await apiLogin(email, password);
      console.log('Login response:', response); // Debug: lihat struktur response
      
      // Handle berbagai format response dari Identity Service
      const token = response.token || response.access_token || response.data?.token;
      const userData = response.user || response.data?.user || response.data || response;
      
      // Pastikan userData punya id (bisa id, _id, atau user_id)
      if (userData && !userData.id) {
        userData.id = userData._id || userData.user_id || userData.userId;
      }
      
      console.log('Parsed user data:', userData); // Debug: lihat data user
      
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login gagal. Periksa email dan password Anda.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  // Check if user is admin (case-insensitive)
  const isAdmin = () => {
    const role = user?.role?.toLowerCase();
    return role === 'admin';
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
