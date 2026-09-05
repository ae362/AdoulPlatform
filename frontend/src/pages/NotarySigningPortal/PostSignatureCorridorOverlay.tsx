import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { trpc } from '../../trpc';

type FinalCategory = 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other';

type DeviceInfo = {
  serial: string;
  firmware: string;
  resolution: string;
  pressureLevels: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  sessionToken: string;
  rasmId: string;

  rasm: any;
  registrationNumber: string;
  isCoSigned: boolean;

  preHash: string;
  adoul1BioHash: string | null;
  adoul2BioHash: string | null;

  deviceInfo: DeviceInfo;

  getSignedPdfBase64: () => Promise<string | undefined>;

  lastSignedDeedId: string | null;
  onSignedDeedId: (id: string) => void;
};

export const PostSignatureCorridorOverlay: React.FC<Props> = ({
  open,
  onClose,
  sessionToken,
  rasmId,
  rasm,
  registrationNumber,
  isCoSigned,
  preHash,
  adoul1BioHash,
  adoul2BioHash,
  deviceInfo,
  getSignedPdfBase64,
  lastSignedDeedId,
  onSignedDeedId,
}) => {
  const navigate = useNavigate();
  const [selectedFinalCategory, setSelectedFinalCategory] = useState<FinalCategory | null>(null);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(null);
  const [corridorError, setCorridorError] = useState<string | null>(null);
  const [isFinalSaveConfirmOpen, setIsFinalSaveConfirmOpen] = useState(false);

  const [sealHash, setSealHash] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [postJudgeSealedAt, setPostJudgeSealedAt] = useState<string | null>(null);

  const finalSaveMutation = trpc.feesAgent.documents.finalSaveAfterSignature.useMutation();
  const sealMutation = trpc.feesAgent.documents.sealSignedDeedForCorrespondence.useMutation();
  const sendToJudgeMutation = trpc.feesAgent.documents.sendSignedDeedToJudge.useMutation();
  const archivePostJudgeMutation = trpc.feesAgent.documents.archiveSignedDeedPostJudge.useMutation();

  const effectiveSignedDeedId = lastSignedDeedId;

  const notary1Name = (rasm as any)?.payload?.notary1Name || '...';
  const notary2Name = (rasm as any)?.payload?.notary2Name || '...';
  const court = (rasm as any)?.payload?.court || '---';

  const createdAtText = useMemo(() => {
    const raw = rasm?.createdAt;
    if (!raw) return '---';
    try {
      return new Date(raw).toLocaleDateString('ar-MA');
    } catch {
      return String(raw);
    }
  }, [rasm?.createdAt]);

  const signatureHashText = adoul1BioHash || adoul2BioHash || preHash || '---';

  const devicePayload = {
    serial: deviceInfo.serial,
    firmware: deviceInfo.firmware,
    resolution: deviceInfo.resolution,
    pressureLevels: deviceInfo.pressureLevels,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  const handleConfirmFinalSave = async () => {
    if (!selectedFinalCategory) {
      setFinalSaveError('لا يمكن الحفظ دون اختيار الصنف.');
      return;
    }
    setFinalSaveError(null);
    setCorridorError(null);

    try {
      const signedPdfBase64 = await getSignedPdfBase64();
      const res = await finalSaveMutation.mutateAsync({
        sessionToken,
        id: rasmId,
        category: selectedFinalCategory,
        signedPdfBase64,
        device: devicePayload,
      });
      const signedDeedId = (res as any)?.signedDeedId ? String((res as any).signedDeedId) : null;
      if (signedDeedId) {
        onSignedDeedId(signedDeedId);
      }
      setIsFinalSaveConfirmOpen(false);
    } catch (e: any) {
      setFinalSaveError(e?.message || 'تعذر حفظ الرسم.');
    }
  };

  const handleSeal = async () => {
    if (!effectiveSignedDeedId) return;
    setCorridorError(null);
    try {
      const res = await sealMutation.mutateAsync({
        sessionToken,
        signedDeedId: effectiveSignedDeedId,
        device: devicePayload,
      });
      setSealHash(String((res as any)?.sealHash || ''));
    } catch (e: any) {
      setCorridorError(e?.message || 'تعذر ختم الرسم.');
    }
  };

  const handleSendToJudge = async () => {
    if (!effectiveSignedDeedId) return;
    setCorridorError(null);
    try {
      const res = await sendToJudgeMutation.mutateAsync({
        sessionToken,
        signedDeedId: effectiveSignedDeedId,
        device: devicePayload,
      });
      setSentAt(String((res as any)?.timestamp || new Date().toISOString()));
    } catch (e: any) {
      setCorridorError(e?.message || 'تعذر إرسال الرسم للمخاطبة.');
    }
  };

  const handleArchivePostJudge = async () => {
    if (!effectiveSignedDeedId) return;
    setCorridorError(null);
    try {
      const res = await archivePostJudgeMutation.mutateAsync({
        sessionToken,
        signedDeedId: effectiveSignedDeedId,
        device: devicePayload,
      });
      setPostJudgeSealedAt(String((res as any)?.sealedAt || new Date().toISOString()));
    } catch (e: any) {
      setCorridorError(e?.message || 'تعذر تنفيذ الأرشفة النهائية.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-gradient-to-br from-blue-50 via-white to-slate-100 text-slate-900 overflow-auto rtl">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">📜 رواق توجيه الرسم والأرشفة المؤمنة</h1>
            <p className="text-xs md:text-sm text-slate-600 font-bold">يظهر مباشرة بعد توقيع العدلين: تصنيف → حفظ نهائي → ختم → مخاطبة → أرشفة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        {/* 1) Deed Info */}
        <div className="bg-white rounded-3xl shadow-lg border border-blue-100">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <span className="text-2xl">📜</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-bold">بطاقة معلومات الرسم</p>
                  <p className="text-lg font-black text-slate-900">📄 الرسم العدلي رقم: {rasm?.fileNumber || registrationNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCoSigned ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">✔ تم توقيع العدلين بنجاح</span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black">بانتظار التوقيعين</span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">⚖ نوع الرسم</p>
                <p className="text-sm font-black text-slate-900">{rasm?.documentType || '---'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">📅 التاريخ</p>
                <p className="text-sm font-black text-slate-900">{createdAtText}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">🔐 بصمة التوقيع الرقمية</p>
                <p className="text-xs font-mono text-slate-900 break-all">{signatureHashText}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">👤 العدل الأول</p>
                <p className="text-sm font-black text-slate-900">{notary1Name}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">👤 العدل الثاني</p>
                <p className="text-sm font-black text-slate-900">{notary2Name}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-bold">🏛 المحكمة</p>
                <p className="text-sm font-black text-slate-900">{court}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-black text-blue-900">🔐 بصمة التوقيع الرقمية محفوظة</p>
              <p className="text-xs font-bold text-blue-800 mt-1">أي تغيير بعد هذه المرحلة سيؤدي إلى رفض Hash عند التحقق.</p>
            </div>
          </div>
        </div>

        {/* 2) Classification */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">📂 اختيار صنف الرسم (إجباري)</h2>
                <p className="text-sm text-slate-600 font-bold mt-1">اختر صنف الرسم قبل الحفظ النهائي</p>
              </div>
              {selectedFinalCategory ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">تم الاختيار</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black">مطلوب</span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {([
                { key: 'Marriage', label: '💍 رسوم الزواج' },
                { key: 'Property', label: '🏠 رسوم الأملاك' },
                { key: 'Inheritance', label: '⚖ رسوم التركات' },
                { key: 'Divorce', label: '💔 رسوم الطلاق' },
                { key: 'Other', label: '📁 باقي الوثائق' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedFinalCategory(opt.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-right transition-all ${
                    selectedFinalCategory === opt.key ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-black text-slate-900">{opt.label}</span>
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedFinalCategory === opt.key ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'
                    }`}
                  >
                    {selectedFinalCategory === opt.key ? <span className="text-white text-xs font-black">✓</span> : null}
                  </span>
                </button>
              ))}
            </div>

            {!selectedFinalCategory && (
              <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-sm font-black text-amber-800">🟡 لا يمكن حفظ الرسم دون اختيار الصنف.</p>
                <p className="text-xs font-bold text-amber-700 mt-1">سيتم اعتماد هذا التصنيف في الأرشفة والبحث مستقبلاً.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3) Final Save */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">✅ مرحلة الحفظ النهائي</h2>
                <p className="text-sm text-slate-600 font-bold mt-1">SignedDeeds + InclusionRegistry + OperationLog</p>
              </div>
              {effectiveSignedDeedId ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">تم الحفظ</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black">غير محفوظ</span>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-900">معيار البصمة الرقمية: SHA-256 وفق معيار NIST FIPS 180-4</p>
              <a
                className="text-xs font-black text-violet-700 hover:underline"
                href="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf"
                target="_blank"
                rel="noreferrer"
              >
                المصدر: NIST.FIPS.180-4.pdf
              </a>
            </div>

            {finalSaveError && (
              <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-black">
                {finalSaveError}
              </div>
            )}

            {corridorError && (
              <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-black">
                {corridorError}
              </div>
            )}

            <div className="mt-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="text-xs text-slate-600 font-bold">
                {effectiveSignedDeedId ? (
                  <span>
                    SignedDeed ID: <span className="font-mono break-all">{effectiveSignedDeedId}</span>
                  </span>
                ) : (
                  <span>اختر الصنف ثم قم بالحفظ النهائي.</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorridorError(null);
                  if (!selectedFinalCategory) {
                    setFinalSaveError('لا يمكن الحفظ دون اختيار الصنف.');
                    return;
                  }
                  setFinalSaveError(null);
                  setIsFinalSaveConfirmOpen(true);
                }}
                disabled={!isCoSigned || !selectedFinalCategory || finalSaveMutation.isPending || !!effectiveSignedDeedId}
                className={`px-5 py-3 rounded-2xl text-white font-black text-sm transition-all ${
                  !isCoSigned || !selectedFinalCategory || finalSaveMutation.isPending || !!effectiveSignedDeedId
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                }`}
              >
                {finalSaveMutation.isPending ? 'جاري الحفظ...' : effectiveSignedDeedId ? 'تم الحفظ' : 'حفظ نهائي للرسم'}
              </button>
            </div>
          </div>
        </div>

        {/* 4) Seal */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">🔐 ختم العدل وتجهيز الرسم للمخاطبة</h2>
                <p className="text-sm text-slate-600 font-bold mt-1">توليد QR + SealHash + قفل الرسم</p>
              </div>
              {sealHash ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">مختوم</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black">غير مختوم</span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500">📱 QR</p>
                <p className="text-sm font-black text-slate-900">Hash / UUID / مراجع التضمين</p>
                <a
                  className="text-xs font-black text-violet-700 hover:underline"
                  href="https://www.iso.org/standard/62021.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  معيار QR: ISO/IEC 18004
                </a>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500">📑 مراجع التضمين</p>
                <p className="text-sm font-black text-slate-900">تم جلب بيانات التضمين تلقائياً</p>
                <p className="text-xs font-bold text-slate-600 mt-1">لا يمكن تعديلها بعد الختم.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500">👨‍⚖ معلومات العدلين</p>
                <p className="text-sm font-black text-slate-900">المحكمة/الهاتف/البريد</p>
              </div>
            </div>

            {sealHash && (
              <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-black text-emerald-800">SealHash</p>
                <p className="text-xs font-mono text-emerald-900 break-all mt-1">{sealHash}</p>
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-sm font-black text-amber-800">⚠ بعد إنشاء الشريط السفلي سيتم:</p>
              <p className="text-xs font-bold text-amber-700 mt-1">قفل الرسم نهائياً ومنع أي تعديل وتوليد SealHash جديد.</p>
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSeal}
                disabled={!effectiveSignedDeedId || sealMutation.isPending || !!sealHash}
                className={`px-5 py-3 rounded-2xl text-white font-black text-sm transition-all ${
                  !effectiveSignedDeedId || sealMutation.isPending || !!sealHash
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                }`}
              >
                {sealMutation.isPending ? 'جاري الإعداد...' : 'إعداد الرسم للمخاطبة'}
              </button>
            </div>
          </div>
        </div>

        {/* 5) Correspondence */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">⚖ إرسال الرسم لقاضي التوثيق</h2>
                <p className="text-sm text-slate-600 font-bold mt-1">يتم إرسال النسخة المختومة إلى منصة القاضي.</p>
              </div>
              {sentAt ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">تم الإرسال</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black">غير مُرسل</span>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-black text-slate-800">🧠 تنبيه ذكي: هل الرسم خاضع للتسجيل؟</p>
              <p className="text-xs font-bold text-slate-600 mt-1">تأكد من إتمام التسجيل والتنبر قبل المخاطبة.</p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-600">
                {sentAt ? `تم الإرسال بتاريخ: ${new Date(sentAt).toLocaleString('ar-MA')}` : 'يتطلب الختم قبل الإرسال.'}
              </div>
              <button
                type="button"
                onClick={handleSendToJudge}
                disabled={!effectiveSignedDeedId || !sealHash || sendToJudgeMutation.isPending || !!sentAt}
                className={`px-5 py-3 rounded-2xl text-white font-black text-sm transition-all ${
                  !effectiveSignedDeedId || !sealHash || sendToJudgeMutation.isPending || !!sentAt
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                }`}
              >
                {sendToJudgeMutation.isPending ? 'جاري الإرسال...' : 'إرسال للمخاطبة'}
              </button>
            </div>
          </div>
        </div>

        {/* 6) Secure Archiving */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200">
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">🗄 الأرشفة النهائية المؤمنة</h2>
                <p className="text-sm text-slate-600 font-bold mt-1">FinalSecureArchive + Audit Log + SearchIndex + VerificationLink</p>
              </div>
              {postJudgeSealedAt ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black">مؤرشف</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black">غير مؤرشف</span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-black text-slate-900">1) FinalSecureArchive</p>
                <p className="text-xs font-bold text-slate-600 mt-1">Pre-Judge و Post-Judge + Immutable (Read Only / No Delete / No Edit)</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-black text-slate-900">2) Verification Link + QR</p>
                <p className="text-xs font-bold text-slate-600 mt-1">UUID + OTP optional</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="text-xs font-bold text-slate-600">
                {postJudgeSealedAt ? `تمت الأرشفة بتاريخ: ${new Date(postJudgeSealedAt).toLocaleString('ar-MA')}` : 'يتطلب الإرسال للمخاطبة قبل الأرشفة.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleArchivePostJudge}
                  disabled={!effectiveSignedDeedId || !sentAt || archivePostJudgeMutation.isPending || !!postJudgeSealedAt}
                  className={`px-5 py-3 rounded-2xl text-white font-black text-sm transition-all ${
                    !effectiveSignedDeedId || !sentAt || archivePostJudgeMutation.isPending || !!postJudgeSealedAt
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                  }`}
                >
                  {archivePostJudgeMutation.isPending ? 'جاري الأرشفة...' : 'أرشفة نهائية مؤمنة'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/secure-archive')}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-colors"
                >
                  فتح الأرشيف
                </button>
                <button
                  type="button"
                  onClick={() => navigate(effectiveSignedDeedId ? `/signed-rasms/${effectiveSignedDeedId}` : '/signed-rasms')}
                  className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 font-black text-sm hover:bg-slate-50 transition-colors"
                >
                  معاينة الرسم
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Save Confirmation Modal */}
      {isFinalSaveConfirmOpen && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-violet-800 via-purple-600 to-violet-400 text-white">
                <h3 className="text-sm font-black">هل أنت متأكد من الحفظ النهائي للرسم؟</h3>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm font-black text-slate-900">سيتم تنفيذ العمليات التالية:</p>
                <ul className="text-sm font-bold text-slate-700 space-y-1 list-none">
                  <li>✔ حفظ الرسم في الأرشيف الأولي</li>
                  <li>✔ ربطه ببيانات التضمين تلقائياً</li>
                  <li>✔ إنشاء سجل أمني للعملية</li>
                  <li>✔ توليد البصمة الرقمية النهائية</li>
                </ul>

                {finalSaveError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-black">
                    {finalSaveError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFinalSaveConfirmOpen(false);
                      setFinalSaveError(null);
                    }}
                    className="px-4 py-2 rounded-2xl border-2 border-purple-500 text-purple-700 font-black text-sm hover:bg-purple-50 transition-colors"
                    disabled={finalSaveMutation.isPending}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFinalSave}
                    disabled={!selectedFinalCategory || finalSaveMutation.isPending}
                    className={`px-4 py-2 rounded-2xl text-white font-black text-sm transition-all ${
                      !selectedFinalCategory || finalSaveMutation.isPending
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 hover:from-violet-600 hover:via-purple-500 hover:to-violet-400 shadow-lg shadow-purple-500/20'
                    }`}
                  >
                    {finalSaveMutation.isPending ? 'جاري الحفظ...' : '🟣 تأكيد الحفظ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
