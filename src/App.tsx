import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { UserDashboard } from './pages/UserDashboard.tsx';
import { MySurveysPage } from './pages/MySurveysPage.tsx';
import { SurveyBuilderPage } from './pages/SurveyBuilderPage.tsx';
import { PublicSurveyPage } from './pages/PublicSurveyPage.tsx';
import { SurveyResultsPage } from './pages/SurveyResultsPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AdminUsersPage } from './pages/AdminUsersPage.tsx';
import { AdminSurveysPage } from './pages/AdminSurveysPage.tsx';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage.tsx';
import { AccessDeniedPage } from './pages/AccessDeniedPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

import { Wifi, WifiOff } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading SurveyPulse...
          </p>
        </div>
      </div>
    );
  }

  // Parse path and params
  const isPublicSurvey = currentPath.startsWith('/s/');
  const publicIdMatch = currentPath.match(/^\/s\/([a-zA-Z0-9_\-]+)/);

  const editSurveyMatch = currentPath.match(/^\/survey\/(\d+)\/edit/);
  const resultsSurveyMatch = currentPath.match(/^\/survey\/(\d+)\/results/);

  // Render view
  let ViewComponent: React.ReactNode = null;

  if (currentPath === '/') {
    ViewComponent = <HomePage navigate={navigate} />;
  } else if (currentPath === '/login') {
    ViewComponent = <LoginPage navigate={navigate} />;
  } else if (currentPath === '/register') {
    ViewComponent = <RegisterPage navigate={navigate} />;
  } else if (currentPath === '/forgot-password') {
    ViewComponent = <ForgotPasswordPage navigate={navigate} />;
  } else if (currentPath === '/reset-password') {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    ViewComponent = <ForgotPasswordPage navigate={navigate} initialToken={token} />;
  } else if (isPublicSurvey && publicIdMatch) {
    ViewComponent = <PublicSurveyPage publicId={publicIdMatch[1]} navigate={navigate} />;
  } else if (currentPath === '/dashboard') {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = <UserDashboard navigate={navigate} />;
  } else if (currentPath === '/my-surveys') {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = <MySurveysPage navigate={navigate} />;
  } else if (currentPath === '/create-survey') {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = <SurveyBuilderPage navigate={navigate} />;
  } else if (editSurveyMatch) {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = <SurveyBuilderPage navigate={navigate} surveyId={parseInt(editSurveyMatch[1], 10)} />;
  } else if (resultsSurveyMatch) {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = (
      <SurveyResultsPage
        navigate={navigate}
        surveyId={parseInt(resultsSurveyMatch[1], 10)}
        isAdmin={user.role === 'admin'}
      />
    );
  } else if (currentPath === '/profile') {
    if (!user) return <LoginPage navigate={navigate} />;
    ViewComponent = <ProfilePage navigate={navigate} />;
  } else if (currentPath.startsWith('/admin')) {
    if (!user) {
      return <LoginPage navigate={navigate} />;
    }
    if (user.role !== 'admin') {
      return <AccessDeniedPage navigate={navigate} />;
    }

    if (currentPath === '/admin') {
      ViewComponent = <AdminDashboard navigate={navigate} />;
    } else if (currentPath === '/admin/users') {
      ViewComponent = <AdminUsersPage navigate={navigate} />;
    } else if (currentPath === '/admin/surveys') {
      ViewComponent = <AdminSurveysPage navigate={navigate} />;
    } else if (currentPath === '/admin/audit') {
      ViewComponent = <AdminAuditLogsPage navigate={navigate} />;
    } else {
      ViewComponent = <NotFoundPage navigate={navigate} />;
    }
  } else {
    ViewComponent = <NotFoundPage navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      <Navbar currentPath={currentPath} navigate={navigate} />

      {/* Network Offline / Duration Alert */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are currently offline. Actions will queue or fail until your connection is restored.</span>
        </div>
      )}

      {/* Reconnected Toast */}
      {showReconnected && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition-all">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Network connection restored. Back online.</span>
        </div>
      )}

      <div className="flex-1">{ViewComponent}</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
