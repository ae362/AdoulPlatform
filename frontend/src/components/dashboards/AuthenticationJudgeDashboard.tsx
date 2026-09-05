import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../Navbar';

export const AuthenticationJudgeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="text-3xl">⚖️</div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">القضايا المعلقة</p>
                <p className="text-3xl font-bold text-blue-600">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="text-3xl">✍️</div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">الأذونات الصادرة</p>
                <p className="text-3xl font-bold text-green-600">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="text-3xl">📋</div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">الطلبات الجديدة</p>
                <p className="text-3xl font-bold text-orange-600">-</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-8 text-right">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">مرحباً بك في لوحة القاضي المكلف بالتوثيق</h2>
          <p className="text-gray-600 leading-relaxed">
            من خلال هذه اللوحة، يمكنك إصدار الأذونات، مراجعة الطلبات، والإشراف على عمليات التوثيق في المحكمة.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-right">الإجراءات السريعة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-right">
              <div className="text-lg font-semibold">📝 الطلبات الجديدة</div>
              <p className="text-sm opacity-90 mt-1">مراجعة طلبات التوثيق</p>
            </button>
            
            <button className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-right">
              <div className="text-lg font-semibold">✅ إصدار الأذونات</div>
              <p className="text-sm opacity-90 mt-1">إصدار أذونات التوثيق</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
