import React from 'react';
import { FileQuestion, Home } from 'lucide-react';

interface NotFoundPageProps {
  navigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Page Not Found (404)</h1>
          <p className="text-xs text-slate-500 pt-1">
            The page or survey campaign you requested does not exist or may have been deleted.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
