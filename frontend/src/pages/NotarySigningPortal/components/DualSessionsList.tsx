import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  FileText,
  Fingerprint,
  RefreshCw,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

export const DualSessionsList: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const { data: sessions = [], isLoading, refetch } = trpc.feesAgent.documents.listDualSigningSessions.useQuery(
    { sessionToken: sessionToken || '', filter },
    { enabled: !!sessionToken }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div>
          <h3 className="text-xl font-black text-slate-900">جلسات توقيع العدلين النشطة والمكتملة</h3>
          <p className="text-xs text-slate-500">متابعة لحظية لحالة قفل النسخة وتوقيعات العدلين لكل رسم</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              النشطة
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              المكتملة
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(!sessions || sessions.length === 0) ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto text-2xl shadow-inner">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">لا توجد جلسات توقيع مسجلة حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            يمكنك إنشاء جلسة توقيع جديدة بالدخول إلى أي رسم جاهز في تبويب «الرسوم الجاهزة للتوقيع» والضغط على زر «إنشاء جلسة توقيع العدلين».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s: any) => {
            const isCompleted = s.status === 'COMPLETED';
            const isRejected = s.status === 'REJECTED';
            const isCancelled = s.status === 'CANCELLED';
            const isFirstSigned = s.status === 'FIRST_SIGNED' || s.status === 'SECOND_SIGNER_INVITED' || isCompleted;

            return (
              <div
                key={s.id}
                className={`rounded-[2rem] border p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isRejected
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <span className="text-sm font-black text-slate-900 font-mono">{s.act_number}</span>
                      <p className="text-[11px] text-slate-500 font-bold">{s.document_type || 'رسم عدلي'}</p>
                    </div>

                    <div className="text-left">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> مكتمل 🟢
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> تم الرفض
                        </span>
                      ) : isCancelled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          أُلغيت
                        </span>
                      ) : s.status === 'SECOND_SIGNER_INVITED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          <Send className="w-3 h-3" /> بانتظار العدل الثاني
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> بانتظار العدل الأول
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">كود الجلسة:</span>
                      <span className="font-mono text-slate-800 font-bold">{s.session_code}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">العدل الأول:</span>
                      <span className="font-bold text-slate-900">{s.notary_1_name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">العدل الثاني:</span>
                      <span className="font-bold text-slate-900">{s.notary_2_name || 'غير محدد بعد'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">النسخة:</span>
                      <span className="inline-flex items-center gap-1 text-slate-800 font-bold">
                        {s.is_locked ? <Lock className="w-3 h-3 text-blue-600" /> : <Unlock className="w-3 h-3" />}
                        <span>V.{s.document_version} (مقفلة)</span>
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-mono text-slate-600 truncate">
                      SHA: {s.document_hash}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/notary-signing-portal/sign/${s.act_id}`)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <span>فتح رواق التوقيع</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

