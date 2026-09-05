import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
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
} from '../../../types/feesAgentTypes';
import {
  createEmptyTitleDocument, createEmptyProperty, createEmptyPartitionDivision,
  createEmptyParty, createEmptyWitness, calculateAge, convertGregorianToHijri,
  generateFileNumber, convertNumberToArabicWords, convertGregorianDateToWords,
  convertHijriDateToWords, convertTimeToWords, getArabicWeekdayName,
  generateValidationId, generateValidationAlert, performValidationChecks,
  executeLegalFiltersForPossession, validatePossessionConditions,
  validateWitnessRequirements, generateOutcomeRouting
} from '../../../utils/feesAgentUtils';
import { formatCourtName, generateRasmHtml, generateDocumentDraft } from '../../../templates/feesAgentTemplates';
import {
  type DocumentType, type PartyLabels, DEFAULT_PARTY_LABELS,
  DOCUMENT_PARTY_LABELS, getPartyLabels, DOCUMENT_CATEGORIES,
  LEGAL_ENTITY_TYPE_OPTIONS, REPRESENTATION_DOC_TYPE_OPTIONS,
  PROFESSIONAL_CONVICTION_QUESTIONS, JUDGE_SEND_TRANSIT_MESSAGES,
  ARABIC_ONES, ARABIC_TENS, ARABIC_TEENS, ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC, SALE_DOCUMENT_TYPES, FAMILY_DEED_TYPES,
  MARRIAGE_DOCUMENT_TYPES, INHERITANCE_DOCUMENT_TYPES
} from '../../../constants/feesAgentLocales';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react';
import { ShareDistributionModal } from '../modals/ShareDistributionModal';
import { ExpandedTableModal } from '../modals/ExpandedTableModal';
import { VaultModal } from '../modals/VaultModal';

export const Step8_PostRegistration: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const Step8_PostRegistration = () => {
    const handlePostRegChange = (field: keyof PostRegistrationDetails, value: any) => {
      setState((prev) => ({
        ...prev,
        postRegistration: {
          ...prev.postRegistration,
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة {['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType) ? 'التاسعة' : 'الثامنة'}: التسجيل بالمالية</h2>
          <p className="text-gray-700">
            أدخل بيانات التسجيل الإلكتروني بالمالية وإرفاق نسخة من الوثيقة المسجلة.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">سجل الكترونيا بمالية</label>
              <input
                type="text"
                value={state.postRegistration.registeredAtFinance}
                onChange={(e) => handlePostRegChange('registeredAtFinance', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="أدخل اسم المالية أو المرجع"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التسجيل</label>
              <input
                type="date"
                value={state.postRegistration.registrationDate}
                onChange={(e) => handlePostRegChange('registrationDate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الايداع</label>
              <input
                type="text"
                value={state.postRegistration.depositNumber}
                onChange={(e) => handlePostRegChange('depositNumber', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="أدخل رقم الايداع"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">نسخة الوثيقة (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handlePostRegChange('templatePdf', e.target.files?.[0] || null)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 7 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          
          <button
            onClick={() => {
                alert('تم حفظ بيانات التسجيل بنجاح');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            ✓ حفظ وإنهاء
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // اللوحة الجانبية للـ AI
  // ============================================================================


  return (
    <div className="space-y-6">
      <Step8_PostRegistration />
    </div>
  );
};