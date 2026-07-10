import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState({ unreadNotifications: 0, pendingReports: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      axios.get('/api/notifications/unread-count')
        .then(res => setUnread(res.data))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const totalUnread = unread.unreadNotifications + unread.pendingReports;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="UPCOMRWANDA" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover" />
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-rw-blue to-rw-green bg-clip-text text-transparent">
              UPCOMRWANDA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/') ? 'bg-rw-blue/10 text-rw-blue-dark dark:text-rw-blue-light' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              Home
            </Link>
            <Link to="/services" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/services') ? 'bg-rw-blue/10 text-rw-blue-dark dark:text-rw-blue-light' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              Services
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${isActive('/dashboard') ? 'bg-rw-blue/10 text-rw-blue-dark dark:text-rw-blue-light' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  Dashboard
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin') ? 'bg-rw-blue/10 text-rw-blue-dark dark:text-rw-blue-light' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    Admin Panel
                  </Link>
                )}
                <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rw-blue to-rw-green flex items-center justify-center text-white text-sm font-semibold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium hidden lg:block">{user.name}</span>
                  {user.role === 'admin' && <span className="text-xs bg-rw-yellow/20 text-rw-yellow-dark px-2 py-0.5 rounded-full font-medium hidden lg:block">Admin</span>}
                  <button onClick={logout} className="ml-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-rw-blue to-rw-blue-dark hover:from-rw-blue-dark hover:to-rw-blue rounded-lg shadow-sm transition-all">
                  Get Started
                </Link>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-3 p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            <Link onClick={() => setMobileOpen(false)} to="/" className="block px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Home</Link>
            <Link onClick={() => setMobileOpen(false)} to="/services" className="block px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Services</Link>
            {user ? (
              <>
                <Link onClick={() => setMobileOpen(false)} to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Dashboard
                  {totalUnread > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </Link>
                {user.role === 'admin' && (
                  <Link onClick={() => setMobileOpen(false)} to="/admin" className="block px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Admin Panel</Link>
                )}
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rw-blue to-rw-green flex items-center justify-center text-white text-sm font-semibold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                    {user.role === 'admin' && <span className="text-xs bg-rw-yellow/20 text-rw-yellow-dark px-2 py-0.5 rounded-full font-medium">Admin</span>}
                  </div>
                </div>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <Link onClick={() => setMobileOpen(false)} to="/login" className="block px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Sign In</Link>
                <Link onClick={() => setMobileOpen(false)} to="/register" className="block px-4 py-2 rounded-lg text-sm font-medium text-rw-blue hover:bg-rw-blue/10">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
