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

  export const Step3_PromiseToSell: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const promise = state.promiseToSell || {};

    const updatePromise = <K extends keyof PromiseToSell>(field: K, value: PromiseToSell[K]) => {
      setState((prev) => ({
        ...prev,
        promiseToSell: {
          ...(prev.promiseToSell || {}),
          [field]: value,
        },
      }));
    };

    const seller = promise.seller || {};
    const updateSeller = (patch: Partial<NonNullable<PromiseToSell['seller']>>) => {
      updatePromise('seller', { ...seller, ...patch } as any);
    };

    const buyer = promise.buyer || {};
    const updateBuyer = (patch: Partial<NonNullable<PromiseToSell['buyer']>>) => {
      updatePromise('buyer', { ...buyer, ...patch } as any);
    };

    const property = promise.property || {};
    const updateProperty = (patch: Partial<NonNullable<PromiseToSell['property']>>) => {
      updatePromise('property', { ...property, ...patch } as any);
    };

    const terms = promise.promiseTerms || {};
    const updateTerms = (patch: Partial<NonNullable<PromiseToSell['promiseTerms']>>) => {
      updatePromise('promiseTerms', { ...terms, ...patch } as any);
    };

    const agent = promise.agent || {};
    const updateAgent = (patch: Partial<NonNullable<PromiseToSell['agent']>>) => {
      updatePromise('agent', { ...agent, ...patch } as any);
    };

    const witnesses = promise.witnesses || {};
    const updateWitnesses = (patch: Partial<NonNullable<PromiseToSell['witnesses']>>) => {
      updatePromise('witnesses', { ...witnesses, ...patch } as any);
    };

    const smartChecks = promise.smartChecks || {};
    const updateSmartChecks = (patch: Partial<NonNullable<PromiseToSell['smartChecks']>>) => {
      updatePromise('smartChecks', { ...smartChecks, ...patch } as any);
    };

    const smartAnswers = promise.smartAnswers || {};
    const updateSmartAnswers = (patch: Partial<NonNullable<PromiseToSell['smartAnswers']>>) => {
      updatePromise('smartAnswers', { ...smartAnswers, ...patch } as any);
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-sky-50 p-6 rounded-lg border-r-4 border-sky-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تهييء رسم وعد بالبيع</h2>
          <p className="text-gray-700 leading-relaxed">
            وعد البيع هو عقد ملزم يتضمن التزام البائع بالتصرف في العقار للمشتري مقابل دفع عربون (دفعة مسبقة) مع تحديد أجل نهائي لإتمام البيع النهائي.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-800">
            <span className="px-3 py-1 rounded-full bg-white border border-sky-200">المادة 574–578 قانون الالتزامات والعقود</span>
            <span className="px-3 py-1 rounded-full bg-white border border-sky-200">المادة 584–586 (العربون)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-sky-200">مدونة الحقوق العينية 39.08</span>
          </div>
        </div>

        {/* 1. بيانات الأطراف */}
        <div className="space-y-6">
          {/* أ. الملتزم بالبيع (البائع) */}
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-300 space-y-4">
            <h3 className="text-lg font-bold text-blue-900">1. أ. بيانات الملتزم بالبيع (البائع)</h3>
            <p className="text-xs text-gray-700 mb-2">معلومات البائع المتعهد بالبيع.</p>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={seller.fullName || ''}
                  onChange={(e) => updateSeller({ fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">تاريخ الولادة</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={seller.dateOfBirth || ''}
                  onChange={(e) => updateSeller({ dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">مكان الولادة</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={seller.placeOfBirth || ''}
                  onChange={(e) => updateSeller({ placeOfBirth: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  value={seller.nationality || ''}
                  onChange={(e) => updateSeller({ nationality: e.target.value as any })}
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
                  value={seller.idNumber || ''}
                  onChange={(e) => updateSeller({ idNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">صلة البائع بالممتلك</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  value={seller.relationToProperty || ''}
                  onChange={(e) => updateSeller({ relationToProperty: e.target.value as any })}
                >
                  <option value="">اختر...</option>
                  <option value="مالك">مالك</option>
                  <option value="وصي">وصي</option>
                  <option value="ممثل_قانوني">ممثل قانوني</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">العنوان الكامل *</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  value={seller.address || ''}
                  onChange={(e) => updateSeller({ address: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 bg-white border border-blue-200 rounded-lg p-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={seller.isCapable || false}
                  onChange={(e) => updateSeller({ isCapable: e.target.checked })}
                />
                <span className="font-semibold">هل البائع قادر قانوناً على التصرف في العقار؟ (بالغ وعاقل)</span>
              </label>
            </div>
          </div>

          {/* ب. المتعهد له بالبيع (المشتري) */}
          <div className="bg-emerald-50 p-6 rounded-lg border-l-4 border-emerald-300 space-y-4">
            <h3 className="text-lg font-bold text-emerald-900">1. ب. بيانات المتعهد له بالبيع (المشتري)</h3>
            <p className="text-xs text-gray-700 mb-2">معلومات المشتري المتعهد له بالبيع.</p>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={buyer.fullName || ''}
                  onChange={(e) => updateBuyer({ fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">تاريخ الولادة</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={buyer.dateOfBirth || ''}
                  onChange={(e) => updateBuyer({ dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">مكان الولادة</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={buyer.placeOfBirth || ''}
                  onChange={(e) => updateBuyer({ placeOfBirth: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">الجنسية</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  value={buyer.nationality || ''}
                  onChange={(e) => updateBuyer({ nationality: e.target.value as any })}
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
                  value={buyer.idNumber || ''}
                  onChange={(e) => updateBuyer({ idNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">صلة المشتري بالممتلك</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  value={buyer.relationToProperty || ''}
                  onChange={(e) => updateBuyer({ relationToProperty: e.target.value as any })}
                >
                  <option value="">اختر...</option>
                  <option value="قريب">قريب</option>
                  <option value="وصي">وصي</option>
                  <option value="محايد">محايد</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">العنوان الكامل *</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  value={buyer.address || ''}
                  onChange={(e) => updateBuyer({ address: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 bg-white border border-emerald-200 rounded-lg p-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={buyer.isCapable || false}
                  onChange={(e) => updateBuyer({ isCapable: e.target.checked })}
                />
                <span className="font-semibold">هل المشتري قادر قانوناً على التصرف؟</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. بيانات العقار */}
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-4">
          <h3 className="text-lg font-bold text-purple-900">2. بيانات العقار / الممتلك</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات تفاصيلية عن العقار موضوع البيع.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع العقار *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={property.propertyType || ''}
                onChange={(e) => updateProperty({ propertyType: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="حضري">حضري</option>
                <option value="فلاحي">فلاحي</option>
                <option value="تجاري">تجاري</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">سجل الأملاك / السند *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.registryOrDeed || ''}
                onChange={(e) => updateProperty({ registryOrDeed: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">الموقع / العنوان *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.address || ''}
                onChange={(e) => updateProperty({ address: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحدود</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.boundaries || ''}
                onChange={(e) => updateProperty({ boundaries: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">المساحة</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="مثال: 200 م²"
                value={property.area || ''}
                onChange={(e) => updateProperty({ area: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">القيمة الإجمالية (بالدرهم) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.totalValue || ''}
                onChange={(e) => updateProperty({ totalValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">حالة العقار</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={property.status || ''}
                onChange={(e) => updateProperty({ status: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="مؤجر">مؤجر</option>
                <option value="محبس">محبس</option>
                <option value="مرهون">مرهون</option>
                <option value="حر">حر</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">الحقوق والرهونات القائمة</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.encumbrances || ''}
                onChange={(e) => updateProperty({ encumbrances: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={property.isShared || false}
                  onChange={(e) => updateProperty({ isShared: e.target.checked })}
                />
                <span>هل العقار ملكية مشاعة؟</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={property.hasWill || false}
                  onChange={(e) => updateProperty({ hasWill: e.target.checked })}
                />
                <span>هل هناك وصية أو نصيب للورثة على العقار؟</span>
              </label>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <p className="font-bold mb-1">⚠️ تنبيهات:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>يجب التحقق من ملكية البائع من خلال سند الملكية.</li>
              <li>إذا كان العقار محبوساً أو مرهوناً، يجب استخراج موافقة رسمية قبل البيع.</li>
            </ul>
          </div>
        </div>

        {/* 3. شروط وعد البيع */}
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-300 space-y-4">
          <h3 className="text-lg font-bold text-orange-900">3. شروط وعد البيع</h3>
          <p className="text-xs text-gray-700 mb-2">التفاصيل المالية والزمنية للعقد.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">مبلغ العربون / الدفعة المسبقة (بالدرهم) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={terms.earnestMoney || ''}
                onChange={(e) => updateTerms({ earnestMoney: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">سعر البيع الكلي (بالدرهم) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={terms.totalPrice || ''}
                onChange={(e) => updateTerms({ totalPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">طريقة الدفع</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={terms.paymentMethod || ''}
                onChange={(e) => updateTerms({ paymentMethod: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="نقد">نقد</option>
                <option value="تحويل_بنكي">تحويل بنكي</option>
                <option value="شيك">شيك</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الأجل النهائي لإتمام البيع *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={terms.finalDeadline || ''}
                onChange={(e) => updateTerms({ finalDeadline: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">شروط إنهاء العقد / استرجاع العربون</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={terms.terminationCondition || ''}
                onChange={(e) => updateTerms({ terminationCondition: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">ضمانات البائع</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={terms.sellerGuarantees || ''}
                onChange={(e) => updateTerms({ sellerGuarantees: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">ملاحظات عن صلاحيات الوكيل (إن وجد)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={terms.agentAuthority || ''}
                onChange={(e) => updateTerms({ agentAuthority: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-red-200 rounded-lg p-4 text-xs space-y-2">
            <p className="font-semibold text-red-900 mb-1">⚠️ تنبيهات ذكية:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.earnestRefundable || false}
                  onChange={(e) => updateSmartAnswers({ earnestRefundable: e.target.checked })}
                />
                <span>هل العربون قابل للاسترجاع في حال عدم التزام البائع؟</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smartAnswers.buyerBreachLosesEarnest || false}
                  onChange={(e) => updateSmartAnswers({ buyerBreachLosesEarnest: e.target.checked })}
                />
                <span>هل يفقد المشتري العربون عند عدم التزامه بالبيع النهائي؟</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. بيانات الوكيل (إن وجد) */}
        <div className="bg-cyan-50 p-6 rounded-lg border-l-4 border-cyan-300 space-y-4">
          <h3 className="text-lg font-bold text-cyan-900">4. بيانات الوكيل (إن وجد)</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الوكيل في حالة توكيل أحد الأطراف.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">اسم الوكيل</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={agent.name || ''}
                onChange={(e) => updateAgent({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تاريخ التوكيل</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={agent.authorizationDate || ''}
                onChange={(e) => updateAgent({ authorizationDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">جهة التوكيل (التوثيق الرسمي)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={agent.authorizingParty || ''}
                onChange={(e) => updateAgent({ authorizingParty: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">هل التوكالة محددة بمدة؟</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={agent.isTimeLimited ? 'نعم' : 'لا'}
                onChange={(e) => updateAgent({ isTimeLimited: e.target.value === 'نعم' })}
              >
                <option value="لا">لا (غير محددة)</option>
                <option value="نعم">نعم (محددة بمدة)</option>
              </select>
            </div>
            {agent.isTimeLimited && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">تاريخ انتهاء التوكالة</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={agent.expiryDate || ''}
                  onChange={(e) => updateAgent({ expiryDate: e.target.value })}
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">نطاق التوكيل (البيع، الإصلاح، التصرف بالمرافق)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={agent.authorizationScope || ''}
                onChange={(e) => updateAgent({ authorizationScope: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-cyan-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-cyan-900 mb-2">أسئلة ذكية:</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={smartChecks.agentAuthorityExpired || false}
                onChange={(e) => updateSmartChecks({ agentAuthorityExpired: e.target.checked })}
              />
              <span>هل صلاحية الوكيل لم تنتهِ؟</span>
            </label>
          </div>
        </div>

        {/* 5. بيانات الشهود */}
        <div className="bg-rose-50 p-6 rounded-lg border-l-4 border-rose-300 space-y-4">
          <h3 className="text-lg font-bold text-rose-900">5. بيانات الشهود</h3>
          <p className="text-xs text-gray-700 mb-2">معلومات الشهود على العقد.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">أسماء الشهود (مع أرقام البطاقات) *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="الشاهد الأول: ... رقم البطاقة ..."
                value={witnesses.witnessNames || ''}
                onChange={(e) => updateWitnesses({ witnessNames: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">محل إقامة الشهود</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={witnesses.witnessResidences || ''}
                onChange={(e) => updateWitnesses({ witnessResidences: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-rose-200 rounded-lg p-4 text-sm">
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
              <li>الشهود لا يمكن أن يكونوا أطرافاً في العقد أو مستفيدين.</li>
              <li>يجب أن يكونوا عارفين بالممتلك والأطراف.</li>
            </ul>
          </div>
        </div>

        {/* 6. التنبيهات والتحذيرات الذكية */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
          <h3 className="text-lg font-bold text-red-900">6. التنبيهات والتحذيرات الذكية</h3>
          <p className="text-xs text-gray-700 mb-2">فحوصات تلقائية للتحقق من صحة العقد قانونياً.</p>

          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.deadlineExceeded || false}
                onChange={(e) => updateSmartChecks({ deadlineExceeded: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ المهلة الزمنية</span>
                <span className="text-xs text-gray-600">يجب تحديد أجل نهائي لإتمام البيع (المادة 573)</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.earnestNotPaid || false}
                onChange={(e) => updateSmartChecks({ earnestNotPaid: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ العربون لم يُسدد</span>
                <span className="text-xs text-gray-600">التحذير من فقدان العقد إذا لم يتم دفع العربون</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.propertyEncumbered || false}
                onChange={(e) => updateSmartChecks({ propertyEncumbered: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-red-700">⚠️ الممتلك محبوس/مرهون</span>
                <span className="text-xs text-gray-600">يجب استخراج موافقة رسمية قبل البيع (المادة 246–247)</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={smartChecks.minorInvolved || false}
                onChange={(e) => updateSmartChecks({ minorInvolved: e.target.checked })}
              />
              <div>
                <span className="block font-semibold text-amber-700">⚠ قاصر متورط</span>
                <span className="text-xs text-gray-600">إذا كان أحد الأطراف قاصراً، يجب تعيين وصي قانوني</span>
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
                <span className="block font-semibold text-amber-700">⚠ القيمة القانونية</span>
                <span className="text-xs text-gray-600">تنبيه عند اختلاف القيمة السوقية مع السندات الرسمية</span>
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
            className="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700"
          >
            التالي: التمويل
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Proof of Estate Details (رسم ثبوت مخلف)
  // ============================================================================

export const PromiseToSellWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_PromiseToSell state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
