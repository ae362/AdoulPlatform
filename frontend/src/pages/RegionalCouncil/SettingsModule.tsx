import React, { useState } from 'react';
import { toast } from '../../components/common/ToastNotification';

interface Setting {
  id: string;
  label: string;
  description: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'toggle' | 'select';
  options?: { value: string; label: string }[];
}

const SettingsModule: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([
    {
      id: 'max_response_time',
      label: 'المدة القصوى للرد',
      description: 'أقصى مدة زمنية للرد على الإشعارات (بالساعات)',
      value: 48,
      type: 'number',
    },
    {
      id: 'enable_automated_responses',
      label: 'الردود الآلية',
      description: 'تفعيل نظام الردود الآلية للإشعارات',
      value: true,
      type: 'toggle',
    },
    {
      id: 'notification_type_prefix',
      label: 'بادئة رقم الإشعار',
      description: 'البادئة المستخدمة في ترقيم الإشعارات (مثال: GRC-TET)',
      value: 'GRC-TET',
      type: 'text',
    },
    {
      id: 'document_category',
      label: 'فئة الوثيقة',
      description: 'فئة الوثيقة الرسمية (N = Notification)',
      value: 'N',
      type: 'text',
    },
    {
      id: 'email_notifications',
      label: 'إشعارات البريد الإلكتروني',
      description: 'إرسال تنبيهات عند حدث جديد',
      value: true,
      type: 'toggle',
    },
    {
      id: 'archive_retention',
      label: 'فترة الاحتفاظ بالأرشيف',
      description: 'عدد السنوات المراد الاحتفاظ بها قبل الحذف',
      value: 7,
      type: 'number',
    },
    {
      id: 'user_permissions_level',
      label: 'مستوى صلاحيات المستخدمين',
      description: 'تحديد مستويات الوصول والتحكم',
      value: 'admin',
      type: 'select',
      options: [
        { value: 'viewer', label: 'عارض فقط' },
        { value: 'editor', label: 'محرر' },
        { value: 'manager', label: 'مدير' },
        { value: 'admin', label: 'مسؤول' },
      ],
    },
    {
      id: 'auto_closure_date',
      label: 'تاريخ الإغلاق التلقائي',
      description: 'إغلاق تلقائي للإشعارات بعد فترة محددة',
      value: 'daily',
      type: 'select',
      options: [
        { value: 'daily', label: 'يومي' },
        { value: 'weekly', label: 'أسبوعي' },
        { value: 'monthly', label: 'شهري' },
      ],
    },
  ]);

  const [savedMessage, setSavedMessage] = useState<string>('');

  const handleSettingChange = (id: string, newValue: any) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, value: newValue } : s
    ));
    setSavedMessage('');
  };

  const handleSaveSettings = () => {
    setSavedMessage('تم حفظ الإعدادات بنجاح ✅');
    setTimeout(() => setSavedMessage(''), 3000);
    toast.success('تم حفظ إعدادات المجلس الجهوي بنجاح');
  };

  const handleResetSettings = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية؟')) {
      location.reload();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-blue-950 mb-6">الإعدادات</h1>

      {/* Success Message */}
      {savedMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg">
          <p className="text-green-700 font-semibold">{savedMessage}</p>
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* General Settings Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 pb-3 border-b">الإعدادات العامة</h2>
          <div className="space-y-6">
            {settings.slice(0, 4).map(setting => (
              <div key={setting.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-blue-950 mb-1">{setting.label}</label>
                  <p className="text-xs text-gray-600">{setting.description}</p>
                </div>
                <div className="flex-1 md:flex-none md:min-w-48">
                  {setting.type === 'text' && (
                    <input
                      type="text"
                      value={setting.value as string}
                      onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                  )}
                  {setting.type === 'number' && (
                    <input
                      type="number"
                      value={setting.value as number}
                      onChange={(e) => handleSettingChange(setting.id, parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Access Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 pb-3 border-b">إدارة الوصول والصلاحيات</h2>
          <div className="space-y-6">
            {settings.slice(4, 6).map(setting => (
              <div key={setting.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-blue-950 mb-1">{setting.label}</label>
                  <p className="text-xs text-gray-600">{setting.description}</p>
                </div>
                <div className="flex-1 md:flex-none md:min-w-48">
                  {setting.type === 'toggle' && (
                    <button
                      onClick={() => handleSettingChange(setting.id, !(setting.value as boolean))}
                      className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                        setting.value
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                    >
                      {setting.value ? '✓ مفعل' : '✗ معطل'}
                    </button>
                  )}
                  {setting.type === 'number' && (
                    <input
                      type="number"
                      value={setting.value as number}
                      onChange={(e) => handleSettingChange(setting.id, parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 pb-3 border-b">الإعدادات المتقدمة</h2>
          <div className="space-y-6">
            {settings.slice(6).map(setting => (
              <div key={setting.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-blue-950 mb-1">{setting.label}</label>
                  <p className="text-xs text-gray-600">{setting.description}</p>
                </div>
                <div className="flex-1 md:flex-none md:min-w-48">
                  {setting.type === 'select' && setting.options && (
                    <select
                      value={setting.value as string}
                      onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    >
                      {setting.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 pb-3 border-b">إدارة المستخدمين</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-3">تحديد صلاحيات المستخدمين والأدوار:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                  إضافة مستخدم
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                  إدارة الأدوار
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                  تعديل الصلاحيات
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                  عرض سجل الأنشطة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backup and Security */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-950 mb-6 pb-3 border-b">النسخ الاحتياطية والأمان</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-950 mb-2">آخر نسخة احتياطية</p>
              <p className="text-sm text-gray-600 mb-3">2026-01-24 03:30</p>
              <button className="w-full px-3 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition font-semibold text-sm">
                نسخة احتياطية الآن
              </button>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-950 mb-2">حجم قاعدة البيانات</p>
              <p className="text-sm text-gray-600 mb-3">2.4 GB من 5 GB</p>
              <button className="w-full px-3 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition font-semibold text-sm">
                تنظيف البيانات
              </button>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-950 mb-2">التشفير</p>
              <p className="text-sm text-gray-600 mb-3">✓ مفعل (SSL/TLS)</p>
              <button className="w-full px-3 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition font-semibold text-sm">
                إعدادات الأمان
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveSettings}
            className="flex-1 px-6 py-3 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition font-semibold"
          >
            💾 حفظ جميع الإعدادات
          </button>
          <button
            onClick={handleResetSettings}
            className="flex-1 px-6 py-3 border-2 border-blue-950 text-blue-950 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            ↺ استعادة الافتراضيات
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
