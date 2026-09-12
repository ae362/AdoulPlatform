import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type {
  Party, Applicant, PossessionProof, InheritanceDeed
} from '../../../types/feesAgentTypes';
import { createEmptyParty, calculateAge, performValidationChecks } from '../../../utils/feesAgentUtils';
import {
  LEGAL_ENTITY_TYPE_OPTIONS,
  REPRESENTATION_DOC_TYPE_OPTIONS,
  INHERITANCE_DOCUMENT_TYPES,
  getPartyLabels
} from '../../../constants/feesAgentLocales';
import { ShareDistributionModal } from '../modals';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, Users
} from 'lucide-react';

export const Step1_PartiesDefinition: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const isMinor = (dob?: string) => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const [tempSellers, setTempSellers] = useState<Party[]>(
    state.sellers?.length ? state.sellers.map((seller) => ({ ...createEmptyParty(), ...seller })) : [createEmptyParty()]
  );
  const [tempBuyers, setTempBuyers] = useState<Party[]>(
    state.buyers?.length ? state.buyers.map((buyer) => ({ ...createEmptyParty(), ...buyer })) : [createEmptyParty()]
  );
  const isInheritanceType = (INHERITANCE_DOCUMENT_TYPES as readonly string[]).includes(state.documentType);
  const [tempApplicant, setTempApplicant] = useState<Applicant>(
    state.applicant ? { ...state.applicant } : { ...createEmptyParty(), capacity: '' }
  );
  const [tempApplicants, setTempApplicants] = useState<Applicant[]>(
    state.applicants && state.applicants.length > 0
      ? state.applicants
      : [{ ...createEmptyParty(), capacity: '' }]
  );
  const [tempInheritanceDeeds, setTempInheritanceDeeds] = useState<InheritanceDeed[]>(
    state.inheritanceDeeds && state.inheritanceDeeds.length > 0 
      ? state.inheritanceDeeds 
      : [{ book: '', page: '', number: '', date: '', notary: '' }]
  );

  const handleSellerChange = (index: number, field: keyof Party, value: any) => {
    if (value instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = String(reader.result || '').split(',').pop() || '';
        const fileObj = {
          name: value.name,
          size: value.size,
          type: value.type || 'application/octet-stream',
          base64: b64,
          file: value,
        };
        setTempSellers((prev) =>
          prev.map((seller, idx) =>
            idx === index ? ({ ...seller, [field]: fileObj } as Party) : seller
          )
        );
        setState((prev) => ({
          ...prev,
          sellers: (prev.sellers || []).map((seller, idx) =>
            idx === index ? ({ ...seller, [field]: fileObj } as Party) : seller
          ),
        }));
      };
      reader.readAsDataURL(value);
      return;
    }

    setTempSellers((prev) =>
      prev.map((seller, idx) =>
        idx === index
          ? ({
              ...seller,
              [field]: value,
            } as Party)
          : seller,
      ),
    );
    setState((prev) => ({
      ...prev,
      sellers: (prev.sellers || []).map((seller, idx) =>
        idx === index ? ({ ...seller, [field]: value } as Party) : seller
      ),
    }));
  };

  const [ownershipCriteria, setOwnershipCriteria] = useState(
    state.ownershipCriteria || { areApplicantsOwners: '', areOwnersAlive: '' }
  );
  let labels = getPartyLabels(state.documentType);
  if ((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes') {
    const isPossession = state.documentType === 'حيازة';
    if (ownershipCriteria.areApplicantsOwners === 'yes') {
      labels = {
        ...labels,
        buyerGroup: isPossession ? 'طالب الشهادة/الحائزون' : 'طالب الشهادة/الملاك',
        buyerSingle: isPossession ? 'الحائز' : 'المالك',
        buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
        buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
      };
    } else {
      labels = {
        ...labels,
        buyerGroup: isPossession ? 'الحائزون' : 'الملاك',
        buyerSingle: isPossession ? 'الحائز' : 'المالك',
        buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
        buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
      };
    }
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBuyerShareModal, setShowBuyerShareModal] = useState(false);
  const [showSellerShareModal, setShowSellerShareModal] = useState(false);
  const [showDeceasedSelectionModal, setShowDeceasedSelectionModal] = useState(false);

  const renderStep1_LegalEntityWizard = () => {
    const currentStep = state.legalEntitySetupStep || 1;

    const handleNext = () => {
      setState(prev => ({ ...prev, legalEntitySetupStep: (prev.legalEntitySetupStep || 1) + 1 }));
    };

    const handlePrev = () => {
      setState(prev => {
        const current = prev.legalEntitySetupStep || 1;
        
        // Special handling for backing out of Seller Legal flow into Buyer Legal flow
        if (prev.legalEntityTransactionType === 'seller_legal' && current === 2) {
           // If Buyer is Legal, we came from Step 7 of Buyer Legal flow
           if (prev.buyers[0]?.partyType === 'legal') {
             return { ...prev, legalEntityTransactionType: 'buyer_legal', legalEntitySetupStep: 7 };
           }
        }
        
        if (current <= 1) {
          return { ...prev, legalEntitySetupStep: 0, step: 0.25 };
        }
        
        return { ...prev, legalEntitySetupStep: current - 1 };
      });
    };

    const updateLegalParty = (updates: Partial<Party>) => {
      // Determine which party is the legal entity
      const isBuyerLegal = state.legalEntityTransactionType === 'buyer_legal';
      
      setState(prev => {
        const newBuyers = [...(prev.buyers || [])];
        const newSellers = [...(prev.sellers || [])];
        if (newBuyers.length === 0) newBuyers.push(createEmptyParty());
        if (newSellers.length === 0) newSellers.push(createEmptyParty());
        
        if (isBuyerLegal) {
          newBuyers[0] = { ...newBuyers[0], ...updates, partyType: 'legal' };
          // We do not modify the seller here to preserve its state (whether Natural or Legal)
        } else {
          newSellers[0] = { ...newSellers[0], ...updates, partyType: 'legal' };
          // We do not modify the buyer here to preserve its state (whether Natural or Legal)
        }
        
        return { ...prev, buyers: newBuyers, sellers: newSellers };
      });
    };

    const getLegalParty = () => {
      const isBuyer = state.legalEntityTransactionType === 'buyer_legal';
      const party = isBuyer ? state.buyers?.[0] : state.sellers?.[0];
      return party || ({} as Party);
    };

    const legalParty = getLegalParty();

    return (
      <div className="space-y-6">
        <div className="bg-indigo-50 p-6 rounded-lg border-r-4 border-indigo-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">إعداد بيانات الشخص المعنوي</h2>
          <p className="text-gray-700">المرحلة {currentStep} من 6</p>
        </div>

        {/* Step 1: Buyer Status */}
        {currentStep === 1 && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">1. صفة المشتري</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="buyerStatus"
                  checked={state.legalEntityTransactionType === 'seller_legal'} // Buyer is Natural -> Seller is Legal
                  onChange={() => {
                    // If Buyer is Natural, we want to enter Buyer details first (Natural Party)
                    // So we pause the wizard and go to the Parties screen, hiding the Seller (Legal Entity)
                    setState(prev => ({ 
                      ...prev, 
                      legalEntityTransactionType: 'seller_legal',
                      legalEntitySetupStep: 0, // Exit wizard temporarily
                      step: 1, 
                      isEnteringNaturalPartyFirst: true // Flag to show only Buyer in Parties screen
                    }));
                  }}
                  className="w-5 h-5 text-indigo-600"
                />
                <div>
                  <span className="block font-bold text-lg">شخص ذاتي (طبيعي)</span>
                  <span className="text-sm text-gray-500">المشتري شخص عادي، والبائع سيكون شخصاً معنوياً</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="buyerStatus"
                  checked={state.legalEntityTransactionType === 'buyer_legal'} // Buyer is Legal
                  onChange={() => setState(prev => ({ ...prev, legalEntityTransactionType: 'buyer_legal' }))}
                  className="w-5 h-5 text-indigo-600"
                />
                <div>
                  <span className="block font-bold text-lg">شخص معنوي</span>
                  <span className="text-sm text-gray-500">المشتري شركة أو جمعية أو مؤسسة...</span>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  if (!state.legalEntityTransactionType) {
                    alert('المرجو تحديد صفة المشتري');
                    return;
                  }
                  // Initialize parties based on selection
                  const isBuyerLegal = state.legalEntityTransactionType === 'buyer_legal';
                  setState(prev => {
                    const newBuyers = [...prev.buyers];
                    const newSellers = [...prev.sellers];
                    newBuyers[0] = { ...newBuyers[0], partyType: isBuyerLegal ? 'legal' : 'natural' };
                    newSellers[0] = { ...newSellers[0], partyType: isBuyerLegal ? 'natural' : 'legal' };
                    return { ...prev, buyers: newBuyers, sellers: newSellers, legalEntitySetupStep: 2 };
                  });
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                التالي ←
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Legal Entity Type */}
        {((state.legalEntityTransactionType === 'buyer_legal' && currentStep === 2) || 
          (state.legalEntityTransactionType === 'seller_legal' && currentStep === 2)) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
              {state.legalEntityTransactionType === 'buyer_legal' ? '2. نوع الشخص المعنوي (المشتري)' : '2. نوع الشخص المعنوي (البائع)'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEGAL_ENTITY_TYPE_OPTIONS.map(type => (
                <label key={type.value} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${legalParty.legalEntityType === type.value ? 'border-indigo-500 bg-indigo-50' : ''}`}>
                  <input
                    type="radio"
                    name="legalEntityType"
                    checked={legalParty.legalEntityType === type.value}
                    onChange={() => updateLegalParty({ legalEntityType: type.value as any })}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span className="font-bold text-lg">{type.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button
                onClick={() => {
                  if (!legalParty.legalEntityType) {
                    alert('المرجو تحديد نوع الشخص المعنوي');
                    return;
                  }
                  handleNext();
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                التالي ←
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Articles of Association */}
        {((state.legalEntityTransactionType === 'buyer_legal' && currentStep === 3) || 
          (state.legalEntityTransactionType === 'seller_legal' && currentStep === 3)) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
              {state.legalEntityTransactionType === 'buyer_legal' ? '3. النظام الأساسي' : '3. النظام الأساسي'}
            </h3>
            
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-700">هل يتوفر الشخص المعنوي على نظام أساسي؟</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={legalParty.hasArticlesOfAssociation === true}
                    onChange={() => updateLegalParty({ hasArticlesOfAssociation: true })}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span className="font-semibold">نعم (إرفاق النظام الأساسي إجباري)</span>
                </label>
                
                <label className={`flex items-center gap-2 cursor-pointer ${legalParty.legalEntityType !== 'public_institution' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    checked={legalParty.hasArticlesOfAssociation === false}
                    onChange={() => {
                      if (legalParty.legalEntityType === 'public_institution') {
                        updateLegalParty({ hasArticlesOfAssociation: false });
                      } else {
                        alert('النظام الأساسي إجباري لغير المؤسسات العمومية');
                      }
                    }}
                    disabled={legalParty.legalEntityType !== 'public_institution'}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span className="font-semibold">لا (فقط للمؤسسات المحدثة بنص قانوني)</span>
                </label>
              </div>

              {legalParty.hasArticlesOfAssociation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">إرفاق ملف النظام الأساسي *</label>
                  <input type="file" className="w-full p-2 border bg-white rounded" />
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button onClick={handleNext} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">التالي ←</button>
            </div>
          </div>
        )}

        {/* Step 4: Common Fields */}
        {((state.legalEntityTransactionType === 'buyer_legal' && currentStep === 4) || 
          (state.legalEntityTransactionType === 'seller_legal' && currentStep === 4)) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
              {state.legalEntityTransactionType === 'buyer_legal' ? '4. البيانات المشتركة' : '4. البيانات المشتركة'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل للشخص المعنوي *</label>
                <input
                  type="text"
                  value={legalParty.legalEntityName || ''}
                  onChange={(e) => updateLegalParty({ legalEntityName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">الشكل القانوني *</label>
                <input
                  type="text"
                  value={legalParty.legalForm || ''}
                  onChange={(e) => updateLegalParty({ legalForm: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">المقر الاجتماعي *</label>
                <input
                  type="text"
                  value={legalParty.headquartersAddress || ''}
                  onChange={(e) => updateLegalParty({ headquartersAddress: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">غرض الشخص المعنوي (من النظام الأساسي) *</label>
                <textarea
                  value={legalParty.companyPurpose || ''}
                  onChange={(e) => updateLegalParty({ companyPurpose: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-bold text-gray-700 mb-3">الممثل القانوني</h4>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الممثل القانوني *</label>
                <input
                  type="text"
                  value={legalParty.legalRepresentativeName || ''}
                  onChange={(e) => updateLegalParty({ legalRepresentativeName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">صفته القانونية *</label>
                <input
                  type="text"
                  value={legalParty.legalRepresentativeCapacity || ''}
                  onChange={(e) => updateLegalParty({ legalRepresentativeCapacity: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="مثال: مسير، رئيس..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم بطاقة التعريف *</label>
                <input
                  type="text"
                  value={legalParty.legalRepresentativeId || ''}
                  onChange={(e) => updateLegalParty({ legalRepresentativeId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">سند التمثيل *</label>
                <div className="flex gap-4 flex-wrap">
                  {REPRESENTATION_DOC_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={legalParty.representationDocType === opt.value}
                        onChange={() => updateLegalParty({ representationDocType: opt.value as any })}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم وتاريخ سند التمثيل *</label>
                <input
                  type="text"
                  value={legalParty.representationDocRef || ''}
                  onChange={(e) => updateLegalParty({ representationDocRef: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="مثال: محضر رقم ... بتاريخ ..."
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button onClick={handleNext} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">التالي ←</button>
            </div>
          </div>
        )}

        {/* Step 5: Smart Checks */}
        {((state.legalEntityTransactionType === 'buyer_legal' && currentStep === 5) || 
          (state.legalEntityTransactionType === 'seller_legal' && currentStep === 5)) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
              {state.legalEntityTransactionType === 'buyer_legal' ? '5. التحقق من الصلاحيات' : '5. التحقق من الصلاحيات'}
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-800 mb-2">يرجى مراجعة النظام الأساسي والإجابة بدقة:</p>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 bg-white rounded border">
                    <span>هل يسمح غرض الشخص المعنوي باقتناء العقار؟</span>
                    <input
                      type="checkbox"
                      checked={legalParty.purposeAllowsPropertyAcquisition || false}
                      onChange={(e) => updateLegalParty({ purposeAllowsPropertyAcquisition: e.target.checked })}
                      className="w-6 h-6 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded border">
                    <span>هل النظام الأساسي يقيد تصرفات الممثل؟</span>
                    <input
                      type="checkbox"
                      checked={legalParty.articlesRestrictRepresentative || false}
                      onChange={(e) => updateLegalParty({ articlesRestrictRepresentative: e.target.checked })}
                      className="w-6 h-6 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded border">
                    <span>هل يشترط إذن جمعية عامة أو مجلس؟</span>
                    <input
                      type="checkbox"
                      checked={legalParty.requiresAssemblyPermission || false}
                      onChange={(e) => updateLegalParty({ requiresAssemblyPermission: e.target.checked })}
                      className="w-6 h-6 text-indigo-600"
                    />
                  </label>
                </div>
              </div>

              {(legalParty.articlesRestrictRepresentative || legalParty.requiresAssemblyPermission) && (
                <div className="p-4 bg-red-100 border-l-4 border-red-500 rounded animate-pulse">
                  <p className="text-red-800 font-bold">
                    🔔 تنبيه: النظام الأساسي يتضمن قيودًا على شراء العقارات، يرجى إرفاق محضر الترخيص في الخطوة التالية.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button onClick={handleNext} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">التالي ←</button>
            </div>
          </div>
        )}

        {/* Step 6: Specific Fields */}
        {((state.legalEntityTransactionType === 'buyer_legal' && currentStep === 6) || 
          (state.legalEntityTransactionType === 'seller_legal' && currentStep === 6)) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
              {state.legalEntityTransactionType === 'buyer_legal' ? '6. بيانات خاصة' : '6. بيانات خاصة'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Fields */}
              {legalParty.legalEntityType === 'company' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم السجل التجاري *</label>
                    <input type="text" value={legalParty.commercialRegister || ''} onChange={(e) => updateLegalParty({ commercialRegister: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">المحكمة الممسك لديها *</label>
                    <input type="text" value={legalParty.court || ''} onChange={(e) => updateLegalParty({ court: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم ICE *</label>
                    <input type="text" value={legalParty.ice || ''} onChange={(e) => updateLegalParty({ ice: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم التعريف الضريبي (IF) *</label>
                    <input type="text" value={legalParty.taxId || ''} onChange={(e) => updateLegalParty({ taxId: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الشركة *</label>
                    <select value={legalParty.companyType || ''} onChange={(e) => updateLegalParty({ companyType: e.target.value })} className="w-full p-3 border rounded-lg">
                      <option value="">اختر...</option>
                      <option value="SARL">SARL</option>
                      <option value="SARL AU">SARL AU</option>
                      <option value="SA">SA</option>
                      <option value="SNC">SNC</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 p-3 border rounded bg-gray-50">
                      <input type="checkbox" checked={legalParty.specialAuthorization || false} onChange={(e) => updateLegalParty({ specialAuthorization: e.target.checked })} className="w-5 h-5" />
                      <span>هل ينص النظام الأساسي على ترخيص خاص؟ (إذا نعم، إرفاق المحضر وجدول الأعمال إجباري)</span>
                    </label>
                  </div>
                </>
              )}

              {/* Association Fields */}
              {legalParty.legalEntityType === 'association' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم وصل الإيداع *</label>
                    <input type="text" value={legalParty.depositReceiptNumber || ''} onChange={(e) => updateLegalParty({ depositReceiptNumber: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ وصل الإيداع *</label>
                    <input type="date" value={legalParty.depositReceiptDate || ''} onChange={(e) => updateLegalParty({ depositReceiptDate: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">جهة الإيداع *</label>
                    <input type="text" value={legalParty.depositAuthority || ''} onChange={(e) => updateLegalParty({ depositAuthority: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 p-3 border rounded bg-gray-50">
                      <input type="checkbox" checked={legalParty.hasEconomicActivity || false} onChange={(e) => updateLegalParty({ hasEconomicActivity: e.target.checked })} className="w-5 h-5" />
                      <span>هل تمارس نشاطًا اقتصاديًا؟ (إذا نعم، ICE إجباري)</span>
                    </label>
                  </div>
                  {legalParty.hasEconomicActivity && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">رقم ICE *</label>
                      <input type="text" value={legalParty.ice || ''} onChange={(e) => updateLegalParty({ ice: e.target.value })} className="w-full p-3 border rounded-lg" />
                    </div>
                  )}
                </>
              )}

              {/* Cooperative Fields */}
              {legalParty.legalEntityType === 'cooperative' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم تسجيل التعاونية *</label>
                    <input type="text" value={legalParty.coopRegistrationNumber || ''} onChange={(e) => updateLegalParty({ coopRegistrationNumber: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الجهة المسجلة لديها *</label>
                    <input type="text" value={legalParty.coopRegistrationAuthority || ''} onChange={(e) => updateLegalParty({ coopRegistrationAuthority: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم ICE (إجباري) *</label>
                    <input type="text" value={legalParty.ice || ''} onChange={(e) => updateLegalParty({ ice: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                </>
              )}

              {/* Public Institution Fields */}
              {legalParty.legalEntityType === 'public_institution' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">النص القانوني المُحدِث *</label>
                    <input type="text" value={legalParty.creationLawText || ''} onChange={(e) => updateLegalParty({ creationLawText: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الظهير / القانون *</label>
                    <input type="text" value={legalParty.dahirNumber || ''} onChange={(e) => updateLegalParty({ dahirNumber: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الجهة الوصية *</label>
                    <input type="text" value={legalParty.supervisoryAuthority || ''} onChange={(e) => updateLegalParty({ supervisoryAuthority: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الترخيص الإداري بالشراء (إن وجد)</label>
                    <input type="text" value={legalParty.adminPurchaseAuth || ''} onChange={(e) => updateLegalParty({ adminPurchaseAuth: e.target.value })} className="w-full p-3 border rounded-lg" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button
                onClick={() => {
                  // Sync temp states
                  setTempSellers(state.sellers);
                  setTempBuyers(state.buyers);
                  
                  if (state.legalEntityTransactionType === 'buyer_legal') {
                    // Proceed to Step 7: Seller Status
                    handleNext();
                  } else {
                    // Seller (Legal) is done.
                    setState(prev => ({ 
                      ...prev, 
                      legalEntitySetupStep: 0,
                      step: 2 // Go to Property Details
                    }));
                  }
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                {state.legalEntityTransactionType === 'buyer_legal' ? 'التالي: تحديد صفة البائع' : (state.documentType === 'حيازة' ? 'إتمام ومتابعة لتفاصيل الحيازة' : 'إتمام ومتابعة لتفاصيل الملكية')} ✓
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Seller Status (Only if Buyer is Legal) */}
        {currentStep === 7 && state.legalEntityTransactionType === 'buyer_legal' && (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">7. صفة البائع</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sellerStatus"
                  checked={state.legalEntitySellerStatus === 'natural' || !state.legalEntitySellerStatus} // Default to Natural
                  onChange={() => setState(prev => ({ ...prev, legalEntitySellerStatus: 'natural' }))}
                  className="w-5 h-5 text-indigo-600"
                />
                <div>
                  <span className="block font-bold text-lg">شخص ذاتي (طبيعي)</span>
                  <span className="text-sm text-gray-500">البائع شخص عادي</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sellerStatus"
                  checked={state.legalEntitySellerStatus === 'legal'}
                  onChange={() => setState(prev => ({ ...prev, legalEntitySellerStatus: 'legal' }))}
                  className="w-5 h-5 text-indigo-600"
                />
                <div>
                  <span className="block font-bold text-lg">شخص معنوي</span>
                  <span className="text-sm text-gray-500">البائع شركة أو جمعية أو مؤسسة...</span>
                </div>
              </label>
            </div>
            
            <div className="flex justify-between mt-6">
              <button onClick={handlePrev} className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold">السابق</button>
              <button
                onClick={() => {
                  // Finish Wizard Logic
                  if (state.legalEntitySellerStatus === 'legal') {
                      // Legal-to-Legal flow: Switch to Seller Wizard
                      setState(prev => {
                          const newSellers = [...prev.sellers];
                          // Ensure Seller is initialized as Legal
                          newSellers[0] = { ...newSellers[0], partyType: 'legal' };
                          
                          return { 
                            ...prev, 
                            sellers: newSellers,
                            legalEntityTransactionType: 'seller_legal', 
                            legalEntitySetupStep: 2 // Start at Step 2 (Legal Entity Type) for Seller
                          };
                      });
                  } else {
                      // Seller is Natural -> Go to Natural Party Entry
                      setState(prev => ({ 
                        ...prev, 
                        legalEntitySetupStep: 0, 
                        step: 1, 
                        isEnteringNaturalPartySecond: true 
                      }));
                  }
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                إتمام ومتابعة لإدخال البائع ✓
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

    const isLegalEntityWizard = (state.documentType as string) === 'بيع_وشراء_معنوي' && (state.legalEntitySetupStep || 0) > 0;
    const isMarriageType = state.documentType === 'زواج' || state.documentType === 'زواج_مختلط';

    if (isLegalEntityWizard) {
      return renderStep1_LegalEntityWizard();
    }

    const addSeller = () => {
      setTempSellers((prev) => [...prev, createEmptyParty()]);
    };

    const removeSeller = (index: number) => {
      setTempSellers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleBuyerChange = (index: number, field: keyof Party, value: string | File | null | any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempBuyers((prev) =>
            prev.map((buyer, idx) =>
              idx === index ? ({ ...buyer, [field]: fileObj } as Party) : buyer
            )
          );
          setState((prev) => ({
            ...prev,
            buyers: (prev.buyers || []).map((buyer, idx) =>
              idx === index ? ({ ...buyer, [field]: fileObj } as Party) : buyer
            ),
          }));
        };
        reader.readAsDataURL(value);
        return;
      }

      setTempBuyers((prev) =>
        prev.map((buyer, idx) =>
          idx === index
            ? ({
                ...buyer,
                [field]: value,
              } as Party)
            : buyer,
        ),
      );
      setState((prev) => ({
        ...prev,
        buyers: (prev.buyers || []).map((buyer, idx) =>
          idx === index ? ({ ...buyer, [field]: value } as Party) : buyer
        ),
      }));
    };

    const addBuyer = () => {
      setTempBuyers((prev) => [...prev, createEmptyParty()]);
    };

    const removeBuyer = (index: number) => {
      setTempBuyers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
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

    const handleApplicantChange = (field: keyof Applicant, value: any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempApplicant((prev) => ({ ...prev, [field]: fileObj }));
          setState((prev) => ({
            ...prev,
            applicant: prev.applicant ? { ...prev.applicant, [field]: fileObj } : ({ ...tempApplicant, [field]: fileObj } as any),
          }));
        };
        reader.readAsDataURL(value);
        return;
      }
      setTempApplicant((prev) => ({ ...prev, [field]: value }));
      setState((prev) => ({
        ...prev,
        applicant: prev.applicant ? { ...prev.applicant, [field]: value } : ({ ...tempApplicant, [field]: value } as any),
      }));
    };

    const handleApplicantsChange = (index: number, field: keyof Applicant, value: any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempApplicants((prev) =>
            prev.map((app, idx) =>
              idx === index ? { ...app, [field]: fileObj } : app
            )
          );
          setState((prev) => ({
            ...prev,
            applicants: (prev.applicants || []).map((app, idx) =>
              idx === index ? { ...app, [field]: fileObj } : app
            ),
          }));
        };
        reader.readAsDataURL(value);
        return;
      }
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index ? { ...app, [field]: value } : app
        )
      );
      setState((prev) => ({
        ...prev,
        applicants: (prev.applicants || []).map((app, idx) =>
          idx === index ? { ...app, [field]: value } : app
        ),
      }));
    };

    const addApplicant = () => {
      setTempApplicants((prev) => [...prev, { ...createEmptyParty(), capacity: '' }]);
    };

    const removeApplicant = (index: number) => {
      setTempApplicants((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleApplicantsShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempApplicants(prev => prev.map((app, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...app, share: share.value } : app;
      }));
    };

    const handleApplicantProxyChange = (field: string, value: string) => {
      setTempApplicant((prev) => ({
        ...prev,
        proxyDetails: {
          book: '',
          page: '',
          number: '',
          date: '',
          notary: '',
          ...(prev.proxyDetails || {}),
          [field]: value,
        },
      }));
    };

    const handleApplicantsProxyChange = (index: number, field: string, value: string) => {
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index
            ? {
                ...app,
                proxyDetails: {
                  book: '',
                  page: '',
                  number: '',
                  date: '',
                  notary: '',
                  ...(app.proxyDetails || {}),
                  [field]: value,
                },
              }
            : app
        )
      );
    };

    const handleInheritanceDeedChange = (index: number, field: keyof InheritanceDeed, value: string) => {
      setTempInheritanceDeeds((prev) =>
        prev.map((deed, idx) => (idx === index ? { ...deed, [field]: value } : deed))
      );
    };

    const addInheritanceDeed = () => {
      setTempInheritanceDeeds((prev) => [...prev, { book: '', page: '', number: '', date: '', notary: '' }]);
    };

    const removeInheritanceDeed = (index: number) => {
      setTempInheritanceDeeds((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleNext = () => {
      const newErrors: Record<string, string> = {};

      // Skip seller validation if we are entering the Natural Buyer first (Sellers are hidden)
      const shouldValidateSellers = !((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes') && !state.isEnteringNaturalPartyFirst;

      if (shouldValidateSellers && !tempSellers.length) {
        newErrors.sellers = 'يجب إضافة بائع واحد على الأقل';
      }

      if (shouldValidateSellers) {
        tempSellers.forEach((seller, index) => {
          if (!seller.name || seller.name.length < 3) newErrors[`seller_${index}_name`] = 'الاسم الكامل مطلوب';
          if (!seller.fatherName) newErrors[`seller_${index}_father`] = 'اسم الأب مطلوب';
          if (!seller.motherName) newErrors[`seller_${index}_mother`] = 'اسم الأم مطلوب';
          if (!seller.address) newErrors[`seller_${index}_address`] = 'عنوان السكنى مطلوب';
          
          // Skip ID validation for foreign husband in mixed marriage
          const isForeignHusband = state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband';
          if (!isForeignHusband && (!seller.idNumber || seller.idNumber.length < 4)) {
            newErrors[`seller_${index}_id`] = 'رقم البطاقة غير صحيح';
          }

          if (state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && !seller.share) newErrors[`seller_${index}_share`] = 'حصة البائع مطلوبة';
        });
      }

      // Skip buyer validation if we are entering the Natural Seller second (Buyers are hidden/already entered)
      // Also skip for Lineage Proof document since witnesses are collected in Step 5
      const shouldValidateBuyers = !state.isEnteringNaturalPartySecond && state.documentType !== 'ثبوت_نسب_ببينة_السماع';

      if (shouldValidateBuyers && !tempBuyers.length) {
        newErrors.buyers = 'يجب إضافة مشتري واحد على الأقل';
      }

      if (shouldValidateBuyers) {
        tempBuyers.forEach((buyer, index) => {
        if (!buyer.name || buyer.name.length < 3) newErrors[`buyer_${index}_name`] = 'الاسم الكامل مطلوب';
        if (!buyer.fatherName) newErrors[`buyer_${index}_father`] = 'اسم الأب مطلوب';
        if (!buyer.motherName) newErrors[`buyer_${index}_mother`] = 'اسم الأم مطلوب';
        if (!buyer.address) newErrors[`buyer_${index}_address`] = 'عنوان السكنى مطلوب';
        
        // Skip ID validation for foreign wife in mixed marriage
        const isForeignWife = state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife';
        if (!isForeignWife && (!buyer.idNumber || buyer.idNumber.length < 4)) {
          newErrors[`buyer_${index}_id`] = 'رقم البطاقة غير صحيح';
        }
      });
      }

      if (isInheritanceType) {
        if ((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no') {
          // Validate multiple applicants
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
        } else {
          // Validate single applicant (existing logic)
          if (!tempApplicant.name || tempApplicant.name.length < 3) newErrors[`applicant_name`] = 'الاسم الكامل مطلوب';
          if (!tempApplicant.fatherName) newErrors[`applicant_father`] = 'اسم الأب مطلوب';
          if (!tempApplicant.motherName) newErrors[`applicant_mother`] = 'اسم الأم مطلوب';
          if (!tempApplicant.address) newErrors[`applicant_address`] = 'عنوان السكنى مطلوب';
          if (!tempApplicant.idNumber || tempApplicant.idNumber.length < 4) newErrors[`applicant_id`] = 'رقم البطاقة غير صحيح';
          if (!tempApplicant.capacity) newErrors[`applicant_capacity`] = 'الصفة مطلوبة';
          
          if (tempApplicant.capacity === 'بتوكيل') {
            if (!tempApplicant.proxyDetails?.book) newErrors[`applicant_proxy_book`] = 'الدفتر مطلوب';
            if (!tempApplicant.proxyDetails?.page) newErrors[`applicant_proxy_page`] = 'الصحيفة مطلوبة';
            if (!tempApplicant.proxyDetails?.number) newErrors[`applicant_proxy_number`] = 'العدد مطلوب';
            if (!tempApplicant.proxyDetails?.date) newErrors[`applicant_proxy_date`] = 'التاريخ مطلوب';
            if (!tempApplicant.proxyDetails?.notary) newErrors[`applicant_proxy_notary`] = 'التوثيق مطلوب';
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Special handling for "Natural Party First" mode in Legal Entity Wizard
      if (state.isEnteringNaturalPartyFirst) {
        setState((prev) => ({
          ...prev,
          sellers: tempSellers,
          buyers: tempBuyers,
          // Return to Wizard Step 2 to define the Legal Entity (Seller)
          legalEntitySetupStep: 2,
          isEnteringNaturalPartyFirst: false, // Reset flag
          // Note: We do NOT increment step here, we go back to the wizard
        }));
        return;
      }

      // Special handling for "Natural Party Second" mode
      if (state.isEnteringNaturalPartySecond) {
        setState((prev) => ({
          ...prev,
          sellers: tempSellers,
          buyers: tempBuyers,
          isEnteringNaturalPartySecond: false, // Reset flag
          step: 2 // Go to Property Details
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        sellers: tempSellers,
        buyers: tempBuyers,
        applicant: isInheritanceType ? tempApplicant : undefined,
        applicants: (isInheritanceType && (state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no') ? tempApplicants : undefined,
        inheritanceDeeds: isInheritanceType ? tempInheritanceDeeds : undefined,
        ownershipCriteria: (state.documentType === 'ملكية' || state.documentType === 'حيازة') ? ownershipCriteria : undefined,
        step: (state.documentType === 'رسم_الاقرار_ببنوة' || state.documentType === 'ثبوت_نسب_ببينة_السماع' || state.documentType === 'اتفاق_تدبير_اموال_زوجية' || state.documentType === 'رسم_استمرار_زواج') ? 3 : prev.step + 1,
        validationAlerts: performValidationChecks({
          ...prev,
          sellers: tempSellers,
          buyers: tempBuyers,
          applicant: isInheritanceType ? tempApplicant : undefined,
        }),
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
          title={labels.buyerShareTitle}
        />

        <ShareDistributionModal 
          isOpen={showSellerShareModal}
          onClose={() => setShowSellerShareModal(false)}
          parties={tempSellers}
          onUpdateShares={handleSellerShareUpdate}
          title={labels.sellerShareTitle}
        />

        {/* Deceased Selection Modal */}
        {showDeceasedSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">{state.documentType === 'حيازة' ? 'تحديد الحائز المتوفى' : 'تحديد المالك المتوفى'}</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tempBuyers.map((owner, idx) => (
                  <button
                    key={idx}
                    className="w-full text-right p-3 hover:bg-gray-100 rounded-lg border border-gray-200 flex justify-between items-center"
                    onClick={() => {
                      setTempSellers(prev => {
                         const lastSeller = prev[prev.length - 1];
                         const isLastEmpty = !lastSeller.name && !lastSeller.idNumber;
                         
                         const newSeller = {
                           ...createEmptyParty(),
                           name: owner.name,
                           fatherName: owner.fatherName,
                           motherName: owner.motherName,
                           address: owner.address,
                           idNumber: owner.idNumber,
                           idIssueDate: owner.idIssueDate,
                           dateOfBirth: owner.dateOfBirth,
                         };

                         if (isLastEmpty) {
                           return [...prev.slice(0, -1), newSeller];
                         } else {
                           return [...prev, newSeller];
                         }
                      });
                      setShowDeceasedSelectionModal(false);
                    }}
                  >
                    <span className="font-semibold">{owner.name || (state.documentType === 'حيازة' ? `حائز رقم ${idx + 1}` : `مالك رقم ${idx + 1}`)}</span>
                    <span className="text-sm text-gray-500">{owner.idNumber}</span>
                  </button>
                ))}
              </div>
              <button
                className="mt-4 w-full py-2 bg-gray-200 rounded-lg font-semibold"
                onClick={() => setShowDeceasedSelectionModal(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800 border border-blue-200">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {state.documentType === 'زواج' || state.documentType === 'زواج_مختلط'
                  ? 'المرحلة 2: الزوجان والولي'
                  : (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء')
                  ? 'المرحلة 2 من 8: أطراف العقد'
                  : 'المرحلة 2: بيانات الأطراف'}
              </span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              {state.documentType === 'زواج' || state.documentType === 'زواج_مختلط'
                ? 'رسم الزواج والنكاح'
                : (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء')
                ? 'عقد البيع والشراء العقاري'
                : state.documentType || 'توثيق الهويات والصفات'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>👥</span>
            <span>
              {state.isEnteringNaturalPartyFirst 
                ? 'بيانات المشتري (الشخص الذاتي)' 
                : state.isEnteringNaturalPartySecond 
                  ? 'بيانات البائع (الشخص الذاتي)'
                  : state.documentType === 'زواج' || state.documentType === 'زواج_مختلط'
                  ? 'الخطوة الأولى: بيانات الزوجين والولي الشرعي'
                  : (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء')
                  ? 'الخطوة الثانية: أطراف العقد (البائع والمشتري)'
                  : 'الخطوة الأولى: بيانات الأطراف والهويات'
              }
            </span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {state.isEnteringNaturalPartyFirst 
              ? 'أدخل بيانات المشتري أولاً، ثم سننتقل لإعداد بيانات البائع (الشخص المعنوي).'
              : state.isEnteringNaturalPartySecond 
                ? 'أدخل بيانات البائع (الشخص الذاتي) لإتمام العملية.'
                : state.documentType === 'زواج' || state.documentType === 'زواج_مختلط'
                ? 'إدخال بيانات الزوج والزوجة والولي (إن وجد) والتحقق من الهوية والأهلية ومطابقة المعطيات الرسمية.'
                : `أدخل بيانات ${labels.sellerSingle} و${labels.buyerGroup}${isInheritanceType ? ' وطالب الشهادة' : ''} مع التحقق من اكتمال الأوصاف والمعلومات القانونية.`
            }
          </p>
        </div>

        {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && (
          <div className="bg-indigo-50 p-6 rounded-lg border-r-4 border-indigo-400 space-y-6">
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">
                {state.documentType === 'حيازة' ? 'هل طالب/طالبي هذه الشهادة هم الحائزون الفعليون للعقار؟' : 'هل طالب/طالبي هذه الشهادة هم الملاك الفعليون للعقار؟'}
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

            {ownershipCriteria.areApplicantsOwners && (
            <div>
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
            )}
          </div>
        )}

        {!state.isEnteringNaturalPartyFirst && (!isInheritanceType || (state.documentType !== 'ملكية' && state.documentType !== 'حيازة') || ownershipCriteria.areOwnersAlive === 'no') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">
              {labels.sellerGroup}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (state.documentType as string) !== 'استمرار_الزوجية' ? ` (عددهم ${tempSellers.length})` : ''}
            </h3>
            <div className="flex gap-2">
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-semibold text-sm"
                  type="button" 
                  onClick={() => setShowSellerShareModal(true)}
                >
                  📊 توزيع الحصص
                </button>
              )}
              {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'no' && (
                <button 
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
                  type="button" 
                  onClick={() => setShowDeceasedSelectionModal(true)}
                >
                  {state.documentType === 'حيازة' ? 'تحديد الحائز المتوفى' : 'تحديد المالك المتوفى'}
                </button>
              )}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button className="btn-secondary text-sm" type="button" onClick={addSeller}>+ {labels.sellerAdd}</button>
              )}
            </div>
          </div>
          {errors.sellers && <p className="text-red-500 text-sm">{errors.sellers}</p>}

          {tempSellers.map((seller, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">{labels.sellerSingle} رقم {index + 1}</h4>
                {tempSellers.length > 1 && (
                  <button className="text-red-600 font-semibold" type="button" onClick={() => removeSeller(index)}>حذف</button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Fields - Modified for Foreign Partner */}
                {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (بالعربية) *</label>
                      <input
                        type="text"
                        value={seller.name}
                        onChange={(e) => handleSellerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="الاسم بالعربية"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (باللاتينية) *</label>
                      <input
                        type="text"
                        value={seller.nameLatin || ''}
                        onChange={(e) => handleSellerChange(index, 'nameLatin', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="Full Name (Latin)"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                       <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد *</label>
                       <input
                        type="date"
                        value={seller.dateOfBirth || ''}
                        onChange={(e) => handleSellerChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                      {isMinor(seller.dateOfBirth) && (state.documentType as string) !== 'مقاسمة' && (
                        <div className="mt-4 animate-fadeIn space-y-4">
                          {/* Red Alert Box */}
                          <div className="bg-red-700 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
                            <div className="flex-1 text-right">
                              {(state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي' || (state.documentType as string) === 'عقد_ايجار_المفضي_الى_تملك' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_ابتدائي' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_نهائي' ? (
                                <h4 className="text-xl font-bold mb-1 leading-relaxed">
                                  لا يمكن إتمام بيع ممتلكات القاصر إلا بعد الحصول على إذن قضائي مسبق حماية لمصالحه وفق مدونة الأسرة المغربية
                                </h4>
                              ) : (
                                <>
                                  <h4 className="text-xl font-bold mb-1">السن المدخل اقل من 18 سنة --المعني قاصر</h4>
                                  <p className="text-sm font-medium">يلزم التحقق من الولي/الوصي او الاذن القضائي قبل المتابعة</p>
                                </>
                              )}
                            </div>
                            <div className="bg-white rounded-full p-1 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </div>
                          </div>

                          {/* Yellow Permission Section */}
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h5 className="font-bold text-gray-800 mb-3 text-right">اذن زواج القاصر</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">مسلم من</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={seller.underagePermissionIssuedBy || ''}
                                  onChange={(e) => handleSellerChange(index, 'underagePermissionIssuedBy', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">رقم</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={seller.underagePermissionNumber || ''}
                                  onChange={(e) => handleSellerChange(index, 'underagePermissionNumber', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">محكمة</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={seller.underagePermissionCourt || ''}
                                  onChange={(e) => handleSellerChange(index, 'underagePermissionCourt', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">بتاريخ</label>
                                <input
                                  type="date"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={seller.underagePermissionDate || ''}
                                  onChange={(e) => handleSellerChange(index, 'underagePermissionDate', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Nationality Selection */}
                    {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                      <div className="col-span-1 md:col-span-2 mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={seller.nationality !== 'اجنبي'} // Default to Moroccan
                              onChange={() => handleSellerChange(index, 'nationality', 'مغربي')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>مغربي</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={seller.nationality === 'اجنبي'}
                              onChange={() => handleSellerChange(index, 'nationality', 'اجنبي')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>أجنبي</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (بالعربية) *</label>
                      <input
                        type="text"
                        value={seller.name}
                        onChange={(e) => handleSellerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="مثال: محمد بن أحمد..."
                      />
                      {errors[`seller_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_name`]}</p>}
                    </div>

                    {seller.nationality === 'اجنبي' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (باللاتينية) *</label>
                        <input
                          type="text"
                          value={seller.nameLatin || ''}
                          onChange={(e) => handleSellerChange(index, 'nameLatin', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="Full Name (Latin)"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                  <input
                    type="text"
                    value={seller.placeOfBirth || ''}
                    onChange={(e) => handleSellerChange(index, 'placeOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="مكان الازدياد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                  <input
                    type="text"
                    value={seller.fatherName}
                    onChange={(e) => handleSellerChange(index, 'fatherName', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_father`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`seller_${index}_father`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_father`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                  <input
                    type="text"
                    value={seller.motherName}
                    onChange={(e) => handleSellerChange(index, 'motherName', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`seller_${index}_mother`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_mother`]}</p>}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                  <input
                    type="text"
                    value={seller.address}
                    onChange={(e) => handleSellerChange(index, 'address', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="مثال: حي الرياض - الرباط"
                  />
                  {errors[`seller_${index}_address`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_address`]}</p>}
                </div>
                {/* Conditional Rendering for Mixed Marriage Foreign Party (Husband) */}
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband') && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={seller.idNumber}
                        onChange={(e) => handleSellerChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`seller_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                        maxLength={10}
                      />
                      {errors[`seller_${index}_id`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_id`]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ إصدار البطاقة</label>
                      <input
                        type="date"
                        value={seller.idIssueDate}
                        onChange={(e) => handleSellerChange(index, 'idIssueDate', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Mixed Marriage Specific Fields for Husband */}
                {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' && (
                  <>
                    <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                      <h5 className="font-bold text-blue-800 mb-4">وثائق الطرف الأجنبي (الزوج)</h5>
                    </div>

                    {/* Birth Certificate */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">نسخة كاملة من رسم الولادة</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.birthCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'birthCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.birthCertificateNumber || ''} onChange={(e) => handleSellerChange(index, 'birthCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.birthCertificateDate || ''} onChange={(e) => handleSellerChange(index, 'birthCertificateDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">دولة</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.birthCertificateCountry || ''} onChange={(e) => handleSellerChange(index, 'birthCertificateCountry', e.target.value)} />
                        </div>
                      </div>
                    </div>



                    {/* Nationality Certificate */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">شهادة الجنسية (مسلمة من)</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={seller.nationalityCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'nationalityCertificateIssuedBy', e.target.value)} />
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                        <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'nationalityCertificateImage', e.target.files?.[0] || null)} />
                        {seller.nationalityCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.nationalityCertificateImage as any)?.name || 'شهادة الجنسية'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'nationalityCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Medical Certificate 1 */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">شهادة طبية (مسلمة من)</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={seller.medicalCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                        <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'medicalCertificateImage', e.target.files?.[0] || null)} />
                        {seller.medicalCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.medicalCertificateImage as any)?.name || 'شهادة طبية'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'medicalCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Criminal Record Birthplace */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">السجل العدلي من المحكمة الابتدائية التي ازداد بدائرة نفوذها</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.criminalRecordBirthplaceIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.criminalRecordBirthplaceNumber || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.criminalRecordBirthplaceDate || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">دولة</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.criminalRecordBirthplaceCountry || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceCountry', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceImage', e.target.files?.[0] || null)} />
                        {seller.criminalRecordBirthplaceImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.criminalRecordBirthplaceImage as any)?.name || 'السجل العدلي'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'criminalRecordBirthplaceImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Capacity to Marry */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة الكفاءة للزواج</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من السفارة</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.capacityCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.capacityCertificateDate || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">تنبيه: مؤشر عليها من وزارة الشؤون الخارجية و التعاون بالرباط في</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.capacityCertificateEndorsementDate || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateEndorsementDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'capacityCertificateImage', e.target.files?.[0] || null)} />
                        {seller.capacityCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.capacityCertificateImage as any)?.name || 'شهادة الأهلية'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'capacityCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Residence & Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">دولة السكنى</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={seller.residenceCountry || ''} onChange={(e) => handleSellerChange(index, 'residenceCountry', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الحال وقت الاشهاد</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={seller.currentStatus || ''} onChange={(e) => handleSellerChange(index, 'currentStatus', e.target.value)} />
                    </div>

                    {/* Passport */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">جواز السفر</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلم من</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.passportIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'passportIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.passportNumber || ''} onChange={(e) => handleSellerChange(index, 'passportNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">صالح الى غاية</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.passportValidUntil || ''} onChange={(e) => handleSellerChange(index, 'passportValidUntil', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة من جواز السفر</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'passportImage', e.target.files?.[0] || null)} />
                        {seller.passportImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.passportImage as any)?.name || 'جواز السفر'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'passportImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة من الصفحة التي تثبت الدخول الى المغرب</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'entryStampImage', e.target.files?.[0] || null)} />
                        {seller.entryStampImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.entryStampImage as any)?.name || 'ختم الدخول'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'entryStampImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Central Criminal Record */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة السجل العدلي المركزي من المصلحة المختصة بوزارة العدل</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.centralCriminalRecordNumber || ''} onChange={(e) => handleSellerChange(index, 'centralCriminalRecordNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.centralCriminalRecordDate || ''} onChange={(e) => handleSellerChange(index, 'centralCriminalRecordDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'centralCriminalRecordImage', e.target.files?.[0] || null)} />
                        {seller.centralCriminalRecordImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.centralCriminalRecordImage as any)?.name || 'السجل العدلي المركزي'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'centralCriminalRecordImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Medical Certificate 2 */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة طبية (تكميلية)</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.medicalCertificateNumber || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={seller.medicalCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={seller.medicalCertificateDate || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'supplementaryMedicalCertificateImage', e.target.files?.[0] || null)} />
                        {seller.supplementaryMedicalCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.supplementaryMedicalCertificateImage as any)?.name || 'شهادة طبية تكميلية'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'supplementaryMedicalCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مهنته</label>
                  <input
                    type="text"
                    value={seller.profession || ''}
                    onChange={(e) => handleSellerChange(index, 'profession', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={seller.dateOfBirth || ''}
                    onChange={(e) => handleSellerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {seller.dateOfBirth && calculateAge(seller.dateOfBirth) < 18 && (state.documentType as string) !== 'مقاسمة' && (
                    <>
                      <div className="mt-3 p-4 bg-red-600 text-white rounded-lg shadow-xl border-4 border-red-800">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-white rounded-full p-1">⛔</span>
                          <div>
                            {(state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي' ? (
                              <p className="text-lg font-black leading-relaxed">
                                لا يمكن إتمام بيع ممتلكات القاصر إلا بعد الحصول على إذن قضائي مسبق حماية لمصالحه وفق مدونة الأسرة المغربية
                              </p>
                            ) : (
                              <>
                                <p className="text-lg font-black">
                                   السن المدخل اقل من 18 سنة --المعني قاصر
                                </p>
                                <p className="font-bold text-sm mt-1 text-red-100">
                                  يلزم التحقق من الولي/الوصي او الاذن القضائي قبل المتابعة
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {state.documentType === 'زواج' && state.marriageClassification?.primaryType === 'adult_marriage' && (
                        <div className="mt-3 p-4 bg-red-600 text-white rounded-xl shadow-lg border-2 border-red-700 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                              <h4 className="font-bold text-sm sm:text-base">
                                تعارض في تصنيف الزواج: الزوج قاصر (العمر: {calculateAge(seller.dateOfBirth)} سنة)
                              </h4>
                              <p className="text-xs text-red-100 mt-1 leading-relaxed">
                                تم تحديد مسار الزواج الحالي كـ «زواج الراشد»، بينما عمر الزوج يقل عن 18 سنة شمسية. يتطلب القانون إذن قاضي التوثيق (المادة 20 من مدونة الأسرة).
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setState((prev) => ({
                                ...prev,
                                marriageClassification: {
                                  ...(prev.marriageClassification || { primaryType: 'minor_marriage' }),
                                  primaryType: 'minor_marriage',
                                  minorParty:
                                    prev.buyers?.[0]?.dateOfBirth && calculateAge(prev.buyers[0].dateOfBirth) < 18
                                      ? 'both'
                                      : 'husband'
                                }
                              }));
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-white text-red-700 hover:bg-red-50 font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2"
                          >
                            <span>⚡ تحويل المسار تلقائيًا إلى «زواج القاصر» وتفعيل متطلبات إذن القاضي</span>
                          </button>
                        </div>
                      )}

                      {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') && (
                        <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h5 className="font-semibold text-gray-800 mb-3">اذن زواج القاصر</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلم من</label>
                              <input
                                type="text"
                                value={seller.underagePermissionIssuedBy || ''}
                                onChange={(e) => handleSellerChange(index, 'underagePermissionIssuedBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={seller.underagePermissionNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'underagePermissionNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={seller.underagePermissionDate || ''}
                                onChange={(e) => handleSellerChange(index, 'underagePermissionDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">محكمة</label>
                              <input
                                type="text"
                                value={seller.underagePermissionCourt || ''}
                                onChange={(e) => handleSellerChange(index, 'underagePermissionCourt', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                )}
                {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_ابتدائي' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة') && (
                  <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200 mt-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة العائلية</label>
                    <div className="flex gap-4 mb-3">
                      {['اعزب', 'ارمل', 'مطلق'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={option}
                            checked={seller.maritalStatus === option}
                            onChange={(e) => handleSellerChange(index, 'maritalStatus', e.target.value)}
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>

                    {seller.maritalStatus === 'ارمل' && (
                      <div className="mt-3">
                        <h5 className="font-semibold text-gray-800 mb-3">حسب شهادة الوفاة المسلمة من</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">المسلمة من</label>
                            <input
                              type="text"
                              value={seller.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">تحت عدد</label>
                            <input
                              type="text"
                              value={seller.deathCertificateNumber || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                            <input
                              type="date"
                              value={seller.deathCertificateDate || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                            <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'deathCertificateImage', e.target.files?.[0] || null)} />
                        {seller.deathCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.deathCertificateImage as any)?.name || 'شهادة الوفاة'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'deathCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                          </div>
                        </div>
                      </div>
                    )}

                    {seller.maritalStatus === 'مطلق' && (
                      <div className="mt-3">
                        {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">نوع وثيقة الطلاق</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value="رسم"
                                    checked={seller.divorceSource === 'رسم' || !seller.divorceSource}
                                    onChange={(e) => handleSellerChange(index, 'divorceSource', 'رسم')}
                                  />
                                  <span>حسب رسم الطلاق المضمن بدفتر</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value="حكم"
                                    checked={seller.divorceSource === 'حكم'}
                                    onChange={(e) => handleSellerChange(index, 'divorceSource', 'حكم')}
                                  />
                                  <span>حسب الحكم</span>
                                </label>
                              </div>
                            </div>

                            {seller.divorceSource === 'حكم' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="col-span-1 md:col-span-2">
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">حكم بالطلاق الصادر عن محكمة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceCourt || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceCourt', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ اصدار الطلاق</label>
                                  <input
                                    type="date"
                                    value={seller.divorceJudgmentDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceJudgmentDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">دولة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceCountry || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceCountry', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">صيغة تنفيذية</label>
                                  <input
                                    type="text"
                                    value={seller.divorceExecutiveFormula || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceExecutiveFormula', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                  <input
                                    type="date"
                                    value={seller.divorceExecutiveDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceExecutiveDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedNumber || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedNumber', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">حرف</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedLetter || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedLetter', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedPage || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedPage', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedCount || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedCount', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                  <input
                                    type="date"
                                    value={seller.divorceDeedDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedNotary || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedNotary', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <h5 className="font-semibold text-gray-800 mb-3">حسب رسم الطلاق المضمن بدفتر</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedNumber || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedNumber', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">حرف</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedLetter || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedLetter', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedPage || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedPage', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedCount || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedCount', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                <input
                                  type="date"
                                  value={seller.divorceDeedDate || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedDate', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedNotary || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedNotary', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') && (
                  <>
                    {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband') && (
                      <>
                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات ولادة الزوج</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم رسم الولادة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">سنة رسم الولادة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateYear || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateYear', e.target.value)}
                                placeholder="مثال: 1990"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={seller.birthCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateCommune || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateCommune', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.birthCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات الشهادة الادارية المتعلقة بالخطوبة</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={seller.engagementCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateCommune || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateCommune', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'engagementCertificateImage', e.target.files?.[0] || null)} />
                        {seller.engagementCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.engagementCertificateImage as any)?.name || 'شهادة الخطوبة'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'engagementCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات شهادة الطبيب تثبت الخلو من الامراض المعدية</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={seller.medicalCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateIssuedBy || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateIssuedBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleSellerChange(index, 'infectiousDiseaseCertificateImage', e.target.files?.[0] || null)} />
                        {seller.infectiousDiseaseCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(seller.infectiousDiseaseCertificateImage as any)?.name || 'شهادة الخلو من الأمراض المعدية'}</span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'infectiousDiseaseCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">هل للزوج وكالة خاصة لهذا الزواج؟</label>
                      <div className="flex gap-4 mb-3">
                        {['نعم', 'لا'].map((option) => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value={option}
                              checked={seller.hasSpecialProxy === option}
                              onChange={(e) => handleSellerChange(index, 'hasSpecialProxy', e.target.value)}
                            />
                            <span className="font-semibold">{option}</span>
                          </label>
                        ))}
                      </div>

                      {seller.hasSpecialProxy === 'نعم' && (
                        <div className="mt-3 space-y-4">
                          {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' && (
                            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-4 rounded-lg">
                              <div className="flex">
                                <div className="flex-shrink-0 ml-3">
                                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-yellow-800">تنبيه</h3>
                                  <div className="mt-1 text-sm text-yellow-700">
                                    <p>
                                      اذا كان الموكل مقيما خارج المغرب يجب ان تحرر وكالة الزواج لدى القنصلية او السفارة المغربية ببلد الاقامة وان تكون مصادقا عليها وفق المتطلبات القانونية المعمول بها
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <h5 className="font-semibold text-gray-800">بيانات الوكيل</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل</label>
                              <input
                                type="text"
                                value={seller.proxyName || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الازدياد</label>
                              <input
                                type="date"
                                value={seller.proxyDOB || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDOB', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية</label>
                              <input
                                type="text"
                                value={seller.proxyNationalID || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyNationalID', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
                              <input
                                type="text"
                                value={seller.proxyAddress || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyAddress', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأب</label>
                              <input
                                type="text"
                                value={seller.proxyFatherName || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyFatherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأم</label>
                              <input
                                type="text"
                                value={seller.proxyMotherName || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyMotherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <h5 className="font-semibold text-gray-800 mt-4">رسم الوكالة </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1"> مضمن بدفتر</label>
                              <input
                                type="text"
                                value={seller.proxyDeedBook || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedBook', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={seller.proxyDeedNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                              <input
                                type="text"
                                value={seller.proxyDeedCount || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedCount', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                              <input
                                type="text"
                                value={seller.proxyDeedPage || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedPage', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={seller.proxyDeedDate || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                              <input
                                type="text"
                                value={seller.proxyDeedNotary || ''}
                                onChange={(e) => handleSellerChange(index, 'proxyDeedNotary', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">حصته في العقار المبيع *</label>
                  <input
                    type="text"
                    value={seller.share || ''}
                    readOnly
                    className={`w-full p-3 border rounded-lg bg-gray-100 cursor-not-allowed ${errors[`seller_${index}_share`] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="استخدم زر توزيع الحصص لتعديل النسبة"
                  />
                  {errors[`seller_${index}_share`] && <p className="text-red-500 text-sm mt-1">{errors[`seller_${index}_share`]}</p>}
                </div>
                )}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">صورة البطاقة (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleSellerChange(index, 'idImage', e.target.files?.[0] || null)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {seller.idImage && (
                    <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                      <span className="truncate font-medium">📎 تم إرفاق: {(seller.idImage as any)?.name || 'صورة البطاقة'}</span>
                      <button
                        type="button"
                        onClick={() => handleSellerChange(index, 'idImage', null)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                        title="حذف المرفق"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {isInheritanceType && state.documentType !== 'ملكية' && state.documentType !== 'حيازة' && (
                  <div className="col-span-1 md:col-span-2 bg-red-50 p-4 rounded-lg border border-red-200 mt-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">هل الهالك حديث الوفاة؟</label>
                    <div className="flex gap-4 mb-3">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={option}
                            checked={seller.isRecentDeath === option}
                            onChange={(e) => handleSellerChange(index, 'isRecentDeath', e.target.value)}
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>

                    {seller.isRecentDeath === 'نعم' && (
                      <div className="mt-3">
                        <h5 className="font-semibold text-gray-800 mb-3">شهادة الوفاة</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                            <input
                              type="text"
                              value={seller.deathCertificateNumber || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                            <input
                              type="date"
                              value={seller.deathCertificateDate || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">صادرة عن</label>
                            <input
                              type="text"
                              value={seller.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}

        {isInheritanceType && !((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes' && ownershipCriteria.areApplicantsOwners === 'yes') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'yes' 
                  ? (state.documentType === 'حيازة' ? 'طالب الشهادة/الحائزون' : 'طالب الشهادة/الملاك')
                  : 'طالب الشهادة'}
              </h3>
              {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no' && (
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
                    type="button" 
                    onClick={() => {
                      // Logic to show partition modal for applicants if needed
                      // For now just a placeholder or reuse existing modal logic if applicable
                      alert('توزيع الحصص بين طالبي الشهادة');
                    }}
                  >
                    📊 توزيع الحصص
                  </button>
                  <button className="btn-secondary text-sm" type="button" onClick={addApplicant}>+ إضافة طالب شهادة</button>
                </div>
              )}
            </div>
            
            {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no' ? (
              // Multiple Applicants Rendering
              <div className="space-y-4">
                {tempApplicants.map((app, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-800">طالب الشهادة رقم {index + 1}</h4>
                      {tempApplicants.length > 1 && (
                        <button className="text-red-600 font-semibold" type="button" onClick={() => removeApplicant(index)}>حذف</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                        <input
                          type="text"
                          value={app.name}
                          onChange={(e) => handleApplicantsChange(index, 'name', e.target.value)}
                          className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="مثال: محمد بن أحمد..."
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">مهنة الأب</label>
                        <input
                          type="text"
                          value={app.fatherProfession || ''}
                          onChange={(e) => handleApplicantsChange(index, 'fatherProfession', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="مهنة الأب"
                        />
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
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">مهنة الأم</label>
                        <input
                          type="text"
                          value={app.motherProfession || ''}
                          onChange={(e) => handleApplicantsChange(index, 'motherProfession', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="مهنة الأم"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                        <input
                          type="text"
                          value={app.address}
                          onChange={(e) => handleApplicantsChange(index, 'address', e.target.value)}
                          className={`w-full p-3 border rounded-lg ${errors[`applicant_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="مثال: حي الرياض - الرباط"
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
                          maxLength={10}
                        />
                        {errors[`applicant_${index}_id`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_id`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ إصدار البطاقة</label>
                        <input
                          type="date"
                          value={app.idIssueDate}
                          onChange={(e) => handleApplicantsChange(index, 'idIssueDate', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                        <select
                          value={app.nationality || ''}
                          onChange={(e) => handleApplicantsChange(index, 'nationality', e.target.value as any)}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                        >
                          <option value="">—</option>
                          <option value="مغربي">مغربي</option>
                          <option value="اجنبي">أجنبي</option>
                        </select>
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
                      {app.nationality === 'اجنبي' && (
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            الاسم الكامل (بالأحرف اللاتينية)
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={app.nameLatin || ''}
                            onChange={(e) => handleApplicantsChange(index, 'nameLatin', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="Full name in Latin alphabet"
                          />
                        </div>
                      )}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">صورة البطاقة (اختياري)</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleApplicantsChange(index, 'idImage', e.target.files?.[0] || null)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                        {app.idImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(app.idImage as any)?.name || 'صورة البطاقة'}</span>
                            <button
                              type="button"
                              onClick={() => handleApplicantsChange(index, 'idImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
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
                              {errors[`applicant_${index}_proxy_book`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_proxy_book`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.page || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'page', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_page`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors[`applicant_${index}_proxy_page`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_proxy_page`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">عدد *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.number || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'number', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_number`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors[`applicant_${index}_proxy_number`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_proxy_number`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ *</label>
                              <input
                                type="date"
                                value={app.proxyDetails?.date || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'date', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_date`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors[`applicant_${index}_proxy_date`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_proxy_date`]}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.notary || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'notary', e.target.value)}
                                className={`w-full p-2 border rounded-lg ${errors[`applicant_${index}_proxy_notary`] ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors[`applicant_${index}_proxy_notary`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_proxy_notary`]}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={tempApplicant.name}
                    onChange={(e) => handleApplicantChange('name', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`applicant_name`] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="مثال: محمد بن أحمد..."
                  />
                  {errors[`applicant_name`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_name`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مكان الازدياد</label>
                  <input
                    type="text"
                    value={tempApplicant.placeOfBirth || ''}
                    onChange={(e) => handleApplicantChange('placeOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="مكان الازدياد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأب *</label>
                  <input
                    type="text"
                    value={tempApplicant.fatherName}
                    onChange={(e) => handleApplicantChange('fatherName', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`applicant_father`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`applicant_father`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_father`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مهنة الأب</label>
                  <input
                    type="text"
                    value={tempApplicant.fatherProfession || ''}
                    onChange={(e) => handleApplicantChange('fatherProfession', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="مهنة الأب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                  <input
                    type="text"
                    value={tempApplicant.motherName}
                    onChange={(e) => handleApplicantChange('motherName', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`applicant_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`applicant_mother`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_mother`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مهنة الأم</label>
                  <input
                    type="text"
                    value={tempApplicant.motherProfession || ''}
                    onChange={(e) => handleApplicantChange('motherProfession', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="مهنة الأم"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                  <input
                    type="text"
                    value={tempApplicant.address}
                    onChange={(e) => handleApplicantChange('address', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`applicant_address`] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="مثال: حي الرياض - الرباط"
                  />
                  {errors[`applicant_address`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_address`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                  <input
                    type="text"
                    value={tempApplicant.idNumber}
                    onChange={(e) => handleApplicantChange('idNumber', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`applicant_id`] ? 'border-red-500' : 'border-gray-300'}`}
                    maxLength={10}
                  />
                  {errors[`applicant_id`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_id`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ إصدار البطاقة</label>
                  <input
                    type="date"
                    value={tempApplicant.idIssueDate}
                    onChange={(e) => handleApplicantChange('idIssueDate', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                  <select
                    value={tempApplicant.nationality || ''}
                    onChange={(e) => handleApplicantChange('nationality', e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">—</option>
                    <option value="مغربي">مغربي</option>
                    <option value="اجنبي">أجنبي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={tempApplicant.dateOfBirth || ''}
                    onChange={(e) => handleApplicantChange('dateOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {tempApplicant.nationality === 'اجنبي' && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الاسم الكامل (بالأحرف اللاتينية)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={tempApplicant.nameLatin || ''}
                        onChange={(e) => handleApplicantChange('nameLatin', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="Full name in Latin alphabet"
                      />
                    </div>
                  )}
                  {tempApplicant.dateOfBirth && calculateAge(tempApplicant.dateOfBirth) < 18 && (
                    <div className="mt-3 p-4 bg-red-600 text-white rounded-lg shadow-xl border-4 border-red-800">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl bg-white rounded-full p-1">⛔</span>
                        <div>
                          {(state.documentType as string) === 'مقاسمة' ? (
                            <p className="text-lg font-black leading-relaxed">
                              وجود قاصر ضمن اطراف المقاسمة يستوجب التحقق من الإذن القضائي وفقا لمقتضيات مدونة الأسرة حماية لمصلحة القاصر وصونا لحقوقه المالية
                            </p>
                          ) : (
                            <>
                              <p className="text-lg font-black">
                                 السن المدخل اقل من 18 سنة --المعني قاصر
                              </p>
                              <p className="font-bold text-sm mt-1 text-red-100">
                                يلزم التحقق من الولي/الوصي او الاذن القضائي قبل المتابعة
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">صورة البطاقة (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleApplicantChange('idImage', e.target.files?.[0] || null)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {tempApplicant.idImage && (
                    <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                      <span className="truncate font-medium">📎 تم إرفاق: {(tempApplicant.idImage as any)?.name || 'صورة البطاقة'}</span>
                      <button
                        type="button"
                        onClick={() => handleApplicantChange('idImage', null)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                        title="حذف المرفق"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">بصفته *</label>
                  <div className="flex gap-4">
                    {['وارث', 'نائب_شرعي', 'بتوكيل'].map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={option}
                          checked={tempApplicant.capacity === option}
                          onChange={(e) => handleApplicantChange('capacity', e.target.value)}
                        />
                        <span className="font-semibold">
                          {option === 'وارث' && 'وارث'}
                          {option === 'نائب_شرعي' && 'نائب شرعي'}
                          {option === 'بتوكيل' && 'بتوكيل'}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors[`applicant_capacity`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_capacity`]}</p>}
                </div>

                {tempApplicant.capacity === 'بتوكيل' && (
                  <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                    <h5 className="font-semibold text-gray-800 mb-3">وكالة مضمنة بدفتر</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">بدفتر *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.book || ''}
                          onChange={(e) => handleApplicantProxyChange('book', e.target.value)}
                          className={`w-full p-2 border rounded-lg ${errors[`applicant_proxy_book`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`applicant_proxy_book`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_proxy_book`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.page || ''}
                          onChange={(e) => handleApplicantProxyChange('page', e.target.value)}
                          className={`w-full p-2 border rounded-lg ${errors[`applicant_proxy_page`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`applicant_proxy_page`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_proxy_page`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">عدد *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.number || ''}
                          onChange={(e) => handleApplicantProxyChange('number', e.target.value)}
                          className={`w-full p-2 border rounded-lg ${errors[`applicant_proxy_number`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`applicant_proxy_number`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_proxy_number`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ *</label>
                        <input
                          type="date"
                          value={tempApplicant.proxyDetails?.date || ''}
                          onChange={(e) => handleApplicantProxyChange('date', e.target.value)}
                          className={`w-full p-2 border rounded-lg ${errors[`applicant_proxy_date`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`applicant_proxy_date`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_proxy_date`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.notary || ''}
                          onChange={(e) => handleApplicantProxyChange('notary', e.target.value)}
                          className={`w-full p-2 border rounded-lg ${errors[`applicant_proxy_notary`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`applicant_proxy_notary`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_proxy_notary`]}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Buyers Section - Hidden if entering Natural Party Second (Seller) OR if it's Lineage Proof (witnesses collected in Step 5) */}
        {!state.isEnteringNaturalPartySecond && state.documentType !== 'ثبوت_نسب_ببينة_السماع' && (!isInheritanceType || state.documentType !== 'ملكية' || ownershipCriteria.areOwnersAlive === 'no' || ownershipCriteria.areOwnersAlive === 'yes') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">
              {labels.buyerGroup}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (state.documentType as string) !== 'استمرار_الزوجية' ? ` (عددهم ${tempBuyers.length})` : ''}
            </h3>
            <div className="flex gap-2">
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm"
                  type="button" 
                  onClick={() => setShowBuyerShareModal(true)}
                >
                  📊 توزيع الحصص
                </button>
              )}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button className="btn-secondary text-sm" type="button" onClick={addBuyer}>+ {labels.buyerAdd}</button>
              )}
            </div>
          </div>
          {errors.buyers && <p className="text-red-500 text-sm">{errors.buyers}</p>}

          {isInheritanceType && (
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

          {tempBuyers.map((buyer, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">{labels.buyerSingle} رقم {index + 1}</h4>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {tempBuyers.length > 1 && (
                    <button className="text-red-600 font-semibold" type="button" onClick={() => removeBuyer(index)}>حذف</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Fields - Modified for Foreign Partner (Wife) */}
                {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (بالعربية) *</label>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => handleBuyerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="الاسم بالعربية"
                      />
                    </div>
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
                    <div className="col-span-1 md:col-span-2">
                       <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد *</label>
                       <input
                        type="date"
                        value={buyer.dateOfBirth || ''}
                        onChange={(e) => handleBuyerChange(index, 'dateOfBirth', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                      {isMinor(buyer.dateOfBirth) && (
                        <div className="mt-4 animate-fadeIn space-y-4">
                          {/* Red Alert Box */}
                          <div className="bg-red-700 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
                            <div className="flex-1 text-right">
                              {(state.documentType as string) === 'مقاسمة' ? (
                                <h4 className="text-xl font-bold mb-1 leading-relaxed">
                                  وجود قاصر ضمن اطراف المقاسمة يستوجب التحقق من الإذن القضائي وفقا لمقتضيات مدونة الأسرة حماية لمصلحة القاصر وصونا لحقوقه المالية
                                </h4>
                              ) : ((state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي') ? (
                                <h4 className="text-xl font-bold mb-1 leading-relaxed">
                                  تم شراء هذا الشيء باسم القاصرالوصي الشرعي(الأب,الأم,او وصي معين قضائيا) مسؤول عن حيازته و حمايته حتى يبلغ القاصر سن الرشد
                                </h4>
                              ) : (
                                <>
                                  <h4 className="text-xl font-bold mb-1">السن المدخل اقل من 18 سنة --المعني قاصر</h4>
                                  <p className="text-sm font-medium">يلزم التحقق من الولي/الوصي او الاذن القضائي قبل المتابعة</p>
                                </>
                              )}
                            </div>
                            <div className="bg-white rounded-full p-1 mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </div>
                          </div>

                          {/* Yellow Permission Section */}
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h5 className="font-bold text-gray-800 mb-3 text-right">اذن زواج القاصر</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">مسلم من</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={buyer.underagePermissionIssuedBy || ''}
                                  onChange={(e) => handleBuyerChange(index, 'underagePermissionIssuedBy', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">رقم</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={buyer.underagePermissionNumber || ''}
                                  onChange={(e) => handleBuyerChange(index, 'underagePermissionNumber', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">محكمة</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={buyer.underagePermissionCourt || ''}
                                  onChange={(e) => handleBuyerChange(index, 'underagePermissionCourt', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-right">بتاريخ</label>
                                <input
                                  type="date"
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                  value={buyer.underagePermissionDate || ''}
                                  onChange={(e) => handleBuyerChange(index, 'underagePermissionDate', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Nationality Selection */}
                    {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                      <div className="col-span-1 md:col-span-2 mb-4">
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
                    )}

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل (بالعربية) *</label>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => handleBuyerChange(index, 'name', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`buyer_${index}_name`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_name`]}</p>
                      )}
                    </div>

                    {buyer.nationality === 'اجنبي' && (
                      <div className="col-span-1 md:col-span-2">
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
                  </>
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
                  {errors[`buyer_${index}_father`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_father`]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الأم *</label>
                  <input
                    type="text"
                    value={buyer.motherName}
                    onChange={(e) => handleBuyerChange(index, 'motherName', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_mother`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`buyer_${index}_mother`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_mother`]}</p>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان السكنى *</label>
                  <input
                    type="text"
                    value={buyer.address}
                    onChange={(e) => handleBuyerChange(index, 'address', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_address`] ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors[`buyer_${index}_address`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_address`]}</p>
                  )}
                </div>

                {((state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي' || (state.documentType as string) === 'عقد_ايجار_المفضي_الى_تملك') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الجنسية</label>
                    <select
                      value={buyer.nationality || ''}
                      onChange={(e) => handleBuyerChange(index, 'nationality', e.target.value as any)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">اختر الجنسية</option>
                      <option value="مغربي">مغربي</option>
                      <option value="اجنبي">اجنبي</option>
                    </select>
                    {buyer.nationality === 'اجنبي' && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm font-semibold">
                        تنبيه: اذا كان الشراء يتعلق باراضي فلاحية للاجانب يتطلب الامرالحصول على موافقة وزارة الفلاحة
                      </div>
                    )}
                  </div>
                )}
                {/* Conditional Rendering for Mixed Marriage Foreign Party (Wife) */}
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife') && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم البطاقة الوطنية *</label>
                      <input
                        type="text"
                        value={buyer.idNumber}
                        onChange={(e) => handleBuyerChange(index, 'idNumber', e.target.value)}
                        className={`w-full p-3 border rounded-lg ${errors[`buyer_${index}_id`] ? 'border-red-500' : 'border-gray-300'}`}
                        maxLength={10}
                      />
                      {errors[`buyer_${index}_id`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`buyer_${index}_id`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ إصدار البطاقة</label>
                      <input
                        type="date"
                        value={buyer.idIssueDate}
                        onChange={(e) => handleBuyerChange(index, 'idIssueDate', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Mixed Marriage Specific Fields for Wife */}
                {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' && (
                  <>
                    <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                      <h5 className="font-bold text-green-800 mb-4">وثائق الطرف الأجنبي (الزوجة)</h5>
                    </div>

                    {/* Birth Certificate */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">نسخة كاملة من رسم الولادة</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.birthCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'birthCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.birthCertificateNumber || ''} onChange={(e) => handleBuyerChange(index, 'birthCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.birthCertificateDate || ''} onChange={(e) => handleBuyerChange(index, 'birthCertificateDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">دولة</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.birthCertificateCountry || ''} onChange={(e) => handleBuyerChange(index, 'birthCertificateCountry', e.target.value)} />
                        </div>
                      </div>
                    </div>



                    {/* Nationality Certificate */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">شهادة الجنسية (مسلمة من)</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={buyer.nationalityCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'nationalityCertificateIssuedBy', e.target.value)} />
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                        <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'nationalityCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.nationalityCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.nationalityCertificateImage as any)?.name || 'شهادة الجنسية'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'nationalityCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Medical Certificate 1 */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">شهادة طبية (مسلمة من)</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={buyer.medicalCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                        <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'medicalCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.medicalCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.medicalCertificateImage as any)?.name || 'شهادة طبية'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'medicalCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Criminal Record Birthplace */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">السجل العدلي من المحكمة الابتدائية التي ازدادت بدائرة نفوذها</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.criminalRecordBirthplaceIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'criminalRecordBirthplaceIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.criminalRecordBirthplaceNumber || ''} onChange={(e) => handleBuyerChange(index, 'criminalRecordBirthplaceNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.criminalRecordBirthplaceDate || ''} onChange={(e) => handleBuyerChange(index, 'criminalRecordBirthplaceDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">دولة</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.criminalRecordBirthplaceCountry || ''} onChange={(e) => handleBuyerChange(index, 'criminalRecordBirthplaceCountry', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'criminalRecordBirthplaceImage', e.target.files?.[0] || null)} />
                        {buyer.criminalRecordBirthplaceImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.criminalRecordBirthplaceImage as any)?.name || 'السجل العدلي'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'criminalRecordBirthplaceImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Capacity to Marry */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة الكفاءة للزواج</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من السفارة</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.capacityCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.capacityCertificateDate || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">تنبيه: مؤشر عليها من وزارة الشؤون الخارجية و التعاون بالرباط في</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.capacityCertificateEndorsementDate || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateEndorsementDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'capacityCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.capacityCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.capacityCertificateImage as any)?.name || 'شهادة الأهلية'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'capacityCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Residence & Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">دولة السكنى</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={buyer.residenceCountry || ''} onChange={(e) => handleBuyerChange(index, 'residenceCountry', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">الحال وقت الاشهاد</label>
                      <input type="text" className="w-full p-3 border rounded-lg" value={buyer.currentStatus || ''} onChange={(e) => handleBuyerChange(index, 'currentStatus', e.target.value)} />
                    </div>

                    {/* Passport */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">جواز السفر</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلم من</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.passportIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'passportIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.passportNumber || ''} onChange={(e) => handleBuyerChange(index, 'passportNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">صالح الى غاية</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.passportValidUntil || ''} onChange={(e) => handleBuyerChange(index, 'passportValidUntil', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة من جواز السفر</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'passportImage', e.target.files?.[0] || null)} />
                        {buyer.passportImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.passportImage as any)?.name || 'جواز السفر'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'passportImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة من الصفحة التي تثبت الدخول الى المغرب</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'entryStampImage', e.target.files?.[0] || null)} />
                        {buyer.entryStampImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.entryStampImage as any)?.name || 'ختم الدخول'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'entryStampImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Central Criminal Record */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة السجل العدلي المركزي من المصلحة المختصة بوزارة العدل</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.centralCriminalRecordNumber || ''} onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.centralCriminalRecordDate || ''} onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordImage', e.target.files?.[0] || null)} />
                        {buyer.centralCriminalRecordImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.centralCriminalRecordImage as any)?.name || 'السجل العدلي المركزي'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'centralCriminalRecordImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Medical Certificate 2 */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h6 className="font-semibold mb-3">شهادة طبية (تكميلية)</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">رقم</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.medicalCertificateNumber || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">مسلمة من</label>
                          <input type="text" className="w-full p-2 border rounded" value={buyer.medicalCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">تاريخ الاصدار</label>
                          <input type="date" className="w-full p-2 border rounded" value={buyer.medicalCertificateDate || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'supplementaryMedicalCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.supplementaryMedicalCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.supplementaryMedicalCertificateImage as any)?.name || 'شهادة طبية تكميلية'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'supplementaryMedicalCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">مهنتها</label>
                  <input
                    type="text"
                    value={buyer.profession || ''}
                    onChange={(e) => handleBuyerChange(index, 'profession', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={buyer.dateOfBirth || ''}
                    onChange={(e) => handleBuyerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {buyer.dateOfBirth && calculateAge(buyer.dateOfBirth) < 18 && (
                    <>
                      <div className="mt-3 p-4 bg-red-600 text-white rounded-lg shadow-xl border-4 border-red-800">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-white rounded-full p-1">⛔</span>
                          <div>
                            {(state.documentType as string) === 'مقاسمة' ? (
                              <p className="text-lg font-black leading-relaxed">
                                وجود قاصر ضمن اطراف المقاسمة يستوجب التحقق من الإذن القضائي وفقا لمقتضيات مدونة الأسرة حماية لمصلحة القاصر وصونا لحقوقه المالية
                              </p>
                            ) : ((state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي') ? (
                              <p className="text-lg font-black leading-relaxed">
                                تم شراء هذا الشيء باسم القاصرالوصي الشرعي(الأب,الأم,او وصي معين قضائيا) مسؤول عن حيازته و حمايته حتى يبلغ القاصر سن الرشد
                              </p>
                            ) : (
                              <>
                                <p className="text-lg font-black">
                                   السن المدخل اقل من 18 سنة --المعني قاصر
                                </p>
                                <p className="font-bold text-sm mt-1 text-red-100">
                                  يلزم التحقق من الولي/الوصي او الاذن القضائي قبل المتابعة
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {state.documentType === 'زواج' && state.marriageClassification?.primaryType === 'adult_marriage' && (
                        <div className="mt-3 p-4 bg-red-600 text-white rounded-xl shadow-lg border-2 border-red-700 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                              <h4 className="font-bold text-sm sm:text-base">
                                تعارض في تصنيف الزواج: الزوجة قاصرة (العمر: {calculateAge(buyer.dateOfBirth)} سنة)
                              </h4>
                              <p className="text-xs text-red-100 mt-1 leading-relaxed">
                                تم تحديد مسار الزواج الحالي كـ «زواج الراشد»، بينما عمر الزوجة يقل عن 18 سنة شمسية. يتطلب القانون إذن قاضي التوثيق (المادة 20 من مدونة الأسرة).
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setState((prev) => ({
                                ...prev,
                                marriageClassification: {
                                  ...(prev.marriageClassification || { primaryType: 'minor_marriage' }),
                                  primaryType: 'minor_marriage',
                                  minorParty:
                                    prev.sellers?.[0]?.dateOfBirth && calculateAge(prev.sellers[0].dateOfBirth) < 18
                                      ? 'both'
                                      : 'wife'
                                }
                              }));
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-white text-red-700 hover:bg-red-50 font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2"
                          >
                            <span>⚡ تحويل المسار تلقائيًا إلى «زواج القاصر» وتفعيل متطلبات إذن القاضي</span>
                          </button>
                        </div>
                      )}

                      {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') && (
                        <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h5 className="font-semibold text-gray-800 mb-3">اذن زواج القاصر</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلم من</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionIssuedBy || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionIssuedBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.underagePermissionDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">محكمة</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionCourt || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionCourt', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                )}
                {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_ابتدائي' || (state.documentType as string) === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة') && (
                  <div className="col-span-1 md:col-span-2 bg-green-50 p-4 rounded-lg border border-green-200 mt-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة العائلية</label>
                    <div className="flex gap-4 mb-3">
                      {['عزباء', 'ارملة', 'مطلقة'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={option}
                            checked={buyer.maritalStatus === option}
                            onChange={(e) => handleBuyerChange(index, 'maritalStatus', e.target.value)}
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>

                    {buyer.maritalStatus === ('ارملة' as any) && (
                      <div className="mt-3">
                        <h5 className="font-semibold text-gray-800 mb-3">حسب شهادة الوفاة المسلمة من</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">المسلمة من</label>
                            <input
                              type="text"
                              value={buyer.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">تحت عدد</label>
                            <input
                              type="text"
                              value={buyer.deathCertificateNumber || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                            <input
                              type="date"
                              value={buyer.deathCertificateDate || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                            <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'deathCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.deathCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.deathCertificateImage as any)?.name || 'شهادة الوفاة'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'deathCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                          </div>
                        </div>
                      </div>
                    )}

                    {buyer.maritalStatus === ('مطلقة' as any) && (
                      <div className="mt-3">
                        {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">نوع وثيقة الطلاق</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value="رسم"
                                    checked={buyer.divorceSource === 'رسم' || !buyer.divorceSource}
                                    onChange={(e) => handleBuyerChange(index, 'divorceSource', 'رسم')}
                                  />
                                  <span>حسب رسم الطلاق المضمن بدفتر</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value="حكم"
                                    checked={buyer.divorceSource === 'حكم'}
                                    onChange={(e) => handleBuyerChange(index, 'divorceSource', 'حكم')}
                                  />
                                  <span>حسب الحكم</span>
                                </label>
                              </div>
                            </div>

                            {buyer.divorceSource === 'حكم' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="col-span-1 md:col-span-2">
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">حكم بالطلاق الصادر عن محكمة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceCourt || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceCourt', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ اصدار الطلاق</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceJudgmentDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceJudgmentDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">دولة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceCountry || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceCountry', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">صيغة تنفيذية</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceExecutiveFormula || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceExecutiveFormula', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceExecutiveDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceExecutiveDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedNumber || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedNumber', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">حرف</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedLetter || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedLetter', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedPage || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedPage', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedCount || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedCount', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceDeedDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedDate', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedNotary || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedNotary', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <h5 className="font-semibold text-gray-800 mb-3">حسب رسم الطلاق المضمن بدفتر</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedNumber || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedNumber', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">حرف</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedLetter || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedLetter', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedPage || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedPage', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedCount || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedCount', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                                <input
                                  type="date"
                                  value={buyer.divorceDeedDate || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedDate', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedNotary || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedNotary', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') && (
                  <>
                    {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife') && (
                      <>
                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات ولادة الزوجة</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم رسم الولادة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">سنة رسم الولادة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateYear || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateYear', e.target.value)}
                                placeholder="مثال: 1995"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.birthCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateCommune || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateCommune', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات الشهادة الادارية المتعلقة بالخطوبة</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.engagementCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateCommune || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateCommune', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'engagementCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.engagementCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.engagementCertificateImage as any)?.name || 'شهادة الخطوبة'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'engagementCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                          <h5 className="font-semibold text-gray-800 mb-3">بيانات شهادة الطبيب تثبت الخلو من الامراض المعدية</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.medicalCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateIssuedBy || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateIssuedBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateCity', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-sm text-gray-600 mb-1">رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full p-2 border rounded" onChange={(e) => handleBuyerChange(index, 'infectiousDiseaseCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.infectiousDiseaseCertificateImage && (
                          <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                            <span className="truncate font-medium">📎 تم إرفاق: {(buyer.infectiousDiseaseCertificateImage as any)?.name || 'شهادة الخلو من الأمراض المعدية'}</span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'infectiousDiseaseCertificateImage', null)}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">هل للزوجة وكالة خاصة لهذا الزواج؟</label>
                      <div className="flex gap-4 mb-3">
                        {['نعم', 'لا'].map((option) => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value={option}
                              checked={buyer.hasSpecialProxy === option}
                              onChange={(e) => handleBuyerChange(index, 'hasSpecialProxy', e.target.value)}
                            />
                            <span className="font-semibold">{option}</span>
                          </label>
                        ))}
                      </div>

                      {buyer.hasSpecialProxy === 'نعم' && (
                        <div className="mt-3 space-y-4">
                          {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' && (
                            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-4 rounded-lg">
                              <div className="flex">
                                <div className="flex-shrink-0 ml-3">
                                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-yellow-800">تنبيه</h3>
                                  <div className="mt-1 text-sm text-yellow-700">
                                    <p>
                                      اذا كان الموكل مقيما خارج المغرب يجب ان تحرر وكالة الزواج لدى القنصلية او السفارة المغربية ببلد الاقامة وان تكون مصادقا عليها وفق المتطلبات القانونية المعمول بها
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <h5 className="font-semibold text-gray-800">بيانات الوكيل</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل</label>
                              <input
                                type="text"
                                value={buyer.proxyName || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الازدياد</label>
                              <input
                                type="date"
                                value={buyer.proxyDOB || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDOB', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية</label>
                              <input
                                type="text"
                                value={buyer.proxyNationalID || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyNationalID', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
                              <input
                                type="text"
                                value={buyer.proxyAddress || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyAddress', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأب</label>
                              <input
                                type="text"
                                value={buyer.proxyFatherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyFatherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأم</label>
                              <input
                                type="text"
                                value={buyer.proxyMotherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyMotherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <h5 className="font-semibold text-gray-800 mt-4">رسم الوكالة  </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">  مضمن بدفتر</label>
                              <input
                                type="text"
                                value={buyer.proxyDeedBook || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedBook', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم</label>
                              <input
                                type="text"
                                value={buyer.proxyDeedNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedNumber', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">عدد</label>
                              <input
                                type="text"
                                value={buyer.proxyDeedCount || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedCount', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">صحيفة</label>
                              <input
                                type="text"
                                value={buyer.proxyDeedPage || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedPage', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.proxyDeedDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedDate', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">توثيق</label>
                              <input
                                type="text"
                                value={buyer.proxyDeedNotary || ''}
                                onChange={(e) => handleBuyerChange(index, 'proxyDeedNotary', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">هل تعقد المخطوبة زواجها دون حاجة لولي؟</label>
                      <div className="flex gap-4 mb-3">
                        {['نعم', 'لا'].map((option) => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value={option}
                              checked={buyer.contractsWithoutGuardian === option}
                              onChange={(e) => handleBuyerChange(index, 'contractsWithoutGuardian', e.target.value)}
                            />
                            <span className="font-semibold">{option}</span>
                          </label>
                        ))}
                      </div>

                      {buyer.contractsWithoutGuardian === 'لا' && (
                        <div className="mt-3 space-y-4">
                          <h5 className="font-semibold text-gray-800">بيانات الولي</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">صفة الولي</label>
                              <select
                                value={buyer.guardianRelationship || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianRelationship', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              >
                                <option value="">اختر الصفة</option>
                                <option value="أب">أب</option>
                                <option value="أخ">أخ</option>
                                <option value="عم">عم</option>
                                <option value="أخرى">أخرى</option>
                              </select>
                              {buyer.guardianRelationship === 'أخرى' && (
                                <input
                                  type="text"
                                  value={buyer.guardianRelationshipCustom || ''}
                                  onChange={(e) => handleBuyerChange(index, 'guardianRelationshipCustom', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg mt-2"
                                  placeholder="أدخل الصفة"
                                />
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل</label>
                              <input
                                type="text"
                                value={buyer.guardianName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الازدياد</label>
                              <input
                                type="date"
                                value={buyer.guardianDOB || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianDOB', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية</label>
                              <input
                                type="text"
                                value={buyer.guardianNationalID || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianNationalID', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
                              <input
                                type="text"
                                value={buyer.guardianAddress || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianAddress', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأب</label>
                              <input
                                type="text"
                                value={buyer.guardianFatherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianFatherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">مهنة الولي</label>
                              <input
                                type="text"
                                value={buyer.guardianProfession || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianProfession', e.target.value)}
                                placeholder="مثال: تاجر / متقاعد"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأم</label>
                              <input
                                type="text"
                                value={buyer.guardianMotherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianMotherName', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">نسبة التملك</label>
                  <input
                    type="text"
                    value={buyer.share || (tempBuyers.length > 0 ? `${(100/tempBuyers.length).toFixed(2)}%` : '')}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="استخدم زر توزيع الحصص لتعديل النسبة"
                  />
                </div>
                )}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">صورة البطاقة (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleBuyerChange(index, 'idImage', e.target.files?.[0] || null)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  {buyer.idImage && (
                    <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                      <span className="truncate font-medium">📎 تم إرفاق: {(buyer.idImage as any)?.name || 'صورة البطاقة'}</span>
                      <button
                        type="button"
                        onClick={() => handleBuyerChange(index, 'idImage', null)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                        title="حذف المرفق"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            onClick={() => {
              if (state.isEnteringNaturalPartyFirst) {
                // Go back to Wizard Step 1 (Buyer Type Selection)
                setState((prev) => ({ ...prev, legalEntitySetupStep: 1, isEnteringNaturalPartyFirst: false }));
              } else if (state.isEnteringNaturalPartySecond) {
                // Go back to Wizard Step 6 (Seller Type Selection)
                setState((prev) => ({ ...prev, legalEntitySetupStep: 6, isEnteringNaturalPartySecond: false }));
              } else {
                setState((prev) => ({ ...prev, step: prev.documentType === 'زواج_مختلط' ? 0.5 : 0 }));
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق</span>
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>
              {state.isEnteringNaturalPartyFirst 
                ? 'تابع: إعداد بيانات الشخص المعنوي' 
                : state.documentType === 'زواج' || state.documentType === 'زواج_مختلط' || (state.documentType as string) === 'استمرار_الزوجية'
                  ? 'التالي: تفاصيل الزواج والصداق'
                  : state.documentType === 'حيازة' 
                    ? 'التالي: تفاصيل الحيازة' 
                    : (state.documentType as string) === 'طلاق' || (state.documentType as string) === 'طلاق_اتفاقي' || (state.documentType as string) === 'رجعة'
                      ? 'التالي: تفاصيل الطلاق'
                      : state.documentType === 'وصية'
                        ? 'التالي: تفاصيل الوصية'
                        : state.documentType === 'هبة' || state.documentType === 'صدقة'
                          ? `التالي: تفاصيل ${state.documentType}`
                          : state.documentType === 'رهن' || state.documentType === 'رهن_حيازي'
                            ? 'التالي: تفاصيل الرهن'
                            : (state.documentType as string) === 'مقاسمة'
                              ? 'التالي: تفاصيل المقاسمة'
                              : (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء')
                              ? 'التالي: بيانات العقار المبيع'
                              : 'التالي: تفاصيل الملكية'}
            </span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
};

