import React, { useState, useMemo } from 'react';
import { QrCode, Copy, Download, Eye, Lock, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentReference {
  serialNumber: string;
  recordNumber: string;
  edition: string;
  page: string;
  inclusionDate: string;
  court: string;
  documentType: string;
}

interface NotaryData {
  firstName: string;
  secondName: string;
  phone: string;
  email: string;
}

interface SegmentData {
  digitalHash: string;
  signatureDate: string;
  regionalCouncil: string;
  status: 'signed' | 'addressed' | 'archived';
  timestamp: string;
}

interface BottomSecurityStripProps {
  qrCode: string; // Base64 QR image
  documentReference: DocumentReference;
  notaryData: NotaryData;
  segmentData: SegmentData;
  onVerify?: () => void;
  isLocked?: boolean;
}

export const BottomSecurityStrip: React.FC<BottomSecurityStripProps> = ({
  qrCode,
  documentReference,
  notaryData,
  segmentData,
  onVerify,
  isLocked = false,
}) => {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // مراجع الرسم - Document References
  const DocumentReferencesSection = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center border-l border-r border-[#d4af37]/30">
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[#d4af37] font-bold">📚</span>
          <div className="text-right">
            <div className="text-xs text-slate-600 font-bold uppercase">سجل البيانات</div>
            <div className="text-sm font-black text-slate-900">{documentReference.recordNumber}</div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[#d4af37] font-bold">🔢</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">العدد</div>
              <div className="text-sm font-black text-slate-900">{documentReference.edition}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[#d4af37] font-bold">📄</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">الصحيفة</div>
              <div className="text-sm font-black text-slate-900">{documentReference.page}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[#d4af37] font-bold">📅</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">تاريخ التضمين</div>
              <div className="text-sm font-black text-slate-900">{documentReference.inclusionDate}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[#d4af37] font-bold">⚖</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">المحكمة</div>
              <div className="text-xs font-black text-slate-900">{documentReference.court}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // بيانات العدول - Notary Data
  const NotaryDataSection = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-blue-600 font-bold">👨‍⚖️</span>
          <div className="text-right">
            <div className="text-xs text-slate-600 font-bold uppercase">العدل الأول</div>
            <div className="text-sm font-black text-slate-900">{notaryData.firstName}</div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 font-bold">👨‍⚖️</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">العدل الثاني</div>
              <div className="text-sm font-black text-slate-900">{notaryData.secondName}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-purple-600 font-bold">📱</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">الهاتف</div>
              <div className="text-sm font-black text-slate-900">{notaryData.phone}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-600 font-bold">📧</span>
            <div className="text-right">
              <div className="text-xs text-slate-600 font-bold uppercase">البريد الإلكتروني</div>
              <div className="text-[10px] font-black text-slate-900 font-mono">{notaryData.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // كود QR - QR Code
  const QRCodeSection = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-32 h-32 bg-white p-2 rounded-lg border-2 border-[#d4af37]/50 flex items-center justify-center overflow-hidden">
          {qrCode ? (
            <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <QrCode className="w-12 h-12 text-slate-400" />
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
            رمز التحقق الرسمي
          </p>
          <p className="text-[9px] text-slate-500 leading-tight max-w-[100px]">
            امسح للتحقق من الأصالة
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(segmentData.digitalHash);
              setShowCopyFeedback(true);
              setTimeout(() => setShowCopyFeedback(false), 2000);
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Copy Hash"
          >
            <Copy className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4 text-slate-600" />
          </button>
          {onVerify && (
            <button
              onClick={onVerify}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              title="Verify"
            >
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>

        {showCopyFeedback && (
          <span className="text-[9px] text-green-600 font-bold">✓ تم النسخ</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white border-4 border-[#d4af37] rounded-lg overflow-hidden shadow-2xl">
      {/* Main Horizontal Strip */}
      <div className="flex items-center gap-0 bg-gradient-to-r from-slate-50 to-white p-0">
        {/* QR Code - Left Section (Highest Priority) */}
        <QRCodeSection />

        {/* Document References - Center Section */}
        <DocumentReferencesSection />

        {/* Notary Data - Right Section */}
        <NotaryDataSection />
      </div>

      {/* Security Information Bar */}
      <div className={`border-t-4 border-[#d4af37]/30 px-6 py-3 flex items-center justify-between ${isLocked ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center gap-3">
          {isLocked && <Lock className="w-4 h-4 text-green-600" />}
          <div className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
            {isLocked ? '✓ مؤمن نهائياً' : '⚠ قيد المعالجة'}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[9px] font-bold text-slate-600">
          <span>Hash: {segmentData.digitalHash.slice(0, 16)}...{segmentData.digitalHash.slice(-8)}</span>
          <span className="text-[#d4af37]">•</span>
          <span>التوقيع: {segmentData.signatureDate}</span>
          <span className="text-[#d4af37]">•</span>
          <span>الحالة: {segmentData.status === 'signed' ? 'موقّع' : segmentData.status === 'addressed' ? 'مُخاطب' : 'مؤرشف'}</span>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-[10px] font-black text-green-700 uppercase">مؤمن</span>
          </div>
        )}
      </div>

      {/* Expanded Details (if showDetails) */}
      {showDetails && (
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 text-[9px] space-y-2 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-600 font-bold">البصمة الرقمية (SHA-256)</p>
              <p className="font-mono text-slate-900 text-[8px] break-all mt-1">{segmentData.digitalHash}</p>
            </div>
            <div>
              <p className="text-slate-600 font-bold">الرقم التسلسلي</p>
              <p className="font-mono text-slate-900">{documentReference.serialNumber}</p>
            </div>
            <div>
              <p className="text-slate-600 font-bold">وقت التوقيع</p>
              <p className="font-mono text-slate-900">{segmentData.timestamp}</p>
            </div>
            <div>
              <p className="text-slate-600 font-bold">المجلس الجهوي</p>
              <p className="font-mono text-slate-900">{segmentData.regionalCouncil}</p>
            </div>
            <div>
              <p className="text-slate-600 font-bold">نوع الوثيقة</p>
              <p className="font-mono text-slate-900">{documentReference.documentType}</p>
            </div>
            <div>
              <p className="text-slate-600 font-bold">حالة النسخة</p>
              <p className="font-mono text-slate-900">
                {segmentData.status === 'signed' ? '✓ موقّعة عدلياً' : segmentData.status === 'addressed' ? '✓ مخاطب عليه' : '✓ مؤرشفة'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="border-t border-slate-200 px-6 py-2 bg-blue-50 text-[8px] text-blue-900 font-bold text-center leading-tight">
        🔒 وثيقة موثوقة معتمدة رسمياً • لا يمكن تعديلها أو حذف الشريط السفلي • محمية ببصمة رقمية SHA-256
      </div>
    </div>
  );
};
