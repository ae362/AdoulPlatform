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
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TemplateSelector } from '../../SmartDrafting/TemplateSelector';
import { TemplateForm } from '../../SmartDrafting/TemplateForm';
import { WordWysiwygEditor } from '../../SmartDrafting/WordWysiwygEditor';
import { RasmHtmlPreview } from '../../SmartDrafting/RasmHtmlPreview';
import { RasmDocxPreview } from '../../SmartDrafting/RasmDocxPreview';
import { htmlToPlainText } from '../../../utils/docxRtl';
import { buildDocxBlobFromTextOnly } from '../../../utils/docxTemplate';
import { buildDocxWithFixedHeader, buildDocxWithFullHeader } from '../../../utils/docxFixedHeader';
import { extractHeaderImageFromDocxArrayBuffer, extractHeaderContentFromDocx } from '../../../utils/docxExtract';
import DOMPurify from 'dompurify';
import { saveAs } from 'file-saver';
import { getHeaderHtml, wrapInFullHtml, NOTARY_HEADERS } from '../../../utils/rasmTemplates';
import {
  ShareDistributionModal,
  JudgePickerModal,
  DeedPreviewModal,
  HighResViewer,
} from '../modals';

export interface Step7Props extends DocumentWizardProps {
  startMode?: 'intake' | 'drafting';
  initialJudgeSubmissionId?: string | null;
}

