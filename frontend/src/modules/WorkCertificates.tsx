import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function WorkCertificatesModule() {
  const [step, setStep] = useState(0);
  const [selectedAuthority, setSelectedAuthority] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleRequestSelect = (authority: string, request: string) => {
    setSelectedAuthority(authority);
    setSelectedRequest(request);
    setStep(1); // Move to Phase 2
  };

  const goToJudicialPortal = () => {
    navigate('?module=notaryPortal&tab=create');
  };

  const judicialRequests = [
    'طلب إذن زواج القاصر',
    'طلب إذن الزواج (عند الاقتضاء)',
    'طلب إذن تلقي الزواج بالتعدد',
    'طلب إذن الزواج المختلط',
    'طلب إذن الغياب المؤقت عن ممارسة العمل',
    'طلب إذن تلقي الشهادات العلمية',
    'طلب شهادة العمل (عند الارتباط بالإذن القضائي)'
  ];

  const authorityRequests = [
    'طلب مذكرة الحفظ',
    'طلب سجل البيانات',
    'طلب تواصيل',
    'طلب التسجيل بالهيئة',
    'طلب شهادة الانخراط',
    'طلب نسخة من وثائق مهنية'
  ];

  const ministryRequests = [
    'طلب إعفاء',
    'طلب انتقال',
    'طلب إلحاق',
    'طلب تمديد أو تسوية وضعية',
    'طلب رخصة استثنائية'
  ];

  const filterList = (list: string[]) => 
    list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));

  // Phase 1: Dashboard & Authority Selection
  const renderStep0 = () => {
    const filteredJudge = filterList(judicialRequests);
    const filteredAuthority = filterList(authorityRequests);
    const filteredMinistry = filterList(ministryRequests);
    const hasResults = filteredJudge.length > 0 || filteredAuthority.length > 0 || filteredMinistry.length > 0;

    return (
      <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
        {/* Welcome Section Redesign */}
        <div className="relative overflow-hidden bg-[#1e293b] text-white p-12 rounded-3xl shadow-2xl mb-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <div className="relative z-10 text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold font-maghribi tracking-tight">بوابة تدبير طلبات الإذن الذكية</h1>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
              فضاء قانوني رقمي متطور يهدف إلى تيسير المساطر الإدارية والقضائية للسادة العدول، 
              مع ضمان الدقة والسرعة في المعالجة.
            </p>

            {/* Premium Search Bar */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 shadow-inner group transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
                <div className="absolute right-6 text-gray-400">
                  🔍
                </div>
                <input
                  type="text"
                  placeholder="ابحث عن نوع الطلب هنا (مثلا: زواج، انتقال، شهادة...)"
                  className="w-full bg-transparent text-white pr-14 pl-6 py-4 outline-none placeholder:text-gray-400 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-2 p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-2 bg-blue-600 rounded-full shadow-glow"></div>
            <h2 className="text-2xl font-bold text-gray-800 font-maghribi">تحديد الجهة الموجه إليها طلب الإذن</h2>
          </div>
          {searchQuery && (
            <div className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 italic">
              نتائج البحث عن: "{searchQuery}"
            </div>
          )}
        </div>

        {!hasResults ? (
          <div className="bg-white p-20 rounded-3xl shadow-sm border border-dashed border-gray-300 text-center animate-fadeIn">
            <div className="text-6xl mb-6">🏜️</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">لا توجد نتائج مطابقة لبحثك</h3>
            <p className="text-gray-500">حاول استخدام كلمات مفتاحية أخرى أو تحقق من الإملاء</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              إلغاء البحث والعودة للكل
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Judge */}
            {filteredJudge.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col group overflow-hidden">
                <div className="p-8 bg-blue-600 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="text-5xl mb-4 relative z-10">⚖️</div>
                  <h3 className="text-2xl font-bold relative z-10 mb-2 font-maghribi">القاضي المكلف بالتوثيق</h3>
                  <p className="text-blue-100 text-sm relative z-10">الأذونات الصادرة عن القاضي المختص قبل التلقي</p>
                </div>
                <div className="p-8 flex-grow">
                  <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg border-b pb-4">
                    <span>📃</span> الطلبات المتاحة ({filteredJudge.length}):
                  </h4>
                  <ul className="space-y-3 mb-8">
                    {filteredJudge.map((req) => (
                      <li 
                        key={req}
                        onClick={() => handleRequestSelect('judge', req)}
                        className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 p-4 rounded-xl cursor-pointer transition-all flex items-center gap-3 border border-transparent hover:border-blue-100 group/item"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-600 opacity-0 group-hover/item:opacity-100 transition-opacity"></span>
                        <span className="flex-grow">{req}</span>
                        <span className="text-blue-600 opacity-0 group-hover/item:opacity-100">←</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-4">
                    <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm border-t pt-4">
                      <span>🔔</span> الإشعارات
                    </h5>
                    <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-900 border border-blue-100 mb-2 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm" onClick={goToJudicialPortal}>
                       📍 طلب إذن التوجه لتلقي الإشهاد
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl text-xs text-amber-800 border border-amber-100 leading-relaxed shadow-sm">
                      <div className="font-bold mb-1 flex items-center gap-2">
                        <span>💡</span> تنبيه ذكي
                      </div>
                      تختلف موجبات الإذن بحسب طبيعة الطلب وظروفه الواقعية، دون مساس بسلطة القاضي التقديرية.
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold border-t pt-4">
                      ⚖️ المرجع: قانون خطة العدالة / مدونة الأسرة
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: National Authority */}
            {filteredAuthority.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col group overflow-hidden">
                <div className="p-8 bg-indigo-700 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="text-5xl mb-4 relative z-10">🏢</div>
                  <h3 className="text-2xl font-bold relative z-10 mb-2 font-maghribi">الهيئة الوطنية والمكتب الجهوي</h3>
                  <p className="text-indigo-100 text-sm relative z-10">الطلبات الإدارية والتنظيمية المرتبطة بالتسيير</p>
                </div>
                <div className="p-8 flex-grow">
                  <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg border-b pb-4">
                    <span>📃</span> الطلبات المتاحة ({filteredAuthority.length}):
                  </h4>
                  <ul className="space-y-3 mb-8">
                    {filteredAuthority.map((req) => (
                      <li 
                        key={req}
                        onClick={() => handleRequestSelect('authority', req)}
                        className="text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 p-4 rounded-xl cursor-pointer transition-all flex items-center gap-3 border border-transparent hover:border-indigo-100 group/item"
                      >
                        <span className="w-2 h-2 rounded-full bg-indigo-600 opacity-0 group-hover/item:opacity-100 transition-opacity"></span>
                        <span className="flex-grow">{req}</span>
                        <span className="text-indigo-600 opacity-0 group-hover/item:opacity-100">←</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-4">
                    <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm border-t pt-4">
                      <span>🔔</span> الإشعارات
                    </h5>
                    <div className="bg-indigo-50 p-4 rounded-2xl text-xs text-indigo-900 border border-indigo-100 mb-2 cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm" onClick={goToJudicialPortal}>
                       📍 طلب إذن التوجه لتلقي الإشهاد
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-800 border border-blue-100 leading-relaxed shadow-sm">
                      <div className="font-bold mb-1 flex items-center gap-2">
                        <span>ℹ️</span> ملاحظة تنظيمية
                      </div>
                      تخضع هذه الطلبات للمساطر الداخلية للهيئة المختصة وتنسيقها المستمر.
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold border-t pt-4">
                      ⚖️ المرجع: قانون خطة العدالة / الأنظمة الداخلية
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Ministry */}
            {filteredMinistry.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col group overflow-hidden">
                <div className="p-8 bg-emerald-700 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="text-5xl mb-4 relative z-10">🏛️</div>
                  <h3 className="text-2xl font-bold relative z-10 mb-2 font-maghribi">السلطة الحكومية بالعدل</h3>
                  <p className="text-emerald-100 text-sm relative z-10">الطلبات الوظيفية والاستثنائية للقطاع الحكومي</p>
                </div>
                <div className="p-8 flex-grow">
                  <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-lg border-b pb-4">
                    <span>📃</span> الطلبات المتاحة ({filteredMinistry.length}):
                  </h4>
                  <ul className="space-y-3 mb-8">
                    {filteredMinistry.map((req) => (
                      <li 
                        key={req}
                        onClick={() => handleRequestSelect('ministry', req)}
                        className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 p-4 rounded-xl cursor-pointer transition-all flex items-center gap-3 border border-transparent hover:border-emerald-100 group/item"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-600 opacity-0 group-hover/item:opacity-100 transition-opacity"></span>
                        <span className="flex-grow">{req}</span>
                        <span className="text-emerald-600 opacity-0 group-hover/item:opacity-100">←</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-4">
                    <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm border-t pt-4">
                      <span>🔔</span> الإشعارات
                    </h5>
                    <div className="bg-red-50 p-4 rounded-2xl text-xs text-red-800 border border-red-100 leading-relaxed shadow-sm">
                      <div className="font-bold mb-1 flex items-center gap-2">
                        <span>⚠️</span> تنبيه إداري
                      </div>
                      هذه الطلبات تخضع لتقدير الإدارة المركزية وفق مرجعيات تدبير الموارد البشرية.
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold border-t pt-4">
                      ⚖️ المرجع: قانون خطة العدالة / النصوص التنظيمية
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // Phase 2: Request Card
  const renderStep1 = () => (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-yellow-50 p-6 border-b border-yellow-100">
          <h2 className="text-2xl font-bold text-gray-900">🟨 بطاقة طلب الإذن: {selectedRequest}</h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="text-lg text-gray-700 leading-relaxed">
            <p className="font-bold mb-2">حضرة العدل المحترم،</p>
            <p>قبل إعداد الطلب، يقترح عليكم التطبيق الاطلاع على العناصر الأساسية المتعارف عليها قانونًا وتنظيميًا، دون أن يشكل ذلك قيدًا على صياغتكم أو تقديركم.</p>
          </div>
          
          <div className="flex justify-end pt-6">
            <button 
              onClick={() => setStep(2)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
            >
              الاطلاع على المتطلبات ←
            </button>
          </div>
        </div>
      </div>
      <button onClick={() => setStep(0)} className="mt-4 text-gray-500 hover:text-gray-700">← العودة للقائمة الرئيسية</button>
    </div>
  );

  // Phase 3: Advisory Requirements
  const renderStep2 = () => (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">📌 المتطلبات الإرشادية (غير إلزامية)</h2>
        
        <div className="space-y-4 mb-8">
          {['بيانات العدل', 'سبب الطلب', 'الوثائق المرافقة (إن وجدت)', 'الإطار القانوني'].map((item) => (
            <label key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
              <span className="text-gray-700 font-medium">{item}</span>
            </label>
          ))}
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 mb-8 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <p><strong>تنبيه ذكي:</strong> هذه العناصر ذات طابع إرشادي، ويجوز تجاوز ما ترونه غير منتج أو غير لازم.</p>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep(1)} className="text-gray-600 hover:bg-gray-100 px-6 py-2 rounded-lg">السابق</button>
          <button 
            onClick={() => setStep(3)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
          >
            التالي: الصياغة الذكية ←
          </button>
        </div>
      </div>
    </div>
  );

  // Phase 4: Smart Drafting
  const renderStep3 = () => (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-4xl">
          📝
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">الصياغة الذكية للطلب</h2>
          <p className="text-gray-600">سيقوم النظام بتوليد صيغة إدارية راقية، قابلة للتعديل، وموجهة للجهة المختصة.</p>
        </div>

        <button 
          onClick={() => setStep(4)}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-3"
        >
          <span>✨</span> إنشاء طلب إذن بصيغة قانونية
        </button>

        <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700">← العودة للمتطلبات</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans" dir="rtl">
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}

