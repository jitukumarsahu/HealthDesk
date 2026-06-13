'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../redux/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../services/api';
import { 
  Calendar, 
  FileText, 
  Users, 
  Clock, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Download, 
  ExternalLink,
  Shield, 
  AlertTriangle,
  BriefcaseMedical
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ patients: 0, doctors: 0, appointments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        if (user?.role === 'Patient' || user?.role === 'Doctor') {
          // Fetch appointments and prescriptions
          const [apptRes, prescRes] = await Promise.all([
            api.get('/appointments?limit=5'),
            api.get('/prescriptions?limit=5')
          ]);
          setAppointments(apptRes.data.appointments);
          setPrescriptions(prescRes.data.prescriptions);
        } else if (user?.role === 'Admin') {
          // Admins fetch list of audits
          const auditRes = await api.get('/admin/audit-logs?limit=5');
          setAppointments(auditRes.data.logs);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/20 to-indigo-500/10 p-6 md:p-8 border border-emerald-500/10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Here is a summary of your workspace activities today. You are logged in as a <strong className="text-primary">{user.role}</strong>.
        </p>
      </div>

      {/* Role-Based Components */}
      {user.role === 'Patient' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Quick Actions Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Quick Actions
              </h3>
              <p className="text-xs text-slate-500 mt-2">Book consultations or retrieve documents immediately.</p>
            </div>
            <div className="mt-6 space-y-3">
              <Link 
                href="/appointments/book" 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" /> Book Appointment
              </Link>
              <Link 
                href="/prescriptions" 
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="h-4 w-4" /> View Prescriptions
              </Link>
            </div>
          </div>

          {/* Appointments Section */}
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-indigo-500" /> Upcoming Consultations
            </h3>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No scheduled appointments</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt._id} className="premium-card bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2.5 text-indigo-500">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Consultation with</p>
                        <h4 className="text-sm font-bold mt-0.5">Dr. {appt.doctorId?.name || 'Doctor'}</h4>
                        <p className="text-2xs text-slate-400 mt-1">{new Date(appt.dateTime).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold flex items-center gap-1 ${
                        appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        appt.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {appt.status === 'Confirmed' && <CheckCircle className="h-3 w-3" />}
                        {appt.status === 'Pending' && <Clock className="h-3 w-3" />}
                        {appt.status === 'Cancelled' && <XCircle className="h-3 w-3" />}
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prescriptions Section */}
          <div className="md:col-span-3 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-500" /> Recent Prescriptions
            </h3>
            {prescriptions.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No prescriptions recorded</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {prescriptions.map((presc) => (
                  <div key={presc._id} className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold">Issued by Dr. {presc.doctorId?.name || 'Doctor'}</h4>
                      <p className="text-2xs text-slate-400 mt-1">Date: {new Date(presc.date).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-1">Meds: {presc.medicines.map((m: any) => m.name).join(', ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        href={`/prescriptions/${presc._id}`}
                        className="rounded-lg p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-350 transition-colors"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <a 
                        href={`http://localhost:5000/api/prescriptions/${presc._id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {user.role === 'Doctor' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Quick Actions Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BriefcaseMedical className="h-5 w-5 text-primary" /> Doctor Utilities
              </h3>
              <p className="text-xs text-slate-500 mt-2">Manage consultation availability and prescriptions.</p>
            </div>
            <div className="mt-6 space-y-3">
              <Link 
                href="/doctor/schedule" 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" /> Configure Slots
              </Link>
              <Link 
                href="/prescriptions" 
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Prescription
              </Link>
            </div>
          </div>

          {/* Pending Appointments Section */}
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-indigo-500" /> Active Schedule Bookings
            </h3>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No scheduled appointments</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt._id} className="premium-card bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2.5 text-indigo-500">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Patient</p>
                        <h4 className="text-sm font-bold mt-0.5">{appt.patientId?.name || 'Patient'}</h4>
                        <p className="text-xs text-slate-500 mt-1 italic">Reason: "{appt.reason}"</p>
                        <p className="text-2xs text-slate-400 mt-1">{new Date(appt.dateTime).toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        appt.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {user.role === 'Admin' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Quick Actions Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Admin Utilities
              </h3>
              <p className="text-xs text-slate-500 mt-2">Manage medical staff accounts and audit records.</p>
            </div>
            <div className="mt-6 space-y-3">
              <Link 
                href="/admin/users" 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" /> Provision Doctor Profile
              </Link>
              <Link 
                href="/admin/audit" 
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Shield className="h-4 w-4" /> View Compliance Logs
              </Link>
            </div>
          </div>

          {/* Audit Logs Summary */}
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Recent Compliance Audit Logs
            </h3>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No compliance events logged</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((log) => (
                  <div key={log._id} className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">{log.action}</h4>
                      <p className="text-2xs text-slate-400 mt-1">Resource: {log.resource} ({log.resourceId || 'N/A'})</p>
                      <p className="text-2xs text-slate-400 mt-1">Actor: {log.userId?.name || 'Unauthenticated'} ({log.userId?.email || 'System'})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xs text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">{log.ipAddress || '0.0.0.0'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
