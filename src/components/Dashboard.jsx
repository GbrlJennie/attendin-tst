import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitAttendance, getAttendanceLogs } from '../services/api';
import { HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  
  // Form state
  const [category, setCategory] = useState('WFO');
  const [notes, setNotes] = useState('');

  // Filter state
  const [filterDate, setFilterDate] = useState('');

  const isUserActive = user?.status === 'active';

  useEffect(() => {
    fetchLogs();
  }, [user]);

  // Apply date filter
  useEffect(() => {
    if (!filterDate) {
    setFilteredLogs(logs);
  } else {
    const filtered = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const year = logDate.getFullYear();
      const month = String(logDate.getMonth() + 1).padStart(2, '0');
      const day = String(logDate.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      return localDateString === filterDate;
    });
      setFilteredLogs(filtered);
    }
  }, [logs, filterDate]);

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      const response = await getAttendanceLogs();
      const userLogs = (response || []).filter(log => 
        String(log.user_id) === String(user.id)
      );
      setLogs(userLogs);
      setFilteredLogs(userLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    setIsLoadingLogs(false);
  };

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => {
      setToast({ show: false, type: '', text: '' });
    }, 4000);
  };

  const handleSubmit = async (eventType) => {
    if (!isUserActive) {
      showToast('error', 'Akun Anda tidak aktif. Hubungi admin untuk mengaktifkan akun.');
      return;
    }

    setIsLoading(true);

    const userId = user?.id || user?._id || user?.user_id;

    if (!userId) {
      showToast('error', 'User ID tidak ditemukan. Silakan login ulang.');
      setIsLoading(false);
      return;
    }

    try {
      await submitAttendance(userId, eventType, category, notes);
      showToast(
        'success', 
        `${eventType === 'CHECK_IN' ? 'Check In' : 'Check Out'} Success\nLog ${eventType} berhasil untuk user ID ${userId}`
      );
      setNotes('');
      fetchLogs();
    } catch (error) {
      console.error('Attendance error:', error.response?.data || error);
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       'Gagal mencatat kehadiran';
      showToast('error', typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    setIsLoading(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    };
  };

  const clearFilter = () => {
    setFilterDate('');
  };

  // Calculate today's work hours
  const calculateTodayWorkHours = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      return logDate === today;
    });

    const checkIn = todayLogs.find(log => log.event_type === 'CHECK_IN');
    const checkOut = todayLogs.find(log => log.event_type === 'CHECK_OUT');

    if (!checkIn) return '0h 0m';
    if (!checkOut) {
      // If no checkout, calculate from check-in to now
      const now = new Date();
      const checkInTime = new Date(checkIn.timestamp);
      const diffMs = now - checkInTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }

    const checkInTime = new Date(checkIn.timestamp);
    const checkOutTime = new Date(checkOut.timestamp);
    const diffMs = checkOutTime - checkInTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate total days present this month
  const calculateMonthlyAttendance = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getMonth() === currentMonth && 
             logDate.getFullYear() === currentYear &&
             log.event_type === 'CHECK_IN';
    });

    // Get unique dates
    const uniqueDates = new Set(
      monthlyLogs.map(log => new Date(log.timestamp).toISOString().split('T')[0])
    );

    return uniqueDates.size;
  };

  return (
    <div className="dashboard">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type} ${toast.show ? 'show' : ''}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? '✓' : '✕'}
          </div>
          <div className="toast-content">
            <div className="toast-title">
              {toast.type === 'success' ? 'Success' : 'Error'}
            </div>
            <div className="toast-message">
              {toast.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
          <button 
            className="toast-close" 
            onClick={() => setToast({ show: false, type: '', text: '' })}
          >
            ✕
          </button>
        </div>
      )}

      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="user-info">
              <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <p className="user-name">{user?.name}</p>
                <p className="user-email">{user?.email}</p>
                <div className="user-badges">
                  <span className="role-badge">{user?.role}</span>
                  <span className={`status-badge-user ${user?.status === 'active' ? 'active' : 'inactive'}`}>
                    {user?.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="header-center">
            <div className="app-title-container">
              <HiOutlineClipboardDocumentCheck className="app-logo-icon" />
            <h1 className="app-title">Attend.In</h1>
            </div>
            <p className="app-subtitle">Attendance Management System</p>
          </div>

          <div className="header-right">
            {isAdmin() && (
              <button onClick={() => navigate('/admin')} className="admin-button">
                Admin Panel
              </button>
            )}
            <button onClick={logout} className="logout-button">
              <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Input Kehadiran Panel */}
          <section className="attendance-panel">
            <div className="panel-header">
              <h3>Input Kehadiran</h3>
              <p>Masukkan data log.</p>
            </div>

            {!isUserActive && (
              <div className="inactive-warning">
                ⚠️ Akun Anda tidak aktif. Anda tidak dapat melakukan presensi.
              </div>
            )}

            <div className="form-group">
              <label>User ID (NIM/NIP)</label>
              <input 
                type="text" 
                value={user?.id || ''} 
                disabled 
                className="input-disabled"
              />
            </div>

            <div className="form-group">
              <label>Kategori Kehadiran</label>
              <div className="category-buttons">
                <button
                  type="button"
                  className={`category-btn ${category === 'WFO' ? 'active' : ''}`}
                  onClick={() => setCategory('WFO')}
                  disabled={!isUserActive}
                >
                  🏢 WFO
                </button>
                <button
                  type="button"
                  className={`category-btn ${category === 'WFH' ? 'active' : ''}`}
                  onClick={() => setCategory('WFH')}
                  disabled={!isUserActive}
                >
                  🏠 WFH
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Catatan (Opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cth: Demam tinggi / Meeting luar"
                rows={3}
                disabled={!isUserActive}
              />
            </div>

            <div className="action-buttons">
              <button
                onClick={() => handleSubmit('CHECK_IN')}
                disabled={isLoading || !isUserActive}
                className="btn-checkin"
              >
                Check In
              </button>
              <button
                onClick={() => handleSubmit('CHECK_OUT')}
                disabled={isLoading || !isUserActive}
                className="btn-checkout"
              >
                Check Out
              </button>
            </div>
          </section>

          {/* Live Attendance Logs */}
          <section className="attendance-history">
            <div className="history-header">
              <h3>Live Attendance Logs</h3>
              <div className="header-actions">
                <button 
                  onClick={fetchLogs} 
                  className="refresh-icon-button" 
                  disabled={isLoadingLogs}
                  title="Refresh logs"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter & Statistics Section */}
            <div className="filter-section">
              <div className="filter-group">
                <label>Filter by Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              {filterDate && (
                <button onClick={clearFilter} className="clear-filter-btn">
                  Clear Filter
                </button>
              )}

              <div className="stats-group">
                <div className="stat-item">
                  <span className="stat-label">Work Hours Today</span>
                  <span className="stat-value">{calculateTodayWorkHours()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Days Present (Month)</span>
                  <span className="stat-value">{calculateMonthlyAttendance()} days</span>
                </div>
              </div>

              <div className="log-count">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="loading">Memuat data...</div>
            ) : filteredLogs.length > 0 ? (
              <div className="table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>USER ID</th>
                      <th>EVENT</th>
                      <th>CATEGORY</th>
                      <th>NOTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const { time, date } = formatTime(log.timestamp);
                      return (
                        <tr key={log.id || index}>
                          <td>
                            <div className="time-cell">
                              <span className="time">{time}</span>
                              <span className="date">{date}</span>
                            </div>
                          </td>
                          <td><span className="user-id">#{log.user_id}</span></td>
                          <td>
                            <span className={`event-badge ${log.event_type?.toLowerCase()}`}>
                              {log.event_type}
                            </span>
                          </td>
                          <td>
                            <span className={`category-badge ${log.category?.toLowerCase()}`}>
                              {log.category}
                            </span>
                          </td>
                          <td>{log.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>📭 {filterDate ? 'Tidak ada data untuk tanggal ini' : 'Belum ada riwayat kehadiran'}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;