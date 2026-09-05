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

  export const Step3_AcknowledgmentDeed: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const ack = state.acknowledgmentDeed || {};
    
    const updateAck = <K extends keyof AcknowledgmentDeed>(field: K, value: AcknowledgmentDeed[K]) => {
      setState((prev) => ({
        ...prev,
        acknowledgmentDeed: {
          ...(prev.acknowledgmentDeed || {}),
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: رسم إقرار واعتراف</h2>
          <p className="text-gray-700 leading-relaxed">
            توثيق الإقرارات والاعترافات (مالية، عقارية، ميراثية) مع نظام "Legal Conflict Detector" للتحقق من المخاطر القانونية.
          </p>
        </div>

        {/* 1. Data Collection */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
           <h3 className="text-lg font-bold text-gray-800">1. جمع المعطيات (Data Collection)</h3>
           
           <div className="grid md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">طبيعة الإقرار</label>
               <select className="w-full px-3 py-2 border rounded-lg"
                 value={ack.acknowledgmentType || ''}
                 onChange={(e) => updateAck('acknowledgmentType', e.target.value as any)}
               >
                 <option value="">اختر...</option>
                 <option value="إبراء_مالي">إبراء مالي</option>
                 <option value="إخلاء_طرف">إخلاء طرف</option>
                 <option value="تنازل_عن_عقار">تنازل عن عقار</option>
                 <option value="رفع_يد_عن_شيوع">رفع يد عن شيوع</option>
                 <option value="إبراء_ميراثي">إبراء ميراثي</option>
                 <option value="اعتراف_بدين">اعتراف بدين</option>
                 <option value="أخرى">أخرى</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">طبيعة الحقوق</label>
               <div className="flex flex-wrap gap-2 mt-2">
                 {['مالية', 'عقارية', 'ميراث', 'غرامات'].map((type) => (
                   <label key={type} className="inline-flex items-center gap-2 bg-white px-2 py-1 rounded border cursor-pointer">
                     <input type="checkbox"
                       checked={(ack.rightsType || []).includes(type as any)}
                       onChange={(e) => {
                         const current = ack.rightsType || [];
                         const next = e.target.checked ? [...current, type] : current.filter(t => t !== type);
                         updateAck('rightsType', next as any);
                       }}
                     />
                     <span className="text-sm">{type}</span>
                   </label>
                 ))}
               </div>
             </div>
           </div>

           <div className="grid md:grid-cols-2 gap-4 mt-2">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">علاقة القرابة بين الطرفين</label>
               <select className="w-full px-3 py-2 border rounded-lg"
                 value={ack.relationshipType || ''}
                 onChange={(e) => updateAck('relationshipType', e.target.value as any)}
               >
                  <option value="">اختر...</option>
                  <option value="بدون">بدون قرابة</option>
                  <option value="أصول_فروع">أصول وفروع</option>
                  <option value="أزواج">أزواج</option>
                  <option value="إخوة">إخوة</option>
                  <option value="ورثة_مشتركون">ورثة مشتركون</option>
               </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">مدى نهائية الإقرار</label>
               <select className="w-full px-3 py-2 border rounded-lg"
                 value={ack.finality || ''}
                 onChange={(e) => updateAck('finality', e.target.value as any)}
               >
                 <option value="">اختر...</option>
                 <option value="نهائي">نهائي</option>
                 <option value="مشروط">مشروط</option>
                 <option value="مؤقت">مؤقت</option>
               </select>
             </div>
           </div>

           {(ack.rightsType || []).includes('عقارية') && (
             <div className="bg-white p-4 rounded border mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">بيانات العقار موضوع الإقرار</h4>
                <div className="space-y-2">
                   <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" 
                          checked={ack.propertyDetails?.isRegistered || false}
                          onChange={(e) => updateAck('propertyDetails', { ...ack.propertyDetails, isRegistered: e.target.checked })}
                        />
                        <span>عقار محفظ؟</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" 
                          checked={ack.propertyDetails?.isAgricultural || false}
                          onChange={(e) => updateAck('propertyDetails', { ...ack.propertyDetails, isAgricultural: e.target.checked })}
                        />
                        <span>عقار فلاحي؟</span>
                      </label>
                   </div>
                   {ack.propertyDetails?.isRegistered && (
                     <input type="text" placeholder="رقم الرسم العقاري" className="w-full px-3 py-2 border rounded"
                       value={ack.propertyDetails?.titleNumber || ''}
                       onChange={(e) => updateAck('propertyDetails', { ...ack.propertyDetails, titleNumber: e.target.value })}
                     />
                   )}
                   <input type="text" placeholder="وصف العقار / الحدود" className="w-full px-3 py-2 border rounded"
                      value={ack.propertyDetails?.description || ''}
                      onChange={(e) => updateAck('propertyDetails', { ...ack.propertyDetails, description: e.target.value })}
                   />
                </div>
             </div>
           )}
        </div>

        {/* 2. Legal Conflict Detector */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
           <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
             <span>⚠️ Legal Conflict Detector</span>
             <span className="text-xs font-normal text-red-600 bg-red-100 px-2 py-1 rounded-full">نظام الذكاء القانوني</span>
           </h3>

           <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                 <h4 className="font-semibold text-gray-700">الفحوصات القانونية (AI Analysis)</h4>
                 
                 <div className={`p-3 rounded border flex justify-between items-center ${ack.aiChecks?.isValidForInheritance ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                    <span>هل الإقرار يصلح أن يكون ميراثيًا؟</span>
                    <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded" 
                       onClick={() => updateAck('aiChecks', { ...ack.aiChecks, isValidForInheritance: true })}>
                       {ack.aiChecks?.isValidForInheritance ? 'نعم (مطابق)' : 'تحقق'}
                    </button>
                 </div>
                 
                 <div className={`p-3 rounded border flex justify-between items-center ${ack.aiChecks?.involvesFutureRights ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                    <span>هل فيه تنازل عن حقوق مستقبلية؟</span>
                    <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded" 
                       onClick={() => updateAck('aiChecks', { ...ack.aiChecks, involvesFutureRights: !ack.aiChecks?.involvesFutureRights })}>
                       {ack.aiChecks?.involvesFutureRights ? 'نعم (تنبيه)' : 'تحقق'}
                    </button>
                 </div>
                 
                 <div className={`p-3 rounded border flex justify-between items-center ${ack.aiChecks?.isRegistrationMandatory ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    <span>هل يتطلب التسجيل الوجوبي؟</span>
                    <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded" 
                       onClick={() => updateAck('aiChecks', { ...ack.aiChecks, isRegistrationMandatory: true })}>
                       {ack.aiChecks?.isRegistrationMandatory ? 'نعم (وجوبي)' : 'تحقق'}
                    </button>
                 </div>
                 
                 <div className={`p-3 rounded border flex justify-between items-center ${ack.aiChecks?.publicOrderRisk ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                    <span>هل فيه خطر على النظام العام؟</span>
                     <button className="text-xs bg-gray-600 text-white px-2 py-1 rounded" 
                       onClick={() => updateAck('aiChecks', { ...ack.aiChecks, publicOrderRisk: false })}>
                       {ack.aiChecks?.publicOrderRisk === false ? 'سليم' : 'تحقق'}
                    </button>
                 </div>
              </div>

              <div className="bg-white p-4 rounded border text-sm text-gray-600 space-y-2">
                 <h4 className="font-bold text-gray-800 border-b pb-2">نصائح (Pricing Advisory)</h4>
                 {ack.aiChecks?.isRegistrationMandatory ? (
                   <p className="text-blue-700">📌 بما أن التسجيل وجوبي، يجب استخلاص رسوم التسجيل والتنبر وفق المدونة.</p>
                 ) : (
                   <p>يرجى تحديد طبيعة الإقرار لتوجيهكم في الرسوم.</p>
                 )}
                 {(ack.rightsType || []).includes('عقارية') && ack.propertyDetails?.isRegistered && (
                   <p className="text-orange-700">📌 عقار محفظ: لا يعتد بالإقرار إلا بعد تقييده بالسجل العقاري.</p>
                 )}
                 {(ack.rightsType || []).includes('ميراث') && (
                   <p className="text-red-700">📌 إبراء الورثة: لا يجوز الإبراء من حق مستقبل في تركة شخص لا يزال على قيد الحياة.</p>
                 )}
              </div>
           </div>
        </div>

        {/* 3. Document Generation Inputs */}
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-4">
           <h3 className="text-lg font-bold text-gray-800">3. توليد الوثيقة العدلية</h3>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">موضوع الإقرار (نصيًا)</label>
              <textarea 
                className="w-full px-3 py-2 border rounded-lg h-32"
                placeholder="أقر السيد (فلان) المقر... بأنه أبرأ ذمة (فلان)..."
                value={ack.subjectText || ''}
                onChange={(e) => updateAck('subjectText', e.target.value)}
              />
           </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between mt-4">
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
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Debt Discharge Deed (رسم إبراء من دين)
  // ============================================================================

export const AcknowledgmentWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_AcknowledgmentDeed state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
