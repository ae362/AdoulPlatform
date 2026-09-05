import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';

interface DashboardStats {
  totalIncoming: number;
  totalApproved: number;
  totalRejected: number;
  totalPostponed: number;
  averageProcessingTime: number;
}

const COLORS = ['#E6BE8A', '#8B3A3A', '#D4AF37', '#A0522D', '#8B4513'];

const NotificationDashboard: React.FC = () => {
  // Fetch real data from tRPC
  const { data: notificationStats, isLoading, error } = trpc.notifications.getDashboardStats.useQuery(
    { year: new Date().getFullYear() },
    { 
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: true 
    }
  );

  const { data: monthlyData } = trpc.notifications.getMonthlyStats.useQuery(
    { year: new Date().getFullYear() },
    { 
      refetchInterval: 300000,
      retry: true 
    }
  );

  // Fallback to default values if data not loaded
  const stats: DashboardStats = useMemo(() => {
    if (!notificationStats) {
      return {
        totalIncoming: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalPostponed: 0,
        averageProcessingTime: 0,
      };
    }
    return {
      totalIncoming: notificationStats.totalIncoming || 0,
      totalApproved: notificationStats.totalApproved || 0,
      totalRejected: notificationStats.totalRejected || 0,
      totalPostponed: notificationStats.totalPostponed || 0,
      averageProcessingTime: Math.round(notificationStats.averageProcessingTime || 0),
    };
  }, [notificationStats]);

  const kpiData = [
    { label: 'عدد الإشعارات الواردة', value: stats.totalIncoming, icon: '📬' },
    { label: 'عدد الموافق عليها', value: stats.totalApproved, icon: '✅' },
    { label: 'عدد المرفوضة', value: stats.totalRejected, icon: '❌' },
    { label: 'عدد المؤجلة', value: stats.totalPostponed, icon: '⏳' },
    { label: 'متوسط زمن المعالجة', value: `${stats.averageProcessingTime} ساعة`, icon: '⏱️' },
  ];

  const chartData = [
    { name: 'موافق', value: stats.totalApproved, percentage: stats.totalIncoming > 0 ? Math.round((stats.totalApproved / stats.totalIncoming) * 100) : 0 },
    { name: 'مرفوض', value: stats.totalRejected, percentage: stats.totalIncoming > 0 ? Math.round((stats.totalRejected / stats.totalIncoming) * 100) : 0 },
    { name: 'مؤجل', value: stats.totalPostponed, percentage: stats.totalIncoming > 0 ? Math.round((stats.totalPostponed / stats.totalIncoming) * 100) : 0 },
  ];

  // Timeline data from real database
  const timelineData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return [];
    }
    return monthlyData;
  }, [monthlyData]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-950">لوحة قيادة الإشعارات القضائية</h1>
        {isLoading && <span className="text-sm text-blue-600 animate-pulse">🔄 جاري تحديث البيانات...</span>}
        {error && <span className="text-sm text-red-600">⚠️ خطأ في تحميل البيانات</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpiData.map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg shadow-md p-6 border-r-4 border-blue-950 ${isLoading ? 'opacity-50' : ''}`}
          >
            <div className="text-3xl mb-2">{kpi.icon}</div>
            <p className="text-gray-600 text-sm mb-2">{kpi.label}</p>
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-2xl font-bold text-blue-950">{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Decision Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-blue-950 mb-6">توزيع القرارات</h2>
          <div className="space-y-4">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-blue-950">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[idx],
                      }}
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-600 min-w-fit">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-blue-950 mb-4">ملخص الحالات</h2>
          <div className="space-y-3">
            {[
              { label: 'موافق عليه', value: stats.totalApproved, color: 'bg-green-100 border-l-4 border-green-500' },
              { label: 'مرفوض', value: stats.totalRejected, color: 'bg-red-100 border-l-4 border-red-500' },
              { label: 'مؤجل', value: stats.totalPostponed, color: 'bg-yellow-100 border-l-4 border-yellow-500' },
              { label: 'قيد المعالجة', value: stats.totalIncoming - stats.totalApproved - stats.totalRejected - stats.totalPostponed, color: 'bg-blue-100 border-l-4 border-blue-500' },
            ].map((item, idx) => (
              <div key={idx} className={`p-4 rounded ${item.color}`}>
                <div className="flex justify-between">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-lg font-bold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Chart - Simple Text-based */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-950 mb-6">الإشعارات الشهرية</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : timelineData && timelineData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="px-4 py-3 text-right">الشهر</th>
                  <th className="px-4 py-3 text-right">إجمالي</th>
                  <th className="px-4 py-3 text-right">موافق</th>
                  <th className="px-4 py-3 text-right">مرفوض</th>
                  <th className="px-4 py-3 text-right">مؤجل</th>
                </tr>
              </thead>
              <tbody>
                {timelineData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{row.month}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold">{row.total || row.notifications}</td>
                    <td className="px-4 py-3 text-green-600 font-bold">{row.approved}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{row.rejected}</td>
                    <td className="px-4 py-3 text-yellow-600 font-bold">{row.postponed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>📊 لا توجد بيانات متاحة حالياً</p>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-blue-950 mb-4">خيارات التصدير</h2>
        <div className="flex gap-4 flex-wrap">
          <button className="px-6 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition">
            تصدير إلى PDF
          </button>
          <button className="px-6 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition">
            تصدير إلى Excel
          </button>
          <button className="px-6 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition">
            مقارنة سنة/سنة
          </button>
          <button className="px-6 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition">
            مقارنة شهر/شهر
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDashboard;
