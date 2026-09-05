import React, { useState } from 'react';
import { ChevronRight, FileText, Users, Home, FileCheck, Download, X, Loader, AlertCircle } from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

interface DetailSidePanelProps {
  documentId: string;
  onClose: () => void;
}

type TabType = 'inclusion' | 'parties' | 'property' | 'registration' | 'files';

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: 'inclusion', label: 'بيانات التضمين', icon: <FileText className="w-4 h-4" /> },
  { id: 'parties', label: 'بيانات الأطراف', icon: <Users className="w-4 h-4" /> },
  { id: 'property', label: 'بيانات السند', icon: <Home className="w-4 h-4" /> },
  { id: 'registration', label: 'التسجيل', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'files', label: 'الملفات', icon: <Download className="w-4 h-4" /> },
];

interface InfoFieldProps {
  label: string;
  value: string | undefined;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value }) => (
  <div>
    <p className="text-xs font-bold text-slate-600 uppercase mb-1">{label}</p>
    <p className="font-bold text-slate-900">{value || '---'}</p>
  </div>
);

export const DetailSidePanel: React.FC<DetailSidePanelProps> = ({ documentId, onClose }) => {
  const { sessionToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('inclusion');

  // Fetch the specific saved rasm document
  const { data: document, isLoading, error } = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: documentId },
    { enabled: !!sessionToken && !!documentId }
  );

  const payload = document?.payload || {};
  const fileNumber = document?.fileNumber || 'غير محدد';
  const documentType = document?.documentType || 'وثيقة';
  const createdAt = document?.createdAt ? new Date(document.createdAt).toLocaleDateString('ar-SA') : '---';

  // Extract data from payload
  const sellers = Array.isArray(payload.sellers) ? payload.sellers : [];
  const firstParty = sellers[0] as any;
  const secondParty = sellers[1] as any;

  const inclusionDate = createdAt;
  const recordNumber = fileNumber;

  if (isLoading) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-40 flex items-center justify-center border-l border-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-bold">جاري تحميل بيانات الوثيقة...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-40 flex items-center justify-center border-l border-slate-200">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="font-bold text-slate-900">خطأ في تحميل الوثيقة</p>
          <p className="text-xs text-slate-600">{(error as any)?.message || 'حدث خطأ غير متوقع'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-slate-200">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900">تفاصيل الوثيقة</h3>
          <p className="text-xs text-slate-600 mt-1">رقم: {documentId.slice(0, 8)}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 px-6 pt-6 pb-0">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-3 font-bold text-sm transition-all relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-6">
        {activeTab === 'inclusion' && (
          <div className="space-y-4">
            <InfoField label="رقم السجل" value={recordNumber} />
            <InfoField label="نوع الوثيقة" value={documentType} />
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-bold text-slate-600 uppercase mb-2">تاريخ التضمين</p>
              <p className="font-bold text-slate-900 text-lg">{inclusionDate}</p>
            </div>
            <InfoField label="حالة الوثيقة" value={document.status || 'DRAFT'} />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-bold">ℹ️ بيانات مسترجعة من قاعدة البيانات</p>
            </div>
          </div>
        )}

        {activeTab === 'parties' && (
          <div className="space-y-4">
            {firstParty ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">الطرف الأول</p>
                <p className="font-bold text-slate-900 text-lg">{(firstParty as any).name || '---'}</p>
                <p className="text-xs text-slate-600 mt-2">رقم البطاقة: {(firstParty as any).idNumber || '---'}</p>
                <p className="text-xs text-slate-600">الجنسية: {(firstParty as any).nationality || '---'}</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">لا توجد بيانات للطرف الأول</p>
              </div>
            )}
            {secondParty ? (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">الطرف الثاني</p>
                <p className="font-bold text-slate-900 text-lg">{(secondParty as any).name || '---'}</p>
                <p className="text-xs text-slate-600 mt-2">رقم البطاقة: {(secondParty as any).idNumber || '---'}</p>
                <p className="text-xs text-slate-600">الجنسية: {(secondParty as any).nationality || '---'}</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">لا توجد بيانات للطرف الثاني</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'property' && (
          <div className="space-y-4">
            <InfoField label="مرجع الملكية" value={(payload as any)?.propertyReference?.toString()} />
            <InfoField label="الرسم العقاري" value={(payload as any)?.propertyNumber?.toString()} />
            <InfoField label="الموقع" value={(payload as any)?.location?.toString()} />
            <InfoField label="النوع" value={(payload as any)?.propertyType?.toString()} />
            <InfoField label="المساحة" value={(payload as any)?.area?.toString()} />
          </div>
        )}

        {activeTab === 'registration' && (
          <div className="space-y-4">
            <InfoField label="رقم التسجيل" value={(payload as any)?.registrationNumber?.toString()} />
            <InfoField label="تاريخ التسجيل" value={inclusionDate} />
            <InfoField label="رقم الأداء" value={(payload as any)?.performanceNumber?.toString()} />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-700 mb-2">✓ حالة التسجيل</p>
              <p className="font-bold text-blue-600">{document.status || 'قيد المعالجة'}</p>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-3">
            {document.attachments && document.attachments.length > 0 ? (
              document.attachments.map((attachment, idx) => (
                <div
                  key={attachment.id}
                  className="border-2 border-dashed border-blue-300 rounded-lg p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-bold text-blue-600">📄 {attachment.category}</p>
                  <p className="text-xs text-slate-600 mt-1">{attachment.fileName}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {attachment.fileSize ? `حجم: ${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB` : 'حجم غير محدد'}
                  </p>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">لا توجد ملفات مرفقة بهذه الوثيقة</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
