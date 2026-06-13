'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { Calendar, User, Clock, Stethoscope, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export default function BookAppointmentPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reason, setReason] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Load doctors catalog
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Patient') {
      router.push('/login');
      return;
    }

    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await api.get('/appointments/doctors');
        setDoctors(res.data.doctors);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [isAuthenticated, user, router]);

  // Load available slots when doctor and date are selected
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlotId('');
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlotId('');
        
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const res = await api.get(
          `/appointments/slots/available/${selectedDoctor._id}?startDate=${selectedDate}&endDate=${nextDay.toISOString().split('T')[0]}`
        );
        setAvailableSlots(res.data.slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedSlotId) {
      setMessage({ type: 'error', text: 'Please select an appointment time slot' });
      return;
    }

    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for consultation' });
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await api.post('/appointments', {
        slotId: selectedSlotId,
        reason: reason.trim()
      });

      setMessage({ type: 'success', text: 'Appointment booked successfully!' });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Failed to book appointment. The slot may have just been booked by another user.';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'Patient') {
    return null;
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* 1. Doctor Selection Catalog */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
          <Stethoscope className="h-5 w-5 text-primary" /> Select Medical Practitioner
        </h3>

        {loadingDoctors ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No active medical practitioners registered.</p>
        ) : (
          <div className="space-y-3">
            {doctors.map((doc) => {
              const isSelected = selectedDoctor?._id === doc._id;
              return (
                <button
                  key={doc._id}
                  onClick={() => { setSelectedDoctor(doc); setSelectedDate(''); setAvailableSlots([]); setMessage(null); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected 
                      ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm">Dr. {doc.name}</h4>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-2xs font-semibold text-primary/80 uppercase tracking-wider">{doc.doctorProfile?.specialization || 'General Practitioner'}</p>
                  {doc.doctorProfile?.experienceYears && (
                    <p className="text-3xs text-slate-400">{doc.doctorProfile.experienceYears} Years Experience</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Slot Selection and Details Form */}
      <div className="md:col-span-2 glass-panel p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <Calendar className="h-5 w-5 text-primary" /> Configure Appointment Scheduling
        </h2>

        {message && (
          <div className={`rounded-xl p-4 text-sm mb-6 border flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-50/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
              : 'bg-rose-50/10 border-rose-500/25 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {!selectedDoctor ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <User className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm">Please select a doctor from the catalog on the left to begin booking.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-105">Selected Doctor: Dr. {selectedDoctor.name}</h4>
              <p className="text-2xs text-primary/80 font-semibold uppercase mt-0.5">{selectedDoctor.doctorProfile?.specialization || 'General Practitioner'}</p>
              {selectedDoctor.doctorProfile?.biography && (
                <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">"{selectedDoctor.doctorProfile.biography}"</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Select Date</label>
              <input
                type="date"
                required
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setSelectedDate(e.target.value); setMessage(null); }}
                className="w-full rounded-lg border border-slate-350 bg-white py-3 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-900"
              />
            </div>

            {selectedDate && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-500">Pick Available Time Slot</label>
                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 italic">No available times configured for Dr. {selectedDoctor.name} on this date. Select another date.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlotId === slot._id;
                      const timeStr = new Date(slot.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <button
                          key={slot._id}
                          type="button"
                          onClick={() => { setSelectedSlotId(slot._id); setMessage(null); }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-primary border-primary text-white shadow-md' 
                              : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" /> {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Reason for Consultation</label>
              <textarea
                required
                value={reason}
                onChange={(e) => { setReason(e.target.value); setMessage(null); }}
                className="w-full rounded-lg border border-slate-350 bg-white py-3 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-900 h-24"
                placeholder="Briefly state symptoms or clinical checkup purpose..."
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading || !selectedSlotId}
              className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg cursor-pointer disabled:bg-primary/50"
            >
              {submitLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Request Consultation Booking'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
