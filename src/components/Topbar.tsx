import React, { useState, useRef, useEffect } from 'react';
import { Bell, Calendar, Search, RefreshCw, Menu, BookOpenText, X, Check, Clock, ChevronDown, Filter } from 'lucide-react';
import { DateRangeFilter, getPresetDateRange, formatDateToInput } from '../utils/dateUtils';

interface TopbarProps {
  title: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleMobileMenu?: () => void;
  dateRange?: DateRangeFilter;
  onDateRangeChange?: (newRange: DateRangeFilter) => void;
}

export default function Topbar({ 
  title, 
  onSearchChange, 
  searchValue = '', 
  onRefresh,
  isRefreshing = false,
  onToggleMobileMenu,
  dateRange,
  onDateRangeChange
}: TopbarProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const todayStr = formatDateToInput(new Date());
  const [customStart, setCustomStart] = useState(dateRange?.startDate || todayStr);
  const [customEnd, setCustomEnd] = useState(dateRange?.endDate || todayStr);

  // Sync custom start/end when dateRange changes externally
  useEffect(() => {
    if (dateRange?.startDate) setCustomStart(dateRange.startDate);
    if (dateRange?.endDate) setCustomEnd(dateRange.endDate);
  }, [dateRange]);

  // Close calendar popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  const activePreset = dateRange?.preset || 'all';

  const handleSelectPreset = (preset: DateRangeFilter['preset']) => {
    if (onDateRangeChange) {
      const range = getPresetDateRange(preset);
      onDateRangeChange(range);
    }
    setIsCalendarOpen(false);
  };

  const handleApplyCustom = () => {
    if (onDateRangeChange && customStart && customEnd) {
      const range = getPresetDateRange('custom', customStart, customEnd);
      onDateRangeChange(range);
    }
    setIsCalendarOpen(false);
  };

  const handleResetFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDateRangeChange) {
      onDateRangeChange(getPresetDateRange('all'));
    }
  };

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
        
        {/* Calendar Date Filter Button with Popover */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setIsCalendarOpen(prev => !prev)}
            title="Filter data by Date Range"
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border ${
              activePreset !== 'all'
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm ring-2 ring-blue-100 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs'
            }`}
          >
            <Calendar className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activePreset !== 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden xs:inline truncate max-w-[140px] sm:max-w-[180px]">
              {dateRange?.label || 'Calendar'}
            </span>
            {activePreset !== 'all' ? (
              <span
                onClick={handleResetFilter}
                className="p-0.5 rounded-full hover:bg-blue-200 text-blue-700 transition-colors ml-1 cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Calendar Popover Dropdown */}
          {isCalendarOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-slate-800">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Date Filter</h4>
                    <p className="text-[11px] text-slate-500">Filter Dashboard, Users & Cashbooks</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets Grid */}
              <div className="space-y-1 mb-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Quick Ranges</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleSelectPreset('today')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left ${
                      activePreset === 'today'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚡ Today</span>
                    {activePreset === 'today' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => handleSelectPreset('yesterday')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left ${
                      activePreset === 'yesterday'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📆 Yesterday</span>
                    {activePreset === 'yesterday' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => handleSelectPreset('week')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left font-semibold ${
                      activePreset === 'week'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50/70 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                    }`}
                  >
                    <span>🗓️ Last 7 Days (1 Wk)</span>
                    {activePreset === 'week' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => handleSelectPreset('month')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left ${
                      activePreset === 'month'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>🗓️ Last 30 Days</span>
                    {activePreset === 'month' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => handleSelectPreset('this_month')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left ${
                      activePreset === 'this_month'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📅 This Month</span>
                    {activePreset === 'this_month' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => handleSelectPreset('last_month')}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left ${
                      activePreset === 'last_month'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📅 Last Month</span>
                    {activePreset === 'last_month' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>

              {/* Custom Date Inputs */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Custom Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">From Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">To Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyCustom}
                  className="w-full mt-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Apply Custom Range
                </button>
              </div>

              {/* Reset to All Time */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  {activePreset !== 'all' ? `Active: ${dateRange?.label}` : 'Showing all historic records'}
                </span>
                <button
                  onClick={() => handleSelectPreset('all')}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] underline cursor-pointer"
                >
                  Reset (All Time)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

