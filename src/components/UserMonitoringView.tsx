import React, { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  User,
  Users,
  Search,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Eye,
  BarChart2,
  Laptop
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  user_type: 'Admin' | 'Customer';
  action: string;
  details: string;
  format?: 'PDF' | 'Excel' | 'System' | 'Cashbook';
  ip_address?: string;
  duration_mins?: number;
}

interface Metrics {
  pdfExports: number;
  excelExports: number;
  totalOnlineDurationMins: number;
  adminActionsCount: number;
  customerActionsCount: number;
  totalLogs: number;
}

interface UserMonitoringViewProps {
  isSuperAdmin?: boolean;
}

export default function UserMonitoringView({ isSuperAdmin = true }: UserMonitoringViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pdfExports: 0,
    excelExports: 0,
    totalOnlineDurationMins: 0,
    adminActionsCount: 0,
    customerActionsCount: 0,
    totalLogs: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'customer' | 'exports'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAuditData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching activity monitoring logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    fetchAuditData(true);
    const interval = setInterval(() => {
      fetchAuditData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered logs calculation
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ip_address && log.ip_address.includes(searchQuery));

    let matchesTab = true;
    if (activeTab === 'admin') {
      matchesTab = log.user_type === 'Admin' || log.user_role.toLowerCase().includes('admin');
    } else if (activeTab === 'customer') {
      matchesTab = log.user_type === 'Customer' || !log.user_role.toLowerCase().includes('admin');
    } else if (activeTab === 'exports') {
      matchesTab = log.format === 'PDF' || log.format === 'Excel' || log.action.toLowerCase().includes('download') || log.action.toLowerCase().includes('export');
    }

    let matchesFormat = true;
    if (formatFilter !== 'all') {
      matchesFormat = log.format === formatFilter;
    }

    return matchesSearch && matchesTab && matchesFormat;
  });

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Timestamp,User Name,Role,Type,Action,Details,Format,Duration(Mins)"].join(",") + "\n"
      + filteredLogs.map(l => `"${l.timestamp}","${l.user_name}","${l.user_role}","${l.user_type}","${l.action}","${l.details}","${l.format || 'System'}","${l.duration_mins || 0}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `User_Monitoring_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('User activity report exported to CSV!');
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatHoursMins = (totalMins: number) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-xl mx-auto my-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Access Restricted</h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          User Activity Monitoring & Tracking is restricted to Super Admin accounts only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold bg-emerald-600 text-white animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight">User Activity Monitoring & Tracking</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Auditing
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-2 max-w-xl leading-relaxed">
            Track real-time actions across all users: monitor PDF downloads, Excel report generation, admin privilege updates, and total online duration.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchAuditData(false)}
            disabled={refreshing}
            className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PDF Downloads Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PDF Downloads</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{metrics.pdfExports}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-rose-600">PDF Reports & Statements</span> downloaded
          </p>
        </div>

        {/* Excel Downloads Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Excel Downloads</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{metrics.excelExports}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">Spreadsheet Exports</span> generated
          </p>
        </div>

        {/* Total Active Online Duration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Online Session Time</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatHoursMins(metrics.totalOnlineDurationMins)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-blue-600">Total User Activity</span> online duration
          </p>
        </div>

        {/* Admin Actions vs Customer Actions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked Events</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{metrics.totalLogs}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="text-purple-700 font-semibold">{metrics.adminActionsCount} Admin</span>
            <span>•</span>
            <span className="text-blue-700 font-semibold">{metrics.customerActionsCount} Customer</span>
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/60">
          {/* Sub-Tabs */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-purple-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Users ({metrics.adminActionsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'customer'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-blue-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Users ({metrics.customerActionsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'exports'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>PDF & Excel Downloads ({metrics.pdfExports + metrics.excelExports})</span>
            </button>
          </div>

          {/* Search & Format Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by user, action, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="PDF">PDF Reports</option>
              <option value="Excel">Excel Spreadsheets</option>
              <option value="System">System Actions</option>
            </select>
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User & Identity</th>
                <th className="px-5 py-3">User Category</th>
                <th className="px-5 py-3">Action Tracked</th>
                <th className="px-5 py-3">Format / Resource</th>
                <th className="px-5 py-3 text-right">Online Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading activity tracking logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No activity logs match your current filter query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isPdf = log.format === 'PDF' || log.action.toLowerCase().includes('pdf');
                  const isExcel = log.format === 'Excel' || log.action.toLowerCase().includes('excel');
                  const isAdminUser = log.user_type === 'Admin' || log.user_role.toLowerCase().includes('admin');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div>{formatTimeAgo(log.timestamp)}</div>
                        <div className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* User & Identity */}
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                            isAdminUser ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{log.user_name}</span>
                            <span className="text-[10px] text-slate-500">{log.user_role}</span>
                          </div>
                        </div>
                      </td>

                      {/* User Category */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAdminUser
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isAdminUser ? 'Admin User' : 'Customer User'}
                        </span>
                      </td>

                      {/* Action Tracked */}
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-800 block">{log.action}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{log.details}</span>
                      </td>

                      {/* Format Badge */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {isPdf ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                            <FileText className="w-3 h-3 text-rose-600" /> PDF Document
                          </span>
                        ) : isExcel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Excel Sheet
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px]">
                            <Laptop className="w-3 h-3 text-slate-500" /> System Action
                          </span>
                        )}
                      </td>

                      {/* Online Duration */}
                      <td className="px-5 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{log.duration_mins || 15} mins online</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> activity logs</span>
          <span className="font-mono text-[11px]">Realtime User Tracking Active</span>
        </div>
      </div>
    </div>
  );
}
