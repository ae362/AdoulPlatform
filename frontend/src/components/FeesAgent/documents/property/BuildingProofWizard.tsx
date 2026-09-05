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

  export const Step3_BuildingProof: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const bp = state.buildingProof || {};

    const updateBuilding = (field: keyof BuildingProof, value: any) => {
      setState((prev) => ({
        ...prev,
        buildingProof: {
          ...(prev.buildingProof || {}),
          [field]: value,
        },
      }));
    };

    const toggleArrayValue = (field: 'evidenceSources' | 'authoritiesNotified', value: string) => {
      const current = bp[field] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      updateBuilding(field, next);
    };

    const toggleWorkflow = (field: keyof NonNullable<BuildingProof['workflowChecks']>) => {
      const current = bp.workflowChecks || {};
      updateBuilding('workflowChecks', { ...current, [field]: !current[field] });
    };

    const toggleRisk = (field: keyof NonNullable<BuildingProof['riskFlags']>) => {
      const current = bp.riskFlags || {};
      updateBuilding('riskFlags', { ...current, [field]: !current[field] });
    };

    const updateSmartAnswer = (field: keyof NonNullable<BuildingProof['smartAnswers']>, value: string) => {
      const current = bp.smartAnswers || {};
      updateBuilding('smartAnswers', { ...current, [field]: value });
    };

    const evidenceOptions = ['معاينة', 'مخالطة', 'جوار', 'شدة الاطلاع'];
    const authorityOptions = ['الوكالة الحضرية', 'الجماعة/السلطة الترابية', 'المحافظة العقارية'];

    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: ثبوت البناء بالشهود</h2>
          <p className="text-gray-700 leading-relaxed">
            شهادة عدلية لإثبات أن طالب الشهادة هو من أنجز البناء على وعاء عقاري محدد وبماله الخاص، مع التركيز على الحيازة، وصف البناء، والشهود (حد أدنى ستة غالباً).
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-700">
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مرجعية: م. الحقوق العينية (239، 240، 244، 250)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">قانون التحفيظ العقاري 14-07</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">ق ل ع: البناء في ملك الغير والالتصاق</span>
            <span className="px-3 py-1 rounded-full bg-white border border-amber-200">تحذير: التراخيص والرخص العمرانية</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-300 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">A. الوضع العقاري</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">وضع الوعاء العقاري</label>
              <select
                value={bp.landStatus || ''}
                onChange={(e) => updateBuilding('landStatus', e.target.value as BuildingProof['landStatus'])}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">—</option>
                <option value="محفظ">محفظ</option>
                <option value="في_طور_التحفيظ">في طور التحفيظ</option>
                <option value="غير_محفظ">غير محفظ</option>
                <option value="جماعي">ملك جماعي</option>
                <option value="غابوي">ملك غابوي</option>
                <option value="ملك_الغير">في ملك الغير</option>
                <option value="سكن_غير_قانوني">سكن غير قانوني/إحصاء</option>
                <option value="توسع_عمراني">منطقة توسع عمراني</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الوعاء القانوني</label>
              <select
                value={bp.baseContainer || ''}
                onChange={(e) => updateBuilding('baseContainer', e.target.value as BuildingProof['baseContainer'])}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">—</option>
                <option value="رسم_ملك">رسم ملك</option>
                <option value="حيازة">حيازة</option>
                <option value="شراء">شراء</option>
                <option value="هبة">هبة</option>
                <option value="إرث">إرث</option>
                <option value="تقسيم">تقسيم</option>
                <option value="غير_ذلك">غير ذلك</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">موقع البناء / وصف المكان</label>
              <input
                type="text"
                value={bp.buildingLocation || ''}
                onChange={(e) => updateBuilding('buildingLocation', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="الموقع، الحي، الجماعة، الإحداثيات (اختياري)"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-300 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">B. وصف البناء المادي</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الاستعمال</label>
              <select
                value={bp.buildingUse || ''}
                onChange={(e) => updateBuilding('buildingUse', e.target.value as BuildingProof['buildingUse'])}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">—</option>
                <option value="سكن">سكن</option>
                <option value="محل">محل</option>
                <option value="مرآب">مرآب</option>
                <option value="مستودع">مستودع</option>
                <option value="مختلط">مختلط</option>
                <option value="أخرى">أخرى</option>
              </select>
              {bp.buildingUse === 'أخرى' && (
                <input
                  type="text"
                  value={bp.buildingUseOther || ''}
                  onChange={(e) => updateBuilding('buildingUseOther', e.target.value)}
                  className="mt-2 w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="حدد طبيعة الاستعمال"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الطوابق</label>
                <input
                  type="number"
                  min={0}
                  value={bp.floors ?? ''}
                  onChange={(e) => updateBuilding('floors', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الغرف</label>
                <input
                  type="number"
                  min={0}
                  value={bp.rooms ?? ''}
                  onChange={(e) => updateBuilding('rooms', e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Possession & Witnesses */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">C. الحيازة والشهود</h3>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bp.possessionClean === true}
                onChange={(e) => updateBuilding('possessionClean', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-semibold text-gray-700">هل الحيازة نظيفة (بدون منازع) ؟</span>
            </label>
          </div>

          {bp.possessionClean === false && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل النزاع</label>
              <textarea
                value={bp.disputeDetails || ''}
                onChange={(e) => updateBuilding('disputeDetails', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="اذكر طبيعة النزاع والمادعي"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">مصادر الثبوت (اختر ما ينطبق):</label>
            {evidenceOptions.map((source) => (
              <label key={source} className="flex items-center gap-3 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bp.evidenceSources?.includes(source as any) === true}
                  onChange={() => toggleArrayValue('evidenceSources', source as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{source}</span>
              </label>
            ))}
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-300 p-4 rounded">
            <p className="text-sm text-amber-900 font-semibold">
              ⚠️ يستحسن إدراج ستة شهود على الأقل (الحد الأدنى المعترف به قانوناً)
            </p>
            <p className="text-xs text-amber-800 mt-2">
              سيتم حساب عدد الشهود من قائمة الشهود في الخطوة السابقة.
            </p>
          </div>
        </div>

        {/* Section D: Permits & Warnings */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">D. التراخيص والتحذيرات القانونية</h3>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bp.hasPermit === true}
                onChange={(e) => updateBuilding('hasPermit', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-semibold text-gray-700">هل يوجد رخصة بناء ساري المفعول؟</span>
            </label>
          </div>

          {bp.hasPermit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل الرخصة</label>
              <input
                type="text"
                value={bp.permitDetails || ''}
                onChange={(e) => updateBuilding('permitDetails', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="رقم الرخصة، تاريخ الإصدار، الجهة المصدرة"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">الجهات المُخطّرة (اختر ما ينطبق):</label>
            {authorityOptions.map((auth) => (
              <label key={auth} className="flex items-center gap-3 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bp.authoritiesNotified?.includes(auth) === true}
                  onChange={() => toggleArrayValue('authoritiesNotified', auth)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{auth}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">علامات التحذير (حدد ما ينطبق):</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-red-50 rounded">
                <input
                  type="checkbox"
                  checked={bp.riskFlags?.thirdPartyLand === true}
                  onChange={() => toggleRisk('thirdPartyLand')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">🔴 البناء في ملك الغير (الالتصاق)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-red-50 rounded">
                <input
                  type="checkbox"
                  checked={bp.riskFlags?.collectiveLand === true}
                  onChange={() => toggleRisk('collectiveLand')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">🔴 بناء على ملك جماعي</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-red-50 rounded">
                <input
                  type="checkbox"
                  checked={bp.riskFlags?.forestLand === true}
                  onChange={() => toggleRisk('forestLand')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">🔴 بناء على ملك غابوي (قد يكون ممنوعاً)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-red-50 rounded">
                <input
                  type="checkbox"
                  checked={bp.riskFlags?.urbanWithoutPermit === true}
                  onChange={() => toggleRisk('urbanWithoutPermit')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">⚠️ بناء حضري بدون رخصة</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-red-50 rounded">
                <input
                  type="checkbox"
                  checked={bp.riskFlags?.sensitiveZone === true}
                  onChange={() => toggleRisk('sensitiveZone')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">⚠️ منطقة حساسة (عسكرية، ساحلية، إلخ)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section E: Workflow Checklist */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">E. سير العمل والإجراءات</h3>
          <p className="text-sm text-gray-600">حدد الخطوات المنجزة في عملية إثبات البناء:</p>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.gpsCaptured === true}
                onChange={() => toggleWorkflow('gpsCaptured')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم رصد الإحداثيات الجغرافية</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.containerIdentified === true}
                onChange={() => toggleWorkflow('containerIdentified')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم تحديد الوعاء القانوني</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.disputeDeclared === true}
                onChange={() => toggleWorkflow('disputeDeclared')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم التصريح بالنزاعات (إن وجدت)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.witnessesCaptured === true}
                onChange={() => toggleWorkflow('witnessesCaptured')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم تسجيل بيانات الشهود (6+)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.registrationPaid === true}
                onChange={() => toggleWorkflow('registrationPaid')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم دفع الرسوم والواجبات</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.deedDrafted === true}
                onChange={() => toggleWorkflow('deedDrafted')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم تحرير الرسم النهائي</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={bp.workflowChecks?.inclusionDone === true}
                onChange={() => toggleWorkflow('inclusionDone')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">✓ تم التضمين في السجلات المختصة</span>
            </label>
          </div>
        </div>

        {/* Section F: Smart Questions */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">F. الأسئلة الذكية للتقييم</h3>
          <p className="text-sm text-gray-600">أجب على الأسئلة التالية لتحسين تقييم الملف:</p>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.isLandRegistered === true}
                  onChange={(e) => updateSmartAnswer('isLandRegistered', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل الأرض محفظة لدى المحافظة العقارية؟</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.isPermitAvailable === true}
                  onChange={(e) => updateSmartAnswer('isPermitAvailable', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل توجد رخصة بناء من الجهات المختصة؟</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.hasDisputeNow === true}
                  onChange={(e) => updateSmartAnswer('hasDisputeNow', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل هناك منازع حالياً حول البناء؟</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">كم سنة مضت على البناء؟</label>
              <input
                type="number"
                min={0}
                value={bp.smartAnswers?.buildYearsPassed ?? ''}
                onChange={(e) => updateSmartAnswer('buildYearsPassed', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="عدد السنوات"
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.applicantLivesInBuilding === true}
                  onChange={(e) => updateSmartAnswer('applicantLivesInBuilding', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل طالب الشهادة ساكن في البناء؟</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.buildingInherited === true}
                  onChange={(e) => updateSmartAnswer('buildingInherited', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل البناء مورّث (استحوذ عليه من أحد الوالدين)؟</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={bp.smartAnswers?.buildingOnCommonLand === true}
                  onChange={(e) => updateSmartAnswer('buildingOnCommonLand', String(e.target.checked))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">هل البناء فوق ملك مشاع/جماعي؟</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Easement Proof (ثبوت مرفق / حق الارتفاق)
  // ============================================================================

export const BuildingProofWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_BuildingProof state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
