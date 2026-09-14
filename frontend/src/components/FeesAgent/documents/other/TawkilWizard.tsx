import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
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

  export const Step1_Tawkil_Principals: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const [tempPrincipals, setTempPrincipals] = useState<Party[]>(
      state.buyers.length ? state.buyers : [createEmptyParty()]
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handlePrincipalChange = (index: number, field: keyof Party, value: any) => {
      setTempPrincipals((prev) =>
        prev.map((p, idx) => (idx === index ? { ...p, [field]: value } : p))
      );
    };

    const addPrincipal = () => setTempPrincipals((prev) => [...prev, createEmptyParty()]);
    const removePrincipal = (index: number) => setTempPrincipals((prev) => prev.filter((_, idx) => idx !== index));

    const handleNext = () => {
      // Basic validation
      const newErrors: Record<string, string> = {};
      tempPrincipals.forEach((p, idx) => {
        if (!p.name) newErrors[`name_${idx}`] = 'الاسم مطلوب';
        if (!p.idNumber) newErrors[`cin_${idx}`] = 'رقم البطاقة مطلوب';
        if (p.actingCapacity === 'legal_representative') {
           if (!p.legalEntityName) newErrors[`legalName_${idx}`] = 'اسم الشركة مطلوب';
           // Add more validations
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setState(prev => ({ ...prev, buyers: tempPrincipals, step: 2 }));
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

        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الأولى: بيانات الموكل / الموكلين</h2>
          <p className="text-gray-700">أدخل بيانات الأشخاص الذين يقومون بالتوكيل.</p>
        </div>

        {tempPrincipals.map((principal, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">الموكل رقم {index + 1}</h3>
              {tempPrincipals.length > 1 && (
                <button onClick={() => removePrincipal(index)} className="text-red-500">حذف</button>
              )}
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nationality Selection */}
              <div className="col-span-1 md:col-span-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={principal.nationality !== 'اجنبي'} // Default to Moroccan
                      onChange={() => handlePrincipalChange(index, 'nationality', 'مغربي')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>مغربي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={principal.nationality === 'اجنبي'}
                      onChange={() => handlePrincipalChange(index, 'nationality', 'اجنبي')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>أجنبي</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">الاسم الكامل (بالعربية)</label>
                <input 
                  type="text" 
                  value={principal.name} 
                  onChange={(e) => handlePrincipalChange(index, 'name', e.target.value)}
                  className="w-full p-2 border rounded"
                />
                {errors[`name_${index}`] && <p className="text-red-500 text-xs">{errors[`name_${index}`]}</p>}
              </div>

              {principal.nationality === 'اجنبي' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">الاسم الكامل (باللاتينية)</label>
                  <input 
                    type="text" 
                    value={principal.nameLatin || ''} 
                    onChange={(e) => handlePrincipalChange(index, 'nameLatin', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Full Name (Latin)"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">رقم البطاقة الوطنية</label>
                <input 
                  type="text" 
                  value={principal.idNumber} 
                  onChange={(e) => handlePrincipalChange(index, 'idNumber', e.target.value)}
                  className="w-full p-2 border rounded"
                />
                 {errors[`cin_${index}`] && <p className="text-red-500 text-xs">{errors[`cin_${index}`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">العنوان</label>
                <input 
                  type="text" 
                  value={principal.address} 
                  onChange={(e) => handlePrincipalChange(index, 'address', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">المهنة</label>
                <input 
                  type="text" 
                  value={principal.profession} 
                  onChange={(e) => handlePrincipalChange(index, 'profession', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">تاريخ الازدياد</label>
                <input 
                  type="date" 
                  value={principal.dateOfBirth || ''} 
                  onChange={(e) => handlePrincipalChange(index, 'dateOfBirth', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">مكان الازدياد</label>
                <input 
                  type="text" 
                  value={principal.placeOfBirth || ''} 
                  onChange={(e) => handlePrincipalChange(index, 'placeOfBirth', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">اسم الأب</label>
                <input 
                  type="text" 
                  value={principal.fatherName || ''} 
                  onChange={(e) => handlePrincipalChange(index, 'fatherName', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">اسم الأم</label>
                <input 
                  type="text" 
                  value={principal.motherName || ''} 
                  onChange={(e) => handlePrincipalChange(index, 'motherName', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">الحالة المدنية</label>
                <select 
                  value={principal.maritalStatus} 
                  onChange={(e) => handlePrincipalChange(index, 'maritalStatus', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">اختر...</option>
                  <option value="اعزب">عازب(ة)</option>
                  <option value="متزوج">متزوج(ة)</option>
                  <option value="مطلق">مطلق(ة)</option>
                  <option value="ارمل">أرمل(ة)</option>
                </select>
              </div>
            </div>

            {/* Capacity */}
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <label className="block text-sm font-bold mb-2">صفة الموكل</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name={`capacity_${index}`} 
                    checked={principal.actingCapacity !== 'legal_representative'}
                    onChange={() => handlePrincipalChange(index, 'actingCapacity', 'personal')}
                  />
                  باسمه الشخصي
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name={`capacity_${index}`} 
                    checked={principal.actingCapacity === 'legal_representative'}
                    onChange={() => handlePrincipalChange(index, 'actingCapacity', 'legal_representative')}
                  />
                  بصفته ممثلاً قانونياً
                </label>
              </div>

              {principal.actingCapacity === 'legal_representative' && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <div className="col-span-2 bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                    📌 تنبيه: التمثيل ثابت بموجب القانون الأساسي أو محضر التعيين أو محضر الجمع العام.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">اسم الشركة / الهيئة</label>
                    <input 
                      type="text" 
                      value={principal.legalEntityName || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'legalEntityName', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">الشكل القانوني</label>
                    <input 
                      type="text" 
                      value={principal.legalForm || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'legalForm', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">ICE</label>
                    <input 
                      type="text" 
                      value={principal.ice || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'ice', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">رقم السجل التجاري</label>
                    <input 
                      type="text" 
                      value={principal.commercialRegister || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'commercialRegister', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-1">المقر الاجتماعي</label>
                    <input 
                      type="text" 
                      value={principal.headquartersAddress || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'headquartersAddress', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">صفة الممثل (مسير، رئيس...)</label>
                    <input 
                      type="text" 
                      value={principal.legalRepresentativeCapacity || ''} 
                      onChange={(e) => handlePrincipalChange(index, 'legalRepresentativeCapacity', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <button onClick={addPrincipal} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          + إضافة موكل آخر
        </button>

        <div className="flex justify-end">
          <button onClick={handleNext} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            التالي
          </button>
        </div>
      </div>
    );
  };


  export const Step2_Tawkil_Agents: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const [tempAgents, setTempAgents] = useState<Party[]>(
      state.sellers.length ? state.sellers : [createEmptyParty()]
    );
    const [agencyMode, setAgencyMode] = useState<'individual' | 'joint' | 'mixed'>((state.agencyMode as any) || 'individual');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleAgentChange = (index: number, field: keyof Party, value: any) => {
      setTempAgents((prev) =>
        prev.map((p, idx) => (idx === index ? { ...p, [field]: value } : p))
      );
    };

    const addAgent = () => setTempAgents((prev) => [...prev, createEmptyParty()]);
    const removeAgent = (index: number) => setTempAgents((prev) => prev.filter((_, idx) => idx !== index));

    const handleNext = () => {
      const newErrors: Record<string, string> = {};
      tempAgents.forEach((p, idx) => {
        if (!p.name) newErrors[`name_${idx}`] = 'الاسم مطلوب';
        if (!p.idNumber) newErrors[`cin_${idx}`] = 'رقم البطاقة مطلوب';
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setState(prev => ({ ...prev, sellers: tempAgents, agencyMode, step: 3 }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثانية: بيانات الوكيل / الوكلاء</h2>
          <p className="text-gray-700">أدخل بيانات الأشخاص الذين يتم توكيلهم.</p>
        </div>

        {tempAgents.map((agent, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">الوكيل رقم {index + 1}</h3>
              {tempAgents.length > 1 && (
                <button onClick={() => removeAgent(index)} className="text-red-500">حذف</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">الاسم الكامل</label>
                <input 
                  type="text" 
                  value={agent.name} 
                  onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
                  className="w-full p-2 border rounded"
                />
                {errors[`name_${index}`] && <p className="text-red-500 text-xs">{errors[`name_${index}`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">رقم البطاقة الوطنية</label>
                <input 
                  type="text" 
                  value={agent.idNumber} 
                  onChange={(e) => handleAgentChange(index, 'idNumber', e.target.value)}
                  className="w-full p-2 border rounded"
                />
                {errors[`cin_${index}`] && <p className="text-red-500 text-xs">{errors[`cin_${index}`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">العنوان</label>
                <input 
                  type="text" 
                  value={agent.address} 
                  onChange={(e) => handleAgentChange(index, 'address', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">تاريخ الازدياد</label>
                <input 
                  type="date" 
                  value={agent.dateOfBirth || ''} 
                  onChange={(e) => handleAgentChange(index, 'dateOfBirth', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">مكان الازدياد</label>
                <input 
                  type="text" 
                  value={agent.placeOfBirth || ''} 
                  onChange={(e) => handleAgentChange(index, 'placeOfBirth', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">المهنة (اختياري)</label>
                <input 
                  type="text" 
                  value={agent.profession} 
                  onChange={(e) => handleAgentChange(index, 'profession', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        ))}

        <button onClick={addAgent} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          + إضافة وكيل آخر
        </button>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">كيفية ممارسة الوكالة</h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input 
                type="radio" 
                name="agencyMode" 
                value="individual" 
                checked={agencyMode === 'individual'}
                onChange={() => setAgencyMode('individual')}
              />
              منفرداً
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="radio" 
                name="agencyMode" 
                value="joint" 
                checked={agencyMode === 'joint'}
                onChange={() => setAgencyMode('joint')}
              />
              مجتمعاً
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="radio" 
                name="agencyMode" 
                value="mixed" 
                checked={agencyMode === 'mixed'}
                onChange={() => setAgencyMode('mixed')}
              />
              منفرداً ومجتمعاً
            </label>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setState(prev => ({ ...prev, step: 1 }))} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            السابق
          </button>
          <button onClick={handleNext} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            التالي
          </button>
        </div>
      </div>
    );
  };


  export const Step3_Tawkil_Scope: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const [scope, setScope] = useState(state.tawkilScope || {});

    const updateScope = (section: string, field: string, value: any) => {
      setScope(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }));
    };

    const updateDeepScope = (section: string, subsection: string, field: string, value: any) => {
       setScope(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [subsection]: {
             ...(prev[section as keyof typeof prev] as any)?.[subsection],
             [field]: value
          }
        }
      }));
    };

    const handleNext = () => {
      setState(prev => ({ ...prev, tawkilScope: scope, step: 6 }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: نطاق التوكيل</h2>
          <p className="text-gray-700">حدد الصلاحيات الممنوحة للوكيل بدقة.</p>
        </div>

        {/* A. Professional & Judicial */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">أ. التمثيل أمام الجهات المهنية والقضائية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.professionalJudicial?.courts} onChange={(e) => updateScope('professionalJudicial', 'courts', e.target.checked)} />
              المحاكم (جميع الدرجات، الترافع، المقالات، الطعون)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.professionalJudicial?.lawyers} onChange={(e) => updateScope('professionalJudicial', 'lawyers', e.target.checked)} />
              المحامين (التعاقد، الأتعاب، تتبع الملفات)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.professionalJudicial?.notaries} onChange={(e) => updateScope('professionalJudicial', 'notaries', e.target.checked)} />
              العدول والموثقين (تحرير الرسوم، التوقيع)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.professionalJudicial?.judicialCommissioners} onChange={(e) => updateScope('professionalJudicial', 'judicialCommissioners', e.target.checked)} />
              المفوضين القضائيين (التبليغ، التنفيذ)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.professionalJudicial?.experts} onChange={(e) => updateScope('professionalJudicial', 'experts', e.target.checked)} />
              الخبراء (التعيين، الحضور، التقارير)
            </label>
          </div>
        </div>

        {/* B. Public Administration */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">ب. التمثيل أمام الإدارات العمومية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.publicAdmins} onChange={(e) => updateScope('publicAdministration', 'publicAdmins', e.target.checked)} />
              الإدارات العمومية
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.territorialCollectivities} onChange={(e) => updateScope('publicAdministration', 'territorialCollectivities', e.target.checked)} />
              الجماعات الترابية
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.externalServices} onChange={(e) => updateScope('publicAdministration', 'externalServices', e.target.checked)} />
              المصالح الخارجية
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.landConservation} onChange={(e) => updateScope('publicAdministration', 'landConservation', e.target.checked)} />
              المحافظة العقارية
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.taxAdmin} onChange={(e) => updateScope('publicAdministration', 'taxAdmin', e.target.checked)} />
              إدارة الضرائب
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.registrationAdmin} onChange={(e) => updateScope('publicAdministration', 'registrationAdmin', e.target.checked)} />
              إدارة التسجيل
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.publicAdministration?.customsAdmin} onChange={(e) => updateScope('publicAdministration', 'customsAdmin', e.target.checked)} />
              إدارة الجمارك
            </label>
          </div>
        </div>

        {/* C. Private Bodies */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">ج. الإدارات والهيئات الخاصة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.privateBodies?.banks} onChange={(e) => updateScope('privateBodies', 'banks', e.target.checked)} />
              الأبناك
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.privateBodies?.insurance} onChange={(e) => updateScope('privateBodies', 'insurance', e.target.checked)} />
              شركات التأمين
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.privateBodies?.privateInstitutions} onChange={(e) => updateScope('privateBodies', 'privateInstitutions', e.target.checked)} />
              المؤسسات الخاصة
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.privateBodies?.companies} onChange={(e) => updateScope('privateBodies', 'companies', e.target.checked)} />
              الشركات
            </label>
          </div>
        </div>

        {/* D. Legal Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">د. التصرفات القانونية (بيع – شراء – تفويت...)</h3>
          <div className="mb-4">
            <label className="block font-semibold mb-2">نوع الوكالة:</label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="legalActionType" 
                  checked={scope.legalActions?.type === 'general'} 
                  onChange={() => updateScope('legalActions', 'type', 'general')} 
                />
                عامة
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="legalActionType" 
                  checked={scope.legalActions?.type === 'special'} 
                  onChange={() => updateScope('legalActions', 'type', 'special')} 
                />
                خاصة (عقارية/تجارية)
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="legalActionType" 
                  checked={scope.legalActions?.type === 'marriage'} 
                  onChange={() => updateScope('legalActions', 'type', 'marriage')} 
                />
                خاصة بابرام عقد الزواج
              </label>
            </div>
          </div>

          {scope.legalActions?.type === 'marriage' && (
            <div className="border-t pt-4 mt-4 space-y-4 animate-fadeIn bg-pink-50 p-4 rounded-lg border-pink-200">
              <h4 className="font-bold text-pink-800">توكيل خاص بالزواج</h4>
              
              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="partnerType" 
                    checked={scope.legalActions?.marriageDetails?.partnerType === 'suitor'} 
                    onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'partnerType', 'suitor')} 
                  />
                  <span className="font-semibold">الخاطب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="partnerType" 
                    checked={scope.legalActions?.marriageDetails?.partnerType === 'fiancee'} 
                    onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'partnerType', 'fiancee')} 
                  />
                  <span className="font-semibold">المخطوبة</span>
                </label>
              </div>

              <div className="bg-white p-3 rounded border border-pink-100 text-center mb-4">
                <p className="text-lg font-amiri leading-loose text-gray-800">
                  "لينوب {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'عنها' : 'عنه'} ويقوم {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'مقامها' : 'مقامه'} في عقد {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'زواجها' : 'زواجه'} من {scope.legalActions?.marriageDetails?.partnerType === 'fiancee' ? 'السيد/الشاب' : 'السيدة/الآنسة'}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">الاسم الكامل للطرف الآخر</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerName || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">الجنسية</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerNationality || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerNationality', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">اسم الأب</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerFatherName || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerFatherName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">اسم الأم</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerMotherName || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerMotherName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">تاريخ الازدياد</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerDOB || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerDOB', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">رقم البطاقة الوطنية (اختياري)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerIdNumber || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerIdNumber', e.target.value)}
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">العنوان</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerAddress || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerAddress', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">المهنة</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.partnerProfession || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'partnerProfession', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">مقدار الصداق (بالأرقام)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.dowryAmount || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        updateDeepScope('legalActions', 'marriageDetails', 'dowryAmount', val);
                        const num = parseInt(val);
                        if (!isNaN(num)) {
                            updateDeepScope('legalActions', 'marriageDetails', 'dowryAmountArabic', convertNumberToArabicWords(num));
                        } else {
                            updateDeepScope('legalActions', 'marriageDetails', 'dowryAmountArabic', '');
                        }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">مقدار الصداق (بالحروف)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded bg-gray-50"
                    value={scope.legalActions?.marriageDetails?.dowryAmountArabic || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'dowryAmountArabic', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">رقم جواز السفر</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.passportNumber || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'passportNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">صالح إلى غاية</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.marriageDetails?.passportValidUntil || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'passportValidUntil', e.target.value)}
                  />
                </div>
              </div>

              {/* Conditions Section */}
              <div className="border-t border-pink-200 pt-4 mt-4">
                <h5 className="font-bold text-pink-800 mb-3">الاشتراطات</h5>
                
                {/* Condition ON Partner */}
                <div className="mb-4">
                  <label className="block font-semibold mb-2">
                    {scope.legalActions?.marriageDetails?.partnerType === 'suitor' 
                      ? 'هل للخاطب شرط يشترطه على مخطوبته؟' 
                      : 'هل للمخطوبة شرط تشترطه على خاطبها؟'}
                  </label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="hasConditionOnPartner" 
                        checked={scope.legalActions?.marriageDetails?.hasConditionOnPartner === true} 
                        onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'hasConditionOnPartner', true)} 
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="hasConditionOnPartner" 
                        checked={scope.legalActions?.marriageDetails?.hasConditionOnPartner === false} 
                        onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'hasConditionOnPartner', false)} 
                      />
                      لا
                    </label>
                  </div>
                  {scope.legalActions?.marriageDetails?.hasConditionOnPartner && (
                    <textarea 
                      className="w-full p-2 border rounded" 
                      placeholder="أدخل تفاصيل الشرط..."
                      value={scope.legalActions?.marriageDetails?.conditionOnPartnerText || ''}
                      onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'conditionOnPartnerText', e.target.value)}
                    />
                  )}
                </div>

                {/* Condition FROM Partner */}
                <div className="mb-4">
                  <label className="block font-semibold mb-2">
                    {scope.legalActions?.marriageDetails?.partnerType === 'suitor' 
                      ? 'هل هناك شرط يقبله من المخطوبة؟' 
                      : 'هل هناك شرط تقبله من الخاطب؟'}
                  </label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="acceptsConditionFromPartner" 
                        checked={scope.legalActions?.marriageDetails?.acceptsConditionFromPartner === true} 
                        onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'acceptsConditionFromPartner', true)} 
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="acceptsConditionFromPartner" 
                        checked={scope.legalActions?.marriageDetails?.acceptsConditionFromPartner === false} 
                        onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'acceptsConditionFromPartner', false)} 
                      />
                      لا
                    </label>
                  </div>
                  {scope.legalActions?.marriageDetails?.acceptsConditionFromPartner && (
                    <textarea 
                      className="w-full p-2 border rounded" 
                      placeholder="أدخل تفاصيل الشرط المقبول..."
                      value={scope.legalActions?.marriageDetails?.conditionFromPartnerText || ''}
                      onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'conditionFromPartnerText', e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Capacity Section */}
              <div className="border-t border-pink-200 pt-4 mt-4">
                <h5 className="font-bold text-pink-800 mb-3">الأهلية</h5>
                <div className="mb-4">
                  <label className="block font-semibold mb-2">
                    {scope.legalActions?.marriageDetails?.partnerType === 'suitor' 
                      ? 'هل يتمتع الخاطب بالاهليه الكاملة لابرام عقد الزواج؟' 
                      : 'هل تتمتع المخطوبة بالاهليه الكاملة لابرام عقد الزواج؟'}
                  </label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="isFullyCompetent" 
                        checked={scope.legalActions?.marriageDetails?.isFullyCompetent === true} 
                        onChange={() => {
                            updateDeepScope('legalActions', 'marriageDetails', 'isFullyCompetent', true);
                            updateDeepScope('legalActions', 'marriageDetails', 'incompetenceReason', undefined);
                        }} 
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="isFullyCompetent" 
                        checked={scope.legalActions?.marriageDetails?.isFullyCompetent === false} 
                        onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'isFullyCompetent', false)} 
                      />
                      لا
                    </label>
                  </div>

                  {scope.legalActions?.marriageDetails?.isFullyCompetent === false && (
                    <div className="bg-red-50 p-4 rounded border border-red-200 animate-fadeIn">
                       <label className="block font-semibold mb-2">سبب نقص الأهلية:</label>
                       <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="incompetenceReason" 
                            checked={scope.legalActions?.marriageDetails?.incompetenceReason === 'partial'} 
                            onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'incompetenceReason', 'partial')} 
                          />
                          ناقص الاهلية
                        </label>
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="incompetenceReason" 
                            checked={scope.legalActions?.marriageDetails?.incompetenceReason === 'minor'} 
                            onChange={() => updateDeepScope('legalActions', 'marriageDetails', 'incompetenceReason', 'minor')} 
                          />
                          قاصر
                        </label>
                      </div>
                      
                      {scope.legalActions?.marriageDetails?.incompetenceReason === 'partial' && (
                        <div className="text-red-700 font-bold mt-2 p-2 bg-red-100 rounded">
                          تنبيه: يخضع لاجراءات الولاية او الاذن القضائي حسب الحالة
                        </div>
                      )}
                      
                      {scope.legalActions?.marriageDetails?.incompetenceReason === 'minor' && (
                        <div className="text-red-700 font-bold mt-2 p-2 bg-red-100 rounded">
                          تنبيه: يجب الحصول على إذن زواج القاصر من قاضي الأسرة المكلف بالزواج
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Absence Justification */}
              <div className="border-t border-pink-200 pt-4 mt-4">
                <label className="block font-bold text-pink-800 mb-2">مبررات الغياب عن مجلس عقد الزواج؟</label>
                <textarea 
                  className="w-full p-2 border rounded h-24"
                  placeholder="أدخل مبررات الغياب..."
                  value={scope.legalActions?.marriageDetails?.absenceJustification || ''}
                  onChange={(e) => updateDeepScope('legalActions', 'marriageDetails', 'absenceJustification', e.target.value)}
                />
              </div>

            </div>
          )}

          {scope.legalActions?.type === 'special' && (
            <div className="border-t pt-4 mt-4 space-y-4 animate-fadeIn">
              <h4 className="font-bold text-gray-700">تفاصيل العقار (مثال للبيع):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">نوع العقار</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.propertyType || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'propertyType', e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="أرض">أرض</option>
                    <option value="منزل">منزل</option>
                    <option value="شقة">شقة</option>
                    <option value="محل تجاري">محل تجاري</option>
                    <option value="غير ذلك">غير ذلك</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">تعريف العقار (الاسم، الموقع، المساحة)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.propertyDefinition || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'propertyDefinition', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">الوضعية العقارية</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.propertyStatus || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'propertyStatus', e.target.value)}
                  >
                    <option value="">اختر...</option>
                    <option value="registered">محفظ</option>
                    <option value="unregistered">غير محفظ</option>
                  </select>
                </div>
              </div>

              {scope.legalActions?.specialDetails?.propertyStatus === 'registered' && (
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                  <input 
                    placeholder="رقم الرسم العقاري" 
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.titleNumber || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'titleNumber', e.target.value)}
                  />
                  <input 
                    placeholder="المحافظة العقارية" 
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.landRegistry || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'landRegistry', e.target.value)}
                  />
                  <input 
                    placeholder="رقم التضمين" 
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.inclusionNumber || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'inclusionNumber', e.target.value)}
                  />
                </div>
              )}

              {scope.legalActions?.specialDetails?.propertyStatus === 'unregistered' && (
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                  <input 
                    placeholder="سند التملك" 
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.ownershipDeed || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'ownershipDeed', e.target.value)}
                  />
                  <input 
                    placeholder="تاريخ السند" 
                    type="date"
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.deedDate || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'deedDate', e.target.value)}
                  />
                  <input 
                    placeholder="الجهة التي تلقته" 
                    className="p-2 border rounded"
                    value={scope.legalActions?.specialDetails?.deedAuthority || ''}
                    onChange={(e) => updateDeepScope('legalActions', 'specialDetails', 'deedAuthority', e.target.value)}
                  />
                </div>
              )}

              <div className="mt-4">
                <h5 className="font-semibold mb-2">صلاحيات البيع:</h5>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={scope.legalActions?.specialDetails?.salePowers?.setPrice} 
                      onChange={(e) => {
                         const current = scope.legalActions?.specialDetails?.salePowers || {};
                         updateDeepScope('legalActions', 'specialDetails', 'salePowers', { ...current, setPrice: e.target.checked });
                      }} 
                    />
                    تحديد الثمن
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={scope.legalActions?.specialDetails?.salePowers?.receivePrice} 
                      onChange={(e) => {
                         const current = scope.legalActions?.specialDetails?.salePowers || {};
                         updateDeepScope('legalActions', 'specialDetails', 'salePowers', { ...current, receivePrice: e.target.checked });
                      }} 
                    />
                    قبض الثمن
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={scope.legalActions?.specialDetails?.salePowers?.discharge} 
                      onChange={(e) => {
                         const current = scope.legalActions?.specialDetails?.salePowers || {};
                         updateDeepScope('legalActions', 'specialDetails', 'salePowers', { ...current, discharge: e.target.checked });
                      }} 
                    />
                    الإبراء
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={scope.legalActions?.specialDetails?.salePowers?.sign} 
                      onChange={(e) => {
                         const current = scope.legalActions?.specialDetails?.salePowers || {};
                         updateDeepScope('legalActions', 'specialDetails', 'salePowers', { ...current, sign: e.target.checked });
                      }} 
                    />
                    التوقيع
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* E. Signing & Receiving */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">هـ. التوقيع واستلام الوثائق</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.signing?.signOnBehalf} onChange={(e) => updateScope('signing', 'signOnBehalf', e.target.checked)} />
              التوقيع نيابة عنه
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.signing?.depositFiles} onChange={(e) => updateScope('signing', 'depositFiles', e.target.checked)} />
              إيداع الملفات
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.signing?.withdrawDocs} onChange={(e) => updateScope('signing', 'withdrawDocs', e.target.checked)} />
              سحب الوثائق
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.signing?.receiveCerts} onChange={(e) => updateScope('signing', 'receiveCerts', e.target.checked)} />
              استلام الشهادات
            </label>
          </div>
        </div>

        {/* F. General Reserve */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">و. بند عام احتياطي</h3>
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={scope.generalReserve} onChange={(e) => setScope(prev => ({ ...prev, generalReserve: e.target.checked }))} />
            "والقيام بجميع ما تقتضيه هذه الوكالة عرفًا وقانونًا في حدود ما ذُكر أعلاه"
          </label>
          <p className="text-sm text-yellow-700">📌 تنبيه: لا يُستعمل هذا البند منفردًا دون تحديد.</p>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setState(prev => ({ ...prev, step: 2 }))} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            السابق
          </button>
          <button onClick={handleNext} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            التالي: المراجعة النهائية
          </button>
        </div>
      </div>
    );
  };


export const TawkilWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_Tawkil_Principals state={state} setState={setState} />}
      {state.step === 2 && <Step2_Tawkil_Agents state={state} setState={setState} />}
      {state.step === 3 && <Step3_Tawkil_Scope state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
