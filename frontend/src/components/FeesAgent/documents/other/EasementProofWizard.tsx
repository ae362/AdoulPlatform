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

  export const Step3_EasementProof: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const easement = state.easementProof || {
      dominantProperty: {},
      servientProperty: {},
      documentsChecklist: {},
      compensationRequiredFor: {},
    } as EasementProof;

    const updateEasement = <K extends keyof EasementProof>(field: K, value: EasementProof[K]) => {
      setState((prev) => ({
        ...prev,
        easementProof: {
          dominantProperty: {},
          servientProperty: {},
          documentsChecklist: {},
          compensationRequiredFor: {},
          ...(prev.easementProof || {}),
          [field]: value,
        },
      }));
    };

    const updateNested = <K extends 'dominantProperty' | 'servientProperty' | 'dominantRights' | 'dominantObligations' | 'servientRights' | 'smartAnswers' | 'compensationRequiredFor' | 'documentsChecklist'>(
      field: K,
      value: EasementProof[K]
    ) => {
      setState((prev) => ({
        ...prev,
        easementProof: {
          dominantProperty: {},
          servientProperty: {},
          documentsChecklist: {},
          compensationRequiredFor: {},
          ...(prev.easementProof || {}),
          [field]: value,
        },
      }));
    };

    const toggleCategory = (value: EasementProof['easementCategories'] extends (infer T)[] ? T : never) => {
      const current = easement.easementCategories || [];
      const exists = current.includes(value as any);
      updateEasement('easementCategories', (exists ? current.filter((v) => v !== value) : [...current, value]) as any);
    };

    const smart = easement.smartAnswers || {};
    const dominantRights = easement.dominantRights || {};
    const dominantObligations = easement.dominantObligations || {};
    const servientRights = easement.servientRights || {};
    const comp = easement.compensationRequiredFor || {};
    const docs = easement.documentsChecklist || {};

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: ثبوت مرفق (حق الارتفاق)</h2>
          <p className="text-gray-700 leading-relaxed">
            يهدف هذا القسم إلى ضبط حق الارتفاق بين عقارين (مرتفق ومرتفق به) وفق مدونة الحقوق العينية (المواد 37–69) والقوانين الهندسية والتنظيمية.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800">
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مرجع: مدونة الحقوق العينية 39.08 (المواد 37–69)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">وزارة العدل – justice.gov.ma</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">المحافظة العقارية – ancfcc.gov.ma</span>
          </div>
        </div>

        {/* 1 & 2: أطراف الحق وبيانات العقارين */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">1. أطراف حق الارتفاق</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">مالك العقار المرتفق (صاحب المنفعة)</label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg text-sm"
                rows={2}
                value={easement.dominantOwnerDescription || ''}
                onChange={(e) => updateEasement('dominantOwnerDescription', e.target.value)}
                placeholder="مثال: فلان بن فلان، مالك العقار الكائن بـ..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">مالك العقار المرتفق به (المتحمل بالعبء)</label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg text-sm"
                rows={2}
                value={easement.servientOwnerDescription || ''}
                onChange={(e) => updateEasement('servientOwnerDescription', e.target.value)}
                placeholder="مثال: فلان بن فلان، مالك العقار المجاور الكائن بـ..."
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={easement.registrarInvolved || false}
                  onChange={(e) => updateEasement('registrarInvolved', e.target.checked)}
                />
                <span>إشعار المحافظ على الأملاك العقارية والتقييد عند الاقتضاء.</span>
              </label>
              <label className="block text-sm font-semibold text-gray-700 mt-2 mb-1">العدول/الموثق</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg text-sm"
                value={easement.notariesInvolved || ''}
                onChange={(e) => updateEasement('notariesInvolved', e.target.value)}
                placeholder="أسماء العدول أو مكتب التوثيق"
              />
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
            <h3 className="text-lg font-bold text-green-900">2. بيانات العقار المرتفق والعقار المرتفق به</h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">العقار المرتفق (المنتفع)</h4>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg mb-1"
                  placeholder="رقم الرسم العقاري (إن وجد)"
                  value={easement.dominantProperty?.titleNumber || ''}
                  onChange={(e) =>
                    updateNested('dominantProperty', {
                      ...(easement.dominantProperty || {}),
                      titleNumber: e.target.value,
                    })
                  }
                />
                <select
                  className="w-full px-3 py-2 border rounded-lg mb-1 bg-white"
                  value={easement.dominantProperty?.propertyNature || ''}
                  onChange={(e) =>
                    updateNested('dominantProperty', {
                      ...(easement.dominantProperty || {}),
                      propertyNature: e.target.value as any,
                    })
                  }
                >
                  <option value="">طبيعة العقار...</option>
                  <option value="محفظ">محفظ</option>
                  <option value="غير_محفظ">غير محفظ</option>
                  <option value="جماعي">جماعي</option>
                  <option value="حبسي">حبسي</option>
                </select>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg mb-1"
                  rows={2}
                  placeholder="الموقع والحدود والمجاورين ونوع الاستعمال الحالي"
                  value={easement.dominantProperty?.boundaries || ''}
                  onChange={(e) =>
                    updateNested('dominantProperty', {
                      ...(easement.dominantProperty || {}),
                      boundaries: e.target.value,
                    })
                  }
                />
              </div>

              <div className="border-t border-green-200 pt-3 mt-2">
                <h4 className="font-semibold text-gray-800 mb-1">العقار المرتفق به (المتحمل بالعبء)</h4>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg mb-1"
                  placeholder="رقم الرسم العقاري (إن وجد)"
                  value={easement.servientProperty?.titleNumber || ''}
                  onChange={(e) =>
                    updateNested('servientProperty', {
                      ...(easement.servientProperty || {}),
                      titleNumber: e.target.value,
                    })
                  }
                />
                <select
                  className="w-full px-3 py-2 border rounded-lg mb-1 bg-white"
                  value={easement.servientProperty?.propertyNature || ''}
                  onChange={(e) =>
                    updateNested('servientProperty', {
                      ...(easement.servientProperty || {}),
                      propertyNature: e.target.value as any,
                    })
                  }
                >
                  <option value="">طبيعة العقار...</option>
                  <option value="محفظ">محفظ</option>
                  <option value="غير_محفظ">غير محفظ</option>
                  <option value="جماعي">جماعي</option>
                  <option value="حبسي">حبسي</option>
                </select>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg mb-1"
                  rows={2}
                  placeholder="الموقع والحدود والمجاورين ونوع الاستعمال الحالي"
                  value={easement.servientProperty?.boundaries || ''}
                  onChange={(e) =>
                    updateNested('servientProperty', {
                      ...(easement.servientProperty || {}),
                      boundaries: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              ⚠ إذا كان العقار غير محفظ، يجب وصفه هندسيًا بدقة لتجنب النزاعات المستقبلية.
            </div>
          </div>
        </div>

        {/* 3: مصدر إنشاء الارتفاق + 4: نوعه */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-3">
            <h3 className="text-lg font-bold text-indigo-900">3. مصدر إنشاء الارتفاق (م39–41)</h3>
            <label className="block text-sm font-semibold text-gray-700 mb-1">نوع المنشأ</label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-white text-sm mb-2"
              value={easement.creationMode || ''}
              onChange={(e) => updateEasement('creationMode', e.target.value as any)}
            >
              <option value="">اختر...</option>
              <option value="طبيعي">طبيعي (مادة 39)</option>
              <option value="قانوني">قانوني (مادة 40)</option>
              <option value="اتفاقي">اتفاقي (مادة 41)</option>
            </select>
            {easement.creationMode === 'طبيعي' && (
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="انحدار، ماء، تضاريس..."
                value={easement.naturalCauseDescription || ''}
                onChange={(e) => updateEasement('naturalCauseDescription', e.target.value)}
              />
            )}
            {easement.creationMode === 'قانوني' && (
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="مثال: حماية مرفق عام، حماية طريق عمومية..."
                value={easement.legalReferenceNotes || ''}
                onChange={(e) => updateEasement('legalReferenceNotes', e.target.value)}
              />
            )}
            {easement.creationMode === 'اتفاقي' && (
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="مرجع العقد المكتوب (رسم عدلي/عقد موثق...)"
                value={easement.agreementReference || ''}
                onChange={(e) => updateEasement('agreementReference', e.target.value)}
              />
            )}
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-3">
            <h3 className="text-lg font-bold text-purple-900">4. نوع الارتفاق (م50–68)</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'حق_الشرب', label: 'حق الشرب (م50–55)' },
                { key: 'حق_المجرى', label: 'حق المجرى (م56–59)' },
                { key: 'حق_المسيل', label: 'حق المسيل (م60–63)' },
                { key: 'حق_المرور', label: 'حق المرور (م64–65)' },
                { key: 'حق_المطل', label: 'حق المطل (م66–68)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={(easement.easementCategories || []).includes(key as any)}
                    onChange={() => toggleCategory(key as any)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
              rows={2}
              placeholder="وصف دقيق لنطاق الاستعمال (العرض، الطول، عدد الأيام، ساعات الاستعمال...)"
              value={easement.easementDetailedUse || ''}
              onChange={(e) => updateEasement('easementDetailedUse', e.target.value)}
            />
          </div>
        </div>

        {/* 5: الحقوق والالتزامات */}
        <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-300 space-y-3">
          <h3 className="text-lg font-bold text-yellow-900">5. الحقوق والالتزامات</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">حقوق مالك العقار المرتفق</h4>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantRights.useWithinScope || false}
                  onChange={(e) =>
                    updateNested('dominantRights', {
                      ...dominantRights,
                      useWithinScope: e.target.checked,
                    })
                  }
                />
                <span>استعمال الحق في نطاقه المحدد دون تعسف.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantRights.performNecessaryWorks || false}
                  onChange={(e) =>
                    updateNested('dominantRights', {
                      ...dominantRights,
                      performNecessaryWorks: e.target.checked,
                    })
                  }
                />
                <span>القيام بالأعمال الضرورية لاستعمال الحق (م44).</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantRights.requestMaintenance || false}
                  onChange={(e) =>
                    updateNested('dominantRights', {
                      ...dominantRights,
                      requestMaintenance: e.target.checked,
                    })
                  }
                />
                <span>طلب الصيانة والتعمير عند الاقتضاء (م46–59–63).</span>
              </label>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">التزامات مالك العقار المرتفق</h4>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantObligations.noHarmToServient || false}
                  onChange={(e) =>
                    updateNested('dominantObligations', {
                      ...dominantObligations,
                      noHarmToServient: e.target.checked,
                    })
                  }
                />
                <span>عدم الإضرار بالعقار المرتفق به (م47).</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantObligations.noExpansionBeyondScope || false}
                  onChange={(e) =>
                    updateNested('dominantObligations', {
                      ...dominantObligations,
                      noExpansionBeyondScope: e.target.checked,
                    })
                  }
                />
                <span>عدم التوسع خارج نطاق العقد أو القانون.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={dominantObligations.maintainInstallationsAtOwnCost || false}
                  onChange={(e) =>
                    updateNested('dominantObligations', {
                      ...dominantObligations,
                      maintainInstallationsAtOwnCost: e.target.checked,
                    })
                  }
                />
                <span>صيانة المنشآت على نفقته ما لم يوجد شرط مخالف.</span>
              </label>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">حقوق مالك العقار المرتفق به</h4>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={servientRights.requestCompensation || false}
                  onChange={(e) =>
                    updateNested('servientRights', {
                      ...servientRights,
                      requestCompensation: e.target.checked,
                    })
                  }
                />
                <span>طلب التعويض المناسب عند تحقق الضرر (م57–63–64).</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={servientRights.requestLocationChangeIfLessHarmful || false}
                  onChange={(e) =>
                    updateNested('servientRights', {
                      ...servientRights,
                      requestLocationChangeIfLessHarmful: e.target.checked,
                    })
                  }
                />
                <span>طلب تغيير موقع الاستعمال إن كان أقل ضررًا (م47).</span>
              </label>
            </div>
          </div>
        </div>

        {/* 6: أسئلة ذكية + 7: التعويضات */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-sky-50 p-6 rounded-lg border-l-4 border-sky-300 space-y-3">
            <h3 className="text-lg font-bold text-sky-900">6. أسئلة ذكية</h3>
            <div className="space-y-2 text-sm">
              <label className="block font-semibold text-gray-700">كيف نشأ الارتفاق؟</label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'قانون', label: 'بقوة القانون' },
                  { value: 'اتفاق', label: 'باتفاق مكتوب' },
                  { value: 'طبيعي', label: 'طبيعي (تضاريس/ماء...)' },
                ].map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      className="w-4 h-4"
                      checked={smart.createdByLawOrAgreement === opt.value}
                      onChange={() =>
                        updateNested('smartAnswers', {
                          ...smart,
                          createdByLawOrAgreement: opt.value as any,
                        })
                      }
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <label className="block font-semibold text-gray-700 mt-3">وضعية تحفيظ العقارين</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={smart.areBothPropertiesRegistered || ''}
                onChange={(e) =>
                  updateNested('smartAnswers', {
                    ...smart,
                    areBothPropertiesRegistered: e.target.value as any,
                  })
                }
              >
                <option value="">اختر...</option>
                <option value="نعم">محفظان معًا</option>
                <option value="لا">غير محفظين معًا</option>
                <option value="مختلط">أحدهما محفظ والآخر غير محفظ</option>
              </select>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={smart.involvesWaterOrFlow || false}
                    onChange={(e) =>
                      updateNested('smartAnswers', {
                        ...smart,
                        involvesWaterOrFlow: e.target.checked,
                      })
                    }
                  />
                  <span>يتعلق بماء (شرب/مجرى/مسيل).</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={smart.involvesPassageOrView || false}
                    onChange={(e) =>
                      updateNested('smartAnswers', {
                        ...smart,
                        involvesPassageOrView: e.target.checked,
                      })
                    }
                  />
                  <span>يتعلق بمرور أو مطل.</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={smart.potentialDamageOrDispute || false}
                    onChange={(e) =>
                      updateNested('smartAnswers', {
                        ...smart,
                        potentialDamageOrDispute: e.target.checked,
                      })
                    }
                  />
                  <span>يوجد ضرر محتمل أو نزاع قائم.</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={smart.priorActualUseExists || false}
                    onChange={(e) =>
                      updateNested('smartAnswers', {
                        ...smart,
                        priorActualUseExists: e.target.checked,
                      })
                    }
                  />
                  <span>ثبت استعمال فعلي سابق (حيازة).</span>
                </label>
              </div>

              <label className="inline-flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.compensationPaid || false}
                  onChange={(e) =>
                    updateNested('smartAnswers', {
                      ...smart,
                      compensationPaid: e.target.checked,
                    })
                  }
                />
                <span>تم أداء تعويض عن الارتفاق.</span>
              </label>
              <label className="inline-flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={smart.isWaqfOrCollectiveLand || false}
                  onChange={(e) =>
                    updateNested('smartAnswers', {
                      ...smart,
                      isWaqfOrCollectiveLand: e.target.checked,
                    })
                  }
                />
                <span>يتعلق العقار بأراضي وقفية أو جماعية (له أثر قانوني مهم).</span>
              </label>
            </div>
          </div>

          <div className="bg-teal-50 p-6 rounded-lg border-l-4 border-teal-300 space-y-3">
            <h3 className="text-lg font-bold text-teal-900">7. التعويضات والتكاليف</h3>
            <div className="space-y-2 text-sm">
              <label className="block font-semibold text-gray-700 mb-1">التعويض واجب في الحالات التالية حسب القانون المغربي:</label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={comp.passage || false}
                  onChange={(e) =>
                    updateNested('compensationRequiredFor', {
                      ...comp,
                      passage: e.target.checked,
                    })
                  }
                />
                <span>حق المرور (م64).</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={comp.waterCourse || false}
                  onChange={(e) =>
                    updateNested('compensationRequiredFor', {
                      ...comp,
                      waterCourse: e.target.checked,
                    })
                  }
                />
                <span>حق المجرى (م57).</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={comp.drainage || false}
                  onChange={(e) =>
                    updateNested('compensationRequiredFor', {
                      ...comp,
                      drainage: e.target.checked,
                    })
                  }
                />
                <span>حق المسيل (الصرف) (م63).</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                rows={2}
                placeholder="ملاحظات حول كيفية تقدير التعويض (الضرر، المنفعة، المساحة، النطاق، طبيعة الأرض...)"
                value={easement.compensationCriteriaNotes || ''}
                onChange={(e) => updateEasement('compensationCriteriaNotes', e.target.value)}
              />
            </div>

            <div className="bg-white border border-teal-200 rounded-lg p-3 text-xs text-teal-900">
              يُراعى الرجوع إلى النصوص الخاصة بقانون الماء والتعمير والقوانين التنظيمية لتقدير التعويض عند الاقتضاء.
            </div>
          </div>
        </div>

        {/* 8: المستندات اللازمة */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-3">
          <h3 className="text-lg font-bold text-red-900">8. المستندات اللازمة</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.idsProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    idsProvided: e.target.checked,
                  })
                }
              />
              <span>بطاقات التعريف الوطنية للطرفين.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.ownershipProofProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    ownershipProofProvided: e.target.checked,
                  })
                }
              />
              <span>سند ملكية أو شهادة الملكية لكل عقار.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.engineeringPlanProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    engineeringPlanProvided: e.target.checked,
                  })
                }
              />
              <span>تصميم هندسي أو مخطط طبوغرافي عند الاقتضاء.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.satelliteImagesProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    satelliteImagesProvided: e.target.checked,
                  })
                }
              />
              <span>صور فضائية أو مطبوعات من المحافظة العقارية.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.topographicSurveyProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    topographicSurveyProvided: e.target.checked,
                  })
                }
              />
              <span>تحديد طبوغرافي أو رفع مساحي عند الحاجة.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={docs.courtOrAdminDecisionProvided || false}
                onChange={(e) =>
                  updateNested('documentsChecklist', {
                    ...docs,
                    courtOrAdminDecisionProvided: e.target.checked,
                  })
                }
              />
              <span>حكم قضائي أو قرار إداري إذا كان الارتفاق قانونيًا.</span>
            </label>
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
  // Step 3: Possession Proof (رسم حيازة / ثبوت حيازة)
  // ============================================================================

export const EasementProofWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_EasementProof state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
