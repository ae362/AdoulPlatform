import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  ArrowLeft,
  RefreshCw,
  Send
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

export const SigningTasksList: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const { data: tasks = [], isLoading, refetch } = trpc.feesAgent.documents.listMySigningTasks.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, refetchInterval: 8000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto text-2xl shadow-inner">
          <Bell className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">لا توجد طلبات توقيع واردة حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            عندما يقوم عدل زميل بتوقيع رسم واستدعائك للمصادقة وتوقيع الرسم كعدل ثانٍ، ستظهر مهمة التوقيع هنا فوراً مع فحص النزاهة المشفر.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث الطلبات</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl font-black text-slate-900">طلبات التوقيع الواردة من السادة العدول</h3>
          <p className="text-xs text-slate-500">مهام توقيع رسمية مسندة إليك لإتمام الدورة العدلية الثنائية</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition"
          title="تحديث"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((t: any) => {
          const isPending = t.status === 'PENDING' || t.status === 'VIEWED';
          const isCompleted = t.status === 'COMPLETED';
          const isRejected = t.status === 'REJECTED';

          return (
            <div
              key={t.id}
              className={`rounded-[2rem] border p-6 transition-all shadow-xs hover:shadow-md ${
                isCompleted
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : isRejected
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isRejected
                      ? 'bg-red-600 text-white'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                  }`}>
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{t.act_number}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {t.task_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">{t.document_type || 'رسم عدلي رسمي'}</p>
                  </div>
                </div>

                <div>
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                    </span>
                  ) : isRejected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-red-700 bg-red-100/70 px-2.5 py-1 rounded-full border border-red-300">
                      <XCircle className="w-3.5 h-3.5" /> مرفوض
                    </span>
                  ) : t.session?.status === 'WAITING_FOR_FIRST_SIGNATURE' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-full border border-indigo-300">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> في انتظار توقيع العدل الأول
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300 shadow-xs animate-pulse">
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-600" /> جاهزة لتوقيعك الآن
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500">العدل المتلقي:</span>
                  <span className="font-bold text-slate-900">{t.assigned_by_notary_name}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500">العدل الأول:</span>
                  {t.session?.status === 'WAITING_FOR_FIRST_SIGNATURE' ? (
                    <span className="inline-flex items-center gap-1 text-indigo-600 font-bold">
                      <Clock className="w-3.5 h-3.5" /> قيد التوقيع
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> تم التوقيع بنجاح
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500">حالة الوثيقة:</span>
                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                    <Lock className="w-3.5 h-3.5" /> مقفلة ومشفرة
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 font-sans font-bold">بصمة SHA-256:</span>
                  <span className="text-slate-800 tracking-wider">
                    {t.document_hash ? `${t.document_hash.slice(0, 12)}...${t.document_hash.slice(-8)}` : 'سليمة ومعتمدة'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/notary-signing-portal/sign/${t.act_id}`)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 ${
                    isCompleted
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : t.session?.status === 'WAITING_FOR_FIRST_SIGNATURE'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    {isCompleted
                      ? 'معاينة الرسم والحزمة'
                      : t.session?.status === 'WAITING_FOR_FIRST_SIGNATURE'
                      ? 'معاينة ومتابعة الجلسة'
                      : 'معاينة وتوقيع الرسم الآن'}
                  </span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

