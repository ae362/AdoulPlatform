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

  export const Step3_LineageProofByHearsay_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updateLineageProof = (field: string, value: any) => {
      setState(prev => ({
        ...prev,
        lineageProofByHearsay: {
          ...prev.lineageProofByHearsay,
          [field]: value
        }
      }));
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <span className="text-3xl">⚖️</span>
            ثبوت نسب ببينة السماع
          </h2>
          <p className="text-teal-100">إثبات النسب عن طريق الشهادة والسماع الفاشي المستفيض</p>
        </div>

        {/* Auto Alert for Legal Conflicts */}
        {(state.lineageProofByHearsay?.hasOpenLawsuit === 'نعم' || state.lineageProofByHearsay?.hasPreviousJudgment === 'نعم') && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚫</span>
              <div>
                <p className="text-red-900 font-bold text-lg">تنبيه تلقائي أحمر</p>
                <p className="text-red-800">يُمنع تلقي السماع في حالة وجود حكم قضائي سابق أو دعوى مفتوحة (منعاً للتعارض القضائي)</p>
              </div>
            </div>
          </div>
        )}

        {/* 1. Subject of Lineage */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-cyan-400">
          <h3 className="text-xl font-bold mb-4 text-cyan-700 flex items-center gap-2">
            <span>1️⃣</span>
            <span>موضوع النسب</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأب المدعى نسبه</label>
              <input
                type="text"
                value={state.lineageProofByHearsay?.allegedFatherName || ''}
                onChange={(e) => updateLineageProof('allegedFatherName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأم</label>
              <input
                type="text"
                value={state.lineageProofByHearsay?.motherName || ''}
                onChange={(e) => updateLineageProof('motherName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">علاقة الزواج أو عدمها</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.marriageRelationship === 'زواج_قائم'}
                    onChange={() => updateLineageProof('marriageRelationship', 'زواج_قائم')}
                    className="w-4 h-4"
                  />
                  <span>زواج قائم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.marriageRelationship === 'لا_يوجد_زواج'}
                    onChange={() => updateLineageProof('marriageRelationship', 'لا_يوجد_زواج')}
                    className="w-4 h-4"
                  />
                  <span>لا يوجد زواج</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.marriageRelationship === 'زواج_منتهي'}
                    onChange={() => updateLineageProof('marriageRelationship', 'زواج_منتهي')}
                    className="w-4 h-4"
                  />
                  <span>زواج منتهي (طلاق/وفاة)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ ولادة الطالب</label>
              <input
                type="date"
                value={state.lineageProofByHearsay?.childDateOfBirth || ''}
                onChange={(e) => updateLineageProof('childDateOfBirth', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* 2. Conditions for Accepting Hearsay */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
            <span>2️⃣</span>
            <span>شروط قبول سماع النسب</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">(سيساعد التطبيق في التحقق منها قبل تحرير العقد)</p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.hasWidespreadRumor === 'نعم'}
                  onChange={() => updateLineageProof('hasWidespreadRumor', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.hasWidespreadRumor === 'لا'}
                  onChange={() => updateLineageProof('hasWidespreadRumor', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ سماع فاشٍ مستفيض (لا مجرد إشاعة)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.hasCredibleWitnesses === 'نعم'}
                  onChange={() => updateLineageProof('hasCredibleWitnesses', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.hasCredibleWitnesses === 'لا'}
                  onChange={() => updateLineageProof('hasCredibleWitnesses', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ شهود عدول</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.witnessesHaveFullKnowledge === 'نعم'}
                  onChange={() => updateLineageProof('witnessesHaveFullKnowledge', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.witnessesHaveFullKnowledge === 'لا'}
                  onChange={() => updateLineageProof('witnessesHaveFullKnowledge', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ معرفة تامة بالأسرة</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.witnessesContemporary === 'نعم'}
                  onChange={() => updateLineageProof('witnessesContemporary', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.witnessesContemporary === 'لا'}
                  onChange={() => updateLineageProof('witnessesContemporary', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ معاصرون للوقائع</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.noContradictionInStatements === 'نعم'}
                  onChange={() => updateLineageProof('noContradictionInStatements', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.noContradictionInStatements === 'لا'}
                  onChange={() => updateLineageProof('noContradictionInStatements', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ عدم وجود تناقض في الأقوال</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.noOppositionToOfficialDocs === 'نعم'}
                  onChange={() => updateLineageProof('noOppositionToOfficialDocs', 'نعم')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={state.lineageProofByHearsay?.noOppositionToOfficialDocs === 'لا'}
                  onChange={() => updateLineageProof('noOppositionToOfficialDocs', 'لا')}
                  className="w-4 h-4"
                />
                <span className="font-semibold">لا</span>
              </label>
              <div className="flex-1">
                <p className="font-bold text-blue-900">✔ عدم معارضة لوثائق رسمية</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Judicial Status Check */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
          <h3 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
            <span>3️⃣</span>
            <span>الوضعية القضائية</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800 mb-2">هل يوجد حكم قضائي سابق حول النسب؟</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.hasPreviousJudgment === 'نعم'}
                    onChange={() => updateLineageProof('hasPreviousJudgment', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.hasPreviousJudgment === 'لا'}
                    onChange={() => updateLineageProof('hasPreviousJudgment', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>
            
            <div>
              <p className="font-semibold text-gray-800 mb-2">هل توجد دعوى قضائية مفتوحة حول النسب؟</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.hasOpenLawsuit === 'نعم'}
                    onChange={() => updateLineageProof('hasOpenLawsuit', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.lineageProofByHearsay?.hasOpenLawsuit === 'لا'}
                    onChange={() => updateLineageProof('hasOpenLawsuit', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Problematic Cases */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
          <h3 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">
            <span>4️⃣</span>
            <span>حالات إشكالية يجب كشفها</span>
          </h3>
          
          <div className="space-y-3">
            <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-300">
              <p className="font-bold text-orange-900 mb-2">🔸 إذا كانت الأم غير مزوّجة</p>
              <p className="text-sm text-gray-700">يضاف سؤال حول وسائل إضافية للإثبات</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-300">
              <p className="font-bold text-orange-900 mb-2">🔸 إذا كانت الأم مزوجة من غير الأب المنسوب</p>
              <p className="text-sm text-gray-700">تطبيق قاعدة الفراش (المادة 152–155 من مدونة الأسرة)</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-300">
              <p className="font-bold text-orange-900 mb-2">🔸 إذا توفي الأب</p>
              <p className="text-sm text-gray-700">يتحول الملف إلى تقدير مع شهرة الإرث</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-300">
              <p className="font-bold text-orange-900 mb-2">🔸 إذا كان الأب أجنبياً</p>
              <p className="text-sm text-gray-700">تثار إشكالات التوثيق والحالة المدنية</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-300">
              <p className="font-bold text-orange-900 mb-2">🔸 إذا كان النسب يحتاج لتسجيل بالحالة المدنية</p>
              <p className="text-sm text-gray-700">إضافة Workflow إداري</p>
            </div>
          </div>
        </div>

        {/* 5. Legal Warnings */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-l-4 border-red-400">
          <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            تنبيهات وتحذيرات قانونية
          </h4>
          <div className="space-y-3 text-sm">
            <div className="bg-white p-3 rounded border-l-2 border-red-400">
              <p className="font-bold text-red-900">⚠ تحذير 1:</p>
              <p className="text-gray-800">السماع لا يُقام إذا كان هناك نزاع قضائي مفتوح حول النسب (منعاً للتعارض)</p>
            </div>
            <div className="bg-white p-3 rounded border-l-2 border-red-400">
              <p className="font-bold text-red-900">⚠ تحذير 2:</p>
              <p className="text-gray-800">تقييده لا يساوي اعتراف الأب صراحة بل إثبات بحكم العادة والشهرة</p>
            </div>
            <div className="bg-white p-3 rounded border-l-2 border-red-400">
              <p className="font-bold text-red-900">⚠ تحذير 3:</p>
              <p className="text-gray-800">السماع لا يُستعمل لنقل نسب غير شرعي أو مخالف للشرع</p>
            </div>
            <div className="bg-white p-3 rounded border-l-2 border-red-400">
              <p className="font-bold text-red-900">⚠ تحذير 4:</p>
              <p className="text-gray-800">التسجيل بالحالة المدنية يبقى اختصاصاً إدارياً أو قضائياً لاحقاً</p>
            </div>
          </div>
        </div>

        {/* Legal Acknowledgments */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-l-4 border-green-500">
          <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
            <span>✅</span>
            الإقرارات القانونية المطلوبة:
          </h4>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.lineageProofByHearsay?.acknowledgeNoOpenDispute || false}
                onChange={(e) => updateLineageProof('acknowledgeNoOpenDispute', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بعدم وجود نزاع قضائي مفتوح حول النسب</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.lineageProofByHearsay?.acknowledgeHearsayNotDirectAcknowledgment || false}
                onChange={(e) => updateLineageProof('acknowledgeHearsayNotDirectAcknowledgment', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن السماع ليس اعتراف مباشر من الأب</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.lineageProofByHearsay?.acknowledgeNoIllegitimateLineage || false}
                onChange={(e) => updateLineageProof('acknowledgeNoIllegitimateLineage', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن السماع لا يُستعمل لنسب غير شرعي</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.lineageProofByHearsay?.acknowledgeCivilRegistrationSeparate || false}
                onChange={(e) => updateLineageProof('acknowledgeCivilRegistrationSeparate', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن التسجيل بالحالة المدنية اختصاص إداري/قضائي منفصل</span>
            </label>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, step: 1 }))}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-bold"
          >
            السابق
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (state.lineageProofByHearsay?.hasOpenLawsuit === 'نعم' || state.lineageProofByHearsay?.hasPreviousJudgment === 'نعم') {
                alert('لا يمكن المتابعة - يوجد نزاع قضائي مفتوح أو حكم سابق');
                return;
              }
              if (state.lineageProofByHearsay?.hasWidespreadRumor === 'لا') {
                alert('لا يمكن المتابعة - يجب توفر سماع فاشٍ مستفيض');
                return;
              }
              if (state.lineageProofByHearsay?.hasCredibleWitnesses === 'لا') {
                alert('لا يمكن المتابعة - يجب توفر شهود عدول');
                return;
              }
              
              setState(prev => ({ ...prev, step: 5 }));
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-lg"
          >
            التالي: شهادة اللفيف (الشهود)
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3 (بديل): اتفاق على تدبير اموال الزوجية/نظام المشاركة
  // ============================================================================


export const LineageProofWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      
      {state.step === 3 && <Step3_LineageProofByHearsay_Details state={state} setState={setState} />}
      
      
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
