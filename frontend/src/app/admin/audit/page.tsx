'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Search, FileBarChart } from 'lucide-react';

export default function AdminAuditPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let queryParams = `?page=${page}&limit=20`;
      if (actionFilter) queryParams += `&action=${actionFilter}`;
      if (resourceFilter) queryParams += `&resource=${resourceFilter}`;

      const res = await api.get(`/admin/audit-logs${queryParams}`);
      setLogs(res.data.logs);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Admin') {
      router.push('/login');
      return;
    }
    fetchLogs();
  }, [isAuthenticated, user, page, actionFilter, resourceFilter, router]);

  const handleRefresh = () => {
    fetchLogs();
  };

  if (!isAuthenticated || user?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" /> Compliance Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable tracking of sensitive clinical records views, downloads, authentication activity, and schedule alterations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase text-slate-400">Action Filter</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-350 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-850 dark:bg-slate-900"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
            <option value="AUTH_LOGIN_FAILED">Login Failed</option>
            <option value="AUTH_LOGOUT">Logout</option>
            <option value="VIEW_PRESCRIPTION">View Prescription</option>
            <option value="DOWNLOAD_PRESCRIPTION_PDF">Download Prescription PDF</option>
            <option value="CREATE_PRESCRIPTION">Create Prescription</option>
            <option value="PATIENT_BOOK_APPOINTMENT">Book Appointment</option>
            <option value="CANCEL_APPOINTMENT">Cancel Appointment</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-bold uppercase text-slate-400">Resource Type</label>
          <select
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-350 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-850 dark:bg-slate-900"
          >
            <option value="">All Resources</option>
            <option value="Auth">Auth Security</option>
            <option value="Prescription">Prescriptions</option>
            <option value="Appointment">Appointments</option>
            <option value="User">User Accounts</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <FileBarChart className="h-8 w-8 text-slate-300" />
            <p className="text-sm">No audit logs matching selection</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">Timestamp</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">Actor (Role)</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">Action</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">Resource (ID)</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">IP Address</th>
                  <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.userId ? (
                        <div>
                          <p className="font-semibold">{log.userId.name}</p>
                          <p className="text-2xs text-slate-400">{log.userId.email} ({log.userId.role})</p>
                        </div>
                      ) : (
                        <span className="text-slate-450 italic">Anonymous/System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-3xs font-semibold ${
                        log.action.includes('FAILED') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-450' :
                        log.action.includes('DOWNLOAD') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400' :
                        log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        'bg-slate-105 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{log.resource}</p>
                      {log.resourceId && <p className="text-3xs text-slate-450">{log.resourceId}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-450 font-mono whitespace-nowrap">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-450 max-w-[200px] truncate" title={log.userAgent}>
                      {log.userAgent || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-slate-450">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
