import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import UsersView from './components/UsersView';
import CashbooksView from './components/CashbooksView';
import EntriesView from './components/EntriesView';
import AttachmentsView from './components/AttachmentsView';
import AIAttachmentsView from './components/AIAttachmentsView';
import SettingsView from './components/SettingsView';
import AdminAuth from './components/AdminAuth';
import SplashScreen from './components/SplashScreen';
import { Entry } from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; full_name?: string; role: string } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    return sessionStorage.getItem('loginSuccessSplash') === 'true';
  });

  // Check initial authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[DEBUG] App: Checking authentication session status...');
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          console.log(`[DEBUG] App SESSION: authenticated=${data.authenticated}, is_initialized=${data.is_initialized}`);
          setIsInitialized(data.is_initialized);
          setIsAuthenticated(data.authenticated);
          if (data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        } else {
          console.error('[DEBUG] App: Session endpoint returned error status:', res.status);
          setIsAuthenticated(false);
          setIsInitialized(true); // default fallback to prevent setup screens on fetch error
        }
      } catch (err) {
        console.error('[DEBUG] App: Error checking auth session:', err);
        setIsAuthenticated(false);
        setIsInitialized(true); // default fallback
      }
    };
    checkAuth();
  }, [location.pathname]);

  // Resolve currentTab from pathname (e.g. "/users" -> "users", "/" or "/dashboard" -> "dashboard")
  const getTabFromPath = (path: string) => {
    const cleanPath = path.replace(/^\//, '');
    if (cleanPath === '' || cleanPath === 'dashboard') return 'dashboard';
    return cleanPath;
  };

  const currentTab = getTabFromPath(location.pathname);

  // Validate and redirect routes to /dashboard if necessary
  useEffect(() => {
    if (isAuthenticated === false) {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }
    const validTabs = ['dashboard', 'users', 'cashbooks', 'entries', 'attachments', 'cloud', 'settings'];
    const tab = location.pathname.replace(/^\//, '');
    if (location.pathname === '/' || location.pathname === '' || location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    } else if (!validTabs.includes(tab)) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate, isAuthenticated]);

  // Dynamic Browser Title Updater
  useEffect(() => {
    const titleMap: Record<string, string> = {
      'dashboard': 'TrackBook Admin Panel | Dashboard',
      'users': 'TrackBook Admin Panel | Users',
      'cashbooks': 'TrackBook Admin Panel | Cashbooks',
      'entries': 'TrackBook Admin Panel | Entries',
      'attachments': 'TrackBook Admin Panel | Attachments',
      'cloud': 'TrackBook Admin Panel | Cloud',
      'settings': 'TrackBook Admin Panel | Settings',
    };
    document.title = titleMap[currentTab] || 'TrackBook Admin Panel';
  }, [currentTab]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Clear search on tab changes (detected via route change)
  useEffect(() => {
    setSearchValue('');
  }, [location.pathname]);

  // Track User Activity Roaming & Duration across sections
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const startTime = Date.now();
    const tabName = currentTab.charAt(0).toUpperCase() + currentTab.slice(1);
    const userName = currentUser.full_name || currentUser.username || 'User';
    const isUserAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin' || (currentUser.role || '').toLowerCase().includes('admin');
    const userRole = isUserAdmin ? (currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin') : (currentUser.role || 'User');
    const userType: 'Admin' | 'Customer' = isUserAdmin ? 'Admin' : 'Customer';

    // Log section entry
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: userName,
        user_role: userRole,
        user_type: userType,
        action: `Navigated to ${tabName} Section`,
        details: `Active roaming & inspecting ${tabName} panel`,
        format: 'System',
        duration_mins: 1
      })
    }).catch(() => {});

    // Log roaming duration when leaving the section or unmounting
    return () => {
      const minutesSpent = Math.max(1, Math.round((Date.now() - startTime) / 60000));
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          user_role: userRole,
          user_type: userType,
          action: `Roamed in ${tabName} Section`,
          details: `Spent ${minutesSpent} minute(s) active in ${tabName} section`,
          format: 'System',
          duration_mins: minutesSpent
        })
      }).catch(() => {});
    };
  }, [currentTab, isAuthenticated, currentUser]);

  // Presence heartbeat for real-time live user detection
  useEffect(() => {
    if (!isAuthenticated) return;
    const sendHeartbeat = () => {
      fetch('/api/auth/heartbeat', { credentials: 'include' }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch entries ledger
  const fetchEntries = async () => {
    if (isAuthenticated === false) return;
    try {
      setLoading(true);
      const res = await fetch('/api/entries', { credentials: 'include' });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await fetchEntries();
    // Dispatch custom refresh event for active tab listeners
    window.dispatchEvent(new CustomEvent('app-global-refresh'));
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    if (isAuthenticated === true) {
      fetchEntries();
    }
  }, [isAuthenticated]);

  // Setup real-time presence ping loop
  useEffect(() => {
    if (isAuthenticated !== true) return;
    const updatePresence = async () => {
      try {
        const res = await fetch('/api/users/presence', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'triptraccker@gmail.com' })
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error updating user presence:', err);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Update periodically every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        localStorage.removeItem('trackbook_session');
        setIsAuthenticated(false);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Map tabs to active labels
  const tabTitles: Record<string, string> = {
    'dashboard': 'Dashboard Overview',
    'users': 'Users Directory',
    'cashbooks': 'Cashbook Accounts',
    'entries': 'Ledger Records',
    'attachments': 'Audit Attachments',
    'cloud': 'Cloud Storage Manager',
    'settings': 'System Settings'
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Render the appropriate panel view
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            entries={entries}
            onAddEntryClick={() => navigate('/entries')}
            onNavigateToTab={(tab) => navigate('/' + tab)}
          />
        );
      case 'users':
        return <UsersView onRefreshStats={fetchEntries} isSuperAdmin={isSuperAdmin} />;
      case 'cashbooks':
        return <CashbooksView onAddCashbook={fetchEntries} isSuperAdmin={isSuperAdmin} />;
      case 'entries':
        return (
          <EntriesView
            entries={entries}
            onEntryLogged={fetchEntries}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case 'attachments':
        return <AttachmentsView isSuperAdmin={isSuperAdmin} />;
      case 'cloud':
        return <AIAttachmentsView onProcessSuccess={fetchEntries} isSuperAdmin={isSuperAdmin} />;
      case 'settings':
        return <SettingsView onResetDatabase={fetchEntries} isSuperAdmin={isSuperAdmin} />;
      default:
        return (
          <DashboardView
            entries={entries}
            onAddEntryClick={() => navigate('/entries')}
            onNavigateToTab={(tab) => navigate('/' + tab)}
          />
        );
    }
  };

  // If loading authentication state, show minimal beautiful loading splash
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Checking system authorization status...</p>
        </div>
      </div>
    );
  }

  // If splash flag is set, show the beautiful post-login splash screen
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => {
          sessionStorage.removeItem('loginSuccessSplash');
          setShowSplash(false);
          navigate('/dashboard', { replace: true });
        }}
      />
    );
  }

  // If unauthenticated, display the TrackBook custom verification / setup screen
  if (isAuthenticated === false) {
    return (
      <AdminAuth
        onSuccess={(isExplicitLogin) => {
          if (isExplicitLogin) {
            sessionStorage.setItem('loginSuccessSplash', 'true');
            setShowSplash(true);
          }
          setIsInitialized(true);
          setIsAuthenticated(true);
        }}
        initialIsInitialized={isInitialized}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800 animate-fade-in">
      {/* Sidebar - fixed left panel on desktop, slide drawer on mobile */}
      <Sidebar
        currentTab={currentTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onTabChange={(tab) => {
          navigate('/' + tab);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {/* Main Content Stage */}
      <div className="flex-1 pl-0 md:pl-[260px] min-h-screen flex flex-col transition-all duration-200 w-full overflow-x-hidden">
        
        {/* Topbar Header */}
        <Topbar
          title={tabTitles[currentTab] || 'TrackBook'}
          searchValue={searchValue}
          onSearchChange={
            currentTab === 'dashboard' || currentTab === 'entries' || currentTab === 'users' || currentTab === 'cashbooks'
              ? setSearchValue
              : undefined
          }
          onRefresh={handleGlobalRefresh}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Dynamic Panel view container */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 pt-20 md:pt-24 bg-slate-50 overflow-y-auto max-w-[1400px] w-full mx-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
