import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح</h1>
        <p className="text-gray-600 mb-6">
          ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    </div>
  );
};
