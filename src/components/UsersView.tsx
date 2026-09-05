import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Ban,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Unlock
} from 'lucide-react';
import { User } from '../types';
import { DateRangeFilter, isDateInRange } from '../utils/dateUtils';

const fetch = (input: RequestInfo | URL, init?: RequestInit) => window.fetch(input, { ...init, credentials: 'include' });

interface UsersViewProps {
  onRefreshStats?: () => void;
  isSuperAdmin?: boolean;
  dateRange?: DateRangeFilter;
}

export default function UsersView({ onRefreshStats, isSuperAdmin = true, dateRange }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'today' | 'admins'>('all');

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
  const [autoConfirm, setAutoConfirm] = useState<boolean>(true);

  // Ban / Block & Unblock Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);
  const [selectedUserForBan, setSelectedUserForBan] = useState<User | null>(null);
  const [selectedUserForUnban, setSelectedUserForUnban] = useState<User | null>(null);
  const [banPreset, setBanPreset] = useState<'1h' | '24h' | '3d' | '7d' | '30d' | 'custom' | 'permanent'>('24h');
  const [banDurationValue, setBanDurationValue] = useState<number>(24);
  const [banDurationUnit, setBanDurationUnit] = useState<'hours' | 'days'>('hours');
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [unbanLoading, setUnbanLoading] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  // Super Admin Role Assignment & Admin Users List States
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
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

  // Delete modal state (replaces iframe-blocked window.confirm)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<{ id: string; username: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

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

  const fetchAdminUsers = async () => {
    if (!isSuperAdmin) return;
    try {
      setIsAdminUsersLoading(true);
      const res = await fetch('/api/admin/users/roles');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.admins)) {
          setAdminUsers(data.admins);
        }
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setIsAdminUsersLoading(false);
    }
  };

  const openAssignRoleModal = (userToAssign?: User) => {
    setAssignError(null);
    setCreatedCredentials(null);
    setShowPassword(false);

    if (userToAssign) {
      const matchingAdmin = adminUsers.find(a => 
        a.id === userToAssign.id ||
        (a.username && userToAssign.name && a.username.toLowerCase() === userToAssign.name.toLowerCase()) ||
        (a.full_name && userToAssign.name && a.full_name.toLowerCase() === userToAssign.name.toLowerCase()) ||
        (a.username && userToAssign.email && userToAssign.email.toLowerCase().includes(a.username.toLowerCase()))
      );

      if (matchingAdmin) {
        setEditingAdminId(matchingAdmin.id);
        setSelectedUserId(userToAssign.id);
        setAssignFullName(matchingAdmin.full_name || userToAssign.name);
        setAssignUsername(matchingAdmin.username || generateUsernameFromName(userToAssign.name));
        setAssignPassword(''); // blank unless user wants to change password
        setAssignRole(matchingAdmin.role === 'super_admin' ? 'super_admin' : 'admin');
        setAssignPhone(userToAssign.phone || '');
        setIsRoleModalOpen(true);
        return;
      }

      if ((userToAssign.role || '').toLowerCase().includes('admin')) {
        setEditingAdminId(userToAssign.id);
        setSelectedUserId(userToAssign.id);
        setAssignFullName(userToAssign.name);
        setAssignUsername(generateUsernameFromName(userToAssign.name));
        setAssignPassword('');
        setAssignRole((userToAssign.role as string).toLowerCase().includes('super') ? 'super_admin' : 'admin');
        setAssignPhone(userToAssign.phone || '');
        setIsRoleModalOpen(true);
        return;
      }

      setEditingAdminId(null);
      setSelectedUserId(userToAssign.id);
      setAssignFullName(userToAssign.name);
      setAssignPhone(userToAssign.phone || '');
      setAssignUsername(generateUsernameFromName(userToAssign.name));
      setAssignPassword(generateRandomPassword());
      setAssignRole('admin');
      setIsRoleModalOpen(true);
    } else {
      setEditingAdminId(null);
      setSelectedUserId('');
      setAssignFullName('');
      setAssignPhone('');
      setAssignUsername('');
      setAssignPassword(generateRandomPassword());
      setAssignRole('admin');
      setIsRoleModalOpen(true);
    }
  };

  const openEditAdminModal = (adminObj: any) => {
    setEditingAdminId(adminObj.id);
    setAssignError(null);
    setCreatedCredentials(null);
    setShowPassword(false);
    setSelectedUserId(adminObj.id);
    setAssignFullName(adminObj.full_name || '');
    setAssignUsername(adminObj.username || '');
    setAssignPassword(''); // blank unless updating
    setAssignRole(adminObj.role === 'super_admin' ? 'super_admin' : 'admin');
    setAssignPhone('');
    setIsRoleModalOpen(true);
  };

  const handleDeleteAdminUser = (adminId: string, username: string) => {
    setAdminToDelete({ id: adminId, username });
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${adminToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        triggerNotification(`Admin user '${adminToDelete.username}' access revoked.`);
        setAdminToDelete(null);
        fetchAdminUsers();
        fetchUsers();
      } else {
        triggerNotification(data.error || 'Failed to revoke admin access.');
      }
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      triggerNotification('Network error while revoking admin access.');
    } finally {
      setIsDeletingUser(false);
    }
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
    if (!editingAdminId && (!assignPassword.trim() || assignPassword.length < 4)) {
      setAssignError('Password must be at least 4 characters.');
      return;
    }
    if (!assignFullName.trim()) {
      setAssignError('Full name is required.');
      return;
    }

    setAssignLoading(true);
    try {
      const isEditing = Boolean(editingAdminId);
      const url = isEditing ? `/api/admin/users/${editingAdminId}` : '/api/admin/users/assign-role';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId || undefined,
          username: assignUsername.trim(),
          password: assignPassword.trim() || undefined,
          full_name: assignFullName.trim(),
          role: assignRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save role/credentials.');
      }

      if (assignPassword.trim() || !isEditing) {
        setCreatedCredentials({
          username: assignUsername.trim(),
          password: assignPassword.trim() || '(Unchanged)',
          fullName: assignFullName.trim(),
          role: assignRole,
          phone: assignPhone.trim()
        });
      } else {
        setIsRoleModalOpen(false);
      }

      triggerNotification(isEditing ? `Admin '${assignUsername}' updated successfully!` : `Role '${assignRole === 'super_admin' ? 'Super Admin' : 'Admin'}' assigned to ${assignFullName}!`);
      fetchAdminUsers();
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
    const portalUrl = window.location.origin.includes('admin.trackbook.xyz') 
      ? window.location.origin 
      : 'https://admin.trackbook.xyz';

    const msg = `Hello *${createdCredentials.fullName}*,\n\nYou have been granted *${roleTitle}* access in *TrackBook Admin Portal*.\n\n🔑 *Login Credentials:*\n• *Username:* \`${createdCredentials.username}\`\n• *Password:* \`${createdCredentials.password}\`\n• *Role:* ${roleTitle}\n\n🌐 *Portal URL:*\n${portalUrl}\n\nPlease login with these credentials.`;

    const cleanPhone = createdCredentials.phone ? createdCredentials.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone && cleanPhone.length >= 8
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const roleTitle = createdCredentials.role === 'super_admin' ? 'Super Admin' : 'Admin';
    const portalUrl = window.location.origin.includes('admin.trackbook.xyz') 
      ? window.location.origin 
      : 'https://admin.trackbook.xyz';

    const text = `TrackBook Credentials:\nName: ${createdCredentials.fullName}\nRole: ${roleTitle}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}\nPortal URL: ${portalUrl}`;
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
    if (isSuperAdmin) {
      fetchAdminUsers();
    }
    // Real-time auto-refresh interval for user status
    const interval = setInterval(() => {
      fetchUsers(false);
      if (isSuperAdmin) fetchAdminUsers();
    }, 10000);
    const handleGlobalRefresh = () => {
      fetchUsers(true);
      if (isSuperAdmin) fetchAdminUsers();
    };
    window.addEventListener('app-global-refresh', handleGlobalRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app-global-refresh', handleGlobalRefresh);
    };
  }, [isSuperAdmin]);

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

      const statusVal = isEditMode
        ? formData.status
        : (autoConfirm ? 'Active' : 'Pending');

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: statusVal,
          autoConfirm: !isEditMode ? autoConfirm : undefined
        })
      });

      if (res.ok) {
        triggerNotification(
          isEditMode
            ? 'User profile updated successfully!'
            : autoConfirm
              ? 'New user registered and auto-confirmed successfully!'
              : 'New user registered! Email confirmation pending.'
        );
        setIsModalOpen(false);
        setFormData({ name: '', role: 'User', email: '', phone: '', status: 'Active' });
        setAutoConfirm(true);
        setSelectedUser(null);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  // Delete User
  const handleDelete = (id: string, name?: string, email?: string) => {
    const u = users.find(x => x.id === id);
    setUserToDelete({
      id,
      name: name || u?.name || 'this user',
      email: email || u?.email || ''
    });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        triggerNotification(`User '${userToDelete.name}' deleted from registry.`);
        setUserToDelete(null);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      } else {
        triggerNotification(data.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      triggerNotification('Network error while deleting user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Open Ban Modal
  const handleOpenBanModal = (user: User) => {
    setSelectedUserForBan(user);
    setBanPreset('24h');
    setBanDurationValue(24);
    setBanDurationUnit('hours');
    setBanReason('');
    setIsBanModalOpen(true);
  };

  // Submit Ban User in Supabase Auth
  const handleConfirmBan = async () => {
    if (!selectedUserForBan) return;
    setBanLoading(true);

    try {
      let payload: any = {
        reason: banReason.trim() || 'Admin manual ban'
      };

      if (banPreset === 'permanent') {
        payload.unit = 'permanent';
      } else if (banPreset === 'custom') {
        payload.duration = Number(banDurationValue) || 1;
        payload.unit = banDurationUnit;
      } else {
        if (banPreset === '1h') { payload.duration = 1; payload.unit = 'hours'; }
        else if (banPreset === '24h') { payload.duration = 24; payload.unit = 'hours'; }
        else if (banPreset === '3d') { payload.duration = 3; payload.unit = 'days'; }
        else if (banPreset === '7d') { payload.duration = 7; payload.unit = 'days'; }
        else if (banPreset === '30d') { payload.duration = 30; payload.unit = 'days'; }
      }

      const res = await fetch(`/api/users/${selectedUserForBan.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(`User '${selectedUserForBan.name}' blocked successfully in Supabase!`);
        setIsBanModalOpen(false);
        setSelectedUserForBan(null);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      } else {
        alert(`Failed to block user: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error blocking user:', err);
      alert('Network error while blocking user.');
    } finally {
      setBanLoading(false);
    }
  };

  // Open Unban Modal
  const handleOpenUnbanModal = (user: User) => {
    setSelectedUserForUnban(user);
    setIsUnbanModalOpen(true);
  };

  // Submit Unban User in Supabase Auth
  const handleConfirmUnban = async () => {
    if (!selectedUserForUnban) return;
    setUnbanLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUserForUnban.id}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(`User '${selectedUserForUnban.name}' unblocked successfully. Access restored!`);
        setIsUnbanModalOpen(false);
        setSelectedUserForUnban(null);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
      } else {
        alert(`Failed to unblock user: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error unblocking user:', err);
      alert('Network error while unblocking user.');
    } finally {
      setUnbanLoading(false);
    }
  };

  // Helper to calculate unban date preview in Modal
  const calculateBanExpiry = () => {
    if (banPreset === 'permanent') {
      return 'Permanently (until manually unblocked)';
    }
    const now = new Date();
    let msToAdd = 0;
    if (banPreset === '1h') msToAdd = 1 * 60 * 60 * 1000;
    else if (banPreset === '24h') msToAdd = 24 * 60 * 60 * 1000;
    else if (banPreset === '3d') msToAdd = 3 * 24 * 60 * 60 * 1000;
    else if (banPreset === '7d') msToAdd = 7 * 24 * 60 * 60 * 1000;
    else if (banPreset === '30d') msToAdd = 30 * 24 * 60 * 60 * 1000;
    else if (banPreset === 'custom') {
      const val = Number(banDurationValue) || 1;
      msToAdd = (banDurationUnit === 'days' ? val * 24 : val) * 60 * 60 * 1000;
    }
    const expiryDate = new Date(now.getTime() + msToAdd);
    return expiryDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper to format remaining ban time on user card / table
  const formatBannedExpiry = (bannedUntil?: string | null) => {
    if (!bannedUntil) return 'Banned';
    const expiry = new Date(bannedUntil);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 'Ban expired';
    
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours > 800000) {
      return 'Permanent Ban';
    }
    if (diffDays >= 2) {
      return `${diffDays} days left`;
    }
    if (diffHours >= 1) {
      return `${diffHours} hrs left`;
    }
    const diffMins = Math.round(diffMs / (1000 * 60));
    return `${Math.max(1, diffMins)} min left`;
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

    // Log export event to audit logs
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: 'Customer / User Manager',
        user_role: 'User',
        user_type: 'Customer',
        action: 'Excel/CSV User Directory Export',
        details: 'Exported complete user registry to CSV file',
        format: 'Excel'
      })
    }).catch(() => {});
  };

  // Dynamic calculations for real stats
  const totalUsersCount = users.length;
  const liveUsersCount = users.filter(u => u.isOnline).length;
  const newUsersTodayCount = users.filter(u => isJoinedToday(u.joinedDate)).length;
  const adminUsersCount = adminUsers.length > 0 
    ? adminUsers.length 
    : users.filter(u => u.role === 'Admin' || u.role === 'Super Admin').length;

  // Filters with Memoization
  const filteredUsers = useMemo(() => {
    let sourceList = users;

    // If regular admin (not super admin), hide admin accounts from regular users list
    if (!isSuperAdmin) {
      sourceList = sourceList.filter(u => {
        const roleLower = (u.role || '').toLowerCase();
        const isAdminRole = roleLower.includes('admin');
        const isListedAdmin = adminUsers.some(a => 
          a.id === u.id ||
          (a.username && u.name && a.username.toLowerCase() === u.name.toLowerCase()) ||
          (a.full_name && u.name && a.full_name.toLowerCase() === u.name.toLowerCase())
        );
        return !isAdminRole && !isListedAdmin;
      });
    }

    // If viewing admins tab, ensure all admin accounts are represented
    if (activeTab === 'admins' && adminUsers.length > 0) {
      const merged = [...users];
      adminUsers.forEach(adm => {
        const exists = merged.some(u => 
          u.id === adm.id || 
          (u.name && u.name.toLowerCase() === (adm.full_name || '').toLowerCase()) ||
          (u.name && u.name.toLowerCase() === (adm.username || '').toLowerCase())
        );
        if (!exists) {
          merged.push({
            id: adm.id,
            name: adm.full_name || adm.username,
            email: `${adm.username}@trackbook.xyz`,
            phone: '',
            role: adm.role === 'super_admin' ? 'Admin' : 'Admin',
            status: 'Active',
            joinedDate: adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Admin Account',
            lastSeen: adm.last_login_at || new Date().toISOString(),
            isOnline: adm.last_login_at ? (new Date().getTime() - new Date(adm.last_login_at).getTime() < 1000 * 60 * 5) : false
          });
        }
      });
      sourceList = merged;
    }

    return sourceList.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery));
      
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = 
        statusFilter === 'All' || 
        user.status === statusFilter || 
        (statusFilter === 'Banned' && (user.isBanned || user.status === 'Banned'));

      let matchesTab = true;
      if (activeTab === 'live') {
        matchesTab = !!user.isOnline;
      } else if (activeTab === 'today') {
        matchesTab = isJoinedToday(user.joinedDate);
      } else if (activeTab === 'admins') {
        const roleLower = (user.role || '').toLowerCase();
        const isRoleAdmin = roleLower.includes('admin');
        const isListedAdmin = adminUsers.some(a => 
          a.id === user.id ||
          (a.username && a.username.toLowerCase() === user.name.toLowerCase()) ||
          (a.full_name && a.full_name.toLowerCase() === user.name.toLowerCase())
        );
        matchesTab = isRoleAdmin || isListedAdmin;
      }

      const matchesDate = isDateInRange(user.joinedDate || user.lastSeen, dateRange);

      return matchesSearch && matchesRole && matchesStatus && matchesTab && matchesDate;
    });
  }, [users, adminUsers, activeTab, searchQuery, roleFilter, statusFilter, dateRange]);

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
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {/* Stat 1: Total Users */}
        <div 
          onClick={() => setActiveTab('all')}
          className={`bg-white p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            activeTab === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
              : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
          }`}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUsersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Direct Sync
            </span>
            <span>Supabase Auth</span>
          </div>
        </div>

        {/* Stat 2: Live Users */}
        <div 
          onClick={() => setActiveTab('live')}
          className={`bg-white p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            activeTab === 'live'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
              : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Live Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <span>{liveUsersCount}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              Online State
            </span>
            <span>last seen &lt; 2m</span>
          </div>
        </div>

        {/* Stat 3: New Users Today */}
        <div 
          onClick={() => setActiveTab('today')}
          className={`bg-white p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            activeTab === 'today'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10'
              : 'border-slate-200 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">New Users Today</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{newUsersTodayCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative z-10 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-mono font-bold flex items-center">
              Real-time
            </span>
            <span>registered today</span>
          </div>
        </div>

        {/* Stat 4: Admin Users */}
        {isSuperAdmin && (
          <div 
            onClick={() => setActiveTab('admins')}
            className={`bg-white p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
              activeTab === 'admins'
                ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/10'
                : 'border-slate-200 hover:border-purple-300 hover:shadow-sm'
            }`}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Admin Users</p>
                <h3 className="text-2xl font-bold text-purple-900 mt-1 flex items-center gap-2">
                  <span>{adminUsersCount}</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">Portal</span>
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 relative z-10 text-[11px] text-slate-500">
              <span className="text-purple-700 font-mono font-bold flex items-center">
                Admin Access
              </span>
              <span>click to list admins</span>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin: Dedicated Admin Users Access Section */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-purple-900/5 via-indigo-900/5 to-purple-900/5 border border-purple-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-sans">Admin Panel Access & Accounts</h3>
                  <span className="px-2.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                    {adminUsers.length} Admin{adminUsers.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Users who have active login credentials to access this Admin Portal.
                </p>
              </div>
            </div>

            <button
              onClick={() => openAssignRoleModal()}
              className="h-9 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Grant New Admin Role</span>
            </button>
          </div>

          {/* Admin Users Grid */}
          {isAdminUsersLoading && adminUsers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 animate-pulse">Loading admin accounts...</div>
          ) : adminUsers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No admin accounts found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {adminUsers.map((admin) => {
                const isSuper = admin.role === 'super_admin';
                return (
                  <div
                    key={admin.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center text-white shrink-0 ${
                          isSuper ? 'bg-gradient-to-br from-purple-600 to-indigo-700 shadow-sm' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm'
                        }`}>
                          {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-900 transition-colors">
                            {admin.full_name || 'Admin User'}
                          </h4>
                          <p className="text-xs font-mono text-purple-700 font-semibold">
                            @{admin.username}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isSuper ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {isSuper ? 'Super Admin' : 'Admin'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <div>
                        <span>Last active: </span>
                        <span className="font-medium text-slate-700">{formatLastSeen(admin.last_login_at)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditAdminModal(admin)}
                          title="Edit Admin Username, Password or Role"
                          className="p-1.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold px-2"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAdminUser(admin.id, admin.username)}
                          title="Revoke Admin Access"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Users ({totalUsersCount})
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
            className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'today'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            New Users Today ({newUsersTodayCount})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-3.5 px-4 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'admins'
                  ? 'border-purple-600 text-purple-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Admin Access ({adminUsersCount})
            </button>
          )}
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
                <option value="Banned">Banned / Blocked</option>
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

                    {user.isBanned ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                        title={user.bannedUntil ? `Banned until: ${new Date(user.bannedUntil).toLocaleString()}` : 'Banned'}
                      >
                        <Ban className="w-3 h-3 text-rose-500" />
                        Banned
                      </span>
                    ) : user.isOnline ? (
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
                    {user.isBanned && (
                      <p className="flex justify-between text-rose-700 font-medium bg-rose-50/80 px-2 py-1 rounded border border-rose-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" />
                          Auth Ban:
                        </span>
                        <span className="font-bold text-[11px]">{formatBannedExpiry(user.bannedUntil)}</span>
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
                    {isSuperAdmin && (() => {
                      const isUserAdmin = (user.role || '').toLowerCase().includes('admin') || adminUsers.some(a => 
                        a.id === user.id ||
                        (a.username && user.name && a.username.toLowerCase() === user.name.toLowerCase()) ||
                        (a.full_name && user.name && a.full_name.toLowerCase() === user.name.toLowerCase()) ||
                        (a.username && user.email && user.email.toLowerCase().includes(a.username.toLowerCase()))
                      );
                      return (
                        <button
                          onClick={() => openAssignRoleModal(user)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            isUserAdmin
                              ? "bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300"
                              : "bg-purple-50 hover:bg-purple-100 text-purple-700"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                          <span>{isUserAdmin ? 'Update Role' : 'Give Role'}</span>
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => openEditModal(user)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {/* Block / Unblock is accessible to both Admins and Super Admin */}
                    {user.isBanned ? (
                      <button
                        onClick={() => handleOpenUnbanModal(user)}
                        title="Unblock user access"
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Unblock</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBanModal(user)}
                        title="Block user access"
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-600" />
                        <span>Block</span>
                      </button>
                    )}

                    {/* Delete action */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(user.id, user.name, user.email)}
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

                      {/* Online Status / Ban Status */}
                      <td className="px-6 py-2">
                        {user.isBanned ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs"
                            title={user.bannedUntil ? `Banned until: ${new Date(user.bannedUntil).toLocaleString()}` : 'Banned in Supabase Auth'}
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                            <span>Banned</span>
                          </span>
                        ) : user.isOnline ? (
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
                          {isSuperAdmin && (() => {
                            const isUserAdmin = (user.role || '').toLowerCase().includes('admin') || adminUsers.some(a => 
                              a.id === user.id ||
                              (a.username && user.name && a.username.toLowerCase() === user.name.toLowerCase()) ||
                              (a.full_name && user.name && a.full_name.toLowerCase() === user.name.toLowerCase()) ||
                              (a.username && user.email && user.email.toLowerCase().includes(a.username.toLowerCase()))
                            );
                            return (
                              <button
                                onClick={() => openAssignRoleModal(user)}
                                title={isUserAdmin ? "Update Role & Credentials" : "Give Role / Generate Credentials"}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors mr-1 ${
                                  isUserAdmin
                                    ? "bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 shadow-xs"
                                    : "bg-purple-50 hover:bg-purple-100 text-purple-700"
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                                <span>{isUserAdmin ? 'Update Role' : 'Give Role'}</span>
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => openEditModal(user)}
                            title="Edit user details"
                            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* Block / Unblock is accessible to both Admins and Super Admin */}
                          {user.isBanned ? (
                            <button
                              onClick={() => handleOpenUnbanModal(user)}
                              title="Unblock user access in Supabase"
                              className="w-8 h-8 rounded-md flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenBanModal(user)}
                              title="Block / Ban user in Supabase"
                              className="w-8 h-8 rounded-md flex items-center justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete action */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(user.id, user.name, user.email)}
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
                {!isEditMode && (
                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs text-slate-600 select-none bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={autoConfirm}
                      onChange={(e) => setAutoConfirm(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-medium text-slate-700">Auto Confirm Registration (No email verification required)</span>
                  </label>
                )}
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
                  <h3 className="text-lg font-bold">
                    {editingAdminId ? 'Edit Admin Credentials & Role' : 'Assign Admin Role & Credentials'}
                  </h3>
                </div>
                <p className="text-purple-200 text-xs mt-1">
                  {editingAdminId
                    ? 'Update username, password, or role for this admin account.'
                    : 'Grant Admin/Super Admin access & share credentials via WhatsApp.'}
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
                        Login Password {editingAdminId ? '(Optional)' : '*'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssignPassword(generateRandomPassword())}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Generate New Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingAdminId}
                        placeholder={editingAdminId ? 'Enter new password (or leave blank to keep current)' : 'Enter password'}
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
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>{editingAdminId ? 'Update & Save' : 'Assign & Generate'}</span>
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

      {/* Supabase-style Ban User Modal */}
      {isBanModalOpen && selectedUserForBan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white flex justify-between items-start border-b border-rose-900/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Ban User</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-900/60 text-rose-300 border border-rose-700/50 rounded-full font-normal">
                      Supabase Auth
                    </span>
                  </h3>
                  <p className="text-slate-300 text-xs mt-1">
                    Revoke authentication access and prevent login for this user.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!banLoading) {
                    setIsBanModalOpen(false);
                    setSelectedUserForBan(null);
                  }
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {/* User Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                {selectedUserForBan.avatarUrl ? (
                  <img src={selectedUserForBan.avatarUrl} alt={selectedUserForBan.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                    {selectedUserForBan.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{selectedUserForBan.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      {selectedUserForBan.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{selectedUserForBan.email}</p>
                </div>
              </div>

              {/* Warning Callout */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  When banned, all active user sessions will be terminated and Supabase Authentication will block this user from logging in until the specified duration expires.
                </p>
              </div>

              {/* Ban Duration Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Ban Duration
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { id: '1h', label: '1 Hour' },
                    { id: '24h', label: '24 Hours (1 Day)' },
                    { id: '3d', label: '3 Days' },
                    { id: '7d', label: '7 Days' },
                    { id: '30d', label: '30 Days' },
                    { id: 'custom', label: 'Custom' },
                    { id: 'permanent', label: 'Permanent' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setBanPreset(p.id as any)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        banPreset === p.id
                          ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Duration Fields */}
                {banPreset === 'custom' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Enter Custom Time Duration
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={banDurationValue}
                        onChange={(e) => setBanDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:border-rose-500"
                        placeholder="e.g. 12"
                      />
                      <select
                        value={banDurationUnit}
                        onChange={(e) => setBanDurationUnit(e.target.value as any)}
                        className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Expiration Banner */}
              <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500 block font-medium">Automatic Unban At:</span>
                  <span className="text-rose-900 font-bold text-sm block mt-0.5">
                    {calculateBanExpiry()}
                  </span>
                </div>
              </div>

              {/* Reason Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Reason for Ban (Optional)
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Repeated policy violation, Suspicious transaction activity"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={banLoading}
                  onClick={() => {
                    setIsBanModalOpen(false);
                    setSelectedUserForBan(null);
                  }}
                  className="flex-1 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={banLoading}
                  onClick={handleConfirmBan}
                  className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {banLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Banning in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Confirm Ban User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supabase-style Unblock User Modal */}
      {isUnbanModalOpen && selectedUserForUnban && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white flex justify-between items-start border-b border-emerald-900/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Unblock User</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded-full font-normal">
                      Supabase Auth
                    </span>
                  </h3>
                  <p className="text-slate-300 text-xs mt-1">
                    Restore full platform access in Supabase Authentication.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!unbanLoading) {
                    setIsUnbanModalOpen(false);
                    setSelectedUserForUnban(null);
                  }
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                {selectedUserForUnban.avatarUrl ? (
                  <img src={selectedUserForUnban.avatarUrl} alt={selectedUserForUnban.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                    {selectedUserForUnban.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{selectedUserForUnban.name}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{selectedUserForUnban.email}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to unblock <strong>{selectedUserForUnban.name}</strong>?
              </p>

              {selectedUserForUnban.bannedUntil && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  Current ban was set to expire on:{' '}
                  <strong className="block mt-0.5 text-amber-950 font-mono">
                    {new Date(selectedUserForUnban.bannedUntil).toLocaleString()}
                  </strong>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Unblocking will clear the ban duration in Supabase Authentication and restore immediate login access for this user.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={unbanLoading}
                  onClick={() => {
                    setIsUnbanModalOpen(false);
                    setSelectedUserForUnban(null);
                  }}
                  className="flex-1 h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={unbanLoading}
                  onClick={handleConfirmUnban}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {unbanLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Unblocking...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unblock User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Delete User Account</h3>
                  <p className="text-[11px] text-rose-100">Permanent registry deletion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete user <strong className="text-slate-900">{userToDelete.name}</strong>
                {userToDelete.email ? <span className="text-slate-500"> ({userToDelete.email})</span> : ''}?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>This will remove their profile and authentication credentials from the registry. This action cannot be undone.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Revoke Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Revoke Admin Access</h3>
                  <p className="text-[11px] text-rose-100">Remove administrator privileges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                disabled={isDeletingUser}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to revoke admin portal access for <strong className="text-slate-900">{adminToDelete.username}</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>This user will no longer be able to log in to the TrackBook Admin Portal.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminToDelete(null)}
                  disabled={isDeletingUser}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAdmin}
                  disabled={isDeletingUser}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
