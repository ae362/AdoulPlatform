import React, { useState } from 'react';

interface ArchiveItem {
  id: string;
  notificationNumber: string;
  notaryName: string;
  category: string;
  court: string;
  certificateType: string;
  archivedDate: string;
  decision: string;
}

const ArchiveModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Mock data
  const archiveItems: ArchiveItem[] = [
    {
      id: '1',
      notificationNumber: '2026/GRC-TET/N-00817',
      notaryName: 'محمد علي الزهراني',
      category: 'عدل',
      court: 'محكمة تطوان',
      certificateType: 'زواج',
      archivedDate: '2026-01-20',
      decision: 'موافق عليه',
    },
    {
      id: '2',
      notificationNumber: '2026/GRC-TET/N-00818',
      notaryName: 'فاطمة محمود',
      category: 'محكمة',
      court: 'محكمة الاستئناف',
      certificateType: 'طلاق',
      archivedDate: '2026-01-21',
      decision: 'موافق عليه',
    },
  ];

  const categories = [
    { value: 'all', label: 'جميع الفئات' },
    { value: 'عدل', label: 'حسب العدل' },
    { value: 'محكمة', label: 'حسب المحكمة' },
    { value: 'سنة', label: 'حسب السنة' },
    { value: 'نوع', label: 'حسب النوع' },
    { value: 'حالة', label: 'حسب الحالة' },
    { value: 'رقم_إداري', label: 'حسب الرقم الإداري' },
  ];

  const years = ['2024', '2025', '2026'];

  const filteredItems = archiveItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.notificationNumber.includes(searchTerm) ||
      item.notaryName.includes(searchTerm) ||
      item.court.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-red-950 mb-6">وحدة الأرشيف</h1>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">البحث</label>
            <input
              type="text"
              placeholder="رقم الإشعار أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">الفئة</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-red-950 text-white rounded-lg hover:bg-red-900 transition">
              بحث متقدم
            </button>
          </div>
        </div>
      </div>

      {/* Archive Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-red-950 text-white">
            <tr>
              <th className="px-6 py-4 text-right">رقم الإشعار</th>
              <th className="px-6 py-4 text-right">اسم العدل</th>
              <th className="px-6 py-4 text-right">المحكمة</th>
              <th className="px-6 py-4 text-right">نوع الشهادة</th>
              <th className="px-6 py-4 text-right">القرار</th>
              <th className="px-6 py-4 text-right">تاريخ الأرشيف</th>
              <th className="px-6 py-4 text-right">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{item.notificationNumber}</td>
                <td className="px-6 py-4">{item.notaryName}</td>
                <td className="px-6 py-4">{item.court}</td>
                <td className="px-6 py-4">{item.certificateType}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.decision === 'موافق عليه'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.decision}
                  </span>
                </td>
                <td className="px-6 py-4">{item.archivedDate}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm">
                      عرض
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
                      تحميل
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-red-950">
          <p className="text-sm text-gray-600 mb-2">إجمالي الأرشيف</p>
          <p className="text-3xl font-bold text-red-950">{filteredItems.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-green-500">
          <p className="text-sm text-gray-600 mb-2">الموافق عليها</p>
          <p className="text-3xl font-bold text-green-600">{filteredItems.filter(i => i.decision === 'موافق عليه').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-yellow-500">
          <p className="text-sm text-gray-600 mb-2">قيد المعالجة</p>
          <p className="text-3xl font-bold text-yellow-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-red-500">
          <p className="text-sm text-gray-600 mb-2">المرفوضة</p>
          <p className="text-3xl font-bold text-red-600">0</p>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModule;
