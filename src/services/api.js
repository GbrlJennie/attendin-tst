import axios from 'axios';
const isDev = import.meta.env.DEV;

const IDENTITY_BASE = isDev ? '/identity-api' : import.meta.env.VITE_IDENTITY_API;
const ATTENDANCE_BASE = isDev ? '/attendance-api' : import.meta.env.VITE_ATTENDANCE_API;

const identityApi = axios.create({
  baseURL: IDENTITY_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const attendanceApi = axios.create({
  baseURL: ATTENDANCE_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menambahkan token ke setiap request
identityApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attendanceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== IDENTITY SERVICE API ====================

// Login user
export const loginUser = async (email, password) => {
  const response = await identityApi.post('/api/auth/login', { email, password });
  return response.data;
};

// Register user baru
export const registerUser = async (userData) => {
  const response = await identityApi.post('/api/auth/register', userData);
  return response.data;
};

// Get profile user yang sedang login
export const getUserProfile = async () => {
  const response = await identityApi.get('/api/auth/me');
  return response.data;
};

// Get semua users (Admin only)
export const getAllUsers = async () => {
  const response = await identityApi.get('/api/users');
  return response.data;
};

// ==================== ATTENDANCE SERVICE API ====================

// Submit absensi dengan format lengkap (sesuai gambar)
export const submitAttendance = async (userId, eventType, category, notes = '') => {
  console.log('Submitting attendance:', { user_id: userId, event_type: eventType, category, notes });
  
  const payload = {
    user_id: userId,
    event_type: eventType,  // CHECK_IN atau CHECK_OUT
    category: category,     // WFO, WFH, SAKIT, IZIN
    notes: notes || null
  };
  
  try {
    const response = await attendanceApi.post('/api/logs', payload);
    console.log('Attendance response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Attendance API error:', error.response?.data || error.message);
    throw error;
  }
};

// Legacy function untuk backward compatibility
export const submitAbsensi = async (userId, status) => {
  let category = 'WFO';
  if (status === 'Izin') category = 'IZIN';
  else if (status === 'Sakit') category = 'SAKIT';
  
  return submitAttendance(userId, 'CHECK_IN', category, `Absensi ${status}`);
};

// Get semua log attendance (Admin) - ambil lebih banyak data
export const getAttendanceLogs = async (limit = 100) => {
  try {
    const response = await attendanceApi.get(`/api/logs?limit=${limit}`);
    console.log('Raw attendance response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    throw error;
  }
};

// Get attendance logs by user ID
export const getAttendanceByUser = async (userId) => {
  const response = await attendanceApi.get(`/api/logs?user_id=${userId}`);
  return response.data;
};

// Get attendance summary/statistics (jika ada endpoint-nya)
export const getAttendanceSummary = async () => {
  const response = await attendanceApi.get('/api/logs?limit=100');
  return response.data;
};