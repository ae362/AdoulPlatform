import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
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

  export const Step1_Malakiya_Applicant: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const [ownershipCriteria, setOwnershipCriteria] = useState(
      state.ownershipCriteria || { areApplicantsOwners: '', areOwnersAlive: '' }
    );
    
    const [tempBuyers, setTempBuyers] = useState<Party[]>(
      state.buyers.length ? state.buyers.map((buyer) => ({ ...createEmptyParty(), ...buyer })) : [createEmptyParty()],
    );

    const [tempApplicants, setTempApplicants] = useState<Applicant[]>(
      state.applicants && state.applicants.length > 0
        ? state.applicants
        : [{ ...createEmptyParty(), capacity: '' }]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showBuyerShareModal, setShowBuyerShareModal] = useState(false);

    const handleBuyerChange = (index: number, field: keyof Party, value: any) => {
      setTempBuyers((prev) =>
        prev.map((buyer, idx) =>
          idx === index ? { ...buyer, [field]: value } : buyer
        )
      );
    };

    const addBuyer = () => {
      setTempBuyers((prev) => [...prev, createEmptyParty()]);
    };

    const removeBuyer = (index: number) => {
      setTempBuyers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleApplicantsChange = (index: number, field: keyof Applicant, value: any) => {
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index ? { ...app, [field]: value } : app
        )
      );
    };

    const handleApplicantsProxyChange = (index: number, field: string, value: string) => {
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index ? {
            ...app,
            proxyDetails: { ...app.proxyDetails, [field]: value } as any
          } : app
        )
      );
    };

    const addApplicant = () => {
      setTempApplicants((prev) => [...prev, { ...createEmptyParty(), capacity: '' }]);
    };

    const removeApplicant = (index: number) => {
      setTempApplicants((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleBuyerShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempBuyers(prev => prev.map((buyer, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...buyer, share: share.value } : buyer;
      }));
    };

    const handleNext = () => {
      const newErrors: Record<string, string> = {};
      
      if (!ownershipCriteria.areApplicantsOwners) {
        alert(state.documentType === 'حيازة' ? 'المرجو تحديد ما إذا كان طالب الشهادة هو الحائز' : 'المرجو تحديد ما إذا كان طالب الشهادة هو المالك');
        return;
      }

      if (ownershipCriteria.areApplicantsOwners === 'yes') {
        if (!tempBuyers.length) newErrors.buyers = state.documentType === 'حيازة' ? 'يجب إضافة حائز واحد على الأقل' : 'يجب إضافة مالك واحد على الأقل';
        tempBuyers.forEach((buyer, index) => {
          if (!buyer.name || buyer.name.length < 3) newErrors[`buyer_${index}_name`] = 'الاسم الكامل مطلوب';
          if (!buyer.fatherName) newErrors[`buyer_${index}_father`] = 'اسم الأب مطلوب';
          if (!buyer.motherName) newErrors[`buyer_${index}_mother`] = 'اسم الأم مطلوب';
          if (!buyer.address) newErrors[`buyer_${index}_address`] = 'عنوان السكنى مطلوب';
          if (!buyer.idNumber || buyer.idNumber.length < 4) newErrors[`buyer_${index}_id`] = 'رقم البطاقة غير صحيح';
        });
      } else {
        tempApplicants.forEach((app, index) => {
          if (!app.name || app.name.length < 3) newErrors[`applicant_${index}_name`] = 'الاسم الكامل مطلوب';
          if (!app.fatherName) newErrors[`applicant_${index}_father`] = 'اسم الأب مطلوب';
          if (!app.motherName) newErrors[`applicant_${index}_mother`] = 'اسم الأم مطلوب';
          if (!app.address) newErrors[`applicant_${index}_address`] = 'عنوان السكنى مطلوب';
          if (!app.idNumber || app.idNumber.length < 4) newErrors[`applicant_${index}_id`] = 'رقم البطاقة غير صحيح';
          if (!app.capacity) newErrors[`applicant_${index}_capacity`] = 'الصفة مطلوبة';
          
          if (app.capacity === 'بتوكيل') {
            if (!app.proxyDetails?.book) newErrors[`applicant_${index}_proxy_book`] = 'الدفتر مطلوب';
            if (!app.proxyDetails?.page) newErrors[`applicant_${index}_proxy_page`] = 'الصحيفة مطلوبة';
            if (!app.proxyDetails?.number) newErrors[`applicant_${index}_proxy_number`] = 'العدد مطلوب';
            if (!app.proxyDetails?.date) newErrors[`applicant_${index}_proxy_date`] = 'التاريخ مطلوب';
            if (!app.proxyDetails?.notary) newErrors[`applicant_${index}_proxy_notary`] = 'التوثيق مطلوب';
          }
        });
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setState(prev => ({
        ...prev,
        ownershipCriteria: { ...prev.ownershipCriteria, areApplicantsOwners: ownershipCriteria.areApplicantsOwners },
        buyers: ownershipCriteria.areApplicantsOwners === 'yes' ? tempBuyers : prev.buyers,
        applicants: ownershipCriteria.areApplicantsOwners === 'no' ? tempApplicants : undefined,
        step: 1.5
      }));
    };

    return (
      <div className="space-y-8">
        {/* New Reception Status Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-blue-600">⚙️</span>
            صيغة تقنية ذكية
          </h3>
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">وضعية التلقي:</label>
            <div className="flex flex-col gap-3">
              <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${state.receptionStatus === 'joint' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="receptionStatus"
                  value="joint"
                  checked={state.receptionStatus === 'joint'}
                  onChange={() => setState(prev => ({ ...prev, receptionStatus: 'joint' }))}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="font-medium">تلقي مشترك</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${state.receptionStatus === 'individual' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="receptionStatus"
                  value="individual"
                  checked={state.receptionStatus === 'individual'}
                  onChange={() => setState(prev => ({ ...prev, receptionStatus: 'individual' }))}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="font-medium">تلقي منفرد بإشعار/إذن قانوني</span>
              </label>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800 space-y-2">
              <p>يُفعَّل هذا الخيار عند تعذر التلقي في آن واحد، وفقًا للقانون المنظم لخطة العدالة.</p>
              <div className="flex items-start gap-2 mt-2 font-medium">
                <span>⚠️</span>
                <p>تنبيه قانوني خفي (غير مباشر – مناسب للتطبيق): يخضع التلقي المنفرد لمقتضيات قانون خطة العدالة، ولا يُفعّل إلا عند استيفاء الإشعار أو الإذن اللازم.</p>
              </div>
            </div>

            {state.receptionStatus === 'individual' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  في حالة الجواب تلقي منفرد، يرجى تحديد نوع الإشعار أو الإذن والجهة الصادرة عنه والمدينة/الاقليم
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">نوع الإشعار/الإذن</label>
                    <input 
                      type="text"
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={state.individualReceptionDetails?.noticeType || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        individualReceptionDetails: {
                          ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                          noticeType: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">رقم الاشعار/الاذن</label>
                    <input 
                      type="text"
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={state.individualReceptionDetails?.noticeNumber || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        individualReceptionDetails: {
                          ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                          noticeNumber: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">الجهة الصادرة عنه</label>
                    <input 
                      type="text"
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={state.individualReceptionDetails?.authority || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        individualReceptionDetails: {
                          ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                          authority: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">المدينة/الاقليم</label>
                    <input 
                      type="text"
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={state.individualReceptionDetails?.city || ''}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        individualReceptionDetails: {
                          ...(prev.individualReceptionDetails || { noticeType: '', noticeNumber: '', authority: '', city: '' }),
                          city: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ShareDistributionModal 
          isOpen={showBuyerShareModal}
          onClose={() => setShowBuyerShareModal(false)}
          parties={tempBuyers}
          onUpdateShares={handleBuyerShareUpdate}
          title={state.documentType === 'حيازة' ? "توزيع حصص الحائزين" : "توزيع حصص الملاك"}
        />

        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الأولى: تحديد هوية طالب الشهادة</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <label className="block text-lg font-bold text-gray-800 mb-3">
            {state.documentType === 'حيازة' 
              ? 'هل طالب/طالبي هذه الشهادة هم الحائزون الفعليون للعقار؟'
              : 'هل طالب/طالبي هذه الشهادة هم الملاك الفعليون للعقار؟'}
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="areApplicantsOwners"
                value="yes"
                checked={ownershipCriteria.areApplicantsOwners === 'yes'}
                onChange={(e) => setOwnershipCriteria(prev => ({ ...prev, areApplicantsOwners: 'yes' }))}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold">{state.documentType === 'حيازة' ? 'نعم هم الحائزون' : 'نعم هم الملاك'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="areApplicantsOwners"
                value="no"
                checked={ownershipCriteria.areApplicantsOwners === 'no'}
                onChange={(e) => setOwnershipCriteria(prev => ({ ...prev, areApplicantsOwners: 'no' }))}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold">{state.documentType === 'حيازة' ? 'لا ليسوا الحائزين' : 'لا ليسوا الملاك'}</span>
            </label>
          </div>
        </div>

        {ownershipCriteria.areApplicantsOwners === 'yes' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  {state.documentType === 'حيازة' ? `الحائزون (عددهم ${tempBuyers.length})` : `الملاك (عددهم ${tempBuyers.length})`}
                </h3>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm"
                    type="button" 
                    onClick={() => setShowBuyerShareModal(true)}
                  >
                    📊 توزيع الحصص
                  </button>
                  <button className="btn-secondary text-sm" type="button" onClick={addBuyer}>
                    {state.documentType === 'حيازة' ? '+ إضافة حائز' : '+ إضافة مالك'}
                  </button>
                </div>
             </div>
             {tempBuyers.map((buyer, index) => (
               <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400 space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {state.documentType === 'حيازة' ? `الحائز رقم ${index + 1}` : `المالك رقم ${index + 1}`}
                    </h4>
                    {tempBuyers.length > 1 && (
                      <button className="text-red-600 font-semibold" type="button" onClick={() => removeBuyer(index)}>حذف</button>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nationality Selection */}
                    <div className="col-span-1 md:col-span-2 mb-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={buyer.nationality !== 'اجنبي'} // Default to Moroccan
                            onChange={() => handleBuyerChange(index, 'nationality', 'مغربي')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>مغربي</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={buyer.nationality === 'اجنبي'}
                            onChange={() => handleBuyerChange(index, 'nationality', 'اجنبي')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>أجنبي</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (بالعربية) *</label>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => handleBuyerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_name`]}</p>}
                    </div>

                    {buyer.nationality === 'اجنبي' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (باللاتينية) *</label>
                        <input
                          type="text"
                          value={buyer.nameLatin || ''}
                          onChange={(e) => handleBuyerChange(index, 'nameLatin', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="Full Name (Latin)"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                      <input
                        type="text"
                        value={buyer.placeOfBirth || ''}
                        onChange={(e) => handleBuyerChange(index, 'placeOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="مكان الازدياد"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                      <input
                        type="text"
                        value={buyer.fatherName}
                        onChange={(e) => handleBuyerChange(index, 'fatherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_father`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_father`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_father`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                      <input
                        type="text"
                        value={buyer.motherName}
                        onChange={(e) => handleBuyerChange(index, 'motherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_mother`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_mother`]}</p>}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                      <input
                        type="text"
                        value={buyer.address}
                        onChange={(e) => handleBuyerChange(index, 'address', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_address`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_address`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={buyer.idNumber}
                        onChange={(e) => handleBuyerChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_id`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_id`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={buyer.dateOfBirth || ''}
                        onChange={(e) => handleBuyerChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {ownershipCriteria.areApplicantsOwners === 'no' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">طالب الشهادة (عددهم {tempApplicants.length})</h3>
                <button className="btn-secondary text-sm" type="button" onClick={addApplicant}>+ إضافة طالب شهادة</button>
             </div>
             {tempApplicants.map((app, index) => (
               <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">طالب الشهادة رقم {index + 1}</h4>
                    {tempApplicants.length > 1 && (
                      <button className="text-red-600 font-semibold" type="button" onClick={() => removeApplicant(index)}>حذف</button>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                      <input
                        type="text"
                        value={app.name}
                        onChange={(e) => handleApplicantsChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`applicant_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_name`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                      <input
                        type="text"
                        value={app.placeOfBirth || ''}
                        onChange={(e) => handleApplicantsChange(index, 'placeOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="مكان الازدياد"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                      <input
                        type="text"
                        value={app.fatherName}
                        onChange={(e) => handleApplicantsChange(index, 'fatherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_father`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`applicant_${index}_father`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_father`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                      <input
                        type="text"
                        value={app.motherName}
                        onChange={(e) => handleApplicantsChange(index, 'motherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`applicant_${index}_mother`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_mother`]}</p>}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                      <input
                        type="text"
                        value={app.address}
                        onChange={(e) => handleApplicantsChange(index, 'address', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`applicant_${index}_address`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_address`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={app.idNumber}
                        onChange={(e) => handleApplicantsChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`applicant_${index}_id`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_id`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={app.dateOfBirth || ''}
                        onChange={(e) => handleApplicantsChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">بصفته *</label>
                        <div className="flex gap-4">
                          {['وارث', 'نائب_شرعي', 'بتوكيل'].map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value={option}
                                checked={app.capacity === option}
                                onChange={(e) => handleApplicantsChange(index, 'capacity', e.target.value)}
                              />
                              <span className="font-semibold">
                                {option === 'وارث' && 'وارث'}
                                {option === 'نائب_شرعي' && 'نائب شرعي'}
                                {option === 'بتوكيل' && 'بتوكيل'}
                              </span>
                            </label>
                          ))}
                        </div>
                        {errors[`applicant_${index}_capacity`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_capacity`]}</p>}
                    </div>
                    {app.capacity === 'بتوكيل' && (
                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">وكالة مضمنة بدفتر</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بدفتر *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.book || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'book', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_book`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.page || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'page', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_page`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">عدد *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.number || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'number', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_number`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ *</label>
                              <input
                                type="date"
                                value={app.proxyDetails?.date || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'date', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_date`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.notary || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'notary', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_notary`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                            </div>
                          </div>
                        </div>
                    )}
                 </div>
               </div>
             ))}
          </div>
        )}

        <div className="flex justify-between pt-6">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 0 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            السابق
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-lg"
          >
            التالي
          </button>
        </div>
      </div>
    );
  };



export const Step1_5_Malakiya_OwnerStatus: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const [tempInheritanceDeeds, setTempInheritanceDeeds] = useState<InheritanceDeed[]>(
    state.inheritanceDeeds && state.inheritanceDeeds.length > 0 
      ? state.inheritanceDeeds 
      : [{ book: '', page: '', number: '', date: '', notary: '' }]
  );
  const addInheritanceDeed = () => {
    setTempInheritanceDeeds(prev => [...prev, { book: '', page: '', number: '', date: '', notary: '' }]);
  };
  const removeInheritanceDeed = (index: number) => {
    setTempInheritanceDeeds(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };
  const handleInheritanceDeedChange = (index: number, field: keyof InheritanceDeed, value: string) => {
    setTempInheritanceDeeds(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
    const [ownershipCriteria, setOwnershipCriteria] = useState(
      state.ownershipCriteria || { areApplicantsOwners: '', areOwnersAlive: '' }
    );
    
    const [tempBuyers, setTempBuyers] = useState<Party[]>(
      state.buyers.length ? state.buyers.map((buyer) => ({ ...createEmptyParty(), ...buyer })) : [createEmptyParty()],
    );
    
    const [tempSellers, setTempSellers] = useState<Party[]>(
      state.sellers.length ? state.sellers.map((seller) => ({ ...createEmptyParty(), ...seller })) : [createEmptyParty()],
    );

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showBuyerShareModal, setShowBuyerShareModal] = useState(false);
    const [showSellerShareModal, setShowSellerShareModal] = useState(false);
    const [showDeceasedSelectionModal, setShowDeceasedSelectionModal] = useState(false);

    const handleBuyerChange = (index: number, field: keyof Party, value: any) => {
      setTempBuyers((prev) =>
        prev.map((buyer, idx) =>
          idx === index ? { ...buyer, [field]: value } : buyer
        )
      );
    };

    const addBuyer = () => {
      setTempBuyers((prev) => [...prev, createEmptyParty()]);
    };

    const removeBuyer = (index: number) => {
      setTempBuyers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleSellerChange = (index: number, field: keyof Party, value: any) => {
      setTempSellers((prev) =>
        prev.map((seller, idx) =>
          idx === index ? { ...seller, [field]: value } : seller
        )
      );
    };

    const addSeller = () => {
      setTempSellers((prev) => [...prev, createEmptyParty()]);
    };

    const removeSeller = (index: number) => {
      setTempSellers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleBuyerShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempBuyers(prev => prev.map((buyer, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...buyer, share: share.value } : buyer;
      }));
    };

    const handleSellerShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempSellers(prev => prev.map((seller, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...seller, share: share.value } : seller;
      }));
    };

    const handleNext = () => {
      const newErrors: Record<string, string> = {};
      
      if (!ownershipCriteria.areOwnersAlive) {
        alert(state.documentType === 'حيازة' ? 'المرجو تحديد ما إذا كان الحائزون على قيد الحياة' : 'المرجو تحديد ما إذا كان الملاك على قيد الحياة');
        return;
      }

      if (ownershipCriteria.areOwnersAlive === 'no') {
        // Validate Deceased (Sellers)
        if (!tempSellers.length) newErrors.sellers = 'يجب إضافة هالك واحد على الأقل';
        tempSellers.forEach((seller, index) => {
          if (!seller.name || seller.name.length < 3) newErrors[`seller_${index}_name`] = 'الاسم الكامل مطلوب';
          // Add other validations
        });
      }

      // Validate Owners/Heirs (Buyers)
      if (!tempBuyers.length) newErrors.buyers = state.documentType === 'حيازة' ? 'يجب إضافة حائز/وارث واحد على الأقل' : 'يجب إضافة مالك/وارث واحد على الأقل';
      tempBuyers.forEach((buyer, index) => {
        if (!buyer.name || buyer.name.length < 3) newErrors[`buyer_${index}_name`] = 'الاسم الكامل مطلوب';
        // Add other validations
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setState(prev => ({
        ...prev,
        ownershipCriteria: { ...prev.ownershipCriteria, areOwnersAlive: ownershipCriteria.areOwnersAlive },
        buyers: tempBuyers,
        sellers: ownershipCriteria.areOwnersAlive === 'no' ? tempSellers : [],
        step: 2
      }));
    };

    return (
      <div className="space-y-8">
        <ShareDistributionModal 
          isOpen={showBuyerShareModal}
          onClose={() => setShowBuyerShareModal(false)}
          parties={tempBuyers}
          onUpdateShares={handleBuyerShareUpdate}
          title="توزيع الحصص"
        />
        <ShareDistributionModal 
          isOpen={showSellerShareModal}
          onClose={() => setShowSellerShareModal(false)}
          parties={tempSellers}
          onUpdateShares={handleSellerShareUpdate}
          title="توزيع التركة"
        />

        {showDeceasedSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{state.documentType === 'حيازة' ? 'اختر من الحائزين' : 'اختر من الملاك'}</h3>
                <button onClick={() => setShowDeceasedSelectionModal(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {state.buyers.map((owner, idx) => (
                  <button
                    key={idx}
                    className="w-full text-right p-3 hover:bg-gray-50 rounded border border-gray-200 flex justify-between items-center"
                    onClick={() => {
                      setTempSellers(prev => {
                         const isFirstEmpty = prev.length === 1 && !prev[0].name;
                         const newSeller = { ...createEmptyParty(), ...owner };
                         if (isFirstEmpty) return [newSeller];
                         return [...prev, newSeller];
                      });
                      setShowDeceasedSelectionModal(false);
                    }}
                  >
                    <span className="font-semibold">{owner.name}</span>
                    <span className="text-sm text-gray-500">{owner.idNumber}</span>
                  </button>
                ))}
                {state.buyers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">{state.documentType === 'حيازة' ? 'لا يوجد حائزون مضافين' : 'لا يوجد ملاك مضافين'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{state.documentType === 'حيازة' ? 'الخطوة الثانية: وضعية الحائزين' : 'الخطوة الثانية: وضعية الملاك'}</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <label className="block text-lg font-bold text-gray-800 mb-3">
            {state.documentType === 'حيازة' ? 'بالنسبة للعقار محل المعاملة هل جميع الحائزين على قيد الحياة؟' : 'بالنسبة للعقار محل المعاملة هل جميع الملاك على قيد الحياة؟'}
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="areOwnersAlive"
                value="yes"
                checked={ownershipCriteria.areOwnersAlive === 'yes'}
                onChange={(e) => setOwnershipCriteria(prev => ({ ...prev, areOwnersAlive: 'yes' }))}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold">{state.documentType === 'حيازة' ? 'نعم جميع الحائزين على قيد الحياة' : 'نعم جميع الملاك على قيد الحياة'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="areOwnersAlive"
                value="no"
                checked={ownershipCriteria.areOwnersAlive === 'no'}
                onChange={(e) => setOwnershipCriteria(prev => ({ ...prev, areOwnersAlive: 'no' }))}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold">{state.documentType === 'حيازة' ? 'لا توفي احد الحائزين' : 'لا توفي احد الملاك'}</span>
            </label>
          </div>
        </div>

        {(ownershipCriteria.areOwnersAlive === 'no' || (ownershipCriteria.areOwnersAlive === 'yes' && ownershipCriteria.areApplicantsOwners === 'no')) && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  {ownershipCriteria.areOwnersAlive === 'no' ? `الورثة / المستفيدون (عددهم ${tempBuyers.length})` : (state.documentType === 'حيازة' ? `الحائزون (عددهم ${tempBuyers.length})` : `الملاك (عددهم ${tempBuyers.length})`)}
                </h3>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm"
                    type="button" 
                    onClick={() => setShowBuyerShareModal(true)}
                  >
                    📊 توزيع الحصص
                  </button>
                  <button className="btn-secondary text-sm" type="button" onClick={addBuyer}>
                    {ownershipCriteria.areOwnersAlive === 'no' ? '+ إضافة وارث' : (state.documentType === 'حيازة' ? '+ إضافة حائز' : '+ إضافة مالك')}
                  </button>
                </div>
             </div>
             {tempBuyers.map((buyer, index) => (
               <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400 space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {ownershipCriteria.areOwnersAlive === 'no' ? `الوارث رقم ${index + 1}` : (state.documentType === 'حيازة' ? `الحائز رقم ${index + 1}` : `المالك رقم ${index + 1}`)}
                    </h4>
                    {tempBuyers.length > 1 && (
                      <button className="text-red-600 font-semibold" type="button" onClick={() => removeBuyer(index)}>حذف</button>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => handleBuyerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_name`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                      <input
                        type="text"
                        value={buyer.fatherName}
                        onChange={(e) => handleBuyerChange(index, 'fatherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_father`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                      <input
                        type="text"
                        value={buyer.motherName}
                        onChange={(e) => handleBuyerChange(index, 'motherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                      <input
                        type="text"
                        value={buyer.address}
                        onChange={(e) => handleBuyerChange(index, 'address', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={buyer.idNumber}
                        onChange={(e) => handleBuyerChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={buyer.dateOfBirth || ''}
                        onChange={(e) => handleBuyerChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                      <input
                        type="text"
                        value={buyer.placeOfBirth || ''}
                        onChange={(e) => handleBuyerChange(index, 'placeOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {ownershipCriteria.areOwnersAlive === 'no' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">الهالك / المورث (عددهم {tempSellers.length})</h3>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-semibold text-sm"
                    type="button" 
                    onClick={() => setShowSellerShareModal(true)}
                  >
                    📊 توزيع التركة
                  </button>
                  {ownershipCriteria.areApplicantsOwners === 'yes' && (
                    <button 
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
                      type="button" 
                      onClick={() => setShowDeceasedSelectionModal(true)}
                    >
                      {state.documentType === 'حيازة' ? '+ اختيار من الحائزين' : '+ اختيار من الملاك'}
                    </button>
                  )}
                  <button className="btn-secondary text-sm" type="button" onClick={addSeller}>+ إضافة هالك</button>
                </div>
             </div>
             {tempSellers.map((seller, index) => (
               <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400 space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">الهالك رقم {index + 1}</h4>
                    {tempSellers.length > 1 && (
                      <button className="text-red-600 font-semibold" type="button" onClick={() => removeSeller(index)}>حذف</button>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                      <input
                        type="text"
                        value={seller.name}
                        onChange={(e) => handleSellerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`seller_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_name`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                      <input
                        type="text"
                        value={seller.fatherName}
                        onChange={(e) => handleSellerChange(index, 'fatherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_father`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                      <input
                        type="text"
                        value={seller.motherName}
                        onChange={(e) => handleSellerChange(index, 'motherName', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                      <input
                        type="text"
                        value={seller.address}
                        onChange={(e) => handleSellerChange(index, 'address', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={seller.idNumber}
                        onChange={(e) => handleSellerChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={seller.dateOfBirth || ''}
                        onChange={(e) => handleSellerChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                      <input
                        type="text"
                        value={seller.placeOfBirth || ''}
                        onChange={(e) => handleSellerChange(index, 'placeOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {/* Always show Buyers (Heirs or Owners) if not already shown in Step 1 or if we need to edit them */}
        {ownershipCriteria.areOwnersAlive === 'no' && (
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">الوارث/الورثة او الموصى له / الموصى لهم مذكورون برسم الاراثة / رسم الوصية مضمن بدفتر</h4>
                <button className="text-blue-600 font-semibold text-sm" type="button" onClick={addInheritanceDeed}>+ إضافة رسم</button>
              </div>
              
              {tempInheritanceDeeds.map((deed, index) => (
                <div key={index} className="relative p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {tempInheritanceDeeds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInheritanceDeed(index)}
                      className="absolute top-2 left-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕ حذف
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">دفتر</label>
                      <input
                        type="text"
                        value={deed.book}
                        onChange={(e) => handleInheritanceDeedChange(index, 'book', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                      <input
                        type="text"
                        value={deed.page}
                        onChange={(e) => handleInheritanceDeedChange(index, 'page', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                      <input
                        type="text"
                        value={deed.number}
                        onChange={(e) => handleInheritanceDeedChange(index, 'number', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                      <input
                        type="date"
                        value={deed.date}
                        onChange={(e) => handleInheritanceDeedChange(index, 'date', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                      <input
                        type="text"
                        value={deed.notary}
                        onChange={(e) => handleInheritanceDeedChange(index, 'notary', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}

        <div className="flex justify-between pt-6">
          <button
            onClick={() => {
              if (state.isEnteringNaturalPartyFirst) {
                // If we are in "Natural Party First" mode, "Back" should return to the Wizard Step 1
                setState((prev) => ({ ...prev, legalEntitySetupStep: 1, isEnteringNaturalPartyFirst: false }));
              } else if (state.isEnteringNaturalPartySecond) {
                // If we are in "Natural Party Second" mode, "Back" should return to the Wizard Step 6 (Review)
                // Or maybe just back to the Wizard Step 1 to restart?
                // Let's go back to Wizard Step 6 of the Buyer (Legal)
                setState((prev) => ({ ...prev, legalEntitySetupStep: 6, isEnteringNaturalPartySecond: false }));
              } else {
                setState((prev) => ({ ...prev, step: 1 }));
              }
            }}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            السابق
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-lg"
          >
            {state.isEnteringNaturalPartyFirst 
              ? 'تابع: إعداد بيانات الشخص المعنوي' 
              : state.isEnteringNaturalPartySecond
                ? (state.documentType === 'حيازة' ? 'التالي: تفاصيل الحيازة' : 'التالي: تفاصيل الملكية')
                : 'التالي'
            }
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // TAWKIL STEPS
  // ============================================================================


export const MalakiyaWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Malakiya_Applicant state={state} setState={setState} />}
      {state.step === 1.5 && <Step1_5_Malakiya_OwnerStatus state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_AdministrativeCertificates state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
