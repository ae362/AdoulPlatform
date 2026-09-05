import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import { printElement } from '../../utils/print';

interface GenericPermissionPortalProps {
  title: string;
  icon: string;
  type: 'scientific' | 'marriage' | 'judicialFees' | 'individualReception';
  formComponent: React.ComponentType<any>;
  documentViewComponent: React.ComponentType<any>;
  approvalTemplateComponent: React.ComponentType<any>;
  createMutation: any;
}

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
};

const GenericPermissionPortal: React.FC<GenericPermissionPortalProps> = ({
  title,
  icon,
  type,
  formComponent: FormComponent,
  documentViewComponent: DocumentViewComponent,
  approvalTemplateComponent: ApprovalTemplateComponent,
  createMutation
}) => {
  const { user, notaryProfile } = useAuth();
  const decisionRef = React.useRef<HTMLDivElement>(null);
  const requestRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'list' | 'permissions_responses' | 'archive'>('dashboard');
  const [selectedDecision, setSelectedDecision] = useState<any>(null);
  const [selectedRequestView, setSelectedRequestView] = useState<any>(null);
  const [selectedTrackingView, setSelectedTrackingView] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: permissionsList, isLoading: listLoading, refetch: refetchPermissions } = 
    type === 'scientific' ? (trpc as any).permissions.getScientific.useQuery({ notaryId: user?.id }) :
    type === 'marriage' ? (trpc as any).permissions.getMarriage.useQuery({ notaryId: user?.id }) :
    type === 'judicialFees' ? (trpc as any).permissions.getJudicialFees.useQuery({ notaryId: user?.id }) :
    (trpc as any).permissions.getIndividualReception.useQuery({ notaryId: user?.id });

  const filteredList = useMemo(() => {
    if (!permissionsList) return [];
    if (!searchQuery) return permissionsList;
    const query = searchQuery.toLowerCase();
    return permissionsList.filter((p: any) => 
      p.request_number?.toLowerCase().includes(query) ||
      p.status?.toLowerCase().includes(query) ||
      p.notary_name?.toLowerCase().includes(query) ||
      p.reception_date?.toLowerCase().includes(query)
    );
  }, [permissionsList, searchQuery]);

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not logged in');
      
      // Handle file uploads by converting to base64
      let attachmentsData: any[] = [];
      
      // 1. Check for standard attachments array
      if (formData.attachments && Array.isArray(formData.attachments)) {
        const filePromises = formData.attachments.map(async (item: any) => {
          // If it's a direct File object
          if (item instanceof File) {
            const base64 = await toBase64(item);
            return {
              name: item.name,
              type: item.type,
              size: item.size,
              base64
            };
          }
          // If it's an object containing a file (common in our forms)
          if (item && typeof item === 'object' && item.file instanceof File) {
            const base64 = item.base64 || await toBase64(item.file);
            return {
              name: item.file.name,
              type: item.file.type,
              size: item.file.size,
              base64
            };
          }
          // If it's already in the correct format (base64 string or fileUploadSchema object)
          if (item && typeof item === 'object' && item.base64 && item.name) {
            return {
              name: item.name,
              type: item.type,
              size: item.size,
              base64: item.base64
            };
          }
          return null;
        });
        const processed = await Promise.all(filePromises);
        attachmentsData = processed.filter(Boolean);
      }

      // 2. Deep scan for files in nested structures
      const findFiles = async (obj: any, path: string = ''): Promise<any[]> => {
        let results: any[] = [];
        if (!obj || typeof obj !== 'object') return results;

        for (const key in obj) {
          const value = obj[key];
          if (value instanceof File) {
            const base64 = await toBase64(value);
            results.push({
              name: `${path || 'وثيقة'}_${key}`,
              type: value.type,
              size: value.size,
              base64
            });
          } else if (typeof value === 'object' && !(value instanceof File)) {
            const nested = await findFiles(value, path ? `${path}_${key}` : key);
            results = results.concat(nested);
          }
        }
        return results;
      };

      // Search for nested files in suitorDocs, fianceeDocs, etc.
      const nestedFiles = await findFiles(formData);
      attachmentsData = attachmentsData.concat(nestedFiles);

      // Map form fields to the schema expected by permissionsRouter.ts
      // Some forms use different field names, so we normalize them here
      const payload = {
        notaryId: user.id,
        fullName: formData.fullName || user.full_name || '',
        professionalNumber: formData.professionalNumber || (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
        appointmentDecreeNumber: formData.appointmentDecreeNumber || notaryProfile?.appointment_decree_number || '',
        appointmentDate: formData.appointmentDate || (notaryProfile as any)?.appointment_date || '',
        officeNumber: formData.officeNumber || (notaryProfile as any)?.office_number || '',
        jurisdiction: formData.jurisdiction || notaryProfile?.primary_court || '',
        targetCourt: formData.targetCourt || formData.jurisdiction || notaryProfile?.primary_court || '',
        certificateType: formData.certificateType || title,
        involvedNames: formData.involvedNames || formData.partiesNames || formData.beneficiaryName || 
                       (formData.suitorFirstNameAr ? `${formData.suitorFirstNameAr} ${formData.suitorLastNameAr} و ${formData.fianceeFirstNameAr} ${formData.fianceeLastNameAr}` : 
                       (formData.applicantFirstName ? `${formData.applicantFirstName} ${formData.applicantLastName}` : '')),
        receptionPlace: formData.receptionPlace || formData.receptionLocation || '',
        receptionDate: formData.receptionDate || formData.receptionDate2 || '',
        receptionTime: formData.receptionTime || '',
        writingPlace: formData.writingPlace || '',
        reasonForMovement: formData.reasonForMovement || (formData.reasons ? formData.reasons.join(', ') : ''),
        requestedDuration: formData.requestedDuration || '1',
        durationUnit: formData.durationUnit || 'يوم',
        notes: formData.notes || '',
        attachments: attachmentsData,
        data: {
          ...formData,
          appellateCourt: formData.appellateCourt || (notaryProfile as any)?.appellate_court || '',
          officeAddress: formData.officeAddress || (notaryProfile as any)?.office_address || '',
          primaryCourt: formData.primaryCourt || (notaryProfile as any)?.primary_court || ''
        }
      };

      await createMutation.mutateAsync(payload);
      alert('✓ تم إرسال الطلب بنجاح');
      setActiveTab('list');
      refetchPermissions();
    } catch (error: any) {
      alert('✗ فشل في الإرسال: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const list = permissionsList || [];
    return {
      totalSubmitted: list.length,
      pending: list.filter(n => n.status === 'قيد_المعالجة').length,
      approved: list.filter(n => n.decision_type === 'موافقة').length,
      rejected: list.filter(n => n.decision_type === 'رفض').length,
    };
  }, [permissionsList]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 font-maghribi">
              <span>{icon}</span>
              {title}
            </h2>
            <p className="mt-2 text-slate-600 text-sm font-medium">نظام تدبير وتتبع {title}</p>
          </div>
          <div className="flex gap-2">
            {['dashboard', 'create', 'list', 'permissions_responses', 'archive'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-[#E6BE8A] text-[#5a0c0b] shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'dashboard' && 'لوحة القيادة'}
                {tab === 'create' && 'إنشاء طلب'}
                {tab === 'list' && 'المسودة والطلبات'}
                {tab === 'permissions_responses' && 'القرارات المتوصل بها'}
                {tab === 'archive' && 'الأرشيف'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 min-h-[500px]">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="إجمالي الطلبات" value={stats.totalSubmitted} color="blue" />
            <StatCard label="طلبات قيد المعالجة" value={stats.pending} color="amber" />
            <StatCard label="طلبات تمت الموافقة عليها" value={stats.approved} color="green" />
            <StatCard label="طلبات مرفوضة" value={stats.rejected} color="red" />
          </div>
        )}

        {activeTab === 'create' && (
          <FormComponent 
            notaryData={{
              fullName: user?.full_name || '',
              professionalNumber: (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
              officeNumber: notaryProfile?.appointment_decree_number || '',
              jurisdiction: notaryProfile?.primary_court || '',
              appointmentDecreeNumber: notaryProfile?.appointment_decree_number || '',
              appointmentDate: (notaryProfile as any)?.appointment_date || '',
              appellateCourt: notaryProfile?.appellate_court || '',
              officeAddress: notaryProfile?.office_address || '',
              phone: notaryProfile?.phone || ''
            }}
            previewComponent={DocumentViewComponent}
            onSubmit={handleFormSubmit} 
            onCancel={() => setActiveTab('list')}
            isSubmitting={isSubmitting}
          />
        )}

        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو الحالة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#E6BE8A] outline-none"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-red-950">
                    <th className="p-4 font-black">رقم الطلب</th>
                    <th className="p-4 font-black">تاريخ الإرسال والوقت</th>
                    <th className="p-4 font-black">الحالة</th>
                    <th className="p-4 font-black text-emerald-800">القرار</th>
                    <th className="p-4 font-black">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList?.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold">{p.request_number}</td>
                      <td className="p-4 font-bold text-slate-700">
                        {p.created_at ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="flex items-center gap-1.5 text-slate-900 font-black text-sm">
                              <span className="text-slate-400">📅</span>
                              {new Date(p.created_at).toLocaleDateString('ar-MA')}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px]">
                              <span className="text-slate-400">🕒</span>
                              {new Date(p.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : '---'}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.status === 'قيد_المعالجة' ? 'bg-amber-100 text-amber-700' : 
                          (p.status === 'مقبول' || p.status === 'موافق_عليه' || p.status === 'APPROVED') ? 'bg-green-100 text-green-700' :
                          (p.status === 'مرفوض' || p.status === 'REJECTED') ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {p.status === 'موافق_عليه' ? 'مقبول' : p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {(p.status === 'مقبول' || p.status === 'موافق_عليه' || p.status === 'APPROVED') ? (
                          <button 
                            onClick={() => setSelectedDecision(p)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded-lg font-black text-[10px] border border-emerald-100 transition shadow-sm"
                          >
                            📜 الوثيقة
                          </button>
                        ) : (p.status === 'مرفوض' || p.status === 'REJECTED') ? (
                           <button 
                             onClick={() => setSelectedDecision(p)}
                             className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded-lg font-black text-[10px] border border-red-100 transition shadow-sm"
                           >
                             📄 الرفض
                           </button>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">بانتظار القرار</span>
                        )}
                      </td>
                      <td className="p-4 flex gap-3">
                        <button 
                          onClick={() => setSelectedRequestView(p)} 
                          className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1"
                        >
                          👁️ عرض التفاصيل
                        </button>
                        <button 
                          onClick={() => setSelectedTrackingView(p)} 
                          className="text-orange-600 hover:text-orange-800 font-bold text-sm flex items-center gap-1"
                        >
                          📍 التتبع
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد نتائج تطابق بحثك</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions_responses' && (
          <div className="space-y-4">
             <div className="relative w-full max-w-md mb-4">
                <input
                  type="text"
                  placeholder="بحث في القرارات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#E6BE8A] outline-none"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredList?.filter((p: any) => p.decision_type).map((p: any) => (
                <div key={p.id} className="p-4 border rounded-lg flex justify-between items-center hover:border-[#E6BE8A] transition-colors">
                  <div>
                    <h4 className="font-bold">قرار بشأن طلب: {p.request_number}</h4>
                    <p className="text-sm text-slate-500">بتاريخ: {p.decided_at || p.created_at}</p>
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${p.decision_type === 'موافقة' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.decision_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedTrackingView(p)}
                      className="text-orange-600 hover:text-orange-800 font-bold px-4 py-2 rounded-lg border border-orange-200"
                    >
                      التتبع
                    </button>
                    <button 
                      onClick={() => setSelectedDecision(p)}
                      className="bg-[#5a0c0b] text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-colors"
                    >
                      عرض القرار
                    </button>
                  </div>
                </div>
              ))}
              {filteredList?.filter((p: any) => p.decision_type).length === 0 && (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed rounded-xl">
                   لا توجد قرارات متوصل بها تدعم بحثك حالياً
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedRequestView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative">
            <button onClick={() => setSelectedRequestView(null)} className="absolute top-4 left-4 text-2xl">✕</button>
            <div ref={requestRef}>
              <DocumentViewComponent 
                 data={(() => {
                   if (!selectedRequestView.data) return {};
                   if (typeof selectedRequestView.data === 'object') return selectedRequestView.data;
                   try {
                     return JSON.parse(selectedRequestView.data);
                   } catch (e) {
                     return { notes: selectedRequestView.data };
                   }
                 })()} 
                 notification={selectedRequestView} 
                 attachments={(() => {
                   if (!selectedRequestView.attachments) return [];
                   if (Array.isArray(selectedRequestView.attachments)) return selectedRequestView.attachments;
                   try {
                     return JSON.parse(selectedRequestView.attachments);
                   } catch (e) {
                     return [selectedRequestView.attachments];
                   }
                 })()}
                 notaryData={{
                   fullName: selectedRequestView.notary_name || notaryProfile?.fullName || user?.fullName,
                   professionalNumber: selectedRequestView.notary_professional_number || notaryProfile?.professionalNumber,
                   jurisdiction: selectedRequestView.jurisdiction || notaryProfile?.jurisdiction,
                 }} 
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
               <button 
                 onClick={() => {
                   if (requestRef.current) {
                     printElement(requestRef.current, { title: `طلب_${selectedRequestView.request_number}` });
                   } else {
                     window.print();
                   }
                 }} 
                 className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition-colors"
               >
                 طبع الطلب
               </button>
               <button onClick={() => setSelectedRequestView(null)} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Decision View Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[92vh] overflow-y-auto p-2 relative shadow-2xl border-4 border-slate-100">
            
            <button 
              onClick={() => setSelectedDecision(null)} 
              className="fixed top-8 left-8 w-12 h-12 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-xl hover:bg-red-50 hover:text-red-700 transition-all z-[70] border border-slate-100 group"
              title="إغلاق"
            >
              <span className="text-2xl transition-transform group-hover:rotate-90">✕</span>
            </button>

            <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm p-4 border-b border-slate-200 z-50 flex items-center justify-between px-10 rounded-t-[2.8rem]">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black">📜</div>
                 <div>
                   <h3 className="text-slate-900 font-extrabold text-sm">معاينة القرار القضائي النهائي</h3>
                   <p className="text-[10px] text-slate-500 font-bold">الرقم المرجعي: {selectedDecision.request_number}</p>
                 </div>
               </div>
               <div className="flex gap-3">
                 <button 
                   onClick={() => {
                     if (decisionRef.current) {
                       printElement(decisionRef.current, { 
                         title: `قرار_${selectedDecision.request_number}`,
                         extraCss: `
                           @page { size: A4; margin: 10mm; }
                           body { 
                             background: white !important; 
                             margin: 0 !important;
                             padding: 0 !important;
                             visibility: visible !important;
                           }
                           * { 
                             visibility: visible !important; 
                             -webkit-print-color-adjust: exact !important; 
                             print-color-adjust: exact !important; 
                           }
                           #__print_root__ {
                             display: block !important;
                             width: 100% !important;
                           }
                           .max-w-4xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
                           .shadow-2xl, .shadow-xl, .shadow-md, .shadow-sm { box-shadow: none !important; }
                           .border-4, .border-8 { border-style: double !important; }
                           .p-8, .p-12, .p-14 { padding: 10mm !important; }
                           .font-amiri { font-family: 'Amiri', serif !important; }
                         `
                       });
                     } else {
                       window.print();
                     }
                   }} 
                   className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95"
                 >
                    <span>🖨️ طباعة وتحميل PFD</span>
                 </button>
               </div>
            </div>

            <div className="p-8 md:p-14 print:p-0 print:m-0 printable-area" ref={decisionRef}>
              <ApprovalTemplateComponent 
                decision={selectedDecision} 
                notification={selectedDecision} 
                data={(() => {
                  // 1. Try direct data column
                  if (selectedDecision.data) {
                    if (typeof selectedDecision.data === 'object') return selectedDecision.data;
                    try { return JSON.parse(selectedDecision.data); } catch (e) {}
                  }
                  // 2. Fallback: Parse from notes tags (older system versions)
                  if (selectedDecision.notes && typeof selectedDecision.notes === 'string') {
                    const tags = [['--- DATA JSON START ---', '--- DATA JSON END ---'], ['--- METADATA START ---', '--- METADATA END ---']];
                    for (const [startTag, endTag] of tags) {
                      if (selectedDecision.notes.includes(startTag) && selectedDecision.notes.includes(endTag)) {
                        try { return JSON.parse(selectedDecision.notes.split(startTag)[1].split(endTag)[0].trim()); } catch (e) {}
                      }
                    }
                  }
                  return {}; // Return empty object to avoid "Loading..." message in components
                })()}
                annotation={(() => {
                  // 1. Try direct annotation column
                  if (selectedDecision.annotation) {
                    if (typeof selectedDecision.annotation === 'object') return selectedDecision.annotation;
                    try { return JSON.parse(selectedDecision.annotation); } catch (e) {}
                  }
                  // 2. Construct from top-level columns (Judge Portal updates)
                  return {
                    status: (selectedDecision.decision_type === 'موافق_عليه' || selectedDecision.decision_type === 'موافقة' || selectedDecision.status === 'موافق_عليه' || selectedDecision.status === 'مقبول') ? 'approved' : 'rejected',
                    reasoning: selectedDecision.decision_reasoning || '',
                    date: selectedDecision.decided_at || selectedDecision.created_at,
                    regNumber: selectedDecision.request_number,
                    judgeName: 'قاضي التوثيق'
                  };
                })()}
                notaryData={{
                  fullName: selectedDecision.notary_name,
                  professionalNumber: selectedDecision.notary_professional_number,
                  jurisdiction: selectedDecision.jurisdiction,
                }}
              />
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-[2.8rem] flex justify-between items-center px-14">
               <div className="flex flex-col">
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Digital Security Seal</span>
                 <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                   وثيقة رقمية معتمدة وموقعة إلكترونياً
                 </span>
               </div>
               <button 
                onClick={() => setSelectedDecision(null)} 
                className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
               >
                 إغلاق المعاينة
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking View Modal */}
      {selectedTrackingView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-slate-100">
            <div className="bg-gradient-to-br from-[#5a0c0b] to-[#3b0d0c] p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E6BE8A]/10 rounded-full -ml-10 -mb-10"></div>
               
               <button 
                onClick={() => setSelectedTrackingView(null)} 
                className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/80 hover:text-white"
               >
                 ✕
               </button>

               <div className="relative">
                 <div className="inline-block px-4 py-1.5 bg-[#E6BE8A] text-[#3b0d0c] rounded-full text-xs font-black mb-4 shadow-lg pr-6 pl-6">
                    مسار الوثيقة رقمية
                 </div>
                 <h3 className="text-3xl font-black flex items-center gap-4">
                  <span className="p-3 bg-white/10 rounded-2xl shadow-inner italic">📍</span>
                  تتبع مسار الطلب
                 </h3>
                 <div className="mt-4 flex flex-col gap-1">
                   <p className="text-white/60 font-medium flex items-center gap-2">
                     <span className="w-2 h-2 bg-[#E6BE8A] rounded-full animate-pulse"></span>
                     الرقم المرجعي: <span className="text-[#E6BE8A] font-bold">{selectedTrackingView.request_number}</span>
                   </p>
                   <p className="text-white/60 font-bold text-xs flex items-center gap-3">
                     <span className="flex items-center gap-1.5 opacity-80">
                       <span className="text-[#E6BE8A]">📅</span>
                       تاريخ الإرسال: <span className="text-[#E6BE8A]">{new Date(selectedTrackingView.created_at).toLocaleDateString('ar-MA')}</span>
                     </span>
                     <span className="flex items-center gap-1.5 opacity-80 border-r border-white/10 pr-3">
                       <span className="text-[#E6BE8A]">🕒</span>
                       ساعة الإرسال: <span className="text-[#E6BE8A]">{new Date(selectedTrackingView.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                     </span>
                   </p>
                 </div>
               </div>
            </div>

            <div className="p-10 md:p-14 bg-slate-50/50">
              <div className="relative">
                <div className="absolute right-[19px] top-2 bottom-2 w-1 bg-slate-200 rounded-full overflow-hidden">
                   <div 
                    className="w-full bg-gradient-to-b from-[#E6BE8A] via-[#5a0c0b] to-[#5a0c0b] transition-all duration-1000"
                    style={{ 
                      height: selectedTrackingView.decision_type ? '100%' : 
                              selectedTrackingView.status === 'قيد_المعالجة' ? '50%' : '25%' 
                    }}
                   />
                </div>

                <div className="space-y-10">
                  <TrackingStep 
                    title="إيداع الطلب" 
                    date={selectedTrackingView.created_at} 
                    status="completed" 
                    icon="📤"
                    description="تم تسجيل طلبكم بنجاح في المنظومة الرقمية وتعميمه على الدائرة المختصة."
                  />
                  <TrackingStep 
                    title="المراجعة والتأشير" 
                    date={selectedTrackingView.status === 'قيد_المعالجة' ? "قيد المراجعة حالياً" : "تمت المراجعة"} 
                    status={selectedTrackingView.status === 'قيد_المعالجة' || selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                    icon="⚖️"
                    description="يجري حالياً التحقق من المرفقات والمصادقة على المعطيات من قبل رئيس المصلحة."
                  />
                  <TrackingStep 
                    title="البث النهائي" 
                    date={selectedTrackingView.decided_at} 
                    status={selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                    icon="🖋️"
                    description={selectedTrackingView.decision_type 
                      ? `تم اتخاذ قرار بشأن طلبكم وهو: ${selectedTrackingView.decision_type}.` 
                      : "بانتظار قرار السيد القاضي المكلف بالتوثيق."}
                  />
                  <TrackingStep 
                    title="تبليغ القرار" 
                    date={selectedTrackingView.decided_at ? "متاح الأن" : null} 
                    status={selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                    icon="✅"
                    isLast={true}
                    description="بمجرد صدور القرار، تصبح النسخة الرقمية المختومة متاحة في حسابكم فوراً."
                  />
                </div>
              </div>

              <div className="mt-14 flex flex-col sm:flex-row gap-4 justify-center">
                 <button 
                  onClick={() => setSelectedTrackingView(null)} 
                  className="px-12 py-4 bg-[#3b0d0c] text-[#E6BE8A] rounded-2xl font-black text-lg hover:bg-[#5a0c0b] transition-all shadow-xl shadow-[#3b0d0c]/20 flex items-center justify-center gap-3 active:scale-95"
                 >
                   إغلاق النافذة
                 </button>
                 {selectedTrackingView.decision_type && (
                    <button 
                      onClick={() => { setSelectedDecision(selectedTrackingView); setSelectedTrackingView(null); }}
                      className="px-12 py-4 bg-white border-2 border-[#3b0d0c] text-[#3b0d0c] rounded-2xl font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      عرض القرار 📂
                    </button>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TrackingStepProps {
  title: string;
  description: string;
  status: 'completed' | 'pending';
  date?: string | null;
  icon: string;
  isLast?: boolean;
}

const TrackingStep: React.FC<TrackingStepProps> = ({ title, description, status, date, icon }) => {
  return (
    <div className="relative pr-14 group">
      {/* Circle Icon Indicator */}
      <div className={`absolute right-0 top-0 w-10 h-10 rounded-full z-20 flex items-center justify-center text-xl transition-all duration-500 border-4 ${
        status === 'completed' 
          ? 'bg-[#5a0c0b] border-[#E6BE8A] shadow-[0_0_15px_rgba(230,190,138,0.5)] scale-110' 
          : 'bg-white border-slate-200 text-slate-300'
      }`}>
        <span className={status === 'completed' ? 'animate-bounce-short text-white' : ''}>
          {status === 'completed' ? '✓' : ''}
        </span>
      </div>
      
      <div className={`p-6 rounded-3xl border transition-all duration-500 ${
        status === 'completed' 
          ? 'bg-white border-slate-200 shadow-lg shadow-slate-200/50' 
          : 'bg-transparent border-dashed border-slate-300 opacity-60'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h4 className={`text-xl font-black font-amiri ${status === 'completed' ? 'text-[#3b0d0c]' : 'text-slate-500'}`}>
              {title}
            </h4>
          </div>
          {date && (
            <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex flex-col items-center gap-1 ${
              status === 'completed' 
                ? 'bg-[#E6BE8A]/5 border-[#E6BE8A]/30 text-[#3b0d0c] shadow-sm' 
                : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              {new Date(date).toLocaleString('ar-MA') !== 'Invalid Date' ? (
                <>
                  <span className="text-[11px] font-black flex items-center gap-1.5">
                    <span className="opacity-60 italic">📅</span>
                    {new Date(date).toLocaleDateString('ar-MA')}
                  </span>
                  <span className="text-[10px] font-bold opacity-70 flex items-center gap-1.5 border-t border-[#3b0d0c]/10 pt-1 w-full justify-center">
                    <span className="opacity-60 italic">🕒</span>
                    {new Date(date).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-bold">{date}</span>
              )}
            </div>
          )}
        </div>
        <p className={`text-sm leading-relaxed font-bold ${status === 'completed' ? 'text-slate-600' : 'text-slate-400'}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`p-6 rounded-xl border ${colors[color]} shadow-sm`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
    </div>
  );
};

export default GenericPermissionPortal;
