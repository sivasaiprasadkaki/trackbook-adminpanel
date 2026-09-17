import React, { useState, useEffect } from 'react';
import { BookOpenText, KeyRound, ShieldAlert, CheckCircle2, RefreshCw, Eye, EyeOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAuthProps {
  onSuccess: (isExplicitLogin?: boolean) => void;
  initialIsInitialized?: boolean | null;
}

export default function AdminAuth({ onSuccess, initialIsInitialized = null }: AdminAuthProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(initialIsInitialized === null);

  // Check initial state
  const checkStatus = async () => {
    try {
      setCheckingSession(true);
      setError('');
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.authenticated) {
          onSuccess();
          return;
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        data = null;
      }

      if (res.ok && data?.success) {
        if (data.token) {
          localStorage.setItem('trackbook_session', data.token);
        }
        onSuccess(true);
      } else {
        // Account does not exist, invalid credentials, or revoked access
        const serverError = data?.error;
        if (serverError) {
          setError(serverError);
        } else {
          setError("You don't have access. Please contact the administrator.");
        }
      }
    } catch (err) {
      console.error('Error during login:', err);
      // Explicitly return friendly access message instead of confusing network error
      setError("You don't have access. Please contact the administrator.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans" id="admin-auth-checking">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Checking system security status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4 sm:p-6 font-sans" id="admin-auth-screen">
      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-900/5 p-8 sm:p-10 relative overflow-hidden" 
        id="admin-auth-card"
      >
        {/* Subtle decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-7" id="brand-header">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-13 h-13 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-3.5 shadow-lg shadow-blue-500/20" 
            id="brand-icon-wrapper"
          >
            <BookOpenText className="w-6 h-6" id="brand-icon" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display" id="brand-title">TrackBook</h1>
          <p className="text-[11px] uppercase font-bold tracking-widest text-slate-400 mt-1" id="brand-subtitle">Admin Panel</p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 flex items-center gap-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-blue-900" id="auth-info-banner">
          <KeyRound className="w-4 h-4 text-blue-600 flex-shrink-0" id="auth-info-icon" />
          <div className="text-xs leading-relaxed font-medium" id="auth-info-text">
            Please log in with your administrator credentials.
          </div>
        </div>

        {/* Animated Error Banner */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 overflow-hidden"
              id="auth-error-wrapper"
            >
              <div className="p-3.5 bg-rose-50 border border-rose-200/80 text-rose-900 rounded-2xl flex items-start gap-2.5 text-xs font-medium" id="auth-error-banner">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" id="auth-error-icon" />
                <div className="leading-relaxed font-semibold" id="auth-error-text">{error}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-4.5" id="login-form">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="login-username">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                id="login-username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                autoFocus
                required
                className="w-full h-11 pl-10 pr-4 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/60 transition-all text-sm text-slate-800 placeholder:text-slate-400 font-sans"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="login-password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full h-11 pl-10 pr-10 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/60 transition-all text-sm text-slate-800 placeholder:text-slate-400 font-sans"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            id="login-submit-button"
            disabled={loading}
            whileHover={!loading ? { scale: 1.01 } : {}}
            whileTap={!loading ? { scale: 0.99 } : {}}
            transition={{ duration: 0.15 }}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Log In to Dashboard</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
