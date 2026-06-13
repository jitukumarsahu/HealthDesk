'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../services/api';
import { 
  Calendar, Plus, Clock, AlertCircle, CheckCircle2, 
  User, MessageSquare, Search, BookOpen, Clipboard, Activity 
} from 'lucide-react';

const STANDARD_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

function DoctorSchedulePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'slots' | 'appointments' | 'patients'>('slots');
  const [existingSlots, setExistingSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Loading States
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);

  // Slot Form Inputs
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [slotDuration, setSlotDuration] = useState(30);

  // Range Generation Form Inputs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Search/Filters
  const [patientsSearch, setPatientsSearch] = useState('');
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any | null>(null);
  
  // Date & Status Filters
  const [filterSlotDate, setFilterSlotDate] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDoctorSlots = async () => {
    try {
      setSlotsLoading(true);
      if (user?.id) {
        const res = await api.get(`/appointments/slots/available/${user.id}`);
        setExistingSlots(res.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchDoctorAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchDoctorPatients = async () => {
    try {
      setPatientsLoading(true);
      const params: any = {};
      if (patientsSearch) params.search = patientsSearch;
      const res = await api.get('/appointments/patients', { params });
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error('Failed to load patients list:', err);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Doctor') {
      router.push('/login');
      return;
    }
    
    if (activeTab === 'slots') {
      fetchDoctorSlots();
    } else if (activeTab === 'appointments') {
      fetchDoctorAppointments();
    } else if (activeTab === 'patients') {
      fetchDoctorPatients();
    }
  }, [isAuthenticated, user, activeTab, router]);

  useEffect(() => {
    if (tabParam === 'slots' || tabParam === 'appointments' || tabParam === 'patients') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Handle patient search debounce
  useEffect(() => {
    if (activeTab === 'patients' && isAuthenticated) {
      fetchDoctorPatients();
    }
  }, [patientsSearch]);

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

  // Generate Slots
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedDate) {
      setMessage({ type: 'error', text: 'Please select a date' });
      return;
    }

    if (selectedTimes.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one time' });
      return;
    }

    setSubmitLoading(true);

    try {
      const dates = selectedTimes.map((time) => {
        const [hours, minutes] = time.split(':');
        const dateTime = new Date(selectedDate);
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return dateTime.toISOString();
      });

      const res = await api.post('/appointments/slots', {
        dates,
        duration: slotDuration
      });

      setMessage({ type: 'success', text: res.data.message });
      setSelectedTimes([]);
      fetchDoctorSlots();
      
      // Dispatch toaster notification
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: {
          title: 'Slots Generated',
          message: res.data.message || 'Time slots successfully created.'
        }
      }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create slots' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Generate Slots by Range
  const handleRangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select a valid date range' });
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await api.post('/appointments/slots', {
        type: 'range',
        startDate,
        endDate,
        startTime,
        endTime,
        slotDuration
      });

      setMessage({ type: 'success', text: res.data.message });
      setStartDate('');
      setEndDate('');
      setStartTime('09:00');
      setEndTime('17:00');
      fetchDoctorSlots();

      // Dispatch toaster notification
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: {
          title: 'Range Slots Generated',
          message: res.data.message || 'Date range time slots successfully created.'
        }
      }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to generate range slots' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      const res = await api.patch(`/appointments/${appointmentId}/status`, { status });
      fetchDoctorAppointments();
      setMessage({ type: 'success', text: res.data.message });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update status' });
    }
  };

  if (!isAuthenticated || user?.role !== 'Doctor') {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Tab Selector */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-200 dark:border-slate-800 pb-0.5 scrollbar-none gap-2">
        <button
          onClick={() => { setActiveTab('slots'); setMessage(null); }}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'slots' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Slots Configurator
        </button>
        <button
          onClick={() => { setActiveTab('appointments'); setMessage(null); }}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'appointments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Bookings Manager
        </button>
        <button
          onClick={() => { setActiveTab('patients'); setMessage(null); }}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all cursor-pointer ${
            activeTab === 'patients' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Patient History Lookup
        </button>
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-xs border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
            : 'bg-rose-50/10 border-rose-500/25 text-rose-600 dark:bg-rose-950/20 dark:text-rose-455'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {activeTab === 'slots' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Slots Single Generator */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-base font-bold flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Clock className="h-4 w-4 text-primary" /> Generate Specific Slot Batch
              </h2>
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Date</label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Duration (Minutes)</label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Select Time Slots</span>
                    <button type="button" onClick={handleSelectAllTimes} className="text-primary hover:underline font-semibold">
                      {selectedTimes.length === STANDARD_TIMES.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {STANDARD_TIMES.map((time) => {
                      const isSelected = selectedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handleTimeToggle(time)}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all text-center cursor-pointer ${
                            isSelected 
                              ? 'bg-primary border-primary text-white shadow-sm' 
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {submitLoading ? 'Generating...' : `Generate ${selectedTimes.length} Specific Slots`}
                </button>
              </form>
            </div>

            {/* Range Batch Slot Generator */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-base font-bold flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Calendar className="h-4 w-4 text-primary" /> Range Scheduling (Date Range Generator)
              </h2>
              <form onSubmit={handleRangeSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Active Start Hour (e.g. 06:00)</label>
                    <input
                      type="text"
                      required
                      pattern="[0-2][0-9]:[0-5][0-9]"
                      placeholder="06:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Active End Hour (e.g. 23:00)</label>
                    <input
                      type="text"
                      required
                      pattern="[0-2][0-9]:[0-5][0-9]"
                      placeholder="23:00"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {submitLoading ? 'Generating...' : 'Generate Slots Across Date Range'}
                </button>
              </form>
            </div>
          </div>

          {/* Active Slots list */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 h-fit">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2 border-b border-slate-150 dark:border-slate-800 pb-2">
              <Clock className="h-4 w-4 text-indigo-500" /> Active Slots
            </h3>
            
            {/* Slot Date Filter */}
            <div className="mb-4 space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 block">Filter by Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filterSlotDate}
                  onChange={(e) => setFilterSlotDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
                {filterSlotDate && (
                  <button
                    type="button"
                    onClick={() => setFilterSlotDate('')}
                    className="text-[10px] text-rose-500 font-semibold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : existingSlots.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-8 text-center">No available slots generated yet.</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1 flex flex-col gap-1">
                {(() => {
                  const filtered = existingSlots.filter((slot) => {
                    if (!filterSlotDate) return true;
                    const slotDate = new Date(slot.dateTime).toLocaleDateString();
                    const filterDateObj = new Date(filterSlotDate);
                    // Standardize filter slot date check by formatting matching strings
                    const selectedFilterStr = filterDateObj.toLocaleDateString();
                    return slotDate === selectedFilterStr;
                  });

                  if (filtered.length === 0) {
                    return <p className="text-[11px] text-slate-400 py-8 text-center">No slots matching this date.</p>;
                  }

                  return filtered.slice(0, 30).map((slot) => (
                    <div 
                      key={slot._id}
                      className="p-2.5 rounded-lg border border-slate-200/40 bg-slate-50/50 dark:border-slate-850 dark:bg-slate-950/40 flex justify-between items-center text-[11px]"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(slot.dateTime).toLocaleDateString()}</p>
                        <p className="text-slate-400 mt-0.5">{new Date(slot.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-450">
                        Open
                      </span>
                    </div>
                  ));
                })()}
                {existingSlots.length > 30 && !filterSlotDate && (
                  <p className="text-[10px] text-slate-400 text-center pt-2">Showing next 30 availability slots.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
          <h2 className="text-base font-bold flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Clipboard className="h-4 w-4 text-primary" /> Active Bookings Manager
          </h2>

          {/* Appointments Filter Panel */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 block">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-slate-100"
              />
            </div>
            <div className="w-full sm:w-48 space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 block">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-305"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
            {(filterDate || filterStatus !== 'all') && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => { setFilterDate(''); setFilterStatus('all'); }}
                  className="text-xs text-primary font-semibold hover:underline mb-2.5"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {appointmentsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                    </td>
                  </tr>
                ) : (() => {
                  const filtered = appointments.filter((appt) => {
                    if (filterDate) {
                      const apptDateStr = new Date(appt.dateTime).toISOString().split('T')[0];
                      if (apptDateStr !== filterDate) return false;
                    }
                    if (filterStatus !== 'all') {
                      if (appt.status !== filterStatus) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">No appointments match your filters.</td>
                      </tr>
                    );
                  }

                  return filtered.map((appt) => (
                    <tr key={appt._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{appt.patientId?.name || 'Unknown Patient'}</div>
                        <div className="text-[10px] text-slate-400">{appt.patientId?.email}</div>
                      </td>
                      <td className="p-4">
                        <div>{new Date(appt.dateTime).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-4 max-w-xs truncate">{appt.reason}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          appt.status === 'Confirmed' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450' 
                            : appt.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-450'
                            : appt.status === 'Cancelled'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-455'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-450'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2 h-14">
                        {appt.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(appt._id, 'Confirmed')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {appt.status === 'Confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt._id, 'Completed')}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => router.push('/chat')}
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <MessageSquare className="h-3 w-3" /> Chat
                            </button>
                          </>
                        )}
                        {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(appt._id, 'Cancelled')}
                            className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Patients Listing */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Clipboard className="h-4 w-4 text-primary" /> Previous Patients Directory
            </h2>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by name or email..."
                value={patientsSearch}
                onChange={(e) => setPatientsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-350 dark:border-slate-850 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Last Visit</th>
                    <th className="p-4 text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                  {patientsLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">No patient history records found.</td>
                    </tr>
                  ) : (
                    patients.map((pat) => (
                      <tr key={pat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{pat.name}</td>
                        <td className="p-4">{pat.email}</td>
                        <td className="p-4">
                          <div>{new Date(pat.lastVisit).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400">{pat.lastStatus}</div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedPatientHistory(pat)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                          >
                            <BookOpen className="h-3 w-3" /> View History
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Records History Expanded View */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 h-fit">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-slate-150 dark:border-slate-800 pb-2">
              <Clipboard className="h-4 w-4 text-indigo-500" /> Patient Medical File
            </h3>
            {selectedPatientHistory ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{selectedPatientHistory.name}</h4>
                  <p className="text-[10px] text-slate-400">{selectedPatientHistory.email}</p>
                </div>

                {/* Consultation History */}
                <div className="space-y-3 border-b border-slate-100 dark:border-slate-800/40 pb-4">
                  <h5 className="font-bold uppercase text-[9px] text-slate-450 tracking-wider">Consultation History & Reasons</h5>
                  {selectedPatientHistory.appointments && selectedPatientHistory.appointments.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 flex flex-col gap-1">
                      {selectedPatientHistory.appointments.map((appt: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-slate-800/35 rounded-lg text-[11px]">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Date: {new Date(appt.dateTime).toLocaleDateString()}</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                              appt.status === 'Confirmed' ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-400' :
                              appt.status === 'Completed' ? 'bg-blue-100/70 text-blue-800 dark:bg-blue-950/25 dark:text-blue-400' :
                              appt.status === 'Cancelled' ? 'bg-rose-100/70 text-rose-800 dark:bg-rose-950/25 dark:text-rose-455' :
                              'bg-amber-100/70 text-amber-800 dark:bg-amber-950/25 dark:text-amber-400'
                            }`}>{appt.status}</span>
                          </div>
                          <div className="mt-1">
                            <span className="font-semibold text-slate-500">Reason: </span>
                            <span className="text-slate-700 dark:text-slate-300">{appt.reason || 'No reason provided'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No appointments history recorded.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold uppercase text-[9px] text-slate-450 tracking-wider">Prescription History</h5>
                  
                  {selectedPatientHistory.prescriptions && selectedPatientHistory.prescriptions.length > 0 ? (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {selectedPatientHistory.prescriptions.map((pr: any) => (
                        <div key={pr._id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-850 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Date: {new Date(pr.date || pr.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-semibold text-[10px] block uppercase text-slate-500">Medicines:</span>
                            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                              {pr.medicines?.map((m: any, idx: number) => (
                                <li key={idx} className="text-slate-700 dark:text-slate-300">
                                  <span className="font-medium">{m.name}</span> - {m.dosage} ({m.frequency} for {m.duration})
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="text-[10px] pt-1.5 border-t border-slate-200/40 dark:border-slate-800">
                            <span className="font-semibold text-slate-500 block uppercase">Notes:</span>
                            <p className="text-slate-600 dark:text-slate-400 italic mt-0.5">{pr.consultationNotes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No prescriptions issued by you for this patient.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-8 text-center">Select a patient directory profile to see detailed medical logs and past prescriptions.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorSchedulePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <DoctorSchedulePageContent />
    </Suspense>
  );
}
