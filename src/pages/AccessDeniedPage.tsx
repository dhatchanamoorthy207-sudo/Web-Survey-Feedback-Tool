import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedPageProps {
  navigate: (path: string) => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied (403)</h1>
          <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">
            Insufficient Permissions
          </p>
          <p className="text-xs text-slate-500 pt-1">
            You do not have administrative privileges or ownership authorization to view or manipulate this resource.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            Go to User Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};
