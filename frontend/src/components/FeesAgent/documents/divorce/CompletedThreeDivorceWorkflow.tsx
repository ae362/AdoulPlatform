import React, { useState, useCallback } from 'react';
import type { FeesAgentState } from '../../../../types/feesAgentTypes';

interface CompletedThreeDivorceWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete: () => void;
  onBackToClassification: () => void;
}

interface ChildData {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  healthStatus: string;
  academicStatus: string;
}

// Stage labels — 13 stages (واقعة البناء removed: already captured in interstitial)
const STAGES = [
  'الإذن القضائي',        // 1
  'الحاضر وطالب الإشهاد', // 2
  'بيانات الزوج',         // 3
  'بيانات الزوجة',        // 4
  'مرجع رسم الزواج',      // 5
  'الطلقات السابقة',      // 6
  'أهلية الزوج وإرادته',  // 7
  'المستحقات',            // 8
  'الإيداع بالضبط',       // 9
  'الأبناء',              // 10
  'بطاقة الأبناء',        // 11
  'حالة الحمل',           // 12
  'المراجعة والتأكيد',    // 13
];
const TOTAL = STAGES.length;

// ─── Sub-components defined OUTSIDE the main component to prevent remounting ──

interface StepBarProps { stage: number; setStage: (n: number) => void; }
const StepBar: React.FC<StepBarProps> = ({ stage, setStage }) => (
  <div className="flex items-center gap-1 flex-wrap mb-6" dir="rtl">
    {STAGES.map((label, i) => {
      const n = i + 1;
      const active = n === stage;
      const done = n < stage;
      return (
        <div key={n} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => n <= stage && setStage(n)}
            title={label}
            className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
              active ? 'bg-red-700 text-white shadow-md ring-2 ring-red-300' :
              done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {done ? '✓' : n}
          </button>
          {i < STAGES.length - 1 && <div className={`h-0.5 w-3 rounded ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
        </div>
      );
    })}
  </div>
);

interface CardProps { title: string; icon: string; children: React.ReactNode; }
const Card: React.FC<CardProps> = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
      <span>{icon}</span><span>{title}</span>
    </h3>
    {children}
  </div>
);

interface NavButtonsProps {
  stage: number;
  canNext?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
}
const NavButtons: React.FC<NavButtonsProps> = ({ stage, canNext = true, onPrev, onNext, onComplete }) => (
  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
    <button type="button" onClick={onPrev} disabled={stage === 1}
      className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-40 transition-all">
      → السابق
    </button>
    {stage < TOTAL ? (
      <button type="button" onClick={onNext} disabled={!canNext}
        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${canNext ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
        التالي ←
      </button>
    ) : (
      <button type="button" onClick={onComplete}
        className="px-6 py-2 text-sm font-extrabold rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all">
        ✍️ الانتقال إلى تحرير رسم الطلاق المكمل للثلاث
      </button>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const CompletedThreeDivorceWorkflow: React.FC<CompletedThreeDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification,
}) => {
  const [stage, setStage] = useState(1);
  const classification = state.divorceClassification;

  // Derive consummation from interstitial answer (no need to ask again)
  const consummationHappened = classification?.consummationStatus === 'after_consummation';

  // Stage 1 — الإذن القضائي
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [court, setCourt] = useState('');
  const [section, setSection] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [permissionNumber, setPermissionNumber] = useState('');
  const [permissionDate, setPermissionDate] = useState('');
  const [receptionDate, setReceptionDate] = useState('');
  const [adoulNotes, setAdoulNotes] = useState('');

  // Stage 2 — الحاضر
  const [attendeeType, setAttendeeType] = useState<'husband_or_proxy' | 'both_spouses' | 'wife_only' | null>(null);

  // Stage 3 — الزوج
  const [husbandFirstAr, setHusbandFirstAr] = useState('');
  const [husbandLastAr, setHusbandLastAr] = useState('');
  const [husbandNat, setHusbandNat] = useState('مغربية');
  const [husbandBirth, setHusbandBirth] = useState('');
  const [husbandBirthPlace, setHusbandBirthPlace] = useState('');
  const [husbandFather, setHusbandFather] = useState('');
  const [husbandMother, setHusbandMother] = useState('');
  const [husbandIdNum, setHusbandIdNum] = useState('');
  const [husbandIdExpiry, setHusbandIdExpiry] = useState('');
  const [husbandProfession, setHusbandProfession] = useState('');
  const [husbandAddress, setHusbandAddress] = useState('');
  const [husbandCity, setHusbandCity] = useState('');

  // Stage 4 — الزوجة
  const [wifeFirstAr, setWifeFirstAr] = useState('');
  const [wifeLastAr, setWifeLastAr] = useState('');
  const [wifeNat, setWifeNat] = useState('مغربية');
  const [wifeBirth, setWifeBirth] = useState('');
  const [wifeBirthPlace, setWifeBirthPlace] = useState('');
  const [wifeFather, setWifeFather] = useState('');
  const [wifeMother, setWifeMother] = useState('');
  const [wifeIdNum, setWifeIdNum] = useState('');
  const [wifeIdExpiry, setWifeIdExpiry] = useState('');
  const [wifeProfession, setWifeProfession] = useState('');
  const [wifeAddress, setWifeAddress] = useState('');
  const [wifeCity, setWifeCity] = useState('');

  // Stage 5 — مرجع الزواج
  const [marriageDeedType, setMarriageDeedType] = useState('رسم زواج');
  const [marriageBook, setMarriageBook] = useState('');
  const [marriageBookNum, setMarriageBookNum] = useState('');
  const [marriagePage, setMarriagePage] = useState('');
  const [marriageDeedNum, setMarriageDeedNum] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [marriageAuthority, setMarriageAuthority] = useState('');

  // Stage 6 — الطلقات السابقة
  const [d1Num, setD1Num] = useState('');
  const [d1Date, setD1Date] = useState('');
  const [d1Court, setD1Court] = useState('');
  const [d1Type, setD1Type] = useState('');
  const [d2Num, setD2Num] = useState('');
  const [d2Date, setD2Date] = useState('');
  const [d2Court, setD2Court] = useState('');
  const [d2Type, setD2Type] = useState('');

  // Stage 7 — الأهلية والإرادة (previously stage 8)
  const [freeWill, setFreeWill] = useState<boolean | null>(null);
  const [coercion, setCoercion] = useState(false);
  const [intoxication, setIntoxication] = useState(false);
  const [severeAnger, setSevereAnger] = useState(false);

  // Stage 8 — المستحقات (previously stage 9)
  const [deferredMahr, setDeferredMahr] = useState(0);
  const [iddahSupport, setIddahSupport] = useState(0);
  const [mutaa, setMutaa] = useState(0);
  const [housing, setHousing] = useState(0);
  const [childrenSupport, setChildrenSupport] = useState(0);
  const [totalInWords, setTotalInWords] = useState('');
  const total = deferredMahr + iddahSupport + mutaa + housing + childrenSupport;

  // Stage 9 — الإيداع (previously stage 10)
  const [depositAmount, setDepositAmount] = useState(0);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [depositCourt, setDepositCourt] = useState('');

  // Stage 10 — الأبناء (previously stage 11)
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [boys, setBoys] = useState(0);
  const [girls, setGirls] = useState(0);
  const [children, setChildren] = useState<ChildData[]>([]);

  // Stage 12 — الحمل (previously stage 13)
  const [pregnancy, setPregnancy] = useState<'yes' | 'no' | 'unknown' | null>(null);

  const addChild = useCallback(() => {
    setChildren((prev) => [
      ...prev,
      { id: Date.now().toString(), firstName: '', lastName: '', gender: 'ذكر', birthDate: '', healthStatus: 'سليم', academicStatus: 'يتابع دراسته' },
    ]);
  }, []);

  const updateChild = useCallback((id: string, field: keyof ChildData, value: string) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }, []);

  const removeChild = useCallback((id: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const next = () => setStage((s) => Math.min(s + 1, TOTAL));
  const prev = () => setStage((s) => Math.max(s - 1, 1));

  const handleComplete = () => {
    setState((prev) => ({
      ...prev,
      divorceClassification: prev.divorceClassification
        ? {
            ...prev.divorceClassification,
            completedThreeWorkflow: {
              hasJudicialPermission: hasPermission === true,
              court, section, fileNumber, permissionNumber, permissionDate, receptionDate, adoulNotes,
              attendeeType: attendeeType || 'husband_or_proxy',
              husband: {
                firstNameAr: husbandFirstAr, lastNameAr: husbandLastAr, nationality: husbandNat,
                birthDate: husbandBirth, birthPlace: husbandBirthPlace, fatherName: husbandFather,
                motherName: husbandMother, idType: 'cin' as const, idNumber: husbandIdNum,
                idExpiryDate: husbandIdExpiry, profession: husbandProfession,
                address: husbandAddress, city: husbandCity, country: 'المغرب',
              },
              wife: {
                firstNameAr: wifeFirstAr, lastNameAr: wifeLastAr, nationality: wifeNat,
                birthDate: wifeBirth, birthPlace: wifeBirthPlace, fatherName: wifeFather,
                motherName: wifeMother, idType: 'cin' as const, idNumber: wifeIdNum,
                idExpiryDate: wifeIdExpiry, profession: wifeProfession,
                address: wifeAddress, city: wifeCity, country: 'المغرب',
              },
              marriageRef: {
                deedType: marriageDeedType, registryBook: marriageBook,
                bookNumber: marriageBookNum, pageNumber: marriagePage,
                deedNumber: marriageDeedNum, deedDate: marriageDate, issuingAuthority: marriageAuthority,
              },
              firstDivorceRef: { deedNumber: d1Num, deedDate: d1Date, courtOrAuthority: d1Court, divorceType: d1Type },
              secondDivorceRef: { deedNumber: d2Num, deedDate: d2Date, courtOrAuthority: d2Court, divorceType: d2Type },
              consummationHappened,
              willAndCapacity: { freeWill: freeWill === true, coercion, intoxication, severeAnger },
              dues: { deferredMahr, iddahSupport, mutaa, housing, childrenSupport, totalAmount: total, totalAmountInWords: totalInWords },
              deposit: { amount: depositAmount, receiptNumber, depositDate, courtName: depositCourt },
              hasChildren: hasChildren === true,
              totalChildrenCount: boys + girls,
              boysCount: boys,
              girlsCount: girls,
              childrenList: children.map((c) => ({
                id: c.id, firstName: c.firstName, lastName: c.lastName,
                gender: c.gender as 'ذكر' | 'أنثى', birthDate: c.birthDate,
                healthStatus: c.healthStatus, academicStatus: c.academicStatus,
              })),
              pregnancyStatus: pregnancy || 'no',
              divorceCount: 'third' as const,
              divorceNature: 'طلاق مكمل للثلاث' as const,
              legalEffect: 'طلاق بائن بينونة كبرى' as const,
              husbandStateChecks: { isAbsolutelyBanned: true },
              completedAt: new Date().toISOString(),
            } as any,
          }
        : prev.divorceClassification,
    }));
    onComplete();
  };

  const inputCls = "w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none transition-colors bg-white";
  const labelCls = "block text-xs font-bold text-gray-700 mb-1";

  // ─── Stage Renders ──────────────────────────────────────────────────────────

  // STAGE 1 — الإذن القضائي
  if (stage === 1) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="الإذن القضائي بالإشهاد بالطلاق المكمل للثلاث" icon="📜">
        <p className="text-xs text-gray-500">يرجى إدخال بيانات الإذن القضائي الصادر بالإشهاد على الطلاق المكمل للثلاث.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setHasPermission(true)}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${hasPermission === true ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            نعم
          </button>
          <button type="button" onClick={() => setHasPermission(false)}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${hasPermission === false ? 'bg-red-600 border-red-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            لا
          </button>
        </div>

        {hasPermission === false && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 font-bold">
            🔴 لا يمكن متابعة هذه المسطرة — يتعين التحقق من توفر الإذن القضائي اللازم للإشهاد على الطلاق المكمل للثلاث.
          </div>
        )}

        {hasPermission === true && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>المحكمة</label>
              <input className={inputCls} value={court} onChange={(e) => setCourt(e.target.value)} placeholder="المحكمة" />
            </div>
            <div>
              <label className={labelCls}>القسم / الجهة</label>
              <input className={inputCls} value={section} onChange={(e) => setSection(e.target.value)} placeholder="القسم" />
            </div>
            <div>
              <label className={labelCls}>رقم الملف</label>
              <input className={inputCls} value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} placeholder="رقم الملف" />
            </div>
            <div>
              <label className={labelCls}>رقم الإذن</label>
              <input className={inputCls} value={permissionNumber} onChange={(e) => setPermissionNumber(e.target.value)} placeholder="رقم الإذن" />
            </div>
            <div>
              <label className={labelCls}>تاريخ الإذن</label>
              <input type="date" className={inputCls} value={permissionDate} onChange={(e) => setPermissionDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>تاريخ التوصل بالإذن</label>
              <input type="date" className={inputCls} value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>ملاحظات العدل (اختياري)</label>
              <textarea className={inputCls} rows={2} value={adoulNotes} onChange={(e) => setAdoulNotes(e.target.value)} />
            </div>
            {permissionNumber && (
              <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                🟢 تم تسجيل بيانات الإذن القضائي بنجاح.
              </div>
            )}
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={hasPermission === true && permissionNumber.trim().length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 2 — الحاضر
  if (stage === 2) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="تحديد الحاضر وطالب الإشهاد" icon="👤">
        <p className="text-xs text-gray-500">في الطلاق المكمل للثلاث، يشترط حضور الزوج أو وكيله الخاص.</p>
        <div className="space-y-3">
          {([
            { v: 'husband_or_proxy', label: 'الزوج بنفسه أو بوكيل خاص', sub: 'هذا هو المسار المعتمد شرعاً وقانوناً', ok: true },
            { v: 'both_spouses', label: 'الزوجان معاً بمجلس العقد', sub: 'متابعة مشروعة — حضور مشترك', ok: true },
            { v: 'wife_only', label: 'الزوجة وحدها فقط', sub: '🔴 لا يُجيز القانون إشهاد الزوجة وحدها على الطلاق المكمل للثلاث', ok: false },
          ] as { v: string; label: string; sub: string; ok: boolean }[]).map(({ v, label, sub, ok }) => (
            <button key={v} type="button" onClick={() => setAttendeeType(v as any)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all ${attendeeType === v ? ok ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-red-100 border-red-400 text-red-900' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'}`}>
              <div className="font-bold text-sm">{label}</div>
              <div className={`text-xs mt-0.5 ${attendeeType === v ? ok ? 'text-emerald-100' : 'text-red-700' : 'text-gray-500'}`}>{sub}</div>
            </button>
          ))}
        </div>
        {attendeeType === 'wife_only' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 font-bold">
            🔴 لا يمكن متابعة هذه المسطرة — لا يجوز للزوجة وحدها طلب الإشهاد على الطلاق المكمل للثلاث.
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={attendeeType !== null && attendeeType !== 'wife_only'} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 3 — بيانات الزوج
  if (stage === 3) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="بيانات الزوج" icon="👤">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>الاسم الشخصي (عربي)</label><input className={inputCls} value={husbandFirstAr} onChange={(e) => setHusbandFirstAr(e.target.value)} placeholder="الاسم الشخصي" /></div>
          <div><label className={labelCls}>اسم العائلة (عربي)</label><input className={inputCls} value={husbandLastAr} onChange={(e) => setHusbandLastAr(e.target.value)} placeholder="اسم العائلة" /></div>
          <div><label className={labelCls}>الجنسية</label><input className={inputCls} value={husbandNat} onChange={(e) => setHusbandNat(e.target.value)} placeholder="الجنسية" /></div>
          <div><label className={labelCls}>تاريخ الازدياد</label><input type="date" className={inputCls} value={husbandBirth} onChange={(e) => setHusbandBirth(e.target.value)} /></div>
          <div><label className={labelCls}>مكان الازدياد</label><input className={inputCls} value={husbandBirthPlace} onChange={(e) => setHusbandBirthPlace(e.target.value)} placeholder="المدينة" /></div>
          <div><label className={labelCls}>اسم الأب</label><input className={inputCls} value={husbandFather} onChange={(e) => setHusbandFather(e.target.value)} placeholder="اسم الأب" /></div>
          <div><label className={labelCls}>اسم الأم</label><input className={inputCls} value={husbandMother} onChange={(e) => setHusbandMother(e.target.value)} placeholder="اسم الأم" /></div>
          <div><label className={labelCls}>رقم بطاقة الهوية</label><input className={inputCls} value={husbandIdNum} onChange={(e) => setHusbandIdNum(e.target.value)} placeholder="ب.ت.و" /></div>
          <div><label className={labelCls}>تاريخ انتهاء الهوية</label><input type="date" className={inputCls} value={husbandIdExpiry} onChange={(e) => setHusbandIdExpiry(e.target.value)} /></div>
          <div><label className={labelCls}>المهنة</label><input className={inputCls} value={husbandProfession} onChange={(e) => setHusbandProfession(e.target.value)} placeholder="المهنة" /></div>
          <div><label className={labelCls}>العنوان</label><input className={inputCls} value={husbandAddress} onChange={(e) => setHusbandAddress(e.target.value)} placeholder="العنوان" /></div>
          <div><label className={labelCls}>المدينة</label><input className={inputCls} value={husbandCity} onChange={(e) => setHusbandCity(e.target.value)} placeholder="المدينة" /></div>
        </div>
      </Card>
      <NavButtons stage={stage} canNext={husbandFirstAr.trim().length > 0 && husbandLastAr.trim().length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 4 — بيانات الزوجة
  if (stage === 4) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="بيانات الزوجة" icon="👩">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>الاسم الشخصي (عربي)</label><input className={inputCls} value={wifeFirstAr} onChange={(e) => setWifeFirstAr(e.target.value)} placeholder="الاسم الشخصي" /></div>
          <div><label className={labelCls}>اسم العائلة (عربي)</label><input className={inputCls} value={wifeLastAr} onChange={(e) => setWifeLastAr(e.target.value)} placeholder="اسم العائلة" /></div>
          <div><label className={labelCls}>الجنسية</label><input className={inputCls} value={wifeNat} onChange={(e) => setWifeNat(e.target.value)} placeholder="الجنسية" /></div>
          <div><label className={labelCls}>تاريخ الازدياد</label><input type="date" className={inputCls} value={wifeBirth} onChange={(e) => setWifeBirth(e.target.value)} /></div>
          <div><label className={labelCls}>مكان الازدياد</label><input className={inputCls} value={wifeBirthPlace} onChange={(e) => setWifeBirthPlace(e.target.value)} placeholder="المدينة" /></div>
          <div><label className={labelCls}>اسم الأب</label><input className={inputCls} value={wifeFather} onChange={(e) => setWifeFather(e.target.value)} placeholder="اسم الأب" /></div>
          <div><label className={labelCls}>اسم الأم</label><input className={inputCls} value={wifeMother} onChange={(e) => setWifeMother(e.target.value)} placeholder="اسم الأم" /></div>
          <div><label className={labelCls}>رقم بطاقة الهوية</label><input className={inputCls} value={wifeIdNum} onChange={(e) => setWifeIdNum(e.target.value)} placeholder="ب.ت.و" /></div>
          <div><label className={labelCls}>تاريخ انتهاء الهوية</label><input type="date" className={inputCls} value={wifeIdExpiry} onChange={(e) => setWifeIdExpiry(e.target.value)} /></div>
          <div><label className={labelCls}>المهنة</label><input className={inputCls} value={wifeProfession} onChange={(e) => setWifeProfession(e.target.value)} placeholder="المهنة" /></div>
          <div><label className={labelCls}>العنوان</label><input className={inputCls} value={wifeAddress} onChange={(e) => setWifeAddress(e.target.value)} placeholder="العنوان" /></div>
          <div><label className={labelCls}>المدينة</label><input className={inputCls} value={wifeCity} onChange={(e) => setWifeCity(e.target.value)} placeholder="المدينة" /></div>
        </div>
      </Card>
      <NavButtons stage={stage} canNext={wifeFirstAr.trim().length > 0 && wifeLastAr.trim().length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 5 — مرجع الزواج
  if (stage === 5) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="مرجع رسم الزواج القائم" icon="📋">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>نوع الرسم</label><input className={inputCls} value={marriageDeedType} onChange={(e) => setMarriageDeedType(e.target.value)} /></div>
          <div><label className={labelCls}>نوع السجل / الدفتر</label><input className={inputCls} value={marriageBook} onChange={(e) => setMarriageBook(e.target.value)} /></div>
          <div><label className={labelCls}>رقم الدفتر</label><input className={inputCls} value={marriageBookNum} onChange={(e) => setMarriageBookNum(e.target.value)} /></div>
          <div><label className={labelCls}>رقم الصفحة</label><input className={inputCls} value={marriagePage} onChange={(e) => setMarriagePage(e.target.value)} /></div>
          <div><label className={labelCls}>عدد الرسم</label><input className={inputCls} value={marriageDeedNum} onChange={(e) => setMarriageDeedNum(e.target.value)} /></div>
          <div><label className={labelCls}>تاريخ الرسم</label><input type="date" className={inputCls} value={marriageDate} onChange={(e) => setMarriageDate(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>جهة الإصدار / المحكمة</label><input className={inputCls} value={marriageAuthority} onChange={(e) => setMarriageAuthority(e.target.value)} /></div>
        </div>
        {marriageDeedNum && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 font-semibold">
            📋 ملخص المرجع: رسم {marriageDeedType} عدد {marriageDeedNum} بتاريخ {marriageDate} صادر عن {marriageAuthority}
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={marriageDeedNum.trim().length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 6 — الطلقات السابقة
  if (stage === 6) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="التثبت من الطلقات السابقة والتكييف القانوني" icon="⚖️">
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-bold">
          ⚠️ يتعين التثبت من مرجعي الطلقتين السابقتين لإثبات أن هذه الطلقة هي الثالثة المكملة للثلاث.
        </div>
        <div className="border border-amber-200 rounded-xl p-4 space-y-3 bg-amber-50/30">
          <p className="text-xs font-bold text-amber-800">🔹 مرجع الطلقة الأولى:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>رقم الرسم / الحكم</label><input className={inputCls} value={d1Num} onChange={(e) => setD1Num(e.target.value)} /></div>
            <div><label className={labelCls}>التاريخ</label><input type="date" className={inputCls} value={d1Date} onChange={(e) => setD1Date(e.target.value)} /></div>
            <div><label className={labelCls}>جهة الإصدار</label><input className={inputCls} value={d1Court} onChange={(e) => setD1Court(e.target.value)} /></div>
            <div><label className={labelCls}>نوع الطلاق</label><input className={inputCls} value={d1Type} onChange={(e) => setD1Type(e.target.value)} /></div>
          </div>
        </div>
        <div className="border border-orange-200 rounded-xl p-4 space-y-3 bg-orange-50/30">
          <p className="text-xs font-bold text-orange-800">🔹 مرجع الطلقة الثانية:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>رقم الرسم / الحكم</label><input className={inputCls} value={d2Num} onChange={(e) => setD2Num(e.target.value)} /></div>
            <div><label className={labelCls}>التاريخ</label><input type="date" className={inputCls} value={d2Date} onChange={(e) => setD2Date(e.target.value)} /></div>
            <div><label className={labelCls}>جهة الإصدار</label><input className={inputCls} value={d2Court} onChange={(e) => setD2Court(e.target.value)} /></div>
            <div><label className={labelCls}>نوع الطلاق</label><input className={inputCls} value={d2Type} onChange={(e) => setD2Type(e.target.value)} /></div>
          </div>
        </div>
        {d1Num && d2Num && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-2">
            <p className="text-xs font-extrabold text-red-900">🛑 التكييف القانوني الآلي:</p>
            <p className="text-xs text-red-800 leading-relaxed">
              بناءً على مرجعي الطلقة الأولى (رقم {d1Num}) والطلقة الثانية (رقم {d2Num})، فإن الطلقة الحالية هي <strong>الطلقة الثالثة المكملة للثلاث — بائن بينونة كبرى</strong> طبقاً للمادتين 123 و127 من مدونة الأسرة.
            </p>
            <p className="text-xs text-red-800 font-bold">
              ⚠️ تحذير: يزول بهذا الطلاق حل الزوج وملكه على هذه المطلقة نهائياً، ولا تحل له حتى تنكح زوجاً غيره نكاحاً صحيحاً ويدخل بها فعلاً.
            </p>
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={d1Num.trim().length > 0 && d2Num.trim().length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 7 — أهلية الزوج وإرادته (previously stage 8)
  if (stage === 7) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="التحقق من حالة الزوج وقت الإيقاع وصحة الإرادة" icon="🧠">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">هل وقع الطلاق بإرادة حرة مختارة؟</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setFreeWill(true)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${freeWill === true ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                نعم — إرادة حرة مختارة
              </button>
              <button type="button" onClick={() => setFreeWill(false)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${freeWill === false ? 'bg-red-600 border-red-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                لا — يوجد عارض
              </button>
            </div>
          </div>
          {freeWill === false && (
            <div className="space-y-3 border border-orange-200 p-4 rounded-xl bg-orange-50/40">
              <p className="text-xs font-bold text-orange-800">تحديد نوع العارض:</p>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input type="checkbox" checked={coercion} onChange={(e) => setCoercion(e.target.checked)} className="w-4 h-4 accent-orange-600" />
                إكراه أو تهديد
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input type="checkbox" checked={intoxication} onChange={(e) => setIntoxication(e.target.checked)} className="w-4 h-4 accent-orange-600" />
                سكر طافح (زائل العقل)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input type="checkbox" checked={severeAnger} onChange={(e) => setSevereAnger(e.target.checked)} className="w-4 h-4 accent-orange-600" />
                غضب مطبق (فاقد الإدراك)
              </label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-bold">
                ⚠️ وجود أي عارض من هذه العوارض يستوجب مراجعة قانونية متخصصة قبل إتمام التوثيق.
              </div>
            </div>
          )}
        </div>
      </Card>
      <NavButtons stage={stage} canNext={freeWill !== null} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 8 — المستحقات
  if (stage === 8) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="المستحقات المحددة من المحكمة" icon="💰">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>مؤخر الصداق (درهم)</label><input type="number" min={0} className={inputCls} value={deferredMahr || ''} onChange={(e) => setDeferredMahr(Number(e.target.value))} /></div>
          <div><label className={labelCls}>نفقة العدة (درهم)</label><input type="number" min={0} className={inputCls} value={iddahSupport || ''} onChange={(e) => setIddahSupport(Number(e.target.value))} /></div>
          <div><label className={labelCls}>المتعة (درهم)</label><input type="number" min={0} className={inputCls} value={mutaa || ''} onChange={(e) => setMutaa(Number(e.target.value))} /></div>
          <div><label className={labelCls}>السكنى (درهم)</label><input type="number" min={0} className={inputCls} value={housing || ''} onChange={(e) => setHousing(Number(e.target.value))} /></div>
          <div><label className={labelCls}>نفقة الأبناء (درهم)</label><input type="number" min={0} className={inputCls} value={childrenSupport || ''} onChange={(e) => setChildrenSupport(Number(e.target.value))} /></div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">الإجمالي:</span>
          <span className="text-base font-extrabold text-red-700">{total.toLocaleString('ar-MA')} درهم</span>
        </div>
        <div>
          <label className={labelCls}>الإجمالي بالحروف</label>
          <input className={inputCls} value={totalInWords} onChange={(e) => setTotalInWords(e.target.value)} placeholder="مثال: خمسة عشر ألف درهم" />
        </div>
      </Card>
      <NavButtons stage={stage} canNext={total > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 9 — الإيداع
  if (stage === 9) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="إيداع المستحقات بكتابة الضبط" icon="🏦">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>المبلغ المودع (درهم)</label><input type="number" min={0} className={inputCls} value={depositAmount || ''} onChange={(e) => setDepositAmount(Number(e.target.value))} /></div>
          <div><label className={labelCls}>رقم وصل الإيداع</label><input className={inputCls} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="رقم الوصل" /></div>
          <div><label className={labelCls}>تاريخ الإيداع</label><input type="date" className={inputCls} value={depositDate} onChange={(e) => setDepositDate(e.target.value)} /></div>
          <div><label className={labelCls}>المحكمة المودع بها</label><input className={inputCls} value={depositCourt} onChange={(e) => setDepositCourt(e.target.value)} placeholder="المحكمة" /></div>
        </div>
        {depositAmount > 0 && total > 0 && depositAmount < total && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold">
            ⚠️ المبلغ المودع ({depositAmount.toLocaleString('ar-MA')} درهم) أقل من الإجمالي المحدد ({total.toLocaleString('ar-MA')} درهم). يرجى التحقق.
          </div>
        )}
        {depositAmount >= total && total > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
            🟢 تم إيداع كامل المستحقات المحددة.
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={receiptNumber.trim().length > 0 && depositDate.length > 0} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 10 — الأبناء
  if (stage === 10) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="الأبناء" icon="👶">
        <div className="flex gap-3">
          <button type="button" onClick={() => setHasChildren(true)}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${hasChildren === true ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            نعم — يوجد أبناء
          </button>
          <button type="button" onClick={() => setHasChildren(false)}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${hasChildren === false ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            لا — لا يوجد أبناء
          </button>
        </div>
        {hasChildren === true && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>عدد الذكور</label><input type="number" min={0} className={inputCls} value={boys || ''} onChange={(e) => setBoys(Number(e.target.value))} /></div>
            <div><label className={labelCls}>عدد الإناث</label><input type="number" min={0} className={inputCls} value={girls || ''} onChange={(e) => setGirls(Number(e.target.value))} /></div>
            <div className="col-span-2 p-3 bg-slate-50 border rounded-xl text-xs flex justify-between">
              <span className="font-bold text-gray-700">الإجمالي:</span>
              <span className="font-extrabold text-blue-700">{boys + girls} ابن/بنت</span>
            </div>
            <div className="col-span-2">
              <button type="button" onClick={addChild}
                className="w-full py-2 rounded-xl border-2 border-dashed border-blue-300 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all">
                + إضافة بطاقة ابن / ابنة
              </button>
            </div>
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={hasChildren !== null} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 11 — بطاقة الأبناء
  if (stage === 11) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2"><span>📋</span><span>بطاقة كل ابن / ابنة</span></h3>
        {children.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {hasChildren ? 'اضغط على «إضافة بطاقة» في المرحلة السابقة.' : 'لا يوجد أبناء.'}
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child, idx) => (
              <div key={child.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">الابن/البنت رقم {idx + 1}</span>
                  <button type="button" onClick={() => removeChild(child.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}>الاسم الشخصي</label><input className={inputCls} value={child.firstName} onChange={(e) => updateChild(child.id, 'firstName', e.target.value)} /></div>
                  <div><label className={labelCls}>اسم العائلة</label><input className={inputCls} value={child.lastName} onChange={(e) => updateChild(child.id, 'lastName', e.target.value)} /></div>
                  <div>
                    <label className={labelCls}>الجنس</label>
                    <select className={inputCls} value={child.gender} onChange={(e) => updateChild(child.id, 'gender', e.target.value)}>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>تاريخ الازدياد</label><input type="date" className={inputCls} value={child.birthDate} onChange={(e) => updateChild(child.id, 'birthDate', e.target.value)} /></div>
                  <div><label className={labelCls}>الوضع الصحي</label><input className={inputCls} value={child.healthStatus} onChange={(e) => updateChild(child.id, 'healthStatus', e.target.value)} /></div>
                  <div><label className={labelCls}>الوضع الدراسي</label><input className={inputCls} value={child.academicStatus} onChange={(e) => updateChild(child.id, 'academicStatus', e.target.value)} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addChild}
              className="w-full py-2 rounded-xl border-2 border-dashed border-blue-300 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all">
              + إضافة بطاقة أخرى
            </button>
          </div>
        )}
      </div>
      <NavButtons stage={stage} canNext={!hasChildren || children.length === boys + girls} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 12 — حالة الحمل
  if (stage === 12) return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <Card title="حالة الحمل" icon="🤰">
        <div className="space-y-3">
          <button type="button" onClick={() => setPregnancy('no')}
            className={`w-full py-3 rounded-xl border-2 text-sm font-bold transition-all text-right px-4 ${pregnancy === 'no' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            لا — غير حامل
          </button>
          <button type="button" onClick={() => setPregnancy('yes')}
            className={`w-full py-3 rounded-xl border-2 text-sm font-bold transition-all text-right px-4 ${pregnancy === 'yes' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            نعم — حامل
          </button>
          <button type="button" onClick={() => setPregnancy('unknown')}
            className={`w-full py-3 rounded-xl border-2 text-sm font-bold transition-all text-right px-4 ${pregnancy === 'unknown' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            غير معلوم
          </button>
        </div>
        {(pregnancy === 'yes' || pregnancy === 'unknown') && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            ⚠️ تنبيه (المادة 134 من مدونة الأسرة): عدة البينونة الكبرى في حالة الحمل تمتد إلى الوضع.
          </div>
        )}
      </Card>
      <NavButtons stage={stage} canNext={pregnancy !== null} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );

  // STAGE 13 — المراجعة الشاملة
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4 font-sans" dir="rtl">
      <StepBar stage={stage} setStage={setStage} />
      <div className="bg-gradient-to-r from-slate-900 via-red-950 to-red-900 text-white p-5 rounded-2xl shadow-xl border border-red-900/40">
        <h2 className="text-base font-extrabold flex items-center gap-2">
          <span>🛑</span>
          <span>المراجعة الشاملة والتأكيد النهائي — الطلاق المكمل للثلاث (بائن بينونة كبرى)</span>
        </h2>
        <p className="text-red-200 text-xs mt-1">يرجى مراجعة ملخص البيانات المدخلة قبل الانتقال إلى تحرير الرسم.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 text-xs" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          {([
            ['الإذن القضائي', permissionNumber ? `رقم ${permissionNumber} بتاريخ ${permissionDate}` : '—'],
            ['الحاضر', attendeeType === 'husband_or_proxy' ? 'الزوج أو وكيله' : 'الزوجان معاً'],
            ['الزوج', `${husbandFirstAr} ${husbandLastAr}`],
            ['الزوجة', `${wifeFirstAr} ${wifeLastAr}`],
            ['رسم الزواج', `عدد ${marriageDeedNum} — ${marriageAuthority}`],
            ['الطلقة 1', `رقم ${d1Num} — ${d1Type}`],
            ['الطلقة 2', `رقم ${d2Num} — ${d2Type}`],
            ['البناء', consummationHappened ? 'بعد البناء' : 'قبل البناء'],
            ['الإرادة', freeWill ? 'حرة مختارة' : 'يوجد عارض'],
            ['المستحقات', `${total.toLocaleString('ar-MA')} درهم`],
            ['الإيداع', `وصل رقم ${receiptNumber} — ${depositCourt}`],
            ['الأبناء', hasChildren ? `${boys + girls} (${boys} ذ / ${girls} إ)` : 'لا يوجد'],
            ['الحمل', pregnancy === 'yes' ? 'حامل' : pregnancy === 'no' ? 'غير حامل' : 'غير معلوم'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-gray-500 font-semibold">{label}</span>
              <span className="text-gray-900 font-bold">{val}</span>
            </div>
          ))}
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-bold leading-relaxed">
          🛑 التكييف القانوني النهائي: هذا طلاق بائن بينونة كبرى مكمل للثلاث طبقاً للمادتين 123 و127 من مدونة الأسرة. يزول به حل الزوج وملكه على هذه المطلقة نهائياً، ولا تحل له إلا بعد انقضاء عدتها من زوج آخر دخل بها فعلاً بنكاح صحيح.
        </div>
      </div>

      <NavButtons stage={stage} onPrev={prev} onNext={next} onComplete={handleComplete} />
    </div>
  );
};
