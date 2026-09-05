import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import NotaryPortalWorkflow from '../pages/Notary/NotaryPortalWorkflow';

const NotaryPortalModule: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              بوابة الإشعارات القضائية
            </h2>
            <p className="mt-2 text-sm text-gray-600">نظام متابعة الإشعارات والطلبات القضائية</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-6 shadow">
        <NotaryPortalWorkflow />
      </div>
    </div>
  );
};

export default NotaryPortalModule;
