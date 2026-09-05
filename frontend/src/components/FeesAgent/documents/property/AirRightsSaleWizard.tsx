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

  export const Step3_AirRights_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updateAirRights = <K extends keyof NonNullable<FeesAgentState['airRights']>>(
      field: K,
      value: NonNullable<FeesAgentState['airRights']>[K]
    ) => {
      setState(prev => ({
        ...prev,
        airRights: {
          ...prev.airRights,
          [field]: value
        } as NonNullable<FeesAgentState['airRights']>
      }));
    };

    const updateObligation = (
      party: 'elevationOwner' | 'lowerOwner',
      field: string,
      value: any
    ) => {
      setState(prev => ({
        ...prev,
        airRights: {
          ...prev.airRights,
          obligations: {
            ...prev.airRights?.obligations,
            [party]: {
              ...prev.airRights?.obligations?.[party],
              [field]: value
            }
          }
        } as NonNullable<FeesAgentState['airRights']>
      }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-r-4 border-purple-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تفاصيل عقد بيع حق الهواء والتعلية</h2>
          <p className="text-gray-700">أدخل التفاصيل الخاصة بحق الهواء والتعلية وفقاً للمادة 139-141 من مدونة الحقوق العينية.</p>
        </div>

        {/* 1. Building Existence Verification */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
          <h3 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
            <span>1️⃣</span>
            <span>التحقق من وجود بناء فعلي</span>
          </h3>
          <div className="bg-yellow-50 p-4 rounded border border-yellow-300 mb-4">
            <p className="text-sm text-yellow-900">
              ⚠️ <strong>تنبيه قانوني:</strong> حق الهواء والتعلية يفترض وجود بناء قائم (السفل) وقابلية التعلية عمرانيًا.
            </p>
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">هل البناء قائم فعليًا؟ *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.airRights?.hasExistingBuilding === 'نعم'}
                  onChange={() => updateAirRights('hasExistingBuilding', 'نعم')}
                  className="w-4 h-4"
                />
                <span>نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.airRights?.hasExistingBuilding === 'لا'}
                  onChange={() => updateAirRights('hasExistingBuilding', 'لا')}
                  className="w-4 h-4"
                />
                <span>لا</span>
              </label>
            </div>

            {state.airRights?.hasExistingBuilding === 'لا' && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-800 font-bold">❌ لا ينشأ حق التعلية دون بناء قائم (المادة 139)</p>
                <p className="text-red-700 text-sm mt-2">يجب أن يكون هناك بناء قائم فعلياً قبل إنشاء حق الهواء والتعلية.</p>
              </div>
            )}
          </div>
        </div>

        {state.airRights?.hasExistingBuilding === 'نعم' && (
          <>
            {/* 4. Intended Building Details */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
              <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
                <span>2️⃣</span>
                <span>تحديد نوع البناء المزمع</span>
              </h3>
              <div className="bg-blue-50 p-4 rounded border border-blue-300 mb-4">
                <p className="text-sm text-blue-900">
                  📋 <strong>المادة 139 فقرة 2:</strong> يجب تحديد نوع البناء، مواصفاته، أبعاده، عدد الطوابق، مواد البناء، ومساحة غطاء الطابق.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">نوع البناء *</label>
                  <input
                    type="text"
                    value={state.airRights?.buildingType || ''}
                    onChange={(e) => updateAirRights('buildingType', e.target.value)}
                    placeholder="مثال: سكني، تجاري، صناعي..."
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">عدد الطوابق *</label>
                  <input
                    type="text"
                    value={state.airRights?.numberOfFloors || ''}
                    onChange={(e) => updateAirRights('numberOfFloors', e.target.value)}
                    placeholder="مثال: 3 طوابق"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">مساحة غطاء الطابق *</label>
                  <input
                    type="text"
                    value={state.airRights?.floorCoverageArea || ''}
                    onChange={(e) => updateAirRights('floorCoverageArea', e.target.value)}
                    placeholder="مثال: 120 متر مربع"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">مواد البناء *</label>
                  <input
                    type="text"
                    value={state.airRights?.buildingMaterials || ''}
                    onChange={(e) => updateAirRights('buildingMaterials', e.target.value)}
                    placeholder="مثال: خرسانة مسلحة، طوب..."
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">أبعاد البناء *</label>
                  <input
                    type="text"
                    value={state.airRights?.buildingDimensions || ''}
                    onChange={(e) => updateAirRights('buildingDimensions', e.target.value)}
                    placeholder="مثال: طول 15 متر × عرض 10 متر"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">مواصفات البناء التفصيلية</label>
                  <textarea
                    value={state.airRights?.buildingSpecs || ''}
                    onChange={(e) => updateAirRights('buildingSpecs', e.target.value)}
                    placeholder="وصف تفصيلي للبناء المزمع إنشاؤه..."
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {!state.airRights?.numberOfFloors && (
                <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded mt-4">
                  <p className="text-orange-800 text-sm">
                    ⚠️ <strong>تحذير:</strong> عدم التنصيص على عدد الطوابق يؤدي لتفسير قضائي غير مضمون
                  </p>
                </div>
              )}
            </div>

            {/* 5. Urban Planning Verification */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400">
              <h3 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
                <span>3️⃣</span>
                <span>التحقق من ضوابط التعمير</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    هل تسمح تصاميم التهيئة بزيادة الطوابق؟ *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.allowsAdditionalFloors === 'نعم'}
                        onChange={() => updateAirRights('allowsAdditionalFloors', 'نعم')}
                        className="w-4 h-4"
                      />
                      <span>نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.allowsAdditionalFloors === 'لا'}
                        onChange={() => updateAirRights('allowsAdditionalFloors', 'لا')}
                        className="w-4 h-4"
                      />
                      <span>لا</span>
                    </label>
                  </div>

                  {state.airRights?.allowsAdditionalFloors === 'لا' && (
                    <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded mt-3">
                      <p className="text-red-800 font-bold">❌ رفض: تصاميم التهيئة لا تسمح بزيادة الطوابق</p>
                      <p className="text-red-700 text-sm mt-2">لا يمكن المتابعة دون موافقة عمرانية.</p>
                    </div>
                  )}
                </div>

                {state.airRights?.allowsAdditionalFloors === 'نعم' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">رقم رخصة البناء</label>
                        <input
                          type="text"
                          value={state.airRights?.buildingPermitNumber || ''}
                          onChange={(e) => updateAirRights('buildingPermitNumber', e.target.value)}
                          placeholder="رقم الرخصة"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">رخصة البناء (ملف)</label>
                        <input
                          type="file"
                          onChange={(e) => updateAirRights('buildingPermitFile', e.target.files?.[0] || null)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الموافقة الهندسية</label>
                        <input
                          type="text"
                          value={state.airRights?.engineeringApproval || ''}
                          onChange={(e) => updateAirRights('engineeringApproval', e.target.value)}
                          placeholder="رقم الموافقة"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">الموافقة الهندسية (ملف)</label>
                        <input
                          type="file"
                          onChange={(e) => updateAirRights('engineeringApprovalFile', e.target.files?.[0] || null)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">رقم تقرير السلامة</label>
                        <input
                          type="text"
                          value={state.airRights?.safetyReport || ''}
                          onChange={(e) => updateAirRights('safetyReport', e.target.value)}
                          placeholder="رقم التقرير"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">تقرير السلامة (ملف)</label>
                        <input
                          type="file"
                          onChange={(e) => updateAirRights('safetyReportFile', e.target.files?.[0] || null)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 6. Shared Property Status */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
              <h3 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2">
                <span>4️⃣</span>
                <span>حالة العقار المشاع</span>
              </h3>

              <div className="bg-purple-50 p-4 rounded border border-purple-300 mb-4">
                <p className="text-sm text-purple-900">
                  ⚠️ <strong>المادة 139:</strong> لا يمكن ترتيب حق الهواء والتعلية على عقار مشاع إلا باتفاق جميع الشركاء.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">هل العقار مشاع؟ *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.isSharedProperty === 'نعم'}
                        onChange={() => updateAirRights('isSharedProperty', 'نعم')}
                        className="w-4 h-4"
                      />
                      <span>نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.isSharedProperty === 'لا'}
                        onChange={() => updateAirRights('isSharedProperty', 'لا')}
                        className="w-4 h-4"
                      />
                      <span>لا</span>
                    </label>
                  </div>
                </div>

                {state.airRights?.isSharedProperty === 'نعم' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        هل وافق جميع الشركاء؟ *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={state.airRights?.allCoOwnersConsent === 'نعم'}
                            onChange={() => updateAirRights('allCoOwnersConsent', 'نعم')}
                            className="w-4 h-4"
                          />
                          <span>نعم</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={state.airRights?.allCoOwnersConsent === 'لا'}
                            onChange={() => updateAirRights('allCoOwnersConsent', 'لا')}
                            className="w-4 h-4"
                          />
                          <span>لا</span>
                        </label>
                      </div>
                    </div>

                    {state.airRights?.allCoOwnersConsent === 'لا' && (
                      <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-800 font-bold">❌ رفض: عدم موافقة جميع الشركاء</p>
                        <p className="text-red-700 text-sm mt-2">يجب الحصول على موافقة جميع الشركاء في الشياع.</p>
                      </div>
                    )}

                    {state.airRights?.allCoOwnersConsent === 'نعم' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          تفاصيل الموافقات (أسماء الشركاء ومراجع الموافقات)
                        </label>
                        <textarea
                          value={state.airRights?.coOwnersConsentDetails || ''}
                          onChange={(e) => updateAirRights('coOwnersConsentDetails', e.target.value)}
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

            {/* 7. Transferability Rights */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400">
              <h3 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
                <span>5️⃣</span>
                <span>قابلية التفويت (المادة 141)</span>
              </h3>

              <div className="bg-indigo-50 p-4 rounded border border-indigo-300 mb-4">
                <p className="text-sm text-indigo-900">
                  📋 صاحب حق الهواء يمكنه بيعه، رهنه، أو ترتيب ارتفاق، لكن لا يجوز تفويت الهواء الذي يعلو بناءه إلا برضى مالك السفل.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.canSell || false}
                    onChange={(e) => updateAirRights('canSell', e.target.checked)}
                  />
                  <span className="text-sm">يحق لصاحب التعلية بيع حقه</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.canMortgage || false}
                    onChange={(e) => updateAirRights('canMortgage', e.target.checked)}
                  />
                  <span className="text-sm">يحق لصاحب التعلية رهن حقه</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.canEstablishServitude || false}
                    onChange={(e) => updateAirRights('canEstablishServitude', e.target.checked)}
                  />
                  <span className="text-sm">يحق لصاحب التعلية ترتيب ارتفاق</span>
                </label>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    هل يوافق مالك السفل على تفويت الهواء الذي يعلو بناء صاحب التعلية؟
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.lowerOwnerConsent === 'نعم'}
                        onChange={() => updateAirRights('lowerOwnerConsent', 'نعم')}
                        className="w-4 h-4"
                      />
                      <span>نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={state.airRights?.lowerOwnerConsent === 'لا'}
                        onChange={() => updateAirRights('lowerOwnerConsent', 'لا')}
                        className="w-4 h-4"
                      />
                      <span>لا</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Legal Obligations */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
              <h3 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">
                <span>6️⃣</span>
                <span>الالتزامات القانونية</span>
              </h3>

              <div className="space-y-6">
                {/* Elevation Owner Obligations */}
                <div className="bg-orange-50 p-4 rounded border border-orange-200">
                  <h4 className="font-bold text-orange-900 mb-3">على صاحب التعلية:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.elevationOwner?.buildAccordingToSpecs || false}
                        onChange={(e) => updateObligation('elevationOwner', 'buildAccordingToSpecs', e.target.checked)}
                      />
                      <span className="text-sm">البناء وفق مواصفات العقد</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.elevationOwner?.respectUrbanPlan || false}
                        onChange={(e) => updateObligation('elevationOwner', 'respectUrbanPlan', e.target.checked)}
                      />
                      <span className="text-sm">احترام تصميم التهيئة</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.elevationOwner?.bearEngineeringCosts || false}
                        onChange={(e) => updateObligation('elevationOwner', 'bearEngineeringCosts', e.target.checked)}
                      />
                      <span className="text-sm">تحمل المصاريف الهندسية</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.elevationOwner?.maintainOriginalPropertySafety || false}
                        onChange={(e) => updateObligation('elevationOwner', 'maintainOriginalPropertySafety', e.target.checked)}
                      />
                      <span className="text-sm">المحافظة على سلامة العقار الأصلي</span>
                    </label>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">تفاصيل إضافية</label>
                      <textarea
                        value={state.airRights?.obligations?.elevationOwner?.details || ''}
                        onChange={(e) => updateObligation('elevationOwner', 'details', e.target.value)}
                        placeholder="أي التزامات إضافية..."
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Lower Owner Obligations */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3">على مالك السفل:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.lowerOwner?.enableVerticalUse || false}
                        onChange={(e) => updateObligation('lowerOwner', 'enableVerticalUse', e.target.checked)}
                      />
                      <span className="text-sm">تمكين صاحب التعلية من الاستغلال العمودي</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.airRights?.obligations?.lowerOwner?.notAbuseRights || false}
                        onChange={(e) => updateObligation('lowerOwner', 'notAbuseRights', e.target.checked)}
                      />
                      <span className="text-sm">عدم التعسف في منع استعمال الحق</span>
                    </label>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">تفاصيل إضافية</label>
                      <textarea
                        value={state.airRights?.obligations?.lowerOwner?.details || ''}
                        onChange={(e) => updateObligation('lowerOwner', 'details', e.target.value)}
                        placeholder="أي التزامات إضافية..."
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Transfer of Rights */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-400">
              <h3 className="text-xl font-bold mb-4 text-teal-700 flex items-center gap-2">
                <span>7️⃣</span>
                <span>انتقال الحق</span>
              </h3>

              <div className="bg-teal-50 p-4 rounded border border-teal-300 mb-4">
                <p className="text-sm text-teal-900">
                  📋 ينتقل حق الهواء والتعلية بالإرث، الوصية، الشفعة، البيع والرهن - وهو حق عيني لا مجرد إذن إداري.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.inheritanceAllowed || false}
                    onChange={(e) => updateAirRights('inheritanceAllowed', e.target.checked)}
                  />
                  <span className="text-sm">ينتقل بالإرث</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.willAllowed || false}
                    onChange={(e) => updateAirRights('willAllowed', e.target.checked)}
                  />
                  <span className="text-sm">ينتقل بالوصية</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.preemptionAllowed || false}
                    onChange={(e) => updateAirRights('preemptionAllowed', e.target.checked)}
                  />
                  <span className="text-sm">ينتقل بالشفعة</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.saleAndMortgageAllowed || false}
                    onChange={(e) => updateAirRights('saleAndMortgageAllowed', e.target.checked)}
                  />
                  <span className="text-sm">ينتقل بالبيع والرهن</span>
                </label>
              </div>
            </div>

            {/* 10. Legal Alerts Acknowledgment */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
              <h3 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
                <span>8️⃣</span>
                <span>تنبيهات وتحذيرات قانونية</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeUrbanPlanningCompliance || false}
                    onChange={(e) => updateAirRights('acknowledgeUrbanPlanningCompliance', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ عدم احترام ضوابط التعمير يبطل الأثر التنفيذي وليس الحق العقدي فقط
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgePropertyRegistration || false}
                    onChange={(e) => updateAirRights('acknowledgePropertyRegistration', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ في العقار المحفظ يجب الإشهار في الرسم العقاري
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeTechnicalCompliance || false}
                    onChange={(e) => updateAirRights('acknowledgeTechnicalCompliance', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ مخالفة المواصفات التقنية تحوّل النزاع هندسيًا وليس فقط قانونيًا
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeSharedOwnershipRules || false}
                    onChange={(e) => updateAirRights('acknowledgeSharedOwnershipRules', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ في البنايات المشتركة يجب احترام نظام الملكية المشتركة
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeDisputeRisk || false}
                    onChange={(e) => updateAirRights('acknowledgeDisputeRisk', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ إمكانية تحول النزاع إلى شيوع في حقوق الملكية إذا لم يتم التخصيص الهندسي جيدًا
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeFloorSpecification || false}
                    onChange={(e) => updateAirRights('acknowledgeFloorSpecification', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ عدم التنصيص على عدد الطوابق يؤدي لتفسير قضائي غير مضمون
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.airRights?.acknowledgeFraudRisk || false}
                    onChange={(e) => updateAirRights('acknowledgeFraudRisk', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    ⚠️ التحايل بتحويل التعلية إلى بيع لطابق فوقي قد تنتج عنه مشاكل قانونية
                  </span>
                </label>
              </div>

              <div className="bg-red-50 p-4 rounded border border-red-300 mt-4">
                <p className="text-sm text-red-900 font-semibold">
                  ⚡ جميع التنبيهات أعلاه يجب الاطلاع عليها وفهمها قبل المتابعة
                </p>
              </div>
            </div>
          </>
        )}

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
              if (state.airRights?.hasExistingBuilding !== 'نعم') {
                alert('يجب أن يكون هناك بناء قائم فعلياً');
                return;
              }
              if (state.airRights?.allowsAdditionalFloors !== 'نعم') {
                alert('يجب أن تسمح تصاميم التهيئة بزيادة الطوابق');
                return;
              }
              if (!state.airRights?.buildingType || !state.airRights?.numberOfFloors) {
                alert('يجب تحديد نوع البناء وعدد الطوابق');
                return;
              }
              
              setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-lg"
          >
            التالي
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3 (بديل): تفاصيل عقد تفويت حق السطحية
  // ============================================================================


export const AirRightsSaleWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_AirRights_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
