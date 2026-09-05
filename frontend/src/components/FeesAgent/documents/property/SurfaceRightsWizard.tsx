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

  export const Step3_SurfaceRights_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updateSurfaceRights = <K extends keyof NonNullable<FeesAgentState['surfaceRights']>>(
      field: K,
      value: NonNullable<FeesAgentState['surfaceRights']>[K]
    ) => {
      setState(prev => ({
        ...prev,
        surfaceRights: {
          ...prev.surfaceRights,
          [field]: value
        } as NonNullable<FeesAgentState['surfaceRights']>
      }));
    };

    const updateObligation = (
      party: 'surfaceHolder' | 'landOwner',
      field: string,
      value: any
    ) => {
      setState(prev => ({
        ...prev,
        surfaceRights: {
          ...prev.surfaceRights,
          obligations: {
            ...prev.surfaceRights?.obligations,
            [party]: {
              ...prev.surfaceRights?.obligations?.[party],
              [field]: value
            }
          }
        } as NonNullable<FeesAgentState['surfaceRights']>
      }));
    };

    const updateTermination = (field: string, value: any) => {
      setState(prev => ({
        ...prev,
        surfaceRights: {
          ...prev.surfaceRights,
          terminationModes: {
            ...prev.surfaceRights?.terminationModes,
            [field]: value
          }
        } as NonNullable<FeesAgentState['surfaceRights']>
      }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-r-4 border-green-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تفاصيل عقد تفويت حق السطحية</h2>
          <p className="text-gray-700">أدخل التفاصيل الخاصة بحق السطحية وفقاً للمادة 116-119 من مدونة الحقوق العينية.</p>
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
                    checked={state.surfaceRights?.isLandRegistered === 'نعم'}
                    onChange={() => updateSurfaceRights('isLandRegistered', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم → سجل رسم عقاري</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.surfaceRights?.isLandRegistered === 'لا'}
                    onChange={() => updateSurfaceRights('isLandRegistered', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا → سجل في المحكمة الابتدائية</span>
                </label>
              </div>

              {state.surfaceRights?.isLandRegistered === 'نعم' && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الرسم العقاري</label>
                  <input
                    type="text"
                    value={state.surfaceRights?.landRegistrationNumber || ''}
                    onChange={(e) => updateSurfaceRights('landRegistrationNumber', e.target.value)}
                    placeholder="أدخل رقم الرسم العقاري"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              )}

              {state.surfaceRights?.isLandRegistered === 'لا' && (
                <div className="mt-3 bg-gray-50 p-4 rounded border border-gray-300">
                  <p className="text-sm font-bold text-gray-800 mb-3">سجل في المحكمة الابتدائية:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">ضمن بدفتر</label>
                      <input
                        type="text"
                        value={state.surfaceRights?.courtRegistration?.register || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                        value={state.surfaceRights?.courtRegistration?.number || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                        value={state.surfaceRights?.courtRegistration?.letter || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                        value={state.surfaceRights?.courtRegistration?.page || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                        value={state.surfaceRights?.courtRegistration?.count || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                        value={state.surfaceRights?.courtRegistration?.date || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setState(prev => ({
                            ...prev,
                            surfaceRights: {
                              ...prev.surfaceRights,
                              courtRegistration: {
                                ...prev.surfaceRights?.courtRegistration,
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
                    checked={state.surfaceRights?.isSharedProperty === 'نعم'}
                    onChange={() => updateSurfaceRights('isSharedProperty', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.surfaceRights?.isSharedProperty === 'لا'}
                    onChange={() => updateSurfaceRights('isSharedProperty', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>

              {state.surfaceRights?.isSharedProperty === 'نعم' && (
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
                          checked={state.surfaceRights?.allCoOwnersConsent === 'نعم'}
                          onChange={() => updateSurfaceRights('allCoOwnersConsent', 'نعم')}
                          className="w-4 h-4"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={state.surfaceRights?.allCoOwnersConsent === 'لا'}
                          onChange={() => updateSurfaceRights('allCoOwnersConsent', 'لا')}
                          className="w-4 h-4"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>

                  {state.surfaceRights?.allCoOwnersConsent === 'لا' && (
                    <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-red-800 font-bold">❌ رفض: عدم موافقة جميع الشركاء</p>
                      <p className="text-red-700 text-sm mt-2">لا يمكن ترتيب الحق على عقارات مشاعة إلا باتفاق جميع الشركاء</p>
                    </div>
                  )}

                  {state.surfaceRights?.allCoOwnersConsent === 'نعم' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        تفاصيل الموافقات (أسماء الشركاء ومراجع الموافقات)
                      </label>
                      <textarea
                        value={state.surfaceRights?.coOwnersConsentDetails || ''}
                        onChange={(e) => updateSurfaceRights('coOwnersConsentDetails', e.target.value)}
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

        {/* 3. Rights Definition */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
          <h3 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2">
            <span>2️⃣</span>
            <span>تحديد الحق</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الحق *</label>
              <select
                value={state.surfaceRights?.rightType || ''}
                onChange={(e) => updateSurfaceRights('rightType', e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">اختر نوع الحق</option>
                <option value="بنايات">بنايات</option>
                <option value="منشآت">منشآت</option>
                <option value="أغراس">أغراس</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">موقع العقار بدقة *</label>
              <input
                type="text"
                value={state.surfaceRights?.propertyLocation || ''}
                onChange={(e) => updateSurfaceRights('propertyLocation', e.target.value)}
                placeholder="أدخل الموقع"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">مساحة المنشآت</label>
              <input
                type="text"
                value={state.surfaceRights?.facilityArea || ''}
                onChange={(e) => updateSurfaceRights('facilityArea', e.target.value)}
                placeholder="مثال: 200 متر مربع"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {state.surfaceRights?.rightType === 'بنايات' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">عمر البناء</label>
                <input
                  type="text"
                  value={state.surfaceRights?.buildingAge || ''}
                  onChange={(e) => updateSurfaceRights('buildingAge', e.target.value)}
                  placeholder="مثال: 5 سنوات"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            )}

            {state.surfaceRights?.rightType === 'أغراس' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">عمر الأغراس</label>
                <input
                  type="text"
                  value={state.surfaceRights?.plantingAge || ''}
                  onChange={(e) => updateSurfaceRights('plantingAge', e.target.value)}
                  placeholder="مثال: 10 سنوات"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ بداية الحق</label>
              <input
                type="date"
                value={state.surfaceRights?.rightStartDate || ''}
                onChange={(e) => updateSurfaceRights('rightStartDate', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* 4. Obligations */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
          <h3 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">
            <span>3️⃣</span>
            <span>حقوق والتزامات الأطراف</span>
          </h3>

          <div className="space-y-6">
            {/* Surface Rights Holder Obligations */}
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <h4 className="font-bold text-orange-900 mb-3">التزامات صاحب السطحية:</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.surfaceHolder?.buildOrPlantPerContract || false}
                    onChange={(e) => updateObligation('surfaceHolder', 'buildOrPlantPerContract', e.target.checked)}
                  />
                  <span className="text-sm">✔ حق البناء أو الغرس وفق العقد فقط</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.surfaceHolder?.maintainBuilding || false}
                    onChange={(e) => updateObligation('surfaceHolder', 'maintainBuilding', e.target.checked)}
                  />
                  <span className="text-sm">✔ الالتزام بالمحافظة على البناء/الأغراس</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.surfaceHolder?.noRebuildAfterDestruction || false}
                    onChange={(e) => updateObligation('surfaceHolder', 'noRebuildAfterDestruction', e.target.checked)}
                  />
                  <span className="text-sm">✔ لا يجوز إعادة البناء بعد الهلاك إلا باتفاق</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.surfaceHolder?.canTransferOrMortgage || false}
                    onChange={(e) => updateObligation('surfaceHolder', 'canTransferOrMortgage', e.target.checked)}
                  />
                  <span className="text-sm">✔ يمكن التفويت أو الرهن ضمن الحدود القانونية</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.surfaceHolder?.civilLiability || false}
                    onChange={(e) => updateObligation('surfaceHolder', 'civilLiability', e.target.checked)}
                  />
                  <span className="text-sm">✔ الالتزام بالسلامة والمسؤولية المدنية</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تفاصيل إضافية</label>
                  <textarea
                    value={state.surfaceRights?.obligations?.surfaceHolder?.details || ''}
                    onChange={(e) => updateObligation('surfaceHolder', 'details', e.target.value)}
                    placeholder="أي التزامات إضافية..."
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Land Owner Rights */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-3">حقوق مالك الأرض:</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.landOwner?.enableUsage || false}
                    onChange={(e) => updateObligation('landOwner', 'enableUsage', e.target.checked)}
                  />
                  <span className="text-sm">✔ تمكين صاحب السطحية من استعمال حقه</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.landOwner?.monitorNoHarm || false}
                    onChange={(e) => updateObligation('landOwner', 'monitorNoHarm', e.target.checked)}
                  />
                  <span className="text-sm">✔ متابعة أن لا يضر الحق الأساسي أو الممتلكات الأخرى</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.surfaceRights?.obligations?.landOwner?.monitorUrbanCompliance || false}
                    onChange={(e) => updateObligation('landOwner', 'monitorUrbanCompliance', e.target.checked)}
                  />
                  <span className="text-sm">✔ متابعة الالتزام بالقوانين العمرانية</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تفاصيل إضافية</label>
                  <textarea
                    value={state.surfaceRights?.obligations?.landOwner?.details || ''}
                    onChange={(e) => updateObligation('landOwner', 'details', e.target.value)}
                    placeholder="أي التزامات إضافية..."
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Right Termination */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
          <h3 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
            <span>4️⃣</span>
            <span>انتهاء الحق (المادة 118)</span>
          </h3>

          <div className="bg-red-50 p-4 rounded border border-red-300 mb-4">
            <p className="text-sm text-red-900">
              انقضاء حق السطحية وفق المادة 118 يمكن أن يحدث في الحالات التالية:
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.terminationModes?.explicitWaiver || false}
                onChange={(e) => updateTermination('explicitWaiver', e.target.checked)}
              />
              <span className="text-sm">تنازل صريح</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.terminationModes?.unificationWithLand || false}
                onChange={(e) => updateTermination('unificationWithLand', e.target.checked)}
              />
              <span className="text-sm">اتحاد مع ملكية الأرض في يد شخص واحد</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.terminationModes?.totalDestruction || false}
                onChange={(e) => updateTermination('totalDestruction', e.target.checked)}
              />
              <span className="text-sm">هلاك المنشآت أو الأغراس هلاكا كليا</span>
            </label>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">حالات أخرى</label>
              <input
                type="text"
                value={state.surfaceRights?.terminationModes?.other || ''}
                onChange={(e) => updateTermination('other', e.target.value)}
                placeholder="أدخل حالات أخرى..."
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded mt-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.surfaceRights?.creditorsRightsAcknowledged || false}
                  onChange={(e) => updateSurfaceRights('creditorsRightsAcknowledged', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-yellow-900">
                  <strong>⚠️ تنبيه (المادة 119):</strong> للدائنين الحق في طلب إبطال التنازل إذا وقع إضرار بحقوقهم
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Legal Acknowledgments */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
          <h3 className="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2">
            <span>5️⃣</span>
            <span>التنبيهات والتحذيرات القانونية</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.acknowledgeSharedPropertyRules || false}
                onChange={(e) => updateSurfaceRights('acknowledgeSharedPropertyRules', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                ⚠️ لا يمكن ترتيب الحق على عقارات مشاعة إلا باتفاق جميع الشركاء
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.acknowledgeRebuildRequiresConsent || false}
                onChange={(e) => updateSurfaceRights('acknowledgeRebuildRequiresConsent', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                ⚠️ إعادة البناء أو الغرس بعد الهلاك يتطلب اتفاق صريح مع مالك الأرض
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.acknowledgeUrbanLaws || false}
                onChange={(e) => updateSurfaceRights('acknowledgeUrbanLaws', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                ⚠️ الالتزام بالقوانين العمرانية والبيئية أساسي
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.acknowledgeTransferLimits || false}
                onChange={(e) => updateSurfaceRights('acknowledgeTransferLimits', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                ⚠️ التفويت أو الرهن يجب أن يكون ضمن حدود ما يسمح به القانون
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={state.surfaceRights?.acknowledgeCreditorsRights || false}
                onChange={(e) => updateSurfaceRights('acknowledgeCreditorsRights', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                ⚠️ حقوق الدائنين محفوظة ويجب مراعاتها (المادة 119)
              </span>
            </label>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-300 mt-4">
            <p className="text-sm text-gray-900 font-semibold">
              📋 <strong>المرجع القانوني:</strong> مدونة الحقوق العينية — المادة 116-119 (حق السطحية)
            </p>
          </div>
        </div>

        {/* Navigation */}
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
              // Validation before proceeding
              if (state.surfaceRights?.isSharedProperty === 'نعم' && state.surfaceRights?.allCoOwnersConsent !== 'نعم') {
                alert('يجب موافقة جميع الشركاء في حالة العقار المشاع');
                return;
              }
              if (!state.surfaceRights?.rightType) {
                alert('يجب تحديد نوع الحق');
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
  // خطوة 3 (بديل): تفاصيل ثبوت زينة عقار
  // ============================================================================


export const SurfaceRightsWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_SurfaceRights_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
