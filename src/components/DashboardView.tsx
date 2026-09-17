import { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  FileSpreadsheet,
  IndianRupee,
  TrendingUp,
  Brain,
  Cloud,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Search,
  Database,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  ChevronDown,
  Sparkles,
  FileText,
  Calendar,
  X,
  KeyRound,
  Bell
} from 'lucide-react';
import { Entry, DashboardStats } from '../types';
import { DateRangeFilter, isDateInRange } from '../utils/dateUtils';
import { motion } from 'motion/react';

const fetch = (input: RequestInfo | URL, init?: RequestInit) => window.fetch(input, { ...init, credentials: 'include' });

interface DashboardViewProps {
  entries: Entry[];
  onAddEntryClick: () => void;
  onNavigateToTab: (tab: string) => void;
  dateRange?: DateRangeFilter;
  onResetDateRange?: () => void;
  isSuperAdmin?: boolean;
  currentUser?: any;
}

export default function DashboardView({ 
  entries, 
  onAddEntryClick, 
  onNavigateToTab, 
  dateRange, 
  onResetDateRange,
  isSuperAdmin = false,
  currentUser
}: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalEntries: 0,
    totalRevenue: 0,
    accuracy: 0,
    storageUsed: 0,
    storageLimit: 100,
    aiProcessed: 0,
    manualProcessed: 0
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachmentDropdownOpen, setAttachmentDropdownOpen] = useState(false);
  const [attachmentCardType, setAttachmentCardType] = useState<'all' | 'attachments' | 'ai-attachments'>('all');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);

  // Fetch pending access requests for Super Admin
  const fetchPendingRequests = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const pending = (data.notifications || []).filter((n: any) => n.type === 'access_request' && n.status === 'pending');
        setPendingRequests(pending);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests in dashboard:', err);
    }
  };

  const handleRespondRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setIsProcessingRequest(requestId + action);
      const res = await fetch(`/api/settings/access-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchPendingRequests();
      }
    } catch (err) {
      console.error('Failed to respond to request:', err);
    } finally {
      setIsProcessingRequest(null);
    }
  };

  // Fetch server stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      let url = '/api/stats';
      if (dateRange && dateRange.preset !== 'all' && dateRange.startDate && dateRange.endDate) {
        url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }
      const res = await fetch(url);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchStats();
    if (isSuperAdmin) {
      fetchPendingRequests();
    }
    // Real-time stats auto-refresh
    const interval = setInterval(() => {
      fetchStats();
      if (isSuperAdmin) fetchPendingRequests();
    }, 10000);
    const handleGlobalRefresh = () => {
      fetchStats();
      if (isSuperAdmin) fetchPendingRequests();
    };
    window.addEventListener('app-global-refresh', handleGlobalRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app-global-refresh', handleGlobalRefresh);
    };
  }, [entries, dateRange, isSuperAdmin]);

  // Format currency in Indian Rupees format (Lakhs/Crores)
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format storage size based on user preference (e.g., 0.800 GB for <1GB, and 1.2, 1.02, 1.67 for >=1GB)
  const formatStorage = (gbValue: number) => {
    if (gbValue < 1) {
      return gbValue.toFixed(3);
    } else {
      const formatted = gbValue.toFixed(2);
      if (formatted.endsWith('0') && !formatted.endsWith('.00')) {
        return gbValue.toFixed(1);
      }
      return formatted;
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when search query changes or date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateRange]);

  const filteredEntries = entries.filter(e => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      e.userName.toLowerCase().includes(query) ||
      e.action.toLowerCase().includes(query) ||
      e.cashbookName.toLowerCase().includes(query)
    );
    const matchesDate = isDateInRange(e.timestamp || e.date, dateRange);
    return matchesSearch && matchesDate;
  });

  // Sort entries by date/timestamp descending so newer entries appear at the very top
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (timeA && timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });

  const totalItems = sortedEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header and Last Updated */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-500 text-sm mt-1">High-level metrics and recent platform activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-slate-500 font-mono text-xs">
            Last updated: Just now
          </div>
        </div>
      </div>

      {/* Dynamic Supabase Connectivity Banner */}
      {stats.supabaseConfigured === false ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Sandbox Simulator Mode Active</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Mock Local Data</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                The application is currently running with standard pre-seeded mock records. To query and update your real production backend, add your credentials in the <span className="font-semibold text-slate-900">Secrets panel</span> (as <code className="font-mono bg-amber-100/50 px-1 py-0.5 rounded text-amber-900 font-bold">SUPABASE_URL</code> and <code className="font-mono bg-amber-100/50 px-1 py-0.5 rounded text-amber-900 font-bold">SUPABASE_ANON_KEY</code>) or configure them in your environment settings.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button 
                  onClick={() => onNavigateToTab('settings')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to System Connection Guide</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : stats.schemaMissing === true ? (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Supabase Connected, But Tables Missing!</span>
                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Schema Missing</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                The database credentials are authenticated, but the matching tables (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">users</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">cashbooks</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">entries</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">attachments</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">receipts</code>) were not found in this Supabase project. To initialize them automatically:
              </p>
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                <span className="text-slate-500">1. Run the SQL from <code className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">supabase-schema.sql</code> in your Supabase Editor</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <button 
                  onClick={() => onNavigateToTab('settings')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Settings to Seed Tables</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/20 border border-emerald-100 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">Live Supabase Database Connected</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Reading and auditing records directly from your active Supabase database.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>SSL SECURE</span>
            <span className="text-slate-300">•</span>
            <span>PRODUCTION STATE</span>
          </div>
        </div>
      )}

      {/* Date Filter Active Notification Banner */}
      {dateRange && dateRange.preset !== 'all' && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3 text-xs text-blue-900 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Active Date Filter:</span>{' '}
              <span className="bg-white border border-blue-300 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                {dateRange.label}
              </span>{' '}
              {dateRange.startDate && dateRange.endDate && (
                <span className="text-blue-600 hidden sm:inline ml-1 font-mono text-[11px]">
                  ({dateRange.startDate} to {dateRange.endDate})
                </span>
              )}
            </div>
          </div>
          {onResetDateRange && (
            <button
              onClick={onResetDateRange}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      )}

      {/* Super Admin: Pending Settings Access Request Alert Banner */}
      {isSuperAdmin && pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                    Access Authorization Request
                  </span>
                  <span className="text-xs text-amber-700 font-semibold">
                    {pendingRequests.length} pending
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  Admin {pendingRequests[0].admin_name} ({pendingRequests[0].admin_username}) is requesting access to System Settings
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  An administrator is requesting authorization to view and configure platform system settings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleRespondRequest(pendingRequests[0].id, 'reject')}
                disabled={!!isProcessingRequest}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={() => handleRespondRequest(pendingRequests[0].id, 'approve')}
                disabled={!!isProcessingRequest}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessingRequest === pendingRequests[0].id + 'approve' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Grant Access</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Grid with Smooth Staggered Motion */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 items-stretch"
      >
        {/* Total Users */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-blue-400/80 transition-all duration-200 shadow-xs hover:shadow-md group cursor-pointer flex flex-col justify-between min-h-[148px]" 
          onClick={() => onNavigateToTab('users')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 text-xs font-normal uppercase tracking-wider">Total Users</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-display">
              {stats.totalUsers.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs min-w-0">
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-normal text-[11px] flex items-center gap-0.5 whitespace-nowrap shrink-0">
              <TrendingUp className="w-3.5 h-3.5" /> +12%
            </span>
            <span className="text-slate-500 font-sans truncate text-[11px]">vs last month</span>
          </div>
        </motion.div>

        {/* Live Users */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-emerald-400/80 transition-all duration-200 shadow-xs hover:shadow-md group cursor-pointer flex flex-col justify-between min-h-[148px]" 
          onClick={() => onNavigateToTab('users')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-xs font-normal uppercase tracking-wider">Live Users</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-display">
              {(stats.liveUsers ?? 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs min-w-0">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 font-normal text-[11px] whitespace-nowrap shrink-0">
              Real-time
            </span>
            <span className="text-slate-500 font-sans truncate text-[11px] whitespace-nowrap">presence active</span>
          </div>
        </motion.div>

        {/* Total Entries */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-indigo-400/80 transition-all duration-200 shadow-xs hover:shadow-md group cursor-pointer flex flex-col justify-between min-h-[148px]" 
          onClick={() => onNavigateToTab('entries')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 text-xs font-normal uppercase tracking-wider">Total Entries</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-display">
              {stats.totalEntries.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs min-w-0">
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-normal text-[11px] flex items-center gap-0.5 whitespace-nowrap shrink-0">
              <TrendingUp className="w-3.5 h-3.5" /> +18%
            </span>
            <span className="text-slate-500 font-sans truncate text-[11px]">vs last month</span>
          </div>
        </motion.div>

        {/* Total Revenue */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-blue-400/80 transition-all duration-200 shadow-xs hover:shadow-md group cursor-pointer flex flex-col justify-between min-h-[148px]" 
          onClick={() => onNavigateToTab('entries')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 text-xs font-normal uppercase tracking-wider">Total Revenue</span>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${stats.totalRevenue < 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-normal font-display tracking-tight ${stats.totalRevenue < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatINR(stats.totalRevenue)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs min-w-0">
            <span className={`px-1.5 py-0.5 rounded-md font-normal text-[11px] flex items-center gap-0.5 border whitespace-nowrap shrink-0 ${stats.totalRevenue < 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${stats.totalRevenue < 0 ? 'rotate-180 text-rose-600' : 'text-emerald-600'}`} /> {stats.totalRevenue < 0 ? '-14.2%' : '+8.4%'}
            </span>
            <span className="text-slate-500 font-sans truncate text-[11px]">vs last month</span>
          </div>
        </motion.div>

        {/* Attachments Card */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-teal-400/80 transition-all duration-200 shadow-xs hover:shadow-md group cursor-pointer relative flex flex-col justify-between min-h-[148px]"
          onClick={() => {
            if (attachmentCardType === 'ai-attachments') {
              onNavigateToTab('ai-attachments');
            } else {
              onNavigateToTab('attachments');
            }
          }}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-slate-500 text-xs font-normal uppercase tracking-wider truncate max-w-[100px]" title="Attachments">
                {attachmentCardType === 'all' && 'Attachments'}
                {attachmentCardType === 'attachments' && 'Std Files'}
                {attachmentCardType === 'ai-attachments' && 'AI Files'}
              </span>

              {/* Icon and Dropdown Arrow */}
              <div className="flex items-center gap-1 relative shrink-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
                  <Paperclip className="w-4 h-4" />
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachmentDropdownOpen(!attachmentDropdownOpen);
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Select Attachments View"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${attachmentDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {attachmentDropdownOpen && (
                  <div 
                    className="absolute right-0 top-10 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-normal uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Navigate & View
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentCardType('all');
                        setAttachmentDropdownOpen(false);
                        onNavigateToTab('attachments');
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${attachmentCardType === 'all' ? 'font-medium text-teal-700 bg-teal-50/60' : 'text-slate-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                        <span>All Attachments</span>
                      </span>
                      <span className="font-mono text-slate-500 font-normal">
                        {(stats.totalAttachments ?? ((stats.attachmentsCount ?? 0) + (stats.aiAttachmentsCount ?? 0))).toLocaleString('en-IN')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentCardType('attachments');
                        setAttachmentDropdownOpen(false);
                        onNavigateToTab('attachments');
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${attachmentCardType === 'attachments' ? 'font-medium text-blue-700 bg-blue-50/60' : 'text-slate-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Attachments</span>
                      </span>
                      <span className="font-mono text-slate-500 font-normal">
                        {(stats.attachmentsCount ?? 0).toLocaleString('en-IN')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentCardType('ai-attachments');
                        setAttachmentDropdownOpen(false);
                        onNavigateToTab('ai-attachments');
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${attachmentCardType === 'ai-attachments' ? 'font-medium text-purple-700 bg-purple-50/60' : 'text-slate-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>AI Attachments</span>
                      </span>
                      <span className="font-mono text-slate-500 font-normal">
                        {(stats.aiAttachmentsCount ?? 0).toLocaleString('en-IN')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-display">
              {attachmentCardType === 'all' && (stats.totalAttachments ?? ((stats.attachmentsCount ?? 0) + (stats.aiAttachmentsCount ?? 0))).toLocaleString('en-IN')}
              {attachmentCardType === 'attachments' && (stats.attachmentsCount ?? 0).toLocaleString('en-IN')}
              {attachmentCardType === 'ai-attachments' && (stats.aiAttachmentsCount ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs min-w-0">
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
              Std: <span className="text-slate-700 font-normal">{(stats.attachmentsCount ?? 0)}</span>
            </span>
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
              AI: <span className="text-slate-700 font-normal">{(stats.aiAttachmentsCount ?? 0)}</span>
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Grid: Left Column (Table) & Right Column (Widgets) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Activity Table (8 Cols on wide screens) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="xl:col-span-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col overflow-hidden"
        >
          <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div>
              <h3 className="font-sans text-base font-bold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time recording of ledger updates.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8 pl-8 pr-3 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                onClick={() => onNavigateToTab('entries')}
                className="text-blue-600 text-xs font-semibold hover:text-blue-700 hover:underline flex items-center gap-0.5 shrink-0 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
            {paginatedEntries.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No matching activity found.</p>
            ) : (
              paginatedEntries.map((entry) => {
                const initials = entry.userName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div key={entry.id} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <span className="font-bold text-slate-900 text-xs truncate">{entry.userName}</span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                        entry.status === 'Success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.status === 'Processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {entry.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 font-medium truncate">{entry.cashbookName}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {entry.amount !== null ? `₹ ${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 text-right">
                      {entry.date} • {entry.time}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3.5 px-5 text-left w-[26%]">User</th>
                  <th className="py-3.5 px-5 text-left w-[20%]">Cashbook</th>
                  <th className="py-3.5 px-5 text-right w-[18%]">Amount</th>
                  <th className="py-3.5 px-5 text-left w-[24%]">Date & Time</th>
                  <th className="py-3.5 px-5 text-center w-[12%]">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 text-slate-700">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                      No matching activity found.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry) => {
                    // Extract initials
                    const initials = entry.userName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    // Avatar color backgrounds
                    let avatarBg = 'bg-slate-100 text-slate-600';
                    if (initials === 'AJ') avatarBg = 'bg-blue-50 text-blue-700';
                    if (initials === 'SR') avatarBg = 'bg-purple-50 text-purple-700';
                    if (initials === 'VK') avatarBg = 'bg-indigo-50 text-indigo-700';
                    if (initials === 'PS') avatarBg = 'bg-rose-50 text-rose-700';

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors duration-150 h-[54px] group">
                        {/* User */}
                        <td className="py-2.5 px-5 font-medium text-slate-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                              {initials}
                            </div>
                            <span className="truncate max-w-[150px]">{entry.userName}</span>
                          </div>
                        </td>

                        {/* Cashbook */}
                        <td className="py-2.5 px-5 text-slate-500 truncate max-w-[130px]">
                          {entry.cashbookName}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-5 text-right font-mono font-medium whitespace-nowrap">
                          {entry.amount !== null ? (
                            <span className={entry.status === 'Warning' ? 'text-red-600' : 'text-slate-900'}>
                              ₹ {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="py-2.5 px-5 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {entry.timestamp ? (
                            <>
                              <span className="text-slate-600">
                                {new Date(entry.timestamp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-slate-300 mx-1.5">•</span>
                              <span>
                                {new Date(entry.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-600">{entry.date}</span>
                              <span className="text-slate-300 mx-1.5">•</span>
                              <span>{entry.time}</span>
                            </>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-5 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            entry.status === 'Success'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : entry.status === 'Processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl mt-auto">
              <span className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(endIndex, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalItems}</span> entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border border-slate-200 bg-white transition-all duration-150 ${
                    currentPage === 1
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer shadow-xs active:scale-95'
                  }`}
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 min-w-[50px] text-center font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border border-slate-200 bg-white transition-all duration-150 ${
                    currentPage === totalPages
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer shadow-xs active:scale-95'
                  }`}
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Column: Widgets (4 Cols on wide screens) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* AI Processing Stats Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col"
          >
            <h3 className="font-sans text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Brain className="w-4.5 h-4.5 text-blue-600" />
              <span>AI Processing Stats</span>
            </h3>

            {/* Simulated Donut Chart using clean responsive SVG with animated fill */}
            <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#F1F5F9"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Accuracy segment representing dynamic accuracy */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#0066ff"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - (stats.accuracy || 98) / 100) }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Label */}
              <div className="absolute text-center">
                <span className="block font-sans text-2xl font-bold text-slate-900">{stats.accuracy}%</span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Accuracy</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span>Auto-Categorized</span>
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {(stats.aiProcessed ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0"></span>
                  <span>Manual Review</span>
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {(stats.manualProcessed ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Storage Used Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs"
          >
            <h3 className="font-sans text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Cloud className="w-4.5 h-4.5 text-blue-600" />
              <span>Storage Used</span>
            </h3>

            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{formatStorage(stats.storageUsed)} GB</span>
                <span className="text-slate-500 text-xs font-mono">/ {stats.storageLimit} GB</span>
              </div>
              
              {/* Custom styled animated progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.storageUsed / stats.storageLimit) * 100)}%` }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Primary storage allocated for original receipt scans, audit PDF attachments, and monthly exported financial statements.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
