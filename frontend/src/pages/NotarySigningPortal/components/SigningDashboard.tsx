import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  Play,
  Filter,
  Layers,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext.tsx';

export const SigningDashboard: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const { data: rasms = [], isLoading } = trpc.feesAgent.documents.listSavedRasms.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken }
  );

  const stats = useMemo(() => {
    const ready = rasms.filter(r => r.status === 'READY_FOR_SIGNATURE' || !r.status || r.status === 'DRAFT' || r.status === 'PENDING').length;
    const partial = rasms.filter(r => r.status === 'PARTIALLY_SIGNED').length;
    const completed = rasms.filter(r => r.status === 'SIGNED' || r.status === 'FINALIZED').length;
    return { ready, partial, completed };
  }, [rasms]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <section className="overflow-hidden rounded-[2.3rem] border border-[#d7c4a0] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 border-b border-[#efe4cc] px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="space-y-3 text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b38a42]">Signing Operations Deck</div>
            <h2 className="text-3xl font-black text-slate-900">الرسوم الجاهزة للدورة العدلية</h2>
            <p className="text-sm font-bold leading-7 text-slate-500">
              تصميم جديد يضع حالة كل رسم، نسبة التقدم، ومسار الدخول إلى صفحة التوقيع ضمن لوحة واحدة أكثر هدوءاً ووضوحاً.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.6rem] border border-blue-100 bg-blue-50/80 p-4 text-right">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">جاهز</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{stats.ready}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-amber-100 bg-amber-50/80 p-4 text-right">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">جزئي</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{stats.partial}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Layers className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50/80 p-4 text-right">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">مكتمل</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{stats.completed}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 lg:grid-cols-3 lg:px-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#fcfaf4] p-4 text-right shadow-inner">
            <div className="flex items-center gap-3 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-[#0d5a47]" />
              <span className="text-sm font-black">ممر توقيع مؤمن</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">كل عملية فتح تنقلك إلى نفس صفحة التوقيع الحالية مع الحفاظ على دورة الحفظ واعتماد الرسم.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#fcfaf4] p-4 text-right shadow-inner">
            <div className="flex items-center gap-3 text-slate-900">
              <Cpu className="h-5 w-5 text-[#0d5a47]" />
              <span className="text-sm font-black">جاهزية الأجهزة</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">التصميم يبرز سريعاً الأعمال الجزئية والمكتملة قبل الانتقال إلى STU-540 دون تغيير المنطق الداخلي.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#fcfaf4] p-4 text-right shadow-inner">
            <div className="flex items-center gap-3 text-slate-900">
              <FileText className="h-5 w-5 text-[#0d5a47]" />
              <span className="text-sm font-black">أرشيف حي</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">الجدول السفلي ما زال المصدر نفسه للرسوم لكنه أعيد تقديمه كبطاقات تنفيذية أوضح بصرياً.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">رسوم جاهزة للتوقيع</p>
              <p className="text-2xl font-black text-slate-900">{stats.ready}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
            <Layers className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">رسوم موقعة جزئياً</p>
              <p className="text-2xl font-black text-slate-900">{stats.partial}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">رسوم مكتملة التوقيع</p>
              <p className="text-2xl font-black text-slate-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.25rem] border border-[#e6dcc7] bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_100%)] shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#efe5cf] bg-[#fcfaf4] px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="text-right">
            <h3 className="flex items-center justify-end gap-2 text-lg font-black text-slate-900">
              <div className="h-6 w-1.5 rounded-full bg-[#0d5a47]" />
            جدول الرسوم المضمّنة
            </h3>
            <p className="mt-2 text-sm font-bold text-slate-500">البيانات نفسها، لكن ضمن معالجة بصرية أقرب إلى غرفة عمليات التوقيع.</p>
          </div>
          <div className="flex items-center gap-4 self-end lg:self-auto">
             <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select className="min-w-[180px] appearance-none rounded-xl border border-[#e6dcc7] bg-white py-2.5 pl-4 pr-9 text-sm font-bold outline-none focus:border-[#0d5a47]">
                  <option>كل الحالات</option>
                  <option>جاهز للتوقيع</option>
                  <option>موقّع جزئياً</option>
                  <option>مكتمل</option>
                </select>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-[#efe5cf] bg-[linear-gradient(180deg,#fbf7ee_0%,#f4efe1_100%)]">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الرسم</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">نوع الرسم</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ التضمين</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1ecdf]">
              {rasms.length > 0 ? (
                rasms.map((rasm) => (
                  <tr key={rasm.id} className="group transition-colors hover:bg-[#fcfaf4]">
                    <td className="px-8 py-5">
                      <span className="font-black text-slate-900 transition-colors group-hover:text-[#0d5a47]">{rasm.fileNumber || '---'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-bold text-slate-600">{rasm.documentType || 'عام'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-500">
                        {new Date(rasm.createdAt).toLocaleDateString('ar-MA')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {rasm.status === 'PARTIALLY_SIGNED' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black">
                            موقّع من العدل الأول
                          </span>
                        </div>
                      ) : rasm.status === 'SIGNED' || rasm.status === 'FINALIZED' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">
                            مكتمل
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black">
                            جاهز للتوقيع
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button
                        onClick={() => navigate(`/notary-signing-portal/sign/${rasm.id}`)}
                        className="mx-auto flex items-center gap-2 rounded-xl border border-[#d8c6a1] bg-[#fffaf0] px-6 py-2 text-xs font-black text-slate-700 shadow-sm transition-all hover:border-[#0d5a47] hover:bg-[#eef6f1] hover:text-[#0d5a47] hover:shadow-md"
                      >
                        {rasm.status === 'PARTIALLY_SIGNED' ? 'متابعة' : 'فتح'}
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">لا توجد رسوم جاهزة للتوقيع حالياً</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
