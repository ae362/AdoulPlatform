import React, { useState, useEffect } from 'react';
import { DailyLedgerModule } from '../../modules/DailyLedger';
import { useAuth } from '../../contexts/AuthContext';
import { trpc } from '../../trpc';

interface NotificationWithWorkflow {
  id: string;
  // Phase 1: Creation
  requestNumber: string;
  notaryFullName: string;
  professionalNumber: string;
  officeNumber: string;
  jurisdiction: string;
  targetCourt: string;
  certificateType: string;
  reasonForMovement: string;
  requestedDuration: number;
  durationUnit: string;
  attachments?: string[];
  notes?: string;
  submissionDate: string;
  submissionTime: string;

  // Phase 2: Processing
  phase: 'قيد_المعالجة' | 'قيد_المعالجة_مع_استعلام' | 'القرار_النهائي' | 'وثيقة_رسمية' | 'مرسل_للعدل';
  councilInternalNotes?: string;
  councilEvaluation?: string;
  assignedTo?: string;

  // Phase 3: Decision
  decisionType?: 'موافقة' | 'موافقة_مع_شروط' | 'رفض' | 'تأجيل';
  decisionReasoning?: string;
  conditions?: string[];
  decidedDate?: string;

  // Phase 4: Official Document
  documentNumber?: string;
  documentContent?: string;
  qrCode?: string;
  digitalSignature?: boolean;
  electronicSeal?: boolean;
  issuedDate?: string;

  // Phase 5: Response
  sharedWithNotary?: boolean;
  viewedByNotary?: boolean;
  viewedDate?: string;
  printCount?: number;
  shareToken?: string;
}

