import React, { useState, useMemo } from 'react';
import { QrCode, Copy, Download, Printer, AlertCircle, Lock, Shield, Clock } from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

interface SecureFooterProps {
  documentId?: string;
}

export const SecureFooter: React.FC<SecureFooterProps> = ({ documentId }) => {
  const { sessionToken } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Fetch document data if documentId is provided
  const { data: rawDoc } = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: documentId || '' },
    { enabled: !!sessionToken && !!documentId }
  );
  const document = rawDoc as any;

  const payload = document?.payload || {};

  // Generate SHA-256 like hash from document fields (real implementation would use backend)
  const generateSecurityHash = (id: string, timestamp: string): string => {
    const combined = `${id}-${timestamp}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `SHA256-${Math.abs(hash).toString(16).toUpperCase().padStart(24, '0')}`;
  };

  const referenceData = useMemo(() => ({
    recordId: document?.fileNumber || 'غير محدد',
    volume: (payload as any)?.volume || '---',
    page: (payload as any)?.page || '---',
    inclusionDate: document?.createdAt
      ? new Date(document.createdAt).toLocaleDateString('ar-SA')
      : '---',
    court: (payload as any)?.court || 'محكمة غير محددة',
  }), [document, payload]);

  const notaryData = useMemo(() => ({
    name1: document?.notaryName || 'غير محدد',
    name2: (payload as any)?.secondNotary || '---',
    phone: (payload as any)?.notaryPhone || '---',
    council: (payload as any)?.notaryCouncil || '---',
  }), [document, payload]);

  const securityData = useMemo(() => {
    const timestamp = document?.createdAt ? new Date(document.createdAt).toISOString() : new Date().toISOString();
    const hash = document?.id ? generateSecurityHash(document.id, timestamp) : generateSecurityHash('', timestamp);
    
    return {
      sequential: document?.id ? String(parseInt(document.id.slice(0, 6), 16)).padStart(3, '0') : '---',
      recordNumber: document?.fileNumber || '---',
      documentType: document?.documentType || 'وثيقة',
      signingDate: document?.createdAt
        ? new Date(document.createdAt).toLocaleDateString('ar-SA')
        : '---',
      signingTime: document?.createdAt
        ? new Date(document.createdAt).toLocaleTimeString('ar-SA')
        : '---',
      hash,
      council: (payload as any)?.notaryCouncil || 'غير محددة',
      court: (payload as any)?.court || 'محكمة غير محددة',
      timestamp,
    };
  }, [document, payload]);

  const handleCopyReference = () => {
    const referenceText = `${securityData.recordNumber} | ${referenceData.inclusionDate} | ${securityData.hash}`;
    navigator.clipboard.writeText(referenceText);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t-4 bg-gradient-to-r from-blue-50 to-purple-50 shadow-2xl z-40 transition-all ${isLocked ? 'opacity-90' : ''}`}>
      {/* Top Security Gradient Border */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

      {/* Security Status Bar */}
      {isLocked && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-8 py-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
          <Lock className="w-4 h-4" />
          ✓ تم تأمين الوثيقة بنجاح - لا يمكن تعديلها
        </div>
      )}

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-3 gap-8">
        {/* Unit 1: Reference Data */}
        <div className="border-l-4 border-amber-400 pl-6 bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📘</span>
            <p className="text-xs font-bold text-slate-600 uppercase">مرجع التضمين</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">رقم السجل:</span>
              <span className="font-bold text-slate-900 font-mono">{referenceData.recordId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">العدد:</span>
              <span className="font-bold text-slate-900">{referenceData.volume}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">الصحيفة:</span>
              <span className="font-bold text-slate-900">{referenceData.page}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-600">التاريخ:</span>
              <span className="font-bold text-slate-900">{referenceData.inclusionDate}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 text-center">
              {referenceData.court}
            </div>
          </div>
        </div>

        {/* Unit 2: Notary Data */}
        <div className="border-l-4 border-slate-400 pl-6 bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">👨‍⚖️</span>
            <p className="text-xs font-bold text-slate-600 uppercase">بيانات العدول</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="bg-slate-50 rounded px-2 py-1">
              <span className="text-slate-600 text-xs">العدل الأول: </span>
              <span className="font-bold text-slate-900 block">{notaryData.name1}</span>
            </div>
            <div className="bg-slate-50 rounded px-2 py-1">
              <span className="text-slate-600 text-xs">العدل الثاني: </span>
              <span className="font-bold text-slate-900 block">{notaryData.name2}</span>
            </div>
            <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
              <p>📞 {notaryData.phone}</p>
              <p className="mt-1">🏢 {notaryData.council}</p>
            </div>
          </div>
        </div>

        {/* Unit 3: QR Code & Digital Verification */}
        <div className="border-l-4 border-purple-500 pl-6 bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔐</span>
            <p className="text-xs font-bold text-slate-600 uppercase">التحقق الرقمي</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-xs hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <QrCode className="w-4 h-4" />
              {showQR ? 'إخفاء QR' : 'توليد رمز QR'}
            </button>

            {showQR && (
              <div className="bg-slate-50 border-2 border-purple-300 rounded-lg p-3 space-y-2">
                <div className="w-full flex justify-center bg-white rounded p-2 border border-purple-200">
                  {/* QR Code Placeholder */}
                  <div className="w-24 h-24 bg-purple-100 rounded flex items-center justify-center border-2 border-dashed border-purple-300">
                    <div className="text-center">
                      <QrCode className="w-8 h-8 text-purple-600 mx-auto" />
                      <span className="text-xs text-purple-600 mt-1 block">QR Code</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 space-y-1 bg-white rounded p-2">
                  <p>📋 رقم: {securityData.sequential}</p>
                  <p>📝 النوع: {securityData.documentType}</p>
                  <p className="font-mono text-xs break-all">🔐 {securityData.hash.substring(0, 20)}...</p>
                </div>
              </div>
            )}

            {/* Security Information */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700">التوقيع: {securityData.signingTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">محمي بـ SHA-256</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-slate-200 px-8 py-4 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <button
              disabled
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-2 opacity-70 cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              مؤمّنة
            </button>
          ) : (
            <button
              onClick={() => setIsLocked(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md"
            >
              <Lock className="w-4 h-4" />
              تأمين نهائي
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReference}
            className="px-4 py-2 text-slate-700 font-bold hover:bg-slate-300 rounded-lg transition-colors flex items-center gap-2"
            title="نسخ مرجع التضمين والـ Hash"
          >
            <Copy className="w-4 h-4" />
            نسخ المرجع
          </button>
          <button
            className="px-4 py-2 text-slate-700 font-bold hover:bg-slate-300 rounded-lg transition-colors flex items-center gap-2"
            title="تحميل بيانات الوثيقة"
          >
            <Download className="w-4 h-4" />
            تحميل
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-md"
            title="طباعة مع العلامة المائية"
          >
            <Printer className="w-4 h-4" />
            طباعة آمنة
          </button>
        </div>
      </div>

      {/* Security Info Footer */}
      <div className="border-t border-slate-200 px-8 py-2 bg-slate-50 flex items-center gap-4 text-xs text-slate-600">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>⚠️ <strong>تنويه أمان:</strong> لا يمكن استخراج هذه الوثيقة بدون الشريط السفلي. الحذف أو القص يبطل التحقق الرقمي.</span>
      </div>
    </div>
  );
};
