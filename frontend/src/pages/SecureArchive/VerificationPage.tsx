import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, FileText, Loader, Printer, ShieldCheck } from 'lucide-react';
import { trpc } from '../../trpc';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleString('ar-MA');
}

function shortHash(value: string | null | undefined) {
  if (!value) return '---';
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export const VerificationPage: React.FC = () => {
  const params = useParams();
  const token = (params.token || '').trim();

  const canQuery = useMemo(() => {
    // token is UUID (server validates); keep client permissive.
    return token.length > 0;
  }, [token]);

  const verifyQuery = trpc.feesAgent.documents.verifyByToken.useQuery(
    { token },
    {
      enabled: canQuery,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const data = verifyQuery.data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">صفحة التحقق</h1>
                <p className="text-slate-600 font-bold text-sm">تحقق عام من صحة الأرشفة والبصمات</p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!canQuery ? (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900">رمز تحقق غير صالح</h2>
            <p className="text-slate-600 font-bold mt-2">تحقق من رابط QR.</p>
          </div>
        ) : verifyQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            <span className="mr-3 text-slate-600 font-bold">جاري التحقق...</span>
          </div>
        ) : verifyQuery.error ? (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900">تعذر التحقق</h2>
            <p className="text-slate-600 font-bold mt-2">قد يكون الرابط غير صحيح أو منتهي.</p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-black text-slate-900">لا توجد بيانات</h2>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
            <div className={`p-6 border-b ${data.valid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${data.valid ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {data.valid ? <BadgeCheck className="w-6 h-6 text-emerald-700" /> : <AlertCircle className="w-6 h-6 text-red-700" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {data.valid ? 'صالح للتحقق' : 'غير صالح'}
                  </h2>
                  {!data.valid && data.reason && (
                    <p className="text-sm font-bold text-slate-700 mt-1">السبب: {data.reason}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="رقم الرسم" value={data.fileNumber || '---'} />
                <InfoRow label="نوع الوثيقة" value={data.documentType || '---'} />
                <InfoRow label="المحكمة" value={data.court || '---'} />
                <InfoRow label="انتهاء الصلاحية" value={formatDateTime(data.expiresAt)} />
                <InfoRow label="SHA-256 (Pre)" value={shortHash(data.preJudgeSha256)} />
                <InfoRow label="SHA-256 (Post)" value={shortHash(data.postJudgeSha256)} />
              </div>

              {data.artifactUrl && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <p className="font-black text-slate-900">الوثيقة المؤرشفة</p>
                  </div>
                  <a
                    href={data.artifactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors"
                  >
                    فتح
                  </a>
                </div>
              )}

              {data.signedDeedId && (
                <div className="mt-6 text-center">
                  <Link
                    to={`/signed-rasms/${data.signedDeedId}`}
                    className="inline-block px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors"
                  >
                    فتح داخل النظام
                  </Link>
                </div>
              )}

              <p className="mt-6 text-xs font-bold text-slate-500 text-center">
                هذه الصفحة تعرض بيانات تحقق محدودة ولا تعرض بيانات شخصية.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-1" dir="ltr">
        {value}
      </p>
    </div>
  );
};
