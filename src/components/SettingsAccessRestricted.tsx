import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Clock, CheckCircle2, AlertTriangle, Send, RefreshCw, Lock } from 'lucide-react';

const fetch = (input: RequestInfo | URL, init?: RequestInit) => window.fetch(input, { ...init, credentials: 'include' });

interface SettingsAccessRestrictedProps {
  currentUser?: { username: string; role: string; full_name?: string } | null;
  onAccessGranted?: () => void;
}

export default function SettingsAccessRestricted({ currentUser, onAccessGranted }: SettingsAccessRestrictedProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [requestDetails, setRequestDetails] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const adminName = currentUser?.full_name || currentUser?.username || 'Admin';

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/settings/access-status');
      if (res.ok) {
        const data = await res.json();
        if (data.canAccess) {
          setStatus('approved');
          if (onAccessGranted) onAccessGranted();
          return;
        }
        setStatus(data.status || 'none');
        setRequestDetails(data.request || null);
      }
    } catch (err) {
      console.error('[SETTINGS ACCESS] Failed to check status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll every 8 seconds in case Super Admin approves access while admin is viewing this screen
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAskAccess = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch('/api/settings/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('pending');
        setRequestDetails(data.request);
        setFeedback({
          type: 'success',
          message: 'Access request successfully sent to Super Administrator! You will be granted access once approved.'
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to submit access request. Please try again.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error while submitting access request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Top Warning Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Access Restricted</h3>
              <p className="text-xs text-amber-100 mt-0.5">Administrative Permission Required</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-white/20 text-xs font-bold uppercase tracking-wider">
            Admin Role
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main prompt message as requested */}
          <div className="text-center space-y-3 py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-1 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            {/* Exact requirement heading */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Contact Administrator to Give Access
            </h2>
            
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              You are signed in with the <strong className="text-slate-800 font-semibold">Admin</strong> role. System Settings contain sensitive credentials, database resetting utilities, and encryption keys restricted exclusively to the <strong className="text-slate-800 font-semibold">Super Administrator</strong>.
            </p>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Current Request Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Status</span>
              <div className="flex items-center gap-1.5">
                {status === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 animate-spin" /> Pending Approval
                  </span>
                )}
                {status === 'rejected' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5" /> Request Declined
                  </span>
                )}
                {status === 'none' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                    Not Requested
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/70">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Target Resource:</span>
                <strong className="text-slate-800 font-semibold">System Settings & Infrastructure</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Requesting Admin:</span>
                <span className="text-slate-800 font-semibold">{adminName} ({currentUser?.username || 'admin'})</span>
              </div>
              {requestDetails?.requested_at && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Requested Time:</span>
                  <span className="text-slate-700 font-mono text-[11px]">{formatDate(requestDetails.requested_at)}</span>
                </div>
              )}
            </div>

            {status === 'pending' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Your request has been dispatched to the <strong>Super Administrator</strong> and is visible on their dashboard notification bell. Once approved, this section will automatically unlock.
                </span>
              </div>
            )}
          </div>

          {/* Action Trigger Area */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={checkStatus}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Check Status</span>
            </button>

            {/* Exactly requested "Ask Access" button */}
            <button
              type="button"
              onClick={handleAskAccess}
              disabled={submitting || status === 'pending'}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                status === 'pending'
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white hover:shadow-lg'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : status === 'pending' ? (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Access Requested (Pending Approval)</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Ask Access</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
