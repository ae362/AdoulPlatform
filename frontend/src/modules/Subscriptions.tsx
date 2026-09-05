import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type TabKey = 'dashboard' | 'annual' | 'monthly' | 'affiliation' | 'stamps' | 'notebook' | 'register' | 'badge' | 'equipment' | 'suit' | 'other' | 'donations' | 'receipts' | 'statistics';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'لوحة الحالة' },
  { key: 'annual', label: 'الاشتراك السنوي' },
  { key: 'monthly', label: 'الاشتراك الشهري' },
  { key: 'affiliation', label: 'الانخراط' },
  { key: 'stamps', label: 'الدمغة' },
  { key: 'notebook', label: 'كناش التصاريح' },
  { key: 'register', label: 'سجل البيانات' },
  { key: 'badge', label: 'الشارة' },
  { key: 'equipment', label: 'التجهيزات' },
  { key: 'suit', label: 'البدلة' },
  { key: 'other', label: 'مساهمات اخرى' },
  { key: 'donations', label: 'تبرعات' },
  { key: 'receipts', label: 'الإيصالات' },
  { key: 'statistics', label: 'الإحصائيات' },
];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>;
}

function Badge({
  kind,
  children,
}: {
  kind: 'paid' | 'unpaid' | 'overdue' | 'info';
  children: React.ReactNode;
}) {
  const cls =
    kind === 'paid'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : kind === 'overdue'
        ? 'bg-rose-50 text-rose-800 ring-rose-200'
        : kind === 'unpaid'
          ? 'bg-amber-50 text-amber-900 ring-amber-200'
          : 'bg-slate-50 text-slate-800 ring-slate-200';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${cls}`}>{children}</span>;
}

function formatMoney(amount: number, currency = 'MAD') {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toFixed(2)} ${currency}`;
}

function getSubscriptionLabel(type: string, year?: number, month?: number | null) {
  switch (type) {
    case 'annual': return `اشتراك سنوي ${year || ''}`;
    case 'monthly': return `اشتراك شهري ${month ? `${month}/` : ''}${year || ''}`;
    case 'affiliation': return 'واجب الانخراط';
    case 'notebook': return 'كناش التصاريح';
    case 'register': return 'سجل البيانات';
    case 'badge': return 'الشارة';
    case 'equipment': return 'التجهيزات';
    case 'suit': return 'البدلة';
    case 'other': return 'مساهمات اخرى';
    default: return type;
  }
}

export function SubscriptionsModule() {
  const { sessionToken } = useAuth();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [year, setYear] = useState(() => new Date().getFullYear());

  if (!sessionToken) {
    return (
      <div dir="rtl" className="mx-auto max-w-5xl">
        <Card>
          <div className="text-right text-xl font-extrabold text-slate-900 font-maghribi">قسم الاشتراكات</div>
          <div className="mt-2 text-right text-sm text-slate-600">يلزم تسجيل الدخول لاستخدام هذه البوابة.</div>
        </Card>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <div className="text-3xl font-black text-slate-900 font-maghribi">قسم الاشتراكات</div>
            <div className="mt-1 text-sm text-slate-600">
              اشتراكات (سنوي/شهري)، تبرعات، دمغات، إيصالات، ولوحة تحصيل—داخل التطبيق.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <label className="text-sm font-bold text-slate-700">
              السنة
              <input
                type="number"
                className="mr-2 w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-amber-200"
                value={year}
                onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))}
                min={2000}
                max={2100}
              />
            </label>
            <Badge kind="info">MVP</Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'dashboard' ? <StatusDashboardTab sessionToken={sessionToken} year={year} onNavigate={setTab} /> : null}
      {tab === 'annual' ? <AnnualTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'monthly' ? <MonthlyTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'affiliation' ? <AffiliationTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'stamps' ? <StampsTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'notebook' ? <NotebookTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'register' ? <RegisterTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'badge' ? <BadgeTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'equipment' ? <EquipmentTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'suit' ? <SuitTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'other' ? <OtherContributionsTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'donations' ? <DonationsTab sessionToken={sessionToken} year={year} /> : null}
      {tab === 'receipts' ? <ReceiptsTab sessionToken={sessionToken} /> : null}
      {tab === 'statistics' ? <DashboardTab sessionToken={sessionToken} year={year} /> : null}
    </div>
  );
}

