import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  Key,
  Share2,
  Copy,
  MessageSquare,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';

const fetch = (input: RequestInfo | URL, init?: RequestInit) => window.fetch(input, { ...init, credentials: 'include' });

interface UsersViewProps {
  onRefreshStats?: () => void;
  isSuperAdmin?: boolean;
}

export default function UsersView({ onRefreshStats, isSuperAdmin = true }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'today'>('all');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'User' as 'Admin' | 'Manager' | 'User',
    email: '',
    phone: '',
    status: 'Active' as 'Active' | 'Pending' | 'Inactive'
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Super Admin Role Assignment Modal States
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignFullName, setAssignFullName] = useState<string>('');
  const [assignUsername, setAssignUsername] = useState<string>('');
  const [assignPassword, setAssignPassword] = useState<string>('');
  const [assignRole, setAssignRole] = useState<'admin' | 'super_admin'>('admin');
  const [assignPhone, setAssignPhone] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
    fullName: string;
    role: string;
    phone: string;
  } | null>(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Trip@${rand}!`;
  };

  const generateUsernameFromName = (name: string) => {
    if (!name) return 'admin_' + Math.floor(100 + Math.random() * 900);
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${clean.slice(0, 10)}_admin`;
  };

  const openAssignRoleModal = (userToAssign?: User) => {
    setAssignError(null);
    setCreatedCredentials(null);
    setShowPassword(false);

    if (userToAssign) {
      setSelectedUserId(userToAssign.id);
      setAssignFullName(userToAssign.name);
      setAssignPhone(userToAssign.phone || '');
      setAssignUsername(generateUsernameFromName(userToAssign.name));
    } else {
      setSelectedUserId('');
      setAssignFullName('');
      setAssignPhone('');
      setAssignUsername('');
    }
    setAssignPassword(generateRandomPassword());
    setAssignRole('admin');
    setIsRoleModalOpen(true);
  };

  const handleSelectMemberForRole = (userId: string) => {
    setSelectedUserId(userId);
    const u = users.find(x => x.id === userId);
    if (u) {
      setAssignFullName(u.name);
      setAssignPhone(u.phone || '');
      setAssignUsername(generateUsernameFromName(u.name));
    }
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (!assignUsername.trim()) {
      setAssignError('Username is required.');
      return;
    }
    if (!assignPassword.trim() || assignPassword.length < 6) {
      setAssignError('Password must be at least 6 characters.');
      return;
    }
    if (!assignFullName.trim()) {
      setAssignError('Full name is required.');
      return;
    }

    setAssignLoading(true);
    try {
      const res = await fetch('/api/admin/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId || undefined,
          username: assignUsername.trim(),
          password: assignPassword.trim(),
          full_name: assignFullName.trim(),
          role: assignRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign role.');
      }

      setCreatedCredentials({
        username: assignUsername.trim(),
        password: assignPassword.trim(),
        fullName: assignFullName.trim(),
        role: assignRole,
        phone: assignPhone.trim()
      });

      triggerNotification(`Role '${assignRole === 'super_admin' ? 'Super Admin' : 'Admin'}' assigned to ${assignFullName}!`);
      fetchUsers();
    } catch (err: any) {
      setAssignError(err.message || 'An error occurred.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!createdCredentials) return;
    const roleTitle = createdCredentials.role === 'super_admin' ? 'Super Admin' : 'Admin';
    const msg = `Hello *${createdCredentials.fullName}*,\n\nYou have been granted *${roleTitle}* access in *TripTraccker Admin Portal*.\n\n🔑 *Login Credentials:*\n• *Username:* \`${createdCredentials.username}\`\n• *Password:* \`${createdCredentials.password}\`\n• *Role:* ${roleTitle}\n\n🌐 *Portal URL:*\n${window.location.origin}\n\nPlease login with these credentials.`;

    const cleanPhone = createdCredentials.phone ? createdCredentials.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone && cleanPhone.length >= 8
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const roleTitle = createdCredentials.role === 'super_admin' ? 'Super Admin' : 'Admin';
    const text = `TripTraccker Credentials:\nName: ${createdCredentials.fullName}\nRole: ${roleTitle}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    triggerNotification('Credentials copied to clipboard!');
  };

  // Helper: check if user joined today
  const isJoinedToday = (joinedDateStr?: string) => {
    if (!joinedDateStr) return false;
    try {
      const date = new Date(joinedDateStr);
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (e) {
      return false;
    }
  };

  // Helper: format last seen timestamp
  const formatLastSeen = (lastSeenStr?: string) => {
    if (!lastSeenStr) return 'Never';
    try {
      const date = new Date(lastSeenStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) {
        const hrs = Math.floor(diffMins / 60);
        return `${hrs}h ago`;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Never';
    }
  };

  // Fetch users from server
  const fetchUsers = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
    // Real-time auto-refresh interval for user status
    const interval = setInterval(() => fetchUsers(false), 10000);
    const handleGlobalRefresh = () => fetchUsers(true);
    window.addEventListener('app-global-refresh', handleGlobalRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app-global-refresh', handleGlobalRefresh);
    };
  }, []);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    try {
      const url = isEditMode && selectedUser ? `/api/users/${selectedUser.id}` : '/api/users';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        triggerNotification(isEditMode ? 'User profile updated successfully!' : 'New user registered successfully!');
        setIsModalOpen(false);
        setFormData({ name: '', role: 'User', email: '', phone: '', status: 'Active' });
        setSelectedUser(null);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  // Delete User
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerNotification('User deleted from registry.');
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setFormData({
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone || '',
      status: user.status
    });
    setIsModalOpen(true);
  };

  // Export CSV
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,Role,Email,Phone,Status,JoinedDate"].join(",") + "\n"
      + users.map(u => `"${u.name}","${u.role}","${u.email}","${u.phone || ''}","${u.status}","${u.joinedDate}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TrackBook_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification('Users registry exported to CSV format.');
  };

  // Filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery));
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

    let matchesTab = true;
    if (activeTab === 'live') {
      matchesTab = !!user.isOnline;
    } else if (activeTab === 'today') {
      matchesTab = isJoinedToday(user.joinedDate);
    }

    return matchesSearch && matchesRole && matchesStatus && matchesTab;
  });

  // Dynamic calculations for real stats
  const totalUsersCount = users.length;
  const liveUsersCount = users.filter(u => u.isOnline).length;
  const newUsersTodayCount = users.filter(u => isJoinedToday(u.joinedDate)).length;

  return (
    <div className="space-y-6">
      {/* Top Notification banner */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex items-center gap-3 transition-all duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">Users Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage platform users, view their activity, and update roles.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => openAssignRoleModal()}
              className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>Give Admin Role</span>
            </button>
          )}
          <button
            onClick={handleExport}
            className="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setIsEditMode(false);
              setFormData({ name: '', role: 'User', email: '', phone: '', status: 'Active' });
              setIsModalOpen(true);
            }}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUsersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-xs text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Direct Sync
            </span>
            <span>with Supabase Auth</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Live Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <span>{liveUsersCount}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-xs text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              Online State
            </span>
            <span>last seen &lt; 2m ago</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">New Users Today</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{newUsersTodayCount}</h3>
            </div>
            <div className="w-10 h-10 rounded bg-rose-50 flex items-center justify-center text-rose-600">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-xs text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              Real-time
            </span>
            <span>registered today</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 cursor-pointer ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Users ({totalUsersCount})
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'live'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            Live Users ({liveUsersCount})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 cursor-pointer ${
              activeTab === 'today'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            New Users Today ({newUsersTodayCount})
          </button>
        </div>

        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter role */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Filter status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
          {loading ? (
            <p className="text-center py-8 text-slate-400 text-xs">Loading users registry...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">No registry matches found.</p>
          ) : (
            filteredUsers.map((user) => {
              const initials = user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-400 transition-all flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <img alt={user.name} src={user.avatarUrl} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{user.name}</h4>
                        <p className="text-xs text-blue-600 font-medium">{user.role}</p>
                      </div>
                    </div>

                    {user.isOnline ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Offline
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 truncate ml-2">{user.email}</span>
                    </p>
                    {user.phone && (
                      <p className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="font-mono text-slate-800">{user.phone}</span>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-slate-400">Last Seen:</span>
                      <span className="font-mono text-slate-700">{formatLastSeen(user.lastSeen)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Signup Date:</span>
                      <span>{user.joinedDate}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    {isSuperAdmin && (
                      <button
                        onClick={() => openAssignRoleModal(user)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Give Role</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(user)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Contact Details</th>
                <th className="px-6 py-3">Online Status</th>
                <th className="px-6 py-3">Last Seen</th>
                <th className="px-6 py-3">Signup Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Loading users registry...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No registry matches found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const initials = user.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors h-[56px] group">
                      {/* Name & Role */}
                      <td className="px-6 py-2">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <img alt={user.name} src={user.avatarUrl} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{user.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact details */}
                      <td className="px-6 py-2">
                        <div className="text-slate-900">{user.email}</div>
                        <div className="font-mono text-xs text-slate-400 mt-0.5">{user.phone || 'N/A'}</div>
                      </td>

                      {/* Online Status */}
                      <td className="px-6 py-2">
                        {user.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-fade-in">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Last Seen */}
                      <td className="px-6 py-2 font-mono text-xs text-slate-600">
                        {formatLastSeen(user.lastSeen)}
                      </td>

                      {/* Signup Date */}
                      <td className="px-6 py-2 text-slate-500 font-sans">
                        {user.joinedDate}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {isSuperAdmin && (
                            <button
                              onClick={() => openAssignRoleModal(user)}
                              title="Give Role / Generate Credentials"
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors mr-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Give Role</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(user)}
                            title="Edit user details"
                            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              title="Delete user from system"
                              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-xs">
          <div className="text-slate-500 font-sans">
            Showing <span className="font-semibold text-slate-800">1</span> to{' '}
            <span className="font-semibold text-slate-800">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{users.length}</span> users
          </div>
          <div className="flex items-center gap-1 font-mono">
            <button className="w-7 h-7 rounded border border-slate-200 text-slate-400 flex items-center justify-center cursor-not-allowed" disabled>
              &lt;
            </button>
            <button className="w-7 h-7 rounded border border-blue-500 bg-blue-50 text-blue-600 font-bold flex items-center justify-center">
              1
            </button>
            <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
              2
            </button>
            <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Modal overlays */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-fade-in mx-4">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {isEditMode ? 'Modify User Profile' : 'Register New User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rodriguez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. elena@company.net"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Grid: Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    System Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="User">User</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Status State
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm"
                >
                  {isEditMode ? 'Save Changes' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin: Role Assignment & Credentials Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-300" />
                  <h3 className="text-lg font-bold">Assign Admin Role & Credentials</h3>
                </div>
                <p className="text-purple-200 text-xs mt-1">
                  Grant Admin/Super Admin access & share credentials via WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-purple-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {createdCredentials ? (
                /* SUCCESS & WHATSAPP SHARE CARD */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Role Successfully Granted!</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {createdCredentials.fullName} is now assigned as <strong>{createdCredentials.role === 'super_admin' ? 'Super Admin' : 'Admin'}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Credentials Display Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[10px]">Member:</span>
                      <span className="font-sans font-bold text-slate-800 text-sm">{createdCredentials.fullName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[10px]">Assigned Role:</span>
                      <span className="font-sans px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold uppercase text-[10px]">
                        {createdCredentials.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[10px]">Username:</span>
                      <span className="font-bold text-slate-900 text-sm bg-white px-2 py-1 border border-slate-200 rounded">{createdCredentials.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-sans font-semibold uppercase tracking-wider text-[10px]">Password:</span>
                      <span className="font-bold text-slate-900 text-sm bg-white px-2 py-1 border border-slate-200 rounded">{createdCredentials.password}</span>
                    </div>
                  </div>

                  {/* WhatsApp Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                      <MessageSquare className="w-5 h-5 text-emerald-100" />
                      <span>Share via WhatsApp</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Copy Text</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRoleModalOpen(false)}
                        className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* FORM STEP */
                <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
                  {assignError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                      {assignError}
                    </div>
                  )}

                  {/* Select Existing Member */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Select Member / User
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleSelectMemberForRole(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">-- Choose member from Users list or enter details below --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role}) {u.phone ? ` - ${u.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siva Sai Prasad"
                      value={assignFullName}
                      onChange={(e) => {
                        setAssignFullName(e.target.value);
                        if (!assignUsername) {
                          setAssignUsername(generateUsernameFromName(e.target.value));
                        }
                      }}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Assign System Role *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                        assignRole === 'admin' 
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="roleType"
                          value="admin"
                          checked={assignRole === 'admin'}
                          onChange={() => setAssignRole('admin')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold">Admin</p>
                          <p className="text-[10px] text-slate-500">Standard admin access</p>
                        </div>
                      </label>

                      <label className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                        assignRole === 'super_admin' 
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                        <input
                          type="radio"
                          name="roleType"
                          value="super_admin"
                          checked={assignRole === 'super_admin'}
                          onChange={() => setAssignRole('super_admin')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold">Super Admin</p>
                          <p className="text-[10px] text-slate-500">Full system & delete controls</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Login Username *
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssignUsername(generateUsernameFromName(assignFullName))}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Auto Suggest
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sivasai_admin"
                      value={assignUsername}
                      onChange={(e) => setAssignUsername(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Login Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssignPassword(generateRandomPassword())}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Generate Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password"
                        value={assignPassword}
                        onChange={(e) => setAssignPassword(e.target.value)}
                        className="w-full h-10 pl-3 pr-10 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Phone Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      WhatsApp Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={assignPhone}
                      onChange={(e) => setAssignPhone(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsRoleModalOpen(false)}
                      className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={assignLoading}
                      className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {assignLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Assign & Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
