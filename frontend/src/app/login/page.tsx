'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loginStart, loginSuccess, loginFailure, logout } from '../../redux/slices/authSlice';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';
import { Activity, ShieldAlert, KeyRound, Mail, User, BriefcaseMedical, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Patient',
    specialization: '',
    biography: '',
    experienceYears: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // If already authenticated, redirect to home page
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Clear errors on mount
  useEffect(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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
    if (isRegister && formData.role === 'Doctor') {
      if (!formData.specialization.trim()) {
        return 'Specialization is required for Doctor accounts';
      }
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
        // Register patient or doctor
        const registrationData: any = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        };

        if (formData.role === 'Doctor') {
          registrationData.specialization = formData.specialization;
          registrationData.biography = formData.biography;
          registrationData.experienceYears = formData.experienceYears;
        }

        await api.post('/auth/register', registrationData);
        
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
            {isRegister ? 'Choose your role to get started.' : 'Secure clinical management workspace'}
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
              <>
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

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <BriefcaseMedical className="h-4 w-4" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <option value="Patient">Register as Patient</option>
                    <option value="Doctor">Register as Doctor</option>
                  </select>
                </div>
              </>
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

            {isRegister && formData.role === 'Doctor' && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                <div className="relative">
                  <input
                    id="specialization"
                    name="specialization"
                    type="text"
                    required
                    value={formData.specialization}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 py-3 px-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="Medical Specialization (e.g. Cardiologist)*"
                  />
                </div>
                <div className="relative">
                  <input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 py-3 px-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="Years of Experience"
                  />
                </div>
                <div className="relative">
                  <textarea
                    id="biography"
                    name="biography"
                    rows={3}
                    value={formData.biography}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 py-3 px-3 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="Brief professional biography (optional)"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-10 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {isRegister && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-10 text-sm placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
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
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
