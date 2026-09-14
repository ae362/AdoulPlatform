import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { SmartMarriageClassificationGate } from './SmartMarriageClassificationGate';
import { NationalMarriageStatsModal } from './NationalMarriageStatsModal';
import { useAuth } from '../../../../contexts/AuthContext';
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
  MapPin, XCircle, Printer, Upload, Calendar,
  Coins, Scale, Heart, Sparkles, Building2
} from 'lucide-react';



export const Step2_MarriageDetails: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const { user, notaryProfile } = useAuth();
  const notaryPrimaryCourt = formatCourtName(
    notaryProfile?.primary_court ||
    (notaryProfile?.court_type === 'first_instance' ? notaryProfile?.court_name : null) ||
    notaryProfile?.court_name ||
    notaryProfile?.appellate_court ||
    user?.court_name
  );
  const notaryAppellateCourt = formatCourtName(notaryProfile?.appellate_court);
  
    const defaultCourt = state.marriageDetails?.courtName || state.meta?.court || notaryPrimaryCourt || '';
    const [details, setDetails] = useState<MarriageDetails>(() => ({
      dowryAmount: 0,
      dowryAmountInWords: '',
      isDowryReceived: 'كاملا',
      dowryPaymentMethod: 'اعترافا',
      hasOtherDowryItems: 'لا',
      otherDowryItems: [],
      dowryAdvance: 0,
      dowryAdvanceInWords: '',
      dowryDeferred: 0,
      dowryDeferredInWords: '',
      hasAssetManagementAgreement: 'لا',
      hasSpecialConditions: 'لا',
      specialConditionsOwner: '',
      specialConditionsText: '',
      courtSection: 'قسم التوثيق وقضاء الأسرة',
      authorizationNumber: '',
      authorizationDate: state.meta?.dateGregorian || '',
      hijriDate: state.meta?.dateHijri || '',
      registryBookType: 'كناش الأنكحة',
      registryNumber: '',
      registryPage: '',
      registryCount: '',
      registryDate: state.meta?.dateGregorian || '',
      memorandumNumber: '',
      memorandumRecordNumber: '',
      memorandumPage: '',
      sessionTimeWords: state.meta?.hourInWords || '',
      sessionDateWords: state.meta?.dateGregorianInWords ? `يوم ${state.meta.dateGregorianInWords}` : '',
      mixedMarriageForeignParty: '',
      husbandConvertedToIslam: '',
      conversionCertificate: {
        book: '',
        number: '',
        page: '',
        count: '',
        date: '',
        notary: ''
      },
      ...(state.marriageDetails || {}),
      courtName: state.marriageDetails?.courtName || defaultCourt,
    }));

    useEffect(() => {
      if (!details.courtName && (notaryPrimaryCourt || state.meta?.court)) {
        setDetails(prev => ({
          ...prev,
          courtName: notaryPrimaryCourt || state.meta?.court || '',
        }));
      }
    }, [notaryPrimaryCourt, state.meta?.court]);

    const handleChange = (field: keyof typeof details, value: any) => {
      setDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleConversionCertChange = (field: string, value: string) => {
      setDetails(prev => ({
        ...prev,
        conversionCertificate: {
          ...prev.conversionCertificate!,
          [field]: value
        }
      }));
    };

    const handleNext = () => {
      // Basic validation
      if (!details.dowryAmount) {
        alert('المرجو إدخال مبلغ الصداق');
        return;
      }
      
      setState(prev => {
        const nextState: FeesAgentState = {
          ...prev,
          marriageDetails: details,
          meta: {
            ...(prev.meta || {}),
            court: details.courtName || prev.meta?.court || notaryPrimaryCourt || '',
          } as any,
          step: 6,
        };
        return {
          ...nextState,
          rasmHtml: generateRasmHtml(nextState)
        };
      });
    };

    return (
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50/90 via-amber-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 border border-rose-200">
              <span>💍</span>
              <span>المرحلة 3: تفاصيل وشروط النكاح</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              توثيق الصداق والشروط الاتفاقية
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>📜</span>
            <span>الخطوة الثانية: تفاصيل الزواج والصداق والشروط</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            توثيق مقدار الصداق وحال قبضه أو تأجيله، وتضمين الشروط الاتفاقية ومراجع الإذن القضائي بالزواج.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-sm">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">بيانات الصداق</h3>
              <p className="text-white/80 text-xs font-medium">توثيق مقدار الصداق وطريقة أدائه</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
               <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3"><Coins className="w-3.5 h-3.5 text-amber-500" />هل تم قبض الصداق؟</label>
               <div className="flex gap-2 flex-wrap">
                 {['كاملا', 'جزئي', 'غير مقبوض'].map(opt => (
                   <button
                     key={opt}
                     type="button"
                     onClick={() => handleChange('isDowryReceived', opt)}
                     className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                       details.isDowryReceived === opt
                         ? 'bg-amber-500 text-white shadow-sm'
                         : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                     }`}
                   >
                     {details.isDowryReceived === opt && <CheckCircle className="w-3.5 h-3.5" />}
                     {opt}
                   </button>
                 ))}
               </div>
            </div>

            {details.isDowryReceived === 'غير مقبوض' && (
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 font-semibold text-sm">
                    تنبيه: ان مبلغ الصداق يبقى في ذمة الزوج لا يبرئه إلا الأداء متى طالبته الزوجة بذلك
                  </p>
                </div>
              </div>
            )}

            {(details.isDowryReceived === 'كاملا' || details.isDowryReceived === 'جزئي' || details.isDowryReceived === 'غير مقبوض') && (
              <>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Coins className="w-3.5 h-3.5 text-amber-500" />مبلغ الصداق *</label>
                  <input
                    type="number"
                    value={details.dowryAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleChange('dowryAmount', val);
                      handleChange('dowryAmountInWords', convertNumberToArabicWords(val));
                      if (details.isDowryReceived === 'جزئي' && details.dowryAdvance !== undefined) {
                         const deferred = val - details.dowryAdvance;
                         handleChange('dowryDeferred', deferred);
                         handleChange('dowryDeferredInWords', convertNumberToArabicWords(deferred));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />مبلغ الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryAmountInWords}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                  />
                </div>
              </>
            )}

            {details.isDowryReceived === 'كاملا' && (
              <>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3"><Shield className="w-3.5 h-3.5 text-amber-500" />طريقة القبض</label>
                  <div className="flex gap-2 flex-wrap">
                    {['عيانا', 'اعترافا'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleChange('dowryPaymentMethod', opt)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          details.dowryPaymentMethod === opt
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        {details.dowryPaymentMethod === opt && <CheckCircle className="w-3.5 h-3.5" />}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3"><Sparkles className="w-3.5 h-3.5 text-amber-500" />مشتملات اخرى للصداق ان وجدت</label>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {['نعم', 'لا'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleChange('hasOtherDowryItems', opt)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          details.hasOtherDowryItems === opt
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        {details.hasOtherDowryItems === opt && <CheckCircle className="w-3.5 h-3.5" />}
                        {opt}
                      </button>
                    ))}
                  </div>

                  {details.hasOtherDowryItems === 'نعم' && (
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 mt-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3"><Clipboard className="w-3.5 h-3.5 text-amber-500" />تفاصيل المشتملات</label>
                      
                      {details.otherDowryItems && details.otherDowryItems.length > 0 && (
                        <ul className="mb-3 space-y-1.5">
                          {details.otherDowryItems.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center bg-white px-3.5 py-2 rounded-xl border border-amber-200 text-sm">
                              <span className="font-medium text-slate-700">{item}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newItems = [...(details.otherDowryItems || [])];
                                  newItems.splice(idx, 1);
                                  handleChange('otherDowryItems', newItems);
                                }}
                                className="text-rose-500 hover:text-rose-700 font-black text-xs px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                              >
                                حذف
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="newItemInput"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="أدخل وصف الشيء..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                handleChange('otherDowryItems', [...(details.otherDowryItems || []), val]);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('newItemInput') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              handleChange('otherDowryItems', [...(details.otherDowryItems || []), input.value.trim()]);
                              input.value = '';
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          إضافة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {details.isDowryReceived === 'جزئي' && (
              <>
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-800 font-semibold text-sm">
                      تنبيه: ان كالئ الصداق يبقى في ذمة الزوج لا يبرئه إلا الأداء متى طالبته الزوجة بذلك
                    </p>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Coins className="w-3.5 h-3.5 text-amber-500" />مقدم الصداق</label>
                  <input
                    type="number"
                    value={details.dowryAdvance || ''}
                    onChange={(e) => {
                      const advance = parseFloat(e.target.value);
                      if (advance < 0) return;
                      if (details.dowryAmount && advance > details.dowryAmount) return;
                      
                      handleChange('dowryAdvance', advance);
                      handleChange('dowryAdvanceInWords', convertNumberToArabicWords(advance));
                      
                      if (details.dowryAmount) {
                        const deferred = details.dowryAmount - advance;
                        handleChange('dowryDeferred', deferred);
                        handleChange('dowryDeferredInWords', convertNumberToArabicWords(deferred));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />مقدم الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryAdvanceInWords || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Clock className="w-3.5 h-3.5 text-slate-400" />مؤخر الصداق (كالئ)</label>
                  <input
                    type="number"
                    value={details.dowryDeferred || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />مؤخر الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryDeferredInWords || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                  />
                </div>
              </>
            )}

            <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-black text-slate-900">تدبير الأموال المكتسبة</h3>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 leading-relaxed">
                  هل يرغب الطرفان في ابرام اتفاق مستقل لتنظيم و تدبير و استثمار الاموال التي سيتم اكتسابها اثناء قيام العلاقة الزوجية و ذلك طبقا لمقتضيات المادة 49 من مدونة الاسرة؟
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['نعم', 'لا'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChange('hasAssetManagementAgreement', opt)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        details.hasAssetManagementAgreement === opt
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {details.hasAssetManagementAgreement === opt && <CheckCircle className="w-3.5 h-3.5" />}
                      {opt}
                    </button>
                  ))}
                </div>

                {details.hasAssetManagementAgreement === 'نعم' && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-800 font-semibold text-sm">
                      تنبيه: طبقا للمادة 49 من مدونة الاسرة يجب تحرير اتفاق مكتوب مستقل عن عقد الزواج لتنظيم تدبير الاموال المكتسبة اثناء للزوجية
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-black text-slate-900">الشروط الخاصة</h3>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700">هل توجد اشتراطات خاصة ضمن عقد الزواج ؟</label>
                <div className="flex gap-2 flex-wrap">
                  {['نعم', 'لا'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChange('hasSpecialConditions', opt)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        details.hasSpecialConditions === opt
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-700'
                      }`}
                    >
                      {details.hasSpecialConditions === opt && <CheckCircle className="w-3.5 h-3.5" />}
                      {opt}
                    </button>
                  ))}
                </div>

                {details.hasSpecialConditions === 'نعم' && (
                  <div className="space-y-4 mt-2 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3"><Shield className="w-3.5 h-3.5 text-rose-500" />صاحب الاشتراط</label>
                      <div className="flex gap-2 flex-wrap">
                        {['الزوج', 'الزوجة', 'كلاهما معا'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleChange('specialConditionsOwner', opt)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              details.specialConditionsOwner === opt
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-700'
                            }`}
                          >
                            {details.specialConditionsOwner === opt && <CheckCircle className="w-3.5 h-3.5" />}
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />تحدد الاشتراطات المتفق عليها كما يلي</label>
                      <textarea
                        value={details.specialConditionsText || ''}
                        onChange={(e) => handleChange('specialConditionsText', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium h-32 resize-none"
                        placeholder="أدخل نص الشروط..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-sm">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-black text-base">بيانات الإذن بالزواج والمحكمة</h3>
                <p className="text-white/80 text-xs font-medium">مراجع قضاء الأسرة والإذن بالزواج</p>
              </div>
            </div>
            {(notaryAppellateCourt || notaryPrimaryCourt) && (
              <div className="flex items-center gap-1.5 text-xs bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block animate-pulse"></span>
                <span>تم استرجاع المحكمة تلقائياً من بيانات حساب العدل</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
          {(notaryAppellateCourt || notaryPrimaryCourt) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notaryAppellateCourt && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">دائرة محكمة الاستئناف:</span>
                  <span className="font-black text-slate-800">{notaryAppellateCourt}</span>
                </div>
              )}
              {notaryPrimaryCourt && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">المحكمة الابتدائية:</span>
                  <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">{notaryPrimaryCourt}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Scale className="w-3.5 h-3.5 text-indigo-500" />المحكمة الابتدائية</label>
              <input
                type="text"
                value={details.courtName || ''}
                onChange={(e) => handleChange('courtName', e.target.value)}
                placeholder={notaryPrimaryCourt || "مثال: تطوان"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-indigo-500" />القسم القضائي</label>
              <input
                type="text"
                value={details.courtSection || ''}
                onChange={(e) => handleChange('courtSection', e.target.value)}
                placeholder="مثال: قسم التوثيق وقضاء الأسرة"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-indigo-500" />رقم ملف إذن قاضي الأسرة المكلف بالزواج</label>
              <input
                type="text"
                value={details.authorizationNumber || ''}
                onChange={(e) => handleChange('authorizationNumber', e.target.value)}
                placeholder="مثال: 1308 /10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-indigo-500" />تاريخ الإذن بالزواج</label>
              <input
                type="date"
                value={details.authorizationDate || ''}
                onChange={(e) => handleChange('authorizationDate', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-sm">
              <Book className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">بيانات التضمين بكناش الأنكحة وسجل البيانات</h3>
              <p className="text-white/80 text-xs font-medium">مراجع التسجيل الرسمية ومحضر الإشهاد</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-emerald-500" />رقم كناش الأنكحة</label>
              <input
                type="text"
                value={details.registryNumber || ''}
                onChange={(e) => handleChange('registryNumber', e.target.value)}
                placeholder="مثال: 15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة الكناش</label>
              <input
                type="text"
                value={details.registryPage || ''}
                onChange={(e) => handleChange('registryPage', e.target.value)}
                placeholder="مثال: 45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد الكناش</label>
              <input
                type="text"
                value={details.registryCount || ''}
                onChange={(e) => handleChange('registryCount', e.target.value)}
                placeholder="مثال: 120"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-emerald-500" />تاريخ التسجيل بالكناش</label>
              <input
                type="date"
                value={details.registryDate || ''}
                onChange={(e) => handleChange('registryDate', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Clipboard className="w-3.5 h-3.5 text-emerald-500" />رقم سجل البيانات للعدل الأول</label>
              <input
                type="text"
                value={details.memorandumNumber || ''}
                onChange={(e) => handleChange('memorandumNumber', e.target.value)}
                placeholder="مثال: 07"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد سجل البيانات للعدل الأول</label>
              <input
                type="text"
                value={details.memorandumRecordNumber || ''}
                onChange={(e) => handleChange('memorandumRecordNumber', e.target.value)}
                placeholder="مثال: 13"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صفحة سجل البيانات للعدل الأول</label>
              <input
                type="text"
                value={details.memorandumPage || ''}
                onChange={(e) => handleChange('memorandumPage', e.target.value)}
                placeholder="مثال: 10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Clock className="w-3.5 h-3.5 text-emerald-500" />وقت الإشهاد بالحروف</label>
              <input
                type="text"
                value={details.sessionTimeWords || ''}
                onChange={(e) => handleChange('sessionTimeWords', e.target.value)}
                placeholder="مثال: على الساعة الحادية عشرة صباحا"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-emerald-500" />تاريخ الإشهاد بالحروف</label>
              <input
                type="text"
                value={details.sessionDateWords || ''}
                onChange={(e) => handleChange('sessionDateWords', e.target.value)}
                placeholder="مثال: يوم فاتح ربيع الأول 1448 هـ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
              />
            </div>
          </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق (بيانات الزوجين)</span>
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>التالي: التواريخ ومجلس الإشهاد</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };


  // ============================================================================
  // خطوة 2: تفاصيل الملكية
  // ============================================================================



export const MarriageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const [showGateOverride, setShowGateOverride] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  const isGateOpen = showGateOverride || !state.marriageClassification?.confirmedAt;

  if (isGateOpen) {
    return (
      <div className="w-full">
        <SmartMarriageClassificationGate
          state={state}
          setState={setState}
          onConfirm={() => setShowGateOverride(false)}
          onCancel={state.marriageClassification?.confirmedAt ? () => setShowGateOverride(false) : onBack}
        />
      </div>
    );
  }

  // Active classification summary for persistent header
  const classification = state.marriageClassification;
  const classificationLabels: Record<string, { title: string; badge: string; color: string }> = {
    adult_marriage: {
      title: 'زواج الراشد',
      badge: 'مسار عادي',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    minor_marriage: {
      title: 'زواج القاصر',
      badge:
        classification?.minorParty === 'husband'
          ? 'الزوج قاصر'
          : classification?.minorParty === 'wife'
          ? 'الزوجة قاصرة'
          : 'كلاهما قاصران',
      color: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    self_contracting_female: {
      title: 'زواج الراشدة التي زوجت نفسها',
      badge: 'المادة 25',
      color: 'bg-purple-100 text-purple-800 border-purple-300'
    },
    mental_disability: {
      title: 'زواج ذي إعاقة ذهنية',
      badge: 'المادة 23 - إذن قاضي',
      color: 'bg-rose-100 text-rose-800 border-rose-300'
    },
    revocable_reconciliation: {
      title: 'الزواج الرجعي',
      badge: 'إرجاع مطلقة',
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    stipulated_conditions: {
      title: 'زواج بشروط اتفاقية',
      badge: `${classification?.stipulatedConditions?.length || 0} شروط`,
      color: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    contract_renewal: {
      title: 'تجديد أو تصحيح عقد زواج',
      badge: 'مسار الإلحاق',
      color: 'bg-slate-100 text-slate-800 border-slate-300'
    }
  };

  const currentInfo = classification?.primaryType
    ? classificationLabels[classification.primaryType]
    : classificationLabels.adult_marriage;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Persistent Classification & Pathway Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">المسار المعتمد للرسم:</span>
              <span className="text-sm font-bold text-gray-900">{currentInfo?.title}</span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${currentInfo?.color}`}>
                {currentInfo?.badge}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {classification?.judgePermission?.permissionNumber && (
                <span>إذن قاضي التوثيق رقم: {classification.judgePermission.permissionNumber} • </span>
              )}
              <span>تم اعتماد هذا التصنيف رسمياً في الإحصائيات الوطنية للزواج</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>📊 الإحصائيات الوطنية للزواج</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGateOverride(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>⚙️ تعديل مسار الزواج</span>
          </button>
        </div>
      </div>

      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_MarriageDetails state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}

      <NationalMarriageStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};
