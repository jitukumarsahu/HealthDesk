'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { Calendar, Plus, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

const STANDARD_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

export default function DoctorSchedulePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [existingSlots, setExistingSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Slot configuration form
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [duration, setDuration] = useState(30);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDoctorSlots = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const res = await api.get(`/appointments/slots/available/${user.id}`);
        setExistingSlots(res.data.slots);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Doctor') {
      router.push('/login');
      return;
    }
    fetchDoctorSlots();
  }, [isAuthenticated, user, router]);

  const handleTimeToggle = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter((t) => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
    setMessage(null);
  };

  const handleSelectAllTimes = () => {
    if (selectedTimes.length === STANDARD_TIMES.length) {
      setSelectedTimes([]);
    } else {
      setSelectedTimes(STANDARD_TIMES);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedDate) {
      setMessage({ type: 'error', text: 'Please select a date' });
      return;
    }

    if (selectedTimes.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one slot time' });
      return;
    }

    setSubmitLoading(true);

    try {
      // Compile ISO strings for each slot
      const dates = selectedTimes.map((time) => {
        const [hours, minutes] = time.split(':');
        const dateTime = new Date(selectedDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return dateTime.toISOString();
      });

      const res = await api.post('/appointments/slots', {
        dates,
        duration
      });

      setMessage({ type: 'success', text: res.data.message });
      setSelectedTimes([]);
      fetchDoctorSlots();
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Failed to create slots';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'Doctor') {
    return null;
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* Slots generation panel */}
      <div className="md:col-span-2 glass-panel p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <Calendar className="h-5 w-5 text-primary" /> Configure Availability Slots
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Slot Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-350 bg-white py-3 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-900"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          {/* Time pick checklist */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase text-slate-500">Pick Available Times</label>
              <button
                type="button"
                onClick={handleSelectAllTimes}
                className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {selectedTimes.length === STANDARD_TIMES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STANDARD_TIMES.map((time) => {
                const isSelected = selectedTimes.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeToggle(time)}
                    className={`flex items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-primary border-primary text-white shadow-md' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <Clock className="h-3 w-3" /> {time}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg cursor-pointer"
          >
            {submitLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              `Generate ${selectedTimes.length} Slots`
            )}
          </button>
        </form>
      </div>

      {/* Generated slots overview list */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-slate-150 dark:border-slate-800 pb-2">
          <Clock className="h-5 w-5 text-indigo-500" /> Active Open Slots
        </h3>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : existingSlots.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No available slots configured. Generate some using the form.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2.5 pr-2">
            {existingSlots.map((slot) => (
              <div 
                key={slot._id}
                className="bg-white/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/30 dark:border-slate-800/50 flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-semibold">{new Date(slot.dateTime).toLocaleDateString()}</p>
                  <p className="text-slate-400 mt-0.5">{new Date(slot.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-3xs font-semibold text-emerald-800 dark:text-emerald-450">
                  Available
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
