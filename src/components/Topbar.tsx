import { Bell, Calendar, Search, RefreshCw, Menu, BookOpenText } from 'lucide-react';

interface TopbarProps {
  title: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleMobileMenu?: () => void;
}

export default function Topbar({ 
  title, 
  onSearchChange, 
  searchValue = '', 
  onRefresh,
  isRefreshing = false,
  onToggleMobileMenu
}: TopbarProps) {
  return (
    <header className="h-16 fixed top-0 right-0 left-0 md:left-[260px] bg-white border-b border-slate-200 shadow-sm flex justify-between items-center px-4 md:px-6 z-40 transition-all duration-200">
      {/* Left section: Hamburger (Mobile) + Title / Brand */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1 mr-2">
        {/* Mobile Hamburger (3 lines) button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
          title="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Brand indicator */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            <BookOpenText className="w-4 h-4" />
          </div>
        </div>

        <h2 className="font-sans text-sm sm:text-base md:text-lg font-bold text-slate-800 truncate">{title}</h2>
        
        {onSearchChange && (
          <div className="relative hidden sm:block w-48 md:w-72 lg:w-96 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search data..."
              className="w-full h-9 md:h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-150"
            />
          </div>
        )}
      </div>

      {/* Action triggers */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh application data"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden xs:inline sm:inline">Refresh</span>
          </button>
        )}

        <button
          title="Notifications"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors relative"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></span>
        </button>
        
        <button
          title="Calendar Schedule"
          className="w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
}
