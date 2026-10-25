import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { apiFetch } from '../utils/api.ts';
import { User, Lock, Mail, ShieldCheck, CheckCircle2, AlertCircle, KeyRound, LogOut } from 'lucide-react';

interface ProfilePageProps {
  navigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
  const { user, refreshUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    setProfileSaving(true);

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      setProfileSaving(false);

      if (res.ok) {
        setProfileMessage(data.message || 'Profile updated successfully.');
        await refreshUser();
      } else {
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileSaving(false);
      setProfileError('Network communication error.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      setPasswordSaving(false);

      if (res.ok) {
        setPasswordMessage(data.message || 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordError(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordSaving(false);
      setPasswordError('Network communication error.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar
        currentPath="/profile"
        navigate={navigate}
        isAdminArea={user?.role === 'admin'}
      />

      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account &amp; Security</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal profile, credentials, and authentication preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                {user?.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                      user?.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-500">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {profileError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          {profileMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{profileMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-60 transition-colors"
              >
                {profileSaving ? 'Saving...' : 'Update Profile Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Change Account Password</h2>
          </div>

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{passwordMessage}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Verify existing password"
                className="mt-1 block w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-60 transition-colors"
              >
                {passwordSaving ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
