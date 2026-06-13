'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loginSuccess, logout } from '../redux/slices/authSlice';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/api';
import Link from 'next/link';
import { LogOut, Bell, Shield, Calendar, FileText, Activity, Moon, Sun, Menu, X } from 'lucide-react';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { unreadCount, notifications } = useAppSelector((state) => state.notifications);
  
  const [sessionChecking, setSessionChecking] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [toast, setToast] = useState<{ title: string; message: string; show: boolean }>({
    title: '',
    message: '',
    show: false,
  });

  // Initialize socket
  useSocket();

  // Handle dark mode toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Attempt to recover session on mount
  useEffect(() => {
    const recoverSession = async () => {
      try {
        // Attempt token refresh first to restore access token in memory
        const refreshRes = await api.post('/auth/refresh');
        const { accessToken } = refreshRes.data;

        // Fetch user profile
        const userRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        dispatch(loginSuccess({ user: userRes.data.user, accessToken }));
      } catch (error) {
        console.log('No active session found.');
        dispatch(logout());
      } finally {
        setSessionChecking(false);
      }
    };

    recoverSession();
  }, [dispatch]);

  // Listen for real-time notifications to show toast
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const notification = customEvent.detail;
      
      setToast({
        title: notification.title,
        message: notification.message,
        show: true,
      });

      // Hide toast after 5 seconds
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 5000);
    };

    window.addEventListener('app-notification', handleNotification);
    return () => {
      window.removeEventListener('app-notification', handleNotification);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      dispatch(logout());
      window.location.href = '/login';
    }
  };

  if (sessionChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Securing environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 gradient-bg">
      {/* Real-time Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce rounded-xl border border-primary/20 bg-white p-4 shadow-2xl transition-all duration-300 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Bell className="h-4 w-4 pulse-indicator" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{toast.title}</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      {isAuthenticated && user && (
        <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">HealthDesk</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {user.role}
                </span>
              </div>

              {/* Desktop Nav Items */}
              <div className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                  Dashboard
                </Link>

                {user.role === 'Patient' && (
                  <>
                    <Link href="/appointments/book" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Book Appointment
                    </Link>
                    <Link href="/prescriptions" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <FileText className="h-4 w-4" /> Prescriptions
                    </Link>
                  </>
                )}

                {user.role === 'Doctor' && (
                  <>
                    <Link href="/doctor/schedule" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Manage Slots
                    </Link>
                    <Link href="/prescriptions" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <FileText className="h-4 w-4" /> Create Prescription
                    </Link>
                  </>
                )}

                {user.role === 'Admin' && (
                  <>
                    <Link href="/admin/users" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <Shield className="h-4 w-4" /> Accounts
                    </Link>
                    <Link href="/admin/audit" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <Shield className="h-4 w-4" /> Audit Trails
                    </Link>
                  </>
                )}
              </div>

              {/* Utility Panel */}
              <div className="hidden md:flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </button>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popup */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                        <span className="font-semibold text-sm">Notifications</span>
                        <span className="text-xs text-primary cursor-pointer hover:underline">Mark all read</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto mt-2">
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">No new notifications</div>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div key={notif.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                              <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{notif.title}</h5>
                              <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-semibold">{user.name}</p>
                    <p className="text-[10px] text-slate-400">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-full p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex md:hidden items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav Menu */}
          {mobileMenuOpen && (
            <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-850 dark:bg-slate-900 md:hidden flex flex-col gap-3">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                Dashboard
              </Link>
              {user.role === 'Patient' && (
                <>
                  <Link href="/appointments/book" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Book Appointment
                  </Link>
                  <Link href="/prescriptions" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Prescriptions
                  </Link>
                </>
              )}
              {user.role === 'Doctor' && (
                <>
                  <Link href="/doctor/schedule" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Manage Slots
                  </Link>
                  <Link href="/prescriptions" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Create Prescription
                  </Link>
                </>
              )}
              {user.role === 'Admin' && (
                <>
                  <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Accounts management
                  </Link>
                  <Link href="/admin/audit" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-1">
                    Audit Trails
                  </Link>
                </>
              )}
              <div className="h-px bg-slate-150 dark:bg-slate-800 my-1"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-destructive py-1"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Main Page Layout Wrapper */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
