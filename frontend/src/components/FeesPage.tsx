import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const FeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('marriage');
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation menu items
  const menuItems = [
    { label: 'لوحة التحكم', id: 'dashboard', href: '#' },
    { label: 'نسخ الرسوم العدلية', id: 'copies', href: '#' },
    { label: 'بوابة تدبير طلبات الإذن', id: 'work-certificates', href: '#' },
    { label: 'أسماء العدول', id: 'notary-names', href: '#' },
    { label: 'تحرير الرسوم', id: 'edit-fees', href: '#' },
    { label: 'مسارات قانونية', id: 'legal-paths', href: '#' },
    { label: 'تلقي الشهادات العدلية و تحريرها', id: 'main-service', href: '#', isHighlighted: true },
    { label: 'احصائيات', id: 'statistics', href: '#' },
    { label: 'ملفات', id: 'files', href: '#' },
    { label: 'نماذج العقود', id: 'contract-models', href: '#' },
    { label: 'مخالفات', id: 'violations', href: '#' },
    { label: 'التسجيل و البحث', id: 'registration', href: '#' },
  ];

  // Fee data structure
  const feeTypes = {
    marriage: {
      title: 'رسوم الزواج',
      icon: '💍',
      items: [
        { name: 'عقد زواج', amount: 50, notes: 'بما فيه النسخة' },
        { name: 'خطبة', amount: 30, notes: '' },
        { name: 'إثبات زواج', amount: 25, notes: '' },
      ]
    },
    divorce: {
      title: 'رسوم الطلاق',
      icon: '📋',
      items: [
        { name: 'طلاق اتفاقي', amount: 75, notes: '' },
        { name: 'خلع', amount: 80, notes: '' },
        { name: 'رجعة', amount: 40, notes: '' },
      ]
    },
    property: {
      title: 'رسوم الأملاك',
      icon: '🏠',
      items: [
        { name: 'بيع وشراء', amount: 100, notes: '' },
        { name: 'هبة', amount: 60, notes: '' },
        { name: 'مقاسمة', amount: 70, notes: '' },
        { name: 'صدقة', amount: 50, notes: '' },
      ]
    },
    inheritance: {
      title: 'رسوم التركات',
      icon: '📜',
      items: [
        { name: 'إحصاء متروك', amount: 90, notes: '' },
        { name: 'إراثات', amount: 85, notes: '' },
        { name: 'ثبوت مخلف', amount: 75, notes: '' },
        { name: 'وصايا', amount: 55, notes: '' },
      ]
    },
    documents: {
      title: 'باقي الوثائق',
      icon: '📄',
      items: [
        { name: 'توكيلات', amount: 45, notes: '' },
        { name: 'رهن', amount: 55, notes: '' },
        { name: 'إصلاح', amount: 40, notes: '' },
        { name: 'كفالة', amount: 50, notes: '' },
        { name: 'رسم دين', amount: 35, notes: '' },
      ]
    },
  };

  const currentFees = feeTypes[activeTab as keyof typeof feeTypes];

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-md py-8 border-b-4 border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">الرسوم العدلية</h1>
            <p className="text-gray-600">النظام الذكي للتدبير و للادارة الوثائقية للرسوم العدلية</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">
        {/* Left Sidebar - Navigation Menu */}
        <div className="w-56 bg-gray-800 text-white p-6 shadow-lg sticky top-0 h-screen overflow-y-auto">
          <h2 className="text-2xl font-bold mb-8 pb-4 border-b border-gray-600">القائمة الرئيسية</h2>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'main-service') {
                    navigate('/fees');
                  }
                }}
                className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                  item.isHighlighted
                    ? 'bg-gray-600 text-white border-r-4 border-yellow-400 font-bold'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن نوع الرسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-96 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-gray-700"
              />
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Fee Categories Tabs */}
          <div className="mb-8 flex flex-wrap gap-3">
            {Object.entries(feeTypes).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  activeTab === key
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'bg-white text-gray-800 border-2 border-gray-300 hover:border-gray-800'
                }`}
              >
                {value.icon} {value.title}
              </button>
            ))}
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-gray-800">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{currentFees.title}</h2>

            {/* Fees Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-200 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-4 py-4 text-gray-800 font-bold">#</th>
                    <th className="px-4 py-4 text-gray-800 font-bold">نوع الرسم</th>
                    <th className="px-4 py-4 text-gray-800 font-bold">المبلغ (درهم)</th>
                    <th className="px-4 py-4 text-gray-800 font-bold">ملاحظات</th>
                    <th className="px-4 py-4 text-gray-800 font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentFees.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-gray-700">{index + 1}</td>
                      <td className="px-4 py-4 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-4 py-4 text-gray-700">{item.amount}</td>
                      <td className="px-4 py-4 text-gray-600">{item.notes || '-'}</td>
                      <td className="px-4 py-4">
                        <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-bold text-sm">
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Box */}
            <div className="mt-8 bg-gradient-to-r from-gray-100 to-gray-50 p-6 rounded-lg border-l-4 border-gray-800">
              <h3 className="text-xl font-bold text-gray-800 mb-4">ملخص الفئة</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm">عدد الرسوم</p>
                  <p className="text-3xl font-bold text-gray-800">{currentFees.items.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm">أعلى مبلغ</p>
                  <p className="text-3xl font-bold text-gray-800">{Math.max(...currentFees.items.map(i => i.amount))}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm">متوسط المبلغ</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {Math.round(currentFees.items.reduce((sum, i) => sum + i.amount, 0) / currentFees.items.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4 justify-end">
            <button className="px-8 py-3 bg-white border-2 border-gray-800 text-gray-800 rounded-lg font-bold hover:bg-gray-50 transition-colors">
              تصدير بصيغة PDF
            </button>
            <button className="px-8 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors">
              حفظ التغييرات
            </button>
          </div>
        </div>

        {/* Right Sidebar - AI Info Panel */}
        <div className="w-64 bg-yellow-50 p-6 border-l-4 border-yellow-400 shadow-lg sticky top-0 h-screen overflow-y-auto hidden lg:block">
          <h3 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b-2 border-yellow-300">مساعد ذكي</h3>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border-r-4 border-yellow-400">
              <p className="text-xs text-gray-600 mb-2 font-bold">💡 نصيحة قانونية</p>
              <p className="text-sm text-gray-800">تأكد من توافق الرسوم المحتسبة مع قانون التسجيل والتمبر الحالي.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-r-4 border-yellow-400">
              <p className="text-xs text-gray-600 mb-2 font-bold">⚠️ تحديث قانوني</p>
              <p className="text-sm text-gray-800">تم تحديث الرسوم بتاريخ 01/12/2025 وفقًا لآخر التعديلات.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-r-4 border-yellow-400">
              <p className="text-xs text-gray-600 mb-2 font-bold">📊 إحصائيات</p>
              <p className="text-sm text-gray-800">تم تنفيذ 127 عملية من نوع الرسم المختار هذا الشهر.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-r-4 border-yellow-400">
              <p className="text-xs text-gray-600 mb-2 font-bold">🔔 تنبيهات إلزامية</p>
              <p className="text-sm text-gray-800">يجب التأكد من تسجيل جميع الرسوم بمصلحة الضرائب.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>© 2025 الهيئة الوطنية للعدول - المملكة المغربية. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};
