import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function DashboardPage() {
  const { user } = useAuth();
  const isRegular = user?.role === 'user';
  const [tab, setTab] = useState(isRegular ? 'reports' : 'overview');
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [learners, setLearners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reportForm, setReportForm] = useState({ title: '', description: '' });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [sessionForm, setSessionForm] = useState({ tutor_id: '', learner_id: '', session_date: '', duration: '60', subject: '', notes: '' });
  const [editingSession, setEditingSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);

  const fetchData = async () => {
    try {
      const [r, n] = await Promise.all([
        axios.get('/api/reports'),
        axios.get('/api/notifications'),
      ]);
      setReports(r.data);
      setNotifications(n.data);
      if (!isRegular) {
        const [t, l, s] = await Promise.all([
          axios.get('/api/tutors'),
          axios.get('/api/learners'),
          axios.get('/api/sessions')
        ]);
        setTutors(t.data);
        setLearners(l.data);
        setSessions(s.data);
      }
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const submitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await axios.post('/api/reports', reportForm);
      setReportForm({ title: '', description: '' });
      setMsg('Report submitted successfully!');
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      fetchData();
    } catch {}
  };

  const deleteReport = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      await axios.delete(`/api/reports/${id}`);
      setMsg('Report deleted!');
      fetchData();
    } catch {
      setMsg('Failed to delete report');
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await axios.delete(`/api/notifications/${id}`);
      setMsg('Notification deleted!');
      fetchData();
    } catch {
      setMsg('Failed to delete notification');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setMsg('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setMsg('New password must be at least 6 characters'); return; }
    setLoading(true);
    setMsg('');
    try {
      await axios.put('/api/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMsg('Password changed successfully!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const submitSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      if (editingSession) {
        await axios.put(`/api/sessions/${editingSession.id}`, sessionForm);
        setMsg('Session updated!');
      } else {
        await axios.post('/api/sessions', sessionForm);
        setMsg('Session created!');
      }
      resetSessionForm();
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  const editSession = (s) => {
    setEditingSession(s);
    setSessionForm({
      tutor_id: s.tutor_id,
      learner_id: s.learner_id,
      session_date: s.session_date ? new Date(s.session_date).toISOString().slice(0, 16) : '',
      duration: s.duration || '60',
      subject: s.subject,
      notes: s.notes || '',
    });
    setShowSessionForm(true);
    setTab('sessions');
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await axios.delete(`/api/sessions/${id}`);
      setMsg('Session deleted!');
      fetchData();
    } catch {
      setMsg('Failed to delete session');
    }
  };

  const toggleSessionStatus = async (s) => {
    const newStatus = s.status === 'scheduled' ? 'completed' : 'scheduled';
    try {
      await axios.put(`/api/sessions/${s.id}`, { ...s, status: newStatus });
      setMsg(`Session marked as ${newStatus}!`);
      fetchData();
    } catch {
      setMsg('Failed to update session');
    }
  };

  const resetSessionForm = () => {
    setSessionForm({ tutor_id: '', learner_id: '', session_date: '', duration: '60', subject: '', notes: '' });
    setEditingSession(null);
    setShowSessionForm(false);
  };

  const statusColor = (s) => ({
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
  }[s] || 'bg-gray-100 text-gray-700 dark:text-gray-300');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {isRegular ? (
          /* ── Regular user: horizontal tabs ── */
          <div className="max-w-4xl">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                Welcome back, <span className="text-rw-blue">{user?.name}</span>
              </h1>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-600 mb-6">
              <div className="flex gap-6 -mb-px">
                {[
                  { key: 'reports', label: 'Reports' },
                  { key: 'notifications', label: 'Notifications' },
                  { key: 'password', label: 'Change Password' },
                ].map(item => (
                  <button key={item.key} onClick={() => setTab(item.key)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-all capitalize ${
                      tab === item.key
                        ? 'border-rw-blue text-rw-blue'
                        : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:border-gray-300'
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {msg && (
              <div className="mb-4 p-3 bg-rw-blue/5 border border-rw-blue/10 text-rw-blue-dark text-sm rounded-xl">
                {msg}
              </div>
            )}

            {tab === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Submit New Report</h3>
                  <form onSubmit={submitReport} className="space-y-4">
                    <input type="text" required value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                      placeholder="Report title" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent" />
                    <textarea required rows={4} value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                      placeholder="Describe your issue..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent resize-none" />
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white font-semibold rounded-xl shadow-lg shadow-rw-blue/25 hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                      {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </form>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Reports</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {reports.length === 0 ? (
                      <p className="text-gray-400 dark:text-gray-500 text-center py-8">No reports yet</p>
                    ) : reports.map(r => (
                      <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{r.title}</h4>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(r.status)}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                            <button onClick={() => deleteReport(r.id)}
                              className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 font-medium">
                              Del
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>
                        {r.replies && r.replies.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-rw-blue/30 space-y-2">
                            {r.replies.map(rep => (
                              <div key={rep.id}>
                                <p className="text-xs font-semibold text-rw-blue">Admin {rep.admin_name}</p>
                                <p className="text-sm text-gray-600">{rep.reply}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'notifications' && (
              <div className="max-w-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Notifications</h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 dark:text-gray-500 text-center py-8">No notifications yet</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`p-4 rounded-xl border ${n.is_read ? 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-700' : 'bg-rw-blue/5 border-rw-blue/10'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{n.title}</h4>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From: <span className="font-medium text-gray-600">{n.user_name}</span></p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!n.is_read && (
                              <button onClick={() => markRead(n.id)} className="text-xs text-rw-blue hover:text-rw-blue-dark font-medium whitespace-nowrap">
                                Mark read
                              </button>
                            )}
                            <button onClick={() => deleteNotification(n.id)}
                              className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 font-medium whitespace-nowrap">
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{n.message}</p>
                        {n.replies && n.replies.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-rw-green/30 space-y-2">
                            {n.replies.map(rep => (
                              <div key={rep.id}>
                                <p className="text-xs font-semibold text-rw-green">Admin {rep.admin_name}</p>
                                <p className="text-sm text-gray-600">{rep.reply}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'password' && (
              <div className="max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rw-yellow/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-rw-yellow-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                    </div>
                  </div>
                  <form onSubmit={changePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                      <input type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent"
                        placeholder="Enter current password" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                      <input type="password" required minLength={6} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent"
                        placeholder="Min 6 characters" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                      <input type="password" required minLength={6} value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent"
                        placeholder="Re-enter new password" />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-rw-yellow to-rw-yellow-dark text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg shadow-rw-yellow/25 hover:from-rw-yellow-dark hover:to-rw-yellow transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Tutor/Admin: sidebar ── */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-56 shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden lg:sticky lg:top-24">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-rw-blue/5 to-rw-green/5">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</p>
                </div>
                <nav className="p-2 space-y-0.5">
                  {[
                    { key: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                    { key: 'tutors', label: 'Tutors', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { key: 'learners', label: 'Learners', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                    { key: 'sessions', label: 'Sessions', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { key: 'reports', label: 'Reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                    { key: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                    { key: 'password', label: 'Change Password', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                  ].map(item => (
                    <button key={item.key} onClick={() => setTab(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        tab === item.key
                          ? 'bg-rw-blue text-white shadow-md'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  Welcome back, <span className="text-rw-blue">{user?.name}</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your reports and send notifications to admin.</p>
              </div>

              {msg && (
                <div className="mb-4 p-3 bg-rw-blue/5 border border-rw-blue/10 text-rw-blue-dark text-sm rounded-xl">
                  {msg}
                </div>
              )}

              {tab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rw-green/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rw-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      </div>
                      <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{tutors.length}</p><p className="text-sm text-gray-500 dark:text-gray-400">Tutors</p></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rw-blue/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rw-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                      </div>
                      <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{learners.length}</p><p className="text-sm text-gray-500 dark:text-gray-400">Learners</p></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rw-blue/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rw-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      </div>
                      <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{reports.length}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rw-yellow/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rw-yellow-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{reports.filter(r => r.status === 'pending').length}</p><p className="text-sm text-gray-500 dark:text-gray-400">Pending Reports</p></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rw-green/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-rw-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</p><p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p></div>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'tutors' && (
                <div>
                  <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Tutors ({tutors.length})</h3></div>
                  {tutors.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No tutors available</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {tutors.map(t => (
                        <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-rw-green/10 flex items-center justify-center text-rw-green font-bold text-lg">{t.name?.charAt(0).toUpperCase()}</div>
                            <div><h4 className="font-bold text-gray-900 dark:text-white">{t.name}</h4><span className="text-xs text-rw-blue font-medium">{t.subject}</span></div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><span>{t.email}</span></div>
                            {t.phone && <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>{t.phone}</span></div>}
                            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>{t.experience} year{t.experience !== 1 ? 's' : ''} experience</span></div>
                          </div>
                          {t.bio && <p className="mt-3 text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{t.bio}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === 'learners' && (
                <div>
                  <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-900 dark:text-white">Learners ({learners.length})</h3></div>
                  {learners.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No learners available</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {learners.map(l => (
                        <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-rw-blue/10 flex items-center justify-center text-rw-blue font-bold text-lg">{l.name?.charAt(0).toUpperCase()}</div>
                            <div><h4 className="font-bold text-gray-900 dark:text-white">{l.name}</h4>{l.grade && <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{l.grade}</span>}</div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><span>{l.email}</span></div>
                            {l.phone && <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>{l.phone}</span></div>}
                            {l.subject_interest && <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg><span>Interested in {l.subject_interest}</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === 'sessions' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sessions ({sessions.length})</h3>
                    <button onClick={() => { resetSessionForm(); setShowSessionForm(true); }}
                      className="px-4 py-2 bg-gradient-to-r from-rw-green to-rw-green-dark text-white text-sm font-semibold rounded-xl hover:from-rw-green-dark hover:to-rw-green transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                      Add Session
                    </button>
                  </div>
                  {showSessionForm && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white">{editingSession ? 'Edit Session' : 'Add New Session'}</h4>
                        <button onClick={resetSessionForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-xl">&times;</button>
                      </div>
                      <form onSubmit={submitSession} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select required value={sessionForm.tutor_id} onChange={e => setSessionForm({ ...sessionForm, tutor_id: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                          <option value="">Select tutor</option>
                          {tutors.filter(t => t.status === 'active').map(t => (<option key={t.id} value={t.id}>{t.name} ({t.subject})</option>))}
                        </select>
                        <select required value={sessionForm.learner_id} onChange={e => setSessionForm({ ...sessionForm, learner_id: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                          <option value="">Select learner</option>
                          {learners.filter(l => l.status === 'active').map(l => (<option key={l.id} value={l.id}>{l.name}{l.grade ? ` (${l.grade})` : ''}</option>))}
                        </select>
                        <input type="datetime-local" required value={sessionForm.session_date} onChange={e => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                        <input type="number" min={15} max={480} value={sessionForm.duration} onChange={e => setSessionForm({ ...sessionForm, duration: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" placeholder="Duration (min)" />
                        <input type="text" required value={sessionForm.subject} onChange={e => setSessionForm({ ...sessionForm, subject: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" placeholder="Subject" />
                        <input type="text" value={sessionForm.notes} onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                          className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" placeholder="Notes (optional)" />
                        <div className="sm:col-span-2 flex gap-3">
                          <button type="submit" disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                            {loading ? 'Saving...' : editingSession ? 'Update Session' : 'Add Session'}
                          </button>
                          <button type="button" onClick={resetSessionForm} className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}
                  {sessions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No sessions scheduled</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {sessions.map(s => {
                        const statusColors = { scheduled: 'bg-rw-blue/10 text-rw-blue border-rw-blue/20', completed: 'bg-rw-green/10 text-rw-green-dark border-rw-green/20', cancelled: 'bg-red-50 text-red-600 border-red-200' };
                        return (
                          <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-rw-green/10 flex items-center justify-center text-rw-green font-bold text-sm">{s.tutor_name?.charAt(0).toUpperCase()}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{s.subject}</h4>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize border inline-block mt-0.5 ${statusColors[s.status] || ''}`}>{s.status}</span>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg><span className="truncate">Tutor: {s.tutor_name}</span></div>
                              <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg><span className="truncate">Learner: {s.learner_name}</span></div>
                              <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>{new Date(s.session_date).toLocaleDateString()} {new Date(s.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                              {s.duration && <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>{s.duration} min</span></div>}
                            </div>
                            {s.notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{s.notes}</p>}
                            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                              {s.status === 'scheduled' && <button onClick={() => toggleSessionStatus(s)} className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-all">Complete</button>}
                              {s.status !== 'scheduled' && <button onClick={() => toggleSessionStatus(s)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Reopen</button>}
                              <button onClick={() => editSession(s)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Edit</button>
                              <button onClick={() => deleteSession(s.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {tab === 'reports' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Submit New Report</h3>
                    <form onSubmit={submitReport} className="space-y-4">
                      <input type="text" required value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                        placeholder="Report title" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent" />
                      <textarea required rows={4} value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                        placeholder="Describe your issue..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent resize-none" />
                      <button type="submit" disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white font-semibold rounded-xl shadow-lg shadow-rw-blue/25 hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                        {loading ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </form>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Reports</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {reports.length === 0 ? (<p className="text-gray-400 dark:text-gray-500 text-center py-8">No reports yet</p>
                      ) : reports.map(r => (
                        <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{r.title}</h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                              <button onClick={() => deleteReport(r.id)} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 font-medium">Del</button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>
                          {r.replies && r.replies.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-rw-blue/30 space-y-2">
                              {r.replies.map(rep => (<div key={rep.id}><p className="text-xs font-semibold text-rw-blue">Admin {rep.admin_name}</p><p className="text-sm text-gray-600">{rep.reply}</p></div>))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {tab === 'notifications' && (
                <div className="max-w-2xl">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Notifications</h3>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {notifications.length === 0 ? (<p className="text-gray-400 dark:text-gray-500 text-center py-8">No notifications yet</p>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-xl border ${n.is_read ? 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-700' : 'bg-rw-blue/5 border-rw-blue/10'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div><h4 className="font-semibold text-gray-900 dark:text-white text-sm">{n.title}</h4><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From: <span className="font-medium text-gray-600">{n.user_name}</span></p></div>
                            <div className="flex items-center gap-1.5">
                              {!n.is_read && <button onClick={() => markRead(n.id)} className="text-xs text-rw-blue hover:text-rw-blue-dark font-medium whitespace-nowrap">Mark read</button>}
                              <button onClick={() => deleteNotification(n.id)} className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 font-medium whitespace-nowrap">Delete</button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{n.message}</p>
                          {n.replies && n.replies.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-rw-green/30 space-y-2">
                              {n.replies.map(rep => (<div key={rep.id}><p className="text-xs font-semibold text-rw-green">Admin {rep.admin_name}</p><p className="text-sm text-gray-600">{rep.reply}</p></div>))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {tab === 'password' && (
                <div className="max-w-md">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-rw-yellow/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-rw-yellow-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      </div>
                      <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3><p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p></div>
                    </div>
                    <form onSubmit={changePassword} className="space-y-4">
                      <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label><input type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent" placeholder="Enter current password" /></div>
                      <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label><input type="password" required minLength={6} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent" placeholder="Min 6 characters" /></div>
                      <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label><input type="password" required minLength={6} value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue focus:border-transparent" placeholder="Re-enter new password" /></div>
                      <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-rw-yellow to-rw-yellow-dark text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg shadow-rw-yellow/25 hover:from-rw-yellow-dark hover:to-rw-yellow transition-all disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Updating...' : 'Update Password'}</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
