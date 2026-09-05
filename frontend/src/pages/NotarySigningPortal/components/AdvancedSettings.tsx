import React, { useState } from 'react';
import { X, Palette, Lock, Pen, Eye, Save, AlertCircle, ToggleLeft } from 'lucide-react';

interface AdvancedSettingsProps {
  onClose: () => void;
}

type SettingsTab = 'identity' | 'security' | 'signature' | 'display';

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [settings, setSettings] = useState({
    primaryColor: '#3b82f6',
    secondaryColor: '#a855f7',
    enableDarkMode: false,
    preventDelete: true,
    preventEdit: true,
    activityLog: true,
    twoFactorAuth: true,
    qrCodeValidity: 365,
    enableOTP: true,
    wacomBinding: true,
    signaturePNG: true,
    signatureQuality: 'high',
    compareSignature: true,
    qualityAlert: true,
    cardsPerPage: '6',
    displayStyle: 'cards',
    defaultSort: 'recent',
  });

  const settingsTabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode; emoji: string }> = [
    { id: 'identity', label: 'الهوية والألوان', icon: <Palette className="w-4 h-4" />, emoji: '🎨' },
    { id: 'security', label: 'الأمان والحماية', icon: <Lock className="w-4 h-4" />, emoji: '🔐' },
    { id: 'signature', label: 'التوقيع الرقمي', icon: <Pen className="w-4 h-4" />, emoji: '🖊' },
    { id: 'display', label: 'العرض والتخطيط', icon: <Eye className="w-4 h-4" />, emoji: '🖥' },
  ];

  const handleSave = () => {
    // In real implementation, this would save to database
    console.log('Settings saved:', settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 z-50">
          <div>
            <h2 className="text-3xl font-black text-slate-900">⚙️ الإعدادات المتقدمة</h2>
            <p className="text-sm text-slate-600 mt-1">تخصيص النظام وفقاً لاحتياجاتك الأمنية والتشغيلية</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 px-8 bg-white">
          <div className="flex gap-2 overflow-x-auto">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
                title={`${tab.emoji} ${tab.label}`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50">
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <SettingGroup label="🎨 إعدادات الهوية البصرية">
                <div className="space-y-4">
                  <SettingItem label="اللون الأساسي (Primary)" value={
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) =>
                          setSettings({ ...settings, primaryColor: e.target.value })
                        }
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-300 hover:border-blue-500"
                      />
                      <code className="text-xs bg-slate-200 px-2 py-1 rounded">{settings.primaryColor}</code>
                    </div>
                  } description="الأزرق المتدرج الرئيسي للواجهة" />

                  <SettingItem label="اللون الثانوي (Secondary)" value={
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.secondaryColor}
                        onChange={(e) =>
                          setSettings({ ...settings, secondaryColor: e.target.value })
                        }
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-300 hover:border-purple-500"
                      />
                      <code className="text-xs bg-slate-200 px-2 py-1 rounded">{settings.secondaryColor}</code>
                    </div>
                  } description="البنفسجي الرقمي للتفاصيل" />

                  <SettingItem
                    label="الوضع الليلي (Dark Mode)"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableDarkMode}
                          onChange={(e) =>
                            setSettings({ ...settings, enableDarkMode: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.enableDarkMode ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="تطبيق المظهر الداكن على كامل الواجهة"
                  />
                </div>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <SettingGroup label="🔐 إعدادات الأمان والحماية">
                <div className="space-y-4">
                  <SettingItem
                    label="منع الحذف والإزالة"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preventDelete}
                          onChange={(e) =>
                            setSettings({ ...settings, preventDelete: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.preventDelete ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="منع حذف الوثائق بعد التضمين"
                  />

                  <SettingItem
                    label="منع التعديل بعد التضمين"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preventEdit}
                          onChange={(e) =>
                            setSettings({ ...settings, preventEdit: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.preventEdit ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="تجميد الوثائق بعد التضمين"
                  />

                  <SettingItem
                    label="تسجيل سجل الحركات"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.activityLog}
                          onChange={(e) =>
                            setSettings({ ...settings, activityLog: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.activityLog ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="تسجيل جميع الأنشطة في السجل الأمني"
                  />

                  <SettingItem
                    label="المصادقة الثنائية (2FA)"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.twoFactorAuth}
                          onChange={(e) =>
                            setSettings({ ...settings, twoFactorAuth: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.twoFactorAuth ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="تفعيل المصادقة الثنائية عند التوقيع"
                  />

                  <SettingItem
                    label="صلاحية رابط QR (أيام)"
                    value={
                      <input
                        type="number"
                        value={settings.qrCodeValidity}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            qrCodeValidity: parseInt(e.target.value),
                          })
                        }
                        min="1"
                        max="730"
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    }
                    description="عدد الأيام لصلاحية رموز QR"
                  />

                  <SettingItem
                    label="تفعيل OTP (One-Time Password)"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableOTP}
                          onChange={(e) =>
                            setSettings({ ...settings, enableOTP: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.enableOTP ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="استخدام كلمات مرور لمرة واحدة"
                  />
                </div>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'signature' && (
            <div className="space-y-6">
              <SettingGroup label="🖊 إعدادات التوقيع الرقمي">
                <div className="space-y-4">
                  <SettingItem
                    label="ربط قلم Wacom STU-540"
                    value={
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full animate-pulse ${
                            settings.wacomBinding ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        ></div>
                        <span className="text-sm font-bold">
                          {settings.wacomBinding ? '● متصل' : '● غير متصل'}
                        </span>
                      </div>
                    }
                    description="حالة الاتصال الحالية بقلم Wacom"
                  />

                  <SettingItem
                    label="دقة التوقيع"
                    value={
                      <select
                        value={settings.signatureQuality}
                        onChange={(e) =>
                          setSettings({ ...settings, signatureQuality: e.target.value })
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">منخفضة (Fast)</option>
                        <option value="medium">متوسطة (Standard)</option>
                        <option value="high">عالية (High Resolution)</option>
                      </select>
                    }
                    description="مستوى دقة التوقيع المُسجَّل"
                  />

                  <SettingItem
                    label="حفظ التوقيع كـ PNG"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.signaturePNG}
                          onChange={(e) =>
                            setSettings({ ...settings, signaturePNG: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.signaturePNG ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="حفظ صورة التوقيع كملف PNG"
                  />

                  <SettingItem
                    label="مقارنة التوقيعات"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.compareSignature}
                          onChange={(e) =>
                            setSettings({ ...settings, compareSignature: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.compareSignature ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="المقارنة الآلية بين التوقيعات"
                  />

                  <SettingItem
                    label="تنبيه ضعف جودة التوقيع"
                    value={
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.qualityAlert}
                          onChange={(e) =>
                            setSettings({ ...settings, qualityAlert: e.target.checked })
                          }
                          className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {settings.qualityAlert ? '✓ مفعّل' : '○ معطّل'}
                        </span>
                      </label>
                    }
                    description="تنبيه عند اكتشاف ضعف في جودة التوقيع"
                  />
                </div>
              </SettingGroup>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              <SettingGroup label="🖥 إعدادات العرض والتخطيط">
                <div className="space-y-4">
                  <SettingItem
                    label="عدد البطاقات في الصفحة"
                    value={
                      <select
                        value={settings.cardsPerPage}
                        onChange={(e) =>
                          setSettings({ ...settings, cardsPerPage: e.target.value })
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="4">4 بطاقات</option>
                        <option value="6">6 بطاقات (الافتراضي)</option>
                        <option value="8">8 بطاقات</option>
                      </select>
                    }
                    description="عدد البطاقات المعروضة في صفحة واحدة"
                  />

                  <SettingItem
                    label="نمط العرض"
                    value={
                      <select
                        value={settings.displayStyle}
                        onChange={(e) =>
                          setSettings({ ...settings, displayStyle: e.target.value })
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cards">بطاقات مفصولة (Cards)</option>
                        <option value="compact">صفوف مضغوطة (Compact)</option>
                        <option value="list">قائمة (List)</option>
                      </select>
                    }
                    description="طريقة عرض البيانات في الأرشيف"
                  />

                  <SettingItem
                    label="الترتيب الافتراضي"
                    value={
                      <select
                        value={settings.defaultSort}
                        onChange={(e) =>
                          setSettings({ ...settings, defaultSort: e.target.value })
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="recent">الأحدث أولاً</option>
                        <option value="oldest">الأقدم أولاً</option>
                        <option value="name">الترتيب الأبجدي</option>
                        <option value="status">حسب الحالة</option>
                      </select>
                    }
                    description="ترتيب عرض الوثائق عند الفتح"
                  />
                </div>
              </SettingGroup>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-8 py-4 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            التعديلات ستُطبق فوراً على الجلسة الحالية
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-700 font-bold hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all flex items-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" />
              حفظ الإعدادات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingGroupProps {
  label: string;
  children: React.ReactNode;
}

const SettingGroup: React.FC<SettingGroupProps> = ({ label, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
    <h3 className="font-bold text-slate-900 mb-4 text-lg">{label}</h3>
    {children}
  </div>
);

interface SettingItemProps {
  label: string;
  value: React.ReactNode;
  description?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, value, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex-1">
      <span className="text-sm font-bold text-slate-900">{label}</span>
      {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
    </div>
    <div className="ml-4 flex-shrink-0">
      {value}
    </div>
  </div>
);
