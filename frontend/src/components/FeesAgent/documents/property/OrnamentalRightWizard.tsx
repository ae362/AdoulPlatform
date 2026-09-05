import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step3_AdministrativeCertificates } from '../../steps/Step3_AdministrativeCertificates';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { ShareDistributionModal } from '../../modals';
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

  export const Step3_OrnamentalRight_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updateOrnamentalRight = <K extends keyof NonNullable<FeesAgentState['ornamentalRight']>>(
      field: K,
      value: NonNullable<FeesAgentState['ornamentalRight']>[K]
    ) => {
      setState(prev => ({
        ...prev,
        ornamentalRight: {
          ...prev.ornamentalRight,
          [field]: value
        } as NonNullable<FeesAgentState['ornamentalRight']>
      }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border-r-4 border-amber-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تفاصيل ثبوت زينة عقار</h2>
          <p className="text-gray-700">أدخل التفاصيل الخاصة بحق الزينة وفقاً للمادة 133-137 من مدونة الحقوق العينية.</p>
        </div>

        {/* 1. Property Verification */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
            <span>1️⃣</span>
            <span>التحقق من العقار</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل الأرض محفظة؟ *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.ornamentalRight?.isLandRegistered === 'نعم'}
                    onChange={() => updateOrnamentalRight('isLandRegistered', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم → سجل رسم عقاري</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.ornamentalRight?.isLandRegistered === 'لا'}
                    onChange={() => updateOrnamentalRight('isLandRegistered', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا → سجل في المحكمة الابتدائية</span>
                </label>
              </div>

              {state.ornamentalRight?.isLandRegistered === 'نعم' && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الرسم العقاري</label>
                  <input
                    type="text"
                    value={state.ornamentalRight?.landRegistrationNumber || ''}
                    onChange={(e) => updateOrnamentalRight('landRegistrationNumber', e.target.value)}
                    placeholder="أدخل رقم الرسم العقاري"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              )}

              {state.ornamentalRight?.isLandRegistered === 'لا' && (
                <div className="mt-3 bg-gray-50 p-4 rounded border border-gray-300">
                  <p className="text-sm font-bold text-gray-800 mb-3">سجل في المحكمة الابتدائية:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">ضمن بدفتر</label>
                      <input
                        type="text"
                        value={state.ornamentalRight?.courtRegistration?.register || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                register: newValue
                              }
                            }
                          }));
                        }}
                        placeholder="بدفتر"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">رقم</label>
                      <input
                        type="text"
                        value={state.ornamentalRight?.courtRegistration?.number || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                number: newValue
                              }
                            }
                          }));
                        }}
                        placeholder="رقم"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">حرف</label>
                      <input
                        type="text"
                        value={state.ornamentalRight?.courtRegistration?.letter || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                letter: newValue
                              }
                            }
                          }));
                        }}
                        placeholder="حرف"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">صحيفة</label>
                      <input
                        type="text"
                        value={state.ornamentalRight?.courtRegistration?.page || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                page: newValue
                              }
                            }
                          }));
                        }}
                        placeholder="صحيفة"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">عدد</label>
                      <input
                        type="text"
                        value={state.ornamentalRight?.courtRegistration?.count || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                count: newValue
                              }
                            }
                          }));
                        }}
                        placeholder="عدد"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">بتاريخ</label>
                      <input
                        type="date"
                        value={state.ornamentalRight?.courtRegistration?.date || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            ornamentalRight: {
                              ...prev.ornamentalRight,
                              courtRegistration: {
                                ...prev.ornamentalRight?.courtRegistration,
                                date: newValue
                              }
                            }
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل العقار مشاع؟ *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.ornamentalRight?.isSharedProperty === 'نعم'}
                    onChange={() => updateOrnamentalRight('isSharedProperty', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.ornamentalRight?.isSharedProperty === 'لا'}
                    onChange={() => updateOrnamentalRight('isSharedProperty', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>

              {state.ornamentalRight?.isSharedProperty === 'نعم' && (
                <div className="mt-3 space-y-3">
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
                    <p className="text-yellow-800 font-semibold text-sm">
                      ⚠️ يتطلب موافقة جميع الشركاء
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      هل وافق جميع الشركاء؟ *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={state.ornamentalRight?.allCoOwnersConsent === 'نعم'}
                          onChange={() => updateOrnamentalRight('allCoOwnersConsent', 'نعم')}
                          className="w-4 h-4"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={state.ornamentalRight?.allCoOwnersConsent === 'لا'}
                          onChange={() => updateOrnamentalRight('allCoOwnersConsent', 'لا')}
                          className="w-4 h-4"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>

                  {state.ornamentalRight?.allCoOwnersConsent === 'لا' && (
                    <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-red-800 font-bold">❌ رفض: عدم موافقة جميع الشركاء</p>
                      <p className="text-red-700 text-sm mt-2">لا يمكن ترتيب الحق على عقارات مشاعة إلا باتفاق جميع الشركاء</p>
                    </div>
                  )}

                  {state.ornamentalRight?.allCoOwnersConsent === 'نعم' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        تفاصيل الموافقات (أسماء الشركاء ومراجع الموافقات)
                      </label>
                      <textarea
                        value={state.ornamentalRight?.coOwnersConsentDetails || ''}
                        onChange={(e) => updateOrnamentalRight('coOwnersConsentDetails', e.target.value)}
                        placeholder="أدخل تفاصيل موافقات الشركاء..."
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation for now */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }))}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-bold"
          >
            السابق
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (state.ornamentalRight?.isSharedProperty === 'نعم' && state.ornamentalRight?.allCoOwnersConsent !== 'نعم') {
                alert('يجب موافقة جميع الشركاء في حالة العقار المشاع');
                return;
              }
              
              setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-lg"
          >
            التالي
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3 (بديل): تفاصيل عقد العمري
  // ============================================================================


export const OrnamentalRightWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_OrnamentalRight_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
