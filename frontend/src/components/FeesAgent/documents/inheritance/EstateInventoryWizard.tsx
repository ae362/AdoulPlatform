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

  export const Step3_EstateInventory: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const estate = state.estateInventory || {};

    const updateEstate = <K extends keyof EstateInventory>(field: K, value: EstateInventory[K]) => {
      setState((prev) => ({
        ...prev,
        estateInventory: {
          ...(prev.estateInventory || {}),
          [field]: value,
        },
      }));
    };

    const applicant = estate.applicant || {};
    const updateApplicant = (patch: Partial<NonNullable<EstateInventory['applicant']>>) => {
      updateEstate('applicant', { ...applicant, ...patch } as any);
    };

    const deceased = estate.deceased || {};
    const updateDeceased = (patch: Partial<NonNullable<EstateInventory['deceased']>>) => {
      updateEstate('deceased', { ...deceased, ...patch } as any);
    };

    const properties = estate.properties || [];
    const updateProperties = (newProps: typeof properties) => {
      updateEstate('properties', newProps);
    };

    const heirs = estate.heirs || [];
    const updateHeirs = (newHeirs: typeof heirs) => {
      updateEstate('heirs', newHeirs);
    };

    const witnesses = estate.witnesses || {};
    const updateWitnesses = (patch: Partial<NonNullable<EstateInventory['witnesses']>>) => {
      updateEstate('witnesses', { ...witnesses, ...patch } as any);
    };

    const inventoryDetails = estate.inventoryDetails || {};
    const updateInventoryDetails = (patch: Partial<NonNullable<EstateInventory['inventoryDetails']>>) => {
      updateEstate('inventoryDetails', { ...inventoryDetails, ...patch } as any);
    };

    const smartChecks = estate.smartChecks || {};
    const updateSmartChecks = (patch: Partial<NonNullable<EstateInventory['smartChecks']>>) => {
      updateEstate('smartChecks', { ...smartChecks, ...patch } as any);
    };

    const smartAnswers = estate.smartAnswers || {};
    const updateSmartAnswers = (patch: Partial<NonNullable<EstateInventory['smartAnswers']>>) => {
      updateEstate('smartAnswers', { ...smartAnswers, ...patch } as any);
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-purple-50 p-6 rounded-lg border-r-4 border-purple-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تهييء رسم إحصاء متروك</h2>
          <p className="text-gray-700 leading-relaxed">
            إحصاء المتروك هو توثيق رسمي لجميع ممتلكات المتوفى (عقارية ومنقولة ونقدية) لتحديد نصيب كل وريث وفق أحكام الشريعة الإسلامية ومدونة الأسرة المغربية.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-purple-800">
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">مرجعية: مدونة الأسرة (المادة 327-329)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">مدونة الحقوق العينية 39.08 (المادة 239، 243-255، 261-262)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">قانون الالتزامات والعقود (المادة 117-118)</span>
          </div>
        </div>

        {/* 1. بيانات طالب الشهادة */}
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-300 space-y-4">
          <h3 className="text-lg font-bold text-blue-900">1. بيانات طالب الشهادة (المستفيد / مقدم الطلب)</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشخص الذي يطلب إحصاء المتروك.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={applicant.fullName || ''}
                onChange={(e) => updateApplicant({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ الولادة</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={applicant.dateOfBirth || ''}
                onChange={(e) => updateApplicant({ dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">مكان الولادة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={applicant.placeOfBirth || ''}
                onChange={(e) => updateApplicant({ placeOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={applicant.nationality || ''}
                onChange={(e) => updateApplicant({ nationality: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="مغربي">مغربي</option>
                <option value="أجنبي">أجنبي</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحالة العائلية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={applicant.maritalStatus || ''}
                onChange={(e) => updateApplicant({ maritalStatus: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="أعزب">أعزب</option>
                <option value="متزوج">متزوج</option>
                <option value="مطلق">مطلق</option>
                <option value="أرمل">أرمل</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={applicant.idNumber || ''}
                onChange={(e) => updateApplicant({ idNumber: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">العنوان الكامل *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={applicant.address || ''}
                onChange={(e) => updateApplicant({ address: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">صلة طالب الشهادة بالمتوفى</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={applicant.relationToDeceased || ''}
                onChange={(e) => updateApplicant({ relationToDeceased: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="وريث">وريث</option>
                <option value="وصي">وصي</option>
                <option value="قريب_آخر">قريب آخر</option>
                <option value="طرف_ثالث">طرف ثالث</option>
              </select>
            </div>
          </div>

          <div className="mt-4 bg-white border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-blue-900 mb-2">الأسئلة الذكية:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={applicant.isDirectHeir || false}
                onChange={(e) => updateApplicant({ isDirectHeir: e.target.checked })}
              />
              <span>هل الطالب وريث مباشر للمتوفى؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={applicant.isGuardianOfMinors || false}
                onChange={(e) => updateApplicant({ isGuardianOfMinors: e.target.checked })}
              />
              <span>هل الطالب وصي على القصر أو المعوقين؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={applicant.representsLegalEntity || false}
                onChange={(e) => updateApplicant({ representsLegalEntity: e.target.checked })}
              />
              <span>هل الطالب يمثّل جماعة أو مؤسسة قانونية؟</span>
            </label>
          </div>
        </div>

        {/* 2. بيانات المتوفى */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">2. بيانات المتوفى (المتروك)</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشخص المتوفى صاحب المتروك.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.fullName || ''}
                onChange={(e) => updateDeceased({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ الوفاة *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.dateOfDeath || ''}
                onChange={(e) => updateDeceased({ dateOfDeath: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">مكان الوفاة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.placeOfDeath || ''}
                onChange={(e) => updateDeceased({ placeOfDeath: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={deceased.nationality || ''}
                onChange={(e) => updateDeceased({ nationality: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="مغربي">مغربي</option>
                <option value="أجنبي">أجنبي</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحالة العائلية وقت الوفاة</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={deceased.maritalStatusAtDeath || ''}
                onChange={(e) => updateDeceased({ maritalStatusAtDeath: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="أعزب">أعزب</option>
                <option value="متزوج">متزوج</option>
                <option value="مطلق">مطلق</option>
                <option value="أرمل">أرمل</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.idNumber || ''}
                onChange={(e) => updateDeceased({ idNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">دفتر التركات / سجل الوفاة *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.estateRegistry || ''}
                onChange={(e) => updateDeceased({ estateRegistry: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">رقم شهادة الوفاة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={deceased.deathCertificate || ''}
                onChange={(e) => updateDeceased({ deathCertificate: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <p className="font-bold mb-1">⚠️ تنبيهات:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>يجب أن يكون تاريخ الوفاة مثبتًا رسمياً لإتمام الإحصاء.</li>
              <li>إذا كان المتوفى أجنبيًا، تنطبق القيود القانونية على الحيازة والاستحقاق.</li>
            </ul>
          </div>
        </div>

        {/* 3. بيانات الممتلكات/المتروك */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
          <h3 className="text-lg font-bold text-green-900">3. بيانات الممتلكات / المتروك</h3>
          <p className="text-xs text-gray-700 mb-2">قائمة بجميع الممتلكات التي تركها المتوفى (عقارية ومنقولة ونقدية).</p>

          {properties.map((prop, index) => (
            <div key={index} className="bg-white border border-green-200 rounded-lg p-4 relative">
              {properties.length > 1 && (
                <button
                  onClick={() => updateProperties(properties.filter((_, i) => i !== index))}
                  className="absolute top-2 left-2 text-red-500 hover:text-red-700 text-sm font-semibold"
                >
                  ✕ حذف
                </button>
              )}
              <h4 className="font-bold text-gray-800 mb-3">الممتلك رقم {index + 1}</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">نوع الممتلك *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={prop.propertyType || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, propertyType: e.target.value as any };
                      updateProperties(newProps);
                    }}
                  >
                    <option value="">اختر...</option>
                    <option value="عقار_حضري">عقار حضري</option>
                    <option value="عقار_فلاحي">عقار فلاحي</option>
                    <option value="عقار_تجاري">عقار تجاري</option>
                    <option value="منقول">منقول</option>
                    <option value="نقدي">نقدي</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">العنوان أو الموقع *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={prop.addressOrLocation || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, addressOrLocation: e.target.value };
                      updateProperties(newProps);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">المساحة</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="مثال: 200 م²"
                    value={prop.area || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, area: e.target.value };
                      updateProperties(newProps);
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">الحدود</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={prop.boundaries || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, boundaries: e.target.value };
                      updateProperties(newProps);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">الملكية الأصلية</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={prop.originalOwnership || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, originalOwnership: e.target.value as any };
                      updateProperties(newProps);
                    }}
                  >
                    <option value="">اختر...</option>
                    <option value="شراء">شراء</option>
                    <option value="إرث">إرث</option>
                    <option value="محبس">محبس</option>
                    <option value="مشاع">مشاع</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">تقييم القيمة (بالدرهم) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={prop.estimatedValue || ''}
                    onChange={(e) => {
                      const newProps = [...properties];
                      newProps[index] = { ...prop, estimatedValue: parseFloat(e.target.value) || 0 };
                      updateProperties(newProps);
                    }}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={prop.hasEncumbrances || false}
                      onChange={(e) => {
                        const newProps = [...properties];
                        newProps[index] = { ...prop, hasEncumbrances: e.target.checked };
                        updateProperties(newProps);
                      }}
                    />
                    <span className="font-semibold text-amber-700">يوجد حقوق مطلقة أو محددة على الممتلك (رهن / إشغال / حقوق عينية)</span>
                  </label>
                  {prop.hasEncumbrances && (
                    <textarea
                      className="mt-2 w-full px-3 py-2 border rounded-lg text-xs"
                      rows={2}
                      placeholder="تفاصيل الحقوق..."
                      value={prop.encumbrancesDetails || ''}
                      onChange={(e) => {
                        const newProps = [...properties];
                        newProps[index] = { ...prop, encumbrancesDetails: e.target.value };
                        updateProperties(newProps);
                      }}
                    />
                  )}
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={prop.isShared || false}
                      onChange={(e) => {
                        const newProps = [...properties];
                        newProps[index] = { ...prop, isShared: e.target.checked };
                        updateProperties(newProps);
                      }}
                    />
                    <span>العقار مشاع</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={prop.isWaqf || false}
                      onChange={(e) => {
                        const newProps = [...properties];
                        newProps[index] = { ...prop, isWaqf: e.target.checked };
                        updateProperties(newProps);
                      }}
                    />
                    <span>العقار محبس</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={prop.hasEasement || false}
                      onChange={(e) => {
                        const newProps = [...properties];
                        newProps[index] = { ...prop, hasEasement: e.target.checked };
                        updateProperties(newProps);
                      }}
                    />
                    <span>يوجد حقوق ارتفاق</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => updateProperties([...properties, { propertyType: '', addressOrLocation: '', area: '', boundaries: '', originalOwnership: '', estimatedValue: 0, hasEncumbrances: false, isShared: false, isWaqf: false, hasEasement: false }])}
            className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            + إضافة ممتلك
          </button>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-xs space-y-2">
            <p className="font-semibold text-amber-900 mb-1">الأسئلة الذكية للممتلكات:</p>
            <div className="grid md:grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.allPartnersInvolvedInShared || false}
                  onChange={(e) => updateSmartAnswers({ allPartnersInvolvedInShared: e.target.checked })}
                />
                <span>هل جميع الشركاء معنيون بالإحصاء؟ (للمشاع)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.waqfNeedsCouncilPermission || false}
                  onChange={(e) => updateSmartAnswers({ waqfNeedsCouncilPermission: e.target.checked })}
                />
                <span>هل يحتاج إذن من المجلس العلمي؟ (للمحبس)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.hasEasementOrMortgage || false}
                  onChange={(e) => updateSmartAnswers({ hasEasementOrMortgage: e.target.checked })}
                />
                <span>هل هناك حقوق ارتفاق أو رهن؟</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. بيانات الورثة/المستفيدين */}
        <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
          <h3 className="text-lg font-bold text-indigo-900">4. بيانات الورثة / المستفيدين</h3>
          <p className="text-xs text-gray-700 mb-2">قائمة بجميع الورثة ونصيب كل منهم.</p>

          {heirs.map((heir, index) => (
            <div key={index} className="bg-white border border-indigo-200 rounded-lg p-4 relative">
              {heirs.length > 1 && (
                <button
                  onClick={() => updateHeirs(heirs.filter((_, i) => i !== index))}
                  className="absolute top-2 left-2 text-red-500 hover:text-red-700 text-sm font-semibold"
                >
                  ✕ حذف
                </button>
              )}
              <h4 className="font-bold text-gray-800 mb-3">الوريث رقم {index + 1}</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={heir.fullName || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, fullName: e.target.value };
                      updateHeirs(newHeirs);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={heir.dateOfBirth || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, dateOfBirth: e.target.value };
                      updateHeirs(newHeirs);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={heir.nationality || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, nationality: e.target.value as any };
                      updateHeirs(newHeirs);
                    }}
                  >
                    <option value="">اختر...</option>
                    <option value="مغربي">مغربي</option>
                    <option value="أجنبي">أجنبي</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={heir.idNumber || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, idNumber: e.target.value };
                      updateHeirs(newHeirs);
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">صلة الوريث بالمتوفى</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={heir.relationToDeceased || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, relationToDeceased: e.target.value as any };
                      updateHeirs(newHeirs);
                    }}
                  >
                    <option value="">اختر...</option>
                    <option value="ابن">ابن</option>
                    <option value="ابنة">ابنة</option>
                    <option value="زوج">زوج</option>
                    <option value="زوجة">زوجة</option>
                    <option value="شقيق">شقيق</option>
                    <option value="شقيقة">شقيقة</option>
                    <option value="آخر">آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">النصيب</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="مثال: الثلث، 25%"
                    value={heir.share || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, share: e.target.value };
                      updateHeirs(newHeirs);
                    }}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={heir.isMinor || false}
                      onChange={(e) => {
                        const newHeirs = [...heirs];
                        newHeirs[index] = { ...heir, isMinor: e.target.checked };
                        updateHeirs(newHeirs);
                      }}
                    />
                    <span className="font-semibold text-amber-700">هل الوريث قاصر؟ (يتطلب وصي قانوني)</span>
                  </label>
                  {heir.isMinor && (
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">اسم الوصي *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={heir.guardianName || ''}
                          onChange={(e) => {
                            const newHeirs = [...heirs];
                            newHeirs[index] = { ...heir, guardianName: e.target.value };
                            updateHeirs(newHeirs);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">رقم بطاقة الوصي *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={heir.guardianId || ''}
                          onChange={(e) => {
                            const newHeirs = [...heirs];
                            newHeirs[index] = { ...heir, guardianId: e.target.value };
                            updateHeirs(newHeirs);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => updateHeirs([...heirs, { fullName: '', dateOfBirth: '', nationality: '', idNumber: '', relationToDeceased: '', isMinor: false, share: '' }])}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            + إضافة وريث
          </button>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-xs space-y-2">
            <p className="font-semibold text-amber-900 mb-1">الأسئلة الذكية للورثة:</p>
            <div className="grid md:grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.heirIsMinor || false}
                  onChange={(e) => updateSmartAnswers({ heirIsMinor: e.target.checked })}
                />
                <span>هل الوريث قاصر؟ → يعين وصي قانوني</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.multipleHeirs || false}
                  onChange={(e) => updateSmartAnswers({ multipleHeirs: e.target.checked })}
                />
                <span>هل يوجد أكثر من وريث؟ → حساب الحصص تلقائياً</span>
              </label>
            </div>
          </div>
        </div>

        {/* 5. بيانات الشهود */}
        <div className="bg-teal-50 p-6 rounded-lg border-l-4 border-teal-300 space-y-4">
          <h3 className="text-lg font-bold text-teal-900">5. بيانات الشهود</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشهود على إحصاء المتروك.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">أسماء الشهود (مع أرقام البطاقات)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="الشاهد الأول: ... رقم البطاقة ..."
                value={witnesses.witnessNames || ''}
                onChange={(e) => updateWitnesses({ witnessNames: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">محل إقامة الشهود</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={witnesses.witnessResidences || ''}
                onChange={(e) => updateWitnesses({ witnessResidences: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">صلة الشهود بالمتوفى</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="يجب أن تكون مستقلة وحيادية"
                value={witnesses.relationToDeceased || ''}
                onChange={(e) => updateWitnesses({ relationToDeceased: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-teal-200 rounded-lg p-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={witnesses.signaturesUploaded || false}
                onChange={(e) => updateWitnesses({ signaturesUploaded: e.target.checked })}
              />
              <span className="font-semibold">تم رفع توقيعات الشهود</span>
            </label>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <p className="font-bold mb-1">⚠️ تنبيهات:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>الشهود يجب أن يكونوا عارفين بالعقار وحالة الورثة.</li>
              <li>لا يجوز للشهود أن يكونوا طرفاً مستفيداً من المتروك.</li>
            </ul>
          </div>
        </div>

        {/* 6. تفاصيل إحصاء المتروك */}
        <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-300 space-y-4">
          <h3 className="text-lg font-bold text-amber-900">6. تفاصيل إحصاء المتروك</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات عن نوع الإحصاء وتوزيع النصيب.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع الإحصاء *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={inventoryDetails.inventoryType || ''}
                onChange={(e) => updateInventoryDetails({ inventoryType: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="كامل">كامل</option>
                <option value="جزئي">جزئي</option>
                <option value="عقاري">عقاري</option>
                <option value="منقول">منقول</option>
                <option value="نقدي">نقدي</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ إعداد الإحصاء *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={inventoryDetails.inventoryDate || ''}
                onChange={(e) => updateInventoryDetails({ inventoryDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">قيمة الممتلكات الإجمالية (بالدرهم)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={inventoryDetails.totalValue || ''}
                onChange={(e) => updateInventoryDetails({ totalValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">تقسيم المستحقات (يحسب التطبيق النسب القانونية)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="سيتم حساب النصيب الشرعي لكل وريث تلقائياً..."
                value={inventoryDetails.shareDistribution || ''}
                onChange={(e) => updateInventoryDetails({ shareDistribution: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">ملاحظات خاصة (حقوق مشروطة أو رهون)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={inventoryDetails.specialNotes || ''}
                onChange={(e) => updateInventoryDetails({ specialNotes: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-amber-900 mb-2">أسئلة ذكية للإحصاء:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={inventoryDetails.hasSharedProperties || false}
                onChange={(e) => updateInventoryDetails({ hasSharedProperties: e.target.checked })}
              />
              <span>هل هناك ممتلكات مشتركة بين الورثة؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={inventoryDetails.hasPriorWill || false}
                onChange={(e) => updateInventoryDetails({ hasPriorWill: e.target.checked })}
              />
              <span>هل هناك وصية سابقة على المتروك؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={inventoryDetails.hasSeizedProperties || false}
                onChange={(e) => updateInventoryDetails({ hasSeizedProperties: e.target.checked })}
              />
              <span>هل هناك ممتلكات محجوزة؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={inventoryDetails.hasWaqfProperties || false}
                onChange={(e) => updateInventoryDetails({ hasWaqfProperties: e.target.checked })}
              />
              <span>هل هناك ممتلكات محبسة؟</span>
            </label>
          </div>
        </div>

        {/* 7. التنبيهات والتحذيرات الذكية */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
          <h3 className="text-lg font-bold text-red-900">7. التنبيهات والتحذيرات الذكية</h3>
          <p className="text-xs text-gray-700 mb-2">فحوصات تلقائية للتحقق من صحة الإحصاء قانونياً.</p>

          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.sharedPropertiesNeedConsent || false}
                onChange={(e) => updateSmartChecks({ sharedPropertiesNeedConsent: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ الممتلكات المشاعة</span>
                <span className="text-xs text-gray-600">يجب موافقة جميع الشركاء (المادة 255)</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.waqfPropertiesNeedApproval || false}
                onChange={(e) => updateSmartChecks({ waqfPropertiesNeedApproval: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ الممتلكات المحبسة</span>
                <span className="text-xs text-gray-600">تحتاج موافقة المجلس العلمي أو الجهة الإدارية المختصة</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.minorsNeedGuardian || false}
                onChange={(e) => updateSmartChecks({ minorsNeedGuardian: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ القاصرون</span>
                <span className="text-xs text-gray-600">يجب تسجيل وصي قانوني قبل قبول الإحصاء (المادة 243)</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.hasCreditorRights || false}
                onChange={(e) => updateSmartChecks({ hasCreditorRights: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-red-700">⚠️ حقوق الدائنين</span>
                <span className="text-xs text-gray-600">إذا كان المتوفى عليه ديون، التطبيق يحذر قبل التوزيع</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.hasWillOnEstate || false}
                onChange={(e) => updateSmartChecks({ hasWillOnEstate: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ الوصايا</span>
                <span className="text-xs text-gray-600">يجب الإشارة لأي وصية على المتروك قبل توزيع المتروك</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.valuationMismatch || false}
                onChange={(e) => updateSmartChecks({ valuationMismatch: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ القيمة القانونية للممتلكات</span>
                <span className="text-xs text-gray-600">التطبيق يضع تنبيه عند اختلاف التقييم مع السندات</span>
              </div>
            </label>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 5 }))}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
          >
            التالي: الشهود
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Will Deed Details (رسم وصية)
  // ============================================================================

export const EstateInventoryWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_EstateInventory state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
