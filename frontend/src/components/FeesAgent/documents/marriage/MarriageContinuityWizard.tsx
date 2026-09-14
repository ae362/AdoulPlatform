import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import type {
  PaymentMethod, PropertyType, ValidationSeverity, Party, Applicant,
  TitleDocumentDetails, OwnershipCertificateDetails, PropertyDetails,
  FinanceDetails, DocumentMeta, ValidationAlert, AuditEntry,
  AdministrativeCertificate, PostRegistrationDetails, InheritanceDeed,
  Witness, PartitionBeneficiary, PartitionDivision, FacilityShare,
  FacilityItem, CommonFacilities, BuildingProof, EasementProof,
  PossessionProof, PromiseToSell, ProofOfEstate, EstateInventory,
  WillDeed, ExchangeDeed, DeliveryDeed, AcknowledgmentDeed,
  DebtDischargeDeed, DebtAcknowledgmentDeed, PersonIdentityFields,
  BilingualPersonIdentity, MarriageContinuityDeed, MarriageDetails,
  DowryDetails, TawkilScope, FeesAgentState
} from '../../../../types/feesAgentTypes';
import {
  createEmptyTitleDocument, createEmptyProperty, createEmptyPartitionDivision,
  createEmptyParty, createEmptyWitness, calculateAge, convertGregorianToHijri,
  generateFileNumber, convertNumberToArabicWords, convertGregorianDateToWords,
  convertHijriDateToWords, convertTimeToWords, getArabicWeekdayName,
  generateValidationId, generateValidationAlert, performValidationChecks,
  executeLegalFiltersForPossession, validatePossessionConditions,
  validateWitnessRequirements, generateOutcomeRouting
} from '../../../../utils/feesAgentUtils';
import { formatCourtName, generateRasmHtml, generateDocumentDraft } from '../../../../templates/feesAgentTemplates';
import {
  type DocumentType, type PartyLabels, DEFAULT_PARTY_LABELS,
  DOCUMENT_PARTY_LABELS, getPartyLabels, DOCUMENT_CATEGORIES,
  LEGAL_ENTITY_TYPE_OPTIONS, REPRESENTATION_DOC_TYPE_OPTIONS,
  PROFESSIONAL_CONVICTION_QUESTIONS, JUDGE_SEND_TRANSIT_MESSAGES,
  ARABIC_ONES, ARABIC_TENS, ARABIC_TEENS, ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC, SALE_DOCUMENT_TYPES, FAMILY_DEED_TYPES,
  MARRIAGE_DOCUMENT_TYPES, INHERITANCE_DOCUMENT_TYPES
} from '../../../../constants/feesAgentLocales';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';

  export const Step3_MarriageContinuityDeed: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const deed: MarriageContinuityDeed = state.marriageContinuityDeed || {};
    const defaultContinuityStatement =
      'أشهد الزوجان المذكوران أعلاه على استمرار رابطة الزواج الشرعي بينهما المستمرة منذ تاريخ إبرام العقد المشار إليه أعلاه، دون انحلال أو طلاق أو منازعة، وبحضور الشهود العدليين وفقًا للشرع والقانون.';
    const [showIdentityDetails, setShowIdentityDetails] = useState(false);
    const autoCopiedRef = useRef(false);
    
    // Helper to update root fields
    const updateDeed = <K extends keyof MarriageContinuityDeed>(field: K, value: MarriageContinuityDeed[K]) => {
      setState((prev) => ({
        ...prev,
        marriageContinuityDeed: {
          ...(prev.marriageContinuityDeed || {}),
          [field]: value,
        },
      }));
    };

    // Helper for nested updates
    const updateNested = (parent: keyof MarriageContinuityDeed, field: string, value: any) => {
        setState((prev) => {
            const currentDeed = prev.marriageContinuityDeed || {};
            const parentObj = (currentDeed[parent] as any) || {};
            return {
                ...prev,
                marriageContinuityDeed: {
                    ...currentDeed,
                    [parent]: {
                        ...parentObj,
                        [field]: value 
                    }
                }
            };
        });
    };

    // Helper for Children Array
    const addChild = () => {
        const currentChildren = deed.children || [];
        updateDeed('children', [...currentChildren, { name: '', birthDate: '', sex: 'ذكر' }]);
    };
    
    const updateChild = (index: number, field: string, value: string) => {
        const currentChildren = [...(deed.children || [])];
        currentChildren[index] = { ...currentChildren[index], [field]: value };
        updateDeed('children', currentChildren);
    };

    const removeChild = (index: number) => {
        const currentChildren = [...(deed.children || [])];
        currentChildren.splice(index, 1);
        updateDeed('children', currentChildren);
    };

    const updateSpouseField = (
      spouse: 'husband' | 'wife',
      script: 'ar' | 'lat',
      field: keyof PersonIdentityFields,
      value: string,
    ) => {
      setState((prev) => {
        const currentDeed = prev.marriageContinuityDeed || {};
        const spouses = currentDeed.spouses || {};
        const spouseObj = spouses[spouse] || {};
        const scriptObj = (spouseObj[script] || {}) as PersonIdentityFields;

        return {
          ...prev,
          marriageContinuityDeed: {
            ...currentDeed,
            spouses: {
              ...spouses,
              [spouse]: {
                ...spouseObj,
                [script]: {
                  ...scriptObj,
                  [field]: value,
                },
              },
            },
          },
        };
      });
    };

    const copySpousesFromParties = () => {
      const husband = state.sellers?.[0];
      const wife = state.buyers?.[0];
      if (!husband && !wife) return;

      setState((prev) => {
        const currentDeed = prev.marriageContinuityDeed || {};
        const spouses = currentDeed.spouses || {};

        const patchSpouse = (party: Party | undefined, existing: BilingualPersonIdentity | undefined) => {
          const ar: PersonIdentityFields = {
            firstName: party?.name || existing?.ar?.firstName || '',
            fatherName: party?.fatherName || existing?.ar?.fatherName || '',
            motherName: party?.motherName || existing?.ar?.motherName || '',
            birthplace: party?.placeOfBirth || existing?.ar?.birthplace || '',
            birthdate: party?.dateOfBirth || existing?.ar?.birthdate || '',
            cin: party?.idNumber || existing?.ar?.cin || '',
            nationality: party?.nationality || existing?.ar?.nationality || '',
            occupation: party?.profession || existing?.ar?.occupation || '',
            address: party?.address || existing?.ar?.address || '',
            familyName: existing?.ar?.familyName || '',
          };

          return {
            ...existing,
            ar,
          };
        };

        return {
          ...prev,
          marriageContinuityDeed: {
            ...currentDeed,
            spouses: {
              ...spouses,
              husband: patchSpouse(husband, spouses.husband),
              wife: patchSpouse(wife, spouses.wife),
            },
          },
        };
      });
    };

    useEffect(() => {
      if (autoCopiedRef.current) return;
      const hasAnySpouseData =
        Boolean(deed.spouses?.husband?.ar?.firstName) ||
        Boolean(deed.spouses?.wife?.ar?.firstName) ||
        Boolean(deed.spouses?.husband?.ar?.cin) ||
        Boolean(deed.spouses?.wife?.ar?.cin);

      if (!hasAnySpouseData && (state.sellers?.[0] || state.buyers?.[0])) {
        autoCopiedRef.current = true;
        copySpousesFromParties();
      }
    }, [deed.spouses, state.sellers, state.buyers]);

    const addContinuityWitness = () => {
      const current = deed.witnesses || [];
      if (current.length >= 4) return;
      updateDeed('witnesses', [...current, { name: '', cin: '', age: undefined, relation: '', occupation: '', address: '' }]);
    };

    const updateContinuityWitness = (index: number, patch: Partial<NonNullable<MarriageContinuityDeed['witnesses']>[number]>) => {
      const current = [...(deed.witnesses || [])];
      current[index] = { ...current[index], ...patch };
      updateDeed('witnesses', current);
    };

    const removeContinuityWitness = (index: number) => {
      const current = [...(deed.witnesses || [])];
      current.splice(index, 1);
      updateDeed('witnesses', current);
    };

    const identityFields: Array<{ key: keyof PersonIdentityFields; arLabel: string; latLabel: string; inputType?: string }> = [
      { key: 'familyName', arLabel: 'الاسم العائلي', latLabel: 'Family Name' },
      { key: 'firstName', arLabel: 'الاسم الشخصي', latLabel: 'First Name' },
      { key: 'fatherName', arLabel: 'اسم الأب', latLabel: "Father's Name" },
      { key: 'motherName', arLabel: 'اسم الأم', latLabel: "Mother's Name" },
      { key: 'birthplace', arLabel: 'مكان الازدياد', latLabel: 'Birthplace' },
      { key: 'birthdate', arLabel: 'تاريخ الازدياد', latLabel: 'Birthdate', inputType: 'date' },
      { key: 'cin', arLabel: 'الرقم الوطني (CIN)', latLabel: 'CIN' },
      { key: 'nationality', arLabel: 'الجنسية', latLabel: 'Nationality' },
      { key: 'occupation', arLabel: 'المهنة', latLabel: 'Occupation' },
      { key: 'address', arLabel: 'العنوان', latLabel: 'Address' },
    ];

    const getIdentityValue = (
      spouse: 'husband' | 'wife',
      script: 'ar' | 'lat',
      field: keyof PersonIdentityFields,
    ) => deed.spouses?.[spouse]?.[script]?.[field] || '';

    const handleNext = () => {
      const witnesses = deed.witnesses || [];
      if (witnesses.length < 2) {
        alert('يرجى إدراج ما بين شاهدين وأربعة شهود لاستمرار الزواج.');
        return;
      }
      const hasEmptyCoreFields = witnesses.some((w) => !w.name?.trim() || !w.cin?.trim());
      if (hasEmptyCoreFields) {
        alert('يرجى إتمام اسم و CIN لكل شاهد.');
        return;
      }

      if (!deed.continuityStatement?.trim()) {
        updateDeed('continuityStatement', defaultContinuityStatement);
      }

      setState((prev) => ({ ...prev, step: 4 }));
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="bg-pink-50 p-6 rounded-lg border-r-4 border-pink-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: رسم استمرار زواج</h2>
          <p className="text-gray-700 leading-relaxed">
            توثيق استمرار الرابطة الزوجية دون انحلال، مع الإشارة لرسم الزواج الأصلي والأبناء إن وجدوا (المادة 16 مدونة الأسرة).
          </p>
        </div>

        {/* 3. Full Identity (avoid retyping Step 1; expand for bilingual/international needs) */}
        <div className="bg-white p-6 rounded-lg border-l-4 border-emerald-300 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-800">3. الهوية الكاملة للأطراف</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copySpousesFromParties}
                className="text-sm bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700"
              >
                نسخ من بيانات الأطراف (الخطوة 1)
              </button>
              <button
                type="button"
                onClick={() => setShowIdentityDetails((v) => !v)}
                className="text-sm bg-gray-100 text-gray-800 px-3 py-2 rounded hover:bg-gray-200"
              >
                {showIdentityDetails ? 'إخفاء التفاصيل' : 'إظهار التفاصيل (عربي/لاتيني)'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            لتفادي التكرار: البيانات الأساسية تؤخذ من <span className="font-semibold">الأطراف في الخطوة 1</span>، والتفاصيل أدناه مطلوبة غالبًا فقط
            للاستعمال الدولي/الترجمة. الحالة العائلية: <span className="font-semibold">متزوج</span>.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-bold text-gray-800 mb-2">أ) الزوج (ملخص من الخطوة 1)</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>الاسم: {state.sellers?.[0]?.name || '—'}</div>
                <div>CIN: {state.sellers?.[0]?.idNumber || '—'}</div>
                <div>مكان الازدياد: {state.sellers?.[0]?.placeOfBirth || '—'}</div>
                <div>تاريخ الازدياد: {state.sellers?.[0]?.dateOfBirth || '—'}</div>
                <div>العنوان: {state.sellers?.[0]?.address || '—'}</div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-bold text-gray-800 mb-2">ب) الزوجة (ملخص من الخطوة 1)</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>الاسم: {state.buyers?.[0]?.name || '—'}</div>
                <div>CIN: {state.buyers?.[0]?.idNumber || '—'}</div>
                <div>مكان الازدياد: {state.buyers?.[0]?.placeOfBirth || '—'}</div>
                <div>تاريخ الازدياد: {state.buyers?.[0]?.dateOfBirth || '—'}</div>
                <div>العنوان: {state.buyers?.[0]?.address || '—'}</div>
              </div>
            </div>
          </div>

          {showIdentityDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="bg-gray-50 p-4 rounded border space-y-4">
                <h4 className="font-bold text-gray-800">أ) الزوج (تفاصيل)</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {identityFields.map((f) => (
                    <div key={`husband_ar_${String(f.key)}`}>
                      <label className="block text-sm font-medium text-gray-700">{f.arLabel}</label>
                      <input
                        type={f.inputType || 'text'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={getIdentityValue('husband', 'ar', f.key)}
                        onChange={(e) => updateSpouseField('husband', 'ar', f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <h5 className="font-semibold text-gray-700 mb-2">اللاتينية (لتطبيقك)</h5>
                  <div className="grid md:grid-cols-2 gap-3">
                    {identityFields.map((f) => (
                      <div key={`husband_lat_${String(f.key)}`}>
                        <label className="block text-sm font-medium text-gray-700">{f.latLabel}</label>
                        <input
                          type={f.inputType || 'text'}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          value={getIdentityValue('husband', 'lat', f.key)}
                          onChange={(e) => updateSpouseField('husband', 'lat', f.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded border space-y-4">
                <h4 className="font-bold text-gray-800">ب) الزوجة (تفاصيل)</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {identityFields.map((f) => (
                    <div key={`wife_ar_${String(f.key)}`}>
                      <label className="block text-sm font-medium text-gray-700">{f.arLabel}</label>
                      <input
                        type={f.inputType || 'text'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={getIdentityValue('wife', 'ar', f.key)}
                        onChange={(e) => updateSpouseField('wife', 'ar', f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <h5 className="font-semibold text-gray-700 mb-2">اللاتينية (لتطبيقك)</h5>
                  <div className="grid md:grid-cols-2 gap-3">
                    {identityFields.map((f) => (
                      <div key={`wife_lat_${String(f.key)}`}>
                        <label className="block text-sm font-medium text-gray-700">{f.latLabel}</label>
                        <input
                          type={f.inputType || 'text'}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          value={getIdentityValue('wife', 'lat', f.key)}
                          onChange={(e) => updateSpouseField('wife', 'lat', f.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Original Marriage Reference */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
           <h3 className="text-lg font-bold text-gray-800">4. مرجع الزواج الأصلي</h3>
           <p className="text-xs text-gray-600">
             نوع الرسم:{' '}
             {deed.marriageType
               ? deed.marriageType === 'عدلي'
                 ? 'عقد زواج عدلي'
                 : deed.marriageType === 'مدني'
                   ? 'عقد زواج مدني'
                   : 'عقد زواج قنصلي'
               : '—'}
           </p>
           <div className="grid md:grid-cols-3 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700">نوع الزواج</label>
                 <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={deed.marriageType || ''} onChange={(e) => updateDeed('marriageType', e.target.value as any)}>
                    <option value="">اختر...</option>
                    <option value="عدلي">عدلي (توثيقي)</option>
                    <option value="مدني">مدني (أجنبي)</option>
                    <option value="قنصلي">قنصلي</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">المحكمة / المركز</label>
                 <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={deed.reference?.court || ''} onChange={(e) => updateNested('reference', 'court', e.target.value)} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">قسم التوثيق</label>
                 <input
                   type="text"
                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                   value={deed.reference?.notarySection || ''}
                   onChange={(e) => updateNested('reference', 'notarySection', e.target.value)}
                 />
              </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">رقم الرسم</label>
                 <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={deed.reference?.number || ''} onChange={(e) => updateNested('reference', 'number', e.target.value)} />
              </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">تاريخ الرسم (ميلادي)</label>
                 <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={deed.reference?.date || ''} onChange={(e) => updateNested('reference', 'date', e.target.value)} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">تاريخ الإشهاد</label>
                 <input
                   type="date"
                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                   value={deed.reference?.ishhadDate || ''}
                   onChange={(e) => updateNested('reference', 'ishhadDate', e.target.value)}
                 />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deed.reference?.isMarriageOutsideMorocco || false}
                    onChange={(e) => updateNested('reference', 'isMarriageOutsideMorocco', e.target.checked)}
                  />
                  <span className="text-sm">الزواج خارج المغرب</span>
                </label>
              </div>
              <div className="flex items-center pt-6">
                 <label className="flex items-center gap-2">
                    <input type="checkbox" checked={deed.reference?.isGuardianPresent || false} 
                       onChange={(e) => updateNested('reference', 'isGuardianPresent', e.target.checked)} />
                    <span className="text-sm">هل تم بحضور الولي؟</span>
                 </label>
              </div>
           </div>
           
           {/* Foreign Marriage Specifics */}
           {(deed.marriageType === 'قنصلي' || deed.reference?.isMarriageOutsideMorocco) && (
               <div className="bg-white p-4 rounded border mt-2">
                   <h4 className="font-semibold text-gray-700 mb-2">بيانات الزواج خارج المغرب</h4>
                   <div className="grid md:grid-cols-2 gap-4">
                       <input
                         type="text"
                         placeholder="القنصلية (إن وجدت)"
                         className="border rounded p-2"
                         value={deed.foreignReference?.consulate || ''}
                         onChange={(e) => updateNested('foreignReference', 'consulate', e.target.value)}
                       />
                       <input
                         type="text"
                         placeholder="البلد / الدولة"
                         className="border rounded p-2"
                         value={deed.foreignReference?.country || ''}
                         onChange={(e) => updateNested('foreignReference', 'country', e.target.value)}
                       />
                       <input
                         type="text"
                         placeholder="رقم التسجيل"
                         className="border rounded p-2"
                         value={deed.foreignReference?.registrationNumber || ''}
                         onChange={(e) => updateNested('foreignReference', 'registrationNumber', e.target.value)}
                       />
                       <input
                         type="date"
                         className="border rounded p-2"
                         value={deed.foreignReference?.transcriptionDate || ''}
                         onChange={(e) => updateNested('foreignReference', 'transcriptionDate', e.target.value)}
                       />
                   </div>
               </div>
           )}

           <div className="grid md:grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded border space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                 <input
                   type="checkbox"
                   checked={deed.reference?.hasConditions || false}
                   onChange={(e) => {
                     updateNested('reference', 'hasConditions', e.target.checked);
                     if (!e.target.checked) updateNested('reference', 'conditions', '');
                   }}
                 />
                 <span>هل تضمن شروطًا؟</span>
               </label>
               {(deed.reference?.hasConditions || (deed.reference?.conditions || '').trim().length > 0) && (
                 <input
                   type="text"
                   className="w-full rounded-md border-gray-300 shadow-sm"
                   placeholder="مثلاً: عدم الزواج بثانية، السكن، العمل..."
                   value={deed.reference?.conditions || ''}
                   onChange={(e) => updateNested('reference', 'conditions', e.target.value)}
                 />
               )}
             </div>

             <div className="bg-white p-4 rounded border space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                 <input
                   type="checkbox"
                   checked={deed.reference?.hasDowry || false}
                   onChange={(e) => {
                     updateNested('reference', 'hasDowry', e.target.checked);
                     if (!e.target.checked) updateNested('reference', 'dowryValue', undefined);
                   }}
                 />
                 <span>هل تضمن صداقًا؟</span>
               </label>
               {(deed.reference?.hasDowry || deed.reference?.dowryValue !== undefined) && (
                 <input
                   type="number"
                   className="w-full rounded-md border-gray-300 shadow-sm"
                   placeholder="قيمة الصداق"
                   value={deed.reference?.dowryValue ?? ''}
                   onChange={(e) => updateNested('reference', 'dowryValue', e.target.value ? Number(e.target.value) : undefined)}
                 />
               )}
             </div>
           </div>
        </div>

        {/* 5. Marriage continuity statement */}
        <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-300 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-800">5. صيغة استمرار الزواج</h3>
            <button
              type="button"
              onClick={() => updateDeed('continuityStatement', defaultContinuityStatement)}
              className="text-sm bg-amber-600 text-white px-3 py-2 rounded hover:bg-amber-700"
            >
              إدراج الصيغة المقترحة
            </button>
          </div>
          <textarea
            className="w-full min-h-[120px] p-3 border rounded-lg bg-white"
            value={deed.continuityStatement || ''}
            placeholder={defaultContinuityStatement}
            onChange={(e) => updateDeed('continuityStatement', e.target.value)}
          />
        </div>

        {/* 6. Continuity witnesses */}
        <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-800">6. الشهود في استمرار الزواج</h3>
            <button
              type="button"
              onClick={addContinuityWitness}
              disabled={(deed.witnesses || []).length >= 4}
              className="text-sm bg-indigo-600 disabled:bg-indigo-300 text-white px-3 py-2 rounded hover:bg-indigo-700"
            >
              + إضافة شاهد
            </button>
          </div>
          <p className="text-xs text-gray-600">قائمة من 2 إلى 4 شهود (مع اقتراح فحص أهلية الشهادة).</p>

          <div className="space-y-3">
            {(deed.witnesses || []).map((w, idx) => (
              <div key={idx} className="bg-white p-4 rounded border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-gray-800">شاهد {idx + 1}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                      onClick={() => updateContinuityWitness(idx, { aiEligibilityCheck: true })}
                    >
                      {w.aiEligibilityCheck ? '✓ تم الفحص' : 'فحص أهلية الشهادة (AI)'}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 font-semibold"
                      onClick={() => removeContinuityWitness(idx)}
                    >
                      حذف
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">الاسم</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.name}
                      onChange={(e) => updateContinuityWitness(idx, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CIN</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.cin}
                      onChange={(e) => updateContinuityWitness(idx, { cin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">السن</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.age ?? ''}
                      onChange={(e) => updateContinuityWitness(idx, { age: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">القرابة (اختياري)</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.relation || ''}
                      onChange={(e) => updateContinuityWitness(idx, { relation: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المهنة</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.occupation || ''}
                      onChange={(e) => updateContinuityWitness(idx, { occupation: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">العنوان</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                      value={w.address || ''}
                      onChange={(e) => updateContinuityWitness(idx, { address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Children (Birth Linker) */}
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-300 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">7. الأبناء (Birth Linker)</h3>
                 <select className="border rounded px-2" value={deed.hasChildren || ''} onChange={(e) => updateDeed('hasChildren', e.target.value as any)}>
                    <option value="">هل يوجد أبناء؟</option>
                    <option value="نعم">نعم</option>
                    <option value="لا">لا</option>
                 </select>
            </div>
            
            {deed.hasChildren === 'نعم' && (
                <div className="space-y-2">
                   {deed.children?.map((child, idx) => (
                       <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded shadow-sm">
                           <span className="font-bold text-gray-500">{idx + 1}</span>
                           <input type="text" placeholder="الاسم الكامل" className="border rounded p-1 flex-1"
                              value={child.name} onChange={(e) => updateChild(idx, 'name', e.target.value)} />
                           <input type="date" className="border rounded p-1"
                              value={child.birthDate} onChange={(e) => updateChild(idx, 'birthDate', e.target.value)} />
                           <select className="border rounded p-1"
                              value={child.sex} onChange={(e) => updateChild(idx, 'sex', e.target.value)}>
                              <option value="ذكر">ذكر</option>
                              <option value="أنثى">أنثى</option>
                           </select>
                           <input type="text" placeholder="CIN (للراشدين)" className="border rounded p-1 w-24"
                              value={child.cin || ''} onChange={(e) => updateChild(idx, 'cin', e.target.value)} />
                           <button onClick={() => removeChild(idx)} className="text-red-500 font-bold px-2">×</button>
                       </div>
                   ))}
                   <button onClick={addChild} className="text-sm text-blue-600 font-semibold">+ إضافة ابن</button>
                </div>
            )}
        </div>

        {/* 3. AI Workflow Checks */}
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>🤖 Workflow & AI Checks</span>
             </h3>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div className={`p-3 rounded border flex justify-between items-center ${deed.aiChecks?.marriageValidity ? 'bg-green-100' : 'bg-white'}`}>
                        <span>فحص صحة الزواج (Marriage Check)</span>
                        <button className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                           onClick={() => updateNested('aiChecks', 'marriageValidity', true)}>
                           {deed.aiChecks?.marriageValidity ? 'تم التحقق' : 'تحقق من الرسم'}
                        </button>
                    </div>
                     <div className={`p-3 rounded border flex justify-between items-center ${deed.aiChecks?.divorceCheck ? 'bg-green-100' : 'bg-white'}`}>
                        <span>فحص النزاعات (Conflict Detector)</span>
                        <button className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                           onClick={() => updateNested('aiChecks', 'divorceCheck', true)}>
                           {deed.aiChecks?.divorceCheck ? 'سليم (لا طلاق)' : 'بحث عن طلاق'}
                        </button>
                    </div>
                     <div className={`p-3 rounded border flex justify-between items-center ${deed.aiChecks?.foreignUseMode ? 'bg-blue-100' : 'bg-white'}`}>
                        <span>وضع الاستعمال الدولي (Foreign Use)</span>
                         <button className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                           onClick={() => updateNested('aiChecks', 'foreignUseMode', !deed.aiChecks?.foreignUseMode)}>
                           {deed.aiChecks?.foreignUseMode ? 'مفعل' : 'تفعيل'}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded border text-sm text-gray-600 space-y-2">
                    <h4 className="font-bold text-blue-800 border-b pb-2">نصائح وتنبيهات</h4>
                    <p>✔ المرجع: المادة 16 من مدونة الأسرة.</p>
                    <p>⚠ استمرار الزواج لا ينشئ زواجاً جديداً بل يثبت بقاءه.</p>
                    {deed.aiChecks?.foreignUseMode && (
                        <p className="text-blue-600 font-bold">📌 للاستعمال الدولي: تأكد من ملء البيانات اللاتينية للأطراف في الخطوة السابقة.</p>
                    )}
                    {deed.hasChildren === 'نعم' && (
                        <p>يساعد إدراج الأبناء في ملفات الإرث والهجرة.</p>
                    )}
                </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-4 pt-2">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">الغرض من الوثيقة</label>
                    <select className="w-full border rounded p-2"
                        value={deed.purpose || ''} onChange={(e) => updateDeed('purpose', e.target.value as any)}>
                        <option value="أخرى">غير محدد</option>
                        <option value="هجرة">هجرة / تجمّع عائلي</option>
                        <option value="إرث">ملف إرث</option>
                        <option value="عقار">تحفيظ عقاري</option>
                        <option value="ضمان_اجتماعي">ضمان اجتماعي (CNSS)</option>
                    </select>
                 </div>
                 {deed.aiChecks?.foreignUseMode && (
                     <div className="flex items-center gap-2 mt-6">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={deed.needsTranslation || false} onChange={(e) => updateDeed('needsTranslation', e.target.checked)} />
                            <span>طلب ترجمة فورية؟</span>
                        </label>
                        {deed.needsTranslation && (
                            <select className="border rounded p-1 text-sm" value={deed.translationLanguage || ''} onChange={(e) => updateDeed('translationLanguage', e.target.value)}>
                                <option value="fr">الفرنسية</option>
                                <option value="en">الإنجليزية</option>
                                <option value="es">الإسبانية</option>
                            </select>
                        )}
                     </div>
                 )}
             </div>
        </div>

        <details className="bg-white p-6 rounded-lg border border-gray-200">
          <summary className="cursor-pointer font-bold text-gray-800">
            معلومات مساعدة (اختياري): تنبيهات + نصوص قانونية + أسئلة ذكية + Workflow
          </summary>
          <div className="mt-4 space-y-6">
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">8. التحذيرات والتنبيهات القانونية</h3>
              <ul className="list-disc pr-6 text-sm text-gray-800 space-y-1">
                <li>استمرار الزواج لا ينشئ زواجًا جديدًا بل يثبت بقاءه.</li>
                <li>لا يُستغنى عنه أحيانًا عند التحفيظ والهبة والبيع بين الأزواج.</li>
                <li>قد تطلب الإدارات الأجنبية وثيقة حديثة لإثبات الزواج.</li>
                <li>لا يغني عن إشهاد الطلاق إن كان قد وقع طلاق.</li>
                <li>لا يستعمل لملفات التعدد دون إذن قضائي.</li>
                <li>قد يطلب لإثبات عدم الانفصال في ملفات الهجرة.</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-300 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">9. النصوص القانونية ذات الصلة</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-semibold">مدونة الأسرة المغربية:</span> الزواج من المادة 4 إلى 24، وإثبات الزواج المادة 16.
                </p>
                <p>
                  رابط رسمي:{' '}
                  <a className="text-blue-700 underline" href="https://adala.justice.gov.ma" target="_blank" rel="noreferrer">
                    https://adala.justice.gov.ma
                  </a>
                </p>
                <p>
                  <span className="font-semibold">مدونة الحقوق العينية:</span> في ما يخص المعاملات والسكنى بين الزوجين.
                </p>
                <p>
                  <span className="font-semibold">القانون الدولي الخاص:</span> عند الزواج بالخارج (قد تطلب بعض الدول “Proof of Marital Continuity”).
                </p>
                <p>
                  <span className="font-semibold">قانون الحالة المدنية:</span> لتسجيل الزواج والأولاد.
                </p>
              </div>
            </div>

            <div className="bg-teal-50 p-6 rounded-lg border-l-4 border-teal-300 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">10. الأسئلة الذكية (AI) لتوليد الرسم</h3>
              <ul className="list-disc pr-6 text-sm text-gray-800 space-y-1">
                <li>منذ متى الزواج؟</li>
                <li>هل الزواج مسجل؟ وأين؟</li>
                <li>هل الزواج لا يزال قائمًا؟</li>
                <li>هل وقع طلاق أو خلل/نزاع؟</li>
                <li>هل للزوجين أولاد؟</li>
                <li>هل الزواج عدلي أم مدني أم قنصلي؟</li>
                <li>هل يُراد استعمال الوثيقة خارج المغرب؟</li>
                <li>هل تحتاج للترجمة؟ وبأي لغة؟</li>
                <li>سبب الطلب؟ (مواريث، عقار، هجرة، CNSS…)</li>
              </ul>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">11. Workflow لتطبيق العدول</h3>
              <ol className="list-decimal pr-6 text-sm text-gray-800 space-y-1">
                <li>تعريف الزوج</li>
                <li>تعريف الزوجة</li>
                <li>فحص صحة الزواج عبر مرجع الرسم</li>
                <li>استعلام (اختياري) عن الطلاق/الرجعة عبر وزارة العدل</li>
                <li>إدراج الشهود</li>
                <li>توليد الصيغة</li>
                <li>التنبيهات القانونية</li>
                <li>اختيار استعمال الوثيقة (محلي/دولي)</li>
                <li>إمكانية الترجمة</li>
                <li>ختم + توقيع + تسجيل</li>
              </ol>
            </div>

            <div className="bg-violet-50 p-6 rounded-lg border-l-4 border-violet-300 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">12. ميزات أقترح تضمينها في تطبيقك</h3>
              <ul className="list-disc pr-6 text-sm text-gray-800 space-y-1">
                <li>وحدة Marriage Check للتحقق من صحة الزواج عبر الرسم الأصلي.</li>
                <li>وحدة Foreign Use Mode لإعداد الصيغة المطلوبة للهجرة.</li>
                <li>Birth Linker لربط الأولاد بالرسم تلقائيًا.</li>
                <li>Indexing لربط استمرار الزواج مع ملف الأسرة.</li>
                <li>Conflict Detector ينبه إذا ظهر طلاق أو نزاع قضائي.</li>
              </ul>
            </div>
          </div>
        </details>

        {/* Navigation */}
        <div className="flex gap-4 justify-between mt-4">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };


export const MarriageContinuityWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 3 && <Step3_MarriageContinuityDeed state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
