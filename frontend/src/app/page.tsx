'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../redux/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../services/api';
import { 
  Calendar, 
  FileText, 
  Clock, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Download, 
  ExternalLink,
  Shield, 
  AlertTriangle,
  BriefcaseMedical,
  MessageSquare,
  Search,
  X,
  User,
  Loader
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Doctors directory search
  const [doctorsSearch, setDoctorsSearch] = useState('');

  // Rescheduling modal states
  const [reschedulingAppt, setReschedulingAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlotId, setSelectedRescheduleSlotId] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'Patient') {
        const [apptRes, prescRes, docRes] = await Promise.all([
          api.get('/appointments?limit=20'),
          api.get('/prescriptions?limit=20'),
          api.get('/appointments/doctors')
        ]);
        setAppointments(apptRes.data.appointments || []);
        setPrescriptions(prescRes.data.prescriptions || []);
        setDoctors(docRes.data.doctors || []);
      } else if (user?.role === 'Doctor') {
        const [apptRes, prescRes] = await Promise.all([
          api.get('/appointments?limit=20'),
          api.get('/prescriptions?limit=20')
        ]);
        setAppointments(apptRes.data.appointments || []);
        setPrescriptions(prescRes.data.prescriptions || []);
      } else if (user?.role === 'Admin' || user?.role === 'SuperAdmin') {
        const auditRes = await api.get('/admin/audit-logs?limit=20');
        setAppointments(auditRes.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, user, router]);

  // Load available reschedule slots
  useEffect(() => {
    if (!reschedulingAppt || !rescheduleDate) {
      setRescheduleSlots([]);
      setSelectedRescheduleSlotId('');
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingRescheduleSlots(true);
        setSelectedRescheduleSlotId('');
        const nextDay = new Date(rescheduleDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const docId = reschedulingAppt.doctorId?._id || reschedulingAppt.doctorId?.id;
        const res = await api.get(
          `/appointments/slots/available/${docId}?startDate=${rescheduleDate}&endDate=${nextDay.toISOString().split('T')[0]}`
        );
        setRescheduleSlots(res.data.slots || []);
      } catch (err) {
        console.error('Failed to load reschedule slots:', err);
      } finally {
        setLoadingRescheduleSlots(false);
      }
    };

    fetchSlots();
  }, [reschedulingAppt, rescheduleDate]);

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post(`/appointments/${apptId}/cancel`);
      setMessage({ type: 'success', text: 'Appointment cancelled successfully' });
      fetchDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to cancel appointment' });
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !selectedRescheduleSlotId) return;

    try {
      await api.patch(`/appointments/${reschedulingAppt._id}`, {
        newSlotId: selectedRescheduleSlotId
      });
      setMessage({ type: 'success', text: 'Appointment rescheduled successfully' });
      setReschedulingAppt(null);
      setRescheduleDate('');
      setRescheduleSlots([]);
      setSelectedRescheduleSlotId('');
      fetchDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reschedule appointment' });
    }
  };

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

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const term = doctorsSearch.toLowerCase();
    return (
      doc.name.toLowerCase().includes(term) ||
      (doc.doctorProfile?.specialization && doc.doctorProfile.specialization.toLowerCase().includes(term))
    );
  });

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

      {message && (
        <div className={`rounded-xl p-4 text-xs border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
            : 'bg-rose-50/10 border-rose-500/25 text-rose-600 dark:bg-rose-950/20 dark:text-rose-455'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* -------------------- PATIENT VIEW -------------------- */}
      {user.role === 'Patient' && (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Consultations List (col-span-2) */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-500" /> Upcoming Consultations
              </h3>
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No scheduled appointments</div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt) => {
                    const isConfirmed = appt.status === 'Confirmed';
                    const isActionable = appt.status !== 'Completed' && appt.status !== 'Cancelled';
                    return (
                      <div key={appt._id} className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex gap-3 items-center">
                          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2.5 text-indigo-500 shrink-0">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400">Consultation with</p>
                            <h4 className="text-sm font-bold mt-0.5">Dr. {appt.doctorId?.name || 'Doctor'}</h4>
                            <p className="text-2xs text-slate-400 mt-1">{new Date(appt.dateTime).toLocaleString()}</p>
                            <p className="text-xs text-slate-500 mt-1 italic">"{appt.reason}"</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${
                            appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                            appt.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                            appt.status === 'Completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-455'
                          }`}>
                            {appt.status}
                          </span>
                          
                          {isActionable && (
                            <>
                              <button
                                onClick={() => setReschedulingAppt(appt)}
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelAppointment(appt._id)}
                                className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          
                          {isConfirmed && (
                            <Link 
                              href="/chat"
                              className="bg-primary hover:bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> Chat
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Doctor Directory (col-span-1) */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col h-[400px]">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                <BriefcaseMedical className="h-5 w-5 text-primary" /> Medical Practitioners
              </h3>
              
              <div className="mb-3 relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctor or specialty..."
                  value={doctorsSearch}
                  onChange={(e) => setDoctorsSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-850 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredDoctors.length === 0 ? (
                  <p className="text-2xs text-slate-450 py-8 text-center">No doctors found matching filters.</p>
                ) : (
                  filteredDoctors.map((doc) => {
                    // Check if patient has any Confirmed appointment with this doctor
                    const hasConfirmedChat = appointments.some(
                      (appt) => (appt.doctorId?._id === doc._id || appt.doctorId?.id === doc._id) && appt.status === 'Confirmed'
                    );
                    
                    return (
                      <div key={doc._id} className="p-3 bg-white/40 dark:bg-slate-900/20 rounded-xl border border-slate-200/40 dark:border-slate-850 flex flex-col gap-2">
                        <div>
                          <h4 className="font-bold text-xs">Dr. {doc.name}</h4>
                          <p className="text-[10px] text-primary/80 uppercase mt-0.5">{doc.doctorProfile?.specialization || 'General Practitioner'}</p>
                          {doc.doctorProfile?.experienceYears && (
                            <p className="text-[9px] text-slate-400 mt-0.5">{doc.doctorProfile.experienceYears} Years Experience</p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-850 pt-2">
                          <Link
                            href={`/appointments/book?doctorId=${doc._id}`}
                            className="bg-primary hover:bg-emerald-600 text-white text-[9px] font-semibold px-2 py-1 rounded-md transition-colors"
                          >
                            Book Slot
                          </Link>
                          {hasConfirmedChat && (
                            <Link
                              href="/chat"
                              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-[9px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="h-3 w-3" /> Chat
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Prescriptions Section (col-span-3) */}
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
                          className="rounded-lg p-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-450 transition-colors"
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

          {/* Rescheduling Modal */}
          {reschedulingAppt && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200/50 dark:border-slate-800/50 animate-zoomIn relative">
                <button
                  onClick={() => {
                    setReschedulingAppt(null);
                    setRescheduleDate('');
                  }}
                  className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>

                <h3 className="text-base font-bold flex items-center gap-1.5 border-b dark:border-slate-800 pb-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary" /> Reschedule Appointment
                </h3>

                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Practitioner:</span>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-100">Dr. {reschedulingAppt.doctorId?.name}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-400">Select Date</label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
                    />
                  </div>

                  {rescheduleDate && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Available Time Slots</label>
                      {loadingRescheduleSlots ? (
                        <div className="flex justify-center py-4">
                          <Loader className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : rescheduleSlots.length === 0 ? (
                        <p className="text-[10px] text-rose-500 italic">No slots open on this day. Please select another date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1">
                          {rescheduleSlots.map((slot) => {
                            const isSel = selectedRescheduleSlotId === slot._id;
                            const tStr = new Date(slot.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <button
                                key={slot._id}
                                type="button"
                                onClick={() => setSelectedRescheduleSlotId(slot._id)}
                                className={`py-1.5 px-2 rounded-lg border text-[10px] font-medium transition-all text-center cursor-pointer ${
                                  isSel
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                                }`}
                              >
                                {tStr}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedRescheduleSlotId}
                    className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-md disabled:bg-primary/50"
                  >
                    Confirm Rescheduling
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- DOCTOR VIEW -------------------- */}
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
                {appointments.slice(0, 5).map((appt) => (
                  <div key={appt._id} className="premium-card bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2.5 text-indigo-500 shrink-0">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Patient</p>
                        <h4 className="text-sm font-bold mt-0.5">{appt.patientId?.name || 'Patient'}</h4>
                        <p className="text-xs text-slate-500 mt-1 italic">Reason: "{appt.reason}"</p>
                        <p className="text-2xs text-slate-400 mt-1">{new Date(appt.dateTime).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        appt.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-455'
                      }`}>
                        {appt.status}
                      </span>
                      {appt.status === 'Confirmed' && (
                        <Link
                          href="/chat"
                          className="bg-primary hover:bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="h-3 w-3" /> Chat
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- ADMIN / SUPERADMIN VIEW -------------------- */}
      {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
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
                {appointments.slice(0, 5).map((log) => (
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
