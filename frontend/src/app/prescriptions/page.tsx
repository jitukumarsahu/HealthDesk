'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Trash2, 
  PlusCircle, 
  Download, 
  Eye, 
  Activity, 
  User, 
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function PrescriptionsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Doctor prescription form modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  
  // Dynamic medicines list
  const [medicines, setMedicines] = useState<any[]>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data.prescriptions);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchPrescriptions();

    // If doctor, load their patients list from appointments
    if (user?.role === 'Doctor') {
      const loadPatients = async () => {
        try {
          const apptRes = await api.get('/appointments?limit=100');
          // Extract unique patient objects
          const appointments = apptRes.data.appointments;
          const patientMap = new Map();
          appointments.forEach((appt: any) => {
            if (appt.patientId) {
              patientMap.set(appt.patientId._id, {
                id: appt.patientId._id,
                name: appt.patientId.name,
                email: appt.patientId.email,
                appointmentId: appt._id
              });
            }
          });
          setPatients(Array.from(patientMap.values()));
        } catch (err) {
          console.error(err);
        }
      };
      loadPatients();
    }
  }, [isAuthenticated, user, router]);

  // Medicines builder helpers
  const handleMedicineChange = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
    setMessage(null);
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicineRow = (index: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedPatientId) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    // Validate medicines are fully filled
    const invalidMeds = medicines.some(
      (m) => !m.name.trim() || !m.dosage.trim() || !m.frequency.trim() || !m.duration.trim()
    );

    if (invalidMeds) {
      setMessage({ type: 'error', text: 'Please fill in all medicine parameters (Name, Dosage, Frequency, Duration)' });
      return;
    }

    if (!consultationNotes.trim()) {
      setMessage({ type: 'error', text: 'Please include consultation notes' });
      return;
    }

    setSubmitLoading(true);

    try {
      const payload = {
        patientId: selectedPatientId,
        appointmentId: selectedAppointmentId || undefined,
        medicines: medicines.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim()
        })),
        consultationNotes: consultationNotes.trim()
      };

      await api.post('/prescriptions', payload);

      setMessage({ type: 'success', text: 'Prescription provisioned successfully!' });
      
      // Reset form
      setSelectedPatientId('');
      setSelectedAppointmentId('');
      setConsultationNotes('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      
      fetchPrescriptions();

      // Close modal after 1.5s
      setTimeout(() => {
        setShowCreateModal(false);
        setMessage(null);
      }, 1500);
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Failed to record prescription';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Clinical Prescriptions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access secure digital prescriptions with instructions, dosages, and compliance audit logs.
          </p>
        </div>

        {user.role === 'Doctor' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Issue Prescription
          </button>
        )}
      </div>

      {/* Main List */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">No prescriptions found on your account.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {prescriptions.map((presc) => (
              <div 
                key={presc._id} 
                className="premium-card bg-white/50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-start gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-3xs font-semibold uppercase">{new Date(presc.date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {user.role === 'Patient' ? `Dr. ${presc.doctorId?.name}` : `Patient: ${presc.patientId?.name}`}
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">{presc.doctorId?.doctorProfile?.specialization || 'Clinical medicine'}</p>
                  
                  <div className="pt-2">
                    <p className="text-2xs font-bold text-slate-400 uppercase">Medicines:</p>
                    <ul className="text-xs text-slate-600 mt-1 dark:text-slate-300 list-disc list-inside">
                      {presc.medicines.slice(0, 2).map((med: any, idx: number) => (
                        <li key={idx} className="truncate">{med.name} ({med.dosage})</li>
                      ))}
                      {presc.medicines.length > 2 && <li className="text-2xs text-slate-400 list-none">+{presc.medicines.length - 2} more</li>}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/prescriptions/${presc._id}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-2xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" /> Open
                  </Link>
                  <a 
                    href={`http://localhost:5000/api/prescriptions/${presc._id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 px-3 py-2 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issuing Modal (Doctor only) */}
      {showCreateModal && user.role === 'Doctor' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl glass-panel p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Issue Medical Prescription
              </h3>
              <button 
                onClick={() => { setShowCreateModal(false); setMessage(null); }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {message && (
              <div className={`rounded-xl p-4 text-sm mb-6 border flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-50/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                  : 'bg-rose-50/10 border-rose-500/25 text-rose-600 dark:bg-rose-950/20 dark:text-rose-455'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleCreatePrescription} className="space-y-6">
              {/* Select Patient Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Select Patient Profile</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => {
                    const patId = e.target.value;
                    setSelectedPatientId(patId);
                    const match = patients.find((p) => p.id === patId);
                    setSelectedAppointmentId(match ? match.appointmentId : '');
                    setMessage(null);
                  }}
                  className="w-full rounded-lg border border-slate-350 bg-white py-3 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-900"
                >
                  <option value="">Choose Patient...</option>
                  {patients.map((pat) => (
                    <option key={pat.id} value={pat.id}>
                      {pat.name} ({pat.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Medicines Row Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Prescribed Medicines</label>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="text-2xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Medicine
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((med, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          required
                          value={med.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                          placeholder="Medicine name (e.g., Paracetamol)"
                        />
                      </div>
                      
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="text"
                          required
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                          placeholder="Dosage (500mg)"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        <input
                          type="text"
                          required
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                          placeholder="Frequency (1-0-1)"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="text"
                          required
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 py-2.5 px-3 text-xs dark:border-slate-800 dark:bg-slate-900"
                          placeholder="Duration (5 days)"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          disabled={medicines.length === 1}
                          onClick={() => removeMedicineRow(index)}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultation Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Consultation Notes & Directions</label>
                <textarea
                  required
                  value={consultationNotes}
                  onChange={(e) => { setConsultationNotes(e.target.value); setMessage(null); }}
                  className="w-full rounded-lg border border-slate-350 bg-white py-3 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-900 h-28"
                  placeholder="Take medicine after food, rest for 3 days, avoid heavy exercises..."
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg cursor-pointer"
              >
                {submitLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Issue Secure Prescription'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
