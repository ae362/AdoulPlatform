import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
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


  export const Step3_PossessionProof: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const poss = state.possessionProof || {};

    const updatePossession = <K extends keyof PossessionProof>(field: K, value: PossessionProof[K]) => {
      setState((prev) => ({
        ...prev,
        possessionProof: {
          ...(prev.possessionProof || {}),
          [field]: value,
        },
      }));
    };

    const updateNested = <K extends keyof PossessionProof>(field: K, value: PossessionProof[K]) => {
      updatePossession(field, value);
    };

    const toggleClassification = (value: NonNullable<PossessionProof['possessionClassification']>[number]) => {
      const current = poss.possessionClassification || [];
      const exists = current.includes(value);
      updatePossession('possessionClassification', (exists ? current.filter((v) => v !== value) : [...current, value]) as any);
    };

    const exploitation = poss.exploitationActs || {};
    const adminActs = poss.administrationActs || {};
    const evid = poss.evidentiaryIndicators || {};
    const smart = poss.smartScenarios || {};
    const alerts = poss.alerts || {};

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: ثبوت الحيازة / التصرف / الاستحقاق</h2>
          <p className="text-gray-700 leading-relaxed">
            يهدف هذا القسم إلى توصيف الحيازة وفق مدونة الحقوق العينية (المواد 239–261)، من حيث أطرافها، محلها، نوعها، مدى السيطرة الفعلية، النية، عدم المنازعة، المدة، انتقال الحيازة، والموانع القانونية.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800">
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مدونة الحقوق العينية 39.08: المواد 239–261</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">ظهير التحفيظ العقاري 1913 – قانون 14-07</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">قانون الالتزامات والعقود (الفصل 101 وما بعده)</span>
          </div>
        </div>

        {/* (1) أطراف الشهادة / السائل */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">1. صاحب الطلب / المتمسك بالحيازة</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">صفته في العقار</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.possessorRole || ''}
                onChange={(e) => updatePossession('possessorRole', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="حائز">حائز</option>
                <option value="مالك">مالك</option>
                <option value="وارث">وارث</option>
                <option value="منتفع">منتفع</option>
                <option value="مدير_دار">مدير دار</option>
                <option value="غير_ذلك">غير ذلك</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">هل الحيازة لنفسه أم بصفته؟</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.possessionForSelfOrCapacity || ''}
                onChange={(e) => updatePossession('possessionForSelfOrCapacity', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="لنفسه">لنفسه</option>
                <option value="بصفته">بصفته</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6 md:mt-0">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.isHeir || false}
                onChange={(e) => updatePossession('isHeir', e.target.checked)}
              />
              <span>هل هو وارث بالنسبة للعقار محل الحيازة؟</span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">كيفية انتقال الحيازة إليه</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {['إرث','وصية','بيع','مقاسمة','حوز','غير_ذلك'].map((mode) => (
                  <label key={mode} className="inline-flex items-center gap-2 bg-white border rounded-lg px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={(poss.possessionOriginModes || []).includes(mode as any)}
                      onChange={() => {
                        const current = poss.possessionOriginModes || [];
                        const exists = current.includes(mode as any);
                        updatePossession(
                          'possessionOriginModes',
                          (exists ? current.filter((v) => v !== mode) : [...current, mode]) as any,
                        );
                      }}
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">طريقة علمه بالعقار</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="مثال: سكنى قديمة، موروث عائلي، إدارة لمصلحة..."
                value={poss.knowledgeMethod || ''}
                onChange={(e) => updatePossession('knowledgeMethod', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* (2) العقار محل الحيازة */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
          <h3 className="text-lg font-bold text-green-900">2. العقار محل الحيازة</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع العقار</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.possessedPropertyKind || ''}
                onChange={(e) => updatePossession('possessedPropertyKind', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="أرض_فلاحية">أرض فلاحية</option>
                <option value="أرض_عارية">أرض عارية</option>
                <option value="دار">دار</option>
                <option value="محل">محل</option>
                <option value="عمارة">عمارة</option>
                <option value="مزرعة">مزرعة</option>
                <option value="أرض_مشاعة">أرض مشاعة</option>
                <option value="أرض_في_مدشر">أرض في مدشر</option>
                <option value="ملك_محفظ">ملك محفظ</option>
                <option value="ملك_غير_محفظ">ملك غير محفظ</option>
                <option value="في_طور_التحفيظ">في طور التحفيظ</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الاسم المتعارف به عرفًا</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={poss.customaryPropertyName || ''}
                onChange={(e) => updatePossession('customaryPropertyName', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-6 md:mt-0">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.hasCoordinates || false}
                onChange={(e) => updatePossession('hasCoordinates', e.target.checked)}
              />
              <span>هل تم تحديد الإحداثيات (GPS)؟</span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">وصف الإحداثيات/الموقع</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={poss.coordinatesDescription || ''}
                onChange={(e) => updatePossession('coordinatesDescription', e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحدود الأربع والمجاورون</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={poss.fourBoundariesDescription || ''}
                onChange={(e) => updatePossession('fourBoundariesDescription', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">المساحة التقريبية</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={poss.areaDescription || ''}
                onChange={(e) => updatePossession('areaDescription', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">الوثائق المساندة (إن وجدت)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={poss.supportingDocuments || ''}
                onChange={(e) => updatePossession('supportingDocuments', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.isRegisteredProperty || false}
                onChange={(e) => updatePossession('isRegisteredProperty', e.target.checked)}
              />
              <span>العقار محفظ؟</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.hasOpposition || false}
                onChange={(e) => updatePossession('hasOpposition', e.target.checked)}
              />
              <span>العقار موضوع تعرض؟</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.hasRegistrationApplication || false}
                onChange={(e) => updatePossession('hasRegistrationApplication', e.target.checked)}
              />
              <span>العقار موضوع مطلب تحفيظ؟</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={poss.isWaqfProperty || false}
                onChange={(e) => updatePossession('isWaqfProperty', e.target.checked)}
              />
              <span>العقار محبس؟</span>
            </label>
          </div>
        </div>

        {/* (3) تصنيف الحيازة + (4) السيطرة الفعلية */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-300 space-y-3">
            <h3 className="text-lg font-bold text-yellow-900">3. تصنيف الحيازة داخل النظام</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'حيازة_تصرفية', label: 'حيازة تصرفية (تصرف)' },
                { key: 'حيازة_استحقاقية', label: 'حيازة استحقاقية (استحقاق)' },
                { key: 'حيازة_وضع_يد', label: 'حيازة وضع يد عادي' },
                { key: 'حيازة_ناتجة_عن_إرث', label: 'حيازة ناتجة عن إرث' },
                { key: 'حيازة_ناتجة_عن_مقاسمة_عرفية', label: 'حيازة ناتجة عن مقاسمة عرفية' },
                { key: 'حيازة_ناتجة_عن_بيع_شفوي', label: 'حيازة ناتجة عن بيع شفوي' },
                { key: 'حيازة_ناتجة_عن_وصية', label: 'حيازة ناتجة عن وصية' },
                { key: 'حيازة_مع_نزاع', label: 'حيازة مع نزاع' },
                { key: 'حيازة_بدون_نزاع', label: 'حيازة بدون نزاع' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={(poss.possessionClassification || []).includes(key as any)}
                    onChange={() => toggleClassification(key as any)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-3">
            <h3 className="text-lg font-bold text-indigo-900">4. مدى السيطرة الفعلية (م239)</h3>
            <p className="text-xs text-gray-700 mb-2">الحيازة الاستحقاقية تقوم على السيطرة الفعلية بنية التملك.</p>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-800">أعمال الاستغلال:</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.ploughing || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        ploughing: e.target.checked,
                      })
                    }
                  />
                  <span>حرث / استغلال فلاحي</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.planting || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        planting: e.target.checked,
                      })
                    }
                  />
                  <span>غرس / التشجير</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.habitation || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        habitation: e.target.checked,
                      })
                    }
                  />
                  <span>السكنى الفعلية</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.construction || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        construction: e.target.checked,
                      })
                    }
                  />
                  <span>العمارة والبناء</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.rentingOut || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        rentingOut: e.target.checked,
                      })
                    }
                  />
                  <span>التأجير وقبض الكراء</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.harvesting || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        harvesting: e.target.checked,
                      })
                    }
                  />
                  <span>الحصاد / جني المحاصيل</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={exploitation.repairs || false}
                    onChange={(e) =>
                      updateNested('exploitationActs', {
                        ...exploitation,
                        repairs: e.target.checked,
                      })
                    }
                  />
                  <span>الترميم والإصلاحات الجوهرية</span>
                </label>
              </div>

              <p className="font-semibold text-gray-800 mt-3">أعمال الإدارة والمعاوضة:</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={adminActs.sellingCrops || false}
                    onChange={(e) =>
                      updateNested('administrationActs', {
                        ...adminActs,
                        sellingCrops: e.target.checked,
                      })
                    }
                  />
                  <span>بيع المحاصيل أو ثمار الاستغلال</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={adminActs.collectingRent || false}
                    onChange={(e) =>
                      updateNested('administrationActs', {
                        ...adminActs,
                        collectingRent: e.target.checked,
                      })
                    }
                  />
                  <span>قبض الكراء بصفة منتظمة</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={adminActs.performingRepairs || false}
                    onChange={(e) =>
                      updateNested('administrationActs', {
                        ...adminActs,
                        performingRepairs: e.target.checked,
                      })
                    }
                  />
                  <span>القيام بتصرفات إصلاحية بصفته صاحب الشأن</span>
                </label>
              </div>

              <p className="font-semibold text-gray-800 mt-3">قرائن قوية:</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={evid.waterContracts || false}
                    onChange={(e) =>
                      updateNested('evidentiaryIndicators', {
                        ...evid,
                        waterContracts: e.target.checked,
                      })
                    }
                  />
                  <span>عقود الربط بالماء</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={evid.electricityContracts || false}
                    onChange={(e) =>
                      updateNested('evidentiaryIndicators', {
                        ...evid,
                        electricityContracts: e.target.checked,
                      })
                    }
                  />
                  <span>عقود الكهرباء</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={evid.buildingPermits || false}
                    onChange={(e) =>
                      updateNested('evidentiaryIndicators', {
                        ...evid,
                        buildingPermits: e.target.checked,
                      })
                    }
                  />
                  <span>رخص البناء أو الإصلاح</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={evid.neighborsCertificates || false}
                    onChange={(e) =>
                      updateNested('evidentiaryIndicators', {
                        ...evid,
                        neighborsCertificates: e.target.checked,
                      })
                    }
                  />
                  <span>شهادات الجيران</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={evid.communityCertificates || false}
                    onChange={(e) =>
                      updateNested('evidentiaryIndicators', {
                        ...evid,
                        communityCertificates: e.target.checked,
                      })
                    }
                  />
                  <span>شهادات الجماعة أو السلطة المحلية</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* (5) النية و (6) عدم المنازعة و(7) الزمن */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-sky-50 p-6 rounded-lg border-l-4 border-sky-300 space-y-3">
            <h3 className="text-lg font-bold text-sky-900">5. شرط النسبة (النية) – م240-3 و240-4</h3>
            <div className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.attributesPropertyToSelf || false}
                  onChange={(e) => updatePossession('attributesPropertyToSelf', e.target.checked)}
                />
                <span>ينسب العقار لنفسه أمام العدل والقاضي.</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.peopleAttributePropertyToHim || false}
                  onChange={(e) => updatePossession('peopleAttributePropertyToHim', e.target.checked)}
                />
                <span>ينسبه الناس إليه عرفًا (شهادات الجيران، السلطة...)</span>
              </label>
            </div>

            <h3 className="text-lg font-bold text-sky-900 mt-4">6. شرط عدم المنازعة (م240-4)</h3>
            <div className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.hasDisputes || false}
                  onChange={(e) => updatePossession('hasDisputes', e.target.checked)}
                />
                <span>هل وقعت منازعات سابقة حول هذه الحيازة؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.hasPreviousLawsuits || false}
                  onChange={(e) => updatePossession('hasPreviousLawsuits', e.target.checked)}
                />
                <span>هل رُفعت دعاوى قضائية سابقة بخصوص هذا العقار؟</span>
              </label>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-lg border-l-4 border-emerald-300 space-y-3">
            <h3 className="text-lg font-bold text-emerald-900">7. شرط الزمن ومدته (م250–251)</h3>
            <p className="text-xs text-gray-700 mb-2">يميز النظام بين الأجانب والأقارب والشركاء لتحديد مدة الحيازة.</p>
            <div className="space-y-2 text-sm">
              <label className="block font-semibold text-gray-700 mb-1">تصنيف الحائز</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.possessorCategory || ''}
                onChange={(e) => updatePossession('possessorCategory', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="أجنبي_غير_شريك">أجنبي غير شريك (10 سنوات)</option>
                <option value="قريب">قريب (40 سنة)</option>
                <option value="قريب_مع_عداوة">قريب مع عداوة (10 سنوات)</option>
                <option value="شريك">شريك في الملك</option>
              </select>
              <label className="block font-semibold text-gray-700 mt-3 mb-1">المدة المصرح بها للحيازة (بالسنوات)</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 border rounded-lg"
                value={poss.yearsOfPossession ?? ''}
                onChange={(e) =>
                  updatePossession(
                    'yearsOfPossession',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
              />
              <p className="text-[11px] text-emerald-800 mt-1">
                الأجنبي غير الشريك: 10 سنوات – الأقارب: 40 سنة – الأقارب مع عداوة: 10 سنوات.
              </p>
            </div>
          </div>
        </div>

        {/* (8) انتقال الحيازة + (9) الموانع القانونية */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-3">
            <h3 className="text-lg font-bold text-purple-900">8. انتقال الحيازة (م247)</h3>
            <div className="space-y-2 text-sm">
              <label className="block font-semibold text-gray-700 mb-1">أصل الحيازة</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.possessionOrigin || ''}
                onChange={(e) => updatePossession('possessionOrigin', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="أصلية">أصلية</option>
                <option value="موروثة">موروثة</option>
                <option value="مشتراة">مشتراة</option>
              </select>
              <label className="inline-flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.hasTackedPeriods || false}
                  onChange={(e) => updatePossession('hasTackedPeriods', e.target.checked)}
                />
                <span>هل تم ضم مدد حيازة سابقة (قاعدة ضم المدة)؟</span>
              </label>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-3">
            <h3 className="text-lg font-bold text-red-900">9. الموانع القانونية الكبيرة (م261)</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.isStateProperty || false}
                  onChange={(e) => updatePossession('isStateProperty', e.target.checked)}
                />
                <span>أملاك الدولة</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.isWaqfDomain || false}
                  onChange={(e) => updatePossession('isWaqfDomain', e.target.checked)}
                />
                <span>الأملاك المحبسة</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.isCollectiveDomain || false}
                  onChange={(e) => updatePossession('isCollectiveDomain', e.target.checked)}
                />
                <span>الأملاك الجماعية (السلالية)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.isMunicipalDomain || false}
                  onChange={(e) => updatePossession('isMunicipalDomain', e.target.checked)}
                />
                <span>الأملاك البلدية</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.isRegisteredDomain || false}
                  onChange={(e) => updatePossession('isRegisteredDomain', e.target.checked)}
                />
                <span>الأملاك المحفظة</span>
              </label>
            </div>
            <p className="text-xs text-red-900 mt-2">
              ❗ لا حيازة على هذه الأملاك إلا في نطاق ضيق واستثناءات محددة قانونًا؛ يجب التنبيه بقوة في الرسم.
            </p>
          </div>
        </div>

        {/* (10) الأسئلة الذكية السيناريوهاتية + (11) الاجتهاد القضائي */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-300 space-y-3">
            <h3 className="text-lg font-bold text-orange-900">10. أسئلة ذكية لتمييز الحالات</h3>
            <div className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.isPropertyRegistered || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      isPropertyRegistered: e.target.checked,
                    })
                  }
                />
                <span>هل العقار محفظ؟ (إذا نعم، لا مفعول للحيازة على تقييد الغير)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.isPropertyWaqf || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      isPropertyWaqf: e.target.checked,
                    })
                  }
                />
                <span>هل العقار محبس؟ (لا حيازة على المحبس إلا في حدود المنفعة)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.isPropertyInherited || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      isPropertyInherited: e.target.checked,
                    })
                  }
                />
                <span>هل العقار موروث؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.inheritanceDateKnown || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      inheritanceDateKnown: e.target.checked,
                    })
                  }
                />
                <span>هل تاريخ وفاة الموروث مضبوط؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.hasCustomPartition || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      hasCustomPartition: e.target.checked,
                    })
                  }
                />
                <span>هل كانت مقاسمة عرفية سابقة؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.hasExchangeContract || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      hasExchangeContract: e.target.checked,
                    })
                  }
                />
                <span>هل كانت معاوضة أو بيع مقابل؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.wasLoan || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      wasLoan: e.target.checked,
                    })
                  }
                />
                <span>هل سبق أن كانت العلاقة مجرد إعارة؟ (تمييز الإعارة عن الحيازة)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.wasPartnership || false}
                  onChange={(e) =>
                    updateNested('smartScenarios', {
                      ...smart,
                      wasPartnership: e.target.checked,
                    })
                  }
                />
                <span>هل كانت شركة أو استغلال مشترك؟</span>
              </label>
            </div>
          </div>

          <div className="bg-violet-50 p-6 rounded-lg border-l-4 border-violet-300 space-y-3">
            <h3 className="text-lg font-bold text-violet-900">11. الاجتهاد القضائي (اختياري)</h3>
            <div className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.applyPossessionAsStrongEvidence || false}
                  onChange={(e) => updatePossession('applyPossessionAsStrongEvidence', e.target.checked)}
                />
                <span>تطبيق قاعدة &quot;الحيازة أقوى البينات&quot; (قضاء محكمة النقض).</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.applyTackingRule || false}
                  onChange={(e) => updatePossession('applyTackingRule', e.target.checked)}
                />
                <span>تطبيق قاعدة &quot;ضم المدة&quot; بحسب ظروف النازلة.</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={poss.distinguishLoanFromPossession || false}
                  onChange={(e) => updatePossession('distinguishLoanFromPossession', e.target.checked)}
                />
                <span>تمييز الإعارة عن الحيازة حمايةً لمالك الرقبة.</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                rows={3}
                placeholder="ملاحظات حول الاجتهادات القضائية أو المراجع التي ترغب في استحضارها."
                value={poss.caseLawNotes || ''}
                onChange={(e) => updatePossession('caseLawNotes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* (12) التنبيهات والتحذيرات + (13) الأنظمة المرتبطة */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-3">
            <h3 className="text-lg font-bold text-red-900">12. التنبيهات والتحذيرات</h3>
            <div className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={alerts.differenceBetweenPossessionAndUse || false}
                  onChange={(e) =>
                    updateNested('alerts', {
                      ...alerts,
                      differenceBetweenPossessionAndUse: e.target.checked,
                    })
                  }
                />
                <span>⚠ اختلاف جوهري بين مجرد التصرف (الاستعمال) وبين الحيازة الاستحقاقية.</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={alerts.interruptionOfPossession || false}
                  onChange={(e) =>
                    updateNested('alerts', {
                      ...alerts,
                      interruptionOfPossession: e.target.checked,
                    })
                  }
                />
                <span>⚠ الانقطاع الطويل للحيازة (م257) قد يقطع أثرها.</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={alerts.noPossessionBetweenSpousesAndAscendants || false}
                  onChange={(e) =>
                    updateNested('alerts', {
                      ...alerts,
                      noPossessionBetweenSpousesAndAscendants: e.target.checked,
                    })
                  }
                />
                <span>⚠ عدم قيام الحيازة بين الأزواج والآباء والأبناء في الأصل (م255).</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-300 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">13. الأنظمة القانونية المرتبطة</h3>
            <p className="text-xs text-gray-700">
              يستحسن التنبيه إلى ارتباط الحيازة بقواعد التحفيظ العقاري، قانون المسطرة المدنية، وقانون الالتزامات والعقود، خاصة في ما يتعلق بالإثبات، التقادم، والمنازعات.
            </p>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={3}
              placeholder="ملاحظات حول النصوص المرتبطة أو إحالات تشريعية ترغب في تدوينها."
              value={poss.legalFrameworkNotes || ''}
              onChange={(e) => updatePossession('legalFrameworkNotes', e.target.value)}
            />
            <div className="text-[11px] text-slate-800 mt-1">
              مراجع: مدونة الحقوق العينية (ف40–261) – ظهير التحفيظ العقاري 1913 – قانون المسطرة المدنية – قانون الالتزامات والعقود.
            </div>
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer II (Enhanced) — توصيف العقار التفصيلي
            ======================================================================== */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-lg border-l-4 border-teal-400 space-y-4">
          <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
            <span>📋</span>
            <span>II. توصيف العقار — Legal Property Profiling</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع العقار *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.propertyType || ''}
                onChange={(e) => updatePossession('propertyType', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="محفظ">محفظ</option>
                <option value="غير_محفظ">غير محفظ</option>
                <option value="في_طور_التحفيظ">في طور التحفيظ</option>
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-1">وضع الملكية القانونية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.ownershipStatus || ''}
                onChange={(e) => updatePossession('ownershipStatus', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="ملكية_خاصة">ملكية خاصة</option>
                <option value="حبس">حبس</option>
                <option value="جماعي">جماعي</option>
                <option value="ملك_دولة">ملك الدولة</option>
                <option value="ملك_جماعة_ترابية">ملك جماعة ترابية</option>
                <option value="غابات">غابات</option>
                <option value="ملك_عمومي">ملك عمومي</option>
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الموقع الإداري</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.locationProfile?.administrativeDivision || ''}
                onChange={(e) => updateNested('locationProfile', {
                  ...(poss.locationProfile || {}),
                  administrativeDivision: e.target.value as any
                })}
              >
                <option value="">اختر...</option>
                <option value="عمالة">عمالة</option>
                <option value="إقليم">إقليم</option>
                <option value="جماعة">جماعة</option>
                <option value="قيادة">قيادة</option>
              </select>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 text-sm">
            <p className="font-bold text-yellow-900 mb-2">⚠ تنبيه قانوني مهم</p>
            <p className="text-yellow-800">
              التطبيق يمنع تلقائيًا الحالات التي يمنع فيها القانون الحيازة الطارئة وفق المادة 78 و120 من مدونة الحقوق العينية.
              <br />يمنع اكتساب الملك بالحيازة على: أملاك الدولة — الحبس — الجموع — الجماعات المحلية — العقارات المحفظة — أملاك منظمة بقوانين خاصة
              <br /><a href="https://adala.justice.gov.ma" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">🔗 مرجع رسمي — وزارة العدل</a>
            </p>
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer VII — أسئلة ذكية لطالب الشهادة
            ======================================================================== */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border-l-4 border-amber-400 space-y-4">
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <span>❓</span>
            <span>VII. أسئلة ذكية لطالب الشهادة — Smart Questions</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل سبق تسجيل شراءات للعقار؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.applicantQuestionnaire?.hasPreviousPurchaseRegistration === opt}
                      onChange={() => updateNested('applicantQuestionnaire', {
                        ...(poss.applicantQuestionnaire || {}),
                        hasPreviousPurchaseRegistration: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {poss.applicantQuestionnaire?.hasPreviousPurchaseRegistration === 'نعم' && (
                <textarea
                  className="w-full px-3 py-2 border rounded-lg mt-2"
                  placeholder="تفاصيل التسجيلات السابقة..."
                  rows={2}
                  value={poss.applicantQuestionnaire.purchaseRegistrationDetails || ''}
                  onChange={(e) => updateNested('applicantQuestionnaire', {
                    ...(poss.applicantQuestionnaire || {}),
                    purchaseRegistrationDetails: e.target.value
                  })}
                />
              )}
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل سبق تقديم مطلب تحفيظ؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.applicantQuestionnaire?.hasRegistrationApplication === opt}
                      onChange={() => updateNested('applicantQuestionnaire', {
                        ...(poss.applicantQuestionnaire || {}),
                        hasRegistrationApplication: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل هو ملك خاص أم جماعي؟</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.applicantQuestionnaire?.isPrivateOrCollective || ''}
                onChange={(e) => updateNested('applicantQuestionnaire', {
                  ...(poss.applicantQuestionnaire || {}),
                  isPrivateOrCollective: e.target.value as any
                })}
              >
                <option value="">اختر...</option>
                <option value="خاص">خاص</option>
                <option value="جماعي">جماعي</option>
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل هناك رهن أو ارتفاق؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.applicantQuestionnaire?.hasEncumbrances === opt}
                      onChange={() => updateNested('applicantQuestionnaire', {
                        ...(poss.applicantQuestionnaire || {}),
                        hasEncumbrances: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل سبق نزاع قضائي؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.applicantQuestionnaire?.hasLegalDispute === opt}
                      onChange={() => updateNested('applicantQuestionnaire', {
                        ...(poss.applicantQuestionnaire || {}),
                        hasLegalDispute: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل داخل المدار الحضري أو القروي؟</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.applicantQuestionnaire?.locationCategory || ''}
                onChange={(e) => updateNested('applicantQuestionnaire', {
                  ...(poss.applicantQuestionnaire || {}),
                  locationCategory: e.target.value as any
                })}
              >
                <option value="">اختر...</option>
                <option value="حضري">حضري</option>
                <option value="قروي">قروي</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer VIII — أسئلة ذكية للشهود
            ======================================================================== */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-lg border-l-4 border-rose-400 space-y-4">
          <h2 className="text-xl font-bold text-rose-900 flex items-center gap-2">
            <span>👥</span>
            <span>VIII. أسئلة ذكية للشهود — Witness Questionnaire</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل يعرف الحائز معرفة يقينية؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.witnessQuestionnaire?.knowsApplicantWell === opt}
                      onChange={() => updateNested('witnessQuestionnaire', {
                        ...(poss.witnessQuestionnaire || {}),
                        knowsApplicantWell: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-1">سنوات المعرفة</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 border rounded-lg"
                value={poss.witnessQuestionnaire?.yearsOfKnowledge ?? ''}
                onChange={(e) => updateNested('witnessQuestionnaire', {
                  ...(poss.witnessQuestionnaire || {}),
                  yearsOfKnowledge: e.target.value ? Number(e.target.value) : undefined
                })}
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">مصدر المعرفة</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={poss.witnessQuestionnaire?.knowledgeSource || ''}
                onChange={(e) => updateNested('witnessQuestionnaire', {
                  ...(poss.witnessQuestionnaire || {}),
                  knowledgeSource: e.target.value as any
                })}
              >
                <option value="">اختر...</option>
                <option value="معاشرة">معاشرة</option>
                <option value="جوار">جوار</option>
                <option value="قرابة">قرابة</option>
                <option value="مخالطة">مخالطة</option>
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">هل عاين العقار فعليًا؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.witnessQuestionnaire?.actualInspection === opt}
                      onChange={() => updateNested('witnessQuestionnaire', {
                        ...(poss.witnessQuestionnaire || {}),
                        actualInspection: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">يشهد على غياب النزاع؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.witnessQuestionnaire?.attestsNoPossessionDispute === opt}
                      onChange={() => updateNested('witnessQuestionnaire', {
                        ...(poss.witnessQuestionnaire || {}),
                        attestsNoPossessionDispute: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">يشهد على عدم التفويت؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={poss.witnessQuestionnaire?.attestsNoTransferDuringLife === opt}
                      onChange={() => updateNested('witnessQuestionnaire', {
                        ...(poss.witnessQuestionnaire || {}),
                        attestsNoTransferDuringLife: opt as any
                      })}
                      className="w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border space-y-2">
            <p className="font-semibold text-gray-800">مؤشرات مادية للعقار:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'hasGates', label: 'أبواب' },
                { key: 'hasFences', label: 'أسوار' },
                { key: 'hasPlanting', label: 'غرس' },
                { key: 'hasBuilding', label: 'بناء' }
              ].map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={poss.witnessQuestionnaire?.physicalIndicators?.[key as keyof typeof poss.witnessQuestionnaire.physicalIndicators] || false}
                    onChange={(e) => updateNested('witnessQuestionnaire', {
                      ...(poss.witnessQuestionnaire || {}),
                      physicalIndicators: {
                        ...(poss.witnessQuestionnaire?.physicalIndicators || {}),
                        [key]: e.target.checked
                      }
                    })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer IX — التنبيهات والتحذيرات القانونية
            ======================================================================== */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-l-4 border-red-500 space-y-4">
          <h2 className="text-xl font-bold text-red-900 flex items-center gap-2">
            <span>⚠️</span>
            <span>IX. التنبيهات والتحذيرات القانونية — Legal Alerts</span>
          </h2>
          
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-3 bg-white p-3 rounded border-l-4 border-red-400">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5"
                checked={poss.legalAlerts?.alert_CannotCertifyRegisteredProperty || false}
                onChange={(e) => updateNested('legalAlerts', {
                  ...(poss.legalAlerts || {}),
                  alert_CannotCertifyRegisteredProperty: e.target.checked
                })}
              />
              <div>
                <p className="font-bold text-red-900">⚠ منع تلقي موجب ملكية على عقار محفظ</p>
                <p className="text-gray-700 text-xs mt-1">الملك المحفظ لا تثبت ملكيته باللفيف بل بالرسم العقاري (المادة 3 من مدونة الحقوق العينية)</p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 bg-white p-3 rounded border-l-4 border-red-400">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5"
                checked={poss.legalAlerts?.alert_CannotCertifyStateProperty || false}
                onChange={(e) => updateNested('legalAlerts', {
                  ...(poss.legalAlerts || {}),
                  alert_CannotCertifyStateProperty: e.target.checked
                })}
              />
              <div>
                <p className="font-bold text-red-900">⚠ منع تلقي موجب على أملاك الدولة</p>
                <p className="text-gray-700 text-xs mt-1">أملاك الدولة الخاص والعام لا تكتسب بالحيازة (المواد 222 وما بعدها)</p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 bg-white p-3 rounded border-l-4 border-red-400">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5"
                checked={poss.legalAlerts?.alert_CannotCertifyWaqfProperty || false}
                onChange={(e) => updateNested('legalAlerts', {
                  ...(poss.legalAlerts || {}),
                  alert_CannotCertifyWaqfProperty: e.target.checked
                })}
              />
              <div>
                <p className="font-bold text-red-900">⚠ منع الحيازة على الحبس</p>
                <p className="text-gray-700 text-xs mt-1">الأملاك الحبسية محمية بقانون الوقف — مدونة الأوقاف 2010</p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 bg-white p-3 rounded border-l-4 border-orange-400">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5"
                checked={poss.legalAlerts?.alert_NotaryLiabilityForErrors || false}
                onChange={(e) => updateNested('legalAlerts', {
                  ...(poss.legalAlerts || {}),
                  alert_NotaryLiabilityForErrors: e.target.checked
                })}
              />
              <div>
                <p className="font-bold text-orange-900">⚠ مسؤولية العدول عند حدوث غلط جوهري</p>
                <p className="text-gray-700 text-xs mt-1">يجب التحقق من جميع الشروط لتفادي المسؤولية المهنية</p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 bg-white p-3 rounded border-l-4 border-yellow-400">
              <input
                type="checkbox"
                className="w-5 h-5 mt-0.5"
                checked={poss.legalAlerts?.alert_DocumentationDiffersFromTitle || false}
                onChange={(e) => updateNested('legalAlerts', {
                  ...(poss.legalAlerts || {}),
                  alert_DocumentationDiffersFromTitle: e.target.checked
                })}
              />
              <div>
                <p className="font-bold text-yellow-900">ℹ️ توثيق العقار يختلف عن إثبات الملك</p>
                <p className="text-gray-700 text-xs mt-1">التوثيق العدلي لا يعني بالضرورة إثبات الملكية، بل يوثق التصرف</p>
              </div>
            </label>
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer X — القوانين المنظمة للشهادة
            ======================================================================== */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500 space-y-4">
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <span>📚</span>
            <span>X. القوانين المنظمة للشهادة — Governing Laws</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {[
              { key: 'realRightsCode', label: '✔ مدونة الحقوق العينية (المواد 239-261)' },
              { key: 'landRegistrationLaw', label: '✔ قانون التحفيظ العقاري (ظهير 1913 + قانون 14-07)' },
              { key: 'waqfCode', label: '✔ مدونة الأوقاف (قانون 2010)' },
              { key: 'lafafLaw', label: '✔ قانون اللفيف (المشروع)' },
              { key: 'caseLaw', label: '✔ فقه القضاء بمحكمة النقض' },
              { key: 'malikiJurisprudence', label: '✔ الفقه المالكي' },
              { key: 'ministryCirculars', label: '✔ منشورات وزارة العدل + المالية (تسجيل)' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 bg-white p-3 rounded border">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={Boolean(poss.governingLaws?.[key as keyof typeof poss.governingLaws])}
                  onChange={(e) => updateNested('governingLaws', {
                    ...(poss.governingLaws || {}),
                    [key]: e.target.checked
                  })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">مراجع رسمية إضافية:</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="أضف أي مراجع رسمية أخرى..."
              value={poss.governingLaws?.officialReferences || ''}
              onChange={(e) => updateNested('governingLaws', {
                ...(poss.governingLaws || {}),
                officialReferences: e.target.value
              })}
            />
          </div>
        </div>

        {/* ========================================================================
            NEW: Layer XI — النتيجة والتوجيه (Auto-Generated with Validation)
            ======================================================================== */}
        {(() => {
          const filters = executeLegalFiltersForPossession(poss);
          const conditions = validatePossessionConditions(poss);
          const witnesses = validateWitnessRequirements(poss);
          const outcome = generateOutcomeRouting(poss, filters, conditions, witnesses);
          
          const statusColors = {
            'مقبول_للاستكمال': 'bg-green-50 border-green-500 text-green-900',
            'مؤجل_لطلب_شواهد': 'bg-yellow-50 border-yellow-500 text-yellow-900',
            'مرفوض_منع_قانوني': 'bg-red-50 border-red-500 text-red-900',
            'تحويل_لمطلب_تحفيظ': 'bg-blue-50 border-blue-500 text-blue-900',
            'تحويل_لدعوى_قضائية': 'bg-purple-50 border-purple-500 text-purple-900'
          };
          
          const statusIcons = {
            'مقبول_للاستكمال': '✅',
            'مؤجل_لطلب_شواهد': '⏸️',
            'مرفوض_منع_قانوني': '❌',
            'تحويل_لمطلب_تحفيظ': '🔄',
            'تحويل_لدعوى_قضائية': '⚖️'
          };
          
          return (
            <div className={`p-6 rounded-lg border-l-4 space-y-4 ${statusColors[outcome.status]}`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>{statusIcons[outcome.status]}</span>
                <span>XI. النتيجة والتوجيه — Outcome Routing</span>
              </h2>
              
              <div className="bg-white/70 p-4 rounded space-y-2">
                <p className="font-bold">الحالة: {outcome.status.replace(/_/g, ' ')}</p>
                <p className="text-sm"><span className="font-semibold">السبب:</span> {outcome.reason}</p>
                <div className="text-sm whitespace-pre-line"><span className="font-semibold">الخطوات التالية:</span><br />{outcome.nextSteps}</div>
              </div>
              
              {!filters.canProceed && (
                <div className="bg-red-100 border border-red-300 p-4 rounded">
                  <p className="font-bold text-red-900 mb-2">🚫 فلاتر قانونية نشطة:</p>
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    {Object.entries(filters.filters).filter(([_, f]) => f.triggered).map(([key, f]) => (
                      <li key={key}>{f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {conditions.failedConditions.length > 0 && (
                <div className="bg-yellow-100 border border-yellow-300 p-4 rounded">
                  <p className="font-bold text-yellow-900 mb-2">⚠️ شروط غير مستوفاة:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    {conditions.failedConditions.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {witnesses.issues.length > 0 && (
                <div className="bg-orange-100 border border-orange-300 p-4 rounded">
                  <p className="font-bold text-orange-900 mb-2">👥 مشاكل في الشهود:</p>
                  <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                    {witnesses.issues.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {conditions.warnings.length > 0 && filters.canProceed && (
                <div className="bg-blue-100 border border-blue-300 p-4 rounded">
                  <p className="font-bold text-blue-900 mb-2">ℹ️ ملاحظات وتنبيهات:</p>
                  <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    {conditions.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* Navigation */}
        <div className="flex gap-4 justify-between mt-4">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
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
  // Step 3: Munakala Deed Details (رسم مناقلة)
  // ============================================================================

export const PossessionWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Malakiya_Applicant state={state} setState={setState} />}
      {state.step === 1.5 && <Step1_5_Malakiya_OwnerStatus state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_PossessionProof state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
