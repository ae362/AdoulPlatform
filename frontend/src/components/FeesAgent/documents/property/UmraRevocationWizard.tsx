import React, { useState, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  Building2,
  FileCheck,
  Users,
  ArrowRight,
  Copy,
  Printer,
  Scale,
} from 'lucide-react';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import { createEmptyParty, convertGregorianToHijri } from '../../../../utils/feesAgentUtils';
import type { UmraRevocationState, UmraOperationType } from './umraRevocationTypes';

export const UmraRevocationWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
}) => {
  const saved = state.umraRevocation;

  const [operationType, setOperationType] = useState<UmraOperationType>(
    saved?.operationType || 'اعتصار_العمرى'
  );

  // Original deed
  const [sourceType, setSourceType] = useState<'رسم_عدلي' | 'عقد_توثيقي' | 'حكم_قضائي' | 'وثيقة_أخرى'>(
    saved?.originalDeed?.sourceType || 'رسم_عدلي'
  );
  const [deedNumber, setDeedNumber] = useState(saved?.originalDeed?.deedNumber || '');
  const [deedCourt, setDeedCourt] = useState(saved?.originalDeed?.court || state.meta?.court || 'تطوان');
  const [deedDate, setDeedDate] = useState(saved?.originalDeed?.creationDate || '');
  const [creationEra, setCreationEra] = useState<'سابقة_على_المدونة' | 'في_ظل_المدونة'>(
    saved?.originalDeed?.creationEra || 'في_ظل_المدونة'
  );

  // Donor (المعطي)
  const [donorName, setDonorName] = useState(saved?.donor?.name || state.sellers?.[0]?.name || '');
  const [donorCin, setDonorCin] = useState(saved?.donor?.cin || state.sellers?.[0]?.idNumber || '');
  const [donorAddress, setDonorAddress] = useState(saved?.donor?.address || state.sellers?.[0]?.address || '');

  // Donee (المعمر له)
  const [doneeName, setDoneeName] = useState(saved?.donee?.name || state.buyers?.[0]?.name || '');
  const [doneeCin, setDoneeCin] = useState(saved?.donee?.cin || state.buyers?.[0]?.idNumber || '');
  const [aliveStatus, setAliveStatus] = useState<'على_قيد_الحياة' | 'متوفى' | 'غير_معلوم'>(
    saved?.donee?.aliveStatus || 'على_قيد_الحياة'
  );

  // Property
  const [regType, setRegType] = useState<'محفظ' | 'غير_محفظ' | 'في_طور_التحفيظ'>(
    saved?.property?.registrationType || 'محفظ'
  );
  const [titleNumber, setTitleNumber] = useState(saved?.property?.titleNumber || '');
  const [propertyName, setPropertyName] = useState(saved?.property?.location?.propertyName || '');
  const [commune, setCommune] = useState(saved?.property?.location?.commune || 'تطوان');
  const [scope, setScope] = useState<'كامل_العقار' | 'حصة_مشاعة' | 'جزء_مفرز'>(
    saved?.retractionIntent?.scope || 'كامل_العقار'
  );

  const [copied, setCopied] = useState(false);

  const generatedDraft = useMemo(() => {
    const todayGregorian = new Date().toISOString().split('T')[0];
    const todayHijri = convertGregorianToHijri(todayGregorian);
    const notary1 = state.meta?.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
    const notary2 = state.meta?.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

    let d = `الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.\n\n`;
    d += `بتاريخ: ${todayHijri} هجرية موافق ${todayGregorian} ميلادية.\n`;
    d += `بمكتب التوثيق العدلي الكائن بدائرة محكمة الاستئناف بـ${deedCourt}، المحكمة الابتدائية بـ${deedCourt}.\n`;
    d += `لدى العدلين المنتصبين للإشهاد الموقعين أسفله: الأستاذ ${notary1} والأستاذ ${notary2}.\n\n`;
    d += `حضر المعطي: السيد(ة) ${donorName || '...........................................'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم: ${donorCin || '.....................'}، الساكن(ة) بـ: ${donorAddress || '.....................'}.\n`;
    d += `فأشهد على نفسه طائعاً مختاراً وطلب توثيق اعتصاره لحق العمرى ورجوعه في المنفعة التي كان قد أعمرها للسيد(ة): ${doneeName || '...........................................'} (ب.ت.و: ${doneeCin || '.....................'}) بمقتضى السند الأصلي عدد ${deedNumber || '.....'} المؤرخ في ${deedDate || '.....'}.\n`;
    d += `المتعلق بالعقار: ${regType === 'محفظ' ? `ذي الرسم العقاري عدد ${titleNumber || '.....'}` : `${propertyName || 'عقار غير محفظ'}`} الكائن بـ: ${commune}.\n`;
    d += `وذلك في نطاق: ${scope.replace(/_/g, ' ')}، طبقاً لأحكام المواد 105 إلى 108 من مدونة الحقوق العينية وقواعد الفقه المالكي وقرار محكمة النقض عدد 513 لسنة 2014.\n\n`;
    d += `وعليه حرر هذا الرسم وتلي على الطالب فصادق عليه وأمضاه، وبمقتضاه يخاطب القاضي المكلف بالتوثيق.\n`;
    return d;
  }, [
    state.meta,
    state.preReceptionVerification,
    deedCourt,
    donorName,
    donorCin,
    donorAddress,
    doneeName,
    doneeCin,
    deedNumber,
    deedDate,
    regType,
    titleNumber,
    propertyName,
    commune,
    scope,
  ]);

  const handleProceedToStep7 = useCallback(() => {
    const umraState: UmraRevocationState = {
      operationType,
      originalDeed: {
        sourceType,
        deedNumber,
        court: deedCourt,
        creationDate: deedDate,
        creationEra,
      },
      donor: {
        name: donorName,
        cin: donorCin,
        address: donorAddress,
        capacity: 'معطي معتصر',
      },
      donee: {
        name: doneeName,
        cin: doneeCin,
        aliveStatus,
      },
      property: {
        registrationType: regType,
        titleNumber,
        location: {
          commune,
          propertyName,
        },
      },
      retractionIntent: {
        scope,
      },
      draftText: generatedDraft,
    };

    const donorParty: Party = {
      ...createEmptyParty(),
      name: donorName || 'المعطي (المعتصر)',
      idNumber: donorCin,
      address: donorAddress,
      share: 'معطي',
      nationality: 'مغربي',
      idImage: null,
    };

    const doneeParty: Party = {
      ...createEmptyParty(),
      name: doneeName || 'المعمر له',
      idNumber: doneeCin,
      share: 'معمر له',
      nationality: 'مغربي',
      idImage: null,
    };

    setState((prev) => ({
      ...prev,
      step: 7,
      documentType: 'اعتصار_عمرى',
      draft: generatedDraft,
      draftText: generatedDraft,
      sellers: [donorParty],
      buyers: [doneeParty],
      umraRevocation: umraState,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    operationType,
    sourceType,
    deedNumber,
    deedCourt,
    deedDate,
    creationEra,
    donorName,
    donorCin,
    donorAddress,
    doneeName,
    doneeCin,
    aliveStatus,
    regType,
    titleNumber,
    commune,
    propertyName,
    scope,
    generatedDraft,
    setState,
  ]);

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-indigo-300" />
              <h2 className="text-xl font-black font-amiri tracking-wide text-indigo-100">
                رسم اعتصار العمرى واسترجاع المنفعة
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full font-bold">
                المواد 105-108 م.ح.ع
              </span>
            </div>
            <p className="text-xs text-slate-300 font-amiri italic">
              توثيق رجوع المعطي عن حق العمرى وفق طبيعة التصرف الأصلي وأحكامه
            </p>
          </div>

          <button
            type="button"
            onClick={handleProceedToStep7}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>الإحالة للقاضي (الخطوة 7)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Form Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        {/* 1. Operation Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>تحديد نوع العملية التوثيقية:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: 'اعتصار العمرى (رجوع المعطي)', value: 'اعتصار_العمرى' },
              { label: 'انتهاء العمرى بانتهاء مدتها', value: 'انتهاء_العمرى_بانتهاء_مدتها' },
              { label: 'انتهاء العمرى بوفاة المعمر', value: 'انتهاء_العمرى_بوفاة_المعمر' },
              { label: 'رجوع المنفعة للمعطي أو ورثته', value: 'رجوع_المنفعة_الى_المعطي' },
              { label: 'تنفيذ شرط وارد في رسم العمرى', value: 'تنفيذ_شرط_في_رسم_العمرى' },
              { label: 'إنهاء العمرى بالاتفاق', value: 'انهاء_باتفاق' },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setOperationType(op.value as any)}
                className={`p-2.5 rounded-lg border text-right font-bold transition ${
                  operationType === op.value
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Original Deed Reference */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            <span>بيانات رسم العمرى الأصلي المراد اعتصاره:</span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">نوع السند:</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="رسم_عدلي">رسم عدلي</option>
                <option value="عقد_توثيقي">عقد توثيقي</option>
                <option value="حكم_قضائي">حكم قضائي</option>
                <option value="وثيقة_أخرى">وثيقة أخرى</option>
              </select>
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">رقم الرسم / العقد:</label>
              <input
                type="text"
                value={deedNumber}
                onChange={(e) => setDeedNumber(e.target.value)}
                placeholder="عدد / مرجع الرسم"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">المحكمة / الجهة الموثقة:</label>
              <input
                type="text"
                value={deedCourt}
                onChange={(e) => setDeedCourt(e.target.value)}
                placeholder="محكمة التوثيق"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">تاريخ الإنشاء:</label>
              <input
                type="date"
                value={deedDate}
                onChange={(e) => setDeedDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">حقبة إنشاء العمرى:</label>
              <select
                value={creationEra}
                onChange={(e) => setCreationEra(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-indigo-900"
              >
                <option value="في_ظل_المدونة">في ظل المدونة (قانون 39.08)</option>
                <option value="سابقة_على_المدونة">سابقة على المدونة (الفقه المالكي)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Parties */}
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          {/* Donor */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
            <h4 className="font-black text-indigo-950 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-700" />
              <span>بيانات المعطي (المعتصر):</span>
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="اسم المعطي الكامل"
                className="w-full p-2 border border-indigo-200 rounded-lg bg-white"
              />
              <input
                type="text"
                value={donorCin}
                onChange={(e) => setDonorCin(e.target.value.toUpperCase())}
                placeholder="رقم البطاقة الوطنية (CIN)"
                className="w-full p-2 border border-indigo-200 rounded-lg bg-white font-mono"
              />
              <input
                type="text"
                value={donorAddress}
                onChange={(e) => setDonorAddress(e.target.value)}
                placeholder="عنوان السكنى"
                className="w-full p-2 border border-indigo-200 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Donee */}
          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
            <h4 className="font-black text-purple-950 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-700" />
              <span>بيانات المعمر له (المستفيد الأصلي):</span>
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                value={doneeName}
                onChange={(e) => setDoneeName(e.target.value)}
                placeholder="اسم المعمر له الكامل"
                className="w-full p-2 border border-purple-200 rounded-lg bg-white"
              />
              <input
                type="text"
                value={doneeCin}
                onChange={(e) => setDoneeCin(e.target.value.toUpperCase())}
                placeholder="رقم البطاقة الوطنية (CIN)"
                className="w-full p-2 border border-purple-200 rounded-lg bg-white font-mono"
              />
              <select
                value={aliveStatus}
                onChange={(e) => setAliveStatus(e.target.value as any)}
                className="w-full p-2 border border-purple-200 rounded-lg bg-white font-bold"
              >
                <option value="على_قيد_الحياة">✓ على قيد الحياة</option>
                <option value="متوفى">⚠️ متوفى (تنتهي العمرى بالوفاة)</option>
                <option value="غير_معلوم">غير معلوم</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Property & Scope */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <h4 className="font-black text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>بيانات العقار ونطاق الاعتصار:</span>
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">حالة التحفيظ:</label>
              <select
                value={regType}
                onChange={(e) => setRegType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
              >
                <option value="محفظ">محفظ (رسم عقاري)</option>
                <option value="غير_محفظ">غير محفظ</option>
                <option value="في_طور_التحفيظ">في طور التحفيظ</option>
              </select>
            </div>
            {regType === 'محفظ' ? (
              <div>
                <label className="text-slate-600 block mb-1 font-semibold">رقم الرسم العقاري:</label>
                <input
                  type="text"
                  value={titleNumber}
                  onChange={(e) => setTitleNumber(e.target.value)}
                  placeholder="مثال: 12345/01"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="text-slate-600 block mb-1 font-semibold">اسم / موقع العقار:</label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="اسم العقار أو موقعه"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            )}
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">الجماعة / المدينة:</label>
              <input
                type="text"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="الجماعة الترابية"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1 font-semibold">نطاق الاعتصار:</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-indigo-900"
              >
                <option value="كامل_العقار">كامل العقار المعتمر</option>
                <option value="حصة_مشاعة">حصة مشاعة محددة</option>
                <option value="جزء_مفرز">جزء مفرز</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. Draft Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>معاينة نص رسم اعتصار العمرى:</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedDraft);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
          <div className="p-5 bg-amber-50/20 border border-slate-200 rounded-xl font-amiri text-base leading-loose whitespace-pre-wrap">
            {generatedDraft}
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
            <span className="text-xs font-bold text-indigo-950">
              جاهز للإحالة القضائية والمخاطبة لدى قاضي التوثيق
            </span>
          </div>
          <button
            type="button"
            onClick={handleProceedToStep7}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
          >
            <span>🚀 الانتقال إلى الخطوة 7 والمصادقة للإحالة للقاضي</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
