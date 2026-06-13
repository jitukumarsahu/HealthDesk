'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useParams, useRouter } from 'next/navigation';
import { api, downloadPrescriptionFile } from '../../../services/api';
import Link from 'next/link';
import { FileText, ArrowLeft, Download, Calendar, User, Stethoscope, ChevronRight, ShieldAlert } from 'lucide-react';

export default function PrescriptionDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [prescription, setPrescription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/prescriptions/${id}`);
        setPrescription(res.data.prescription);
      } catch (err: any) {
        console.error('Failed to load prescription:', err);
        setError(err.response?.data?.error || 'Unauthorized to view this prescription');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id, isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Back navigation */}
      <Link 
        href="/prescriptions" 
        className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Prescriptions
      </Link>

      {loading ? (
        <div className="flex h-64 items-center justify-center glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 rounded-2xl border border-rose-500/20 text-center space-y-3">
          <div className="rounded-full bg-rose-55/10 p-3 text-rose-500 max-w-max mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm text-rose-600 dark:text-rose-405">Access Denied</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      ) : prescription ? (
        <div className="glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl">
          
          {/* Top banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/5 p-6 md:p-8 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Medical Prescription
              </h2>
              <p className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Prescription ID: {prescription._id}</p>
            </div>
            
            <button
              onClick={() => downloadPrescriptionFile(prescription._id)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-all shadow-md cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download PDF Receipt
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Metadata section */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3 items-center">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xs font-bold text-slate-450 uppercase">Medical practitioner</p>
                  <h4 className="text-sm font-bold mt-0.5">Dr. {prescription.doctorId?.name}</h4>
                  <p className="text-3xs text-slate-400">{prescription.doctorId?.doctorProfile?.specialization || 'Clinical Medicine'}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/20 p-2.5 text-indigo-500">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xs font-bold text-slate-450 uppercase">Patient profile</p>
                  <h4 className="text-sm font-bold mt-0.5">{prescription.patientId?.name}</h4>
                  <p className="text-3xs text-slate-400">{prescription.patientId?.email}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center sm:col-span-2 border-t border-slate-100 dark:border-slate-800/40 pt-4">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-850 p-2.5 text-slate-500">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xs font-bold text-slate-450 uppercase">Date Issued</p>
                  <h4 className="text-sm font-bold mt-0.5">{new Date(prescription.date).toLocaleString()}</h4>
                </div>
              </div>
            </div>

            {/* Medicines List */}
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/40 pt-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rx Instructions</h4>
              
              <div className="space-y-3">
                {prescription.medicines.map((med: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200/30 dark:border-slate-800/30 gap-2">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-sm text-slate-800 dark:text-slate-105">{med.name}</h5>
                      <p className="text-xs text-slate-400 font-medium">{med.dosage}</p>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-3xs text-slate-450 block uppercase font-bold">Frequency</span>
                        <span className="text-primary mt-0.5 block">{med.frequency}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                      <div>
                        <span className="text-3xs text-slate-450 block uppercase font-bold">Duration</span>
                        <span className="text-indigo-500 mt-0.5 block">{med.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consultation Notes */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation & Practitioner Notes</h4>
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-slate-800/30">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {prescription.consultationNotes}
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : null}

    </div>
  );
}
