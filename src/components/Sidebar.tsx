import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Paperclip,
  Cloud,
  Settings,
  BookOpenText,
  LogOut,
  ShieldCheck,
  User,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: { username: string; role: string; full_name?: string } | null;
}

export default function Sidebar({ currentTab, onTabChange, onLogout, isOpen = false, onClose, currentUser }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'cashbooks', label: 'Cashbooks', icon: BookOpen },
    { id: 'entries', label: 'Entries', icon: ClipboardList },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
  ];

  const handleLinkClick = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    if (onClose) onClose();
  };

  const navContent = (
    <div className="h-full flex flex-col py-6">
      {/* Brand Header */}
      <div className="px-6 pb-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <BookOpenText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sans text-xl font-bold text-slate-900 leading-none tracking-tight">TrackBook</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg md:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <Link
              key={item.id}
              to={`/${item.id}`}
              onClick={() => handleLinkClick(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
              }`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Settings & Logout Links */}
      <div className="px-4 pt-4 border-t border-slate-100 space-y-2">
        {currentUser && (
          <div className="mx-1 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                currentUser.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {currentUser.role === 'super_admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{currentUser.full_name || currentUser.username}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  currentUser.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>
          </div>
        )}

        <Link
          to="/settings"
          onClick={() => handleLinkClick('settings')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out group ${
            currentTab === 'settings'
              ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings className={`w-5 h-5 transition-colors ${
            currentTab === 'settings' ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
          }`} />
          <span>Settings</span>
        </Link>

        <button
          onClick={() => {
            if (onLogout) onLogout();
            if (onClose) onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out text-rose-600 hover:bg-rose-50 hover:text-rose-700 group cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-rose-400 group-hover:text-rose-600 transition-colors" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-[260px] h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-50 flex-col">
        {navContent}
      </nav>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Mobile Drawer Panel */}
      <nav
        className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-slate-200 z-50 md:hidden flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </nav>
    </>
  );
}
