import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  isAdminArea?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, navigate, isAdminArea = false }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {isAdminArea ? 'ADM' : 'USR'}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isAdminArea ? 'Admin Console' : 'Survey Workspace'}
            </p>
            <p className="text-sm font-medium text-white truncate max-w-[140px]">{user?.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {isAdminArea ? (
          <div>
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              Management
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => navigate('/admin')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/admin' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => navigate('/admin/users')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/admin/users' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>User Management</span>
              </button>

              <button
                onClick={() => navigate('/admin/surveys')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/admin/surveys' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>All Surveys</span>
              </button>

              <button
                onClick={() => navigate('/admin/audit')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/admin/audit' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Audit Logs</span>
              </button>
            </nav>

            <div className="mt-8 pt-4 border-t border-slate-800">
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Shortcuts
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <span>Switch to User View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <button
                onClick={() => navigate('/create-survey')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Survey</span>
              </button>
            </div>

            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              Navigation
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => navigate('/dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => navigate('/my-surveys')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/my-surveys' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>My Surveys</span>
              </button>

              <button
                onClick={() => navigate('/profile')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPath === '/profile' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span>Account &amp; Security</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-amber-400 hover:bg-slate-800 mt-4"
                >
                  <span className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Console</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </nav>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-xs">
            <p className="font-medium text-slate-300 truncate max-w-[140px]">{user?.email}</p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role} session</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
