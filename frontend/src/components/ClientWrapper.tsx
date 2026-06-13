'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loginSuccess, logout } from '../redux/slices/authSlice';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/api';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Bell, Shield, Calendar, FileText, Activity, Moon, Sun, Menu, X, MessageSquare } from 'lucide-react';
import { 
  fetchNotificationsStart, 
  fetchNotificationsSuccess, 
  fetchNotificationsFailure, 
  markAllRead, 
  markRead 
} from '../redux/slices/notificationSlice';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
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

  // Helper to check if a navigation link is active
  const isLinkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const getNotificationsList = async () => {
      dispatch(fetchNotificationsStart());
      try {
         const response = await api.get('/notifications');
         dispatch(
           fetchNotificationsSuccess({
             notifications: response.data.notifications.map((n: any) => ({
               id: n._id || n.id,
               title: n.title,
               message: n.message,
               type: n.type,
               isRead: n.isRead,
               createdAt: n.createdAt,
             })),
             unreadCount: response.data.unreadCount,
           })
         );
      } catch (err: any) {
        console.error('Failed to fetch notifications:', err);
        dispatch(fetchNotificationsFailure(err.response?.data?.error || err.message || 'Failed to load notifications'));
      }
    };

    getNotificationsList();
  }, [isAuthenticated, dispatch]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch(markAllRead());
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      dispatch(markRead(id));
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

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

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showNotifications && !target.closest('.notification-container') && !target.closest('.mobile-notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await handleMarkRead(notif.id);
    }
    setShowNotifications(false);
    setMobileMenuOpen(false);
    
    if (user?.role === 'Doctor') {
      if (notif.type === 'AppointmentBooked' || notif.type === 'AppointmentCancelled') {
        router.push('/doctor/schedule?tab=appointments');
      } else if (notif.type === 'ScheduleUpdated') {
        router.push('/doctor/schedule?tab=slots');
      } else {
        router.push('/');
      }
    } else if (user?.role === 'Patient') {
      if (notif.type === 'AppointmentBooked' || notif.type === 'AppointmentCancelled') {
        router.push('/');
      } else if (notif.type === 'PrescriptionCreated') {
        router.push('/prescriptions');
      } else {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

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
                <Link 
                  href="/" 
                  className={`text-sm font-medium transition-colors ${isLinkActive('/') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                >
                  Dashboard
                </Link>

                {user.role === 'Patient' && (
                  <>
                    <Link 
                      href="/appointments/book" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/appointments/book') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <Calendar className="h-4 w-4" /> Book Appointment
                    </Link>
                    <Link 
                      href="/prescriptions" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/prescriptions') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <FileText className="h-4 w-4" /> Prescriptions
                    </Link>
                    <Link 
                      href="/chat" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/chat') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <MessageSquare className="h-4 w-4" /> Chat
                    </Link>
                  </>
                )}

                {user.role === 'Doctor' && (
                  <>
                    <Link 
                      href="/doctor/schedule" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/doctor/schedule') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <Calendar className="h-4 w-4" /> Manage Slots
                    </Link>
                    <Link 
                      href="/prescriptions" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/prescriptions') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <FileText className="h-4 w-4" /> Create Prescription
                    </Link>
                    <Link 
                      href="/chat" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/chat') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <MessageSquare className="h-4 w-4" /> Chat
                    </Link>
                  </>
                )}

                {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
                  <>
                    <Link 
                      href="/admin/users" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/admin/users') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
                      <Shield className="h-4 w-4" /> Accounts
                    </Link>
                    <Link 
                      href="/admin/audit" 
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${isLinkActive('/admin/audit') ? 'text-primary' : 'text-slate-600 hover:text-primary dark:text-slate-350 dark:hover:text-white'}`}
                    >
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
                 <div className="relative notification-container">
                   <button
                     onClick={() => setShowNotifications(!showNotifications)}
                     className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   >
                     <Bell className="h-5 w-5" />
                     {unreadCount > 0 && (
                       <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-pulse">
                         {unreadCount}
                       </span>
                     )}
                   </button>
 
                   {/* Notifications Popup */}
                   {showNotifications && (
                     <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                       <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                         <span className="font-semibold text-sm">Notifications</span>
                         <span onClick={handleMarkAllRead} className="text-xs text-primary cursor-pointer hover:underline">
                           Mark all read
                         </span>
                       </div>
                       <div className="max-h-64 overflow-y-auto mt-2 flex flex-col gap-1">
                         {notifications.length === 0 ? (
                           <div className="text-center py-6 text-xs text-slate-400">No new notifications</div>
                         ) : (
                           notifications.slice(0, 5).map((notif) => (
                             <div 
                               key={notif.id} 
                               onClick={() => handleNotificationClick(notif)}
                               className={`p-3 rounded-lg cursor-pointer transition-colors ${notif.isRead ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20'}`}
                             >
                               <div className="flex items-start justify-between gap-1">
                                 <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{notif.title}</h5>
                                 {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0"></span>}
                               </div>
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

              {/* Mobile Menu & Theme Controls */}
              <div className="flex md:hidden items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </button>

                {/* Mobile Notifications Bell */}
                <div className="relative mobile-notification-container">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popup */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                        <span className="font-semibold text-sm">Notifications</span>
                        <span onClick={handleMarkAllRead} className="text-xs text-primary cursor-pointer hover:underline">
                          Mark all read
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto mt-2 flex flex-col gap-1">
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">No new notifications</div>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${notif.isRead ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20'}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{notif.title}</h5>
                                {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0"></span>}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav Menu */}
          {mobileMenuOpen && (
            <div className="border-b border-slate-200 bg-white/95 px-4 py-4 dark:border-slate-850 dark:bg-slate-900/95 backdrop-blur-md md:hidden flex flex-col gap-3 shadow-xl">
              {/* User Profile Header */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 mb-1">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-semibold">{user.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                  <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px] font-bold mt-1.5">
                    {user.role}
                  </span>
                </div>
              </div>

              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)} 
                className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
              >
                Dashboard
              </Link>
              {user.role === 'Patient' && (
                <>
                  <Link 
                    href="/appointments/book" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/appointments/book') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Book Appointment
                  </Link>
                  <Link 
                    href="/prescriptions" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/prescriptions') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Prescriptions
                  </Link>
                  <Link 
                    href="/chat" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/chat') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Chat
                  </Link>
                </>
              )}
              {user.role === 'Doctor' && (
                <>
                  <Link 
                    href="/doctor/schedule" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/doctor/schedule') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Manage Slots
                  </Link>
                  <Link 
                    href="/prescriptions" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/prescriptions') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Create Prescription
                  </Link>
                  <Link 
                    href="/chat" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/chat') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Chat
                  </Link>
                </>
              )}
              {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
                <>
                  <Link 
                    href="/admin/users" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/admin/users') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Accounts management
                  </Link>
                  <Link 
                    href="/admin/audit" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isLinkActive('/admin/audit') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'}`}
                  >
                    Audit Trails
                  </Link>
                </>
              )}
              <div className="h-px bg-slate-150 dark:bg-slate-800 my-2"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-destructive py-2 px-3 rounded-lg hover:bg-destructive/5 transition-colors"
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
