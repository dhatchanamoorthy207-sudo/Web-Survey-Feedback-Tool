import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileText,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  PlusCircle,
  BarChart2,
  Users,
  Layers,
  Menu,
  X,
  CheckCircle,
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-blue-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/')}>
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">SurveyPulse</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Secure Feedback &amp; Analytics</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {!user ? (
              <>
                <button
                  onClick={() => navigate('/')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/login' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="ml-2 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/20"
                >
                  Get Started
                </button>
              </>
            ) : user.role === 'admin' ? (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/admin' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Admin Overview
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/admin/users' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => navigate('/admin/surveys')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/admin/surveys' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  All Surveys
                </button>
                <button
                  onClick={() => navigate('/admin/audit')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/admin/audit' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Audit Logs
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  title="Switch to Researcher View"
                >
                  User View
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/dashboard' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/my-surveys')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === '/my-surveys' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  My Surveys
                </button>
                <button
                  onClick={() => navigate('/create-survey')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all shadow-blue-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Survey</span>
                </button>
              </>
            )}

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-200 ml-2">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <span
                      className={`inline-block px-1.5 py-0.2 text-[10px] font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role === 'admin' ? 'Administrator' : 'Researcher'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {!user ? (
            <>
              <button
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                Home
              </button>
              <button
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                Sign In
              </button>
              <button
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-semibold text-blue-600 rounded-md hover:bg-blue-50"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              <div className="py-2 border-b border-slate-100 mb-2">
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email} ({user.role})</p>
              </div>
              {user.role === 'admin' && (
                <>
                  <button
                    onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
                  >
                    Admin Overview
                  </button>
                  <button
                    onClick={() => { navigate('/admin/users'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
                  >
                    User Management
                  </button>
                  <button
                    onClick={() => { navigate('/admin/surveys'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
                  >
                    Survey Management
                  </button>
                  <button
                    onClick={() => { navigate('/admin/audit'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
                  >
                    Audit Logs
                  </button>
                </>
              )}
              <button
                onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                User Dashboard
              </button>
              <button
                onClick={() => { navigate('/my-surveys'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                My Surveys
              </button>
              <button
                onClick={() => { navigate('/create-survey'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 rounded-md hover:bg-blue-50"
              >
                + Create Survey
              </button>
              <button
                onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-50"
              >
                Profile &amp; Password
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
