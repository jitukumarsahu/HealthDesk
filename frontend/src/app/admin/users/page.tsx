'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { Shield, Plus, BriefcaseMedical, Mail, Lock, User, CheckCircle2, Search, Filter } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'doctors' | 'patients'>('doctors');
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);

  // Filters & Search
  const [doctorsSearch, setDoctorsSearch] = useState('');
  const [patientsSearch, setPatientsSearch] = useState('');
  const [doctorsFilter, setDoctorsFilter] = useState('all');
  const [patientsFilter, setPatientsFilter] = useState('all');

  // Pagination metadata
  const [docPage, setDocPage] = useState(1);
  const [patPage, setPatPage] = useState(1);
  const [docTotalPages, setDocTotalPages] = useState(1);
  const [patTotalPages, setPatTotalPages] = useState(1);

  // Provisioning Form
  const [formType, setFormType] = useState<'Doctor' | 'Admin'>('Doctor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    biography: '',
    experienceYears: ''
  });
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const params: any = { page: docPage, limit: 10 };
      if (doctorsSearch) params.search = doctorsSearch;
      if (doctorsFilter !== 'all') params.isActive = doctorsFilter;

      const res = await api.get('/admin/doctors', { params });
      setDoctors(res.data.doctors || []);
      setDocTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const params: any = { page: patPage, limit: 10 };
      if (patientsSearch) params.search = patientsSearch;
      if (patientsFilter !== 'all') params.isActive = patientsFilter;

      const res = await api.get('/admin/patients', { params });
      setPatients(res.data.patients || []);
      setPatTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'Admin' && user?.role !== 'SuperAdmin')) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'Admin' || user?.role === 'SuperAdmin')) {
      fetchDoctors();
    }
  }, [isAuthenticated, user, docPage, doctorsSearch, doctorsFilter]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'Admin' || user?.role === 'SuperAdmin')) {
      fetchPatients();
    }
  }, [isAuthenticated, user, patPage, patientsSearch, patientsFilter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitLoading(true);

    try {
      if (formType === 'Doctor') {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          specialization: formData.specialization,
          biography: formData.biography,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined
        };

        const res = await api.post('/admin/doctors', payload);
        setMessage({ type: 'success', text: `Doctor ${res.data.doctor.name} provisioned successfully!` });
        fetchDoctors();
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password
        };

        const res = await api.post('/admin/admins', payload);
        setMessage({ type: 'success', text: `Admin ${res.data.admin.name} provisioned successfully!` });
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        specialization: '',
        biography: '',
        experienceYears: ''
      });
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Failed to create user account';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentRole: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle-active`);
      setMessage({ type: 'success', text: res.data.message });
      if (currentRole === 'Doctor') {
        fetchDoctors();
      } else {
        fetchPatients();
      }
    } catch (err: any) {
      const errorText = err.response?.data?.error || 'Failed to update user active status';
      setMessage({ type: 'error', text: errorText });
    }
  };

  if (!isAuthenticated || (user?.role !== 'Admin' && user?.role !== 'SuperAdmin')) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts Administration</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Provision clinical staff and manage status authorizations for all registered patients and doctors.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Directory Listings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all cursor-pointer ${
                activeTab === 'doctors' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Doctors Directory
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all cursor-pointer ${
                activeTab === 'patients' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Patients Directory
            </button>
          </div>

          {activeTab === 'doctors' ? (
            <div className="space-y-4">
              {/* Doctors Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search doctor by name, email, or specialization..."
                    value={doctorsSearch}
                    onChange={(e) => {
                      setDoctorsSearch(e.target.value);
                      setDocPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-850 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="relative">
                  <select
                    value={doctorsFilter}
                    onChange={(e) => {
                      setDoctorsFilter(e.target.value);
                      setDocPage(1);
                    }}
                    className="w-full sm:w-40 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-850 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-slate-600 dark:text-slate-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="true">Active Only</option>
                    <option value="false">Suspended Only</option>
                  </select>
                </div>
              </div>

              {/* Doctors Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4">Name</th>
                      <th className="p-4">Specialization</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {doctorsLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                        </td>
                      </tr>
                    ) : doctors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">No doctors found matching filters.</td>
                      </tr>
                    ) : (
                      doctors.map((doc) => (
                        <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{doc.name}</div>
                            <div className="text-[10px] text-slate-400">{doc.email}</div>
                          </td>
                          <td className="p-4">{doc.doctorProfile?.specialization || 'N/A'}</td>
                          <td className="p-4">{doc.doctorProfile?.experienceYears ? `${doc.doctorProfile.experienceYears} Years` : 'N/A'}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              doc.isActive 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450'
                            }`}>
                              {doc.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {user.role === 'SuperAdmin' ? (
                              <button
                                onClick={() => handleToggleActive(doc._id, 'Doctor')}
                                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                                  doc.isActive
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
                                }`}
                              >
                                {doc.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">SuperAdmin required</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {docTotalPages > 1 && (
                <div className="flex justify-between items-center text-xs pt-2">
                  <button
                    disabled={docPage <= 1}
                    onClick={() => setDocPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-slate-500">Page {docPage} of {docTotalPages}</span>
                  <button
                    disabled={docPage >= docTotalPages}
                    onClick={() => setDocPage(prev => Math.min(docTotalPages, prev + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patients Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient by name or email..."
                    value={patientsSearch}
                    onChange={(e) => {
                      setPatientsSearch(e.target.value);
                      setPatPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-850 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="relative">
                  <select
                    value={patientsFilter}
                    onChange={(e) => {
                      setPatientsFilter(e.target.value);
                      setPatPage(1);
                    }}
                    className="w-full sm:w-40 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-850 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-slate-600 dark:text-slate-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="true">Active Only</option>
                    <option value="false">Suspended Only</option>
                  </select>
                </div>
              </div>

              {/* Patients Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
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
                        <td colSpan={4} className="p-8 text-center text-slate-400">No patients found matching filters.</td>
                      </tr>
                    ) : (
                      patients.map((pat) => (
                        <tr key={pat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{pat.name}</td>
                          <td className="p-4">{pat.email}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              pat.isActive 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450'
                            }`}>
                              {pat.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {user.role === 'SuperAdmin' ? (
                              <button
                                onClick={() => handleToggleActive(pat._id, 'Patient')}
                                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                                  pat.isActive
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
                                }`}
                              >
                                {pat.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">SuperAdmin required</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {patTotalPages > 1 && (
                <div className="flex justify-between items-center text-xs pt-2">
                  <button
                    disabled={patPage <= 1}
                    onClick={() => setPatPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-slate-500">Page {patPage} of {patTotalPages}</span>
                  <button
                    disabled={patPage >= patTotalPages}
                    onClick={() => setPatPage(prev => Math.min(patTotalPages, prev + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Provision Form & Guide */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" /> Provision Staff
              </h2>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                <button
                  onClick={() => setFormType('Doctor')}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    formType === 'Doctor' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Doctor
                </button>
                <button
                  onClick={() => setFormType('Admin')}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    formType === 'Admin' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {message && (
              <div className={`rounded-lg p-3 text-xs mb-4 border flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-50/10 border-emerald-500/25 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' 
                  : 'bg-rose-50/10 border-rose-500/25 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
              }`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="Dr. John Watson"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="watson@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Security Password</label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {formType === 'Doctor' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Specialization</label>
                    <div className="relative">
                      <BriefcaseMedical className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        name="specialization"
                        required={formType === 'Doctor'}
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                        placeholder="Cardiology..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Years of Experience</label>
                    <input
                      type="number"
                      name="experienceYears"
                      value={formData.experienceYears}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900"
                      placeholder="10"
                      min="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Biography</label>
                    <textarea
                      name="biography"
                      value={formData.biography}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 h-20"
                      placeholder="Biography or summary..."
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  `Provision ${formType}`
                )}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-indigo-500" /> Account Security Rules
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Healthcare accounts hold access permissions to patient data. Ensure strong credentials.
            </p>
            <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-1">
              <li>Minimum 8 characters password</li>
              <li>Include uppercase, numbers, symbols</li>
              <li>Toggle active status controls database login permissions</li>
              <li>All changes recorded in security audit logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
