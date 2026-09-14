import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step6_Dates } from '../../steps/Step6_Dates';
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


  export const Step1_MixedMarriageSpecifics: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const handleNext = () => {
      setState(prev => ({ ...prev, step: 1 }));
    };

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الأولى: اجراءات الترخيص القضائي للزواج المختلط</h2>
          <p className="text-gray-700">أدخل تفاصيل الطرف الأجنبي والإذن القضائي.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6 border-l-4 border-purple-500">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">بيانات الزواج المختلط</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">يرجى تحديد الطرف الاجنبي الجنسية في العلاقة الزوجية؟</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="mixedMarriageForeignParty"
                    value="husband"
                    checked={state.marriageDetails?.mixedMarriageForeignParty === 'husband'}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      marriageDetails: {
                        ...prev.marriageDetails!,
                        mixedMarriageForeignParty: e.target.value as 'husband' | 'wife'
                      }
                    }))}
                  />
                  <span className="font-semibold">الزوج (Husband)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="mixedMarriageForeignParty"
                    value="wife"
                    checked={state.marriageDetails?.mixedMarriageForeignParty === 'wife'}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      marriageDetails: {
                        ...prev.marriageDetails!,
                        mixedMarriageForeignParty: e.target.value as 'husband' | 'wife'
                      }
                    }))}
                  />
                  <span className="font-semibold">الزوجة (Wife)</span>
                </label>
              </div>
            </div>

            {state.marriageDetails?.mixedMarriageForeignParty === 'husband' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">هل ادلى الزوج الاجنبي الغير المسلم بشهادة اعتناق الاسلام؟</label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="husbandConvertedToIslam"
                      value="yes"
                      checked={state.marriageDetails?.husbandConvertedToIslam === 'yes'}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        marriageDetails: {
                          ...prev.marriageDetails!,
                          husbandConvertedToIslam: e.target.value as 'yes' | 'no'
                        }
                      }))}
                    />
                    <span className="font-semibold">نعم (Yes)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="husbandConvertedToIslam"
                      value="no"
                      checked={state.marriageDetails?.husbandConvertedToIslam === 'no'}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        marriageDetails: {
                          ...prev.marriageDetails!,
                          husbandConvertedToIslam: e.target.value as 'yes' | 'no'
                        }
                      }))}
                    />
                    <span className="font-semibold">لا (No)</span>
                  </label>
                </div>

                {state.marriageDetails?.husbandConvertedToIslam === 'yes' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">مضمنة بدفتر</label>
                      <input
                        type="text"
                        value={state.marriageDetails?.conversionCertificate?.book || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              book: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                      <input
                        type="text"
                        value={state.marriageDetails?.conversionCertificate?.number || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              number: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                      <input
                        type="text"
                        value={state.marriageDetails?.conversionCertificate?.page || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              page: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                      <input
                        type="text"
                        value={state.marriageDetails?.conversionCertificate?.count || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              count: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                      <input
                        type="date"
                        value={state.marriageDetails?.conversionCertificate?.date || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              date: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                      <input
                        type="text"
                        value={state.marriageDetails?.conversionCertificate?.notary || ''}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          marriageDetails: {
                            ...prev.marriageDetails!,
                            conversionCertificate: {
                              ...prev.marriageDetails?.conversionCertificate!,
                              notary: e.target.value
                            }
                          }
                        }))}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="w-full p-2 border rounded"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const b64 = String(reader.result || '').split(',').pop() || '';
                              const fileObj = {
                                name: file.name,
                                size: file.size,
                                type: file.type || 'application/octet-stream',
                                base64: b64,
                                file,
                              };
                              setState(prev => ({
                                ...prev,
                                marriageDetails: {
                                  ...prev.marriageDetails!,
                                  conversionCertificate: {
                                    ...prev.marriageDetails?.conversionCertificate!,
                                    image: fileObj as any
                                  }
                                }
                              }));
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setState(prev => ({
                              ...prev,
                              marriageDetails: {
                                ...prev.marriageDetails!,
                                conversionCertificate: {
                                  ...prev.marriageDetails?.conversionCertificate!,
                                  image: null
                                }
                              }
                            }));
                          }
                        }}
                      />
                      {(state.marriageDetails?.conversionCertificate as any)?.image && (
                        <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                          <span className="truncate font-medium">📎 تم إرفاق: {((state.marriageDetails?.conversionCertificate as any)?.image as any)?.name || 'شهادة اعتناق الإسلام'}</span>
                          <button
                            type="button"
                            onClick={() => setState(prev => ({
                              ...prev,
                              marriageDetails: {
                                ...prev.marriageDetails!,
                                conversionCertificate: {
                                  ...prev.marriageDetails?.conversionCertificate!,
                                  image: null
                                }
                              }
                            }))}
                            className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                            title="حذف المرفق"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {state.marriageDetails?.husbandConvertedToIslam === 'no' && (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-lg mb-1">تنبيه قانوني</h4>
                      <p>اذا كان الزوج غير مغربي و غير مسلم فإن إبرام عقد الزواج يخضع للإدلاء بشهادة رسمية تثبت اعتناقه الإسلام.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">الإذن القضائي للزواج المختلط</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الإذن</label>
                  <input
                    type="text"
                    value={state.marriageDetails?.authorizationNumber || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      marriageDetails: {
                        ...prev.marriageDetails!,
                        authorizationNumber: e.target.value
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الإذن</label>
                  <input
                    type="date"
                    value={state.marriageDetails?.authorizationDate || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      marriageDetails: {
                        ...prev.marriageDetails!,
                        authorizationDate: e.target.value
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المسلم من المحكمة الابتدائية ب</label>
                  <input
                    type="text"
                    value={state.marriageDetails?.authorizationCourt || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      marriageDetails: {
                        ...prev.marriageDetails!,
                        authorizationCourt: e.target.value
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="مثال: الرباط"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={state.marriageDetails?.isMinorParty || false}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    marriageDetails: {
                      ...prev.marriageDetails!,
                      isMinorParty: e.target.checked
                    }
                  }))}
                />
                <span className="font-bold text-gray-800">هل أحد الأطراف قاصر؟</span>
              </label>

              {state.marriageDetails?.isMinorParty && (
                <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-300 flex items-start gap-3 animate-fadeIn">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-bold text-lg mb-1">تنبيه هام</h4>
                    <p>في حالة وجود طرف قاصر، يجب التأكد من الحصول على إذن زواج القاصر بالإضافة إلى إذن الزواج المختلط.</p>
                  </div>
                </div>
              )}
            </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 0 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            السابق
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-lg"
          >
            التالي
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 1 (ملكية): تحديد هوية طالب الشهادة
  // ============================================================================

  // ============================================================================
  // خطوة 1 (ملكية): تحديد هوية طالب الشهادة
  // ============================================================================



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
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثانية: تفاصيل الزواج</h2>
          <p className="text-gray-700">أدخل بيانات الصداق والإذن بالزواج.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
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

        <div className="flex gap-4 justify-between">
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
            التالي: التواريخ
          </button>
        </div>
      </div>
    );
  };


  // ============================================================================
  // خطوة 2: تفاصيل الملكية
  // ============================================================================



export const MixedMarriageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 0.5 && <Step1_MixedMarriageSpecifics state={state} setState={setState} />}
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_MarriageDetails state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
