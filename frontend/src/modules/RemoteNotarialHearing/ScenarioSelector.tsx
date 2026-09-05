import React, { useEffect, useState } from 'react';
import { trpc } from '../../trpc';

export default function ScenarioSelector(props: {
  sessionToken: string;
  session: any | null;
  isLoading: boolean;
  onSelected: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<1 | 2 | null>(null);
  const setPlan = trpc.remoteNotarialHearing.setScenarioPlan.useMutation();

  useEffect(() => {
    if (props.session?.scenario_plan === 1 || props.session?.scenario_plan === 2) {
      setSelectedPlan(props.session.scenario_plan);
    }
  }, [props.session?.id, props.session?.scenario_plan]);

  return (
    <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto py-4">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">اختيار سيناريو الجلسة الرقمية</h2>
        <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full"></div>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          يُرجى تحديد المسار القانوني والتقني المتوافق مع طبيعة التلقي العدلي لضمان سلامة الإجراءات
        </p>
      </div>

      {!props.session ? (
        <div className="max-w-3xl mx-auto p-12 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl text-center">
          <div className="text-6xl mb-6">📂</div>
          <p className="text-xl font-bold text-slate-800">تنبيه: لم يتم تحديد جلسة عمل</p>
          <p className="text-slate-500 mt-2">يرجى اختيار جلسة من تبويب "إدارة الجلسات" للمتابعة</p>
        </div>
      ) : props.isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-emerald-800 font-bold animate-pulse text-lg">جاري تجهيز السيناريوهات القانونية...</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Plan 1 */}
        <div 
          onClick={() => setSelectedPlan(1)}
          className={`group relative p-10 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 hover:ring-8 hover:ring-emerald-50 ${
            selectedPlan === 1 
              ? 'border-emerald-600 bg-white shadow-2xl -translate-y-2' 
              : 'border-slate-100 bg-white/50 hover:border-emerald-200 hover:bg-white'
          }`}
        >
          {selectedPlan === 1 && (
            <div className="absolute -top-5 -right-5 bg-emerald-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl ring-8 ring-white animate-bounce-short">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          )}
          
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8 transition-colors duration-300 ${
            selectedPlan === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
          }`}>
             🏛️
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-4">الخطة الأولى: التلقي عبر عدل ثانٍ عن بعد</h3>
          <p className="text-slate-500 leading-relaxed mb-8 text-base">
            نموذج "الربط الثنائي": حضور عدل واحد حقيقي في المكتب، بينما يتم ربط العدل الثاني عبر القناة المشفرة للمراقبة والتوثيق.
          </p>
          
          <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">مميزات المسار</h4>
            <ul className="space-y-3">
              {[
                "تفعيل بروتوكول الكاميرا والميكروفون الموحد",
                "المطابقة البيومترية التلقائية للعدل عن بعد",
                "لوحة تحكم إشرافية كاملة لصياغة المحضر"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plan 2 */}
        <div 
          onClick={() => setSelectedPlan(2)}
          className={`group relative p-10 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 hover:ring-8 hover:ring-blue-50 ${
            selectedPlan === 2 
              ? 'border-blue-600 bg-white shadow-2xl -translate-y-2' 
              : 'border-slate-100 bg-white/50 hover:border-blue-200 hover:bg-white'
          }`}
        >
          {selectedPlan === 2 && (
            <div className="absolute -top-5 -right-5 bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl ring-8 ring-white animate-bounce-short">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          )}

          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8 transition-colors duration-300 ${
            selectedPlan === 2 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
          }`}>
             👥
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-4">الخطة الثانية: حضور الأطراف عن بعد</h3>
          <p className="text-slate-500 leading-relaxed mb-8 text-base">
            نموذج "اللقاء الافتراضي": حضور العدلين معاً في المكتب العدلي، مع استقدام الأطراف أو الشهود عبر البث المرئي المؤمن.
          </p>

          <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">مميزات المسار</h4>
            <ul className="space-y-3">
              {[
                "بث مشترك عالي الجودة لكافة الأطراف",
                "نظام استجواب وتلقي مباشر للهويات",
                "مشاركة الوثائق الثبوتية فورياً تحت الرقابة"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 pt-12">
        <button 
          disabled={!selectedPlan || setPlan.isPending}
          onClick={async () => {
            if (!props.session || !selectedPlan) return;
            await setPlan.mutateAsync({ sessionToken: props.sessionToken, sessionId: props.session.id, plan: selectedPlan });
            props.onSelected();
          }}
          className={`group flex items-center gap-4 px-16 py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 ${
            selectedPlan 
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-emerald-200/50' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
          }`}
        >
          {setPlan.isPending ? (
            <span className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري التنفيذ...
            </span>
          ) : (
            <>
              اعتماد السيناريو والانتقال للتحقق
              <svg className="w-6 h-6 group-hover:translate-x-[-8px] transition-transform rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </>
          )}
        </button>
        <p className="text-slate-400 text-sm font-medium">سيتم تسجيل اختيار السيناريو كجزء من سجل المراجع التاريخي للجلسة</p>
      </div>
      </>
      )}
    </div>
  );
}
