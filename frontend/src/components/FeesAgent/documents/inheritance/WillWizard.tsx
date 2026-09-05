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

  export const Step3_Will_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const will = state.willDeed || {};

    const updateWill = <K extends keyof WillDeed>(field: K, value: WillDeed[K]) => {
      setState((prev) => ({
        ...prev,
        willDeed: {
          ...(prev.willDeed || {}),
          [field]: value,
        },
      }));
    };

    const testator = will.testator || {};
    const updateTestator = (patch: Partial<NonNullable<WillDeed['testator']>>) => {
      updateWill('testator', { ...testator, ...patch } as any);
    };

    const heirs = will.heirs || [];
    const updateHeirs = (newHeirs: typeof heirs) => {
      updateWill('heirs', newHeirs);
    };

    const property = will.property || {};
    const updateProperty = (patch: Partial<NonNullable<WillDeed['property']>>) => {
      updateWill('property', { ...property, ...patch } as any);
    };

    const willDetails = will.willDetails || {};
    const updateWillDetails = (patch: Partial<NonNullable<WillDeed['willDetails']>>) => {
      updateWill('willDetails', { ...willDetails, ...patch } as any);
    };

    const witnessesData = will.witnessesData || {};
    const updateWitnessesData = (patch: Partial<NonNullable<WillDeed['witnessesData']>>) => {
      updateWill('witnessesData', { ...witnessesData, ...patch } as any);
    };

    const smartChecks = will.smartChecks || {};
    const updateSmartChecks = (patch: Partial<NonNullable<WillDeed['smartChecks']>>) => {
      updateWill('smartChecks', { ...smartChecks, ...patch } as any);
    };

    const smartAnswers = will.smartAnswers || {};
    const updateSmartAnswers = (patch: Partial<NonNullable<WillDeed['smartAnswers']>>) => {
      updateWill('smartAnswers', { ...smartAnswers, ...patch } as any);
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-purple-50 p-6 rounded-lg border-r-4 border-purple-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تهييء رسم الوصية</h2>
          <p className="text-gray-700 leading-relaxed">
            الوصية تصرف قانوني يخول للشخص (الموصي) توزيع جزء من ممتلكاته (الثلث غالبًا) على ورثته أو غيرهم بعد وفاته، وفق أحكام مدونة الأسرة والحقوق العينية.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-purple-800">
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">مرجعية: مدونة الأسرة (الكتاب السادس)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">مدونة الحقوق العينية 39.08 (المواد 142-147، 239، 243-255)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-purple-200">قانون الالتزامات والعقود (المادة 327-329)</span>
          </div>
        </div>

        {/* 1. بيانات الواصي/الموصي */}
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-300 space-y-4">
          <h3 className="text-lg font-bold text-blue-900">1. بيانات الواصي / الموَصي</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشخص الذي يُنشئ الوصية.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={testator.fullName || ''}
                onChange={(e) => updateTestator({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ الولادة *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={testator.dateOfBirth || ''}
                onChange={(e) => updateTestator({ dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">مكان الولادة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={testator.placeOfBirth || ''}
                onChange={(e) => updateTestator({ placeOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={testator.nationality || ''}
                onChange={(e) => updateTestator({ nationality: e.target.value as any })}
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
                value={testator.maritalStatus || ''}
                onChange={(e) => updateTestator({ maritalStatus: e.target.value as any })}
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
                value={testator.idNumber || ''}
                onChange={(e) => updateTestator({ idNumber: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">العنوان الكامل *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={testator.address || ''}
                onChange={(e) => updateTestator({ address: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">المهنة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={testator.profession || ''}
                onChange={(e) => updateTestator({ profession: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-blue-900 mb-2">الأسئلة الذكية:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={testator.isActualManager || false}
                onChange={(e) => updateTestator({ isActualManager: e.target.checked })}
              />
              <span>هل الواصي متصرف فعلي أم وصي على العقار؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={testator.isLegallyCapable || false}
                onChange={(e) => updateTestator({ isLegallyCapable: e.target.checked })}
              />
              <span>هل الموَصي قادر قانونياً على التصرف في ممتلكاته؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={testator.hasMarriageContract || false}
                onChange={(e) => updateTestator({ hasMarriageContract: e.target.checked })}
              />
              <span>هل يوجد عقد زواج يؤثر على توزيع الإرث؟</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={testator.hasDivorceAffectingInheritance || false}
                onChange={(e) => updateTestator({ hasDivorceAffectingInheritance: e.target.checked })}
              />
              <span>هل يوجد طلاق يؤثر على توزيع الإرث؟</span>
            </label>
          </div>
        </div>

        {/* 2. بيانات الورثة/المستفيدين */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
          <h3 className="text-lg font-bold text-green-900">2. بيانات الورثة / المستفيدين</h3>
          <p className="text-xs text-gray-700 mb-2">حدد الورثة أو المستفيدين من الوصية مع نصيب كل منهم.</p>

          {heirs.map((heir, index) => (
            <div key={index} className="bg-white border border-green-200 rounded-lg p-4 relative">
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
                  <label className="block font-semibold text-gray-700 mb-1">صلة القرابة</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={heir.relationToTestator || ''}
                    onChange={(e) => {
                      const newHeirs = [...heirs];
                      newHeirs[index] = { ...heir, relationToTestator: e.target.value as any };
                      updateHeirs(newHeirs);
                    }}
                  >
                    <option value="">اختر...</option>
                    <option value="ابن">ابن</option>
                    <option value="ابنة">ابنة</option>
                    <option value="شقيق">شقيق</option>
                    <option value="شقيقة">شقيقة</option>
                    <option value="أخ">أخ</option>
                    <option value="أخت">أخت</option>
                    <option value="آخر">آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">النصيب المخصص</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="مثال: الثلث، الربع، 25%"
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
            onClick={() => updateHeirs([...heirs, { fullName: '', dateOfBirth: '', nationality: '', idNumber: '', relationToTestator: '', isMinor: false, share: '' }])}
            className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            + إضافة وريث
          </button>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-xs space-y-2">
            <p className="font-semibold text-amber-900 mb-1">الأسئلة الذكية للورثة:</p>
            <div className="grid md:grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <span>هل الورثة ذكور أم إناث؟</span>
                <select
                  className="px-2 py-1 border rounded bg-white text-xs"
                  value={smartAnswers.heirsAreMaleOrFemale || ''}
                  onChange={(e) => updateSmartAnswers({ heirsAreMaleOrFemale: e.target.value as any })}
                >
                  <option value="">—</option>
                  <option value="ذكور">ذكور</option>
                  <option value="إناث">إناث</option>
                  <option value="كلاهما">كلاهما</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.multipleHeirs || false}
                  onChange={(e) => updateSmartAnswers({ multipleHeirs: e.target.checked })}
                />
                <span>هل هناك أكثر من وريث؟</span>
              </label>
            </div>
          </div>
        </div>

        {/* 3. بيانات العقار/الأملاك */}
        <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
          <h3 className="text-lg font-bold text-indigo-900">3. بيانات العقار / الأملاك موضوع الوصية</h3>
          <p className="text-xs text-gray-700 mb-2">حدد العقار أو الأملاك المشمولة بالوصية.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع العقار</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={property.propertyType || ''}
                onChange={(e) => updateProperty({ propertyType: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="حضري">حضري</option>
                <option value="فلاحي">فلاحي</option>
                <option value="سكني">سكني</option>
                <option value="تجاري">تجاري</option>
                <option value="مشاع">مشاع</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الملكية الأصلية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={property.originalOwnership || ''}
                onChange={(e) => updateProperty({ originalOwnership: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="شراء">شراء</option>
                <option value="إرث">إرث</option>
                <option value="مشاع">مشاع</option>
                <option value="محبس">محبس</option>
                <option value="محفظة">محفظة</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">عنوان العقار *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.address || ''}
                onChange={(e) => updateProperty({ address: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">المساحة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="مثال: 200 متر مربع"
                value={property.area || ''}
                onChange={(e) => updateProperty({ area: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">قيمة العقار (بالدرهم)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.propertyValue || ''}
                onChange={(e) => updateProperty({ propertyValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">الحدود والمساحة</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="حدود العقار الأربعة..."
                value={property.boundaries || ''}
                onChange={(e) => updateProperty({ boundaries: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-indigo-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-indigo-900 mb-2">نوع الوصية وتوزيع العقار:</p>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع الوصية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={property.willType || ''}
                onChange={(e) => updateProperty({ willType: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="ثلث">الثلث</option>
                <option value="ربع">الربع</option>
                <option value="خمس">الخمس</option>
                <option value="معين">معين (حصة محددة)</option>
                <option value="تنزيل">تنزيل</option>
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fullOrPart"
                  className="w-4 h-4"
                  checked={property.fullPropertyOrPart === 'كامل'}
                  onChange={() => updateProperty({ fullPropertyOrPart: 'كامل' })}
                />
                <span>الوصية تخص العقار بالكامل</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fullOrPart"
                  className="w-4 h-4"
                  checked={property.fullPropertyOrPart === 'جزء'}
                  onChange={() => updateProperty({ fullPropertyOrPart: 'جزء' })}
                />
                <span>الوصية تخص جزء من العقار</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={property.malesOnly || false}
                  onChange={(e) => updateProperty({ malesOnly: e.target.checked })}
                />
                <span>الوصية للذكور فقط</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={property.femalesOnly || false}
                  onChange={(e) => updateProperty({ femalesOnly: e.target.checked })}
                />
                <span>الوصية للإناث فقط</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={property.allHeirs || false}
                  onChange={(e) => updateProperty({ allHeirs: e.target.checked })}
                />
                <span>الوصية لجميع الورثة</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. بيانات الوصية */}
        <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-300 space-y-4">
          <h3 className="text-lg font-bold text-amber-900">4. بيانات الوصية</h3>
          <p className="text-xs text-gray-700 mb-2">تفاصيل الوصية والشروط المتعلقة بها.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع الوصية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={willDetails.willType || ''}
                onChange={(e) => updateWillDetails({ willType: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="ثلث">الثلث</option>
                <option value="ربع">الربع</option>
                <option value="خمس">الخمس</option>
                <option value="معين">معين</option>
                <option value="تنزيل">تنزيل</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ الوصية *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={willDetails.willDate || ''}
                onChange={(e) => updateWillDetails({ willDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={willDetails.isAccepted || false}
                  onChange={(e) => updateWillDetails({ isAccepted: e.target.checked })}
                />
                <span className="font-semibold text-green-700">قبول الوصية من الورثة</span>
              </label>
              {willDetails.isAccepted && (
                <div className="mt-2">
                  <label className="block font-semibold text-gray-700 mb-1">تاريخ القبول</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={willDetails.acceptanceDate || ''}
                    onChange={(e) => updateWillDetails({ acceptanceDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">نص الوصية / التفاصيل</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={4}
                placeholder="أدخل تفاصيل الوصية والشروط (مثل تزويج الإناث، إدارة العقار، عدم البيع، إلخ.)"
                value={willDetails.willText || ''}
                onChange={(e) => updateWillDetails({ willText: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-sm space-y-3">
            <p className="font-semibold text-amber-900 mb-2">تفاصيل إضافية:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={willDetails.hasGuardianForMinor || false}
                onChange={(e) => updateWillDetails({ hasGuardianForMinor: e.target.checked })}
              />
              <span>يوجد وصي على القاصر / نيابة قانونية؟</span>
            </label>
            {willDetails.hasGuardianForMinor && (
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-xs"
                rows={2}
                placeholder="تفاصيل الوصي والنيابة القانونية..."
                value={willDetails.guardianDetails || ''}
                onChange={(e) => updateWillDetails({ guardianDetails: e.target.value })}
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="generalOrSpecific"
                className="w-4 h-4"
                checked={willDetails.isGeneralWill === true}
                onChange={() => updateWillDetails({ isGeneralWill: true })}
              />
              <span>وصية عامة (تشمل كل العقارات)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="generalOrSpecific"
                className="w-4 h-4"
                checked={willDetails.isGeneralWill === false}
                onChange={() => updateWillDetails({ isGeneralWill: false })}
              />
              <span>وصية تخص عقارات معينة فقط</span>
            </label>
            {willDetails.isGeneralWill === false && (
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-xs"
                rows={2}
                placeholder="حدد العقارات المعنية..."
                value={willDetails.specificProperties || ''}
                onChange={(e) => updateWillDetails({ specificProperties: e.target.value })}
              />
            )}
          </div>

          <div className="mt-4 bg-white border border-red-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-red-900 mb-2">الشروط الخاصة:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={willDetails.hasSpecialConditions || false}
                onChange={(e) => updateWillDetails({ hasSpecialConditions: e.target.checked })}
              />
              <span>يوجد شروط خاصة في الوصية</span>
            </label>
            {willDetails.hasSpecialConditions && (
              <div className="space-y-2 mt-2 ml-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={willDetails.conditionMarriage || false}
                    onChange={(e) => updateWillDetails({ conditionMarriage: e.target.checked })}
                  />
                  <span>شرط تزويج الإناث</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={willDetails.conditionEducation || false}
                    onChange={(e) => updateWillDetails({ conditionEducation: e.target.checked })}
                  />
                  <span>شرط التعليم</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={willDetails.conditionNoSale || false}
                    onChange={(e) => updateWillDetails({ conditionNoSale: e.target.checked })}
                  />
                  <span>منع البيع</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={willDetails.conditionMortgage || false}
                    onChange={(e) => updateWillDetails({ conditionMortgage: e.target.checked })}
                  />
                  <span>الرهن</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg text-xs mt-2"
                  rows={2}
                  placeholder="تفاصيل إضافية حول الشروط..."
                  value={willDetails.conditionsText || ''}
                  onChange={(e) => updateWillDetails({ conditionsText: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. الشهود والتوثيق */}
        <div className="bg-teal-50 p-6 rounded-lg border-l-4 border-teal-300 space-y-4">
          <h3 className="text-lg font-bold text-teal-900">5. الشهود والتوثيق</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشهود وتوقيعات الأطراف.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">أسماء الشهود (مع أرقام البطاقات)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="الشاهد الأول: ... رقم البطاقة ..."
                value={witnessesData.witnessNames || ''}
                onChange={(e) => updateWitnessesData({ witnessNames: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ تحرير الوصية</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={witnessesData.draftDate || ''}
                onChange={(e) => updateWitnessesData({ draftDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">وقت تحرير الوصية</label>
              <input
                type="time"
                className="w-full px-3 py-2 border rounded-lg"
                value={witnessesData.draftTime || ''}
                onChange={(e) => updateWitnessesData({ draftTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">دفتر التركات / السجل العدلي</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={witnessesData.estateRegistry || ''}
                onChange={(e) => updateWitnessesData({ estateRegistry: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">رقم السجل العدلي</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={witnessesData.notaryRegister || ''}
                onChange={(e) => updateWitnessesData({ notaryRegister: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-teal-200 rounded-lg p-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={witnessesData.signaturesUploaded || false}
                onChange={(e) => updateWitnessesData({ signaturesUploaded: e.target.checked })}
              />
              <span className="font-semibold">تم رفع التوقيعات / الوثائق المطلوبة</span>
            </label>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <p className="font-bold mb-1">⚠️ تنبيهات:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>يجب مطابقة أسماء الورثة والشهود مع بطاقات الهوية.</li>
              <li>يجب الالتزام بالحد القانوني للثلث أو النسب المعينة.</li>
              <li>إذا كان الوريث قاصراً، يجب توقيع الوصي القانوني.</li>
            </ul>
          </div>
        </div>

        {/* 6. التنبيهات والفحوصات الذكية */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
          <h3 className="text-lg font-bold text-red-900">6. التنبيهات والفحوصات الذكية</h3>
          <p className="text-xs text-gray-700 mb-2">فحوصات تلقائية للتحقق من صحة الوصية قانونياً.</p>

          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.ratiosCalculated || false}
                onChange={(e) => updateSmartChecks({ ratiosCalculated: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-green-700">✓ النسب (الثلث/الربع/الخمس) محسوبة تلقائياً</span>
                <span className="text-xs text-gray-600">التطبيق يحسب النصيب الشرعي لكل وريث تلقائياً</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.hasDesignatedShares || false}
                onChange={(e) => updateSmartChecks({ hasDesignatedShares: e.target.checked })}
              />
              <div>
                <span className="block font-semibold">الوصايا المعينة</span>
                <span className="text-xs text-gray-600">يمكن تحديد حصة معينة لأي وريث، لكن لا تتجاوز حصته الشرعية</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.minorNeedsGuardian || false}
                onChange={(e) => updateSmartChecks({ minorNeedsGuardian: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ القاصرون</span>
                <span className="text-xs text-gray-600">يجب تعيين وصي قانوني لقبول الوصية</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.malesEqualFemales || false}
                onChange={(e) => updateSmartChecks({ malesEqualFemales: e.target.checked })}
              />
              <div>
                <span className="block font-semibold">الذكور والإناث</span>
                <span className="text-xs text-gray-600">الذكر كالأنثى حسب القانون الشرعي، والتطبيق يحسب تلقائياً</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.hasConditionalWill || false}
                onChange={(e) => updateSmartChecks({ hasConditionalWill: e.target.checked })}
              />
              <div>
                <span className="block font-semibold">الوصايا المشروطة</span>
                <span className="text-xs text-gray-600">مثل تزويج الإناث، إدارة العقار، أو منع البيع</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.multipleWillsConflict || false}
                onChange={(e) => updateSmartChecks({ multipleWillsConflict: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-red-700">⚠️ الوصايا المتعددة</span>
                <span className="text-xs text-gray-600">إذا هناك أكثر من وصية على نفس العقار، التطبيق يحذر من التضارب</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.exceedsLegalLimit || false}
                onChange={(e) => updateSmartChecks({ exceedsLegalLimit: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-red-700">⚠️ الوصية خارج الحدود القانونية</span>
                <span className="text-xs text-gray-600">أي وصية تتجاوز الثلث أو نصيب الورثة</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.exceedsThird || false}
                onChange={(e) => updateSmartChecks({ exceedsThird: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-red-700">⚠️ تجاوز الثلث</span>
                <span className="text-xs text-gray-600">المادة 142-147 مدونة الحقوق العينية: الوصية لا تنفذ إلا في حدود الثلث</span>
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
            onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
          >
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Waqf/Habous Contract Details (عقد تحبيس)
  // ============================================================================

export const WillWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_Will_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
