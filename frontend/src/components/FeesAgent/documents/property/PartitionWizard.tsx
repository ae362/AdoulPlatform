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

  export const Step3_PartitionDetails: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const [tempDivisions, setTempDivisions] = useState<PartitionDivision[]>(() => {
      if (state.partitionDivisions && state.partitionDivisions.length > 0) {
        return state.partitionDivisions;
      }
      return [createEmptyPartitionDivision()];
    });
    const [activeDivisionIndex, setActiveDivisionIndex] = useState<number | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    
    const [commonFacilities, setCommonFacilities] = useState<CommonFacilities>(() => {
      const existing = state.commonFacilities as any;
      if (existing && Array.isArray(existing.items)) {
        return existing;
      }
      // Fallback for old state structure or empty state
      return { hasCommonFacilities: existing?.hasCommonFacilities || '', items: [] };
    });

    const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);
    const [customFacilityInput, setCustomFacilityInput] = useState('');

    const COMMON_FACILITIES_OPTIONS = [
      'المنافع و المرافق',
      'المدخل الرئيسي',
      'سلم الصعود و النزول',
      'السطح بهوائه',
      'الفناء',
      'التجهيزات المشتركة',
      'الصرف الصحي'
    ];

    // Helper to get all unique beneficiaries from divisions
    const getAllBeneficiaries = useCallback(() => {
      const names = new Set<string>();
      tempDivisions.forEach(div => {
        div.beneficiaries.forEach(b => {
          if (b.name && b.name.trim()) names.add(b.name.trim());
        });
      });
      return Array.from(names);
    }, [tempDivisions]);

    const handleFacilityToggle = (option: string, checked: boolean) => {
      setCommonFacilities(prev => {
        if (checked) {
          // Add standard facility
          const beneficiaries = getAllBeneficiaries();
          const initialShares = beneficiaries.map(name => ({
            name,
            percentage: beneficiaries.length > 0 ? 100 / beneficiaries.length : 0
          }));
          
          return {
            ...prev,
            items: [...prev.items, {
              id: `std_${option}`,
              name: option,
              isCustom: false,
              shares: initialShares
            }]
          };
        } else {
          // Remove standard facility
          return {
            ...prev,
            items: prev.items.filter(item => item.name !== option || item.isCustom)
          };
        }
      });
    };

    const addCustomFacility = () => {
      if (!customFacilityInput.trim()) return;
      
      const beneficiaries = getAllBeneficiaries();
      const initialShares = beneficiaries.map(name => ({
        name,
        percentage: beneficiaries.length > 0 ? 100 / beneficiaries.length : 0
      }));

      setCommonFacilities(prev => ({
        ...prev,
        items: [...prev.items, {
          id: `custom_${Date.now()}`,
          name: customFacilityInput.trim(),
          isCustom: true,
          shares: initialShares
        }]
      }));
      setCustomFacilityInput('');
    };

    const removeCustomFacility = (id: string) => {
      setCommonFacilities(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    };

    const handleFacilityShareUpdate = (shares: { index: number; value: string }[]) => {
      if (!activeFacilityId) return;
      
      setCommonFacilities(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === activeFacilityId) {
            const updatedShares = [...item.shares];
            shares.forEach(s => {
              if (updatedShares[s.index]) {
                updatedShares[s.index] = {
                  ...updatedShares[s.index],
                  percentage: parseFloat(s.value.replace('%', '')) || 0
                };
              }
            });
            return { ...item, shares: updatedShares };
          }
          return item;
        })
      }));
    };

    const getActiveFacilityParties = () => {
      if (!activeFacilityId) return [];
      const facility = commonFacilities.items.find(f => f.id === activeFacilityId);
      if (!facility) return [];
      
      return facility.shares.map(s => ({
        ...createEmptyParty(),
        name: s.name,
        share: `${s.percentage.toFixed(2)}%`
      }));
    };

    const handleDivisionChange = (index: number, field: keyof PartitionDivision | string, value: any) => {
      setTempDivisions(prev => {
        const updatedDivisions = [...prev];
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          updatedDivisions[index] = {
            ...updatedDivisions[index],
            [parent]: {
              ...updatedDivisions[index][parent as keyof PartitionDivision] as any,
              [child]: value
            }
          };
        } else {
          updatedDivisions[index] = { ...updatedDivisions[index], [field]: value };
        }
        return updatedDivisions;
      });
    };

    const addDivision = () => {
      setTempDivisions(prev => [...prev, createEmptyPartitionDivision()]);
    };

    const removeDivision = (index: number) => {
      setTempDivisions(prev => prev.filter((_, i) => i !== index));
    };

    const handleBeneficiaryChange = (divIndex: number, benIndex: number, value: string) => {
      setTempDivisions(prev => {
        const updated = [...prev];
        const beneficiaries = [...updated[divIndex].beneficiaries];
        beneficiaries[benIndex] = { ...beneficiaries[benIndex], name: value };
        updated[divIndex] = { ...updated[divIndex], beneficiaries };
        return updated;
      });
    };

    const addBeneficiary = (divIndex: number) => {
      setTempDivisions(prev => {
        const updated = [...prev];
        const beneficiaries = [...updated[divIndex].beneficiaries, { name: '', share: '0%' }];
        // Recalculate shares equally initially
        const share = (100 / beneficiaries.length).toFixed(2) + '%';
        updated[divIndex] = { 
          ...updated[divIndex], 
          beneficiaries: beneficiaries.map(b => ({ ...b, share })) 
        };
        return updated;
      });
    };

    const removeBeneficiary = (divIndex: number, benIndex: number) => {
      setTempDivisions(prev => {
        const updated = [...prev];
        const beneficiaries = updated[divIndex].beneficiaries.filter((_, i) => i !== benIndex);
        // Recalculate shares
        if (beneficiaries.length > 0) {
           const share = (100 / beneficiaries.length).toFixed(2) + '%';
           updated[divIndex] = { 
             ...updated[divIndex], 
             beneficiaries: beneficiaries.map(b => ({ ...b, share })) 
           };
        } else {
           updated[divIndex] = { ...updated[divIndex], beneficiaries: [] };
        }
        return updated;
      });
    };

    const handleShareUpdate = (shares: { index: number; value: string }[]) => {
      if (activeDivisionIndex === null) return;
      setTempDivisions(prev => {
        const updated = [...prev];
        const beneficiaries = [...updated[activeDivisionIndex].beneficiaries];
        shares.forEach(s => {
          if (beneficiaries[s.index]) {
            beneficiaries[s.index] = { ...beneficiaries[s.index], share: s.value };
          }
        });
        updated[activeDivisionIndex] = { ...updated[activeDivisionIndex], beneficiaries };
        return updated;
      });
    };

    return (
      <div className="space-y-8">
        {activeDivisionIndex !== null && (
          <ShareDistributionModal 
            isOpen={showShareModal}
            onClose={() => { setShowShareModal(false); setActiveDivisionIndex(null); }}
            parties={tempDivisions[activeDivisionIndex].beneficiaries.map(b => ({ ...createEmptyParty(), name: b.name, share: b.share }))}
            onUpdateShares={handleShareUpdate}
            title={`توزيع الحصص - القسمة رقم ${activeDivisionIndex + 1}`}
          />
        )}

        {activeFacilityId !== null && (
          <ShareDistributionModal 
            isOpen={!!activeFacilityId}
            onClose={() => setActiveFacilityId(null)}
            parties={getActiveFacilityParties()}
            onUpdateShares={handleFacilityShareUpdate}
            title={`توزيع الحصص - ${commonFacilities.items.find(f => f.id === activeFacilityId)?.name}`}
          />
        )}

        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تفاصيل المقاسمة / المخارجة</h2>
          <p className="text-gray-700">
            اتفق الشركاء/الورثة على قسمة العقار/العقارات المذكورة في ما بينهم ليرتفع عنهم ضرر الشركة او يقل حيث ألت الانصبة المفرزة كالاتي:
          </p>
        </div>

        <div className="space-y-6">
          {tempDivisions.map((div, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 relative">
              {tempDivisions.length > 1 && (
                <button
                  onClick={() => removeDivision(index)}
                  className="absolute top-4 left-4 text-red-500 hover:text-red-700 font-semibold"
                >
                  ✕ حذف
                </button>
              )}

              <h4 className="text-lg font-bold text-gray-800 mb-4">القسمة رقم {index + 1}</h4>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">حيث خرج السيد(ة)/السادة وهو/هي/هم:</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => { setActiveDivisionIndex(index); setShowShareModal(true); }}
                        className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                      >
                        📊 توزيع الحصص
                      </button>
                      <button 
                        type="button"
                        onClick={() => addBeneficiary(index)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        + إضافة مستفيد
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {div.beneficiaries.map((ben, benIndex) => (
                      <div key={benIndex} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={ben.name}
                          onChange={(e) => handleBeneficiaryChange(index, benIndex, e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-lg"
                          placeholder={`اسم المستفيد ${benIndex + 1}`}
                        />
                        <div className="w-24 p-3 bg-gray-100 border border-gray-300 rounded-lg text-center text-sm">
                          {ben.share}
                        </div>
                        {div.beneficiaries.length > 1 && (
                          <button 
                            onClick={() => removeBeneficiary(index, benIndex)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">بجميع :</label>
                  <textarea
                    value={div.propertyDescription}
                    onChange={(e) => handleDivisionChange(index, 'propertyDescription', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="وصف العقار أو النصيب المفرز"
                  />
                </div>

                {/* Dimensions & Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">المساحة (م²)</label>
                    <input
                      type="number"
                      value={div.area}
                      onChange={(e) => handleDivisionChange(index, 'area', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الطول (متر)</label>
                    <input
                      type="number"
                      value={div.length}
                      onChange={(e) => handleDivisionChange(index, 'length', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">العرض (متر)</label>
                    <input
                      type="number"
                      value={div.width}
                      onChange={(e) => handleDivisionChange(index, 'width', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Boundaries */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الحدود *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الشمال</label>
                      <input
                        type="text"
                        value={div.boundaries.north}
                        onChange={(e) => handleDivisionChange(index, 'boundaries.north', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الجنوب</label>
                      <input
                        type="text"
                        value={div.boundaries.south}
                        onChange={(e) => handleDivisionChange(index, 'boundaries.south', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الشرق</label>
                      <input
                        type="text"
                        value={div.boundaries.east}
                        onChange={(e) => handleDivisionChange(index, 'boundaries.east', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الغرب</label>
                      <input
                        type="text"
                        value={div.boundaries.west}
                        onChange={(e) => handleDivisionChange(index, 'boundaries.west', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الإحداثيات الجغرافية (اختياري)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="خط الطول"
                      value={div.coordinates.lng}
                      onChange={(e) => handleDivisionChange(index, 'coordinates.lng', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="خط العرض"
                      value={div.coordinates.lat}
                      onChange={(e) => handleDivisionChange(index, 'coordinates.lat', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Division Value */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">قيمة القسمة (درهم)</label>
                    <input
                      type="number"
                      value={div.divisionValue || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTempDivisions(prev => {
                          const updatedDivisions = [...prev];
                          updatedDivisions[index] = {
                            ...updatedDivisions[index],
                            divisionValue: val,
                            divisionValueInWords: convertNumberToArabicWords(val)
                          };
                          return updatedDivisions;
                        });
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">القيمة بالحروف (تلقائي)</label>
                    <input
                      type="text"
                      value={div.divisionValueInWords}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                      placeholder="سيظهر المبلغ بالحروف هنا"
                    />
                  </div>
                </div>

              </div>
            </div>
          ))}

          <button
            onClick={addDivision}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
          >
            + إضافة قسمة أخرى
          </button>
        </div>

        {/* Common Facilities Section */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400 space-y-6">
          <h4 className="text-lg font-bold text-gray-800">مرافق الاستعمال المشترك</h4>
          
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              هل هناك مرافق الاستعمال المشترك غير قابلة للقسمة ؟
            </label>
            <div className="flex gap-4">
              {['نعم', 'لا'].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasCommonFacilities"
                    value={option}
                    checked={commonFacilities.hasCommonFacilities === option}
                    onChange={(e) => setCommonFacilities(prev => ({ ...prev, hasCommonFacilities: e.target.value as 'نعم' | 'لا' }))}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-semibold">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {commonFacilities.hasCommonFacilities === 'نعم' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  💡 ملاحظة: يتم توزيع حصص المرافق المشتركة بين جميع المستفيدين المذكورين في الأقسام أعلاه.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اختر المرافق المشتركة:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COMMON_FACILITIES_OPTIONS.map((option) => {
                    const isChecked = commonFacilities.items.some(item => !item.isCustom && item.name === option);
                    return (
                      <label key={option} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleFacilityToggle(option, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">إضافة مرافق أخرى</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFacilityInput}
                    onChange={(e) => setCustomFacilityInput(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    placeholder="أدخل اسم المرفق..."
                  />
                  <button
                    onClick={addCustomFacility}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

              {/* Active Facilities List */}
              {commonFacilities.items.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">المرافق المختارة وتوزيع الحصص:</h5>
                  {commonFacilities.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        {item.isCustom && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">مخصص</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveFacilityId(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium transition"
                        >
                          <span>📊</span>
                          <span>توزيع الحصص</span>
                        </button>
                        
                        {item.isCustom && (
                          <button
                            onClick={() => removeCustomFacility(item.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 3 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ 
              ...prev, 
              partitionDivisions: tempDivisions, 
              commonFacilities: commonFacilities,
              step: 4 
            }))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي →
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 4: الثمن والالتزامات الضريبية
  // ============================================================================


export const PartitionWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_AdministrativeCertificates state={state} setState={setState} />}
      {state.step === 3.5 && <Step3_PartitionDetails state={state} setState={setState} />}
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
