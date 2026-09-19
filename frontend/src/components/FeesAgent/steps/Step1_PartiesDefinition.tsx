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
import { trpc } from '../../../trpc';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, Users,
  User, CreditCard, Briefcase, Heart, Home, Trash2, Sparkles,
  Building, CheckCircle2, Award, Globe, Building2, Hash, Scale, BookOpen,
  Camera, Loader2
} from 'lucide-react';
import { enhanceCardImageForOCR } from '../../../utils/cinImageEnhancer';

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

  // Synchronize internal state when sellers/buyers change from an external source (e.g. permission import)
  const lastImportedRef = useRef<string | null | undefined>(state.importedPermissionReference?.id);
  useEffect(() => {
    const currentImportId = state.importedPermissionReference?.id;
    const isNewImport = !!currentImportId && currentImportId !== lastImportedRef.current;
    const isTempBlank = tempSellers.length <= 1 && !tempSellers[0]?.name && !tempSellers[0]?.idNumber;
    const hasPopulatedSellers = !!state.sellers?.some((s) => !!s?.name || !!s?.idNumber);

    if (isNewImport || (isTempBlank && hasPopulatedSellers)) {
      if (currentImportId) {
        lastImportedRef.current = currentImportId;
      }
      if (state.sellers && state.sellers.length > 0) {
        setTempSellers(state.sellers.map((s) => ({ ...createEmptyParty(), ...s })));
      }
      if (state.buyers && state.buyers.length > 0) {
        setTempBuyers(state.buyers.map((b) => ({ ...createEmptyParty(), ...b })));
      }
    }
  }, [state.importedPermissionReference, state.sellers, state.buyers]);

  const extractIdCardMutation = trpc.feesAgent.ocr.extractIDCard.useMutation();
  const [scanningCIN, setScanningCIN] = useState<Record<string, boolean>>({});
  const [extractedCINNotice, setExtractedCINNotice] = useState<
    Record<string, { cin: string; message: string; success: boolean }>
  >({});

  const triggerCINOcr = async (
    file: File,
    partyType: 'seller' | 'buyer' | 'applicant' | 'applicants',
    index: number = 0,
    base64Data?: string
  ) => {
    const partyKey = `${partyType}_${index}`;
    setScanningCIN((prev) => ({ ...prev, [partyKey]: true }));
    setExtractedCINNotice((prev) => {
      const next = { ...prev };
      delete next[partyKey];
      return next;
    });

    try {
      let b64 = '';
      try {
        b64 = await enhanceCardImageForOCR(file);
      } catch {
        b64 = base64Data || '';
      }
      if (!b64) {
        b64 = base64Data || await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = String(reader.result || '').split(',').pop() || '';
            resolve(res);
          };
          reader.readAsDataURL(file);
        });
      }

      const res: any = await extractIdCardMutation.mutateAsync({
        fileBase64: b64,
        fileName: file.name,
      });

      if (res?.extractedFields?.idNumber) {
        const extractedNumber = res.extractedFields.idNumber.toUpperCase();
        const extractedDate = res.extractedFields.idIssueDate;

        if (partyType === 'seller') {
          setTempSellers((prev) =>
            prev.map((seller, idx) =>
              idx === index
                ? {
                    ...seller,
                    idNumber: extractedNumber,
                    ...(extractedDate && !seller.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : seller
            )
          );
          setState((prev) => ({
            ...prev,
            sellers: (prev.sellers || []).map((seller, idx) =>
              idx === index
                ? {
                    ...seller,
                    idNumber: extractedNumber,
                    ...(extractedDate && !seller.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : seller
            ),
          }));
        } else if (partyType === 'buyer') {
          setTempBuyers((prev) =>
            prev.map((buyer, idx) =>
              idx === index
                ? {
                    ...buyer,
                    idNumber: extractedNumber,
                    ...(extractedDate && !buyer.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : buyer
            )
          );
          setState((prev) => ({
            ...prev,
            buyers: (prev.buyers || []).map((buyer, idx) =>
              idx === index
                ? {
                    ...buyer,
                    idNumber: extractedNumber,
                    ...(extractedDate && !buyer.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : buyer
            ),
          }));
        } else if (partyType === 'applicant') {
          setTempApplicant((prev) => ({
            ...prev,
            idNumber: extractedNumber,
            ...(extractedDate && !prev.idIssueDate ? { idIssueDate: extractedDate } : {}),
          }));
          setState((prev) => ({
            ...prev,
            applicant: prev.applicant
              ? {
                  ...prev.applicant,
                  idNumber: extractedNumber,
                  ...(extractedDate && !prev.applicant.idIssueDate ? { idIssueDate: extractedDate } : {}),
                }
              : prev.applicant,
          }));
        } else if (partyType === 'applicants') {
          setTempApplicants((prev) =>
            prev.map((app, idx) =>
              idx === index
                ? {
                    ...app,
                    idNumber: extractedNumber,
                    ...(extractedDate && !app.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : app
            )
          );
          setState((prev) => ({
            ...prev,
            applicants: (prev.applicants || []).map((app, idx) =>
              idx === index
                ? {
                    ...app,
                    idNumber: extractedNumber,
                    ...(extractedDate && !app.idIssueDate ? { idIssueDate: extractedDate } : {}),
                  }
                : app
            ),
          }));
        }

        setExtractedCINNotice((prev) => ({
          ...prev,
          [partyKey]: {
            cin: extractedNumber,
            message: `تم استخراج رقم البطاقة الوطنية تلقائياً: ${extractedNumber}`,
            success: true,
          },
        }));
      } else {
        setExtractedCINNotice((prev) => ({
          ...prev,
          [partyKey]: {
            cin: '',
            message: res?.errors?.[0] || 'تعذر استخراج رقم البطاقة بدقة، يرجى كتابته يدوياً.',
            success: false,
          },
        }));
      }
    } catch (err) {
      console.error('Error extracting CIN:', err);
      setExtractedCINNotice((prev) => ({
        ...prev,
        [partyKey]: {
          cin: '',
          message: 'حدث خطأ أثناء قراءة صورة البطاقة، يمكنك كتابة الرقم يدوياً.',
          success: false,
        },
      }));
    } finally {
      setScanningCIN((prev) => ({ ...prev, [partyKey]: false }));
    }
  };

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

        if (field === 'idImage') {
          triggerCINOcr(value, 'seller', index, b64);
        }
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

          if (field === 'idImage') {
            triggerCINOcr(value, 'buyer', index, b64);
          }
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

          if (field === 'idImage') {
            triggerCINOcr(value, 'applicant', 0, b64);
          }
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

          if (field === 'idImage') {
            triggerCINOcr(value, 'applicants', index, b64);
          }
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
        setTimeout(() => {
          const firstErrEl = document.querySelector('.text-rose-500, .border-rose-500, .border-red-500, .text-red-500');
          if (firstErrEl) {
            firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
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
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>{labels.sellerGroup}</span>
                  {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (state.documentType as string) !== 'استمرار_الزوجية' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                      {tempSellers.length} طرف
                    </span>
                  )}
                </h3>
                <p className="text-xs font-semibold text-slate-400">إدخال والتحقق من الهوية والأهلية القانونية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                  type="button" 
                  onClick={() => setShowSellerShareModal(true)}
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>توزيع الحصص</span>
                </button>
              )}
              {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'no' && (
                <button 
                  className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 font-bold text-xs transition shadow-2xs"
                  type="button" 
                  onClick={() => setShowDeceasedSelectionModal(true)}
                >
                  {state.documentType === 'حيازة' ? 'تحديد الحائز المتوفى' : 'تحديد المالك المتوفى'}
                </button>
              )}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  type="button" 
                  onClick={addSeller}
                >
                  <Plus className="w-4 h-4" />
                  <span>{labels.sellerAdd}</span>
                </button>
              )}
            </div>
          </div>
          {errors.sellers && <p className="text-rose-500 text-xs font-bold">{errors.sellers}</p>}

          {tempSellers.map((seller, index) => (
            <div key={index} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-6 sm:p-7 space-y-6 overflow-hidden relative">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black shadow-2xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-800">{labels.sellerSingle === 'الزوج' ? labels.sellerSingle : `${labels.sellerSingle} رقم ${index + 1}`}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">الطرف الأول</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">البيانات الشخصية ووثائق إثبات الهوية</p>
                  </div>
                </div>
                {tempSellers.length > 1 && (
                  <button 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition shadow-2xs"
                    type="button" 
                    onClick={() => removeSeller(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
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
                      <div className="col-span-1 md:col-span-2 mb-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>الجنسية</span>
                        </label>
                        <div className="flex gap-3">
                          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition border ${seller.nationality !== 'اجنبي' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              checked={seller.nationality !== 'اجنبي'} // Default to Moroccan
                              onChange={() => handleSellerChange(index, 'nationality', 'مغربي')}
                              className="sr-only"
                            />
                            <span>{seller.nationality !== 'اجنبي' ? '✓' : '○'}</span>
                            <span>مغربي</span>
                          </label>
                          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition border ${seller.nationality === 'اجنبي' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              checked={seller.nationality === 'اجنبي'}
                              onChange={() => handleSellerChange(index, 'nationality', 'اجنبي')}
                              className="sr-only"
                            />
                            <span>{seller.nationality === 'اجنبي' ? '✓' : '○'}</span>
                            <span>أجنبي</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>الاسم الكامل (بالعربية)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={seller.name}
                        onChange={(e) => handleSellerChange(index, 'name', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${errors[`seller_${index}_name`] ? 'border-rose-500' : 'border-slate-200'}`}
                        placeholder="مثال: محمد بن أحمد بن عبد الله"
                      />
                      {errors[`seller_${index}_name`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_name`]}</p>}
                    </div>

                    {seller.nationality === 'اجنبي' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                          <Globe className="w-3.5 h-3.5 text-indigo-600" />
                          <span>الاسم الكامل (باللاتينية)</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={seller.nameLatin || ''}
                          onChange={(e) => handleSellerChange(index, 'nameLatin', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                          placeholder="Full Name (Latin)"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مكان الازدياد</span>
                  </label>
                  <input
                    type="text"
                    value={seller.placeOfBirth || ''}
                    onChange={(e) => handleSellerChange(index, 'placeOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    placeholder="مثال: فاس، الرباط، طنجة..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>اسم الأب</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={seller.fatherName}
                    onChange={(e) => handleSellerChange(index, 'fatherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${errors[`seller_${index}_father`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="اسم والد المعني"
                  />
                  {errors[`seller_${index}_father`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_father`]}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>اسم الأم</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={seller.motherName}
                    onChange={(e) => handleSellerChange(index, 'motherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${errors[`seller_${index}_mother`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="اسم والدة المعني"
                  />
                  {errors[`seller_${index}_mother`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_mother`]}</p>}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Home className="w-3.5 h-3.5 text-indigo-600" />
                    <span>عنوان السكنى</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={seller.address}
                    onChange={(e) => handleSellerChange(index, 'address', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${errors[`seller_${index}_address`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="مثال: حي الرياض، شارع النخيل رقم 12 - الرباط"
                  />
                  {errors[`seller_${index}_address`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_address`]}</p>}
                </div>
                {/* Conditional Rendering for Mixed Marriage Foreign Party (Husband) */}
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband') && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                          <span>رقم البطاقة الوطنية</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-xs">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>مسح من الصورة</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleSellerChange(index, 'idImage', file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={seller.idNumber}
                        onChange={(e) => handleSellerChange(index, 'idNumber', e.target.value.toUpperCase())}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-mono ${errors[`seller_${index}_id`] ? 'border-rose-500' : 'border-slate-200'}`}
                        maxLength={10}
                        placeholder="مثال: AB123456"
                      />
                      {scanningCIN[`seller_${index}`] && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي...</span>
                        </div>
                      )}
                      {extractedCINNotice[`seller_${index}`] && (
                        <div className={`mt-2 flex items-center justify-between text-xs font-bold px-3 py-1.5 rounded-xl border ${
                          extractedCINNotice[`seller_${index}`].success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <span className="flex items-center gap-1.5 truncate">
                            {extractedCINNotice[`seller_${index}`].success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            )}
                            <span>{extractedCINNotice[`seller_${index}`].message}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setExtractedCINNotice((prev) => {
                                const next = { ...prev };
                                delete next[`seller_${index}`];
                                return next;
                              });
                            }}
                            className="text-slate-400 hover:text-slate-600 font-bold px-1 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {errors[`seller_${index}_id`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_id`]}</p>}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>تاريخ صلاحية البطاقة</span>
                      </label>
                      <input
                        type="date"
                        value={seller.idIssueDate}
                        onChange={(e) => handleSellerChange(index, 'idIssueDate', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <h6 className="font-black text-xs text-slate-800">السجل العدلي من المحكمة الابتدائية التي ازداد بدائرة نفوذها</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.criminalRecordBirthplaceIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.criminalRecordBirthplaceNumber || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.criminalRecordBirthplaceDate || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-slate-400" />دولة</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.criminalRecordBirthplaceCountry || ''} onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceCountry', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'criminalRecordBirthplaceImage', e.target.files?.[0] || null)} />
                        {seller.criminalRecordBirthplaceImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.criminalRecordBirthplaceImage as any)?.name || 'السجل العدلي'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'criminalRecordBirthplaceImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-blue-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة الكفاءة للزواج</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من السفارة</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.capacityCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.capacityCertificateDate || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-2"><span>⚠️</span>تنبيه: مؤشر عليها من وزارة الشؤون الخارجية و التعاون بالرباط في</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.capacityCertificateEndorsementDate || ''} onChange={(e) => handleSellerChange(index, 'capacityCertificateEndorsementDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'capacityCertificateImage', e.target.files?.[0] || null)} />
                        {seller.capacityCertificateImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.capacityCertificateImage as any)?.name || 'شهادة الأهلية'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'capacityCertificateImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-blue-500" />دولة السكنى</label>
                      <input type="text" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.residenceCountry || ''} onChange={(e) => handleSellerChange(index, 'residenceCountry', e.target.value)} />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-blue-500" />الحال وقت الاشهاد</label>
                      <input type="text" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.currentStatus || ''} onChange={(e) => handleSellerChange(index, 'currentStatus', e.target.value)} />
                    </div>

                    {/* Passport */}
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <h6 className="font-black text-xs text-slate-800">جواز السفر</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلم من</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.passportIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'passportIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.passportNumber || ''} onChange={(e) => handleSellerChange(index, 'passportNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />صالح الى غاية</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.passportValidUntil || ''} onChange={(e) => handleSellerChange(index, 'passportValidUntil', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة من جواز السفر</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'passportImage', e.target.files?.[0] || null)} />
                        {seller.passportImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.passportImage as any)?.name || 'جواز السفر'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'passportImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة من الصفحة التي تثبت الدخول الى المغرب</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'entryStampImage', e.target.files?.[0] || null)} />
                        {seller.entryStampImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.entryStampImage as any)?.name || 'ختم الدخول'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'entryStampImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-4 h-4 text-blue-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة السجل العدلي المركزي من المصلحة المختصة بوزارة العدل</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.centralCriminalRecordNumber || ''} onChange={(e) => handleSellerChange(index, 'centralCriminalRecordNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.centralCriminalRecordDate || ''} onChange={(e) => handleSellerChange(index, 'centralCriminalRecordDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'centralCriminalRecordImage', e.target.files?.[0] || null)} />
                        {seller.centralCriminalRecordImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.centralCriminalRecordImage as any)?.name || 'السجل العدلي المركزي'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'centralCriminalRecordImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة طبية (تكميلية)</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.medicalCertificateNumber || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />مسلمة من</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.medicalCertificateIssuedBy || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium" value={seller.medicalCertificateDate || ''} onChange={(e) => handleSellerChange(index, 'medicalCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'supplementaryMedicalCertificateImage', e.target.files?.[0] || null)} />
                        {seller.supplementaryMedicalCertificateImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.supplementaryMedicalCertificateImage as any)?.name || 'شهادة طبية تكميلية'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleSellerChange(index, 'supplementaryMedicalCertificateImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>مهنته</span>
                  </label>
                  <input
                    type="text"
                    value={seller.profession || ''}
                    onChange={(e) => handleSellerChange(index, 'profession', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    placeholder="مثال: موظف، تاجر، أعمال حرة..."
                  />
                </div>
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband') && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>تاريخ الازدياد</span>
                  </label>
                  <input
                    type="date"
                    value={seller.dateOfBirth || ''}
                    onChange={(e) => handleSellerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
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
                  <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100/80 mt-2">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-800 mb-3">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>الحالة العائلية</span>
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {['اعزب', 'ارمل', 'مطلق'].map((option) => {
                        const isSelected = seller.maritalStatus === option;
                        return (
                          <label key={option} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all border shadow-2xs ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              value={option}
                              checked={isSelected}
                              onChange={(e) => handleSellerChange(index, 'maritalStatus', e.target.value)}
                              className="sr-only"
                            />
                            <span>{isSelected ? '✓' : '○'}</span>
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>

                    {seller.maritalStatus === 'ارمل' && (
                      <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <h5 className="font-black text-xs text-slate-800">حسب شهادة الوفاة المسلمة من</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />المسلمة من</label>
                            <input
                              type="text"
                              value={seller.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />تحت عدد</label>
                            <input
                              type="text"
                              value={seller.deathCertificateNumber || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                            <input
                              type="date"
                              value={seller.deathCertificateDate || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                            <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'deathCertificateImage', e.target.files?.[0] || null)} />
                            {seller.deathCertificateImage && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.deathCertificateImage as any)?.name || 'شهادة الوفاة'}</span></span>
                                <button
                                  type="button"
                                  onClick={() => handleSellerChange(index, 'deathCertificateImage', null)}
                                  className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                  title="حذف المرفق"
                                >✕</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {seller.maritalStatus === 'مطلق' && (
                      <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-xs font-bold text-slate-700 mb-2">نوع وثيقة الطلاق</label>
                              <div className="flex gap-2 flex-wrap">
                                {['رسم', 'حكم'].map(src => (
                                  <button
                                    key={src}
                                    type="button"
                                    onClick={() => handleSellerChange(index, 'divorceSource', src)}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                      (seller.divorceSource === src || (!seller.divorceSource && src === 'رسم'))
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
                                    }`}
                                  >
                                    {(seller.divorceSource === src || (!seller.divorceSource && src === 'رسم')) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {src === 'رسم' ? 'حسب رسم الطلاق المضمن بدفتر' : 'حسب الحكم'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {seller.divorceSource === 'حكم' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                                <div className="col-span-1 md:col-span-2">
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Scale className="w-3.5 h-3.5 text-blue-500" />حكم بالطلاق الصادر عن محكمة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceCourt || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceCourt', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ اصدار الطلاق</label>
                                  <input
                                    type="date"
                                    value={seller.divorceJudgmentDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceJudgmentDate', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-slate-400" />دولة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceCountry || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceCountry', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صيغة تنفيذية</label>
                                  <input
                                    type="text"
                                    value={seller.divorceExecutiveFormula || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceExecutiveFormula', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                  <input
                                    type="date"
                                    value={seller.divorceExecutiveDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceExecutiveDate', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedNumber || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedNumber', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />حرف</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedLetter || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedLetter', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedPage || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedPage', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedCount || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedCount', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                  <input
                                    type="date"
                                    value={seller.divorceDeedDate || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedDate', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                  <input
                                    type="text"
                                    value={seller.divorceDeedNotary || ''}
                                    onChange={(e) => handleSellerChange(index, 'divorceDeedNotary', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <h5 className="font-black text-xs text-slate-800">حسب رسم الطلاق المضمن بدفتر</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedNumber || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedNumber', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />حرف</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedLetter || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedLetter', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedPage || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedPage', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedCount || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedCount', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                <input
                                  type="date"
                                  value={seller.divorceDeedDate || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedDate', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                <input
                                  type="text"
                                  value={seller.divorceDeedNotary || ''}
                                  onChange={(e) => handleSellerChange(index, 'divorceDeedNotary', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
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
                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 mt-2 space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات ولادة الزوج</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-blue-500" />رقم رسم الولادة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />سنة رسم الولادة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateYear || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateYear', e.target.value)}
                                placeholder="مثال: 1990"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={seller.birthCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={seller.birthCertificateCommune || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateCommune', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.birthCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'birthCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 mt-2 space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <FileCheck className="w-4 h-4 text-blue-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات الشهادة الادارية المتعلقة بالخطوبة</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-blue-500" />رقم</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={seller.engagementCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateCommune || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateCommune', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.engagementCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'engagementCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'engagementCertificateImage', e.target.files?.[0] || null)} />
                              {seller.engagementCertificateImage && (
                                <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                  <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.engagementCertificateImage as any)?.name || 'شهادة الخطوبة'}</span></span>
                                  <button
                                    type="button"
                                    onClick={() => handleSellerChange(index, 'engagementCertificateImage', null)}
                                    className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                    title="حذف المرفق"
                                  >✕</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 mt-2 space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات شهادة الطبيب تثبت الخلو من الامراض المعدية</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-blue-500" />رقم</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateNumber || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={seller.medicalCertificateDate || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />مسلمة من</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateIssuedBy || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateIssuedBy', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={seller.medicalCertificateCity || ''}
                                onChange={(e) => handleSellerChange(index, 'medicalCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" onChange={(e) => handleSellerChange(index, 'infectiousDiseaseCertificateImage', e.target.files?.[0] || null)} />
                              {seller.infectiousDiseaseCertificateImage && (
                                <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                  <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(seller.infectiousDiseaseCertificateImage as any)?.name || 'شهادة الخلو من الأمراض المعدية'}</span></span>
                                  <button
                                    type="button"
                                    onClick={() => handleSellerChange(index, 'infectiousDiseaseCertificateImage', null)}
                                    className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                    title="حذف المرفق"
                                  >✕</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 mt-2 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Clipboard className="w-4 h-4 text-blue-600" />
                        <label className="text-xs font-bold text-slate-700">هل للزوج وكالة خاصة لهذا الزواج؟</label>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['نعم', 'لا'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSellerChange(index, 'hasSpecialProxy', option)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              seller.hasSpecialProxy === option
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
                            }`}
                          >
                            {seller.hasSpecialProxy === option ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {option}
                          </button>
                        ))}
                      </div>

                      {seller.hasSpecialProxy === 'نعم' && (
                        <div className="space-y-4 pt-2">
                          {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband' && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-900 font-medium">
                                <h4 className="font-black text-xs mb-1 text-amber-950">تنبيه</h4>
                                <p>
                                  اذا كان الموكل مقيما خارج المغرب يجب ان تحرر وكالة الزواج لدى القنصلية او السفارة المغربية ببلد الاقامة وان تكون مصادقا عليها وفق المتطلبات القانونية المعمول بها
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <User className="w-4 h-4 text-blue-600" />
                              <h5 className="font-black text-xs text-slate-800">بيانات الوكيل</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-blue-500" />الاسم الكامل</label>
                                <input
                                  type="text"
                                  value={seller.proxyName || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyName', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الازدياد</label>
                                <input
                                  type="date"
                                  value={seller.proxyDOB || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDOB', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><CreditCard className="w-3.5 h-3.5 text-slate-400" />رقم البطاقة الوطنية</label>
                                <input
                                  type="text"
                                  value={seller.proxyNationalID || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyNationalID', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />العنوان</label>
                                <input
                                  type="text"
                                  value={seller.proxyAddress || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyAddress', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأب</label>
                                <input
                                  type="text"
                                  value={seller.proxyFatherName || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyFatherName', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأم</label>
                                <input
                                  type="text"
                                  value={seller.proxyMotherName || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyMotherName', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <h5 className="font-black text-xs text-slate-800">رسم الوكالة</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />مضمن بدفتر</label>
                                <input
                                  type="text"
                                  value={seller.proxyDeedBook || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedBook', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                <input
                                  type="text"
                                  value={seller.proxyDeedNumber || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedNumber', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                <input
                                  type="text"
                                  value={seller.proxyDeedCount || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedCount', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                <input
                                  type="text"
                                  value={seller.proxyDeedPage || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedPage', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                <input
                                  type="date"
                                  value={seller.proxyDeedDate || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedDate', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                <input
                                  type="text"
                                  value={seller.proxyDeedNotary || ''}
                                  onChange={(e) => handleSellerChange(index, 'proxyDeedNotary', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>حصته في العقار المبيع</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={seller.share || ''}
                    readOnly
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-100 text-slate-700 text-sm font-bold cursor-not-allowed ${errors[`seller_${index}_share`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="استخدم زر توزيع الحصص لتعديل النسبة"
                  />
                  {errors[`seller_${index}_share`] && <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`seller_${index}_share`]}</p>}
                </div>
                )}
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>صورة البطاقة الوطنية (اختياري)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleSellerChange(index, 'idImage', e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                  />
                  {scanningCIN[`seller_${index}`] && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي وملء الحقول تلقائياً...</span>
                    </div>
                  )}
                  {seller.idImage && (
                    <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                      <span className="truncate font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم إرفاق: {(seller.idImage as any)?.name || 'صورة البطاقة'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSellerChange(index, 'idImage', null)}
                        className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                        title="حذف المرفق"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {isInheritanceType && state.documentType !== 'ملكية' && state.documentType !== 'حيازة' && (
                  <div className="col-span-1 md:col-span-2 bg-rose-50/70 p-5 rounded-2xl border border-rose-200 mt-2 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <label className="text-xs font-bold text-slate-800">هل الهالك حديث الوفاة؟</label>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['نعم', 'لا'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSellerChange(index, 'isRecentDeath', option)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            seller.isRecentDeath === option
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-700'
                          }`}
                        >
                          {seller.isRecentDeath === option ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {option}
                        </button>
                      ))}
                    </div>

                    {seller.isRecentDeath === 'نعم' && (
                      <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
                          <FileText className="w-4 h-4 text-rose-600" />
                          <h5 className="font-black text-xs text-slate-800">شهادة الوفاة</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                            <input
                              type="text"
                              value={seller.deathCertificateNumber || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                            <input
                              type="date"
                              value={seller.deathCertificateDate || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />صادرة عن</label>
                            <input
                              type="text"
                              value={seller.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleSellerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
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
            <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-white rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'yes' 
                      ? (state.documentType === 'حيازة' ? 'طالب الشهادة/الحائزون' : 'طالب الشهادة/الملاك')
                      : 'طالب الشهادة'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">بيانات طالب/طالبي الشهادة</p>
                </div>
              </div>
              {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no' && (
                <div className="flex gap-2">
                  <button 
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 transition-all"
                    type="button" 
                    onClick={() => {
                      alert('توزيع الحصص بين طالبي الشهادة');
                    }}
                  >
                    <Award className="w-3.5 h-3.5" />
                    توزيع الحصص
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
                    type="button"
                    onClick={addApplicant}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة طالب شهادة
                  </button>
                </div>
              )}
            </div>
            
            {(state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no' ? (
              // Multiple Applicants Rendering
              <div className="space-y-4">
                {tempApplicants.map((app, index) => (
                  <div key={index} className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-black text-sm">طالب الشهادة رقم {index + 1}</span>
                      </div>
                      {tempApplicants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeApplicant(index)}
                          className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-bold hover:bg-white/10 px-2 py-1 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </button>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-amber-500" />الاسم الكامل *</label>
                        <input
                          type="text"
                          value={app.name}
                          onChange={(e) => handleApplicantsChange(index, 'name', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_name`] ? 'border-red-400' : 'border-slate-200'}`}
                          placeholder="مثال: محمد بن أحمد..."
                        />
                        {errors[`applicant_${index}_name`] && <p className="text-red-500 text-sm mt-1">{errors[`applicant_${index}_name`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-amber-500" />مكان الازدياد</label>
                        <input
                          type="text"
                          value={app.placeOfBirth || ''}
                          onChange={(e) => handleApplicantsChange(index, 'placeOfBirth', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="مكان الازدياد"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Users className="w-3.5 h-3.5 text-amber-500" />اسم الأب *</label>
                        <input
                          type="text"
                          value={app.fatherName}
                          onChange={(e) => handleApplicantsChange(index, 'fatherName', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_father`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_${index}_father`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_father`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" />مهنة الأب</label>
                        <input
                          type="text"
                          value={app.fatherProfession || ''}
                          onChange={(e) => handleApplicantsChange(index, 'fatherProfession', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="مهنة الأب"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Heart className="w-3.5 h-3.5 text-amber-500" />اسم الأم *</label>
                        <input
                          type="text"
                          value={app.motherName}
                          onChange={(e) => handleApplicantsChange(index, 'motherName', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_mother`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_${index}_mother`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_mother`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" />مهنة الأم</label>
                        <input
                          type="text"
                          value={app.motherProfession || ''}
                          onChange={(e) => handleApplicantsChange(index, 'motherProfession', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="مهنة الأم"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Home className="w-3.5 h-3.5 text-amber-500" />عنوان السكنى *</label>
                        <input
                          type="text"
                          value={app.address}
                          onChange={(e) => handleApplicantsChange(index, 'address', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_address`] ? 'border-red-400' : 'border-slate-200'}`}
                          placeholder="مثال: حي الرياض - الرباط"
                        />
                        {errors[`applicant_${index}_address`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_address`]}</p>}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                            <span>رقم البطاقة الوطنية *</span>
                          </label>
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs">
                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                            <span>مسح من الصورة</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleApplicantsChange(index, 'idImage', file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={app.idNumber}
                          onChange={(e) => handleApplicantsChange(index, 'idNumber', e.target.value.toUpperCase())}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_id`] ? 'border-red-400' : 'border-slate-200'}`}
                          maxLength={10}
                        />
                        {scanningCIN[`applicants_${index}`] && (
                          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي...</span>
                          </div>
                        )}
                        {extractedCINNotice[`applicants_${index}`] && (
                          <div className={`mt-2 flex items-center justify-between text-xs font-bold px-3 py-1.5 rounded-xl border ${
                            extractedCINNotice[`applicants_${index}`].success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            <span className="flex items-center gap-1.5 truncate">
                              {extractedCINNotice[`applicants_${index}`].success ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              )}
                              <span>{extractedCINNotice[`applicants_${index}`].message}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setExtractedCINNotice((prev) => {
                                  const next = { ...prev };
                                  delete next[`applicants_${index}`];
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-slate-600 font-bold px-1 ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {errors[`applicant_${index}_id`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_id`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ صلاحية البطاقة</label>
                        <input
                          type="date"
                          value={app.idIssueDate}
                          onChange={(e) => handleApplicantsChange(index, 'idIssueDate', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-slate-400" />الجنسية</label>
                        <div className="flex gap-2 flex-wrap">
                          {['مغربي', 'اجنبي'].map((nat) => (
                            <button
                              key={nat}
                              type="button"
                              onClick={() => handleApplicantsChange(index, 'nationality', nat as any)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                app.nationality === nat
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                              }`}
                            >
                              {app.nationality === nat && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {nat === 'مغربي' ? 'مغربي' : 'أجنبي'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-amber-500" />تاريخ الازدياد</label>
                        <input
                          type="date"
                          value={app.dateOfBirth || ''}
                          onChange={(e) => handleApplicantsChange(index, 'dateOfBirth', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                        />
                      </div>
                      {app.nationality === 'اجنبي' && (
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-amber-500" />
                            الاسم الكامل (بالأحرف اللاتينية)
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={app.nameLatin || ''}
                            onChange={(e) => handleApplicantsChange(index, 'nameLatin', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            placeholder="Full name in Latin alphabet"
                          />
                        </div>
                      )}
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />صورة البطاقة (اختياري)</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleApplicantsChange(index, 'idImage', e.target.files?.[0] || null)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-all"
                        />
                        {app.idImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم إرفاق: {(app.idImage as any)?.name || 'صورة البطاقة'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplicantsChange(index, 'idImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                              title="حذف المرفق"
                            >✕</button>
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Shield className="w-3.5 h-3.5 text-amber-500" />بصفته *</label>
                        <div className="flex gap-2 flex-wrap">
                          {['وارث', 'نائب_شرعي', 'بتوكيل'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleApplicantsChange(index, 'capacity', option)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                app.capacity === option
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                              }`}
                            >
                              {app.capacity === option && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {option === 'وارث' && 'وارث'}
                              {option === 'نائب_شرعي' && 'نائب شرعي'}
                              {option === 'بتوكيل' && 'بتوكيل'}
                            </button>
                          ))}
                        </div>
                        {errors[`applicant_${index}_capacity`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_capacity`]}</p>}
                      </div>
                      {app.capacity === 'بتوكيل' && (
                        <div className="col-span-1 md:col-span-2">
                          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                            <Clipboard className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-black text-slate-800">وكالة مضمنة بدفتر</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />بدفتر *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.book || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'book', e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_proxy_book`] ? 'border-red-400' : 'border-slate-200'}`}
                              />
                              {errors[`applicant_${index}_proxy_book`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_proxy_book`]}</p>}
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.page || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'page', e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_proxy_page`] ? 'border-red-400' : 'border-slate-200'}`}
                              />
                              {errors[`applicant_${index}_proxy_page`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_proxy_page`]}</p>}
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.number || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'number', e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_proxy_number`] ? 'border-red-400' : 'border-slate-200'}`}
                              />
                              {errors[`applicant_${index}_proxy_number`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_proxy_number`]}</p>}
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ *</label>
                              <input
                                type="date"
                                value={app.proxyDetails?.date || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'date', e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_proxy_date`] ? 'border-red-400' : 'border-slate-200'}`}
                              />
                              {errors[`applicant_${index}_proxy_date`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_proxy_date`]}</p>}
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق *</label>
                              <input
                                type="text"
                                value={app.proxyDetails?.notary || ''}
                                onChange={(e) => handleApplicantsProxyChange(index, 'notary', e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_${index}_proxy_notary`] ? 'border-red-400' : 'border-slate-200'}`}
                              />
                              {errors[`applicant_${index}_proxy_notary`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_proxy_notary`]}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-black text-sm">بيانات طالب الشهادة</span>
              </div>
              <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-amber-500" />الاسم الكامل *</label>
                  <input
                    type="text"
                    value={tempApplicant.name}
                    onChange={(e) => handleApplicantChange('name', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_name`] ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="مثال: محمد بن أحمد..."
                  />
                  {errors[`applicant_name`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_name`]}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-amber-500" />مكان الازدياد</label>
                  <input
                    type="text"
                    value={tempApplicant.placeOfBirth || ''}
                    onChange={(e) => handleApplicantChange('placeOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                    placeholder="مكان الازدياد"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Users className="w-3.5 h-3.5 text-amber-500" />اسم الأب *</label>
                  <input
                    type="text"
                    value={tempApplicant.fatherName}
                    onChange={(e) => handleApplicantChange('fatherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_father`] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {errors[`applicant_father`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_father`]}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" />مهنة الأب</label>
                  <input
                    type="text"
                    value={tempApplicant.fatherProfession || ''}
                    onChange={(e) => handleApplicantChange('fatherProfession', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                    placeholder="مهنة الأب"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Heart className="w-3.5 h-3.5 text-amber-500" />اسم الأم *</label>
                  <input
                    type="text"
                    value={tempApplicant.motherName}
                    onChange={(e) => handleApplicantChange('motherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_mother`] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {errors[`applicant_mother`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_mother`]}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" />مهنة الأم</label>
                  <input
                    type="text"
                    value={tempApplicant.motherProfession || ''}
                    onChange={(e) => handleApplicantChange('motherProfession', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                    placeholder="مهنة الأم"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Home className="w-3.5 h-3.5 text-amber-500" />عنوان السكنى *</label>
                  <input
                    type="text"
                    value={tempApplicant.address}
                    onChange={(e) => handleApplicantChange('address', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_address`] ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="مثال: حي الرياض - الرباط"
                  />
                  {errors[`applicant_address`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_address`]}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                      <span>رقم البطاقة الوطنية *</span>
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs">
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>مسح من الصورة</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleApplicantChange('idImage', file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={tempApplicant.idNumber}
                    onChange={(e) => handleApplicantChange('idNumber', e.target.value.toUpperCase())}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_id`] ? 'border-red-400' : 'border-slate-200'}`}
                    maxLength={10}
                  />
                  {scanningCIN['applicant_0'] && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي...</span>
                    </div>
                  )}
                  {extractedCINNotice['applicant_0'] && (
                    <div className={`mt-2 flex items-center justify-between text-xs font-bold px-3 py-1.5 rounded-xl border ${
                      extractedCINNotice['applicant_0'].success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <span className="flex items-center gap-1.5 truncate">
                        {extractedCINNotice['applicant_0'].success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <span>{extractedCINNotice['applicant_0'].message}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExtractedCINNotice((prev) => {
                            const next = { ...prev };
                            delete next['applicant_0'];
                            return next;
                          });
                        }}
                        className="text-slate-400 hover:text-slate-600 font-bold px-1 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {errors[`applicant_id`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_id`]}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ صلاحية البطاقة</label>
                  <input
                    type="date"
                    value={tempApplicant.idIssueDate}
                    onChange={(e) => handleApplicantChange('idIssueDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-slate-400" />الجنسية</label>
                  <div className="flex gap-2 flex-wrap">
                    {['مغربي', 'اجنبي'].map((nat) => (
                      <button
                        key={nat}
                        type="button"
                        onClick={() => handleApplicantChange('nationality', nat as any)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          tempApplicant.nationality === nat
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        {tempApplicant.nationality === nat && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {nat === 'مغربي' ? 'مغربي' : 'أجنبي'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-amber-500" />تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={tempApplicant.dateOfBirth || ''}
                    onChange={(e) => handleApplicantChange('dateOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                  />
                  {tempApplicant.nationality === 'اجنبي' && (
                    <div className="mt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-amber-500" />
                        الاسم الكامل (بالأحرف اللاتينية)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={tempApplicant.nameLatin || ''}
                        onChange={(e) => handleApplicantChange('nameLatin', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
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
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />صورة البطاقة (اختياري)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleApplicantChange('idImage', e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-all"
                  />
                  {tempApplicant.idImage && (
                    <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                      <span className="truncate font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم إرفاق: {(tempApplicant.idImage as any)?.name || 'صورة البطاقة'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplicantChange('idImage', null)}
                        className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                        title="حذف المرفق"
                      >✕</button>
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Shield className="w-3.5 h-3.5 text-amber-500" />بصفته *</label>
                  <div className="flex gap-2 flex-wrap">
                    {['وارث', 'نائب_شرعي', 'بتوكيل'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleApplicantChange('capacity', option)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          tempApplicant.capacity === option
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        {tempApplicant.capacity === option && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {option === 'وارث' && 'وارث'}
                        {option === 'نائب_شرعي' && 'نائب شرعي'}
                        {option === 'بتوكيل' && 'بتوكيل'}
                      </button>
                    ))}
                  </div>
                  {errors[`applicant_capacity`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_capacity`]}</p>}
                </div>

                {tempApplicant.capacity === 'بتوكيل' && (
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                      <Clipboard className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-black text-slate-800">وكالة مضمنة بدفتر</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />بدفتر *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.book || ''}
                          onChange={(e) => handleApplicantProxyChange('book', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_proxy_book`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_proxy_book`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_proxy_book`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.page || ''}
                          onChange={(e) => handleApplicantProxyChange('page', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_proxy_page`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_proxy_page`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_proxy_page`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.number || ''}
                          onChange={(e) => handleApplicantProxyChange('number', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_proxy_number`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_proxy_number`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_proxy_number`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ *</label>
                        <input
                          type="date"
                          value={tempApplicant.proxyDetails?.date || ''}
                          onChange={(e) => handleApplicantProxyChange('date', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_proxy_date`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_proxy_date`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_proxy_date`]}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق *</label>
                        <input
                          type="text"
                          value={tempApplicant.proxyDetails?.notary || ''}
                          onChange={(e) => handleApplicantProxyChange('notary', e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium ${errors[`applicant_proxy_notary`] ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        {errors[`applicant_proxy_notary`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_proxy_notary`]}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Buyers Section - Hidden if entering Natural Party Second (Seller) OR if it's Lineage Proof (witnesses collected in Step 5) */}
        {!state.isEnteringNaturalPartySecond && state.documentType !== 'ثبوت_نسب_ببينة_السماع' && (!isInheritanceType || state.documentType !== 'ملكية' || ownershipCriteria.areOwnersAlive === 'no' || ownershipCriteria.areOwnersAlive === 'yes') && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>{labels.buyerGroup}</span>
                  {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (state.documentType as string) !== 'استمرار_الزوجية' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {tempBuyers.length} طرف
                    </span>
                  )}
                </h3>
                <p className="text-xs font-semibold text-slate-400">إدخال والتحقق من الهوية والأهلية القانونية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                  type="button" 
                  onClick={() => setShowBuyerShareModal(true)}
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>توزيع الحصص</span>
                </button>
              )}
              {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && (
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  type="button" 
                  onClick={addBuyer}
                >
                  <Plus className="w-4 h-4" />
                  <span>{labels.buyerAdd}</span>
                </button>
              )}
            </div>
          </div>
          {errors.buyers && <p className="text-rose-500 text-xs font-bold">{errors.buyers}</p>}

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
            <div key={index} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-6 sm:p-7 space-y-6 overflow-hidden relative">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black shadow-2xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-800">{labels.buyerSingle === 'الزوج' ? labels.buyerSingle : (labels.buyerSingle === 'الزوجة' && tempBuyers.length === 1) ? labels.buyerSingle : `${labels.buyerSingle} رقم ${index + 1}`}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">الطرف الثاني</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">البيانات الشخصية ووثائق إثبات الهوية</p>
                  </div>
                </div>
                {tempBuyers.length > 1 && (
                  <button 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition shadow-2xs"
                    type="button" 
                    onClick={() => removeBuyer(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                )}
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
                      <div className="col-span-1 md:col-span-2 mb-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>الجنسية</span>
                        </label>
                        <div className="flex gap-3">
                          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition border ${buyer.nationality !== 'اجنبي' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              checked={buyer.nationality !== 'اجنبي'} // Default to Moroccan
                              onChange={() => handleBuyerChange(index, 'nationality', 'مغربي')}
                              className="sr-only"
                            />
                            <span>{buyer.nationality !== 'اجنبي' ? '✓' : '○'}</span>
                            <span>مغربي</span>
                          </label>
                          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition border ${buyer.nationality === 'اجنبي' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              checked={buyer.nationality === 'اجنبي'}
                              onChange={() => handleBuyerChange(index, 'nationality', 'اجنبي')}
                              className="sr-only"
                            />
                            <span>{buyer.nationality === 'اجنبي' ? '✓' : '○'}</span>
                            <span>أجنبي</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الاسم الكامل (بالعربية)</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => handleBuyerChange(index, 'name', e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${errors[`buyer_${index}_name`] ? 'border-rose-500' : 'border-slate-200'}`}
                        placeholder="مثال: فاطمة الزهراء بن عبد السلام"
                      />
                      {errors[`buyer_${index}_name`] && (
                        <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`buyer_${index}_name`]}</p>
                      )}
                    </div>

                    {buyer.nationality === 'اجنبي' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                          <Globe className="w-3.5 h-3.5 text-indigo-600" />
                          <span>الاسم الكامل (باللاتينية)</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={buyer.nameLatin || ''}
                          onChange={(e) => handleBuyerChange(index, 'nameLatin', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                          placeholder="Full Name (Latin)"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مكان الازدياد</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.placeOfBirth || ''}
                    onChange={(e) => handleBuyerChange(index, 'placeOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    placeholder="مثال: مراكش، الدار البيضاء..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>اسم الأب</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.fatherName}
                    onChange={(e) => handleBuyerChange(index, 'fatherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${errors[`buyer_${index}_father`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="اسم والد المعنية"
                  />
                  {errors[`buyer_${index}_father`] && (
                    <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`buyer_${index}_father`]}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>اسم الأم</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.motherName}
                    onChange={(e) => handleBuyerChange(index, 'motherName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${errors[`buyer_${index}_mother`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="اسم والدة المعنية"
                  />
                  {errors[`buyer_${index}_mother`] && (
                    <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`buyer_${index}_mother`]}</p>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Home className="w-3.5 h-3.5 text-indigo-600" />
                    <span>عنوان السكنى</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.address}
                    onChange={(e) => handleBuyerChange(index, 'address', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${errors[`buyer_${index}_address`] ? 'border-rose-500' : 'border-slate-200'}`}
                    placeholder="مثال: حي الرياض، زنقة الزهور رقم 8 - الرباط"
                  />
                  {errors[`buyer_${index}_address`] && (
                    <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`buyer_${index}_address`]}</p>
                  )}
                </div>

                {((state.documentType as string) === 'بيع_وشراء' || (state.documentType as string) === 'بيع_وشراء_معنوي' || (state.documentType as string) === 'عقد_ايجار_المفضي_الى_تملك') && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-600" />
                      <span>الجنسية</span>
                    </label>
                    <select
                      value={buyer.nationality || ''}
                      onChange={(e) => handleBuyerChange(index, 'nationality', e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    >
                      <option value="">اختر الجنسية</option>
                      <option value="مغربي">مغربي</option>
                      <option value="اجنبي">اجنبي</option>
                    </select>
                    {buyer.nationality === 'اجنبي' && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>تنبيه: إذا كان الشراء يتعلق بأراض فلاحية للأجانب يتطلب الأمر الحصول على موافقة وزارة الفلاحة</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Conditional Rendering for Mixed Marriage Foreign Party (Wife) */}
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife') && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                          <span>رقم البطاقة الوطنية</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-xs">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>مسح من الصورة</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleBuyerChange(index, 'idImage', file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={buyer.idNumber}
                        onChange={(e) => handleBuyerChange(index, 'idNumber', e.target.value.toUpperCase())}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-mono ${errors[`buyer_${index}_id`] ? 'border-rose-500' : 'border-slate-200'}`}
                        maxLength={10}
                        placeholder="مثال: CD654321"
                      />
                      {scanningCIN[`buyer_${index}`] && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي...</span>
                        </div>
                      )}
                      {extractedCINNotice[`buyer_${index}`] && (
                        <div className={`mt-2 flex items-center justify-between text-xs font-bold px-3 py-1.5 rounded-xl border ${
                          extractedCINNotice[`buyer_${index}`].success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <span className="flex items-center gap-1.5 truncate">
                            {extractedCINNotice[`buyer_${index}`].success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            )}
                            <span>{extractedCINNotice[`buyer_${index}`].message}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setExtractedCINNotice((prev) => {
                                const next = { ...prev };
                                delete next[`buyer_${index}`];
                                return next;
                              });
                            }}
                            className="text-slate-400 hover:text-slate-600 font-bold px-1 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {errors[`buyer_${index}_id`] && (
                        <p className="text-rose-500 text-xs font-semibold mt-1">{errors[`buyer_${index}_id`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>تاريخ صلاحية البطاقة</span>
                      </label>
                      <input
                        type="date"
                        value={buyer.idIssueDate}
                        onChange={(e) => handleBuyerChange(index, 'idIssueDate', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة الكفاءة للزواج</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من السفارة</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.capacityCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.capacityCertificateDate || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-2"><span>⚠️</span>تنبيه: مؤشر عليها من وزارة الشؤون الخارجية و التعاون بالرباط في</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.capacityCertificateEndorsementDate || ''} onChange={(e) => handleBuyerChange(index, 'capacityCertificateEndorsementDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'capacityCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.capacityCertificateImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.capacityCertificateImage as any)?.name || 'شهادة الأهلية'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'capacityCertificateImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-emerald-600" />دولة السكنى</label>
                      <input type="text" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.residenceCountry || ''} onChange={(e) => handleBuyerChange(index, 'residenceCountry', e.target.value)} />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-emerald-600" />الحال وقت الاشهاد</label>
                      <input type="text" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.currentStatus || ''} onChange={(e) => handleBuyerChange(index, 'currentStatus', e.target.value)} />
                    </div>

                    {/* Passport */}
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <h6 className="font-black text-xs text-slate-800">جواز السفر</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلم من</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.passportIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'passportIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.passportNumber || ''} onChange={(e) => handleBuyerChange(index, 'passportNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />صالح الى غاية</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.passportValidUntil || ''} onChange={(e) => handleBuyerChange(index, 'passportValidUntil', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة من جواز السفر</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'passportImage', e.target.files?.[0] || null)} />
                        {buyer.passportImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.passportImage as any)?.name || 'جواز السفر'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'passportImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                              title="حذف المرفق"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة من الصفحة التي تثبت الدخول الى المغرب</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'entryStampImage', e.target.files?.[0] || null)} />
                        {buyer.entryStampImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.entryStampImage as any)?.name || 'ختم الدخول'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'entryStampImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة السجل العدلي المركزي من المصلحة المختصة بوزارة العدل</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.centralCriminalRecordNumber || ''} onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.centralCriminalRecordDate || ''} onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'centralCriminalRecordImage', e.target.files?.[0] || null)} />
                        {buyer.centralCriminalRecordImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.centralCriminalRecordImage as any)?.name || 'السجل العدلي المركزي'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'centralCriminalRecordImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <h6 className="font-black text-xs text-slate-800">شهادة طبية (تكميلية)</h6>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.medicalCertificateNumber || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />مسلمة من</label>
                          <input type="text" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.medicalCertificateIssuedBy || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateIssuedBy', e.target.value)} />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                          <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium" value={buyer.medicalCertificateDate || ''} onChange={(e) => handleBuyerChange(index, 'medicalCertificateDate', e.target.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                          <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'supplementaryMedicalCertificateImage', e.target.files?.[0] || null)} />
                        {buyer.supplementaryMedicalCertificateImage && (
                          <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                            <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.supplementaryMedicalCertificateImage as any)?.name || 'شهادة طبية تكميلية'}</span></span>
                            <button
                              type="button"
                              onClick={() => handleBuyerChange(index, 'supplementaryMedicalCertificateImage', null)}
                              className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>مهنتها</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.profession || ''}
                    onChange={(e) => handleBuyerChange(index, 'profession', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    placeholder="مثال: موظفة، تاجرة، ربة بيت..."
                  />
                </div>
                {!(state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife') && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تاريخ الازدياد</span>
                  </label>
                  <input
                    type="date"
                    value={buyer.dateOfBirth || ''}
                    onChange={(e) => handleBuyerChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-800 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
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
                        <div className="mt-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-4 h-4 text-amber-600" />
                            <h5 className="font-black text-xs text-amber-900">اذن زواج القاصر</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />مسلم من</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionIssuedBy || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionIssuedBy', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.underagePermissionDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Scale className="w-3.5 h-3.5 text-slate-400" />محكمة</label>
                              <input
                                type="text"
                                value={buyer.underagePermissionCourt || ''}
                                onChange={(e) => handleBuyerChange(index, 'underagePermissionCourt', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-xs font-medium"
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
                  <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-100/80 mt-2">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-800 mb-3">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>الحالة العائلية</span>
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {['عزباء', 'ارملة', 'مطلقة'].map((option) => {
                        const isSelected = buyer.maritalStatus === option;
                        return (
                          <label key={option} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all border shadow-2xs ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <input
                              type="radio"
                              value={option}
                              checked={isSelected}
                              onChange={(e) => handleBuyerChange(index, 'maritalStatus', e.target.value)}
                              className="sr-only"
                            />
                            <span>{isSelected ? '✓' : '○'}</span>
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>

                    {buyer.maritalStatus === ('ارملة' as any) && (
                      <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <h5 className="font-black text-xs text-slate-800">حسب شهادة الوفاة المسلمة من</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />المسلمة من</label>
                            <input
                              type="text"
                              value={buyer.deathCertificateIssuedBy || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />تحت عدد</label>
                            <input
                              type="text"
                              value={buyer.deathCertificateNumber || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                            <input
                              type="date"
                              value={buyer.deathCertificateDate || ''}
                              onChange={(e) => handleBuyerChange(index, 'deathCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                            <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'deathCertificateImage', e.target.files?.[0] || null)} />
                            {buyer.deathCertificateImage && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.deathCertificateImage as any)?.name || 'شهادة الوفاة'}</span></span>
                                <button
                                  type="button"
                                  onClick={() => handleBuyerChange(index, 'deathCertificateImage', null)}
                                  className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                  title="حذف المرفق"
                                >✕</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {buyer.maritalStatus === ('مطلقة' as any) && (
                      <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' ? (
                          <>
                            <div className="mb-4">
                              <label className="block text-xs font-bold text-slate-700 mb-2">نوع وثيقة الطلاق</label>
                              <div className="flex gap-2">
                                {[
                                  { value: 'رسم', label: 'حسب رسم الطلاق المضمن بدفتر' },
                                  { value: 'حكم', label: 'حسب الحكم' }
                                ].map((tab) => {
                                  const isSelected = (buyer.divorceSource || 'رسم') === tab.value;
                                  return (
                                    <button
                                      key={tab.value}
                                      type="button"
                                      onClick={() => handleBuyerChange(index, 'divorceSource', tab.value)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {buyer.divorceSource === 'حكم' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                                <div className="col-span-1 md:col-span-2">
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Scale className="w-3.5 h-3.5 text-slate-400" />حكم بالطلاق الصادر عن محكمة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceCourt || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceCourt', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ اصدار الطلاق</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceJudgmentDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceJudgmentDate', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Globe className="w-3.5 h-3.5 text-slate-400" />دولة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceCountry || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceCountry', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />صيغة تنفيذية</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceExecutiveFormula || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceExecutiveFormula', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceExecutiveDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceExecutiveDate', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedNumber || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedNumber', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />حرف</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedLetter || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedLetter', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedPage || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedPage', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedCount || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedCount', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                  <input
                                    type="date"
                                    value={buyer.divorceDeedDate || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedDate', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                  <input
                                    type="text"
                                    value={buyer.divorceDeedNotary || ''}
                                    onChange={(e) => handleBuyerChange(index, 'divorceDeedNotary', e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <h5 className="font-black text-xs text-slate-800">حسب رسم الطلاق المضمن بدفتر</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedNumber || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedNumber', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />حرف</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedLetter || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedLetter', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedPage || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedPage', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedCount || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedCount', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                <input
                                  type="date"
                                  value={buyer.divorceDeedDate || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedDate', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                <input
                                  type="text"
                                  value={buyer.divorceDeedNotary || ''}
                                  onChange={(e) => handleBuyerChange(index, 'divorceDeedNotary', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
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
                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 mt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات ولادة الزوجة</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم رسم الولادة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />سنة رسم الولادة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateYear || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateYear', e.target.value)}
                                placeholder="مثال: 1995"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.birthCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateCommune || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateCommune', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.birthCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'birthCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 mt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات الشهادة الادارية المتعلقة بالخطوبة</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.engagementCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building className="w-3.5 h-3.5 text-slate-400" />مسلمة من جماعة</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateCommune || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateCommune', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.engagementCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'engagementCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'engagementCertificateImage', e.target.files?.[0] || null)} />
                              {buyer.engagementCertificateImage && (
                                <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                  <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.engagementCertificateImage as any)?.name || 'شهادة الخطوبة'}</span></span>
                                  <button
                                    type="button"
                                    onClick={() => handleBuyerChange(index, 'engagementCertificateImage', null)}
                                    className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                    title="حذف المرفق"
                                  >✕</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 mt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات شهادة الطبيب تثبت الخلو من الامراض المعدية</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateNumber || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateNumber', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                              <input
                                type="date"
                                value={buyer.medicalCertificateDate || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateDate', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-slate-400" />مسلمة من</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateIssuedBy || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateIssuedBy', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />مدينة/اقليم</label>
                              <input
                                type="text"
                                value={buyer.medicalCertificateCity || ''}
                                onChange={(e) => handleBuyerChange(index, 'medicalCertificateCity', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Upload className="w-3.5 h-3.5 text-slate-400" />رفع صورة الشهادة</label>
                              <input type="file" accept="image/*,application/pdf" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all" onChange={(e) => handleBuyerChange(index, 'infectiousDiseaseCertificateImage', e.target.files?.[0] || null)} />
                              {buyer.infectiousDiseaseCertificateImage && (
                                <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                  <span className="truncate font-bold flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /><span>تم إرفاق: {(buyer.infectiousDiseaseCertificateImage as any)?.name || 'شهادة الخلو من الأمراض المعدية'}</span></span>
                                  <button
                                    type="button"
                                    onClick={() => handleBuyerChange(index, 'infectiousDiseaseCertificateImage', null)}
                                    className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                    title="حذف المرفق"
                                  >✕</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 mt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">هل للزوجة وكالة خاصة لهذا الزواج؟</label>
                      <div className="flex gap-2 mb-3">
                        {['نعم', 'لا'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleBuyerChange(index, 'hasSpecialProxy', option)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              buyer.hasSpecialProxy === option
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {buyer.hasSpecialProxy === 'نعم' && (
                        <div className="mt-3 space-y-4">
                          {state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife' && (
                            <div className="bg-amber-50/80 border border-amber-200/80 p-4 mb-4 rounded-2xl">
                              <div className="flex items-start gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                  <h3 className="text-xs font-black text-amber-800">تنبيه</h3>
                                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                                    اذا كان الموكل مقيما خارج المغرب يجب ان تحرر وكالة الزواج لدى القنصلية او السفارة المغربية ببلد الاقامة وان تكون مصادقا عليها وفق المتطلبات القانونية المعمول بها
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-4 bg-white rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                              <User className="w-4 h-4 text-emerald-600" />
                              <h5 className="font-black text-xs text-slate-800">بيانات الوكيل</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />الاسم الكامل</label>
                                <input
                                  type="text"
                                  value={buyer.proxyName || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyName', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الازدياد</label>
                                <input
                                  type="date"
                                  value={buyer.proxyDOB || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDOB', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><CreditCard className="w-3.5 h-3.5 text-slate-400" />رقم البطاقة الوطنية</label>
                                <input
                                  type="text"
                                  value={buyer.proxyNationalID || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyNationalID', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />العنوان</label>
                                <input
                                  type="text"
                                  value={buyer.proxyAddress || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyAddress', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأب</label>
                                <input
                                  type="text"
                                  value={buyer.proxyFatherName || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyFatherName', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأم</label>
                                <input
                                  type="text"
                                  value={buyer.proxyMotherName || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyMotherName', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Book className="w-4 h-4 text-emerald-600" />
                              <h5 className="font-black text-xs text-slate-800">رسم الوكالة</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />مضمن بدفتر</label>
                                <input
                                  type="text"
                                  value={buyer.proxyDeedBook || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedBook', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                                <input
                                  type="text"
                                  value={buyer.proxyDeedNumber || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedNumber', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                                <input
                                  type="text"
                                  value={buyer.proxyDeedCount || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedCount', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                                <input
                                  type="text"
                                  value={buyer.proxyDeedPage || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedPage', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                <input
                                  type="date"
                                  value={buyer.proxyDeedDate || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedDate', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />توثيق</label>
                                <input
                                  type="text"
                                  value={buyer.proxyDeedNotary || ''}
                                  onChange={(e) => handleBuyerChange(index, 'proxyDeedNotary', e.target.value)}
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 mt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">هل تعقد المخطوبة زواجها دون حاجة لولي؟</label>
                      <div className="flex gap-2 mb-3">
                        {['نعم', 'لا'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleBuyerChange(index, 'contractsWithoutGuardian', option)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              buyer.contractsWithoutGuardian === option
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {buyer.contractsWithoutGuardian === 'لا' && (
                        <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            <h5 className="font-black text-xs text-slate-800">بيانات الولي</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><UserCheck className="w-3.5 h-3.5 text-slate-400" />صفة الولي</label>
                              <select
                                value={buyer.guardianRelationship || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianRelationship', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
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
                                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium mt-2"
                                  placeholder="أدخل الصفة"
                                />
                              )}
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />الاسم الكامل</label>
                              <input
                                type="text"
                                value={buyer.guardianName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianName', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الازدياد</label>
                              <input
                                type="date"
                                value={buyer.guardianDOB || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianDOB', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><CreditCard className="w-3.5 h-3.5 text-slate-400" />رقم البطاقة الوطنية</label>
                              <input
                                type="text"
                                value={buyer.guardianNationalID || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianNationalID', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />العنوان</label>
                              <input
                                type="text"
                                value={buyer.guardianAddress || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianAddress', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأب</label>
                              <input
                                type="text"
                                value={buyer.guardianFatherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianFatherName', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" />مهنة الولي</label>
                              <input
                                type="text"
                                value={buyer.guardianProfession || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianProfession', e.target.value)}
                                placeholder="مثال: تاجر / متقاعد"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><User className="w-3.5 h-3.5 text-slate-400" />اسم الأم</label>
                              <input
                                type="text"
                                value={buyer.guardianMotherName || ''}
                                onChange={(e) => handleBuyerChange(index, 'guardianMotherName', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium"
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
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نسبة التملك</span>
                  </label>
                  <input
                    type="text"
                    value={buyer.share || (tempBuyers.length > 0 ? `${(100/tempBuyers.length).toFixed(2)}%` : '')}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-bold cursor-not-allowed"
                    placeholder="استخدم زر توزيع الحصص لتعديل النسبة"
                  />
                </div>
                )}
                <div className="col-span-1 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>صورة البطاقة الوطنية (اختياري)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleBuyerChange(index, 'idImage', e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all"
                  />
                  {scanningCIN[`buyer_${index}`] && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>⚡ جاري قراءة رقم البطاقة الوطنية بالذكاء الاصطناعي وملء الحقول تلقائياً...</span>
                    </div>
                  )}
                  {buyer.idImage && (
                    <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                      <span className="truncate font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم إرفاق: {(buyer.idImage as any)?.name || 'صورة البطاقة'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBuyerChange(index, 'idImage', null)}
                        className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
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
        {Object.keys(errors).length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>يرجى استكمال الحقول الإلزامية المطلوبة لكافة أطراف العقد (البائع والمشتري) المحددة باللون الأحمر للمتابعة للخطوة التالية.</span>
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
                const hasPreReception = !!state.preReceptionVerification || state.documentType === 'زواج' || (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء');
                setState((prev) => ({ ...prev, step: prev.documentType === 'زواج_مختلط' ? 0.5 : hasPreReception ? 0.25 : 0 }));
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

