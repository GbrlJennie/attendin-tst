import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { getAttendanceLogs, getAllUsers } from '../services/api';
import { HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  // Apply filters when logs or filter values change
  useEffect(() => {
    applyFilters();
  }, [logs, filterDate, filterUserId, filterName, users]);

  const fetchAllData = async () => {
    await Promise.all([fetchLogs(), fetchUsers()]);
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await getAttendanceLogs(200);
      console.log('Raw attendance response:', response);
      
      // Handle different response structures
      let logsData = [];
      if (Array.isArray(response)) {
        logsData = response;
      } else if (response && Array.isArray(response.data)) {
        logsData = response.data;
      } else if (response && response.logs) {
        logsData = response.logs;
      }
      
      console.log('Processed logs data:', logsData);
      console.log('Total logs:', logsData.length);
      setLogs(logsData);
      setFilteredLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
      setFilteredLogs([]);
    }
    setIsLoadingLogs(false);
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getAllUsers();
      console.log('Users response:', response);
      const usersData = Array.isArray(response) ? response : [];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
    setIsLoadingUsers(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];
    
    console.log('Applying filters to', logs.length, 'logs');
    console.log('Filter date:', filterDate);
    console.log('Filter user ID:', filterUserId);
    console.log('Filter name:', filterName);
    
    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        const year = logDate.getFullYear();
        const month = String(logDate.getMonth() + 1).padStart(2, '0');
        const day = String(logDate.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;
        
        console.log('Log timestamp:', log.timestamp);
        console.log('Log local date:', localDateString);
        console.log('Filter date:', filterDate);
        console.log('Match:', localDateString === filterDate);
        
        return localDateString === filterDate;
      });
      console.log('After date filter:', filtered.length);
    }
    
    // Filter by user ID
    if (filterUserId) {
      filtered = filtered.filter(log => 
        String(log.user_id).includes(filterUserId)
      );
      console.log('After user ID filter:', filtered.length);
    }
    
    // Filter by name
    if (filterName) {
      filtered = filtered.filter(log => {
        const userName = getUserName(log.user_id).toLowerCase();
        return userName.includes(filterName.toLowerCase());
      });
      console.log('After name filter:', filtered.length);
    }
    
    console.log('Final filtered logs:', filtered.length);
    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterUserId('');
    setFilterName('');
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

  // Find user name by ID
  const getUserName = (userId) => {
    const foundUser = users.find((u) => String(u.id) === String(userId));
    return foundUser?.name || `User #${userId}`;
  };

  // ✅ NEW: Calculate today's unique check-ins
  const getTodayCheckInCount = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    // Filter logs for today's CHECK_IN events
    const todayCheckIns = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const logYear = logDate.getFullYear();
      const logMonth = String(logDate.getMonth() + 1).padStart(2, '0');
      const logDay = String(logDate.getDate()).padStart(2, '0');
      const logDateString = `${logYear}-${logMonth}-${logDay}`;
      
      return logDateString === todayString && log.event_type === 'CHECK_IN';
    });

    // Get unique user IDs (count each user only once)
    const uniqueUserIds = new Set(todayCheckIns.map(log => log.user_id));
    
    return uniqueUserIds.size;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    // CSV Header
    const headers = ['Timestamp', 'User ID', 'Nama', 'Event', 'Category', 'Notes'];
    
    // CSV Rows
    const rows = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('id-ID');
      return [
        timestamp,
        log.user_id,
        getUserName(log.user_id),
        log.event_type,
        log.category,
        log.notes || '-'
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const filterInfo = [];
    if (filterDate) filterInfo.push(`date-${filterDate}`);
    if (filterUserId) filterInfo.push(`user-${filterUserId}`);
    if (filterName) filterInfo.push(`name-${filterName}`);
    const filename = `attendance-logs${filterInfo.length > 0 ? '-' + filterInfo.join('-') : ''}-${Date.now()}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (Simple HTML to PDF)
  const exportToPDF = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    // Create HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            color: #1a1a2e;
          }
          h1 { 
            color: #C599B6; 
            text-align: center;
            margin-bottom: 10px;
          }
          .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .filter-info {
            background: #FFF7F3;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #FAD0C4;
          }
          .filter-info strong {
            color: #C599B6;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
          }
          th { 
            background: #FAD0C4; 
            color: #8B5A6F; 
            padding: 12px 8px; 
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #FAD0C4;
            font-size: 12px;
          }
          tr:hover { 
            background: #FFF7F3; 
          }
          .badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            display: inline-block;
          }
          .check-in { background: #E6B2BA; color: #FFF7F3; }
          .check-out { background: #FAD0C4; color: #8B5A6F; }
          .wfo { background: #d1fae5; color: #065f46; }
          .wfh { background: #ede9fe; color: #6d28d9; }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <h1>📊 Attendance Report</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleString('id-ID')}</div>
        <div class="filter-info">
          <strong>Total Records:</strong> ${filteredLogs.length} logs
          ${filterDate ? `<br><strong>Filtered by Date:</strong> ${filterDate}` : ''}
          ${filterUserId ? `<br><strong>Filtered by User ID:</strong> ${filterUserId}` : ''}
          ${filterName ? `<br><strong>Filtered by Name:</strong> ${filterName}` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User ID</th>
              <th>Name</th>
              <th>Event</th>
              <th>Category</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredLogs.forEach(log => {
      const { time, date } = formatTime(log.timestamp);
      const eventClass = log.event_type?.toLowerCase().replace('_', '-');
      const categoryClass = log.category?.toLowerCase();
      
      htmlContent += `
        <tr>
          <td>${time}<br><small style="color: #666">${date}</small></td>
          <td><strong style="color: #C599B6;">#${log.user_id}</strong></td>
          <td>${getUserName(log.user_id)}</td>
          <td><span class="badge ${eventClass}">${log.event_type}</span></td>
          <td><span class="badge ${categoryClass}">${log.category}</span></td>
          <td>${log.notes || '-'}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
        <div class="footer">
          <p>Generated by Attend.In - Attendance Management System</p>
        </div>
      </body>
      </html>
    `;

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isAdmin()) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>🚫 Akses Ditolak</h2>
          <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <div className="user-info">
              <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <p className="user-name">{user?.name}</p>
                <p className="user-email">{user?.email}</p>
                <div className="user-badges">
                  <span className="role-badge admin">ADMIN</span>
                  <span className="status-badge-user active">● Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="header-center">
            <div className="app-title-container">
              <HiOutlineClipboardDocumentCheck className="app-logo-icon" />
            <h1 className="app-title">Attend.In</h1>
            </div>
            <p className="app-subtitle">Administrator Panel</p>
          </div>

          <div className="header-right">
            <button onClick={() => navigate('/dashboard')} className="dashboard-button">
              Dashboard
            </button>
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

      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <button
          className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📊 Attendance Log ({logs.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User List ({users.length})
        </button>
      </nav>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'logs' && (
          <section className="panel-section">
            <div className="section-header">
              <h2>All Attendance Logs</h2>
              <div className="header-actions">
                <span className="log-count">{filteredLogs.length} dari {logs.length} log</span>
                <button onClick={fetchLogs} className="refresh-icon-button" disabled={isLoadingLogs} title="Refresh data">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter Section with Export & Stats */}
            <div className="filter-section">
              <div className="filter-group">
                <label htmlFor="filterDate">📅 Filter Tanggal:</label>
                <input
                  type="date"
                  id="filterDate"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="filterUserId">👤 Filter User ID:</label>
                <input
                  type="text"
                  id="filterUserId"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  placeholder="Cari user ID..."
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="filterName">🏷️ Filter Nama:</label>
                <input
                  type="text"
                  id="filterName"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Cari nama..."
                  className="filter-input"
                />
              </div>

              {/* Export Actions */}
              <div className="export-group">
                <label> Export Data:</label>
                <div className="export-buttons">
                  <button 
                    onClick={exportToCSV} 
                    className="export-btn csv"
                    disabled={filteredLogs.length === 0}
                    title="Export ke CSV"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    CSV
                  </button>
                  <button 
                    onClick={exportToPDF} 
                    className="export-btn pdf"
                    disabled={filteredLogs.length === 0}
                    title="Export ke PDF"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    PDF
                  </button>
                </div>
              </div>

              {(filterDate || filterUserId || filterName) && (
                <button onClick={clearFilters} className="clear-filter-btn">
                  ✕ Clear Filter
                </button>
              )}

              <div className="stats-group-admin">
                <div className="stat-item-admin">
                  <span className="stat-label-admin">Check-In Hari Ini</span>
                  <span className="stat-value-admin">{getTodayCheckInCount()} employees</span>
                </div>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="loading">Memuat data...</div>
            ) : filteredLogs.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>USER ID</th>
                      <th>NAMA</th>
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
                          <td><span className="user-id-badge">#{log.user_id}</span></td>
                          <td>{getUserName(log.user_id)}</td>
                          <td>
                            <span className={`event-badge ${log.event_type?.toLowerCase().replace('_', '-')}`}>
                              {log.event_type}
                            </span>
                          </td>
                          <td>
                            <span className={`category-badge ${log.category?.toLowerCase()}`}>
                              {log.category}
                            </span>
                          </td>
                          <td className="notes-cell">{log.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                {logs.length > 0 ? (
                  <p>🔍 Tidak ada log yang cocok dengan filter</p>
                ) : (
                  <p>📭 Belum ada data log kehadiran</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="panel-section">
            <div className="section-header">
              <h2>👥 Daftar User Terdaftar</h2>
              <button onClick={fetchUsers} className="refresh-icon-button" disabled={isLoadingUsers} title="Refresh data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="loading">Memuat data...</div>
            ) : users.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NAMA</th>
                      <th>EMAIL</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, index) => (
                      <tr key={u.id || index}>
                        <td><span className="user-id-badge">#{u.id}</span></td>
                        <td className="user-name">{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge role-${u.role?.toLowerCase()}`}>
                            {u.role || 'employee'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-user-badge ${u.status?.toLowerCase()}`}>
                            {u.status === 'active' ? '● Active' : '● Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>📭 Belum ada user terdaftar</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;