const NotaryPortal: React.FC = () => {
  const { user, sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'responses' | 'archive' | 'dashboard' | 'ledger'>('dashboard');
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    professionalNumber: '',
    officeNumber: '',
    jurisdiction: '',
    targetCourt: '',
    certificateType: '',
    reasonForMovement: '',
    requestedDuration: '',
    durationUnit: 'يوم',
    notes: '',
    attachments: '',
  });

  // Fetch real notifications
  const { data: notificationsList, isLoading, refetch } = trpc.notifications.getRequestsList.useQuery(
    { notaryId: user?.id, limit: 100 },
    { enabled: !!user?.id }
  );

  const createNotification = trpc.notifications.createNotification.useMutation({
    onSuccess: () => {
      alert('تم إرسال الإشعار بنجاح. سيتم معالجته من قبل المجلس الجهوي.');
      refetch();
      setFormData({
        fullName: user?.full_name || '',
        professionalNumber: '',
        officeNumber: '',
        jurisdiction: '',
        targetCourt: '',
        certificateType: '',
        reasonForMovement: '',
        requestedDuration: '',
        durationUnit: 'يوم',
        notes: '',
        attachments: '',
      });
      setActiveTab('list');
    },
    onError: (err) => {
      alert('فشل إرسال الإشعار: ' + err.message);
    }
  });

  useEffect(() => {
     if (user?.full_name && !formData.fullName) {
        setFormData(prev => ({ ...prev, fullName: user.full_name }));
     }
  }, [user]);

  // Transform data to UI format
  const notaryRequests = (notificationsList || []).map((n: any) => ({
    id: n.id,
    requestNumber: n.request_number,
    targetCourt: n.target_court || n.jurisdiction,
    certificateType: n.certificate_type,
    submissionDate: new Date(n.created_at).toLocaleDateString('ar-EG'),
    status: n.status?.replace(/_/g, ' ') || 'قيد المعالجة',
    decision: n.decision_type,
    decisionReasoning: n.decision_reasoning,
    phase: n.status === 'موافق_عليه' ? 'وثيقة_رسمية' : 'قيد_المعالجة'
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNotification.mutate({
      ...formData,
      notaryId: user?.id,
      recipientType: 'regional_council'
    });
  };

  const getStatusColor = (phase: string) => {
    switch (phase) {
      case 'قيد_المعالجة':
        return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
      case 'قيد_المعالجة_مع_استعلام':
        return 'bg-orange-100 text-orange-800 border-l-4 border-orange-500';
      case 'القرار_النهائي':
        return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
      case 'وثيقة_رسمية':
        return 'bg-purple-100 text-purple-800 border-l-4 border-purple-500';
      case 'مرسل_للعدل':
        return 'bg-green-100 text-green-800 border-l-4 border-green-500';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'قيد_المعالجة':
        return 'قيد المعالجة';
      case 'قيد_المعالجة_مع_استعلام':
        return 'قيد المعالجة (استعلام)';
      case 'القرار_النهائي':
        return 'قيد اتخاذ القرار';
      case 'وثيقة_رسمية':
        return 'توليد الوثيقة';
      case 'مرسل_للعدل':
        return 'جاهز للاستلام';
      default:
        return phase;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'موافق عليه':
        return 'bg-green-100 text-green-800';
      case 'مرفوض':
        return 'bg-red-100 text-red-800';
      case 'قيد المعالجة':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-red-950 mb-6">بوابة العدول</h1>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-6 py-4 font-semibold transition ${
              activeTab === 'list'
                ? 'border-b-4 border-red-950 text-red-950'
                : 'text-gray-600 hover:text-red-950'
            }`}
          >
            قائمة الطلبات
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-6 py-4 font-semibold transition ${
              activeTab === 'create'
                ? 'border-b-4 border-red-950 text-red-950'
                : 'text-gray-600 hover:text-red-950'
            }`}
          >
            طلب جديد
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`flex-1 px-6 py-4 font-semibold transition ${
              activeTab === 'responses'
                ? 'border-b-4 border-red-950 text-red-950'
                : 'text-gray-600 hover:text-red-950'
            }`}
          >
            الردود
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex-1 px-6 py-4 font-semibold transition ${
              activeTab === 'archive'
                ? 'border-b-4 border-red-950 text-red-950'
                : 'text-gray-600 hover:text-red-950'
            }`}
          >
            الأرشيف
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 px-6 py-4 font-semibold transition ${
              activeTab === 'ledger'
                ? 'border-b-4 border-emerald-600 text-emerald-600'
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            سجل العمليات الحسابية
          </button>
        </div>
      </div>

      {/* Tab Content */}

      {/* Create Request Tab */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-red-950 mb-6">إنشاء طلب إشعار جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info Section */}
            <div>
              <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">بيانات العدل</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="أدخل اسمك الكامل"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الرقم المهني *</label>
                  <input
                    type="text"
                    name="professionalNumber"
                    value={formData.professionalNumber}
                    onChange={handleInputChange}
                    placeholder="أدخل رقمك المهني"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم المكتب *</label>
                  <input
                    type="text"
                    name="officeNumber"
                    value={formData.officeNumber}
                    onChange={handleInputChange}
                    placeholder="أدخل رقم مكتبك"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الدائرة *</label>
                  <input
                    type="text"
                    name="jurisdiction"
                    value={formData.jurisdiction}
                    onChange={handleInputChange}
                    placeholder="أدخل دائرتك"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Request Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">تفاصيل الطلب</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المحكمة / الجهة المقصد *</label>
                  <select
                    name="targetCourt"
                    value={formData.targetCourt}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  >
                    <option value="">اختر المحكمة</option>
                    <option value="محكمة تطوان">محكمة تطوان الابتدائية</option>
                    <option value="محكمة الاستئناف">محكمة الاستئناف</option>
                    <option value="محكمة فاس">محكمة فاس الابتدائية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الشهادة *</label>
                  <select
                    name="certificateType"
                    value={formData.certificateType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    required
                  >
                    <option value="">اختر نوع الشهادة</option>
                    <option value="زواج">زواج</option>
                    <option value="طلاق">طلاق</option>
                    <option value="وصية">وصية</option>
                    <option value="إشهادات عقارية">إشهادات عقارية</option>
                    <option value="سماسرة">سماسرة</option>
                    <option value="مالية">مالية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المدة المطلوبة *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="requestedDuration"
                      value={formData.requestedDuration}
                      onChange={handleInputChange}
                      placeholder="أدخل المدة"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                      required
                    />
                    <select
                      name="durationUnit"
                      value={formData.durationUnit}
                      onChange={handleInputChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                    >
                      <option value="ساعة">ساعة</option>
                      <option value="يوم">يوم</option>
                      <option value="تاريخ محدد">تاريخ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-semibold text-red-950 mb-4 pb-2 border-b">معلومات إضافية</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">سبب التوجه *</label>
                <textarea
                  name="reasonForMovement"
                  value={formData.reasonForMovement}
                  onChange={handleInputChange}
                  placeholder="اشرح سبب حاجتك للتوجه خارج اختصاصك"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات إضافية</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="أي معلومات إضافية..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-red-950 text-white rounded-lg hover:bg-red-900 transition font-semibold"
              >
                إرسال الإشعار
              </button>
              <button
                type="reset"
                className="flex-1 px-6 py-3 border-2 border-red-950 text-red-950 rounded-lg hover:bg-red-50 transition font-semibold"
              >
                مسح البيانات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List Tab */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-red-950 mb-6">قائمة طلباتي</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-950 text-white">
                <tr>
                  <th className="px-6 py-4 text-right">رقم الإشعار</th>
                  <th className="px-6 py-4 text-right">المحكمة المقصد</th>
                  <th className="px-6 py-4 text-right">نوع الشهادة</th>
                  <th className="px-6 py-4 text-right">تاريخ الإرسال</th>
                  <th className="px-6 py-4 text-right">الحالة</th>
                  <th className="px-6 py-4 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {notaryRequests.map(req => (
                  <tr key={req.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{req.requestNumber}</td>
                    <td className="px-6 py-4">{req.targetCourt}</td>
                    <td className="px-6 py-4">{req.certificateType}</td>
                    <td className="px-6 py-4">{req.submissionDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm">
                          عرض
                        </button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
                          طباعة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Responses Tab */}
      {activeTab === 'responses' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-red-950 mb-6">الردود والقرارات</h2>
          <div className="space-y-4">
            {notaryRequests
              .filter(r => r.decision)
              .map(req => (
                <div key={req.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-red-950">{req.requestNumber}</p>
                      <p className="text-sm text-gray-600">{req.targetCourt}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-t">
                    <div>
                      <p className="text-xs text-gray-600">القرار</p>
                      <p className="font-semibold">{req.decision}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">تاريخ وساعة القرار</p>
                      <p className="font-semibold text-sm">
                        {req.decided_at 
                          ? new Date(req.decided_at).toLocaleString('ar-MA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : req.decisionDate || 'غير محدد'}
                      </p>
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm font-semibold">
                        تحميل الوثيقة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-red-950 mb-6">أرشيفي الشخصي</h2>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">لا توجد وثائق مؤرشفة حالياً</p>
            <button className="px-6 py-2 bg-red-950 text-white rounded-lg hover:bg-red-900">
              أرشفة وثائق
            </button>
          </div>
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[800px]">
          <DailyLedgerModule />
        </div>
      )}
    </div>
  );
};

export default NotaryPortal;
