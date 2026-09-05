import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../trpc';
import { ReturnToLandingButton } from '../common/ReturnToLandingButton';

type UserRole = 'government_authority' | 'national_notary_authority' | 'authentication_judge' | 'notary';

interface Partner {
  partner_name: string;
  contact_info: string;
  position_order: number;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    role: 'notary' as UserRole,
    full_name: '',
    appointment_decree_number: '',
    cin: '',
    tax_id: '',
    dob: '',
    appellate_court: '', // محكمة الاستئناف (ALWAYS REQUIRED)
    primary_court: '', // المحكمة الابتدائية (CONDITIONAL)
    phone: '',
    office_address: '',
  });

  const [partners, setPartners] = useState<Partner[]>([]);
  const [showPrimaryCourtSearch, setShowPrimaryCourtSearch] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();
  
  // Get all appellate courts
  const { data: appellateCourts, isLoading: appellateLoading } = trpc.auth.getAppellateCourts.useQuery(
    undefined,
    { enabled: formData.role === 'notary' }
  );

  // Get primary courts for selected appellate court
  const { data: primaryCourtsData, isLoading: primaryLoading } = trpc.auth.getPrimaryCourts.useQuery(
    { appellateCourt: formData.appellate_court },
    { enabled: formData.role === 'notary' && showPrimaryCourtSearch && formData.appellate_court !== '' }
  );

  const isNotaryRole = formData.role === 'notary';
  const primaryCourts = primaryCourtsData && !('error' in primaryCourtsData) 
    ? primaryCourtsData.primary_courts 
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAppellateCourtChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const appellateCourt = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      appellate_court: appellateCourt,
      primary_court: '' // Reset primary court when appellate changes
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setShowPrimaryCourtSearch(checked);
    if (!checked) {
      setFormData(prev => ({ ...prev, primary_court: '' }));
    }
  };

  const addPartner = () => {
    if (partners.length < 4) {
      setPartners([...partners, { partner_name: '', contact_info: '', position_order: partners.length + 1 }]);
    }
  };

  const removePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index).map((p, i) => ({ ...p, position_order: i + 1 })));
  };

  const updatePartner = (index: number, field: keyof Partner, value: string) => {
    const updated = [...partners];
    updated[index] = { ...updated[index], [field]: value };
    setPartners(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Determine final court values
      const courtType = showPrimaryCourtSearch && formData.primary_court ? 'first_instance' : 'appellate';
      const courtName = showPrimaryCourtSearch && formData.primary_court 
        ? formData.primary_court 
        : formData.appellate_court;

      const payload: any = {
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role,
        full_name: formData.full_name,
      };

      if (isNotaryRole) {
        payload.appointment_decree_number = formData.appointment_decree_number;
        payload.cin = formData.cin || undefined;
        payload.tax_id = formData.tax_id || undefined;
        payload.dob = formData.dob || undefined;
        payload.appellate_court = formData.appellate_court; // Always send appellate court
        payload.primary_court = showPrimaryCourtSearch && formData.primary_court ? formData.primary_court : null;
        payload.court_type = courtType;
        payload.court_name = courtName;
        payload.phone = formData.phone || undefined;
        payload.office_address = formData.office_address || undefined;

        if (partners.length > 0) {
          payload.partners = partners.filter(p => p.partner_name.trim() !== '');
        }
      }

      await registerMutation.mutateAsync(payload);
      setSuccess('تم التسجيل بنجاح! جارٍ تحويلك إلى صفحة تسجيل الدخول...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'فشل التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <ReturnToLandingButton className="mb-5" />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إنشاء حساب جديد</h1>
          <p className="text-gray-600">نظام إدارة العدول - تسجيل العدل فقط</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-right">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-right">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل للعدل *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="الاسم الكامل"
            />
          </div>

          {/* Appointment Decree Number */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              قرار التعيين رقم *
            </label>
            <input
              type="text"
              name="appointment_decree_number"
              value={formData.appointment_decree_number}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="رقم قرار التعيين"
            />
          </div>

          {/* CIN + Tax ID + DOB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">رقم ب.ت.و (CIN)</label>
              <input
                type="text"
                name="cin"
                value={formData.cin}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                placeholder="مثال: AB123456"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">رقم التعريف الضريبي</label>
              <input
                type="text"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                placeholder="مثال: 12345678"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">تاريخ الازدياد</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              />
            </div>
          </div>

          {/* Appellate Court (ALWAYS REQUIRED) */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              محكمة الاستئناف *
            </label>
            <select
              name="appellate_court"
              value={formData.appellate_court}
              onChange={handleAppellateCourtChange}
              required
              disabled={appellateLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right disabled:bg-gray-100"
            >
              <option value="">اختر محكمة الاستئناف</option>
              {appellateCourts?.map((court) => (
                <option key={court} value={court}>
                  {court}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox for Primary Court Search */}
          <div className="flex items-center justify-end gap-3">
            <label className="text-sm font-medium text-gray-700 cursor-pointer">
              هل تريد البحث بالمحاكم الابتدائية
            </label>
            <input
              type="checkbox"
              checked={showPrimaryCourtSearch}
              onChange={handleCheckboxChange}
              disabled={!formData.appellate_court}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 cursor-pointer"
            />
          </div>

          {/* Primary Court (CONDITIONAL - only if checkbox checked) */}
          {showPrimaryCourtSearch && formData.appellate_court && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                المحكمة الابتدائية
              </label>
              <select
                name="primary_court"
                value={formData.primary_court}
                onChange={handleInputChange}
                disabled={primaryLoading || primaryCourts.length === 0}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right disabled:bg-gray-100"
              >
                <option value="">اختر المحكمة الابتدائية</option>
                {primaryCourts.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
              {primaryLoading && (
                <p className="text-xs text-blue-600 text-right mt-1">جارٍ تحميل المحاكم الابتدائية...</p>
              )}
              {!primaryLoading && primaryCourts.length === 0 && (
                <p className="text-xs text-red-600 text-right mt-1">لا توجد محاكم ابتدائية متاحة</p>
              )}
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="رقم الهاتف"
              dir="ltr"
            />
          </div>

          {/* Office Address */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              عنوان المكتب
            </label>
            <textarea
              name="office_address"
              value={formData.office_address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="عنوان المكتب"
            />
          </div>

          {/* Partners Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={addPartner}
                disabled={partners.length >= 4}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                + إضافة شريك
              </button>
              <h3 className="text-lg font-semibold text-gray-800">الرفيق أو الشريك (0-4 أشخاص)</h3>
            </div>

            {partners.map((partner, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <button
                    type="button"
                    onClick={() => removePartner(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    حذف
                  </button>
                  <h4 className="font-medium text-gray-700">شريك {index + 1}</h4>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={partner.partner_name}
                    onChange={(e) => updatePartner(index, 'partner_name', e.target.value)}
                    placeholder="اسم الشريك"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right"
                  />
                  <input
                    type="text"
                    value={partner.contact_info}
                    onChange={(e) => updatePartner(index, 'contact_info', e.target.value)}
                    placeholder="معلومات الاتصال"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Email */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              placeholder="example@domain.com"
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              كلمة المرور *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              dir="ltr"
              style={{ fontFamily: 'caption, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left tracking-wider"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              يجب أن تحتوي على حرف كبير وحرف صغير ورقم
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور *
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              required
              dir="ltr"
              style={{ fontFamily: 'caption, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left tracking-wider"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جارٍ التسجيل...' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            لديك حساب بالفعل؟{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              سجل الدخول
            </a>
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-gray-600 text-right">
            ⚠️ ملاحظة: هذا النموذج متاح فقط لتسجيل العدول. الأدوار الأخرى (السلطة الحكومية، الهيئة الوطنية للعدول، القاضي المكلف بالتوثيق) لها نظام تسجيل داخلي خاص وسري.
          </p>
        </div>
      </div>
    </div>
  );
};
