import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  request_number: string;
  notary_name: string;
  jurisdiction: string;
  certificate_type: string;
  created_at: string;
  status: string;
  decision_type?: string;
  decision_reasoning?: string;
  processing_time_hours?: number;
  // Full details for template
  appointment_decree_number?: string;
  appointment_date?: string;
  reception_place?: string;
  reception_date?: string;
  reception_time?: string;
  writing_place?: string;
  involved_names?: string;
  recipient_type?: string;
  appellate_court?: string;
}

const NotificationRequestsTable: React.FC = () => {
  const { user } = useAuth();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [showResponsePreview, setShowResponsePreview] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [decisionType, setDecisionType] = useState<'accept' | 'decline' | 'inquiry' | 'postpone'>('accept');
  const [decisionReason, setDecisionReason] = useState('');
  const [conditions, setConditions] = useState<string[]>(['']);

  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation();

  // Fetch real notifications from database
  const queryInput = {
    status: filter === 'all' ? 'all' : (filter as any),
    limit: 100,
    offset: 0,
  };
  
  const { data: notificationsList, isLoading, error: queryError, refetch: refetchNotifications } = trpc.notifications.getRequestsList.useQuery(
    queryInput,
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );
  
  // Log debug info
  React.useEffect(() => {
    console.log('🔍 NotificationRequestsTable state:', {
      filter,
      isLoading,
      error: queryError?.message,
      dataCount: notificationsList?.length || 0,
      data: notificationsList,
    });
  }, [filter, isLoading, queryError, notificationsList]);

  // Transform database records to UI format
  const notifications: Notification[] = useMemo(() => {
    if (!notificationsList) return [];
    return (notificationsList as any[]).map(n => ({
      id: n.id,
      request_number: n.request_number,
      notary_name: n.notary_name,
      jurisdiction: n.jurisdiction,
      certificate_type: n.certificate_type,
      created_at: n.created_at,
      status: n.status,
      decision_type: n.decision_type,
      decision_reasoning: n.decision_reasoning,
      processing_time_hours: n.processing_time_hours,
      // Mapping new fields
      appointment_decree_number: n.appointment_decree_number,
      appointment_date: n.appointment_date,
      reception_place: n.reception_place,
      reception_date: n.reception_date,
      reception_time: n.reception_time,
      writing_place: n.writing_place,
      involved_names: n.involved_names,
      recipient_type: n.recipient_type,
      appellate_court: n.appellate_court,
    }));
  }, [notificationsList]);

  const handleShowDocument = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDocumentModalOpen(true);
  };

  const handleDecisionClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setDecisionType('accept');
    setDecisionReason('');
    setConditions(['']);
    setIsDecisionModalOpen(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedNotification || !decisionReason.trim()) {
      alert('يرجى إدخال السبب/التعليل');
      return;
    }

    let decisionTypeMap: 'موافقة' | 'موافقة_مع_شروط' | 'رفض' | 'تأجيل';

    switch (decisionType) {
      case 'accept':
        decisionTypeMap = 'موافقة';
        break;
      case 'decline':
        decisionTypeMap = 'رفض';
        break;
      case 'inquiry':
        decisionTypeMap = 'موافقة_مع_شروط';
        break;
      case 'postpone':
        decisionTypeMap = 'تأجيل';
        break;
      default:
        decisionTypeMap = 'موافقة';
    }

    try {
      // Call the recordDecision mutation
      await recordDecisionMutation.mutateAsync({
        notificationId: selectedNotification.id,
        decisionType: decisionTypeMap,
        reasoning: decisionReason,
        conditions: conditions.filter(c => c.trim()),
        authorityName: user?.full_name ? `${user.full_name} (المجلس الجهوي للعدول)` : 'المجلس الجهوي للعدول',
        authorityType: 'regional_council',
      });

      alert(`تم ${decisionType === 'accept' ? 'الموافقة' : decisionType === 'decline' ? 'الرفض' : decisionType === 'inquiry' ? 'الاستعلام' : 'التأجيل'} على الطلب بنجاح`);
      setIsDecisionModalOpen(false);
      setSelectedNotification(null);
      // Refresh the list
      refetchNotifications();
    } catch (error) {
      console.error('Error recording decision:', error);
      alert('حدث خطأ أثناء حفظ القرار');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === 'all' || n.status === filter;
    const matchesSearch = n.request_number.includes(searchTerm) || 
                         n.notary_name.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'قيد_المعالجة':
        return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
      case 'موافق_عليه':
        return 'bg-green-100 text-green-800 border-l-4 border-green-500';
      case 'مرفوض':
        return 'bg-red-100 text-red-800 border-l-4 border-red-500';
      case 'مؤجل':
        return 'bg-purple-100 text-purple-800 border-l-4 border-purple-500';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'جميع الحالات' },
    { value: 'قيد_المعالجة', label: 'قيد المعالجة' },
    { value: 'موافق_عليه', label: 'موافق عليه' },
    { value: 'مرفوض', label: 'مرفوض' },
    { value: 'مؤجل', label: 'مؤجل' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-blue-950 mb-6">إدارة الطلبات</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">البحث</label>
            <input
              type="text"
              placeholder="رقم الإشعار أو اسم العدل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition">
              بحث متقدم
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">جاري تحميل الطلبات...</p>
          </div>
        ) : (
        <table className="w-full">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="px-6 py-4 text-right">رقم الإشعار</th>
              <th className="px-6 py-4 text-right">اسم العدل</th>
              <th className="px-6 py-4 text-right">الدائرة القضائية</th>
              <th className="px-6 py-4 text-right">نوع الشهادة</th>
              <th className="px-6 py-4 text-right">تاريخ الإرسال</th>
              <th className="px-6 py-4 text-right">الحالة</th>
              <th className="px-6 py-4 text-right">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{notification.request_number}</td>
                  <td className="px-6 py-4">{notification.notary_name}</td>
                  <td className="px-6 py-4">{notification.jurisdiction}</td>
                  <td className="px-6 py-4">{notification.certificate_type}</td>
                  <td className="px-6 py-4">{notification.created_at ? new Date(notification.created_at).toLocaleDateString('ar-MA') : 'غير محدد'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(notification.status)}`}>
                      {notification.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleShowDocument(notification)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-semibold flex items-center gap-1"
                        title="عرض الوثيقة"
                      >
                        <span>👁️</span> عرض
                      </button>

                      {notification.status === 'قيد_المعالجة' && (
                        <button
                          onClick={() => handleDecisionClick(notification)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-semibold flex items-center gap-1"
                          title="اتخاذ قرار"
                        >
                          <span>⚖️</span> قرار
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedRow(expandedRow === notification.id ? null : notification.id)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                        title="تفاصيل إضافية"
                      >
                        {expandedRow === notification.id ? '收' : '展'}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRow === notification.id && (
                  <tr className="border-b bg-gray-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">وقت المعالجة</p>
                          <p className="font-semibold text-blue-950">{notification.processing_time_hours ? notification.processing_time_hours + ' ساعة' : 'قيد_المعالجة'}</p>
                        </div>
                        {notification.decision_type && (
                          <div>
                            <p className="text-xs text-gray-600">القرار</p>
                            <p className="font-semibold text-green-700">{notification.decision_type}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600">المدة المطلوبة</p>
                          <p className="font-semibold">يوم واحد</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">آخر تحديث</p>
                          <p className="font-semibold">2026-01-21 10:30</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">السابق</button>
        <button className="px-3 py-2 bg-blue-950 text-white rounded-lg">1</button>
        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">2</button>
        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">3</button>
        <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">التالي</button>
      </div>

      {/* Decision Modal */}
      {isDecisionModalOpen && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-950 mb-6 text-right">
              اتخاذ قرار بشأن الطلب
            </h2>

            {/* Request Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">رقم الإشعار</p>
                  <p className="font-bold text-blue-950">{selectedNotification.request_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">اسم العدل</p>
                  <p className="font-bold text-blue-950">{selectedNotification.notary_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">نوع الشهادة</p>
                  <p className="font-bold">{selectedNotification.certificate_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">الدائرة القضائية</p>
                  <p className="font-bold">{selectedNotification.jurisdiction}</p>
                </div>
              </div>
            </div>

            {/* Decision Type Selection */}
            <div className="mb-6 text-right">
              <label className="block text-sm font-bold text-gray-700 mb-3">نوع القرار</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecisionType('accept')}
                  className={`p-3 rounded-lg border-2 transition font-bold ${
                    decisionType === 'accept'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-200'
                  }`}
                >
                  ✅ موافقة
                </button>
                <button
                  onClick={() => setDecisionType('decline')}
                  className={`p-3 rounded-lg border-2 transition font-bold ${
                    decisionType === 'decline'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                  }`}
                >
                  ❌ رفض
                </button>
                <button
                  onClick={() => setDecisionType('inquiry')}
                  className={`p-3 rounded-lg border-2 transition font-bold ${
                    decisionType === 'inquiry'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                  }`}
                >
                  🔍 استعلام
                </button>
                <button
                  onClick={() => setDecisionType('postpone')}
                  className={`p-3 rounded-lg border-2 transition font-bold ${
                    decisionType === 'postpone'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200'
                  }`}
                >
                  ⏳ تأجيل
                </button>
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-6 text-right">
              <label className="block text-sm font-bold text-gray-700 mb-2">التعليل / السبب</label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="اكتب السبب أو التعليل بالتفصيل..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-950 resize-none"
                rows={4}
              />
            </div>

            {/* Conditions (for acceptance) */}
            {decisionType === 'accept' && (
              <div className="mb-6 text-right">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setConditions([...conditions, ''])}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                  >
                    + إضافة شرط
                  </button>
                  <label className="block text-sm font-bold text-gray-700">الشروط (اختياري)</label>
                </div>
                <div className="space-y-2">
                  {conditions.map((condition, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={condition}
                        onChange={(e) => {
                          const newConditions = [...conditions];
                          newConditions[idx] = e.target.value;
                          setConditions(newConditions);
                        }}
                        placeholder={`الشرط ${idx + 1}`}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {conditions.length > 1 && (
                        <button
                          onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsDecisionModalOpen(false);
                  setSelectedNotification(null);
                  setDecisionReason('');
                  setConditions(['']);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => setShowResponsePreview(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                معاينة الرد الرسمي
              </button>
              <button
                onClick={handleSubmitDecision}
                className={`px-6 py-2 text-white rounded-lg transition font-bold ${
                  decisionType === 'accept'
                    ? 'bg-green-600 hover:bg-green-700'
                    : decisionType === 'decline'
                    ? 'bg-red-600 hover:bg-red-700'
                    : decisionType === 'inquiry'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                تأكيد القرار فقط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Preview Modal */}
      {showResponsePreview && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[110] p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8">
            <div className="bg-blue-950 text-white p-4 flex justify-between items-center no-print">
              <h2 className="text-xl font-bold font-amiri">الرد الرسمي للمجلس الجهوي</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white text-blue-950 rounded font-bold hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <span>🖨️</span> طباعة (A4)
                </button>
                <button
                  onClick={() => setShowResponsePreview(false)}
                  className="px-4 py-2 bg-red-800 text-white rounded font-bold hover:bg-red-700 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div className="p-8 bg-white printable-area">
              {/* Common Header */}
              <div className="flex justify-between items-start mb-10 text-center font-amiri">
                <div className="w-1/3">
                  <p className="font-bold text-lg">المملكة المغربية</p>
                  <p className="font-bold text-lg">وزارة العدل</p>
                  <p className="font-bold text-lg">المجلس الجهوي لعدول استئنافية {selectedNotification.appellate_court || selectedNotification.jurisdiction || '........'}</p>
                </div>
                <div className="w-1/3 flex flex-col items-center">
                  <img src="/logos/adoul-logo.jpg" alt="Adoul Logo" className="w-24 h-24 object-contain mb-2" />
                </div>
                <div className="w-1/3">
                  <p className="font-bold text-lg">تحرير بـ: {selectedNotification.writing_place || selectedNotification.jurisdiction || '........'}</p>
                  <p className="font-bold text-lg">بتاريخ: {new Date().toLocaleDateString('ar-MA')}</p>
                </div>
              </div>

              {/* Title based on Decision Type */}
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black border-b-4 border-double border-black inline-block pb-2 font-amiri">
                  {decisionType === 'accept' ? 'إشعار بالموافقة' : `إشعار ${decisionType === 'decline' ? 'بالرفض' : 'بتأجيل'} الموعد`}
                </h1>
              </div>

              {/* Dynamic Content based on Decision Type */}
              <div className="text-right leading-[2.5] text-xl font-amiri space-y-6 px-10">
                {decisionType === 'accept' && (
                  <div className="space-y-6">
                    <div className="mb-4">
                      <p className="font-bold">إلى السيد العدل: <span className="underline">{selectedNotification.notary_name}</span></p>
                      <p>رقم قرار التعيين: <span className="underline">{selectedNotification.appointment_decree_number || '........'}</span> بتاريخ: <span className="underline">{selectedNotification.appointment_date || '........'}</span></p>
                    </div>
                    
                    <p className="font-bold text-center underline decoration-double">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                    
                    <p className="text-center font-bold text-2xl mt-4">سلام تام بوجود مولانا الإمام،</p>
                    
                    <p className="font-bold">وبعد،</p>
                    
                    <p>
                      فقد توصل المجلس الجهوي بإشعاركم المؤرخ في <span className="underline">{selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="underline">{selectedNotification.reception_date || '........'}</span> على الساعة <span className="underline">{selectedNotification.reception_time || '........'}</span> إلى العنوان: <span className="underline">{selectedNotification.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: السيد/السيدة <span className="underline">{selectedNotification.involved_names || '........'}</span>، والنوع: <span className="underline">{selectedNotification.certificate_type || '........'}</span>.
                    </p>
                    
                    <p>
                      وبعد الاطلاع على مضمون الإشعار والتأكد من طابعه المهني وملاءمته لمهامكم العدلية، يخبركم المجلس الجهوي بما يلي:
                    </p>
                    
                    <p className="font-black text-2xl py-4 bg-gray-50 border-r-4 border-blue-950 pr-6">
                      لا مانع لدى المجلس الجهوي من تنفيذ ما تضمنه إشعاركم المذكور، مع تسجيل العملية في السجلات المهنية المعتمدة عند الاقتضاء.
                    </p>
                    
                    <p className="text-center font-bold">وتفضلوا بقبول فائق التقدير والاحترام.</p>
                    
                    <div className="mt-10 flex flex-col items-start">
                      <p className="font-bold">عن رئيس المجلس الجهوي للعدول بجهة: <span className="underline">{selectedNotification.appellate_court || '........'}</span></p>
                      <p className="font-bold">الإمضاء والخاتم</p>
                      <p className="font-bold">التاريخ: <span className="underline">{new Date().toLocaleDateString('ar-MA')}</span></p>
                    </div>
                  </div>
                )}

                {decisionType === 'decline' && (
                  <div className="space-y-6">
                    <div className="mb-4">
                      <p className="font-bold">إلى السيد العدل: <span className="underline">{selectedNotification.notary_name}</span></p>
                      <p>رقم قرار التعيين: <span className="underline">{selectedNotification.appointment_decree_number || '........'}</span></p>
                    </div>
                    
                    <p className="font-bold text-center underline decoration-double">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                    
                    <p className="text-center font-bold text-2xl mt-4">سلام تام بوجود مولانا الإمام،</p>
                    
                    <p className="font-bold">وبعد،</p>
                    
                    <p>
                      فقد توصل المجلس الجهوي بإشعاركم المؤرخ في <span className="underline">{selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="underline">{selectedNotification.reception_date || '........'}</span> إلى العنوان: <span className="underline">{selectedNotification.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: <span className="underline">{selectedNotification.involved_names || '........'}</span> وبنوع الإشهاد: <span className="underline">{selectedNotification.certificate_type || '........'}</span>.
                    </p>
                    
                    <p>
                      وبعد الاطلاع على مضمون الإشعار ودراسته في ضوء المقتضيات التنظيمية والمهنية الجاري بها العمل، يؤسفنا إخباركم بأن المجلس الجهوي يتعذر عليه الموافقة على تنفيذ مضمون الإشعار المذكور لعدم استيفائه للشروط التنظيمية الواجبة، ويُعتبر الطلب غير مقبول من الناحية المهنية.
                    </p>
                    
                    <p className="font-bold text-red-800 bg-red-50 p-4 border-r-4 border-red-800">
                      وعليه، يُصرف النظر عن الإشعار مع تسجيله في السجلات المهنية المعتمدة دون ترتيب أثر.
                    </p>

                    {decisionReason && (
                      <div className="mt-4 p-4 border-dashed border-2 border-gray-200 rounded-xl">
                        <p className="text-sm text-gray-500 font-bold mb-1">تعليل إضافي:</p>
                        <p className="italic text-gray-700">{decisionReason}</p>
                      </div>
                    )}
                    
                    <p className="text-center font-bold">وتفضلوا بقبول فائق التقدير والاحترام.</p>
                    
                    <div className="mt-10 flex flex-col items-start">
                      <p className="font-bold">عن رئيس المجلس الجهوي للعدول</p>
                      <p className="font-bold">جهة: <span className="underline">{selectedNotification.appellate_court || '........'}</span></p>
                      <p className="font-bold">الإمضاء والخاتم</p>
                      <p className="font-bold">التاريخ: <span className="underline">{new Date().toLocaleDateString('ar-MA')}</span></p>
                    </div>
                  </div>
                )}

                {(decisionType === 'postpone' || decisionType === 'inquiry') && (
                  <div className="space-y-6">
                    <div className="mb-4">
                      <p className="font-bold">إلى السيد العدل: <span className="underline">{selectedNotification.notary_name}</span></p>
                      <p>رقم قرار التعيين: <span className="underline">{selectedNotification.appointment_decree_number || '........'}</span></p>
                    </div>
                    
                    <p className="font-bold text-center underline decoration-double">الموضوع: جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                    
                    <p className="text-center font-bold text-2xl mt-4">سلام تام بوجود مولانا الإمام،</p>
                    
                    <p className="font-bold">وبعد،</p>
                    
                    <p>
                      فقد توصل المجلس الجهوي بإشعاركم المؤرخ في <span className="underline">{selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleDateString('ar-MA') : '....'}</span> والمتعلق بتوجهكم بتاريخ <span className="underline">{selectedNotification.reception_date || '........'}</span> إلى العنوان: <span className="underline">{selectedNotification.reception_place || '........'}</span> من أجل تلقي إشهاد لفائدة الطرف: <span className="underline">{selectedNotification.involved_names || '........'}</span> وبنوع الإشهاد: <span className="underline">{selectedNotification.certificate_type || '........'}</span>.
                    </p>
                    
                    <p>
                      وبعد الاطلاع على الإشعار المذكور ودراسته في ضوء المقتضيات المهنية والتنظيمية المتعلقة بمزاولة مهام التوثيق العدلي، يُفيدكم المجلس الجهوي بأن البتّ في موضوع الإشعار قد تقرر تأجيله إلى حين استيفاء الإجراءات المهنية الجاري بها العمل، مع الاحتفاظ بسائر الحقوق المهنية والتنظيمية.
                    </p>

                    <p className="font-bold text-blue-900 bg-blue-50 p-4 border-r-4 border-blue-900">
                      وعليه، يُرجى عدم ترتيب أي أثر على الإشعار المذكور إلى حين إشعاركم بخلاف ذلك.
                    </p>
                    
                    {decisionReason && (
                      <div className="mt-4 p-4 border-dashed border-2 border-gray-200 rounded-xl">
                        <p className="text-sm text-gray-500 font-bold mb-1">الموعد الجديد أو ملاحظات إضافية:</p>
                        <p className="italic text-gray-700">{decisionReason}</p>
                      </div>
                    )}

                    <p className="text-center font-bold">وتفضلوا بقبول فائق التقدير والاحترام.</p>
                    
                    <div className="mt-10 flex flex-col items-start">
                      <p className="font-bold">عن رئيس المجلس الجهوي للعدول</p>
                      <p className="font-bold">جهة: <span className="underline">{selectedNotification.appellate_court || '........'}</span></p>
                      <p className="font-bold">الإمضاء والخاتم</p>
                      <p className="font-bold">التاريخ: <span className="underline">{new Date().toLocaleDateString('ar-MA')}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-40 border-t pt-4 text-center text-sm text-gray-500 no-print">
                <p>هذه الوثيقة صادرة عن البوابة الإلكترونية للمجالس الجهوية للعدول</p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between border-t no-print">
              <p className="text-sm text-gray-600 self-center">تأكد من مراجعة البيانات قبل الطباعة</p>
              <button
                onClick={() => {
                  handleSubmitDecision();
                  setShowResponsePreview(false);
                }}
                className="px-6 py-2 bg-green-700 text-white rounded font-bold hover:bg-green-800 transition shadow-lg"
              >
                اعتماد وحفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isDocumentModalOpen && selectedNotification && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-70 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-slideUp">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 no-print">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDocumentModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-white transition font-bold"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition font-bold flex items-center gap-2"
                >
                  <span>🖨️</span> طباعة الوثيقة
                </button>
              </div>
              <h2 className="text-xl font-bold text-blue-950">معاينة الوثيقة الرسمية</h2>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-12 bg-slate-50 printable-area select-none">
              <div id="legal-document" className="bg-white rounded-sm shadow-sm p-16 max-w-4xl mx-auto space-y-10 font-amiri min-h-[1056px] border border-gray-100">
                {/* Header Section */}
                <div className="text-center space-y-4 border-b pb-8">
                  <h2 className="text-3xl font-bold text-gray-900 underline underline-offset-[12px] decoration-red-950/20">
                    {selectedNotification.recipient_type === 'judge' ? 'إشعار موجه إلى السيد قاضي التوثيق' : 'إشعار موجه إلى السيد رئيس المجلس الجهوي'}
                  </h2>
                  <p className="text-2xl font-black text-blue-950 mt-4">
                    {selectedNotification.recipient_type === 'judge' ? (selectedNotification.jurisdiction || '____________') : (selectedNotification.appellate_court || selectedNotification.jurisdiction || '____________')}
                  </p>
                </div>

                {/* Body Section */}
                <div className="space-y-10 text-xl leading-relaxed text-right" dir="rtl">
                  <div className="space-y-3 border-r-4 border-blue-950 pr-6 py-2">
                    <p className="font-bold text-gray-500 text-sm mb-1">من طرف العدل:</p>
                    <p className="text-2xl font-black text-gray-900">{selectedNotification.notary_name || '________________________'}</p>
                    <p className="text-gray-700">
                      رقم قرار التعيين: <span className="font-bold">{selectedNotification.appointment_decree_number || '__________'}</span> 
                      بتاريخ: <span className="font-bold">{selectedNotification.appointment_date || '__________'}</span>
                    </p>
                    <p className="text-gray-700">
                      التابع للعمل بدائرة {selectedNotification.appellate_court || '__________'} قسم التوثيق بـ {selectedNotification.jurisdiction || '__________'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center shadow-inner">
                    <p className="font-bold text-blue-950 underline decoration-red-950/30 underline-offset-4">الموضوع: إشعار بالتوجه لتلقي إشهاد خارج المحكمة</p>
                  </div>

                  <div className="space-y-8 text-gray-800">
                    <p>
                      يشرفني أن أحيط سيادتكم علمًا بأنني سأتوجه بتاريخ <span className="underline font-black text-gray-900 px-2 decoration-2">{selectedNotification.reception_date || '//____'}</span>
                      على الساعة <span className="underline font-black text-gray-900 px-2 decoration-2">{selectedNotification.reception_time || '____'}</span>
                    </p>
                    
                    <div className="space-y-6">
                      <p className="flex items-start gap-4 leading-normal">
                          <span className="flex-shrink-0 font-bold">إلى العنوان التالي:</span>
                          <span className="underline font-bold text-gray-900 decoration-1 underline-offset-4">{selectedNotification.reception_place || '______________________________'}</span>
                      </p>

                      <p className="flex flex-col gap-3">
                          <span className="font-bold">من أجل تلقي إشهاد لفائدة الطرف:</span>
                          <span className="bg-white border-2 border-slate-100 p-6 rounded-2xl font-black text-2xl text-blue-950 shadow-sm leading-normal ring-1 ring-slate-200">
                            {selectedNotification.involved_names || '______________________________'}
                          </span>
                      </p>

                      <p className="flex items-center gap-4">
                          <span className="font-bold">نوع الإشهاد المراد تلقيه:</span>
                          <span className="bg-red-50 px-6 py-2 rounded-xl border border-red-100 font-black text-blue-950">{selectedNotification.certificate_type || '______________________________'}</span>
                      </p>
                    </div>

                    <p className="text-gray-700 mt-10 leading-loose">
                      وذلك في إطار المهام العدلية المخولة قانونًا وتنفيذًا لطلب الأطراف المعنية.
                    </p>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="flex justify-between items-end pt-12 border-t border-gray-100 mt-12 text-xl">
                  <div className="text-right space-y-2">
                    <p className="text-gray-600">حرر بـ: <span className="font-bold text-gray-900">{selectedNotification.writing_place || '__________'}</span></p>
                    <p className="text-gray-600">في: <span className="font-bold text-gray-900">{selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleDateString('ar-MA') : '__________'}</span></p>
                  </div>
                  
                  <div className="text-center w-72 border-2 border-blue-950/20 p-8 rounded-3xl bg-white shadow-sm relative overflow-hidden group">
                    <p className="text-gray-400 text-sm mb-10 font-bold tracking-widest">إمضاء العدل</p>
                    <div className="h-16 flex items-center justify-center italic text-3xl font-amiri text-gray-300 select-none">
                      {selectedNotification.notary_name}
                    </div>
                    <p className="font-bold text-gray-900 mt-6 border-t pt-4 border-gray-100">{selectedNotification.notary_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationRequestsTable;
