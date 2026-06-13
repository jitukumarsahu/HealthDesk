'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loginStart, loginSuccess, loginFailure } from '../../redux/slices/authSlice';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Activity, ShieldAlert, KeyRound, Mail, User, BriefcaseMedical } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // If already authenticated, redirect to home page
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationError(null);
  };

  const validateForm = () => {
    if (isRegister && !formData.name) {
      return 'Name is required';
    }
    if (!formData.email) {
      return 'Email is required';
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (!formData.password) {
      return 'Password is required';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (isRegister && formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    dispatch(loginStart());

    try {
      if (isRegister) {
        // Register patient
        await api.post('/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        
        // Log in automatically after registration
        const loginRes = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });
        
        const { user, accessToken } = loginRes.data;
        dispatch(loginSuccess({ user, accessToken }));
        router.push('/');
      } else {
        // Log in
        const loginRes = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });
        
        const { user, accessToken } = loginRes.data;
        dispatch(loginSuccess({ user, accessToken }));
        router.push('/');
      }
    } catch (err: any) {
      const serverError = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      dispatch(loginFailure(serverError));
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50">
        
        {/* Title Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight">
            {isRegister ? 'Create your account' : 'Sign in to HealthDesk'}
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {isRegister ? 'Patient registration portal. Doctors and admins must request credentials.' : 'Secure clinical management workspace'}
          </p>
        </div>

        {/* Form Error Banner */}
        {(error || validationError) && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 border border-destructive/20">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error || validationError}</span>
          </div>
        )}

        {/* Input Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {isRegister && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                  placeholder="Full name"
                />
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                placeholder="Password"
              />
            </div>

            {isRegister && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                  placeholder="Confirm password"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-primary py-3 px-4 text-sm font-semibold text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-primary/50 transition-all cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : isRegister ? (
                'Register & Sign In'
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Toggle Mode Link */}
        <div className="flex justify-center text-xs mt-4">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setValidationError(null);
            }}
            className="text-primary font-semibold hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register as Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}
