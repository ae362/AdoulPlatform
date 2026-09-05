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

  export const Step3_PaternityAcknowledgment_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updatePaternity = (field: string, value: any) => {
      setState(prev => ({
        ...prev,
        paternityAcknowledgment: {
          ...prev.paternityAcknowledgment,
          [field]: value
        }
      }));
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <span className="text-3xl">⚖️</span>
            رسم الاقرار ببنوة / عقد الاستلحاق
          </h2>
          <p className="text-purple-100">المواد 160-162 من مدونة الأسرة</p>
        </div>

        {/* 1. تحديد طبيعة الطلب */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
          <h3 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2">
            <span>1️⃣</span>
            <span>تحديد طبيعة الطلب</span>
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'استلحاق'}
                onChange={() => updatePaternity('requestType', 'استلحاق')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">استلحاق (مصحوب باعتراف + لحوق نسب)</div>
                <p className="text-sm text-gray-600">الاعتراف الكامل بالنسب مع إثبات اللحوق</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'إقرار_ببنوة_فقط'}
                onChange={() => updatePaternity('requestType', 'إقرار_ببنوة_فقط')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">إقرار ببنوة فقط (اعتراف مجرد دون استلحاق)</div>
                <p className="text-sm text-gray-600">الاعتراف بالبنوة دون إجراءات الاستلحاق الكاملة</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'حمل_أثناء_الخطبة'}
                onChange={() => updatePaternity('requestType', 'حمل_أثناء_الخطبة')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">حالة حمل أثناء الخطبة يليه إقرار</div>
                <p className="text-sm text-gray-600">حالة الخطبة التي حدث فيها حمل ثم تم الإقرار</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'إنكار_ثم_إقرار'}
                onChange={() => updatePaternity('requestType', 'إنكار_ثم_إقرار')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">حالة إنكار سابق ثم رجوع بالإقرار</div>
                <p className="text-sm text-gray-600">المقر أنكر في السابق ثم رجع وأقر بالنسب</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'مرض_المخلف'}
                onChange={() => updatePaternity('requestType', 'مرض_المخلف')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">حالة مرض المخُلف (المقر)</div>
                <p className="text-sm text-gray-600">المقر في حالة مرض خطير (مرض الموت)</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded hover:bg-purple-50 cursor-pointer transition">
              <input
                type="radio"
                checked={state.paternityAcknowledgment?.requestType === 'قاصر_للمستلحقة'}
                onChange={() => updatePaternity('requestType', 'قاصر_للمستلحقة')}
                className="w-5 h-5 mt-1"
              />
              <div>
                <div className="font-semibold">حالة قاصرة للمُستلحقة أو المُقَر له</div>
                <p className="text-sm text-gray-600">المقر له قاصر يحتاج لمن ينوب عنه</p>
              </div>
            </label>
          </div>

          {/* Legal Alert */}
          <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <span>⚖️</span>
              تنبيه قانوني:
            </h4>
            <div className="space-y-2 text-sm text-gray-800">
              <p className="font-semibold">يُشترط في الإقرار بالنسب:</p>
              <ul className="list-disc pr-6 space-y-1">
                <li>✔ أن يكون صادراً عن الأب</li>
                <li>✔ أن يكون مستجمعاً لشروط الإدراك والتمييز</li>
                <li>✔ ألا يكذبه الواقع أو النقل أو العقل</li>
                <li>✔ ألا يكون المُقَر له مجهول النسب من غيره</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="font-semibold">المصدر القانوني:</p>
                <p>– مدونة الأسرة، المواد: 160 إلى 162</p>
                <p className="mt-2">
                  <a href="https://adala.justice.gov.ma/production/html/Fr/152340.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                    🔗 رابط وزارة العدل
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. التحقق من شروط الإقرار بالنسب */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400">
          <h3 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
            <span>2️⃣</span>
            <span>التحقق من شروط الإقرار بالنسب</span>
          </h3>

          <div className="space-y-6">
            {/* التمييز والإدراك */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔹</span>
                <h4 className="font-bold text-gray-800">التمييز والإدراك:</h4>
              </div>
              <p className="text-gray-700 mb-3 pr-8">هل حالة المقر صحية وعقلية تسمح بالإقرار؟</p>
              <div className="flex gap-4 pr-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.acknowledgerMentalState === 'نعم'}
                    onChange={() => updatePaternity('acknowledgerMentalState', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.acknowledgerMentalState === 'لا'}
                    onChange={() => updatePaternity('acknowledgerMentalState', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
              {state.paternityAcknowledgment?.acknowledgerMentalState === 'لا' && (
                <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded mt-3 pr-8">
                  <p className="text-red-800 font-bold">❌ يوقف الإجراء + إحالة طبية عند الاقتضاء</p>
                </div>
              )}
            </div>

            {/* الصلة واحتمال اللحوق */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔹</span>
                <h4 className="font-bold text-gray-800">الصلة واحتمال اللحوق:</h4>
              </div>
              <p className="text-gray-700 mb-3 pr-8">هل يوجد احتمال بيولوجي في لحوق النسب؟</p>
              <div className="flex gap-4 pr-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.biologicalPossibility === 'نعم'}
                    onChange={() => updatePaternity('biologicalPossibility', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.biologicalPossibility === 'لا'}
                    onChange={() => updatePaternity('biologicalPossibility', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
              {state.paternityAcknowledgment?.biologicalPossibility === 'لا' && (
                <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded mt-3 pr-8">
                  <p className="text-red-800 font-bold">❌ رفض الإشهاد + إحالة على قضاء الأسرة</p>
                </div>
              )}
            </div>

            {/* وجود زوجية / خطبة / علاقة */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔹</span>
                <h4 className="font-bold text-gray-800">وجود زوجية / خطبة / علاقة واضحة:</h4>
              </div>
              <div className="space-y-2 pr-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.relationshipType === 'زواج_قائم'}
                    onChange={() => updatePaternity('relationshipType', 'زواج_قائم')}
                    className="w-4 h-4"
                  />
                  <span>زواج قائم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.relationshipType === 'خطبة_وحمل'}
                    onChange={() => updatePaternity('relationshipType', 'خطبة_وحمل')}
                    className="w-4 h-4"
                  />
                  <span>خطبة + حمل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.relationshipType === 'علاقة_غير_موثقة'}
                    onChange={() => updatePaternity('relationshipType', 'علاقة_غير_موثقة')}
                    className="w-4 h-4"
                  />
                  <span>علاقة غير موثقة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.paternityAcknowledgment?.relationshipType === 'غير_معلوم'}
                    onChange={() => updatePaternity('relationshipType', 'غير_معلوم')}
                    className="w-4 h-4"
                  />
                  <span>غير معلوم</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3. حالات استثنائية */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
          <h3 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">
            <span>3️⃣</span>
            <span>حالات استثنائية (Alerts)</span>
          </h3>

          <div className="space-y-4">
            {/* الإنكار ثم الإقرار */}
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <h4 className="font-bold text-orange-900">حالة الإنكار ثم الإقرار</h4>
              </div>
              <p className="text-sm text-gray-800">تؤخذ بعين الاعتبار، وتقبل إذا لم تُستحل نسباً.</p>
            </div>

            {/* الحمل أثناء الخطبة */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <h4 className="font-bold text-blue-900">الحمل أثناء الخطبة</h4>
              </div>
              <p className="text-sm text-gray-800 mb-2">مجرد الخطبة لا يُثبت النسب إلا بالإقرار أو الزواج</p>
              <p className="text-xs text-gray-700">
                <strong>مصدر:</strong> المادة 156 مدونة الأسرة | 
                <a href="https://adala.justice.gov.ma/production/html/Fr/152340.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline mr-1">
                  رابط
                </a>
              </p>
            </div>

            {/* المرض المخوف */}
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <h4 className="font-bold text-red-900">المرض المخوف (مرض الموت)</h4>
              </div>
              <p className="text-sm text-gray-800 mb-1">الإقرار في مرض الموت يقبل بشرط عدم ضرر الإرث على الغير</p>
              <p className="text-xs text-gray-700">
                <strong>مصدر:</strong> فقهي + قضائي
              </p>
            </div>
          </div>
        </div>

        {/* Legal Acknowledgments Section */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-l-4 border-green-500">
          <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
            <span>✅</span>
            الإقرارات القانونية المطلوبة:
          </h4>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.paternityAcknowledgment?.acknowledgeFatherOnly || false}
                onChange={(e) => updatePaternity('acknowledgeFatherOnly', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن الإقرار صادر عن الأب</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.paternityAcknowledgment?.acknowledgeAwarenessRequired || false}
                onChange={(e) => updatePaternity('acknowledgeAwarenessRequired', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن المقر مستجمع لشروط الإدراك والتمييز</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.paternityAcknowledgment?.acknowledgeNoContradiction || false}
                onChange={(e) => updatePaternity('acknowledgeNoContradiction', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن الإقرار لا يكذبه الواقع أو النقل أو العقل</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.paternityAcknowledgment?.acknowledgeUnknownLineage || false}
                onChange={(e) => updatePaternity('acknowledgeUnknownLineage', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1"
              />
              <span className="text-gray-700 group-hover:text-gray-900">أقر بأن المقر له ليس مجهول النسب من غير المقر</span>
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
              if (state.paternityAcknowledgment?.acknowledgerMentalState === 'لا') {
                alert('لا يمكن المتابعة - المقر غير مستجمع لشروط الإدراك والتمييز');
                return;
              }
              if (state.paternityAcknowledgment?.biologicalPossibility === 'لا') {
                alert('لا يمكن المتابعة - لا يوجد احتمال بيولوجي للحوق النسب');
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
  // Step 3: Lineage Proof by Hearsay Details (ثبوت نسب ببينة السماع)
  // ============================================================================


export const PaternityAcknowledgmentWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      
      {state.step === 3 && <Step3_PaternityAcknowledgment_Details state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      
      
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