function StatusDashboardTab({ sessionToken, year, onNavigate }: { sessionToken: string; year: number; onNavigate?: (tab: any) => void }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const utils = trpc.useUtils();
  
  // Auto-refresh every 3 seconds to reflect Payment updates immediately
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { 
     staleTime: 0, 
     refetchInterval: 3000 
  });

  const payAllMutation = trpc.subscriptions.payAllOutstandingDues.useMutation({
    onSuccess: () => {
      utils.subscriptions.listSubscriptions.invalidate();
      utils.subscriptions.getPaymentsForCouncil.invalidate();
      setShowPaymentModal(false);
    },
    onError: (err) => {
      alert("فشل إجراء الأداء: " + err.message);
    }
  });
  
  const statusSummary = useMemo(() => {
    if (!list.data) return null;
    const items = list.data;
    const unpaid = items.filter(s => s.status === 'unpaid' || s.status === 'overdue');
    const overdue = items.filter(s => s.status === 'overdue');
    const totalDue = unpaid.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const totalAmount = items.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const paidAmount = items.filter(s => s.status === 'paid').reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

    // Compliance Score based on proportional financial fulfillment
    let complianceScore = 100;
    if (totalAmount > 0) {
      complianceScore = Math.min(100, Math.max(0, Math.round((paidAmount / totalAmount) * 100)));
    } else if (unpaid.length > 0) {
      complianceScore = 0;
    }

    let status: 'green' | 'yellow' | 'orange' | 'red' = 'green';
    let message = '';
    
    // Status purely based on Compliance Score (Behavior Bar)
    if (complianceScore >= 80) {
      status = 'green';
      message = "يشكركم مكتب الهيئة على التزامكم الكامل بأداء المستحقات، وهو ما يعكس روح المسؤولية والمشاركة في الارتقاء بالعمل المهني.";
    } else if (complianceScore >= 50) {
      status = 'yellow';
      message = "نود تذكيركم بلطف بأن بعض المستحقات لم تُسدّد بعد. نرجو التفضل بإتمام الأداء للحفاظ على مستوى امتثال جيد.";
    } else if (complianceScore >= 25) {
      status = 'orange';
      message = "يُعلمكم المكتب أن تراكم المستحقات قد أثر على مؤشر الامتثال الخاص بكم. يرجى معالجة الوضعية تفاديًا لأي إجراءات تنظيمية.";
    } else {
      status = 'red';
      message = "إنذار: مستوى الامتثال حرج جداً بسبب عدم أداء المستحقات المتراكمة. هذا الوضع يتطلب تسوية فورية.";
    }

    return {
        status,
        message,
        complianceScore,
        unpaidCount: unpaid.length,
        totalDue,
        unpaidItems: unpaid
    };
  }, [list.data]);

  const messages = useMemo(() => {
    if (!statusSummary) return [];
    const msgs = [];
    
    // Generate Messages based on SCORE (Behavior Bar) determines the Tone
    if (statusSummary.complianceScore < 25) {
       msgs.push({
         id: 'score-critical',
         type: 'critical',
         icon: '⛔',
         color: 'red',
         title: 'مستوى امتثال حرج',
         body: 'مؤشركم في المنطقة الحمراء. يرجى تسوية جميع المستحقات فوراً لتجنب العقوبات.',
         date: 'تنبيه فوري'
       });
    } else if (statusSummary.complianceScore < 50) {
        msgs.push({
            id: 'score-warning',
            type: 'warning',
            icon: '⚠️',
            color: 'orange',
            title: 'تنبيه: انخفاض المؤشر',
            body: 'لقد انخفض مؤشر الامتثال للمنطقة البرتقالية. يرجى أداء المستحقات العالقة.',
            date: 'تنبيه'
        });
    } else if (statusSummary.complianceScore < 80) {
         msgs.push({
            id: 'score-notice',
            type: 'info',
            icon: '📉',
            color: 'yellow',
            title: 'تذكير ودي',
            body: 'يمكنكم تحسين مؤشر الامتثال من خلال تسوية المستحقات البسيطة المتبقية.',
            date: 'تذكير'
        });
    } else {
        // Green / Excellent
         msgs.push({
            id: 'score-success',
            type: 'success',
            icon: '🎉',
            color: 'emerald',
            title: 'شكر وتقدير',
            body: 'نشكركم على التزامكم الكامل بالأداء وانتظام وضعيتكم المهنية الممتازة.',
            date: 'الآن'
        });
    }

    // Add specific item reminders (The specific debts)
    statusSummary.unpaidItems.forEach((item, idx) => {
        if (idx > 2) return; // Limit to 3 specific reminders
        msgs.push({
            id: `reminder-${item.id}`,
            targetTab: item.subscriptionType,
            type: 'info',
            icon: '💰',
            color: 'blue',
            title: `مستحق: ${getSubscriptionLabel(item.subscriptionType, item.periodYear, item.periodMonth)}`,
            body: `مبلغ ${Number(item.amount || 0).toFixed(2)} د.م في انتظار الأداء. اضغط للدفع.`,
            date: item.dueDate || 'غير محدد'
        });
    });

    return msgs;
  }, [statusSummary]);

  if (list.isLoading) return <div>جارٍ التحميل...</div>;
  if (!statusSummary) return null;

  const getStatusColor = (s: string) => {
      switch(s) {
          case 'green': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
          case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
          case 'orange': return 'bg-orange-50 border-orange-200 text-orange-900';
          case 'red': return 'bg-red-50 border-red-200 text-red-900';
          default: return 'bg-slate-50';
      }
  };

  const getStatusIcon = (s: string) => {
      switch(s) {
          case 'green': return '✅ ممتثل بالكامل';
          case 'yellow': return '⚠️ تأخر بسيط';
          case 'orange': return '⚖️ تنبيه إداري';
          case 'red': return '⛔ غير ممتثل';
          default: return '';
      }
  };

  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 1. Status Dashboard Card */}
          <div className={`rounded-3xl border p-8 shadow-sm transition-all ${getStatusColor(statusSummary.status)}`}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                          <span className="text-3xl">{getStatusIcon(statusSummary.status).split(' ')[0]}</span>
                          <h2 className="text-2xl font-extrabold">{getStatusIcon(statusSummary.status).split(' ').slice(1).join(' ')}</h2>
                      </div>
                      <p className="text-lg leading-relaxed opacity-90 max-w-2xl font-medium">
                          {statusSummary.message}
                      </p>
                      
                      {statusSummary.status === 'green' && (
                          <div className="mt-6 flex gap-3">
                              <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition">📥 تحميل شهادة الامتثال</button>
                              <span className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2">💎 نقاط التميز: 100</span>
                          </div>
                      )}
                  </div>

                  {/* Score Gauge */}
                  <div className="bg-white/60 p-6 rounded-2xl backdrop-blur-sm min-w-[200px] text-center border border-white/50">
                      <div className="text-sm font-bold text-gray-500 mb-2">مؤشر الامتثال</div>
                      <div className={`text-5xl font-black mb-1 ${
                          statusSummary.complianceScore > 80 ? 'text-emerald-600' : 
                          statusSummary.complianceScore > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                          {statusSummary.complianceScore}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div className={`h-2.5 rounded-full ${
                             statusSummary.complianceScore > 80 ? 'bg-emerald-500' : 
                             statusSummary.complianceScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} style={{ width: `${statusSummary.complianceScore}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
              {/* 2. Financial Timeline / Summary */}
              <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">الملخص المالي {year}</h3>
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-sm font-bold text-slate-600">📅 الجدول الزمني</span>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                              <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">📊</span>
                              <div>
                                  <div className="font-bold text-slate-700">مجموع المستحقات</div>
                                  <div className="text-xs text-slate-500">للسنة الحالية</div>
                              </div>
                          </div>
                          <div className="text-xl font-black text-slate-800">
                              {formatMoney(list.data?.reduce((acc, s) => acc + s.amount, 0) || 0)}
                          </div>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                              <span className="p-2 bg-red-100 text-red-600 rounded-lg">⏳</span>
                              <div>
                                  <div className="font-bold text-slate-700">المبلغ المتبقي</div>
                                  <div className="text-xs text-slate-500">واجب الأداء حالياً</div>
                              </div>
                          </div>
                          <div className="text-xl font-black text-red-600">
                              {formatMoney(statusSummary.totalDue)}
                          </div>
                      </div>

                      {statusSummary.totalDue > 0 && (
                          <div className="mt-4">
                            <button 
                                onClick={() => setShowPaymentModal(true)}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                💳 الانتقال للدفع الإلكتروني
                            </button>
                          </div>
                      )}
                  </div>
              </Card>

              {/* 3. Notifications/Communication */}
              <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">صندوق الرسائل</h3>
                    {messages.length > 0 && (
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm font-bold">{messages.length} رسائل جديدة</span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                      {messages.length > 0 ? (
                        messages.slice(0, 3).map((msg) => (
                            <div 
                                key={msg.id} 
                                onClick={() => msg.targetTab && onNavigate?.(msg.targetTab)}
                                className={`p-3 rounded-xl border flex gap-3 items-start bg-${msg.color}-50 border-${msg.color}-100 ${msg.targetTab ? 'cursor-pointer hover:bg-white transition-colors' : ''}`}
                            >
                                <div className="mt-1">{msg.icon}</div>
                                <div>
                                    <div className={`font-bold text-sm text-${msg.color}-900`}>{msg.title} {msg.targetTab && '🔗'}</div>
                                    <div className={`text-xs mt-1 opacity-80 leading-relaxed text-${msg.color}-800`}>
                                        {msg.body}
                                    </div>
                                    <div className={`text-[10px] mt-2 font-mono text-${msg.color}-400`}>{msg.date}</div>
                                </div>
                            </div>
                        ))
                      ) : (
                          <div className="text-center py-8 text-gray-400 text-sm">لا توجد رسائل جديدة</div>
                      )}
                  </div>
                  
                  <button 
                    onClick={() => setShowMessagesModal(true)}
                    className="w-full mt-4 text-center text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 py-2 rounded-lg transition"
                  >
                      عرض سجل الرسائل
                  </button>
              </Card>
          </div>

          {/* Payment Modal (Mock) */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                    <h3 className="text-2xl font-bold mb-4">بوابة الدفع الإلكتروني</h3>
                    <p className="text-gray-600 mb-6">سيتم تحويلكم إلى منصة الأداء الآمنة لاستكمال عملية دفع المستحقات ({formatMoney(statusSummary.totalDue)}).</p>
                    <div className="space-y-3 mb-6">
                        <div className="p-4 border rounded-xl flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                            <span className="text-2xl">💳</span>
                            <span className="font-bold">بطاقة بنكية</span>
                        </div>
                        <div className="p-4 border rounded-xl flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                            <span className="text-2xl">📱</span>
                            <span className="font-bold">تطبيقات بنكية (WafaPay, MaroPay...)</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50" 
                            disabled={payAllMutation.isLoading}
                            onClick={() => {
                                payAllMutation.mutate({ sessionToken, year });
                            }}
                        >
                            {payAllMutation.isLoading ? 'جاري الأداء...' : 'تأكيد الأداء'}
                        </button>
                        <button 
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition" 
                            disabled={payAllMutation.isLoading}
                            onClick={() => setShowPaymentModal(false)}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Messages Modal (Mock) */}
          {showMessagesModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">سجل الرسائل والإشعارات</h3>
                        <button onClick={() => setShowMessagesModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">✕</button>
                    </div>
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`p-4 rounded-2xl border flex gap-4 items-start bg-${msg.color}-50 border-${msg.color}-100`}>
                                <div className="mt-1 text-2xl">{msg.icon}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className={`font-bold text-lg text-${msg.color}-900`}>{msg.title}</div>
                                        <div className={`text-xs font-mono text-${msg.color}-600 bg-white/50 px-2 py-1 rounded`}>{msg.date}</div>
                                    </div>
                                    <div className={`text-sm mt-2 opacity-90 leading-relaxed text-${msg.color}-800`}>
                                        {msg.body}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
      </div>
  );
}

function AnnualTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'annual'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="الاشتراك السنوي" emptyMessage="لا توجد اشتراكات سنوية مسجلة." />;
}

function MonthlyTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'monthly'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="الاشتراك الشهري" emptyMessage="لا توجد اشتراكات شهرية مسجلة." />;
}

function AffiliationTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'affiliation'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="الانخراط" emptyMessage="لا توجد بيانات للانخراط." />;
}

function NotebookTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'notebook'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="كناش التصاريح" emptyMessage="لا توجد بيانات كناش التصاريح." />;
}

function RegisterTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'register'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="سجل البيانات" emptyMessage="لا توجد بيانات سجل البيانات." />;
}

function BadgeTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'badge'), [list.data]);
  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="الشارة" emptyMessage="لا توجد بيانات الشارة." />;
}

function EquipmentTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  // Reuse SubscriptionsTab logic but for Equipment
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'equipment'), [list.data]);

  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="التجهيزات" emptyMessage="لا توجد تجهيزات مسجلة." />;
}

function SuitTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'suit'), [list.data]);

  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="البدلة" emptyMessage="لا توجد بيانات للبدلة." />;
}

function OtherContributionsTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const items = useMemo(() => (list.data ?? []).filter(s => s.subscriptionType === 'other'), [list.data]);

  return <FilteredSubscriptionList items={items} isLoading={list.isLoading} title="مساهمات اخرى" emptyMessage="لا توجد مساهمات اخرى." />;
}

function FilteredSubscriptionList({ items, isLoading, title, emptyMessage }: { items: any[], isLoading: boolean, title: string, emptyMessage: string }) {
  const { sessionToken } = useAuth();
  const utils = trpc.useUtils();
  // Check due soon from these items
  const dueSoon = items.filter((s) => !s.paidAt && new Date(s.dueDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000).slice(0, 3);
  const [paymentItem, setPaymentItem] = useState<any>(null);

  const markPaidMutation = trpc.subscriptions.markSubscriptionPaid.useMutation({
    onSuccess: () => {
      utils.subscriptions.listSubscriptions.invalidate();
      utils.subscriptions.getPaymentsForCouncil.invalidate();
      setPaymentItem(null);
    },
    onError: (err) => {
      alert("فشل إجراء الأداء: " + err.message);
    }
  });

  return (
    <div className="grid gap-6">

      {dueSoon.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <Badge kind="overdue">تنبيه</Badge>
              <div className="text-right text-sm font-bold text-slate-700">استحقاقات خلال 7 أيام</div>
            </div>
            <div className="mt-3 grid gap-2">
              {dueSoon.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                >
                  <div className="text-xs font-bold text-slate-700">{s.dueDate}</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {getSubscriptionLabel(s.subscriptionType, s.periodYear, s.periodMonth)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
      )}

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-right text-lg font-extrabold text-slate-900">{title}</div>
            {isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-600">
                <tr>
                  <th className="py-2">سنة</th>
                  <th className="py-2">المبلغ</th>
                  <th className="py-2">تاريخ العملية</th>
                  <th className="py-2">الحالة</th>
                  <th className="py-2">إجراء</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-3 font-bold">{s.periodMonth ? `${s.periodMonth}/${s.periodYear}` : s.periodYear}</td>
                    <td className="py-3">{formatMoney(s.amount, s.currency)}</td>
                    <td className="py-3">
                        {s.paidAt ? new Date(s.paidAt).toISOString().slice(0, 10) : 
                        s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : 
                        new Date().toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3">
                      {s.status === 'paid' ? (
                        <Badge kind="paid">مدفوع</Badge>
                      ) : s.status === 'overdue' ? (
                        <Badge kind="overdue">متأخر</Badge>
                      ) : (
                        <Badge kind="unpaid">غير مدفوع</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      {s.status !== 'paid' ? (
                        <button 
                            onClick={() => setPaymentItem(s)}
                            className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                        >
                            أداء الآن
                        </button>
                      ) : (
                         <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                             ✓ تم الأداء
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !items.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Modal for List Items */}
        {paymentItem && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                    <h3 className="text-2xl font-bold mb-4">أداء المستحقات</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border mb-6">
                        <div className="text-sm text-slate-500 mb-1">المبلغ المطلوب</div>
                        <div className="text-3xl font-black text-slate-900">{formatMoney(paymentItem.amount)}</div>
                        <div className="text-xs text-slate-600 mt-2">
                             {getSubscriptionLabel(paymentItem.subscriptionType, paymentItem.periodYear, paymentItem.periodMonth)}
                        </div>
                    </div>
                
                    <div className="space-y-3 mb-6">
                        <div className="p-4 border rounded-xl flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                            <span className="text-2xl">💳</span>
                            <span className="font-bold">بطاقة بنكية</span>
                        </div>
                        <div className="p-4 border rounded-xl flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                            <span className="text-2xl">📱</span>
                            <span className="font-bold">تطبيقات بنكية (WafaPay, MaroPay...)</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50" 
                            disabled={markPaidMutation.isLoading}
                            onClick={() => {
                                if (!sessionToken || !paymentItem) return;
                                markPaidMutation.mutate({
                                    sessionToken,
                                    id: paymentItem.id,
                                    subscriptionType: paymentItem.subscriptionType,
                                    periodYear: paymentItem.periodYear,
                                    periodMonth: paymentItem.periodMonth,
                                    amount: paymentItem.amount
                                });
                            }}
                        >
                            {markPaidMutation.isLoading ? 'جاري الأداء...' : 'متابعة الدفع'}
                        </button>
                        <button 
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition" 
                            disabled={markPaidMutation.isLoading}
                            onClick={() => setPaymentItem(null)}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
          )}
    </div>
  );
}

function SubscriptionsTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listSubscriptions.useQuery({ sessionToken, year }, { staleTime: 15_000 });


  const dueSoon = useMemo(() => {
    const items = list.data ?? [];
    const soonMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return items.filter((s) => !s.paidAt && new Date(s.dueDate).getTime() <= soonMs).slice(0, 3);
  }, [list.data]);

  if (list.error) {
    return (
      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">الاشتراكات</div>
        <div className="mt-2 text-right text-sm text-rose-700">
          تعذّر تحميل البيانات. تأكد من تطبيق ترحيل قاعدة البيانات `020_create_subscriptions_portal.sql`.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">

      <div className="space-y-6">
        {dueSoon.length ? (
          <Card>
            <div className="flex items-center justify-between">
              <Badge kind="overdue">تنبيه</Badge>
              <div className="text-right text-sm font-bold text-slate-700">استحقاقات خلال 7 أيام</div>
            </div>
            <div className="mt-3 grid gap-2">
              {dueSoon.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                >
                  <div className="text-xs font-bold text-slate-700">{s.dueDate}</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {getSubscriptionLabel(s.subscriptionType, s.periodYear, s.periodMonth)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-right text-lg font-extrabold text-slate-900">سجل الاشتراكات</div>
            {list.isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-600">
                <tr>
                  <th className="py-2">الفترة</th>
                  <th className="py-2">المبلغ</th>
                  <th className="py-2">الاستحقاق</th>
                  <th className="py-2">الحالة</th>
                  <th className="py-2">إجراء</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {(list.data ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-3 font-bold">
                      {s.subscriptionType === 'annual' ? `سنوي ${s.periodYear}` : 
                       s.subscriptionType === 'monthly' ? `شهري ${s.periodMonth}/${s.periodYear}` :
                       s.subscriptionType === 'affiliation' ? 'رسوم الانخراط' :
                       s.subscriptionType === 'stamps' ? 'دفتر الدمغات' :
                       s.subscriptionType === 'notebook' ? 'كناش التصاريح' :
                       s.subscriptionType === 'register' ? 'السجل السنوي' :
                       s.subscriptionType === 'badge' ? 'شارة الهوية' :
                       s.subscriptionType === 'equipment' ? 'التجهيزات' :
                       s.subscriptionType === 'suit' ? 'البدلة' :
                       s.subscriptionType === 'other' ? 'مساهمات اخرى' :
                       s.subscriptionType}
                    </td>
                    <td className="py-3">{formatMoney(s.amount, s.currency)}</td>
                    <td className="py-3">{s.dueDate}</td>
                    <td className="py-3">
                      {s.status === 'paid' ? (
                        <Badge kind="paid">مدفوع</Badge>
                      ) : s.status === 'overdue' ? (
                        <Badge kind="overdue">متأخر</Badge>
                      ) : (
                        <Badge kind="unpaid">غير مدفوع</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-slate-500">—</span>
                    </td>
                  </tr>
                ))}
                {!list.isLoading && !(list.data ?? []).length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      لا توجد اشتراكات لهذه السنة بعد.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DonationsTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const list = trpc.subscriptions.listDonations.useQuery({ sessionToken }, { staleTime: 15_000 });

  const yearItems = useMemo(() => {
    const y = String(year);
    return (list.data ?? []).filter((d) => String(d.donatedAt ?? '').startsWith(y));
  }, [list.data, year]);

  const total = useMemo(() => yearItems.reduce((acc, d) => acc + (Number(d.amount) || 0), 0), [yearItems]);

  if (list.error) {
    return (
      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">التبرعات</div>
        <div className="mt-2 text-right text-sm text-rose-700">
          تعذّر تحميل البيانات. تأكد من تطبيق ترحيل قاعدة البيانات `020_create_subscriptions_portal.sql`.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <Badge kind="info">إجمالي {year}</Badge>
            <div className="text-right text-lg font-extrabold text-slate-900">{formatMoney(total, 'MAD')}</div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-right text-lg font-extrabold text-slate-900">سجل التبرعات</div>
            {list.isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-600">
                <tr>
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">الجهة</th>
                  <th className="py-2">التصنيف</th>
                  <th className="py-2">المبلغ</th>
                  <th className="py-2">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {(list.data ?? []).map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="py-3">{String(d.donatedAt ?? '').slice(0, 10)}</td>
                    <td className="py-3 font-bold">{d.scope}</td>
                    <td className="py-3">{d.category ?? '—'}</td>
                    <td className="py-3">{formatMoney(d.amount, 'MAD')}</td>
                    <td className="py-3 text-slate-600">{d.note ?? '—'}</td>
                  </tr>
                ))}
                {!list.isLoading && !(list.data ?? []).length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      لا توجد تبرعات بعد.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}

function StampsTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const utils = trpc.useUtils();
  const list = trpc.subscriptions.listStampPurchases.useQuery({ sessionToken }, { staleTime: 15_000 });

  const yearItems = useMemo(() => {
    const y = String(year);
    return (list.data ?? []).filter((p) => String(p.purchasedAt ?? '').startsWith(y));
  }, [list.data, year]);

  const total = useMemo(
    () => yearItems.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0),
    [yearItems]
  );

  if (list.error) {
    return (
      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">الدمغات</div>
        <div className="mt-2 text-right text-sm text-rose-700">
          تعذّر تحميل البيانات. تأكد من تطبيق ترحيل قاعدة البيانات `020_create_subscriptions_portal.sql`.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <Badge kind="info">إجمالي {year}</Badge>
            <div className="text-right text-lg font-extrabold text-slate-900">{formatMoney(total, 'MAD')}</div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-right text-lg font-extrabold text-slate-900">سجل الدمغات</div>
            {list.isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : null}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-600">
                <tr>
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">الدمغة</th>
                  <th className="py-2">الكمية</th>
                  <th className="py-2">الثمن</th>
                  <th className="py-2">المرجع</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {(list.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-3">{String(p.purchasedAt ?? '').slice(0, 10)}</td>
                    <td className="py-3 font-bold">{p.stampName}</td>
                    <td className="py-3">{p.quantity}</td>
                    <td className="py-3">{formatMoney(p.quantity * p.unitPrice, 'MAD')}</td>
                    <td className="py-3 text-slate-600">{p.integrationRef ?? '—'}</td>
                  </tr>
                ))}
                {!list.isLoading && !(list.data ?? []).length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      لا توجد مشتريات دمغات بعد.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}

function ReceiptsTab({ sessionToken }: { sessionToken: string }) {
  const list = trpc.subscriptions.listReceipts.useQuery({ sessionToken }, { staleTime: 15_000 });

  if (list.error) {
    return (
      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">الإيصالات</div>
        <div className="mt-2 text-right text-sm text-rose-700">
          تعذّر تحميل البيانات. تأكد من تطبيق ترحيل قاعدة البيانات `020_create_subscriptions_portal.sql`.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-right text-lg font-extrabold text-slate-900">الإيصالات المحفوظة</div>
            {list.isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs font-bold text-slate-600">
                <tr>
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">النوع</th>
                  <th className="py-2">رقم</th>
                  <th className="py-2">ملف</th>
                  <th className="py-2">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {(list.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-3">{String(r.createdAt ?? '').slice(0, 10)}</td>
                    <td className="py-3 font-bold">{r.kind}</td>
                    <td className="py-3">{r.receiptNumber ?? '—'}</td>
                    <td className="py-3">
                      {r.fileUrl ? (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-700 underline underline-offset-4"
                        >
                          فتح
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-slate-600">{r.note ?? '—'}</td>
                  </tr>
                ))}
                {!list.isLoading && !(list.data ?? []).length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      لا توجد إيصالات بعد.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}

function DashboardTab({ sessionToken, year }: { sessionToken: string; year: number }) {
  const query = trpc.subscriptions.getDashboard.useQuery({ sessionToken, year }, { staleTime: 15_000 });
  const d = query.data;

  if (query.error) {
    return (
      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">لوحة التحصيل</div>
        <div className="mt-2 text-right text-sm text-rose-700">
          تعذّر تحميل البيانات. تأكد من تطبيق ترحيل قاعدة البيانات `020_create_subscriptions_portal.sql`.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-right text-lg font-extrabold text-slate-900">لوحة التحصيل</div>
          {query.isLoading ? <Badge kind="info">جارٍ التحميل…</Badge> : <Badge kind="info">{year}</Badge>}
        </div>

        {d ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-bold text-slate-600">الاشتراكات</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoney(d.subscriptions.totalAmount, 'MAD')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge kind="paid">مدفوع: {d.subscriptions.statusCounts.paid}</Badge>
                <Badge kind="unpaid">غير مدفوع: {d.subscriptions.statusCounts.unpaid}</Badge>
                <Badge kind="overdue">متأخر: {d.subscriptions.statusCounts.overdue}</Badge>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-bold text-slate-600">التبرعات</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoney(d.donations.totalAmount, 'MAD')}</div>
              <div className="mt-2 text-xs text-slate-600">مجموع التبرعات خلال السنة</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-bold text-slate-600">الدمغات</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoney(d.stamps.totalAmount, 'MAD')}</div>
              <div className="mt-2 text-xs text-slate-600">مجموع مشتريات الدمغات خلال السنة</div>
            </div>
          </div>
        ) : (
          <div className="mt-5 text-right text-sm text-slate-600">لا توجد بيانات بعد.</div>
        )}
      </Card>

      <Card>
        <div className="text-right text-lg font-extrabold text-slate-900">الإشعارات/الدفع الإلكتروني (قريباً)</div>
        <div className="mt-2 text-right text-sm text-slate-600">
          يمكن توسيع هذا القسم لاحقاً لإشعار قبل نهاية الشهر/السنة للاشتراك، وإشعار عند تلقي تبرع/تحديث الدمغات، وربط الدفع الإلكتروني.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {['CIH Pay', 'WafaPay', 'MarocPay', 'PayZone', 'QR Code'].map((x) => (
            <button
              key={x}
              type="button"
              disabled
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-500 ring-1 ring-slate-200"
            >
              {x}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
