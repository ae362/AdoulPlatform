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
  MapPin, XCircle, Printer, Upload, Calendar
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

        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 space-y-6">
          <h3 className="text-xl font-bold text-gray-800 border-b pb-2">بيانات الصداق</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-2">هل تم قبض الصداق؟</label>
               <div className="flex gap-4">
                 {['كاملا', 'جزئي', 'غير مقبوض'].map(opt => (
                   <label key={opt} className="flex items-center gap-2 cursor-pointer">
                     <input 
                       type="radio" 
                       name="isDowryReceived"
                       value={opt}
                       checked={details.isDowryReceived === opt}
                       onChange={(e) => handleChange('isDowryReceived', e.target.value)}
                     />
                     <span className="font-semibold">{opt}</span>
                   </label>
                 ))}
               </div>
            </div>

            {details.isDowryReceived === 'غير مقبوض' && (
              <div className="col-span-1 md:col-span-2 mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-yellow-800 font-semibold">
                    تنبيه: ان مبلغ الصداق يبقى في ذمة الزوج لا يبرئه إلا الأداء متى طالبته الزوجة بذلك
                  </p>
                </div>
              </div>
            )}

            {(details.isDowryReceived === 'كاملا' || details.isDowryReceived === 'جزئي' || details.isDowryReceived === 'غير مقبوض') && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مبلغ الصداق *</label>
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
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مبلغ الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryAmountInWords}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </>
            )}

            {details.isDowryReceived === 'كاملا' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">طريقة القبض</label>
                  <div className="flex gap-4">
                    {['عيانا', 'اعترافا'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="dowryPaymentMethod"
                          value={opt}
                          checked={details.dowryPaymentMethod === opt}
                          onChange={(e) => handleChange('dowryPaymentMethod', e.target.value)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 mt-4 border-t pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مشتملات اخرى للصداق ان وجدت</label>
                  <div className="flex gap-4 mb-2">
                    {['نعم', 'لا'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="hasOtherDowryItems"
                          value={opt}
                          checked={details.hasOtherDowryItems === opt}
                          onChange={(e) => handleChange('hasOtherDowryItems', e.target.value)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  {details.hasOtherDowryItems === 'نعم' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل المشتملات</label>
                      
                      {details.otherDowryItems && details.otherDowryItems.length > 0 && (
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          {details.otherDowryItems.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border">
                              <span>{item}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newItems = [...(details.otherDowryItems || [])];
                                  newItems.splice(idx, 1);
                                  handleChange('otherDowryItems', newItems);
                                }}
                                className="text-red-500 hover:text-red-700 text-sm px-2"
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
                          className="flex-1 p-2 border border-gray-300 rounded-lg"
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
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
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
                <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                  <h5 className="font-semibold text-gray-800 mb-3">تفاصيل الأداء</h5>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <p className="text-yellow-800 font-semibold">
                        تنبيه: ان كالئ الصداق يبقى في ذمة الزوج لا يبرئه إلا الأداء متى طالبته الزوجة بذلك
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مقدم الصداق</label>
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
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مقدم الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryAdvanceInWords || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مؤخر الصداق (كالئ)</label>
                  <input
                    type="number"
                    value={details.dowryDeferred || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مؤخر الصداق بالحروف</label>
                  <input
                    type="text"
                    value={details.dowryDeferredInWords || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </>
            )}

            <div className="col-span-1 md:col-span-2 border-t pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">تدبير الأموال المكتسبة</h3>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 leading-relaxed">
                  هل يرغب الطرفان في ابرام اتفاق مستقل لتنظيم و تدبير و استثمار الاموال التي سيتم اكتسابها اثناء قيام العلاقة الزوجية و ذلك طبقا لمقتضيات المادة 49 من مدونة الاسرة؟
                </label>
                <div className="flex gap-4">
                  {['نعم', 'لا'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="hasAssetManagementAgreement"
                        value={opt}
                        checked={details.hasAssetManagementAgreement === opt}
                        onChange={(e) => handleChange('hasAssetManagementAgreement', e.target.value)}
                      />
                      <span className="font-semibold">{opt}</span>
                    </label>
                  ))}
                </div>

                {details.hasAssetManagementAgreement === 'نعم' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">ℹ️</span>
                      <p className="text-blue-800 font-semibold">
                        تنبيه: طبقا للمادة 49 من مدونة الاسرة يجب تحرير اتفاق مكتوب مستقل عن عقد الزواج لتنظيم تدبير الاموال المكتسبة اثناء للزوجية
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 border-t pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">الشروط الخاصة</h3>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">هل توجد اشتراطات خاصة ضمن عقد الزواج ؟</label>
                <div className="flex gap-4">
                  {['نعم', 'لا'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="hasSpecialConditions"
                        value={opt}
                        checked={details.hasSpecialConditions === opt}
                        onChange={(e) => handleChange('hasSpecialConditions', e.target.value)}
                      />
                      <span className="font-semibold">{opt}</span>
                    </label>
                  ))}
                </div>

                {details.hasSpecialConditions === 'نعم' && (
                  <div className="space-y-4 mt-4 border-t pt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">صاحب الاشتراط</label>
                      <div className="flex gap-4">
                        {['الزوج', 'الزوجة', 'كلاهما معا'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="specialConditionsOwner"
                              value={opt}
                              checked={details.specialConditionsOwner === opt}
                              onChange={(e) => handleChange('specialConditionsOwner', e.target.value)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تحدد الاشتراطات المتفق عليها كما يلي</label>
                      <textarea
                        value={details.specialConditionsText || ''}
                        onChange={(e) => handleChange('specialConditionsText', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg h-32"
                        placeholder="أدخل نص الشروط..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-2">
            <h3 className="text-xl font-bold text-gray-800">بيانات الإذن بالزواج والمحكمة</h3>
            {(notaryAppellateCourt || notaryPrimaryCourt) && (
              <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-medium shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>تم استرجاع المحكمة تلقائياً من بيانات حساب العدل</span>
              </div>
            )}
          </div>

          {(notaryAppellateCourt || notaryPrimaryCourt) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notaryAppellateCourt && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">دائرة محكمة الاستئناف (الجهة القضائية):</span>
                  <span className="font-bold text-slate-800">{notaryAppellateCourt}</span>
                </div>
              )}
              {notaryPrimaryCourt && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">المحكمة الابتدائية المسجل بها:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{notaryPrimaryCourt}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">المحكمة الابتدائية</label>
              <input
                type="text"
                value={details.courtName || ''}
                onChange={(e) => handleChange('courtName', e.target.value)}
                placeholder={notaryPrimaryCourt || "مثال: تطوان"}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">القسم القضائي</label>
              <input
                type="text"
                value={details.courtSection || ''}
                onChange={(e) => handleChange('courtSection', e.target.value)}
                placeholder="مثال: قسم التوثيق وقضاء الأسرة"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم ملف إذن قاضي الأسرة المكلف بالزواج</label>
              <input
                type="text"
                value={details.authorizationNumber || ''}
                onChange={(e) => handleChange('authorizationNumber', e.target.value)}
                placeholder="مثال: 1308 /10"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الإذن بالزواج</label>
              <input
                type="date"
                value={details.authorizationDate || ''}
                onChange={(e) => handleChange('authorizationDate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h3 className="text-xl font-bold text-gray-800 border-b pb-2">بيانات التضمين بكناش الأنكحة ومذكرة الحفظ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم كناش الأنكحة</label>
              <input
                type="text"
                value={details.registryNumber || ''}
                onChange={(e) => handleChange('registryNumber', e.target.value)}
                placeholder="مثال: 15"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">صحيفة الكناش</label>
              <input
                type="text"
                value={details.registryPage || ''}
                onChange={(e) => handleChange('registryPage', e.target.value)}
                placeholder="مثال: 45"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الكناش</label>
              <input
                type="text"
                value={details.registryCount || ''}
                onChange={(e) => handleChange('registryCount', e.target.value)}
                placeholder="مثال: 120"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التسجيل بالكناش</label>
              <input
                type="date"
                value={details.registryDate || ''}
                onChange={(e) => handleChange('registryDate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم مذكرة الحفظ للعدل الأول</label>
              <input
                type="text"
                value={details.memorandumNumber || ''}
                onChange={(e) => handleChange('memorandumNumber', e.target.value)}
                placeholder="مثال: 07"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">عدد مذكرة الحفظ</label>
              <input
                type="text"
                value={details.memorandumRecordNumber || ''}
                onChange={(e) => handleChange('memorandumRecordNumber', e.target.value)}
                placeholder="مثال: 13"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">صفحة مذكرة الحفظ</label>
              <input
                type="text"
                value={details.memorandumPage || ''}
                onChange={(e) => handleChange('memorandumPage', e.target.value)}
                placeholder="مثال: 10"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">وقت الإشهاد بالحروف</label>
              <input
                type="text"
                value={details.sessionTimeWords || ''}
                onChange={(e) => handleChange('sessionTimeWords', e.target.value)}
                placeholder="مثال: على الساعة الحادية عشرة صباحا"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الإشهاد بالحروف</label>
              <input
                type="text"
                value={details.sessionDateWords || ''}
                onChange={(e) => handleChange('sessionDateWords', e.target.value)}
                placeholder="مثال: يوم فاتح ربيع الأول 1448 هـ"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
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
