import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
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
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react';
import { ShareDistributionModal } from '../../modals/ShareDistributionModal';
import { ExpandedTableModal } from '../../modals/ExpandedTableModal';
import { VaultModal } from '../../modals/VaultModal';
import { createEmptyParty } from '../../../../utils/feesAgentUtils';

export const LegalEntityWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const currentNotary = state.meta?.notaryPrimary || 'الموثق المسؤول';

  const addAuditEntry = (action: string, field: string, oldValue: string, newValue: string) => {
    setState((prev) => ({
      ...prev,
      auditTrail: [
        ...(prev.auditTrail || []),
        {
          timestamp: new Date().toLocaleString('ar-SA'),
          notary: currentNotary,
          action,
          field,
          oldValue,
          newValue,
        },
      ],
    }));
  };

  // ============================================================================

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
                      step: 1, // Go to Parties screen
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
              {[
                { value: 'company', label: 'شركة' },
                { value: 'association', label: 'جمعية' },
                { value: 'cooperative', label: 'تعاونية' },
                { value: 'public_institution', label: 'مؤسسة / هيئة عمومية' },
              ].map(type => (
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
                  {[
                    { value: 'articles', label: 'منصوص عليه في النظام الأساسي' },
                    { value: 'minutes', label: 'محضر تعيين' },
                    { value: 'power_of_attorney', label: 'وكالة' },
                  ].map((opt) => (
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

  return (
    <div className="space-y-6">
      {renderStep1_LegalEntityWizard()}
    </div>
  );
};
