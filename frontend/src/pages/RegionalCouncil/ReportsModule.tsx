import React, { useState } from 'react';

const ReportsModule: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('monthly');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('يناير');

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const reportTypes = [
    { value: 'monthly', label: 'التقرير الشهري' },
    { value: 'annual', label: 'التقرير السنوي' },
    { value: 'statistics', label: 'تقرير الإحصائيات' },
    { value: 'effectiveness', label: 'تقرير فعالية المعالجة' },
    { value: 'workload', label: 'تقرير كثافة العمل' },
    { value: 'forecasting', label: 'تقرير التوقعات المستقبلية' },
  ];

  const mockReportData = {
    totalNotifications: 450,
    totalApproved: 380,
    totalRejected: 45,
    totalPostponed: 25,
    averageProcessingTime: 16,
    complianceRate: 84,
  };

  const handleDownloadReport = () => {
    alert(`تم تحميل التقرير: ${reportTypes.find(r => r.value === selectedReport)?.label} للسنة ${selectedYear}`);
  };

  const handleGenerateReport = () => {
    alert(`جاري توليد التقرير...`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-blue-950 mb-6">وحدة التقارير</h1>

      {/* Report Selection Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نوع التقرير</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          {selectedReport === 'monthly' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerateReport}
            className="flex-1 px-6 py-3 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition font-semibold"
          >
            توليد التقرير
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            تحميل PDF
          </button>
          <button className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
            تحميل Excel
          </button>
        </div>
      </div>

      {/* Report Preview Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-blue-950 mb-6">معاينة التقرير</h2>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-xs text-blue-700 mb-1">إجمالي الإشعارات</p>
            <p className="text-2xl font-bold text-blue-900">{mockReportData.totalNotifications}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-xs text-green-700 mb-1">الموافق عليها</p>
            <p className="text-2xl font-bold text-green-900">{mockReportData.totalApproved}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-xs text-red-700 mb-1">المرفوضة</p>
            <p className="text-2xl font-bold text-red-900">{mockReportData.totalRejected}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-yellow-700 mb-1">المؤجلة</p>
            <p className="text-2xl font-bold text-yellow-900">{mockReportData.totalPostponed}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
            <p className="text-xs text-purple-700 mb-1">متوسط المعالجة</p>
            <p className="text-2xl font-bold text-purple-900">{mockReportData.averageProcessingTime}h</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-xs text-orange-700 mb-1">معدل الامتثال</p>
            <p className="text-2xl font-bold text-orange-900">{mockReportData.complianceRate}%</p>
          </div>
        </div>

        {/* Detailed Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="px-6 py-3 text-right">المؤشر</th>
                <th className="px-6 py-3 text-right">هذا الشهر</th>
                <th className="px-6 py-3 text-right">الشهر السابق</th>
                <th className="px-6 py-3 text-right">نسبة التغير</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">إجمالي الإشعارات</td>
                <td className="px-6 py-3">450</td>
                <td className="px-6 py-3">420</td>
                <td className="px-6 py-3"><span className="text-green-600 font-semibold">+7.1%</span></td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">معدل الموافقة</td>
                <td className="px-6 py-3">84.4%</td>
                <td className="px-6 py-3">82.1%</td>
                <td className="px-6 py-3"><span className="text-green-600 font-semibold">+2.3%</span></td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">متوسط وقت المعالجة</td>
                <td className="px-6 py-3">16 ساعة</td>
                <td className="px-6 py-3">18 ساعة</td>
                <td className="px-6 py-3"><span className="text-green-600 font-semibold">-11.1%</span></td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">العدول النشطين</td>
                <td className="px-6 py-3">156</td>
                <td className="px-6 py-3">155</td>
                <td className="px-6 py-3"><span className="text-green-600 font-semibold">+0.6%</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">الالتزام بالمدة</td>
                <td className="px-6 py-3">92%</td>
                <td className="px-6 py-3">90%</td>
                <td className="px-6 py-3"><span className="text-green-600 font-semibold">+2.2%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-r-4 border-blue-500">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold text-gray-700">إرسال تقرير</p>
          <p className="text-xs text-gray-500 mt-2">عبر البريد الإلكتروني</p>
        </button>
        <button className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-r-4 border-green-500">
          <p className="text-2xl mb-2">📈</p>
          <p className="font-semibold text-gray-700">مقارنة سنوية</p>
          <p className="text-xs text-gray-500 mt-2">مع السنة الماضية</p>
        </button>
        <button className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-r-4 border-purple-500">
          <p className="text-2xl mb-2">📋</p>
          <p className="font-semibold text-gray-700">تقارير مخصصة</p>
          <p className="text-xs text-gray-500 mt-2">حسب المعايير</p>
        </button>
        <button className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-r-4 border-orange-500">
          <p className="text-2xl mb-2">🔔</p>
          <p className="font-semibold text-gray-700">جدولة التقارير</p>
          <p className="text-xs text-gray-500 mt-2">تقارير دورية</p>
        </button>
      </div>
    </div>
  );
};

export default ReportsModule;