export const Step7_FinalReview: React.FC<Step7Props> = ({ state, setState, onNext, onBack, startMode = 'intake', initialJudgeSubmissionId }) => {
  const currentNotary = state.meta?.notaryPrimary || 'الموثق المسؤول';
  const { sessionToken, notaryProfile, user } = useAuth();
  const navigate = useNavigate();

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

  const saveFinalRasmMutation = trpc.feesAgent.documents.saveFinalRasm.useMutation();
  const addSavedRasmAttachmentMutation = trpc.feesAgent.documents.addSavedRasmAttachment.useMutation();
  const generateDraftMutation = trpc.contracts.generateDraft.useMutation();
  const [savedRasmId, setSavedRasmId] = useState<string | null>(null);
  const [isAuditHubLoading, setIsAuditHubLoading] = useState(false);
  const [saveFinalError, setSaveFinalError] = useState<string | null>(null);
  const [saveFinalProgress, setSaveFinalProgress] = useState<{ total: number; done: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  

  // High-Res Viewer State
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerPanOffset, setViewerPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingViewer, setIsDraggingViewer] = useState(false);
  const [viewerDragStart, setViewerDragStart] = useState({ x: 0, y: 0 });
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<any>(null);

  // --- High-Res Viewer Interaction Handlers ---
  const handleViewerWheel = (e: any) => {
    if (e.preventDefault) e.preventDefault();
    const delta = e.deltaY;
    const zoomStep = 0.1;
    setViewerZoom(prev => {
      const nextZoom = delta > 0 ? prev - zoomStep : prev + zoomStep;
      return Math.min(Math.max(nextZoom, 0.5), 4); // Min 50%, Max 400%
    });
  };

  const handleViewerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingViewer(true);
    setViewerDragStart({
      x: e.clientX - viewerPanOffset.x,
      y: e.clientY - viewerDragStart.y
    });
  };

  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingViewer) return;
    setViewerPanOffset({
      x: e.clientX - viewerDragStart.x,
      y: e.clientY - viewerDragStart.y
    });
  };

  const handleViewerMouseUp = () => {
    setIsDraggingViewer(false);
  };

  // Phase 3 / Step 7 Hooks (Lifted to prevent remounting issues)
  const submitToJudgeMutation = trpc.feesAgent.documents.submitToJudge.useMutation();
  const updateSubmissionStageMutation = trpc.feesAgent.documents.updateSubmissionStage.useMutation();
  const generateRasmPdfMutation = trpc.feesAgent.documents.generateRasmPdf.useMutation();
  const createMarriageRecordMutation = trpc.marriageRecords.create.useMutation();
  const [showJudgeNotesHelper, setShowJudgeNotesHelper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftEditorRef = useRef<HTMLTextAreaElement>(null);
  const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';
  const registrySyncRef = useRef(false);
  const registryUploadedKeysRef = useRef<Set<string>>(new Set());
  const registryLastSignatureRef = useRef<string>('');

  useEffect(() => {
    registryUploadedKeysRef.current = new Set();
    registryLastSignatureRef.current = '';
  }, [savedRasmId]);

  useEffect(() => {
    if (initialJudgeSubmissionId && !state.step7JudgeSubmissionId) {
      setState(prev => ({ ...prev, step7JudgeSubmissionId: initialJudgeSubmissionId }));
    }
  }, [initialJudgeSubmissionId, state.step7JudgeSubmissionId]);

  const judgeStatusQuery = trpc.feesAgent.documents.getJudgeSubmissionStatus.useQuery(
    {
      sessionToken: sessionToken || '',
      submissionId: state?.step7JudgeSubmissionId || initialJudgeSubmissionId || EMPTY_UUID,
    },
    {
      enabled: !!sessionToken && !!(state?.step7JudgeSubmissionId || initialJudgeSubmissionId),
      retry: false,
    }
  );

  // Logic for Step 7 (Lifted to Parent)
  const buildJudgeSummary = () => {
    const sellers = state.sellers.map((s) => s.name).filter(Boolean).join('، ');
    const buyers = state.buyers.map((b) => b.name).filter(Boolean).join('، ');
    const property = state.properties?.[0]?.propertyName || state.properties?.[0]?.titleRef || '';
    const price = state.finance?.price ? `${state.finance.price} درهم` : '';
    const parts = [
      state.documentType,
      state.meta?.fileNumber ? `رقم الملف: ${state.meta.fileNumber}` : '',
      sellers ? `البائع/الأطراف: ${sellers}` : '',
      buyers ? `المشتري/الطرف الثاني: ${buyers}` : '',
      property ? `العقار: ${property}` : '',
      price ? `الثمن: ${price}` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const buildJudgePayload = () => ({
    fileNumber: state.meta.fileNumber,
    documentType: state.documentType,
    sellers: state.sellers.map((s) => ({
      name: s.name,
      idNumber: s.idNumber,
      idIssueDate: s.idIssueDate,
      profession: s.profession,
      address: s.address,
      share: s.share,
      nationality: s.nationality,
    })),
    buyers: state.buyers.map((b) => ({
      name: b.name,
      idNumber: b.idNumber,
      idIssueDate: b.idIssueDate,
      profession: b.profession,
      address: b.address,
      share: b.share,
      nationality: b.nationality,
    })),
    properties: state.properties.map((p) => ({
      propertyName: p.propertyName,
      titleRef: p.titleRef,
      titleRefDate: p.titleRefDate,
      areaM2: p.area_m2,
      boundaries: p.boundaries,
    })),
    finance: {
      price: state.finance.price,
      priceInWords: state.finance.priceInWords,
      paymentMethod: state.finance.paymentMethod,
      registeredWithTax: state.finance.registeredWithTax,
    },
    dates: {
      gregorian: state.meta.dateGregorian,
      hijri: state.meta.dateHijri,
    },
    notaries: {
      primary: state.meta.notaryPrimary,
      secondary: state.meta.notarySecondary,
    },
    draft: state.draft,
    attachmentsInfo: state.meta.additionalDocuments.map(f => ({ name: f.name, size: f.size })),
  });

  const setWorkflowStep = (val: any) => setState(prev => ({ ...prev, step7Step: typeof val === 'function' ? val(prev.step7Step) : val }));
  const setFiscalNature = (val: any) => setState(prev => ({ ...prev, step7FiscalNature: typeof val === 'function' ? val(prev.step7FiscalNature) : val }));
  const setJudgeSubmissionId = (val: any) => setState(prev => ({ ...prev, step7JudgeSubmissionId: typeof val === 'function' ? val(prev.step7JudgeSubmissionId) : val }));
  const setJudgeSendError = (val: any) => setState(prev => ({ ...prev, step7JudgeSendError: typeof val === 'function' ? val(prev.step7JudgeSendError) : val }));
  const setJudgeAttachment = (val: any) => setState(prev => ({ ...prev, step7JudgeAttachment: typeof val === 'function' ? val(prev.step7JudgeAttachment) : val }));
  const setShowDeedPreviewModal = (val: any) => setState(prev => ({ ...prev, step7ShowDeedPreviewModal: typeof val === 'function' ? val(prev.step7ShowDeedPreviewModal) : val }));
  const setDeedPreviewText = (val: any) => setState(prev => ({ ...prev, step7DeedPreviewText: typeof val === 'function' ? val(prev.step7DeedPreviewText) : val }));
  const setVaultModal = (val: any) => setState(prev => ({ ...prev, step7VaultModal: typeof val === 'function' ? val(prev.step7VaultModal) : val }));
  const setShowExpandedTable = (val: any) => setState(prev => ({ ...prev, step7ShowExpandedTable: typeof val === 'function' ? val(prev.step7ShowExpandedTable) : val }));

  const workflowStep = state.step7Step || 'fiscal_draft';
  const fiscalNature = state.step7FiscalNature;
  const judgeSubmissionId = state.step7JudgeSubmissionId || initialJudgeSubmissionId || null;
  const judgeSendError = state.step7JudgeSendError;
  const showDeedPreviewModal = state.step7ShowDeedPreviewModal || false;
  const deedPreviewText = state.step7DeedPreviewText || '';
  const judgeAttachment = state.step7JudgeAttachment || null;
  const vaultModal = state.step7VaultModal || { isOpen: false, title: '', type: 'certificates' };
  const showExpandedTable = state.step7ShowExpandedTable || false;

  const judgeStatus = (judgeStatusQuery.data as any)?.status;
  const judgeNotes = (judgeStatusQuery.data as any)?.judgeNotes;

  const judgeStatusLabel =
    judgeStatus === 'accepted'
      ? '✔️ تمت الموافقة: قابل للتضمين'
      : judgeStatus === 'accepted_with_notes'
        ? '⚠️ موافقة مع ملاحظات'
        : judgeStatus === 'substantive_notes'
          ? '❌ ملاحظات جوهرية (يتطلب الاستدراك)'
          : judgeStatus === 'in_review'
            ? '🕵️ قيد المراجعة'
            : '⏳ في انتظار المراجعة';

  // Expanded Table Modal
  const VaultModal = () => {
      if (!vaultModal.isOpen) return null;

      return (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col border border-white/10">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                              <Database className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">{vaultModal.title}</h3>
                              <p className="text-xs text-slate-400">نظام معاينة الوثائق عالي الدقة</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => {
                              setVaultModal((prev: any) => ({ ...prev, isOpen: false }));
                              setSelectedViewerDoc(null);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="flex-1 flex overflow-hidden">
                      {/* Sidebar */}
                      <div className="w-80 border-l border-white/10 bg-slate-900/30 overflow-y-auto p-4" dir="rtl">
                          {vaultModal.type === 'certificates' && (
                              <div className="space-y-3">
                                  {(!state.certificates || state.certificates.length === 0) ? (
                                      <p className="text-center text-slate-500 py-8">لا توجد شهادات</p>
                                  ) : (
                                      state.certificates.map((cert: any, idx: number) => (
                                          <div 
                                              key={idx} 
                                              onClick={() => cert.file && setSelectedViewerDoc(cert.file)}
                                              className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedViewerDoc === cert.file ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800/50 border-white/5 hover:border-white/20'}`}
                                          >
                                              <div className="font-bold text-white mb-1">{cert.type}</div>
                                              <div className="text-xs text-slate-400">رقم: {cert.number}</div>
                                              {!cert.file && <div className="mt-2 text-[10px] text-amber-500/80">لم يتم إرفاق ملف</div>}
                                          </div>
                                      ))
                                  )}
                              </div>
                          )}

                          {vaultModal.type === 'ids' && (
                              <div className="space-y-6">
                                  <div>
                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">الطرف الأول</h4>
                                      <div className="space-y-2">
                                          {state.sellers.map((p, idx) => (
                                              <div 
                                                  key={idx} 
                                                  onClick={() => p.idImage && setSelectedViewerDoc(p.idImage)}
                                                  className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedViewerDoc === p.idImage ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800/50 border-white/5 hover:border-white/20'}`}
                                              >
                                                  <div className="font-bold text-white text-sm">{p.name || 'طرف غير مسمى'}</div>
                                                  <div className="text-[10px] text-slate-400">CIN: {p.idNumber || '---'}</div>
                                                  {!p.idImage && <div className="mt-2 text-[10px] text-red-400">لا توجد صورة</div>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div>
                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">الطرف الثاني</h4>
                                      <div className="space-y-2">
                                          {state.buyers.map((p, idx) => (
                                              <div 
                                                  key={idx} 
                                                  onClick={() => p.idImage && setSelectedViewerDoc(p.idImage)}
                                                  className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedViewerDoc === p.idImage ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-800/50 border-white/5 hover:border-white/20'}`}
                                              >
                                                  <div className="font-bold text-white text-sm">{p.name || 'طرف غير مسمى'}</div>
                                                  <div className="text-[10px] text-slate-400">CIN: {p.idNumber || '---'}</div>
                                                  {!p.idImage && <div className="mt-2 text-[10px] text-red-400">لا توجد صورة</div>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Main Viewer Area */}
                      <div className="flex-1 flex flex-col bg-slate-950 relative">
                          <HighResViewer 
                              doc={selectedViewerDoc}
                              zoom={viewerZoom}
                              pan={viewerPanOffset}
                              isDragging={isDraggingViewer}
                              onMouseDown={handleViewerMouseDown}
                              onMouseMove={handleViewerMouseMove}
                              onMouseUp={handleViewerMouseUp}
                              onWheel={handleViewerWheel}
                          />
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const ExpandedTableModal = () => {
      if (!showExpandedTable) return null;
      return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <h3 className="text-xl font-bold text-gray-800">سجل البيانات الموسع</h3>
                      <button 
                          onClick={() => setShowExpandedTable(false)}
                          className="text-gray-500 hover:text-red-600 text-2xl font-bold"
                      >
                          &times;
                      </button>
                  </div>
                  <div className="p-6 overflow-auto flex-1 text-right" dir="rtl">
                      <table className="w-full text-sm text-right border-collapse">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0">
                              <tr>
                                  <th className="p-3 border border-gray-200">الرقم التسلسلي</th>
                                  <th className="p-3 border border-gray-200">نوع الرسم</th>
                                  <th className="p-3 border border-gray-200">تاريخ التضمين</th>
                                  <th className="p-3 border border-gray-200">الأطراف (البائع/الزوج)</th>
                                  <th className="p-3 border border-gray-200">الأطراف (المشتري/الزوجة)</th>
                                  <th className="p-3 border border-gray-200">البطاقة الوطنية (طرف 1)</th>
                                  <th className="p-3 border border-gray-200">البطاقة الوطنية (طرف 2)</th>
                                  {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && state.documentType !== 'الاشهاد_على_الطلاق_الاتفاقي' && (
                                      <th className="p-3 border border-gray-200">العقار</th>
                                  )}
                                  <th className="p-3 border border-gray-200">مراجع السند</th>
                                  <th className="p-3 border border-gray-200">إذن/اشعار</th>
                                  <th className="p-3 border border-gray-200">الحالة</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                              <tr className="hover:bg-blue-50">
                                  <td className="p-3 border border-gray-200 font-mono text-blue-600 font-bold">{state.meta.fileNumber}</td>
                                  <td className="p-3 border border-gray-200">{state.documentType}</td>
                                  <td className="p-3 border border-gray-200">{new Date().toLocaleDateString('ar-MA')}</td>
                                  <td className="p-3 border border-gray-200">{state.sellers.map(s => s.name).join('، ')}</td>
                                  <td className="p-3 border border-gray-200">{state.buyers.map(b => b.name).join('، ')}</td>
                                  <td className="p-3 border border-gray-200">{state.sellers.map(s => s.idNumber).join('، ')}</td>
                                  <td className="p-3 border border-gray-200">{state.buyers.map(b => b.idNumber).join('، ')}</td>
                                  {state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && state.documentType !== 'الاشهاد_على_الطلاق_الاتفاقي' && (
                                      <td className="p-3 border border-gray-200">{state.properties?.[0]?.propertyName || '---'}</td>
                                  )}
                                  <td className="p-3 border border-gray-200">
                                      {state.documentType === 'زواج' || state.documentType === 'زواج_مختلط' ? (
                                          state.sellers[0]?.maritalStatus === 'مطلق' ? (
                                              <span className="text-xs text-orange-600 block">
                                                  طلاق: {state.sellers[0]?.divorceDeedNumber || '---'}
                                              </span>
                                          ) : '---'
                                      ) : (
                                          state.properties?.[0]?.titleDocuments?.[0]?.number ? `رسم ${state.properties[0].titleDocuments[0].number}` : '---'
                                      )}
                                  </td>
                                  <td className="p-3 border border-gray-200">
                                      {state.documentType === 'زواج' && state.tawkilScope?.legalActions?.marriageDetails?.underagePermissionNumber ? (
                                          <span className="text-xs text-purple-600">
                                              إذن قاصر: {state.tawkilScope?.legalActions?.marriageDetails?.underagePermissionNumber}
                                          </span>
                                      ) : '---'}
                                  </td>
                                  <td className="p-3 border border-gray-200">
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                                          مضمن
                                      </span>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                      <button 
                          onClick={() => setShowExpandedTable(false)}
                          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
                      >
                          إغلاق
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.split(',').pop() || '');
      };
      reader.readAsDataURL(file);
    });

  const deriveRegistryCategory = (field: string) => {
    if (field.includes('idImage')) return 'id_images';
    if (field.includes('passportImage')) return 'passport_images';
    if (field.includes('entryStampImage')) return 'entry_stamp_images';
    if (field.includes('titleDocuments')) return 'title_documents';
    if (field.includes('ownershipCertificates')) return 'ownership_certificates';
    if (field.includes('additionalDocuments')) return 'additional_documents';
    if (field.includes('templatePdf')) return 'post_registration';
    if (field.includes('conversionCertificate')) return 'conversion_certificate';
    return 'attachments';
  };

  const collectRegistryFiles = (value: unknown, path = ''): { category: string; field: string; file: File }[] => {
    const out: { category: string; field: string; file: File }[] = [];
    const visited = new WeakSet<object>();

    const walk = (v: unknown, p: string) => {
      if (!v) return;
      if (v instanceof File) {
        out.push({ category: deriveRegistryCategory(p), field: p, file: v });
        return;
      }
      if (typeof v !== 'object') return;
      if (visited.has(v as object)) return;
      visited.add(v as object);

      if (Array.isArray(v)) {
        v.forEach((item, idx) => walk(item, `${p}[${idx}]`));
        return;
      }
      Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
        const next = p ? `${p}.${k}` : k;
        walk(val, next);
      });
    };

    walk(value, path);
    return out;
  };

  const sanitizePayloadForSave = (s: FeesAgentState): Record<string, unknown> => {
    try {
      return JSON.parse(
        JSON.stringify(s, (_key, value) => {
          if (value instanceof File) {
            return { name: value.name, type: value.type, size: value.size };
          }
          return value;
        })
      );
    } catch {
      return { ...s } as any;
    }
  };

  const buildRegistryUploadPlan = () => {
    const candidates = collectRegistryFiles(state).filter((c) => c.file.size > 0);
    const unique = new Map<string, { category: string; field: string; file: File }>();

    for (const c of candidates) {
      const key = `${c.file.name}|${c.file.size}|${c.file.type}|${c.field}`;
      unique.set(key, c);
    }

    const items = Array.from(unique.entries()).map(([key, c]) => ({
      key,
      category: c.category,
      field: c.field,
      file: c.file,
    }));
    items.sort((a, b) => a.key.localeCompare(b.key));

    const judgeAttachment = state.step7JudgeAttachment;
    const judgeKey = judgeAttachment ? `judgeAttachment|${judgeAttachment.name}|${judgeAttachment.size}` : undefined;
    return { items, judgeKey };
  };

  const handleProceedToAuditHub = async () => {
    setIsAuditHubLoading(true);
    try {
      let recordId = savedRasmId;
      // Always save or update the rasm before moving to the standalone Audit Hub
      const res = await saveFinalRasmMutation.mutateAsync({
        sessionToken: sessionToken || '',
        fileNumber: state.meta.fileNumber,
        documentType: state.documentType,
        payload: {
          ...sanitizePayloadForSave(state),
          judgeSubmissionId, // Ensure submission ID is in payload
        },
      });
      recordId = (res as any)?.id;
      setSavedRasmId(recordId);
      
      // Navigate to the new standalone page using absolute path for reliability
      navigate(`/dashboard?module=auditHub&id=${recordId}`);
    } catch (err: any) {
      alert('تعذر الحفظ للإنتقال لمنصة التضمين: ' + err.message);
    } finally {
      setIsAuditHubLoading(false);
    }
  };

  const saveFinalToRegistry = async (opts?: { force?: boolean }) => {
    setSaveFinalError(null);
    if (!sessionToken) {
      setSaveFinalError('يجب تسجيل الدخول قبل حفظ الرسم.');
      return;
    }
    if (saveFinalRasmMutation.isPending || addSavedRasmAttachmentMutation.isPending) return;
    if (registrySyncRef.current) return;

    try {
      registrySyncRef.current = true;
      let recordId = savedRasmId;
      if (!recordId) {
        const createRes = await saveFinalRasmMutation.mutateAsync({
          sessionToken,
          fileNumber: state.meta.fileNumber,
          documentType: state.documentType,
          draft: state.draft || undefined,
          payload: sanitizePayloadForSave(state),
        });
        recordId = (createRes as any)?.id;
        setSavedRasmId(recordId);
      }
      if (!recordId) return;

      const plan = buildRegistryUploadPlan();
      const signature = `${plan.items.map((i) => i.key).join('||')}||${plan.judgeKey ?? ''}`;
      if (!opts?.force && signature === registryLastSignatureRef.current) return;
      registryLastSignatureRef.current = signature;

      const pending = plan.items.filter((i) => !registryUploadedKeysRef.current.has(i.key));
      const judgeAttachment = state.step7JudgeAttachment;
      const shouldUploadJudge =
        !!judgeAttachment && !!plan.judgeKey && !registryUploadedKeysRef.current.has(plan.judgeKey);

      const total = pending.length + (shouldUploadJudge ? 1 : 0);
      if (total === 0) return;

      setSaveFinalProgress({ total, done: 0 });
      let done = 0;
      const failures: string[] = [];

      for (const item of pending) {
        try {
          const base64 = await readFileAsBase64(item.file);
          await addSavedRasmAttachmentMutation.mutateAsync({
            sessionToken,
            id: recordId,
            category: item.category,
            field: item.field,
            file: {
              name: item.file.name,
              type: item.file.type || 'application/octet-stream',
              size: item.file.size,
              base64,
            },
          });
          registryUploadedKeysRef.current.add(item.key);
        } catch (e: any) {
          failures.push(`${item.file.name}: ${e?.message ?? 'upload failed'}`);
        } finally {
          done += 1;
          setSaveFinalProgress({ total, done });
        }
      }

      if (shouldUploadJudge && judgeAttachment && plan.judgeKey) {
        try {
          await addSavedRasmAttachmentMutation.mutateAsync({
            sessionToken,
            id: recordId,
            category: 'judge_attachment',
            field: 'judgeAttachment',
            file: {
              name: judgeAttachment.name,
              type: 'application/octet-stream',
              size: judgeAttachment.size,
              base64: judgeAttachment.base64,
            },
          });
          registryUploadedKeysRef.current.add(plan.judgeKey);
        } catch (e: any) {
          failures.push(`${judgeAttachment.name}: ${e?.message ?? 'upload failed'}`);
        } finally {
          done += 1;
          setSaveFinalProgress({ total, done });
        }
      }

      if (failures.length) {
        setSaveFinalError(
          `تعذر رفع بعض المرفقات:\n${failures.slice(0, 5).join('\n')}${failures.length > 5 ? '\n...' : ''}`
        );
      }
    } catch (err: any) {
      setSaveFinalError(err?.message || 'تعذر حفظ الرسم في المستندات الادارية المحفوظة.');
    } finally {
      registrySyncRef.current = false;
    }
  };

  const handleSendToJudge = async () => {
    setJudgeSendError(null);

    if (!sessionToken) {
      setJudgeSendError('يجب تسجيل الدخول قبل إرسال الرسم إلى القاضي.');
      return;
    }

    try {
      const allFiles = collectRegistryFiles(state);
      const additionalAttachments = await Promise.all(
        allFiles.map(async (c) => {
          const base64 = await readFileAsBase64(c.file);
          return {
            name: c.file.name,
            size: c.file.size,
            type: c.file.type || 'application/octet-stream',
            category: c.category,
            field: c.field,
            base64,
          };
        })
      );

      const judgeAttachment = state.step7JudgeAttachment;
      let mainDeedAttachment = null;
      if (judgeAttachment) {
        mainDeedAttachment = {
          name: judgeAttachment.name,
          size: judgeAttachment.size,
          type: judgeAttachment.type || 'application/pdf',
          base64: judgeAttachment.base64
        };
      }

      const res = await submitToJudgeMutation.mutateAsync({
        sessionToken,
        fileNumber: state.meta.fileNumber,
        documentType: state.documentType,
        summary: buildJudgeSummary(),
        payload: {
          ...buildJudgePayload(),
          attachment: mainDeedAttachment,
          attachments: additionalAttachments,
        },
      });

      setJudgeSubmissionId((res as any)?.submissionId);
      setState(prev => ({ ...prev, judgeSubmissionId: (res as any)?.submissionId }));
      setWorkflowStep('judicial_review');
    } catch (err: any) {
      setJudgeSendError(err?.message || 'تعذر إرسال الرسم إلى القاضي. حاول مرة أخرى.');
    }
  };

  const handleAttachmentChange = (file: File | null) => {
    if (!file) {
      setJudgeAttachment(null);
      return;
    }
    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      alert('الملف أكبر من 5MB. يرجى اختيار ملف أصغر.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',').pop() || '';
      setJudgeAttachment({ name: file.name, size: file.size, type: file.type, base64 });
    };
    reader.readAsDataURL(file);
  };

  const markStage = async (stage: 'sending' | 'inclusion' | 'done') => {
    if (!sessionToken || !state.step7JudgeSubmissionId) return;
    try {
      await updateSubmissionStageMutation.mutateAsync({
        sessionToken,
        submissionId: state.step7JudgeSubmissionId,
        notaryStage: stage,
      });
    } catch {
      // Non-blocking
    }
  };

  const handleFinalize = async () => {
      try {
          if (state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') {
              const husband = state.sellers[0];
              const wife = state.buyers[0];
              
              await createMarriageRecordMutation.mutateAsync({
                  record_type: state.documentType === 'زواج_مختلط' ? 'mixed' : 'adult',
                  fee_type: 'marriage',
                  inclusion_date: new Date().toISOString().split('T')[0],
                  inclusion_hijri: state.meta.dateHijri || '',
                  husband_name: husband?.name || '',
                  husband_cin: husband?.idNumber || '',
                  wife_name: wife?.name || '',
                  wife_cin: wife?.idNumber || '',
                  husband_previous_divorce_ref: husband?.maritalStatus === 'مطلق' ? husband.divorceDeedNumber : undefined,
              });
          }
          
          await markStage('done');
          localStorage.setItem('feesAgentState', JSON.stringify(state));
          alert('تم إرسال الرسم إلى الجهات المعنية وتمت الفهرسة بنجاح');
      } catch (error) {
          console.error(error);
          alert('حدث خطأ أثناء الفهرسة');
      }
  };

  const ensureDraftAvailable = () => {
    if (state.draft) return state.draft;
    const generated = generateDocumentDraft(state);
    const sanitized = generated.replace(/\s+/g, ' ').trim();
    setState((prev) => ({ ...prev, draft: sanitized }));
    return sanitized;
  };

  const buildRasmPdfPayload = () => ({
    documentType: state.documentType,
    meta: {
      fileNumber: state.meta.fileNumber,
      dateGregorian: state.meta.dateGregorian,
      dateHijri: state.meta.dateHijri,
      notaryPrimary: state.meta.notaryPrimary,
      notarySecondary: state.meta.notarySecondary,
    },
    sellers: state.sellers.map((s) => ({
      name: s.name,
      fatherName: s.fatherName,
      motherName: s.motherName,
      address: s.address,
      idNumber: s.idNumber,
      idIssueDate: s.idIssueDate,
      profession: s.profession,
      share: s.share,
      nationality: s.nationality,
    })),
    buyers: state.buyers.map((b) => ({
      name: b.name,
      fatherName: b.fatherName,
      motherName: b.motherName,
      address: b.address,
      idNumber: b.idNumber,
      idIssueDate: b.idIssueDate,
      profession: b.profession,
      share: b.share,
      nationality: b.nationality,
    })),
    applicants: (state.applicants ?? (state.applicant ? [state.applicant] : [])).map((a) => ({
      name: a.name,
      address: a.address,
      idNumber: a.idNumber,
      capacity: (a as any).capacity,
    })),
    inheritanceDeeds: state.inheritanceDeeds ?? [],
    inheritanceDescription: state.inheritanceDescription ?? '',
    partitionDivisions: state.partitionDivisions ?? [],
    properties: state.properties.map((p) => ({
      type: p.type,
      propertyName: p.propertyName,
      location: p.location,
      province: p.province,
      area_m2: p.area_m2,
      length_m: p.length_m,
      width_m: p.width_m,
      boundaries: p.boundaries,
      titleDocuments: (p.titleDocuments ?? []).map((d) => ({
        feeType: d.feeType,
        bookReference: d.bookReference,
        number: d.number,
        letter: d.letter,
        page: d.page,
        count: d.count,
        date: d.date,
        correspondingDate: d.correspondingDate,
      })),
    })),
    finance: {
      price: state.finance.price,
      priceInWords: state.finance.priceInWords,
      paymentMethod: state.finance.paymentMethod,
      transferDetails: state.finance.transferDetails,
    },
  });

  const openPdfBase64 = (pdfBase64: string, filename?: string) => {
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened && filename) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      a.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleOpenPdf = async () => {
    if (!sessionToken) {
      alert('المرجو تسجيل الدخول أولاً.');
      return;
    }
    if (!state.documentType) {
      alert('يرجى اختيار نوع الرسم أولاً.');
      return;
    }
    try {
      const payload = buildRasmPdfPayload();
      const res = await generateRasmPdfMutation.mutateAsync({ sessionToken, payload: payload as any });
      openPdfBase64((res as any)?.pdf, (res as any)?.filename);
    } catch (err: any) {
      alert(err?.message || 'تعذر توليد ملف PDF.');
    }
  };

  const handleExportToWord = () => {
    const draftText = ensureDraftAvailable();
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body><pre style="font-family:'Times New Roman',Arial,'Amiri',serif;white-space:pre-wrap;line-height:1.8;font-size:14px;">${draftText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileNumberSafe = state.meta.fileNumber ? state.meta.fileNumber.replace(/[\\/:*?"<>|]/g, '-') : 'rasm';
    a.href = url;
    a.download = `${fileNumberSafe || 'rasm'}.doc`;
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const handleViewDeed = () => {
    const text = ensureDraftAvailable();
    setDeedPreviewText(text);
    setShowDeedPreviewModal(true);
  };

  const handleEditDeed = () => {
    ensureDraftAvailable();
    setShowJudgeNotesHelper(true);
    setTimeout(() => {
      draftEditorRef.current?.focus();
    }, 50);
  };

  const handleInsertJudgeNotes = () => {
    const judgeNotes = (judgeStatusQuery.data as any)?.judgeNotes;
    if (!judgeNotes) return;
    setState((prev) => {
      const base = prev.draft || generateDocumentDraft(prev);
      const next = `${base} — ملاحظات القاضي — ${judgeNotes}`;
      return {
        ...prev,
        draft: next,
        auditTrail: [
          ...(prev.auditTrail || []),
          {
            timestamp: new Date().toLocaleString('ar-SA'),
            notary: currentNotary,
            action: 'تعديل (ملاحظات القاضي)',
            field: 'draft',
            oldValue: base,
            newValue: next,
          },
        ],
      };
    });
  };

  const handleGenerateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const partiesDescription = `
        البائعون: ${state.sellers.map((s) => `${s.name} (رقم البطاقة: ${s.idNumber})${s.share ? ` - الحصة: ${s.share}` : ''}`).join(', ')}
        المشترون: ${state.buyers.map((b) => `${b.name} (رقم البطاقة: ${b.idNumber})${b.share ? ` - الحصة: ${b.share}` : ''}${b.nationality ? ` - الجنسية: ${b.nationality}` : ''}`).join(', ')}
      `.trim();
      const detailsDescription = "..."; // Simplified for brevity in this call
      const result = await generateDraftMutation.mutateAsync({
        contractType: state.documentType,
        parties: partiesDescription,
        details: detailsDescription,
      });
      setState((prev) => ({ ...prev, draft: result.text.replace(/\s+/g, ' ').trim() }));
    } catch (error) {
      console.error('Failed to generate draft:', error);
      alert('حدث خطأ أثناء إنشاء المسودة');
    } finally {
      setIsGenerating(false);
    }
  };

  // Registry Auto-Save Effect
  useEffect(() => {
    if (state.step === 7 && sessionToken) {
      saveFinalToRegistry();
    }
  }, [
    state.finance.registeredWithTax,
    state.finance.registrationDate,
    state.finance.taxReceiptNumber,
    state.finance.region,
    state.finance.registrationType,
    state.finance.isFreeRegistration,
    state.finance.conservationPrice,
    state.finance.paymentMethod,
    state.step7JudgeAttachment,
    state.step,
  ]);

  // State audit trail preserved safely

  // When user clicks "تحرير الرسوم" from navbar, jump to drafting section (without losing existing progress).
  useEffect(() => {
    if (startMode !== 'drafting') return;
    setState((prev) => {
      if (prev.step >= 7) return prev;
      return { ...prev, step: 7 };
    });
    requestAnimationFrame(() => {
      const el = document.getElementById('ai-drafting');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [startMode]);

  const Step7_FinalReview_V2 = () => {
    // Logic and hooks have been lifted to FeesAgent root.
    
    return (
      <div className="space-y-8 animate-fadeIn">
        {showDeedPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-500">عرض الرسم</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">{state.meta.fileNumber}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(deedPreviewText || state.draft || '');
                      } catch {}
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
               
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeedPreviewModal(false)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    إغلاق
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-auto p-5">
                <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 font-amiri text-lg leading-loose text-slate-900">
                  {deedPreviewText || state.draft || generateDocumentDraft(state).replace(/\s+/g, ' ').trim()}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-4 font-amiri">الصياغة الذكية للرسم العدلي</h2>
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/20">
            <p className="font-bold text-lg mb-2">حضرة العدل المحترم،</p>
            <p className="leading-relaxed opacity-90">
              تتيح لكم هذه المنصة تحرير الرسوم العدلية بصياغة ذكية، مستندة إلى النماذج المعتمدة والمقتضيات القانونية، مع احترام كامل لصلاحيتكم في المراجعة والتقدير، ووفق المسار الإداري والقضائي الجاري به العمل.
            </p>
          </div>
        </div>

        {/* Phase 1: Data Import - Only show in Intake mode */}
        {startMode === 'intake' && (
          <div className="bg-white rounded-xl shadow-md border-r-4 border-blue-600 overflow-hidden">
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>🧭</span> المرحلة الأولى: استدعاء الرسم من منصة التلقي
              </h3>
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold">تم الاستيراد بنجاح</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-blue-500">🔹</span>
                    <span className="font-semibold">نوع الرسم:</span>
                    <span>{state.documentType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-blue-500">🔹</span>
                    <span className="font-semibold">الأطراف:</span>
                    <span>{state.sellers.length + state.buyers.length} طرف</span>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm text-green-800 flex items-start gap-2">
                  <span className="text-lg">🟢</span>
                  <p>تم استيراد جميع البيانات المدخلة (الأطراف، العقار، التواريخ، الصفات)، ويمكن مراجعتها أو تعديلها قبل الصياغة.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Smart Drafting */}
        <div id="ai-drafting" className="bg-white rounded-xl shadow-md border-r-4 border-indigo-600 overflow-hidden">
          <div className="bg-indigo-50 p-4 border-b border-indigo-100">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>✍️</span> المرحلة الثانية: الصياغة الذكية (Smart Drafting)
            </h3>
          </div>
          <div className="p-8 text-center space-y-6">
            {!selectedTemplateId && !showTemplateSelector && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                  onClick={() => {
                    const draft = generateDocumentDraft(state);
                    setState(prev => ({ ...prev, draft }));
                  }}
                  className="p-6 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="text-4xl">🤖</div>
                  <h4 className="font-bold text-indigo-900 text-lg">توليد الصياغة تلقائيًا</h4>
                  <p className="text-sm text-indigo-700">اعتمادًا على البيانات المدخلة</p>
                </div>

                <div 
                  onClick={() => setShowTemplateSelector(true)}
                  className="p-6 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="text-4xl">📝</div>
                  <h4 className="font-bold text-indigo-900 text-lg">اختيار نموذج</h4>
                  <p className="text-sm text-indigo-700">اختيار نموذج معتمد وتعبئته</p>
                </div>

                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-full h-full p-6 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3"
                       onClick={() => document.getElementById('draft-upload')?.click()}>
                    <div className="text-4xl">📂</div>
                    <h4 className="font-bold text-indigo-900 text-lg">استيراد ملف</h4>
                    <p className="text-sm text-indigo-700">Word, PDF, Text</p>
                  </div>
                  <input
                    id="draft-upload"
                    type="file"
                    accept=".doc,.docx,.pdf,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = (e) => resolve(e.target?.result as string);
                          reader.readAsDataURL(file);
                        });
                        setJudgeAttachment({
                          name: file.name,
                          size: file.size,
                          base64: base64
                        });
                        setState(prev => ({ 
                          ...prev, 
                          draft: `[تم استيراد الملف: ${file.name}]\n\n(يمكنكم متابعة الإجراءات وإرسال هذا الملف إلى القاضي في المرحلة الموالية)` 
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {showTemplateSelector && (
              <TemplateSelector
                onSelect={(templateId) => {
                  setSelectedTemplateId(templateId);
                  setShowTemplateSelector(false);
                }}
                onCancel={() => setShowTemplateSelector(false)}
              />
            )}

            {selectedTemplateId && (
              <TemplateForm
                templateId={selectedTemplateId}
                onBack={() => setSelectedTemplateId(null)}
                onSuccess={(draft) => {
                  setState(prev => ({ ...prev, draft: draft.replace(/\s+/g, ' ').trim() }));
                  setSelectedTemplateId(null);
                }}
                context={{ state, user }}
              />
            )}
            
            {state.draft && (
              <div className="mt-6 text-right">
                {showJudgeNotesHelper && judgeNotes && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4 text-right border-r-4 border-r-red-500 shadow-sm">
                    <div className="font-black text-red-600">ملاحظات القاضي</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-red-900 font-bold">{judgeNotes}</div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleInsertJudgeNotes}
                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        إدراج الملاحظات داخل الرسم
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(judgeNotes);
                          } catch {}
                        }}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-900 hover:bg-red-50"
                      >
                        نسخ الملاحظات
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowJudgeNotesHelper(false)}
                        className="rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100"
                      >
                        إخفاء
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  ref={draftEditorRef}
                  dir="rtl"
                  className="w-full h-96 p-6 border rounded-xl font-amiri text-lg leading-loose bg-gray-50 focus:bg-white transition-colors text-justify"
                  value={state.draft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setState(prev => ({ ...prev, draft: val.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ') }));
                  }}
                />
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>⚖️</span>
                    <span>تنبيه مهني راقٍ: الصياغة المقترحة ذات طابع مساعد، وتبقى خاضعة لمراجعتكم وتقديركم الكامل.</span>
                  </div>
                  <button
                    onClick={() => {
                      const content = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head><meta charset='utf-8'><title>Document</title></head>
                        <body style="font-family: 'Amiri', 'Times New Roman', serif; text-align: justify; direction: rtl;">
                          <p>${state.draft}</p>
                        </body>
                        </html>
                      `;
                      const blob = new Blob(['\ufeff', content], {
                        type: 'application/msword'
                      });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `rasm_${state.meta.fileNumber || 'draft'}.doc`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                  >
                    <span>💾</span> تحميل بصيغة Word
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase 3: Fiscal Nature & Lifecycle */}
        <div className="bg-white rounded-xl shadow-md border-r-4 border-yellow-500 overflow-hidden">
            {/* Header */}
            <div className="bg-yellow-50 p-4 border-b border-yellow-100">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🟨</span> المرحلة الثالثة: الحفظ المؤقت – تحديد الطبيعة الجبائية للرسم
                </h3>
            </div>

            <div className="p-6">
                {/* Intro Text */}
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="font-bold text-gray-800 mb-2">حضرة العدل المحترم،</p>
                    <p className="text-gray-700 leading-relaxed">
                        نظرًا لاختلاف المسطرة القانونية باختلاف الطبيعة الجبائية للرسم العدلي،
                        يرجى تحديد ما إذا كان هذا الرسم خاضعًا لإجراء التسجيل والتنبر،
                        أو غير خاضع له، وذلك قصد توجيه الرسم عبر المسار الصحيح دون إرباك أو تكرار.
                    </p>
                </div>

                {/* Selection Popup (if not selected) */}
                {!fiscalNature && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option 1: Subject */}
                        <button
                            onClick={() => {
                                setFiscalNature('subject');
                                setWorkflowStep('fiscal_draft');
                            }}
                            className="flex flex-col items-start p-6 rounded-xl border-2 border-teal-500 bg-teal-50 hover:bg-teal-100 transition-all text-right group"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">🧾</span>
                                <h4 className="text-lg font-bold text-teal-900">رسم خاضع للتسجيل والتنبر</h4>
                            </div>
                            <p className="text-sm text-teal-800 mb-4">
                                يُرجى اختيار هذا المسار إذا كان الرسم من الرسوم التي يوجب القانون تسجيلها لدى مصلحة الضرائب داخل أجل شهر من تاريخ التلقي.
                            </p>
                            <div className="mt-auto w-full bg-white/50 p-3 rounded border border-teal-200">
                                <div className="flex items-start gap-2 text-xs text-orange-700">
                                    <span>⚠️</span>
                                    <p>عدم تسجيل الرسم داخل الأجل القانوني يعرضه للزيادات والغرامات الجبائية (majoration).</p>
                                </div>
                                <a href="https://www.tax.gov.ma" target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-1 block hover:text-blue-800">
                                    المرجع: مدونة التسجيل والتنبر
                                </a>
                            </div>
                        </button>

                        {/* Option 2: Exempt */}
                        <button
                            onClick={() => {
                                setFiscalNature('exempt');
                                setWorkflowStep('normal_draft');
                            }}
                            className="flex flex-col items-start p-6 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all text-right"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">📄</span>
                                <h4 className="text-lg font-bold text-gray-800">رسم غير خاضع للتسجيل والتنبر</h4>
                            </div>
                            <p className="text-sm text-gray-600">
                                يُرجى اختيار هذا المسار إذا كان الرسم غير خاضع لإجراءات التسجيل الجبائي، ويقتصر على المراقبة القضائية والتضمين.
                            </p>
                        </button>
                    </div>
                )}

                {/* Workflow: Subject to Registration */}
                {fiscalNature === 'subject' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Step 1: Fiscal Draft */}
                        {workflowStep === 'fiscal_draft' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟠</span>
                                    <h4 className="text-xl font-bold text-orange-900">1️⃣ حفظ مؤقت خاص (جبائي)</h4>
                                </div>
                                <p className="text-orange-800 mb-4">تم حفظ الرسم مؤقتًا في انتظار استكمال إجراءات التسجيل والتنبر.</p>
                                <ul className="space-y-2 text-sm text-gray-700 mb-6 bg-white p-4 rounded-lg border border-orange-100">
                                    <li className="flex items-center gap-2"><span className="text-red-500">⛔</span> لا يُرسل للقاضي بعد</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">⛔</span> لا يُرقّم</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">⛔</span> لا يُدرج في سجل البيانات</li>
                                    <li className="flex items-center gap-2"><span className="text-green-500">✅</span> قابل للتعديل</li>
                                    <li className="flex items-center gap-2"><span className="text-green-500">✅</span> مهيأ للانتقال إلى منصة المالية</li>
                                </ul>
                                <div className="mb-4 flex flex-col gap-2 text-right">
                                  <label className="text-sm font-semibold text-gray-700">إرفاق ملف من جهازك (اختياري)</label>
                                  <div className="flex flex-wrap gap-3 items-center">
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="px-4 py-2 rounded-lg border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-bold"
                                    >
                                      اختر ملفًا
                                    </button>
                                    {judgeAttachment && (
                                      <span className="text-sm text-gray-700">
                                        {judgeAttachment.name} ({(judgeAttachment.size / 1024).toFixed(0)} KB)
                                      </span>
                                    )}
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      className="hidden"
                                      onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                                    />
                                  </div>
                                </div>
                                <button
                                    onClick={() => setWorkflowStep('registration_input')}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2"
                                >
                                    <span>🏦</span> الانتقال إلى مرحلة التسجيل والتنبر
                                </button>
                            </div>
                        )}

                        {/* Step 2: Registration Input */}
                        {workflowStep === 'registration_input' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🧾</span>
                                    <h4 className="text-xl font-bold text-blue-900">2️⃣ بيانات التسجيل (منصتك الجبائية)</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسجيل</label>
                                        <input 
                                            type="date" 
                                            value={state.postRegistration.registrationDate}
                                            onChange={(e) => setState(prev => ({ ...prev, postRegistration: { ...prev.postRegistration, registrationDate: e.target.value } }))}
                                            className="w-full p-3 border rounded-lg" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">سجل الكترونيا بمالية</label>
                                        <input 
                                            type="text" 
                                            placeholder="أدخل اسم المالية أو المرجع" 
                                            value={state.postRegistration.registeredAtFinance}
                                            onChange={(e) => setState(prev => ({ ...prev, postRegistration: { ...prev.postRegistration, registeredAtFinance: e.target.value } }))}
                                            className="w-full p-3 border rounded-lg" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نسخة الوثيقة (PDF)</label>
                                        <input 
                                            type="file" 
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setState(prev => ({ ...prev, postRegistration: { ...prev.postRegistration, templatePdf: file } }));
                                            }}
                                            className="w-full p-2 border rounded-lg bg-white" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الايداع</label>
                                        <input 
                                            type="text" 
                                            placeholder="أدخل رقم الايداع" 
                                            value={state.postRegistration.depositNumber}
                                            onChange={(e) => setState(prev => ({ ...prev, postRegistration: { ...prev.postRegistration, depositNumber: e.target.value } }))}
                                            className="w-full p-3 border rounded-lg" 
                                        />
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded border border-blue-100 mb-6 text-sm text-gray-600">
                                    سيتم إضافة النص التالي تلقائيًا للرسم: "وبعد تسجيل هذا الرسم بمصلحة التسجيل تحت عدد … بتاريخ …"
                                </div>
                                <button
                                    onClick={() => setWorkflowStep('fiscal_semi_final')}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                                >
                                    حفظ وإعادة الصياغة الذكية
                                </button>
                            </div>
                        )}

                        {/* Step 3: Fiscal Semi-Final */}
                        {workflowStep === 'fiscal_semi_final' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟡</span>
                                    <h4 className="text-xl font-bold text-yellow-900">3️⃣ مرحلة شبه نهائي (جبائي)</h4>
                                </div>
                                <p className="text-yellow-800 mb-4">بعد استكمال إجراءات التسجيل والتنبر، أصبح الرسم جاهزًا للاطلاع القضائي.</p>
                                <ul className="space-y-2 text-sm text-gray-700 mb-6 bg-white p-4 rounded-lg border border-yellow-100">
                                    <li className="flex items-center gap-2"><span className="text-green-500">✅</span> صياغة مكتملة</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">⛔</span> غير مرقّم بعد</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">⛔</span> غير مدرج في سجل البيانات</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">📤</span> يُرسل فقط إلى القاضي المكلف بالتوثيق</li>
                                </ul>
                                <div className="mb-4 flex flex-col gap-2 text-right">
                                  <label className="text-sm font-semibold text-gray-700">إرفاق ملف من جهازك (اختياري)</label>
                                  <div className="flex flex-wrap gap-3 items-center">
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="px-4 py-2 rounded-lg border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-bold"
                                    >
                                      اختر ملفًا
                                    </button>
                                    {judgeAttachment && (
                                      <span className="text-sm text-gray-700">
                                        {judgeAttachment.name} ({(judgeAttachment.size / 1024).toFixed(0)} KB)
                                      </span>
                                    )}
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      className="hidden"
                                      onChange={(e) => handleAttachmentChange(e.target.files?.[0] || null)}
                                    />
                                  </div>
                                </div>
                                <button
                                    onClick={handleSendToJudge}
                                    disabled={submitToJudgeMutation.isPending}
                                    className="w-full py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 shadow-md flex items-center justify-center gap-2"
                                >
                                    <span>⚖️</span> الإرسال إلى القاضي المكلف بالتوثيق
                                </button>
                            </div>
                        )}

                        {/* Step 4: Judicial Review */}
                        {workflowStep === 'judicial_review' && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                                <div className="text-4xl mb-4">⚖️</div>
                                <h4 className="text-xl font-bold text-purple-900 mb-2">4️⃣ تم الإرسال للاطلاع القضائي</h4>
                                <p className="text-purple-800 mb-6">
                                    تم توجيه الرسم إلى القاضي المكلف بالتوثيق قصد الاطلاع.
                                    <br/>
                                    سيُشعَركم التطبيق فور انتهاء المراقبة.
                                </p>
                                {judgeSendError && (
                                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-right text-sm text-red-700">
                                    {judgeSendError}
                                  </div>
                                )}

                                <div className="rounded-xl border border-purple-200 bg-white p-4 text-right">
                                  <div className="text-xs font-semibold text-purple-700">حالة المراجعة</div>
                                  <div className="mt-1 font-bold text-purple-900">{judgeStatusLabel}</div>
                                  {judgeNotes && (
                                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm text-red-900 shadow-sm border-r-4 border-r-red-500">
                                      <div className="font-black mb-1 text-red-600">ملاحظات القاضي</div>
                                      <div className="whitespace-pre-wrap leading-relaxed font-bold">{judgeNotes}</div>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-wrap justify-center gap-3">
                                  <button
                                    type="button"
                                    disabled={!judgeSubmissionId || judgeStatusQuery.isFetching}
                                    onClick={() => judgeStatusQuery.refetch()}
                                    className="px-6 py-2 bg-purple-200 text-purple-800 rounded-full text-sm font-bold hover:bg-purple-300 disabled:opacity-50"
                                  >
                                    تحديث الحالة
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!(judgeStatus === 'accepted' || judgeStatus === 'accepted_with_notes')}
                                    onClick={async () => {
                                      await markStage('inclusion');
                                      setWorkflowStep('inclusion');
                                    }}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    الانتقال إلى التضمين
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setWorkflowStep('fiscal_draft')}
                                    className="px-6 py-2 bg-white text-purple-800 rounded-full text-sm font-bold border border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                                  >
                                    الرجوع للتعديل
                                  </button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Inclusion (Official Ready) */}
                        {workflowStep === 'inclusion' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟦</span>
                                    <h4 className="text-xl font-bold text-blue-900">4️⃣ الرسم الرسمي الجاهز (رسمي – غير مضمن)</h4>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-blue-100 mb-6">
                                    <p className="text-gray-700 mb-2">
                                        <span className="font-bold">📍 الوضعية:</span> الرسم أصبح رسميًا بعد التجهيز، لكنه غير مدرج بعد في أي سجل.
                                    </p>
                                    <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                                        <span>📌</span>
                                        <p>تنبيه وقائي: الرسم في وضعية رسمية، ولا يُحتج به إلا بعد تضمينه في سجل البيانات.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={handleViewDeed}
                                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-2"
                                    >
                                        <span>👁️</span> عرض الرسم
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleEditDeed}
                                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-2"
                                    >
                                        <span>✏️</span> تعديل (ملاحظات القاضي)
                                    </button>
                                </div>

                                <button
                                    onClick={handleProceedToAuditHub}
                                    disabled={isAuditHubLoading}
                                    className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <span>📘</span> {isAuditHubLoading ? 'جاري الانتقال...' : 'الانتقال إلى التضمين'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Workflow: Exempt */}
                {fiscalNature === 'exempt' && (
                    <div className="space-y-6 animate-fadeIn">
                         {/* Step 1: Normal Draft */}
                         {workflowStep === 'normal_draft' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟠</span>
                                    <h4 className="text-xl font-bold text-orange-900">1️⃣ حفظ مؤقت عادي</h4>
                                </div>
                                <p className="text-orange-800 mb-4">تم حفظ الرسم مؤقتًا في انتظار الاطلاع القضائي.</p>
                                <ul className="space-y-2 text-sm text-gray-700 mb-6 bg-white p-4 rounded-lg border border-orange-100">
                                    <li className="flex items-center gap-2"><span className="text-gray-500">▪</span> لا تسجيل</li>
                                    <li className="flex items-center gap-2"><span className="text-gray-500">▪</span> لا أرقام مالية</li>
                                    <li className="flex items-center gap-2"><span className="text-green-500">✅</span> قابل للتعديل</li>
                                </ul>
                                <button
                                    onClick={() => setWorkflowStep('normal_semi_final')}
                                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-md"
                                >
                                    الانتقال إلى شبه النهائي
                                </button>
                            </div>
                        )}

                        {/* Step 2: Normal Semi-Final */}
                        {workflowStep === 'normal_semi_final' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟡</span>
                                    <h4 className="text-xl font-bold text-yellow-900">2️⃣ شبه نهائي (غير جبائي)</h4>
                                </div>
                                <button
                                    onClick={handleSendToJudge}
                                    disabled={submitToJudgeMutation.isPending}
                                    className="w-full py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 shadow-md flex items-center justify-center gap-2"
                                >
                                    <span>📤</span> إرسال إلى القاضي المكلف بالتوثيق
                                </button>
                            </div>
                        )}

                        {/* Steps 3, 4, 5 are shared (Judicial Review -> Inclusion -> Final) */}
                        {workflowStep === 'judicial_review' && (
                              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                                 <div className="text-4xl mb-4">⚖️</div>
                                 <h4 className="text-xl font-bold text-purple-900 mb-2">تم الإرسال للاطلاع القضائي</h4>
                                 {judgeSendError && (
                                   <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-right text-sm text-red-700">
                                     {judgeSendError}
                                   </div>
                                 )}

                                 <div className="rounded-xl border border-purple-200 bg-white p-4 text-right">
                                   <div className="text-xs font-semibold text-purple-700">حالة المراجعة</div>
                                   <div className="mt-1 font-bold text-purple-900">{judgeStatusLabel}</div>
                                   {judgeNotes && (
                                     <div className="mt-2 rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm text-red-900 shadow-sm border-r-4 border-r-red-500">
                                       <div className="font-black mb-1 text-red-600">ملاحظات القاضي</div>
                                       <div className="whitespace-pre-wrap leading-relaxed font-bold">{judgeNotes}</div>
                                     </div>
                                   )}
                                 </div>

                                 <div className="mt-4 flex flex-wrap justify-center gap-3">
                                   <button
                                     type="button"
                                     disabled={!judgeSubmissionId || judgeStatusQuery.isFetching}
                                     onClick={() => judgeStatusQuery.refetch()}
                                     className="px-6 py-2 bg-purple-200 text-purple-800 rounded-full text-sm font-bold hover:bg-purple-300 disabled:opacity-50"
                                   >
                                     تحديث الحالة
                                   </button>
                                   <button
                                     type="button"
                                     disabled={!(judgeStatus === 'accepted' || judgeStatus === 'accepted_with_notes')}
                                     onClick={() => setWorkflowStep('inclusion')}
                                     className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                   >
                                     الانتقال إلى التضمين
                                   </button>
                                   <button
                                     type="button"
                                     onClick={() => setWorkflowStep('normal_draft')}
                                     className="px-6 py-2 bg-white text-purple-800 rounded-full text-sm font-bold border border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                                   >
                                     الرجوع للتعديل
                                   </button>
                                 </div>
                              </div>
                        )}
                        {workflowStep === 'inclusion' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🟦</span>
                                    <h4 className="text-xl font-bold text-blue-900">الرسم الرسمي الجاهز (رسمي – غير مضمن)</h4>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-blue-100 mb-6">
                                    <p className="text-gray-700 mb-2">
                                        <span className="font-bold">📍 الوضعية:</span> الرسم أصبح رسميًا بعد التجهيز، لكنه غير مدرج بعد في أي سجل.
                                    </p>
                                    <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                                        <span>📌</span>
                                        <p>تنبيه وقائي: الرسم في وضعية رسمية، ولا يُحتج به إلا بعد تضمينه في سجل البيانات.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={handleViewDeed}
                                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-2"
                                    >
                                        <span>👁️</span> عرض الرسم
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleEditDeed}
                                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-2"
                                    >
                                        <span>✏️</span> تعديل (ملاحظات القاضي)
                                    </button>
                                </div>

                                <button
                                    onClick={handleProceedToAuditHub}
                                    disabled={isAuditHubLoading}
                                    className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <span>📘</span> {isAuditHubLoading ? 'جاري الانتقال...' : 'الانتقال إلى التضمين'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex gap-4 justify-between pt-8">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 6 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← تعديل
          </button>
          
          <button
            onClick={async () => {
                await handleFinalize();
                // Navigate to the save tab
                navigate('/dashboard?module=fees&tab=saved'); 
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-lg flex items-center gap-2"
          >
            <span>💾</span> حفظ وإنهاء
          </button>

          {/* Step 8 Removed as per request */}
          {/* {!(state.documentType === 'توكيل_رسمي' && state.tawkilScope?.legalActions?.type === 'marriage') && (
            <button
              onClick={() => setState((prev) => ({ ...prev, step: 8 }))}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              التالي: التسجيل بالمالية
            </button>
          )} */}
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 8: التسجيل بالمالية
  // ============================================================================


  return (
    <div className="space-y-6">
      <Step7_FinalReview_V2 />
    </div>
  );
};