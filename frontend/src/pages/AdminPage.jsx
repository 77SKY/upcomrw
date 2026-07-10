import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({ totalUsers: 0, totalReports: 0, pendingReports: 0, totalNotifications: 0, totalTutors: 0, activeTutors: 0, totalLearners: 0, activeLearners: 0, totalSessions: 0, scheduledSessions: 0 });
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [learners, setLearners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target_user_id: '' });
  const [replyText, setReplyText] = useState({});
  const [reportReplyText, setReportReplyText] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [tutorForm, setTutorForm] = useState({ name: '', email: '', phone: '', subject: '', experience: '', bio: '' });
  const [learnerForm, setLearnerForm] = useState({ name: '', email: '', phone: '', grade: '', subject_interest: '' });
  const [editingTutor, setEditingTutor] = useState(null);
  const [editingLearner, setEditingLearner] = useState(null);
  const [showTutorForm, setShowTutorForm] = useState(false);
  const [showLearnerForm, setShowLearnerForm] = useState(false);
  // Sessions
  const [sessionForm, setSessionForm] = useState({ tutor_id: '', learner_id: '', session_date: '', duration: '60', subject: '', notes: '' });
  const [editingSession, setEditingSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  // User management
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'user', status: 'active' });
  const [showUserForm, setShowUserForm] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard');
  }, [user, navigate]);

  const fetchData = async () => {
    const results = await Promise.allSettled([
      axios.get('/api/admin/stats'),
      axios.get('/api/reports'),
      axios.get('/api/notifications'),
      axios.get('/api/tutors'),
      axios.get('/api/learners'),
      axios.get('/api/sessions'),
      axios.get('/api/admin/users'),
    ]);
    if (results[0].status === 'fulfilled') setStats(results[0].value.data);
    if (results[1].status === 'fulfilled') setReports(results[1].value.data);
    if (results[2].status === 'fulfilled') setNotifications(results[2].value.data);
    if (results[3].status === 'fulfilled') setTutors(results[3].value.data);
    if (results[4].status === 'fulfilled') setLearners(results[4].value.data);
    if (results[5].status === 'fulfilled') setSessions(results[5].value.data);
    if (results[6].status === 'fulfilled') setUsers(results[6].value.data);
  };

  useEffect(() => { fetchData(); }, []);

  // Reports
  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await axios.put(`/api/reports/${id}`, { status });
      setMsg('Report status updated!');
      fetchData();
    } catch {
      setMsg('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Notifications
  const createNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const payload = { title: notifForm.title, message: notifForm.message };
      if (notifForm.target_user_id) payload.target_user_id = parseInt(notifForm.target_user_id);
      await axios.post('/api/notifications', payload);
      setNotifForm({ title: '', message: '', target_user_id: '' });
      setMsg('Notification sent!');
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (notifId) => {
    if (!replyText[notifId]?.trim()) return;
    setLoading(true);
    try {
      await axios.post(`/api/notifications/${notifId}/reply`, { reply: replyText[notifId] });
      setReplyText({ ...replyText, [notifId]: '' });
      setMsg('Reply sent!');
      fetchData();
    } catch {
      setMsg('Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  // Reports
  const sendReportReply = async (reportId) => {
    if (!reportReplyText[reportId]?.trim()) return;
    setLoading(true);
    try {
      await axios.post(`/api/reports/${reportId}/reply`, { reply: reportReplyText[reportId] });
      setReportReplyText({ ...reportReplyText, [reportId]: '' });
      setMsg('Reply sent!');
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
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

  // Tutors
  const submitTutor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTutor) {
        await axios.put(`/api/tutors/${editingTutor.id}`, { ...tutorForm, status: editingTutor.status });
        setMsg('Tutor updated!');
      } else {
        await axios.post('/api/tutors', tutorForm);
        setMsg('Tutor added!');
      }
      resetTutorForm();
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save tutor');
    } finally {
      setLoading(false);
    }
  };

  const editTutor = (t) => {
    setEditingTutor(t);
    setTutorForm({ name: t.name, email: t.email, phone: t.phone || '', subject: t.subject, experience: t.experience || '', bio: t.bio || '' });
    setShowTutorForm(true);
    setTab('tutors');
  };

  const deleteTutor = async (id) => {
    if (!confirm('Delete this tutor?')) return;
    try {
      await axios.delete(`/api/tutors/${id}`);
      setMsg('Tutor deleted!');
      fetchData();
    } catch {
      setMsg('Failed to delete tutor');
    }
  };

  const toggleTutorStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/tutors/${t.id}`, { name: t.name, email: t.email, phone: t.phone, subject: t.subject, experience: t.experience, bio: t.bio, status: newStatus });
      setMsg(`Tutor ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      fetchData();
    } catch {
      setMsg('Failed to update tutor');
    }
  };

  const resetTutorForm = () => {
    setTutorForm({ name: '', email: '', phone: '', subject: '', experience: '', bio: '' });
    setEditingTutor(null);
    setShowTutorForm(false);
  };

  // Learners
  const submitLearner = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLearner) {
        await axios.put(`/api/learners/${editingLearner.id}`, { ...learnerForm, status: editingLearner.status });
        setMsg('Learner updated!');
      } else {
        await axios.post('/api/learners', learnerForm);
        setMsg('Learner added!');
      }
      resetLearnerForm();
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save learner');
    } finally {
      setLoading(false);
    }
  };

  const editLearner = (l) => {
    setEditingLearner(l);
    setLearnerForm({ name: l.name, email: l.email, phone: l.phone || '', grade: l.grade || '', subject_interest: l.subject_interest || '' });
    setShowLearnerForm(true);
    setTab('learners');
  };

  const deleteLearner = async (id) => {
    if (!confirm('Delete this learner?')) return;
    try {
      await axios.delete(`/api/learners/${id}`);
      setMsg('Learner deleted!');
      fetchData();
    } catch {
      setMsg('Failed to delete learner');
    }
  };

  const toggleLearnerStatus = async (l) => {
    const newStatus = l.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/learners/${l.id}`, { name: l.name, email: l.email, phone: l.phone, grade: l.grade, subject_interest: l.subject_interest, status: newStatus });
      setMsg(`Learner ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      fetchData();
    } catch {
      setMsg('Failed to update learner');
    }
  };

  const resetLearnerForm = () => {
    setLearnerForm({ name: '', email: '', phone: '', grade: '', subject_interest: '' });
    setEditingLearner(null);
    setShowLearnerForm(false);
  };

  // Sessions
  const submitSession = async (e) => {
    e.preventDefault();
    setLoading(true);
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

  // Users
  const editUser = (u) => {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, role: u.role, status: u.status || 'active' });
    setShowUserForm(true);
    setTab('users');
  };

  const submitUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`/api/admin/users/${editingUser.id}`, userForm);
      setMsg('User updated!');
      resetUserForm();
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This will also remove their reports and notifications.')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setMsg('User deleted!');
      fetchData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (u) => {
    const newStatus = u.status === 'inactive' ? 'active' : 'inactive';
    try {
      await axios.put(`/api/admin/users/${u.id}`, { name: u.name, email: u.email, role: u.role, status: newStatus });
      setMsg(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
      fetchData();
    } catch {
      setMsg('Failed to update user status');
    }
  };

  const resetUserForm = () => {
    setUserForm({ name: '', email: '', role: 'user', status: 'active' });
    setEditingUser(null);
    setShowUserForm(false);
  };

  const statusColor = (s) => ({
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    active: 'bg-rw-green/10 text-rw-green-dark border-rw-green/20',
    inactive: 'bg-red-50 text-red-600 border-red-200',
  }[s] || 'bg-gray-100 text-gray-700');

  if (!user || user.role !== 'admin') return null;

  const tabs = ['stats', 'reports', 'notifications', 'sessions', 'tutors', 'learners', 'users'];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Admin Panel</h1>
            <span className="px-3 py-1 bg-rw-yellow/20 text-rw-yellow-dark text-xs font-bold rounded-full">ADMIN</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Manage tutors, learners, reports, and notifications.</p>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-rw-green/5 border border-rw-green/10 text-rw-green-dark text-sm rounded-xl flex items-center justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="text-rw-green hover:text-rw-green-dark">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8 overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                tab === t ? 'bg-rw-blue text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {t === 'stats' ? 'Dashboard' : t}
              {t === 'reports' && stats.pendingReports > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                  {stats.pendingReports}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Dashboard Stats ──────────────────── */}
        {tab === 'stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rw-blue/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rw-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Users</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rw-green/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rw-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.totalTutors}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tutors <span className="text-rw-green text-xs font-medium">({stats.activeTutors} active)</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rw-blue/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rw-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.totalLearners}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Learners <span className="text-rw-green text-xs font-medium">({stats.activeLearners} active)</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rw-yellow/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rw-yellow-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.totalReports}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reports <span className="text-red-500 text-xs font-medium">{stats.pendingReports} pending</span></p>
            </div>
          </div>
        )}

        {/* ── Reports ──────────────────────────── */}
        {tab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No reports yet</p></div>
            ) : reports.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 dark:text-white">{r.title}</h4>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${statusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span className="font-medium text-gray-600 dark:text-gray-400">{r.user_name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${r.user_role === 'tutor' ? 'bg-rw-green/10 text-rw-green-dark' : 'bg-rw-blue/10 text-rw-blue'}`}>{r.user_role}</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>

                    {r.replies && r.replies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {r.replies.map(rep => (
                          <div key={rep.id} className="ml-4 p-3 bg-rw-blue/5 border border-rw-blue/10 rounded-lg">
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-rw-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                              <span className="text-xs font-bold text-rw-blue">Admin {rep.admin_name}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(rep.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{rep.reply}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input type="text" placeholder="Reply to this report..."
                        value={reportReplyText[r.id] || ''}
                        onChange={e => setReportReplyText({ ...reportReplyText, [r.id]: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') sendReportReply(r.id); }}
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                      <button onClick={() => sendReportReply(r.id)} disabled={loading || !reportReplyText[r.id]?.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                        Reply
                      </button>
                    </div>
                  </div>
                  <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)} disabled={loading}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rw-blue cursor-pointer shrink-0">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button onClick={() => deleteReport(r.id)}
                    className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-medium hover:bg-red-100 transition-all flex-shrink-0">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Notifications ────────────────────── */}
        {tab === 'notifications' && (
          <div className="space-y-4">
            {/* Create Notification Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Create Notification</h4>
              <form onSubmit={createNotification} className="space-y-4">
                <input type="text" required value={notifForm.title} onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                  placeholder="Notification title" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                <textarea required rows={3} value={notifForm.message} onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                  placeholder="Write your message..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue resize-none" />
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <select value={notifForm.target_user_id} onChange={e => setNotifForm({ ...notifForm, target_user_id: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rw-blue">
                    <option value="">— Broadcast to all users —</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                  <button type="submit" disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50 flex-shrink-0">
                    {loading ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </form>
            </div>

            {notifications.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No notifications yet</p></div>
            ) : notifications.map(n => (
              <div key={n.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rw-blue to-rw-green flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {n.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                      {n.notif_type === 'broadcast' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rw-blue/10 text-rw-blue border border-rw-blue/20">Broadcast</span>
                      )}
                      {n.target_user_id && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rw-yellow/10 text-rw-yellow-dark border border-rw-yellow/20">Targeted</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      From: <span className="font-medium">{n.user_name}</span>
                      <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${n.user_role === 'tutor' ? 'bg-rw-green/10 text-rw-green-dark' : 'bg-rw-blue/10 text-rw-blue'}`}>{n.user_role}</span>
                      {n.notif_type === 'broadcast' && <span className="ml-2 text-rw-blue">· {n.read_count || 0} read</span>}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{n.message}</p>

                    {n.replies && n.replies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {n.replies.map(rep => (
                          <div key={rep.id} className="ml-4 p-3 bg-rw-green/5 border border-rw-green/10 rounded-lg">
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-rw-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                              <span className="text-xs font-bold text-rw-green">Admin {rep.admin_name}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(rep.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{rep.reply}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input type="text" placeholder="Type your reply..."
                        value={replyText[n.id] || ''}
                        onChange={e => setReplyText({ ...replyText, [n.id]: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') sendReply(n.id); }}
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                      <button onClick={() => sendReply(n.id)} disabled={loading || !replyText[n.id]?.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-rw-green to-rw-green-dark text-white text-sm font-semibold rounded-xl hover:from-rw-green-dark hover:to-rw-green transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                        Reply
                      </button>
                    </div>
                    <button onClick={() => deleteNotification(n.id)}
                      className="mt-3 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all self-start">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Sessions ─────────────────────────── */}
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
                  <button onClick={resetSessionForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
                </div>
                <form onSubmit={submitSession} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select required value={sessionForm.tutor_id} onChange={e => setSessionForm({ ...sessionForm, tutor_id: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                    <option value="">Select tutor</option>
                    {tutors.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                    ))}
                  </select>
                  <select required value={sessionForm.learner_id} onChange={e => setSessionForm({ ...sessionForm, learner_id: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                    <option value="">Select learner</option>
                    {learners.filter(l => l.status === 'active').map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.grade ? ` (${l.grade})` : ''}</option>
                    ))}
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
                    <button type="button" onClick={resetSessionForm} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No sessions added yet</p></div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Tutor</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Learner</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Date / Time</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Duration</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-rw-green/10 flex items-center justify-center text-rw-green font-bold text-sm">{s.tutor_name?.charAt(0).toUpperCase()}</div>
                              <span className="font-semibold text-gray-900 dark:text-white">{s.tutor_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{s.learner_name}</td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{new Date(s.session_date).toLocaleDateString()} {new Date(s.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-5 py-4"><span className="text-rw-blue font-medium">{s.subject}</span></td>
                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{s.duration}m</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${s.status === 'scheduled' ? 'bg-rw-blue/10 text-rw-blue border-rw-blue/20' : s.status === 'completed' ? 'bg-rw-green/10 text-rw-green-dark border-rw-green/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {s.status === 'scheduled' && (
                                <button onClick={() => toggleSessionStatus(s)} className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-all">Complete</button>
                              )}
                              {s.status !== 'scheduled' && (
                                <button onClick={() => toggleSessionStatus(s)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Reopen</button>
                              )}
                              <button onClick={() => editSession(s)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Edit</button>
                              <button onClick={() => deleteSession(s.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tutors ───────────────────────────── */}
        {tab === 'tutors' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tutors ({tutors.length})</h3>
              <button onClick={() => { resetTutorForm(); setShowTutorForm(true); }}
                className="px-4 py-2 bg-gradient-to-r from-rw-green to-rw-green-dark text-white text-sm font-semibold rounded-xl hover:from-rw-green-dark hover:to-rw-green transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add Tutor
              </button>
            </div>

            {showTutorForm && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white">{editingTutor ? 'Edit Tutor' : 'Add New Tutor'}</h4>
                  <button onClick={resetTutorForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
                </div>
                <form onSubmit={submitTutor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" required placeholder="Full name" value={tutorForm.name} onChange={e => setTutorForm({ ...tutorForm, name: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="email" required placeholder="Email address" value={tutorForm.email} onChange={e => setTutorForm({ ...tutorForm, email: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" placeholder="Phone number" value={tutorForm.phone} onChange={e => setTutorForm({ ...tutorForm, phone: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" required placeholder="Subject (e.g. Mathematics)" value={tutorForm.subject} onChange={e => setTutorForm({ ...tutorForm, subject: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="number" placeholder="Years of experience" value={tutorForm.experience} onChange={e => setTutorForm({ ...tutorForm, experience: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" placeholder="Short bio" value={tutorForm.bio} onChange={e => setTutorForm({ ...tutorForm, bio: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                      {loading ? 'Saving...' : editingTutor ? 'Update Tutor' : 'Add Tutor'}
                    </button>
                    <button type="button" onClick={resetTutorForm} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tutors.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No tutors added yet</p></div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Contact</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Exp</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tutors.map(t => (
                        <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-rw-green/10 flex items-center justify-center text-rw-green font-bold text-sm">{t.name?.charAt(0).toUpperCase()}</div>
                              <span className="font-semibold text-gray-900 dark:text-white">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-gray-600 dark:text-gray-400">{t.email}</div>
                            <div className="text-gray-400 dark:text-gray-500 text-xs">{t.phone}</div>
                          </td>
                          <td className="px-5 py-4"><span className="text-rw-blue font-medium">{t.subject}</span></td>
                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{t.experience}y</td>
                          <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${statusColor(t.status)}`}>{t.status}</span></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => toggleTutorStatus(t)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${t.status === 'active' ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                {t.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => editTutor(t)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Edit</button>
                              <button onClick={() => deleteTutor(t.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Learners ─────────────────────────── */}
        {tab === 'learners' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Learners ({learners.length})</h3>
              <button onClick={() => { resetLearnerForm(); setShowLearnerForm(true); }}
                className="px-4 py-2 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add Learner
              </button>
            </div>

            {showLearnerForm && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white">{editingLearner ? 'Edit Learner' : 'Add New Learner'}</h4>
                  <button onClick={resetLearnerForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
                </div>
                <form onSubmit={submitLearner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" required placeholder="Full name" value={learnerForm.name} onChange={e => setLearnerForm({ ...learnerForm, name: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="email" required placeholder="Email address" value={learnerForm.email} onChange={e => setLearnerForm({ ...learnerForm, email: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" placeholder="Phone number" value={learnerForm.phone} onChange={e => setLearnerForm({ ...learnerForm, phone: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" placeholder="Grade / Class" value={learnerForm.grade} onChange={e => setLearnerForm({ ...learnerForm, grade: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="text" placeholder="Subject interest" value={learnerForm.subject_interest} onChange={e => setLearnerForm({ ...learnerForm, subject_interest: e.target.value })}
                    className="sm:col-span-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                      {loading ? 'Saving...' : editingLearner ? 'Update Learner' : 'Add Learner'}
                    </button>
                    <button type="button" onClick={resetLearnerForm} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {learners.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No learners added yet</p></div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Contact</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Grade</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Interest</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {learners.map(l => (
                        <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-rw-blue/10 flex items-center justify-center text-rw-blue font-bold text-sm">{l.name?.charAt(0).toUpperCase()}</div>
                              <span className="font-semibold text-gray-900 dark:text-white">{l.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-gray-600 dark:text-gray-400">{l.email}</div>
                            <div className="text-gray-400 dark:text-gray-500 text-xs">{l.phone}</div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{l.grade || '—'}</td>
                          <td className="px-5 py-4"><span className="text-rw-blue font-medium">{l.subject_interest || '—'}</span></td>
                          <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${statusColor(l.status)}`}>{l.status}</span></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => toggleLearnerStatus(l)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${l.status === 'active' ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                {l.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => editLearner(l)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Edit</button>
                              <button onClick={() => deleteLearner(l.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users ────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Users ({users.length})</h3>
            </div>

            {showUserForm && editingUser && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white">Edit User</h4>
                  <button onClick={resetUserForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
                </div>
                <form onSubmit={submitUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue" />
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                    <option value="user">User</option>
                    <option value="tutor">Tutor</option>
                  </select>
                  <select value={userForm.status || 'active'} onChange={e => setUserForm({ ...userForm, status: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rw-blue">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="flex gap-3 items-end">
                    <button type="submit" disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white text-sm font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all disabled:opacity-50">
                      {loading ? 'Saving...' : 'Update User'}
                    </button>
                    <button type="button" onClick={resetUserForm} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {users.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-100 dark:border-gray-700 text-center"><p className="text-gray-400 dark:text-gray-500">No users yet</p></div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Role / Status</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Joined</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rw-blue to-rw-green flex items-center justify-center text-white font-bold text-sm">{u.name?.charAt(0).toUpperCase()}</div>
                              <span className="font-semibold text-gray-900 dark:text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${u.role === 'tutor' ? 'bg-rw-blue/10 text-rw-blue border-rw-blue/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                              {u.role}
                            </span>
                            <span className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${u.status === 'active' || !u.status ? 'bg-rw-green/10 text-rw-green-dark border-rw-green/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => toggleUserStatus(u)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${u.status === 'inactive' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                                {u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </button>
                              <button onClick={() => editUser(u)} className="px-2.5 py-1 bg-rw-blue/10 text-rw-blue rounded-lg text-xs font-medium hover:bg-rw-blue/20 transition-all">Edit</button>
                              {u.role !== 'admin' && u.id !== user?.id && (
                                <button onClick={() => deleteUser(u.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
